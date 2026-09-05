/**
 * Temporal Contrast — amplificación por contraste temporal
 *
 * Problema: las métricas y emociones no varían una vez que se asientan
 * porque el signalAmplifier solo usa ganancia fija sin memoria.
 *
 * Solución: comparar cada AU contra su media móvil reciente.
 * Si una AU sube/baja significativamente respecto a su historia
 * reciente, se amplifica más. Si está estable, se atenúa.
 *
 * Esto genera variación REAL cuando el usuario cambia de expresión,
 * y reduce el ruido cuando la expresión es estable.
 */

const HISTORY_SIZE = 30;
const history = {}; // { AU_CODE: [values] }

function ensureHistory(code) {
  if (!history[code]) history[code] = [];
  return history[code];
}

/**
 * Calcula contraste temporal para una AU.
 * Retorna factor de amplificación: >1 si la AU cambió, <1 si está estable.
 */
export function temporalContrast(code, rawValue) {
  const h = ensureHistory(code);
  h.push(rawValue);
  while (h.length > HISTORY_SIZE) h.shift();

  if (h.length < 5) return 1.0;

  // Mean of recent history (excluding current)
  const recent = h.slice(0, -1);
  const mean = recent.reduce((s, v) => s + v, 0) / recent.length;
  const variance = recent.reduce((s, v) => s + (v - mean) ** 2, 0) / recent.length;
  const std = Math.sqrt(variance) || 0.01;

  // Z-score of current value vs history
  const z = (rawValue - mean) / std;

  // Contrast factor: strong deviation → amplify, stable → attenuate
  if (Math.abs(z) > 2.0) return 2.5;  // big change: amplify
  if (Math.abs(z) > 1.0) return 1.8;  // moderate change
  if (Math.abs(z) > 0.5) return 1.3;  // slight change
  return 0.7; // stable: attenuate (reduce noise)
}

/**
 * Aplica contraste temporal a todas las AUs, retornando nuevo objeto
 * con intensidades ajustadas.
 */
export function applyTemporalContrast(aus = {}) {
  const result = {};
  for (const [code, au] of Object.entries(aus)) {
    const raw = au?.intensity ?? (typeof au === 'number' ? au : 0);
    const factor = temporalContrast(code, raw);
    result[code] = {
      ...(typeof au === 'object' ? au : {}),
      intensity: Math.min(1, raw * factor),
      rawIntensity: raw,
      contrastFactor: factor,
    };
  }
  return result;
}

export function clearTemporalHistory() {
  for (const key of Object.keys(history)) delete history[key];
}