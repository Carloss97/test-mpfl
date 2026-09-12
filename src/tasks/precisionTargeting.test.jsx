import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../i18n/LanguageContext.jsx';
import PrecisionTargetingTask, {
  buildPrecisionResponseAggregate,
  buildPrecisionRouteGuide,
  buildPrecisionTrialFeedback,
  buildPrecisionTrials,
  computeFittsIndex,
} from './PrecisionTargetingTask.jsx';

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

describe('PrecisionTargetingTask helpers', () => {
  it('computes Fitts index of difficulty from distance and target width', () => {
    expect(computeFittsIndex({ distancePx: 300, targetWidthPx: 60 })).toBeCloseTo(2.585, 3);
    expect(computeFittsIndex({ distancePx: 0, targetWidthPx: 60 })).toBe(0);
  });

  it('builds deterministic trials with varying distance, size and difficulty', () => {
    const trials = buildPrecisionTrials({ width: 600, height: 400, count: 4 });

    expect(trials).toHaveLength(4);
    expect(new Set(trials.map((trial) => trial.target.radius)).size).toBeGreaterThan(1);
    expect(trials.every((trial) => trial.fittsId >= 0)).toBe(true);
    expect(trials[0]).toMatchObject({ trialId: 'precision-0', targetId: 'precision-target-0' });
  });

  it('builds an adaptive route guide without user pointer path data', () => {
    const [trial] = buildPrecisionTrials({ width: 600, height: 400, count: 1 });
    const guide = buildPrecisionRouteGuide(trial);

    expect(guide).toMatchObject({
      label: 'Ruta de precisión adaptativa',
      corridorLabel: 'Corredor ideal',
      startLabel: 'Inicio controlado',
      targetLabel: 'Blanco activo',
    });
    expect(guide.corridorWidthPx).toBeGreaterThanOrEqual(trial.target.radius * 2);
    expect(JSON.stringify(guide)).not.toMatch(/samples|path|pointer/i);
  });

  it('summarizes adaptive precision as aggregate feedback only', () => {
    const aggregate = buildPrecisionResponseAggregate({
      clickDistanceToTargetPx: 42,
      pointerSummary: {
        pathEfficiency: 0.68,
        overshootCount: 2,
        correctionCount: 3,
        dwellTimeMs: 40,
        deviationRmsPx: 18,
      },
    });
    const feedback = buildPrecisionTrialFeedback({
      correct: false,
      reactionTimeMs: 620,
      clickDistanceToTargetPx: 42,
      score: 0.25,
      pointerSummary: aggregate,
    });

    expect(aggregate).toMatchObject({ routeLabel: 'Ruta con correcciones', aggregateOnly: true });
    expect(feedback).toMatchObject({
      tone: 'warn',
      headline: 'Ajuste fino requerido',
      routeLabel: 'Ruta con correcciones',
      aggregate: {
        pathEfficiency: 0.68,
        overshootCount: 2,
        correctionCount: 3,
        dwellTimeMs: 40,
        deviationRmsPx: 18,
      },
    });
    expect(JSON.stringify(feedback)).not.toMatch(/samples|clientX|clientY/i);
  });

  it('keeps trial feedback as a compact status strip outside the clickable canvas', () => {
    expect(buildPrecisionTrialFeedback({
      correct: false,
      reactionTimeMs: 687,
      clickDistanceToTargetPx: 12.6,
      score: 0.84,
      pointerSummary: { pathEfficiency: 0.72, overshootCount: 1, correctionCount: 2, dwellTimeMs: 0, deviationRmsPx: 12 },
    })).toMatchObject({
      tone: 'warn',
      displayMode: 'status-strip',
      intrusivePopup: false,
    });
  });
});

describe('PrecisionTargetingTask', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('requires a start pad before showing variable Fitts targets, unlike simple RT', async () => {
    const onGameEvent = vi.fn();

    render(<PrecisionTargetingTask active trialCount={1} width={600} height={400} onGameEvent={onGameEvent} />);

    expect(screen.getAllByText(/toca el punto de inicio/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Ruta de precisión adaptativa/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Corredor ideal/i)).toBeInTheDocument();
    expect(screen.queryByTestId('precision-target')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('precision-start-pad'), { clientX: 300, clientY: 200 });

    expect(screen.getByTestId('precision-target')).toBeInTheDocument();
    expect(screen.getAllByText(/Blanco activo/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Fitts/i).length).toBeGreaterThan(0);
    expect(onGameEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'stimulus_shown', trialId: 'precision-0' }));
  });

  it('emits rich game telemetry and completion summary for a hit trial', async () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const onGameEvent = vi.fn();
    const onComplete = vi.fn();

    render(
      <PrecisionTargetingTask
        active
        trialCount={1}
        width={600}
        height={400}
        onGameEvent={onGameEvent}
        onComplete={onComplete}
      />,
    );

    const startPad = screen.getByTestId('precision-start-pad');
    expect(onGameEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'game_start', gameId: 'precision_targeting' }));

    await act(async () => {
      now = 50;
      fireEvent.click(startPad, { clientX: 300, clientY: 200 });
    });

    const target = screen.getByTestId('precision-target');
    const taskArea = screen.getByTestId('precision-task-area');
    fireEvent.pointerMove(taskArea, { clientX: 320, clientY: 210 });
    fireEvent.pointerMove(taskArea, { clientX: 420, clientY: 240 });

    const x = Number(target.dataset.x);
    const y = Number(target.dataset.y);
    await act(async () => {
      now = 300;
      fireEvent.click(taskArea, { clientX: x, clientY: y });
      vi.runOnlyPendingTimers();
    });

    expect(taskArea.querySelector('.precision-targeting-task__feedback')).toBeNull();
    expect(screen.getByRole('status', { name: /feedback de precisión/i })).toHaveClass('precision-targeting-task__feedback-strip');

    const responseEvent = onGameEvent.mock.calls.map(([event]) => event).find((event) => event.eventType === 'response');
    expect(responseEvent).toBeTruthy();
    expect(responseEvent.response).toMatchObject({ correct: true, outcome: 'hit', score: 1 });
    expect(responseEvent.response.fitts).toMatchObject({ distancePx: expect.any(Number), targetWidthPx: expect.any(Number), indexDifficulty: expect.any(Number), throughput: expect.any(Number) });
    expect(responseEvent.response.adaptivePrecision).toMatchObject({
      routeLabel: expect.any(String),
      pathEfficiency: expect.any(Number),
      overshootCount: expect.any(Number),
      correctionCount: expect.any(Number),
      dwellTimeMs: expect.any(Number),
    });
    expect(responseEvent.response.pointerSummary.privacy.rawPointerPathStored).toBe(false);
    expect(JSON.stringify(responseEvent)).not.toContain('samples');

    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ totalTrials: 1, accuracy: 1, meanScore: 1 }));
  });

  it('marks kinematics as not measurable and uses a neutral route label for a touch-like trial (2 samples)', async () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const onGameEvent = vi.fn();
    const onComplete = vi.fn();

    render(<PrecisionTargetingTask active trialCount={1} width={600} height={400} onGameEvent={onGameEvent} onComplete={onComplete} />);

    const startPad = screen.getByTestId('precision-start-pad');
    await act(async () => {
      now = 50;
      fireEvent.click(startPad, { clientX: 300, clientY: 200 });
    });

    const target = screen.getByTestId('precision-target');
    const taskArea = screen.getByTestId('precision-task-area');
    const x = Number(target.dataset.x);
    const y = Number(target.dataset.y);
    // Touch tap: no pointermove between the start pad and the response.
    await act(async () => {
      now = 300;
      fireEvent.click(taskArea, { clientX: x, clientY: y });
      vi.runOnlyPendingTimers();
    });

    const responseEvent = onGameEvent.mock.calls.map(([event]) => event).find((event) => event.eventType === 'response');
    expect(responseEvent.response.pointerSummary.sampleCount).toBe(2);
    expect(responseEvent.response.adaptivePrecision.measurable).toBe(false);
    expect(responseEvent.response.adaptivePrecision.routeLabel).toBe('Ruta registrada');
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('keeps measurable kinematics and the quality route label for a mouse-like trial (real path)', async () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const onGameEvent = vi.fn();

    render(<PrecisionTargetingTask active trialCount={1} width={600} height={400} onGameEvent={onGameEvent} />);

    const startPad = screen.getByTestId('precision-start-pad');
    await act(async () => {
      now = 50;
      fireEvent.click(startPad, { clientX: 300, clientY: 200 });
    });

    const target = screen.getByTestId('precision-target');
    const taskArea = screen.getByTestId('precision-task-area');
    const x = Number(target.dataset.x);
    const y = Number(target.dataset.y);
    fireEvent.pointerMove(taskArea, { clientX: 320, clientY: 210 });
    now = 250;
    fireEvent.pointerMove(taskArea, { clientX: 380, clientY: 240 });
    await act(async () => {
      now = 300;
      fireEvent.click(taskArea, { clientX: x, clientY: y });
      vi.runOnlyPendingTimers();
    });

    const responseEvent = onGameEvent.mock.calls.map(([event]) => event).find((event) => event.eventType === 'response');
    expect(responseEvent.response.pointerSummary.sampleCount).toBeGreaterThanOrEqual(4);
    expect(responseEvent.response.adaptivePrecision.measurable).toBe(true);
    expect(responseEvent.response.adaptivePrecision.routeLabel).not.toBe('Ruta registrada');
  });

  it('does not reset an in-flight trial when the stage re-measures the viewport mid-trial', () => {
    const onGameEvent = vi.fn();
    const { rerender } = render(<PrecisionTargetingTask active trialCount={1} width={600} height={400} onGameEvent={onGameEvent} />);

    fireEvent.click(screen.getByTestId('precision-start-pad'), { clientX: 300, clientY: 200 });
    const targetBefore = screen.getByTestId('precision-target');
    const xBefore = targetBefore.dataset.x;
    const yBefore = targetBefore.dataset.y;
    const taskArea = screen.getByTestId('precision-task-area');

    // The stage re-measures (window resize / rotation) mid-trial.
    rerender(<PrecisionTargetingTask active trialCount={1} width={520} height={290} onGameEvent={onGameEvent} />);

    // Locked geometry: no reset, no duplicate stimulus, canvas keeps its size.
    expect(screen.getByTestId('precision-target').dataset.x).toBe(xBefore);
    expect(screen.getByTestId('precision-target').dataset.y).toBe(yBefore);
    expect(screen.getByTestId('precision-start-pad')).toBeDisabled();
    expect(taskArea.style.width).toBe('600px');
    expect(taskArea.style.height).toBe('400px');
    const stimulusEvents = onGameEvent.mock.calls.filter(([event]) => event.eventType === 'stimulus_shown');
    expect(stimulusEvents).toHaveLength(1);
  });
});

describe('PrecisionTargetingTask EN copy (t_42978412)', () => {
  it('renders the game chrome in English when the provider language is en', () => {
    window.localStorage.setItem('krumm-lang', 'en');
    render(
      <LanguageProvider>
        <PrecisionTargetingTask active trialCount={1} width={600} height={400} onGameEvent={vi.fn()} />
      </LanguageProvider>,
    );

    expect(screen.getAllByText(/Adaptive precision route/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Target 1 of 1')).toBeInTheDocument();
    expect(screen.getByText(/Not simple RT: touch the start point/i)).toBeInTheDocument();
    expect(screen.getByText('Ideal corridor')).toBeInTheDocument();
    expect(screen.getByText('Controlled start')).toBeInTheDocument();
    expect(screen.getByText('Active target')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start point' })).toHaveTextContent('Start');
    expect(screen.getByText('Touch the start point')).toBeInTheDocument();
    window.localStorage.removeItem('krumm-lang');
  });
});
