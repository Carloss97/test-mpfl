import { describe, expect, it } from 'vitest';
import { estimateUpperBodyPosture, resetUpperBodyPostureState, calibrateUpperBodyPostureUpright } from './upperBodyPosture.js';
import { computeInsightsFromAUs } from './insightMetrics.js';
import { extractPerformanceFeatures } from './temporalFeatures.js';

/**
 * T.3 — invariantes de monotonicidad de las cadenas de inferencia.
 * Verificación determinista a nivel de función pura (sin cámara). Estas
 * invariantes fijan la dirección esperada de cada señal; el sanity empírico
 * completo está en scripts/dev-sanity-monotonicity.mjs.
 */

function makeFace({ aspectScale = 1 } = {}) {
  const landmarks = new Float32Array(478 * 3);
  const put = (idx, x, y, z = 0) => { landmarks[idx * 3] = x; landmarks[idx * 3 + 1] = y; landmarks[idx * 3 + 2] = z; };
  put(234, 0.30, 0.50); put(454, 0.70, 0.50);
  put(10, 0.50, 0.30); put(152, 0.50, 0.30 + 0.40 * aspectScale);
  put(123, 0.38, 0.48); put(352, 0.62, 0.48); put(1, 0.50, 0.43);
  for (const idx of [0, 17, 37, 39, 40, 61, 146, 91, 181, 84, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95]) {
    put(idx, 0.45 + (idx % 7) * 0.01, 0.55 + (idx % 5) * 0.01);
  }
  return landmarks;
}

describe('T.3 monotonicidad: cabeza → postureScore', () => {
  it('postureScore decrece estrictamente al bajar la cabeza en zona no saturada (headForward < 1)', () => {
    resetUpperBodyPostureState();
    calibrateUpperBodyPostureUpright(makeFace({ aspectScale: 1.15 }));
    const scales = [1.12, 1.06, 1.00, 0.94];
    let prev = Infinity;
    let headForwardRose = false;
    let previousHeadForward = -1;
    for (const s of scales) {
      const pose = estimateUpperBodyPosture(makeFace({ aspectScale: s }));
      expect(pose.postureScore).toBeLessThanOrEqual(prev + 1e-9);
      if (pose.headForward > previousHeadForward) headForwardRose = true;
      previousHeadForward = pose.headForward;
      prev = pose.postureScore;
    }
    expect(headForwardRose).toBe(true);
  });

  it('postureScore se mantiene acotado (±0.015) cuando headForward satura en 1', () => {
    resetUpperBodyPostureState();
    calibrateUpperBodyPostureUpright(makeFace({ aspectScale: 1.15 }));
    const scores = [0.6, 0.45, 0.3].map((s) => {
      const pose = estimateUpperBodyPosture(makeFace({ aspectScale: s }));
      expect(pose.headForward).toBeLessThanOrEqual(1);
      return pose.postureScore;
    });
    const spread = Math.max(...scores) - Math.min(...scores);
    expect(spread).toBeLessThanOrEqual(0.015);
  });
});

describe('T.3 monotonicidad: parpadeo (AU43/AU45) → PERCLOS proxy', () => {
  it('fatiga crece estrictamente con más oclusión ocular', () => {
    const base = {
      AU4: { intensity: 0.02 }, AU5: { intensity: 0.1 }, AU7: { intensity: 0.02 },
      AU23: { intensity: 0.01 }, AU43: { intensity: 0 }, AU45: { intensity: 0 },
    };
    const fatigue = [0, 0.2, 0.4, 0.6, 0.8, 1.0].map((b) =>
      computeInsightsFromAUs({ ...base, AU43: { intensity: b }, AU45: { intensity: b } }, 1).fatigue,
    );
    for (let i = 1; i < fatigue.length; i++) {
      expect(fatigue[i]).toBeGreaterThan(fatigue[i - 1]);
    }
    expect(fatigue[fatigue.length - 1] - fatigue[0]).toBeGreaterThanOrEqual(0.3);
  });
});

describe('T.3 monotonicidad: error → post-error adjustment', () => {
  it('postErrorRecovery es no-decreciente cuanto mayor es la mejora post-error', () => {
    const recoveries = [0.0, 0.15, 0.4, 0.6].map((gain) => {
      const perf = extractPerformanceFeatures([
        { completedAt: 1000, correct: false, score: 0.2, reactionTimeMs: 500 },
        { completedAt: 2000, correct: true, score: 0.2 + gain, reactionTimeMs: 400 },
      ]);
      expect(perf.errorSequenceCount).toBe(1);
      return perf.postErrorRecovery;
    });
    for (let i = 1; i < recoveries.length; i++) {
      expect(recoveries[i]).toBeGreaterThanOrEqual(recoveries[i - 1]);
    }
  });
});