/**
 * Emotion Classifier v1 — Naive Bayes por emoción
 *
 * Reemplaza: basicEmotions.js (v4)
 *
 * Usa likelihood ratios empíricos del FACS para calcular
 * P(emoción | AUs) usando Naive Bayes.
 *
 * 8 clases: happiness, sadness, surprise, fear, anger, disgust, contempt, neutral
 *
 * Referencias:
 *  - Ekman & Friesen (1978). FACS Manual.
 *  - Cohn et al. (2007). Observer-based measurement of facial action.
 */

function clamp(v, l = 0, h = 1) {
  return Math.min(h, Math.max(l, Number.isFinite(v) ? v : l));
}

function round(v, d = 4) {
  if (!Number.isFinite(v)) return 0;
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

// ─── Likelihood ratios: P(AU | emotion) / P(AU | neutral) ───
// Values > 1.0: AU increases probability of emotion
// Values < 1.0: AU decreases probability of emotion

const EMOTION_LIKELIHOODS = {
  happiness: {
    AU6: 6.0, AU12: 6.0, AU7: 0.3, AU4: 0.2, AU15: 0.2,
    AU1: 0.5, AU2: 0.5, AU26: 0.5,
  },
  sadness: {
    AU1: 3.0, AU4: 2.5, AU15: 4.5, AU17: 2.0,
    AU6: 0.2, AU12: 0.2, AU5: 0.5,
  },
  surprise: {
    AU1: 3.5, AU2: 3.5, AU5: 4.0, AU26: 3.5,
    AU4: 0.3, AU7: 0.3, AU12: 0.5,
  },
  fear: {
    AU1: 2.0, AU2: 2.0, AU4: 1.5, AU5: 2.5, AU7: 1.8,
    AU20: 3.0, AU26: 2.0, AU12: 0.3, AU6: 0.3,
  },
  anger: {
    AU4: 3.0, AU5: 2.0, AU7: 3.0, AU23: 3.5,
    AU6: 0.2, AU12: 0.2, AU26: 0.5,
  },
  disgust: {
    AU9: 7.0, AU15: 3.0, AU17: 3.0,
    AU6: 0.3, AU12: 0.3, AU26: 0.5,
  },
  contempt: {
    AU_L12: 2.0, AU_R12: 0.5, AU_L14: 2.0, AU_R14: 0.5,
    AU12: 0.8, AU6: 0.5,
  },
};

/**
 * Calcula probabilidad Naive Bayes para todas las emociones.
 *
 * @param {Object} aus — AUs YA PROCESADAS (intensidad 0-1, sin double boost)
 * @returns {{ dominant: string, dominantScore: number, probabilities: Object }}
 */
export function classifyEmotions(aus = {}) {
  const logProbs = {};
  const emotionNames = Object.keys(EMOTION_LIKELIHOODS);

  // Neutral is not “whatever mass is left after a softmax over emotions”.
  // It is the correct dominant state when AU evidence is weak or absent.
  // Allocate only an evidence-gated portion of probability mass to non-neutral
  // emotions, then reserve the rest for neutral so probabilities sum to 1.
  const evidenceMass = Object.values(aus).reduce((sum, au) => {
    const intensity = clamp(au?.intensity ?? 0);
    return sum + (intensity >= 0.01 ? intensity : 0);
  }, 0);
  const nonNeutralMass = clamp((evidenceMass - 0.03) / 1.25, 0, 0.92);

  if (nonNeutralMass <= 0) {
    return {
      probabilities: {
        happiness: 0, sadness: 0, surprise: 0, fear: 0,
        anger: 0, disgust: 0, contempt: 0, neutral: 1,
      },
      dominant: 'neutral',
      dominantScore: 1,
      confidence: 0.95,
    };
  }

  // Prior: uniform across non-neutral candidate emotions.
  const prior = 1 / emotionNames.length;

  for (const emotion of emotionNames) {
    const L = EMOTION_LIKELIHOODS[emotion];
    let logProb = Math.log(prior);

    for (const [code, likelihood] of Object.entries(L)) {
      const intensity = clamp(aus[code]?.intensity ?? 0);
      if (intensity < 0.01) continue;
      // Weighted log-likelihood.
      logProb += Math.log(Math.max(0.1, likelihood)) * intensity;
    }

    logProbs[emotion] = logProb;
  }

  // Convert non-neutral log-probs to normalized weights via softmax.
  const maxLog = Math.max(...Object.values(logProbs));
  let sumExp = 0;
  const weights = {};

  for (const [emotion, logP] of Object.entries(logProbs)) {
    const expVal = Math.exp(logP - maxLog);
    weights[emotion] = expVal;
    sumExp += expVal;
  }

  const probs = {};
  let nonNeutralRounded = 0;
  for (const emotion of emotionNames) {
    const p = round((weights[emotion] / sumExp) * nonNeutralMass);
    probs[emotion] = p;
    nonNeutralRounded += p;
  }
  probs.neutral = round(clamp(1 - nonNeutralRounded));

  let dominant = 'neutral';
  let dominantScore = probs.neutral;
  for (const [emotion, prob] of Object.entries(probs)) {
    if (prob > dominantScore) {
      dominantScore = prob;
      dominant = emotion;
    }
  }

  const sorted = Object.values(probs).sort((a, b) => b - a);
  const margin = (sorted[0] ?? 0) - (sorted[1] ?? 0);
  const confidence = dominant === 'neutral'
    ? clamp(0.55 + dominantScore * 0.4)
    : clamp(dominantScore * 0.75 + margin * 0.25);

  return {
    probabilities: probs,
    dominant,
    dominantScore: round(dominantScore),
    confidence: round(confidence),
  };
}