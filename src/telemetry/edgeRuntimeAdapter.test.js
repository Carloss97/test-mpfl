import { describe, expect, it } from 'vitest';
import { buildEdgeRuntimeInput, runEdgeInference } from './edgeRuntimeAdapter.js';

const featureVector = {
  type: 'assessment_feature_vector_v1',
  version: '0.1.0',
  featureOrder: ['aggregate.accuracy', 'edge.modelConfidence'],
  featureArray: [0.75, 0.72],
  privacy: {
    rawVideoStored: false,
    rawFramesStored: false,
    rawPointerPathStored: false,
    facialLandmarksStored: false,
    payloadContainsAggregatesOnly: true,
  },
};

describe('buildEdgeRuntimeInput', () => {
  it('converts assessment_feature_vector_v1 into a stable ONNX/TFJS-ready tensor contract', () => {
    const runtimeInput = buildEdgeRuntimeInput({
      featureVector,
      runtime: { backend: 'onnxruntime-web', modelVersion: 'edge-calibrated-0.1.0' },
    });

    expect(runtimeInput).toEqual({
      schemaVersion: 'edge_runtime_input_v1',
      backend: 'onnxruntime-web',
      modelVersion: 'edge-calibrated-0.1.0',
      tensorName: 'input',
      dims: [1, 2],
      dataType: 'float32',
      featureOrder: ['aggregate.accuracy', 'edge.modelConfidence'],
      featureArray: [0.75, 0.72],
      privacy: {
        rawVideoStored: false,
        rawFramesStored: false,
        rawPointerPathStored: false,
        facialLandmarksStored: false,
        payloadContainsAggregatesOnly: true,
      },
    });
  });

  it('rejects unsafe or malformed feature vectors before runtime inference', () => {
    expect(() => buildEdgeRuntimeInput({
      featureVector: {
        type: 'assessment_feature_vector_v1',
        featureOrder: ['a'],
        featureArray: [Number.NaN],
        privacy: { rawVideoStored: false, rawFramesStored: false, rawPointerPathStored: false, facialLandmarksStored: false },
      },
    })).toThrow(/finite numeric/);

    expect(() => buildEdgeRuntimeInput({
      featureVector: {
        type: 'assessment_feature_vector_v1',
        featureOrder: ['a'],
        featureArray: [1],
        privacy: { rawVideoStored: true, rawFramesStored: false, rawPointerPathStored: false, facialLandmarksStored: false },
      },
    })).toThrow(/unsafe raw telemetry/);
  });
});

describe('runEdgeInference', () => {
  it('supports injected runtime adapters while preserving model metadata', async () => {
    const output = await runEdgeInference({
      featureVector,
      runtime: { backend: 'tfjs', modelVersion: 'tfjs-edge-0.1.0' },
      adapter: async (runtimeInput) => ({
        label: 'needs_human_review',
        scores: { taskStrain: 0.32, controlStability: 0.81 },
        receivedDims: runtimeInput.dims,
      }),
    });

    expect(output).toEqual({
      schemaVersion: 'edge_runtime_output_v1',
      status: 'ok',
      backend: 'tfjs',
      modelVersion: 'tfjs-edge-0.1.0',
      governance: {
        humanReviewOnly: true,
        noAutomatedHiringDecision: true,
        observationalSignalsOnly: true,
      },
      result: {
        label: 'needs_human_review',
        scores: { taskStrain: 0.32, controlStability: 0.81 },
        receivedDims: [1, 2],
      },
    });
  });

  it('rejects adapter results that try to return raw telemetry or automated hire/no-hire labels', async () => {
    await expect(runEdgeInference({
      featureVector,
      adapter: async () => ({ label: 'auto_hire', rawVideo: 'data:image/png;base64,abc' }),
    })).rejects.toThrow(/unsafe adapter result/);
  });
});
