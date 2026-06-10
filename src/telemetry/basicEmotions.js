/**
 * Emociones Básicas v3 — Clasificador recalibrado
 *
 * Cambios vs v2:
 *  - Boost reducido 1.6x → 1.15x (menos agresivo)
 *  - Multiplicadores de emoción reducidos (1.35 → 1.10)
 *  - Neutral domina cuando la suma de emociones < 0.25
 *  - Threshold mínimo de intensidad para considerar una AU "presente": 0.06
 *  - Conflict resolution: la emoción debe superar a neutral por al menos 0.08
 */

function clamp(v, min = 0, max = 1) { return Math.min(max, Math.max(min, Number.isFinite(v) ? v : min)); }
function round(v, d = 4) { if (!Number.isFinite(v)) return 0; const f = 10 ** d; return Math.round(v * f) / f; }

// ─── Baseline ───
let auBaseline = {};

export function setEmotionBaseline(aus = {}) {
  auBaseline = {};
  for (const [code, au] of Object.entries(aus)) auBaseline[code] = au?.intensity ?? au ?? 0;
}
export function clearEmotionBaseline() { auBaseline = {}; }

function auVal(aus, code) {
  const raw = aus?.[code]?.intensity ?? 0;
  const base = auBaseline[code] ?? 0;
  const net = Math.max(0, raw - base * 0.7);
  return clamp(net * 1.15); // mild boost (was 1.6)
}

export function classifyBasicEmotions(auScores = {}) {
  const au1  = auVal(auScores, 'AU1');
  const au2  = auVal(auScores, 'AU2');
  const au4  = auVal(auScores, 'AU4');
  const au5  = auVal(auScores, 'AU5');
  const au6  = auVal(auScores, 'AU6');
  const au7  = auVal(auScores, 'AU7');
  const au9  = auVal(auScores, 'AU9');
  const au12 = auVal(auScores, 'AU12');
  const au15 = auVal(auScores, 'AU15');
  const au17 = auVal(auScores, 'AU17');
  const au20 = auVal(auScores, 'AU20');
  const au23 = auVal(auScores, 'AU23');
  const au26 = auVal(auScores, 'AU26');
  const l12  = auVal(auScores, 'AU_L12');
  const r12  = auVal(auScores, 'AU_R12');
  const l14  = auVal(auScores, 'AU_L14');
  const r14  = auVal(auScores, 'AU_R14');

  // Happiness: AU6 + AU12, strong only when both present
  const duchenne = (au6 > 0.05 && au12 > 0.05) ? clamp(1 - Math.abs(au6 - au12) * 2.5) : 0;
  const happiness = clamp((au6 * 0.5 + au12 * 0.5) * (0.6 + duchenne * 0.4));

  // Sadness: AU1 + AU4 + AU15, needs at least 2
  const sadActive = [au1, au4, au15].filter(v => v > 0.04).length;
  const sadness = clamp((au1 * 0.33 + au4 * 0.33 + au15 * 0.34) * (0.5 + sadActive * 0.17));

  // Surprise: AU1+2+5+26, needs 3+
  const surCount = [au1, au2, au5, au26].filter(v => v > 0.05).length;
  const surprise = clamp((au1 * 0.25 + au2 * 0.25 + au5 * 0.25 + au26 * 0.25) * (0.4 + surCount * 0.15));

  // Fear: needs 4+ AUs
  const fearAUs = [au1, au2, au4, au5, au7, au20, au26].filter(v => v > 0.04);
  const fear = clamp((au1 + au2 + au4 + au5 + au7 + au20 + au26) / 7 * (0.3 + fearAUs.length * 0.12));

  // Anger: AU4+5+7+23, needs 3+ to be credible
  const angerAUs = [au4, au5, au7, au23].filter(v => v > 0.05);
  const anger = clamp((au4 * 0.30 + au5 * 0.20 + au7 * 0.25 + au23 * 0.25) * (0.35 + angerAUs.length * 0.16));

  // Disgust: AU9+15+17, needs AU9 + one more
  const disgust = clamp((au9 * 0.45 + au15 * 0.3 + au17 * 0.25) * (au9 > 0.04 && (au15 > 0.04 || au17 > 0.04) ? 1.0 : 0.4));

  // Contempt: unilateral AU12 or AU14
  const contempt = clamp(Math.max(Math.abs(l12 - r12) * 1.2, Math.abs(l14 - r14) * 1.2));

  // Neutral: strong default
  const allSum = happiness + sadness + surprise + fear + anger + disgust + contempt;
  const neutral = clamp(1 - allSum);

  // Conflict resolution
  const scores = { happiness, sadness, surprise, fear, anger, disgust, contempt, neutral };
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  let dominant = sorted[0][0];
  let dominantScore = sorted[0][1];

  // Require dominant to beat neutral by margin
  if (dominant !== 'neutral' && dominantScore < neutral + 0.06) {
    dominant = 'neutral';
    dominantScore = neutral;
  }

  const margin = sorted[0][1] - (sorted[1]?.[1] ?? 0);
  const confidence = clamp(dominant === 'neutral' ? neutral : dominantScore * 0.85 + margin * 0.15);

  return {
    probabilities: Object.fromEntries(Object.entries(scores)),
    dominant,
    dominantScore: round(dominantScore),
    confidence: round(confidence),
  };
}