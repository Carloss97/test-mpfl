import { describe, expect, it } from 'vitest';
import { buildPointerKinematics, normalizePointerSample } from './kinematics.js';

describe('normalizePointerSample', () => {
  it('keeps only timestamp and coordinates from a raw pointer event', () => {
    const raw = {
      clientX: 120,
      clientY: 64,
      screenX: 999,
      screenY: 888,
      pressure: 0.5,
      timeStamp: 321.5,
      target: { id: 'danger:dom-node' },
    };

    expect(normalizePointerSample(raw)).toEqual({
      timestamp: 321.5,
      x: 120,
      y: 64,
    });
  });
});

describe('buildPointerKinematics', () => {
  it('summarizes speed, acceleration, and straight-path efficiency without retaining raw samples', () => {
    const summary = buildPointerKinematics([
      { timestamp: 0, x: 0, y: 0 },
      { timestamp: 16, x: 16, y: 0 },
      { timestamp: 32, x: 40, y: 0 },
    ]);

    expect(summary).toMatchObject({
      sampleCount: 3,
      durationMs: 32,
      totalDistancePx: 40,
      straightLineDistancePx: 40,
      pathEfficiency: 1,
      meanSpeedPxPerMs: 1.25,
      maxSpeedPxPerMs: 1.5,
      meanAccelerationPxPerMs2: 0.03125,
      maxAccelerationPxPerMs2: 0.03125,
      deviationRmsPx: 0,
    });
    expect(summary).not.toHaveProperty('samples');
  });

  it('captures trajectory deviation for over-corrected mouse movement', () => {
    const summary = buildPointerKinematics([
      { timestamp: 0, x: 0, y: 0 },
      { timestamp: 16, x: 10, y: 10 },
      { timestamp: 32, x: 20, y: 0 },
    ]);

    expect(summary.totalDistancePx).toBeCloseTo(28.2843, 4);
    expect(summary.straightLineDistancePx).toBe(20);
    expect(summary.pathEfficiency).toBeCloseTo(0.7071, 4);
    expect(summary.deviationRmsPx).toBeCloseTo(5.7735, 4);
  });

  it('returns a safe empty summary when fewer than two samples are available', () => {
    expect(buildPointerKinematics([{ timestamp: 100, x: 10, y: 5 }])).toMatchObject({
      sampleCount: 1,
      durationMs: 0,
      totalDistancePx: 0,
      straightLineDistancePx: 0,
      pathEfficiency: 0,
      meanSpeedPxPerMs: 0,
      maxSpeedPxPerMs: 0,
      meanAccelerationPxPerMs2: 0,
      maxAccelerationPxPerMs2: 0,
      deviationRmsPx: 0,
    });
  });
});
