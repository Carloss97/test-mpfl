import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ColorInterferenceTask, {
  buildColorInterferenceTrials,
  classifyStimulusWordLength,
  scoreColorInterferenceResponse,
  summarizeColorInterferenceResults,
} from './ColorInterferenceTask.jsx';

describe('ColorInterferenceTask helpers', () => {
  it('builds deterministic congruent and incongruent trials', () => {
    const trials = buildColorInterferenceTrials({ count: 4 });

    expect(trials).toHaveLength(4);
    expect(trials.some((trial) => trial.congruent)).toBe(true);
    expect(trials.some((trial) => !trial.congruent)).toBe(true);
    expect(trials[0]).toMatchObject({ trialId: 'color-0', targetId: 'color-stimulus-0', expectedResponse: expect.any(String) });
  });

  it('classifies long Spanish color words for responsive fit', () => {
    expect(classifyStimulusWordLength('ROJO')).toBe('normal-word');
    expect(classifyStimulusWordLength('AMARILLO')).toBe('long-word');
  });

  it('scores correct/incorrect responses and computes conflict cost', () => {
    const congruent = { trialId: 'c', word: 'ROJO', ink: 'red', expectedResponse: 'red', congruent: true };
    const incongruent = { trialId: 'i', word: 'AMARILLO', ink: 'green', expectedResponse: 'green', congruent: false };

    expect(scoreColorInterferenceResponse({ trial: congruent, response: 'red', shownAt: 100, timestamp: 300 })).toMatchObject({ correct: true, outcome: 'correct', reactionTimeMs: 200, score: 1 });
    expect(scoreColorInterferenceResponse({ trial: incongruent, response: 'yellow', shownAt: 100, timestamp: 420 })).toMatchObject({ correct: false, outcome: 'incorrect', reactionTimeMs: 320, score: 0 });

    const summary = summarizeColorInterferenceResults([
      scoreColorInterferenceResponse({ trial: congruent, response: 'red', shownAt: 0, timestamp: 200 }),
      scoreColorInterferenceResponse({ trial: incongruent, response: 'green', shownAt: 0, timestamp: 380 }),
    ]);
    expect(summary).toMatchObject({ totalTrials: 2, accuracy: 1, congruentAccuracy: 1, incongruentAccuracy: 1, conflictCostMs: 180 });
  });
});

describe('ColorInterferenceTask', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('emits normalized telemetry and summary for color-word responses', async () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const onGameEvent = vi.fn();
    const onComplete = vi.fn();

    render(
      <ColorInterferenceTask
        active
        trialCount={2}
        itiMs={20}
        onGameEvent={onGameEvent}
        onComplete={onComplete}
      />,
    );

    expect(onGameEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'game_start', gameId: 'color_interference' }));
    expect(onGameEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'stimulus_shown', trialId: 'color-0' }));

    await act(async () => {
      now = 250;
      fireEvent.click(screen.getByRole('button', { name: /rojo/i }));
      vi.advanceTimersByTime(25);
    });

    expect(screen.getByTestId('color-stimulus')).toHaveClass('long-word');

    await act(async () => {
      now = 620;
      fireEvent.click(screen.getByRole('button', { name: /verde/i }));
      vi.advanceTimersByTime(25);
    });

    const responses = onGameEvent.mock.calls.map(([event]) => event).filter((event) => event.eventType === 'response');
    expect(responses).toHaveLength(2);
    expect(responses[0].response).toMatchObject({ correct: true, outcome: 'correct', score: 1 });
    expect(responses[1].response).toMatchObject({ correct: true, outcome: 'correct', score: 1 });
    expect(responses[1].response.interference).toMatchObject({ congruent: false, expectedResponse: 'green' });
    expect(JSON.stringify(responses)).not.toContain('samples');
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ gameId: 'color_interference', totalTrials: 2, accuracy: 1, conflictCostMs: expect.any(Number) }));
  });
});
