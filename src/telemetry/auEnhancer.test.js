import { describe, expect, it } from 'vitest';
import { computeEnhancedAUs, setAUBaseline, resetAUCache, computeCompositeAUIntensity, auIntensityLabel } from './auEnhancer.js';

const fakeSamples = (overrides = []) => {
  const base = {
    timestamp: 1000,
    blendshapes: {
      browDownLeft: 0.4, browDownRight: 0.4,
      browInnerUp: 0.2,
      browOuterUpLeft: 0, browOuterUpRight: 0,
      eyeWideLeft: 0.6, eyeWideRight: 0.6,
      cheekSquintLeft: 0.3, cheekSquintRight: 0.3,
      eyeSquintLeft: 0.2, eyeSquintRight: 0.2,
      noseSneerLeft: 0, noseSneerRight: 0,
      mouthSmileLeft: 0.1, mouthSmileRight: 0.1,
      mouthDimpleLeft: 0, mouthDimpleRight: 0,
      mouthFrownLeft: 0, mouthFrownRight: 0,
      mouthFunnel: 0.4, mouthPucker: 0.4,
      mouthStretchLeft: 0, mouthStretchRight: 0,
      mouthPressLeft: 0.1, mouthPressRight: 0.1,
      jawOpen: 0.5, jawForward: 0.3,
      eyeBlinkLeft: 0.1, eyeBlinkRight: 0.1,
    },
    quality: { facePresent: true },
  };
  if (overrides.length) return overrides;
  return [base];
};

describe('computeEnhancedAUs', () => {
  beforeEach(() => resetAUCache());

  it('computes AUs with EMA smoothing', () => {
    const result1 = computeEnhancedAUs(fakeSamples());
    expect(result1.AU4.intensity).toBeGreaterThan(0);
    expect(result1.AU12.intensity).toBeGreaterThan(0);

    // Second call with same data should be smoothed
    const result2 = computeEnhancedAUs(fakeSamples());
    // EMA should make it converge
    expect(result2.AU4.intensity).toBeCloseTo(result1.AU4.intensity, 2);
  });

  it('applies co-occurrence boosting for Duchenne smile (AU6+AU12)', () => {
    const samples = [{
      timestamp: 1000,
      blendshapes: {
        cheekSquintLeft: 0.6, cheekSquintRight: 0.6,
        mouthSmileLeft: 0.7, mouthSmileRight: 0.7,
      },
      quality: { facePresent: true },
    }];

    const result = computeEnhancedAUs(samples);
    // AU6 should boost AU12 and vice versa
    expect(result.AU6.intensity).toBeGreaterThan(0);
    expect(result.AU12.intensity).toBeGreaterThan(0);
  });

  it('applies adaptive thresholds from baseline', () => {
    resetAUCache();
    // Set a baseline where AU4 is already high at rest
    setAUBaseline(
      { eligible: true, signalQuality: { facePresenceRatio: 1 } },
      { AU4: { intensity: 0.3 }, AU5: { intensity: 0.1 } },
    );

    const result = computeEnhancedAUs(fakeSamples());
    // AU4 should be reduced by baseline
    expect(result.AU4.intensity).toBeLessThan(0.4);
    expect(result.AU4.delta).toBeDefined();
  });
});

describe('computeCompositeAUIntensity', () => {
  it('computes weighted composite intensity for an AU', () => {
    const bs = {
      mouthSmileLeft: 0.8, mouthSmileRight: 0.6,
      cheekSquintLeft: 0.3, cheekSquintRight: 0.3,
    };
    const intensity = computeCompositeAUIntensity(bs, 'AU12');
    expect(intensity).toBeGreaterThan(0);
    expect(intensity).toBeLessThanOrEqual(1);
  });
});

describe('auIntensityLabel', () => {
  it('returns correct labels for intensity levels', () => {
    expect(auIntensityLabel(0.7)).toBe('Fuerte');
    expect(auIntensityLabel(0.4)).toBe('Moderada');
    expect(auIntensityLabel(0.15)).toBe('Leve');
    expect(auIntensityLabel(0.02)).toBe('Traza');
  });
});