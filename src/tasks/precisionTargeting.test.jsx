import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PrecisionTargetingTask, { buildPrecisionTrials, computeFittsIndex } from './PrecisionTargetingTask.jsx';

describe('PrecisionTargetingTask helpers', () => {
  it('computes Fitts index of difficulty from distance and target width', () => {
    expect(computeFittsIndex({ distancePx: 300, targetWidthPx: 60 })).toBeCloseTo(2.585, 3);
    expect(computeFittsIndex({ distancePx: 0, targetWidthPx: 60 })).toBe(0);
  });

  it('builds deterministic trials with varying distance, size and difficulty', () => {
    const trials = buildPrecisionTrials({ width: 600, height: 400, count: 4 });

    expect(trials).toHaveLength(4);
    expect(new Set(trials.map((trial) => trial.target.radius)).size).toBeGreaterThan(1);
    expect(trials.every((trial) => trial.fittsId >= 0)).toBe(true);
    expect(trials[0]).toMatchObject({ trialId: 'precision-0', targetId: 'precision-target-0' });
  });
});

describe('PrecisionTargetingTask', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('emits rich game telemetry and completion summary for a hit trial', async () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const onGameEvent = vi.fn();
    const onComplete = vi.fn();

    render(
      <PrecisionTargetingTask
        active
        trialCount={1}
        width={600}
        height={400}
        onGameEvent={onGameEvent}
        onComplete={onComplete}
      />,
    );

    const target = screen.getByTestId('precision-target');
    expect(onGameEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'game_start', gameId: 'precision_targeting' }));
    expect(onGameEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'stimulus_shown', trialId: 'precision-0' }));

    const taskArea = screen.getByTestId('precision-task-area');
    fireEvent.pointerMove(taskArea, { clientX: 120, clientY: 100, timeStamp: 50 });
    fireEvent.pointerMove(taskArea, { clientX: 300, clientY: 200, timeStamp: 120 });

    const x = Number(target.dataset.x);
    const y = Number(target.dataset.y);
    await act(async () => {
      now = 300;
      fireEvent.click(taskArea, { clientX: x, clientY: y });
      vi.runOnlyPendingTimers();
    });

    const responseEvent = onGameEvent.mock.calls.map(([event]) => event).find((event) => event.eventType === 'response');
    expect(responseEvent).toBeTruthy();
    expect(responseEvent.response).toMatchObject({ correct: true, outcome: 'hit', score: 1 });
    expect(responseEvent.response.fitts).toMatchObject({ distancePx: expect.any(Number), targetWidthPx: expect.any(Number), indexDifficulty: expect.any(Number), throughput: expect.any(Number) });
    expect(responseEvent.response.pointerSummary.privacy.rawPointerPathStored).toBe(false);
    expect(JSON.stringify(responseEvent)).not.toContain('samples');

    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ totalTrials: 1, accuracy: 1, meanScore: 1 }));
  });
});
