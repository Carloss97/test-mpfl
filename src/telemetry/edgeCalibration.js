/**
 * Edge AI Calibration — normalización estadística de scores
 *
 * Mantiene un historial de scores por canal y ajusta los outputs
 * usando z-scores para que sean comparables entre sesiones.
 *
 * También implementa outlier rejection: si un score se desvía
 * más de 2.5σ de la media, se marca como anomalía.
 */

const HISTORY_SIZE = 50;

// Rolling stats per channel
const channelHistory = {};

function ensureChannel(name) {
  if (!channelHistory[name]) {
    channelHistory[name] = { values: [], sum: 0, sumSq: 0 };
  }
  return channelHistory[name];
}

function round(v, d = 4) {
  if (!Number.isFinite(v)) return 0;
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

/**
 * Registra los scores de una sesión en el historial.
 */
export function recordSessionScores(channels = {}) {
  for (const [name, channel] of Object.entries(channels)) {
    const h = ensureChannel(name);
    const score = channel.score ?? channel;
    h.values.push(score);
    h.sum += score;
    h.sumSq += score * score;
    while (h.values.length > HISTORY_SIZE) {
      const old = h.values.shift();
      h.sum -= old;
      h.sumSq -= old * old;
    }
  }
}

/**
 * Calcula estadísticas actuales para un canal.
 */
export function getChannelStats(name) {
  const h = channelHistory[name];
  if (!h || h.values.length < 3) return null;
  const n = h.values.length;
  const mean = h.sum / n;
  const variance = (h.sumSq / n) - (mean * mean);
  const std = Math.sqrt(Math.max(0, variance));
  return { mean: round(mean, 1), std: round(std, 1), n, min: round(Math.min(...h.values), 1), max: round(Math.max(...h.values), 1) };
}

/**
 * Normaliza un score usando z-score relativo al historial.
 * Retorna el score normalizado + flags.
 */
export function normalizeScore(name, rawScore) {
  const stats = getChannelStats(name);
  if (!stats || stats.std < 1) return { score: rawScore, normalized: rawScore, zScore: 0, anomalous: false };

  const zScore = (rawScore - stats.mean) / stats.std;
  const anomalous = Math.abs(zScore) > 2.5;

  // Map z-score back to 0-100 scale:
  // z=0 → 50, z=2 → 84, z=-2 → 16
  const normalized = round(Math.min(100, Math.max(0, 50 + zScore * 17)), 1);

  return { score: rawScore, normalized, zScore: round(zScore, 2), anomalous };
}

/**
 * Normaliza todos los canales de un resultado edge AI.
 */
export function normalizeAllChannels(channels = {}) {
  const result = {};
  for (const [name, channel] of Object.entries(channels)) {
    const raw = channel.score ?? channel;
    result[name] = {
      ...channel,
      ...normalizeScore(name, raw),
    };
  }
  return result;
}

/**
 * Retorna el tamaño del historial.
 */
export function getHistorySize() {
  let total = 0;
  for (const h of Object.values(channelHistory)) total += h.values.length;
  return total;
}

/**
 * Limpia el historial.
 */
export function clearHistory() {
  for (const key of Object.keys(channelHistory)) delete channelHistory[key];
}