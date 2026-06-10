/**
 * Edge ML Trainer — modelo de regresión logística liviano
 *
 * Entrena on-line con datos de sesiones acumuladas para predecir
 * estados cognitivos (attention, fatigue, stress, engagement).
 *
 * Usa solo operaciones vectorizadas con arrays nativos — sin
 * dependencias externas. Corre 100% client-side.
 *
 * Features de entrada (normalizadas 0-1):
 *  - 30 intensidades de AUs
 *  - 10 microgesture groups
 *  - Head pose (yaw, pitch, roll)
 *  - Blink rate
 *  - Face presence ratio
 *  Total: ~46 features
 *
 * Labels (multi-output, cada uno 0-1):
 *  - attention_level
 *  - fatigue_level
 *  - stress_level
 *  - engagement_level
 */

const LEARNING_RATE = 0.01;
const REGULARIZATION = 0.001;
const MAX_ITERATIONS = 200;

function sigmoid(z) {
  if (z > 20) return 1;
  if (z < -20) return 0;
  return 1 / (1 + Math.exp(-z));
}

function dot(a, b) {
  let s = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) s += a[i] * b[i];
  return s;
}

class LogisticRegression {
  constructor(nFeatures, nOutputs = 4) {
    this.nFeatures = nFeatures;
    this.nOutputs = nOutputs;
    // weights: [nOutputs][nFeatures + 1] (last is bias)
    this.weights = Array.from({ length: nOutputs }, () =>
      Array.from({ length: nFeatures + 1 }, () => (Math.random() - 0.5) * 0.1),
    );
    this.trained = false;
    this.trainingLoss = 0;
    this.accuracy = 0;
  }

  predict(features) {
    if (features.length !== this.nFeatures) {
      throw new Error(`Expected ${this.nFeatures} features, got ${features.length}`);
    }
    return this.weights.map((w) => {
      const z = dot(w, features) + w[this.nFeatures]; // bias
      return sigmoid(z);
    });
  }

  predictClass(features) {
    const probs = this.predict(features);
    // Return class index + confidence
    let maxIdx = 0, maxVal = probs[0];
    for (let i = 1; i < probs.length; i++) {
      if (probs[i] > maxVal) { maxVal = probs[i]; maxIdx = i; }
    }
    return { classIndex: maxIdx, confidence: maxVal, probabilities: probs };
  }

  train(X, Y, options = {}) {
    const { learningRate = LEARNING_RATE, maxIter = MAX_ITERATIONS, lambda = REGULARIZATION } = options;
    const n = X.length;
    if (!n) return { loss: 0, accuracy: 0 };

    let totalLoss = 0;
    const shuffled = Array.from({ length: n }, (_, i) => i);
    // Simple shuffle
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    for (let iter = 0; iter < maxIter; iter++) {
      let iterLoss = 0;
      for (const idx of shuffled) {
        const x = X[idx];
        const y = Y[idx];
        for (let o = 0; o < this.nOutputs; o++) {
          const w = this.weights[o];
          const z = dot(w, x) + w[this.nFeatures];
          const h = sigmoid(z);
          const error = h - y[o];
          // Gradient descent
          for (let f = 0; f < this.nFeatures; f++) {
            w[f] -= learningRate * (error * x[f] + lambda * w[f]);
          }
          w[this.nFeatures] -= learningRate * error; // bias
          iterLoss += error * error;
        }
      }
      totalLoss = iterLoss / (n * this.nOutputs);
    }

    // Compute accuracy on training set
    let correct = 0;
    for (let i = 0; i < n; i++) {
      const pred = this.predictClass(X[i]);
      const trueClass = Y[i].indexOf(Math.max(...Y[i]));
      if (pred.classIndex === trueClass) correct++;
    }

    this.trained = true;
    this.trainingLoss = totalLoss;
    this.accuracy = correct / n;

    return { loss: totalLoss, accuracy: this.accuracy };
  }

  toJSON() {
    return {
      nFeatures: this.nFeatures,
      nOutputs: this.nOutputs,
      weights: this.weights,
      trained: this.trained,
      trainingLoss: this.trainingLoss,
      accuracy: this.accuracy,
    };
  }

  static fromJSON(json) {
    const model = new LogisticRegression(json.nFeatures, json.nOutputs);
    model.weights = json.weights;
    model.trained = json.trained;
    model.trainingLoss = json.trainingLoss;
    model.accuracy = json.accuracy;
    return model;
  }
}

// ─── Feature builder from session data ───

/**
 * Construye un vector de features normalizado desde los datos de una sesión.
 */
export function buildMLFeatures(edgeAIResult, auScores = {}, microgestureGroups = {}, headPose = null) {
  const features = [];

  // 30 AU intensities
  const auCodes = Object.keys(auScores).sort();
  for (const code of auCodes) {
    features.push(auScores[code]?.intensity ?? 0);
  }
  // Pad to 30 if fewer
  while (features.length < 30) features.push(0);

  // 10 microgesture groups (mean)
  const mgKeys = Object.keys(microgestureGroups).sort();
  for (const key of mgKeys) {
    features.push(microgestureGroups[key]?.mean ?? 0);
  }
  while (features.length < 40) features.push(0);

  // Head pose
  features.push(headPose?.yaw ?? 0);
  features.push(headPose?.pitch ?? 0);
  features.push(headPose?.roll ?? 0);

  // Blink rate
  const blink = auScores?.AU45?.intensity ?? 0;
  features.push(blink);

  // Face presence
  features.push(edgeAIResult?.featureExtraction?.usableFacialSamples
    ? (edgeAIResult.featureExtraction.usableFacialSamples / Math.max(1, edgeAIResult.featureExtraction.facialSampleCount))
    : 0);

  // Normalize: clamp all to [0,1]
  return features.map((v) => Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0)));
}

/**
 * Construye labels desde los canales del edge AI engine.
 * Cada label es un vector de 4 valores [attention, fatigue, stress, engagement]
 */
export function buildMLLabels(edgeAIResult) {
  const ch = edgeAIResult?.channels ?? {};
  return [
    (ch.engagement?.score ?? 50) / 100,
    (ch.fatigueIndex?.score ?? 50) / 100,
    (ch.stressResponse?.score ?? 50) / 100,
    (ch.cognitiveLoad?.score ?? 50) / 100,
  ];
}

// ─── Session accumulator ───

const trainingBuffer = { X: [], Y: [] };
const MAX_BUFFER_SIZE = 200;

/**
 * Acumula una sesión en el buffer de entrenamiento.
 */
export function accumulateSession(edgeAIResult, auScores, microgestureGroups, headPose) {
  const x = buildMLFeatures(edgeAIResult, auScores, microgestureGroups, headPose);
  const y = buildMLLabels(edgeAIResult);

  trainingBuffer.X.push(x);
  trainingBuffer.Y.push(y);

  // Keep buffer bounded
  while (trainingBuffer.X.length > MAX_BUFFER_SIZE) {
    trainingBuffer.X.shift();
    trainingBuffer.Y.shift();
  }
}

/**
 * Entrena (o re-entrena) el modelo con el buffer acumulado.
 */
export function trainFromBuffer() {
  const model = new LogisticRegression(
    trainingBuffer.X[0]?.length || 46,
    4,
  );
  const result = model.train(trainingBuffer.X, trainingBuffer.Y);
  return { model, ...result };
}

export function getBufferSize() { return trainingBuffer.X.length; }
export function clearBuffer() { trainingBuffer.X = []; trainingBuffer.Y = []; }

export { LogisticRegression };