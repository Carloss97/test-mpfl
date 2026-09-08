// bombEngineTutorial.test.js — EXP-BOMB-001 · B4: tutorial T1-T5 (card t_b3f1dc15).
//
// Spec (ley): Doc 1 §7 (BOOT → TUTORIAL_INTRO → TUTORIAL_PLAY → TUTORIAL_RESULT),
// §5.1 (INPUT_RESTART_TUTORIAL), §10.1 ("repetir tutorial sin incluir sus datos en
// scoring"), §16.2 (DoD: "El tutorial no alimenta scores evaluativos").
// Doc 2 §4.2 (nodos T1-T5 + criterios de avance), §18 (tutorial_replay_count).
//
// Diseño B4 (decisiones documentadas en el handoff):
// - El tutorial guiado corre en 3 SEGMENTOS (manifest `tutorial.segments`):
//     S1 guided   — T1/T2/T3: un nodo por paso del runtime tutorial (A1→A2→B1).
//                   Cada STEP_SUCCESS avanza el nodo; al completar, el motor
//                   reinicia el runtime (panel fresh) y sigue en TUTORIAL_PLAY.
//     S2 sequence — T4: secuencia completa (SW1→RED→HOLD) en panel fresh.
//     S3 memory   — T5: INSTRUCTION_ENCODING (lectura `readMs`) → BLIND_DELAY
//                   (`delayMs`, "se ocultará brevemente") → EXECUTION sin manual
//                   (timeLimitMs null: sin presión). Al completar, LEVEL_SUCCESS.
// - El motor decide la segmentación (nodo/segmento por (state, stepIndex)); la UI
//   solo pinta (DoD §16.2: nada de reglas en UI).
// - Replay: `restartTutorial()` (INPUT_RESTART_TUTORIAL) desde cualquier estado de
//   tutorial → segmento 1, panel fresh, TUTORIAL_REPLAY { count } (Doc 2 §18).

import { describe, it, expect } from 'vitest';
import { BOMB_RULE_MANIFEST } from './bombRules.js';
import { BOMB_STATES, createBombEngine } from './bombEngine.js';

const S = BOMB_STATES;

function makeHarness(seed = 42) {
  let t = 0;
  const now = () => t;
  const events = [];
  const log = (event, meta) => events.push({ tMs: t, event, meta: meta ?? {} });
  const engine = createBombEngine({ now, log, seed });
  const api = {
    engine,
    events,
    advance: (ms) => { t += ms; },
    find: (ev) => events.filter((e) => e.event === ev),
    last: (ev) => {
      const list = events.filter((e) => e.event === ev);
      return list.length ? list[list.length - 1] : null;
    },
    /** BOOT → TUTORIAL_PLAY (segmento 1). */
    startTutorial: () => {
      engine.beginSession();
      expect(engine.state).toBe(S.TUTORIAL_INTRO);
      engine.startTutorial();
      expect(engine.state).toBe(S.TUTORIAL_PLAY);
    },
    /** Ejecuta SW1 → RED → hold 2000 (la secuencia tutorial completa). */
    playSequence: () => {
      engine.action({ kind: 'SWITCH', id: 'SW_1', from: 'OFF', to: 'ON' });
      api.advance(100);
      engine.action({ kind: 'WIRE', id: 'WIRE_RED', op: 'CUT' });
      api.advance(100);
      engine.buttonAction('BTN_YELLOW', 'DOWN');
      api.advance(2000);
      engine.buttonAction('BTN_YELLOW', 'UP');
    },
    /** T5: avanza lectura (readMs) → delay (delayMs) → EXECUTION. */
    playMemoryPhase: () => {
      const seg = BOMB_RULE_MANIFEST.tutorial.segments[2];
      expect(engine.state).toBe(S.INSTRUCTION_ENCODING);
      api.advance(seg.readMs + 1);
      engine.tick();
      expect(engine.state).toBe(S.BLIND_DELAY);
      api.advance(seg.delayMs + 1);
      engine.tick();
      expect(engine.state).toBe(S.EXECUTION);
    },
    /** Tutorial completo (S1+S2+S3) → LEVEL_SUCCESS (segmento final) → TUTORIAL_RESULT. */
    runTutorial: () => {
      api.startTutorial();
      api.playSequence(); // S1 (T1-T3) → S2 (T4)
      api.playSequence(); // S2 (T4) → S3 (T5): INSTRUCTION_ENCODING
      api.playMemoryPhase(); // S3: lectura → delay → EXECUTION
      api.playSequence(); // S3 (T5) → LEVEL_SUCCESS
      expect(engine.state).toBe(S.LEVEL_SUCCESS);
      engine.tutorialComplete();
      expect(engine.state).toBe(S.TUTORIAL_RESULT);
    },
  };
  return api;
}

describe('B4 — motor: segmentos del tutorial guiado (Doc 2 §4.2)', () => {
  it('startTutorial: segmento 1, TUTORIAL_SEGMENT logueado, evaluated:false en LEVEL_START', () => {
    const h = makeHarness();
    h.startTutorial();
    expect(h.engine.tutorialSegment).toBe(1);
    expect(h.last('LEVEL_START').meta).toMatchObject({ level: 0, evaluated: false });
    expect(h.last('TUTORIAL_SEGMENT').meta).toMatchObject({ segment: 1, mode: 'guided', tutorial: true, evaluated: false });
  });

  it('S1→S2: al completar T1-T3 (SW1→RED→hold), panel FRESH para T4 y sigue en TUTORIAL_PLAY', () => {
    const h = makeHarness();
    h.startTutorial();
    h.playSequence();
    expect(h.engine.state).toBe(S.TUTORIAL_PLAY);
    expect(h.engine.tutorialSegment).toBe(2);
    // Panel fresh: ningún estado físico heredado de T1-T3
    expect(h.engine.components.switches.SW_1).toBe('OFF');
    expect(h.engine.components.wires.WIRE_RED).toBe('INTACT');
    expect(h.engine.components.buttons.BTN_YELLOW).toBe('IDLE');
    expect(h.engine.stepIndex).toBe(0);
    expect(h.find('TUTORIAL_SEGMENT').map((e) => e.meta.segment)).toEqual([1, 2]);
    expect(h.last('TUTORIAL_SEGMENT').meta.mode).toBe('sequence');
    // No se emite LEVEL_SUCCESS intermedio (el success del tutorial es el del segmento final)
    expect(h.find('LEVEL_SUCCESS')).toHaveLength(0);
  });

  it('S2→S3: al completar T4, T5 arranca en INSTRUCTION_ENCODING (lectura readMs + delayMs breve)', () => {
    const h = makeHarness();
    h.startTutorial();
    h.playSequence(); // → S2
    h.playSequence(); // completa T4
    const seg = BOMB_RULE_MANIFEST.tutorial.segments[2];
    expect(h.engine.state).toBe(S.INSTRUCTION_ENCODING);
    expect(h.engine.tutorialSegment).toBe(3);
    expect(h.engine.level.exposureMs).toBe(seg.readMs);
    expect(h.engine.level.delayMs).toBe(seg.delayMs);
    expect(h.last('INSTRUCTIONS_SHOW').meta).toMatchObject({ exposure_ms: seg.readMs, tutorial: true, segment: 3 });
    expect(h.last('TUTORIAL_SEGMENT').meta).toMatchObject({ segment: 3, mode: 'memory' });
  });

  it('T5: eventos §11 completos (INSTRUCTIONS_HIDE exposure_elapsed, BLACK_SCREEN, EXECUTION_START sin límite)', () => {
    const h = makeHarness();
    h.runTutorial();
    expect(h.last('INSTRUCTIONS_HIDE').meta.reason).toBe('exposure_elapsed');
    const bsStart = h.find('BLACK_SCREEN_START');
    const bsEnd = h.find('BLACK_SCREEN_END');
    expect(bsStart).toHaveLength(1); // solo T5 tiene delay en el tutorial
    expect(bsEnd).toHaveLength(1);
    expect(bsStart[0].meta.duration_ms).toBe(BOMB_RULE_MANIFEST.tutorial.segments[2].delayMs);
    const exec = h.find('EXECUTION_START');
    expect(exec).toHaveLength(1);
    expect(exec[0].meta.time_limit_s).toBeNull(); // sin presión (Doc 1 §10: tutorial)
  });

  it('T5: input durante encoding/delay → INPUT_DURING_LOCK (sin física, sin scoring)', () => {
    const h = makeHarness();
    h.startTutorial();
    h.playSequence();
    h.playSequence(); // → S3: INSTRUCTION_ENCODING
    const r1 = h.engine.action({ kind: 'SWITCH', id: 'SW_1', from: 'OFF', to: 'ON' });
    expect(r1).toMatchObject({ accepted: false, reason: 'INPUT_DURING_LOCK' });
    expect(h.engine.components.switches.SW_1).toBe('OFF');
    // Avanza SOLO hasta el delay (sin pasar a ejecución, donde el input es legítimo)
    const seg = BOMB_RULE_MANIFEST.tutorial.segments[2];
    h.advance(seg.readMs + 1);
    h.engine.tick();
    expect(h.engine.state).toBe(S.BLIND_DELAY);
    const r2 = h.engine.action({ kind: 'WIRE', id: 'WIRE_RED', op: 'CUT' });
    expect(r2).toMatchObject({ accepted: false, reason: 'INPUT_DURING_LOCK' });
    expect(h.engine.components.wires.WIRE_RED).toBe('INTACT');
    expect(h.find('TIME_PENALTY')).toHaveLength(0);
  });

  it('T5: ejecución completa → LEVEL_SUCCESS (levelKey tutorial, evaluated:false)', () => {
    const h = makeHarness();
    h.runTutorial();
    const success = h.last('LEVEL_SUCCESS');
    expect(success.meta).toMatchObject({ level: 'tutorial', evaluated: false });
    // 9 STEP_SUCCESS en total (3 por segmento × 3 segmentos)
    const successes = h.find('STEP_SUCCESS');
    expect(successes).toHaveLength(9);
    expect(successes.every((e) => e.meta.step_id)).toBe(true);
  });
});

describe('B4 — motor: errores en tutorial NO puntúan (DoD §16.2)', () => {
  it('STEP_ERROR en S1: registrado, sin TIME_PENALTY ni LEVEL_FAIL; el segmento continúa', () => {
    const h = makeHarness();
    h.startTutorial();
    // T1: corta ROJO antes de SW1 → ORDER_ERROR (el cable queda cortado: irreversibilidad §8.3)
    h.engine.action({ kind: 'WIRE', id: 'WIRE_RED', op: 'CUT' });
    expect(h.last('STEP_ERROR').meta).toMatchObject({ error_class: 'ORDER_ERROR', penalizes: true });
    expect(h.find('TIME_PENALTY')).toHaveLength(0);
    expect(h.engine.state).toBe(S.TUTORIAL_PLAY);
    // SW1 (paso 0 EXACT) + hold: el expected es A2 pero ROJO ya está cortado…
    // el usuario queda en estado recuperable vía replay (decisión B4 #2, Doc 1 §10.1).
    h.engine.action({ kind: 'SWITCH', id: 'SW_1', from: 'OFF', to: 'ON' });
    expect(h.last('STEP_SUCCESS').meta.step_id).toBe('SW_1_ON');
    // El motor NUNCA falla el tutorial: ni por errores ni por timeout (timeLimitMs null)
    h.advance(60000);
    h.engine.tick();
    expect(h.engine.state).toBe(S.TUTORIAL_PLAY);
    expect(h.find('LEVEL_FAIL')).toHaveLength(0);
  });

  it('HOLD_TOO_SHORT en T3: sin penalización; reintento 2000 ms → S2', () => {
    const h = makeHarness();
    h.startTutorial();
    h.engine.action({ kind: 'SWITCH', id: 'SW_1', from: 'OFF', to: 'ON' });
    h.advance(100);
    h.engine.action({ kind: 'WIRE', id: 'WIRE_RED', op: 'CUT' });
    h.advance(100);
    h.engine.buttonAction('BTN_YELLOW', 'DOWN');
    h.advance(700);
    h.engine.buttonAction('BTN_YELLOW', 'UP');
    expect(h.last('STEP_ERROR').meta.error_class).toBe('HOLD_TOO_SHORT');
    expect(h.find('TIME_PENALTY')).toHaveLength(0);
    expect(h.find('LEVEL_FAIL')).toHaveLength(0);
    // Reintento dentro de ventana (1800-2400) → S2
    h.engine.buttonAction('BTN_YELLOW', 'DOWN');
    h.advance(2000);
    h.engine.buttonAction('BTN_YELLOW', 'UP');
    expect(h.engine.state).toBe(S.TUTORIAL_PLAY);
    expect(h.engine.tutorialSegment).toBe(2);
  });

  it('tutorial completo jugado con errores previos: levels_completed vacío + summary limpio (no alimenta scores)', () => {
    const h = makeHarness();
    h.runTutorial();
    expect(h.find('TIME_PENALTY')).toHaveLength(0);
    expect(h.find('LEVEL_FAIL')).toHaveLength(0);
    const summary = h.engine.sessionSummary();
    expect(summary.levels_completed).toEqual([]);
    expect(summary.tutorial_replay_count).toBe(0);
    expect(h.last('LEVEL_SUCCESS').meta.evaluated).toBe(false);
  });
});

describe('B4 — motor: replay (INPUT_RESTART_TUTORIAL, Doc 1 §5.1/§10.1, Doc 2 §18)', () => {
  it('restartTutorial desde S2: panel fresh, segmento 1, TUTORIAL_REPLAY {count:1}', () => {
    const h = makeHarness();
    h.startTutorial();
    h.playSequence(); // → S2 (SW1 ON, RED CUT en el runtime S1)
    const res = h.engine.restartTutorial();
    expect(res).toMatchObject({ ok: true, reason: 'TUTORIAL_RESTART' });
    expect(h.engine.state).toBe(S.TUTORIAL_PLAY);
    expect(h.engine.tutorialSegment).toBe(1);
    expect(h.engine.components.switches.SW_1).toBe('OFF');
    expect(h.engine.components.wires.WIRE_RED).toBe('INTACT');
    expect(h.engine.tutorialReplayCount).toBe(1);
    expect(h.last('TUTORIAL_REPLAY').meta).toMatchObject({ count: 1, tutorial: true, evaluated: false });
    // El replay NO incluye datos evaluados: sigue sin levels_completed
    expect(h.engine.sessionSummary().levels_completed).toEqual([]);
  });

  it('restartTutorial desde T5 (EXECUTION) y desde el modal de salida (LEVEL_SUCCESS tutorial)', () => {
    const h = makeHarness();
    h.startTutorial();
    h.playSequence();
    h.playSequence(); // → S3: INSTRUCTION_ENCODING
    h.playMemoryPhase(); // → EXECUTION
    expect(h.engine.restartTutorial()).toMatchObject({ ok: true });
    expect(h.engine.state).toBe(S.TUTORIAL_PLAY);
    expect(h.engine.tutorialSegment).toBe(1);
    // Completa el tutorial y replay desde el "modal" (LEVEL_SUCCESS del segmento final)
    h.playSequence();
    h.playSequence();
    h.playMemoryPhase();
    h.playSequence();
    expect(h.engine.state).toBe(S.LEVEL_SUCCESS);
    expect(h.engine.restartTutorial()).toMatchObject({ ok: true });
    expect(h.engine.tutorialReplayCount).toBe(2);
    expect(h.last('TUTORIAL_REPLAY').meta.count).toBe(2);
    expect(h.engine.state).toBe(S.TUTORIAL_PLAY);
  });

  it('restartTutorial fuera del tutorial (L1) → INVALID_STATE (no interfiere con la evaluación)', () => {
    const h = makeHarness();
    h.runTutorial();
    h.engine.continueFromResult(); // → LEVEL_INTRO L1
    expect(h.engine.state).toBe(S.LEVEL_INTRO);
    expect(h.engine.restartTutorial()).toMatchObject({ ok: false, reason: 'INVALID_STATE' });
    expect(h.engine.tutorialReplayCount).toBe(0);
  });
});

describe('B4 — motor: determinismo del tutorial (spec §15)', () => {
  it('mismo seed + mismos inputs => misma telemetría del tutorial guiado', () => {
    const script = (h) => {
      h.runTutorial();
      return h.events.map(({ tMs, event, meta }) => ({ tMs, event, meta }));
    };
    const a = script(makeHarness(7));
    const b = script(makeHarness(7));
    expect(a.length).toBeGreaterThan(30);
    expect(b).toEqual(a);
  });
});
