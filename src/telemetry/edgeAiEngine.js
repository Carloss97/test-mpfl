/**
 * Edge AI Engine v8.1 — Pipeline lineal multimodal
 *
 * Etapas:
 *   1. buildMultimodalFeatures → features temporales + AUs + gaze/postura/MoveNet/game
 *   2. processAllAUs (auProcessor) → AUs procesadas (baseline + gain)
 *   3. Bayesian scoring por canal (likelihood ratios) + modificadores multimodales/game-aware
 *   4. classifyEmotions (emotionClassifier) → Naive Bayes
 *
 * Sin Gradient Boosting (requiere entrenamiento, inestable al inicio).
 * Sin contraste temporal en inferencia.
 * Sin double boost.
 * Un solo punto de entrada: runEdgeAIInference()
 */

import { buildMultimodalFeatures } from './multimodalFeatures.js';
import { recordSessionScores, normalizeAllChannels } from './edgeCalibration.js';

const MODEL_VERSION = 'krumm-edge-ai-v8.2.0-game-aware';

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
  visualAttention: 'Atención Visual',
  postureQuality: 'Calidad Postural',
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
function scoreTaskPerformance(multimodal) {
  const perf = multimodal.task ?? multimodal.performance ?? {};
  const acc = perf.accuracy ?? 0;
  const mrt = perf.meanReactionTimeMs ?? 0;
  const completed = perf.completedTrialCount ?? perf.completedCount;
  const cr = completed && perf.trialCount ? completed / perf.trialCount : 1;
  const meanScore = perf.meanScore ?? acc;
  const rtScore = clamp(1 - mrt / 2000);
  const raw = acc * 0.30 + meanScore * 0.20 + rtScore * 0.30 + cr * 0.20;
  const score = toPercent(raw);
  return { score, level: levelForScore(score), source: multimodal.game?.available ? 'game_telemetry' : 'task' };
}

function channelFromRaw(raw, extras = {}) {
  const score = Math.round(clamp(raw) * 100);
  return { score, level: levelForScore(score), ...extras };
}

function scoreVisualAttention(multimodal) {
  const gaze = multimodal.gaze ?? {};
  if (!gaze.available) {
    return channelFromRaw(0.5, { confidence: 0, caveats: ['gaze_unavailable'] });
  }
  const focus = gaze.lookingAtScreen ? (gaze.confidence ?? 0) : 0;
  const raw = focus * 0.80 + (1 - (gaze.distractionScore ?? 1)) * 0.20;
  return channelFromRaw(raw, { confidence: round(gaze.confidence ?? 0), source: 'gaze' });
}

function scorePostureQuality(multimodal) {
  const posture = multimodal.posture ?? {};
  const upper = multimodal.upperBody ?? {};
  if (!posture.available && !upper.available) {
    return channelFromRaw(0.5, { confidence: 0, caveats: ['posture_unavailable'] });
  }
  const postureScore = posture.available ? (posture.postureScore ?? 0.5) : 0.5;
  const headForwardPenalty = posture.available ? (posture.headForward ?? 0) : 0;
  const shoulderQuality = upper.available ? (upper.shoulderSymmetry ?? 0) * (upper.confidence ?? 0) : 0.5;
  const raw = postureScore * 0.55 + shoulderQuality * 0.30 + (1 - headForwardPenalty) * 0.15;
  const confidence = clamp((posture.confidence ?? 0) * 0.55 + (upper.confidence ?? 0) * 0.45);
  return channelFromRaw(raw, { confidence: round(confidence), source: upper.available ? 'posture+movenet' : 'posture' });
}

function applyMultimodalChannelModifiers(channels, multimodal) {
  const visual = channels.visualAttention?.score ?? 50;
  const posture = channels.postureQuality?.score ?? 50;
  const gazeInstability = multimodal.gaze?.available ? (multimodal.gaze.distractionScore ?? 0) * 100 : 0;
  const headForward = multimodal.posture?.available ? (multimodal.posture.headForward ?? 0) * 100 : 0;
  const posturePenalty = 100 - posture;

  if (channels.engagement) {
    const score = Math.round(channels.engagement.score * 0.55 + visual * 0.30 + posture * 0.15);
    channels.engagement = { ...channels.engagement, score, level: levelForScore(score), multimodalAdjusted: true };
  }
  if (channels.fatigueIndex) {
    const score = Math.round(channels.fatigueIndex.score * 0.70 + headForward * 0.20 + gazeInstability * 0.10);
    channels.fatigueIndex = { ...channels.fatigueIndex, score, level: levelForScore(score), multimodalAdjusted: true };
  }
  if (channels.stressResponse) {
    const score = Math.round(channels.stressResponse.score * 0.75 + posturePenalty * 0.15 + gazeInstability * 0.10);
    channels.stressResponse = { ...channels.stressResponse, score, level: levelForScore(score), multimodalAdjusted: true };
  }
  if (channels.motorControl && multimodal.game?.available) {
    const motor = multimodal.game.motor ?? {};
    const path = motor.pathEfficiencyMean || 0;
    const pursuit = motor.smoothPursuitScore || 0;
    const lowLoss = 1 - clamp(motor.trackingLossRatio ?? 0);
    const lowOvershoot = 1 - clamp((motor.overshootRate ?? 0) / 3);
    const lowJerk = 1 - clamp((motor.jerkMean ?? 0) * 10);
    const motorRaw = clamp(path * 0.35 + pursuit * 0.25 + lowLoss * 0.15 + lowOvershoot * 0.15 + lowJerk * 0.10);
    const score = Math.round(channels.motorControl.score * 0.45 + motorRaw * 100 * 0.55);
    channels.motorControl = { ...channels.motorControl, score, level: levelForScore(score), gameAdjusted: true, source: 'aus_facs+game_telemetry' };
  }
}

const COMPOSITE_WEIGHTS = {
  engagement: { weight: 0.18, polarity: 1 },
  visualAttention: { weight: 0.18, polarity: 1 },
  postureQuality: { weight: 0.14, polarity: 1 },
  taskPerformance: { weight: 0.14, polarity: 1 },
  emotionalValence: { weight: 0.10, polarity: 1 },
  motorControl: { weight: 0.08, polarity: 1 },
  cognitiveLoad: { weight: 0.06, polarity: -1 },
  fatigueIndex: { weight: 0.06, polarity: -1 },
  stressResponse: { weight: 0.06, polarity: -1 },
};

function computeWeightedComposite(channels) {
  let totalWeight = 0;
  let weighted = 0;
  const contributors = {};
  for (const [name, config] of Object.entries(COMPOSITE_WEIGHTS)) {
    const channel = channels[name];
    if (!channel) continue;
    const effectiveScore = config.polarity < 0 ? 100 - channel.score : channel.score;
    weighted += effectiveScore * config.weight;
    totalWeight += config.weight;
    contributors[name] = { weight: config.weight, polarity: config.polarity, effectiveScore };
  }
  const score = totalWeight > 0 ? Math.round(weighted / totalWeight) : 0;
  return { score, level: levelForScore(score), contributors };
}

function annotateChannelConfidenceAndCaveats(channels, confidence) {
  const baseConfidence = confidence?.score ?? 0;
  for (const [name, channel] of Object.entries(channels)) {
    const caveats = [...(channel.caveats ?? [])];
    if (baseConfidence < 0.5 && !caveats.includes('low_capture_confidence')) caveats.push('low_capture_confidence');
    const source = channel.source ?? (name === 'taskPerformance' ? 'task' : 'aus_facs');
    channels[name] = {
      ...channel,
      confidence: round(channel.confidence ?? baseConfidence),
      source,
      caveats,
    };
  }
}

// ─── Main ───

export function runEdgeAIInference({
  faceSamples = [], pointerSamples = [], taskEvents = [],
  calibrationProfile = null, runtime = {},
  latestGaze = null, latestPosture = null, moveNetPose = null,
  gameSummary = null,
} = {}) {
  const generatedAt = new Date().toISOString();

  // Stage 1-2: multimodal feature extraction + AU processing
  const multimodal = buildMultimodalFeatures({
    faceSamples,
    pointerSamples,
    taskEvents,
    calibrationProfile,
    latestGaze,
    latestPosture,
    moveNetPose,
    gameSummary,
  });
  const features = multimodal.temporal;
  const aus = multimodal.aus;

  // Stage 3: Channel scoring
  const channels = {};
  for (const name of Object.keys(CHANNEL_LABELS)) {
    if (name === 'taskPerformance' || name === 'visualAttention' || name === 'postureQuality') continue;
    const raw = bayesianChannelScore(name, aus);
    const score = toPercent(raw);
    channels[name] = { score, level: levelForScore(score) };
  }
  channels.visualAttention = scoreVisualAttention(multimodal);
  channels.postureQuality = scorePostureQuality(multimodal);
  applyMultimodalChannelModifiers(channels, multimodal);
  channels.taskPerformance = scoreTaskPerformance(multimodal);

  // Stage 4: Emotions
  const emotions = multimodal.emotions;

  // Capture quality
  const captureQuality = multimodal.captureQuality;

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

  // Channel confidence/caveats and objective composite
  annotateChannelConfidenceAndCaveats(channels, confidence);
  const composite = computeWeightedComposite(channels);

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
      usableFacialSamples: multimodal.sampleCounts.usableFaceSamples,
    },
    auCount: Object.values(aus).filter(au => au.intensity > 0.01).length,
    channels: labeledChannels,
    composite,
    confidence,
    multimodal: {
      gaze: multimodal.gaze,
      posture: multimodal.posture,
      upperBody: multimodal.upperBody,
      game: multimodal.game,
      quality: multimodal.quality,
    },
    caveats: [
      'Modelo bayesiano basado en AUs del FACS.',
      'Uso exclusivo para revisión humana.',
      'Señales observacionales; no constituyen diagnóstico clínico.',
    ],
    emotions,
  };
}
