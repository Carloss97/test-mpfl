import { describe, expect, it } from 'vitest';
import { buildAssessmentFeatureVector } from './assessmentFeatureVector.js';

const correlation = {
  type: 'task_signal_correlation_v1',
  aggregate: {
    trialCount: 4,
    completedTrialCount: 4,
    accuracy: 0.75,
    meanReactionTimeMs: 420,
    meanTaskCoupledDeltas: {
      browTension: 0.12,
      jawActivation: 0.08,
      ocularTension: 0.16,
      mouthPressure: 0.02,
    },
    meanPointerControl: {
      pathEfficiency: 0.82,
      deviationRmsPx: 9.5,
      maxAccelerationPxPerMs2: 0.05,
    },
    signalQuality: {
      facePresenceRatio: 0.91,
      meanConfidence: 0.88,
    },
    postErrorAdjustment: {
      sequenceCount: 1,
      meanReactionTimeShiftMs: 120,
      meanScoreShift: 1,
      meanFeatureDeltaShift: {
        browTension: 0.02,
        jawActivation: 0.01,
        ocularTension: 0.08,
        mouthPressure: 0,
      },
    },
    byTask: {
      response_inhibition: {
        trialCount: 2,
        completedTrialCount: 2,
        accuracy: 0.5,
        meanReactionTimeMs: 540,
        meanFeatureDeltas: {
          browTension: 0.1,
          jawActivation: 0.15,
          ocularTension: 0.22,
          mouthPressure: 0,
        },
      },
      color_interference: {
        trialCount: 2,
        completedTrialCount: 2,
        accuracy: 1,
        meanReactionTimeMs: 300,
        meanFeatureDeltas: {
          browTension: 0.14,
          jawActivation: 0.01,
          ocularTension: 0.1,
          mouthPressure: 0.04,
        },
      },
    },
  },
};

const edgeModelOutput = {
  schemaVersion: 'edge_local_model_output_v1',
  modelVersion: 'krumm-edge-rules-poc-0.2.0',
  confidence: { score: 0.72, level: 'medium' },
  caveats: ['PoC rule-based model; not psychometrically calibrated.'],
};

describe('buildAssessmentFeatureVector', () => {
  it('builds assessment_feature_vector_v1 with stable numeric featureArray and safe per-task summaries', () => {
    const vector = buildAssessmentFeatureVector({
      runId: 'local-run-003',
      generatedAt: '2026-05-28T17:00:00.000Z',
      correlation,
      edgeModelOutput,
      runtime: { delegate: 'GPU', workerStatus: 'ready' },
    });

    expect(vector).toMatchObject({
      type: 'assessment_feature_vector_v1',
      version: '0.1.0',
      runId: 'local-run-003',
      generatedAt: '2026-05-28T17:00:00.000Z',
      privacy: {
        rawVideoStored: false,
        rawFramesStored: false,
        rawPointerPathStored: false,
        facialLandmarksStored: false,
        payloadContainsAggregatesOnly: true,
      },
      aggregate: {
        trialCount: 4,
        completedTrialCount: 4,
        accuracy: 0.75,
        meanReactionTimeMs: 420,
        postErrorSequenceCount: 1,
        modelConfidence: 0.72,
      },
      perTask: {
        response_inhibition: {
          accuracy: 0.5,
          meanReactionTimeMs: 540,
          jawActivationDelta: 0.15,
          ocularTensionDelta: 0.22,
        },
      },
      qualityFlags: [],
      runtime: { delegate: 'GPU', workerStatus: 'ready' },
    });
    expect(vector.featureArray).toHaveLength(vector.featureOrder.length);
    expect(vector.featureArray.every(Number.isFinite)).toBe(true);
    expect(vector.featureOrder).toEqual([
      'aggregate.accuracy',
      'aggregate.meanReactionTimeMs',
      'aggregate.facePresenceRatio',
      'aggregate.meanConfidence',
      'aggregate.pathEfficiency',
      'aggregate.deviationRmsPx',
      'aggregate.browTensionDelta',
      'aggregate.jawActivationDelta',
      'aggregate.ocularTensionDelta',
      'aggregate.postErrorMeanReactionTimeShiftMs',
      'aggregate.postErrorMeanScoreShift',
      'task.responseInhibition.accuracy',
      'task.colorInterference.accuracy',
      'task.precisionTargeting.accuracy',
      'edge.modelConfidence',
    ]);
  });

  it('keeps the exported vector privacy-safe and adds quality flags for weak input', () => {
    const vector = buildAssessmentFeatureVector({
      correlation: {
        aggregate: {
          trialCount: 1,
          completedTrialCount: 0,
          accuracy: 0,
          signalQuality: { facePresenceRatio: 0.2, meanConfidence: 0.4 },
          byTask: {},
        },
      },
      edgeModelOutput: { confidence: { score: 0.1 }, caveats: [] },
    });

    expect(vector.qualityFlags).toEqual([
      'incomplete_task_coverage',
      'low_facial_coverage',
      'low_facial_confidence',
      'low_model_confidence',
    ]);
    expect(JSON.stringify(vector)).not.toContain('faceSamples');
    expect(JSON.stringify(vector)).not.toContain('pointerSamples');
    expect(JSON.stringify(vector)).not.toContain('normalizedLandmarks');
    expect(JSON.stringify(vector)).not.toContain('data:image');
  });
});
