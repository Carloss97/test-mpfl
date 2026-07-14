import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import GoNoGoTask, {
  buildGoNoGoCuePresentation,
  buildGoNoGoTrials,
  scoreGoNoGoResponse,
  summarizeGoNoGoResults,
} from './GoNoGoTask.jsx';

describe('GoNoGoTask helpers', () => {
  it('builds deterministic GO/NO-GO trials with both cue types', () => {
    const trials = buildGoNoGoTrials({ count: 4, noGoEvery: 2 });

    expect(trials).toHaveLength(4);
    expect(trials.map((trial) => trial.cue)).toEqual(['GO', 'NO-GO', 'GO', 'NO-GO']);
    expect(trials[0]).toMatchObject({ trialId: 'gonogo-0', targetId: 'gonogo-cue-0', responseRequired: true });
    expect(trials[1]).toMatchObject({ responseRequired: false });
  });

  it('scores correct go, commission error, omission error and correct withhold', () => {
    const go = { trialId: 'g', cue: 'GO', responseRequired: true };
    const noGo = { trialId: 'n', cue: 'NO-GO', responseRequired: false };

    expect(scoreGoNoGoResponse({ trial: go, response: 'press', shownAt: 100, timestamp: 250 })).toMatchObject({ correct: true, outcome: 'correct_go', reactionTimeMs: 150, score: 1 });
    expect(scoreGoNoGoResponse({ trial: noGo, response: 'press', shownAt: 100, timestamp: 200 })).toMatchObject({ correct: false, outcome: 'commission_error', score: 0 });
    expect(scoreGoNoGoResponse({ trial: go, response: 'timeout', shownAt: 100, timestamp: 800 })).toMatchObject({ correct: false, outcome: 'omission_error', score: 0 });
    expect(scoreGoNoGoResponse({ trial: noGo, response: 'withhold', shownAt: 100, timestamp: 800 })).toMatchObject({ correct: true, outcome: 'correct_withhold', score: 1 });
  });

  it('summarizes inhibition metrics', () => {
    const results = [
      { cue: 'GO', outcome: 'correct_go', correct: true, reactionTimeMs: 220, score: 1 },
      { cue: 'NO-GO', outcome: 'commission_error', correct: false, reactionTimeMs: 180, score: 0 },
      { cue: 'GO', outcome: 'omission_error', correct: false, reactionTimeMs: null, score: 0 },
      { cue: 'NO-GO', outcome: 'correct_withhold', correct: true, reactionTimeMs: null, score: 1 },
    ];

    expect(summarizeGoNoGoResults(results)).toMatchObject({
      totalTrials: 4,
      accuracy: 0.5,
      commissionErrorRate: 0.5,
      omissionErrorRate: 0.5,
      correctGoRT: 220,
    });
  });

  it('builds dynamic semaphore presentation copy without changing inhibition semantics', () => {
    expect(buildGoNoGoCuePresentation({ cue: 'GO', responseRequired: true })).toMatchObject({
      state: 'go',
      heading: 'Semáforo de impulso',
      instruction: 'Pulsa responder solo cuando aparezca GO.',
      buttonLabel: 'Responder ahora',
      cueClassName: 'go-nogo-task__cue--go',
    });

    expect(buildGoNoGoCuePresentation({ cue: 'NO-GO', responseRequired: false })).toMatchObject({
      state: 'no-go',
      heading: 'Semáforo de impulso',
      instruction: 'NO-GO: espera sin pulsar para inhibir la respuesta.',
      buttonLabel: 'No pulsar · esperar',
      cueClassName: 'go-nogo-task__cue--no-go',
    });
  });
});

describe('GoNoGoTask', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('emits normalized telemetry for GO press and NO-GO withhold', async () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const onGameEvent = vi.fn();
    const onComplete = vi.fn();

    render(
      <GoNoGoTask
        active
        trialCount={2}
        stimulusMs={300}
        itiMs={20}
        onGameEvent={onGameEvent}
        onComplete={onComplete}
      />,
    );

    expect(onGameEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'game_start', gameId: 'go_nogo' }));
    expect(screen.getByText('GO')).toBeInTheDocument();

    await act(async () => {
      now = 180;
      fireEvent.click(screen.getByRole('button', { name: /responder/i }));
      vi.advanceTimersByTime(25);
    });

    expect(screen.getByText('NO-GO')).toBeInTheDocument();

    await act(async () => {
      now = 520;
      vi.advanceTimersByTime(320);
    });

    const responses = onGameEvent.mock.calls.map(([event]) => event).filter((event) => event.eventType === 'response');
    expect(responses).toHaveLength(2);
    expect(responses[0].response).toMatchObject({ correct: true, outcome: 'correct_go', score: 1 });
    expect(responses[1].response).toMatchObject({ correct: true, outcome: 'correct_withhold', score: 1 });
    expect(responses[1].response.inhibition).toMatchObject({ responseRequired: false, cue: 'NO-GO' });
    expect(JSON.stringify(responses)).not.toContain('samples');
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ gameId: 'go_nogo', totalTrials: 2, accuracy: 1 }));
  });

  it('shows dynamic semaphore instructions for GO and NO-GO states', async () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);

    render(<GoNoGoTask active trialCount={2} stimulusMs={300} itiMs={20} onGameEvent={vi.fn()} onComplete={vi.fn()} />);

    expect(screen.getByText(/Semáforo de impulso/i)).toBeInTheDocument();
    expect(screen.getByText(/Pulsa responder solo cuando aparezca GO/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Responder ahora/i })).toHaveClass('go-nogo-task__response');

    await act(async () => {
      now = 160;
      fireEvent.click(screen.getByRole('button', { name: /Responder ahora/i }));
      vi.advanceTimersByTime(25);
    });

    expect(screen.getByText(/NO-GO: espera sin pulsar/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /No pulsar · esperar/i })).toHaveAttribute('data-state', 'no-go');
  });
});
