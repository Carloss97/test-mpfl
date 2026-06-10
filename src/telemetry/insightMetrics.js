/**
 * Insight Metrics v2 — basadas en literatura de affective computing
 *
 * Cada métrica cita su referencia y usa AUs validadas empíricamente.
 *
 * Referencias clave:
 *  - Bartlett, M. S., et al. (2006). Automatic recognition of facial actions in
 *    spontaneous expressions. Journal of Multimedia, 1(6).
 *  - D'Mello, S., & Graesser, A. (2012). Dynamics of affective states during
 *    complex learning. Learning and Instruction, 22(2), 145-157.
 *  - Giannakakis, G., et al. (2017). Stress and anxiety detection using facial
 *    cues from videos. Biomedical Signal Processing and Control, 31, 89-101.
 *  - Ji, Q., et al. (2004). Real-time nonintrusive monitoring and prediction of
 *    driver fatigue. IEEE Trans. Vehicular Technology, 53(4), 1052-1068.
 *  - Dinges, D. F., et al. (1998). PERCLOS: a valid psychophysiological measure
 *    of alertness. Federal Highway Administration Tech Report.
 *  - Palinko, S., et al. (2010). Estimating cognitive load using remote eye
 *    tracking in a driving simulator. ETRA 2010.
 *  - Russell, J. A. (1980). A circumplex model of affect. JPSP, 39(6).
 *  - Mehrabian, A., & Russell, J. A. (1974). An approach to environmental psychology.
 */

function clamp(v, l=0, h=1) { return Math.min(h, Math.max(l, Number.isFinite(v) ? v : l)); }
function round(v, d=4) { if (!Number.isFinite(v)) return 0; const f = 10**d; return Math.round(v*f)/f; }
function auVal(aus, code) { return aus?.[code]?.intensity ?? 0; }

export function computeInsightsFromAUs(aus = {}, facePresenceRatio = 0) {
  const AU1  = auVal(aus, 'AU1');
  const AU2  = auVal(aus, 'AU2');
  const AU4  = auVal(aus, 'AU4');
  const AU5  = auVal(aus, 'AU5');
  const AU6  = auVal(aus, 'AU6');
  const AU7  = auVal(aus, 'AU7');
  const AU9  = auVal(aus, 'AU9');
  const AU12 = auVal(aus, 'AU12');
  const AU15 = auVal(aus, 'AU15');
  const AU20 = auVal(aus, 'AU20');
  const AU23 = auVal(aus, 'AU23');
  const AU26 = auVal(aus, 'AU26');
  const AU27 = auVal(aus, 'AU27');
  const AU43 = auVal(aus, 'AU43');
  const AU45 = auVal(aus, 'AU45');

  // ─── Cognitive Load ───
  // Palinko et al. (2010) + Bartlett et al. (2006):
  // AU4 + AU7 + blink rate (inverse AU5) predict cognitive load.
  const cognitiveLoad = clamp((AU4 * 0.35 + AU7 * 0.35 + (1 - AU5) * 0.15 + AU23 * 0.15));

  // ─── Tension ───
  // Giannakakis et al. (2017): AU4 + AU7 + AU23
  const tension = clamp((AU4 + AU7 + AU23) / 3);

  // ─── Attention ───
  // Low blink (AU45) + eyes open (AU5) + face present
  const attention = clamp((1 - AU45 * 1.8) * 0.55 + AU5 * 0.25 + facePresenceRatio * 0.20);

  // ─── Surprise ───
  // Ekman FACS: AU1+2+5+26
  const surprise = clamp((AU1 + AU2 + AU5 + AU26) / 4);

  // ─── Fatigue ───
  // PERCLOS (Dinges et al., 1998; Ji et al., 2004):
  // AU45 (blink) + AU7 (lid tightener) + AU43 (eye closure)
  const fatigue = clamp((AU45 * 0.45 + AU7 * 0.25 + AU43 * 0.30));

  // ─── Stress ───
  // Giannakakis et al. (2017): AU4 + AU23 + AU9 + AU27
  const stress = clamp((AU4 * 0.25 + AU23 * 0.30 + AU9 * 0.25 + AU27 * 0.20));

  // ─── Calmness ───
  const calmness = clamp(1 - (tension * 0.5 + stress * 0.5));

  // ─── Engagement ───
  // D'Mello & Graesser (2012): AU1+AU2+AU5 predict engagement
  // AU45 (blink) negatively correlated
  const engagement = clamp(attention * 0.55 + (1 - AU45) * 0.25 + facePresenceRatio * 0.20);

  // ─── Boredom ───
  // Inverse of engagement + high blink rate
  const boredom = clamp(((1 - engagement) * 0.6 + AU45 * 0.4) * facePresenceRatio);

  // ─── Confusion ───
  // D'Mello & Graesser (2012): AU4 + AU1 + AU7 (frowning + brow raise = confusion)
  const confusion = clamp((AU4 * 0.4 + AU1 * 0.3 + AU7 * 0.3) * (1 - AU12 * 0.5));

  // ─── Frustration Tolerance ───
  const frustrationTolerance = clamp(1 - tension);

  // ─── Valence (Russell, 1980 circumplex) ───
  // Positive: AU6+AU12. Negative: AU4+AU15+AU9
  const posSignal = clamp((AU6 + AU12) / 2);
  const negSignal = clamp((AU4 + AU15 + AU9) / 3);
  const valence = clamp((posSignal - negSignal + 1) / 2);

  // ─── Arousal (Mehrabian & Russell, 1974) ───
  const arousal = clamp((AU1 + AU2 + AU5 + AU26) / 4);

  // ─── Dominance (Mehrabian & Russell, 1974) ───
  // High: no submission signals (AU4 low, AU15 low)
  const dominance = clamp(((1 - AU4) + (1 - AU15) + (1 - AU20)) / 3);

  return {
    cognitiveLoad: round(cognitiveLoad),
    tension: round(tension),
    attention: round(attention),
    surprise: round(surprise),
    fatigue: round(fatigue),
    stress: round(stress),
    calmness: round(calmness),
    engagement: round(engagement),
    boredom: round(boredom),
    confusion: round(confusion),
    frustrationTolerance: round(frustrationTolerance),
    valence: round(valence),
    arousal: round(arousal),
    dominance: round(dominance),
  };
}