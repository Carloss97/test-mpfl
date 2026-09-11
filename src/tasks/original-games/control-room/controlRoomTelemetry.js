// controlRoomTelemetry.js — EXP-COMM-001 (Sala de Control) · C4: telemetría de sesión +
// payload versionado + privacidad + gobernanza.
//
// Fuente de verdad: Doc 1 (ley) §11 (18 eventos), §12.1 (métricas 11), §12.2 (dimensiones 7,
// SIN score global), §13 (error handling), §13.1 (eventos críticos), §14.2 (integrity flags),
// §17 (governance: human-review-only, provisional), §19 (esquema JSON de sesión).
//
// Responsabilidad: agrega los resultados por escenario (del motor C1) al payload de sesión
// `control_room_session_v1`. El payload contiene SOLO agregados versionados (métricas,
// dimensiones, contadores de eventos, flags) — NUNCA raw events, acciones, textos de cartas/
// bloques ni trazas reconstructivas (Doc 1 §15/§19 + skill privacy-by-construction).
//
// Este módulo es la fuente canónica del agregado; el componente (controlRoomGame) importa
// `buildControlRoomSessionAggregate` de aquí (C4 lo movió desde el componente).

import {
  COMM_DIMENSION_KEYS,
  COMM_EVENT_NAMES,
  COMM_CRITICAL_EVENTS,
} from './controlRoomTaxonomy.js';
import {
  CONTROL_ROOM_EXPERIENCE_ID,
  CONTROL_ROOM_BUILD_VERSION,
  CONTROL_ROOM_MANIFEST_VERSION,
} from './controlRoomRules.js';

export const CONTROL_ROOM_PAYLOAD_VERSION = 'control_room_session_v1';

// Claves prohibidas en el payload (privacidad): nada reconstructivo.
const FORBIDDEN_KEYS = Object.freeze([
  'rawEvents', 'eventBuffer', 'eventLog', 'rawGameEvents', 'actions', 'trials', 'trialResults',
  'messageText', 'optionText', 'scenarioText', 'cardTexts', 'blockTexts', 'npcTexts', 'copy',
  'freeText', 'typedResponse', 'choiceSequence', 'rawChoices', 'pointerSamples', 'rawPointerPath',
  'fullRoute', 'routeTrace', 'clickTrace', 'stepByStepPath', 'frames', 'landmarks', 'keypoints',
  'screenshot', 'imageData', 'video', 'faceSamples', 'domEvent', 'rawDOMEvents',
]);

function hasForbiddenKeys(value, found = []) {
  if (!value || typeof value !== 'object') return found;
  if (Array.isArray(value)) {
    for (const child of value) hasForbiddenKeys(child, found);
    return found;
  }
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.includes(key)) found.push(key);
    hasForbiddenKeys(child, found);
  }
  return found;
}

/**
 * Agrega los resultados de escenarios evaluados al agregado de sesión (métricas 11 +
 * dimensiones 7). Movido de controlRoomGame.jsx (C4): la telemetría es la fuente canónica.
 */
export function buildControlRoomSessionAggregate(results = []) {
  const m = {
    first_decision_latency_ms: null,
    average_decision_latency_ms: null,
    time_spent_reading_ms: 0,
    pre_send_edit_count: 0,
    pre_send_reorder_count: 0,
    total_message_count: 0,
    question_count: 0,
    verification_count: 0,
    confirmation_requested: false,
    confirmation_given: false,
    timeout_count: 0,
  };
  let first = null;
  let latWeightedSum = 0;
  let latWeight = 0;
  const dim = Object.fromEntries(COMM_DIMENSION_KEYS.map((k) => [k, { opportunity: 0, success: 0 }]));
  for (const r of results) {
    const mm = r.metrics ?? {};
    if (mm.first_decision_latency_ms != null) {
      first = first == null ? mm.first_decision_latency_ms : Math.min(first, mm.first_decision_latency_ms);
    }
    if (mm.average_decision_latency_ms != null && (mm.total_message_count ?? 0) > 0) {
      latWeightedSum += mm.average_decision_latency_ms * mm.total_message_count;
      latWeight += mm.total_message_count;
    }
    m.time_spent_reading_ms += mm.time_spent_reading_ms || 0;
    m.pre_send_edit_count += mm.pre_send_edit_count || 0;
    m.pre_send_reorder_count += mm.pre_send_reorder_count || 0;
    m.total_message_count += mm.total_message_count || 0;
    m.question_count += mm.question_count || 0;
    m.verification_count += mm.verification_count || 0;
    m.confirmation_requested = m.confirmation_requested || mm.confirmation_requested === true;
    m.confirmation_given = m.confirmation_given || mm.confirmation_given === true;
    m.timeout_count += mm.timeout_count || 0;
    for (const k of COMM_DIMENSION_KEYS) {
      const d = r.dimensionStats?.[k];
      if (d) { dim[k].opportunity += d.opportunity; dim[k].success += d.success; }
    }
  }
  m.first_decision_latency_ms = first;
  m.average_decision_latency_ms = latWeight > 0 ? Math.round(latWeightedSum / latWeight) : null;
  const dimensions = Object.fromEntries(COMM_DIMENSION_KEYS.map((k) => (
    [k, dim[k].opportunity > 0 ? Math.round((dim[k].success / dim[k].opportunity) * 100) : null]
  )));
  return {
    aggregateSchemaVersion: 'control_room_aggregate_v1',
    gameId: 'control_room',
    completed: results.length > 0,
    scenarioCount: results.length,
    scoredCount: results.filter((r) => r.scored === true).length,
    resolvedCount: results.filter((r) => r.resolved === true).length,
    ...m,
    dimensions,
    scenarios: results.map((r) => ({
      scenarioId: r.scenarioId,
      form: r.form,
      block: r.block,
      scored: r.scored === true,
      resolved: r.resolved === true,
      timeout: (r.metrics?.timeout_count ?? 0) > 0,
      integrityFlags: r.integrityFlags ?? [],
    })),
    integrityFlags: [...new Set(results.flatMap((r) => r.integrityFlags ?? []))],
    aggregateOnly: true,
  };
}

/** Contadores de eventos por tipo (agregado, NO raw events) — solo nombres del whitelist §11. */
function eventCountsFromBuffer(eventBuffer = []) {
  const counts = {};
  for (const e of eventBuffer) {
    if (e && COMM_EVENT_NAMES.has(e.event)) counts[e.event] = (counts[e.event] ?? 0) + 1;
  }
  return counts;
}

/** Registro por escenario (agregado, privacy-safe). */
export function buildControlRoomScenarioRecord(data) {
  const eventCounts = eventCountsFromBuffer(data.eventBuffer);
  const dimensions = Object.fromEntries(COMM_DIMENSION_KEYS.map((k) => {
    const d = data.dimensionStats?.[k];
    return [k, d && d.opportunity > 0 ? Math.round((d.success / d.opportunity) * 100) : null];
  }));
  return {
    scenarioId: data.scenarioId,
    form: data.form ?? null,
    block: data.block,
    practice: data.practice === true,
    scored: data.scored === true,
    resolved: data.resolved === true,
    timeout: (data.metrics?.timeout_count ?? 0) > 0,
    metrics: { ...data.metrics },
    dimensions,
    eventCounts,
    criticalEventCount: (data.eventBuffer ?? []).filter((e) => COMM_CRITICAL_EVENTS.has(e.event)).length,
    integrityFlags: [...(data.integrityFlags ?? [])],
  };
}

/** Registros por bloque (agregado). */
export function buildControlRoomBlockRecords(records) {
  const byBlock = new Map();
  for (const r of records.filter((x) => !x.practice)) {
    if (!byBlock.has(r.block)) byBlock.set(r.block, []);
    byBlock.get(r.block).push(r);
  }
  return [...byBlock.entries()].sort((a, b) => a[0] - b[0]).map(([block, recs]) => ({
    block,
    scenarioIds: recs.map((r) => r.scenarioId),
    scoredCount: recs.filter((r) => r.scored).length,
    resolvedCount: recs.filter((r) => r.resolved).length,
    timeoutCount: recs.reduce((a, r) => a + (r.metrics?.timeout_count ?? 0), 0),
    totalMessageCount: recs.reduce((a, r) => a + (r.metrics?.total_message_count ?? 0), 0),
    dimensions: Object.fromEntries(COMM_DIMENSION_KEYS.map((k) => {
      const opp = recs.reduce((a, r) => a + (r._dimStats?.[k]?.opportunity ?? 0), 0);
      const suc = recs.reduce((a, r) => a + (r._dimStats?.[k]?.success ?? 0), 0);
      return [k, opp > 0 ? Math.round((suc / opp) * 100) : null];
    })),
  }));
}

/** Validación de privacidad del payload (rechaza claves reconstructivas). */
export function validateControlRoomPayloadPrivacy(payload = {}) {
  const violations = hasForbiddenKeys(payload);
  return { ok: violations.length === 0, violations: [...new Set(violations)] };
}

/**
 * Payload de sesión versionado (control_room_session_v1, Doc 1 §19). Solo agregados;
 * SIN score global (dimensiones 7 descriptivas); governance human-review-only.
 * `results` = resultados por escenario evaluado: {scenarioId, form, block, practice, scored,
 * resolved, metrics, dimensionStats, eventBuffer, integrityFlags}.
 */
export function buildControlRoomSessionPayload({
  results = [],
  runId = null,
  batteryId = null,
  resumeCount: resumeCountParam = null,
} = {}) {
  // resumeCount: conteo de RESUME_SESSION en los eventBuffers (política §15/§14.2: nunca
  // ocultar que la sesión fue interrumpida). Se puede forzar con resumeCountParam.
  const resumeCount = typeof resumeCountParam === 'number'
    ? resumeCountParam
    : results.reduce((a, r) => a + (r.eventBuffer ?? []).filter((e) => e?.event === 'RESUME_SESSION').length, 0);
  // Conserva _dimStats para el agregado por bloque (se retira del registro final).
  const enriched = results.map((r) => ({ ...r, _dimStats: r.dimensionStats }));
  const records = enriched.map((r) => {
    const { _dimStats, ...rest } = r;
    return buildControlRoomScenarioRecord(rest);
  });
  const evaluated = records.filter((r) => !r.practice);
  const aggregate = buildControlRoomSessionAggregate(evaluated.map((r) => ({
    scenarioId: r.scenarioId, form: r.form, block: r.block,
    scored: r.scored, resolved: r.resolved, metrics: r.metrics,
    dimensionStats: enriched.find((e) => e.scenarioId === r.scenarioId && e.form === r.form)?.dimensionStats,
    integrityFlags: r.integrityFlags,
  })));
  const integrityFlags = [...new Set(records.flatMap((r) => r.integrityFlags))];
  const payload = {
    payloadVersion: CONTROL_ROOM_PAYLOAD_VERSION,
    experienceId: CONTROL_ROOM_EXPERIENCE_ID,
    buildVersion: CONTROL_ROOM_BUILD_VERSION,
    manifestVersion: CONTROL_ROOM_MANIFEST_VERSION,
    runId,
    batteryId,
    session: {
      evaluatedScenarioCount: evaluated.length,
      practiceScenarioCount: records.length - evaluated.length,
      scoredCount: aggregate.scoredCount,
      resolvedCount: aggregate.resolvedCount,
      resumeCount,
    },
    metrics: Object.fromEntries(Object.entries(aggregate).filter(([k]) => k.endsWith('_ms') || k.endsWith('_count') || k === 'confirmation_requested' || k === 'confirmation_given')),
    dimensions: aggregate.dimensions, // 7, SIN score global
    scenarios: records,
    blocks: buildControlRoomBlockRecords(enriched),
    integrity: {
      flags: integrityFlags,
      allScenariosScored: aggregate.scoredCount === evaluated.length && evaluated.length > 0,
      hasIntegrityIssues: integrityFlags.length > 0,
    },
    privacy: {
      aggregateOnly: true,
      rawEventsStored: false,
      rawActionsStored: false,
      rawBiometricsStored: false,
      eventWhitelistVersion: 'control-room-v1.1',
    },
    governance: {
      humanReviewOnly: true,
      provisional: true,
      noNorms: true,
      descriptiveOnly: true,
      noGlobalScore: true, // §12.2: sin score global
      construct: 'appliedCommunication',
    },
  };
  return { ...payload, privacyValidation: validateControlRoomPayloadPrivacy(payload) };
}
