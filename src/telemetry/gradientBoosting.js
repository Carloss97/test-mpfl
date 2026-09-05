/**
 * Gradient Boosting — modelo de boosting para Edge AI
 *
 * Implementa gradient boosting con árboles de regresión (decision stumps)
 * optimizado para features de AUs. Minimiza MSE sobre los scores de los
 * canales del Edge AI.
 *
 * Ventajas sobre Naive Bayes:
 *  - Aprende interacciones no-lineales entre AUs
 *  - Corrige errores secuencialmente (cada árbol corrige al anterior)
 *  - Mejor calibración de scores
 *
 * Ventajas sobre Random Forest:
 *  - Generalmente mejor accuracy con pocos datos
 *  - Los árboles son secuenciales (no independientes) → mejor ajuste
 *
 * Referencia: Friedman, J. H. (2001). Greedy function approximation:
 * a gradient boosting machine. Annals of Statistics, 29(5), 1189-1232.
 */

// ─── Decision Stump (árbol de 1 split) ───

class DecisionStump {
  constructor() {
    this.feature = -1;
    this.threshold = 0;
    this.leftValue = 0;
    this.rightValue = 0;
  }

  fit(X, residuals) {
    const n = X.length;
    if (!n) return 0;

    let bestLoss = Infinity;
    const nFeatures = X[0]?.length || 0;

    // Mean of residuals as baseline
    const meanResidual = residuals.reduce((s, v) => s + v, 0) / n;
    let baselineLoss = residuals.reduce((s, v) => s + (v - meanResidual) ** 2, 0);

    for (let f = 0; f < nFeatures; f++) {
      // Get unique sorted values
      const values = [...new Set(X.map(x => x[f]))].sort((a, b) => a - b);
      for (let i = 0; i < values.length - 1; i++) {
        const threshold = (values[i] + values[i + 1]) / 2;

        let leftSum = 0, leftCount = 0, rightSum = 0, rightCount = 0;
        for (let j = 0; j < n; j++) {
          if (X[j][f] <= threshold) { leftSum += residuals[j]; leftCount++; }
          else { rightSum += residuals[j]; rightCount++; }
        }
        if (!leftCount || !rightCount) continue;

        const leftVal = leftSum / leftCount;
        const rightVal = rightSum / rightCount;

        let loss = 0;
        for (let j = 0; j < n; j++) {
          const pred = X[j][f] <= threshold ? leftVal : rightVal;
          loss += (residuals[j] - pred) ** 2;
        }

        if (loss < bestLoss) {
          bestLoss = loss;
          this.feature = f;
          this.threshold = threshold;
          this.leftValue = leftVal;
          this.rightValue = rightVal;
        }
      }
    }

    this.improvement = baselineLoss - bestLoss;
    return this.improvement > 0 ? this.improvement : 0;
  }

  predict(x) {
    if (this.feature < 0) return 0;
    return x[this.feature] <= this.threshold ? this.leftValue : this.rightValue;
  }
}

// ─── Gradient Boosting Regressor ───

class GradientBoostingRegressor {
  constructor(nEstimators = 20, learningRate = 0.1, maxDepth = 1) {
    this.nEstimators = nEstimators;
    this.learningRate = learningRate;
    this.maxDepth = maxDepth;
    this.trees = [];
    this.initialValue = 0;
    this.trained = false;
    this.trainingLoss = 0;
    this.featureImportance = null;
  }

  fit(X, y, { onProgress } = {}) {
    if (!X.length) return { loss: 0 };
    const n = X.length;
    const nFeatures = X[0]?.length || 0;

    // Initial prediction: mean
    this.initialValue = y.reduce((s, v) => s + v, 0) / n;

    // Residuals
    let residuals = y.map(v => v - this.initialValue);
    this.trees = [];

    // Feature importance tracking
    const featImp = new Array(nFeatures).fill(0);

    for (let t = 0; t < this.nEstimators; t++) {
      const tree = new DecisionStump();
      const improvement = tree.fit(X, residuals);

      if (improvement <= 1e-6) break; // No more improvement

      // Update residuals
      for (let i = 0; i < n; i++) {
        residuals[i] -= this.learningRate * tree.predict(X[i]);
      }

      // Track feature importance
      if (tree.feature >= 0) featImp[tree.feature] += improvement;

      this.trees.push(tree);

      if (onProgress) onProgress({ tree: t + 1, total: this.nEstimators, improvement });
    }

    // Normalize feature importance
    const total = featImp.reduce((s, v) => s + v, 0) || 1;
    this.featureImportance = featImp.map(v => v / total);

    // Training loss (MSE)
    let mse = 0;
    for (let i = 0; i < n; i++) {
      const pred = this.predict(X[i]);
      mse += (y[i] - pred) ** 2;
    }
    this.trainingLoss = mse / n;
    this.trained = true;

    return { loss: this.trainingLoss, nTrees: this.trees.length };
  }

  predict(x) {
    let pred = this.initialValue;
    for (const tree of this.trees) {
      pred += this.learningRate * tree.predict(x);
    }
    return pred;
  }

  predictBatch(X) {
    return X.map(x => this.predict(x));
  }

  toJSON() {
    return {
      nEstimators: this.nEstimators,
      learningRate: this.learningRate,
      initialValue: this.initialValue,
      trained: this.trained,
      trainingLoss: this.trainingLoss,
      featureImportance: this.featureImportance,
      trees: this.trees.map(t => ({
        feature: t.feature, threshold: t.threshold,
        leftValue: t.leftValue, rightValue: t.rightValue,
      })),
    };
  }

  static fromJSON(json) {
    const gb = new GradientBoostingRegressor(json.nEstimators, json.learningRate);
    gb.initialValue = json.initialValue;
    gb.trained = json.trained;
    gb.trainingLoss = json.trainingLoss;
    gb.featureImportance = json.featureImportance;
    gb.trees = json.trees.map(t => {
      const stump = new DecisionStump();
      stump.feature = t.feature;
      stump.threshold = t.threshold;
      stump.leftValue = t.leftValue;
      stump.rightValue = t.rightValue;
      return stump;
    });
    return gb;
  }
}

export { GradientBoostingRegressor, DecisionStump };