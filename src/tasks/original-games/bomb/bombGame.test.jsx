// bombGame.test.jsx — EXP-BOMB-001 · B2: panel + HUD + accesibilidad.
//
// Contracto B2 (plan docs/plans/2026-09-07-plan-exp7-bomb.md §4, card t_2fdada28;
// spec docs/spec/EXP-BOMB-001/):
//  - Mundo propio táctico/industrial (NO tokenizado, H4.5); chrome shared = pill de
//    título / progreso (tokens --k-* vía .task-title/.task-progress).
//  - 2 columnas (manual | panel); switches SW1-3 (OFF/ON/disabled + feedback mecánico);
//    cables R/B/G/Y (INTACT/CUT, color + letra/patrón); botón amarillo hold
//    (IDLE/PRESSED/accepted; ring SOLO en tutorial/práctica); timer (normal/warning/
//    critical, sin saltos de layout); MODEL A/B (alta legibilidad, no solo color);
//    LED estado; animaciones §16 (durations/curvas fijas); SFX 6-8 con toggle.
//  - a11y §14: foco visible, hitbox >=44px, reduced-motion, audio desactivable sin
//    perder información; estados hover/focus/disabled en todo interactivo.
//  - §15: aviso <1024px; 1280x720 baseline.
//  - DoD §16.2: la UI consume engine + manifest (sin reglas duplicadas).
//
// Nota: B2 cubre el mundo + práctica (TUTORIAL_PLAY del motor, no evaluado). Las
// fases de niveles (encoding/delay/execution/penalty/result/transition) llegan en B3;
// el tutorial guiado T1-T5 + bienvenida completa en B4; telemetría final en B5.

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../../i18n/LanguageContext.jsx';
import { GAME_SFX_DEFS, isSfxName } from '../originalGameSfx.js';

vi.mock('../originalGameSfx.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    playSfx: vi.fn(() => true),
    getGameSfxEnabled: vi.fn(() => true),
    setGameSfxEnabled: vi.fn(),
  };
});

import { playSfx } from '../originalGameSfx.js';
import BombDefusalGame, { bombTimerBeepDecision } from './bombGame.jsx';
import { BOMB_RULE_MANIFEST } from './bombRules.js';

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

function startPractice() {
  fireEvent.click(screen.getByTestId('bomb-start-practice'));
}

function forwardEvents(onGameEvent, eventName) {
  return onGameEvent.mock.calls
    .map(([event]) => event)
    .filter((event) => event.eventType === 'response' && event.response?.bomb?.event === eventName);
}

beforeEach(() => {
  // rAF neutro en jsdom: el bucle vivo del componente (ring de hold) no corre en tests;
  // los updates de estado llegan por las interacciones/eventos del motor (síncronos).
  vi.stubGlobal('requestAnimationFrame', () => 0);
  vi.stubGlobal('cancelAnimationFrame', () => {});
  Object.defineProperty(window, 'innerWidth', { value: 1280, writable: true, configurable: true });
  vi.clearAllMocks();
  try { window.localStorage?.clear?.(); } catch { /* jsdom ok */ }
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('SFX BOMB — catálogo (spec Doc 2 §17: 6-8 SFX: switch, cut, button, beep, penalty, success, fail)', () => {
  it('define los 8 SFX bomb_* con parámetros válidos para el motor de audio', () => {
    for (const name of ['bomb_switch', 'bomb_wire_cut', 'bomb_button', 'bomb_beep', 'bomb_beep_hi', 'bomb_penalty', 'bomb_success', 'bomb_fail']) {
      expect(isSfxName(name), name).toBe(true);
      const def = GAME_SFX_DEFS[name];
      if (def.type === 'beep') {
        expect(def.freq).toBeGreaterThan(0);
        expect(def.durationMs).toBeGreaterThan(0);
        expect(def.durationMs).toBeLessThanOrEqual(500);
        expect(def.gain).toBeGreaterThan(0);
        expect(def.gain).toBeLessThan(0.2);
      } else if (def.type === 'slide') {
        expect(def.freqFrom).toBeGreaterThan(def.freqTo);
        expect(def.durationMs).toBeLessThanOrEqual(500);
      } else if (def.type === 'arpeggio') {
        expect(def.freqs.length).toBeGreaterThanOrEqual(2);
        expect(def.durationMs).toBeLessThanOrEqual(500);
      }
    }
  });
});

describe('bombTimerBeepDecision — audio de temporizador (spec Doc 2 §10.1)', () => {
  it('>30% restante: beep discreto cada 2 s (segundos pares)', () => {
    expect(bombTimerBeepDecision(16000, 20000, null)).toEqual({ play: 'bomb_beep', second: 16 });
    expect(bombTimerBeepDecision(15500, 20000, 16)).toEqual({ play: null, second: 16 });
    expect(bombTimerBeepDecision(9500, 20000, 11)).toEqual({ play: 'bomb_beep', second: 10 });
  });

  it('30%-10% restante: beep cada 1 s', () => {
    expect(bombTimerBeepDecision(6000, 20000, 7)).toEqual({ play: 'bomb_beep', second: 6 });
    expect(bombTimerBeepDecision(6000, 20000, 6)).toEqual({ play: null, second: 6 });
    expect(bombTimerBeepDecision(4000, 20000, 5)).toEqual({ play: 'bomb_beep', second: 4 });
  });

  it('<10% o últimos 3 s: beep corto y marcado (bomb_beep_hi)', () => {
    expect(bombTimerBeepDecision(2500, 20000, 2)).toEqual({ play: 'bomb_beep_hi', second: 3 });
    expect(bombTimerBeepDecision(2500, 20000, 3)).toEqual({ play: null, second: 3 });
    expect(bombTimerBeepDecision(1900, 20000, 3)).toEqual({ play: 'bomb_beep_hi', second: 2 });
    expect(bombTimerBeepDecision(1900, 20000, 2)).toEqual({ play: null, second: 2 });
  });

  it('sin tiempo restante / sin límite: silencio', () => {
    expect(bombTimerBeepDecision(0, 20000, 1)).toEqual({ play: null, second: null });
    expect(bombTimerBeepDecision(null, 20000, 1)).toEqual({ play: null, second: null });
    expect(bombTimerBeepDecision(1000, null, 1)).toEqual({ play: null, second: null });
  });
});

describe('BombDefusalGame — mundo + panel + HUD (B2)', () => {
  it('BOOT: panel visible pero bloqueado, MODEL A, LED neutral, timer en espera', () => {
    renderGame({ nowFn: createFakeClock().now });
    const switches = ['SW_1', 'SW_2', 'SW_3'].map((id) => screen.getByTestId(`bomb-switch-${id}`));
    const wires = ['WIRE_RED', 'WIRE_BLUE', 'WIRE_GREEN', 'WIRE_YELLOW'].map((id) => screen.getByTestId(`bomb-wire-${id}`));
    for (const control of [...switches, ...wires, screen.getByTestId('bomb-hold-btn')]) {
      expect(control).toBeDisabled();
    }
    expect(screen.getByTestId('bomb-model')).toHaveAttribute('data-model', 'A');
    expect(screen.getByTestId('bomb-model').textContent).toContain('MODELO');
    expect(screen.getByTestId('bomb-model').textContent).toContain('A');
    expect(screen.getByTestId('bomb-led')).toHaveAttribute('data-led', 'neutral');
    expect(screen.getByTestId('bomb-timer')).toHaveAttribute('data-phase', 'idle');
    expect(screen.getByTestId('bomb-start-practice')).toBeInTheDocument();
    // El manual (copy del manifest) solo existe cuando hay nivel cargado.
    expect(screen.queryByText('1. Activa el INTERRUPTOR 1.')).not.toBeInTheDocument();
  });

  it('a11y §14: todo control interactivo tiene nombre accesible (práctica)', () => {
    renderGame({ nowFn: createFakeClock().now });
    startPractice();
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(8); // 3 switches + 4 cables + hold
    for (const button of buttons) {
      expect(button.getAttribute('aria-label') || button.textContent.trim()).toBeTruthy();
    }
  });

  it('§15: aviso en <1024px de ancho, ausente en 1280px', () => {
    renderGame({ nowFn: createFakeClock().now });
    expect(screen.queryByTestId('bomb-viewport-warning')).not.toBeInTheDocument();
    Object.defineProperty(window, 'innerWidth', { value: 1000, writable: true, configurable: true });
    fireEvent.resize(window);
    expect(screen.getByTestId('bomb-viewport-warning')).toBeInTheDocument();
    Object.defineProperty(window, 'innerWidth', { value: 1280, writable: true, configurable: true });
    fireEvent.resize(window);
    expect(screen.queryByTestId('bomb-viewport-warning')).not.toBeInTheDocument();
  });

  it('práctica: panel habilitado + copy exacto del manual desde el manifest (DoD §16.2)', () => {
    renderGame({ nowFn: createFakeClock().now });
    startPractice();
    expect(screen.getByTestId('bomb-switch-SW_1')).toBeEnabled();
    expect(screen.getByTestId('bomb-hold-btn')).toBeEnabled();
    expect(screen.getByTestId('bomb-level').textContent).toContain('Práctica');
    const manual = buildManualLinesFor('tutorial', 'A');
    for (const line of manual.lines) {
      expect(screen.getByText(line)).toBeInTheDocument();
    }
  });

  it('switch: OFF→ON físico + aria-pressed + SFX mecánico + telemetría ACTION_SWITCH', () => {
    const { onGameEvent } = renderGame({ nowFn: createFakeClock().now });
    startPractice();
    const sw1 = screen.getByTestId('bomb-switch-SW_1');
    expect(sw1).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(sw1);
    expect(sw1).toHaveAttribute('aria-pressed', 'true');
    expect(sw1.textContent).toContain('ON');
    expect(playSfx).toHaveBeenCalledWith('bomb_switch');
    const events = forwardEvents(onGameEvent, 'ACTION_SWITCH');
    expect(events.length).toBeGreaterThan(0);
    expect(events.at(-1).response.bomb.meta.id).toBe('SW_1');
    expect(events.at(-1).response.bomb.meta.to).toBe('ON');
  });

  it('cable: corte irreversible (INTACT→CUT) + disabled + SFX snip + telemetría', () => {
    const { onGameEvent } = renderGame({ nowFn: createFakeClock().now });
    startPractice();
    const red = screen.getByTestId('bomb-wire-WIRE_RED');
    fireEvent.click(red);
    expect(red).toBeDisabled();
    expect(red.textContent).toContain('CUT');
    expect(playSfx).toHaveBeenCalledWith('bomb_wire_cut');
    const events = forwardEvents(onGameEvent, 'ACTION_WIRE_CUT');
    expect(events.at(-1).response.bomb.meta.id).toBe('WIRE_RED');
  });

  it('fuera de orden en práctica: STEP_ERROR ORDER_ERROR + LED penalty + SFX, sin shake (no evaluado) ni TIME_PENALTY', () => {
    vi.useFakeTimers();
    const { onGameEvent } = renderGame({ nowFn: createFakeClock().now });
    startPractice();
    // Esperado: SW1 (paso 0). Cortar ROJO (paso 1) primero → ORDER_ERROR.
    fireEvent.click(screen.getByTestId('bomb-wire-WIRE_RED'));
    expect(screen.getByTestId('bomb-led')).toHaveAttribute('data-led', 'penalty');
    expect(playSfx).toHaveBeenCalledWith('bomb_penalty');
    expect(screen.getByTestId('bomb-panel')).not.toHaveClass('bomb-panel--shake');
    const errors = forwardEvents(onGameEvent, 'STEP_ERROR');
    expect(errors.at(-1).response.bomb.meta.error_class).toBe('ORDER_ERROR');
    expect(forwardEvents(onGameEvent, 'TIME_PENALTY')).toHaveLength(0);
    // El LED vuelve a neutral tras el flash (el cable cortado queda disabled: §8.3).
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId('bomb-led')).toHaveAttribute('data-led', 'neutral');
    expect(screen.getByTestId('bomb-wire-WIRE_RED')).toBeDisabled();
  });

  it('hold válido (2000 ms): anillo en práctica, PRESSED, STEP_SUCCESS con hold_ms, y LEVEL_SUCCESS', () => {
    const clock = createFakeClock();
    const { onGameEvent } = renderGame({ nowFn: clock.now });
    startPractice();
    // Completar los pasos previos en orden.
    fireEvent.click(screen.getByTestId('bomb-switch-SW_1'));
    fireEvent.click(screen.getByTestId('bomb-wire-WIRE_RED'));
    const hold = screen.getByTestId('bomb-hold-btn');
    fireEvent.pointerDown(hold);
    expect(hold).toHaveClass('bomb-hold-btn--pressed');
    expect(screen.getByTestId('bomb-hold-ring')).toBeInTheDocument(); // ring SOLO en práctica/tutorial
    clock.advance(2000);
    fireEvent.pointerUp(hold);
    expect(screen.queryByTestId('bomb-hold-ring')).not.toBeInTheDocument();
    const successes = forwardEvents(onGameEvent, 'STEP_SUCCESS');
    expect(successes.at(-1).response.bomb.meta.step_id).toBe('HOLD_YELLOW_2000');
    expect(successes.at(-1).response.bomb.meta.hold_ms).toBe(2000);
    const levelSuccess = forwardEvents(onGameEvent, 'LEVEL_SUCCESS');
    expect(levelSuccess.length).toBe(1);
    expect(playSfx).toHaveBeenCalledWith('bomb_success');
    expect(screen.getByTestId('bomb-led')).toHaveAttribute('data-led', 'success');
    expect(screen.getByTestId('bomb-practice-done')).toBeInTheDocument();
  });

  it('hold corto (700 ms): HOLD_TOO_SHORT, botón vuelve a IDLE, sin success del hold', () => {
    const clock = createFakeClock();
    const { onGameEvent } = renderGame({ nowFn: clock.now });
    startPractice();
    fireEvent.click(screen.getByTestId('bomb-switch-SW_1'));
    fireEvent.click(screen.getByTestId('bomb-wire-WIRE_RED'));
    const hold = screen.getByTestId('bomb-hold-btn');
    fireEvent.pointerDown(hold);
    clock.advance(700);
    fireEvent.pointerUp(hold);
    expect(hold).not.toHaveClass('bomb-hold-btn--pressed');
    const errors = forwardEvents(onGameEvent, 'STEP_ERROR');
    expect(errors.at(-1).response.bomb.meta.error_class).toBe('HOLD_TOO_SHORT');
    expect(forwardEvents(onGameEvent, 'STEP_SUCCESS').filter((e) => e.response.bomb.meta.step_id === 'HOLD_YELLOW_2000')).toHaveLength(0);
    expect(screen.queryByTestId('bomb-practice-done')).not.toBeInTheDocument();
  });

  it('al completar la práctica, el panel vuelve a bloquearse (inputs no heredados)', () => {
    const clock = createFakeClock();
    renderGame({ nowFn: clock.now });
    startPractice();
    fireEvent.click(screen.getByTestId('bomb-switch-SW_1'));
    fireEvent.click(screen.getByTestId('bomb-wire-WIRE_RED'));
    const hold = screen.getByTestId('bomb-hold-btn');
    fireEvent.pointerDown(hold);
    clock.advance(2000);
    fireEvent.pointerUp(hold);
    expect(screen.getByTestId('bomb-switch-SW_2')).toBeDisabled();
    expect(screen.getByTestId('bomb-hold-btn')).toBeDisabled();
  });

  it('"Repetir práctica": engine nuevo, estado físico reseteado (OFF/INTACT/IDLE)', () => {
    const clock = createFakeClock();
    renderGame({ nowFn: clock.now });
    startPractice();
    fireEvent.click(screen.getByTestId('bomb-switch-SW_1'));
    fireEvent.click(screen.getByTestId('bomb-wire-WIRE_RED'));
    const hold = screen.getByTestId('bomb-hold-btn');
    fireEvent.pointerDown(hold);
    clock.advance(2000);
    fireEvent.pointerUp(hold);
    fireEvent.click(screen.getByTestId('bomb-practice-restart'));
    expect(screen.getByTestId('bomb-switch-SW_1')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('bomb-wire-WIRE_RED')).toBeEnabled();
    expect(screen.getByTestId('bomb-wire-WIRE_RED').textContent).toContain('INTACT');
    expect(screen.queryByTestId('bomb-practice-done')).not.toBeInTheDocument();
  });

  it('misclick sobre el fondo del panel: MISCLICK_PROXIMAL registrado, nunca penaliza', () => {
    const { onGameEvent } = renderGame({ nowFn: createFakeClock().now });
    startPractice();
    fireEvent.pointerDown(screen.getByTestId('bomb-panel-bg'));
    const misclicks = forwardEvents(onGameEvent, 'MISCLICK_PROXIMAL');
    expect(misclicks.length).toBe(1);
    expect(screen.getByTestId('bomb-led')).toHaveAttribute('data-led', 'neutral');
  });

  it('telemetría forward: solo agregados del diccionario §11 (sin pointer/DOM/rostro)', () => {
    const clock = createFakeClock();
    const { onGameEvent } = renderGame({ nowFn: clock.now });
    startPractice();
    fireEvent.click(screen.getByTestId('bomb-switch-SW_1'));
    fireEvent.click(screen.getByTestId('bomb-wire-WIRE_RED'));
    const hold = screen.getByTestId('bomb-hold-btn');
    fireEvent.pointerDown(hold);
    clock.advance(2000);
    fireEvent.pointerUp(hold);
    expect(onGameEvent).toHaveBeenCalled();
    const payload = JSON.stringify(onGameEvent.mock.calls);
    expect(payload).not.toMatch(/clientX|clientY|screenX|screenY|pointerSamples|landmark|video|frame/i);
    for (const call of onGameEvent.mock.calls.map(([event]) => event)) {
      expect(call.type).toBe('game_event_v1');
      expect(call.gameId).toBe('bomb_defusal');
    }
  });
});

describe('BombDefusalGame — CSS del mundo (regimen §14/§15/§16 verificado sobre bomb.css)', () => {
  const css = fs.readFileSync(path.join(__dirname, 'bomb.css'), 'utf8');
  const blockOf = (selector) => {
    const idx = css.indexOf(`${selector} {`);
    if (idx === -1) return '';
    const open = css.indexOf('{', idx);
    return css.slice(open + 1, css.indexOf('}', open));
  };

  it('foco visible en todos los controles (a11y §14)', () => {
    expect(css.match(/:focus-visible/g).length).toBeGreaterThanOrEqual(4);
  });

  it('hitbox >=44 px en switches, cables y botón (a11y §14)', () => {
    expect(blockOf('.bomb-switch')).toContain('min-height: 44px');
    expect(blockOf('.bomb-wire')).toContain('min-height: 44px');
    expect(blockOf('.bomb-hold-btn')).toContain('min-height: 44px');
  });

  it('estados hover/focus/disabled en todo interactivo (H5)', () => {
    expect(css.match(/:hover:not\(:disabled\)/g).length).toBeGreaterThanOrEqual(3);
    expect(css.match(/:disabled/g).length).toBeGreaterThanOrEqual(4);
  });

  it('reduced-motion: sin shake/power-on/pulse crítico (a11y §14, DoD §20)', () => {
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    for (const selector of ['.bomb-panel--powered', '.bomb-panel--shake', '.bomb-timer--critical']) {
      const marker = `${selector} {`;
      expect(reduced, marker).toContain(marker);
      const block = reduced.slice(reduced.indexOf(marker));
      expect(block.slice(0, block.indexOf('}'))).toContain('animation: none');
    }
  });

  it('timer: sin saltos de layout (tabular-nums + min-width fijo) y pulso crítico (spec §16)', () => {
    const timer = blockOf('.bomb-timer');
    expect(timer).toContain('font-variant-numeric: tabular-nums');
    expect(timer).toContain('min-width');
    expect(css).toContain('@keyframes bomb-critical-pulse');
  });

  it('animaciones §16 con durations/curvas fijas (power-on 300-500ms, switch 100-140ms, cut 120-180ms, shake 100-150ms, success 300ms, critical 500-800ms)', () => {
    for (const name of ['bomb-power-on', 'bomb-shake', 'bomb-critical-pulse', 'bomb-spark']) {
      expect(css).toContain(`@keyframes ${name}`);
    }
    const root = blockOf('.bomb-game');
    expect(root).toContain('--bomb-anim-power-on: 400ms ease-out');
    expect(root).toContain('--bomb-anim-switch: 120ms ease-out');
    expect(root).toContain('--bomb-anim-cut: 150ms ease-out');
    expect(root).toContain('--bomb-anim-shake: 120ms ease-in-out');
    expect(root).toContain('--bomb-anim-success: 300ms ease-out');
    expect(root).toContain('--bomb-anim-critical: 650ms ease-in-out');
  });

  it('mundo propio (no tokenizado, H4.5): paleta táctico/industrial propia en .bomb-game', () => {
    const root = blockOf('.bomb-game');
    expect(root).toMatch(/background[^;]*#[0-9a-fA-F]{6}/);
    expect(root).toContain('--bomb-text:');
    expect(root).toContain('--bomb-amber:');
  });

  it('2 columnas (manual | panel) en desktop, 1 columna en <900px (§6.1/§15)', () => {
    expect(blockOf('.bomb-columns')).toContain('grid-template-columns');
    expect(css).toContain('@media (max-width: 899px)');
  });
});

// Utilidad local: líneas del manual desde el manifest (misma fuente que el componente).
function buildManualLinesFor(levelKey, bombType) {
  const def = BOMB_RULE_MANIFEST.levels[levelKey];
  return {
    lines: def.sequenceIds.map((ruleId, i) => `${i + 1}. ${BOMB_RULE_MANIFEST.rules[ruleId].manualEs[bombType]}`),
    notice: bombType === 'B' ? BOMB_RULE_MANIFEST.typeBNoticeEs : null,
  };
}
