import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../i18n/LanguageContext.jsx';
import GoNoGoTask, {
  buildGoNoGoCuePresentation,
  buildGoNoGoTrials,
  scoreGoNoGoResponse,
  summarizeGoNoGoResults,
} from './GoNoGoTask.jsx';

// t_42978412: LanguageProvider lee localStorage al inicializar (jsdom about:blank
// sin origin). Patrón del mock: PostulationGameStage.test.jsx.
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock, configurable: true });

// PRNG determinista (Park–Miller) para tests reproducibles de la secuencia
// aleatorizada de cues (FASE B.3: GNP-P1-1).
function lcg(seed) {
  let s = Math.abs(Math.floor(seed)) % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

describe('GoNoGoTask helpers', () => {
  it('randomizes NO-GO placement: trial 0 GO, no-go count bounded, no fixed alternation (GNP-P1-1)', () => {
    const seedA = buildGoNoGoTrials({ count: 8, rng: lcg(42) });
    const seedARepeat = buildGoNoGoTrials({ count: 8, rng: lcg(42) });
    const seedB = buildGoNoGoTrials({ count: 8, rng: lcg(1337) });

    expect(seedA).toHaveLength(8);
    expect(seedA[0].cue).toBe('GO');
    expect(seedA[0].responseRequired).toBe(true);
    // Reproducibilidad: misma seed → misma secuencia.
    expect(seedA.map((t) => t.cue)).toEqual(seedARepeat.map((t) => t.cue));
    // Diferentes seeds → (con probabilidad ≈1) secuencias distintas: no hay patrón fijo.
    expect(seedA.map((t) => t.cue)).not.toEqual(seedB.map((t) => t.cue));
    // Balance: 2 ≤ no-go ≤ 4 en 8 trials (p=0.35, min 2, max count/2).
    for (const trials of [seedA, seedB]) {
      const noGo = trials.filter((t) => t.cue === 'NO-GO');
      expect(noGo.length).toBeGreaterThanOrEqual(2);
      expect(noGo.length).toBeLessThanOrEqual(4);
      // La secuencia NO es la alternación determinista GO/NO-GO del bug (noGoEvery:2).
      expect(trials.map((t) => t.cue)).not.toEqual(['GO', 'NO-GO', 'GO', 'NO-GO', 'GO', 'NO-GO', 'GO', 'NO-GO']);
      // Todos los trialId/respuesta-required consistentes.
      trials.forEach((t, i) => {
        expect(t).toMatchObject({ trialId: `gonogo-${i}`, targetId: `gonogo-cue-${i}`, trialIndex: i });
        expect(t.responseRequired).toBe(t.cue === 'GO');
        expect(t.expectedResponse).toBe(t.cue === 'GO' ? 'press' : 'withhold');
      });
    }
  });

  it('enforces the no-go floor when rng always answers GO', () => {
    const trials = buildGoNoGoTrials({ count: 8, rng: () => 1 });
    expect(trials[0].cue).toBe('GO');
    expect(trials.filter((t) => t.cue === 'NO-GO')).toHaveLength(2);
  });

  it('caps no-go at half the trials when rng always answers NO-GO', () => {
    const trials = buildGoNoGoTrials({ count: 8, rng: () => 0 });
    expect(trials[0].cue).toBe('GO');
    expect(trials.filter((t) => t.cue === 'NO-GO')).toHaveLength(4);
  });

  it('keeps tiny counts resolvable: 1 trial all-GO, 2 trials forced GO→NO-GO', () => {
    expect(buildGoNoGoTrials({ count: 1, rng: () => 0 })).toHaveLength(1);
    expect(buildGoNoGoTrials({ count: 1, rng: () => 0 }).map((t) => t.cue)).toEqual(['GO']);
    expect(buildGoNoGoTrials({ count: 2, rng: () => 0.5 }).map((t) => t.cue)).toEqual(['GO', 'NO-GO']);
  });

  it('scores correct go, commission error, omission error and correct withhold', () => {
    const go = { trialId: 'g', cue: 'GO', responseRequired: true };
    const noGo = { trialId: 'n', cue: 'NO-GO', responseRequired: false };

    expect(scoreGoNoGoResponse({ trial: go, response: 'press', shownAt: 100, timestamp: 250 })).toMatchObject({ correct: true, outcome: 'correct_go', reactionTimeMs: 150, score: 1 });
    expect(scoreGoNoGoResponse({ trial: noGo, response: 'press', shownAt: 100, timestamp: 200 })).toMatchObject({ correct: false, outcome: 'commission_error', score: 0 });
    expect(scoreGoNoGoResponse({ trial: go, response: 'timeout', shownAt: 100, timestamp: 800 })).toMatchObject({ correct: false, outcome: 'omission_error', score: 0 });
    expect(scoreGoNoGoResponse({ trial: noGo, response: 'withhold', shownAt: 100, timestamp: 800 })).toMatchObject({ correct: true, outcome: 'correct_withhold', score: 1 });
  });

  it('summarizes inhibition metrics and exposes the session-builder contract keys (GNP-P2-1)', () => {
    const results = [
      { cue: 'GO', responseRequired: true, outcome: 'correct_go', correct: true, reactionTimeMs: 220, score: 1 },
      { cue: 'NO-GO', responseRequired: false, outcome: 'commission_error', correct: false, reactionTimeMs: 180, score: 0 },
      { cue: 'GO', responseRequired: true, outcome: 'omission_error', correct: false, reactionTimeMs: null, score: 0 },
      { cue: 'NO-GO', responseRequired: false, outcome: 'correct_withhold', correct: true, reactionTimeMs: null, score: 1 },
    ];

    const summary = summarizeGoNoGoResults(results);
    expect(summary).toMatchObject({
      totalTrials: 4,
      completedTrialCount: 4,
      accuracy: 0.5,
      commissionErrorRate: 0.5,
      omissionErrorRate: 0.5,
      correctGoRT: 220,
      meanReactionTimeMs: 220,
      goTrialCount: 2,
      noGoTrialCount: 2,
    });
  });

  it('builds dynamic semaphore presentation copy without changing inhibition semantics (GNP-P3-4: no dead noWrap)', () => {
    expect(buildGoNoGoCuePresentation({ cue: 'GO', responseRequired: true })).toMatchObject({
      state: 'go',
      heading: 'Semáforo de impulso',
      instruction: 'Pulsa responder solo cuando aparezca GO.',
      buttonLabel: 'Responder ahora',
      cueClassName: 'go-nogo-task__cue--go',
    });
    expect(buildGoNoGoCuePresentation({ cue: 'GO', responseRequired: true }).noWrap).toBeUndefined();

    const noGo = buildGoNoGoCuePresentation({ cue: 'NO-GO', responseRequired: false });
    expect(noGo).toMatchObject({
      state: 'no-go',
      heading: 'Semáforo de impulso',
      instruction: 'NO-GO: espera sin pulsar para inhibir la respuesta.',
      buttonLabel: 'Responder ahora',
      cueClassName: 'go-nogo-task__cue--no-go',
      temptationLabel: 'No lo pulses en NO-GO',
    });
    expect(noGo.noWrap).toBeUndefined();
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

  it('emits normalized telemetry and a 0-100 game_end for GO press and NO-GO withhold (GNP-P3-2/P3-3)', async () => {
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

    const events = () => onGameEvent.mock.calls.map(([event]) => event);
    // Nota: el effect del hijo (stimulus_shown) corre antes que el del padre
    // (game_start en GameRuntime) — orden sistémico de los stable_dg, no se
    // asume orden entre ambos.
    expect(events().filter((event) => event.eventType === 'game_start'))
      .toEqual([expect.objectContaining({ eventType: 'game_start', gameId: 'go_nogo', gameState: expect.objectContaining({ difficulty: 'go_no_go' }) })]);
    expect(events().filter((event) => event.eventType === 'stimulus_shown')).toHaveLength(1);
    expect(screen.getByText('GO')).toBeInTheDocument();

    await act(async () => {
      now = 180;
      fireEvent.click(screen.getByRole('button', { name: /responder/i }));
      vi.advanceTimersByTime(30);
    });

    expect(screen.getByText('NO-GO')).toBeInTheDocument();

    await act(async () => {
      now = 520;
      vi.advanceTimersByTime(320);
    });

    const responses = events().filter((event) => event.eventType === 'response');
    expect(responses).toHaveLength(2);
    expect(responses[0]).toMatchObject({ gameId: 'go_nogo', gameState: expect.objectContaining({ difficulty: 'go_no_go' }) });
    expect(responses[0].response).toMatchObject({ correct: true, outcome: 'correct_go', score: 1 });
    expect(responses[1].response).toMatchObject({ correct: true, outcome: 'correct_withhold', score: 1 });
    expect(responses[1].response.inhibition).toMatchObject({ responseRequired: false, cue: 'NO-GO' });
    expect(JSON.stringify(responses)).not.toContain('samples');

    // game_end: score en escala 0-100 (contrato de SimpleRT/B.2), difficulty unificada.
    const gameEnd = events().filter((event) => event.eventType === 'game_end');
    expect(gameEnd).toHaveLength(1);
    expect(gameEnd[0]).toMatchObject({
      gameId: 'go_nogo',
      gameState: { score: 100, level: 2, difficulty: 'go_no_go' },
    });
    expect(events().filter((event) => event.eventType === 'stimulus_shown')).toHaveLength(2);

    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
      gameId: 'go_nogo',
      totalTrials: 2,
      completedTrialCount: 2,
      accuracy: 1,
      meanReactionTimeMs: 180,
    }));
  });

  it('jitters the ITI within [0.75, 1.25] × itiMs so the rhythm is not telegraphed (GNP-P2-5)', async () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    render(<GoNoGoTask active trialCount={2} stimulusMs={600} itiMs={100} onGameEvent={vi.fn()} onComplete={vi.fn()} />);

    expect(screen.getByTestId('gonogo-cue')).toHaveTextContent('GO');

    await act(async () => {
      now = 100;
      fireEvent.click(screen.getByRole('button', { name: /responder/i }));
      vi.advanceTimersByTime(74);
    });
    // ITI mínimo = 75 ms → a los 74 ms del response aún no apareció el trial 2.
    expect(screen.getByTestId('gonogo-cue')).toHaveTextContent('GO');

    await act(async () => {
      now = 226;
      vi.advanceTimersByTime(52);
    });
    // ITI máximo = 125 ms → a los 126 ms del response el trial 2 ya está visible.
    expect(screen.getByTestId('gonogo-cue')).toHaveTextContent('NO-GO');
  });

  it('emits postErrorSlowingMs on the GO response that follows an error (GNP-P2-2)', async () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const onGameEvent = vi.fn();
    const onComplete = vi.fn();
    // Secuencia GO, NO-GO, GO: flags i=1: rng 0.1 < 0.35 → NO-GO; i=2: 0.5 → GO; noGoCount=1 = min (count 3 → min 1).
    const scripted = [0.1, 0.5];
    const rng = () => (scripted.length ? scripted.shift() : 0.5);

    render(<GoNoGoTask active trialCount={3} stimulusMs={300} itiMs={40} rng={rng} onGameEvent={onGameEvent} onComplete={onComplete} />);

    expect(screen.getByTestId('gonogo-cue')).toHaveTextContent('GO');

    await act(async () => {
      now = 150;
      fireEvent.click(screen.getByRole('button', { name: /responder/i })); // trial 1 GO: correct_go rt 150
      vi.advanceTimersByTime(60);
    });
    expect(screen.getByTestId('gonogo-cue')).toHaveTextContent('NO-GO');

    await act(async () => {
      now = 250;
      fireEvent.click(screen.getByRole('button', { name: /responder/i })); // trial 2 NO-GO: commission_error
      vi.advanceTimersByTime(60);
    });
    expect(screen.getByTestId('gonogo-cue')).toHaveTextContent('GO');

    await act(async () => {
      now = 330;
      fireEvent.click(screen.getByRole('button', { name: /responder/i })); // trial 3 GO: correct_go post-error
      vi.advanceTimersByTime(60);
    });

    const responses = onGameEvent.mock.calls.map(([event]) => event).filter((event) => event.eventType === 'response');
    expect(responses).toHaveLength(3);
    expect(responses[0].response.outcome).toBe('correct_go');
    expect(responses[1].response.outcome).toBe('commission_error');
    expect(responses[1].response.postErrorSlowingMs).toBeUndefined();
    expect(responses[2].response.outcome).toBe('correct_go');
    // Post-error slowing del trial 3 = rt(3) − media de los correct_go anteriores (rt 1).
    expect(responses[2].response.reactionTimeMs).toBeGreaterThan(0);
    expect(responses[2].response.postErrorSlowingMs)
      .toBe(responses[2].response.reactionTimeMs - responses[0].response.reactionTimeMs);
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
      postErrorSlowingMs: responses[2].response.postErrorSlowingMs,
    }));
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
      vi.advanceTimersByTime(30);
    });

    expect(screen.getByText(/NO-GO: espera sin pulsar/i)).toBeInTheDocument();
    expect(screen.getByText(/No lo pulses en NO-GO/i)).toBeInTheDocument();
    const noGoButton = screen.getByRole('button', { name: /Responder ahora/i });
    expect(noGoButton).toHaveAttribute('data-state', 'no-go');
    expect(noGoButton).toBeEnabled();
    expect(screen.getByTestId('gonogo-cue')).toHaveTextContent('NO-GO');
  });

  it('keeps the GO/NO-GO card at a stable larger size and records NO-GO button clicks as commission errors', async () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const onGameEvent = vi.fn();

    render(<GoNoGoTask active trialCount={2} stimulusMs={300} itiMs={20} onGameEvent={onGameEvent} onComplete={vi.fn()} />);

    expect(screen.getByTestId('gonogo-task-area')).toHaveStyle({ width: '520px', height: '300px' });
    expect(screen.getByTestId('gonogo-cue')).toHaveStyle({ whiteSpace: 'nowrap' });

    await act(async () => {
      now = 160;
      fireEvent.click(screen.getByRole('button', { name: /Responder ahora/i }));
      vi.advanceTimersByTime(30);
    });

    expect(screen.getByTestId('gonogo-task-area')).toHaveStyle({ width: '520px', height: '300px' });
    await act(async () => {
      now = 240;
      fireEvent.click(screen.getByRole('button', { name: /Responder ahora/i }));
    });

    const responses = onGameEvent.mock.calls.map(([event]) => event).filter((event) => event.eventType === 'response');
    expect(responses.at(-1).response).toMatchObject({ correct: false, outcome: 'commission_error', score: 0 });
  });

  it('adapta el ancho de .task-area al prop width (t_f40921bf) y la altura al prop height (GNP-P2-4)', () => {
    render(<GoNoGoTask active trialCount={1} stimulusMs={300} itiMs={20} width={312} height={340} onGameEvent={vi.fn()} onComplete={vi.fn()} />);
    expect(screen.getByTestId('gonogo-task-area')).toHaveStyle({ width: '312px', height: '340px' });
  });

  it('does not duplicate stimulus_shown for trial 0 under StrictMode double-effect (GNP-P3-6)', () => {
    const onGameEvent = vi.fn();
    render(
      <React.StrictMode>
        <GoNoGoTask active trialCount={2} stimulusMs={300} itiMs={20} onGameEvent={onGameEvent} onComplete={vi.fn()} />
      </React.StrictMode>,
    );
    const events = onGameEvent.mock.calls.map(([event]) => event);
    expect(events.filter((event) => event.eventType === 'game_start')).toHaveLength(1);
    expect(events.filter((event) => event.eventType === 'stimulus_shown')).toHaveLength(1);
    expect(screen.getByTestId('gonogo-cue')).toHaveTextContent('GO');
  });
});

describe('GoNoGoTask EN copy (t_42978412)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('renders instructions, button and progress in English for GO and NO-GO states', async () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    window.localStorage.setItem('krumm-lang', 'en');
    render(
      <LanguageProvider>
        <GoNoGoTask active trialCount={2} stimulusMs={300} itiMs={20} onGameEvent={vi.fn()} onComplete={vi.fn()} />
      </LanguageProvider>,
    );

    expect(screen.getByText('Signal 1 of 2')).toBeInTheDocument();
    expect(screen.getByText(/Impulse traffic light/i)).toBeInTheDocument();
    expect(screen.getByText('Press respond only when GO appears.')).toBeInTheDocument();
    const goButton = screen.getByRole('button', { name: 'Respond now' });
    expect(goButton).toHaveClass('go-nogo-task__response');

    await act(async () => {
      now = 160;
      fireEvent.click(goButton);
      vi.advanceTimersByTime(30);
    });

    expect(screen.getByText('NO-GO: wait without pressing to inhibit the response.')).toBeInTheDocument();
    expect(screen.getByText('Do not press on NO-GO')).toBeInTheDocument();
    window.localStorage.removeItem('krumm-lang');
  });
});
