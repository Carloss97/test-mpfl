import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { MEDIAPIPE_ASSETS, getFaceLandmarkerOptions } from './mediapipeAssets.js';

let landmarker = null;
let currentDelegate = 'CPU';

async function ensureLandmarker(preferredDelegate) {
  if (landmarker && preferredDelegate === currentDelegate) return currentDelegate;

  const delegates = preferredDelegate === 'GPU' ? ['GPU', 'CPU'] : ['CPU'];
  for (const del of delegates) {
    try {
      const wasm = await FilesetResolver.forVisionTasks(MEDIAPIPE_ASSETS.wasmBaseUrl, 'latest');
      const opts = getFaceLandmarkerOptions(del);
      opts.baseOptions.modelAssetPath = MEDIAPIPE_ASSETS.modelAssetPath;
      landmarker = await FaceLandmarker.createFromOptions(wasm, opts);
      currentDelegate = del;
      return del;
    } catch (err) {
      console.warn('[FaceLM] Delegate failed, trying fallback:', del, err?.message);
    }
  }
  return null;
}

function scoreByName(result) {
  const map = {};
  const cats = result?.faceBlendshapes?.[0]?.categories ?? result?.faceBlendshapes ?? [];
  if (!cats.length) {
    for (const face of (result?.faceBlendshapes ?? [])) {
      for (const cat of (face?.categories ?? [])) map[cat.categoryName] = cat.score;
    }
  } else {
    for (const cat of cats) map[cat.categoryName] = cat.score;
  }
  return Object.keys(map).length ? map : null;
}

function extractLandmarks(result) {
  const lm = result?.faceLandmarks?.[0];
  if (!lm) return null;
  const arr = new Float32Array(lm.length * 3);
  for (let i = 0; i < lm.length; i++) {
    arr[i * 3] = lm[i].x;
    arr[i * 3 + 1] = lm[i].y;
    arr[i * 3 + 2] = lm[i].z;
  }
  return arr;
}

self.onmessage = async (event) => {
  const { type, payload } = event.data ?? {};

  if (type === 'init') {
    try {
      const del = await ensureLandmarker(payload?.preferredDelegate ?? 'GPU');
      postMessage({ type: 'ready', delegate: del, message: `FaceLandmarker ready (${del})` });
    } catch (err) {
      postMessage({ type: 'error', message: err?.message ?? String(err) });
    }
    return;
  }

  if (type === 'frame') {
    try {
      const { bitmap, timestamp } = payload;
      if (!landmarker) { bitmap?.close?.(); return; }

      const result = landmarker.detectForVideo(bitmap, timestamp);
      bitmap?.close?.();

      const faceCount = result?.faceLandmarks?.length ?? 0;

      if (faceCount > 0) {
        const blendshapes = scoreByName(result);
        const landmarks = extractLandmarks(result);
        const quality = {
          facePresent: true, faceCount,
          confidence: blendshapes ? 0.8 + Object.keys(blendshapes).length * 0.003 : 0.7,
        };
        postMessage(
          { type: 'sample', sample: { timestamp, blendshapes, landmarks, quality }, delegate: currentDelegate, landmarks },
          landmarks ? [landmarks.buffer] : undefined,
        );
      } else {
        postMessage({
          type: 'sample',
          sample: { timestamp, blendshapes: {}, landmarks: null, quality: { facePresent: false, faceCount: 0, confidence: 0.3 } },
          delegate: currentDelegate,
          landmarks: null,
        });
      }
    } catch (error) {
      postMessage({ type: 'frame-error', message: error?.message ?? String(error) });
    }
  }
};