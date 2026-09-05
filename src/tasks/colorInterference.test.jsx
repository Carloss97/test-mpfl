import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ColorInterferenceTask, {
  buildColorInterferenceChoiceCards,
  buildColorInterferenceFeedback,
  buildColorInterferenceTiming,
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

  it('builds high-contrast response cards for Stroop choices', () => {
    const trial = buildColorInterferenceTrials({ count: 1 })[0];
    const cards = buildColorInterferenceChoiceCards(trial);

    expect(cards).toHaveLength(4);
    expect(cards[0]).toMatchObject({
      label: 'Rojo',
      value: 'red',
      className: expect.stringContaining('color-interference-task__choice-card'),
      ariaLabel: 'Elegir tinta Rojo',
    });
    expect(cards.find((card) => card.isExpected)).toMatchObject({ value: trial.expectedResponse });
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

  it('builds immediate feedback copy for correct and incorrect Stroop responses', () => {
    expect(buildColorInterferenceFeedback({ correct: true, expectedResponse: 'red' })).toMatchObject({
      tone: 'correct',
      label: 'Correcto',
      detail: 'Tinta esperada: Rojo',
    });
    expect(buildColorInterferenceFeedback({ correct: false, expectedResponse: 'green' })).toMatchObject({
      tone: 'incorrect',
      label: 'Interferencia detectada',
      detail: 'Tinta esperada: Verde',
    });
  });

  it('defines visible time pressure for each Stroop card', () => {
    expect(buildColorInterferenceTiming({ durationMs: 3200, remainingMs: 1600 })).toMatchObject({
      durationMs: 3200,
      remainingMs: 1600,
      percentRemaining: 50,
      label: 'Tiempo 1.6s',
      urgency: 'medium',
    });
    expect(buildColorInterferenceTiming({ durationMs: 3200, remainingMs: 500 })).toMatchObject({ urgency: 'high' });
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

  it('renders the Stroop game as high-contrast cards with immediate feedback', async () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);

    render(<ColorInterferenceTask active trialCount={2} itiMs={200} onGameEvent={vi.fn()} onComplete={vi.fn()} />);

    expect(screen.getByText(/Tarjetas de color/i)).toBeInTheDocument();
    expect(screen.getByText(/Elige la tinta, ignora el texto/i)).toBeInTheDocument();

    const rojo = screen.getByRole('button', { name: /Elegir tinta Rojo/i });
    expect(rojo).toHaveClass('color-interference-task__choice-card');

    await act(async () => {
      now = 220;
      fireEvent.click(rojo);
    });

    expect(screen.getByText(/Correcto/i)).toBeInTheDocument();
    expect(screen.getByText(/Tinta esperada: Rojo/i)).toBeInTheDocument();
  });

  it('shows a countdown and records timeout pressure when the user does not answer', async () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const onGameEvent = vi.fn();

    render(<ColorInterferenceTask active trialCount={1} trialDurationMs={1000} itiMs={20} onGameEvent={onGameEvent} onComplete={vi.fn()} />);

    expect(screen.getByRole('timer', { name: /tiempo restante/i })).toHaveTextContent(/Tiempo 1\.0s/i);
    expect(screen.getByTestId('color-timebar')).toHaveAttribute('data-urgency', 'low');

    await act(async () => {
      now = 1100;
      vi.advanceTimersByTime(1010);
    });

    const responseEvent = onGameEvent.mock.calls.map(([event]) => event).find((event) => event.eventType === 'response');
    expect(responseEvent.response).toMatchObject({ correct: false, outcome: 'timeout', score: 0 });
    expect(responseEvent.response.interference).toMatchObject({ timedOut: true, trialDurationMs: 1000 });
  });
});
