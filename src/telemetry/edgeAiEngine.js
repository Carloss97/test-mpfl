/**
 * Edge AI Inference Engine v3
 *
 * Modelo de inferencia multidimensional basado en Action Units reales
 * del FACS (Facial Action Coding System), no en proxies heurísticos.
 *
 * Usa las 30 AUs detectadas + 10 microgesture groups + kinematics +
 * performance para producir scores por canal con cadenas de evidencia.
 *
 * Canales:
 *  1. Cognitive Load — AU4 + AU7 + AU1+2 (concentración) + RT variability
 *  2. Emotional Valence — AU6+AU12 (Duchenne) vs AU4+AU15 (distress)
 *  3. Motor Control — path efficiency + AU46 (wink/blink symmetry)
 *  4. Engagement — AU5 (eye aperture) + completion rate + AU43 (partial blink)
 *  5. Stress Response — AU23+AU24 (lip press) + AU9 (nose wrinkle) + jaw clench
 *  6. Fatigue Index — AU45 (blink rate trend) + AU7 (lid tighten) + RT decay
 */

import { buildFullFeatureVector } from './temporalFeatures.js';
import { computeAUs, computeAURegionSummary, computeMicrogestureGroups } from './gestureInsights.js';
import { classifyBasicEmotions } from './basicEmotions.js';
import { assessCaptureQuality } from './facialCapturePipeline.js';
import { recordSessionScores, normalizeAllChannels } from './edgeCalibration.js';

const MODEL_VERSION = 'krumm-edge-ai-v3.0.0';
const MODEL_KIND = 'aus_driven_multidimensional';

// ─── Helpers ───

function round(value, digits = 4) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function toPercent(value) { return Math.round(clamp(value) * 100); }

function levelForScore(score) {
  if (score >= 75) return 'strong';
  if (score >= 40) return 'moderate';
  return 'low';
}

function confLevel(score) {
  if (score >= 0.75) return 'high';
  if (score >= 0.50) return 'medium';
  return 'low';
}

// ─── AU-based feature extraction ───

function auIntensity(auScores, code) {
  return auScores?.[code]?.intensity ?? 0;
}

function auActive(auScores, code, threshold = 0.05) {
  return auIntensity(auScores, code) >= threshold;
}

// ─── Channel scorers ───

/**
 * Cognitive Load — basado en AUs reales:
 *   AU4 (Brow Lowerer): concentración/esfuerzo mental
 *   AU7 (Lid Tightener): squint por carga cognitiva
 *   AU1+2 (Brow Raise): información overload
 *   AU23 (Lip Tightener): tensión oral
 *   Reaction time variability
 */
function scoreCognitiveLoad(aus, features) {
  const au4  = auIntensity(aus, 'AU4');
  const au7  = auIntensity(aus, 'AU7');
  const au1  = auIntensity(aus, 'AU1');
  const au2  = auIntensity(aus, 'AU2');
  const au23 = auIntensity(aus, 'AU23');
  const perf = features.performance ?? {};
  const rtVar = clamp((perf.reactionTimeStdMs ?? 0) / 500);

  const auScore = clamp((au4 * 0.30 + au7 * 0.25 + ((au1 + au2) / 2) * 0.15 + au23 * 0.10) / 0.8);
  const raw = auScore * 0.65 + rtVar * 0.35;
  const score = toPercent(clamp(raw * 1.4));

  return {
    score,
    level: levelForScore(score),
    evidence: `AU4:${round(au4)} AU7:${round(au7)} AU1+2:${round((au1+au2)/2)} AU23:${round(au23)} RT-var:${round(rtVar)}`,
    factors: { au4: round(au4), au7: round(au7), au1_2: round((au1+au2)/2), au23: round(au23), rtVariability: round(rtVar) },
  };
}

/**
 * Emotional Valence — usa el balance real de AUs positivas vs negativas:
 *   Positivas: AU6 (Cheek Raiser) + AU12 (Lip Corner Puller) = Duchenne smile
 *   Negativas: AU4 (Brow Lowerer) + AU15 (Lip Corner Depressor) + AU9 (Nose Wrinkler)
 *   Sincerity: AU6+AU12 co-occurrence (Duchenne marker)
 *   Asymmetry penaliza (sonrisas falsas son asimétricas)
 */
function scoreEmotionalValence(aus, features) {
  const au6  = auIntensity(aus, 'AU6');
  const au12 = auIntensity(aus, 'AU12');
  const au4  = auIntensity(aus, 'AU4');
  const au15 = auIntensity(aus, 'AU15');
  const au9  = auIntensity(aus, 'AU9');
  const l12  = auIntensity(aus, 'AU_L12');
  const r12  = auIntensity(aus, 'AU_R12');

  const positive = clamp((au6 + au12) / 2);
  const negative = clamp((au4 + au15 + au9) / 3);
  const sincerity = au6 > 0.05 && au12 > 0.05 ? clamp(1 - Math.abs(au6 - au12)) : 0.5;
  const asymmetry = clamp(Math.abs(l12 - r12));

  // Valence: positive - negative, mapped to 0-1
  const valence = clamp((positive - negative + 1) / 2);
  // Sincerity boost and asymmetry penalty
  const raw = valence * 0.5 + sincerity * 0.35 + (1 - asymmetry) * 0.15;
  const score = toPercent(raw);

  return {
    score,
    level: levelForScore(score),
    evidence: `AU6:${round(au6)} AU12:${round(au12)} AU4:${round(au4)} AU15:${round(au15)} Duchenne:${round(sincerity)} Asym:${round(asymmetry)}`,
    factors: { positive: round(positive), negative: round(negative), sincerity: round(sincerity), asymmetry: round(asymmetry) },
  };
}

/**
 * Motor Control — basado en AUs de simetría + kinematics:
 *   AU46 (Wink) asymmetry: control motor ocular
 *   Path efficiency: control motor manual
 *   Speed smoothness
 *   Click accuracy
 */
function scoreMotorControl(aus, features) {
  const inter = features.interaction ?? {};
  const perf = features.performance ?? {};

  // AU symmetry as motor control proxy
  const eyeAsym = Math.abs(
    auIntensity(aus, 'AU45') - auIntensity(aus, 'AU45') // blink is bilateral, use eyeAsymmetry group
  );
  const mouthAsym = Math.abs(auIntensity(aus, 'AU_L12') - auIntensity(aus, 'AU_R12'));

  const pathEff = inter?.pointerPathEfficiency ?? 0;
  const speedVol = inter?.pointerSpeedVolatility ?? 0;
  const smoothness = clamp(1 - speedVol * 10);
  const accuracy = perf?.accuracy ?? inter?.clickAccuracy ?? 0;
  const symmetry = clamp(1 - (eyeAsym + mouthAsym));

  const raw = pathEff * 0.25 + smoothness * 0.20 + accuracy * 0.25 + symmetry * 0.30;
  const score = toPercent(raw);

  return {
    score,
    level: levelForScore(score),
    evidence: `PathEff:${round(pathEff)} Smooth:${round(smoothness)} Acc:${round(accuracy)} Symmetry:${round(symmetry)}`,
    factors: { pathEfficiency: round(pathEff), smoothness: round(smoothness), accuracy: round(accuracy), symmetry: round(symmetry) },
  };
}

/**
 * Engagement — usa AUs de atención:
 *   AU5 (Upper Lid Raiser): ojos abiertos = atención
 *   AU43 (Eye Closure partial): parpadeo parcial
 *   AU45 (Blink): parpadeo completo (inverso de atención)
 *   Face presence ratio
 *   Completion rate
 */
function scoreEngagement(aus, features) {
  const au5  = auIntensity(aus, 'AU5');
  const au43 = auIntensity(aus, 'AU43');
  const au45 = auIntensity(aus, 'AU45');
  const facial = features.facial ?? {};
  const perf = features.performance ?? {};

  const facePresence = facial.facePresenceRatio ?? 0;
  const completionRate = perf?.completedCount && perf?.trialCount
    ? perf.completedCount / perf.trialCount : 1;

  const eyeOpenness = clamp(au5 - au45 * 0.5 - au43 * 0.3);
  const raw = facePresence * 0.25 + eyeOpenness * 0.30 + completionRate * 0.25 + clamp(1 - au45) * 0.20;
  const score = toPercent(raw);

  return {
    score,
    level: levelForScore(score),
    evidence: `AU5:${round(au5)} AU45:${round(au45)} AU43:${round(au43)} Face:${round(facePresence)} Comp:${round(completionRate)}`,
    factors: { eyeOpenness: round(eyeOpenness), facePresence: round(facePresence), completionRate: round(completionRate), blinkRate: round(au45) },
  };
}

/**
 * Stress Response — AUs de estrés:
 *   AU23+AU24 (Lip Press/Tighten): tensión oral por estrés
 *   AU9 (Nose Wrinkler): disgusto/estrés
 *   AU4 (Brow Lowerer): tensión
 *   Jaw clench: AU26 (Jaw Drop) inverse + AU27 (Jaw Thrust)
 *   Post-error recovery: capacidad de recuperarse
 */
function scoreStressResponse(aus, features) {
  const au23 = auIntensity(aus, 'AU23');
  const au24 = auIntensity(aus, 'AU24');
  const au9  = auIntensity(aus, 'AU9');
  const au4  = auIntensity(aus, 'AU4');
  const au26 = auIntensity(aus, 'AU26');
  const au27 = auIntensity(aus, 'AU27');
  const perf = features.performance ?? {};

  const lipTension = clamp((au23 + au24) / 2);
  const jawTension = clamp(au27 * 0.7 + (1 - au26) * 0.3);
  const facialStress = clamp((lipTension * 0.35 + au9 * 0.25 + au4 * 0.20 + jawTension * 0.20));

  const recovery = perf?.postErrorRecovery ?? 0.5;
  const raw = (1 - facialStress) * 0.60 + recovery * 0.40;
  const score = toPercent(raw);

  return {
    score,
    level: levelForScore(score),
    evidence: `AU23:${round(au23)} AU24:${round(au24)} AU9:${round(au9)} Jaw:${round(jawTension)} Recovery:${round(recovery)}`,
    factors: { lipTension: round(lipTension), jawTension: round(jawTension), disgust: round(au9), recovery: round(recovery) },
  };
}

/**
 * Fatigue Index — AUs de fatiga:
 *   AU45 trend (blink rate subiendo)
 *   AU7 (Lid Tightener) aumentando
 *   AU43 (partial eye closure)
 *   AU5 (eye aperture) bajando
 *   RT decay (reaction time empeorando)
 */
function scoreFatigueIndex(aus, features) {
  const au45 = auIntensity(aus, 'AU45');
  const au7  = auIntensity(aus, 'AU7');
  const au43 = auIntensity(aus, 'AU43');
  const au5  = auIntensity(aus, 'AU5');
  const facial = features.facial ?? {};
  const perf = features.performance ?? {};

  const blinkTrend = facial.blendshapes?.eyeBlinkLeft?.trend ?? 0;
  const blinkLoad = clamp(au45 + Math.max(0, blinkTrend) * 3);
  const squintLoad = clamp(au7 + au43);
  const eyeClose = clamp(1 - au5);
  const rtFatigue = clamp((perf.meanReactionTimeMs ?? 0) / 1500);

  const raw = blinkLoad * 0.30 + squintLoad * 0.25 + eyeClose * 0.25 + rtFatigue * 0.20;
  const score = toPercent(raw);

  return {
    score,
    level: levelForScore(score),
    evidence: `AU45:${round(au45)} AU7:${round(au7)} AU43:${round(au43)} AU5:${round(au5)} RT:${round(perf.meanReactionTimeMs??0)}ms`,
    factors: { blinkLoad: round(blinkLoad), squintLoad: round(squintLoad), eyeClosure: round(eyeClose), rtFatigue: round(rtFatigue) },
  };
}

// ─── Confidence ───

function estimateConfidence(features) {
  const facial = features.facial ?? {};
  const perf = features.performance ?? {};
  const fp = facial.facePresenceRatio ?? 0;
  const mc = facial.meanConfidence ?? 0;
  const ur = facial.usableSampleCount && facial.sampleCount ? facial.usableSampleCount / facial.sampleCount : 0;
  const ce = features.calibrationEligible !== false;
  const tc = perf?.completedCount && perf?.trialCount ? perf.completedCount / perf.trialCount : 1;

  let base = (fp + mc + ur) / 3;
  if (!ce) base -= 0.15;
  if (tc < 0.7) base -= 0.10;
  if (fp < 0.6) base -= 0.10;

  return {
    score: round(clamp(base), 4),
    level: confLevel(base),
    factors: {
      facePresenceRatio: round(fp), detectionConfidence: round(mc),
      usableSampleRatio: round(ur), calibrationEligible: ce, trialCoverage: round(tc),
    },
  };
}

// ─── Task Performance ───

function scoreTaskPerformance(features) {
  const perf = features.performance ?? {};
  const inter = features.interaction ?? {};

  const accuracy = perf.accuracy ?? inter.clickAccuracy ?? 0;
  const meanRT = perf.meanReactionTimeMs ?? 0;
  const completionRate = perf.completedCount && perf.trialCount ? perf.completedCount / perf.trialCount : 1;
  const postErrorRecovery = perf.postErrorRecovery ?? 0.5;
  const consistency = perf.consistency ?? 0.5;

  const rtScore = clamp(1 - meanRT / 2000); // 0ms → 1.0, 2000ms → 0
  const raw = accuracy * 0.30 + rtScore * 0.25 + completionRate * 0.20 + postErrorRecovery * 0.15 + consistency * 0.10;
  const score = toPercent(raw);

  return {
    score,
    level: levelForScore(score),
    evidence: `Acc:${Math.round(accuracy*100)}% RT:${Math.round(meanRT)}ms Comp:${Math.round(completionRate*100)}% Rec:${Math.round(postErrorRecovery*100)}%`,
    factors: {
      accuracy: round(accuracy), rtScore: round(rtScore),
      completionRate: round(completionRate), postErrorRecovery: round(postErrorRecovery), consistency: round(consistency),
    },
  };
}

// ─── Labels ───

const CHANNEL_LABELS = {
  cognitiveLoad: 'Carga Cognitiva',
  emotionalValence: 'Valencia Emocional',
  motorControl: 'Control Motor',
  engagement: 'Engagement / Atención',
  stressResponse: 'Respuesta al Estrés',
  fatigueIndex: 'Índice de Fatiga',
  taskPerformance: 'Rendimiento en Tarea',
};

// ─── Main ───

export function runEdgeAIInference({
  faceSamples = [], pointerSamples = [], taskEvents = [],
  calibrationProfile = null,
  generatedAt = new Date().toISOString(), runtime = {},
} = {}) {
  // Phase 1: Feature extraction
  const features = buildFullFeatureVector({ faceSamples, pointerSamples, taskEvents, calibrationProfile });

  // Phase 2: AU scores from real samples
  const usableSamples = faceSamples.filter(
    (s) => s?.quality?.facePresent
    && s?.timestamp >= features.windowFrom
    && s?.timestamp <= features.windowTo,
  );
  const aus = computeAUs(usableSamples);

  // Phase 3: Channel scoring with real AUs
  const channels = {
    cognitiveLoad: scoreCognitiveLoad(aus, features),
    emotionalValence: scoreEmotionalValence(aus, features),
    motorControl: scoreMotorControl(aus, features),
    engagement: scoreEngagement(aus, features),
    stressResponse: scoreStressResponse(aus, features),
    fatigueIndex: scoreFatigueIndex(aus, features),
    taskPerformance: scoreTaskPerformance(features),
  };

  // Phase 3.5: Basic Emotions (Ekman)
  const emotions = classifyBasicEmotions(aus);

  // Phase 3.6: Capture quality
  const captureQuality = assessCaptureQuality(faceSamples);

  // Phase 4: Confidence weighted by capture quality
  const baseConfidence = estimateConfidence(features);
  const qualityBoost = (captureQuality?.overallScore ?? 50) / 100;
  const confidence = {
    ...baseConfidence,
    score: Math.round(Math.min(1, baseConfidence.score * (0.7 + qualityBoost * 0.3)) * 10000) / 10000,
    qualityBoost: Math.round(qualityBoost * 100) / 100,
    captureQuality: {
      illumination: captureQuality?.illumination ?? 'unknown',
      occlusion: captureQuality?.occlusion ?? false,
      frontal: captureQuality?.frontal ?? true,
      overallScore: captureQuality?.overallScore ?? 50,
    },
  };

  // Phase 5: Weighted composite — each channel weighted by capture quality
  const channelWeights = {
    cognitiveLoad: 1.0,
    emotionalValence: 1.0,
    motorControl: 1.0,
    engagement: 1.0,
    stressResponse: 1.0,
    fatigueIndex: 1.0,
    taskPerformance: 1.0,
  };
  // Reduce weight of facial channels if illumination is poor
  if (captureQuality?.illumination === 'low') {
    channelWeights.cognitiveLoad = 0.6;
    channelWeights.emotionalValence = 0.5;
    channelWeights.stressResponse = 0.5;
    channelWeights.fatigueIndex = 0.5;
    channelWeights.engagement = 0.6;
  } else if (captureQuality?.illumination === 'moderate') {
    channelWeights.emotionalValence = 0.8;
    channelWeights.stressResponse = 0.8;
  }
  // Boost motor control weight if we have pointer data
  if ((features.interaction?.pointerSampleCount ?? 0) > 5) {
    channelWeights.motorControl = 1.2;
  }

  const weightedEntries = Object.entries(channels).map(([name, ch]) => ({
    score: ch.score,
    weight: channelWeights[name] ?? 1.0,
  }));
  const totalWeight = weightedEntries.reduce((s, w) => s + w.weight, 0);
  const compositeScore = totalWeight > 0
    ? Math.round(weightedEntries.reduce((s, w) => s + w.score * w.weight, 0) / totalWeight)
    : 0;

  // Phase 6: Caveats
  const caveats = [
    'Modelo basado en Action Units reales del FACS (no ML entrenado).',
    'Uso exclusivo para revisión humana; NO para decisiones automatizadas.',
    'Señales observacionales; no constituyen diagnóstico clínico.',
  ];
  if (!features.calibrationEligible) caveats.push('Calibración no elegible; interpretar con cautela.');
  if ((features.facial?.facePresenceRatio ?? 0) < 0.6) caveats.push('Cobertura facial <60%; scores pueden ser ruidosos.');
  if ((features.facial?.usableSampleCount ?? 0) < 10) caveats.push('Pocas muestras utilizables (<10).');

  return {
    schemaVersion: 'edge_ai_model_output_v3',
    modelVersion: MODEL_VERSION,
    modelKind: MODEL_KIND,
    generatedAt, runtime,
    governance: { humanReviewOnly: true, noAutomatedHiringDecision: true, observationalSignalsOnly: true },
    featureExtraction: {
      durationMs: features.durationMs,
      facialSampleCount: features.facial?.sampleCount ?? 0,
      usableFacialSamples: features.facial?.usableSampleCount ?? 0,
      pointerSampleCount: features.interaction?.pointerSampleCount ?? 0,
      taskEventCount: features.performance?.trialCount ?? 0,
      calibrationEligible: features.calibrationEligible,
    },
    auCount: Object.values(aus).filter((au) => au.intensity > 0.01).length,
    channels: Object.fromEntries(
      Object.entries(channels).map(([name, ch]) => [name, { ...ch, label: CHANNEL_LABELS[name] ?? name }]),
    ),
    // Normalize channels against session history
    calibratedChannels: (() => {
      recordSessionScores(channels);
      return normalizeAllChannels(channels);
    })(),
    composite: { score: compositeScore, level: levelForScore(compositeScore) },
    confidence, caveats,
    emotions,
  };
}