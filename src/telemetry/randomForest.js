/**
 * Random Forest — modelo ensemble de árboles de decisión para Edge AI
 *
 * Ventajas sobre regresión logística:
 *  - Maneja features correlacionadas (AUs co-ocurrentes)
 *  - No-lineal: captura interacciones entre AUs
 *  - Robusto a outliers
 *  - Feature importance nativa
 *
 * Implementación simplificada client-side:
 *  - 10 árboles × profundidad 5
 *  - Entrenamiento con bootstrap samples
 *  - Predicción por votación (clasificación) o promedio (regresión)
 *  - < 5KB de weights serializados
 */

// ─── Decision Tree ───

class DecisionTree {
  constructor(maxDepth = 5, minSamplesSplit = 3) {
    this.maxDepth = maxDepth;
    this.minSamplesSplit = minSamplesSplit;
    this.root = null;
  }

  _gini(y) {
    if (!y.length) return 0;
    const counts = {};
    for (const label of y) counts[label] = (counts[label] || 0) + 1;
    let gini = 1;
    for (const c of Object.values(counts)) gini -= (c / y.length) ** 2;
    return gini;
  }

  _bestSplit(X, y) {
    const n = X.length;
    if (n < this.minSamplesSplit) return null;

    let bestGain = 0, bestFeature = -1, bestThreshold = 0;
    const parentGini = this._gini(y);
    const nFeatures = X[0]?.length || 0;

    for (let f = 0; f < nFeatures; f++) {
      const values = X.map((x) => x[f]).sort((a, b) => a - b);
      for (let i = 1; i < values.length; i++) {
        const threshold = (values[i - 1] + values[i]) / 2;
        if (threshold === values[i - 1]) continue;

        const leftY = [], rightY = [];
        for (let j = 0; j < n; j++) {
          (X[j][f] <= threshold ? leftY : rightY).push(y[j]);
        }
        if (!leftY.length || !rightY.length) continue;

        const gain = parentGini - (leftY.length / n) * this._gini(leftY) - (rightY.length / n) * this._gini(rightY);
        if (gain > bestGain) { bestGain = gain; bestFeature = f; bestThreshold = threshold; }
      }
    }

    return bestGain > 0 ? { feature: bestFeature, threshold: bestThreshold } : null;
  }

  _build(X, y, depth = 0) {
    const n = y.length;
    // Majority class
    const counts = {};
    for (const label of y) counts[label] = (counts[label] || 0) + 1;
    let majority = 0, maxCount = 0;
    for (const [label, count] of Object.entries(counts)) {
      if (count > maxCount) { maxCount = count; majority = Number(label); }
    }

    if (depth >= this.maxDepth || n < this.minSamplesSplit || Object.keys(counts).length === 1) {
      return { leaf: true, class: majority, confidence: maxCount / n };
    }

    const split = this._bestSplit(X, y);
    if (!split) return { leaf: true, class: majority, confidence: maxCount / n };

    const leftX = [], leftY = [], rightX = [], rightY = [];
    for (let i = 0; i < n; i++) {
      if (X[i][split.feature] <= split.threshold) { leftX.push(X[i]); leftY.push(y[i]); }
      else { rightX.push(X[i]); rightY.push(y[i]); }
    }

    return {
      leaf: false, feature: split.feature, threshold: split.threshold,
      left: this._build(leftX, leftY, depth + 1),
      right: this._build(rightX, rightY, depth + 1),
    };
  }

  fit(X, y) { this.root = this._build(X, y); return this; }

  predictOne(x) {
    let node = this.root;
    while (node && !node.leaf) {
      node = x[node.feature] <= node.threshold ? node.left : node.right;
    }
    return node || { class: 0, confidence: 0 };
  }
}

// ─── Random Forest ───

class RandomForest {
  constructor(nTrees = 10, maxDepth = 5, maxFeatures = 'sqrt') {
    this.nTrees = nTrees;
    this.maxDepth = maxDepth;
    this.maxFeatures = maxFeatures;
    this.trees = [];
    this.featureImportance = null;
    this.trained = false;
    this.accuracy = 0;
    this.oobScore = 0;
  }

  _bootstrapSample(X, y) {
    const n = X.length;
    const sampleX = [], sampleY = [], oobSet = new Set();
    const used = new Set();

    // Stratified seed: for small edge-local datasets, a pure bootstrap can
    // accidentally drop an entire class from a tree (especially with 2–3
    // samples), making serialization/prediction tests flaky and hurting early
    // calibration. Seed each tree with one example per observed class when the
    // dataset size allows it, then fill the remainder with bootstrap draws.
    const firstIndexByClass = new Map();
    for (let i = 0; i < n; i++) {
      if (!firstIndexByClass.has(y[i])) firstIndexByClass.set(y[i], i);
    }
    for (const idx of firstIndexByClass.values()) {
      if (sampleX.length >= n) break;
      sampleX.push(X[idx]);
      sampleY.push(y[idx]);
      used.add(idx);
    }

    while (sampleX.length < n) {
      const idx = Math.floor(Math.random() * n);
      sampleX.push(X[idx]);
      sampleY.push(y[idx]);
      used.add(idx);
    }
    for (let i = 0; i < n; i++) { if (!used.has(i)) oobSet.add(i); }
    return { X: sampleX, Y: sampleY, oobSet };
  }

  _featureSubset(nFeatures) {
    const maxF = this.maxFeatures === 'sqrt' ? Math.max(2, Math.floor(Math.sqrt(nFeatures))) : Math.min(nFeatures, this.maxFeatures);
    const indices = Array.from({ length: nFeatures }, (_, i) => i);
    // Sample without replacement
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices.slice(0, maxF);
  }

  fit(X, y, { onProgress } = {}) {
    if (!X.length) return { accuracy: 0, oobScore: 0 };
    const nFeatures = X[0].length;
    const nClasses = new Set(y).size;
    this.trees = [];
    const oobPredictions = Array.from({ length: X.length }, () => ({}));

    for (let t = 0; t < this.nTrees; t++) {
      const { X: bootX, Y: bootY, oobSet } = this._bootstrapSample(X, y);
      // Feature subsetting: select subset of features for this tree
      const featSubset = this._featureSubset(nFeatures);
      const subX = bootX.map((x) => featSubset.map((f) => x[f]));

      const tree = new DecisionTree(this.maxDepth);
      tree.fit(subX, bootY.map((label) => label));
      // Store feature subset with tree for prediction
      tree._featSubset = featSubset;
      this.trees.push(tree);

      // OOB predictions
      for (const idx of oobSet) {
        const featX = featSubset.map((f) => X[idx][f]);
        const pred = tree.predictOne(featX);
        const cls = pred.class;
        oobPredictions[idx][cls] = (oobPredictions[idx][cls] || 0) + 1;
      }

      onProgress?.({ tree: t + 1, total: this.nTrees });
    }

    // OOB score
    let oobCorrect = 0, oobTotal = 0;
    for (let i = 0; i < X.length; i++) {
      const votes = oobPredictions[i];
      const entries = Object.entries(votes);
      if (!entries.length) continue;
      const best = entries.reduce((a, b) => (b[1] > a[1] ? b : a), entries[0]);
      if (Number(best[0]) === y[i]) oobCorrect++;
      oobTotal++;
    }
    this.oobScore = oobTotal ? oobCorrect / oobTotal : 0;

    // Training accuracy
    let correct = 0;
    for (let i = 0; i < X.length; i++) {
      const pred = this.predictClass(X[i]);
      if (pred.classIndex === y[i]) correct++;
    }
    this.accuracy = correct / X.length;
    this.trained = true;

    // Feature importance (mean decrease in impurity — simplified: count splits per feature)
    const featCounts = new Array(nFeatures).fill(0);
    for (const tree of this.trees) {
      const countSplits = (node) => {
        if (!node || node.leaf) return;
        const origFeature = tree._featSubset?.[node.feature] ?? node.feature;
        featCounts[origFeature]++;
        countSplits(node.left);
        countSplits(node.right);
      };
      countSplits(tree.root);
    }
    const total = featCounts.reduce((s, v) => s + v, 0) || 1;
    this.featureImportance = featCounts.map((c) => c / total);

    return { accuracy: this.accuracy, oobScore: this.oobScore, nTrees: this.nTrees };
  }

  predictClass(x) {
    if (!this.trees.length) return { classIndex: 0, confidence: 0, probabilities: [] };
    const votes = {};
    for (const tree of this.trees) {
      const featX = tree._featSubset ? tree._featSubset.map((f) => x[f]) : x;
      const pred = tree.predictOne(featX);
      votes[pred.class] = (votes[pred.class] || 0) + 1;
    }
    const entries = Object.entries(votes);
    const best = entries.reduce((a, b) => (b[1] > a[1] ? b : a), entries[0]);
    const total = entries.reduce((s, [, v]) => s + v, 0);
    const probs = new Array(4).fill(0);
    for (const [cls, count] of entries) probs[Number(cls)] = count / total;
    return {
      classIndex: Number(best[0]),
      confidence: Number(best[1]) / total,
      probabilities: probs,
      voteDistribution: Object.fromEntries(entries.map(([k, v]) => [k, v / total])),
    };
  }

  predict(x) {
    const result = this.predictClass(x);
    return result.probabilities;
  }

  toJSON() {
    return {
      nTrees: this.nTrees, maxDepth: this.maxDepth,
      trained: this.trained, accuracy: this.accuracy, oobScore: this.oobScore,
      featureImportance: this.featureImportance,
      trees: this.trees.map((t) => t.root), // serialize only roots
      featSubsets: this.trees.map((t) => t._featSubset),
    };
  }

  static fromJSON(json) {
    const rf = new RandomForest(json.nTrees, json.maxDepth);
    rf.accuracy = json.accuracy;
    rf.oobScore = json.oobScore;
    rf.trained = json.trained;
    rf.featureImportance = json.featureImportance;
    rf.trees = json.trees.map((root, i) => {
      const tree = new DecisionTree(json.maxDepth);
      tree.root = root;
      tree._featSubset = json.featSubsets?.[i];
      return tree;
    });
    return rf;
  }
}

export { RandomForest, DecisionTree };