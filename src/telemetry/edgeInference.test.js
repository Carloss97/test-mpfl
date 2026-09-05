import { describe, expect, it } from 'vitest';
import { generateEdgeModelOutput } from './edgeInference.js';

const baseCorrelation = {
  type: 'task_signal_correlation_v1',
  aggregate: {
    trialCount: 2,
    completedTrialCount: 2,
    meanReactionTimeMs: 340,
    meanTaskCoupledDeltas: {
      browTension: 0.3,
      jawActivation: 0.4,
      ocularTension: 0.2,
      mouthPressure: 0.1,
    },
    meanPointerControl: {
      pathEfficiency: 0.9,
      deviationRmsPx: 6,
      maxAccelerationPxPerMs2: 0.03,
    },
    signalQuality: {
      facePresenceRatio: 0.92,
      meanConfidence: 0.88,
    },
  },
};

describe('generateEdgeModelOutput', () => {
  it('produces explainable, human-review-only local model output from task-correlated features', () => {
    const output = generateEdgeModelOutput({
      correlation: baseCorrelation,
      calibrationProfile: { eligible: true, caveats: [] },
      generatedAt: '2026-05-28T15:45:00.000Z',
      runtime: { delegate: 'GPU', fpsTarget: 30 },
    });

    expect(output).toEqual({
      schemaVersion: 'edge_local_model_output_v1',
      modelVersion: 'krumm-edge-rules-poc-0.2.0',
      modelKind: 'explainable_rules_poc',
      generatedAt: '2026-05-28T15:45:00.000Z',
      runtime: { delegate: 'GPU', fpsTarget: 30 },
      governance: {
        humanReviewOnly: true,
        noAutomatedHiringDecision: true,
        observationalSignalsOnly: true,
      },
      featureOrder: [
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
      ],
      dimensions: {
        taskCoupledActivation: {
          score: 60,
          level: 'moderate',
          evidence: 'Mean calibrated facial proxy delta across completed task windows: 0.3.',
        },
        inputControlStability: {
          score: 87,
          level: 'strong',
          evidence: 'Path efficiency 0.9 with RMS deviation 6px across completed trials.',
        },
      },
      confidence: {
        score: 0.86,
        level: 'high',
        factors: {
          trialCoverage: 1,
          facialCoverage: 0.92,
          facialConfidence: 0.88,
          calibrationEligible: true,
        },
      },
      caveats: [
        'PoC rule-based model; not psychometrically calibrated.',
        'Use only as a signal audit for human review, not as a ranking or hiring decision.',
      ],
    });
  });

  it('degrades confidence and adds caveats when calibration or facial coverage is weak', () => {
    const output = generateEdgeModelOutput({
      correlation: {
        ...baseCorrelation,
        aggregate: {
          ...baseCorrelation.aggregate,
          signalQuality: { facePresenceRatio: 0.45, meanConfidence: 0.52 },
        },
      },
      calibrationProfile: { eligible: false, caveats: ['insufficient_facial_coverage'] },
    });

    expect(output.confidence.level).toBe('low');
    expect(output.caveats).toContain('Calibration baseline was not eligible; interpret facial deltas cautiously.');
    expect(output.caveats).toContain('Facial coverage below 70%; task correlation may be sparse.');
  });
});
