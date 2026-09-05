import { describe, expect, it } from 'vitest';
import { classifyEmotions } from './emotionClassifier.js';

function auMap(entries) {
  return Object.fromEntries(Object.entries(entries).map(([code, intensity]) => [code, { intensity }]));
}

function sumProbabilities(result) {
  return Object.values(result.probabilities).reduce((sum, value) => sum + value, 0);
}

describe('classifyEmotions regression behavior', () => {
  it('keeps neutral dominant when AU evidence is absent', () => {
    const result = classifyEmotions({});

    expect(result.dominant).toBe('neutral');
    expect(result.dominantScore).toBeGreaterThanOrEqual(0.8);
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    expect(sumProbabilities(result)).toBeCloseTo(1, 3);
  });

  it('keeps neutral dominant for weak resting brow tension', () => {
    const result = classifyEmotions(auMap({ AU4: 0.08 }));

    expect(result.dominant).toBe('neutral');
    expect(result.probabilities.anger).toBeLessThan(result.probabilities.neutral);
    expect(result.probabilities.fear).toBeLessThan(result.probabilities.neutral);
    expect(sumProbabilities(result)).toBeCloseTo(1, 3);
  });

  it('does not classify anger from brow lowering alone without lid/lip tension', () => {
    const result = classifyEmotions(auMap({ AU4: 0.45 }));

    expect(result.dominant).not.toBe('anger');
    expect(result.probabilities.anger).toBeLessThan(result.probabilities.neutral);
    expect(sumProbabilities(result)).toBeCloseTo(1, 3);
  });

  it('keeps probabilities normalized when a clear happiness expression exists', () => {
    const result = classifyEmotions(auMap({ AU6: 0.7, AU12: 0.8 }));

    expect(result.dominant).toBe('happiness');
    expect(result.probabilities.happiness).toBeGreaterThan(result.probabilities.neutral);
    expect(sumProbabilities(result)).toBeCloseTo(1, 3);
  });

  it('classifies anger only when brow lowering is paired with tension evidence', () => {
    const result = classifyEmotions(auMap({ AU4: 0.55, AU7: 0.35, AU23: 0.3 }));

    expect(result.dominant).toBe('anger');
    expect(result.probabilities.anger).toBeGreaterThan(result.probabilities.neutral);
    expect(sumProbabilities(result)).toBeCloseTo(1, 3);
  });

  it('prefers surprise over fear for brow raise plus eye widening and jaw drop without fear-specific mouth stretch', () => {
    const result = classifyEmotions(auMap({ AU1: 0.45, AU2: 0.45, AU5: 0.45, AU26: 0.35 }));

    expect(result.dominant).toBe('surprise');
    expect(result.probabilities.surprise).toBeGreaterThan(result.probabilities.fear);
    expect(sumProbabilities(result)).toBeCloseTo(1, 3);
  });
});
