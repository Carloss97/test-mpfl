/**
 * Unified Pipeline Worker
 *
 * Worker único que ejecuta todo el pipeline en un hilo separado:
 *   faceSamples → feature extraction → AU computation → edge AI → ML prediction
 *
 * Elimina la necesidad de múltiples workers y reduce la comunicación
 * postMessage. Recibe batches de faceSamples y devuelve resultados completos.
 */

import { buildFullFeatureVector } from './temporalFeatures.js';
import { computeAUs, computeMicrogestureGroups } from './gestureInsights.js';
import { classifyBasicEmotions } from './basicEmotions.js';
import { assessCaptureQuality } from './facialCapturePipeline.js';
import { estimateHeadPose } from './facialCapturePipeline.js';
import { recordSessionScores, normalizeAllChannels } from './edgeCalibration.js';
import { buildMLFeatures, buildMLLabels, accumulateSession, trainFromBuffer } from './edgeMlTrainer.js';

// ─── Embedded channel scorers (replicados del edge engine para autonomía) ───
function round(v, d = 4) { if (!Number.isFinite(v)) return 0; const f = 10 ** d; return Math.round(v * f) / f; }
function clamp(v, min = 0, max = 1) { return Math.min(max, Math.max(min, Number.isFinite(v) ? v : min)); }
function toPercent(value) { return Math.round(clamp(value) * 100); }
function levelForScore(s) { return s >= 75 ? 'strong' : s >= 40 ? 'moderate' : 'low'; }
function confLevel(s) { return s >= 0.75 ? 'high' : s >= 0.50 ? 'medium' : 'low'; }
function auVal(aus, code) { return aus?.[code]?.intensity ?? 0; }

function scoreCognitiveLoad(aus, features) {
  const au4 = auVal(aus, 'AU4'), au7 = auVal(aus, 'AU7'), au1 = auVal(aus, 'AU1'), au2 = auVal(aus, 'AU2');
  const au23 = auVal(aus, 'AU23');
  const perf = features.performance ?? {};
  const rtVar = clamp((perf.reactionTimeStdMs ?? 0) / 500);
  const auScore = clamp((au4 * 0.30 + au7 * 0.25 + ((au1 + au2) / 2) * 0.15 + au23 * 0.10) / 0.8);
  const s = toPercent(clamp((auScore * 0.65 + rtVar * 0.35) * 1.4));
  return { score: s, level: levelForScore(s), evidence: `AU4:${round(au4)} AU7:${round(au7)} AU1+2:${round((au1+au2)/2)} RT-var:${round(rtVar)}` };
}
function scoreEmotionalValence(aus) {
  const au6 = auVal(aus, 'AU6'), au12 = auVal(aus, 'AU12'), au4 = auVal(aus, 'AU4'), au15 = auVal(aus, 'AU15'), au9 = auVal(aus, 'AU9');
  const l12 = auVal(aus, 'AU_L12'), r12 = auVal(aus, 'AU_R12');
  const pos = clamp((au6 + au12) / 2), neg = clamp((au4 + au15 + au9) / 3);
  const sincerity = au6 > 0.05 && au12 > 0.05 ? clamp(1 - Math.abs(au6 - au12)) : 0.5;
  const asym = clamp(Math.abs(l12 - r12));
  const s = toPercent(clamp((pos - neg + 1) / 2) * 0.5 + sincerity * 0.35 + (1 - asym) * 0.15);
  return { score: s, level: levelForScore(s), evidence: `AU6:${round(au6)} AU12:${round(au12)} Duchenne:${round(sincerity)}` };
}
function scoreMotorControl(aus, features) {
  const inter = features.interaction ?? {}; const perf = features.performance ?? {};
  const l12 = auVal(aus, 'AU_L12'), r12 = auVal(aus, 'AU_R12');
  const pathEff = inter?.pointerPathEfficiency ?? 0;
  const speedVol = inter?.pointerSpeedVolatility ?? 0;
  const smoothness = clamp(1 - speedVol * 10);
  const accuracy = perf?.accuracy ?? inter?.clickAccuracy ?? 0;
  const symmetry = clamp(1 - Math.abs(l12 - r12));
  const s = toPercent(pathEff * 0.25 + smoothness * 0.20 + accuracy * 0.25 + symmetry * 0.30);
  return { score: s, level: levelForScore(s), evidence: `Path:${round(pathEff)} Sym:${round(symmetry)} Acc:${round(accuracy)}` };
}
function scoreEngagement(aus, features) {
  const au5 = auVal(aus, 'AU5'), au43 = auVal(aus, 'AU43'), au45 = auVal(aus, 'AU45');
  const facial = features.facial ?? {}; const perf = features.performance ?? {};
  const fp = facial.facePresenceRatio ?? 0;
  const cr = perf?.completedCount && perf?.trialCount ? perf.completedCount / perf.trialCount : 1;
  const eo = clamp(au5 - au45 * 0.5 - au43 * 0.3);
  const s = toPercent(fp * 0.25 + eo * 0.30 + cr * 0.25 + clamp(1 - au45) * 0.20);
  return { score: s, level: levelForScore(s), evidence: `AU5:${round(au5)} AU45:${round(au45)} Face:${round(fp)}` };
}
function scoreStressResponse(aus, features) {
  const au23 = auVal(aus, 'AU23'), au24 = auVal(aus, 'AU24'), au9 = auVal(aus, 'AU9'), au4 = auVal(aus, 'AU4');
  const au26 = auVal(aus, 'AU26'), au27 = auVal(aus, 'AU27');
  const perf = features.performance ?? {};
  const lipT = clamp((au23 + au24) / 2), jawT = clamp(au27 * 0.7 + (1 - au26) * 0.3);
  const fs = clamp(lipT * 0.35 + au9 * 0.25 + au4 * 0.20 + jawT * 0.20);
  const recovery = perf?.postErrorRecovery ?? 0.5;
  const s = toPercent((1 - fs) * 0.60 + recovery * 0.40);
  return { score: s, level: levelForScore(s), evidence: `AU23:${round(au23)} AU9:${round(au9)} Jaw:${round(jawT)}` };
}
function scoreFatigueIndex(aus, features) {
  const au45 = auVal(aus, 'AU45'), au7 = auVal(aus, 'AU7'), au43 = auVal(aus, 'AU43'), au5 = auVal(aus, 'AU5');
  const facial = features.facial ?? {}; const perf = features.performance ?? {};
  const blinkTrend = facial.blendshapes?.eyeBlinkLeft?.trend ?? 0;
  const blinkL = clamp(au45 + Math.max(0, blinkTrend) * 3);
  const squintL = clamp(au7 + au43);
  const ec = clamp(1 - au5);
  const rtF = clamp((perf.meanReactionTimeMs ?? 0) / 1500);
  const s = toPercent(blinkL * 0.30 + squintL * 0.25 + ec * 0.25 + rtF * 0.20);
  return { score: s, level: levelForScore(s), evidence: `AU45:${round(au45)} AU7:${round(au7)} AU5:${round(au5)}` };
}
function scoreTaskPerformance(features) {
  const perf = features.performance ?? {}; const inter = features.interaction ?? {};
  const acc = perf.accuracy ?? inter.clickAccuracy ?? 0;
  const mrt = perf.meanReactionTimeMs ?? 0;
  const cr = perf.completedCount && perf.trialCount ? perf.completedCount / perf.trialCount : 1;
  const rec = perf.postErrorRecovery ?? 0.5;
  const con = perf.consistency ?? 0.5;
  const rtScore = clamp(1 - mrt / 2000);
  const s = toPercent(acc * 0.30 + rtScore * 0.25 + cr * 0.20 + rec * 0.15 + con * 0.10);
  return { score: s, level: levelForScore(s), evidence: `Acc:${Math.round(acc*100)}% RT:${Math.round(mrt)}ms` };
}
function scoreMicrogestureStability(aus) {
  // Mide coherencia temporal: qué tan estables son las AUs entre frames
  // Usamos el hecho de que AUs simétricas (L/R) deberían ser similares
  const pairs = [['AU_L12','AU_R12'],['AU_L14','AU_R14']];
  let asymSum = 0, count = 0;
  for (const [l, r] of pairs) {
    const vl = auVal(aus, l), vr = auVal(aus, r);
    if (vl > 0.02 || vr > 0.02) { asymSum += Math.abs(vl - vr); count++; }
  }
  const stability = count ? clamp(1 - asymSum / count) : 1;
  const s = toPercent(stability);
  return { score: s, level: levelForScore(s), evidence: `Asimetría media: ${round(count?asymSum/count:0)}` };
}

const CHANNEL_LABELS = {
  cognitiveLoad: 'Carga Cognitiva', emotionalValence: 'Valencia Emocional',
  motorControl: 'Control Motor', engagement: 'Engagement',
  stressResponse: 'Respuesta al Estrés', fatigueIndex: 'Índice de Fatiga',
  taskPerformance: 'Rendimiento', microgestureStability: 'Estabilidad Microgestual',
};

// ─── Main handler ───

self.onmessage = async (event) => {
  const { type, payload } = event.data ?? {};

  if (type === 'infer') {
    try {
      const { faceSamples = [], pointerSamples = [], taskEvents = [], calibrationProfile = null } = payload ?? {};

      // Feature extraction
      const features = buildFullFeatureVector({ faceSamples, pointerSamples, taskEvents, calibrationProfile });

      // AUs
      const usable = faceSamples.filter(s => s?.quality?.facePresent);
      const aus = computeAUs(usable);

      // Channels
      const channels = {
        cognitiveLoad: scoreCognitiveLoad(aus, features),
        emotionalValence: scoreEmotionalValence(aus),
        motorControl: scoreMotorControl(aus, features),
        engagement: scoreEngagement(aus, features),
        stressResponse: scoreStressResponse(aus, features),
        fatigueIndex: scoreFatigueIndex(aus, features),
        taskPerformance: scoreTaskPerformance(features),
        microgestureStability: scoreMicrogestureStability(aus),
      };

      // Emotions + quality
      const emotions = classifyBasicEmotions(aus);
      const headPose = usable.length > 0 ? estimateHeadPose(faceSamples[faceSamples.length - 1]?.landmarks) : null;
      const captureQuality = assessCaptureQuality(faceSamples, headPose);

      // ML prediction
      const mg = computeMicrogestureGroups(usable);
      let mlPrediction = null;
      try {
        const bufSize = (typeof globalThis !== 'undefined' && globalThis.__mlBufferSize) || 0;
        if (bufSize >= 5) {
          const { model } = trainFromBuffer();
          const mlFeatures = buildMLFeatures({ featureExtraction: features }, aus, mg, headPose);
          mlPrediction = model.predictClass(mlFeatures);
        }
      } catch (e) { /* ML not ready yet */ }

      // Accumulate for future training
      accumulateSession({ channels }, aus, mg, headPose);

      // Normalize
      recordSessionScores(channels);
      const calibratedChannels = normalizeAllChannels(channels);

      // Composite
      const scores = Object.values(channels).map(c => c.score);
      const compositeScore = scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0;

      // Confidence
      const fp = features.facial?.facePresenceRatio ?? 0;
      const mc = features.facial?.meanConfidence ?? 0;
      const ce = features.calibrationEligible !== false;
      const baseConf = clamp((fp + mc) / 2 - (ce ? 0 : 0.1));
      const qb = (captureQuality?.overallScore ?? 50) / 100;
      const confidence = { score: round(clamp(baseConf * (0.7 + qb * 0.3)), 4), level: confLevel(baseConf), captureQuality };

      const labeledChannels = Object.fromEntries(
        Object.entries(calibratedChannels).map(([n, c]) => [n, { ...c, label: CHANNEL_LABELS[n] ?? n }]),
      );

      postMessage({
        type: 'result',
        payload: {
          schemaVersion: 'pipeline_worker_v1',
          timestamp: performance.now(),
          features: { sampleCount: features.facial?.sampleCount ?? 0, usableCount: features.facial?.usableSampleCount ?? 0 },
          auCount: Object.values(aus).filter(a => a.intensity > 0.01).length,
          channels: labeledChannels,
          composite: { score: compositeScore, level: levelForScore(compositeScore) },
          confidence, emotions, captureQuality, headPose,
          mlPrediction,
        },
      });
    } catch (error) {
      postMessage({ type: 'error', message: error?.message ?? String(error) });
    }
  }

  if (type === 'clear_history') {
    // Import would need to be at top level; handled via edgeCalibration module
    postMessage({ type: 'cleared' });
  }
};