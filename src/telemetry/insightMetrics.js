/**
 * Insight Metrics v3 — métricas multimodales basadas en literatura
 *
 * Mantiene compatibilidad con la versión AU-only cuando no se entrega contexto
 * multimodal. Si hay gaze/postura/MoveNet, las métricas cognitivas usan esas
 * señales para evitar depender exclusivamente de AUs faciales.
 *
 * Referencias clave:
 *  - Bartlett et al. (2006). Automatic recognition of facial actions.
 *  - D'Mello & Graesser (2012). Dynamics of affective states during learning.
 *  - Giannakakis et al. (2017). Stress/anxiety detection using facial cues.
 *  - Dinges et al. (1998). PERCLOS.
 *  - Ji et al. (2004). Driver fatigue monitoring.
 *  - Palinko et al. (2010). Cognitive load via remote eye tracking.
 *  - Russell (1980). Circumplex model of affect.
 */

function clamp(v, l = 0, h = 1) { return Math.min(h, Math.max(l, Number.isFinite(v) ? v : l)); }
function round(v, d = 4) { if (!Number.isFinite(v)) return 0; const f = 10 ** d; return Math.round(v * f) / f; }
function auVal(aus, code) { return aus?.[code]?.intensity ?? 0; }

function normalizeContext(context = {}) {
  const gaze = context.gaze ?? null;
  const posture = context.posture ?? null;
  const upperBody = context.upperBody ?? context.moveNetPose ?? null;
  const task = context.task ?? null;

  const gazeAvailable = Boolean(gaze?.available ?? gaze?.confidence !== undefined);
  const gazeConfidence = clamp(gaze?.confidence ?? 0);
  const lookingAtScreen = Boolean(gaze?.lookingAtScreen);
  const gazeFocus = gazeAvailable ? (lookingAtScreen ? gazeConfidence : 0) : null;
  const gazeInstability = gazeAvailable ? clamp(1 - gazeConfidence + (lookingAtScreen ? 0 : 0.35)) : null;

  const postureAvailable = Boolean(posture?.available ?? posture?.postureScore !== undefined);
  const postureScore = postureAvailable ? clamp(posture?.postureScore ?? 0.5) : null;
  const headForward = postureAvailable ? clamp(posture?.headForward ?? 0) : null;
  const headTilt = postureAvailable ? clamp(posture?.headTilt ?? Math.abs(posture?.headTiltDeg ?? 0) / 30) : null;
  const posturePenalty = postureAvailable ? clamp((1 - postureScore) * 0.55 + headForward * 0.30 + headTilt * 0.15) : null;

  const upperAvailable = Boolean(upperBody?.available ?? upperBody?.confidence !== undefined);
  const shoulderSymmetry = upperAvailable ? clamp(upperBody?.shoulderSymmetry ?? upperBody?.symmetry ?? 0) : null;
  const upperConfidence = upperAvailable ? clamp(upperBody?.confidence ?? 0) : null;

  const taskAccuracy = task?.accuracy !== undefined ? clamp(task.accuracy) : null;
  const taskErrorRate = taskAccuracy !== null ? 1 - taskAccuracy : null;

  return {
    hasAny: gazeAvailable || postureAvailable || upperAvailable || taskAccuracy !== null,
    gazeAvailable,
    gazeFocus,
    gazeInstability,
    postureAvailable,
    postureScore,
    headForward,
    headTilt,
    posturePenalty,
    upperAvailable,
    shoulderSymmetry,
    upperConfidence,
    taskAccuracy,
    taskErrorRate,
  };
}

export function computeInsightsFromAUs(aus = {}, facePresenceRatio = 0, context = {}) {
  const AU1 = auVal(aus, 'AU1');
  const AU2 = auVal(aus, 'AU2');
  const AU4 = auVal(aus, 'AU4');
  const AU5 = auVal(aus, 'AU5');
  const AU6 = auVal(aus, 'AU6');
  const AU7 = auVal(aus, 'AU7');
  const AU9 = auVal(aus, 'AU9');
  const AU12 = auVal(aus, 'AU12');
  const AU15 = auVal(aus, 'AU15');
  const AU20 = auVal(aus, 'AU20');
  const AU23 = auVal(aus, 'AU23');
  const AU26 = auVal(aus, 'AU26');
  const AU27 = auVal(aus, 'AU27');
  const AU43 = auVal(aus, 'AU43');
  const AU45 = auVal(aus, 'AU45');

  const ctx = normalizeContext(context);

  // AU-only baselines retained for compatibility.
  const auCognitiveLoad = clamp(AU4 * 0.35 + AU7 * 0.35 + (1 - AU5) * 0.15 + AU23 * 0.15);
  const tension = clamp((AU4 + AU7 + AU23) / 3);
  const auAttention = clamp((1 - AU45 * 1.8) * 0.55 + AU5 * 0.25 + facePresenceRatio * 0.20);
  const surprise = clamp((AU1 + AU2 + AU5 + AU26) / 4);
  const auFatigue = clamp(AU45 * 0.45 + AU7 * 0.25 + AU43 * 0.30);
  const auStress = clamp(AU4 * 0.25 + AU23 * 0.30 + AU9 * 0.25 + AU27 * 0.20);
  const auEngagement = clamp(auAttention * 0.55 + (1 - AU45) * 0.25 + facePresenceRatio * 0.20);

  const attention = ctx.gazeAvailable
    ? clamp((ctx.gazeFocus ?? 0) * 0.45 + (1 - AU45) * 0.15 + AU5 * 0.10 + facePresenceRatio * 0.10 + (ctx.postureScore ?? 0.5) * 0.20)
    : auAttention;

  const fatigue = ctx.hasAny
    ? clamp(AU45 * 0.35 + AU43 * 0.20 + AU7 * 0.15 + (ctx.headForward ?? 0) * 0.18 + (ctx.gazeInstability ?? 0) * 0.12)
    : auFatigue;

  const stress = ctx.hasAny
    ? clamp(auStress * 0.65 + (ctx.posturePenalty ?? 0) * 0.18 + (ctx.gazeInstability ?? 0) * 0.10 + (ctx.taskErrorRate ?? 0) * 0.07)
    : auStress;

  const postureSupport = ctx.postureAvailable ? (ctx.postureScore ?? 0.5) : 0.5;
  const shoulderSupport = ctx.upperAvailable ? ((ctx.shoulderSymmetry ?? 0) * (ctx.upperConfidence ?? 0)) : 0.5;
  const engagement = ctx.hasAny
    ? clamp(attention * 0.30 + (ctx.gazeFocus ?? auAttention) * 0.35 + postureSupport * 0.15 + shoulderSupport * 0.10 + facePresenceRatio * 0.10)
    : auEngagement;

  const calmness = clamp(1 - (tension * 0.35 + stress * 0.40 + fatigue * 0.15 + (ctx.posturePenalty ?? 0) * 0.10));
  const boredom = clamp(((1 - engagement) * 0.55 + AU45 * 0.25 + (ctx.gazeAvailable ? (1 - (ctx.gazeFocus ?? 0)) * 0.20 : 0)) * facePresenceRatio);
  const confusion = clamp((AU4 * 0.4 + AU1 * 0.3 + AU7 * 0.3) * (1 - AU12 * 0.5));
  const frustrationTolerance = clamp(1 - tension);

  const posSignal = clamp((AU6 + AU12) / 2);
  const negSignal = clamp((AU4 + AU15 + AU9) / 3);
  const valence = clamp((posSignal - negSignal + 1) / 2);
  const arousal = clamp((AU1 + AU2 + AU5 + AU26) / 4);
  const dominance = clamp(((1 - AU4) + (1 - AU15) + (1 - AU20)) / 3);
  const cognitiveLoad = ctx.hasAny
    ? clamp(auCognitiveLoad * 0.70 + (ctx.gazeInstability ?? 0) * 0.12 + (ctx.posturePenalty ?? 0) * 0.10 + (ctx.taskErrorRate ?? 0) * 0.08)
    : auCognitiveLoad;

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
    provenance: ctx.hasAny ? 'multimodal_v3' : 'au_only_v2',
  };
}
