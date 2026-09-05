import { describe, expect, it } from 'vitest';
import { createEmotionTemporalSmoother } from './emotionTemporalSmoother.js';

function emotion(dominant, dominantScore, neutral = 0.1) {
  return {
    dominant,
    dominantScore,
    confidence: dominantScore,
    probabilities: {
      happiness: dominant === 'happiness' ? dominantScore : 0.1,
      anger: dominant === 'anger' ? dominantScore : 0.1,
      surprise: dominant === 'surprise' ? dominantScore : 0.1,
      neutral: dominant === 'neutral' ? dominantScore : neutral,
    },
  };
}

describe('createEmotionTemporalSmoother', () => {
  it('holds a one-frame non-neutral spike until it is stable', () => {
    const smoother = createEmotionTemporalSmoother({ switchMargin: 0.08, minStableFrames: 3 });

    expect(smoother.smooth(emotion('neutral', 0.75), { timestamp: 1 }).dominant).toBe('neutral');
    const spike = smoother.smooth(emotion('anger', 0.72, 0.2), { timestamp: 2 });

    expect(spike.dominant).toBe('neutral');
    expect(spike.temporalSmoothing.held).toBe(true);
  });

  it('switches after the candidate remains stable for enough frames', () => {
    const smoother = createEmotionTemporalSmoother({ switchMargin: 0.05, minStableFrames: 2 });

    smoother.smooth(emotion('neutral', 0.7), { timestamp: 1 });
    expect(smoother.smooth(emotion('happiness', 0.8, 0.05), { timestamp: 2 }).dominant).toBe('neutral');
    const switched = smoother.smooth(emotion('happiness', 0.82, 0.04), { timestamp: 3 });

    expect(switched.dominant).toBe('happiness');
    expect(switched.temporalSmoothing.switched).toBe(true);
  });

  it('does not double-count the same timestamp', () => {
    const smoother = createEmotionTemporalSmoother({ switchMargin: 0.05, minStableFrames: 2 });

    smoother.smooth(emotion('neutral', 0.7), { timestamp: 1 });
    const first = smoother.smooth(emotion('happiness', 0.8, 0.05), { timestamp: 2 });
    const duplicate = smoother.smooth(emotion('happiness', 0.8, 0.05), { timestamp: 2 });

    expect(first.dominant).toBe('neutral');
    expect(duplicate.dominant).toBe('neutral');
    expect(duplicate).toEqual(first);
  });
});
