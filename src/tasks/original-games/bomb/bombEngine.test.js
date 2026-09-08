import { describe, it, expect } from 'vitest';
import { createBombEngine, classifyAction, normalizeObservedAction } from './bombEngine.js';
import { BOMB_RULE_MANIFEST } from './bombRules.js';

// B1 EXP-7 BOMB — tests de la state machine pura + action validator + input gate.
// QA de referencia (Doc 1 §16.1): QA-01/03/04/06/07/08 como specs (aceptación B1),
// más tolerancias hold, penalización, irreversibilidad, determinismo e integridad.
// Reloj falso inyectado (riesgo #2 del plan: determinismo en headless).

const S = {
  BOOT: 'BOOT',
  TUTORIAL_INTRO: 'TUTORIAL_INTRO',
  TUTORIAL_PLAY: 'TUTORIAL_PLAY',
  TUTORIAL_RESULT: 'TUTORIAL_RESULT',
  LEVEL_INTRO: 'LEVEL_INTRO',
  INSTRUCTION_ENCODING: 'INSTRUCTION_ENCODING',
  BLIND_DELAY: 'BLIND_DELAY',
  EXECUTION: 'EXECUTION',
  LEVEL_SUCCESS: 'LEVEL_SUCCESS',
  LEVEL_FAIL: 'LEVEL_FAIL',
  LEVEL_RESULT: 'LEVEL_RESULT',
  SESSION_COMPLETE: 'SESSION_COMPLETE',
};

function makeHarness(seed = 42, manifest = BOMB_RULE_MANIFEST) {
  let t = 0;
  const now = () => t;
  const events = [];
  const log = (event, meta) => events.push({ tMs: t, event, meta: meta ?? {} });
  const engine = createBombEngine({ now, log, seed, manifest });
  const advance = (ms) => { t += ms; };
  const api = {
    engine,
    events,
    seed,
    advance,
    find: (ev) => events.filter((e) => e.event === ev),
    last: (ev) => {
      const list = events.filter((e) => e.event === ev);
      return list.length ? list[list.length - 1] : null;
    },
    /** Eventos desde el último EXECUTION_START (aisla la fase de ejecución del nivel actual). */
    sinceExecutionStart: () => {
      let idx = -1;
      for (let i = events.length - 1; i >= 0; i -= 1) {
        if (events[i].event === 'EXECUTION_START') { idx = i; break; }
      }
      return events.slice(idx + 1);
    },
    /** BOOT → tutorial completo (SW1 → RED → hold 2000) → TUTORIAL_RESULT. */
    runTutorial: () => {
      engine.beginSession();
      expect(engine.state).toBe(S.TUTORIAL_INTRO);
      engine.startTutorial();
      expect(engine.state).toBe(S.TUTORIAL_PLAY);
      advance(100);
      engine.action({ kind: 'SWITCH', id: 'SW_1', from: 'OFF', to: 'ON' });
      advance(100);
      engine.action({ kind: 'WIRE', id: 'WIRE_RED', op: 'CUT' });
      advance(100);
      engine.buttonAction('BTN_YELLOW', 'DOWN');
      advance(2000);
      engine.buttonAction('BTN_YELLOW', 'UP');
      expect(engine.state).toBe(S.LEVEL_SUCCESS);
      engine.tutorialComplete();
      expect(engine.state).toBe(S.TUTORIAL_RESULT);
    },
    /** Juega el nivel actual sin errores. Asume state LEVEL_INTRO. Termina en LEVEL_SUCCESS. */
    playCurrentLevel: () => {
      engine.startLevelExecution();
      expect(engine.state).toBe(S.INSTRUCTION_ENCODING);
      const lvl = engine.level;
      if (lvl.exposureMs != null) {
        advance(lvl.exposureMs + 1);
        engine.tick();
      } else {
        engine.continueEncoding();
      }
      if (lvl.delayMs > 0) {
        expect(engine.state).toBe(S.BLIND_DELAY);
        advance(lvl.delayMs + 1);
        engine.tick();
      }
      expect(engine.state).toBe(S.EXECUTION);
      for (const step of lvl.effectiveSequence) {
        advance(100);
        if (step.kind === 'SWITCH') {
          engine.action({ kind: 'SWITCH', id: step.id, from: 'OFF', to: 'ON' });
        } else if (step.kind === 'WIRE') {
          engine.action({ kind: 'WIRE', id: step.id, op: 'CUT' });
        } else {
          engine.buttonAction('BTN_YELLOW', 'DOWN');
          advance(step.durationMs);
          engine.buttonAction('BTN_YELLOW', 'UP');
        }
      }
      expect(engine.state).toBe(S.LEVEL_SUCCESS);
    },
    /** Lleva la sesión al LEVEL_INTRO del nivel objetivo (1..4), jugando perfectos los intermedios. */
    gotoLevel: (target) => {
      if (engine.state === S.TUTORIAL_RESULT) engine.continueFromResult();
      while (engine.levelKey !== target) {
        expect(engine.state).toBe(S.LEVEL_INTRO);
        api.playCurrentLevel();
        engine.acknowledgeResult();
        expect(engine.state).toBe(S.LEVEL_RESULT);
        engine.continueFromResult();
      }
      expect(engine.state).toBe(S.LEVEL_INTRO);
      expect(engine.levelKey).toBe(target);
    },
    /** Entra en EXECUTION del nivel actual (asume LEVEL_INTRO). */
    enterExecution: () => {
      engine.startLevelExecution();
      const lvl = engine.level;
      if (lvl.exposureMs != null) {
        advance(lvl.exposureMs + 1);
        engine.tick();
      } else {
        engine.continueEncoding();
      }
      if (lvl.delayMs > 0) {
        advance(lvl.delayMs + 1);
        engine.tick();
      }
      expect(engine.state).toBe(S.EXECUTION);
    },
  };
  return api;
}

function holdFor(engine, h, ms) {
  engine.buttonAction('BTN_YELLOW', 'DOWN');
  h.advance(ms);
  return engine.buttonAction('BTN_YELLOW', 'UP');
}

describe('bombEngine — flujo de sesión (state machine pura)', () => {
  it('recorre BOOT → tutorial → L1..L4 → SESSION_COMPLETE con todos los estados spec §7', () => {
    const h = makeHarness();
    const e = h.engine;
    expect(e.state).toBe(S.BOOT);
    h.runTutorial();
    // L1
    h.gotoLevel(1);
    h.playCurrentLevel();
    e.acknowledgeResult();
    e.continueFromResult();
    expect(e.state).toBe(S.LEVEL_INTRO);
    expect(e.levelKey).toBe(2);
    // L2
    h.playCurrentLevel();
    e.acknowledgeResult();
    e.continueFromResult();
    // L3
    expect(e.levelKey).toBe(3);
    h.playCurrentLevel();
    e.acknowledgeResult();
    e.continueFromResult();
    // L4 (Modelo B)
    expect(e.levelKey).toBe(4);
    h.playCurrentLevel();
    e.acknowledgeResult();
    e.continueFromResult();
    expect(e.state).toBe(S.SESSION_COMPLETE);
    expect(h.last('SESSION_COMPLETE').meta.levels_completed).toEqual([1, 2, 3, 4]);
    // Tutorial no cuenta en levels_completed (DoD: no alimenta scores)
    expect(h.last('LEVEL_SUCCESS')).toMatchObject({ meta: expect.objectContaining({ level: 4, evaluated: true }) });
    const tutorialSuccess = h.find('LEVEL_SUCCESS').find((ev) => ev.meta.level === 'tutorial');
    expect(tutorialSuccess.meta.evaluated).toBe(false);
  });

  it('emite los eventos de contexto del nivel: LEVEL_START con level/bomb_type/seq_ids/seed (spec §11)', () => {
    const h = makeHarness(99);
    h.runTutorial();
    h.gotoLevel(4);
    const ls = h.last('LEVEL_START');
    expect(ls.meta).toEqual({ level: 4, bomb_type: 'B', seq_ids: ['A1', 'A2', 'B1', 'C1'], seed: 99, evaluated: true });
  });

  it('exposición automática: INSTRUCTIONS_HIDE reason=exposure_elapsed; manual libre: reason=continue', () => {
    const h = makeHarness();
    h.runTutorial();
    h.gotoLevel(2); // exposure 3000
    h.engine.startLevelExecution();
    h.advance(3001);
    h.engine.tick();
    expect(h.last('INSTRUCTIONS_HIDE').meta.reason).toBe('exposure_elapsed');
    const h1 = makeHarness();
    h1.runTutorial();
    h1.gotoLevel(1); // manual visible (libre)
    h1.engine.startLevelExecution();
    h1.engine.continueEncoding();
    expect(h1.last('INSTRUCTIONS_HIDE').meta.reason).toBe('continue');
  });

  it('blind delay: BLACK_SCREEN_START con duration_ms → BLACK_SCREEN_END → EXECUTION_START (spec §11)', () => {
    const h = makeHarness();
    h.runTutorial();
    h.gotoLevel(3); // delay 4000
    h.engine.startLevelExecution();
    h.advance(2001);
    h.engine.tick(); // exposure elapsed
    expect(h.engine.state).toBe(S.BLIND_DELAY);
    expect(h.last('BLACK_SCREEN_START').meta.duration_ms).toBe(4000);
    h.advance(4001);
    h.engine.tick();
    expect(h.engine.state).toBe(S.EXECUTION);
    // L2 (jugado perfecto en gotoLevel) también tuvo delay: cada BLACK_SCREEN_START
    // debe tener su BLACK_SCREEN_END emparejado
    const starts = h.find('BLACK_SCREEN_START');
    const ends = h.find('BLACK_SCREEN_END');
    expect(starts.at(-1).meta.duration_ms).toBe(4000); // L3
    expect(ends.length).toBe(starts.length);
    expect(h.last('EXECUTION_START').meta.time_limit_s).toBe(12);
  });

  it('rechaza transiciones inválidas y las cuenta (spec §14.1 unexpected_state_transition_count)', () => {
    const h = makeHarness();
    const e = h.engine;
    const res = e.startLevelExecution(); // en BOOT no es válido
    expect(res.ok).toBe(false);
    expect(e.integrity.unexpectedStateTransitionCount).toBe(1);
  });
});

describe('bombEngine — QA-01: L1 secuencia exacta SW1→RED', () => {
  it('SUCCESS sin penalización ni errores', () => {
    const h = makeHarness();
    h.runTutorial();
    h.gotoLevel(1);
    h.playCurrentLevel();
    const success = h.last('LEVEL_SUCCESS');
    expect(success.meta.errors).toBe(0);
    expect(success.meta.elapsed_ms).toBeGreaterThan(0);
    expect(h.find('TIME_PENALTY')).toHaveLength(0);
    expect(h.find('STEP_ERROR')).toHaveLength(0);
  });
});

describe('bombEngine — QA-05: L4 correcto SW3→BLUE→HOLD→GREEN', () => {
  it('SUCCESS con la secuencia efectiva Modelo B (esquema §19)', () => {
    const h = makeHarness();
    h.runTutorial();
    h.gotoLevel(4);
    h.playCurrentLevel();
    const successes = h.sinceExecutionStart().filter((ev) => ev.event === 'STEP_SUCCESS');
    expect(successes.map((ev) => ev.meta.step_id)).toEqual([
      'SW_3_ON', 'CUT_BLUE', 'HOLD_YELLOW_2000', 'CUT_GREEN',
    ]);
    expect(h.last('LEVEL_SUCCESS').meta.errors).toBe(0);
  });
});

describe('bombEngine — QA-03: L3 orden incorrecto (verde antes de amarillo)', () => {
  it('ORDER_ERROR + penalización 30% del tiempo restante', () => {
    const h = makeHarness();
    h.runTutorial();
    h.gotoLevel(3); // SW1→RED→HOLD→GREEN, 12 s
    h.enterExecution();
    h.advance(100);
    h.engine.action({ kind: 'SWITCH', id: 'SW_1', from: 'OFF', to: 'ON' });
    h.advance(100);
    h.engine.action({ kind: 'WIRE', id: 'WIRE_RED', op: 'CUT' });
    // Esperado: HOLD (paso 3). Corta GREEN (paso 4) antes → ORDER_ERROR
    h.advance(100);
    const res = h.engine.action({ kind: 'WIRE', id: 'WIRE_GREEN', op: 'CUT' });
    expect(res.errorClass).toBe('ORDER_ERROR');
    const penalty = h.last('TIME_PENALTY');
    expect(penalty.meta.pct).toBe(0.3);
    // Elapsed en el error: 300 ms → restante 11700 → removido 3510
    expect(penalty.meta.ms_removed).toBe(3510);
    expect(h.engine.timer.remainingMs()).toBeCloseTo(8190, 6);
    expect(h.last('STEP_ERROR').meta).toMatchObject({
      expected: 'HOLD_YELLOW_2000',
      observed: 'CUT_WIRE_GREEN',
      error_class: 'ORDER_ERROR',
    });
  });

  it('consecuencia de irreversibilidad (spec §8.3): el verde ya cortado no puede re-cortarse → REPEAT_ACTION → 2º error → fail', () => {
    const h = makeHarness();
    h.runTutorial();
    h.gotoLevel(3);
    h.enterExecution();
    h.advance(100);
    h.engine.action({ kind: 'SWITCH', id: 'SW_1', from: 'OFF', to: 'ON' });
    h.advance(100);
    h.engine.action({ kind: 'WIRE', id: 'WIRE_RED', op: 'CUT' });
    h.advance(100);
    h.engine.action({ kind: 'WIRE', id: 'WIRE_GREEN', op: 'CUT' }); // ORDER_ERROR (1º)
    // Completa el hold (paso 3)
    h.advance(100);
    holdFor(h.engine, h, 2000);
    expect(h.engine.state).toBe(S.EXECUTION);
    // Paso esperado: GREEN — ya CUT (irreversible); la UI deshabilita el hitbox,
    // pero si llega la acción duplicada => REPEAT_ACTION (2º error) => MAX_ERRORS
    h.advance(100);
    const res = h.engine.action({ kind: 'WIRE', id: 'WIRE_GREEN', op: 'CUT' });
    expect(res.errorClass).toBe('REPEAT_ACTION');
    expect(h.engine.state).toBe(S.LEVEL_FAIL);
    expect(h.last('LEVEL_FAIL').meta.reason).toBe('MAX_ERRORS');
  });
});

describe('bombEngine — QA-04: L4 interferencia (rojo en Tipo B)', () => {
  it('TYPE_INTERFERENCE + penalización; el nivel sigue completando (RED no está en la secuencia B)', () => {
    const h = makeHarness();
    h.runTutorial();
    h.gotoLevel(4); // 10 s
    h.enterExecution();
    h.advance(100);
    const res = h.engine.action({ kind: 'WIRE', id: 'WIRE_RED', op: 'CUT' });
    expect(res.errorClass).toBe('TYPE_INTERFERENCE');
    expect(h.last('TIME_PENALTY').meta.pct).toBe(0.3);
    expect(h.last('STEP_ERROR').meta).toMatchObject({
      expected: 'SW_3_ON',
      observed: 'CUT_WIRE_RED',
      error_class: 'TYPE_INTERFERENCE',
    });
    // El cable rojo queda cortado físicamente (irreversible), pero no bloquea la secuencia B
    expect(h.engine.components.wires.WIRE_RED).toBe('CUT');
    h.advance(100);
    h.engine.action({ kind: 'SWITCH', id: 'SW_3', from: 'OFF', to: 'ON' });
    h.advance(100);
    h.engine.action({ kind: 'WIRE', id: 'WIRE_BLUE', op: 'CUT' });
    h.advance(100);
    holdFor(h.engine, h, 2000);
    h.advance(100);
    h.engine.action({ kind: 'WIRE', id: 'WIRE_GREEN', op: 'CUT' });
    expect(h.engine.state).toBe(S.LEVEL_SUCCESS);
    expect(h.last('LEVEL_SUCCESS').meta.errors).toBe(1);
  });

  it('SW1 en Modelo B también es TYPE_INTERFERENCE (spec §12.2 "uso de SW1 en vez de SW3")', () => {
    const h = makeHarness();
    h.runTutorial();
    h.gotoLevel(4);
    h.enterExecution();
    h.advance(100);
    const res = h.engine.action({ kind: 'SWITCH', id: 'SW_1', from: 'OFF', to: 'ON' });
    expect(res.errorClass).toBe('TYPE_INTERFERENCE');
    expect(h.last('TIME_PENALTY')).toBeTruthy();
  });
});

describe('bombEngine — QA-06: timeout', () => {
  it('no completar en el tiempo → LEVEL_FAIL TIMEOUT con OMISSION de los pasos faltantes', () => {
    const h = makeHarness();
    h.runTutorial();
    h.gotoLevel(1); // 20 s
    h.enterExecution();
    h.advance(20001);
    h.engine.tick();
    expect(h.engine.state).toBe(S.LEVEL_FAIL);
    const fail = h.last('LEVEL_FAIL');
    expect(fail.meta.reason).toBe('TIMEOUT');
    expect(fail.meta.omitted_steps).toEqual(['SW_1_ON', 'CUT_RED']);
    expect(fail.meta.omission_error_class).toBe('OMISSION');
    expect(fail.meta.errors).toBe(0);
  });

  it('timeout con 1 error previo: omite solo los pasos restantes', () => {
    const h = makeHarness();
    h.runTutorial();
    h.gotoLevel(2);
    h.enterExecution();
    h.advance(100);
    h.engine.action({ kind: 'WIRE', id: 'WIRE_YELLOW', op: 'CUT' }); // WRONG_TARGET (1º error)
    h.advance(14901); // total elapsed 15001 > 15000 (límite L2)
    h.engine.tick();
    expect(h.engine.state).toBe(S.LEVEL_FAIL);
    expect(h.last('LEVEL_FAIL').meta.reason).toBe('TIMEOUT');
    expect(h.last('LEVEL_FAIL').meta.omitted_steps).toEqual(['SW_1_ON', 'CUT_RED', 'HOLD_YELLOW_2000']);
    expect(h.last('LEVEL_FAIL').meta.errors).toBe(1);
  });
});

describe('bombEngine — QA-07: 2 errores → LEVEL_FAIL MAX_ERRORS', () => {
  it('dos errores en el mismo nivel agotan max_errors=2', () => {
    const h = makeHarness();
    h.runTutorial();
    h.gotoLevel(2);
    h.enterExecution();
    h.advance(100);
    h.engine.action({ kind: 'WIRE', id: 'WIRE_YELLOW', op: 'CUT' }); // WRONG_TARGET
    expect(h.engine.errorCount).toBe(1);
    expect(h.engine.state).toBe(S.EXECUTION);
    h.advance(100);
    h.engine.action({ kind: 'WIRE', id: 'WIRE_GREEN', op: 'CUT' }); // ORDER_ERROR (2º)
    expect(h.engine.state).toBe(S.LEVEL_FAIL);
    const fail = h.last('LEVEL_FAIL');
    expect(fail.meta.reason).toBe('MAX_ERRORS');
    expect(fail.meta.errors).toBe(2);
  });

  it('el conteo de errores es por nivel: se reinicia en el siguiente (spec §8.2 error_count)', () => {
    const h = makeHarness();
    h.runTutorial();
    h.gotoLevel(2);
    h.enterExecution();
    h.advance(100);
    h.engine.action({ kind: 'WIRE', id: 'WIRE_YELLOW', op: 'CUT' }); // 1 error
    // completa el nivel pese al error
    h.advance(100);
    h.engine.action({ kind: 'SWITCH', id: 'SW_1', from: 'OFF', to: 'ON' });
    h.advance(100);
    h.engine.action({ kind: 'WIRE', id: 'WIRE_RED', op: 'CUT' });
    h.advance(100);
    holdFor(h.engine, h, 2000);
    expect(h.engine.state).toBe(S.LEVEL_SUCCESS);
    h.engine.acknowledgeResult();
    h.engine.continueFromResult();
    expect(h.engine.levelKey).toBe(3);
    expect(h.engine.errorCount).toBe(0); // reiniciado
  });
});

describe('bombEngine — QA-08: input durante delay/lock', () => {
  it('click durante blind delay: ignorado + INPUT_DURING_LOCK, sin penalización ni conteo', () => {
    const h = makeHarness();
    h.runTutorial();
    h.gotoLevel(2);
    h.engine.startLevelExecution();
    h.advance(3001);
    h.engine.tick();
    expect(h.engine.state).toBe(S.BLIND_DELAY);
    const res = h.engine.action({ kind: 'WIRE', id: 'WIRE_RED', op: 'CUT' });
    expect(res).toMatchObject({ accepted: false, reason: 'INPUT_DURING_LOCK' });
    expect(h.engine.state).toBe(S.BLIND_DELAY);
    expect(h.engine.errorCount).toBe(0);
    expect(h.engine.components.wires.WIRE_RED).toBe('INTACT'); // ignorado físicamente
    expect(h.find('TIME_PENALTY')).toHaveLength(0);
    expect(h.last('STEP_ERROR').meta).toMatchObject({ error_class: 'INPUT_DURING_LOCK', penalizes: false });
    expect(h.engine.integrity.inputDuringLockCount).toBe(1);
  });

  it('input durante INSTRUCTION_ENCODING también se bloquea (panel bloqueado, spec §4)', () => {
    const h = makeHarness();
    h.runTutorial();
    h.gotoLevel(1);
    h.engine.startLevelExecution();
    expect(h.engine.state).toBe(S.INSTRUCTION_ENCODING);
    const res = h.engine.action({ kind: 'SWITCH', id: 'SW_1', from: 'OFF', to: 'ON' });
    expect(res.reason).toBe('INPUT_DURING_LOCK');
    expect(h.engine.components.switches.SW_1).toBe('OFF');
  });

  it('botón presionado antes de ejecución: no hereda hold (Doc 2 §19)', () => {
    const h = makeHarness();
    h.runTutorial();
    h.gotoLevel(2);
    h.engine.startLevelExecution();
    h.advance(3001);
    h.engine.tick(); // BLIND_DELAY
    const res = h.engine.action({ kind: 'BUTTON', id: 'BTN_YELLOW', phase: 'DOWN' });
    expect(res.reason).toBe('INPUT_DURING_LOCK');
    // al entrar en ejecución, el UP no cuenta como hold en curso
    h.advance(2001);
    h.engine.tick();
    expect(h.engine.state).toBe(S.EXECUTION);
    const up = h.engine.action({ kind: 'BUTTON', id: 'BTN_YELLOW', phase: 'UP' });
    expect(up.reason).toBe('NO_HOLD_IN_FLIGHT');
  });
});

describe('bombEngine — tolerancias hold (spec §8.3, QA-02)', () => {
  /** L2 o L3 con SW1+RED ya ejecutados: el hold (HOLD_YELLOW_2000) es el paso esperado. */
  function atHoldStep(level) {
    const h = makeHarness();
    h.runTutorial();
    h.gotoLevel(level);
    h.enterExecution();
    h.advance(100);
    h.engine.action({ kind: 'SWITCH', id: 'SW_1', from: 'OFF', to: 'ON' });
    h.advance(100);
    h.engine.action({ kind: 'WIRE', id: 'WIRE_RED', op: 'CUT' });
    return h;
  }

  it('2000 ms (L2, último paso): SUCCESS y se registra la duración exacta (spec §8.3)', () => {
    const h = atHoldStep(2);
    h.advance(100);
    holdFor(h.engine, h, 2000);
    expect(h.engine.state).toBe(S.LEVEL_SUCCESS);
    const stepSuccess = h.find('STEP_SUCCESS').at(-1);
    expect(stepSuccess.meta).toMatchObject({ step_id: 'HOLD_YELLOW_2000', hold_ms: 2000, serial_pos: 3 });
  });

  it('1800 ms y 2400 ms (L3): bordes de la ventana 1800-2400, aceptados', () => {
    const h = atHoldStep(3);
    h.advance(100);
    const res = holdFor(h.engine, h, 1800);
    expect(res.reason).toBe('STEP_SUCCESS');
    const h2 = atHoldStep(3);
    h2.advance(100);
    const res2 = holdFor(h2.engine, h2, 2400);
    expect(res2.reason).toBe('STEP_SUCCESS');
  });

  it('1799 ms (L2): HOLD_TOO_SHORT + penalización; reintento 2000 → SUCCESS', () => {
    const h = atHoldStep(2);
    h.advance(100);
    const res = holdFor(h.engine, h, 1799);
    expect(res.errorClass).toBe('HOLD_TOO_SHORT');
    expect(h.last('STEP_ERROR').meta.hold_ms).toBe(1799);
    expect(h.last('TIME_PENALTY').meta.pct).toBe(0.3);
    expect(h.engine.state).toBe(S.EXECUTION);
    // reintento válido
    h.advance(100);
    holdFor(h.engine, h, 2000);
    expect(h.engine.state).toBe(S.LEVEL_SUCCESS);
    expect(h.last('LEVEL_SUCCESS').meta.errors).toBe(1);
  });

  it('2401 ms (L2): HOLD_TOO_LONG + penalización; reintento 2000 → SUCCESS', () => {
    const h = atHoldStep(2);
    h.advance(100);
    const res = holdFor(h.engine, h, 2401);
    expect(res.errorClass).toBe('HOLD_TOO_LONG');
    expect(h.last('STEP_ERROR').meta.hold_ms).toBe(2401);
    expect(h.find('TIME_PENALTY')).toHaveLength(1);
    // reintento correcto
    h.advance(100);
    holdFor(h.engine, h, 2000);
    expect(h.engine.state).toBe(S.LEVEL_SUCCESS);
  });

  it('hold como ORDER_ERROR: botón antes de su posición en la secuencia (L1 no tiene hold)', () => {
    const h = makeHarness();
    h.runTutorial();
    h.gotoLevel(1);
    h.enterExecution();
    h.advance(100);
    const res = holdFor(h.engine, h, 2000);
    expect(res.errorClass).toBe('WRONG_TARGET'); // L1: el hold no existe en su secuencia
  });

  it('hold en posición posterior (L3 esperado SW1, hace hold) → ORDER_ERROR', () => {
    const h = makeHarness();
    h.runTutorial();
    h.gotoLevel(3);
    h.enterExecution();
    h.advance(100);
    const res = holdFor(h.engine, h, 2000);
    expect(res.errorClass).toBe('ORDER_ERROR');
  });
});

describe('bombEngine — penalización 30% del tiempo restante (baseline v1.1)', () => {
  it('penaliza sobre el restante ACTUAL (no sobre el límite)', () => {
    const h = makeHarness();
    h.runTutorial();
    h.gotoLevel(1); // 20 s
    h.enterExecution();
    h.advance(10000); // restante 10000
    h.engine.action({ kind: 'WIRE', id: 'WIRE_YELLOW', op: 'CUT' });
    expect(h.last('TIME_PENALTY').meta.ms_removed).toBe(3000);
    expect(h.engine.timer.remainingMs()).toBeCloseTo(7000, 3);
  });

  it('penalización que agota el tiempo => clamp 0 + LEVEL_FAIL inmediato (Doc 2 §19)', () => {
    const manifest = {
      ...BOMB_RULE_MANIFEST,
      penalty: { ...BOMB_RULE_MANIFEST.penalty, errorTimePenaltyPct: 1.0 },
    };
    const h = makeHarness(1, manifest);
    h.runTutorial();
    h.gotoLevel(1);
    h.enterExecution();
    h.advance(19900); // restante 100 ms
    h.engine.action({ kind: 'WIRE', id: 'WIRE_YELLOW', op: 'CUT' });
    expect(h.engine.state).toBe(S.LEVEL_FAIL);
    expect(h.last('LEVEL_FAIL').meta.reason).toBe('TIMEOUT');
    expect(h.last('TIME_PENALTY').meta.ms_removed).toBe(100);
  });
});

describe('bombEngine — irreversibilidad y repeat (spec §8.3)', () => {
  it('cable ya cortado (paso resuelto): re-corte => REPEAT_ACTION', () => {
    const h = makeHarness();
    h.runTutorial();
    h.gotoLevel(3);
    h.enterExecution();
    h.advance(100);
    h.engine.action({ kind: 'WIRE', id: 'WIRE_RED', op: 'CUT' }); // ORDER_ERROR (consumido)
    h.engine.action({ kind: 'WIRE', id: 'WIRE_RED', op: 'CUT' }); // REPEAT (2º error)
    expect(h.last('STEP_ERROR').meta.error_class).toBe('REPEAT_ACTION');
    expect(h.engine.state).toBe(S.LEVEL_FAIL);
  });

  it('switch resuelto: edge OFF => REPEAT_ACTION (política explícita §8.3)', () => {
    const h = makeHarness();
    h.runTutorial();
    h.gotoLevel(2);
    h.enterExecution();
    h.advance(100);
    h.engine.action({ kind: 'SWITCH', id: 'SW_1', from: 'OFF', to: 'ON' }); // EXACT
    h.advance(100);
    const res = h.engine.action({ kind: 'SWITCH', id: 'SW_1', from: 'ON', to: 'OFF' });
    expect(res.errorClass).toBe('REPEAT_ACTION');
    expect(h.last('TIME_PENALTY')).toBeTruthy();
  });

  it('botón ya usado (paso resuelto): segundo hold => REPEAT_ACTION', () => {
    const h = makeHarness();
    h.runTutorial();
    h.gotoLevel(3);
    h.enterExecution();
    h.advance(100);
    h.engine.action({ kind: 'SWITCH', id: 'SW_1', from: 'OFF', to: 'ON' });
    h.advance(100);
    h.engine.action({ kind: 'WIRE', id: 'WIRE_RED', op: 'CUT' });
    h.advance(100);
    holdFor(h.engine, h, 2000); // EXACT
    h.advance(100);
    const res = holdFor(h.engine, h, 2000);
    expect(res.errorClass).toBe('REPEAT_ACTION');
  });
});

describe('bombEngine — WRONG_TARGET y clasificación', () => {
  it('componente que no existe en ninguna secuencia (cable amarillo en L1) → WRONG_TARGET', () => {
    const h = makeHarness();
    h.runTutorial();
    h.gotoLevel(1);
    h.enterExecution();
    h.advance(100);
    const res = h.engine.action({ kind: 'WIRE', id: 'WIRE_YELLOW', op: 'CUT' });
    expect(res.errorClass).toBe('WRONG_TARGET');
    expect(h.last('STEP_ERROR').meta).toMatchObject({
      expected: 'SW_1_ON',
      observed: 'CUT_WIRE_YELLOW',
      error_class: 'WRONG_TARGET',
    });
  });

  it('switch OFF nunca es acción canónica (solo se valida flanco OFF→ON, §8.3)', () => {
    const h = makeHarness();
    h.runTutorial();
    h.gotoLevel(1);
    h.enterExecution();
    h.advance(100);
    const res = h.engine.action({ kind: 'SWITCH', id: 'SW_1', from: 'ON', to: 'OFF' });
    expect(res.errorClass).toBe('WRONG_TARGET'); // no resuelto, no es interferencia, no es ORDER
  });
});

describe('bombEngine — timeout durante hold en curso (Doc 2 §19)', () => {
  it('el reloj lógico manda: fail TIMEOUT cancela el hold sin heredarlo', () => {
    const h = makeHarness();
    h.runTutorial();
    h.gotoLevel(1);
    h.enterExecution();
    h.advance(100);
    h.engine.buttonAction('BTN_YELLOW', 'DOWN');
    h.advance(20000);
    h.engine.tick();
    expect(h.engine.state).toBe(S.LEVEL_FAIL);
    expect(h.last('LEVEL_FAIL').meta.reason).toBe('TIMEOUT');
    expect(h.engine.hold.downAt).toBeNull();
    expect(h.engine.components.buttons.BTN_YELLOW).toBe('PRESSED'); // estado físico lo resuelve la UI
    // UP posterior: no hay hold en curso
    h.engine.acknowledgeResult();
    const up = h.engine.action({ kind: 'BUTTON', id: 'BTN_YELLOW', phase: 'UP' });
    expect(up.reason).toBe('INPUT_DURING_LOCK');
  });
});

describe('bombEngine — determinismo (spec §15: mismo seed + config => misma forma/seq)', () => {
  it('dos sesiones con el mismo seed generan LEVEL_START e secuencias idénticas', () => {
    const a = makeHarness(7);
    const b = makeHarness(7);
    a.runTutorial(); a.gotoLevel(4);
    b.runTutorial(); b.gotoLevel(4);
    expect(a.last('LEVEL_START').meta).toEqual(b.last('LEVEL_START').meta);
    expect(a.engine.effectiveSequence.map((s) => s.stepId))
      .toEqual(b.engine.effectiveSequence.map((s) => s.stepId));
  });
});

describe('bombEngine — integridad (spec §14, QA-09/10)', () => {
  it('blur: FOCUS_CHANGE registrado con blur_count y total_blur_ms (QA-09)', () => {
    const h = makeHarness();
    h.runTutorial();
    h.gotoLevel(1);
    h.enterExecution();
    h.engine.focusChange(false);
    h.advance(800);
    h.engine.focusChange(true);
    expect(h.engine.integrity.blurCount).toBe(1);
    expect(h.engine.integrity.totalBlurMs).toBe(800);
    expect(h.find('FOCUS_CHANGE')).toHaveLength(2);
    // el timer de ejecución NO se pausa (política v1: la presión temporal es parte de la tarea)
    expect(h.engine.timer.isRunning()).toBe(true);
  });

  it('abort técnico: sesión marcada incompleta, sin conteo de errores (QA-10)', () => {
    const h = makeHarness();
    h.runTutorial();
    h.gotoLevel(2);
    h.enterExecution();
    h.engine.recordTechnicalAbort('page_reload');
    expect(h.engine.sessionIncomplete).toBe(true);
    expect(h.engine.integrity.technicalAbortCount).toBe(1);
    expect(h.engine.errorCount).toBe(0);
    expect(h.last('TECHNICAL_ABORT').meta.reason).toBe('page_reload');
  });

  it('misclick proximal: se registra para analítica pero nunca penaliza (spec §13)', () => {
    const h = makeHarness();
    h.runTutorial();
    h.gotoLevel(1);
    h.enterExecution();
    h.engine.recordMisclick('WIRE_RED');
    expect(h.engine.integrity.misclickCount).toBe(1);
    expect(h.last('MISCLICK_PROXIMAL').meta).toMatchObject({
      component_id: 'WIRE_RED',
      error_class: 'MISCLICK_PROXIMAL',
      penalizes: false,
    });
    expect(h.find('TIME_PENALTY')).toHaveLength(0);
  });
});

describe('classifyAction — unidades del validator puro', () => {
  const holdWindow = [1800, 2400];
  function ctxFor(effectiveSequence, stepIndex, { typeB = false, consumed = null } = {}) {
    return {
      effectiveSequence,
      stepIndex,
      holdWindow,
      typeAOnly: typeB
        ? [
            { kind: 'SWITCH', id: 'SW_1', op: null, to: 'ON' },
            { kind: 'WIRE', id: 'WIRE_RED', op: 'CUT', to: null },
          ]
        : null,
      consumed,
    };
  }

  it('EXACT_MATCH por tipo de acción', () => {
    const seq = [
      { stepId: 'SW_1_ON', kind: 'SWITCH', id: 'SW_1', to: 'ON', op: null },
      { stepId: 'CUT_RED', kind: 'WIRE', id: 'WIRE_RED', op: 'CUT', to: null },
      { stepId: 'HOLD_YELLOW_2000', kind: 'BUTTON', id: 'BTN_YELLOW', op: 'HOLD', to: null },
    ];
    const ctx = ctxFor(seq, 0);
    expect(classifyAction(normalizeObservedAction({ kind: 'SWITCH', id: 'SW_1', to: 'ON' }), ctx).match).toBe('EXACT_MATCH');
    const ctx1 = ctxFor(seq, 1);
    expect(classifyAction(normalizeObservedAction({ kind: 'WIRE', id: 'WIRE_RED', op: 'CUT' }), ctx1).match).toBe('EXACT_MATCH');
    const ctx2 = ctxFor(seq, 2);
    expect(classifyAction({ kind: 'BUTTON', id: 'BTN_YELLOW', op: 'HOLD', holdMs: 2100 }, ctx2).match).toBe('EXACT_MATCH');
  });

  it('ORDER_ERROR: paso válido en posición posterior', () => {
    const seq = [
      { stepId: 'SW_1_ON', kind: 'SWITCH', id: 'SW_1', to: 'ON', op: null },
      { stepId: 'CUT_RED', kind: 'WIRE', id: 'WIRE_RED', op: 'CUT', to: null },
      { stepId: 'HOLD_YELLOW_2000', kind: 'BUTTON', id: 'BTN_YELLOW', op: 'HOLD', to: null },
      { stepId: 'CUT_GREEN', kind: 'WIRE', id: 'WIRE_GREEN', op: 'CUT', to: null },
    ];
    const ctx = ctxFor(seq, 2); // esperado HOLD
    const r = classifyAction(normalizeObservedAction({ kind: 'WIRE', id: 'WIRE_GREEN', op: 'CUT' }), ctx);
    expect(r).toMatchObject({ errorClass: 'ORDER_ERROR', stepPosition: 3 });
  });

  it('TYPE_INTERFERENCE: solo en Tipo B y solo acciones exclusivas Tipo A', () => {
    const seq = [
      { stepId: 'SW_3_ON', kind: 'SWITCH', id: 'SW_3', to: 'ON', op: null },
      { stepId: 'CUT_BLUE', kind: 'WIRE', id: 'WIRE_BLUE', op: 'CUT', to: null },
    ];
    const ctx = ctxFor(seq, 0, { typeB: true });
    expect(classifyAction(normalizeObservedAction({ kind: 'WIRE', id: 'WIRE_RED', op: 'CUT' }), ctx).errorClass)
      .toBe('TYPE_INTERFERENCE');
    expect(classifyAction(normalizeObservedAction({ kind: 'SWITCH', id: 'SW_1', to: 'ON' }), ctx).errorClass)
      .toBe('TYPE_INTERFERENCE');
    // verde no es interferencia (regla idéntica en ambos tipos)
    const r = classifyAction(normalizeObservedAction({ kind: 'WIRE', id: 'WIRE_GREEN', op: 'CUT' }), ctx);
    expect(r.errorClass).toBe('WRONG_TARGET');
  });

  it('HOLD_TOO_SHORT / HOLD_TOO_LONG: solo cuando el hold ES el paso esperado', () => {
    const seq = [{ stepId: 'HOLD_YELLOW_2000', kind: 'BUTTON', id: 'BTN_YELLOW', op: 'HOLD', to: null }];
    const ctx = ctxFor(seq, 0);
    expect(classifyAction({ kind: 'BUTTON', id: 'BTN_YELLOW', op: 'HOLD', holdMs: 1700 }, ctx).errorClass).toBe('HOLD_TOO_SHORT');
    expect(classifyAction({ kind: 'BUTTON', id: 'BTN_YELLOW', op: 'HOLD', holdMs: 2600 }, ctx).errorClass).toBe('HOLD_TOO_LONG');
  });
});
