/**
 * Upper Body Posture Estimator
 *
 * Estima postura corporal usando SOLO landmarks faciales de MediaPipe.
 * No requiere Pose Landmarker. Funciona con cualquier ángulo de cámara.
 *
 * Métricas desde landmarks faciales:
 *  - headTilt: inclinación lateral de la cabeza (ángulo oreja-oreja vs horizontal)
 *  - headForward: inclinación frontal (relación nariz-mentón vs altura facial)
 *  - shoulderAlignment: estimada desde asimetría facial + mandíbula
 *  - stability: jitter de landmarks del contorno facial
 *
 * Referencia: Los landmarks 0-16 del mesh facial forman la silueta de la
 * cara. El ángulo entre los puntos de las orejas (234, 454) da el tilt.
 */

function clamp(v, l = 0, h = 1) { return Math.min(h, Math.max(l, Number.isFinite(v) ? v : l)); }
function round(v, d = 4) { if (!Number.isFinite(v)) return 0; const f = 10 ** d; return Math.round(v * f) / f; }

// Key indices from MediaPipe's 478-point face mesh
const LEFT_EAR = 234;
const RIGHT_EAR = 454;
const FOREHEAD = 10;     // glabella
const CHIN = 152;        // gnathion
const LEFT_CHEEK = 123;
const RIGHT_CHEEK = 352;
const NOSE_TIP = 1;

// Points used for temporal stability. Include jaw contour plus anchor points that
// move when the user tilts/leans, so the metric is actual frame-to-frame jitter
// rather than distance to the center of the image.
const STABILITY_POINTS = [
  0, 17, 37, 39, 40, 61, 146, 91, 181, 84, 314, 405, 321, 375,
  291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95,
  LEFT_EAR, RIGHT_EAR, FOREHEAD, CHIN, LEFT_CHEEK, RIGHT_CHEEK, NOSE_TIP,
];

let maxAspectRatio = null;
let previousStabilityPoints = null;

export function resetUpperBodyPostureState() {
  maxAspectRatio = null;
  previousStabilityPoints = null;
}

export function estimateUpperBodyPosture(landmarks) {
  if (!landmarks || landmarks.length < (RIGHT_EAR + 1) * 3) {
    return {
      method: 'face_landmark_proxy',
      source: 'mediapipe_face_mesh',
      confidence: 0,
      headTilt: 0,
      headTiltDeg: 0,
      headForward: 0.5,
      asymmetry: 0,
      stability: 0,
      postureScore: 0.5,
      caveats: ['insufficient_face_landmarks'],
    };
  }

  const get2D = (idx) => {
    const i = idx * 3;
    return { x: landmarks[i] ?? 0, y: landmarks[i + 1] ?? 0 };
  };

  const leftEar = get2D(LEFT_EAR);
  const rightEar = get2D(RIGHT_EAR);
  const forehead = get2D(FOREHEAD);
  const chin = get2D(CHIN);
  const leftCheek = get2D(LEFT_CHEEK);
  const rightCheek = get2D(RIGHT_CHEEK);

  // Head tilt: angle of ear-to-ear line vs horizontal
  const dx = rightEar.x - leftEar.x;
  const dy = rightEar.y - leftEar.y;
  const tiltRad = Math.atan2(dy, dx);
  const tiltDeg = tiltRad * (180 / Math.PI);
  // Normalized: 0 = straight, ±1 = 45° tilt
  const headTilt = clamp(Math.abs(tiltDeg) / 30);

  // Head forward/down: use face aspect ratio as webcam proxy.
  // Empirical observation on this webcam: upright face has higher AR; lowering
  // the head makes the projected face shorter/wider, decreasing AR.
  const faceHeight = Math.max(0.01, chin.y - forehead.y);
  const faceWidth = Math.max(0.01, rightCheek.x - leftCheek.x);
  const aspectRatio = faceHeight / faceWidth;

  // Auto-calibrate: track maximum observed AR as the most upright baseline.
  if (maxAspectRatio === null || aspectRatio > maxAspectRatio) {
    maxAspectRatio = aspectRatio;
  }
  const baselineAR = maxAspectRatio || aspectRatio || 1.0;
  // 0 = at upright baseline, 1 = AR decreased substantially (head down/forward).
  const headForward = clamp((baselineAR - aspectRatio) / 0.35);

  // Asymmetry: difference between left and right cheek positions
  const midX = (leftCheek.x + rightCheek.x) / 2;
  const asymmetry = clamp(Math.abs(get2D(NOSE_TIP).x - midX) / (faceWidth * 0.3));

  // Stability: temporal jitter of selected landmarks, normalized by face size.
  const currentPoints = [];
  for (const idx of STABILITY_POINTS) {
    const i = idx * 3;
    if (i + 1 >= landmarks.length) continue;
    const x = landmarks[i], y = landmarks[i + 1];
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    if (x === 0 && y === 0) continue;
    currentPoints.push([idx, x, y]);
  }
  const faceDiag = Math.max(0.05, Math.hypot(faceWidth, faceHeight));
  let stability = 0.85;
  if (previousStabilityPoints && currentPoints.length > 0) {
    let motionSum = 0;
    let motionN = 0;
    for (const [idx, x, y] of currentPoints) {
      const prev = previousStabilityPoints.get(idx);
      if (!prev) continue;
      motionSum += Math.hypot(x - prev.x, y - prev.y) / faceDiag;
      motionN++;
    }
    const meanMotion = motionN > 0 ? motionSum / motionN : 0;
    stability = clamp(1 - meanMotion * 12);
  }
  previousStabilityPoints = new Map(currentPoints.map(([idx, x, y]) => [idx, { x, y }]));

  const requiredPoints = [leftEar, rightEar, forehead, chin, leftCheek, rightCheek, get2D(NOSE_TIP)];
  const validRequired = requiredPoints.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && !(p.x === 0 && p.y === 0)).length;
  const landmarkCompleteness = validRequired / requiredPoints.length;
  const confidence = clamp(landmarkCompleteness * 0.55 + stability * 0.25 + (faceWidth > 0.08 && faceHeight > 0.12 ? 0.20 : 0));

  // Composite posture score: higher = better posture.
  // Face-only posture is a proxy. It should be interpreted together with
  // MoveNet/Pose Landmarker shoulders when those detections are available.
  const postureScore = clamp(
    1 - headTilt * 0.32 - headForward * 0.42 - asymmetry * 0.20 - (1 - stability) * 0.12
  );

  return {
    method: 'face_landmark_proxy',
    source: 'mediapipe_face_mesh',
    confidence: round(confidence),
    headTilt: round(headTilt),
    headTiltDeg: round(tiltDeg),
    headForward: round(headForward),
    asymmetry: round(asymmetry),
    stability: round(stability),
    postureScore: round(postureScore),
    caveats: ['upper_body_inferred_from_face_when_pose_model_unavailable'],
  };
}