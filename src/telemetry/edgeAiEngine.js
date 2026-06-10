/**
 * Edge AI Engine v6 — Gradient Boosting
 *
 * Entrena un GradientBoostingRegressor por cada canal usando
 * las features amplificadas de AUs. Los modelos se re-entrenan
 * cada N sesiones acumuladas.
 *
 * Features (por muestra): intensidad de cada AU [0-1]
 * Labels: score del canal (0-1) derivado de Naive Bayes como ground truth inicial
 *
 * Con el tiempo, el modelo aprende de los propios datos del usuario.
 */

import { buildFullFeatureVector } from './temporalFeatures.js';
import { computeAUs } from './gestureInsights.js';
import { classifyBasicEmotions } from './basicEmotions.js';
import { assessCaptureQuality } from './facialCapturePipeline.js';
import { amplifyAllAUs } from './signalAmplifier.js';
import { applyTemporalContrast } from './temporalContrast.js';
import { recordSessionScores, normalizeAllChannels } from './edgeCalibration.js';
import { GradientBoostingRegressor } from './gradientBoosting.js';

const MODEL_VERSION = 'krumm-edge-ai-v6.0.0';
const RETRAIN_INTERVAL = 5; // re-train every N sessions

// ─── Helpers ───
function clamp(v, l=0,h=1){return Math.min(h,Math.max(l,Number.isFinite(v)?v:l))}
function round(v,d=4){if(!Number.isFinite(v))return 0;const f=10**d;return Math.round(v*f)/f}
function toPercent(v){const s=1/(1+Math.exp(-(clamp(v)-0.5)*10.0));return Math.round(s*100)}
function levelForScore(s){return s>=70?'high':s>=40?'moderate':'low'}

const CHANNEL_LABELS = {
  cognitiveLoad: 'Carga Cognitiva',
  emotionalValence: 'Valencia Emocional',
  motorControl: 'Control Motor',
  engagement: 'Engagement / Atención',
  stressResponse: 'Respuesta al Estrés',
  fatigueIndex: 'Índice de Fatiga',
  taskPerformance: 'Rendimiento en Tarea',
};

// ─── Naive Bayes (usado como ground truth inicial y fallback) ───
const LIKELIHOODS = {
  cognitiveLoad: {AU4:2.5,AU7:2.2,AU23:1.8,AU1:0.8,AU2:0.8,AU15:0.5,AU12:0.3,AU6:0.4},
  emotionalValence: {AU6:2.8,AU12:2.8,AU4:0.2,AU15:0.2,AU9:0.3,AU7:0.5,AU1:0.7,AU23:0.4},
  motorControl: {AU_L12:0.6,AU_R12:0.6,AU_L14:0.6,AU_R14:0.6,default:0.8},
  engagement: {AU5:2.4,AU45:0.2,AU43:0.3,AU1:1.5,AU2:1.4,AU6:1.2,AU12:1.1},
  stressResponse: {AU4:2.3,AU23:2.5,AU9:2.0,AU7:1.8,AU15:1.2,AU26:0.7,AU6:0.3,AU12:0.3},
  fatigueIndex: {AU45:3.0,AU7:2.0,AU43:2.5,AU5:0.3,AU1:0.5,AU6:0.4,AU12:0.5},
};

function bayesianScore(channelName, aus) {
  const L = LIKELIHOODS[channelName];
  if (!L) return 0.5;
  let logOdds = 0;
  for (const [code, au] of Object.entries(aus)) {
    const intensity = au?.intensity ?? 0;
    if (intensity < 0.01) continue;
    const lh = L[code] ?? L.default ?? 1.0;
    logOdds += Math.log(Math.max(0.1, lh)) * intensity;
  }
  return clamp(1 / (1 + Math.exp(-logOdds)));
}

// ─── Training buffer ───
const trainBuffer = { X: [], Y: {} };
for (const name of Object.keys(CHANNEL_LABELS)) {
  if (name === 'taskPerformance') continue;
  trainBuffer.Y[name] = [];
}
let sessionCount = 0;

// ─── Models (one per channel) ───
const models = {};
function getOrCreateModel(name) {
  if (!models[name]) models[name] = new GradientBoostingRegressor(15, 0.08);
  return models[name];
}

function buildFeatureVector(aus) {
  const codes = Object.keys(aus).sort();
  return codes.map(c => aus[c]?.intensity ?? 0);
}

function accumulateAndTrain(aus, bayesianChannels) {
  const x = buildFeatureVector(aus);
  trainBuffer.X.push(x);
  for (const [name, score] of Object.entries(bayesianChannels)) {
    if (!trainBuffer.Y[name]) continue;
    trainBuffer.Y[name].push(score);
  }
  // Keep buffer bounded
  while (trainBuffer.X.length > 200) {
    trainBuffer.X.shift();
    for (const arr of Object.values(trainBuffer.Y)) arr.shift();
  }

  sessionCount++;
  if (sessionCount % RETRAIN_INTERVAL === 0 && trainBuffer.X.length >= 10) {
    // Re-train all models
    for (const name of Object.keys(trainBuffer.Y)) {
      if (trainBuffer.Y[name].length < 5) continue;
      const model = getOrCreateModel(name);
      model.fit(trainBuffer.X, trainBuffer.Y[name]);
    }
  }
}

function gbPredict(channelName, aus) {
  const model = models[channelName];
  if (!model || !model.trained) return null;
  const x = buildFeatureVector(aus);
  return model.predict(x);
}

// ─── Task Performance (non-ML) ───
function scoreTaskPerformance(features) {
  const perf = features.performance ?? {};
  const acc = perf.accuracy ?? 0;
  const mrt = perf.meanReactionTimeMs ?? 0;
  const cr = perf.completedCount && perf.trialCount ? perf.completedCount / perf.trialCount : 1;
  const rec = perf.postErrorRecovery ?? 0.5;
  const rtScore = clamp(1 - mrt / 2000);
  const raw = acc * 0.30 + rtScore * 0.25 + cr * 0.20 + rec * 0.15 + 0.10;
  const score = toPercent(raw);
  return { score, level: levelForScore(score) };
}

// ─── Main ───

export function runEdgeAIInference({
  faceSamples = [], pointerSamples = [], taskEvents = [],
  calibrationProfile = null, runtime = {},
} = {}) {
  const generatedAt = new Date().toISOString();

  // Phase 1: Features
  const features = buildFullFeatureVector({ faceSamples, pointerSamples, taskEvents, calibrationProfile });

  // Phase 2: AUs
  const usableSamples = faceSamples.filter(
    s => s?.quality?.facePresent && s?.timestamp >= features.windowFrom && s?.timestamp <= features.windowTo
  );
  const aus = computeAUs(usableSamples);
  const amplifiedAUs = amplifyAllAUs(aus);
    const contrastedAUs = applyTemporalContrast(amplifiedAUs);

    // Phase 3: Bayesian baseline + Gradient Boosting refinement
    const channels = {};
    const bayesianChannels = {};
    for (const name of Object.keys(CHANNEL_LABELS)) {
      if (name === 'taskPerformance') continue;
      const bayesRaw = bayesianScore(name, amplifiedAUs);
      bayesianChannels[name] = bayesRaw;
      // GB uses amplified AUs (not contrasted) for stability
      const gbRaw = gbPredict(name, amplifiedAUs);

    // Try Gradient Boosting prediction
    // Blend: 70% GB + 30% Bayes if GB is trained, else 100% Bayes
    const raw = gbRaw !== null ? gbRaw * 0.7 + bayesRaw * 0.3 : bayesRaw;
    const score = toPercent(raw);
    channels[name] = { score, level: levelForScore(score), raw };
  }
  channels.taskPerformance = scoreTaskPerformance(features);

  // Phase 4: Accumulate for future training
  accumulateAndTrain(amplifiedAUs, bayesianChannels);

  // Phase 5: Emotions
  const emotions = classifyBasicEmotions(amplifiedAUs);

  // Phase 6: Capture quality
  const captureQuality = assessCaptureQuality(faceSamples);

  // Phase 7: Confidence
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

  // Phase 8: Composite
  const scores = Object.values(channels).map(c => c.score);
  const compositeScore = scores.length ? Math.round(scores.reduce((s,v)=>s+v,0)/scores.length) : 0;

  // Phase 9: Calibrated
  const channelScoreMap = {};
  for (const [n, c] of Object.entries(channels)) channelScoreMap[n] = c.score;
  recordSessionScores(channelScoreMap);
  const calibratedChannels = normalizeAllChannels(channels);
  const labeledChannels = {};
  for (const [n, c] of Object.entries(calibratedChannels)) {
    labeledChannels[n] = { ...c, label: CHANNEL_LABELS[n] ?? n };
  }
  return {
    schemaVersion: 'edge_ai_model_output_v6',
    modelVersion: MODEL_VERSION,
    modelKind: 'gradient_boosting_bayes_hybrid',
    generatedAt, runtime,
    governance: { humanReviewOnly: true, noAutomatedHiringDecision: true, observationalSignalsOnly: true },
    featureExtraction: {
      durationMs: features.durationMs,
      facialSampleCount: features.facial?.sampleCount ?? 0,
      usableFacialSamples: features.facial?.usableSampleCount ?? 0,
    },
    auCount: Object.values(aus).filter(au=>au.intensity>0.01).length,
    channels: labeledChannels,
    composite: { score: compositeScore, level: levelForScore(compositeScore) },
    confidence, caveats: [
      'Modelo híbrido: Gradient Boosting + Naive Bayes.',
      'Uso exclusivo para revisión humana.',
      'Señales observacionales; no constituyen diagnóstico clínico.',
    ],
    emotions,
  };
}