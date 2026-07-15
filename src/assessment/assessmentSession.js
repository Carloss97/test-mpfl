export const ASSESSMENT_FORBIDDEN_KEYS = Object.freeze([
  'video',
  'rawVideo',
  'frames',
  'rawFrames',
  'imageData',
  'screenshot',
  'landmarks',
  'keypoints',
  'normalizedKeypoints',
  'faceSamples',
  'blendshapesRaw',
  'pointerSamples',
  'rawPointerPath',
  'fullRoute',
  'routeTrace',
  'visitedCells',
  'stepByStepPath',
  'clickTrace',
  'eventLog',
  'pumpSequence',
  'beamCells',
  'rawGameEvents',
  'trials',
  'trialResults',
  'stimuli',
  'items',
  'windows',
  'DOMEvent',
  'domEvent',
  'rawDOMEvents',
  'MouseEvent',
  'PointerEvent',
]);

function round(value, digits = 4) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  const factor = 10 ** digits;
  return Math.round(numeric * factor) / factor;
}

function clonePlain(value) {
  if (!value || typeof value !== 'object') return value;
  return JSON.parse(JSON.stringify(value));
}

function pickObject(value = {}) {
  return value && typeof value === 'object' ? { ...value } : {};
}

function sanitizeBlocks(blocks = []) {
  return blocks.map((block) => ({
    index: Number(block.index ?? 0),
    gameId: block.gameId ?? null,
    label: block.label ?? null,
    skill: block.skill ?? null,
    trialCount: Number(block.trialCount ?? 0),
    status: block.status ?? 'unknown',
    startedAt: block.startedAt ?? null,
    endedAt: block.endedAt ?? null,
    result: block.result ? clonePlain(block.result) : null,
  }));
}

function sanitizeGameSummary(gameSummary = null) {
  if (!gameSummary) return null;
  return {
    eventCount: Number(gameSummary.eventCount ?? 0),
    performance: pickObject(gameSummary.performance),
    motor: pickObject(gameSummary.motor),
    fitts: pickObject(gameSummary.fitts),
    inhibition: pickObject(gameSummary.inhibition),
    interference: pickObject(gameSummary.interference),
    visualSearch: pickObject(gameSummary.visualSearch),
  };
}

function sanitizeGameCorrelation(gameCorrelation = null) {
  if (!gameCorrelation?.aggregate) return null;
  return {
    schemaVersion: gameCorrelation.schemaVersion ?? 'game_signal_correlation_v3',
    aggregate: clonePlain(gameCorrelation.aggregate),
    privacy: {
      aggregateOnly: true,
      rawWindowsStored: false,
      rawStimuliStored: false,
      rawSamplesStored: false,
    },
  };
}

function sanitizeEdgeAI(edgeAIResult = null) {
  if (!edgeAIResult) return null;
  return {
    schemaVersion: edgeAIResult.schemaVersion ?? 'edge_ai_model_output_v8',
    modelVersion: edgeAIResult.modelVersion ?? null,
    composite: clonePlain(edgeAIResult.composite ?? null),
    confidence: clonePlain(edgeAIResult.confidence ?? null),
    channels: clonePlain(edgeAIResult.channels ?? {}),
    calibratedChannels: clonePlain(edgeAIResult.calibratedChannels ?? undefined),
    caveats: [...(edgeAIResult.caveats ?? [])],
  };
}

function sanitizeFeatureVector(featureVector = null) {
  if (!featureVector) return null;
  return {
    type: featureVector.type,
    version: featureVector.version,
    featureOrder: [...(featureVector.featureOrder ?? [])],
    featureArray: [...(featureVector.featureArray ?? [])],
    featureMap: pickObject(featureVector.featureMap),
    aggregate: pickObject(featureVector.aggregate),
    privacy: pickObject(featureVector.privacy),
    qualityFlags: [...(featureVector.qualityFlags ?? [])],
  };
}

function sanitizeAdaptiveTrace(trace = []) {
  return (Array.isArray(trace) ? trace : [])
    .map((entry) => ({
      type: entry.type ?? 'adaptive_difficulty_recommendation_v1',
      previousLevel: entry.previousLevel ?? null,
      nextLevel: entry.nextLevel ?? null,
      direction: entry.direction ?? 'hold',
      reasonCodes: [...(entry.reasonCodes ?? [])],
      trace: clonePlain(entry.trace ?? {}),
      snapshot: pickObject(entry.snapshot),
    }));
}

export function buildQualitySummary({ telemetry = {}, gameCorrelation = null, edgeAIResult = null } = {}) {
  const facePresenceRatio = round(telemetry.facePresenceRatio ?? 0);
  const meanConfidence = round(telemetry.meanConfidence ?? 0);
  const sampleCount = Number(telemetry.sampleCount ?? 0);
  const fpsEstimate = round(telemetry.fpsEstimate ?? 0, 2);
  const correlatedTrialCount = Number(gameCorrelation?.aggregate?.completedTrialCount ?? 0);
  const caveats = [];

  if (sampleCount < 20) caveats.push('low_sample_count');
  if (facePresenceRatio < 0.7) caveats.push('low_face_presence');
  if (meanConfidence < 0.55) caveats.push('low_face_confidence');
  if (correlatedTrialCount <= 0) caveats.push('missing_game_correlation');
  if (Number(edgeAIResult?.confidence?.score ?? 1) < 0.55) caveats.push('low_model_confidence');

  return {
    sampleCount,
    facePresenceRatio,
    meanConfidence,
    fpsEstimate,
    correlatedTrialCount,
    caveats: [...new Set(caveats)],
  };
}

export function validateAssessmentSessionPrivacy(value, path = []) {
  const violations = [];
  const visit = (node, currentPath) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach((item, index) => visit(item, [...currentPath, String(index)]));
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      if (ASSESSMENT_FORBIDDEN_KEYS.includes(key)) violations.push(key);
      visit(child, [...currentPath, key]);
    }
  };
  visit(value, path);
  const unique = [...new Set(violations)];
  return { ok: unique.length === 0, violations: unique };
}

export function buildUnifiedAssessmentSession({
  batterySession,
  generatedAt = new Date().toISOString(),
  consent = {},
  telemetry = {},
  gameSummary = null,
  gameCorrelation = null,
  edgeAIResult = null,
  featureVectorV2 = null,
  adaptiveDifficultyTrace = [],
  qualitySummary = null,
} = {}) {
  const safeGameCorrelation = sanitizeGameCorrelation(gameCorrelation);
  const safeQualitySummary = qualitySummary ?? buildQualitySummary({ telemetry, gameCorrelation: safeGameCorrelation, edgeAIResult });
  const session = {
    schemaVersion: 'krumm_unified_assessment_session_v1',
    runId: batterySession?.runId ?? null,
    batteryId: batterySession?.batteryId ?? null,
    mode: batterySession?.mode ?? 'standardized',
    generatedAt,
    startedAt: batterySession?.startedAt ?? batterySession?.createdAt ?? null,
    endedAt: batterySession?.completedAt ?? null,
    state: batterySession?.state ?? null,
    consent: {
      camera: consent.camera === true,
      aggregateExport: consent.aggregateExport === true,
      humanReviewOnly: consent.humanReviewOnly !== false,
    },
    baseline: clonePlain(batterySession?.baseline ?? null),
    recovery: clonePlain(batterySession?.recovery ?? null),
    blocks: sanitizeBlocks(batterySession?.blocks ?? []),
    gameSummary: sanitizeGameSummary(gameSummary),
    gameCorrelation: safeGameCorrelation,
    edgeAI: sanitizeEdgeAI(edgeAIResult),
    featureVectorV2: sanitizeFeatureVector(featureVectorV2),
    adaptiveDifficultyTrace: sanitizeAdaptiveTrace(adaptiveDifficultyTrace),
    qualitySummary: safeQualitySummary,
    governance: {
      humanReviewOnly: true,
      noAutomatedDecision: true,
      observationalOnly: true,
      privacySafe: true,
    },
  };

  const privacy = validateAssessmentSessionPrivacy(session);
  return {
    ...session,
    privacy,
  };
}
