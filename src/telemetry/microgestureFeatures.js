export const MICROGESTURE_GROUPS = Object.freeze({
  browTension: ['browInnerUp', 'browDownLeft', 'browDownRight', 'browOuterUpLeft', 'browOuterUpRight'],
  jawActivation: ['jawOpen', 'jawForward', 'jawLeft', 'jawRight'],
  ocularTension: ['eyeSquintLeft', 'eyeSquintRight', 'eyeWideLeft', 'eyeWideRight', 'eyeBlinkLeft', 'eyeBlinkRight'],
  mouthPressure: ['mouthPressLeft', 'mouthPressRight', 'mouthFunnel', 'mouthPucker'],
});

const QUALITY_THRESHOLDS = Object.freeze({
  minFacePresenceRatio: 0.8,
  minMeanConfidence: 0.7,
  maxMultipleFaceRatio: 0.1,
});

function round(value, digits = 4) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function isInWindow(sample, from, to) {
  const timestamp = Number(sample?.timestamp);
  return Number.isFinite(timestamp) && timestamp >= from && timestamp <= to;
}

function groupScore(sample, names) {
  const values = names
    .map((name) => sample?.blendshapes?.[name])
    .filter((value) => Number.isFinite(Number(value)))
    .map(Number);

  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function summarizeScores(scores) {
  if (!scores.length) {
    return { avg: 0, max: 0, volatility: 0 };
  }

  const diffs = [];
  for (let index = 1; index < scores.length; index += 1) {
    diffs.push(Math.abs(scores[index] - scores[index - 1]));
  }

  return {
    avg: round(scores.reduce((sum, value) => sum + value, 0) / scores.length),
    max: round(Math.max(...scores)),
    volatility: diffs.length ? round(diffs.reduce((sum, value) => sum + value, 0) / diffs.length) : 0,
  };
}

function summarizeSignalQuality(samples) {
  if (!samples.length) {
    return {
      facePresenceRatio: 0,
      meanConfidence: 0,
      multipleFaceRatio: 0,
      flags: ['no_facial_samples'],
    };
  }

  const facePresenceRatio = samples.filter((sample) => sample.quality?.facePresent).length / samples.length;
  const meanConfidence = samples.reduce((sum, sample) => sum + Number(sample.quality?.confidence ?? 0), 0) / samples.length;
  const multipleFaceRatio = samples.filter((sample) => Number(sample.quality?.faceCount ?? 0) > 1).length / samples.length;
  const flags = [];

  if (facePresenceRatio < QUALITY_THRESHOLDS.minFacePresenceRatio) flags.push('insufficient_facial_coverage');
  if (meanConfidence < QUALITY_THRESHOLDS.minMeanConfidence) flags.push('low_detection_confidence');
  if (multipleFaceRatio > QUALITY_THRESHOLDS.maxMultipleFaceRatio) flags.push('multiple_faces_detected');

  return {
    facePresenceRatio: round(facePresenceRatio),
    meanConfidence: round(meanConfidence),
    multipleFaceRatio: round(multipleFaceRatio),
    flags,
  };
}

export function extractMicrogestureWindow(samples = [], { from = 0, to = 0, baseline = null } = {}) {
  const windowSamples = samples.filter((sample) => isInWindow(sample, from, to));
  const usableSamples = windowSamples.filter((sample) => sample.quality?.facePresent);
  const proxies = Object.fromEntries(
    Object.entries(MICROGESTURE_GROUPS).map(([groupName, blendshapeNames]) => [
      groupName,
      summarizeScores(usableSamples.map((sample) => groupScore(sample, blendshapeNames))),
    ]),
  );

  const result = {
    type: 'microgesture_window_v1',
    from,
    to,
    durationMs: Math.max(0, round(to - from)),
    sampleCount: windowSamples.length,
    usableSampleCount: usableSamples.length,
    signalQuality: summarizeSignalQuality(windowSamples),
    proxies,
  };

  if (baseline?.proxies) {
    result.calibrationDeltas = Object.fromEntries(
      Object.keys(MICROGESTURE_GROUPS).map((groupName) => [
        groupName,
        round((proxies[groupName]?.avg ?? 0) - (baseline.proxies[groupName]?.avg ?? 0)),
      ]),
    );
  }

  return result;
}

export function buildCalibrationProfile(samples = [], { from = 0, to = 0 } = {}) {
  const window = extractMicrogestureWindow(samples, { from, to });
  const caveats = [...window.signalQuality.flags];

  return {
    type: 'microgesture_calibration_v1',
    from: window.from,
    to: window.to,
    durationMs: window.durationMs,
    sampleCount: window.sampleCount,
    usableSampleCount: window.usableSampleCount,
    eligible: caveats.length === 0,
    caveats,
    signalQuality: window.signalQuality,
    proxies: window.proxies,
  };
}
