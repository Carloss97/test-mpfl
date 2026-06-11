import { describe, expect, it } from 'vitest';
import { estimateUpperBodyPosture, resetUpperBodyPostureState, calibrateUpperBodyPostureUpright } from './upperBodyPosture.js';

function makeFace({ tiltDy = 0, aspectScale = 1 }) {
  const landmarks = new Float32Array(478 * 3);
  const put = (idx, x, y, z = 0) => {
    landmarks[idx * 3] = x;
    landmarks[idx * 3 + 1] = y;
    landmarks[idx * 3 + 2] = z;
  };
  put(234, 0.30, 0.50);
  put(454, 0.70, 0.50 + tiltDy);
  put(10, 0.50, 0.30);
  put(152, 0.50, 0.30 + 0.40 * aspectScale);
  put(123, 0.38, 0.48);
  put(352, 0.62, 0.48);
  put(1, 0.50, 0.43);
  for (const idx of [0, 17, 37, 39, 40, 61, 146, 91, 181, 84, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95]) {
    put(idx, 0.45 + (idx % 7) * 0.01, 0.55 + (idx % 5) * 0.01);
  }
  return landmarks;
}

describe('estimateUpperBodyPosture temporal quality', () => {
  it('reports high stability for repeated frames and lower stability after landmark jitter', () => {
    resetUpperBodyPostureState();
    const stableA = estimateUpperBodyPosture(makeFace({}));
    const stableB = estimateUpperBodyPosture(makeFace({}));
    const jittered = estimateUpperBodyPosture(makeFace({ tiltDy: 0.12, aspectScale: 1.2 }));

    expect(stableA.method).toBe('face_landmark_proxy');
    expect(stableB.stability).toBeGreaterThan(0.85);
    expect(jittered.stability).toBeLessThan(stableB.stability);
    expect(jittered.confidence).toBeLessThanOrEqual(1);
  });

  it('uses explicit upright calibration as headForward baseline', () => {
    resetUpperBodyPostureState();
    const upright = makeFace({ aspectScale: 1.15 });
    const lowered = makeFace({ aspectScale: 0.8 });
    const calibration = calibrateUpperBodyPostureUpright(upright);
    const uprightPose = estimateUpperBodyPosture(upright);
    const loweredPose = estimateUpperBodyPosture(lowered);

    expect(calibration.ok).toBe(true);
    expect(uprightPose.headForward).toBeLessThan(0.05);
    expect(loweredPose.headForward).toBeGreaterThan(uprightPose.headForward);
    expect(loweredPose.postureScore).toBeLessThan(uprightPose.postureScore);
  });
});
