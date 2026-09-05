const MODEL_VERSION = 'krumm-edge-rules-poc-0.2.0';
const FEATURE_ORDER = Object.freeze([
  'browTensionDelta',
  'jawActivationDelta',
  'ocularTensionDelta',
  'mouthPressureDelta',
  'pathEfficiency',
  'deviationRmsPx',
  'maxAccelerationPxPerMs2',
  'meanReactionTimeMs',
  'facePresenceRatio',
  'meanConfidence',
]);

function round(value, digits = 2) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function levelForScore(score) {
  if (score >= 75) return 'strong';
  if (score >= 40) return 'moderate';
  return 'low';
}

function confidenceLevel(score) {
  if (score >= 0.8) return 'high';
  if (score >= 0.55) return 'medium';
  return 'low';
}

export function generateEdgeModelOutput({
  correlation,
  calibrationProfile = null,
  generatedAt = new Date().toISOString(),
  runtime = {},
} = {}) {
  const aggregate = correlation?.aggregate ?? {};
  const deltas = aggregate.meanTaskCoupledDeltas ?? {};
  const pointer = aggregate.meanPointerControl ?? {};
  const quality = aggregate.signalQuality ?? {};
  const completedTrialCount = Number(aggregate.completedTrialCount ?? 0);
  const trialCount = Number(aggregate.trialCount ?? 0);
  const trialCoverage = trialCount > 0 ? clamp(completedTrialCount / trialCount) : 0;
  const facialCoverage = Number(quality.facePresenceRatio ?? 0);
  const facialConfidence = Number(quality.meanConfidence ?? 0);
  const calibrationEligible = calibrationProfile?.eligible !== false;

  const primaryFacialDelta = round((
    Number(deltas.browTension ?? 0)
    + Number(deltas.jawActivation ?? 0)
    + Number(deltas.ocularTension ?? 0)
  ) / 3, 4);
  const activationScore = Math.round(clamp(primaryFacialDelta / 0.5) * 100);
  const pathEfficiency = Number(pointer.pathEfficiency ?? 0);
  const deviationRmsPx = Number(pointer.deviationRmsPx ?? 0);
  const inputControlScore = Math.round(clamp((pathEfficiency * 100 - deviationRmsPx / 2) / 100) * 100);

  const baseConfidence = (facialCoverage + facialConfidence) / 2;
  const coveragePenalty = trialCoverage < 0.8 ? 0.12 : 0;
  const calibrationPenalty = calibrationEligible ? 0 : 0.2;
  const pocPenalty = 0.04;
  const confidenceScore = round(clamp(baseConfidence - coveragePenalty - calibrationPenalty - pocPenalty), 2);

  const caveats = [
    'PoC rule-based model; not psychometrically calibrated.',
    'Use only as a signal audit for human review, not as a ranking or hiring decision.',
  ];

  if (!calibrationEligible) {
    caveats.push('Calibration baseline was not eligible; interpret facial deltas cautiously.');
  }
  if (facialCoverage < 0.7) {
    caveats.push('Facial coverage below 70%; task correlation may be sparse.');
  }
  if (facialConfidence < 0.7) {
    caveats.push('Mean facial detection confidence below 70%; microgesture proxies may be noisy.');
  }
  if (trialCoverage < 0.8) {
    caveats.push('Incomplete task coverage; model confidence was reduced.');
  }

  return {
    schemaVersion: 'edge_local_model_output_v1',
    modelVersion: MODEL_VERSION,
    modelKind: 'explainable_rules_poc',
    generatedAt,
    runtime,
    governance: {
      humanReviewOnly: true,
      noAutomatedHiringDecision: true,
      observationalSignalsOnly: true,
    },
    featureOrder: [...FEATURE_ORDER],
    dimensions: {
      taskCoupledActivation: {
        score: activationScore,
        level: levelForScore(activationScore),
        evidence: `Mean calibrated facial proxy delta across completed task windows: ${primaryFacialDelta}.`,
      },
      inputControlStability: {
        score: inputControlScore,
        level: levelForScore(inputControlScore),
        evidence: `Path efficiency ${round(pathEfficiency, 4)} with RMS deviation ${round(deviationRmsPx, 2)}px across completed trials.`,
      },
    },
    confidence: {
      score: confidenceScore,
      level: confidenceLevel(confidenceScore),
      factors: {
        trialCoverage: round(trialCoverage, 2),
        facialCoverage: round(facialCoverage, 2),
        facialConfidence: round(facialConfidence, 2),
        calibrationEligible,
      },
    },
    caveats,
  };
}
