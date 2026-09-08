// bombGamePhases.test.jsx — EXP-BOMB-001 · B3: niveles 1-4 + fases (card t_7c5cd0c0).
//
// Contracto B3 (plan docs/plans/2026-09-07-plan-exp7-bomb.md §4; spec docs/spec/EXP-BOMB-001/):
//  - Flujo evaluado completo: práctica → "Comenzar evaluación" → L1..L4 → SESSION_COMPLETE.
//  - Fases por nivel (Doc 1 §4/§7, Doc 2 §5): LEVEL_INTRO (regla nueva destacada +
//    "Antes de Lx"), countdown 0.5 s (Doc 2 §10), INSTRUCTION_ENCODING (exposición
//    libre/3 s/2 s/2 s + barra + pre-fade §16), BLIND_DELAY (pantalla oscura/estática
//    sutil, inputs → INPUT_DURING_LOCK), EXECUTION (timer vivo), penalty state,
//    success (microresumen neutro), fail (razón general), TRANSITION (copy en intro),
//    aviso MODEL B antes de L4.
//  - QA-01..QA-10 (Doc 1 §16.1) ejercitados a nivel de componente.
//  - DoD §16.2: timer visual vs lógico ≤100 ms (display a 100 ms desde el mismo
//    reloj lógico); sin manual durante EXECUTION en L2-4; transformación B desde el
//    manifest; determinismo por seed (mismo seed+config+inputs => misma telemetría).
//
// Metodología: rAF funcional (setTimeout 16 ms) + fake timers + reloj falso inyectado
// al motor (`nowFn`): el bucle vivo del componente (tick del motor + beeps) corre con
// el reloj de los tests. Riesgo #2 del plan: "los tests usan reloj inyectado".

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../../i18n/LanguageContext.jsx';
import BombDefusalGame, {
  BOMB_ENCODING_COUNTDOWN_MS,
  bombTimerBeepDecision,
  bombTimerDisplayPhase,
  formatBombTimer,
  parseBombTimerText,
} from './bombGame.jsx';
import { BOMB_RULE_MANIFEST, effectiveSequenceForLevel } from './bombRules.js';
import { BOMB_STATES, createBombEngine } from './bombEngine.js';
import { createBombTimer } from './bombTimer.js';

vi.mock('../originalGameSfx.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    playSfx: vi.fn(() => true),
    getGameSfxEnabled: vi.fn(() => true),
    setGameSfxEnabled: vi.fn(),
  };
});

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

// Avanza desde LEVEL_INTRO hasta que la ejecución esté corriendo: countdown 0.5 s →
// encoding (CTA "Continuar" en exposición libre L1 / auto al agotar en L2-L4) →
// delay (si aplica). Los tiempos salen del manifest (la spec es ley).
async function reachExecution(clock, levelKey) {
  const level = BOMB_RULE_MANIFEST.levels[levelKey];
  fireEvent.click(screen.getByTestId('bomb-intro-continue'));
  await step(clock, BOMB_ENCODING_COUNTDOWN_MS);
  if (level.exposureMs == null) {
    // L1: lectura libre → el usuario avanza con el CTA (INSTRUCTIONS_HIDE 'continue')
    fireEvent.click(screen.getByTestId('bomb-encoding-continue'));
  } else {
    await step(clock, level.exposureMs + 64); // auto-hide (tick del motor) → delay
    if (level.delayMs > 0) await step(clock, level.delayMs + 64); // endDelay → EXECUTION
  }
  expect(screen.getByTestId('bomb-timer')).not.toHaveAttribute('data-phase', 'ready');
}

// Completa un nivel evaluado desde su LEVEL_INTRO hasta el siguiente intro (o
// SESSION_COMPLETE tras L4): countdown → encoding (CTA libre en L1 / auto en L2-4)
// → delay → ejecución resolviendo la secuencia efectiva exacta (desde el manifest).
async function completeLevel(clock, level) {
  await reachExecution(clock, level);
  // DoD §16.2: no existe camino de UI que muestre el manual durante EXECUTION L2-4.
  expect(screen.getByTestId('bomb-manual-placeholder')).toHaveTextContent('···');
  const manual = effectiveSequenceForLevel(level);
  for (const s of manual) {
    if (s.kind === 'SWITCH') fireEvent.click(screen.getByTestId(`bomb-switch-${s.id}`));
    else if (s.kind === 'WIRE') fireEvent.click(screen.getByTestId(`bomb-wire-${s.id}`));
    else if (s.kind === 'BUTTON') {
      const hold = screen.getByTestId('bomb-hold-btn');
      fireEvent.pointerDown(hold);
      await step(clock, 2000); // QA-02: 2000 ms (dentro de 1800-2400)
      fireEvent.pointerUp(hold);
    }
  }
  expect(screen.getByTestId('bomb-success-overlay')).toBeInTheDocument();
  expect(screen.getByText('Artefacto neutralizado.')).toBeInTheDocument();
  fireEvent.click(screen.getByTestId('bomb-result-continue'));
}

// Práctica completa (tutorial guiado T1-T5, B4) + "Comenzar evaluación" → L1 intro.
async function completeTutorialToModal(clock) {
  fireEvent.click(screen.getByTestId('bomb-start-practice'));
  const hold = screen.getByTestId('bomb-hold-btn');
  const playSeq = async () => {
    fireEvent.click(screen.getByTestId('bomb-switch-SW_1'));
    fireEvent.click(screen.getByTestId('bomb-wire-WIRE_RED'));
    fireEvent.pointerDown(hold);
    await step(clock, 2000);
    fireEvent.pointerUp(hold);
  };
  await playSeq(); // S1: T1-T3
  await playSeq(); // S2: T4 (panel fresh)
  // S3: T5 — lectura (readMs) → delay (delayMs) → ejecución sin manual
  const t5 = BOMB_RULE_MANIFEST.tutorial.segments[2];
  await step(clock, t5.readMs + 128);
  await step(clock, t5.delayMs + 128);
  await playSeq(); // S3: T5
  expect(screen.getByTestId('bomb-practice-done')).toBeInTheDocument();
}

async function reachL1Intro(clock) {
  await completeTutorialToModal(clock);
  fireEvent.click(screen.getByTestId('bomb-start-evaluation'));
  expect(screen.getByTestId('bomb-level-intro')).toBeInTheDocument();
  expect(screen.getByTestId('bomb-level').textContent).toContain('Nivel 1 de 4');
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

describe('B3 — helpers puros del timer visual (DoD §16.2: visual vs lógico ≤100 ms)', () => {
  it('formatBombTimer: MM:SS.d a resolución de 100 ms; |visual - lógico| ≤ 50 ms', () => {
    expect(formatBombTimer(null)).toBe('—:—');
    expect(formatBombTimer(20000)).toBe('00:20.0');
    expect(formatBombTimer(11450)).toBe('00:11.5');
    expect(formatBombTimer(11449)).toBe('00:11.4');
    expect(formatBombTimer(99)).toBe('00:00.1');
    expect(formatBombTimer(0)).toBe('00:00.0');
    expect(formatBombTimer(59999)).toBe('01:00.0');
    for (let r = 0; r < 20000; r += 97) {
      const visual = parseBombTimerText(formatBombTimer(r));
      expect(Math.abs(visual - r), `r=${r}`).toBeLessThanOrEqual(50);
    }
  });

  it('bombTimerDisplayPhase: idle (sin límite) / ready (no iniciado) / fases / stopped', () => {
    const running = createBombTimer({ timeLimitMs: 20000, now: () => 0 });
    expect(bombTimerDisplayPhase(BOMB_STATES.BOOT, null)).toBe('idle');
    const unlimited = createBombTimer({ timeLimitMs: null, now: () => 0 });
    expect(bombTimerDisplayPhase(BOMB_STATES.TUTORIAL_PLAY, unlimited)).toBe('idle');
    expect(bombTimerDisplayPhase(BOMB_STATES.LEVEL_INTRO, running)).toBe('ready');
    expect(bombTimerDisplayPhase(BOMB_STATES.BLIND_DELAY, running)).toBe('ready');
    running.start();
    expect(bombTimerDisplayPhase(BOMB_STATES.EXECUTION, running)).toBe('normal');
    expect(bombTimerDisplayPhase(BOMB_STATES.LEVEL_SUCCESS, running)).toBe('stopped');
    expect(bombTimerDisplayPhase(BOMB_STATES.SESSION_COMPLETE, running)).toBe('stopped');
  });

  it('bombTimerBeepDecision sigue la regla §10.1 (regresión B2)', () => {
    expect(bombTimerBeepDecision(16000, 20000, null)).toEqual({ play: 'bomb_beep', second: 16 });
    expect(bombTimerBeepDecision(6000, 20000, 7)).toEqual({ play: 'bomb_beep', second: 6 });
    expect(bombTimerBeepDecision(2500, 20000, 2)).toEqual({ play: 'bomb_beep_hi', second: 3 });
    expect(bombTimerBeepDecision(0, 20000, 1)).toEqual({ play: null, second: null });
  });
});

describe('B3 — LEVEL_INTRO (Doc 2 §5: nivel, modelo, regla nueva destacada + "Antes de Lx")', () => {
  it('L1: copy de transición exacto, MODELO A, sin regla nueva (protocolo base)', async () => {
    const clock = createFakeClock();
    renderGame({ nowFn: clock.now });
    await reachL1Intro(clock);
    const intro = screen.getByTestId('bomb-level-intro');
    expect(intro).toHaveTextContent('Nivel 1 de 4');
    expect(screen.getByText('Primero aprenderás el protocolo base del MODELO A.')).toBeInTheDocument();
    expect(screen.getByTestId('bomb-intro-model').textContent).toContain('MODELO A');
    expect(screen.queryByTestId('bomb-intro-highlight')).not.toBeInTheDocument();
    // Panel bloqueado visualmente (atenuado), modelo HUD A, timer en espera 00:20.0
    expect(screen.getByTestId('bomb-panel')).toHaveClass('bomb-panel--locked');
    expect(screen.getByTestId('bomb-model')).toHaveAttribute('data-model', 'A');
    expect(screen.getByTestId('bomb-timer')).toHaveAttribute('data-phase', 'ready');
    expect(screen.getByTestId('bomb-timer').querySelector('.bomb-timer__digits').textContent).toBe('00:20.0');
    expect(screen.getByTestId('bomb-timer').querySelector('.bomb-timer__phase')).toHaveTextContent('en espera');
  });

  it('L2: transición §11 + NUEVA REGLA B1 destacada (desde el manifest)', async () => {
    const clock = createFakeClock();
    renderGame({ nowFn: clock.now });
    await reachL1Intro(clock);
    await completeLevel(clock, 1);
    const intro = screen.getByTestId('bomb-level-intro');
    expect(intro).toHaveTextContent('Nivel 2 de 4');
    expect(screen.getByText('Se añadirá una nueva instrucción. Las reglas anteriores siguen vigentes.')).toBeInTheDocument();
    const highlight = screen.getByTestId('bomb-intro-highlight');
    expect(highlight).toHaveTextContent('NUEVA REGLA');
    expect(highlight).toHaveTextContent('Mantén presionado el BOTÓN AMARILLO durante 2 segundos.');
  });

  it('L3: transición §11 + NUEVA REGLA C1 destacada', async () => {
    const clock = createFakeClock();
    renderGame({ nowFn: clock.now });
    await reachL1Intro(clock);
    await completeLevel(clock, 1);
    await completeLevel(clock, 2);
    expect(screen.getByText('La secuencia será más larga y tendrás menos tiempo para recordarla.')).toBeInTheDocument();
    const highlight = screen.getByTestId('bomb-intro-highlight');
    expect(highlight).toHaveTextContent('NUEVA REGLA');
    expect(highlight).toHaveTextContent('Corta el CABLE VERDE.');
  });

  it('L4: aviso MODEL B antes de la ejecución (transición §11 + modificador destacado, placa B)', async () => {
    const clock = createFakeClock();
    renderGame({ nowFn: clock.now });
    await reachL1Intro(clock);
    await completeLevel(clock, 1);
    await completeLevel(clock, 2);
    await completeLevel(clock, 3);
    const intro = screen.getByTestId('bomb-level-intro');
    expect(intro).toHaveTextContent('Nivel 4 de 4');
    expect(screen.getByText('ATENCIÓN: este artefacto es MODELO B. Algunas instrucciones cambian. Revisa el protocolo antes de continuar.')).toBeInTheDocument();
    expect(screen.getByTestId('bomb-intro-model').textContent).toContain('MODELO B');
    const highlight = screen.getByTestId('bomb-intro-highlight');
    expect(highlight).toHaveClass('bomb-intro__highlight--B');
    expect(highlight).toHaveTextContent('ATENCIÓN - MODELO B:');
    expect(screen.getByTestId('bomb-model')).toHaveAttribute('data-model', 'B');
  });
});

describe('B3 — countdown 0.5 s + INSTRUCTION_ENCODING (Doc 2 §10/§5)', () => {
  it('countdown: el motor NO inicia exposición hasta que termina el beat (no recorta la lectura)', async () => {
    const clock = createFakeClock();
    const { onGameEvent } = renderGame({ nowFn: clock.now });
    await reachL1Intro(clock);
    // B4: el tutorial guiado ya emitió INSTRUCTIONS_SHOW (S1/S2/T5-lectura);
    // medimos en RELATIVO: durante el countdown (500 ms) no debe emitirse el de L1.
    const before = forwardEvents(onGameEvent, 'INSTRUCTIONS_SHOW').length;
    fireEvent.click(screen.getByTestId('bomb-intro-continue'));
    expect(screen.getByTestId('bomb-countdown')).toBeInTheDocument();
    await step(clock, 250);
    expect(screen.getByTestId('bomb-countdown')).toBeInTheDocument();
    expect(forwardEvents(onGameEvent, 'INSTRUCTIONS_SHOW')).toHaveLength(before);
    await step(clock, 250);
    expect(screen.getByTestId('bomb-encoding')).toBeInTheDocument();
    expect(forwardEvents(onGameEvent, 'INSTRUCTIONS_SHOW')).toHaveLength(before + 1);
  });

  it('L1: exposición libre (sin barra) + CTA "Continuar"; panel atenuado; manual exacto del manifest', async () => {
    const clock = createFakeClock();
    renderGame({ nowFn: clock.now });
    await reachL1Intro(clock);
    fireEvent.click(screen.getByTestId('bomb-intro-continue'));
    await step(clock, BOMB_ENCODING_COUNTDOWN_MS);
    expect(screen.getByTestId('bomb-encoding-free')).toBeInTheDocument();
    expect(screen.queryByTestId('bomb-exposure-bar')).not.toBeInTheDocument();
    expect(screen.getByTestId('bomb-encoding-continue')).toBeInTheDocument();
    expect(screen.getByText('1. Activa el INTERRUPTOR 1.')).toBeInTheDocument();
    expect(screen.getByText('2. Corta el CABLE ROJO.')).toBeInTheDocument();
    expect(screen.queryByTestId('bomb-manual-placeholder')).not.toBeInTheDocument();
  });

  it('L2: barra de exposición 3 s, pre-fade §16 200 ms antes, auto-hide → BLIND_DELAY sin pistas del manual (DoD)', async () => {
    const clock = createFakeClock();
    renderGame({ nowFn: clock.now });
    await reachL1Intro(clock);
    await completeLevel(clock, 1);
    fireEvent.click(screen.getByTestId('bomb-intro-continue'));
    await step(clock, BOMB_ENCODING_COUNTDOWN_MS);
    expect(screen.getByTestId('bomb-exposure-bar')).toBeInTheDocument();
    expect(screen.queryByTestId('bomb-encoding-continue')).not.toBeInTheDocument();
    expect(screen.getByText('1. Activa el INTERRUPTOR 1.')).toBeInTheDocument();
    // 200 ms antes del fin: pre-fade (animación "Manual hide" 150-250 ms)
    await step(clock, 2832);
    expect(screen.getByTestId('bomb-manual').querySelector('.bomb-manual__lines')).toHaveClass('bomb-manual__lines--prehide');
    // Al agotarse: delay (pantalla oscura); el manual NO queda visible (DoD: sin pistas residuales)
    await step(clock, 256);
    expect(screen.getByTestId('bomb-delay-screen')).toBeInTheDocument();
    expect(screen.getByTestId('bomb-delay-screen').textContent).toContain('Memoriza la secuencia.');
    expect(screen.getByTestId('bomb-status').textContent).toContain('Memoriza la secuencia.');
    expect(screen.queryByText('1. Activa el INTERRUPTOR 1.')).not.toBeInTheDocument();
    expect(screen.queryByText('2. Corta el CABLE ROJO.')).not.toBeInTheDocument();
    expect(screen.queryByText('3. Mantén presionado el BOTÓN AMARILLO durante 2 segundos.')).not.toBeInTheDocument();
    expect(screen.getByTestId('bomb-timer')).toHaveAttribute('data-phase', 'ready');
  });

  it('L4: encoding con manual transformado (INTERRUPTOR 3 / CABLE AZUL) + aviso §9.2 desde el manifest', async () => {
    const clock = createFakeClock();
    renderGame({ nowFn: clock.now });
    await reachL1Intro(clock);
    await completeLevel(clock, 1);
    await completeLevel(clock, 2);
    await completeLevel(clock, 3);
    fireEvent.click(screen.getByTestId('bomb-intro-continue'));
    await step(clock, BOMB_ENCODING_COUNTDOWN_MS);
    expect(screen.getByText('1. Activa el INTERRUPTOR 3.')).toBeInTheDocument();
    expect(screen.getByText('2. Corta el CABLE AZUL.')).toBeInTheDocument();
    expect(screen.getByText('3. Mantén presionado el BOTÓN AMARILLO durante 2 segundos.')).toBeInTheDocument();
    expect(screen.getByText('4. Corta el CABLE VERDE.')).toBeInTheDocument();
    expect(screen.getByText(/ATENCIÓN - MODELO B: Donde el protocolo indique INTERRUPTOR 1, utiliza INTERRUPTOR 3/)).toBeInTheDocument();
    expect(screen.getByTestId('bomb-model')).toHaveAttribute('data-model', 'B');
  });
});

describe('B3 — BLIND_DELAY (Doc 1 §4/§7) + QA-08: inputs bloqueados → INPUT_DURING_LOCK', () => {
  it('QA-08: click durante la pantalla oscura → ignorado + INPUT_DURING_LOCK (sin física, sin penalización)', async () => {
    const clock = createFakeClock();
    const { onGameEvent } = renderGame({ nowFn: clock.now });
    await reachL1Intro(clock);
    await completeLevel(clock, 1);
    // L2: encoding 3 s → delay 2 s (step dividido en el countdown: el bucle rAF del
    // componente arranca en el flush React posterior, no en el mismo advance)
    fireEvent.click(screen.getByTestId('bomb-intro-continue'));
    await step(clock, BOMB_ENCODING_COUNTDOWN_MS);
    await step(clock, 3000 + 128);
    expect(screen.getByTestId('bomb-delay-screen')).toBeInTheDocument();
    // Controles físicamente deshabilitados ("sin targets accionables")
    expect(screen.getByTestId('bomb-switch-SW_1')).toBeDisabled();
    expect(screen.getByTestId('bomb-hold-btn')).toBeDisabled();
    // Click en la pantalla oscura → intentado al input gate
    fireEvent.click(screen.getByTestId('bomb-delay-screen'));
    const lock = forwardEvents(onGameEvent, 'STEP_ERROR')
      .filter((e) => e.response.bomb.meta.error_class === 'INPUT_DURING_LOCK');
    expect(lock.length).toBe(1);
    expect(lock[0].response.bomb.meta.observed).toBe('UNKNOWN');
    expect(lock[0].response.bomb.meta.penalizes).toBe(false);
    // Estado físico intacto + sin penalización de tiempo
    expect(screen.getByTestId('bomb-switch-SW_1')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('bomb-wire-WIRE_RED').textContent).toContain('INTACT');
    expect(forwardEvents(onGameEvent, 'TIME_PENALTY')).toHaveLength(0);
    // Fin del delay (2 s) → EXECUTION con timer 00:15.x
    await step(clock, 2000 + 64);
    const timer = screen.getByTestId('bomb-timer');
    expect(timer).not.toHaveAttribute('data-phase', 'ready');
    expect(timer.querySelector('.bomb-timer__digits').textContent).toMatch(/^00:1[45]\.\d$/);
  });

  it('QA-08 (encoding): click sobre switch en manual visible → INPUT_DURING_LOCK con id, sin cambio físico', async () => {
    const clock = createFakeClock();
    const { onGameEvent } = renderGame({ nowFn: clock.now });
    await reachL1Intro(clock);
    fireEvent.click(screen.getByTestId('bomb-intro-continue'));
    await step(clock, BOMB_ENCODING_COUNTDOWN_MS);
    // L1 encoding: controles atenuados pero operables (el intento se registra)
    expect(screen.getByTestId('bomb-switch-SW_1')).toBeEnabled();
    expect(screen.getByTestId('bomb-switch-SW_1')).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(screen.getByTestId('bomb-switch-SW_1'));
    const lock = forwardEvents(onGameEvent, 'STEP_ERROR')
      .filter((e) => e.response.bomb.meta.error_class === 'INPUT_DURING_LOCK');
    expect(lock.length).toBe(1);
    expect(lock[0].response.bomb.meta.observed).toBe('SWITCH_SW_1_ON');
    expect(screen.getByTestId('bomb-switch-SW_1')).toHaveAttribute('aria-pressed', 'false');
    expect(forwardEvents(onGameEvent, 'TIME_PENALTY')).toHaveLength(0);
  });
});

describe('B3 — EXECUTION + QA-01/02/03/04/05 (secuencias efectivas, penalty, MODEL B)', () => {
  it('QA-01: L1 secuencia exacta (SW1→Rojo) → SUCCESS sin penalización, microresumen neutro', async () => {
    const clock = createFakeClock();
    const { onGameEvent } = renderGame({ nowFn: clock.now });
    await reachL1Intro(clock);
    await reachExecution(clock, 1);
    fireEvent.click(screen.getByTestId('bomb-switch-SW_1'));
    fireEvent.click(screen.getByTestId('bomb-wire-WIRE_RED'));
    expect(screen.getByTestId('bomb-success-overlay')).toBeInTheDocument();
    expect(screen.getByText('Artefacto neutralizado.')).toBeInTheDocument();
    expect(forwardEvents(onGameEvent, 'TIME_PENALTY')).toHaveLength(0);
    // 2 pasos de L1 (los 3 STEP_SUCCESS previos son de la práctica, no evaluada)
    expect(forwardEvents(onGameEvent, 'STEP_SUCCESS').slice(-2).map((e) => e.response.bomb.meta.step_id))
      .toEqual(['SW_1_ON', 'CUT_RED']);
    // Microresumen neutro: nivel/tiempo/errores — sin nombres de pasos (pilar 4)
    const summary = screen.getByTestId('bomb-success-card').textContent;
    expect(summary).toContain('Nivel 1');
    expect(summary).toContain('Errores: 0');
    expect(summary).not.toMatch(/INTERRUPTOR|CABLE|ROJO|AZUL|VERDE/i);
    // Timer congelado + LED success (HUD visible sobre el overlay)
    expect(screen.getByTestId('bomb-timer')).toHaveAttribute('data-phase', 'stopped');
    expect(screen.getByTestId('bomb-led')).toHaveAttribute('data-led', 'success');
    expect(screen.getByTestId('bomb-panel')).toHaveClass('bomb-panel--success');
  });

  it('QA-02: L2 hold válido 2000 ms → B1 aceptado (y 1900 ms también, dentro de ±200)', async () => {
    const clock = createFakeClock();
    const { onGameEvent } = renderGame({ nowFn: clock.now });
    await reachL1Intro(clock);
    await completeLevel(clock, 1);
    await reachExecution(clock, 2);
    fireEvent.click(screen.getByTestId('bomb-switch-SW_1'));
    fireEvent.click(screen.getByTestId('bomb-wire-WIRE_RED'));
    const hold = screen.getByTestId('bomb-hold-btn');
    fireEvent.pointerDown(hold);
    await step(clock, 2000);
    fireEvent.pointerUp(hold);
    const successes = forwardEvents(onGameEvent, 'STEP_SUCCESS');
    expect(successes.at(-1).response.bomb.meta.step_id).toBe('HOLD_YELLOW_2000');
    expect(successes.at(-1).response.bomb.meta.hold_ms).toBe(2000);
    expect(screen.getByTestId('bomb-success-overlay')).toBeInTheDocument();
  });

  it('QA-03: L3 orden incorrecto (hold antes de su posición) → ORDER_ERROR + -30% + penalty state + recuperación', async () => {
    const clock = createFakeClock();
    const { onGameEvent } = renderGame({ nowFn: clock.now });
    await reachL1Intro(clock);
    await completeLevel(clock, 1);
    await completeLevel(clock, 2);
    await reachExecution(clock, 3);
    const hold = screen.getByTestId('bomb-hold-btn');
    fireEvent.click(screen.getByTestId('bomb-switch-SW_1')); // paso 0 OK
    // Hold antes de su posición (esperado: CABLE ROJO) → ORDER_ERROR.
    // (Un orden incorrecto con cable sería ORDER_ERROR + corte irreversible → el nivel
    //  se pierde por OMISSION, decisión B1 #2; el hold es recuperable y ejerce el
    //  penalty state completo: LED + shake + copy + timer + recuperación.)
    fireEvent.pointerDown(hold);
    await step(clock, 2000);
    fireEvent.pointerUp(hold);
    const errors = forwardEvents(onGameEvent, 'STEP_ERROR');
    expect(errors.at(-1).response.bomb.meta.error_class).toBe('ORDER_ERROR');
    expect(errors.at(-1).response.bomb.meta.penalizes).toBe(true);
    const penalties = forwardEvents(onGameEvent, 'TIME_PENALTY');
    expect(penalties).toHaveLength(1);
    expect(penalties[0].response.bomb.meta.pct).toBe(0.3);
    // Penalty state (Doc 2 §5/§12): LED + shake + copy genérico en barra de estado
    expect(screen.getByTestId('bomb-led')).toHaveAttribute('data-led', 'penalty');
    expect(screen.getByTestId('bomb-panel')).toHaveClass('bomb-panel--shake');
    expect(screen.getByTestId('bomb-status')).toHaveTextContent('Secuencia incorrecta. Tiempo penalizado.');
    // No revela el paso esperado
    expect(screen.getByTestId('bomb-status').textContent).not.toMatch(/VERDE|ROJO|AZUL|AMARILLO|SW\d/i);
    // El timer sigue corriendo con el tiempo penalizado (penalty no detiene el nivel)
    expect(screen.getByTestId('bomb-timer')).not.toHaveAttribute('data-phase', 'stopped');
    // Recuperación: el resto de la secuencia exacta (ROJO → hold → VERDE) → success
    fireEvent.click(screen.getByTestId('bomb-wire-WIRE_RED'));
    fireEvent.pointerDown(hold);
    await step(clock, 2000);
    fireEvent.pointerUp(hold);
    fireEvent.click(screen.getByTestId('bomb-wire-WIRE_GREEN'));
    expect(screen.getByTestId('bomb-success-overlay')).toBeInTheDocument();
  });

  it('QA-04: L4 interferencia (corta ROJO en Modelo B) → TYPE_INTERFERENCE + penalización, sin revelar AZUL', async () => {
    const clock = createFakeClock();
    const { onGameEvent } = renderGame({ nowFn: clock.now });
    await reachL1Intro(clock);
    await completeLevel(clock, 1);
    await completeLevel(clock, 2);
    await completeLevel(clock, 3);
    await reachExecution(clock, 4);
    fireEvent.click(screen.getByTestId('bomb-wire-WIRE_RED')); // prohibido en B (persistencia Tipo A)
    const errors = forwardEvents(onGameEvent, 'STEP_ERROR');
    expect(errors.at(-1).response.bomb.meta.error_class).toBe('TYPE_INTERFERENCE');
    expect(forwardEvents(onGameEvent, 'TIME_PENALTY')).toHaveLength(1);
    // Copy genérico: la respuesta correcta (CABLE AZUL) NO aparece en estado/LED/copy
    expect(screen.getByTestId('bomb-status').textContent).not.toMatch(/AZUL/i);
    expect(screen.getByTestId('bomb-led').textContent).not.toMatch(/AZUL|CABLE/i);
  });

  it('QA-05: L4 correcto (SW3→Azul→Hold→Verde) → SUCCESS (transformación B desde manifest)', async () => {
    const clock = createFakeClock();
    const { onGameEvent } = renderGame({ nowFn: clock.now });
    await reachL1Intro(clock);
    await completeLevel(clock, 1);
    await completeLevel(clock, 2);
    await completeLevel(clock, 3);
    await reachExecution(clock, 4);
    fireEvent.click(screen.getByTestId('bomb-switch-SW_3'));
    fireEvent.click(screen.getByTestId('bomb-wire-WIRE_BLUE'));
    const hold = screen.getByTestId('bomb-hold-btn');
    fireEvent.pointerDown(hold);
    await step(clock, 2000);
    fireEvent.pointerUp(hold);
    fireEvent.click(screen.getByTestId('bomb-wire-WIRE_GREEN'));
    const successes = forwardEvents(onGameEvent, 'STEP_SUCCESS');
    expect(successes.slice(-4).map((e) => e.response.bomb.meta.step_id)).toEqual([
      'SW_3_ON', 'CUT_BLUE', 'HOLD_YELLOW_2000', 'CUT_GREEN',
    ]);
    expect(screen.getByTestId('bomb-success-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('bomb-model')).toHaveAttribute('data-model', 'B');
  });
});

describe('B3 — QA-06/07: timeout y límite de errores (fail con razón general)', () => {
  it('QA-06: timeout L1 (20 s sin completar) → LEVEL_FAIL TIMEOUT + "Tiempo agotado. Nivel finalizado." + OMISSION', async () => {
    const clock = createFakeClock();
    const { onGameEvent } = renderGame({ nowFn: clock.now });
    await reachL1Intro(clock);
    await reachExecution(clock, 1);
    await step(clock, 20032); // > 20 s
    expect(screen.getByTestId('bomb-fail-overlay')).toBeInTheDocument();
    expect(screen.getByText('Tiempo agotado. Nivel finalizado.')).toBeInTheDocument();
    const fail = forwardEvents(onGameEvent, 'LEVEL_FAIL');
    expect(fail).toHaveLength(1);
    expect(fail[0].response.bomb.meta.reason).toBe('TIMEOUT');
    expect(fail[0].response.bomb.meta.omitted_steps).toContain('SW_1_ON');
    expect(fail[0].response.bomb.meta.omission_error_class).toBe('OMISSION');
    // Timer congelado + panel desactivado + LED fail
    expect(screen.getByTestId('bomb-timer')).toHaveAttribute('data-phase', 'stopped');
    expect(screen.getByTestId('bomb-panel')).toHaveClass('bomb-panel--fail');
    expect(screen.getByTestId('bomb-led')).toHaveAttribute('data-led', 'fail');
    // El flujo continúa al siguiente nivel (el fail no termina la sesión)
    fireEvent.click(screen.getByTestId('bomb-result-continue'));
    expect(screen.getByTestId('bomb-level-intro')).toBeInTheDocument();
    expect(screen.getByTestId('bomb-level').textContent).toContain('Nivel 2 de 4');
  });

  it('QA-07: dos errores consecutivos → LEVEL_FAIL MAX_ERRORS + "Se alcanzó el límite de errores. Nivel finalizado."', async () => {
    const clock = createFakeClock();
    const { onGameEvent } = renderGame({ nowFn: clock.now });
    await reachL1Intro(clock);
    await reachExecution(clock, 1);
    fireEvent.click(screen.getByTestId('bomb-switch-SW_2')); // WRONG_TARGET (no existe en L1)
    expect(forwardEvents(onGameEvent, 'STEP_ERROR').at(-1).response.bomb.meta.error_class).toBe('WRONG_TARGET');
    fireEvent.click(screen.getByTestId('bomb-wire-WIRE_YELLOW')); // 2º error → fail
    expect(screen.getByTestId('bomb-fail-overlay')).toBeInTheDocument();
    expect(screen.getByText('Se alcanzó el límite de errores. Nivel finalizado.')).toBeInTheDocument();
    const fail = forwardEvents(onGameEvent, 'LEVEL_FAIL');
    expect(fail).toHaveLength(1);
    expect(fail[0].response.bomb.meta.reason).toBe('MAX_ERRORS');
    expect(forwardEvents(onGameEvent, 'TIME_PENALTY')).toHaveLength(2);
  });
});

describe('B3 — QA-09/10: integridad (blur y recarga/abort)', () => {
  it('QA-09: blur durante ejecución → FOCUS_CHANGE registrado y el timer NO se pausa', async () => {
    const clock = createFakeClock();
    const { onGameEvent } = renderGame({ nowFn: clock.now });
    await reachL1Intro(clock);
    await reachExecution(clock, 1);
    const logicalBefore = Number(screen.getByTestId('bomb-timer').getAttribute('data-remaining-ms'));
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    const focus = forwardEvents(onGameEvent, 'FOCUS_CHANGE');
    expect(focus).toHaveLength(1);
    expect(focus[0].response.bomb.meta.visible).toBe(false);
    await step(clock, 2000);
    const logicalAfter = Number(screen.getByTestId('bomb-timer').getAttribute('data-remaining-ms'));
    expect(logicalBefore - logicalAfter).toBeGreaterThan(1900); // el reloj siguió corriendo
    // Retorno a visible: se registra (total_blur_ms en el motor, B5)
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(forwardEvents(onGameEvent, 'FOCUS_CHANGE').at(-1).response.bomb.meta.visible).toBe(true);
  });

  it('QA-10: pagehide en nivel evaluado → TECHNICAL_ABORT (no reanudar: al volver, BOOT)', async () => {
    const clock = createFakeClock();
    const { onGameEvent } = renderGame({ nowFn: clock.now });
    await reachL1Intro(clock);
    await completeLevel(clock, 1);
    await reachExecution(clock, 2);
    await act(async () => {
      window.dispatchEvent(new Event('pagehide'));
    });
    const aborts = forwardEvents(onGameEvent, 'TECHNICAL_ABORT');
    expect(aborts).toHaveLength(1);
    expect(aborts[0].response.bomb.meta.reason).toBe('pagehide');
    // Un motor nuevo (reload) arranca en BOOT: la sesión anterior no se reanuda.
    const fresh = createBombEngine({ now: clock.now, seed: 1 });
    expect(fresh.state).toBe(BOMB_STATES.BOOT);
    expect(fresh.sessionIncomplete).toBe(false);
  });
});

describe('B3 — DoD §16.2: timer visual vs lógico ≤100 ms (muestreo por frame)', () => {
  it('el display (100 ms) coincide con el reloj lógico del mismo render (≤100 ms) y no hay drift', async () => {
    const clock = createFakeClock();
    renderGame({ nowFn: clock.now });
    await reachL1Intro(clock);
    await reachExecution(clock, 1);
    const read = () => {
      const el = screen.getByTestId('bomb-timer');
      return {
        visual: parseBombTimerText(el.querySelector('.bomb-timer__digits').textContent),
        logical: Number(el.getAttribute('data-remaining-ms')),
      };
    };
    await step(clock, 3000);
    const s1 = read();
    expect(Math.abs(s1.visual - s1.logical)).toBeLessThanOrEqual(100);
    await step(clock, 5000);
    const s2 = read();
    expect(Math.abs(s2.visual - s2.logical)).toBeLessThanOrEqual(100);
    // Sin drift: el reloj lógico avanza con el tiempo real (marco de 16 ms de holgura)
    expect(Math.abs((s1.logical - s2.logical) - 5000)).toBeLessThanOrEqual(32);
  });
});

describe('B3 — sesión completa L1-L4 + SESSION_COMPLETE + determinismo por seed', () => {
  it('sesión completa: success en los 4 niveles → SESSION_COMPLETE → "Finalizar" → onComplete(sessionSummary agregado)', async () => {
    const clock = createFakeClock();
    const onComplete = vi.fn();
    renderGame({ nowFn: clock.now, seed: 42, onComplete });
    await reachL1Intro(clock);
    for (const level of [1, 2, 3, 4]) await completeLevel(clock, level);
    expect(screen.getByTestId('bomb-session-complete')).toBeInTheDocument();
    expect(screen.getByText('Simulación finalizada. Tus resultados fueron procesados.')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('bomb-session-finish'));
    expect(onComplete).toHaveBeenCalledTimes(1);
    const summary = onComplete.mock.calls[0][0];
    expect(summary.exp_id).toBe('EXP-BOMB-001');
    expect(summary.state).toBe('SESSION_COMPLETE');
    expect(summary.seed).toBe(42);
    expect(summary.levels_completed).toEqual([1, 2, 3, 4]);
    expect(summary.session_incomplete).toBe(false);
    expect(summary.integrity.technicalAbortCount).toBe(0);
    // Privacidad: el summary no contiene pasos/seq crudos ni eventos
    expect(JSON.stringify(summary)).not.toMatch(/SW_1_ON|CUT_RED|HOLD_YELLOW|STEP_SUCCESS/);
  });

  it('determinismo por seed: mismo seed + config + inputs => misma forma/secuencia (telemetría idéntica)', async () => {
    const script = async (onGameEvent, clock) => {
      await reachL1Intro(clock);
      for (const level of [1, 2, 3, 4]) await completeLevel(clock, level);
      fireEvent.click(screen.getByTestId('bomb-session-finish'));
      return onGameEvent.mock.calls
        .map(([e]) => e)
        .filter((e) => e.eventType === 'response')
        .map((e) => ({
          trialId: e.trialId,
          targetId: e.targetId,
          timestamp: e.timestamp,
          response: e.response,
          gameState: e.gameState,
        }));
    };
    const c1 = createFakeClock();
    const u1 = renderGame({ nowFn: c1.now, seed: 7 });
    const r1 = await script(u1.onGameEvent, c1);
    expect(r1.length).toBeGreaterThan(50);
    u1.unmount();
    const c2 = createFakeClock();
    const u2 = renderGame({ nowFn: c2.now, seed: 7 });
    const r2 = await script(u2.onGameEvent, c2);
    expect(r2).toEqual(r1);
  });
});
