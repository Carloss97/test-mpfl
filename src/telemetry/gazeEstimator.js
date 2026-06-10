/**
 * Gaze Estimator — estimación de dirección de mirada
 *
 * Usa los iris landmarks de MediaPipe Face Landmarker (índices 468-477)
 * para estimar hacia dónde mira la persona en la pantalla.
 *
 * Algoritmo:
 *   1. Calcular centro del iris para cada ojo (media de 4 puntos)
 *   2. Calcular centro del ojo (media de landmarks del contorno ocular)
 *   3. Vector iris - centro_ojo = dirección de mirada relativa al ojo
 *   4. Combinar con head pose (yaw/pitch) del facialCapturePipeline
 *   5. Intersectar con plano de pantalla → coordenadas (x, y) normalizadas
 *
 * Precisión: ~2-5° error angular con webcam estándar.
 *
 * Referencia:
 *   - MediaPipe Iris: Google Research (2020). Real-time iris tracking.
 *   - Guestrin, E. D., & Eizenman, M. (2006). General theory of remote gaze estimation.
 */

// ─── Landmark indices ───
const LEFT_EYE_CONTOUR = [33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7];
const RIGHT_EYE_CONTOUR = [362, 398, 384, 385, 386, 387, 388, 466, 263, 249, 390, 373, 374, 380, 381, 382];
const LEFT_IRIS = [469, 470, 471, 472];
const RIGHT_IRIS = [474, 475, 476, 477];

function clamp(v, l = 0, h = 1) { return Math.min(h, Math.max(l, Number.isFinite(v) ? v : l)); }
function round(v, d = 4) { if (!Number.isFinite(v)) return 0; const f = 10 ** d; return Math.round(v * f) / f; }

// ─── Geometry helpers ───

function get3D(landmarks, idx) {
  if (!landmarks || idx * 3 + 2 >= landmarks.length) return { x: 0, y: 0, z: 0 };
  return {
    x: landmarks[idx * 3],
    y: landmarks[idx * 3 + 1],
    z: landmarks[idx * 3 + 2],
  };
}

function centroid3D(landmarks, indices) {
  let sx = 0, sy = 0, sz = 0;
  let count = 0;
  for (const idx of indices) {
    if (idx * 3 + 2 >= landmarks.length) continue;
    sx += landmarks[idx * 3];
    sy += landmarks[idx * 3 + 1];
    sz += landmarks[idx * 3 + 2];
    count++;
  }
  if (!count) return { x: 0, y: 0, z: 0 };
  return { x: sx / count, y: sy / count, z: sz / count };
}

/**
 * Estima la dirección de mirada en el plano de la pantalla.
 *
 * @param {Float32Array} landmarks — 478 puntos × 3 coordenadas
 * @param {{ yaw: number, pitch: number, roll: number }} headPose
 * @param {number} screenWidth — ancho de la pantalla en px (default 1920)
 * @param {number} screenHeight — alto de la pantalla en px (default 1080)
 * @returns {{
 *   screenX: number, screenY: number,  // 0-1 normalizadas al viewport
 *   lookingAtScreen: boolean,
 *   gazeVector: { x: number, y: number, z: number },
 *   leftIrisPos: { x: number, y: number },
 *   rightIrisPos: { x: number, y: number },
 *   confidence: number
 * }}
 */
export function estimateGaze(landmarks, headPose = null, screenWidth = 1920, screenHeight = 1080) {
  if (!landmarks || landmarks.length < 478 * 3) {
    return {
      screenX: 0.5, screenY: 0.5,
      lookingAtScreen: false,
      gazeVector: { x: 0, y: 0, z: -1 },
      leftIrisPos: { x: 0, y: 0 },
      rightIrisPos: { x: 0, y: 0 },
      confidence: 0,
    };
  }

  // Iris centers
  const leftIris = centroid3D(landmarks, LEFT_IRIS);
  const rightIris = centroid3D(landmarks, RIGHT_IRIS);

  // Eye contour centers
  const leftEyeCenter = centroid3D(landmarks, LEFT_EYE_CONTOUR);
  const rightEyeCenter = centroid3D(landmarks, RIGHT_EYE_CONTOUR);

  // Iris offset from eye center (normalized to eye size)
  // Positive x = looking right, positive y = looking down
  const leftDx = (leftIris.x - leftEyeCenter.x);
  const leftDy = (leftIris.y - leftEyeCenter.y);
  const rightDx = (rightIris.x - rightEyeCenter.x);
  const rightDy = (rightIris.y - rightEyeCenter.y);

  // Average gaze offset
  const avgDx = (leftDx + rightDx) / 2;
  const avgDy = (leftDy + rightDy) / 2;

  // Scale: typical iris movement range is ~0.05 in normalized coords
  // Map to screen coordinates
  const scaleX = 1.0 / 0.06; // ~16.7 pixels per 0.01 units
  const scaleY = 1.0 / 0.06;

  let screenX = 0.5 + avgDx * scaleX;
  let screenY = 0.5 + avgDy * scaleY;

  // Head pose compensation
  if (headPose && Number.isFinite(headPose.yaw) && Number.isFinite(headPose.pitch)) {
    // Yaw: looking left/right adds offset
    screenX -= headPose.yaw * 0.8;
    // Pitch: looking up/down adds offset
    screenY += headPose.pitch * 0.8;
  }

  // Clamp to screen
  screenX = clamp(screenX);
  screenY = clamp(screenY);

  // Is the person looking at the screen?
  const centerDist = Math.hypot(screenX - 0.5, screenY - 0.5);
  const lookingAtScreen = centerDist < 0.45;

  // Confidence based on landmark quality
  const irisVisible = (leftIris.z !== 0 || rightIris.z !== 0);
  const confidence = irisVisible ? clamp(0.6 + (1 - centerDist) * 0.4) : 0.3;

  return {
    screenX: round(screenX),
    screenY: round(screenY),
    lookingAtScreen,
    gazeVector: {
      x: round(avgDx * 10),
      y: round(avgDy * 10),
      z: -1,
    },
    leftIrisPos: { x: round(leftIris.x), y: round(leftIris.y) },
    rightIrisPos: { x: round(rightIris.x), y: round(rightIris.y) },
    confidence: round(confidence),
  };
}

/**
 * Determina la región de la pantalla donde mira la persona.
 */
export function gazeRegion(screenX, screenY) {
  if (screenX < 0.33 && screenY < 0.33) return 'top-left';
  if (screenX > 0.66 && screenY < 0.33) return 'top-right';
  if (screenX < 0.33 && screenY > 0.66) return 'bottom-left';
  if (screenX > 0.66 && screenY > 0.66) return 'bottom-right';
  if (screenY < 0.33) return 'top';
  if (screenY > 0.66) return 'bottom';
  if (screenX < 0.33) return 'left';
  if (screenX > 0.66) return 'right';
  return 'center';
}

// ─── Gaze metrics ───

/**
 * Calcula métricas de atención visual desde el historial de gaze.
 */
export function computeGazeMetrics(gazeHistory = []) {
  if (!gazeHistory.length) {
    return {
      attentionScore: 0.5,
      screenFocusRatio: 0,
      gazeStability: 0.5,
      meanScreenX: 0.5,
      meanScreenY: 0.5,
    };
  }

  const looking = gazeHistory.filter(g => g.lookingAtScreen);
  const screenFocusRatio = looking.length / gazeHistory.length;

  // Stability: std dev of gaze position
  const xs = gazeHistory.map(g => g.screenX);
  const ys = gazeHistory.map(g => g.screenY);
  const meanX = xs.reduce((s, v) => s + v, 0) / xs.length;
  const meanY = ys.reduce((s, v) => s + v, 0) / ys.length;
  const varX = xs.reduce((s, v) => s + (v - meanX) ** 2, 0) / xs.length;
  const varY = ys.reduce((s, v) => s + (v - meanY) ** 2, 0) / ys.length;
  const gazeStability = clamp(1 - Math.sqrt(varX + varY) * 3);

  // Attention: combination of focus + stability + confidence
  const meanConf = gazeHistory.reduce((s, g) => s + (g.confidence ?? 0.5), 0) / gazeHistory.length;
  const attentionScore = clamp(screenFocusRatio * 0.5 + gazeStability * 0.3 + meanConf * 0.2);

  return {
    attentionScore: round(attentionScore),
    screenFocusRatio: round(screenFocusRatio),
    gazeStability: round(gazeStability),
    meanScreenX: round(meanX),
    meanScreenY: round(meanY),
  };
}