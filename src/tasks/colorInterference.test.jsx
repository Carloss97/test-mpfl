import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../i18n/LanguageContext.jsx';
import ColorInterferenceTask, {
  COLOR_OPTIONS,
  buildColorInterferenceChoiceCards,
  buildColorInterferenceFeedback,
  buildColorInterferenceTiming,
  buildColorInterferenceTrials,
  classifyStimulusWordLength,
  scoreColorInterferenceResponse,
  summarizeColorInterferenceResults,
} from './ColorInterferenceTask.jsx';

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
// aleatorizada de condiciones Stroop (FASE B.4: CIP-P1-1). Mismo patrón que
// goNoGo.test.jsx (FASE B.3: GNP-P1-1).
function lcg(seed) {
  let s = Math.abs(Math.floor(seed)) % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const CONDITION_OF = (trial) => trial.condition;
const LABEL_ES = Object.fromEntries(COLOR_OPTIONS.map((option) => [option.value, option.label]));
const LABEL_EN = Object.fromEntries(COLOR_OPTIONS.map((option) => [option.value, option.labelEn]));

describe('ColorInterferenceTask helpers', () => {
  it('randomizes conditions: trial 0 congruent, ≥2 per condition at count 8, valid word/ink mapping (CIP-P1-1)', () => {
    const trials = buildColorInterferenceTrials({ count: 8, rng: lcg(42) });

    expect(trials).toHaveLength(8);
    expect(trials[0]).toMatchObject({ trialId: 'color-0', targetId: 'color-stimulus-0', condition: 'congruent', congruent: true });

    const counts = { congruent: 0, incongruent: 0, neutral: 0 };
    for (const trial of trials) {
      counts[trial.condition] += 1;
      expect(COLOR_OPTIONS.map((option) => option.value)).toContain(trial.ink);
      expect(trial.expectedResponse).toBe(trial.ink);
      if (trial.condition === 'congruent') {
        expect(trial.wordColor).toBe(trial.ink);
        expect(trial.congruent).toBe(true);
      } else if (trial.condition === 'incongruent') {
        expect(trial.wordColor).not.toBeNull();
        expect(trial.wordColor).not.toBe(trial.ink);
        expect(trial.congruent).toBe(false);
      } else {
        expect(trial.wordColor).toBeNull();
        expect(trial.congruent).toBeNull();
        expect(trial.wordEs).toBe('XXXXX');
        expect(trial.wordEn).toBe('XXXXX');
      }
    }
    // Piso por condición: el constructo Stroop exige las 3 condiciones por sesión
    // (sin piso, una sesión azarosa dejaría una condición sin señal).
    expect(counts.congruent).toBeGreaterThanOrEqual(2);
    expect(counts.incongruent).toBeGreaterThanOrEqual(2);
    expect(counts.neutral).toBeGreaterThanOrEqual(2);
    // Con ≥2 neutrales la secuencia C/I estricta del patrón legado es imposible.
    expect(counts).not.toEqual({ congruent: 4, incongruent: 4, neutral: 0 });
  });

  it('reproduces sequences with the same seed and differs across seeds (CIP-P1-1)', () => {
    const a = buildColorInterferenceTrials({ count: 8, rng: lcg(42) }).map(CONDITION_OF);
    const aRepeat = buildColorInterferenceTrials({ count: 8, rng: lcg(42) }).map(CONDITION_OF);
    expect(a).toEqual(aRepeat);
    const sequences = [
      buildColorInterferenceTrials({ count: 8, rng: lcg(42) }).map(CONDITION_OF),
      buildColorInterferenceTrials({ count: 8, rng: lcg(1337) }).map(CONDITION_OF),
      buildColorInterferenceTrials({ count: 8, rng: lcg(7) }).map(CONDITION_OF),
      buildColorInterferenceTrials({ count: 8, rng: lcg(999) }).map(CONDITION_OF),
    ];
    const distinct = new Set(sequences.map((sequence) => sequence.join(',')));
    expect(distinct.size).toBeGreaterThanOrEqual(2);
  });

  it('degenerates gracefully for tiny counts (CIP-P1-1)', () => {
    const one = buildColorInterferenceTrials({ count: 1, rng: lcg(42) });
    expect(one).toHaveLength(1);
    expect(one[0].condition).toBe('congruent');

    const two = buildColorInterferenceTrials({ count: 2, rng: lcg(42) });
    expect(two).toHaveLength(2);
    expect(two[0].condition).toBe('congruent');
    expect(two[1].condition).not.toBe('congruent'); // no duplicar la condición del mapeo en 2 trials
  });

  it('exposes ES/EN stimulus words per ink color (note c: i18n de estímulo)', () => {
    const trials = buildColorInterferenceTrials({ count: 24, rng: lcg(42) });
    for (const trial of trials) {
      if (trial.wordColor == null) continue;
      const option = COLOR_OPTIONS.find((entry) => entry.value === trial.wordColor);
      expect(trial.wordEs).toBe(option.wordEs);
      expect(trial.wordEn).toBe(option.wordEn);
    }
    // AMARILLO (8 letras) sigue clasificándose como long-word en ES;
    // YELLOW (6) en EN cae a normal-word → la clasificación es por idioma.
    const amarillo = trials.find((trial) => trial.wordColor === 'yellow');
    expect(classifyStimulusWordLength(amarillo.wordEs)).toBe('long-word');
    expect(classifyStimulusWordLength(amarillo.wordEn)).toBe('normal-word');
  });

  it('classifies long Spanish color words for responsive fit', () => {
    expect(classifyStimulusWordLength('ROJO')).toBe('normal-word');
    expect(classifyStimulusWordLength('AMARILLO')).toBe('long-word');
  });

  it('builds high-contrast response cards for Stroop choices', () => {
    const trial = buildColorInterferenceTrials({ count: 1, rng: lcg(42) })[0];
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

  it('scores correct/incorrect responses and computes Stroop cost vs neutral (CIP-P1-1)', () => {
    const congruent = { trialId: 'c', condition: 'congruent', congruent: true, wordColor: 'red', wordEs: 'ROJO', wordEn: 'RED', ink: 'red', expectedResponse: 'red' };
    const incongruent = { trialId: 'i', condition: 'incongruent', congruent: false, wordColor: 'yellow', wordEs: 'AMARILLO', wordEn: 'YELLOW', ink: 'green', expectedResponse: 'green' };
    const neutral = { trialId: 'n', condition: 'neutral', congruent: null, wordColor: null, wordEs: 'XXXXX', wordEn: 'XXXXX', ink: 'blue', expectedResponse: 'blue' };

    expect(scoreColorInterferenceResponse({ trial: congruent, response: 'red', shownAt: 100, timestamp: 300 })).toMatchObject({ correct: true, outcome: 'correct', reactionTimeMs: 200, score: 1, condition: 'congruent' });
    expect(scoreColorInterferenceResponse({ trial: incongruent, response: 'yellow', shownAt: 100, timestamp: 420 })).toMatchObject({ correct: false, outcome: 'incorrect', reactionTimeMs: 320, score: 0, condition: 'incongruent' });
    expect(scoreColorInterferenceResponse({ trial: neutral, response: 'blue', shownAt: 0, timestamp: 250 })).toMatchObject({ correct: true, outcome: 'correct', reactionTimeMs: 250, condition: 'neutral', congruent: null });

    // Stroop clásico: costo de interferencia = RT incongruente − RT neutral.
    const summary = summarizeColorInterferenceResults([
      scoreColorInterferenceResponse({ trial: congruent, response: 'red', shownAt: 0, timestamp: 200 }),
      scoreColorInterferenceResponse({ trial: incongruent, response: 'green', shownAt: 0, timestamp: 320 }),
      scoreColorInterferenceResponse({ trial: neutral, response: 'blue', shownAt: 0, timestamp: 250 }),
    ]);
    expect(summary).toMatchObject({
      totalTrials: 3,
      completedTrialCount: 3,
      accuracy: 1,
      congruentAccuracy: 1,
      incongruentAccuracy: 1,
      neutralAccuracy: 1,
      congruentRT: 200,
      incongruentRT: 320,
      neutralRT: 250,
      conflictCostMs: 70,
      facilitationMs: -50,
    });
  });

  it('exposes the session-builder contract keys and keeps cost non-negative without signal (CIP-P2-1, CIP-P3-7)', () => {
    const congruent = { trialId: 'c', condition: 'congruent', congruent: true, wordColor: 'red', wordEs: 'ROJO', wordEn: 'RED', ink: 'red', expectedResponse: 'red' };
    const incongruent = { trialId: 'i', condition: 'incongruent', congruent: false, wordColor: 'blue', wordEs: 'AZUL', wordEn: 'BLUE', ink: 'green', expectedResponse: 'green' };

    // Sin aciertos incongruentes: no hay RT de referencia → costo 0 (nunca negativo).
    const noSignal = summarizeColorInterferenceResults([
      scoreColorInterferenceResponse({ trial: congruent, response: 'red', shownAt: 0, timestamp: 200 }),
      scoreColorInterferenceResponse({ trial: incongruent, response: 'yellow', shownAt: 0, timestamp: 320 }),
    ]);
    expect(noSignal).toMatchObject({ meanReactionTimeMs: 200, completedTrialCount: 2, conflictCostMs: 0, facilitationMs: 0 });
    expect(noSignal.incongruentRT).toBe(0);

    const empty = summarizeColorInterferenceResults([]);
    expect(empty).toMatchObject({ totalTrials: 0, completedTrialCount: 0, meanReactionTimeMs: 0, conflictCostMs: 0 });
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

  it('plays a full session with injected rng: telemetry by condition, no announced condition, contract summary (CIP-P1-1, CIP-P2-1, CIP-P3-2/3)', async () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const onGameEvent = vi.fn();
    const onComplete = vi.fn();
    const expected = buildColorInterferenceTrials({ count: 4, rng: lcg(7) });

    render(
      <ColorInterferenceTask active trialCount={4} itiMs={20} rng={lcg(7)} onGameEvent={onGameEvent} onComplete={onComplete} />,
    );

    expect(onGameEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'game_start', gameId: 'color_interference' }));
    // La condición ya NO se anuncia al candidato (fix CIP-P1-1): sin pill "Tipo:".
    expect(screen.queryByText(/Tipo:/i)).toBeNull();

    for (let i = 0; i < 4; i += 1) {
      await act(async () => {
        now += 120;
        expect(screen.getByTestId('color-stimulus')).toHaveTextContent(expected[i].wordEs);
        fireEvent.click(screen.getByRole('button', { name: `Elegir tinta ${LABEL_ES[expected[i].expectedResponse]}` }));
        vi.advanceTimersByTime(40); // ≥ 1.25 × itiMs(20) = 25
      });
    }

    const events = onGameEvent.mock.calls.map(([event]) => event);
    const stimulusEvents = events.filter((event) => event.eventType === 'stimulus_shown');
    const responses = events.filter((event) => event.eventType === 'response');
    const gameEnd = events.filter((event) => event.eventType === 'game_end');

    expect(stimulusEvents).toHaveLength(4);
    expect(responses).toHaveLength(4);
    expect(gameEnd).toHaveLength(1);

    for (let i = 0; i < 4; i += 1) {
      expect(stimulusEvents[i].stimulus.payload).toMatchObject({
        wordEs: expected[i].wordEs,
        wordEn: expected[i].wordEn,
        wordColor: expected[i].wordColor,
        ink: expected[i].ink,
        condition: expected[i].condition,
        expectedResponse: expected[i].expectedResponse,
      });
      expect(stimulusEvents[i].gameState.difficulty).toBe('color_interference'); // unificada (CIP-P3-3)
      expect(responses[i].response.interference).toMatchObject({
        condition: expected[i].condition,
        congruent: expected[i].congruent,
        expectedResponse: expected[i].expectedResponse,
      });
    }

    // game_end: score 0-100 + difficulty unificada (CIP-P3-2/3).
    expect(gameEnd[0].gameState.difficulty).toBe('color_interference');
    expect(gameEnd[0].gameState.score).toBe(100); // 4/4 correctos → meanScore 1 → 100

    expect(JSON.stringify(events)).not.toContain('samples');
    expect(onComplete).toHaveBeenCalledTimes(1);
    const summary = onComplete.mock.calls[0][0];
    expect(summary).toMatchObject({
      gameId: 'color_interference',
      totalTrials: 4,
      completedTrialCount: 4,
      accuracy: 1,
      meanScore: 1,
      meanReactionTimeMs: expect.any(Number), // clave de contrato del session builder (CIP-P2-1)
    });
    expect(summary.meanReactionTimeMs).toBeGreaterThan(0);
    expect(summary.conditionCounts).toMatchObject({
      congruent: expected.filter((trial) => trial.condition === 'congruent').length,
      incongruent: expected.filter((trial) => trial.condition === 'incongruent').length,
      neutral: expected.filter((trial) => trial.condition === 'neutral').length,
    });
  });

  it('jitters the ITI within [0.75, 1.25] × itiMs so the rhythm is not telegraphed (CIP-P2-4)', async () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);

    render(<ColorInterferenceTask active trialCount={2} itiMs={100} rng={lcg(7)} onGameEvent={vi.fn()} onComplete={vi.fn()} />);

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: /Elegir tinta/i })[0]);
    });
    expect(screen.getByText(/Pregunta 1 de 2/)).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(74); // < 0.75 × 100 = 75 → nunca avanza
    });
    expect(screen.getByText(/Pregunta 1 de 2/)).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(52); // total 126 > 1.25 × 100 = 125 → siempre avanza
    });
    expect(screen.getByText(/Pregunta 2 de 2/)).toBeInTheDocument();
  });

  it('shows a countdown and records timeout pressure when the user does not answer', async () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const onGameEvent = vi.fn();
    const onComplete = vi.fn();

    render(<ColorInterferenceTask active trialCount={1} trialDurationMs={1000} itiMs={20} rng={lcg(7)} onGameEvent={onGameEvent} onComplete={onComplete} />);

    expect(screen.getByRole('timer', { name: /tiempo restante/i })).toHaveTextContent(/Tiempo 1\.0s/i);
    expect(screen.getByTestId('color-timebar')).toHaveAttribute('data-urgency', 'low');

    await act(async () => {
      now = 1100;
      vi.advanceTimersByTime(1010);
    });

    const responseEvent = onGameEvent.mock.calls.map(([event]) => event).find((event) => event.eventType === 'response');
    expect(responseEvent.response).toMatchObject({ correct: false, outcome: 'timeout', score: 0 });
    expect(responseEvent.response.interference).toMatchObject({ timedOut: true, trialDurationMs: 1000, condition: 'congruent' });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('adapta el ancho y alto de .task-area a los props width/height (CIP-P2-4: sin altura fija que desborde el stage)', () => {
    render(<ColorInterferenceTask active trialCount={1} itiMs={20} rng={lcg(7)} width={312} height={340} onGameEvent={vi.fn()} onComplete={vi.fn()} />);
    expect(screen.getByTestId('color-task-area')).toHaveStyle({ width: '312px', height: '340px' });
  });

  it('scores a trial only once even with a double-click (CIP-P3-5: handledRef, patrón B.3)', async () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const onGameEvent = vi.fn();
    const onComplete = vi.fn();

    render(<ColorInterferenceTask active trialCount={1} itiMs={20} rng={lcg(7)} onGameEvent={onGameEvent} onComplete={onComplete} />);

    const button = screen.getAllByRole('button', { name: /Elegir tinta/i })[0];
    await act(async () => {
      fireEvent.click(button);
      fireEvent.click(button);
      vi.advanceTimersByTime(30);
    });

    const responses = onGameEvent.mock.calls.map(([event]) => event).filter((event) => event.eventType === 'response');
    expect(responses).toHaveLength(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('does not complete late when unmounted during the ITI (CIP-P2-3: cleanup del timer de ITI)', async () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const onComplete = vi.fn();
    const { unmount } = render(<ColorInterferenceTask active trialCount={2} itiMs={1000} rng={lcg(7)} onGameEvent={vi.fn()} onComplete={onComplete} />);

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: /Elegir tinta/i })[0]);
    });
    unmount();

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('does not duplicate stimulus_shown for trial 0 under StrictMode double-effect (CIP-P3-4, patrón GNP-P3-6)', () => {
    const onGameEvent = vi.fn();
    render(
      <React.StrictMode>
        <ColorInterferenceTask active trialCount={2} itiMs={20} rng={lcg(7)} onGameEvent={onGameEvent} onComplete={vi.fn()} />
      </React.StrictMode>,
    );
    const events = onGameEvent.mock.calls.map(([event]) => event);
    expect(events.filter((event) => event.eventType === 'game_start')).toHaveLength(1);
    expect(events.filter((event) => event.eventType === 'stimulus_shown')).toHaveLength(1);
    expect(screen.getByTestId('color-stimulus')).toBeInTheDocument();
  });
});

describe('ColorInterferenceTask EN copy (t_42978412 + note c: estímulo en EN)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    window.localStorage.removeItem('krumm-lang');
  });

  it('renders header, timer, prompt and EN stimulus word without announcing the condition', async () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    window.localStorage.setItem('krumm-lang', 'en');
    const expected = buildColorInterferenceTrials({ count: 2, rng: lcg(7) });

    render(
      <LanguageProvider>
        <ColorInterferenceTask active trialCount={2} itiMs={200} rng={lcg(7)} onGameEvent={vi.fn()} onComplete={vi.fn()} />
      </LanguageProvider>,
    );

    expect(screen.getByText(/Color cards/i)).toBeInTheDocument();
    expect(screen.getByText('Question 1 of 2')).toBeInTheDocument();
    // Regresión CIP-P1-1: la condición (congruent/incongruent/neutral) no se
    // anuncia al candidato ("Type: congruent" eliminado).
    expect(screen.queryByText(/Type:/i)).toBeNull();
    expect(screen.getByRole('timer', { name: 'Time remaining' })).toHaveTextContent('Time 3.2s');
    expect(screen.getByText('Pick the ink, ignore the text.')).toBeInTheDocument();
    // El estímulo se renderiza en el idioma de la sesión (note c).
    expect(screen.getByTestId('color-stimulus')).toHaveTextContent(expected[0].wordEn);

    const red = screen.getByRole('button', { name: `Pick ink ${LABEL_EN[expected[0].expectedResponse]}` });
    expect(red).toHaveClass('color-interference-task__choice-card');

    await act(async () => {
      now = 220;
      fireEvent.click(red);
      vi.advanceTimersByTime(25);
    });

    expect(screen.getByText('Correct')).toBeInTheDocument();
    expect(screen.getByText(`Expected ink: ${LABEL_EN[expected[0].expectedResponse]}`)).toBeInTheDocument();
  });
});
