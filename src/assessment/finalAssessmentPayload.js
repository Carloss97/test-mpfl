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
    },
    talentProfile: sanitizeTalentProfile(talentProfile),
    edgeAI: sanitizeEdgeAI(assessmentSession?.edgeAI ?? null),
    governance: {
      humanReviewOnly: true,
      noAutomatedDecision: true,
      observationalOnly: true,
      privacySafe: true,
    },
  };

  return {
    ...payload,
    validation: validateFinalAssessmentPayload(payload),
  };
}
