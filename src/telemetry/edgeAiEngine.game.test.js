import { describe, expect, it } from 'vitest';
import { runEdgeAIInference } from './edgeAiEngine.js';

const stableFaceSamples = Array.from({ length: 12 }, (_, index) => ({
  timestamp: 1000 + index * 33,
  quality: { facePresent: true, confidence: 0.9 },
  blendshapes: {
    browInnerUp: 0.04,
    browDownLeft: 0.04,
    browDownRight: 0.04,
    mouthSmileLeft: 0.08,
    mouthSmileRight: 0.08,
    eyeBlinkLeft: 0.03,
    eyeBlinkRight: 0.03,
    eyeSquintLeft: 0.03,
    eyeSquintRight: 0.03,
    eyeWideLeft: 0.05,
    eyeWideRight: 0.05,
    jawOpen: 0.03,
    mouthPressLeft: 0.02,
    mouthPressRight: 0.02,
  },
}));

function gameSummary(overrides = {}) {
  return {
    eventCount: 20,
    performance: { trialCount: 8, completedTrialCount: 8, accuracy: 0.9, meanReactionTimeMs: 380, meanScore: 0.86 },
    motor: { pathEfficiencyMean: 0.9, smoothPursuitScore: 0.84, trackingLossRatio: 0.04, overshootRate: 0.08, jerkMean: 0.006, correctionRate: 0.6 },
    fitts: { meanThroughput: 4.4, meanIndexDifficulty: 3.1 },
    inhibition: { commissionErrorRate: 0.05, omissionErrorRate: 0.03, postErrorSlowingMs: 90 },
    interference: { conflictCostMs: 80, errorRate: 0.04 },
    visualSearch: { searchEfficiency: 0.82, meanSetSize: 12, errorRate: 0.05 },
    ...overrides,
  };
}

describe('Edge AI v9.1 game-aware channels', () => {
  it('adds explicit game-aware channels for inhibition, visuomotor precision, visual search, and resilience', () => {
    const output = runEdgeAIInference({
      faceSamples: stableFaceSamples,
      gameSummary: gameSummary(),
      gameCorrelation: {
        aggregate: { trialCount: 8, completedTrialCount: 8, accuracy: 0.9, meanReactionTimeMs: 380, meanReactionPostureDelta: -0.02, meanReactionFacePresenceDelta: 0.02 },
      },
    });

    expect(output.modelVersion).toContain('v9.1');
    expect(output.channels.inhibitionControl).toMatchObject({ source: 'game_telemetry' });
    expect(output.channels.visuomotorPrecision).toMatchObject({ source: 'game_telemetry' });
    expect(output.channels.visualSearchEfficiency).toMatchObject({ source: 'game_telemetry' });
    expect(output.channels.adaptiveResilience).toMatchObject({ source: 'game_telemetry+correlation' });
    expect(output.channels.inhibitionControl.score).toBeGreaterThanOrEqual(75);
    expect(output.channels.visuomotorPrecision.score).toBeGreaterThanOrEqual(75);
    expect(output.channels.visualSearchEfficiency.score).toBeGreaterThanOrEqual(70);
    expect(output.composite.contributors.inhibitionControl).toBeTruthy();
  });

  it('raises cognitive load and lowers inhibition control for high conflict/error sessions', () => {
    const calm = runEdgeAIInference({ faceSamples: stableFaceSamples, gameSummary: gameSummary() });
    const overloaded = runEdgeAIInference({
      faceSamples: stableFaceSamples,
      gameSummary: gameSummary({
        performance: { trialCount: 8, completedTrialCount: 8, accuracy: 0.45, meanReactionTimeMs: 900, meanScore: 0.4 },
        inhibition: { commissionErrorRate: 0.6, omissionErrorRate: 0.35, postErrorSlowingMs: 420 },
        interference: { conflictCostMs: 520, errorRate: 0.45 },
        visualSearch: { searchEfficiency: 0.25, meanSetSize: 20, errorRate: 0.4 },
      }),
      gameCorrelation: {
        aggregate: { trialCount: 8, completedTrialCount: 8, accuracy: 0.45, meanReactionTimeMs: 900, meanReactionPostureDelta: -0.25, meanReactionFacePresenceDelta: -0.1 },
      },
    });

    expect(overloaded.channels.cognitiveLoad.score).toBeGreaterThan(calm.channels.cognitiveLoad.score);
    expect(overloaded.channels.cognitiveLoad.gameAdjusted).toBe(true);
    expect(overloaded.channels.inhibitionControl.score).toBeLessThan(calm.channels.inhibitionControl.score);
    expect(overloaded.channels.visualSearchEfficiency.score).toBeLessThan(calm.channels.visualSearchEfficiency.score);
  });
});
