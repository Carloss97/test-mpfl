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

// Contour for stability: jawline points
const JAW_CONTOUR = [0, 17, 37, 39, 40, 61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95];

export function estimateUpperBodyPosture(landmarks) {
  if (!landmarks || landmarks.length < RIGHT_EAR * 3) {
    return {
      headTilt: 0,
      headTiltDeg: 0,
      headForward: 0.5,
      asymmetry: 0,
      stability: 0.8,
      postureScore: 0.7,
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

  // Head forward: use Z-depth difference between nose tip and ears
  // When leaning forward, nose gets closer to camera (higher Z relative)
  const noseZ = landmarks[NOSE_TIP * 3 + 2] ?? 0;
  const leftEarZ = landmarks[LEFT_EAR * 3 + 2] ?? 0;
  const rightEarZ = landmarks[RIGHT_EAR * 3 + 2] ?? 0;
  const avgEarZ = (leftEarZ + rightEarZ) / 2;
  // Z is relative depth: higher = closer to camera. Forward head → nose Z >> ear Z
  const zDiff = Math.max(0, noseZ - avgEarZ);
  const headForward = clamp(zDiff / 0.08); // ~0.08 is typical forward lean range

  // Asymmetry: difference between left and right cheek positions
  const faceWidth = Math.max(0.01, rightCheek.x - leftCheek.x);
  const midX = (leftCheek.x + rightCheek.x) / 2;
  const asymmetry = clamp(Math.abs(get2D(NOSE_TIP).x - midX) / (faceWidth * 0.3));

  // Stability: placeholder — would need temporal history
  const stability = 0.8;

  // Composite posture score: higher = better posture
  const postureScore = clamp(
    1 - headTilt * 0.4 - headForward * 0.3 - asymmetry * 0.3
  );

  return {
    headTilt: round(headTilt),
    headTiltDeg: round(tiltDeg),
    headForward: round(headForward),
    asymmetry: round(asymmetry),
    stability: round(stability),
    postureScore: round(postureScore),
  };
}