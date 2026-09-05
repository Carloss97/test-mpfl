import { describe, expect, it } from 'vitest';
import {
  FINAL_ASSESSMENT_PAYLOAD_SCHEMA,
  buildFinalAssessmentPayload,
  validateFinalAssessmentPayload,
} from './finalAssessmentPayload.js';

const assessmentSession = {
  schemaVersion: 'krumm_unified_assessment_session_v1',
  runId: 'run-v-001',
  batteryId: 'krumm_unified_battery_v1',
  generatedAt: '2026-06-19T01:00:00.000Z',
  qualitySummary: { sampleCount: 150, facePresenceRatio: 0.91, meanConfidence: 0.84, correlatedTrialCount: 18, caveats: [] },
  blocks: [
    { index: 0, gameId: 'laser_puzzle', label: 'Puzzle láser', skill: 'spatial_planning', trialCount: 2, status: 'completed', result: { score: 0.88, solvedLevels: 2, solutionEfficiency: 0.9, aggregateOnly: true } },
  ],
  gameSummary: {
    eventCount: 80,
    performance: { trialCount: 18, completedTrialCount: 18, accuracy: 0.84, meanReactionTimeMs: 410, meanScore: 0.8 },
    motor: { pathEfficiencyMean: 0.82 },
    inhibition: { commissionErrorRate: 0.05, omissionErrorRate: 0.04 },
    visualSearch: { searchEfficiency: 0.74 },
  },
  gameCorrelation: {
    schemaVersion: 'game_signal_correlation_v3',
    aggregate: { trialCount: 18, completedTrialCount: 18, accuracy: 0.84, meanReactionPostureDelta: -0.02 },
    privacy: { aggregateOnly: true },
  },
  adaptiveDifficultyTrace: [
    { type: 'adaptive_difficulty_recommendation_v1', direction: 'up', reasonCodes: ['high_accuracy'], previousLevel: 4, nextLevel: 5 },
  ],
  featureVectorV2: {
    type: 'assessment_feature_vector_v2',
    version: '0.2.0',
    featureOrder: ['game.accuracy'],
    featureArray: [0.84],
    featureMap: { 'game.accuracy': 0.84 },
    qualityFlags: [],
  },
  edgeAI: {
    modelVersion: 'krumm-edge-ai-v9.1.0-game-aware',
    composite: { score: 76, level: 'high' },
    confidence: { score: 0.82, level: 'high' },
    channels: { taskPerformance: { score: 78 }, motorControl: { score: 73 } },
    caveats: ['observational_only'],
  },
  governance: { humanReviewOnly: true, noAutomatedDecision: true, observationalOnly: true, privacySafe: true },
};

const talentProfile = {
  schemaVersion: 'krumm_talent_profile_v1',
  runId: 'run-v-001',
  dimensions: {
    processingSpeed: { label: 'Velocidad de procesamiento', score: 78, confidence: 0.82, evidence: ['RT medio 410ms'], caveats: [] },
    inhibitoryControl: { label: 'Control inhibitorio', score: 86, confidence: 0.82, evidence: ['commissionErrorRate 5%'], caveats: [] },
  },
  globalSummary: { strengths: ['Control inhibitorio'], watchAreas: [], confidence: 0.82 },
  governance: { humanReviewOnly: true, noAutomatedDecision: true, observationalOnly: true },
};

describe('finalAssessmentPayload', () => {
  it('builds final inferred payload for human review only', () => {
    const payload = buildFinalAssessmentPayload({
      assessmentSession,
      talentProfile,
      generatedAt: '2026-06-19T01:05:00.000Z',
      participant: { aliasHash: 'participant-hash', declaredRoleTarget: 'Analista' },
    });

    expect(payload).toMatchObject({
      schemaVersion: FINAL_ASSESSMENT_PAYLOAD_SCHEMA,
      runId: 'run-v-001',
      batteryId: 'krumm_unified_battery_v1',
      generatedAt: '2026-06-19T01:05:00.000Z',
      participant: { aliasHash: 'participant-hash', declaredRoleTarget: 'Analista' },
      quality: { facePresenceRatio: 0.91, meanConfidence: 0.84 },
      behavioral: {
        gameSummary: { performance: { accuracy: 0.84 } },
        gameCorrelationAggregate: { completedTrialCount: 18 },
        featureVectorV2: { type: 'assessment_feature_vector_v2' },
        gameResults: [expect.objectContaining({ gameId: 'laser_puzzle', result: expect.objectContaining({ solutionEfficiency: 0.9 }) })],
      },
      talentProfile: { schemaVersion: 'krumm_talent_profile_v1' },
      edgeAI: { modelVersion: 'krumm-edge-ai-v9.1.0-game-aware', composite: { score: 76 } },
      governance: { humanReviewOnly: true, noAutomatedDecision: true, observationalOnly: true, privacySafe: true },
    });
    expect(validateFinalAssessmentPayload(payload)).toEqual({ ok: true, violations: [] });

    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain('faceSamples');
    expect(serialized).not.toContain('landmarks');
    expect(serialized).not.toContain('rawGameEvents');
    expect(serialized).not.toContain('pointerSamples');
    expect(serialized).not.toContain('windows');
  });

  it('rejects unsafe final payloads with raw fields or missing governance', () => {
    const unsafe = {
      schemaVersion: FINAL_ASSESSMENT_PAYLOAD_SCHEMA,
      governance: { humanReviewOnly: false, noAutomatedDecision: true, observationalOnly: true, privacySafe: true },
      behavioral: { rawGameEvents: [], faceSamples: [], gameCorrelation: { windows: [] }, gameResults: [{ result: { fullRoute: ['0,0'], visitedCells: ['0,0'] } }] },
    };

    const validation = validateFinalAssessmentPayload(unsafe);
    expect(validation.ok).toBe(false);
    expect(validation.violations).toEqual(expect.arrayContaining(['rawGameEvents', 'faceSamples', 'windows', 'fullRoute', 'visitedCells', 'humanReviewOnly_false']));
  });
});
