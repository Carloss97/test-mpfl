import { describe, expect, it } from 'vitest';
import {
  clampDifficultyLevel,
  buildDifficultySnapshot,
  recommendAdaptiveDifficulty,
} from './adaptiveDifficulty.js';

const stableHigh = {
  performance: { accuracy: 0.92, meanReactionTimeMs: 340, completedTrialCount: 8, trialCount: 8, meanScore: 0.88 },
  motor: { pathEfficiencyMean: 0.9, smoothPursuitScore: 0.86, trackingLossRatio: 0.03, overshootRate: 0.05 },
  inhibition: { commissionErrorRate: 0.03, omissionErrorRate: 0.02 },
  interference: { conflictCostMs: 80, errorRate: 0.02 },
  visualSearch: { searchEfficiency: 0.84, errorRate: 0.03 },
};

const overloaded = {
  performance: { accuracy: 0.42, meanReactionTimeMs: 1150, completedTrialCount: 5, trialCount: 8, meanScore: 0.35 },
  motor: { pathEfficiencyMean: 0.32, smoothPursuitScore: 0.28, trackingLossRatio: 0.45, overshootRate: 0.8 },
  inhibition: { commissionErrorRate: 0.55, omissionErrorRate: 0.3 },
  interference: { conflictCostMs: 540, errorRate: 0.45 },
  visualSearch: { searchEfficiency: 0.25, errorRate: 0.5 },
};

describe('adaptiveDifficulty', () => {
  it('clamps difficulty level to a stable range', () => {
    expect(clampDifficultyLevel(-5)).toBe(1);
    expect(clampDifficultyLevel(3)).toBe(3);
    expect(clampDifficultyLevel(99)).toBe(10);
  });

  it('builds a compact snapshot from game telemetry and Edge AI channels', () => {
    const snapshot = buildDifficultySnapshot({
      gameSummary: stableHigh,
      edgeAIResult: { channels: { cognitiveLoad: { score: 35 }, motorControl: { score: 82 } } },
    });

    expect(snapshot).toMatchObject({
      accuracy: 0.92,
      completedTrialRatio: 1,
      meanReactionTimeMs: 340,
      pathEfficiency: 0.9,
      smoothPursuitScore: 0.86,
      cognitiveLoadScore: 35,
      motorControlScore: 82,
    });
    expect(JSON.stringify(snapshot)).not.toContain('events');
    expect(JSON.stringify(snapshot)).not.toContain('windows');
  });

  it('raises difficulty monotonically when performance is strong and load is controlled', () => {
    const result = recommendAdaptiveDifficulty({
      currentLevel: 4,
      gameSummary: stableHigh,
      edgeAIResult: { channels: { cognitiveLoad: { score: 35 }, motorControl: { score: 82 } } },
      timestamp: 1234,
    });

    expect(result.previousLevel).toBe(4);
    expect(result.nextLevel).toBe(5);
    expect(result.direction).toBe('up');
    expect(result.reasonCodes).toContain('high_accuracy');
    expect(result.reasonCodes).toContain('stable_motor_control');
    expect(result.trace).toMatchObject({ timestamp: 1234, previousLevel: 4, nextLevel: 5 });
  });

  it('lowers difficulty when accuracy and control collapse under high load', () => {
    const result = recommendAdaptiveDifficulty({
      currentLevel: 6,
      gameSummary: overloaded,
      edgeAIResult: { channels: { cognitiveLoad: { score: 83 }, motorControl: { score: 34 } } },
    });

    expect(result.nextLevel).toBe(5);
    expect(result.direction).toBe('down');
    expect(result.reasonCodes).toEqual(expect.arrayContaining(['low_accuracy', 'high_cognitive_load', 'weak_motor_control']));
  });

  it('holds difficulty for mixed evidence and records why', () => {
    const result = recommendAdaptiveDifficulty({
      currentLevel: 5,
      gameSummary: {
        performance: { accuracy: 0.71, meanReactionTimeMs: 620, completedTrialCount: 7, trialCount: 8, meanScore: 0.68 },
        motor: { pathEfficiencyMean: 0.7, smoothPursuitScore: 0.62, trackingLossRatio: 0.18, overshootRate: 0.25 },
        inhibition: { commissionErrorRate: 0.12, omissionErrorRate: 0.08 },
        interference: { conflictCostMs: 180, errorRate: 0.12 },
        visualSearch: { searchEfficiency: 0.63, errorRate: 0.12 },
      },
      edgeAIResult: { channels: { cognitiveLoad: { score: 55 }, motorControl: { score: 66 } } },
    });

    expect(result.nextLevel).toBe(5);
    expect(result.direction).toBe('hold');
    expect(result.reasonCodes).toContain('mixed_evidence');
  });
});
