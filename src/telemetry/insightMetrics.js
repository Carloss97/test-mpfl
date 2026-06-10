/**
 * Gesture Insights v2 — Métricas recalibradas
 *
 * Cambios:
 *  - Basadas en AUs reales (no blendshapes crudos)
 *  - Fórmulas con interpretación fisiológica
 *  - Normalizadas 0-1 con sentido: 0 = ausente, 1 = máxima intensidad
 *  - Aburrimiento y fatiga ya NO están siempre altos en reposo
 */

import { computeAUs } from './gestureInsights.js';

function clamp(v, l=0, h=1) { return Math.min(h, Math.max(l, Number.isFinite(v) ? v : l)); }
function round(v, d=4) { if (!Number.isFinite(v)) return 0; const f = 10**d; return Math.round(v*f)/f; }

function auVal(aus, code) { return aus?.[code]?.intensity ?? 0; }

/**
 * Calcula métricas a partir de AUs (ya amplificadas por signalAmplifier).
 */
export function computeInsightsFromAUs(aus = {}, facePresenceRatio = 0) {
  // ─── Core AUs ───
  const AU1  = auVal(aus, 'AU1');
  const AU4  = auVal(aus, 'AU4');
  const AU5  = auVal(aus, 'AU5');
  const AU6  = auVal(aus, 'AU6');
  const AU7  = auVal(aus, 'AU7');
  const AU9  = auVal(aus, 'AU9');
  const AU12 = auVal(aus, 'AU12');
  const AU15 = auVal(aus, 'AU15');
  const AU23 = auVal(aus, 'AU23');
  const AU26 = auVal(aus, 'AU26');
  const AU27 = auVal(aus, 'AU27');
  const AU43 = auVal(aus, 'AU43');
  const AU45 = auVal(aus, 'AU45');

  // ─── Métricas ───

  // Tensión muscular facial: AU4 (cejas) + AU7 (ojos) + AU23 (labios)
  const tension = clamp((AU4 + AU7 + AU23) / 3);

  // Atención: inversa de fatiga ocular + presencia
  const attention = clamp((1 - AU45 * 1.5) * 0.6 + facePresenceRatio * 0.4);

  // Sorpresa: AU1 + AU5 + AU26
  const surprise = clamp((AU1 + AU5 + AU26) / 3);

  // Fatiga: AU45 (blink) + AU7 (squint) + AU43 (cierre parcial)
  const fatigue = clamp((AU45 * 0.5 + AU7 * 0.3 + AU43 * 0.2));

  // Estrés: AU4 + AU23 + AU9 + AU27
  const stress = clamp((AU4 * 0.25 + AU23 * 0.30 + AU9 * 0.25 + AU27 * 0.20));

  // Calma: inversa de estrés + tensión
  const calmness = clamp(1 - (tension * 0.6 + stress * 0.4));

  // Engagement: atención alta + presencia facial - fatiga
  const engagement = clamp(attention * 0.7 + facePresenceRatio * 0.3 - fatigue * 0.3);

  // Aburrimiento: baja atención + blink rate alto (pero solo si presencia es alta)
  const boredom = clamp(((1 - attention) * 0.5 + AU45 * 0.5) * facePresenceRatio);

  // Confusión: AU4 (ceño) + AU1 (inner brow) sin AU12 (sonrisa)
  const confusion = clamp((AU4 * 0.5 + AU1 * 0.5) * (1 - AU12));

  // Carga cognitiva: AU4 + AU7 + AU23 + variabilidad (aproximada como AU1+AU2)
  const cognitiveLoad = clamp((AU4 * 0.35 + AU7 * 0.35 + AU23 * 0.30));

  // Tolerancia a frustración: inversa de tensión
  const frustrationTolerance = clamp(1 - tension);

  // Valencia: positivo (AU6+AU12) vs negativo (AU4+AU15)
  const valence = clamp(((AU6 + AU12) - (AU4 + AU15) + 2) / 4);

  // Arousal: activación general
  const arousal = clamp((AU1 + AU5 + AU26) / 3);

  // Dominancia: ausencia de sumisión (AU4 bajo, AU26 bajo)
  const dominance = clamp(((1 - AU4) + (1 - AU15)) / 2);

  return {
    tension: round(tension),
    attention: round(attention),
    surprise: round(surprise),
    fatigue: round(fatigue),
    frustrationTolerance: round(frustrationTolerance),
    stress: round(stress),
    calmness: round(calmness),
    engagement: round(engagement),
    boredom: round(boredom),
    confusion: round(confusion),
    cognitiveLoad: round(cognitiveLoad),
    valence: round(valence),
    arousal: round(arousal),
    dominance: round(dominance),
  };
}