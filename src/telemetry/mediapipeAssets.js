export const MEDIAPIPE_ASSETS = Object.freeze({
  wasmBaseUrl: '/mediapipe/wasm',
  modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task',
});

/**
 * Construye opciones para FaceLandmarker con soporte GPU auto-detect.
 *
 * @param {string} delegate - 'CPU', 'GPU', o 'AUTO'
 * @param {Object} overrides - Opciones adicionales
 * @returns {Object} Config para FaceLandmarker.createFromOptions
 */
export function getFaceLandmarkerOptions(delegate = 'CPU', overrides = {}) {
  return {
    baseOptions: {
      modelAssetPath: MEDIAPIPE_ASSETS.modelAssetPath,
      delegate: delegate === 'AUTO' ? 'GPU' : delegate,
    },
    runningMode: 'VIDEO',
    numFaces: 1,
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: false,
    ...overrides,
  };
}

/**
 * Intenta inicializar con GPU, con fallback automático a CPU.
 * Diseñado para ser llamado desde el worker.
 *
 * @param {Function} createFn - función que recibe delegate y retorna el landmarker
 * @returns {Promise<{landmarker, delegateUsed: string}>}
 */
export async function initWithFallback(createFn) {
  // Intentar GPU primero
  try {
    const landmarker = await createFn('GPU');
    return { landmarker, delegateUsed: 'GPU' };
  } catch (gpuError) {
    console.warn('[MediaPipe] GPU delegate failed, falling back to CPU:', gpuError?.message ?? gpuError);
  }

  // Fallback a CPU
  try {
    const landmarker = await createFn('CPU');
    return { landmarker, delegateUsed: 'CPU' };
  } catch (cpuError) {
    throw new Error(`MediaPipe Face Landmarker initialization failed: ${cpuError?.message ?? cpuError}`);
  }
}