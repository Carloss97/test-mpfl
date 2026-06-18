import { buildAssessmentFeatureVector, buildAssessmentFeatureVectorV2 } from './assessmentFeatureVector.js';
import { generateEdgeModelOutput } from './edgeInference.js';
import { runEdgeAIInference } from './edgeAiEngine.js';
import { buildCalibrationProfile } from './microgestureFeatures.js';
import { correlateSignalsWithTasks } from './taskCorrelation.js';

export const DEFAULT_BLENDSHAPES = Object.freeze([
  'jawOpen',
  'browInnerUp',
  'eyeBlinkLeft',
  'eyeBlinkRight',
  'eyeSquintLeft',
  'eyeSquintRight',
  'eyeWideLeft',
  'eyeWideRight',
  'mouthPressLeft',
  'mouthPressRight',
]);

function round(value, digits = 4) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function emptyBlendshapeSummary(blendshapeNames) {
  return {
    sampleCount: 0,
    ...Object.fromEntries(blendshapeNames.map((name) => [name, { avg: 0, max: 0 }])),
    signalQuality: {
      facePresenceRatio: 0,
      meanConfidence: 0,
    },
  };
}

export function summarizeBlendshapes(samples = [], blendshapeNames = DEFAULT_BLENDSHAPES) {
  const validSamples = samples.filter((sample) => sample && typeof sample === 'object');
  if (!validSamples.length) {
    return emptyBlendshapeSummary(blendshapeNames);
  }

  const summary = {
    sampleCount: validSamples.length,
  };

  for (const name of blendshapeNames) {
    const values = validSamples.map((sample) => Number(sample.blendshapes?.[name] ?? 0));
    summary[name] = {
      avg: round(values.reduce((sum, value) => sum + value, 0) / values.length),
      max: round(Math.max(...values)),
    };
  }

  const presentCount = validSamples.filter((sample) => sample.quality?.facePresent).length;
  const confidenceValues = validSamples.map((sample) => Number(sample.quality?.confidence ?? 0));

  summary.signalQuality = {
    facePresenceRatio: round(presentCount / validSamples.length),
    meanConfidence: round(confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length),
  };

  return summary;
}

function summarizeWindow(samples, from, to, blendshapeNames, includeEnd = false) {
  const windowSamples = samples.filter((sample) => {
    const timestamp = Number(sample.timestamp);
    return includeEnd ? timestamp >= from && timestamp <= to : timestamp >= from && timestamp < to;
  });

  return {
    from,
    to,
    ...summarizeBlendshapes(windowSamples, blendshapeNames),
  };
}

export function summarizeFaceAroundClick(
  samples = [],
  clickEvent,
  {
    beforeMs = 1000,
    duringMs = 500,
    afterMs = 1000,
    blendshapeNames = DEFAULT_BLENDSHAPES,
  } = {},
) {
  const clickedAt = Number(clickEvent.timestamp);
  const beforeFrom = clickedAt - beforeMs;
  const duringTo = clickedAt + duringMs;
  const afterTo = duringTo + afterMs;

  return {
    eventId: clickEvent.eventId,
    targetId: clickEvent.targetId,
    clickedAt,
    before: summarizeWindow(samples, beforeFrom, clickedAt, blendshapeNames),
    during: summarizeWindow(samples, clickedAt, duringTo, blendshapeNames),
    after: summarizeWindow(samples, duringTo, afterTo, blendshapeNames, true),
  };
}

function sanitizeGameSummary(gameSummary = null) {
  if (!gameSummary) return null;
  return {
    eventCount: Number(gameSummary.eventCount ?? 0),
    performance: { ...gameSummary.performance },
    motor: { ...gameSummary.motor },
    fitts: { ...gameSummary.fitts },
    inhibition: { ...gameSummary.inhibition },
    interference: { ...gameSummary.interference },
    visualSearch: { ...gameSummary.visualSearch },
  };
}

function sanitizeGameCorrelation(gameCorrelation = null) {
  if (!gameCorrelation?.aggregate) return null;
  return {
    schemaVersion: gameCorrelation.schemaVersion ?? 'game_signal_correlation_v3',
    aggregate: { ...gameCorrelation.aggregate },
    privacy: {
      containsRawFaceSamples: false,
      containsRawPointerPath: false,
      containsRawGameStimuli: false,
      aggregateOnlyWindows: true,
    },
  };
}

function sanitizeGameFeatureVector(vector = null) {
  if (!vector) return null;
  return {
    type: vector.type,
    version: vector.version,
    privacy: { ...vector.privacy },
    featureOrder: [...(vector.featureOrder ?? [])],
    featureArray: [...(vector.featureArray ?? [])],
    featureMap: { ...vector.featureMap },
    aggregate: { ...vector.aggregate },
    game: { ...vector.game },
    pointer: { ...vector.pointer },
    response: { ...vector.response },
    multimodalDuringTrials: { ...vector.multimodalDuringTrials },
    qualityFlags: [...(vector.qualityFlags ?? [])],
    model: { ...vector.model },
  };
}

export function buildFusionPayload({
  runId,
  generatedAt = new Date().toISOString(),
  startedAt,
  endedAt,
  faceSamples = [],
  pointerSamples = [],
  pointerSummary,
  clickEvents = [],
  taskEvents = [],
  calibrationProfile = null,
  runtime = {},
  blendshapeNames = DEFAULT_BLENDSHAPES,
  clickWindowOptions = { beforeMs: 250, duringMs: 250, afterMs: 300 },
  gameSummary = null,
  gameCorrelation = null,
  gameFeatureVector = null,
} = {}) {
  const start = Number(startedAt ?? 0);
  const end = Number(endedAt ?? start);
  const microgestureCalibration = calibrationProfile ?? (
    faceSamples.length
      ? buildCalibrationProfile(faceSamples, { from: start, to: Math.min(end, start + 3000) })
      : null
  );
  const taskCorrelation = taskEvents.length
    ? correlateSignalsWithTasks({ taskEvents, faceSamples, pointerSamples })
    : null;
  const edgeModelOutput = taskCorrelation
    ? generateEdgeModelOutput({
      correlation: taskCorrelation,
      calibrationProfile: microgestureCalibration,
      generatedAt,
      runtime,
    })
    : null;
  const assessmentFeatureVector = taskCorrelation
    ? buildAssessmentFeatureVector({
      runId,
      generatedAt,
      correlation: taskCorrelation,
      edgeModelOutput,
      runtime,
    })
    : null;

  // ─── New: Edge AI multidimensional inference ───
  const edgeAIOutput = runEdgeAIInference({
    faceSamples,
    pointerSamples,
    taskEvents,
    calibrationProfile: microgestureCalibration,
    generatedAt,
    runtime,
    gameSummary,
    gameCorrelation,
  });
  // Keep exported payload compact/privacy-safe: multimodal internals are live UI
  // diagnostics, not persisted session payload fields.
  const { multimodal: _omittedMultimodal, ...compactEdgeAIOutput } = edgeAIOutput;
  const safeGameSummary = sanitizeGameSummary(gameSummary);
  const safeGameCorrelation = sanitizeGameCorrelation(gameCorrelation);
  const safeGameFeatureVector = sanitizeGameFeatureVector(gameFeatureVector ?? (
    safeGameSummary
      ? buildAssessmentFeatureVectorV2({
        runId,
        generatedAt,
        gameSummary: safeGameSummary,
        gameCorrelation: safeGameCorrelation,
        edgeModelOutput: edgeAIOutput,
        runtime,
      })
      : null
  ));

  return {
    schemaVersion: 'krumm_edge_fusion_poc_v1',
    runId,
    generatedAt,
    window: {
      startedAt: start,
      endedAt: end,
      durationMs: Math.max(0, round(end - start)),
    },
    privacy: {
      rawVideoStored: false,
      rawFramesStored: false,
      rawPointerPathStored: false,
      facialLandmarksStored: false,
      rawGameEventsStored: false,
      payloadContainsAggregatesOnly: true,
    },
    facialSummary: summarizeBlendshapes(faceSamples, blendshapeNames),
    pointerSummary,
    ...(microgestureCalibration ? { microgestureCalibration } : {}),
    clickWindows: clickEvents.map((clickEvent) => summarizeFaceAroundClick(faceSamples, clickEvent, {
      ...clickWindowOptions,
      blendshapeNames,
    })),
    ...(taskCorrelation ? { taskCorrelation } : {}),
    ...(edgeModelOutput ? { edgeModelOutput } : {}),
    ...(assessmentFeatureVector ? { assessmentFeatureVector } : {}),
    ...(safeGameSummary || safeGameCorrelation || safeGameFeatureVector ? {
      gameTelemetry: {
        ...(safeGameSummary ? { summary: safeGameSummary } : {}),
        ...(safeGameCorrelation ? { correlation: safeGameCorrelation } : {}),
        ...(safeGameFeatureVector ? { featureVector: safeGameFeatureVector } : {}),
      },
    } : {}),
    edgeAI: compactEdgeAIOutput,
  };
}