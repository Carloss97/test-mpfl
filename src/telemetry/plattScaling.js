/**
 * Platt Scaling — Calibración de confianza para el modelo ML
 *
 * Ajusta las probabilidades crudas de salida del modelo para que
 * reflejen mejor la probabilidad real de acierto. Sin Platt scaling,
 * un modelo puede decir "90% confidence" pero acertar solo 70% de
 * las veces.
 *
 * Implementa el algoritmo de Platt (1999):
 *   P(y=1|f) = 1 / (1 + exp(A * f + B))
 * Donde f es el score crudo y A,B se ajustan con gradient descent
 * usando los outcomes reales como ground truth.
 *
 * Corre 100% client-side sin dependencias.
 */

let plattA = 0;
let plattB = 0;
let plattHistory = [];
const PLATT_MAX_HISTORY = 100;

function sigmoid(x) {
  if (x > 20) return 1;
  if (x < -20) return 0;
  return 1 / (1 + Math.exp(-x));
}

/**
 * Registra una predicción y su outcome real para ajustar la calibración.
 *
 * @param {number} rawConfidence — confianza cruda del modelo [0,1]
 * @param {number} wasCorrect — 1 si acertó, 0 si no
 * @param {number} [learningRate=0.01]
 */
export function recordPlattPair(rawConfidence, wasCorrect, learningRate = 0.01) {
  plattHistory.push({ f: rawConfidence, y: wasCorrect });
  while (plattHistory.length > PLATT_MAX_HISTORY) plattHistory.shift();

  // Gradient descent: minimize cross-entropy loss
  if (plattHistory.length < 5) return { A: plattA, B: plattB, calibrated: rawConfidence };

  const n = plattHistory.length;
  let gradA = 0, gradB = 0;

  for (const { f, y } of plattHistory) {
    const z = plattA * f + plattB;
    const p = sigmoid(z);
    gradA += (y - p) * f;
    gradB += (y - p);
  }

  gradA /= n;
  gradB /= n;

  // Normalize gradient
  const gradMag = Math.sqrt(gradA * gradA + gradB * gradB);
  if (gradMag > 0) {
    const scale = Math.min(1, learningRate / gradMag);
    plattA += scale * gradA;
    plattB += scale * gradB;
  }

  return {
    A: Number(plattA.toFixed(4)),
    B: Number(plattB.toFixed(4)),
    calibrated: Number(sigmoid(plattA * rawConfidence + plattB).toFixed(4)),
  };
}

/**
 * Calibra una confianza usando los parámetros actuales de Platt.
 */
export function calibrateConfidence(rawConfidence) {
  if (plattHistory.length < 5) return rawConfidence;
  return Number(sigmoid(plattA * rawConfidence + plattB).toFixed(4));
}

/**
 * Evalúa la calibración actual: Expected Calibration Error (ECE).
 */
export function calibrationError() {
  if (plattHistory.length < 10) return { ece: 0, n: plattHistory.length };

  const bins = 10;
  const binSize = 1 / bins;
  const binAcc = new Array(bins).fill(0);
  const binConf = new Array(bins).fill(0);
  const binCount = new Array(bins).fill(0);

  for (const { f, y } of plattHistory) {
    const cal = calibrateConfidence(f);
    const bin = Math.min(bins - 1, Math.floor(cal / binSize));
    binAcc[bin] += y;
    binConf[bin] += cal;
    binCount[bin]++;
  }

  let ece = 0;
  for (let i = 0; i < bins; i++) {
    if (binCount[i] > 0) {
      ece += (binCount[i] / plattHistory.length) * Math.abs(binAcc[i] / binCount[i] - binConf[i] / binCount[i]);
    }
  }

  return { ece: Number(ece.toFixed(4)), n: plattHistory.length };
}

export function resetPlatt() {
  plattA = 0; plattB = 0;
  plattHistory = [];
}