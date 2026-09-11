// controlRoomGameSession.test.jsx — EXP-COMM-001 · C3: orquestación de sesión.
//
// Contracto C3 (plan docs/plans/2026-09-11-plan-exp8-comm.md; card t_d5965d8d):
//   - Flujo §4: bienvenida → tutorial T1-T5 (2 práctica) → salida → evaluación (12 escenarios,
//     6 bloques con intro) → final neutra.
//   - Práctica (block 0) NO puntúa y NO entra al agregado de evaluación.
//   - buildControlRoomSessionAggregate: métricas 11 + dimensiones 7 agregadas.
//   - Los textos (welcome/T1-T5/salida/intros/final) vienen del manifest (C3), no del componente.

import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../../i18n/LanguageContext.jsx';

vi.mock('../originalGameSfx.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, playSfx: vi.fn(() => true), getGameSfxEnabled: vi.fn(() => true), setGameSfxEnabled: vi.fn() };
});

import ControlRoomGame, { buildControlRoomSessionAggregate } from './controlRoomGame.jsx';
import { CONTROL_ROOM_TUTORIAL_NODES } from './controlRoomRules.js';

function makeClock() {
  let t = 0;
  return { now: () => t, advance: (ms) => { t += Math.max(0, ms); } };
}

function renderSession(props = {}) {
  const clock = makeClock();
  const onGameEvent = vi.fn();
  const onComplete = vi.fn();
  const utils = render(
    <LanguageProvider>
      <ControlRoomGame active onGameEvent={onGameEvent} onComplete={onComplete} now={clock.now} {...props} />
    </LanguageProvider>,
  );
  const step = async (ms) => { await act(async () => { clock.advance(ms); vi.advanceTimersByTime(ms); }); };
  return { onGameEvent, onComplete, clock, step, ...utils };
}

// Completa P1 (CR-PRACTICE-01): verify → confirm → verify → end.
async function completeP1(ui) {
  const { step } = ui;
  fireEvent.click(screen.getByTestId('cr-card-p1_instruct_verify'));
  fireEvent.click(screen.getByTestId('cr-send'));
  await step(500); // verification auto (300) → npc_confirm
  fireEvent.click(screen.getByTestId('cr-card-p1_verify'));
  fireEvent.click(screen.getByTestId('cr-send'));
  await step(500); // verification auto → end → consequence
  await step(2500); // consecuencia auto (2000) → complete
}

// Completa P2 (CR-PRACTICE-02): ask → composer (4 bloques) → send → end.
async function completeP2(ui) {
  const { step } = ui;
  fireEvent.click(screen.getByTestId('cr-card-p2_ask_color'));
  fireEvent.click(screen.getByTestId('cr-send'));
  await step(150); // ASK (no verify) → reply → composer
  fireEvent.click(screen.getByTestId('cr-block-b_take'));
  fireEvent.click(screen.getByTestId('cr-block-b_zone'));
  fireEvent.click(screen.getByTestId('cr-block-b_confirm'));
  fireEvent.click(screen.getByTestId('cr-block-b_delivery'));
  fireEvent.click(screen.getByTestId('cr-send'));
  await step(150); // optimal → end → consequence
  await step(2500); // consecuencia → complete
}

describe('ControlRoomGame sesión (EXP-COMM-001 C3)', () => {
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

  it('flujo: welcome → tutorial P1 (hint T1/T2) → P2 (hint) → exit → block_intro(1) → evaluación (sin hint)', async () => {
    const ui = renderSession();
    // 1. Bienvenida
    expect(screen.getByTestId('control-room')).toHaveAttribute('data-cr-phase', 'welcome');
    expect(screen.getByTestId('cr-welcome-cta')).toHaveTextContent(/Iniciar práctica/i);
    fireEvent.click(screen.getByTestId('cr-welcome-cta'));
    // 2. Tutorial P1 (cr-incident + hint T1/T2)
    await ui.step(50);
    expect(screen.getByTestId('control-room')).toHaveAttribute('data-cr-phase', 'scenario');
    expect(screen.getByTestId('control-room')).toHaveAttribute('data-cr-mode', 'tutorial');
    expect(screen.getByTestId('cr-tutorial-hint')).toBeTruthy();
    const hint = screen.getByTestId('cr-tutorial-hint');
    expect(within(hint).getByText(CONTROL_ROOM_TUTORIAL_NODES.T1.copy.es)).toBeTruthy();
    expect(within(hint).getByText(CONTROL_ROOM_TUTORIAL_NODES.T2.copy.es)).toBeTruthy();
    await completeP1(ui);
    // 3. Tutorial P2 (hint T3/T4)
    expect(screen.getByTestId('control-room')).toHaveAttribute('data-cr-mode', 'tutorial');
    expect(screen.getByTestId('cr-tutorial-hint')).toBeTruthy();
    await completeP2(ui);
    // 4. Salida del tutorial
    expect(screen.getByTestId('control-room')).toHaveAttribute('data-cr-phase', 'tutorial_exit');
    expect(screen.getByTestId('cr-start-evaluation')).toHaveTextContent(/Comenzar evaluación/i);
    fireEvent.click(screen.getByTestId('cr-start-evaluation'));
    // 5. Intro bloque 1
    await ui.step(50);
    expect(screen.getByTestId('control-room')).toHaveAttribute('data-cr-phase', 'block_intro');
    expect(screen.getByTestId('cr-block-intro')).toHaveTextContent(/Claridad/i);
    fireEvent.click(screen.getByTestId('cr-block-continue'));
    // 6. Primer escenario de evaluación (CR-L1-S01), modo evaluation, SIN hint de tutorial
    await ui.step(50);
    expect(screen.getByTestId('control-room')).toHaveAttribute('data-cr-phase', 'scenario');
    expect(screen.getByTestId('control-room')).toHaveAttribute('data-cr-mode', 'evaluation');
    expect(screen.queryByTestId('cr-tutorial-hint')).toBeNull();
    expect(screen.getByTestId('cr-incident')).toBeTruthy();
  });

  it('práctica no puntúa: al terminar el tutorial (2 práctica) va a exit, no a final', async () => {
    const ui = renderSession();
    fireEvent.click(screen.getByTestId('cr-welcome-cta'));
    await ui.step(50);
    await completeP1(ui);
    await completeP2(ui);
    // tras 2 práctica → tutorial_exit (no final)
    expect(screen.getByTestId('control-room')).toHaveAttribute('data-cr-phase', 'tutorial_exit');
    expect(screen.queryByTestId('cr-final')).toBeNull();
    expect(ui.onComplete).not.toHaveBeenCalled(); // onComplete solo en final
  });

  it('buildControlRoomSessionAggregate: métricas sumadas, dimensiones recomputadas, integrity unida', () => {
    const mk = (over) => ({
      scenarioId: 'X', form: 'A', block: 1, scored: true, resolved: true,
      metrics: {
        first_decision_latency_ms: 1000, average_decision_latency_ms: 1200, time_spent_reading_ms: 900,
        pre_send_edit_count: 1, pre_send_reorder_count: 0, total_message_count: 2, question_count: 1,
        verification_count: 1, confirmation_requested: true, confirmation_given: false, timeout_count: 0,
      },
      dimensionStats: {
        clarity: { opportunity: 2, success: 2 }, relevance_and_synthesis: { opportunity: 0, success: 0 },
        inquiry: { opportunity: 1, success: 1 }, verification_closed_loop: { opportunity: 1, success: 0 },
        adaptation: { opportunity: 0, success: 0 }, repair: { opportunity: 0, success: 0 },
        receptive_understanding: { opportunity: 0, success: 0 },
      },
      integrityFlags: [],
      ...over,
    });
    const agg = buildControlRoomSessionAggregate([
      mk({}),
      mk({
        scenarioId: 'Y', resolved: false,
        metrics: { ...mk({}).metrics, first_decision_latency_ms: 500, average_decision_latency_ms: 800, total_message_count: 1, timeout_count: 1 },
        integrityFlags: ['timeout_no_score'],
      }),
    ]);
    expect(agg.scenarioCount).toBe(2);
    expect(agg.scoredCount).toBe(2);
    expect(agg.resolvedCount).toBe(1);
    expect(agg.total_message_count).toBe(3); // 2+1
    expect(agg.question_count).toBe(2); // 1+1
    expect(agg.timeout_count).toBe(1);
    expect(agg.first_decision_latency_ms).toBe(500); // min(1000, 500)
    // average = (1200*2 + 800*1) / (2+1) = 3200/3 = 1067
    expect(agg.average_decision_latency_ms).toBe(1067);
    expect(agg.dimensions.clarity).toBe(100); // 2/2
    expect(agg.dimensions.inquiry).toBe(100); // 1/1
    expect(agg.dimensions.verification_closed_loop).toBe(0); // 0/1
    expect(agg.dimensions.relevance_and_synthesis).toBeNull(); // 0 oportunidad
    expect(agg.integrityFlags).toContain('timeout_no_score');
    expect(agg.aggregateOnly).toBe(true);
  });

  it('buildControlRoomSessionAggregate vacío: completed false, dimensiones null', () => {
    const agg = buildControlRoomSessionAggregate([]);
    expect(agg.completed).toBe(false);
    expect(agg.scenarioCount).toBe(0);
    expect(agg.dimensions.clarity).toBeNull();
    expect(agg.total_message_count).toBe(0);
  });
});
