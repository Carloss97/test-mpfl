import { describe, expect, it } from 'vitest';
import { RandomForest, DecisionTree } from './randomForest.js';

describe('DecisionTree', () => {
  it('trains on simple separable data', () => {
    const X = [[0, 0], [0, 1], [1, 0], [1, 1]];
    const y = [0, 0, 1, 1];
    const tree = new DecisionTree(3);
    tree.fit(X, y);
    expect(tree.root).toBeDefined();
    const pred = tree.predictOne([1, 1]);
    expect(pred.class).toBe(1);
    expect(pred.confidence).toBeGreaterThan(0.5);
  });

  it('returns majority class for uniform data', () => {
    const X = [[0.1], [0.2], [0.3]];
    const y = [1, 1, 1];
    const tree = new DecisionTree(3);
    tree.fit(X, y);
    const pred = tree.predictOne([0.5]);
    expect(pred.class).toBe(1);
    expect(pred.confidence).toBe(1);
  });
});

describe('RandomForest', () => {
  it('trains on synthetic 4-class data', () => {
    const X = [
      [0.8, 0.1, 0.1], [0.9, 0.1, 0.2], [0.7, 0.2, 0.1], // class 0
      [0.2, 0.8, 0.2], [0.1, 0.9, 0.1], [0.3, 0.7, 0.3], // class 1
      [0.1, 0.1, 0.9], [0.2, 0.2, 0.8], [0.1, 0.3, 0.7], // class 2
      [0.5, 0.5, 0.5], [0.4, 0.6, 0.4], [0.6, 0.4, 0.6], // class 3
    ];
    const y = [0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3];
    const rf = new RandomForest(5, 4);
    const result = rf.fit(X, y);
    expect(result.accuracy).toBeGreaterThan(0.6);
    expect(rf.trained).toBe(true);
    expect(rf.featureImportance).toBeDefined();
    expect(rf.featureImportance.length).toBe(3);
  });

  it('predicts correct class for known sample', () => {
    const X = [[0.9, 0.1], [0.1, 0.9], [0.85, 0.15]];
    const y = [0, 1, 0];
    const rf = new RandomForest(5, 3);
    rf.fit(X, y);
    const pred = rf.predictClass([0.9, 0.1]);
    expect(pred.classIndex).toBe(0);
    expect(pred.confidence).toBeGreaterThan(0.5);
  });

  it('serializes and deserializes', () => {
    const X = [[0.8, 0.2], [0.2, 0.8]];
    const y = [0, 1];
    const rf = new RandomForest(3, 3);
    rf.fit(X, y);
    const json = rf.toJSON();
    expect(json.trees.length).toBe(3);
    const restored = RandomForest.fromJSON(json);
    expect(restored.trained).toBe(true);
    const pred = restored.predictClass([0.9, 0.1]);
    expect(pred.classIndex).toBe(0);
  });
});