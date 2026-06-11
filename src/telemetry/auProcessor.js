/**
 * AU Processor v1 — Procesamiento unificado de Action Units
 *
 * Reemplaza: signalAmplifier.js + temporalContrast.js + auEnhancer.js
 *
 * Pipeline:
 *   1. computeAUs (desde gestureInsights) → AUs crudas [0-1]
 *   2. Restar baseline de calibración (si existe)
 *   3. Ganancia adaptativa: 3.0x para <0.10, 2.2x para <0.25, 1.5x para >0.25
 *   4. Clamp a [0, 1]
 *
 * Sin contraste temporal (eso es para display, no para features).
 * Sin doble boost.
 * Sin EMA (el suavizado lo hace MediaPipe internamente).
 */

let baseline = {};

export function setAUBaseline(aus = {}) {
  baseline = {};
  for (const [code, au] of Object.entries(aus)) {
    baseline[code] = au?.intensity ?? (typeof au === 'number' ? au : 0);
  }
}

export function clearAUBaseline() { baseline = {}; }

function clamp(v, l = 0, h = 1) {
  return Math.min(h, Math.max(l, Number.isFinite(v) ? v : l));
}

export function processAU(rawIntensity, baselineValue = 0) {
  if (!Number.isFinite(rawIntensity)) return 0;
  // Subtract 60% of baseline (less aggressive, preserves signal after calibration)
  const net = Math.max(0, rawIntensity - baselineValue * 0.6);
  // Adaptive gain
  let gain;
  if (net < 0.08) gain = 3.0;
  else if (net < 0.20) gain = 2.2;
  else gain = 1.5;
  return clamp(net * gain);
}

/**
 * Procesa todas las AUs de un objeto computeAUs.
 * Entrada: { AU1: { intensity: 0.05, label: '...', region: '...' }, ... }
 * Salida: { AU1: { intensity: 0.15, rawIntensity: 0.05, ... }, ... }
 */
export function processAllAUs(auScores = {}) {
  const result = {};
  for (const [code, au] of Object.entries(auScores)) {
    const raw = au?.intensity ?? (typeof au === 'number' ? au : 0);
    const base = baseline[code] ?? 0;
    result[code] = {
      ...(typeof au === 'object' ? au : {}),
      intensity: processAU(raw, base),
      rawIntensity: raw,
    };
  }
  return result;
}

/**
 * Convierte AUs procesadas a vector de features para ML.
 * Retorna array de floats.
 */
export function ausToFeatureVector(aus = {}) {
  const codes = Object.keys(aus).sort();
  return codes.map(c => aus[c]?.intensity ?? 0);
}