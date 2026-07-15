import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import VisualSearchTask, {
  buildVisualSearchGridMetrics,
  buildVisualSearchTilePresentation,
  buildVisualSearchTrials,
  summarizeVisualSearchResults,
} from './VisualSearchTask.jsx';

describe('VisualSearchTask helpers', () => {
  it('builds trials with one target among distractors and increasing set sizes', () => {
    const trials = buildVisualSearchTrials({ width: 600, height: 400, count: 3 });

    expect(trials).toHaveLength(3);
    expect(trials[0].items.filter((item) => item.isTarget)).toHaveLength(1);
    expect(trials[1].items.length).toBeGreaterThan(trials[0].items.length);
    expect(trials.every((trial) => trial.items.every((item) => item.x >= 0 && item.x <= 600 && item.y >= 0 && item.y <= 400))).toBe(true);
  });

  it('computes responsive visual-search grid metrics for compact viewports', () => {
    expect(buildVisualSearchGridMetrics({ width: 360, height: 240, setSize: 8 })).toMatchObject({
      cols: 4,
      rows: 2,
      tileSize: 42,
      compact: true,
    });

    expect(buildVisualSearchGridMetrics({ width: 720, height: 460, setSize: 16 })).toMatchObject({
      cols: expect.any(Number),
      rows: expect.any(Number),
      compact: false,
    });
  });

  it('builds target and distractor tile presentation with explicit affordance classes', () => {
    expect(buildVisualSearchTilePresentation({ isTarget: true, symbol: '●' })).toMatchObject({
      className: expect.stringContaining('visual-search-task__tile--target'),
      ariaLabel: 'Objetivo: punto sólido',
      label: '●',
      visualTone: 'neutral',
      preSelectionHighlight: false,
    });
    expect(buildVisualSearchTilePresentation({ isTarget: false, symbol: '◇' })).toMatchObject({
      className: expect.stringContaining('visual-search-task__tile--distractor'),
      ariaLabel: 'Distractor: forma geométrica',
      label: '◇',
    });
  });

  it('does not reveal the correct target through container color or preselection styling', () => {
    const [trial] = buildVisualSearchTrials({ width: 600, height: 400, count: 1 });
    const target = trial.items.find((item) => item.isTarget);
    const distractor = trial.items.find((item) => !item.isTarget);

    expect(target.color).toBe(distractor.color);
    expect(target.containerTone).toBe('neutral');
    expect(target.preSelectionHighlight).toBe(false);
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

  it('renders visual search as a high-contrast active panel with responsive tiles', () => {
    render(<VisualSearchTask active trialCount={1} width={360} height={240} onGameEvent={vi.fn()} onComplete={vi.fn()} />);

    expect(screen.getByText(/Panel de búsqueda activa/i)).toBeInTheDocument();
    expect(screen.getByText(/Objetivo: punto sólido/i)).toBeInTheDocument();
    const target = screen.getByRole('button', { name: /Objetivo: punto sólido/i });
    expect(target).toHaveClass('visual-search-task__tile');
    expect(target).toHaveClass('visual-search-task__tile--target');
    expect(target).toHaveAttribute('data-preselection-highlight', 'false');
    expect(target.style.width).toBe('42px');
  });
});
