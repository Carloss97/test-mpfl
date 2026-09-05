import { describe, expect, it } from 'vitest';
import { buildGestureInsights, computeAUs, computeAURegionSummary, computeMicrogestureGroups, AU_MAP } from './gestureInsights.js';

describe('AU_MAP', () => {
  it('has all standard FACS AUs mapped', () => {
      const keys = Object.keys(AU_MAP).sort();
      // Core AUs must be present
      const required = ['AU1','AU2','AU4','AU5','AU6','AU7','AU9','AU10','AU12','AU14','AU15','AU16','AU17','AU18','AU20','AU22','AU23','AU24','AU25','AU26','AU27','AU28','AU43','AU45'];
      for (const au of required) {
        expect(keys).toContain(au);
      }
      // Asymmetry AUs
      expect(keys).toContain('AU_L12');
      expect(keys).toContain('AU_R12');
      expect(keys).toContain('AU_L14');
      expect(keys).toContain('AU_R14');
      // Total should be 30
      expect(keys.length).toBeGreaterThanOrEqual(28);
    });
});

describe('computeAUs', () => {
  it('computes AU intensities from blendshape samples', () => {
    const samples = [
      {
        timestamp: 100,
        blendshapes: {
          browDownLeft: 0.4, browDownRight: 0.4,
          browInnerUp: 0.2,
          browOuterUpLeft: 0, browOuterUpRight: 0,
          eyeWideLeft: 0.6, eyeWideRight: 0.6,
          cheekSquintLeft: 0.1, cheekSquintRight: 0.1,
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
      },
    ];

    const aus = computeAUs(samples);

    // AU4 = browDown average → (0.4+0.4)/2 = 0.4
    expect(aus.AU4.intensity).toBeCloseTo(0.4, 3);
    // AU5 = eyeWide average → (0.6+0.6)/2 = 0.6
    expect(aus.AU5.intensity).toBeCloseTo(0.6, 3);
    // AU12 = mouthSmile average → (0.1+0.1)/2 = 0.1
    expect(aus.AU12.intensity).toBeCloseTo(0.1, 3);
    // AU26 = jawOpen → 0.5
    expect(aus.AU26.intensity).toBeCloseTo(0.5, 3);
    // AU45 = eyeBlink average → (0.1+0.1)/2 = 0.1
    expect(aus.AU45.intensity).toBeCloseTo(0.1, 3);
  });

  it('returns zero intensities with no usable samples', () => {
    const aus = computeAUs([]);
    for (const au of Object.values(aus)) {
      expect(au.intensity).toBe(0);
    }
  });
});

describe('computeAURegionSummary', () => {
  it('aggregates AUs by region', () => {
    const samples = [
      {
        timestamp: 100,
        blendshapes: {
          browDownLeft: 0.4, browDownRight: 0.4,
          eyeWideLeft: 0.6, eyeWideRight: 0.6,
          jawOpen: 0.3,
        },
        quality: { facePresent: true },
      },
    ];
    const aus = computeAUs(samples);
    const regions = computeAURegionSummary(aus);

    expect(regions.upper).toBeGreaterThan(0);
    expect(regions.mid).toBeGreaterThan(0);
    expect(regions.lower).toBeGreaterThan(0);
  });
});

describe('computeMicrogestureGroups', () => {
  it('computes 4 group scores', () => {
    const samples = [
      {
        timestamp: 100,
        blendshapes: { browDownLeft: 0.3, browDownRight: 0.3, jawOpen: 0.5 },
        quality: { facePresent: true },
      },
    ];
    const groups = computeMicrogestureGroups(samples);

    expect(groups).toHaveProperty('browTension');
    expect(groups).toHaveProperty('jawActivation');
    expect(groups).toHaveProperty('ocularTension');
    expect(groups).toHaveProperty('mouthPressure');
    expect(groups.browTension.avg).toBeGreaterThan(0);
    expect(groups.jawActivation.avg).toBeGreaterThan(0);
  });
});

describe('buildGestureInsights', () => {
  it('computes heuristic proxies from recent blendshape samples', () => {
    const samples = [
      {
        timestamp: 100,
        blendshapes: {
          browDownLeft: 0.4, browDownRight: 0.4,
          browInnerUp: 0.2,
          eyeSquintLeft: 0.2, eyeSquintRight: 0.2,
          eyeWideLeft: 0.6, eyeWideRight: 0.6,
          eyeBlinkLeft: 0.1, eyeBlinkRight: 0.1,
          mouthPressLeft: 0.1, mouthPressRight: 0.1,
          mouthFunnel: 0.4, mouthPucker: 0.4,
          jawForward: 0.3, jawOpen: 0.5,
        },
        quality: { facePresent: true },
      },
    ];

    const result = buildGestureInsights(samples);

    expect(result.tension).toBeCloseTo(0.25, 3);
    expect(result.attention).toBeCloseTo(0.35, 3);
    expect(result.surprise).toBeCloseTo(0.425, 3);
    expect(result.fatigue).toBeCloseTo(0.19, 3);
    expect(result.frustrationTolerance).toBeCloseTo(0.75, 3);

    // New fields must be present
    expect(result.auScores).toBeDefined();
    expect(result.auRegionSummary).toBeDefined();
    expect(result.microgestureGroups).toBeDefined();
    expect(Object.keys(result.auScores)).toHaveLength(Object.keys(AU_MAP).length);
  });

  it('returns zeros when there are no usable samples', () => {
    const result = buildGestureInsights([]);
    expect(result.sampleCount).toBe(0);
    expect(result.usableSampleCount).toBe(0);
    expect(result.tension).toBe(0);
    expect(result.attention).toBe(0);
    expect(result.surprise).toBe(0);
    expect(result.fatigue).toBe(0);
    expect(result.frustrationTolerance).toBe(0);
    expect(result.auScores).toBeDefined();
    expect(result.microgestureGroups).toBeDefined();
  });
});