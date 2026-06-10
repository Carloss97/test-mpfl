const VERSION = '0.1.0';

export const ASSESSMENT_FEATURE_ORDER = Object.freeze([
  'aggregate.accuracy',
  'aggregate.meanReactionTimeMs',
  'aggregate.facePresenceRatio',
  'aggregate.meanConfidence',
  'aggregate.pathEfficiency',
  'aggregate.deviationRmsPx',
  'aggregate.browTensionDelta',
  'aggregate.jawActivationDelta',
  'aggregate.ocularTensionDelta',
  'aggregate.postErrorMeanReactionTimeShiftMs',
  'aggregate.postErrorMeanScoreShift',
  'task.responseInhibition.accuracy',
  'task.colorInterference.accuracy',
  'task.precisionTargeting.accuracy',
  'edge.modelConfidence',
]);

function round(value, digits = 4) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  const factor = 10 ** digits;
  return Math.round(numeric * factor) / factor;
}

function safeTaskSummary(summary = {}) {
  const deltas = summary.meanFeatureDeltas ?? {};
  return {
    trialCount: Number(summary.trialCount ?? 0),
    completedTrialCount: Number(summary.completedTrialCount ?? 0),
    accuracy: round(summary.accuracy ?? 0),
    meanReactionTimeMs: round(summary.meanReactionTimeMs ?? 0, 2),
    browTensionDelta: round(deltas.browTension ?? 0),
    jawActivationDelta: round(deltas.jawActivation ?? 0),
    ocularTensionDelta: round(deltas.ocularTension ?? 0),
    mouthPressureDelta: round(deltas.mouthPressure ?? 0),
  };
}

function qualityFlags({ aggregate, edgeModelOutput }) {
  const flags = [];
  const trialCount = Number(aggregate.trialCount ?? 0);
  const completedTrialCount = Number(aggregate.completedTrialCount ?? 0);
  const facePresenceRatio = Number(aggregate.signalQuality?.facePresenceRatio ?? 0);
  const meanConfidence = Number(aggregate.signalQuality?.meanConfidence ?? 0);
  const modelConfidence = Number(edgeModelOutput?.confidence?.score ?? 0);

  if (trialCount > 0 && completedTrialCount / trialCount < 0.8) flags.push('incomplete_task_coverage');
  if (facePresenceRatio < 0.7) flags.push('low_facial_coverage');
  if (meanConfidence < 0.7) flags.push('low_facial_confidence');
  if (modelConfidence < 0.55) flags.push('low_model_confidence');
  return flags;
}

export function buildAssessmentFeatureVector({
  runId = null,
  generatedAt = new Date().toISOString(),
  correlation = null,
  edgeModelOutput = null,
  runtime = {},
} = {}) {
  const aggregate = correlation?.aggregate ?? {};
  const deltas = aggregate.meanTaskCoupledDeltas ?? {};
  const pointer = aggregate.meanPointerControl ?? {};
  const signalQuality = aggregate.signalQuality ?? {};
  const postError = aggregate.postErrorAdjustment ?? {};
  const byTask = aggregate.byTask ?? {};
  const perTask = Object.fromEntries(
    Object.entries(byTask).map(([taskId, summary]) => [taskId, safeTaskSummary(summary)]),
  );

  const featureMap = {
    'aggregate.accuracy': round(aggregate.accuracy ?? 0),
    'aggregate.meanReactionTimeMs': round(aggregate.meanReactionTimeMs ?? 0, 2),
    'aggregate.facePresenceRatio': round(signalQuality.facePresenceRatio ?? 0),
    'aggregate.meanConfidence': round(signalQuality.meanConfidence ?? 0),
    'aggregate.pathEfficiency': round(pointer.pathEfficiency ?? 0),
    'aggregate.deviationRmsPx': round(pointer.deviationRmsPx ?? 0, 2),
    'aggregate.browTensionDelta': round(deltas.browTension ?? 0),
    'aggregate.jawActivationDelta': round(deltas.jawActivation ?? 0),
    'aggregate.ocularTensionDelta': round(deltas.ocularTension ?? 0),
    'aggregate.postErrorMeanReactionTimeShiftMs': round(postError.meanReactionTimeShiftMs ?? 0, 2),
    'aggregate.postErrorMeanScoreShift': round(postError.meanScoreShift ?? 0),
    'task.responseInhibition.accuracy': round(byTask.response_inhibition?.accuracy ?? 0),
    'task.colorInterference.accuracy': round(byTask.color_interference?.accuracy ?? 0),
    'task.precisionTargeting.accuracy': round(byTask.precision_targeting?.accuracy ?? 0),
    'edge.modelConfidence': round(edgeModelOutput?.confidence?.score ?? 0),
  };

  return {
    type: 'assessment_feature_vector_v1',
    version: VERSION,
    runId,
    generatedAt,
    privacy: {
      rawVideoStored: false,
      rawFramesStored: false,
      rawPointerPathStored: false,
      facialLandmarksStored: false,
      payloadContainsAggregatesOnly: true,
    },
    featureOrder: [...ASSESSMENT_FEATURE_ORDER],
    featureArray: ASSESSMENT_FEATURE_ORDER.map((featureName) => featureMap[featureName] ?? 0),
    aggregate: {
      trialCount: Number(aggregate.trialCount ?? 0),
      completedTrialCount: Number(aggregate.completedTrialCount ?? 0),
      accuracy: round(aggregate.accuracy ?? 0),
      meanReactionTimeMs: round(aggregate.meanReactionTimeMs ?? 0, 2),
      facePresenceRatio: round(signalQuality.facePresenceRatio ?? 0),
      meanConfidence: round(signalQuality.meanConfidence ?? 0),
      pathEfficiency: round(pointer.pathEfficiency ?? 0),
      deviationRmsPx: round(pointer.deviationRmsPx ?? 0, 2),
      postErrorSequenceCount: Number(postError.sequenceCount ?? 0),
      modelConfidence: round(edgeModelOutput?.confidence?.score ?? 0),
    },
    perTask,
    qualityFlags: qualityFlags({ aggregate, edgeModelOutput }),
    model: {
      source: edgeModelOutput?.modelVersion ?? null,
      confidenceLevel: edgeModelOutput?.confidence?.level ?? 'unknown',
      caveats: [...(edgeModelOutput?.caveats ?? [])],
    },
    runtime,
  };
}
