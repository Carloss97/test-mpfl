import { describe, expect, it } from 'vitest';
import {
  extractFacialFeatures,
  extractInteractionFeatures,
  extractPerformanceFeatures,
  computeFacialDeltas,
  buildFullFeatureVector,
} from './temporalFeatures.js';

const fakeFaceSample = (ts, overrides = {}) => ({
  timestamp: ts,
  blendshapes: {
    browDownLeft: 0.3, browDownRight: 0.3,
    browInnerUp: 0.1,
    eyeBlinkLeft: 0.1, eyeBlinkRight: 0.1,
    eyeSquintLeft: 0.15, eyeSquintRight: 0.15,
    eyeWideLeft: 0.5, eyeWideRight: 0.5,
    jawOpen: 0.4, jawForward: 0.1,
    mouthPressLeft: 0.2, mouthPressRight: 0.2,
    mouthSmileLeft: 0.1, mouthSmileRight: 0.1,
    mouthFrownLeft: 0.05, mouthFrownRight: 0.05,
    cheekSquintLeft: 0.1, cheekSquintRight: 0.1,
    noseSneerLeft: 0.05, noseSneerRight: 0.05,
    mouthDimpleLeft: 0.05, mouthDimpleRight: 0.05,
    mouthFunnel: 0.1, mouthPucker: 0.1,
    mouthStretchLeft: 0.05, mouthStretchRight: 0.05,
    browOuterUpLeft: 0.05, browOuterUpRight: 0.05,
    ...overrides.blendshapes,
  },
  quality: {
    facePresent: overrides.facePresent !== false,
    faceCount: 1,
    confidence: overrides.confidence ?? 0.9,
    delegate: 'CPU',
  },
});

const fakePointerSample = (ts, x, y) => ({ timestamp: ts, x, y });
const fakeTaskEvent = (ts, trialId, correct = true, reactionTimeMs = 350) =>
  ({ timestamp: ts, trialId, correct, reactionTimeMs });

describe('extractFacialFeatures (v2 optimized)', () => {
  it('extracts aggregates from a window of facial samples using single-pass stats', () => {
    const samples = [
      fakeFaceSample(1000),
      fakeFaceSample(1100, { blendshapes: { browDownLeft: 0.5, browDownRight: 0.5 } }),
      fakeFaceSample(1200, { blendshapes: { browDownLeft: 0.4, browDownRight: 0.4 } }),
    ];
    const features = extractFacialFeatures(samples, { from: 1000, to: 1200 });
    expect(features.sampleCount).toBe(3);
    expect(features.usableSampleCount).toBe(3);
    expect(features.facePresenceRatio).toBeCloseTo(1, 2);
    expect(features.meanConfidence).toBeCloseTo(0.9, 2);
    expect(features.microgestureGroups).toHaveProperty('browTension');
    expect(features.microgestureGroups).toHaveProperty('jawActivation');
    expect(features.microgestureGroups).toHaveProperty('ocularTension');
    expect(features.microgestureGroups).toHaveProperty('mouthPressure');
    expect(features.microgestureGroups.browTension.mean).toBeGreaterThan(0);
    expect(features.microgestureGroups.browTension.std).toBeGreaterThanOrEqual(0);
    expect(features.microgestureGroups.browTension.volatility).toBeGreaterThanOrEqual(0);
    expect(features.upperFaceActivation).toBeDefined();
    expect(features.midFaceActivation).toBeDefined();
    expect(features.lowerFaceActivation).toBeDefined();
    expect(features.blendshapes).toHaveProperty('browDownLeft');
    expect(features.blendshapes.browDownLeft).toHaveProperty('mean');
    expect(features.blendshapes.browDownLeft).toHaveProperty('max');
    expect(features.blendshapes.browDownLeft).toHaveProperty('volatility');
    expect(features.blendshapes.browDownLeft).toHaveProperty('trend');
    expect(features.blendshapes.browDownLeft).toHaveProperty('p90');
  });

  it('filters out samples without face presence', () => {
    const samples = [fakeFaceSample(1000), fakeFaceSample(1100, { facePresent: false }), fakeFaceSample(1200)];
    const features = extractFacialFeatures(samples, { from: 1000, to: 1200 });
    expect(features.sampleCount).toBe(3);
    expect(features.usableSampleCount).toBe(2);
    expect(features.facePresenceRatio).toBeCloseTo(2 / 3, 2);
  });

  it('returns zeros for empty window', () => {
    const features = extractFacialFeatures([], { from: 0, to: 1000 });
    expect(features.sampleCount).toBe(0);
    expect(features.usableSampleCount).toBe(0);
    expect(features.microgestureGroups.browTension.mean).toBe(0);
  });

  it('computes trend correctly', () => {
    const samples = [
      fakeFaceSample(1000, { blendshapes: { browDownLeft: 0.0, browDownRight: 0.0 } }),
      fakeFaceSample(1100, { blendshapes: { browDownLeft: 0.3, browDownRight: 0.3 } }),
      fakeFaceSample(1200, { blendshapes: { browDownLeft: 0.6, browDownRight: 0.6 } }),
    ];
    const features = extractFacialFeatures(samples, { from: 1000, to: 1200 });
    expect(features.blendshapes.browDownLeft.trend).toBeGreaterThan(0);
  });

  it('benchmark: handles 1000 samples efficiently', () => {
    const samples = Array.from({ length: 1000 }, (_, i) =>
      fakeFaceSample(1000 + i * 33, {
        blendshapes: {
          browDownLeft: Math.random(), browDownRight: Math.random(),
          jawOpen: Math.random(), eyeWideLeft: Math.random(),
        },
      }),
    );
    const start = performance.now();
    const features = extractFacialFeatures(samples, { from: 1000, to: 34000 });
    const elapsed = performance.now() - start;
    expect(features.sampleCount).toBe(1000);
    // v2 is O(n); threshold must tolerate baseline variance on a loaded
    // Raspberry Pi while still catching catastrophic O(n^2) regressions.
    expect(elapsed).toBeLessThan(100);
  });
});

describe('extractInteractionFeatures', () => {
  it('extracts pointer kinematics and click features', () => {
    const pointers = [
      fakePointerSample(1000, 0, 0), fakePointerSample(1050, 50, 50),
      fakePointerSample(1100, 100, 100), fakePointerSample(1150, 200, 200),
    ];
    const clicks = [fakeTaskEvent(1150, 't1', true, 150), fakeTaskEvent(1300, 't2', false, 400)];
    const features = extractInteractionFeatures(pointers, clicks, { from: 1000, to: 1300 });
    expect(features.pointerSampleCount).toBe(4);
    expect(features.clickCount).toBe(2);
    expect(features.pointerTotalDistance).toBeGreaterThan(0);
    expect(features.pointerMeanSpeed).toBeGreaterThan(0);
    expect(features.pointerPathEfficiency).toBeGreaterThan(0);
    expect(features.pointerPathEfficiency).toBeLessThanOrEqual(1);
    expect(features.clickAccuracy).toBeCloseTo(0.5, 2);
    expect(features.clickMeanRT).toBeCloseTo(275, 0);
  });
});

describe('extractPerformanceFeatures', () => {
  it('computes performance aggregates from trials', () => {
    const trials = [
      { completedAt: 1000, correct: true, score: 1, reactionTimeMs: 300 },
      { completedAt: 2000, correct: false, score: 0, reactionTimeMs: 500 },
      { completedAt: 3000, correct: true, score: 1, reactionTimeMs: 280 },
      { completedAt: 4000, correct: true, score: 1, reactionTimeMs: 310 },
    ];
    const perf = extractPerformanceFeatures(trials);
    expect(perf.trialCount).toBe(4);
    expect(perf.completedCount).toBe(4);
    expect(perf.accuracy).toBeCloseTo(0.75, 2);
    expect(perf.meanScore).toBeCloseTo(0.75, 2);
    expect(perf.meanReactionTimeMs).toBeCloseTo(347.5, 0);
    expect(perf.errorSequenceCount).toBe(1);
  });
});

describe('computeFacialDeltas', () => {
  it('computes deltas between response and baseline features', () => {
    const samples = [
      fakeFaceSample(1000, { blendshapes: { browDownLeft: 0.1, browDownRight: 0.1 } }),
      fakeFaceSample(1100), fakeFaceSample(1200),
    ];
    const baseline = extractFacialFeatures(samples, { from: 1000, to: 1000 });
    const response = extractFacialFeatures(samples, { from: 1000, to: 1200 });
    const deltas = computeFacialDeltas(response, baseline);
    expect(deltas).toHaveProperty('browTension');
    expect(deltas).toHaveProperty('jawActivation');
    expect(deltas).toHaveProperty('upperFaceDelta');
  });
});

describe('buildFullFeatureVector', () => {
  it('builds a complete feature vector with v2 schema', () => {
    const faceSamples = [fakeFaceSample(1000), fakeFaceSample(1100), fakeFaceSample(1200)];
    const pointerSamples = [fakePointerSample(1000, 0, 0), fakePointerSample(1100, 100, 100)];
    const taskEvents = [fakeTaskEvent(1200, 't1', true, 200)];
    const vector = buildFullFeatureVector({ faceSamples, pointerSamples, taskEvents });
    expect(vector.schemaVersion).toBe('temporal_feature_vector_v2');
    expect(vector.facial).toBeDefined();
    expect(vector.facialDeltas).toBeDefined();
    expect(vector.interaction).toBeDefined();
    expect(vector.performance).toBeDefined();
    expect(vector.durationMs).toBeGreaterThan(0);
  });
});