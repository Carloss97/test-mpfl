import { TALENT_DIMENSION_DEFINITIONS } from './talentDimensions.js';

function clamp(value, min = 0, max = 1) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  return Math.min(max, Math.max(min, numeric));
}

function score(value) {
  return Math.round(clamp(value) * 100);
}

function mean(values) {
  const numeric = values.map(Number).filter(Number.isFinite);
  if (!numeric.length) return 0;
  return numeric.reduce((sum, value) => sum + value, 0) / numeric.length;
}

function channel(edgeAI = {}, name, fallback = 50) {
  return Number(edgeAI.channels?.[name]?.score ?? fallback) / 100;
}

function feature(featureMap = {}, name, fallback = 0) {
  return Number(featureMap[name] ?? fallback);
}

function inverseRate(value) {
  return 1 - clamp(value);
}

function speedFromReactionTime(rtMs) {
  const rt = Number(rtMs);
  if (!Number.isFinite(rt) || rt <= 0) return 0;
  return clamp(1 - ((rt - 250) / 950));
}

function conflictScore(conflictMs) {
  return clamp(1 - (Number(conflictMs) || 0) / 700);
}

function qualityConfidence(qualitySummary = {}, edgeAI = {}) {
  const face = clamp(qualitySummary.facePresenceRatio ?? 0);
  const confidence = clamp(qualitySummary.meanConfidence ?? 0);
  const correlated = Number(qualitySummary.correlatedTrialCount ?? 0) > 0 ? 1 : 0;
  const model = clamp(edgeAI.confidence?.score ?? 0.5);
  const raw = face * 0.32 + confidence * 0.32 + correlated * 0.22 + model * 0.14;
  const penalty = Math.min(0.35, (qualitySummary.caveats ?? []).length * 0.08);
  return clamp(raw - penalty);
}

function completionRatio(performance = {}) {
  const trialCount = Number(performance.trialCount ?? 0);
  const completed = Number(performance.completedTrialCount ?? 0);
  return trialCount > 0 ? clamp(completed / trialCount) : 0;
}

function dimension({ id, rawScore, confidence, evidence, caveats }) {
  const definition = TALENT_DIMENSION_DEFINITIONS[id];
  return {
    id,
    label: definition.label,
    description: definition.description,
    score: score(rawScore),
    confidence: Number(clamp(confidence).toFixed(3)),
    evidence: evidence.filter(Boolean),
    caveats: [...new Set(caveats ?? [])],
    interpretation: 'Señal observacional para revisión humana; debe leerse junto con calidad de captura y contexto de tarea.',
  };
}

function qualityCaveats(session = {}) {
  return session.qualitySummary?.caveats ?? [];
}

function hasPendingOriginalGameMapping(session = {}) {
  return session.mode === 'postulation_demo_original_games'
    || qualityCaveats(session).includes('original_games_metrics_pending_r6_mapping');
}

function buildPendingMappingDimensions(session = {}) {
  const caveats = [...new Set([
    ...qualityCaveats(session),
    'original_games_metrics_pending_r6_mapping',
  ])];
  const confidence = Math.min(0.25, qualityConfidence(session.qualitySummary, session.edgeAI));
  return Object.fromEntries(Object.keys(TALENT_DIMENSION_DEFINITIONS).map((id) => [id, dimension({
    id,
    rawScore: 0.5,
    confidence,
    evidence: ['Métricas agregadas preservadas; mapeo específico pendiente de validación.'],
    caveats,
  })]));
}

function buildDimensions(session) {
  if (hasPendingOriginalGameMapping(session)) return buildPendingMappingDimensions(session);
  const game = session.gameSummary ?? {};
  const performance = game.performance ?? {};
  const motor = game.motor ?? {};
  const inhibition = game.inhibition ?? {};
  const interference = game.interference ?? {};
  const visualSearch = game.visualSearch ?? {};
  const featureMap = session.featureVectorV2?.featureMap ?? {};
  const edgeAI = session.edgeAI ?? {};
  const quality = qualityConfidence(session.qualitySummary, edgeAI);
  const caveats = qualityCaveats(session);

  const accuracy = clamp(performance.accuracy ?? feature(featureMap, 'game.accuracy'));
  const completion = completionRatio(performance);
  const rt = Number(performance.meanReactionTimeMs ?? feature(featureMap, 'game.meanReactionTimeMs'));
  const pathEfficiency = clamp(motor.pathEfficiencyMean ?? feature(featureMap, 'pointer.pathEfficiencyMean'));
  const smoothPursuit = clamp(motor.smoothPursuitScore ?? feature(featureMap, 'pointer.smoothPursuitScore'));
  const trackingLoss = clamp(motor.trackingLossRatio ?? feature(featureMap, 'pointer.trackingLossRatio'));
  const overshoot = clamp(motor.overshootRate ?? feature(featureMap, 'pointer.overshootRate'));
  const commission = clamp(inhibition.commissionErrorRate ?? feature(featureMap, 'response.commissionErrorRate'));
  const omission = clamp(inhibition.omissionErrorRate ?? feature(featureMap, 'response.omissionErrorRate'));
  const conflict = Number(interference.conflictCostMs ?? feature(featureMap, 'interference.conflictCostMs'));
  const interferenceError = clamp(interference.errorRate ?? feature(featureMap, 'interference.errorRate'));
  const visualEfficiency = clamp(visualSearch.searchEfficiency ?? feature(featureMap, 'game.visualSearchEfficiency'));
  const postureDelta = Number(session.gameCorrelation?.aggregate?.meanReactionPostureDelta ?? feature(featureMap, 'correlation.meanReactionPostureDelta'));
  const difficultyDirections = (session.adaptiveDifficultyTrace ?? []).map((entry) => entry.direction);

  return {
    processingSpeed: dimension({
      id: 'processingSpeed',
      rawScore: mean([speedFromReactionTime(rt), accuracy, completion, channel(edgeAI, 'taskPerformance')]),
      confidence: quality,
      caveats,
      evidence: [`RT medio ${Math.round(rt)}ms`, `accuracy ${Math.round(accuracy * 100)}%`, `completion ${Math.round(completion * 100)}%`],
    }),
    visuomotorPrecision: dimension({
      id: 'visuomotorPrecision',
      rawScore: mean([pathEfficiency, inverseRate(overshoot), smoothPursuit, channel(edgeAI, 'visuomotorPrecision')]),
      confidence: quality,
      caveats,
      evidence: [`pathEfficiency ${Math.round(pathEfficiency * 100)}%`, `overshoot ${Math.round(overshoot * 100)}%`, `Fitts/visuomotor channel ${Math.round(channel(edgeAI, 'visuomotorPrecision') * 100)}%`],
    }),
    continuousMotorControl: dimension({
      id: 'continuousMotorControl',
      rawScore: mean([smoothPursuit, inverseRate(trackingLoss), channel(edgeAI, 'motorControl')]),
      confidence: quality,
      caveats,
      evidence: [`smoothPursuit ${Math.round(smoothPursuit * 100)}%`, `trackingLoss ${Math.round(trackingLoss * 100)}%`, `motorControl ${Math.round(channel(edgeAI, 'motorControl') * 100)}%`],
    }),
    sustainedAttention: dimension({
      id: 'sustainedAttention',
      rawScore: mean([completion, channel(edgeAI, 'visualAttention'), inverseRate(trackingLoss), quality]),
      confidence: quality,
      caveats,
      evidence: [`visualAttention ${Math.round(channel(edgeAI, 'visualAttention') * 100)}%`, `completion ${Math.round(completion * 100)}%`, `trackingLoss ${Math.round(trackingLoss * 100)}%`],
    }),
    inhibitoryControl: dimension({
      id: 'inhibitoryControl',
      rawScore: mean([inverseRate(Math.max(commission, omission)), channel(edgeAI, 'inhibitionControl')]),
      confidence: quality,
      caveats,
      evidence: [`commissionErrorRate ${Math.round(commission * 100)}%`, `omissionErrorRate ${Math.round(omission * 100)}%`, `postErrorSlowing ${Math.round(inhibition.postErrorSlowingMs ?? 0)}ms`],
    }),
    interferenceControl: dimension({
      id: 'interferenceControl',
      rawScore: mean([conflictScore(conflict), inverseRate(interferenceError), inverseRate(channel(edgeAI, 'cognitiveLoad'))]),
      confidence: quality,
      caveats,
      evidence: [`conflictCost ${Math.round(conflict)}ms`, `interference error ${Math.round(interferenceError * 100)}%`, `cognitiveLoad ${Math.round(channel(edgeAI, 'cognitiveLoad') * 100)}%`],
    }),
    visualSearchEfficiency: dimension({
      id: 'visualSearchEfficiency',
      rawScore: mean([visualEfficiency, inverseRate(visualSearch.errorRate ?? 0), channel(edgeAI, 'visualSearchEfficiency')]),
      confidence: quality,
      caveats,
      evidence: [`searchEfficiency ${Math.round(visualEfficiency * 100)}%`, `setSize medio ${Math.round(visualSearch.meanSetSize ?? 0)}`, `visualSearch channel ${Math.round(channel(edgeAI, 'visualSearchEfficiency') * 100)}%`],
    }),
    adaptability: dimension({
      id: 'adaptability',
      rawScore: mean([channel(edgeAI, 'adaptiveResilience'), difficultyDirections.includes('up') ? 0.85 : difficultyDirections.includes('down') ? 0.35 : 0.6, accuracy]),
      confidence: quality,
      caveats,
      evidence: [`adaptiveResilience ${Math.round(channel(edgeAI, 'adaptiveResilience') * 100)}%`, `difficulty directions ${difficultyDirections.join(',') || 'hold'}`],
    }),
    behavioralConsistency: dimension({
      id: 'behavioralConsistency',
      rawScore: mean([completion, accuracy, inverseRate(Math.max(interferenceError, commission, omission)), inverseRate(channel(edgeAI, 'fatigueIndex'))]),
      confidence: quality,
      caveats,
      evidence: [`completion ${Math.round(completion * 100)}%`, `accuracy ${Math.round(accuracy * 100)}%`, `fatigueIndex ${Math.round(channel(edgeAI, 'fatigueIndex') * 100)}%`],
    }),
    regulationUnderLoad: dimension({
      id: 'regulationUnderLoad',
      rawScore: mean([inverseRate(channel(edgeAI, 'cognitiveLoad')), inverseRate(channel(edgeAI, 'stressResponse')), inverseRate(channel(edgeAI, 'fatigueIndex')), clamp(1 + postureDelta)]),
      confidence: quality,
      caveats,
      evidence: [`cognitiveLoad ${Math.round(channel(edgeAI, 'cognitiveLoad') * 100)}%`, `stressResponse ${Math.round(channel(edgeAI, 'stressResponse') * 100)}%`, `reactionPostureDelta ${postureDelta.toFixed(3)}`],
    }),
  };
}

function globalSummary(dimensions, confidence) {
  const entries = Object.values(dimensions);
  return {
    strengths: entries.filter((entry) => entry.score >= 75).map((entry) => entry.label).slice(0, 4),
    watchAreas: entries.filter((entry) => entry.score < 60).map((entry) => entry.label).slice(0, 4),
    confidence: Number(clamp(confidence).toFixed(3)),
  };
}

export function buildTalentProfile({ assessmentSession }) {
  const dimensions = buildDimensions(assessmentSession ?? {});
  const rawConfidence = qualityConfidence(assessmentSession?.qualitySummary, assessmentSession?.edgeAI);
  const confidence = hasPendingOriginalGameMapping(assessmentSession) ? Math.min(0.25, rawConfidence) : rawConfidence;
  return {
    schemaVersion: 'krumm_talent_profile_v1',
    runId: assessmentSession?.runId ?? null,
    batteryId: assessmentSession?.batteryId ?? null,
    dimensions,
    globalSummary: globalSummary(dimensions, confidence),
    governance: {
      humanReviewOnly: true,
      noAutomatedDecision: true,
      observationalOnly: true,
    },
  };
}

export function summarizeTalentProfile(profile) {
  const strengths = profile?.globalSummary?.strengths ?? [];
  const watchAreas = profile?.globalSummary?.watchAreas ?? [];
  const strengthText = strengths.length ? strengths.join(', ') : 'sin fortalezas dominantes por sobre umbral';
  const watchText = watchAreas.length ? watchAreas.join(', ') : 'sin áreas críticas bajo umbral';
  return `Resumen para revisión humana: fortalezas observables: ${strengthText}. Áreas a revisar: ${watchText}. Confianza global ${Math.round((profile?.globalSummary?.confidence ?? 0) * 100)}%.`;
}
