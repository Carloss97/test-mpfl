import { describe, expect, it } from 'vitest';
import {
  buildCalibrationProfile,
  extractMicrogestureWindow,
} from './microgestureFeatures.js';

const mixedQualitySamples = [
  {
    timestamp: 0,
    blendshapes: {
      browInnerUp: 0.2,
      browDownLeft: 0.4,
      jawOpen: 0.1,
      eyeSquintLeft: 0.3,
      eyeWideLeft: 0.1,
      mouthPressLeft: 0.1,
    },
    quality: { facePresent: true, faceCount: 1, confidence: 0.9 },
  },
  {
    timestamp: 100,
    blendshapes: {
      browInnerUp: 0.4,
      browDownLeft: 0.6,
      jawOpen: 0.5,
      eyeSquintLeft: 0.7,
      eyeWideLeft: 0.3,
      mouthPressLeft: 0.2,
    },
    quality: { facePresent: true, faceCount: 1, confidence: 0.8 },
  },
  {
    timestamp: 200,
    blendshapes: {},
    quality: { facePresent: false, faceCount: 0, confidence: 0.2 },
  },
];

describe('extractMicrogestureWindow', () => {
  it('extracts aggregate microgesture proxies while separating signal quality from missing faces', () => {
    const window = extractMicrogestureWindow(mixedQualitySamples, { from: 0, to: 250 });

    expect(window).toEqual({
      type: 'microgesture_window_v1',
      from: 0,
      to: 250,
      durationMs: 250,
      sampleCount: 3,
      usableSampleCount: 2,
      signalQuality: {
        facePresenceRatio: 0.6667,
        meanConfidence: 0.6333,
        multipleFaceRatio: 0,
        flags: ['insufficient_facial_coverage', 'low_detection_confidence'],
      },
      proxies: {
        browTension: { avg: 0.4, max: 0.5, volatility: 0.2 },
        jawActivation: { avg: 0.3, max: 0.5, volatility: 0.4 },
        ocularTension: { avg: 0.35, max: 0.5, volatility: 0.3 },
        mouthPressure: { avg: 0.15, max: 0.2, volatility: 0.1 },
      },
    });
  });

  it('computes calibration-adjusted deltas for each proxy group', () => {
    const window = extractMicrogestureWindow(mixedQualitySamples, {
      from: 0,
      to: 250,
      baseline: {
        proxies: {
          browTension: { avg: 0.25 },
          jawActivation: { avg: 0.2 },
          ocularTension: { avg: 0.2 },
          mouthPressure: { avg: 0.1 },
        },
      },
    });

    expect(window.calibrationDeltas).toEqual({
      browTension: 0.15,
      jawActivation: 0.1,
      ocularTension: 0.15,
      mouthPressure: 0.05,
    });
  });
});

describe('buildCalibrationProfile', () => {
  it('marks a baseline as not eligible when facial coverage or confidence is weak', () => {
    const profile = buildCalibrationProfile(mixedQualitySamples, { from: 0, to: 250 });

    expect(profile.type).toBe('microgesture_calibration_v1');
    expect(profile.eligible).toBe(false);
    expect(profile.caveats).toEqual(['insufficient_facial_coverage', 'low_detection_confidence']);
    expect(profile.proxies.browTension.avg).toBe(0.4);
  });

  it('creates an eligible baseline for stable high-coverage samples', () => {
    const stableSamples = [0, 100, 200, 300].map((timestamp) => ({
      timestamp,
      blendshapes: { browInnerUp: 0.1, jawOpen: 0.1, eyeSquintLeft: 0.1, mouthPressLeft: 0.05 },
      quality: { facePresent: true, faceCount: 1, confidence: 0.92 },
    }));

    const profile = buildCalibrationProfile(stableSamples, { from: 0, to: 300 });

    expect(profile.eligible).toBe(true);
    expect(profile.caveats).toEqual([]);
    expect(profile.signalQuality.facePresenceRatio).toBe(1);
    expect(profile.proxies.jawActivation).toEqual({ avg: 0.1, max: 0.1, volatility: 0 });
  });
});
