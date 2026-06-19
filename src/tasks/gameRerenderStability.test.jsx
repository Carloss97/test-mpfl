import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SimpleRTTask from './SimpleRTTask.jsx';
import PrecisionTargetingTask from './PrecisionTargetingTask.jsx';
import PursuitTrackingTask from './PursuitTrackingTask.jsx';
import GoNoGoTask from './GoNoGoTask.jsx';
import ColorInterferenceTask from './ColorInterferenceTask.jsx';
import VisualSearchTask from './VisualSearchTask.jsx';

function TelemetryRerenderHarness({ children }) {
  const [events, setEvents] = React.useState(0);
  return (
    <>
      <span data-testid="rerender-event-count">{events}</span>
      {children(() => setEvents((count) => count + 1))}
    </>
  );
}

function eventCount() {
  return Number(screen.getByTestId('rerender-event-count').textContent);
}

describe('game telemetry re-render stability', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    globalThis.__advanceNow = (value) => { now += value; };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    delete globalThis.__advanceNow;
  });

  it('does not restart Simple RT when telemetry updates re-render the parent', async () => {
    render(
      <TelemetryRerenderHarness>
        {(onGameEvent) => <SimpleRTTask active trialCount={1} onGameEvent={onGameEvent} width={300} height={220} />}
      </TelemetryRerenderHarness>,
    );

    expect(eventCount()).toBe(1);
    await act(async () => {
      globalThis.__advanceNow(250);
      vi.advanceTimersByTime(250);
    });

    expect(eventCount()).toBe(2);
  });

  it('does not restart Precision Targeting when telemetry updates re-render the parent', () => {
    render(
      <TelemetryRerenderHarness>
        {(onGameEvent) => <PrecisionTargetingTask active trialCount={1} onGameEvent={onGameEvent} width={300} height={220} />}
      </TelemetryRerenderHarness>,
    );

    expect(eventCount()).toBe(1);
    expect(screen.getByTestId('precision-task-area')).toBeInTheDocument();
  });

  it('does not restart Pursuit Tracking when telemetry updates re-render the parent', async () => {
    render(
      <TelemetryRerenderHarness>
        {(onGameEvent) => <PursuitTrackingTask active durationMs={1000} onGameEvent={onGameEvent} width={300} height={220} />}
      </TelemetryRerenderHarness>,
    );

    expect(eventCount()).toBe(2);
    const target = screen.getByTestId('pursuit-target');
    const left0 = target.style.left;

    await act(async () => {
      globalThis.__advanceNow(500);
      vi.advanceTimersByTime(500);
    });

    expect(target.style.left).not.toBe(left0);
    expect(eventCount()).toBe(2);
  });

  it('does not restart Go/No-Go and can complete under parent re-renders', async () => {
    render(
      <TelemetryRerenderHarness>
        {(onGameEvent) => <GoNoGoTask active trialCount={2} stimulusMs={80} itiMs={10} onGameEvent={onGameEvent} />}
      </TelemetryRerenderHarness>,
    );

    expect(eventCount()).toBe(2);
    fireEvent.click(screen.getByRole('button', { name: /responder/i }));
    expect(eventCount()).toBe(3);

    await act(async () => {
      globalThis.__advanceNow(20);
      vi.advanceTimersByTime(20);
    });

    expect(screen.getByText('NO-GO')).toBeInTheDocument();

    await act(async () => {
      globalThis.__advanceNow(100);
      vi.advanceTimersByTime(100);
    });

    expect(screen.getByTestId('gonogo-finished')).toBeInTheDocument();
    expect(eventCount()).toBeGreaterThanOrEqual(5);
    expect(eventCount()).toBeLessThan(8);
  });

  it('does not restart Color Interference when telemetry updates re-render the parent', () => {
    render(
      <TelemetryRerenderHarness>
        {(onGameEvent) => <ColorInterferenceTask active trialCount={1} onGameEvent={onGameEvent} />}
      </TelemetryRerenderHarness>,
    );

    expect(eventCount()).toBe(2);
    expect(screen.getByTestId('color-stimulus')).toBeInTheDocument();
  });

  it('does not restart Visual Search when telemetry updates re-render the parent', () => {
    render(
      <TelemetryRerenderHarness>
        {(onGameEvent) => <VisualSearchTask active trialCount={1} onGameEvent={onGameEvent} width={300} height={220} />}
      </TelemetryRerenderHarness>,
    );

    expect(eventCount()).toBe(2);
    expect(screen.getByTestId('visual-search-area')).toBeInTheDocument();
  });
});
