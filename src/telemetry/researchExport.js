const RESEARCH_SCHEMA = 'krumm_research_export_v1';

function round(value, digits = 4) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  const factor = 10 ** digits;
  return Math.round(numeric * factor) / factor;
}

function stableHash(value = '') {
  const text = String(value);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `h${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function sanitizeFeatureMap(featureMap = {}) {
  return Object.fromEntries(
    Object.entries(featureMap).map(([key, value]) => [key, round(value, 6)]),
  );
}

function baseTrialRecords(session = {}, sessionIndex = 0) {
  const trials = session.gameCorrelation?.trials ?? [];
  if (!trials.length) {
    const aggregate = session.gameCorrelation?.aggregate ?? session.gameSummary?.performance ?? {};
    return [{
      trialIndex: 0,
      gameId: 'session_aggregate',
      outcome: 'aggregate',
      correct: aggregate.accuracy >= 0.5,
      reactionTimeMs: round(aggregate.meanReactionTimeMs ?? 0, 2),
      source: 'aggregate_fallback',
      sessionIndex,
    }];
  }
  return trials.map((trial, trialIndex) => ({
    trialIndex,
    trialHash: stableHash(`${session.runId ?? sessionIndex}:${trial.trialId ?? trialIndex}`),
    gameId: trial.gameId ?? 'unknown_game',
    outcome: trial.outcome ?? 'unknown',
    correct: trial.correct === true,
    reactionTimeMs: round(trial.reactionTimeMs ?? 0, 2),
    source: 'trial_aggregate',
    sessionIndex,
  }));
}

function buildRecord({ session, sessionIndex, trial, featureOrder }) {
  const featureVector = session.featureVector ?? session.gameFeatureVector ?? session.assessmentFeatureVector ?? {};
  const featureMap = sanitizeFeatureMap(featureVector.featureMap ?? {});
  const summary = session.gameSummary ?? {};
  const aggregate = session.gameCorrelation?.aggregate ?? {};
  return {
    schemaVersion: 'krumm_research_trial_v1',
    runId: session.runId ?? `session-${sessionIndex + 1}`,
    sessionIndex,
    trialIndex: trial.trialIndex,
    trialHash: trial.trialHash ?? stableHash(`${session.runId ?? sessionIndex}:${trial.trialIndex}`),
    gameId: trial.gameId,
    outcome: trial.outcome,
    correct: trial.correct,
    reactionTimeMs: trial.reactionTimeMs,
    featureVectorType: featureVector.type ?? 'assessment_feature_vector_v2',
    featureVectorVersion: featureVector.version ?? '0.2.0',
    featureArray: featureOrder.map((featureName) => round(featureMap[featureName] ?? 0, 6)),
    featureMap,
    sessionAggregate: {
      accuracy: round(summary.performance?.accuracy ?? aggregate.accuracy ?? 0),
      completedTrialCount: Number(summary.performance?.completedTrialCount ?? aggregate.completedTrialCount ?? 0),
      trialCount: Number(summary.performance?.trialCount ?? aggregate.trialCount ?? 0),
      meanReactionTimeMs: round(summary.performance?.meanReactionTimeMs ?? aggregate.meanReactionTimeMs ?? 0, 2),
      correlatedTrialCount: Number(aggregate.completedTrialCount ?? 0),
    },
  };
}

export function buildResearchDataset({
  studyId = 'krumm-local-research',
  generatedAt = new Date().toISOString(),
  sessions = [],
} = {}) {
  const firstVector = sessions.find((session) => session.featureVector?.featureOrder || session.gameFeatureVector?.featureOrder || session.assessmentFeatureVector?.featureOrder);
  const featureOrder = [
    ...((firstVector?.featureVector ?? firstVector?.gameFeatureVector ?? firstVector?.assessmentFeatureVector)?.featureOrder ?? []),
  ];

  const records = sessions.flatMap((session, sessionIndex) => (
    baseTrialRecords(session, sessionIndex).map((trial) => buildRecord({ session, sessionIndex, trial, featureOrder }))
  ));

  return {
    schemaVersion: RESEARCH_SCHEMA,
    studyId,
    generatedAt,
    privacy: {
      containsPII: false,
      containsRawVideo: false,
      containsRawFrames: false,
      containsRawPointerPath: false,
      containsFacialLandmarks: false,
      containsRawGameEvents: false,
      containsRawStimuli: false,
      aggregateOnly: true,
    },
    featureOrder,
    recordCount: records.length,
    records,
  };
}

export function exportResearchJsonl(dataset = {}) {
  return (dataset.records ?? []).map((record) => JSON.stringify(record)).join('\n');
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function exportResearchCsv(dataset = {}) {
  const featureOrder = dataset.featureOrder ?? [];
  const baseColumns = ['runId', 'trialIndex', 'gameId', 'outcome', 'correct', 'reactionTimeMs'];
  const featureColumns = featureOrder.map((featureName) => `feature.${featureName}`);
  const header = [...baseColumns, ...featureColumns];
  const rows = (dataset.records ?? []).map((record) => [
    record.runId,
    record.trialIndex,
    record.gameId,
    record.outcome,
    record.correct,
    record.reactionTimeMs,
    ...featureOrder.map((featureName) => record.featureMap?.[featureName] ?? 0),
  ].map(csvEscape).join(','));
  return [header.join(','), ...rows].join('\n');
}
