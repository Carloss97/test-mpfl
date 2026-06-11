import { describe, expect, it } from 'vitest';
import { sanitizeFaceSampleForAggregation } from './samplePrivacy.js';

describe('sanitizeFaceSampleForAggregation', () => {
  it('removes reconstructive landmark arrays while preserving aggregate-safe fields', () => {
    const landmarks = new Float32Array([0.1, 0.2, 0.3]);
    const sample = {
      timestamp: 123,
      blendshapes: { mouthSmileLeft: 0.4 },
      landmarks,
      quality: { facePresent: true, confidence: 0.8, faceCount: 1 },
    };

    const sanitized = sanitizeFaceSampleForAggregation(sample);

    expect(sanitized).toEqual({
      timestamp: 123,
      blendshapes: { mouthSmileLeft: 0.4 },
      quality: { facePresent: true, confidence: 0.8, faceCount: 1 },
    });
    expect(sanitized.landmarks).toBeUndefined();
  });
});
