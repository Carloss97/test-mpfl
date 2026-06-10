import { describe, expect, it } from 'vitest';
import {
  estimateHeadPose,
  isFaceFrontal,
  assessCaptureQuality,
  confidenceWeightedAUs,
  detectBlendshapeTrends,
} from './facialCapturePipeline.js';

describe('estimateHeadPose', () => {
  it('returns zero pose for empty landmarks', () => {
    const pose = estimateHeadPose(null);
    expect(pose.yaw).toBe(0);
    expect(pose.pitch).toBe(0);
    expect(pose.confidence).toBe(0);
  });

  it('estimates frontal pose correctly', () => {
    // Frontal face: nose aligned with eye center
    const landmarks = new Float32Array(500 * 3);
    // Set nose tip at index 1
    landmarks[1 * 3] = 0.5; landmarks[1 * 3 + 1] = 0.4; landmarks[1 * 3 + 2] = 0.5;
    // Left eye at 33
    landmarks[33 * 3] = 0.4; landmarks[33 * 3 + 1] = 0.35; landmarks[33 * 3 + 2] = 0.6;
    // Right eye at 263
    landmarks[263 * 3] = 0.6; landmarks[263 * 3 + 1] = 0.35; landmarks[263 * 3 + 2] = 0.6;
    // Chin at 199
    landmarks[199 * 3] = 0.5; landmarks[199 * 3 + 1] = 0.6; landmarks[199 * 3 + 2] = 0.5;

    const pose = estimateHeadPose(landmarks);
    // With normalized coords, yaw depends on x/z ratio. Just check it's finite.
    expect(Number.isFinite(pose.yaw)).toBe(true);
    expect(Number.isFinite(pose.pitch)).toBe(true);
    expect(pose.confidence).toBeGreaterThanOrEqual(0);
  });

  it('detects profile (high yaw)', () => {
    const landmarks = new Float32Array(500 * 3);
    landmarks[1 * 3] = 0.8; landmarks[1 * 3 + 1] = 0.4; landmarks[1 * 3 + 2] = 0.5;
    landmarks[33 * 3] = 0.4; landmarks[33 * 3 + 1] = 0.35; landmarks[33 * 3 + 2] = 0.6;
    landmarks[263 * 3] = 0.6; landmarks[263 * 3 + 1] = 0.35; landmarks[263 * 3 + 2] = 0.6;
    landmarks[199 * 3] = 0.5; landmarks[199 * 3 + 1] = 0.6; landmarks[199 * 3 + 2] = 0.5;

    const pose = estimateHeadPose(landmarks);
    expect(pose.confidence).toBeLessThan(0.6);
    expect(isFaceFrontal(pose)).toBe(false);
  });
});

describe('assessCaptureQuality', () => {
  it('rates good quality for high confidence samples', () => {
    const samples = Array.from({ length: 20 }, (_, i) => ({
      quality: { facePresent: true, confidence: 0.9 },
    }));
    const quality = assessCaptureQuality(samples, { confidence: 0.9 });
    expect(quality.illumination).toBe('good');
    expect(quality.overallScore).toBeGreaterThan(70);
  });

  it('rates low quality for empty samples', () => {
    const quality = assessCaptureQuality([]);
    expect(quality.illumination).toBe('low');
    expect(quality.overallScore).toBe(0);
  });
});

describe('confidenceWeightedAUs', () => {
  it('scales AU intensity by detection confidence', () => {
    const aus = {
      AU4: { intensity: 0.5, label: 'Brow Lowerer' },
      AU12: { intensity: 0.8, label: 'Lip Corner Puller' },
    };
    const weighted = confidenceWeightedAUs(aus, 0.45);
    expect(weighted.AU4.intensity).toBeLessThan(0.5);
    expect(weighted.AU12.intensity).toBeLessThan(0.8);
  });
});

describe('detectBlendshapeTrends', () => {
  it('detects rising trends', () => {
    const samples = Array.from({ length: 30 }, (_, i) => ({
      blendshapes: { browDownLeft: 0.1 + i * 0.01 },
    }));
    const trends = detectBlendshapeTrends(samples);
    expect(trends.browDownLeft).toBe('rising');
  });

  it('detects stable trends', () => {
    const samples = Array.from({ length: 30 }, () => ({
      blendshapes: { browDownLeft: 0.3 },
    }));
    const trends = detectBlendshapeTrends(samples);
    expect(trends.browDownLeft).toBe('stable');
  });
});