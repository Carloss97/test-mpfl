import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../i18n/LanguageContext.jsx';
import VisualSearchTask, {
  buildVisualSearchGridMetrics,
  buildVisualSearchTilePresentation,
  buildVisualSearchTrials,
  summarizeVisualSearchResults,
} from './VisualSearchTask.jsx';

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

// Park–Miller LCG — mismo patrón que goNoGo.test.jsx (B.3) / colorInterference.test.jsx (B.4):
// rng inyectable para tests deterministas de secuencias aleatorizadas.
function lcg(seed) {
  let s = Math.abs(Math.floor(seed)) % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const TRIAL_SIGNATURE = (trials) => trials.map((trial) => (
  `${trial.setSize}:${trial.targetIndex}:${trial.items.map((item) => item.symbol).join('')}`
));

describe('VisualSearchTask helpers', () => {
  it('builds trials with one target among distractors and increasing set sizes', () => {
    const trials = buildVisualSearchTrials({ width: 600, height: 400, count: 3, rng: lcg(5) });

    expect(trials).toHaveLength(3);
    expect(trials[0].items.filter((item) => item.isTarget)).toHaveLength(1);
    expect(trials[1].items.length).toBeGreaterThan(trials[0].items.length);
    expect(trials.every((trial) => trial.items.every((item) => item.x >= 0 && item.x <= 600 && item.y >= 0 && item.y <= 400))).toBe(true);
  });

  // FASE B.5 (VSP-P2-3): la rejilla se calcula con el tamaño REAL del canvas
  // (el stage pasa 240×280 como piso; el código legado usaba safeWidth = max(260, w)
  // mientras el task-area se renderizaba con w=240 → columna derecha cortada por
  // overflow:hidden en setSize 20). Piso de tile 44 px (AA touch ≥44).
  it('keeps every tile fully inside the rendered canvas with ≥44px touch targets at stage sizes (VSP-P2-3)', () => {
    const cases = [
      { width: 240, height: 280 }, // piso del stage (clamp 240×280)
      { width: 312, height: 340 }, // móvil 390×844 (B.4: canvas 312×340)
      { width: 520, height: 290 }, // desktop-compact 1280×720 (B.4: canvas 520×290)
    ];
    for (const { width, height } of cases) {
      const trials = buildVisualSearchTrials({ width, height, count: 4, rng: lcg(11) });
      expect(trials.map((trial) => trial.setSize)).toEqual([8, 12, 16, 20]);
      for (const trial of trials) {
        for (const item of trial.items) {
          const half = item.tileSize / 2;
          expect(item.x - half, `x-left ${width}×${height} size ${trial.setSize}`).toBeGreaterThanOrEqual(-0.01);
          expect(item.x + half, `x-right ${width}×${height} size ${trial.setSize}`).toBeLessThanOrEqual(width + 0.01);
          expect(item.y - half, `y-top ${width}×${height} size ${trial.setSize}`).toBeGreaterThanOrEqual(-0.01);
          expect(item.y + half, `y-bottom ${width}×${height} size ${trial.setSize}`).toBeLessThanOrEqual(height + 0.01);
          expect(item.tileSize, `tileSize ${width}×${height} size ${trial.setSize}`).toBeGreaterThanOrEqual(44);
        }
      }
    }
  });

  it('computes responsive visual-search grid metrics for compact viewports', () => {
    expect(buildVisualSearchGridMetrics({ width: 360, height: 240, setSize: 8 })).toMatchObject({
      cols: 4,
      rows: 2,
      tileSize: 44,
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
    const [trial] = buildVisualSearchTrials({ width: 600, height: 400, count: 1, rng: lcg(21) });
    const target = trial.items.find((item) => item.isTarget);
    const distractor = trial.items.find((item) => !item.isTarget);

    expect(target.color).toBe(distractor.color);
    expect(target.containerTone).toBe('neutral');
    expect(target.preSelectionHighlight).toBe(false);
  });

  // FASE B.5 (VSP-P2-4): el array (celda objetivo + símbolos distractor) se
  // aleatoriza por sesión con rng inyectable; la rampa de setSize (8→12→16→20)
  // se conserva (diseño "set_size"). El código legado era determinista
  // ((5i+3) % size; símbolo (i+trial) % 4) → todos los candidatos veían los
  // mismos 4 panels, y en el flujo eval de 12 trials el panel 0 ≡ panel 8.
  it('randomizes target cell and distractor symbols per session with injectable rng (VSP-P2-4)', () => {
    const base = { width: 520, height: 290, count: 6 };
    const a = buildVisualSearchTrials({ ...base, rng: lcg(42) });
    const aRepeat = buildVisualSearchTrials({ ...base, rng: lcg(42) });
    const b = buildVisualSearchTrials({ ...base, rng: lcg(43) });

    expect(TRIAL_SIGNATURE(a)).toEqual(TRIAL_SIGNATURE(aRepeat)); // reproducibilidad por seed
    expect(TRIAL_SIGNATURE(b)).not.toEqual(TRIAL_SIGNATURE(a)); // sensibilidad al seed

    for (const trial of a) {
      expect(trial.items.filter((item) => item.isTarget)).toHaveLength(1);
      expect(trial.items.find((item) => item.isTarget).symbol).toBe('●');
      for (const item of trial.items) {
        if (!item.isTarget) expect(['○', '◇', '□', '△']).toContain(item.symbol);
      }
    }
  });

  it('keeps the setSize difficulty ramp and never repeats an identical panel within a 12-trial run (VSP-P2-4)', () => {
    const trials = buildVisualSearchTrials({ width: 520, height: 290, count: 12, rng: lcg(99) });

    expect(trials.map((trial) => trial.setSize)).toEqual([8, 12, 16, 20, 8, 12, 16, 20, 8, 12, 16, 20]);

    const seen = new Set();
    for (const trial of trials) {
      const key = TRIAL_SIGNATURE([trial])[0];
      expect(seen.has(key), `panel repetido (size ${trial.setSize}, target ${trial.targetIndex})`).toBe(false);
      seen.add(key);
    }
  });

  it('summarizes visual search accuracy, RT and search efficiency', () => {
    const summary = summarizeVisualSearchResults([
      { correct: true, outcome: 'target_found', reactionTimeMs: 800, setSize: 8, distractorCount: 7, clickDistanceToTargetPx: 4, searchEfficiency: 1 },
      { correct: false, outcome: 'distractor_click', reactionTimeMs: 1200, setSize: 12, distractorCount: 11, clickDistanceToTargetPx: 80, searchEfficiency: 0 },
    ]);

    expect(summary).toMatchObject({ totalTrials: 2, accuracy: 0.5, meanRT: 1000, meanSetSize: 10, meanDistractorCount: 9 });
    expect(summary.searchEfficiency).toBeGreaterThan(0);
    expect(summary.errorRate).toBe(0.5);
  });

  // FASE B.5 (VSP-P2-1): claves de contrato del session builder
  // (summarizeCompletedBlocks: completedTrialCount, meanReactionTimeMs,
  // score ?? meanScore) + timeouts excluidos de la RT de aciertos.
  it('carries session-builder contract keys and treats timeouts as misses without RT signal (VSP-P2-1)', () => {
    const summary = summarizeVisualSearchResults([
      { correct: true, outcome: 'target_found', reactionTimeMs: 800, setSize: 8, distractorCount: 7, clickDistanceToTargetPx: 12, searchEfficiency: 1 },
      { correct: false, outcome: 'timeout', timedOut: true, reactionTimeMs: 10000, setSize: 12, distractorCount: 11, clickDistanceToTargetPx: null, searchEfficiency: 0 },
    ], 2);

    expect(summary).toMatchObject({
      gameId: 'visual_search',
      trialCount: 2,
      totalTrials: 2,
      completedTrialCount: 2,
      accuracy: 0.5,
      errorRate: 0.5,
      timeoutCount: 1,
      meanReactionTimeMs: 800, // solo RT de aciertos
      meanScore: 0.5,
      meanClickDistanceToTargetPx: 12, // solo valores finitos (timeout = null)
    });
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

  it('emits privacy-safe visual search telemetry on target hit (keyboard fallback: pointer = centro del tile)', async () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const onGameEvent = vi.fn();
    const onComplete = vi.fn();

    render(<VisualSearchTask active trialCount={1} width={600} height={400} rng={lcg(3)} onGameEvent={onGameEvent} onComplete={onComplete} />);

    expect(screen.getByText(/Búsqueda visual/i)).toBeInTheDocument();
    // Orden hijo-ante-padre (sistémico B.3): no se asume orden entre
    // stimulus_shown y game_start — se busca cada uno por su evento.
    const events = onGameEvent.mock.calls.map(([event]) => event);
    expect(events.some((event) => event.eventType === 'game_start' && event.gameId === 'visual_search')).toBe(true);
    const stimulus = events.find((event) => event.eventType === 'stimulus_shown');
    expect(stimulus).toMatchObject({ trialId: 'visual-search-0' });
    expect(stimulus.gameState).toMatchObject({ difficulty: 'visual_search' });

    const target = screen.getByTestId('visual-search-target');
    const x = Number(target.dataset.x);
    const y = Number(target.dataset.y);

    await act(async () => {
      now = 850;
      // Sin clientX/clientY ni detail → activación de teclado → fallback
      // al centro del tile (no se penaliza la localización por no-uso de puntero).
      fireEvent.click(target);
      vi.runOnlyPendingTimers();
    });

    const responseEvent = events.find((event) => event.eventType === 'response')
      ?? onGameEvent.mock.calls.map(([event]) => event).find((event) => event.eventType === 'response');
    expect(responseEvent).toBeTruthy();
    expect(responseEvent.pointer).toEqual({ x, y }); // fallback teclado = centro del tile
    expect(responseEvent.response).toMatchObject({ correct: true, outcome: 'target_found', reactionTimeMs: 850, score: expect.any(Number) });
    expect(responseEvent.response.visualSearch).toMatchObject({ setSize: expect.any(Number), distractorCount: expect.any(Number), searchEfficiency: expect.any(Number) });
    expect(responseEvent.response.visualSearch.clickDistanceToTargetPx).toBe(0);
    expect(JSON.stringify(responseEvent)).not.toContain('items');

    const end = onGameEvent.mock.calls.map(([event]) => event).find((event) => event.eventType === 'game_end');
    expect(end).toBeTruthy();
    expect(end.gameState).toMatchObject({ score: 100, level: 1, difficulty: 'visual_search' }); // 0-100 (VSP-P3-2)

    expect(onComplete).toHaveBeenCalledTimes(1);
    const summary = onComplete.mock.calls[0][0];
    expect(summary).toMatchObject({
      gameId: 'visual_search',
      trialCount: 1,
      totalTrials: 1,
      completedTrialCount: 1,
      accuracy: 1,
      timeoutCount: 0,
    });
    expect(Number.isFinite(summary.meanReactionTimeMs)).toBe(true); // contrato VSP-P2-1
    expect(Number.isFinite(summary.meanScore)).toBe(true); // contrato VSP-P2-1
  });

  // FASE B.5 (VSP-P2-2, note (c)): localización REAL del click (coordenadas del
  // evento relativas al canvas), no el centro de la celda. Antes: pointer =
  // {x: item.x, y: item.y} y clickDistanceToTargetPx = distancia celda-celda.
  it('records true pointer localization from the click point (VSP-P2-2)', async () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const onGameEvent = vi.fn();

    render(<VisualSearchTask active trialCount={1} width={600} height={400} rng={lcg(7)} onGameEvent={onGameEvent} onComplete={vi.fn()} />);

    const target = screen.getByTestId('visual-search-target');
    const tx = Number(target.dataset.x);
    const ty = Number(target.dataset.y);

    await act(async () => {
      now = 850;
      // jsdom: getBoundingClientRect() = 0,0 → pointer = coords del evento.
      fireEvent.click(target, { clientX: 100, clientY: 120, detail: 1 });
    });

    const responseEvent = onGameEvent.mock.calls.map(([event]) => event).find((event) => event.eventType === 'response');
    expect(responseEvent.pointer).toEqual({ x: 100, y: 120 });
    const expectedDistance = Math.round(Math.hypot(100 - tx, 120 - ty) * 100) / 100;
    expect(responseEvent.response.visualSearch.clickDistanceToTargetPx).toBeCloseTo(expectedDistance, 1);
  });

  // FASE B.5 (VSP-P1-1): todo trial termina (click O timeout) — antes el trial
  // sin click permanecía abierto para siempre (batería trabada; el resto de la
  // familia stable_dg tiene timeout por trial: SimpleRT 3000 ms, GoNoGo, CI 3200 ms).
  it('ends the trial on timeout and completes the game (VSP-P1-1)', async () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const onGameEvent = vi.fn();
    const onComplete = vi.fn();

    render(<VisualSearchTask active trialCount={1} width={600} height={400} trialTimeoutMs={1500} rng={lcg(3)} onGameEvent={onGameEvent} onComplete={onComplete} />);

    await act(async () => {
      now = 1500;
      vi.advanceTimersByTime(1500);
    });

    const events = onGameEvent.mock.calls.map(([event]) => event);
    const responseEvent = events.find((event) => event.eventType === 'response');
    expect(responseEvent).toMatchObject({ trialId: 'visual-search-0' });
    expect(responseEvent.response).toMatchObject({ correct: false, outcome: 'timeout', reactionTimeMs: 1500, score: 0, timedOut: true });
    expect(responseEvent.pointer).toBeUndefined(); // sin click → sin puntero
    expect(responseEvent.response.visualSearch).toMatchObject({ timedOut: true });
    expect(responseEvent.response.visualSearch.clickDistanceToTargetPx).toBeNull();

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0][0]).toMatchObject({ accuracy: 0, timeoutCount: 1, completedTrialCount: 1 });
    const end = events.find((event) => event.eventType === 'game_end');
    expect(end.gameState).toMatchObject({ score: 0, difficulty: 'visual_search' });
  });

  // FASE B.5 (VSP-P1-2, patrón B.2 initialSizeRef): la re-medición del stage
  // (resize/visualViewport a mitad de sesión) NO reconstruye los trials ni
  // re-emite stimulus_shown (estímulo huérfano + reset de RT en el código legado,
  // rollup línea B.5: "tiene el mismo patrón (línea 138)").
  it('locks geometry at mount: stage re-measurement mid-trial does not reset or re-emit (VSP-P1-2)', async () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const onGameEvent = vi.fn();
    const onComplete = vi.fn();

    const r = render(<VisualSearchTask active trialCount={2} width={600} height={400} rng={lcg(7)} onGameEvent={onGameEvent} onComplete={onComplete} />);
    const stimulusCount = () => onGameEvent.mock.calls.filter(([event]) => event.eventType === 'stimulus_shown').length;
    expect(stimulusCount()).toBe(1);

    const target0 = screen.getByTestId('visual-search-target');
    await act(async () => {
      now = 850;
      fireEvent.click(target0);
    });
    await act(async () => {
      now = 1300;
      vi.advanceTimersByTime(450); // ITI (350 × jitter ≤ 437.5)
    });
    expect(stimulusCount()).toBe(2);
    const target1x = screen.getByTestId('visual-search-target').dataset.x;

    // El stage re-mide el viewport y pasa nuevos width/height (resize/rotación).
    r.rerender(<VisualSearchTask active trialCount={2} width={300} height={250} rng={lcg(7)} onGameEvent={onGameEvent} onComplete={onComplete} />);

    expect(stimulusCount()).toBe(2); // sin re-emisión (estímulo huérfano)
    expect(screen.getByTestId('visual-search-target').dataset.x).toBe(target1x); // panel intacto
    expect(screen.getByTestId('visual-search-area').style.width).toBe('600px'); // canvas conserva el tamaño inicial
    expect(onGameEvent.mock.calls.filter(([event]) => event.eventType === 'response').length).toBe(1); // RT no reseteada
  });

  // FASE B.5 (VSP-P3-4, patrón CIP-P3-4): StrictMode (dev) no duplica
  // stimulus_shown del trial 0.
  it('does not duplicate stimulus_shown under StrictMode (VSP-P3-4)', async () => {
    vi.useFakeTimers();
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const onGameEvent = vi.fn();

    render(
      <React.StrictMode>
        <VisualSearchTask active trialCount={1} width={600} height={400} rng={lcg(3)} onGameEvent={onGameEvent} onComplete={vi.fn()} />
      </React.StrictMode>,
    );
    await act(async () => { now = 100; });

    const stimuli = onGameEvent.mock.calls.filter(([event]) => event.eventType === 'stimulus_shown');
    expect(stimuli).toHaveLength(1);
  });

  // FASE B.5 (VSP-P3-5, patrón CIP-P3-5): un segundo click en el mismo trial
  // (doble-tap ultra-rápido) no emite una segunda response ni duplica el trial
  // en el summary.
  it('ignores a second click on the same trial (handledRef, VSP-P3-5)', async () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const onGameEvent = vi.fn();
    const onComplete = vi.fn();

    render(<VisualSearchTask active trialCount={2} width={600} height={400} itiMs={400} rng={lcg(3)} onGameEvent={onGameEvent} onComplete={onComplete} />);
    const target = screen.getByTestId('visual-search-target');

    await act(async () => {
      now = 500;
      fireEvent.click(target);
      fireEvent.click(target); // doble-click antes del re-render
    });

    const responses = onGameEvent.mock.calls.filter(([event]) => event.eventType === 'response');
    expect(responses).toHaveLength(1);

    await act(async () => {
      now = 1200;
      vi.advanceTimersByTime(700); // ITI ≤ 500 → trial 2
    });
    const target2 = screen.getByTestId('visual-search-target');
    await act(async () => {
      now = 2000;
      fireEvent.click(target2);
      vi.runOnlyPendingTimers();
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0][0].completedTrialCount).toBe(2); // 1 resultado por trial
  });

  // FASE B.5 (VSP-P2-5, patrón CIP-P2-3): el ITI se rastrea (itiRef) y se
  // limpia en unmount — sin onComplete tardío tras abortar la sesión.
  it('does not call onComplete late when unmounted during ITI (VSP-P2-5)', async () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const onGameEvent = vi.fn();
    const onComplete = vi.fn();

    const r = render(<VisualSearchTask active trialCount={2} width={600} height={400} itiMs={400} rng={lcg(3)} onGameEvent={onGameEvent} onComplete={onComplete} />);
    const target = screen.getByTestId('visual-search-target');

    await act(async () => {
      now = 500;
      fireEvent.click(target); // agenda ITI ≤ 500 ms
    });
    r.unmount();
    await act(async () => {
      now = 20000;
      vi.advanceTimersByTime(20000);
    });
    expect(onComplete).not.toHaveBeenCalled();
  });

  // FASE B.5 (VSP-P2-5, patrón CIP-P2-5): ITI con jitter [0.75, 1.25] × itiMs.
  // Se mide el delay del setTimeout registrado (el timestamp del estímulo
  // refleja el momento del flush del effect, no el del firing del timer).
  it('jitters the ITI within [0.75, 1.25] × itiMs (VSP-P2-5)', async () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const setSpy = vi.spyOn(window, 'setTimeout');
    const onGameEvent = vi.fn();

    render(<VisualSearchTask active trialCount={2} width={600} height={400} itiMs={400} rng={lcg(3)} onGameEvent={onGameEvent} onComplete={vi.fn()} />);
    const target = screen.getByTestId('visual-search-target');

    await act(async () => {
      now = 500;
      fireEvent.click(target);
    });
    const itiDelays = setSpy.mock.calls
      .map((call) => call[1])
      .filter((delay) => Number.isFinite(delay) && delay >= 100 && delay <= 1000);
    expect(itiDelays).toHaveLength(1); // 1 ITI pendiente (el trial timeout de 10000 ms queda filtrado)
    expect(itiDelays[0]).toBeGreaterThanOrEqual(300 - 1); // 0.75 × 400
    expect(itiDelays[0]).toBeLessThanOrEqual(500 + 1); // 1.25 × 400
  });

  // FASE B.5: layout compacto — el brief standalone y la caption se retiran;
  // la instrucción vive en el header pill (fit en stage 290/340 px, patrón B.4).
  it('renders the objective as a header pill (brief/caption removed) with ≥44px tiles', () => {
    render(<VisualSearchTask active trialCount={1} width={360} height={240} rng={lcg(3)} onGameEvent={vi.fn()} onComplete={vi.fn()} />);

    expect(screen.queryByText(/Panel de búsqueda activa/i)).toBeNull(); // brief retirado
    const objective = screen.getByText(/Objetivo: punto sólido/i);
    expect(objective.className).toContain('task-progress');
    const target = screen.getByRole('button', { name: /Objetivo: punto sólido/i });
    expect(target).toHaveClass('visual-search-task__tile');
    expect(target).toHaveClass('visual-search-task__tile--target');
    expect(target).toHaveAttribute('data-preselection-highlight', 'false');
    expect(target.style.width).toBe('44px'); // piso AA touch (antes 42)
  });

  it('shows a styled feedback overlay between trials', async () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const onGameEvent = vi.fn();

    render(<VisualSearchTask active trialCount={2} width={600} height={400} itiMs={400} rng={lcg(3)} onGameEvent={onGameEvent} onComplete={vi.fn()} />);
    const target = screen.getByTestId('visual-search-target');

    await act(async () => {
      now = 850;
      fireEvent.click(target);
    });
    const feedback = screen.getByTestId('visual-search-feedback');
    expect(feedback).toHaveClass('visual-search-task__feedback--correct');
    expect(feedback.textContent).toContain('850ms');
  });
});

describe('VisualSearchTask EN copy (t_42978412)', () => {
  it('renders header, objective pill and tiles in English (brief/caption removed)', () => {
    window.localStorage.setItem('krumm-lang', 'en');
    render(
      <LanguageProvider>
        <VisualSearchTask active trialCount={1} width={600} height={400} rng={lcg(3)} onGameEvent={vi.fn()} onComplete={vi.fn()} />
      </LanguageProvider>,
    );

    expect(screen.getByText(/Visual search/i)).toBeInTheDocument();
    expect(screen.getByText('Panel 1 of 1')).toBeInTheDocument();
    expect(screen.getByText('Target: solid dot')).toBeInTheDocument();
    expect(screen.queryByText(/Active search panel/i)).toBeNull();
    expect(screen.queryByText(/Find the solid dot among distractors/i)).toBeNull(); // caption retirada
    const target = screen.getByRole('button', { name: 'Target: solid dot' });
    expect(target).toHaveClass('visual-search-task__tile--target');
    expect(screen.getAllByRole('button', { name: 'Distractor: geometric shape' }).length).toBeGreaterThan(0);
    window.localStorage.removeItem('krumm-lang');
  });
});
