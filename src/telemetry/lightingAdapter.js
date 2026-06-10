/**
 * Lighting Adapter — mejora la calidad de detección facial en condiciones
 * de iluminación variables sin modificar la imagen original.
 *
 * Estrategias:
 *  1. Thresholds dinámicos de confianza: más permisivos con poca luz
 *  2. Calibración adaptativa: espera más muestras si la confianza es baja
 *  3. Normalización de blendshapes: compensa variaciones por iluminación
 *  4. Filtro de outliers: descarta frames con confianza anómala
 *  5. Auto-exposición via camera constraints (solicitar al navegador)
 */

// ─── Light estimation ───

/**
 * Estima el nivel de iluminación a partir de la confianza de detección
 * y la presencia facial. MediaPipe reporta menor confianza con poca luz.
 *
 * @param {Array} samples — últimas N muestras faciales
 * @returns {{ level: 'good'|'moderate'|'low'|'very_low', avgConfidence: number, presenceRatio: number }}
 */
export function estimateLightingQuality(samples = []) {
  if (!samples.length) return { level: 'very_low', avgConfidence: 0, presenceRatio: 0 };

  const usable = samples.filter((s) => s?.quality?.facePresent);
  const presenceRatio = usable.length / samples.length;
  const confidences = usable.map((s) => s?.quality?.confidence ?? 0);
  const avgConfidence = confidences.length
    ? confidences.reduce((s, v) => s + v, 0) / confidences.length
    : 0;

  let level;
  if (avgConfidence >= 0.85 && presenceRatio >= 0.8) level = 'good';
  else if (avgConfidence >= 0.65 && presenceRatio >= 0.6) level = 'moderate';
  else if (avgConfidence >= 0.4 && presenceRatio >= 0.3) level = 'low';
  else level = 'very_low';

  return { level, avgConfidence, presenceRatio };
}

// ─── Adaptive calibration ───

/**
 * Determina cuántas muestras necesita la calibración según la calidad de luz.
 * Con buena luz: 40 muestras (~2s a 20fps). Con poca luz: hasta 100.
 */
export function adaptiveCalibrationSamples(lightingQuality) {
  switch (lightingQuality.level) {
    case 'good': return { minSamples: 30, durationMs: 2000 };
    case 'moderate': return { minSamples: 50, durationMs: 3500 };
    case 'low': return { minSamples: 80, durationMs: 5000 };
    default: return { minSamples: 100, durationMs: 6000 };
  }
}

/**
 * Filtra outliers de un array de muestras basado en la confianza.
 * Descarta frames con confianza muy por debajo de la media.
 */
export function filterOutlierSamples(samples = [], zThreshold = 2.0) {
  if (samples.length < 5) return samples;

  const usableSamples = samples.filter((s) => s?.quality?.facePresent);
  if (!usableSamples.length) return samples;

  const confidences = usableSamples.map((s) => s?.quality?.confidence ?? 0);
  const mean = confidences.reduce((s, v) => s + v, 0) / confidences.length;
  const variance = confidences.reduce((s, v) => s + (v - mean) ** 2, 0) / confidences.length;
  const std = Math.sqrt(variance);

  if (std < 0.05) return samples; // muy poca varianza, no filtrar

  return samples.filter((s) => {
    if (!s?.quality?.facePresent) return true; // keep non-face frames
    const z = Math.abs((s.quality.confidence ?? 0) - mean) / std;
    return z <= zThreshold;
  });
}

// ─── Blendshape normalization ───

/**
 * Normaliza blendshapes para compensar variaciones por iluminación.
 * Con poca luz, MediaPipe tiende a subestimar intensidades → escalamos.
 *
 * Usa un factor de escala basado en la confianza media:
 *  - confidence 0.9+ → factor 1.0 (sin cambio)
 *  - confidence 0.6  → factor 1.15 (boost 15%)
 *  - confidence 0.4  → factor 1.3  (boost 30%)
 */
export function normalizeBlendshapesForLighting(blendshapes = {}, avgConfidence = 0.9) {
  if (avgConfidence >= 0.85) return blendshapes;

  // Scale factor: linear interpolation between 1.0 (at conf=0.85) and 1.4 (at conf=0.3)
  const scale = 1.0 + Math.max(0, (0.85 - avgConfidence) * 0.8);

  const normalized = {};
  for (const [key, value] of Object.entries(blendshapes)) {
    normalized[key] = Math.min(1.0, Number(value) * scale);
  }
  return normalized;
}

// ─── Camera constraints for better lighting ───

/**
 * Genera constraints de cámara optimizadas para detección facial.
 * Solicita resolución moderada (mejor para MediaPipe) y prioriza
 * cámara frontal (mejor iluminación en laptops).
 */
export function getOptimalCameraConstraints(deviceId = '') {
  return {
    video: {
      ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'user' }),
      width: { ideal: 640 },
      height: { ideal: 480 },
      frameRate: { ideal: 30 },
      // No forzar zoom/torch — el usuario controla su entorno
    },
    audio: false,
  };
}

// ─── Quality assessment for calibration ───

/**
 * Evalúa si las muestras actuales son suficientes para una calibración válida.
 * Más permisivo que el checker original: acepta calidad moderada.
 */
export function canCalibrate(samples = [], { minSamples = 20, minPresenceRatio = 0.4, minConfidence = 0.45 } = {}) {
  if (samples.length < minSamples) return { eligible: false, reason: `need ${minSamples} samples, have ${samples.length}` };

  const quality = estimateLightingQuality(samples);

  if (quality.presenceRatio < minPresenceRatio) {
    return { eligible: false, reason: `face presence too low: ${(quality.presenceRatio * 100).toFixed(0)}%` };
  }
  if (quality.avgConfidence < minConfidence) {
    return { eligible: false, reason: `detection confidence too low: ${(quality.avgConfidence * 100).toFixed(0)}%` };
  }

  return { eligible: true, reason: 'ok', quality };
}