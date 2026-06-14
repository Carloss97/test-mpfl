import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SimpleRTTask from './SimpleRTTask.jsx';

function setupPerformanceNow() {
  let now = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  return { setNow: (value) => { now = value; } };
}

describe('SimpleRTTask rich game telemetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('emits game telemetry in parallel without breaking legacy trial events', async () => {
    const clock = setupPerformanceNow();
    const onTrialStart = vi.fn();
    const onTrialEnd = vi.fn();
    const onGameEvent = vi.fn();

    render(
      <SimpleRTTask
        active
        trialCount={1}
        onTrialStart={onTrialStart}
        onTrialEnd={onTrialEnd}
        onGameEvent={onGameEvent}
        width={600}
        height={400}
      />,
    );

    await act(async () => {
      clock.setNow(1000);
      vi.advanceTimersByTime(250);
    });

    expect(onTrialStart).toHaveBeenCalledWith(expect.objectContaining({ type: 'target_shown', trialId: 'rt-0' }));
    expect(onGameEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'game_event_v1', eventType: 'game_start', gameId: 'simple_rt' }));
    expect(onGameEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'game_event_v1', eventType: 'stimulus_shown', trialId: 'rt-0' }));

    const taskArea = document.querySelector('.task-area');
    expect(taskArea).toBeTruthy();

    fireEvent.pointerMove(taskArea, { clientX: 120, clientY: 100, timeStamp: 1040 });
    fireEvent.pointerMove(taskArea, { clientX: 250, clientY: 180, timeStamp: 1080 });
    fireEvent.pointerMove(taskArea, { clientX: 300, clientY: 200, timeStamp: 1120 });

    await act(async () => {
      clock.setNow(1250);
      fireEvent.click(taskArea, { clientX: 300, clientY: 200 });
    });

    expect(onTrialEnd).toHaveBeenCalledWith(expect.objectContaining({ type: 'target_click', trialId: 'rt-0', correct: true }));
    const responseEvent = onGameEvent.mock.calls.map(([event]) => event).find((event) => event.eventType === 'response');
    expect(responseEvent).toBeTruthy();
    expect(responseEvent.response).toMatchObject({ correct: true, outcome: 'correct', reactionTimeMs: 250, score: 1 });
    expect(responseEvent.response.pointerSummary).toMatchObject({
      sampleCount: expect.any(Number),
      clickDistanceToTargetPx: 0,
      hit: true,
      privacy: { rawPointerPathStored: false, aggregateOnly: true },
    });
    expect(JSON.stringify(responseEvent)).not.toContain('samples');
  });
});
