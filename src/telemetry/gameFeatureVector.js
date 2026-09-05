const VERSION = '0.2.0';

export const GAME_FEATURE_VECTOR_V2_ORDER = Object.freeze([
  'game.accuracy',
  'game.meanScore',
  'game.meanReactionTimeMs',
  'game.completedTrialRatio',
  'game.visualSearchEfficiency',
  'game.visualSearchMeanSetSize',
  'game.fittsMeanIndexDifficulty',
  'game.fittsThroughput',
  'pointer.pathEfficiencyMean',
  'pointer.overshootRate',
  'pointer.jerkMean',
  'pointer.correctionRate',
  'pointer.smoothPursuitScore',
  'pointer.trackingLossRatio',
  'response.postErrorSlowingMs',
  'response.commissionErrorRate',
  'response.omissionErrorRate',
  'interference.conflictCostMs',
  'interference.errorRate',
  'gaze.offscreenDuringTrialsRatio',
  'posture.headForwardDuringTrialsMean',
  'posture.postureScoreDuringTrialsMean',
  'upperBody.armActivityDuringTrialsMean',
  'emotion.postErrorTensionDelta',
  'correlation.meanReactionPostureDelta',
  'correlation.meanReactionFacePresenceDelta',
  'edge.modelConfidence',
  'edge.taskPerformanceScore',
  'edge.motorControlScore',
]);

function round(value, digits = 4) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  const factor = 10 ** digits;
  return Math.round(numeric * factor) / factor;
}

function mean(values, digits = 4) {
  const numeric = values.map(Number).filter(Number.isFinite);
  if (!numeric.length) return 0;
  return round(numeric.reduce((sum, value) => sum + value, 0) / numeric.length, digits);
}

function completedRatio(performance = {}) {
  const trialCount = Number(performance.trialCount ?? 0);
  const completedTrialCount = Number(performance.completedTrialCount ?? 0);
  return trialCount > 0 ? round(completedTrialCount / trialCount) : 0;
}

function reactionWindows(gameCorrelation = {}) {
  return (gameCorrelation.trials ?? [])
    .map((trial) => ({ trial, reaction: trial?.windows?.reaction }))
    .filter(({ reaction }) => reaction);
}

function offscreenDuringTrialsRatio(gameCorrelation = {}) {
  const windows = reactionWindows(gameCorrelation);
  return windows.length
    ? round(mean(windows.map(({ reaction }) => 1 - (reaction.gaze?.lookingAtScreenRatio ?? 0))))
    : 0;
}

function meanReactionField(gameCorrelation = {}, getter, digits = 4) {
  const windows = reactionWindows(gameCorrelation);
  return mean(windows.map(({ reaction, trial }) => getter(reaction, trial)), digits);
}

function postErrorTensionDelta(gameCorrelation = {}) {
  const errorTrials = (gameCorrelation.trials ?? []).filter((trial) => trial?.correct === false || /error|incorrect|omission|commission/i.test(String(trial?.outcome ?? '')));
  return mean(errorTrials.map((trial) => trial?.deltas?.postVsPre?.activeAUCountDelta), 4);
}

function qualityFlags({ gameSummary = {}, gameCorrelation = {}, edgeModelOutput = {} } = {}) {
  const flags = [];
  const performance = gameSummary.performance ?? {};
  const trialCount = Number(performance.trialCount ?? gameCorrelation.aggregate?.trialCount ?? 0);
  const completedTrialCount = Number(performance.completedTrialCount ?? gameCorrelation.aggregate?.completedTrialCount ?? 0);
  const modelConfidence = Number(edgeModelOutput?.confidence?.score ?? 0);
  if (trialCount > 0 && completedTrialCount / trialCount < 0.8) flags.push('incomplete_game_coverage');
  if ((gameCorrelation.aggregate?.completedTrialCount ?? 0) <= 0 && trialCount > 0) flags.push('missing_game_correlation');
  if (modelConfidence > 0 && modelConfidence < 0.55) flags.push('low_model_confidence');
  return flags;
}

export function buildGameFeatureVectorV2({
  runId = null,
  generatedAt = new Date().toISOString(),
  gameSummary = {},
  gameCorrelation = {},
  edgeModelOutput = {},
  runtime = {},
} = {}) {
  const performance = gameSummary.performance ?? {};
  const motor = gameSummary.motor ?? {};
  const fitts = gameSummary.fitts ?? {};
  const inhibition = gameSummary.inhibition ?? {};
  const interference = gameSummary.interference ?? {};
  const visualSearch = gameSummary.visualSearch ?? {};
  const aggregate = gameCorrelation.aggregate ?? {};

  const gazeOffscreenRatio = offscreenDuringTrialsRatio(gameCorrelation);
  const meanHeadForward = meanReactionField(gameCorrelation, (reaction) => reaction.posture?.meanHeadForward, 4);
  const meanPostureScore = meanReactionField(gameCorrelation, (reaction) => reaction.posture?.meanPostureScore, 4);
  const meanArmActivity = meanReactionField(gameCorrelation, (reaction) => reaction.upperBody?.meanArmActivity, 4);
  const postErrorTension = postErrorTensionDelta(gameCorrelation);

  const featureMap = {
    'game.accuracy': round(performance.accuracy ?? aggregate.accuracy ?? 0),
    'game.meanScore': round(performance.meanScore ?? 0),
    'game.meanReactionTimeMs': round(performance.meanReactionTimeMs ?? aggregate.meanReactionTimeMs ?? 0, 2),
    'game.completedTrialRatio': completedRatio(performance),
    'game.visualSearchEfficiency': round(visualSearch.searchEfficiency ?? 0),
    'game.visualSearchMeanSetSize': round(visualSearch.meanSetSize ?? 0, 2),
    'game.fittsMeanIndexDifficulty': round(fitts.meanIndexDifficulty ?? 0, 3),
    'game.fittsThroughput': round(fitts.meanThroughput ?? 0, 3),
    'pointer.pathEfficiencyMean': round(motor.pathEfficiencyMean ?? 0),
    'pointer.overshootRate': round(motor.overshootRate ?? 0),
    'pointer.jerkMean': round(motor.jerkMean ?? 0, 5),
    'pointer.correctionRate': round(motor.correctionRate ?? 0),
    'pointer.smoothPursuitScore': round(motor.smoothPursuitScore ?? 0),
    'pointer.trackingLossRatio': round(motor.trackingLossRatio ?? 0),
    'response.postErrorSlowingMs': round(inhibition.postErrorSlowingMs ?? 0, 2),
    'response.commissionErrorRate': round(inhibition.commissionErrorRate ?? 0),
    'response.omissionErrorRate': round(inhibition.omissionErrorRate ?? 0),
    'interference.conflictCostMs': round(interference.conflictCostMs ?? 0, 2),
    'interference.errorRate': round(interference.errorRate ?? 0),
    'gaze.offscreenDuringTrialsRatio': gazeOffscreenRatio,
    'posture.headForwardDuringTrialsMean': meanHeadForward,
    'posture.postureScoreDuringTrialsMean': meanPostureScore,
    'upperBody.armActivityDuringTrialsMean': meanArmActivity,
    'emotion.postErrorTensionDelta': postErrorTension,
    'correlation.meanReactionPostureDelta': round(aggregate.meanReactionPostureDelta ?? 0),
    'correlation.meanReactionFacePresenceDelta': round(aggregate.meanReactionFacePresenceDelta ?? 0),
    'edge.modelConfidence': round(edgeModelOutput?.confidence?.score ?? 0),
    'edge.taskPerformanceScore': round((edgeModelOutput?.channels?.taskPerformance?.score ?? 0) / 100),
    'edge.motorControlScore': round((edgeModelOutput?.channels?.motorControl?.score ?? 0) / 100),
  };

  const trialCount = Number(performance.trialCount ?? aggregate.trialCount ?? 0);
  const completedTrialCount = Number(performance.completedTrialCount ?? aggregate.completedTrialCount ?? 0);

  return {
    type: 'assessment_feature_vector_v2',
    version: VERSION,
    runId,
    generatedAt,
    privacy: {
      rawVideoStored: false,
      rawFramesStored: false,
      rawPointerPathStored: false,
      facialLandmarksStored: false,
      rawGameEventsStored: false,
      payloadContainsAggregatesOnly: true,
    },
    featureOrder: [...GAME_FEATURE_VECTOR_V2_ORDER],
    featureArray: GAME_FEATURE_VECTOR_V2_ORDER.map((featureName) => featureMap[featureName] ?? 0),
    featureMap,
    aggregate: {
      trialCount,
      completedTrialCount,
      accuracy: featureMap['game.accuracy'],
      meanReactionTimeMs: featureMap['game.meanReactionTimeMs'],
      correlatedTrialCount: Number(aggregate.completedTrialCount ?? 0),
      modelConfidence: featureMap['edge.modelConfidence'],
    },
    game: {
      meanScore: featureMap['game.meanScore'],
      visualSearchEfficiency: featureMap['game.visualSearchEfficiency'],
      fittsThroughput: featureMap['game.fittsThroughput'],
      completedTrialRatio: featureMap['game.completedTrialRatio'],
    },
    pointer: {
      pathEfficiencyMean: featureMap['pointer.pathEfficiencyMean'],
      overshootRate: featureMap['pointer.overshootRate'],
      jerkMean: featureMap['pointer.jerkMean'],
      correctionRate: featureMap['pointer.correctionRate'],
    },
    response: {
      postErrorSlowingMs: featureMap['response.postErrorSlowingMs'],
      commissionErrorRate: featureMap['response.commissionErrorRate'],
      omissionErrorRate: featureMap['response.omissionErrorRate'],
    },
    multimodalDuringTrials: {
      gazeOffscreenRatio,
      meanHeadForward,
      meanPostureScore,
      meanArmActivity,
      postErrorTensionDelta: postErrorTension,
    },
    qualityFlags: qualityFlags({ gameSummary, gameCorrelation, edgeModelOutput }),
    model: {
      source: edgeModelOutput?.modelVersion ?? null,
      confidenceLevel: edgeModelOutput?.confidence?.level ?? 'unknown',
    },
    runtime,
  };
}
