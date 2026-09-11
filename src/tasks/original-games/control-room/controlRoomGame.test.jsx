// controlRoomGame.test.jsx — EXP-COMM-001 · C2: UI sala de control responsive.
//
// Contracto C2 (plan docs/plans/2026-09-11-plan-exp8-comm.md; card t_a2d9f478):
//   - Layout responsive 3 tiers (desktop/tablet/móvil) — Doc 2 §7.
//   - Compositor de bloques (add/reorder/remove) — Doc 2 §12.
//   - A11y §18: targets ≥44px, sin hover, color+texto+icono, reduced-motion, audio opcional.
//   - Consume el engine C1 (sin reglas duplicadas).
//   - Privacy: los eventos emitidos son del whitelist §11, sin campos crudos prohibidos.
//
// Determinismo: se inyecta un reloj falso al componente (`now`); el motor (C1) usa ese
// reloj para el timer lógico y los t_ms. Los setTimeout del componente (verificación
// 300ms, consecuencia 2000ms, ticker de timeout 250ms) son timers de vi → `step()` avanza
// ambos relojes a la vez.
//
// Nota: el smoke de navegador 1280×720 + 390×844 (sin solapes/scroll horizontal) se hace
// con Playwright cuando el juego está montado en la batería (C5) — aquí el test jsdom cubre
// la lógica de 3 tiers (data-cr-mobile/tablet), la interacción y la a11y.

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../../i18n/LanguageContext.jsx';
import { isSfxName } from '../originalGameSfx.js';

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
import ControlRoomGame from './controlRoomGame.jsx';

const FORBIDDEN = ['freeText', 'typedResponse', 'messageText', 'optionText', 'scenarioText',
  'choiceSequence', 'rawChoices', 'rawPointerPath', 'pointerSamples', 'rawGameEvents',
  'frames', 'landmarks', 'keypoints', 'screenshot', 'eventLog', 'cardTexts'];

function makeClock() {
  let t = 0;
  return { now: () => t, advance: (ms) => { t += Math.max(0, ms); } };
}

function renderGame(props = {}) {
  const clock = makeClock();
  const onGameEvent = vi.fn();
  const onComplete = vi.fn();
  const utils = render(
    <LanguageProvider>
      <ControlRoomGame active onGameEvent={onGameEvent} onComplete={onComplete} now={clock.now} {...props} />
    </LanguageProvider>,
  );
  const step = async (ms) => {
    await act(async () => { clock.advance(ms); vi.advanceTimersByTime(ms); });
  };
  return { onGameEvent, onComplete, clock, step, ...utils };
}

function emittedEvents(onGameEvent) {
  return onGameEvent.mock.calls.map(([rec]) => rec);
}

function assertNoForbidden(obj) {
  const bad = [];
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(visit); return; }
    for (const [k, v] of Object.entries(node)) {
      if (FORBIDDEN.includes(k)) bad.push(k);
      visit(v);
    }
  };
  visit(obj);
  expect(bad).toEqual([]);
}

describe('ControlRoomGame (EXP-COMM-001 C2)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', (cb) => window.setTimeout(() => cb(0), 16));
    vi.stubGlobal('cancelAnimationFrame', (id) => window.clearTimeout(id));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('renderiza un escenario de práctica: facts, burbuja NPC, tarjetas y send deshabilitado', () => {
    const { onGameEvent } = renderGame({ practice: true });
    expect(screen.getByTestId('control-room')).toBeTruthy();
    expect(screen.getByTestId('cr-incident')).toBeTruthy();
    expect(screen.getByTestId('cr-facts')).toBeTruthy();
    expect(screen.getByTestId('cr-npc-bubble')).toBeTruthy();
    expect(screen.getByTestId('cr-send')).toBeDisabled(); // input gate §12.3
    expect(emittedEvents(onGameEvent).some((e) => e.event === 'SCENARIO_START')).toBe(true);
  });

  it('camino de tarjetas: seleccionar → send habilitado → enviar avanza (NPC reply)', async () => {
    const { onGameEvent, step } = renderGame({ practice: true });
    const card = screen.getByTestId('cr-card-p1_instruct_verify');
    expect(card).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(card);
    expect(playSfx).toHaveBeenCalled();
    expect(card).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('cr-send')).toBeEnabled();
    fireEvent.click(screen.getByTestId('cr-send'));
    await step(500); // VERIFY → verification → auto completeVerification (300ms)
    expect(emittedEvents(onGameEvent).some((e) => e.event === 'NPC_REPLY_SHOWN')).toBe(true);
    expect(emittedEvents(onGameEvent).some((e) => e.event === 'MESSAGE_SEND')).toBe(true);
  });

  it('completa un escenario de práctica y llama onComplete con agregado privacy-safe', async () => {
    const { onComplete, onGameEvent, step } = renderGame({ practice: true });
    fireEvent.click(screen.getByTestId('cr-card-p1_instruct_verify'));
    fireEvent.click(screen.getByTestId('cr-send'));
    await step(500); // verify auto → npc_confirm (reply)
    fireEvent.click(screen.getByTestId('cr-card-p1_verify'));
    fireEvent.click(screen.getByTestId('cr-send'));
    await step(500); // verify auto → end → CONSEQUENCE
    await step(2500); // consecuencia auto (2000) → COMPLETE → onComplete
    expect(onComplete).toHaveBeenCalledTimes(1);
    const summary = onComplete.mock.calls[0][0];
    expect(summary.aggregateOnly).toBe(true);
    expect(summary.completed).toBe(true);
    expect(summary.scored).toBe(true);
    expect(summary.resolved).toBe(true);
    assertNoForbidden(summary);
    for (const rec of emittedEvents(onGameEvent)) assertNoForbidden(rec);
  });

  it('compositor: send deshabilitado vacío; add → enabled; duplicado ignorado; enviar optimal', async () => {
    const { onComplete, onGameEvent, step } = renderGame({ scenarioId: 'CR-PRACTICE-02', practice: true });
    fireEvent.click(screen.getByTestId('cr-card-p2_ask_color'));
    fireEvent.click(screen.getByTestId('cr-send'));
    await step(100); // ASK (no verify) → reply → composer step
    const send = screen.getByTestId('cr-send');
    expect(send).toBeDisabled(); // compositor vacío (input gate)
    fireEvent.click(screen.getByTestId('cr-block-b_take'));
    fireEvent.click(screen.getByTestId('cr-block-b_zone'));
    expect(send).toBeEnabled();
    fireEvent.click(screen.getByTestId('cr-block-b_take')); // duplicado ignorado
    expect(screen.getAllByTestId(/cr-composed-/).length).toBe(2);
    fireEvent.click(screen.getByTestId('cr-block-b_confirm'));
    fireEvent.click(screen.getByTestId('cr-block-b_delivery'));
    expect(screen.getAllByTestId(/cr-composed-/).length).toBe(4);
    fireEvent.click(send);
    await step(100); // optimal → end → CONSEQUENCE
    await step(2500); // → COMPLETE
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0][0].scored).toBe(true);
    expect(emittedEvents(onGameEvent).filter((e) => e.event === 'BLOCK_ADDED').length).toBe(4);
  });

  it('3 tiers: data-cr-mobile a 390px y data-cr-tablet a 768px (sin flags en desktop)', () => {
    const d = renderGame({ practice: true });
    expect(d.container.querySelector('[data-testid="control-room"]')).not.toHaveAttribute('data-cr-mobile');
    expect(d.container.querySelector('[data-testid="control-room"]')).not.toHaveAttribute('data-cr-tablet');
    d.unmount();

    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 390 });
    const m = renderGame({ practice: true });
    act(() => { window.dispatchEvent(new Event('resize')); });
    expect(m.container.querySelector('[data-testid="control-room"]')).toHaveAttribute('data-cr-mobile', 'true');
    m.unmount();

    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 768 });
    const t = renderGame({ practice: true });
    act(() => { window.dispatchEvent(new Event('resize')); });
    expect(t.container.querySelector('[data-testid="control-room"]')).toHaveAttribute('data-cr-tablet', 'true');
    t.unmount();
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 1024 });
  });

  it('a11y: aria-label en el módulo, aria-live en NPC, reduced-motion + targets + 3 tiers en CSS', () => {
    const { container } = renderGame({ practice: true });
    const section = container.querySelector('[data-testid="control-room"]');
    expect(section).toHaveAttribute('aria-label');
    expect(screen.getByTestId('cr-npc')).toHaveAttribute('aria-live', 'polite');
    const css = fs.readFileSync(path.join(__dirname, 'controlRoom.css'), 'utf8');
    expect(css).toMatch(/prefers-reduced-motion: reduce/);
    expect(css).toMatch(/min-height:\s*4[48]px/);
    expect(css).toMatch(/@media \(max-width: 599px\)/);
    expect(css).toMatch(/@media \(max-width: 1023px\)/);
  });

  it('SFX opcionales: solo nombres válidos del catálogo (isSfxName)', () => {
    renderGame({ practice: true });
    fireEvent.click(screen.getByTestId('cr-card-p1_instruct'));
    for (const [name] of playSfx.mock.calls) {
      expect(isSfxName(name)).toBe(true);
    }
  });

  it('timeout (B6): ticker dispara TIMEOUT y el escenario NO puntúa sin envío', async () => {
    const { onComplete, onGameEvent, step } = renderGame({ scenarioId: 'CR-L6-S01' });
    await step(46000); // el ticker (250ms) + reloj falso → expired → TIMEOUT → CONSEQUENCE
    await step(2500); // consecuencia → COMPLETE → onComplete
    expect(emittedEvents(onGameEvent).some((e) => e.event === 'TIMEOUT_TRIGGERED')).toBe(true);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0][0].scored).toBe(false);
  });
});
