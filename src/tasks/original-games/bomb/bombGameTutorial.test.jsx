// bombGameTutorial.test.jsx — EXP-BOMB-001 · B4: tutorial T1-T5 + welcome (card t_b3f1dc15).
//
// Contracto B4 (plan docs/plans/2026-09-07-plan-exp7-bomb.md §4; spec Doc 2 §4/§18):
//  - Bienvenida §4.1 (copy exacto: título/bajada/mensaje/CTA/secundario + ajustes).
//  - Tutorial guiado T1-T5 (overlays exactos §4.2; avance automático por criterio;
//    panel fresh en T4 y T5; T3 con anillo de progreso SOLO en tutorial; T5 =
//    lectura → delay breve → ejecución sin manual).
//  - Salida §4.3 (modal exacto + "Comenzar evaluación").
//  - Replay (tutorial_replay_count; INPUT_RESTART_TUTORIAL) desde overlay y modal.
//  - DoD §16.2: el tutorial NO alimenta scores evaluativos.
//  - Flujo welcome → T5 → L1 sin errores.
//
// Metodología: misma que bombGamePhases.test.jsx (fake timers + rAF funcional +
// reloj falso inyectado al motor vía nowFn).

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../../i18n/LanguageContext.jsx';
import BombDefusalGame from './bombGame.jsx';
import { BOMB_RULE_MANIFEST } from './bombRules.js';

vi.mock('../originalGameSfx.js', async (importOriginal) => {
  const actual = await importOriginal();
  // Mock ESTADÍSTICO: el toggle §4.1 necesita que getGameSfxEnabled refleje el
  // último setGameSfxEnabled (el mock de otros archivos es constante: solo SFX play).
  let enabled = true;
  return {
    ...actual,
    playSfx: vi.fn(() => true),
    getGameSfxEnabled: vi.fn(() => enabled),
    setGameSfxEnabled: vi.fn((value) => { enabled = Boolean(value); }),
  };
});
// setGameSfxEnabled se importa aquí para aserciones del ajuste §4.1
import { setGameSfxEnabled } from '../originalGameSfx.js';

function createFakeClock(start = 0) {
  let t = start;
  return {
    now: () => t,
    advance: (ms) => { t += Math.max(0, ms); },
    get: () => t,
  };
}

function renderGame(props = {}) {
  const onGameEvent = vi.fn();
  const utils = render(
    <LanguageProvider>
      <BombDefusalGame active onGameEvent={onGameEvent} {...props} />
    </LanguageProvider>,
  );
  return { onGameEvent, ...utils };
}

function forwardEvents(onGameEvent, eventName) {
  return onGameEvent.mock.calls
    .map(([event]) => event)
    .filter((event) => event.eventType === 'response' && event.response?.bomb?.event === eventName);
}

async function step(clock, ms) {
  await act(async () => {
    clock.advance(ms);
    vi.advanceTimersByTime(ms);
  });
}

async function holdFor(clock, ms = 2000) {
  const hold = screen.getByTestId('bomb-hold-btn');
  fireEvent.pointerDown(hold);
  await step(clock, ms);
  fireEvent.pointerUp(hold);
}

const T5 = BOMB_RULE_MANIFEST.tutorial.segments[2];

/** Juega el tutorial guiado completo (T1-T5). Termina en el modal §4.3 (LEVEL_SUCCESS). */
async function completeTutorial(clock) {
  fireEvent.click(screen.getByTestId('bomb-start-practice'));
  // S1: T1 → T2 → T3
  expect(screen.getByTestId('bomb-tutorial-instruction')).toHaveTextContent('Activa el Interruptor 1.');
  fireEvent.click(screen.getByTestId('bomb-switch-SW_1'));
  expect(screen.getByTestId('bomb-tutorial-instruction')).toHaveTextContent('Corta el cable rojo.');
  fireEvent.click(screen.getByTestId('bomb-wire-WIRE_RED'));
  expect(screen.getByTestId('bomb-tutorial-instruction'))
    .toHaveTextContent('Mantén presionado el botón amarillo durante 2 segundos.');
  await holdFor(clock);
  // S2: T4 (panel fresh)
  expect(screen.getByTestId('bomb-tutorial-instruction')).toHaveTextContent('Ahora ejecuta: SW1 → Rojo → Amarillo.');
  fireEvent.click(screen.getByTestId('bomb-switch-SW_1'));
  fireEvent.click(screen.getByTestId('bomb-wire-WIRE_RED'));
  await holdFor(clock);
  // S3: T5 (lectura → delay → ejecución)
  expect(screen.getByTestId('bomb-tutorial-instruction')).toHaveTextContent(
    'Lee la secuencia. La pantalla se ocultará brevemente.',
  );
  await step(clock, T5.readMs + 128);
  expect(screen.getByTestId('bomb-delay-screen')).toBeInTheDocument();
  await step(clock, T5.delayMs + 128);
  expect(screen.getByTestId('bomb-manual-placeholder')).toHaveTextContent('···');
  fireEvent.click(screen.getByTestId('bomb-switch-SW_1'));
  fireEvent.click(screen.getByTestId('bomb-wire-WIRE_RED'));
  await holdFor(clock);
  expect(screen.getByTestId('bomb-practice-done')).toBeInTheDocument();
}

beforeEach(() => {
  vi.useFakeTimers();
  // rAF funcional: cada frame = setTimeout 16 ms (avanzado por vi.advanceTimersByTime).
  vi.stubGlobal('requestAnimationFrame', (cb) => window.setTimeout(() => cb(0), 16));
  vi.stubGlobal('cancelAnimationFrame', (id) => window.clearTimeout(id));
  Object.defineProperty(window, 'innerWidth', { value: 1280, writable: true, configurable: true });
  vi.clearAllMocks();
  try { window.localStorage?.clear?.(); } catch { /* jsdom ok */ }
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('B4 — bienvenida §4.1 (copy exacto + ajustes de audio/accesibilidad)', () => {
  it('título, bajada, MENSAJE (nuevo B4), CTA y secundario — texto exacto de Doc 2 §4.1', () => {
    renderGame({ nowFn: createFakeClock().now });
    const welcome = screen.getByTestId('bomb-welcome');
    expect(welcome).toHaveTextContent('Simulación de Protocolo Operativo: Desactivación');
    expect(welcome).toHaveTextContent('Memoriza el protocolo y ejecuta cada paso en el orden indicado.');
    expect(screen.getByTestId('bomb-welcome-message')).toHaveTextContent(
      'Las instrucciones pueden desaparecer antes de que puedas interactuar con el panel. Revisa con atención el tipo de artefacto y el tiempo disponible.',
    );
    expect(screen.getByTestId('bomb-start-practice')).toHaveTextContent('Iniciar práctica');
    expect(screen.getByTestId('bomb-welcome-secondary')).toHaveTextContent('Ajustes de audio / accesibilidad');
  });

  it('secundario §4.1: abre ajustes; el toggle de audio funciona (setGameSfxEnabled) y se actualiza', () => {
    const clock = createFakeClock();
    setGameSfxEnabled(true); // estado conocido del mock (persiste entre tests del archivo)
    renderGame({ nowFn: clock.now });
    expect(screen.queryByTestId('bomb-settings')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('bomb-welcome-secondary'));
    const settings = screen.getByTestId('bomb-settings');
    expect(settings).toBeInTheDocument();
    expect(screen.getByTestId('bomb-settings-audio')).toHaveTextContent('ON');
    // A11y §14: resumen de accesibilidad presente (no es un control falso)
    expect(screen.getByTestId('bomb-settings-a11y')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('bomb-settings-audio'));
    expect(setGameSfxEnabled).toHaveBeenCalledWith(false);
    expect(screen.getByTestId('bomb-settings-audio')).toHaveTextContent('OFF');
    fireEvent.click(screen.getByTestId('bomb-settings-audio'));
    expect(setGameSfxEnabled).toHaveBeenLastCalledWith(true);
    expect(screen.getByTestId('bomb-settings-audio')).toHaveTextContent('ON');
  });

  it('CTA "Iniciar práctica": BOOT → TUTORIAL_PLAY (overlay T1 visible)', () => {
    const clock = createFakeClock();
    renderGame({ nowFn: clock.now });
    fireEvent.click(screen.getByTestId('bomb-start-practice'));
    expect(screen.queryByTestId('bomb-welcome')).not.toBeInTheDocument();
    expect(screen.getByTestId('bomb-tutorial-node')).toHaveTextContent('T1');
    expect(screen.getByTestId('bomb-tutorial-instruction')).toHaveTextContent('Activa el Interruptor 1.');
    expect(screen.getByTestId('bomb-level').textContent).toContain('Práctica');
  });
});

describe('B4 — tutorial guiado T1-T5 (overlays exactos §4.2, avance por criterio, panel fresh)', () => {
  it('T1→T2→T3: el nodo cambia con cada paso validado; pips marcan avance', async () => {
    const clock = createFakeClock();
    renderGame({ nowFn: clock.now });
    await act(async () => {});
    fireEvent.click(screen.getByTestId('bomb-start-practice'));
    const tutorial = screen.getByTestId('bomb-tutorial');
    // 5 pips (T1..T5); T1 activo, ninguno completado
    const pips = tutorial.querySelectorAll('.bomb-tutorial__pip');
    expect(pips).toHaveLength(5);
    expect(tutorial.querySelectorAll('.bomb-tutorial__pip--done')).toHaveLength(0);
    fireEvent.click(screen.getByTestId('bomb-switch-SW_1'));
    expect(screen.getByTestId('bomb-tutorial-instruction')).toHaveTextContent('Corta el cable rojo.');
    fireEvent.click(screen.getByTestId('bomb-wire-WIRE_RED'));
    expect(screen.getByTestId('bomb-tutorial-instruction'))
      .toHaveTextContent('Mantén presionado el botón amarillo durante 2 segundos.');
    expect(tutorial.querySelectorAll('.bomb-tutorial__pip--done')).toHaveLength(2);
  });

  it('T3: anillo de progreso del hold SOLO en tutorial (Doc 2 §7); visible al presionar', async () => {
    const clock = createFakeClock();
    renderGame({ nowFn: clock.now });
    fireEvent.click(screen.getByTestId('bomb-start-practice'));
    fireEvent.click(screen.getByTestId('bomb-switch-SW_1'));
    fireEvent.click(screen.getByTestId('bomb-wire-WIRE_RED'));
    const hold = screen.getByTestId('bomb-hold-btn');
    fireEvent.pointerDown(hold);
    expect(screen.getByTestId('bomb-hold-ring')).toBeInTheDocument();
    await step(clock, 2000);
    fireEvent.pointerUp(hold);
  });

  it('T3→T4: al completar el hold, el panel se reinicia (fresh) y el nodo pasa a T4', async () => {
    const clock = createFakeClock();
    const { onGameEvent } = renderGame({ nowFn: clock.now });
    fireEvent.click(screen.getByTestId('bomb-start-practice'));
    fireEvent.click(screen.getByTestId('bomb-switch-SW_1'));
    expect(screen.getByTestId('bomb-switch-SW_1')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByTestId('bomb-wire-WIRE_RED'));
    await holdFor(clock);
    // T4: overlay exacto + panel fresh (sin estado heredado de T1-T3)
    expect(screen.getByTestId('bomb-tutorial-instruction')).toHaveTextContent('Ahora ejecuta: SW1 → Rojo → Amarillo.');
    expect(screen.getByTestId('bomb-tutorial-node')).toHaveTextContent('T4');
    expect(screen.getByTestId('bomb-switch-SW_1')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('bomb-wire-WIRE_RED')).toHaveTextContent('INTACT');
    expect(screen.getByTestId('bomb-hold-btn')).not.toHaveClass('bomb-hold-btn--pressed');
    // El avance de segmento se registra (analítica §18)
    expect(forwardEvents(onGameEvent, 'TUTORIAL_SEGMENT').at(-1).response.bomb.meta.segment).toBe(2);
    // Sin LEVEL_SUCCESS intermedio (el success del tutorial es el del segmento final)
    expect(forwardEvents(onGameEvent, 'LEVEL_SUCCESS')).toHaveLength(0);
  });

  it('T4: secuencia completa con orden exacto; un ORDER_ERROR no puntúa (sin TIME_PENALTY) y el tutorial continúa', async () => {
    const clock = createFakeClock();
    const { onGameEvent } = renderGame({ nowFn: clock.now });
    fireEvent.click(screen.getByTestId('bomb-start-practice'));
    await holdForSkipToT4(clock);
    // Orden incorrecto en T4: hold antes de SW1 → STEP_ERROR (sin penalización)
    const hold = screen.getByTestId('bomb-hold-btn');
    fireEvent.pointerDown(hold);
    await step(clock, 2000);
    fireEvent.pointerUp(hold);
    const errors = forwardEvents(onGameEvent, 'STEP_ERROR');
    expect(errors.at(-1).response.bomb.meta.error_class).toBe('ORDER_ERROR');
    expect(forwardEvents(onGameEvent, 'TIME_PENALTY')).toHaveLength(0);
    expect(screen.queryByTestId('bomb-fail-overlay')).not.toBeInTheDocument();
    // Recuperación: secuencia exacta → T5
    fireEvent.click(screen.getByTestId('bomb-switch-SW_1'));
    fireEvent.click(screen.getByTestId('bomb-wire-WIRE_RED'));
    await holdFor(clock);
    expect(screen.getByTestId('bomb-tutorial-instruction')).toHaveTextContent(
      'Lee la secuencia. La pantalla se ocultará brevemente.',
    );
  });

  it('T5: lectura (barra de exposición + manual numerado) → delay ("Memoriza la secuencia.") → ejecución sin manual', async () => {
    const clock = createFakeClock();
    renderGame({ nowFn: clock.now });
    await completeTutorialUpToT5(clock);
    // Lectura: caption T5 + líneas del manual + barra de exposición (readMs desde el manifest)
    expect(screen.getByTestId('bomb-tutorial-instruction')).toHaveTextContent(
      'Lee la secuencia. La pantalla se ocultará brevemente.',
    );
    expect(screen.getByText('1. Activa el INTERRUPTOR 1.')).toBeInTheDocument();
    expect(screen.getByText('2. Corta el CABLE ROJO.')).toBeInTheDocument();
    expect(screen.getByText('3. Mantén presionado el BOTÓN AMARILLO durante 2 segundos.')).toBeInTheDocument();
    expect(screen.getByTestId('bomb-exposure-bar')).toBeInTheDocument();
    // Delay: pantalla oscura, manual ausente (sin pistas residuales)
    await step(clock, T5.readMs + 128);
    const delay = screen.getByTestId('bomb-delay-screen');
    expect(delay).toHaveTextContent('Memoriza la secuencia.');
    expect(screen.queryByText('1. Activa el INTERRUPTOR 1.')).not.toBeInTheDocument();
    // Ejecución: manual oculto (···) + panel operable + timer sin límite
    await step(clock, T5.delayMs + 128);
    expect(screen.getByTestId('bomb-manual-placeholder')).toHaveTextContent('···');
    expect(screen.getByTestId('bomb-switch-SW_1')).toBeEnabled();
    expect(screen.getByTestId('bomb-timer')).toHaveAttribute('data-phase', 'idle');
    expect(screen.getByTestId('bomb-level').textContent).toContain('Práctica');
  });

  it('T5 completo → modal de salida §4.3 (LEVEL_SUCCESS del tutorial)', async () => {
    const clock = createFakeClock();
    const { onGameEvent } = renderGame({ nowFn: clock.now });
    await completeTutorial(clock);
    const success = forwardEvents(onGameEvent, 'LEVEL_SUCCESS');
    expect(success).toHaveLength(1);
    expect(success[0].response.bomb.meta.evaluated).toBe(false);
  });
});

describe('B4 — salida del tutorial §4.3 (modal exacto) + flujo welcome→T5→L1', () => {
  it('modal §4.3: texto exacto + botón "Comenzar evaluación" → LEVEL_INTRO L1', async () => {
    const clock = createFakeClock();
    renderGame({ nowFn: clock.now });
    await completeTutorial(clock);
    const modal = screen.getByTestId('bomb-practice-done');
    expect(modal).toHaveTextContent(
      'Práctica completada. Desde el siguiente nivel, tus tiempos y decisiones serán registrados. Las instrucciones pueden cambiar según el tipo de artefacto.',
    );
    expect(screen.getByTestId('bomb-start-evaluation')).toHaveTextContent('Comenzar evaluación');
    fireEvent.click(screen.getByTestId('bomb-start-evaluation'));
    expect(screen.getByTestId('bomb-level-intro')).toBeInTheDocument();
    expect(screen.getByTestId('bomb-level').textContent).toContain('Nivel 1 de 4');
  });
});

describe('B4 — replay (INPUT_RESTART_TUTORIAL, tutorial_replay_count §18)', () => {
  it('replay desde el overlay (T4): vuelve a T1 con panel fresh + TUTORIAL_REPLAY {count:1}', async () => {
    const clock = createFakeClock();
    const { onGameEvent } = renderGame({ nowFn: clock.now });
    fireEvent.click(screen.getByTestId('bomb-start-practice'));
    await holdForSkipToT4(clock);
    expect(screen.getByTestId('bomb-tutorial-instruction')).toHaveTextContent('Ahora ejecuta: SW1 → Rojo → Amarillo.');
    fireEvent.click(screen.getByTestId('bomb-tutorial-restart'));
    // Vuelve al nodo T1 con el panel fresh
    expect(screen.getByTestId('bomb-tutorial-node')).toHaveTextContent('T1');
    expect(screen.getByTestId('bomb-tutorial-instruction')).toHaveTextContent('Activa el Interruptor 1.');
    expect(screen.getByTestId('bomb-switch-SW_1')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('bomb-wire-WIRE_RED')).toHaveTextContent('INTACT');
    const replays = forwardEvents(onGameEvent, 'TUTORIAL_REPLAY');
    expect(replays).toHaveLength(1);
    expect(replays[0].response.bomb.meta.count).toBe(1);
    // Y el tutorial se puede completar de nuevo → modal §4.3
    await completeTutorialFromT1(clock);
    expect(screen.getByTestId('bomb-practice-done')).toBeInTheDocument();
  });

  it('replay desde el modal de salida: TUTORIAL_REPLAY {count:2} acumulado y tutorial fresco', async () => {
    const clock = createFakeClock();
    const { onGameEvent } = renderGame({ nowFn: clock.now });
    // 1º replay (overlay en T4) + tutorial completo + 2º replay (modal)
    fireEvent.click(screen.getByTestId('bomb-start-practice'));
    await holdForSkipToT4(clock);
    fireEvent.click(screen.getByTestId('bomb-tutorial-restart'));
    await completeTutorialFromT1(clock);
    fireEvent.click(screen.getByTestId('bomb-practice-restart'));
    expect(screen.getByTestId('bomb-tutorial-instruction')).toHaveTextContent('Activa el Interruptor 1.');
    const replays = forwardEvents(onGameEvent, 'TUTORIAL_REPLAY');
    expect(replays.map((e) => e.response.bomb.meta.count)).toEqual([1, 2]);
    expect(screen.queryByTestId('bomb-practice-done')).not.toBeInTheDocument();
  });

  it('DoD §16.2: tras tutorial + replays, la evaluación arranca limpia (sin scores del tutorial)', async () => {
    const clock = createFakeClock();
    const { onGameEvent } = renderGame({ nowFn: clock.now });
    fireEvent.click(screen.getByTestId('bomb-start-practice'));
    await holdForSkipToT4(clock);
    fireEvent.click(screen.getByTestId('bomb-tutorial-restart'));
    await completeTutorialFromT1(clock);
    expect(forwardEvents(onGameEvent, 'TIME_PENALTY')).toHaveLength(0);
    expect(forwardEvents(onGameEvent, 'LEVEL_FAIL')).toHaveLength(0);
    const success = forwardEvents(onGameEvent, 'LEVEL_SUCCESS');
    expect(success).toHaveLength(1); // solo el del segmento final
    expect(success[0].response.bomb.meta.evaluated).toBe(false);
    fireEvent.click(screen.getByTestId('bomb-start-evaluation'));
    expect(screen.getByTestId('bomb-level-intro')).toBeInTheDocument();
  });
});

describe('B4 — anillo del hold NO aparece en evaluación (Doc 2 §7: ring SOLO en tutorial)', () => {
  it('L2 en ejecución: presionar el botón no muestra anillo (evaluated:true)', async () => {
    const clock = createFakeClock();
    renderGame({ nowFn: clock.now });
    await completeTutorial(clock);
    fireEvent.click(screen.getByTestId('bomb-start-evaluation')); // → L1 intro
    // L1 (2 pasos, sin hold): completar
    fireEvent.click(screen.getByTestId('bomb-intro-continue'));
    await step(clock, 500);
    fireEvent.click(screen.getByTestId('bomb-encoding-continue')); // L1 lectura libre
    await step(clock, 64);
    fireEvent.click(screen.getByTestId('bomb-switch-SW_1'));
    fireEvent.click(screen.getByTestId('bomb-wire-WIRE_RED'));
    expect(screen.getByTestId('bomb-success-overlay')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('bomb-result-continue')); // → L2 intro
    fireEvent.click(screen.getByTestId('bomb-intro-continue'));
    await step(clock, 500 + 3000 + 128); // countdown + exposición L2
    await step(clock, 2000 + 128); // delay L2
    // Ejecución L2: SW1 → RED → hold (sin anillo: evaluación)
    fireEvent.click(screen.getByTestId('bomb-switch-SW_1'));
    fireEvent.click(screen.getByTestId('bomb-wire-WIRE_RED'));
    const hold = screen.getByTestId('bomb-hold-btn');
    fireEvent.pointerDown(hold);
    await step(clock, 300);
    expect(screen.queryByTestId('bomb-hold-ring')).not.toBeInTheDocument();
    await step(clock, 1700);
    fireEvent.pointerUp(hold);
  });
});

// ---- Helpers de flujo (tutorial guiado) ----

/** S1 completo → T4 (segmento 2). */
async function holdForSkipToT4(clock) {
  fireEvent.click(screen.getByTestId('bomb-switch-SW_1'));
  fireEvent.click(screen.getByTestId('bomb-wire-WIRE_RED'));
  await holdFor(clock);
}

/** Desde T1 (estado TUTORIAL_PLAY segmento 1) completa el tutorial hasta el modal §4.3. */
async function completeTutorialFromT1(clock) {
  fireEvent.click(screen.getByTestId('bomb-switch-SW_1'));
  fireEvent.click(screen.getByTestId('bomb-wire-WIRE_RED'));
  await holdFor(clock); // → T4
  fireEvent.click(screen.getByTestId('bomb-switch-SW_1'));
  fireEvent.click(screen.getByTestId('bomb-wire-WIRE_RED'));
  await holdFor(clock); // → T5
  await step(clock, T5.readMs + 128);
  await step(clock, T5.delayMs + 128);
  fireEvent.click(screen.getByTestId('bomb-switch-SW_1'));
  fireEvent.click(screen.getByTestId('bomb-wire-WIRE_RED'));
  await holdFor(clock); // → modal §4.3
}

/** Welcome → T1-T3 → T4 → inicio de T5 (INSTRUCTION_ENCODING). */
async function completeTutorialUpToT5(clock) {
  fireEvent.click(screen.getByTestId('bomb-start-practice'));
  await holdForSkipToT4(clock);
  fireEvent.click(screen.getByTestId('bomb-switch-SW_1'));
  fireEvent.click(screen.getByTestId('bomb-wire-WIRE_RED'));
  await holdFor(clock); // → T5
}
