// bombEngineB5.test.js — EXP-BOMB-001 · B5: Telemetry Logger del motor (Doc 1
// §11/§14/§19, DoD §16.2): timestamps relativos al inicio de nivel + level_id en
// eventos críticos, drift reloj lógico/eventos, signals de integridad (fps,
// viewport, input device), levelRecords (métricas §12) y eventBuffer.
//
// Clocks inyectados (reloj falso, riesgo #2 del plan EXP-7): `now` (timer) y
// `eventNow` (eventos) — pueden divergir para verificar event_clock_drift_ms.

import { describe, expect, it } from 'vitest';
import { BOMB_STATES, createBombEngine } from './bombEngine.js';

function makeClock(start = 0) {
  let t = start;
  return {
    now: () => t,
    advance: (ms) => { t += Math.max(0, ms); },
  };
}

function makeEngine({ seed = 42, sessionId = 'b5-test', eventNowOffset = 0 } = {}) {
  const clock = makeClock();
  const events = [];
  const engine = createBombEngine({
    now: clock.now,
    eventNow: () => clock.now() + eventNowOffset,
    log: (event, meta) => events.push({ event, meta: { ...meta } }),
    seed,
    sessionId,
  });
  const find = (name) => events.filter((e) => e.event === name);
  const last = (name) => find(name).at(-1) ?? null;
  return { engine, clock, advance: clock.advance, events, find, last };
}

/** Tutorial guiado T1-T5 completo (guion determinista, mismo que bombTelemetry). */
function playTutorial(h) {
  const { engine: e, advance } = h;
  e.beginSession();
  advance(400);
  e.startTutorial();
  advance(500);
  e.action({ kind: 'SWITCH', id: 'SW_1', from: 'OFF', to: 'ON' });
  advance(400);
  e.action({ kind: 'WIRE', id: 'WIRE_RED', op: 'CUT' });
  advance(400);
  e.buttonAction('BTN_YELLOW', 'DOWN');
  advance(2000);
  e.buttonAction('BTN_YELLOW', 'UP');
  advance(600);
  e.action({ kind: 'SWITCH', id: 'SW_1', from: 'OFF', to: 'ON' });
  advance(500);
  e.action({ kind: 'WIRE', id: 'WIRE_RED', op: 'CUT' });
  advance(500);
  e.buttonAction('BTN_YELLOW', 'DOWN');
  advance(2000);
  e.buttonAction('BTN_YELLOW', 'UP');
  advance(3000);
  e.tick();
  advance(1500);
  e.tick();
  advance(700);
  e.action({ kind: 'SWITCH', id: 'SW_1', from: 'OFF', to: 'ON' });
  advance(600);
  e.action({ kind: 'WIRE', id: 'WIRE_RED', op: 'CUT' });
  advance(600);
  e.buttonAction('BTN_YELLOW', 'DOWN');
  advance(2000);
  e.buttonAction('BTN_YELLOW', 'UP');
  e.tutorialComplete();
  advance(800);
  e.continueFromResult();
}

/** L1 (SW1 → RED, encoding libre, sin delay) hasta LEVEL_SUCCESS. */
function playLevel1(h) {
  const { engine: e, advance } = h;
  expect(e.state).toBe(BOMB_STATES.LEVEL_INTRO);
  e.startLevelExecution();
  advance(1200);
  e.continueEncoding();
  advance(900);
  e.action({ kind: 'SWITCH', id: 'SW_1', from: 'OFF', to: 'ON' });
  advance(900);
  e.action({ kind: 'WIRE', id: 'WIRE_RED', op: 'CUT' });
  expect(e.state).toBe(BOMB_STATES.LEVEL_SUCCESS);
}

describe('B5 — timestamps nivel-relativos + level_id (spec §1, DoD §16.2)', () => {
  it('t_ms del buffer es relativo al inicio de cada nivel: SESSION_START=0, cada LEVEL_START=0', () => {
    const h = makeEngine();
    playTutorial(h);
    playLevel1(h);
    const buffer = h.engine.eventBuffer;
    expect(buffer[0].event).toBe('SESSION_START');
    expect(buffer[0].t_ms).toBe(0);
    for (const rec of buffer) {
      expect(typeof rec.t_ms).toBe('number');
      expect(rec.t_ms).toBeGreaterThanOrEqual(0);
      if (rec.event === 'LEVEL_START') expect(rec.t_ms).toBe(0);
      // coherencia: t_ms del buffer == level_t_ms del meta (null antes del 1er nivel)
      expect(rec.t_ms).toBe(rec.meta.level_t_ms ?? 0);
    }
    // L1: ejecución arranca tras encoding libre (t_ms 1200), no 0
    const l1Exec = h.find('EXECUTION_START').at(-1);
    expect(l1Exec.meta.level_t_ms).toBe(1200);
  });

  it('todos los eventos del collector llevan level_id (0=tutorial, 1-4=evaluados; null solo SESSION_START)', () => {
    const h = makeEngine();
    playTutorial(h);
    playLevel1(h);
    for (const evt of h.events) {
      if (evt.event === 'SESSION_START') {
        expect(evt.meta.level_id).toBeNull();
      } else {
        expect(evt.meta.level_id).not.toBeNull();
        expect(evt.meta.level_id).toBeDefined();
      }
    }
    expect(h.last('ACTION_SWITCH').meta.level_id).toBe(1);
    expect(h.last('LEVEL_START').meta.level_id).toBe(1);
    expect(h.last('LEVEL_START').meta.session_offset_ms).toBeGreaterThan(0);
  });

  it('session_offset_ms: no decreciente a través de niveles (línea global de sesión)', () => {
    const h = makeEngine();
    playTutorial(h);
    playLevel1(h);
    const offsets = h.find('LEVEL_START').map((e) => e.meta.session_offset_ms);
    expect(offsets.length).toBe(4); // tutorial inicio + segmentos S2/S3 + L1
    for (let i = 1; i < offsets.length; i += 1) {
      expect(offsets[i]).toBeGreaterThan(offsets[i - 1]);
    }
  });

  it('event_clock_drift_ms: desfase máximo reloj lógico vs reloj de eventos (spec §14.1)', () => {
    const h = makeEngine({ eventNowOffset: 50 });
    h.engine.beginSession();
    expect(h.engine.integrity.eventClockDriftMs).toBe(50);
    h.advance(1000);
    h.engine.startTutorial();
    expect(h.engine.integrity.eventClockDriftMs).toBe(50); // constante (mismo offset)
  });
});

describe('B5 — signals de integridad del host (spec §14.1, Doc 2 §18)', () => {
  it('fps: drops < 30 FPS, min_fps; muestras inválidas rechazadas', () => {
    const h = makeEngine();
    h.engine.recordFpsSample(24);
    h.engine.recordFpsSample(28);
    h.engine.recordFpsSample(60);
    expect(h.engine.integrity.fpsDropCount).toBe(2);
    expect(h.engine.integrity.minFps).toBe(24);
    expect(h.engine.recordFpsSample(Number.NaN)).toEqual({ ok: false, reason: 'INVALID_FPS' });
    expect(h.engine.recordFpsSample(-5)).toEqual({ ok: false, reason: 'INVALID_FPS' });
    expect(h.engine.integrity.fpsDropCount).toBe(2);
  });

  it('viewport: inicial preservado + resizes contados; inválido rechazado', () => {
    const h = makeEngine();
    h.engine.recordViewport({ width: 1280, height: 720, dpr: 1.5 });
    h.engine.recordViewport({ width: 1000, height: 800 });
    h.engine.recordViewport({ width: 900, height: 700 });
    expect(h.engine.integrity.viewport).toEqual({ width: 1280, height: 720 });
    expect(h.engine.integrity.devicePixelRatio).toBe(1.5);
    expect(h.engine.integrity.viewportResizeCount).toBe(2);
    expect(h.engine.recordViewport({ width: 0, height: 800 })).toEqual({ ok: false, reason: 'INVALID_VIEWPORT' });
  });

  it('input device: el PRIMER dispositivo gana; tipos inválidos rechazados', () => {
    const h = makeEngine();
    expect(h.engine.recordInputDevice('laser')).toEqual({ ok: false, reason: 'UNKNOWN_DEVICE' });
    expect(h.engine.recordInputDevice('TOUCH')).toEqual({ ok: true });
    expect(h.engine.recordInputDevice('mouse')).toEqual({ ok: true });
    expect(h.engine.integrity.inputDeviceType).toBe('touch');
  });

  it('session_resume_count = 0 (nunca se reanuda, Doc 2 §13.2) + bio_tracking_loss_ms = 0 (biometría off)', () => {
    const h = makeEngine();
    h.engine.beginSession();
    expect(h.engine.integrity.sessionResumeCount).toBe(0);
    expect(h.engine.integrity.bioTrackingLossMs).toBe(0);
    const summary = h.engine.sessionSummary();
    expect(summary.sessionResumeCount).toBe(0);
    expect(summary.bioTrackingLossMs).toBe(0);
    expect(summary.inputDeviceType).toBeNull();
    expect(summary.minFps).toBeNull();
    expect(summary.viewportWidth).toBeNull();
  });

  it('sessionSummary B5: campos planos de integridad + analítica de diseño', () => {
    const h = makeEngine();
    h.engine.recordViewport({ width: 1280, height: 720, dpr: 1 });
    h.engine.recordInputDevice('mouse');
    h.engine.recordFpsSample(60);
    h.engine.focusChange(false);
    h.advance(1000);
    h.engine.focusChange(true);
    playTutorial(h);
    playLevel1(h);
    const summary = h.engine.sessionSummary();
    expect(summary.blurEvents).toBe(1);
    expect(summary.totalBlurMs).toBe(1000);
    expect(summary.fpsDropCount).toBe(0);
    expect(summary.minFps).toBe(60);
    expect(summary.inputDeviceType).toBe('mouse');
    expect(summary.viewportWidth).toBe(1280);
    expect(summary.viewportHeight).toBe(720);
    expect(summary.devicePixelRatio).toBe(1);
    expect(summary.eventClockDriftMs).toBe(0);
    expect(summary.unexpectedStateTransitionCount).toBe(0);
    expect(summary.tutorial_replay_count).toBe(0);
  });
});

describe('B5 — levelRecords + eventBuffer (base de métricas §12)', () => {
  it('levelRecords: un record por runtime de nivel; L1 evaluado con datos de métricas', () => {
    const h = makeEngine();
    playTutorial(h);
    playLevel1(h);
    const records = h.engine.levelRecords;
    expect(records.length).toBe(4); // tutorial S1 + S2 + S3 + L1
    expect(records.filter((r) => r.evaluated).map((r) => r.level)).toEqual([1]);
    const l1 = records.at(-1);
    expect(l1.bombType).toBe('A');
    expect(l1.sequenceIds).toEqual(['A1', 'A2']);
    expect(l1.effectiveStepIds).toEqual(['SW_1_ON', 'CUT_RED']);
    expect(l1.delayMs).toBe(0);
    expect(l1.executionStartMs).toBe(1200);
    expect(l1.endedMs).toBe(3000);
    expect(l1.result).toBe('success');
    expect(l1.errors).toBe(0);
    expect(l1.stepsCompleted).toBe(2);
    expect(l1.firstActionMs).toBe(2100);
    expect(l1.validActionMs).toEqual([2100, 3000]);
    expect(l1.sessionOffsetMs).toBeGreaterThan(0);
  });

  it('eventBuffer: mismo contenido que el collector + tope 400 (los más antiguos se descartan)', () => {
    const h = makeEngine();
    playTutorial(h);
    playLevel1(h);
    expect(h.engine.eventBuffer.length).toBe(h.events.length);
    expect(h.engine.eventBuffer).toEqual(h.events.map((e) => ({ t_ms: e.meta.level_t_ms ?? 0, event: e.event, meta: e.meta })));
    for (let i = 0; i < 500; i += 1) h.engine.recordMisclick('panel_bg');
    expect(h.engine.eventBuffer.length).toBe(400);
    expect(h.engine.eventBuffer.at(-1).event).toBe('MISCLICK_PROXIMAL');
  });
});
