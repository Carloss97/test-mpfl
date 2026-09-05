import { estimateUpperBodyPosture, resetUpperBodyPostureState, calibrateUpperBodyPostureUpright } from '../src/telemetry/upperBodyPosture.js';
import { computeInsightsFromAUs } from '../src/telemetry/insightMetrics.js';
import { extractPerformanceFeatures } from '../src/telemetry/temporalFeatures.js';

function makeFace({ tiltDy = 0, aspectScale = 1 }) {
  const landmarks = new Float32Array(478 * 3);
  const put = (idx, x, y, z = 0) => { landmarks[idx * 3] = x; landmarks[idx * 3 + 1] = y; landmarks[idx * 3 + 2] = z; };
  put(234, 0.30, 0.50); put(454, 0.70, 0.50 + tiltDy);
  put(10, 0.50, 0.30); put(152, 0.50, 0.30 + 0.40 * aspectScale);
  put(123, 0.38, 0.48); put(352, 0.62, 0.48); put(1, 0.50, 0.43);
  for (const idx of [0, 17, 37, 39, 40, 61, 146, 91, 181, 84, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95]) {
    put(idx, 0.45 + (idx % 7) * 0.01, 0.55 + (idx % 5) * 0.01);
  }
  return landmarks;
}

// Chain 1: cabeza hacia abajo (aspectScale↓ => headForward↑) => postureScore↓
resetUpperBodyPostureState();
calibrateUpperBodyPostureUpright(makeFace({ aspectScale: 1.15 })); // baseline upright
console.log('CHAIN 1: cabeza -> postureScore');
const scales = [1.15, 0.95, 0.75, 0.55, 0.4];
let prevScore = 1.1, mono1 = true;
for (const s of scales) {
  const p = estimateUpperBodyPosture(makeFace({ aspectScale: s }));
  console.log(`  aspectScale=${s} headForward=${p.headForward} headTilt=${p.headTilt} asym=${p.asymmetry} stab=${p.stability} postureScore=${p.postureScore}`);
  if (p.postureScore > prevScore) mono1 = false;
  prevScore = p.postureScore;
}
// Chain 1 b: zona NO saturada (headForward < 1) debe ser estrictamente decreciente.
resetUpperBodyPostureState();
calibrateUpperBodyPostureUpright(makeFace({ aspectScale: 1.15 }));
console.log('CHAIN 1b: zona no saturada -> postureScore');
const fineScales = [1.12, 1.06, 1.00, 0.94, 0.88, 0.82];
let prevFine = 1.1, monoFine = true;
for (const s of fineScales) {
  const p = estimateUpperBodyPosture(makeFace({ aspectScale: s }));
  const ok = p.postureScore <= prevFine;
  if (!ok) monoFine = false;
  console.log(`  aspectScale=${s} headForward=${p.headForward} postureScore=${p.postureScore} ${ok ? '' : '<-- NO-MONO'}`);
  prevFine = p.postureScore;
}
console.log('  MONOTONE_DECREASING(unsaturated):', monoFine);

// Chain 1 c: diagnostico de saturacion
resetUpperBodyPostureState();
calibrateUpperBodyPostureUpright(makeFace({ aspectScale: 1.15 }));
const lowA = estimateUpperBodyPosture(makeFace({ aspectScale: 0.6 }));
const lowB = estimateUpperBodyPosture(makeFace({ aspectScale: 0.35 }));
console.log('  HEADFORWARD clamp check: hf(0.6)=', lowA.headForward, 'hf(0.35)=', lowB.headForward);

// Chain 2: parpadeo (AU45/AU43) -> fatiga (PERCLOS proxy)
console.log('CHAIN 2: parpadeo -> PERCLOS(proxy fatiga)');
const base = {
  AU4: { intensity: 0.02 }, AU5: { intensity: 0.1 }, AU7: { intensity: 0.02 },
  AU23: { intensity: 0.01 }, AU43: { intensity: 0.0 }, AU45: { intensity: 0.0 },
};
let prevFat = -1, mono2 = true;
for (const blink of [0, 0.2, 0.4, 0.6, 0.8, 1.0]) {
  const m = computeInsightsFromAUs({ ...base, AU43: { intensity: blink }, AU45: { intensity: blink } }, 1);
  console.log(`  blink=AU43=AU45=${blink} fatigue=${m.fatigue}`);
  if (m.fatigue <= prevFat) mono2 = false;
  prevFat = m.fatigue;
}
console.log('  MONOTONE_INCREASING:', mono2);

// Chain 3: error -> post-error adjustment (postErrorRecovery sube con mejora post-error)
console.log('CHAIN 3: error -> post-error adjustment');
// recovery = clamp(mean(nextScore - errorScore)/0.5 + 0.5); mas mejora => mas recovery
const cases = [
  { label: 'sin mejora (0)', trials: [
    { completedAt: 1, correct: false, score: 0.2, reactionTimeMs: 500 },
    { completedAt: 2, correct: true, score: 0.2, reactionTimeMs: 400 },
  ]},
  { label: 'mejora pequena (+0.15)', trials: [
    { completedAt: 1, correct: false, score: 0.2, reactionTimeMs: 500 },
    { completedAt: 2, correct: true, score: 0.35, reactionTimeMs: 400 },
  ]},
  { label: 'mejora grande (+0.6)', trials: [
    { completedAt: 1, correct: false, score: 0.2, reactionTimeMs: 500 },
    { completedAt: 2, correct: true, score: 0.8, reactionTimeMs: 400 },
  ]},
];
let prevRec = -1, mono3 = true;
for (const c of cases) {
  const r = extractPerformanceFeatures(c.trials);
  console.log(`  ${c.label}: postErrorRecovery=${r.postErrorRecovery} errorSeq=${r.errorSequenceCount}`);
  if (r.postErrorRecovery < prevRec) mono3 = false;
  prevRec = r.postErrorRecovery;
}
console.log('  MONOTONE_INCREASING:', mono3);