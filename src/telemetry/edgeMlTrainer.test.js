import { describe, expect, it } from 'vitest';
import { LogisticRegression, buildMLFeatures, buildMLLabels, accumulateSession, trainFromBuffer, getBufferSize, clearBuffer } from './edgeMlTrainer.js';

describe('LogisticRegression', () => {
  it('initializes with random weights', () => {
    const model = new LogisticRegression(5, 3);
    expect(model.weights.length).toBe(3);
    expect(model.weights[0].length).toBe(6); // nFeatures + bias
    expect(model.trained).toBe(false);
  });

  it('predicts probabilities in [0,1]', () => {
    const model = new LogisticRegression(5, 2);
    // Set known small weights
    model.weights = [[0.1, 0.2, 0.1, 0.1, 0.1, 0.0], [0.1, 0.1, 0.2, 0.1, 0.1, 0.0]];
    const probs = model.predict([0.1, 0.2, 0.3, 0.4, 0.5]);
    expect(probs.length).toBe(2);
    for (const p of probs) {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });

  it('trains on synthetic data and improves', () => {
    const model = new LogisticRegression(3, 2);
    // Synthetic separable data
    const X = [
      [0.8, 0.7, 0.1], [0.9, 0.6, 0.2], [0.7, 0.8, 0.1],
      [0.1, 0.2, 0.8], [0.2, 0.1, 0.9], [0.1, 0.3, 0.7],
    ];
    const Y = [
      [1, 0], [1, 0], [1, 0],
      [0, 1], [0, 1], [0, 1],
    ];
    const result = model.train(X, Y, { maxIter: 100 });
    expect(result.accuracy).toBeGreaterThan(0.5);
    expect(model.trained).toBe(true);

    // Predict on training data
    const pred = model.predictClass(X[0]);
    expect(pred.classIndex).toBe(0);
    expect(pred.confidence).toBeGreaterThan(0.5);
  });

  it('serializes and deserializes', () => {
    const model = new LogisticRegression(3, 2);
    model.train(
      [[0.8, 0.1, 0.3], [0.2, 0.9, 0.7]],
      [[1, 0], [0, 1]],
      { maxIter: 50 },
    );
    const json = model.toJSON();
    const restored = LogisticRegression.fromJSON(json);
    expect(restored.nFeatures).toBe(3);
    expect(restored.trained).toBe(true);
  });
});

describe('buildMLFeatures', () => {
  it('builds normalized feature vector from session data', () => {
    const aus = { AU4: { intensity: 0.5 }, AU12: { intensity: 0.3 } };
    const mg = { browTension: { mean: 0.2 }, jawActivation: { mean: 0.1 } };
    const edge = { featureExtraction: { usableFacialSamples: 50, facialSampleCount: 60 } };
    const features = buildMLFeatures(edge, aus, mg, { yaw: 0.1, pitch: -0.05, roll: 0 });
    expect(features.length).toBeGreaterThanOrEqual(40);
    for (const f of features) {
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThanOrEqual(1);
    }
  });
});

describe('training buffer', () => {
  it('accumulates and trains', () => {
    clearBuffer();
    expect(getBufferSize()).toBe(0);

    const aus = { AU4: { intensity: 0.3 }, AU12: { intensity: 0.6 } };
    const mg = { browTension: { mean: 0.1 } };
    const edge = {
      channels: { engagement: { score: 80 }, fatigueIndex: { score: 20 }, stressResponse: { score: 30 }, cognitiveLoad: { score: 40 } },
      featureExtraction: { usableFacialSamples: 10, facialSampleCount: 10 },
    };
    accumulateSession(edge, aus, mg, null);
    accumulateSession(edge, aus, mg, null);
    accumulateSession(edge, aus, mg, null);
    expect(getBufferSize()).toBe(3);

    const { model, accuracy } = trainFromBuffer();
    expect(model.trained).toBe(true);
    // With 3 identical samples, accuracy should be ~1.0
    expect(accuracy).toBeGreaterThanOrEqual(0.9);
  });
});