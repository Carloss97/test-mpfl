import { ASSESSMENT_FORBIDDEN_KEYS, buildUnifiedAssessmentSession } from '../assessment/assessmentSession.js';
import { buildFinalAssessmentPayload, validateFinalAssessmentPayload } from '../assessment/finalAssessmentPayload.js';
import { buildTalentProfile } from '../assessment/talentProfile.js';
import { generateTalentReport } from '../assessment/talentReportGenerator.js';
import { buildLocalReportBundle } from '../assessment/reportSubmissionClient.js';
import { normalizeGameEvent, summarizeGameEvents } from '../telemetry/gameTelemetry.js';
import { correlateGameWithMultimodalSignals } from '../telemetry/gameCorrelation.js';
import { buildGameFeatureVectorV2 } from '../telemetry/gameFeatureVector.js';
import { runEdgeAIInference } from '../telemetry/edgeAiEngine.js';
import { POSTULATION_DEMO_BATTERY } from './postulationDemoConfig.js';

export const POSTULATION_DEMO_ARTIFACTS_SCHEMA = 'krumm_postulation_demo_artifacts_v1';
export const POSTULATION_DEMO_BATTERY_ID = 'krumm_postulation_demo_mvp_v1';

function nowIso() {
  return new Date().toISOString();
}

function finite(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, finite(value)));
}

function mean(values, fallback = 0) {
  const numeric = values.map(Number).filter(Number.isFinite);
  if (!numeric.length) return fallback;
  return numeric.reduce((sum, value) => sum + value, 0) / numeric.length;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function stripForbidden(value) {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(stripForbidden);
  const safe = {};
  for (const [key, child] of Object.entries(value)) {
    if (ASSESSMENT_FORBIDDEN_KEYS.includes(key)) continue;
    safe[key] = stripForbidden(child);
  }
  return safe;
}

function normalizeCompletedBlocks(completedDemo = {}) {
  const sourceBlocks = Array.isArray(completedDemo.blocks) ? completedDemo.blocks : [];
  return sourceBlocks.map((entry, index) => {
    const block = entry.block ?? entry;
    const summary = stripForbidden(entry.summary ?? entry.result ?? {});
    return {
      index,
      gameId: block.gameId ?? `postulation_block_${index + 1}`,
      label: block.label ?? block.shortLabel ?? 'Juego de postulación',
      skill: block.skill ?? null,
      trialCount: finite(block.trialCount ?? summary.trialCount ?? summary.completedTrialCount ?? 0),
      status: 'completed',
      startedAt: summary.startedAt ?? null,
      endedAt: summary.endedAt ?? null,
      result: summary,
    };
  });
}

function summarizeCompletedBlocks(blocks = []) {
  const completedTrialCounts = blocks.map((block) => finite(block.result?.completedTrialCount ?? block.trialCount));
  const trialCounts = blocks.map((block) => finite(block.result?.trialCount ?? block.trialCount));
  const accuracies = blocks.map((block) => finite(block.result?.accuracy, NaN)).filter(Number.isFinite);
  const scores = blocks.map((block) => finite(block.result?.score ?? block.result?.meanScore, NaN)).filter(Number.isFinite);
  const reactionTimes = blocks.map((block) => finite(block.result?.meanReactionTimeMs ?? block.result?.meanRT, NaN)).filter(Number.isFinite);
  return {
    trialCount: trialCounts.reduce((sum, value) => sum + value, 0),
    completedTrialCount: completedTrialCounts.reduce((sum, value) => sum + value, 0),
    accuracy: clamp01(mean(accuracies, 0)),
    meanScore: clamp01(mean(scores, 0)),
    meanReactionTimeMs: Math.round(mean(reactionTimes, 0)),
  };
}

export function buildPostulationDemoGameSummary({ gameEvents = [], completedDemo = {} } = {}) {
  const normalizedEvents = gameEvents.map((event) => normalizeGameEvent(event));
  const eventSummary = summarizeGameEvents(normalizedEvents);
  const blocks = normalizeCompletedBlocks(completedDemo);
  const blockSummary = summarizeCompletedBlocks(blocks);
  const completedTrialCount = Math.max(eventSummary.performance.completedTrialCount, blockSummary.completedTrialCount);
  const trialCount = Math.max(eventSummary.performance.trialCount, blockSummary.trialCount);
  const accuracy = eventSummary.performance.completedTrialCount > 0 ? eventSummary.performance.accuracy : blockSummary.accuracy;
  const meanReactionTimeMs = eventSummary.performance.meanReactionTimeMs > 0 ? eventSummary.performance.meanReactionTimeMs : blockSummary.meanReactionTimeMs;
  const meanScore = eventSummary.performance.meanScore > 0 ? eventSummary.performance.meanScore : blockSummary.meanScore;
  return {
    ...eventSummary,
    eventCount: normalizedEvents.length,
    trialCount,
    completedTrialCount,
    accuracy,
    meanReactionTimeMs,
    performance: {
      ...eventSummary.performance,
      trialCount,
      completedTrialCount,
      accuracy,
      meanReactionTimeMs,
      meanScore,
    },
  };
}

function buildPostulationGameCorrelation({ normalizedEvents = [], signalContext = null } = {}) {
  const signal = signalContext ?? {};
  const correlation = correlateGameWithMultimodalSignals({
    gameEvents: normalizedEvents,
    faceSamples: safeArray(signal.faceSamples),
    pointerSamples: [],
    gazeSamples: safeArray(signal.gazeSamples),
    postureSamples: safeArray(signal.postureSamples),
    upperBodySamples: safeArray(signal.upperBodySamples),
  });
  return (correlation.aggregate?.trialCount ?? 0) > 0 ? correlation : null;
}

function qualityFromSignalSnapshot(signalSnapshot = null, { gameSummary = null, gameCorrelation = null, edgeAIResult = null } = {}) {
  const snapshot = signalSnapshot ?? {};
  const sampleCount = finite(snapshot.sampleCount);
  const facePresenceRatio = clamp01(snapshot.facePresenceRatio);
  const meanConfidence = clamp01(snapshot.meanConfidence);
  const correlatedTrialCount = Number(gameCorrelation?.aggregate?.completedTrialCount ?? 0);
  const gameTrialCount = Number(gameSummary?.performance?.completedTrialCount ?? gameSummary?.completedTrialCount ?? 0);
  const caveats = Array.isArray(snapshot.caveats) ? [...snapshot.caveats] : [];
  if (sampleCount === 0) caveats.push('camera_not_enabled_or_no_samples');
  if (sampleCount < 20) caveats.push('low_sample_count');
  if (facePresenceRatio < 0.7) caveats.push('low_face_presence');
  if (meanConfidence < 0.55) caveats.push('low_face_confidence');
  if (gameTrialCount > 0 && correlatedTrialCount <= 0) caveats.push('missing_game_correlation');
  if (edgeAIResult && Number(edgeAIResult?.confidence?.score ?? 1) < 0.55) caveats.push('low_model_confidence');
  return {
    sampleCount,
    facePresenceRatio,
    meanConfidence,
    fpsEstimate: finite(snapshot.fpsEstimate),
    correlatedTrialCount,
    caveats: [...new Set(caveats)],
  };
}

function buildBatterySession({ blocks, generatedAt, runId }) {
  return {
    runId,
    batteryId: POSTULATION_DEMO_BATTERY_ID,
    mode: 'postulation_demo',
    createdAt: generatedAt,
    startedAt: generatedAt,
    completedAt: generatedAt,
    state: 'completed',
    baseline: null,
    recovery: null,
    blocks,
  };
}

function score100(value) {
  return Math.round(clamp01(value) * 100);
}

function channel(value, evidence = []) {
  return { score: score100(value), evidence };
}

function buildAggregateEdgeAIResult({ gameSummary, qualitySummary, extraCaveats = [] }) {
  const performance = gameSummary.performance ?? {};
  const accuracy = clamp01(performance.accuracy);
  const trialCount = finite(performance.trialCount);
  const completion = trialCount > 0 ? clamp01(finite(performance.completedTrialCount) / trialCount) : 0;
  const quality = mean([qualitySummary.facePresenceRatio, qualitySummary.meanConfidence], 0);
  const taskPerformance = mean([accuracy, completion, performance.meanScore ?? accuracy], 0);
  const confidence = clamp01((quality * 0.55) + (completion * 0.25) + (accuracy * 0.2));
  return {
    schemaVersion: 'edge_ai_model_output_v8',
    modelVersion: 'krumm-postulation-demo-aggregate-v0.1',
    composite: {
      score: score100(mean([taskPerformance, quality], 0)),
      label: 'aggregate_postulation_demo',
    },
    confidence: {
      score: confidence,
      label: confidence >= 0.65 ? 'usable' : 'caveated',
    },
    channels: {
      taskPerformance: channel(taskPerformance, ['postulation_demo_game_summary']),
      visualAttention: channel(quality, ['signal_quality_snapshot']),
      visuomotorPrecision: channel(taskPerformance, ['candidate_game_stage']),
      inhibitionControl: channel(taskPerformance, ['candidate_game_stage']),
      visualSearchEfficiency: channel(taskPerformance, ['candidate_game_stage']),
      adaptiveResilience: channel(mean([taskPerformance, completion], 0), ['demo_completion']),
      motorControl: channel(mean([taskPerformance, quality], 0), ['aggregate_only']),
      cognitiveLoad: channel(1 - taskPerformance, ['inverse_task_performance_proxy']),
      stressResponse: channel(1 - quality, ['inverse_signal_quality_proxy']),
      fatigueIndex: channel(1 - completion, ['incomplete_demo_proxy']),
    },
    caveats: [...new Set(['aggregate_proxy_only', ...(qualitySummary.caveats ?? []), ...extraCaveats])],
  };
}

function buildRouteEdgeAIResult({ gameSummary, gameCorrelation, signalContext, qualitySummary }) {
  const signal = signalContext ?? {};
  const faceSamples = safeArray(signal.faceSamples);
  if (faceSamples.length >= 2) {
    try {
      return runEdgeAIInference({
        faceSamples,
        pointerSamples: [],
        taskEvents: [],
        runtime: signal.runtime ?? { delegate: null },
        latestGaze: signal.latestGaze ?? null,
        latestPosture: signal.latestPosture ?? null,
        moveNetPose: signal.moveNetPose ?? null,
        gameSummary,
        gameCorrelation,
      });
    } catch {
      return buildAggregateEdgeAIResult({
        gameSummary,
        qualitySummary,
        extraCaveats: ['edge_ai_route_inference_failed'],
      });
    }
  }
  return buildAggregateEdgeAIResult({ gameSummary, qualitySummary });
}

function buildPostulationFeatureVectorV2({ runId, generatedAt, gameSummary, gameCorrelation, edgeAIResult, signalContext }) {
  const performance = gameSummary.performance ?? {};
  const hasGameData = Number(performance.completedTrialCount ?? 0) > 0 || Number(gameSummary.eventCount ?? 0) > 0;
  if (!hasGameData) return null;
  const vector = buildGameFeatureVectorV2({
    runId,
    generatedAt,
    gameSummary,
    gameCorrelation: gameCorrelation ?? {},
    edgeModelOutput: edgeAIResult,
    runtime: signalContext?.runtime ?? { delegate: null, source: 'postulation_demo' },
  });
  return {
    ...vector,
    privacy: {
      videoStored: false,
      frameDataStored: false,
      landmarkDataStored: false,
      pointerPathStored: false,
      gameEventLogStored: false,
      payloadContainsAggregatesOnly: true,
    },
  };
}

function buildReports(payload) {
  return ['markdown', 'html', 'json'].map((format) => generateTalentReport({ payload, format }));
}

export function buildPostulationDemoArtifacts({
  completedDemo = {},
  gameEvents = [],
  signalSnapshot = null,
  signalContext = null,
  generatedAt = nowIso(),
  runId = `postulation-demo-${Date.now()}`,
  participant = {},
} = {}) {
  const blocks = normalizeCompletedBlocks(completedDemo);
  const fallbackBlocks = blocks.length ? blocks : POSTULATION_DEMO_BATTERY
    .filter((block) => block.visible !== false)
    .map((block, index) => ({
      index,
      gameId: block.gameId,
      label: block.label,
      skill: block.skill,
      trialCount: finite(block.trialCount),
      status: 'not_completed',
      startedAt: null,
      endedAt: null,
      result: null,
    }));
  const normalizedEvents = gameEvents.map((event) => normalizeGameEvent(event));
  const gameSummary = buildPostulationDemoGameSummary({ gameEvents: normalizedEvents, completedDemo: { blocks: fallbackBlocks.map((block) => ({ block, summary: block.result ?? {} })) } });
  const gameCorrelation = buildPostulationGameCorrelation({ normalizedEvents, signalContext });
  const baseQualitySummary = qualityFromSignalSnapshot(signalSnapshot, { gameSummary, gameCorrelation });
  const edgeAIResult = buildRouteEdgeAIResult({ gameSummary, gameCorrelation, signalContext, qualitySummary: baseQualitySummary });
  const qualitySummary = qualityFromSignalSnapshot(signalSnapshot, { gameSummary, gameCorrelation, edgeAIResult });
  const featureVectorV2 = buildPostulationFeatureVectorV2({
    runId,
    generatedAt,
    gameSummary,
    gameCorrelation,
    edgeAIResult,
    signalContext,
  });
  const assessmentSession = buildUnifiedAssessmentSession({
    batterySession: buildBatterySession({ blocks: fallbackBlocks, generatedAt, runId }),
    generatedAt,
    consent: {
      camera: Boolean(signalSnapshot?.sampleCount),
      aggregateExport: true,
      humanReviewOnly: true,
    },
    telemetry: qualitySummary,
    gameSummary,
    gameCorrelation,
    edgeAIResult,
    featureVectorV2,
    qualitySummary,
  });
  const talentProfile = buildTalentProfile({ assessmentSession });
  const payload = buildFinalAssessmentPayload({ assessmentSession, talentProfile, participant, generatedAt });
  const validation = validateFinalAssessmentPayload(payload);
  const reports = buildReports(payload);
  const bundle = buildLocalReportBundle({ payload, reports, generatedAt });
  return {
    schemaVersion: POSTULATION_DEMO_ARTIFACTS_SCHEMA,
    generatedAt,
    runId,
    assessmentSession,
    talentProfile,
    payload,
    validation,
    reports,
    bundle,
  };
}
