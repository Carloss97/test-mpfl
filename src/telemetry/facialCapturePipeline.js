/**
 * Facial Capture Pipeline v2
 *
 * Integración completa del pipeline de captura facial:
 *  FaceLandmarker → blendshapes → facial landmarks → head pose → AUs
 *
 * Mejoras vs v1:
 *  - Head pose estimation (yaw, pitch, roll) para filtrar perfiles
 *  - Confidence-weighted AU scores
 *  - Ventanas agregadas con overlap para suavizado
 *  - Métricas de calidad de captura (illumination, occlusion heuristics)
 */

// ─── Head pose from facial landmarks ───
// Uses the MediaPipe face mesh 468-point model subset to estimate
// rough head orientation via nose tip, eye centers, and ear points.

const LANDMARK_INDICES = {
  noseTip: 1,
  leftEye: 33,
  rightEye: 263,
  leftEar: 234,
  rightEar: 454,
  chin: 199,
};

function round(value, digits = 4) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/**
 * Estima head pose (yaw, pitch, roll) a partir de landmarks 3D.
 * @param {Float32Array} landmarks — [x0,y0,z0, x1,y1,z1, ...]
 * @returns {{ yaw: number, pitch: number, roll: number, confidence: number }}
 */
export function estimateHeadPose(landmarks) {
  if (!landmarks || landmarks.length < LANDMARK_INDICES.rightEar * 3) {
    return { yaw: 0, pitch: 0, roll: 0, confidence: 0 };
  }

  const get3D = (idx) => ({
    x: landmarks[idx * 3],
    y: landmarks[idx * 3 + 1],
    z: landmarks[idx * 3 + 2],
  });

  const nose = get3D(LANDMARK_INDICES.noseTip);
  const leftEye = get3D(LANDMARK_INDICES.leftEye);
  const rightEye = get3D(LANDMARK_INDICES.rightEye);
  const chin = get3D(LANDMARK_INDICES.chin);

  // Eye center
  const eyeCenter = {
    x: (leftEye.x + rightEye.x) / 2,
    y: (leftEye.y + rightEye.y) / 2,
    z: (leftEye.z + rightEye.z) / 2,
  };

  // Yaw: horizontal displacement of nose from eye center
  const yaw = Math.atan2(nose.x - eyeCenter.x, nose.z - eyeCenter.z);

  // Pitch: vertical angle of nose relative to eye center
  const pitch = -Math.atan2(nose.y - eyeCenter.y, nose.z - eyeCenter.z);

  // Roll: eye line angle
  const roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);

  // Confidence: how frontal is the face? (0 = profile, 1 = frontal)
  const yawAbs = Math.abs(yaw);
  const pitchAbs = Math.abs(pitch);
  const confidence = Math.max(0, 1 - (yawAbs + pitchAbs) / (Math.PI / 2));

  return {
    yaw: round(yaw),
    pitch: round(pitch),
    roll: round(roll),
    confidence: round(confidence),
  };
}

/**
 * Detecta si la cara está en un ángulo usable para AUs.
 * Ángulos extremos producen blendshapes poco confiables.
 */
export function isFaceFrontal(headPose, threshold = 0.5) {
  return (headPose?.confidence ?? 0) >= threshold;
}

// ─── Quality metrics ───

/**
 * Calcula métricas de calidad de captura.
 * @param {Array} recentSamples — últimas N muestras con quality.facePresent y quality.confidence
 * @param {Object} headPose — estimación actual de head pose
 * @returns {{ illumination: 'good'|'moderate'|'low', occlusion: boolean, frontal: boolean, overallScore: number }}
 */
export function assessCaptureQuality(recentSamples = [], headPose = null) {
  if (!recentSamples.length) {
    return { illumination: 'low', occlusion: true, frontal: false, overallScore: 0 };
  }

  const presentSamples = recentSamples.filter((s) => s?.quality?.facePresent);
  const confidences = presentSamples.map((s) => s?.quality?.confidence ?? 0);
  const avgConf = confidences.length
    ? confidences.reduce((s, v) => s + v, 0) / confidences.length
    : 0;
  const presenceRatio = presentSamples.length / recentSamples.length;

  // Illumination: confidence correlates with lighting quality
  let illumination;
  if (avgConf >= 0.82) illumination = 'good';
  else if (avgConf >= 0.60) illumination = 'moderate';
  else illumination = 'low';

  // Occlusion heuristic: low presence ratio + decent confidence = partial occlusion
  const occlusion = presenceRatio < 0.6 && avgConf > 0.5;

  // Frontal
  const frontal = headPose ? headPose.confidence >= 0.55 : true;

  // Overall score 0-100
  const overallScore = Math.round(
    (avgConf * 50 + presenceRatio * 30 + (frontal ? 20 : 5)),
  );

  return { illumination, occlusion, frontal, overallScore };
}

// ─── Enhanced AU extraction ───

/**
 * Extrae AUs con confidence weighting.
 * Multiplica la intensidad de cada AU por la confianza de detección.
 */
export function confidenceWeightedAUs(auScores = {}, detectionConfidence = 0.9) {
  const weight = Math.min(1, detectionConfidence / 0.9); // scale: conf 0.9 → weight 1.0
  const result = {};
  for (const [code, au] of Object.entries(auScores)) {
    result[code] = {
      ...au,
      intensity: round((au.intensity ?? 0) * weight),
      rawIntensity: au.intensity ?? 0,
      weight,
    };
  }
  return result;
}

// ─── Blendshape trend detector ───

const TREND_WINDOW = 60; // ~3 seconds at 20fps

/**
 * Detecta tendencias en blendshapes individuales sobre una ventana temporal.
 * Retorna si la tendencia es 'rising', 'falling', o 'stable'.
 */
export function detectBlendshapeTrends(samples = []) {
  if (samples.length < TREND_WINDOW / 2) return {};

  const recentSlice = samples.slice(-TREND_WINDOW);
  const names = new Set();
  for (const s of recentSlice) {
    for (const key of Object.keys(s.blendshapes ?? {})) names.add(key);
  }

  const trends = {};
  for (const name of names) {
    const series = recentSlice.map((s) => s.blendshapes?.[name] ?? 0);
    const firstHalf = series.slice(0, Math.floor(series.length / 2));
    const secondHalf = series.slice(Math.floor(series.length / 2));
    const firstMean = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length;
    const secondMean = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length;
    const diff = secondMean - firstMean;

    if (diff > 0.03) trends[name] = 'rising';
    else if (diff < -0.03) trends[name] = 'falling';
    else trends[name] = 'stable';
  }

  return trends;
}