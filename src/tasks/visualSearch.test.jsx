import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import VisualSearchTask, { buildVisualSearchTrials, summarizeVisualSearchResults } from './VisualSearchTask.jsx';

describe('VisualSearchTask helpers', () => {
  it('builds trials with one target among distractors and increasing set sizes', () => {
    const trials = buildVisualSearchTrials({ width: 600, height: 400, count: 3 });

    expect(trials).toHaveLength(3);
    expect(trials[0].items.filter((item) => item.isTarget)).toHaveLength(1);
    expect(trials[1].items.length).toBeGreaterThan(trials[0].items.length);
    expect(trials.every((trial) => trial.items.every((item) => item.x >= 0 && item.x <= 600 && item.y >= 0 && item.y <= 400))).toBe(true);
  });

  it('summarizes visual search accuracy, RT and search efficiency', () => {
    const summary = summarizeVisualSearchResults([
      { correct: true, reactionTimeMs: 800, setSize: 8, distractorCount: 7, clickDistanceToTargetPx: 4 },
      { correct: false, reactionTimeMs: 1200, setSize: 12, distractorCount: 11, clickDistanceToTargetPx: 80 },
    ]);

    expect(summary).toMatchObject({ totalTrials: 2, accuracy: 0.5, meanRT: 1000, meanSetSize: 10, meanDistractorCount: 9 });
    expect(summary.searchEfficiency).toBeGreaterThan(0);
    expect(summary.errorRate).toBe(0.5);
  });
});

describe('VisualSearchTask', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('emits privacy-safe visual search telemetry on target hit', async () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const onGameEvent = vi.fn();
    const onComplete = vi.fn();

    render(<VisualSearchTask active trialCount={1} width={600} height={400} onGameEvent={onGameEvent} onComplete={onComplete} />);

    expect(screen.getByText(/Búsqueda visual/i)).toBeInTheDocument();
    expect(onGameEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'game_start', gameId: 'visual_search' }));
    expect(onGameEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'stimulus_shown', trialId: 'visual-search-0' }));

    const target = screen.getByTestId('visual-search-target');
    const x = Number(target.dataset.x);
    const y = Number(target.dataset.y);

    await act(async () => {
      now = 850;
      fireEvent.click(target, { clientX: x, clientY: y });
      vi.runOnlyPendingTimers();
    });

    const responseEvent = onGameEvent.mock.calls.map(([event]) => event).find((event) => event.eventType === 'response');
    expect(responseEvent).toBeTruthy();
    expect(responseEvent.response).toMatchObject({ correct: true, outcome: 'target_found', reactionTimeMs: 850, score: expect.any(Number) });
    expect(responseEvent.response.visualSearch).toMatchObject({ setSize: expect.any(Number), distractorCount: expect.any(Number), searchEfficiency: expect.any(Number) });
    expect(JSON.stringify(responseEvent)).not.toContain('items');
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ gameId: 'visual_search', totalTrials: 1, accuracy: 1 }));
  });
});
