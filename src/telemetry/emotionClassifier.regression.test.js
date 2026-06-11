import { describe, expect, it } from 'vitest';
import { classifyEmotions } from './emotionClassifier.js';

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

  it('keeps probabilities normalized when a clear expression exists', () => {
    const result = classifyEmotions({
      AU6: { intensity: 0.7 },
      AU12: { intensity: 0.8 },
    });

    expect(result.dominant).toBe('happiness');
    expect(result.probabilities.happiness).toBeGreaterThan(result.probabilities.neutral);
    expect(sumProbabilities(result)).toBeCloseTo(1, 3);
  });
});
