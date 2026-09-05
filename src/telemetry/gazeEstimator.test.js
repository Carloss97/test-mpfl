import { describe, expect, it } from 'vitest';
import { calibrateGazeCenter, estimateGaze, resetGazeEstimator } from './gazeEstimator.js';

function makeGazeLandmarks({ irisDx = 0, irisDy = 0 } = {}) {
  const landmarks = new Float32Array(478 * 3);
  const put = (idx, x, y) => {
    landmarks[idx * 3] = x;
    landmarks[idx * 3 + 1] = y;
  };
  put(6, 0.5, 0.45);
  for (const idx of [469, 470, 471, 472]) put(idx, 0.47 + irisDx, 0.43 + irisDy);
  for (const idx of [474, 475, 476, 477]) put(idx, 0.53 + irisDx, 0.43 + irisDy);
  return landmarks;
}

describe('gaze explicit calibration', () => {
  it('sets current iris-nose relation as center baseline', () => {
    resetGazeEstimator();
    const center = makeGazeLandmarks({ irisDx: 0.01, irisDy: 0.005 });
    const calibration = calibrateGazeCenter(center);
    const gaze = estimateGaze(center);

    expect(calibration.ok).toBe(true);
    expect(gaze.calibrationFrames).toBeGreaterThanOrEqual(60);
    expect(gaze.screenX).toBeCloseTo(0.5, 2);
    expect(gaze.screenY).toBeCloseTo(0.5, 2);
    expect(gaze.lookingAtScreen).toBe(true);
  });
});
