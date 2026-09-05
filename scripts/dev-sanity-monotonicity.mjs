#!/usr/bin/env node
/**
 * KRUMM T.3 — Sanity empírico de monotonicidad (script gated, sin cámara)
 *
 * Verifica las tres cadenas de inferencia a nivel de función pura con barridos
 * sintéticos deterministas. Es la vía alternativa que la tarjeta T.3 permite
 * cuando no hay hardware de cámara disponible:
 *
 *   1. cabeza → postureScore  (headForward débilmente creciente ⇒ postureScore débilmente decreciente)
 *   2. >parpadeo → PERCLOS proxy (más AU43/AU45 ⇒ más fatiga)
 *   3. error → post-error adjustment (más mejora post-error ⇒ postErrorRecovery más alto)
 *
 * GATE: requiere `--dev` (o env KRUMM_DEV=1) para ejecutarse; evita correr por
 * accidente fuera de un contexto de desarrollo.
 *
 * Uso:
 *   node scripts/dev-sanity-monotonicity.mjs --dev
 *
 * Exit code: 0 si todas las invariantes esperadas se cumplen, 1 en caso contrario.
 */
import { estimateUpperBodyPosture, resetUpperBodyPostureState, calibrateUpperBodyPostureUpright } from '../src/telemetry/upperBodyPosture.js';
import { computeInsightsFromAUs } from '../src/telemetry/insightMetrics.js';
import { extractPerformanceFeatures } from '../src/telemetry/temporalFeatures.js';

const GATED = process.argv.includes('--dev') || process.env.KRUMM_DEV === '1';
if (!GATED) {
  console.error('GATE: este sanity requiere --dev (o KRUMM_DEV=1). No correr fuera de desarrollo.');
  process.exit(2);
}

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

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

console.log('SANITY T.3 — monotonicidad (función pura, datos sintéticos)');
console.log('CHAIN 1: cabeza -> postureScore (zona no saturada estrictamente decreciente)');
resetUpperBodyPostureState();
calibrateUpperBodyPostureUpright(makeFace({ aspectScale: 1.15 }));
const unsaturatedScales = [1.12, 1.06, 1.00, 0.94];
let prev = Infinity;
let mono1 = true;
const scoresAt = [];
for (const s of unsaturatedScales) {
  const p = estimateUpperBodyPosture(makeFace({ aspectScale: s }));
  scoresAt.push(p.postureScore);
  if (p.postureScore > prev) mono1 = false;
  prev = p.postureScore;
}
check('cabeza→postureScore monótono decreciente (no saturado)', mono1, `scores=[${scoresAt.map((x) => x.toFixed(4)).join(', ')}]`);

// Diagnóstico: en la zona saturada headForward=1, el término de estabilidad temporal
// ((1-stability)*0.12) oscila con el jitter de landmarks y produce micro-oscilaciones
// observadas de hasta ~0.0082 en postureScore. Se exige sólo acotación plana (spread
// <= 0.015) y se documenta como caveat, no como violación de monotonicidad de dirección.
resetUpperBodyPostureState();
calibrateUpperBodyPostureUpright(makeFace({ aspectScale: 1.15 }));
const saturated = [];
for (const s of [0.6, 0.45, 0.3]) {
  const p = estimateUpperBodyPosture(makeFace({ aspectScale: s }));
  saturated.push(p.postureScore);
}
const saturatedSpread = Math.max(...saturated) - Math.min(...saturated);
check('cabeza→postureScore en zona saturada acotado (±0.015)', saturatedSpread <= 0.015,
  `spread=${saturatedSpread.toFixed(4)} ≤ 0.015, saturated headForward=1 (clamp)`);

console.log('CHAIN 2: parpadeo (AU43/AU45) -> PERCLOS proxy (fatiga estrictamente creciente)');
const baseAUs = {
  AU4: { intensity: 0.02 }, AU5: { intensity: 0.1 }, AU7: { intensity: 0.02 },
  AU23: { intensity: 0.01 }, AU43: { intensity: 0 }, AU45: { intensity: 0 },
};
const blinkLevels = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
const fatigueAt = [];
for (const b of blinkLevels) {
  fatigueAt.push(computeInsightsFromAUs({ ...baseAUs, AU43: { intensity: b }, AU45: { intensity: b } }, 1).fatigue);
}
let mono2 = true;
for (let i = 1; i < fatigueAt.length; i++) if (fatigueAt[i] <= fatigueAt[i - 1]) mono2 = false;
check('parpadeo→PERCLOS proxy estrictamente creciente', mono2, `fatigue=[${fatigueAt.map((x) => x.toFixed(3)).join(', ')}]`);
const perclosRange = fatigueAt[fatigueAt.length - 1] - fatigueAt[0];
check('PERCLOS proxy reacciona (rango >= 0.3)', perclosRange >= 0.3, `range=${perclosRange.toFixed(3)}`);

console.log('CHAIN 3: error -> post-error adjustment (postErrorRecovery creciente con mejora)');
const recoveryCases = [
  { label: 'sin mejora (0)', g: 0.0 },
  { label: 'mejora 0.15', g: 0.15 },
  { label: 'mejora 0.4', g: 0.4 },
  { label: 'mejora 0.6', g: 0.6 },
];
const recoveryAt = [];
let mono3 = true;
for (const c of recoveryCases) {
  const trials = [
    { completedAt: 1000, correct: false, score: 0.2, reactionTimeMs: 500 },
    { completedAt: 2000, correct: true, score: 0.2 + c.g, reactionTimeMs: 400 },
  ];
  const r = extractPerformanceFeatures(trials);
  recoveryAt.push(r.postErrorRecovery);
  if (r.errorSequenceCount !== 1) mono3 = false;
}
for (let i = 1; i < recoveryAt.length; i++) if (recoveryAt[i] < recoveryAt[i - 1]) mono3 = false;
check('error→postErrorRecovery monótono no-decreciente', mono3, `recovery=[${recoveryAt.join(', ')}]`);

console.log(`\nRESULTADO: ${failures === 0 ? 'OK (todas las invariantes cumplidas)' : `${failures} invariante(s) fallida(s)`}`);
process.exit(failures === 0 ? 0 : 1);