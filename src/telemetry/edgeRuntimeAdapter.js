const DEFAULT_RUNTIME = Object.freeze({
  backend: 'onnxruntime-web',
  modelVersion: 'edge-local-unbound',
  tensorName: 'input',
});

const REQUIRED_SAFE_PRIVACY_FLAGS = [
  'rawVideoStored',
  'rawFramesStored',
  'rawPointerPathStored',
  'facialLandmarksStored',
];
const UNSAFE_RESULT_PATTERN = /(rawVideo|rawFrames|facialLandmarks|normalizedLandmarks|pointerSamples|data:image|auto_hire|auto_reject|hire_no_hire)/i;

function assertSafePrivacy(privacy = {}) {
  const unsafe = REQUIRED_SAFE_PRIVACY_FLAGS.filter((flag) => privacy[flag] !== false);
  if (unsafe.length) {
    throw new Error(`Cannot run edge inference with unsafe raw telemetry flags: ${unsafe.join(', ')}`);
  }
}

function sanitizeFeatureArray(values = []) {
  return values.map((value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      throw new Error('Edge runtime input requires a finite numeric featureArray.');
    }
    return numeric;
  });
}

function assertAdapterResultSafe(result) {
  const serialized = JSON.stringify(result ?? null);
  if (UNSAFE_RESULT_PATTERN.test(serialized)) {
    throw new Error('Rejected unsafe adapter result: raw telemetry or automated hire/no-hire label detected.');
  }
}

export function buildEdgeRuntimeInput({ featureVector, runtime = {} } = {}) {
  if (featureVector?.type !== 'assessment_feature_vector_v1') {
    throw new Error('Expected assessment_feature_vector_v1 input.');
  }
  assertSafePrivacy(featureVector.privacy);

  const featureOrder = [...(featureVector.featureOrder ?? [])];
  const featureArray = sanitizeFeatureArray(featureVector.featureArray ?? []);
  if (featureOrder.length !== featureArray.length) {
    throw new Error(`Feature order length (${featureOrder.length}) must match featureArray length (${featureArray.length}).`);
  }

  return {
    schemaVersion: 'edge_runtime_input_v1',
    backend: runtime.backend ?? DEFAULT_RUNTIME.backend,
    modelVersion: runtime.modelVersion ?? DEFAULT_RUNTIME.modelVersion,
    tensorName: runtime.tensorName ?? DEFAULT_RUNTIME.tensorName,
    dims: [1, featureArray.length],
    dataType: 'float32',
    featureOrder,
    featureArray,
    privacy: {
      rawVideoStored: false,
      rawFramesStored: false,
      rawPointerPathStored: false,
      facialLandmarksStored: false,
      payloadContainsAggregatesOnly: featureVector.privacy?.payloadContainsAggregatesOnly !== false,
    },
  };
}

export async function runEdgeInference({ featureVector, runtime = {}, adapter } = {}) {
  const runtimeInput = buildEdgeRuntimeInput({ featureVector, runtime });
  if (typeof adapter !== 'function') {
    return {
      schemaVersion: 'edge_runtime_output_v1',
      status: 'adapter_unavailable',
      backend: runtimeInput.backend,
      modelVersion: runtimeInput.modelVersion,
      governance: {
        humanReviewOnly: true,
        noAutomatedHiringDecision: true,
        observationalSignalsOnly: true,
      },
      result: null,
    };
  }

  const result = await adapter(runtimeInput);
  assertAdapterResultSafe(result);
  return {
    schemaVersion: 'edge_runtime_output_v1',
    status: 'ok',
    backend: runtimeInput.backend,
    modelVersion: runtimeInput.modelVersion,
    governance: {
      humanReviewOnly: true,
      noAutomatedHiringDecision: true,
      observationalSignalsOnly: true,
    },
    result,
  };
}
