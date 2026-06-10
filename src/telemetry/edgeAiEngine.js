/**
 * Edge AI Engine v8 — Pipeline lineal limpio
 *
 * Etapas:
 *   1. computeAUs (gestureInsights) → AUs crudas
 *   2. processAllAUs (auProcessor) → AUs procesadas (baseline + gain)
 *   3. Bayesian scoring por canal (likelihood ratios)
 *   4. classifyEmotions (emotionClassifier) → Naive Bayes
 *
 * Sin Gradient Boosting (requiere entrenamiento, inestable al inicio).
 * Sin contraste temporal en inferencia.
 * Sin double boost.
 * Un solo punto de entrada: runEdgeAIInference()
 */

import { buildFullFeatureVector } from './temporalFeatures.js';
import { computeAUs } from './gestureInsights.js';
import { processAllAUs } from './auProcessor.js';
import { classifyEmotions } from './emotionClassifier.js';
import { assessCaptureQuality } from './facialCapturePipeline.js';
import { recordSessionScores, normalizeAllChannels } from './edgeCalibration.js';

const MODEL_VERSION = 'krumm-edge-ai-v8.0.0';

// ─── Helpers ───
function clamp(v, l = 0, h = 1) { return Math.min(h, Math.max(l, Number.isFinite(v) ? v : l)); }
function round(v, d = 4) { if (!Number.isFinite(v)) return 0; const f = 10 ** d; return Math.round(v * f) / f; }

// Sigmoid: center 0.5, steepness k. Maps [0,1] → [0,100]% with spread.
function toPercent(v, k = 8.0) {
  const s = 1 / (1 + Math.exp(-(clamp(v) - 0.5) * k));
  return Math.round(s * 100);
}

function levelForScore(s) { return s >= 70 ? 'high' : s >= 40 ? 'moderate' : 'low'; }

const CHANNEL_LABELS = {
  cognitiveLoad: 'Carga Cognitiva',
  emotionalValence: 'Valencia Emocional',
  motorControl: 'Control Motor',
  engagement: 'Engagement',
  stressResponse: 'Estrés',
  fatigueIndex: 'Fatiga',
  taskPerformance: 'Rendimiento',
};

// ─── Likelihood ratios por canal ───
// Valores > 1: AU aumenta el score del canal
// Valores < 1: AU disminuye el score del canal

const CHANNEL_LIKELIHOODS = {
  cognitiveLoad:   { AU4: 3.0, AU7: 3.0, AU23: 2.0, AU1: 1.2, AU2: 1.2, AU5: 0.5, AU6: 0.5, AU12: 0.5 },
  emotionalValence:{ AU6: 4.0, AU12: 4.0, AU4: 0.2, AU15: 0.2, AU9: 0.3, AU7: 0.5 },
  motorControl:    { AU_L12: 0.5, AU_R12: 0.5, AU_L14: 0.5, AU_R14: 0.5, default: 0.7 },
  engagement:      { AU5: 4.0, AU45: 0.15, AU43: 0.3, AU1: 2.0, AU2: 1.8, AU6: 1.5, AU12: 1.3 },
  stressResponse:  { AU4: 2.5, AU23: 4.0, AU9: 2.5, AU7: 2.0, AU15: 1.5, AU6: 0.3, AU12: 0.3 },
  fatigueIndex:    { AU45: 5.0, AU7: 2.5, AU43: 3.5, AU5: 0.2, AU1: 0.4, AU6: 0.4, AU12: 0.5 },
};

function bayesianChannelScore(channelName, aus) {
  const L = CHANNEL_LIKELIHOODS[channelName];
  if (!L) return 0.5;

  let logOdds = 0;
  let weightSum = 0;
  const defaultLh = L.default ?? 1.0;

  for (const [code, au] of Object.entries(aus)) {
    const intensity = au?.intensity ?? 0;
    if (intensity < 0.005) continue;
    const lh = L[code] ?? defaultLh;
    const w = Math.abs(Math.log(Math.max(0.1, lh)));
    logOdds += Math.log(Math.max(0.1, lh)) * intensity;
    weightSum += w * intensity;
  }

  if (weightSum < 0.01) return 0.5;
  return clamp(1 / (1 + Math.exp(-logOdds * 1.5))); // extra spread
}

// ─── Task Performance (usa datos reales) ───
function scoreTaskPerformance(features) {
  const perf = features.performance ?? {};
  const acc = perf.accuracy ?? 0;
  const mrt = perf.meanReactionTimeMs ?? 0;
  const cr = perf.completedCount && perf.trialCount ? perf.completedCount / perf.trialCount : 1;
  const rtScore = clamp(1 - mrt / 2000);
  const raw = acc * 0.35 + rtScore * 0.30 + cr * 0.20 + 0.15;
  return { score: toPercent(raw), level: levelForScore(toPercent(raw)) };
}

// ─── Main ───

export function runEdgeAIInference({
  faceSamples = [], pointerSamples = [], taskEvents = [],
  calibrationProfile = null, runtime = {},
} = {}) {
  const generatedAt = new Date().toISOString();

  // Stage 1: Feature extraction
  const features = buildFullFeatureVector({ faceSamples, pointerSamples, taskEvents, calibrationProfile });

  // Stage 2: AUs → process
  const usableSamples = faceSamples.filter(
    s => s?.quality?.facePresent &&
    s?.timestamp >= features.windowFrom &&
    s?.timestamp <= features.windowTo
  );
  const rawAUs = computeAUs(usableSamples);
  const aus = processAllAUs(rawAUs);

  // Stage 3: Channel scoring
  const channels = {};
  for (const name of Object.keys(CHANNEL_LABELS)) {
    if (name === 'taskPerformance') continue;
    const raw = bayesianChannelScore(name, aus);
    const score = toPercent(raw);
    channels[name] = { score, level: levelForScore(score) };
  }
  channels.taskPerformance = scoreTaskPerformance(features);

  // Stage 4: Emotions
  const emotions = classifyEmotions(aus);

  // Capture quality
  const captureQuality = assessCaptureQuality(faceSamples);

  // Confidence
  const fp = features.facial?.facePresenceRatio ?? 0;
  const mc = features.facial?.meanConfidence ?? 0;
  const qb = (captureQuality?.overallScore ?? 50) / 100;
  const baseConf = clamp((fp + mc) / 2);
  const confidence = {
    score: round(clamp(baseConf * (0.7 + qb * 0.3)), 4),
    level: baseConf >= 0.7 ? 'high' : baseConf >= 0.5 ? 'medium' : 'low',
    captureQuality: {
      illumination: captureQuality?.illumination ?? 'unknown',
      occlusion: captureQuality?.occlusion ?? false,
      frontal: captureQuality?.frontal ?? true,
      overallScore: captureQuality?.overallScore ?? 50,
    },
  };

  // Composite (simple average)
  const scores = Object.values(channels).map(c => c.score);
  const compositeScore = scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0;

  // Calibrated channels
  recordSessionScores(Object.fromEntries(Object.entries(channels).map(([n, c]) => [n, c.score])));
  const calibratedChannels = normalizeAllChannels(channels);
  const labeledChannels = {};
  for (const [n, c] of Object.entries(calibratedChannels)) {
    labeledChannels[n] = { ...c, label: CHANNEL_LABELS[n] ?? n };
  }

  return {
    schemaVersion: 'edge_ai_model_output_v8',
    modelVersion: MODEL_VERSION,
    modelKind: 'bayesian_au_channels',
    generatedAt, runtime,
    governance: { humanReviewOnly: true, noAutomatedHiringDecision: true, observationalSignalsOnly: true },
    featureExtraction: {
      durationMs: features.durationMs,
      facialSampleCount: features.facial?.sampleCount ?? 0,
      usableFacialSamples: features.facial?.usableSampleCount ?? 0,
    },
    auCount: Object.values(aus).filter(au => au.intensity > 0.01).length,
    channels: labeledChannels,
    composite: { score: compositeScore, level: levelForScore(compositeScore) },
    confidence,
    caveats: [
      'Modelo bayesiano basado en AUs del FACS.',
      'Uso exclusivo para revisión humana.',
      'Señales observacionales; no constituyen diagnóstico clínico.',
    ],
    emotions,
  };
}