/**
 * Temporal emotion hysteresis for live UI/Edge AI outputs.
 *
 * `classifyEmotions()` remains a pure stateless classifier. This wrapper adds
 * short-lived state at the application boundary so weak one-frame candidates do
 * not flicker the dominant label.
 */

function clamp(v, l = 0, h = 1) {
  return Math.min(h, Math.max(l, Number.isFinite(v) ? v : l));
}

function round(v, d = 4) {
  if (!Number.isFinite(v)) return 0;
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

export function createEmotionTemporalSmoother({
  switchMargin = 0.10,
  minStableFrames = 3,
  neutralStableFrames = 1,
} = {}) {
  let current = null;
  let candidate = null;
  let candidateFrames = 0;
  let lastTimestamp = null;
  let lastOutput = null;

  function hold(result, reason) {
    const probabilities = result.probabilities ?? {};
    const dominantScore = round(probabilities[current] ?? 0);
    const output = {
      ...result,
      dominant: current,
      dominantScore,
      confidence: round(clamp((result.confidence ?? 0.5) * 0.85)),
      temporalSmoothing: {
        active: true,
        held: true,
        reason,
        candidate: result.dominant,
        candidateFrames,
      },
    };
    lastOutput = output;
    return output;
  }

  return {
    reset() {
      current = null;
      candidate = null;
      candidateFrames = 0;
      lastTimestamp = null;
      lastOutput = null;
    },

    smooth(result, { timestamp = null } = {}) {
      if (!result?.dominant) return result;
      if (timestamp !== null && timestamp === lastTimestamp && lastOutput) return lastOutput;
      lastTimestamp = timestamp;

      if (!current) {
        current = result.dominant;
        candidate = null;
        candidateFrames = 0;
        lastOutput = { ...result, temporalSmoothing: { active: true, held: false, initialized: true } };
        return lastOutput;
      }

      if (result.dominant === current) {
        candidate = null;
        candidateFrames = 0;
        lastOutput = { ...result, temporalSmoothing: { active: true, held: false } };
        return lastOutput;
      }

      const probabilities = result.probabilities ?? {};
      const currentScore = probabilities[current] ?? 0;
      const candidateScore = result.dominantScore ?? probabilities[result.dominant] ?? 0;
      const requiredFrames = result.dominant === 'neutral' ? neutralStableFrames : minStableFrames;
      const margin = result.dominant === 'neutral' ? Math.min(0.03, switchMargin) : switchMargin;

      if (candidateScore < currentScore + margin) {
        candidate = result.dominant;
        candidateFrames = 0;
        return hold(result, 'insufficient_margin');
      }

      if (candidate !== result.dominant) {
        candidate = result.dominant;
        candidateFrames = 1;
      } else {
        candidateFrames += 1;
      }

      if (candidateFrames >= requiredFrames) {
        current = result.dominant;
        candidate = null;
        candidateFrames = 0;
        lastOutput = { ...result, temporalSmoothing: { active: true, held: false, switched: true } };
        return lastOutput;
      }

      return hold(result, 'waiting_for_stability');
    },
  };
}
