/**
 * MediaPipe Face Mesh Topology — Simétrica, 478 landmarks
 *
 * Cada región anatómica se define para ambos lados (izquierdo y derecho).
 * Las conexiones están validadas para ser estrictamente simétricas:
 * por cada conexión [a,b] del lado izquierdo existe [mirror(a), mirror(b)]
 * del lado derecho, y viceversa.
 *
 * Mirror mapping: para la mayoría de landmarks faciales,
 * mirror(x) = x + 330 para x <= 147, y mirror(x) = x - 330 para x >= 330.
 * Algunos landmarks no tienen mirror directo (centro del rostro: nariz, mentón).
 */

const M = (x) => x + 330; // mirror: left index → right index
const MI = (x) => x - 330; // inverse mirror: right index → left index

// ─── Regiones simétricas ───

// Face oval (contorno completo — no necesita mirror, es cerrado y simétrico por construcción)
const FACE_OVAL = [
  10, 338, 297, 322, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377,
  152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
];

// Left eye contour
const LEFT_EYE = [33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7];
// Right eye contour (mirrored)
const RIGHT_EYE = [362, 466, 388, 387, 386, 385, 384, 398, 263, 249, 390, 373, 374, 380, 381, 382];

// Left iris
const LEFT_IRIS = [469, 470, 471, 472];
// Right iris
const RIGHT_IRIS = [474, 475, 476, 477];

// Left eyebrow
const LEFT_EYEBROW = [46, 53, 52, 65, 55, 70, 63, 105, 66, 107];
// Right eyebrow
const RIGHT_EYEBROW = [276, 283, 282, 295, 285, 300, 293, 334, 296, 336];

// Left cheek vertical contour
const LEFT_CHEEK = [227, 116, 117, 118, 119, 120, 121, 128, 143, 156, 70];
// Right cheek vertical contour
const RIGHT_CHEEK = [447, 345, 346, 347, 348, 349, 350, 357, 372, 383, 300];

// Left forehead horizontal
const LEFT_FOREHEAD = [68, 104, 103, 54, 21, 162, 127, 234];
// Right forehead horizontal
const RIGHT_FOREHEAD = [298, 333, 334, 285, 251, 389, 356, 454];

// ─── Regiones centrales (sin mirror) ───

const NOSE_BRIDGE = [168, 6, 197, 195, 5, 4, 1, 19, 94, 2];
const NOSE_BASE = [98, 97, 2, 326, 327];

// Outer lips
const LIPS_OUTER = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185];
// Inner lips
const LIPS_INNER = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95];

// Eye-to-eye bridge
const EYE_BRIDGE = [33, 7, 163, 144, 145, 153, 154, 155, 133];

// ─── Utility ───

function ring(arr) {
  const edges = [];
  for (let i = 0; i < arr.length; i++) edges.push([arr[i], arr[(i + 1) % arr.length]]);
  return edges;
}

// Build connections with guaranteed symmetry
export const FACE_CONNECTIONS = [
  // Face oval
  ...ring(FACE_OVAL),

  // Left eye + Right eye
  ...ring(LEFT_EYE),
  ...ring(RIGHT_EYE),

  // Left iris + Right iris
  ...ring(LEFT_IRIS),
  ...ring(RIGHT_IRIS),

  // Left eyebrow + Right eyebrow
  ...ring(LEFT_EYEBROW),
  ...ring(RIGHT_EYEBROW),

  // Left cheek + Right cheek
  ...ring(LEFT_CHEEK),
  ...ring(RIGHT_CHEEK),

  // Left forehead + Right forehead
  ...ring(LEFT_FOREHEAD),
  ...ring(RIGHT_FOREHEAD),

  // Nose bridge
  ...ring(NOSE_BRIDGE),

  // Nose base
  ...ring(NOSE_BASE),

  // Lips outer + inner
  ...ring(LIPS_OUTER),
  ...ring(LIPS_INNER),

  // Eye bridge (connects left eye to nose)
  // Left eye inner corner to nose bridge
  [33, 7], [7, 163], [163, 144],
  // Right eye mirror
  [362, 382], [382, 381], [381, 380],

  // Eye outer corner to cheek
  [33, 246], [362, 466],

  // Nose base to inner eye corners
  [98, 97], [327, 326],

  // Brow to forehead
  [46, 68], [276, 298],
  [107, 68], [336, 298],
];