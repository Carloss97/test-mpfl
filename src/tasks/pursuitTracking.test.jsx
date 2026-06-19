import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PursuitTrackingTask, { buildPursuitPath, summarizePursuitSamples } from './PursuitTrackingTask.jsx';

describe('PursuitTrackingTask helpers', () => {
  it('builds deterministic target path inside the play area', () => {
    const path = buildPursuitPath({ width: 600, height: 400, durationMs: 1000, steps: 5 });

    expect(path).toHaveLength(5);
    expect(path[0]).toMatchObject({ timestamp: 0 });
    expect(path.at(-1).timestamp).toBe(1000);
    expect(path.every((point) => point.x >= 0 && point.x <= 600 && point.y >= 0 && point.y <= 400)).toBe(true);
  });

  it('summarizes good versus poor pursuit tracking', () => {
    const targetPath = [
      { timestamp: 0, x: 100, y: 100 },
      { timestamp: 100, x: 200, y: 100 },
      { timestamp: 200, x: 300, y: 100 },
    ];
    const good = summarizePursuitSamples({ targetPath, pointerSamples: targetPath, hitRadiusPx: 24 });
    const poor = summarizePursuitSamples({
      targetPath,
      pointerSamples: targetPath.map((point) => ({ ...point, y: point.y + 80 })),
      hitRadiusPx: 24,
    });

    expect(good.rmsErrorPx).toBe(0);
    expect(good.smoothPursuitScore).toBe(1);
    expect(good.lossRatio).toBe(0);
    expect(poor.rmsErrorPx).toBeGreaterThan(70);
    expect(poor.smoothPursuitScore).toBeLessThan(good.smoothPursuitScore);
    expect(poor.lossRatio).toBe(1);
  });
});

describe('PursuitTrackingTask', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('animates the target with elapsed time even before pointer movement', async () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);

    render(<PursuitTrackingTask active width={600} height={400} durationMs={1000} />);

    const target = screen.getByTestId('pursuit-target');
    const left0 = target.style.left;

    await act(async () => {
      now = 500;
      vi.advanceTimersByTime(500);
    });

    expect(target.style.left).not.toBe(left0);
    expect(screen.getByText(/punto móvil/i)).toBeInTheDocument();
  });

  it('keeps advancing when telemetry updates re-render the parent and leaves the cursor visible', async () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);

    function ParentHarness() {
      const [events, setEvents] = React.useState(0);
      return (
        <>
          <span data-testid="event-count">{events}</span>
          <PursuitTrackingTask
            active
            width={600}
            height={400}
            durationMs={1000}
            onGameEvent={() => setEvents((count) => count + 1)}
          />
        </>
      );
    }

    render(<ParentHarness />);

    const area = screen.getByTestId('pursuit-task-area');
    const target = screen.getByTestId('pursuit-target');
    const left0 = target.style.left;
    expect(area.style.cursor).not.toBe('none');

    await act(async () => {
      now = 500;
      vi.advanceTimersByTime(500);
    });

    expect(Number(screen.getByTestId('event-count').textContent)).toBeGreaterThan(0);
    expect(target.style.left).not.toBe(left0);

    await act(async () => {
      now = 1100;
      vi.advanceTimersByTime(700);
    });

    expect(screen.getByTestId('pursuit-finished')).toBeInTheDocument();
  });

  it('emits privacy-safe pursuit telemetry at completion using trial-relative timestamps', async () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const onGameEvent = vi.fn();
    const onComplete = vi.fn();

    render(
      <PursuitTrackingTask
        active
        width={600}
        height={400}
        durationMs={300}
        onGameEvent={onGameEvent}
        onComplete={onComplete}
      />,
    );

    expect(onGameEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'game_start', gameId: 'pursuit_tracking' }));
    expect(onGameEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'stimulus_shown', trialId: 'pursuit-0' }));

    const area = screen.getByTestId('pursuit-task-area');
    now = 0;
    fireEvent.pointerMove(area, { clientX: 100, clientY: 100 });
    now = 150;
    fireEvent.pointerMove(area, { clientX: 220, clientY: 130 });
    now = 300;
    fireEvent.pointerMove(area, { clientX: 360, clientY: 160 });

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    const responseEvent = onGameEvent.mock.calls.map(([event]) => event).find((event) => event.eventType === 'response');
    expect(responseEvent).toBeTruthy();
    expect(responseEvent.response.tracking).toMatchObject({
      rmsErrorPx: expect.any(Number),
      lossRatio: expect.any(Number),
      smoothPursuitScore: expect.any(Number),
      privacy: { rawPointerPathStored: false, aggregateOnly: true },
    });
    expect(JSON.stringify(responseEvent)).not.toContain('samples');
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ gameId: 'pursuit_tracking', totalTrials: 1 }));
  });
});
