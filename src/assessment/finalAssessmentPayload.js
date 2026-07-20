import { validateAssessmentSessionPrivacy } from './assessmentSession.js';

export const FINAL_ASSESSMENT_PAYLOAD_SCHEMA = 'krumm_final_assessment_payload_v1';

function clonePlain(value) {
  if (!value || typeof value !== 'object') return value;
  return JSON.parse(JSON.stringify(value));
}

function pickObject(value = {}) {
  return value && typeof value === 'object' ? { ...value } : {};
}

function sanitizeParticipant(participant = {}) {
  return {
    aliasHash: participant.aliasHash ?? null,
    declaredRoleTarget: participant.declaredRoleTarget ?? null,
  };
}

function sanitizeFeatureVector(vector = null) {
  if (!vector) return null;
  return {
    type: vector.type ?? 'assessment_feature_vector_v2',
    version: vector.version ?? null,
    featureOrder: [...(vector.featureOrder ?? [])],
    featureArray: [...(vector.featureArray ?? [])],
    featureMap: pickObject(vector.featureMap),
    qualityFlags: [...(vector.qualityFlags ?? [])],
  };
}

function sanitizeOriginalGameFeatureVector(vector = null) {
  if (!vector) return null;
  return {
    type: vector.type ?? 'original_game_feature_vector_v1',
    version: vector.version ?? null,
    featureOrder: [...(vector.featureOrder ?? [])],
    featureArray: [...(vector.featureArray ?? [])],
    observedMask: [...(vector.observedMask ?? [])],
    featureMap: pickObject(vector.featureMap),
    featureAvailability: pickObject(vector.featureAvailability),
    gameAvailability: pickObject(vector.gameAvailability),
    qualityFlags: [...(vector.qualityFlags ?? [])],
    privacy: pickObject(vector.privacy),
  };
}

function sanitizeTalentFramework(framework = null) {
  if (!framework) return null;
  return {
    schemaVersion: framework.schemaVersion ?? 'krumm_workbook_talent_framework_v1',
    version: framework.version ?? null,
    status: framework.status ?? 'provisional',
    sourceVector: clonePlain(framework.sourceVector ?? null),
    constructOrder: [...(framework.constructOrder ?? [])],
    constructs: clonePlain(framework.constructs ?? {}),
    classification: clonePlain(framework.classification ?? {}),
    governance: clonePlain(framework.governance ?? {}),
  };
}

function sanitizeGameResults(blocks = []) {
  return (Array.isArray(blocks) ? blocks : []).map((block, index) => ({
    index: Number(block?.index ?? index),
    gameId: block?.gameId ?? null,
    label: block?.label ?? null,
    skill: block?.skill ?? null,
    status: block?.status ?? 'unknown',
    trialCount: Number(block?.trialCount ?? 0),
    result: clonePlain(block?.result ?? null),
  }));
}

function sanitizeTalentProfile(profile = null) {
  if (!profile) return null;
  return {
    schemaVersion: profile.schemaVersion ?? 'krumm_talent_profile_v1',
    runId: profile.runId ?? null,
    batteryId: profile.batteryId ?? null,
    dimensions: clonePlain(profile.dimensions ?? {}),
    globalSummary: clonePlain(profile.globalSummary ?? {}),
    governance: {
      humanReviewOnly: true,
      noAutomatedDecision: true,
      observationalOnly: true,
    },
  };
}

function sanitizeEdgeAI(edgeAI = null) {
  if (!edgeAI) return null;
  return {
    modelVersion: edgeAI.modelVersion ?? null,
    composite: clonePlain(edgeAI.composite ?? null),
    confidence: clonePlain(edgeAI.confidence ?? null),
    channels: clonePlain(edgeAI.channels ?? {}),
    caveats: [...(edgeAI.caveats ?? [])],
  };
}

export function validateFinalAssessmentPayload(payload = {}) {
  const violations = [];
  if (payload.schemaVersion !== FINAL_ASSESSMENT_PAYLOAD_SCHEMA) violations.push('invalid_schemaVersion');
  if (payload.governance?.humanReviewOnly !== true) violations.push('humanReviewOnly_false');
  if (payload.governance?.noAutomatedDecision !== true) violations.push('noAutomatedDecision_false');
  if (payload.governance?.observationalOnly !== true) violations.push('observationalOnly_false');
  if (payload.governance?.privacySafe !== true) violations.push('privacySafe_false');
  const privacy = validateAssessmentSessionPrivacy(payload);
  return {
    ok: violations.length === 0 && privacy.ok,
    violations: [...new Set([...violations, ...privacy.violations])],
  };
}

export function buildFinalAssessmentPayload({
  assessmentSession,
  talentProfile,
  participant = {},
  generatedAt = new Date().toISOString(),
} = {}) {
  const payload = {
    schemaVersion: FINAL_ASSESSMENT_PAYLOAD_SCHEMA,
    runId: assessmentSession?.runId ?? talentProfile?.runId ?? null,
    batteryId: assessmentSession?.batteryId ?? talentProfile?.batteryId ?? null,
    generatedAt,
    participant: sanitizeParticipant(participant),
    quality: clonePlain(assessmentSession?.qualitySummary ?? {}),
    behavioral: {
      gameSummary: clonePlain(assessmentSession?.gameSummary ?? null),
      gameCorrelationAggregate: clonePlain(assessmentSession?.gameCorrelation?.aggregate ?? null),
      adaptiveDifficultyTrace: clonePlain(assessmentSession?.adaptiveDifficultyTrace ?? []),
      featureVectorV2: sanitizeFeatureVector(assessmentSession?.featureVectorV2 ?? null),
      gameResults: sanitizeGameResults(assessmentSession?.blocks ?? []),
    },
    talentFramework: sanitizeTalentFramework(assessmentSession?.talentFramework ?? null),
    talentProfile: sanitizeTalentProfile(talentProfile),
    edgeAI: sanitizeEdgeAI(assessmentSession?.edgeAI ?? null),
    governance: {
      humanReviewOnly: true,
      noAutomatedDecision: true,
      observationalOnly: true,
      privacySafe: true,
    },
  };

  const originalGameFeatureVector = sanitizeOriginalGameFeatureVector(assessmentSession?.originalGameFeatureVector ?? null);
  if (originalGameFeatureVector) payload.behavioral.originalGameFeatureVector = originalGameFeatureVector;
  if (!payload.talentFramework) delete payload.talentFramework;

  return {
    ...payload,
    validation: validateFinalAssessmentPayload(payload),
  };
}
