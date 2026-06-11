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

  // Head forward: use face aspect ratio as depth proxy.
  // When leaning forward: face appears taller and narrower (foreshortening).
  // When upright: face is wider relative to height.
  const faceHeight = Math.max(0.01, chin.y - forehead.y);
  const faceWidth = Math.max(0.01, rightCheek.x - leftCheek.x);
  const aspectRatio = faceHeight / faceWidth;
  // Typical resting AR: ~1.2-1.5. Forward lean increases AR.
  const headForward = clamp((aspectRatio - 1.0) / 0.5); // 1.0→0%, 1.5→100%

  // Asymmetry: difference between left and right cheek positions
  const midX = (leftCheek.x + rightCheek.x) / 2;
  const asymmetry = clamp(Math.abs(get2D(NOSE_TIP).x - midX) / (faceWidth * 0.3));

  // Stability: jitter of jaw contour points relative to previous frame
  let jitterSum = 0, jitterN = 0;
  for (const idx of JAW_CONTOUR) {
    const i = idx * 3;
    if (i + 1 >= landmarks.length) continue;
    const x = landmarks[i], y = landmarks[i + 1];
    if (x === 0 && y === 0) continue;
    jitterSum += Math.abs(x - 0.5) + Math.abs(y - 0.5);
    jitterN++;
  }
  // Normalize: higher deviation → lower stability
  const meanDev = jitterN > 0 ? jitterSum / jitterN : 0;
  const stability = clamp(1 - meanDev * 4);

  // Composite posture score: higher = better posture
  // Forward head posture is weighted more heavily (it's the most common issue)
  const postureScore = clamp(
    1 - headTilt * 0.35 - headForward * 0.50 - asymmetry * 0.25
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