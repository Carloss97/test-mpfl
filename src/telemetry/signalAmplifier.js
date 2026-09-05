/**
 * Signal Amplifier — preprocesador compartido para AUs
 *
 * Problema: MediaPipe reporta intensidades muy conservadoras
 * (sonrisa visible = 0.15-0.25, no 0.5-0.8). Esto causa que:
 *  - Emociones siempre sean "neutral"
 *  - Edge AI scores estén comprimidos en 40-60%
 *
 * Solución: amplificación no-lineal que expande el rango dinámico
 * usando la baseline de calibración como referencia.
 *
 * Algoritmo:
 *  1. Restar baseline (si existe)
 *  2. Aplicar ganancia dependiente de la magnitud:
 *     - Señales débiles (0-0.15): ganancia 2.5x
 *     - Señales medias (0.15-0.40): ganancia 1.8x
 *     - Señales fuertes (>0.40): ganancia 1.2x
 *  3. Clamp a [0, 1]
 */

let baseline = {};

export function setAmplifierBaseline(aus = {}) {
  baseline = {};
  for (const [code, au] of Object.entries(aus)) {
    baseline[code] = au?.intensity ?? au ?? 0;
  }
}

export function clearAmplifierBaseline() { baseline = {}; }

/**
 * Amplifica el valor de una AU considerando su baseline.
 * Retorna valor 0-1 listo para usar en clasificadores.
 */
export function amplifyAU(rawIntensity, baselineValue = 0) {
  if (!Number.isFinite(rawIntensity)) return 0;
  // Subtract baseline
  const net = Math.max(0, rawIntensity - baselineValue * 0.8);
  // Adaptive gain based on signal strength
  let gain;
  if (net < 0.10) gain = 3.0;       // weak signals get big boost
  else if (net < 0.25) gain = 2.2;  // moderate signals
  else if (net < 0.50) gain = 1.6;  // clear signals
  else gain = 1.2;                   // strong signals
  return Math.min(1, net * gain);
}

/**
 * Amplifica todas las AUs de un objeto de scores.
 */
export function amplifyAllAUs(auScores = {}) {
  const result = {};
  for (const [code, au] of Object.entries(auScores)) {
    const raw = au?.intensity ?? au ?? 0;
    const base = baseline[code] ?? 0;
    result[code] = {
      ...(typeof au === 'object' ? au : {}),
      intensity: amplifyAU(raw, base),
      rawIntensity: raw,
    };
  }
  return result;
}