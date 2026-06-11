/**
 * Shoulder Estimator — estimación geométrica de posición de hombros
 *
 * Alternativa #1: infiere coordenadas de hombros desde landmarks faciales.
 * Sin modelo adicional, sin descarga extra, ~30 líneas.
 *
 * Método:
 *   hombro.y = barbilla.y + alturaFacial × 2.5
 *   hombro.x = centroFacial.x ± anchoFacial × 1.5
 *
 * Precisión: baja (estimación). Suficiente para detectar presencia
 * de hombros en el frame y si la persona está erguida o inclinada.
 */

function clamp(v, l = 0, h = 1) { return Math.min(h, Math.max(l, Number.isFinite(v) ? v : l)); }
function round(v, d = 4) { if (!Number.isFinite(v)) return 0; const f = 10 ** d; return Math.round(v * f) / f; }

const CHIN = 152;       // gnathion (bottom of chin)
const FOREHEAD = 10;    // glabella
const LEFT_EAR = 234;
const RIGHT_EAR = 454;
const LEFT_CHEEK = 123;
const RIGHT_CHEEK = 352;

function get2D(landmarks, idx) {
  const i = idx * 3;
  return { x: landmarks[i] ?? 0, y: landmarks[i + 1] ?? 0 };
}

export function estimateShoulders(landmarks) {
  if (!landmarks || landmarks.length < RIGHT_CHEEK * 3) {
    return {
      leftShoulder: { x: 0, y: 0 },
      rightShoulder: { x: 0, y: 0 },
      shoulderAngle: 0,
      shoulderWidth: 0,
      visible: false,
    };
  }

  const chin = get2D(landmarks, CHIN);
  const forehead = get2D(landmarks, FOREHEAD);
  const leftCheek = get2D(landmarks, LEFT_CHEEK);
  const rightCheek = get2D(landmarks, RIGHT_CHEEK);

  const faceHeight = Math.max(0.01, chin.y - forehead.y);
  const faceWidth = Math.max(0.01, rightCheek.x - leftCheek.x);
  const faceCenterX = (leftCheek.x + rightCheek.x) / 2;

  // Estimated shoulder positions (normalized coords)
  const leftShoulder = {
    x: round(faceCenterX - faceWidth * 1.6),
    y: round(chin.y + faceHeight * 1.5),
        };
        const rightShoulder = {
          x: round(faceCenterX + faceWidth * 1.6),
          y: round(chin.y + faceHeight * 1.5),
  };

  // Check if estimated shoulders would be visible in frame
  const visible = leftShoulder.x > 0 && rightShoulder.x < 1 && leftShoulder.y < 1;

  // Shoulder line angle (same as head tilt proxy, but from estimated shoulders)
  const dx = rightShoulder.x - leftShoulder.x;
  const dy = rightShoulder.y - leftShoulder.y;
  const shoulderAngle = Math.atan2(dy, dx);

  return {
    leftShoulder,
    rightShoulder,
    shoulderAngle: round(shoulderAngle),
    shoulderWidth: round(faceWidth * 3.2),
    visible,
  };
}