// bombTelemetry.test.js — EXP-BOMB-001 · B5: telemetría de sesión.
//
// Spec (ley) Doc 1: §11 (diccionario de eventos), §12 (métricas derivadas),
// §14.1 (flags de integridad), §16.2 (DoD: timestamps + level_id; sesión
// reconstruible desde raw events), §19 (esquema JSON del payload de sesión).
// Doc 2: §18 (analítica de diseño). Plan EXP-7 §3 (biometría off por defecto;
// agregados al reporte; raw events por sesión para auditoría).
//
// Estrategia: la sesión de referencia es una ejecución REAL del motor headless
// (generateBombSyntheticSessionPayload: reloj falso + guion determinista, L4 con
// un error TYPE_INTERFERENCE — QA-04). Sobre ella se prueban payload, métricas,
// integridad y reconstrucción; los casos límite de métricas usan records
// construidos a mano (fórmulas aisladas).

import { describe, expect, it } from 'vitest';
import {
  BOMB_BLOCK_AGGREGATE_SCHEMA,
  BOMB_SESSION_PAYLOAD_VERSION,
  bombSessionDurationMs,
  buildBombBlockSummary,
  buildBombIntegrityFlags,
  computeBombBehavioralMetrics,
  generateBombSyntheticSessionPayload,
  groupBombEventsByLevel,
  reconstructBombSession,
  verifyBombSessionPayload,
} from './bombTelemetry.js';
import {
  BOMB_BEHAVIORAL_METRIC_KEYS,
  BOMB_CRITICAL_EVENTS,
  BOMB_EVENT_NAMES,
  BOMB_RULE_MANIFEST,
} from './bombRules.js';

function makeRecord(overrides = {}) {
  return {
    levelKey: String(overrides.level ?? 1),
    level: overrides.level ?? 1,
    bombType: overrides.bombType ?? 'A',
    sequenceIds: overrides.sequenceIds ?? ['A1', 'A2'],
    effectiveStepIds: overrides.effectiveStepIds ?? ['SW_1_ON', 'CUT_RED'],
    timeLimitMs: overrides.timeLimitMs ?? 20000,
    delayMs: overrides.delayMs ?? 0,
    exposureMs: overrides.exposureMs ?? null,
    evaluated: overrides.evaluated ?? true,
    sessionOffsetMs: overrides.sessionOffsetMs ?? 0,
    executionStartMs: overrides.executionStartMs ?? null,
    endedMs: overrides.endedMs ?? null,
    result: overrides.result ?? null,
    failReason: overrides.failReason ?? null,
    errors: overrides.errors ?? 0,
    stepsCompleted: overrides.stepsCompleted ?? 0,
    firstActionMs: overrides.firstActionMs ?? null,
    validActionMs: overrides.validActionMs ?? [],
    penalizedErrorMs: overrides.penalizedErrorMs ?? [],
    holdMsSamples: overrides.holdMsSamples ?? [],
  };
}

describe('B5 — payload de sesión (Doc 1 §19)', () => {
  const payload = generateBombSyntheticSessionPayload({ seed: 42 });

  it('tiene el top-level EXACTO del esquema §19 + marcadores documentados (seed, versión)', () => {
    expect(Object.keys(payload).sort()).toEqual([
      'build_version', 'config_version', 'exp_id', 'integrity_flags', 'level_summary',
      'raw_series', 'seed', 'session_id', 'session_payload_version', 'telemetry',
      'timestamp_utc',
    ]);
    expect(payload.exp_id).toBe('EXP-BOMB-001');
    expect(payload.build_version).toBe(BOMB_RULE_MANIFEST.buildVersion);
    expect(payload.config_version).toBe(BOMB_RULE_MANIFEST.configVersion);
    expect(payload.session_id).toBe('synthetic-bomb-fixture');
    expect(payload.timestamp_utc).toBe('2026-09-08T12:00:00.000Z');
    expect(payload.seed).toBe(42);
    expect(payload.session_payload_version).toBe(BOMB_SESSION_PAYLOAD_VERSION);
  });

  it('level_summary: solo niveles evaluados (1-4), claves exactas §19, L4 = Modelo B', () => {
    expect(payload.level_summary.map((e) => e.level)).toEqual([1, 2, 3, 4]);
    for (const entry of payload.level_summary) {
      expect(Object.keys(entry).sort()).toEqual([
        'bomb_type', 'delay_duration_ms', 'effective_sequence', 'errors',
        'level', 'result', 'sequence_ids', 'time_limit_s',
      ]);
      expect(['success', 'fail', 'incomplete']).toContain(entry.result);
    }
    const l4 = payload.level_summary[3];
    expect(l4.bomb_type).toBe('B');
    expect(l4.sequence_ids).toEqual(['A1', 'A2', 'B1', 'C1']);
    expect(l4.effective_sequence).toEqual(['SW_3_ON', 'CUT_BLUE', 'HOLD_YELLOW_2000', 'CUT_GREEN']);
    expect(l4.time_limit_s).toBe(10);
    expect(l4.delay_duration_ms).toBe(3000);
    expect(l4.errors).toBe(1); // TYPE_INTERFERENCE real (corta ROJO primero, QA-04)
    expect(l4.result).toBe('success');
    expect(payload.level_summary[0].result).toBe('success');
  });

  it('telemetry: las 10 métricas §12 presentes; biometría OFF por defecto (plan §3)', () => {
    expect(Object.keys(payload.telemetry.behavioral_metrics).sort())
      .toEqual([...BOMB_BEHAVIORAL_METRIC_KEYS].sort());
    expect(payload.telemetry.biometric_metrics).toEqual({ enabled: false });
  });

  it('integrity_flags §14.1: viewport/dpr/dispositivo/fps/drift + analítica Doc 2 §18', () => {
    const flags = payload.integrity_flags;
    expect(flags.viewport_size).toEqual({ width: 1280, height: 720 });
    expect(flags.device_pixel_ratio).toBe(1);
    expect(flags.input_device_type).toBe('mouse');
    expect(flags.min_fps).toBe(60);
    expect(flags.fps_drop_count).toBe(0);
    expect(flags.event_clock_drift_ms).toBe(0); // en el guion both clocks = mismo reloj
    expect(flags.bio_tracking_loss_ms).toBe(0);
    expect(flags.session_resume_count).toBe(0); // nunca se reanuda (Doc 2 §13.2)
    expect(flags.blur_events).toBe(0);
    expect(flags.total_blur_ms).toBe(0);
    expect(flags.unexpected_state_transition_count).toBe(0);
    expect(flags.tutorial_replay_count).toBe(0);
    expect(flags.session_incomplete).toBe(false);
  });

  it('raw_series: eventos §11 con t_ms nivel-relativo (LEVEL_START = 0) + level_id (DoD §16.2)', () => {
    const events = payload.raw_series.events;
    expect(events.length).toBeGreaterThan(50);
    for (const evt of events) {
      expect(typeof evt.t_ms).toBe('number');
      expect(evt.t_ms).toBeGreaterThanOrEqual(0);
      expect(BOMB_EVENT_NAMES.has(evt.event)).toBe(true);
      expect(evt.meta).toEqual(expect.any(Object));
      if (BOMB_CRITICAL_EVENTS.has(evt.event) && evt.event !== 'SESSION_START') {
        expect(evt.meta.level_id, `level_id en ${evt.event}`).not.toBeNull();
        expect(evt.meta.level_id).toBeDefined();
      }
    }
    const groups = groupBombEventsByLevel(events);
    expect(groups.length).toBe(7); // tutorial S1/S2/S3 + L1-L4
    for (const group of groups) {
      expect(group.events[0].event).toBe('LEVEL_START');
      expect(group.events[0].t_ms).toBe(0); // spec §1/§19: t_ms relativo al inicio del nivel
    }
    // offsets no decrecientes (línea global de la sesión)
    const offsets = groups.map((g) => g.sessionOffsetMs);
    for (let i = 1; i < offsets.length; i += 1) expect(offsets[i]).toBeGreaterThan(offsets[i - 1]);
    // L4: EXECUTION_START en t_ms=5000 (encoding 2000 + delay 3000 — igual que el ejemplo §19)
    const l4 = groups.at(-1).events;
    const exec = l4.find((e) => e.event === 'EXECUTION_START');
    expect(exec.t_ms).toBe(5000);
  });

  it('verificación completa (forma + integridad + reconstrucción) pasa', () => {
    const result = verifyBombSessionPayload(payload);
    expect(result.ok).toBe(true);
    expect(result.violations).toEqual([]);
    expect(result.reconstruction.levels[4]).toMatchObject({ result: 'success', stepsCompleted: 4, errors: 1, terminal: 'LEVEL_SUCCESS' });
  });

  it('es determinista: mismo seed + guion => payload idéntico; otro seed cambia solo el campo seed (sin variantes de forma, spec §10.1)', () => {
    const again = generateBombSyntheticSessionPayload({ seed: 42 });
    expect(JSON.stringify(again)).toBe(JSON.stringify(payload));
    const otherSeed = generateBombSyntheticSessionPayload({ seed: 7 });
    expect(otherSeed.seed).toBe(7);
    const stripSeedEvents = (p) => {
      const clone = JSON.parse(JSON.stringify(p.raw_series));
      for (const evt of clone.events) delete evt.meta?.seed;
      return clone;
    };
    expect(stripSeedEvents(otherSeed)).toEqual(stripSeedEvents(payload));
  });
});

describe('B5 — métricas derivadas (Doc 1 §12) sobre la sesión sintética', () => {
  const payload = generateBombSyntheticSessionPayload({ seed: 42 });
  const m = payload.telemetry.behavioral_metrics;

  it('retention_accuracy_rate y serial_position_accuracy = 1 (todos los pasos post-delay/serial completados)', () => {
    expect(m.retention_accuracy_rate).toBe(1); // L2 3/3, L3 4/4, L4 4/4 (niveles con delay)
    expect(m.serial_position_accuracy).toBe(1); // 13/13 pasos en niveles evaluados
  });

  it('first_action_latency_ms = 900 (guion: primera acción 900 ms tras EXECUTION_START en todos los niveles)', () => {
    expect(m.first_action_latency_ms).toBe(900);
  });

  it('inter_step_latency_median_ms = 900 (mediana de los gaps: 900×8, 1900×2, 2900×1)', () => {
    expect(m.inter_step_latency_median_ms).toBe(900);
  });

  it('interference_error_count = 1 (TYPE_INTERFERENCE real en L4, QA-04)', () => {
    expect(m.interference_error_count).toBe(1);
  });

  it('switch_cost_ms = L4 (6500 ms) − baseline A por longitud (1288.89×4 = 5155.56) ≈ 1344', () => {
    expect(m.switch_cost_ms).toBe(1344);
  });

  it('hold_duration_error_ms = 0 (todos los holds a 2000 ms exactos, spec §8.3)', () => {
    expect(m.hold_duration_error_ms).toBe(0);
  });

  it('memory_decay_slope = 0 (precisión 1.0 en los 4 delays distintos 0/2000/4000/3000)', () => {
    expect(m.memory_decay_slope).toBe(0);
  });

  it('timeout_rate = 0 (4/4 niveles evaluados sin timeout)', () => {
    expect(m.timeout_rate).toBe(0);
  });

  it('error_recovery_latency_ms = 900 (STEP_ERROR L4 → siguiente STEP_SUCCESS en 900 ms)', () => {
    expect(m.error_recovery_latency_ms).toBe(900);
  });
});

describe('B5 — fórmulas de métricas (records a mano)', () => {
  it('retention excluye L1 (sin delay); serial lo incluye', () => {
    const records = [
      makeRecord({ level: 1, delayMs: 0, stepsCompleted: 2, effectiveStepIds: ['A', 'B'] }),
      makeRecord({ level: 2, delayMs: 2000, stepsCompleted: 1, effectiveStepIds: ['A', 'B', 'C'] }),
    ];
    const m = computeBombBehavioralMetrics(records, []);
    expect(m.retention_accuracy_rate).toBeCloseTo(1 / 3, 4); // solo L2: 1/3
    expect(m.serial_position_accuracy).toBeCloseTo(3 / 5, 4); // (2+1)/(2+3)
  });

  it('timeout_rate: 1 timeout de 3 evaluados = 0.3333', () => {
    const records = [
      makeRecord({ level: 1, result: 'success', stepsCompleted: 2 }),
      makeRecord({ level: 2, result: 'fail', failReason: 'TIMEOUT', stepsCompleted: 1, effectiveStepIds: ['A', 'B', 'C'] }),
      makeRecord({ level: 3, result: 'success', stepsCompleted: 4, effectiveStepIds: ['A', 'B', 'C', 'D'] }),
    ];
    const m = computeBombBehavioralMetrics(records, []);
    expect(m.timeout_rate).toBeCloseTo(1 / 3, 4);
  });

  it('switch_cost_ms es null sin L4 completado o sin baseline A', () => {
    const withoutL4 = [
      makeRecord({ level: 1, bombType: 'A', result: 'success', stepsCompleted: 2, executionStartMs: 0, endedMs: 1800 }),
    ];
    expect(computeBombBehavioralMetrics(withoutL4, []).switch_cost_ms).toBeNull();
    const noBaseline = [
      makeRecord({ level: 4, bombType: 'B', result: 'success', stepsCompleted: 4, executionStartMs: 0, endedMs: 6500, effectiveStepIds: ['A', 'B', 'C', 'D'] }),
    ];
    expect(computeBombBehavioralMetrics(noBaseline, []).switch_cost_ms).toBeNull();
  });

  it('memory_decay_slope: precisión 1/0.333/0.25 en delays 0/2000/4000 → LSQ −0.0001875', () => {
    const records = [
      makeRecord({ level: 1, delayMs: 0, stepsCompleted: 2, effectiveStepIds: ['A', 'B'] }),
      makeRecord({ level: 2, delayMs: 2000, stepsCompleted: 1, effectiveStepIds: ['A', 'B', 'C'] }),
      makeRecord({ level: 3, delayMs: 4000, stepsCompleted: 1, effectiveStepIds: ['A', 'B', 'C', 'D'] }),
    ];
    const m = computeBombBehavioralMetrics(records, []);
    // LSQ: Sxy = −2000·(2/3)+... = −1500; Sxx = 8·10⁶ → −1500/8·10⁶ = −0.0001875
    expect(m.memory_decay_slope).toBeCloseTo(-0.0001875, 4);
  });

  it('hold_duration_error_ms: media de |hold − 2000| (1900, 2200) = 150', () => {
    const records = [
      makeRecord({ level: 2, holdMsSamples: [1900, 2200], stepsCompleted: 3, effectiveStepIds: ['A', 'B', 'C'] }),
    ];
    const m = computeBombBehavioralMetrics(records, []);
    expect(m.hold_duration_error_ms).toBe(150);
  });

  it('error_recovery_latency_ms: solo gaps error→success dentro del nivel (un error sin recuperación no cuenta)', () => {
    const records = [makeRecord({ level: 4, stepsCompleted: 4, effectiveStepIds: ['A', 'B', 'C', 'D'] })];
    const events = [
      { t_ms: 0, event: 'LEVEL_START', meta: { level: 4, level_id: 4 } },
      { t_ms: 1000, event: 'STEP_ERROR', meta: { level_id: 4, penalizes: true, error_class: 'ORDER_ERROR' } },
      { t_ms: 1900, event: 'STEP_SUCCESS', meta: { level_id: 4, step_id: 'A' } },
      { t_ms: 2400, event: 'STEP_SUCCESS', meta: { level_id: 4, step_id: 'B' } },
      { t_ms: 3000, event: 'STEP_ERROR', meta: { level_id: 4, penalizes: true, error_class: 'WRONG_TARGET' } },
      { t_ms: 3300, event: 'LEVEL_FAIL', meta: { level_id: 4, reason: 'MAX_ERRORS' } },
    ];
    const m = computeBombBehavioralMetrics(records, events);
    expect(m.error_recovery_latency_ms).toBe(900); // solo el primer gap (el 2º no tiene success)
  });

  it('first_action_latency_ms: media entre niveles con ejecución', () => {
    const records = [
      makeRecord({ level: 1, executionStartMs: 0, firstActionMs: 500, stepsCompleted: 2 }),
      makeRecord({ level: 2, executionStartMs: 5000, firstActionMs: 5900, stepsCompleted: 3, effectiveStepIds: ['A', 'B', 'C'], delayMs: 2000 }),
      makeRecord({ level: 3, executionStartMs: null, stepsCompleted: 0 }),
    ];
    const m = computeBombBehavioralMetrics(records, []);
    expect(m.first_action_latency_ms).toBe(700); // (500 + 900) / 2
  });

  it('inter_step_latency_median_ms: mediana de gaps (100, 300, 200) = 200', () => {
    const records = [
      makeRecord({ level: 1, validActionMs: [100, 200], stepsCompleted: 2 }),
      makeRecord({ level: 2, validActionMs: [100, 400], stepsCompleted: 2, effectiveStepIds: ['A', 'B'], delayMs: 2000 }),
    ];
    const m = computeBombBehavioralMetrics(records, []);
    expect(m.inter_step_latency_median_ms).toBe(200);
  });
});

describe('B5 — reconstrucción desde raw events (DoD §16.2)', () => {
  const payload = generateBombSyntheticSessionPayload({ seed: 42 });

  it('la sesión se reconstruye: level_summary coherente con raw events', () => {
    const result = reconstructBombSession(payload);
    expect(result.ok).toBe(true);
    expect(result.violations).toEqual([]);
    expect(Object.keys(result.levels).sort()).toEqual(['1', '2', '3', '4']);
    expect(result.levels[4]).toEqual({ result: 'success', stepsCompleted: 4, errors: 1, terminal: 'LEVEL_SUCCESS' });
    expect(result.levels[1]).toEqual({ result: 'success', stepsCompleted: 2, errors: 0, terminal: 'LEVEL_SUCCESS' });
  });

  it('detecta STEP_SUCCESS faltante (raw events adulterados)', () => {
    const tampered = JSON.parse(JSON.stringify(payload));
    const idx = tampered.raw_series.events.findIndex((e) => e.event === 'STEP_SUCCESS' && e.meta?.level_id === 3);
    tampered.raw_series.events.splice(idx, 1);
    const result = reconstructBombSession(tampered);
    expect(result.ok).toBe(false);
    expect(result.violations.some((v) => v.includes('level 3'))).toBe(true);
  });

  it('detecta result inconsistentes (level_summary dice fail pero raw termina en LEVEL_SUCCESS)', () => {
    const tampered = JSON.parse(JSON.stringify(payload));
    tampered.level_summary[1].result = 'fail';
    const result = verifyBombSessionPayload(tampered);
    expect(result.ok).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
  });

  it('detecta eventos críticos sin level_id y t_ms inválidos', () => {
    const noLevelId = JSON.parse(JSON.stringify(payload));
    const criticalIdx = noLevelId.raw_series.events.findIndex(
      (e) => BOMB_CRITICAL_EVENTS.has(e.event) && e.event !== 'SESSION_START',
    );
    delete noLevelId.raw_series.events[criticalIdx].meta.level_id;
    const resultNoLevelId = verifyBombSessionPayload(noLevelId);
    expect(resultNoLevelId.ok).toBe(false);
    expect(resultNoLevelId.violations.some((v) => v.includes('level_id'))).toBe(true);

    const badTMs = JSON.parse(JSON.stringify(payload));
    const actionIdx = badTMs.raw_series.events.findIndex((e) => e.event === 'ACTION_WIRE_CUT');
    badTMs.raw_series.events[actionIdx].t_ms = -5;
    const resultTMs = verifyBombSessionPayload(badTMs);
    expect(resultTMs.ok).toBe(false);
    expect(resultTMs.violations.some((v) => v.includes('t_ms'))).toBe(true);
  });

  it('detecta biometría habilitada (debe ser off por defecto)', () => {
    const tampered = JSON.parse(JSON.stringify(payload));
    tampered.telemetry.biometric_metrics.enabled = true;
    const result = verifyBombSessionPayload(tampered);
    expect(result.ok).toBe(false);
    expect(result.violations.some((v) => v.includes('biometric_metrics'))).toBe(true);
  });

  it('detecta métricas §12 ausentes', () => {
    const tampered = JSON.parse(JSON.stringify(payload));
    delete tampered.telemetry.behavioral_metrics.switch_cost_ms;
    const result = verifyBombSessionPayload(tampered);
    expect(result.ok).toBe(false);
    expect(result.violations).toContain('behavioral_metrics.switch_cost_ms ausente');
  });
});

describe('B5 — resumen plano del bloque de batería', () => {
  const payload = generateBombSyntheticSessionPayload({ seed: 42 });
  const summary = buildBombBlockSummary(payload, { state: 'SESSION_COMPLETE' });

  it('solo escalares (el sanitizer del blueprint conserva number/boolean/string)', () => {
    for (const [key, value] of Object.entries(summary)) {
      expect(
        [ 'number', 'boolean', 'string' ].includes(typeof value) || value === null,
        `${key} no es escalar: ${JSON.stringify(value)}`,
      ).toBe(true);
    }
    expect(summary.aggregateSchemaVersion).toBe(BOMB_BLOCK_AGGREGATE_SCHEMA);
    expect(summary.aggregateOnly).toBe(true);
  });

  it('campos de sesión: 4/4 completados, 1 error total (L4), sin incompletos', () => {
    expect(summary.completed).toBe(true);
    expect(summary.state).toBe('SESSION_COMPLETE');
    expect(summary.levelsCompleted).toBe(4);
    expect(summary.levelsFailed).toBe(0);
    expect(summary.levelsIncomplete).toBe(0);
    expect(summary.timeoutCount).toBe(0);
    expect(summary.totalErrorCount).toBe(1);
    expect(summary.interferenceErrorCount).toBe(1);
    expect(summary.sessionIncomplete).toBe(false);
    expect(summary.seed).toBe(42);
    expect(summary.sessionPayloadVersion).toBe(BOMB_SESSION_PAYLOAD_VERSION);
  });

  it('métricas e integridad planas presentes', () => {
    expect(summary.retentionAccuracyRate).toBe(1);
    expect(summary.firstActionLatencyMs).toBe(900);
    expect(summary.switchCostMs).toBe(1344);
    expect(summary.inputDeviceType).toBe('mouse');
    expect(summary.viewportWidth).toBe(1280);
    expect(summary.viewportHeight).toBe(720);
    expect(summary.eventClockDriftMs).toBe(0);
    expect(summary.timeMs).toBeGreaterThan(0);
    expect(Number.isFinite(bombSessionDurationMs(payload.raw_series.events))).toBe(true);
  });

  it('buildBombIntegrityFlags: mapeo §14.1 desde integrity del motor', () => {
    const flags = buildBombIntegrityFlags(
      {
        blurCount: 2, totalBlurMs: 1500, fpsDropCount: 3, minFps: 24, eventClockDriftMs: 12,
        bioTrackingLossMs: 0, inputDeviceType: 'touch', viewport: { width: 800, height: 600 },
        devicePixelRatio: 2, viewportResizeCount: 1, sessionResumeCount: 0,
        unexpectedStateTransitionCount: 0, inputDuringLockCount: 1, misclickCount: 2,
        technicalAbortCount: 0,
      },
      { tutorial_replay_count: 1, session_incomplete: true },
    );
    expect(flags.blur_events).toBe(2);
    expect(flags.total_blur_ms).toBe(1500);
    expect(flags.fps_drop_count).toBe(3);
    expect(flags.min_fps).toBe(24);
    expect(flags.event_clock_drift_ms).toBe(12);
    expect(flags.input_device_type).toBe('touch');
    expect(flags.viewport_size).toEqual({ width: 800, height: 600 });
    expect(flags.device_pixel_ratio).toBe(2);
    expect(flags.viewport_resize_count).toBe(1);
    expect(flags.tutorial_replay_count).toBe(1);
    expect(flags.session_incomplete).toBe(true);
  });
});
