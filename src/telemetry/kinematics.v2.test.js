import { describe, expect, it } from 'vitest';
import { buildPointerKinematics, summarizePointerTrial } from './kinematics.js';

describe('kinematics v2', () => {
  it('adds jerk, curvature, dwell and correction features while preserving old summary fields', () => {
    const summary = buildPointerKinematics([
      { timestamp: 0, x: 0, y: 0 },
      { timestamp: 10, x: 10, y: 0 },
      { timestamp: 20, x: 20, y: 0 },
      { timestamp: 30, x: 20, y: 10 },
      { timestamp: 40, x: 20, y: 20 },
    ]);

    expect(summary.sampleCount).toBe(5);
    expect(summary.pathEfficiency).toBeGreaterThan(0);
    expect(summary.meanJerkPxPerMs3).toBeGreaterThanOrEqual(0);
    expect(summary.maxJerkPxPerMs3).toBeGreaterThanOrEqual(summary.meanJerkPxPerMs3);
    expect(summary.curvatureRad).toBeGreaterThan(0);
    expect(summary.correctionCount).toBeGreaterThanOrEqual(1);
    expect(summary.dwellTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('summarizes a trial with target-aware click distance and overshoot', () => {
    const samples = [
      { timestamp: 0, x: 0, y: 0 },
      { timestamp: 10, x: 130, y: 0 },
      { timestamp: 20, x: 105, y: 0 },
      { timestamp: 30, x: 100, y: 0 },
    ];

    const trial = summarizePointerTrial(samples, {
      shownAt: 0,
      responseAt: 30,
      target: { x: 100, y: 0, radius: 10 },
      click: { x: 105, y: 0 },
    });

    expect(trial.sampleCount).toBe(4);
    expect(trial.clickDistanceToTargetPx).toBe(5);
    expect(trial.hit).toBe(true);
    expect(trial.overshootCount).toBeGreaterThanOrEqual(1);
    expect(trial.pathEfficiency).toBeLessThan(1);
    expect(trial.privacy.rawPointerPathStored).toBe(false);
    expect(trial.samples).toBeUndefined();
  });
});
