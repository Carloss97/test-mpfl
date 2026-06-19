import { describe, expect, it } from 'vitest';
import { TALENT_DIMENSION_DEFINITIONS } from './talentDimensions.js';
import { buildTalentProfile, summarizeTalentProfile } from './talentProfile.js';

const assessmentSession = {
  schemaVersion: 'krumm_unified_assessment_session_v1',
  runId: 'battery-u-001',
  batteryId: 'krumm_unified_battery_v1',
  gameSummary: {
    performance: { trialCount: 24, completedTrialCount: 24, accuracy: 0.86, meanReactionTimeMs: 390, meanScore: 0.82 },
    motor: { pathEfficiencyMean: 0.84, smoothPursuitScore: 0.79, trackingLossRatio: 0.08, overshootRate: 0.12 },
    fitts: { meanThroughput: 4.2, meanIndexDifficulty: 3.1 },
    inhibition: { commissionErrorRate: 0.06, omissionErrorRate: 0.04, postErrorSlowingMs: 95 },
    interference: { conflictCostMs: 160, errorRate: 0.1 },
    visualSearch: { searchEfficiency: 0.74, meanSetSize: 12, errorRate: 0.08 },
  },
  gameCorrelation: {
    aggregate: { completedTrialCount: 24, meanReactionPostureDelta: -0.03, meanReactionFacePresenceDelta: 0.02 },
  },
  edgeAI: {
    composite: { score: 76 },
    confidence: { score: 0.82 },
    channels: {
      taskPerformance: { score: 78 },
      motorControl: { score: 74 },
      visualAttention: { score: 72 },
      inhibitionControl: { score: 84 },
      visuomotorPrecision: { score: 79 },
      visualSearchEfficiency: { score: 73 },
      adaptiveResilience: { score: 77 },
      cognitiveLoad: { score: 46 },
      stressResponse: { score: 38 },
      fatigueIndex: { score: 34 },
    },
  },
  featureVectorV2: {
    featureMap: {
      'game.accuracy': 0.86,
      'game.meanReactionTimeMs': 390,
      'pointer.pathEfficiencyMean': 0.84,
      'pointer.smoothPursuitScore': 0.79,
      'pointer.trackingLossRatio': 0.08,
      'response.commissionErrorRate': 0.06,
      'response.omissionErrorRate': 0.04,
      'interference.conflictCostMs': 160,
      'interference.errorRate': 0.1,
      'game.visualSearchEfficiency': 0.74,
      'correlation.meanReactionPostureDelta': -0.03,
      'edge.taskPerformanceScore': 78,
      'edge.motorControlScore': 74,
    },
    qualityFlags: [],
  },
  adaptiveDifficultyTrace: [
    { direction: 'up', reasonCodes: ['high_accuracy', 'stable_motor_control'], snapshot: { accuracy: 0.86 } },
  ],
  qualitySummary: { sampleCount: 120, facePresenceRatio: 0.91, meanConfidence: 0.86, correlatedTrialCount: 24, caveats: [] },
};

describe('talent dimensions', () => {
  it('defines the expected human-review talent dimensions', () => {
    expect(Object.keys(TALENT_DIMENSION_DEFINITIONS)).toEqual([
      'processingSpeed',
      'visuomotorPrecision',
      'continuousMotorControl',
      'sustainedAttention',
      'inhibitoryControl',
      'interferenceControl',
      'visualSearchEfficiency',
      'adaptability',
      'behavioralConsistency',
      'regulationUnderLoad',
    ]);
  });
});

describe('buildTalentProfile', () => {
  it('maps assessment aggregates into observable talent dimensions with evidence', () => {
    const profile = buildTalentProfile({ assessmentSession });

    expect(profile).toMatchObject({
      schemaVersion: 'krumm_talent_profile_v1',
      runId: 'battery-u-001',
      governance: { humanReviewOnly: true, noAutomatedDecision: true, observationalOnly: true },
    });
    expect(profile.dimensions.processingSpeed.score).toBeGreaterThan(70);
    expect(profile.dimensions.visuomotorPrecision.score).toBeGreaterThan(70);
    expect(profile.dimensions.inhibitoryControl.score).toBeGreaterThan(75);
    expect(profile.dimensions.visualSearchEfficiency.evidence.join(' ')).toMatch(/searchEfficiency/i);
    expect(profile.dimensions.processingSpeed.evidence.join(' ')).toMatch(/RT medio/i);
    expect(profile.globalSummary.strengths.length).toBeGreaterThan(0);
    expect(profile.globalSummary.confidence).toBeGreaterThan(0.7);
  });

  it('lowers confidence and adds caveats when signal quality is weak', () => {
    const weak = buildTalentProfile({
      assessmentSession: {
        ...assessmentSession,
        qualitySummary: { sampleCount: 8, facePresenceRatio: 0.48, meanConfidence: 0.38, correlatedTrialCount: 0, caveats: ['low_face_presence', 'missing_game_correlation'] },
      },
    });

    expect(weak.globalSummary.confidence).toBeLessThan(0.6);
    expect(weak.dimensions.processingSpeed.caveats).toEqual(expect.arrayContaining(['low_face_presence', 'missing_game_correlation']));
  });

  it('summarizes strengths and watch areas without automated hiring language', () => {
    const profile = buildTalentProfile({ assessmentSession });
    const summary = summarizeTalentProfile(profile);
    const serialized = JSON.stringify({ profile, summary }).toLowerCase();

    expect(summary).toContain('revisión humana');
    expect(serialized).not.toContain('hire');
    expect(serialized).not.toContain('reject');
    expect(serialized).not.toContain('aprobado');
    expect(serialized).not.toContain('rechazado');
    expect(serialized).not.toContain('diagnóstico');
  });
});
