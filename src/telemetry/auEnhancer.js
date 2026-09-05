/**
 * AU Enhancer — mejora la detección de Action Units con:
 *  - EMA temporal (suavizado por AU)
 *  - Co-occurrence boosting (patrones FACS conocidos)
 *  - Intensidad compuesta (múltiples blendshapes con pesos)
 *  - Thresholds adaptativos a baseline de calibración
 */

import { AU_MAP, computeAUs } from './gestureInsights.js';

const EMA_ALPHA = 0.4; // suavizado temporal (0 = sin memoria, 1 = inercia total)

// Co-occurrence patterns del FACS: si AU_X está activa, boostea AU_Y
const CO_OCCURRENCE_BOOST = Object.freeze({
  // Duchenne smile: AU6 + AU12
  AU6: { AU12: 0.3 },
  AU12: { AU6: 0.3 },
  // Surprise: AU1+2 + AU5 + AU26
  AU1: { AU2: 0.2, AU5: 0.15 },
  AU2: { AU1: 0.2, AU5: 0.15 },
  AU5: { AU1: 0.1, AU2: 0.1, AU26: 0.2 },
  AU26: { AU5: 0.2 },
  // Pain/disgust: AU4 + AU7 + AU9
  AU4: { AU7: 0.25, AU9: 0.15 },
  AU7: { AU4: 0.25 },
  AU9: { AU4: 0.15, AU7: 0.15 },
  // Fear: AU1+2+4+5+20+26
  AU20: { AU1: 0.15, AU2: 0.15, AU5: 0.2 },
  // Contempt: AU12 unilateral + AU14
  AU14: { AU12: 0.2 },
});

// Pesos compuestos para blendshapes que alimentan múltiples AUs
const BLENDSHAPE_WEIGHTS = Object.freeze({
  // browDown → AU4 principalmente
  browDownLeft: { AU4: 1.0 },
  browDownRight: { AU4: 1.0 },
  // eyeWide → AU5
  eyeWideLeft: { AU5: 1.0 },
  eyeWideRight: { AU5: 1.0 },
  // cheekSquint → AU6
  cheekSquintLeft: { AU6: 1.0 },
  cheekSquintRight: { AU6: 1.0 },
  // eyeSquint → AU7
  eyeSquintLeft: { AU7: 1.0 },
  eyeSquintRight: { AU7: 1.0 },
  // mouthSmile → AU12
  mouthSmileLeft: { AU12: 1.0 },
  mouthSmileRight: { AU12: 1.0 },
  // mouthDimple → AU14
  mouthDimpleLeft: { AU14: 1.0 },
  mouthDimpleRight: { AU14: 1.0 },
  // mouthFrown → AU15
  mouthFrownLeft: { AU15: 1.0 },
  mouthFrownRight: { AU15: 1.0 },
  // mouthFunnel + mouthPucker → AU18
  mouthFunnel: { AU18: 1.0 },
  mouthPucker: { AU18: 1.0 },
  // mouthStretch → AU20
  mouthStretchLeft: { AU20: 1.0 },
  mouthStretchRight: { AU20: 1.0 },
  // mouthPress → AU23 + AU24
  mouthPressLeft: { AU23: 0.7, AU24: 0.7 },
  mouthPressRight: { AU23: 0.7, AU24: 0.7 },
  // jawOpen → AU26
  jawOpen: { AU26: 1.0 },
  // eyeBlink → AU45
  eyeBlinkLeft: { AU45: 1.0 },
  eyeBlinkRight: { AU45: 1.0 },
});

// ─── State ───
let emaCache = {}; // AU code → last smoothed intensity
let baselineProfile = null; // { auMeans: { AU1: 0.1, ... }, facePresenceRatio, ... }

function round(value, digits = 4) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

// ─── Public API ───

/**
 * Setea un perfil baseline de calibración para thresholds adaptativos.
 */
export function setAUBaseline(calibrationProfile, auScores = {}) {
  if (!calibrationProfile?.eligible) {
    baselineProfile = null;
    return;
  }
  baselineProfile = {
    auMeans: Object.fromEntries(
      Object.entries(auScores).map(([code, au]) => [code, au.intensity ?? 0]),
    ),
    facePresenceRatio: calibrationProfile.signalQuality?.facePresenceRatio ?? 0,
  };
}

/**
 * Computa AUs mejorados con EMA, co-occurrence boosting y thresholds adaptativos.
 *
 * @param {Array} faceSamples — muestras recientes con blendshapes
 * @returns {Object} AUs mejorados { AU1: { intensity, label, region, boosted, delta }, ... }
 */
export function computeEnhancedAUs(faceSamples = []) {
  const baseAUs = computeAUs(faceSamples);

  // 1. EMA smoothing
  for (const [code, au] of Object.entries(baseAUs)) {
    const prev = emaCache[code] ?? au.intensity;
    const smoothed = prev * EMA_ALPHA + au.intensity * (1 - EMA_ALPHA);
    emaCache[code] = smoothed;
    au.intensity = round(smoothed);
  }

  // 2. Co-occurrence boosting
  for (const [code, au] of Object.entries(baseAUs)) {
    const boosts = CO_OCCURRENCE_BOOST[code];
    if (!boosts || au.intensity < 0.05) continue;
    for (const [targetCode, boostFactor] of Object.entries(boosts)) {
      if (baseAUs[targetCode]) {
        const boost = au.intensity * boostFactor;
        baseAUs[targetCode].intensity = round(clamp(baseAUs[targetCode].intensity + boost));
        baseAUs[targetCode].boosted = true;
      }
    }
  }

  // 3. Adaptive thresholds vs baseline
  for (const [code, au] of Object.entries(baseAUs)) {
    if (baselineProfile?.auMeans?.[code] !== undefined) {
      const baseline = baselineProfile.auMeans[code];
      au.delta = round(au.intensity - baseline);
      // Reduce intensity by baseline (only show what's above resting)
      au.intensity = round(clamp(au.intensity - baseline * 0.5));
    } else {
      au.delta = 0;
    }
  }

  return baseAUs;
}

/**
 * Calcula intensidad compuesta para AUs que se alimentan de múltiples blendshapes.
 * Usa los pesos de BLENDSHAPE_WEIGHTS para ponderar cada blendshape hacia su AU.
 */
export function computeCompositeAUIntensity(blendshapes = {}, auCode) {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [bsName, weights] of Object.entries(BLENDSHAPE_WEIGHTS)) {
    const w = weights[auCode];
    if (!w) continue;
    const value = Number(blendshapes[bsName] ?? 0);
    weightedSum += value * w;
    totalWeight += w;
  }

  return totalWeight > 0 ? round(weightedSum / totalWeight) : 0;
}

/**
 * Resetea el caché EMA (útil al iniciar nueva sesión).
 */
export function resetAUCache() {
  emaCache = {};
  baselineProfile = null;
}

/**
 * Label descriptivo para un AU basado en su nivel de intensidad.
 */
export function auIntensityLabel(intensity) {
  if (intensity >= 0.6) return 'Fuerte';
  if (intensity >= 0.3) return 'Moderada';
  if (intensity >= 0.1) return 'Leve';
  return 'Traza';
}