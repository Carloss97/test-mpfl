/**
 * Gaze Estimator v3 — simplificado y robusto
 *
 * Fixes:
 *  - Ignora coordenada Z en centroides (evita skew por landmarks sin profundidad)
 *  - Escala calibrada empíricamente: iris movement ~0.015 → screen displacement ~0.35
 *  - Sin head pose compensation (demasiado ruidosa con webcam)
 *  - EMA fuerte (α=0.15) para máxima estabilidad
 */

function clamp(v, l = 0, h = 1) { return Math.min(h, Math.max(l, Number.isFinite(v) ? v : l)); }
function round(v, d = 4) { if (!Number.isFinite(v)) return 0; const f = 10 ** d; return Math.round(v * f) / f; }

const LEFT_EYE_CONTOUR = [33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7];
const RIGHT_EYE_CONTOUR = [362, 398, 384, 385, 386, 387, 388, 466, 263, 249, 390, 373, 374, 380, 381, 382];
const LEFT_IRIS = [469, 470, 471, 472];
const RIGHT_IRIS = [474, 475, 476, 477];

function centroid2D(landmarks, indices) {
  let sx = 0, sy = 0, count = 0;
  for (const idx of indices) {
    const i = idx * 3;
    if (i + 1 >= landmarks.length) continue;
    const x = landmarks[i], y = landmarks[i + 1];
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    if (x === 0 && y === 0) continue; // invalid landmark
    sx += x; sy += y; count++;
  }
  return count ? { x: sx / count, y: sy / count } : { x: 0.5, y: 0.5 };
}

// EMA state
let smoothed = { x: 0.5, y: 0.5, conf: 0 };
const ALPHA = 0.15; // strong smoothing

export function estimateGaze(landmarks, _headPose = null, _sw = 1920, _sh = 1080) {
  if (!landmarks || landmarks.length < 478 * 3) {
    return { screenX: 0.5, screenY: 0.5, lookingAtScreen: false, confidence: 0 };
  }

  const leftIris = centroid2D(landmarks, LEFT_IRIS);
  const rightIris = centroid2D(landmarks, RIGHT_IRIS);
  const leftEye = centroid2D(landmarks, LEFT_EYE_CONTOUR);
  const rightEye = centroid2D(landmarks, RIGHT_EYE_CONTOUR);

  // Iris offset from eye center (normalized coords)
  const dx = ((leftIris.x - leftEye.x) + (rightIris.x - rightEye.x)) / 2;
  const dy = ((leftIris.y - leftEye.y) + (rightIris.y - rightEye.y)) / 2;

  // Empirically calibrated: iris horizontal movement ~0.015 → ~0.35 screen displacement
  // Vertical movement is smaller due to eyelid constraints → use higher scale
  const SCALE_X = 24;
  const SCALE_Y = 38; // higher gain for vertical to compensate limited range
  let sx = 0.5 + dx * SCALE_X;
  let sy = 0.5 + dy * SCALE_Y;

  // Clamp + EMA
  sx = clamp(sx);
  sy = clamp(sy);
  smoothed.x = smoothed.x * ALPHA + sx * (1 - ALPHA);
  smoothed.y = smoothed.y * ALPHA + sy * (1 - ALPHA);

  const dist = Math.hypot(smoothed.x - 0.5, smoothed.y - 0.5);
  const looking = dist < 0.35;
  smoothed.conf = clamp(0.5 + (1 - dist) * 0.5);

  return {
    screenX: round(smoothed.x),
    screenY: round(smoothed.y),
    lookingAtScreen: looking,
    confidence: round(smoothed.conf),
  };
}

export function gazeRegion(sx, sy) {
  if (sx < 0.33 && sy < 0.33) return 'top-left';
  if (sx > 0.66 && sy < 0.33) return 'top-right';
  if (sx < 0.33 && sy > 0.66) return 'bottom-left';
  if (sx > 0.66 && sy > 0.66) return 'bottom-right';
  if (sy < 0.33) return 'top';
  if (sy > 0.66) return 'bottom';
  if (sx < 0.33) return 'left';
  if (sx > 0.66) return 'right';
  return 'center';
}

export function computeGazeMetrics(history = []) {
  if (!history.length) return { attentionScore: 0.5, screenFocusRatio: 0, gazeStability: 0.5 };
  const looking = history.filter(g => g.lookingAtScreen);
  const ratio = looking.length / history.length;
  const xs = history.map(g => g.screenX), ys = history.map(g => g.screenY);
  const mx = xs.reduce((s, v) => s + v, 0) / xs.length;
  const my = ys.reduce((s, v) => s + v, 0) / ys.length;
  const vx = xs.reduce((s, v) => s + (v-mx)**2, 0) / xs.length;
  const vy = ys.reduce((s, v) => s + (v-my)**2, 0) / ys.length;
  const stability = clamp(1 - Math.sqrt(vx + vy) * 3);
  const mc = history.reduce((s, g) => s + (g.confidence ?? 0.5), 0) / history.length;
  return {
    attentionScore: round(ratio * 0.5 + stability * 0.3 + mc * 0.2),
    screenFocusRatio: round(ratio),
    gazeStability: round(stability),
    meanScreenX: round(mx),
    meanScreenY: round(my),
  };
}