/**
 * Pose Landmarker Worker
 *
 * Corre MediaPipe Pose Landmarker en un Web Worker dedicado.
 * Extrae 33 landmarks corporales + world landmarks 3D.
 *
 * No interfiere con el Face Landmarker Worker.
 */

import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const MODEL_PATH = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task';

let poseLandmarker = null;
let initPromise = null;

async function ensurePose() {
  if (poseLandmarker) return true;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const wasm = await FilesetResolver.forVisionTasks('/mediapipe/wasm', 'latest');
    poseLandmarker = await PoseLandmarker.createFromOptions(wasm, {
      baseOptions: {
        modelAssetPath: MODEL_PATH,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numPoses: 1,
    });
    return true;
  })();

  return initPromise;
}

function extractLandmarks(result) {
  if (!result?.poseLandmarks?.length) return null;
  const lm = result.poseLandmarks[0];
  const arr = new Float32Array(lm.length * 4); // x, y, z, visibility
  for (let i = 0; i < lm.length; i++) {
    arr[i * 4] = lm[i].x;
    arr[i * 4 + 1] = lm[i].y;
    arr[i * 4 + 2] = lm[i].z;
    arr[i * 4 + 3] = lm[i].visibility ?? 1;
  }
  return arr;
}

function extractWorldLandmarks(result) {
  if (!result?.poseWorldLandmarks?.length) return null;
  const lm = result.poseWorldLandmarks[0];
  const arr = new Float32Array(lm.length * 3);
  for (let i = 0; i < lm.length; i++) {
    arr[i * 3] = lm[i].x;
    arr[i * 3 + 1] = lm[i].y;
    arr[i * 3 + 2] = lm[i].z;
  }
  return arr;
}

// ─── Pose metrics ───

function computePoseMetrics(landmarks, worldLandmarks) {
  if (!landmarks || landmarks.length < 33 * 4) return null;

  // Shoulders (11=left, 12=right)
  const lShoulder = { x: landmarks[11 * 4], y: landmarks[11 * 4 + 1] };
  const rShoulder = { x: landmarks[12 * 4], y: landmarks[12 * 4 + 1] };
  const shoulderDx = rShoulder.x - lShoulder.x;
  const shoulderDy = rShoulder.y - lShoulder.y;
  const shoulderAngle = Math.atan2(shoulderDy, shoulderDx); // radians

  // Posture score: 1 = perfectly horizontal shoulders, 0 = 45° tilted
  const postureScore = Math.max(0, 1 - Math.abs(shoulderAngle) / (Math.PI / 4));

  // Head position (0=nose, 9=mouth, 10=mouth)
  const nose = { x: landmarks[0 * 4], y: landmarks[0 * 4 + 1] };
  const midShoulder = { x: (lShoulder.x + rShoulder.x) / 2, y: (lShoulder.y + rShoulder.y) / 2 };
  // Head-to-shoulder ratio (higher = leaning forward)
  const headForward = nose.y < midShoulder.y ? 0 : clamp((nose.y - midShoulder.y) / 0.3);

  // Body stability (jitter of world landmarks)
  let stability = 0.8;
  if (worldLandmarks && worldLandmarks.length >= 33 * 3) {
    // Use shoulder world coords for stability estimate (single frame, approximate)
    stability = clamp(landmarks[11 * 4 + 3] * landmarks[12 * 4 + 3]); // visibility product
  }

  return {
    postureScore: round(Math.max(0, 1 - Math.abs(shoulderAngle) * 2)),
    shoulderAngle: round(shoulderAngle),
    headForward: round(clamp(headForward)),
    bodyStability: round(stability),
    shoulderWidth: round(shoulderDx),
    visibility: round(Math.min(landmarks[11 * 4 + 3] || 0, landmarks[12 * 4 + 3] || 0)),
  };
}

function clamp(v, l = 0, h = 1) { return Math.min(h, Math.max(l, Number.isFinite(v) ? v : l)); }
function round(v, d = 4) { if (!Number.isFinite(v)) return 0; const f = 10 ** d; return Math.round(v * f) / f; }

// ─── Main ───

self.onmessage = async (event) => {
  const { type, payload } = event.data ?? {};

  if (type === 'init') {
    try {
      await ensurePose();
      postMessage({ type: 'ready', message: 'PoseLandmarker ready' });
    } catch (err) {
      postMessage({ type: 'error', message: err?.message ?? String(err) });
    }
    return;
  }

  if (type === 'frame') {
    try {
      const { bitmap, timestamp } = payload;
      if (!poseLandmarker) { bitmap?.close?.(); return; }

      const result = poseLandmarker.detectForVideo(bitmap, timestamp);
      bitmap?.close?.();

      const landmarks = extractLandmarks(result);
      const worldLandmarks = extractWorldLandmarks(result);
      const metrics = computePoseMetrics(landmarks, worldLandmarks);

      if (landmarks) {
        postMessage({
          type: 'pose',
          sample: { timestamp, landmarks, worldLandmarks, metrics },
        }, [landmarks.buffer, worldLandmarks?.buffer].filter(Boolean));
      } else {
        postMessage({ type: 'pose-empty', timestamp });
      }
    } catch (error) {
      postMessage({ type: 'frame-error', message: error?.message ?? String(error) });
    }
  }
};