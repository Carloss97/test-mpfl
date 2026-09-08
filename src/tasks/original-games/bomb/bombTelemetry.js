// bombTelemetry.js — EXP-BOMB-001 · B5: telemetría de sesión (Doc 1 §11/§12/§14/§19).
//
// Módulo PURO (sin DOM/React) que convierte el estado del motor (bombEngine.js) en:
//   - Métricas derivadas §12 (10, con fórmulas documentadas; `null` = no observable).
//   - Payload de sesión §19 (esquema JSON de la spec, top-level exacto; biometría
//     `enabled: false` por defecto — plan EXP-7 §3).
//   - Flags de integridad §14.1 (+ analítica de diseño Doc 2 §18 dentro de
//     integrity_flags).
//   - Verificación y RECONSTRUCCIÓN de la sesión desde raw events (DoD §16.2:
//     "La sesión puede reconstruirse desde raw events para auditoría de errores"):
//     level_summary se valida contra la secuencia de eventos brutos (t_ms relativos
//     al inicio de nivel + level_id + session_offset_ms).
//   - Resumen plano del bloque de batería (solo escalares: el sanitizer del
//     blueprint `originalGameBlueprints.js` solo conserva number/boolean/string).
//   - Generador determinista de sesiones sintéticas (reloj falso + guion) para el
//     fixture de batería original: el payload del fixture es un payload REAL
//     (generado por el motor, no inventado) y pasa la reconstrucción.
//
// Privacidad (plan §3): el reporte/backend recibe SOLO el resumen plano agregado.
// El payload §19 (con raw_series) viaja en `artifacts.sessionPayloads` (canal de
// auditoría por sesión, en memoria / export local de investigación), NUNCA en el
// finalAssessmentPayload. Timestamps relativos al inicio de nivel + seed:
// reconstruible para auditoría, no reconstruible a nivel de interacción cruda del
// candidato más allá de la secuencia de acciones del protocolo (el diseño es la
// tarea; no hay coordenadas, DOM ni biometría — whitelist §11).

import {
  BOMB_BEHAVIORAL_METRIC_KEYS,
  BOMB_CRITICAL_EVENTS,
  BOMB_EVENT_NAMES,
  BOMB_RULE_MANIFEST,
} from './bombRules.js';
import { createBombEngine } from './bombEngine.js';

export const BOMB_SESSION_PAYLOAD_VERSION = 'exp_bomb_session_v1';
export const BOMB_BLOCK_AGGREGATE_SCHEMA = 'bomb_defusal_aggregate_v1';

const BOMB_LEVEL_SUMMARY_RESULTS = new Set(['success', 'fail', 'incomplete']);

// ---------------- utilidades ----------------

function roundTo(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function roundRate(value) {
  return typeof value === 'number' && Number.isFinite(value) ? roundTo(value, 4) : null;
}

function roundMs(value) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : null;
}

function mean(values) {
  const numeric = values.filter((v) => typeof v === 'number' && Number.isFinite(v));
  if (!numeric.length) return null;
  return numeric.reduce((sum, v) => sum + v, 0) / numeric.length;
}

function median(values) {
  const numeric = values.filter((v) => typeof v === 'number' && Number.isFinite(v)).sort((a, b) => a - b);
  if (!numeric.length) return null;
  const mid = Math.floor(numeric.length / 2);
  return numeric.length % 2 ? numeric[mid] : (numeric[mid - 1] + numeric[mid]) / 2;
}

/**
 * Regresión lineal (mínimos cuadrados) de y sobre x.
 * null si hay <2 puntos o sin varianza en x (eslope no definido).
 */
function leastSquaresSlope(points) {
  const pts = points
    .map((p) => ({ x: Number(p.x), y: Number(p.y) }))
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  if (pts.length < 2) return null;
  const distinctX = new Set(pts.map((p) => p.x));
  if (distinctX.size < 2) return null;
  const n = pts.length;
  const sumX = pts.reduce((s, p) => s + p.x, 0);
  const sumY = pts.reduce((s, p) => s + p.y, 0);
  const sumXY = pts.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = pts.reduce((s, p) => s + p.x * p.x, 0);
  const denom = (n * sumXX - sumX * sumX);
  if (denom === 0) return null;
  return (n * sumXY - sumX * sumY) / denom;
}

/**
 * Agrupa los raw events por runtime de nivel. Cada LEVEL_START abre un grupo
 * (el tutorial crea varios: un record por segmento, Decisión B4 #1). La clave del
 * grupo es el índice de aparición (los offsets se usan solo para verificación).
 */
export function groupBombEventsByLevel(events = []) {
  const groups = [];
  let current = null;
  for (const evt of events) {
    if (!evt || typeof evt !== 'object') continue;
    if (evt.event === 'LEVEL_START') {
      current = {
        level: typeof evt.meta?.level === 'number' ? evt.meta.level : null,
        sessionOffsetMs: typeof evt.meta?.session_offset_ms === 'number' ? evt.meta.session_offset_ms : null,
        events: [],
      };
      groups.push(current);
    }
    if (current) current.events.push(evt);
    // Los eventos previos al primer LEVEL_START (SESSION_START) quedan fuera de grupo.
  }
  return groups;
}

// ---------------- Métricas derivadas (Doc 1 §12) ----------------

/**
 * Las 10 métricas §12 a partir de `records` (levelRecords del motor) + `events`
 * (raw events del buffer). Fórmulas (documentadas por métrica):
 *
 * - retention_accuracy_rate: pasos completados en niveles evaluados CON delay
 *   (delayMs > 0) / pasos requeridos en esos niveles. Retención post-blind-delay
 *   (L1, sin delay, es baseline de comprensión: no cuenta aquí). null si no hay
 *   niveles con delay.
 * - serial_position_accuracy: pasos completados / pasos requeridos en TODOS los
 *   niveles evaluados (mantenimiento del orden serial; el motor solo avanza con
 *   EXACT_MATCH en posición esperada, spec §8.2).
 * - first_action_latency_ms: media (niveles evaluados) de
 *   (primera acción de la ventana de ejecución) − (EXECUTION_START).
 * - inter_step_latency_median_ms: mediana de los gaps entre STEP_SUCCESS
 *   consecutivos (acciones válidas) a través de los niveles evaluados.
 * - interference_error_count: Σ STEP_ERROR con error_class TYPE_INTERFERENCE en
 *   niveles evaluados (solo posible en Modelo B, L4 — spec §13).
 * - switch_cost_ms: tiempo de ejecución L4 (success) − tiempo esperado por
 *   longitud: esperado = perStep medio de los niveles A completados × pasos L4.
 *   null si L4 no se completa o no hay baseline A (costo de cambio contextual,
 *   spec §12; la definición usa latencia ajustada por longitud).
 * - hold_duration_error_ms: media de |hold_ms − 2000| sobre todos los holds
 *   evaluados (aceptados y HOLD_TOO_*, spec §8.3: duración exacta registrada).
 * - memory_decay_slope: pendiente (mínimos cuadrados) de la precisión por nivel
 *   (pasos completados / longitud) contra delay_duration_ms en niveles evaluados.
 *   null con <2 delays distintos.
 * - timeout_rate: niveles evaluados fallados por TIMEOUT / niveles evaluados
 *   alcanzados. null si no se alcanzó ninguno.
 * - error_recovery_latency_ms: media de (STEP_ERROR penalizado → siguiente
 *   STEP_SUCCESS) dentro del mismo nivel evaluado. null sin errores penalizados.
 *
 * El tutorial NO cuenta (DoD §16.2): se filtran `record.evaluated === true`.
 */
export function computeBombBehavioralMetrics(records = [], events = [], { holdTargetMs = 2000 } = {}) {
  const evaluated = records.filter((r) => r && r.evaluated === true);
  const len = (r) => (Array.isArray(r.effectiveStepIds) ? r.effectiveStepIds.length : 0);

  // retention (solo niveles con delay)
  const withDelay = evaluated.filter((r) => (r.delayMs ?? 0) > 0 && len(r) > 0);
  const retention = withDelay.length
    ? withDelay.reduce((s, r) => s + r.stepsCompleted, 0) / withDelay.reduce((s, r) => s + len(r), 0)
    : null;

  // serial position (todos los evaluados)
  const serialDenom = evaluated.reduce((s, r) => s + len(r), 0);
  const serial = serialDenom > 0 ? evaluated.reduce((s, r) => s + r.stepsCompleted, 0) / serialDenom : null;

  // first action latency
  const firstLatencies = evaluated
    .filter((r) => r.executionStartMs != null && r.firstActionMs != null)
    .map((r) => r.firstActionMs - r.executionStartMs);
  const firstAction = mean(firstLatencies);

  // inter-step median
  const gaps = [];
  for (const r of evaluated) {
    const times = r.validActionMs.filter((v) => typeof v === 'number');
    for (let i = 1; i < times.length; i += 1) gaps.push(times[i] - times[i - 1]);
  }
  const interStep = median(gaps);

  // interference errors (events, niveles evaluados)
  const evaluatedLevels = new Set(evaluated.map((r) => r.level));
  const interference = events
    .filter((e) => e?.event === 'STEP_ERROR'
      && e.meta?.error_class === 'TYPE_INTERFERENCE'
      && typeof e.meta?.level_id === 'number'
      && evaluatedLevels.has(e.meta.level_id))
    .length;

  // switch cost (L4 vs baseline A ajustado por longitud)
  const l4 = evaluated.find((r) => r.level === 4 && r.result === 'success' && r.stepsCompleted > 0
    && r.executionStartMs != null && r.endedMs != null);
  const baselineA = evaluated.filter((r) => r.bombType === 'A' && r.result === 'success' && r.stepsCompleted > 0
    && r.executionStartMs != null && r.endedMs != null);
  let switchCost = null;
  if (l4 && baselineA.length > 0) {
    const expectedPerStep = mean(baselineA.map((r) => (r.endedMs - r.executionStartMs) / r.stepsCompleted));
    if (expectedPerStep != null) {
      switchCost = (l4.endedMs - l4.executionStartMs) - expectedPerStep * l4.stepsCompleted;
    }
  }

  // hold duration error
  const holdSamples = evaluated.flatMap((r) => r.holdMsSamples);
  const holdError = holdSamples.length
    ? mean(holdSamples.map((h) => Math.abs(h - holdTargetMs)))
    : null;

  // memory decay slope (precisión vs delay)
  const decayPoints = evaluated.filter((r) => len(r) > 0).map((r) => ({
    x: r.delayMs ?? 0,
    y: r.stepsCompleted / len(r),
  }));
  const decaySlope = leastSquaresSlope(decayPoints);

  // timeout rate
  const reached = evaluated.length;
  const timeouts = evaluated.filter((r) => r.result === 'fail' && r.failReason === 'TIMEOUT').length;
  const timeoutRate = reached > 0 ? timeouts / reached : null;

  // error recovery (STEP_ERROR penalizado → siguiente STEP_SUCCESS, mismo nivel)
  const groups = groupBombEventsByLevel(events);
  const recoveryGaps = [];
  groups.forEach((group, index) => {
    const record = records[index];
    if (!record || record.evaluated !== true) return;
    const evs = group.events.filter((e) => e && typeof e.t_ms === 'number');
    let pendingErrorAt = null;
    for (const e of evs) {
      if (e.event === 'STEP_ERROR' && e.meta?.penalizes === true) pendingErrorAt = e.t_ms;
      else if (e.event === 'STEP_SUCCESS' && pendingErrorAt != null) {
        recoveryGaps.push(e.t_ms - pendingErrorAt);
        pendingErrorAt = null;
      }
    }
  });
  const recovery = mean(recoveryGaps);

  return {
    retention_accuracy_rate: roundRate(retention),
    serial_position_accuracy: roundRate(serial),
    first_action_latency_ms: roundMs(firstAction),
    inter_step_latency_median_ms: roundMs(interStep),
    interference_error_count: interference,
    switch_cost_ms: roundMs(switchCost),
    hold_duration_error_ms: roundMs(holdError),
    memory_decay_slope: typeof decaySlope === 'number' && Number.isFinite(decaySlope) ? roundTo(decaySlope, 6) : null,
    timeout_rate: roundRate(timeoutRate),
    error_recovery_latency_ms: roundMs(recovery),
  };
}

// ---------------- Integridad (Doc 1 §14.1 + Doc 2 §18) ----------------

/**
 * Flags de integridad con los nombres de la spec §14.1. `integrity` es el estado
 * interno del motor; `summary` aporta tutorial_replay_count (Doc 2 §18).
 */
export function buildBombIntegrityFlags(integrity = {}, summary = {}) {
  const int = integrity ?? {};
  return {
    blur_events: int.blurCount ?? 0,
    total_blur_ms: Math.round(int.totalBlurMs ?? 0),
    fps_drop_count: int.fpsDropCount ?? 0,
    min_fps: int.minFps ?? null,
    event_clock_drift_ms: Math.round(int.eventClockDriftMs ?? 0),
    bio_tracking_loss_ms: int.bioTrackingLossMs ?? 0, // biometría off por defecto (plan §3)
    input_device_type: int.inputDeviceType ?? null,
    viewport_size: int.viewport ? { ...int.viewport } : null,
    device_pixel_ratio: int.devicePixelRatio ?? null,
    session_resume_count: int.sessionResumeCount ?? 0,
    unexpected_state_transition_count: int.unexpectedStateTransitionCount ?? 0,
    // Analítica de diseño (Doc 2 §18) — flags de calidad de sesión:
    input_during_lock_count: int.inputDuringLockCount ?? 0,
    misclick_count: int.misclickCount ?? 0,
    technical_abort_count: int.technicalAbortCount ?? 0,
    viewport_resize_count: int.viewportResizeCount ?? 0,
    tutorial_replay_count: summary.tutorial_replay_count ?? 0,
    session_incomplete: Boolean(summary.session_incomplete ?? false),
  };
}

// ---------------- Reconstrucción (DoD §16.2) ----------------

/**
 * Re-construye la sesión SOLO desde `raw_series.events` y la compara contra
 * `level_summary` (auditoría de errores, DoD §16.2). Devuelve
 * { ok, violations[], levels: { [level]: { result, stepsCompleted, errors, terminal } } }.
 *
 * Invariantes por nivel evaluado:
 *  - Un solo LEVEL_START; su meta (level/bomb_type/seq_ids) coincide con level_summary.
 *  - Un INSTRUCTIONS_SHOW y un EXECUTION_START.
 *  - La secuencia de STEP_SUCCESS coincide con effective_sequence (orden y step_ids).
 *  - Σ STEP_ERROR penalizados == level_summary.errors.
 *  - Terminal coherente: success → LEVEL_SUCCESS; fail → LEVEL_FAIL;
 *    incomplete → sin terminal.
 *  - t_ms no decrece dentro del nivel (reloj monotónico, spec §15).
 *  - session_offset_ms de los LEVEL_START es no decreciente (línea global).
 */
export function reconstructBombSession(payload) {
  const violations = [];
  const levels = {};
  const summary = Array.isArray(payload?.level_summary) ? payload.level_summary : [];
  const events = Array.isArray(payload?.raw_series?.events) ? payload.raw_series.events : [];
  const groups = groupBombEventsByLevel(events);

  const byLevel = new Map();
  groups.forEach((group, index) => {
    if (group.level != null) {
      if (!byLevel.has(group.level)) byLevel.set(group.level, []);
      byLevel.get(group.level).push({ group, index });
    }
  });

  let prevOffset = null;
  for (const entry of summary) {
    const level = entry?.level;
    const cands = byLevel.get(level) ?? [];
    if (cands.length === 0) {
      violations.push(`level ${level}: sin LEVEL_START en raw events`);
      continue;
    }
    if (cands.length > 1) {
      violations.push(`level ${level}: ${cands.length} LEVEL_START (esperado 1)`);
    }
    const { group } = cands.at(-1);
    const evs = group.events;
    const starts = evs.filter((e) => e.event === 'LEVEL_START');
    const start = starts.at(-1) ?? {};
    if (prevOffset != null && group.sessionOffsetMs != null && group.sessionOffsetMs < prevOffset) {
      violations.push(`level ${level}: session_offset_ms decreciente`);
    }
    if (group.sessionOffsetMs != null) prevOffset = group.sessionOffsetMs;
    if (start.meta?.bomb_type !== entry.bomb_type) {
      violations.push(`level ${level}: bomb_type del LEVEL_START (${start.meta?.bomb_type}) ≠ level_summary (${entry.bomb_type})`);
    }
    if (JSON.stringify(start.meta?.seq_ids ?? []) !== JSON.stringify(entry.sequence_ids ?? [])) {
      violations.push(`level ${level}: seq_ids del LEVEL_START ≠ level_summary`);
    }
    const count = (name, filter = () => true) => evs.filter((e) => e.event === name && filter(e)).length;
    if (count('INSTRUCTIONS_SHOW') !== 1) violations.push(`level ${level}: INSTRUCTIONS_SHOW ${count('INSTRUCTIONS_SHOW')} (esperado 1)`);
    if (count('EXECUTION_START') !== 1) violations.push(`level ${level}: EXECUTION_START ${count('EXECUTION_START')} (esperado 1)`);
    const successes = evs.filter((e) => e.event === 'STEP_SUCCESS');
    const successIds = successes.map((e) => e.meta?.step_id);
    const expectedIds = entry.effective_sequence ?? [];
    if (entry.result === 'success' && JSON.stringify(successIds) !== JSON.stringify(expectedIds)) {
      violations.push(`level ${level}: STEP_SUCCESS ${JSON.stringify(successIds)} ≠ effective_sequence ${JSON.stringify(expectedIds)}`);
    }
    if (entry.result !== 'success' && successIds.length >= expectedIds.length) {
      violations.push(`level ${level}: result ${entry.result} pero ${successIds.length} STEP_SUCCESS`);
    }
    const errors = count('STEP_ERROR', (e) => e.meta?.penalizes === true);
    if (errors !== entry.errors) {
      violations.push(`level ${level}: STEP_ERROR penalizados ${errors} ≠ level_summary.errors ${entry.errors}`);
    }
    const successTerminal = count('LEVEL_SUCCESS');
    const failTerminal = count('LEVEL_FAIL');
    const terminal = successTerminal ? 'LEVEL_SUCCESS' : failTerminal ? 'LEVEL_FAIL' : null;
    if (entry.result === 'success' && successTerminal !== 1) violations.push(`level ${level}: success sin terminal LEVEL_SUCCESS`);
    if (entry.result === 'fail' && failTerminal !== 1) violations.push(`level ${level}: fail sin LEVEL_FAIL terminal`);
    if (entry.result === 'incomplete' && terminal) violations.push(`level ${level}: incomplete con terminal ${terminal}`);
    // t_ms monotónico dentro del nivel
    for (let i = 1; i < evs.length; i += 1) {
      const a = evs[i - 1]?.t_ms;
      const b = evs[i]?.t_ms;
      if (typeof a === 'number' && typeof b === 'number' && b < a) {
        violations.push(`level ${level}: t_ms decrece (${a} → ${b})`);
        break;
      }
    }
    levels[level] = {
      result: entry.result,
      stepsCompleted: successIds.length,
      errors,
      terminal,
    };
  }

  // Niveles en raw events sin level_summary (evaluados) → inconsistencia.
  for (const group of groups) {
    if (group.level == null || group.level === 0) continue; // 0 = tutorial (no evaluado)
    if (!summary.some((e) => e?.level === group.level)) {
      violations.push(`raw events con level ${group.level} ausente de level_summary`);
    }
  }

  return { ok: violations.length === 0, violations, levels };
}

// ---------------- Payload de sesión (Doc 1 §19) ----------------

/**
 * Payload de sesión §19 (top-level EXACTO a la spec: exp_id, build_version,
 * config_version, session_id, timestamp_utc, level_summary, telemetry,
 * integrity_flags, raw_series). Adiciones documentadas dentro del esquema:
 * `seed` + `session_payload_version` (reproducibilidad/auditoría, spec §9/§16.2).
 *
 * `level_summary` (solo niveles evaluados; tutorial excluido, DoD): claves exactas
 * del §19 — level, bomb_type, sequence_ids, effective_sequence, time_limit_s,
 * delay_duration_ms, errors, result ('success' | 'fail' | 'incomplete'; la razón
 * del fail queda en el evento LEVEL_FAIL del raw_series).
 *
 * `telemetry.behavioral_metrics` = las 10 métricas §12; `telemetry.biometric_metrics`
 * = { enabled: false } (biometría off por defecto, plan §3).
 */
export function buildBombSessionPayload({ engine, timestampUtc = new Date().toISOString() } = {}) {
  if (!engine) throw new Error('buildBombSessionPayload: engine requerido');
  const manifest = engine.manifest ?? BOMB_RULE_MANIFEST;
  const summary = engine.sessionSummary();
  const records = Array.isArray(engine.levelRecords) ? engine.levelRecords : [];
  const events = Array.isArray(engine.eventBuffer) ? engine.eventBuffer : [];

  const levelSummary = records
    .filter((r) => r.evaluated === true)
    .map((r) => ({
      level: r.level,
      bomb_type: r.bombType,
      sequence_ids: [...r.sequenceIds],
      effective_sequence: [...r.effectiveStepIds],
      time_limit_s: r.timeLimitMs != null ? r.timeLimitMs / 1000 : null,
      delay_duration_ms: r.delayMs,
      errors: r.errors,
      result: r.result ?? 'incomplete',
    }));

  const behavioral = computeBombBehavioralMetrics(records, events, {
    holdTargetMs: manifest.hold.targetMs,
  });

  return {
    exp_id: manifest.experienceId,
    build_version: manifest.buildVersion,
    config_version: manifest.configVersion,
    session_id: summary.session_id,
    timestamp_utc: timestampUtc,
    seed: summary.seed ?? null,
    session_payload_version: BOMB_SESSION_PAYLOAD_VERSION,
    level_summary: levelSummary,
    telemetry: {
      behavioral_metrics: behavioral,
      biometric_metrics: Object.freeze({ enabled: false }),
    },
    integrity_flags: buildBombIntegrityFlags(engine.integrity, summary),
    raw_series: {
      events: events.map((e) => ({ t_ms: e.t_ms, event: e.event, meta: { ...e.meta } })),
    },
  };
}

/**
 * Verificación completa del payload §19: forma (claves/tipos), biometría off,
 * flags de integridad presentes, eventos válidos (nombre conocido, t_ms ≥ 0,
 * level_id en eventos críticos, monotonicidad por nivel) + reconstrucción.
 */
export function verifyBombSessionPayload(payload) {
  const violations = [];
  if (!payload || typeof payload !== 'object') {
    return { ok: false, violations: ['payload no es un objeto'] };
  }
  const topKeys = ['exp_id', 'build_version', 'config_version', 'session_id', 'timestamp_utc',
    'level_summary', 'telemetry', 'integrity_flags', 'raw_series'];
  for (const key of topKeys) {
    if (payload[key] === undefined || payload[key] === null) violations.push(`top-level ${key} ausente`);
  }
  for (const key of ['exp_id', 'build_version', 'config_version', 'timestamp_utc']) {
    if (typeof payload[key] !== 'string') violations.push(`${key} no es string`);
  }
  if (!Array.isArray(payload.level_summary)) violations.push('level_summary no es array');
  const telemetry = payload.telemetry ?? {};
  const behavioral = telemetry.behavioral_metrics ?? {};
  for (const key of BOMB_BEHAVIORAL_METRIC_KEYS) {
    if (!(key in behavioral)) violations.push(`behavioral_metrics.${key} ausente`);
    else if (behavioral[key] !== null && typeof behavioral[key] !== 'number') {
      violations.push(`behavioral_metrics.${key} no es number|null`);
    }
  }
  if (telemetry.biometric_metrics?.enabled !== false) {
    violations.push('biometric_metrics.enabled debe ser false (biometría off por defecto)');
  }
  const integrity = payload.integrity_flags ?? {};
  for (const key of ['blur_events', 'total_blur_ms', 'fps_drop_count', 'min_fps',
    'event_clock_drift_ms', 'bio_tracking_loss_ms', 'input_device_type',
    'viewport_size', 'device_pixel_ratio', 'session_resume_count',
    'unexpected_state_transition_count']) {
    if (!(key in integrity)) violations.push(`integrity_flags.${key} ausente`);
  }
  for (const entry of payload.level_summary ?? []) {
    for (const key of ['level', 'bomb_type', 'sequence_ids', 'effective_sequence',
      'time_limit_s', 'delay_duration_ms', 'errors', 'result']) {
      if (entry[key] === undefined) violations.push(`level_summary[${entry.level ?? '?'}].${key} ausente`);
    }
    if (!BOMB_LEVEL_SUMMARY_RESULTS.has(entry.result)) {
      violations.push(`level_summary result inválido: ${entry.result}`);
    }
    if (!Array.isArray(entry.sequence_ids) || !Array.isArray(entry.effective_sequence)
      || entry.sequence_ids.length !== entry.effective_sequence.length) {
      violations.push(`level ${entry.level}: sequence_ids/effective_sequence inconsistentes`);
    }
  }
  const events = payload.raw_series?.events ?? [];
  if (!Array.isArray(events)) violations.push('raw_series.events no es array');
  for (const evt of events) {
    if (typeof evt?.t_ms !== 'number' || evt.t_ms < 0) {
      violations.push(`event ${evt?.event}: t_ms inválido`);
      continue;
    }
    if (!BOMB_EVENT_NAMES.has(evt.event)) {
      violations.push(`event con nombre desconocido: ${evt.event}`);
    }
    if (BOMB_CRITICAL_EVENTS.has(evt.event)
      && evt.event !== 'SESSION_START'
      && (evt.meta?.level_id === undefined || evt.meta?.level_id === null)) {
      violations.push(`event crítico ${evt.event} sin level_id`);
    }
  }
  const reconstruction = reconstructBombSession(payload);
  violations.push(...reconstruction.violations);
  return {
    ok: violations.length === 0,
    violations,
    reconstruction: { levels: reconstruction.levels },
  };
}

// ---------------- Resumen plano del bloque de batería ----------------

/** Duración total de sesión (ms) desde raw events: max(offset nivel + t_ms). */
export function bombSessionDurationMs(events = []) {
  let maxMs = null;
  let offset = 0;
  for (const evt of events) {
    if (evt?.event === 'LEVEL_START' && typeof evt.meta?.session_offset_ms === 'number') {
      offset = evt.meta.session_offset_ms;
    }
    if (typeof evt?.t_ms === 'number') {
      const total = offset + evt.t_ms;
      if (maxMs == null || total > maxMs) maxMs = total;
    }
  }
  return maxMs;
}

/**
 * Resumen PLANO del bloque de batería (solo escalares: compatible con
 * `sanitizeOriginalGameAggregate`, que descarta objetos/arrays). El payload §19
 * completo viaja aparte (summary.sessionPayload → artifacts.sessionPayloads).
 */
export function buildBombBlockSummary(payload, { state = null } = {}) {
  const metrics = payload?.telemetry?.behavioral_metrics ?? {};
  const integrity = payload?.integrity_flags ?? {};
  const levelSummary = Array.isArray(payload?.level_summary) ? payload.level_summary : [];
  const events = payload?.raw_series?.events ?? [];
  const reached = levelSummary.length;
  const succeeded = levelSummary.filter((e) => e.result === 'success').length;
  const failed = levelSummary.filter((e) => e.result === 'fail').length;
  const incomplete = levelSummary.filter((e) => e.result === 'incomplete').length;
  const timeoutEvents = events.filter((e) => e?.event === 'LEVEL_FAIL' && e.meta?.reason === 'TIMEOUT').length;
  const totalErrors = levelSummary.reduce((s, e) => s + (typeof e.errors === 'number' ? e.errors : 0), 0);
  const sessionIncomplete = Boolean(integrity.session_incomplete ?? false);
  return {
    aggregateSchemaVersion: BOMB_BLOCK_AGGREGATE_SCHEMA,
    completed: state === 'SESSION_COMPLETE' && !sessionIncomplete && incomplete === 0,
    state,
    levelsCompleted: succeeded,
    levelsFailed: failed,
    levelsIncomplete: incomplete,
    timeoutCount: timeoutEvents,
    totalErrorCount: totalErrors,
    // Métricas §12 (number|null)
    retentionAccuracyRate: metrics.retention_accuracy_rate ?? null,
    serialPositionAccuracy: metrics.serial_position_accuracy ?? null,
    firstActionLatencyMs: metrics.first_action_latency_ms ?? null,
    interStepLatencyMedianMs: metrics.inter_step_latency_median_ms ?? null,
    interferenceErrorCount: metrics.interference_error_count ?? 0,
    switchCostMs: metrics.switch_cost_ms ?? null,
    holdDurationErrorMs: metrics.hold_duration_error_ms ?? null,
    memoryDecaySlope: metrics.memory_decay_slope ?? null,
    timeoutRate: metrics.timeout_rate ?? null,
    errorRecoveryLatencyMs: metrics.error_recovery_latency_ms ?? null,
    // Integridad §14.1
    blurEvents: integrity.blur_events ?? 0,
    totalBlurMs: integrity.total_blur_ms ?? 0,
    fpsDropCount: integrity.fps_drop_count ?? 0,
    minFps: integrity.min_fps ?? null,
    eventClockDriftMs: integrity.event_clock_drift_ms ?? 0,
    bioTrackingLossMs: integrity.bio_tracking_loss_ms ?? 0,
    inputDeviceType: integrity.input_device_type ?? null,
    viewportWidth: integrity.viewport_size?.width ?? null,
    viewportHeight: integrity.viewport_size?.height ?? null,
    devicePixelRatio: integrity.device_pixel_ratio ?? null,
    sessionResumeCount: integrity.session_resume_count ?? 0,
    unexpectedStateTransitionCount: integrity.unexpected_state_transition_count ?? 0,
    inputDuringLockCount: integrity.input_during_lock_count ?? 0,
    misclickCount: integrity.misclick_count ?? 0,
    technicalAbortCount: integrity.technical_abort_count ?? 0,
    viewportResizeCount: integrity.viewport_resize_count ?? 0,
    tutorialReplayCount: integrity.tutorial_replay_count ?? 0,
    sessionIncomplete,
    // Contexto de sesión
    timeMs: bombSessionDurationMs(events) ?? 0,
    seed: payload?.seed ?? null,
    reachedLevelCount: reached,
    sessionPayloadVersion: BOMB_SESSION_PAYLOAD_VERSION,
    aggregateOnly: true,
  };
}

// ---------------- Sesión sintética determinista (fixture) ----------------

function createScriptedClock() {
  let t = 0;
  return {
    now: () => t,
    advance: (ms) => { t += Math.max(0, ms); },
  };
}

/**
 * Ejecuta el motor REAL headless (reloj falso + guion fijo) y devuelve el payload
 * §19 correspondiente. Determinista: mismo seed + guion => mismo payload.
 *
 * Guion: tutorial completo (T1-T5) + L1-L4 con un error TYPE_INTERFERENCE real en
 * L4 (corta ROJO primero — QA-04) y recuperación (penalización 30 % + secuencia
 * correcta). Sirve para el fixture de la batería original: su sessionPayload es un
 * payload genuino del motor, reconstruible desde raw events (DoD §16.2).
 */
export function generateBombSyntheticSessionPayload({
  seed = 42,
  sessionId = 'synthetic-bomb-fixture',
  timestampUtc = '2026-09-08T12:00:00.000Z',
} = {}) {
  const clock = createScriptedClock();
  const engine = createBombEngine;
  const e = engine({
    now: clock.now,
    eventNow: clock.now,
    log: () => {},
    seed,
    sessionId,
  });
  e.recordViewport({ width: 1280, height: 720, dpr: 1 });
  e.recordInputDevice('mouse');
  e.recordFpsSample(60);

  // --- Tutorial guiado T1-T5 ---
  e.beginSession();
  clock.advance(400);
  e.startTutorial();
  clock.advance(500);
  e.action({ kind: 'SWITCH', id: 'SW_1', from: 'OFF', to: 'ON' }); // T1
  clock.advance(400);
  e.action({ kind: 'WIRE', id: 'WIRE_RED', op: 'CUT' }); // T2
  clock.advance(400);
  e.buttonAction('BTN_YELLOW', 'DOWN'); // T3
  clock.advance(2000);
  e.buttonAction('BTN_YELLOW', 'UP');
  // → S2 (T4, panel fresh): SW1 → RED → hold
  clock.advance(600);
  e.action({ kind: 'SWITCH', id: 'SW_1', from: 'OFF', to: 'ON' });
  clock.advance(500);
  e.action({ kind: 'WIRE', id: 'WIRE_RED', op: 'CUT' });
  clock.advance(500);
  e.buttonAction('BTN_YELLOW', 'DOWN');
  clock.advance(2000);
  e.buttonAction('BTN_YELLOW', 'UP');
  // → S3 (T5): lectura 3000 ms (encoding) → delay 1500 ms → ejecución
  clock.advance(3000);
  e.tick();
  clock.advance(1500);
  e.tick();
  clock.advance(700);
  e.action({ kind: 'SWITCH', id: 'SW_1', from: 'OFF', to: 'ON' });
  clock.advance(600);
  e.action({ kind: 'WIRE', id: 'WIRE_RED', op: 'CUT' });
  clock.advance(600);
  e.buttonAction('BTN_YELLOW', 'DOWN');
  clock.advance(2000);
  e.buttonAction('BTN_YELLOW', 'UP');
  // → LEVEL_SUCCESS (tutorial)
  e.tutorialComplete();
  clock.advance(800);
  e.continueFromResult(); // → TRANSITION → L1

  // --- Niveles evaluados ---
  const levelScripts = [
    // L1: SW1 → RED (encoding libre, sin delay)
    { encodingMs: null, actions: [
      ['SWITCH', 'SW_1'], ['WIRE', 'WIRE_RED'],
    ] },
    // L2: SW1 → RED → hold (encoding 3000, delay 2000)
    { encodingMs: 3000, actions: [
      ['SWITCH', 'SW_1'], ['WIRE', 'WIRE_RED'], ['HOLD', 'BTN_YELLOW'],
    ] },
    // L3: SW1 → RED → hold → GREEN (encoding 2000, delay 4000)
    { encodingMs: 2000, actions: [
      ['SWITCH', 'SW_1'], ['WIRE', 'WIRE_RED'], ['HOLD', 'BTN_YELLOW'], ['WIRE', 'WIRE_GREEN'],
    ] },
    // L4 (MODEL B): interferencia real (corta ROJO primero — QA-04) + SW3 → BLUE → hold → GREEN
    { encodingMs: 2000, actions: [
      ['WIRE', 'WIRE_RED'], ['SWITCH', 'SW_3'], ['WIRE', 'WIRE_BLUE'], ['HOLD', 'BTN_YELLOW'], ['WIRE', 'WIRE_GREEN'],
    ] },
  ];

  for (const script of levelScripts) {
    e.startLevelExecution();
    if (script.encodingMs == null) {
      clock.advance(1200);
      e.continueEncoding();
    } else {
      clock.advance(script.encodingMs);
      e.tick(); // INSTRUCTIONS_HIDE (exposure_elapsed)
    }
    const levelDelay = e.level?.delayMs ?? 0;
    if (levelDelay > 0) {
      clock.advance(levelDelay);
      e.tick(); // BLACK_SCREEN_END → EXECUTION
    }
    // ejecución
    for (const [kind, id] of script.actions) {
      clock.advance(900);
      if (kind === 'SWITCH') {
        const from = e.components.switches[id];
        e.action({ kind: 'SWITCH', id, from, to: from === 'ON' ? 'OFF' : 'ON' });
      } else if (kind === 'WIRE') {
        e.action({ kind: 'WIRE', id, op: 'CUT' });
      } else {
        e.buttonAction(id, 'DOWN');
        clock.advance(2000);
        e.buttonAction(id, 'UP');
      }
    }
    // resultado → siguiente
    clock.advance(700);
    if (e.state === 'LEVEL_SUCCESS' || e.state === 'LEVEL_FAIL') {
      e.acknowledgeResult();
      e.continueFromResult();
    }
  }
  // → SESSION_COMPLETE

  return buildBombSessionPayload({ engine: e, timestampUtc });
}
