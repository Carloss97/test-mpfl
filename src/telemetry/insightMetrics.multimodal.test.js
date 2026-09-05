import { describe, expect, it } from 'vitest';
import { computeInsightsFromAUs } from './insightMetrics.js';

const neutralAUs = {
  AU4: { intensity: 0.02 },
  AU5: { intensity: 0.1 },
  AU7: { intensity: 0.02 },
  AU23: { intensity: 0.01 },
  AU45: { intensity: 0.05 },
};

describe('computeInsightsFromAUs multimodal behavior', () => {
  it('preserves AU-only provenance when no multimodal context is provided', () => {
    const metrics = computeInsightsFromAUs(neutralAUs, 1);

    expect(metrics.provenance).toBe('au_only_v2');
    expect(metrics.attention).toBeGreaterThan(0);
    expect(metrics.engagement).toBeGreaterThan(0);
  });

  it('raises attention and engagement when gaze is focused and posture is good', () => {
    const auOnly = computeInsightsFromAUs(neutralAUs, 1);
    const multimodal = computeInsightsFromAUs(neutralAUs, 1, {
      gaze: { available: true, lookingAtScreen: true, confidence: 0.95 },
      posture: { available: true, postureScore: 0.9, headForward: 0.05, headTilt: 0.03 },
      upperBody: { available: true, shoulderSymmetry: 0.95, confidence: 0.9 },
    });

    expect(multimodal.provenance).toBe('multimodal_v3');
    expect(multimodal.attention).toBeGreaterThan(auOnly.attention);
    expect(multimodal.engagement).toBeGreaterThan(auOnly.engagement);
  });

  it('increases fatigue/stress and lowers engagement when gaze is off-screen and posture is poor', () => {
    const good = computeInsightsFromAUs(neutralAUs, 1, {
      gaze: { available: true, lookingAtScreen: true, confidence: 0.95 },
      posture: { available: true, postureScore: 0.9, headForward: 0.05, headTilt: 0.02 },
      upperBody: { available: true, shoulderSymmetry: 0.95, confidence: 0.9 },
    });
    const poor = computeInsightsFromAUs(neutralAUs, 1, {
      gaze: { available: true, lookingAtScreen: false, confidence: 0.35 },
      posture: { available: true, postureScore: 0.35, headForward: 0.75, headTilt: 0.4 },
      upperBody: { available: true, shoulderSymmetry: 0.35, confidence: 0.6 },
      task: { accuracy: 0.5 },
    });

    expect(poor.fatigue).toBeGreaterThan(good.fatigue);
    expect(poor.stress).toBeGreaterThan(good.stress);
    expect(poor.engagement).toBeLessThan(good.engagement);
    expect(poor.boredom).toBeGreaterThan(good.boredom);
  });
});
