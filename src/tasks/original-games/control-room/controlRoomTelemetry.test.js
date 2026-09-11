// controlRoomTelemetry.test.js — EXP-COMM-001 · C4: telemetría de sesión + payload + privacidad.
//
// Contracto C4 (plan; card t_09618a1b):
//   - 18 eventos §11 (whitelist; contadores agregados, nunca raw events).
//   - Métricas 11 §12.1 + dimensiones 7 §12.2 (SIN score global) agregadas a sesión.
//   - Payload JSON §19 (control_room_session_v1) con privacidad + gobernanza.
//   - Integrity flags §14.2 unidos; VISIBILITY_CHANGE contabilizado.
//   - Práctica (block 0) no entra al agregado evaluativo.

import { describe, it, expect } from 'vitest';
import {
  buildControlRoomSessionAggregate,
  buildControlRoomScenarioRecord,
  buildControlRoomSessionPayload,
  validateControlRoomPayloadPrivacy,
  CONTROL_ROOM_PAYLOAD_VERSION,
} from './controlRoomTelemetry.js';
import { COMM_EVENT_NAMES, COMM_DIMENSION_KEYS } from './controlRoomTaxonomy.js';

function makeMetrics(over = {}) {
  return {
    first_decision_latency_ms: 1000, average_decision_latency_ms: 1200, time_spent_reading_ms: 900,
    pre_send_edit_count: 1, pre_send_reorder_count: 0, total_message_count: 2, question_count: 1,
    verification_count: 1, confirmation_requested: true, confirmation_given: true, timeout_count: 0,
    ...over,
  };
}

function dim(clarity = { opportunity: 2, success: 2 }) {
  const base = Object.fromEntries(COMM_DIMENSION_KEYS.map((k) => [k, { opportunity: 0, success: 0 }]));
  base.clarity = clarity;
  return base;
}

function makeEventBuffer() {
  return [
    { t_ms: 0, event: 'SCENARIO_START' },
    { t_ms: 10, event: 'NPC_MSG_SHOWN' },
    { t_ms: 500, event: 'CARD_SELECTED' },
    { t_ms: 800, event: 'MESSAGE_SEND' },
    { t_ms: 1100, event: 'NPC_REPLY_SHOWN' },
    { t_ms: 1200, event: 'VISIBILITY_CHANGE' },
    { t_ms: 1500, event: 'CONSEQUENCE_SHOWN' },
    { t_ms: 900, event: 'BOGUS_EVENT_NOT_IN_WHITELIST' }, // debe excluirse de eventCounts
  ];
}

function makeResult(over = {}) {
  return {
    scenarioId: 'CR-L1-S01', form: 'A', block: 1, practice: false, scored: true, resolved: true,
    metrics: makeMetrics(), dimensionStats: dim(), eventBuffer: makeEventBuffer(), integrityFlags: [],
    ...over,
  };
}

describe('controlRoomTelemetry (EXP-COMM-001 C4)', () => {
  it('whitelist: 18 eventos canónicos; eventCounts excluye eventos no conocidos', () => {
    expect(COMM_EVENT_NAMES.size).toBe(18);
    const rec = buildControlRoomScenarioRecord(makeResult());
    expect(rec.eventCounts.MESSAGE_SEND).toBe(1);
    expect(rec.eventCounts.VISIBILITY_CHANGE).toBe(1);
    expect(rec.eventCounts.NPC_MSG_SHOWN).toBe(1);
    expect(rec.eventCounts.BOGUS_EVENT_NOT_IN_WHITELIST).toBeUndefined();
    // crítico: NPC_MSG_SHOWN, MESSAGE_SEND, NPC_REPLY_SHOWN contabilizados
    expect(rec.criticalEventCount).toBeGreaterThanOrEqual(3);
  });

  it('registro por escenario: agregado privacy-safe (métricas 11 + dimensiones 7 + flags, sin raw)', () => {
    const rec = buildControlRoomScenarioRecord(makeResult());
    expect(rec.scenarioId).toBe('CR-L1-S01');
    expect(rec.practice).toBe(false);
    expect(rec.scored).toBe(true);
    // 11 métricas presentes
    for (const k of ['first_decision_latency_ms', 'total_message_count', 'question_count',
      'verification_count', 'confirmation_requested', 'confirmation_given', 'timeout_count']) {
      expect(rec.metrics).toHaveProperty(k);
    }
    // 7 dimensiones (clarity=100 por 2/2, resto null)
    expect(rec.dimensions.clarity).toBe(100);
    expect(rec.dimensions.inquiry).toBeNull();
    // sin campos raw prohibidos
    expect(rec.eventBuffer).toBeUndefined();
    expect(rec.actions).toBeUndefined();
    expect(validateControlRoomPayloadPrivacy(rec).ok).toBe(true);
  });

  it('payload de sesión: version, métricas 11 + dimensiones 7 (sin global), integrity unida, governance', () => {
    const results = [
      makeResult(),
      makeResult({
        scenarioId: 'CR-L1-S01-B', form: 'B', resolved: false,
        metrics: makeMetrics({ timeout_count: 1, first_decision_latency_ms: 500, average_decision_latency_ms: 800, total_message_count: 1 }),
        integrityFlags: ['timeout_no_score'],
      }),
    ];
    const { payload, privacyValidation } = (() => {
      const p = buildControlRoomSessionPayload({ results, runId: 'run-1', batteryId: 'krumm_postulation_demo_original_games_v1' });
      return { payload: p, privacyValidation: p.privacyValidation };
    })();
    const p = payload;
    expect(p.payloadVersion).toBe(CONTROL_ROOM_PAYLOAD_VERSION);
    expect(p.experienceId).toBe('EXP-COMM-001');
    expect(p.session.evaluatedScenarioCount).toBe(2);
    expect(p.session.practiceScenarioCount).toBe(0);
    expect(p.session.scoredCount).toBe(2);
    expect(p.session.resolvedCount).toBe(1);
    // métricas agregadas
    expect(p.metrics.total_message_count).toBe(3); // 2+1
    expect(p.metrics.timeout_count).toBe(1);
    expect(p.metrics.first_decision_latency_ms).toBe(500); // min(1000,500)
    // 7 dimensiones, claridad 100 (4/4)
    expect(p.dimensions.clarity).toBe(100);
    expect(Object.keys(p.dimensions)).toHaveLength(7);
    expect(p).not.toHaveProperty('globalScore');
    expect(p).not.toHaveProperty('overallScore');
    // integrity unida
    expect(p.integrity.flags).toContain('timeout_no_score');
    expect(p.integrity.hasIntegrityIssues).toBe(true);
    // per-block (bloque 1, 2 escenarios)
    expect(p.blocks).toHaveLength(1);
    expect(p.blocks[0].block).toBe(1);
    expect(p.blocks[0].scenarioIds).toHaveLength(2);
    // privacidad + gobernanza
    expect(privacyValidation.ok).toBe(true);
    expect(p.privacy.aggregateOnly).toBe(true);
    expect(p.privacy.rawEventsStored).toBe(false);
    expect(p.governance.humanReviewOnly).toBe(true);
    expect(p.governance.noGlobalScore).toBe(true);
    expect(p.governance.construct).toBe('appliedCommunication');
  });

  it('práctica no entra al agregado evaluativo (solo contada como práctica)', () => {
    const results = [
      makeResult({ scenarioId: 'CR-PRACTICE-01', block: 0, practice: true, scored: false }),
      makeResult(),
    ];
    const p = buildControlRoomSessionPayload({ results });
    expect(p.session.evaluatedScenarioCount).toBe(1);
    expect(p.session.practiceScenarioCount).toBe(1);
    expect(p.metrics.total_message_count).toBe(2); // solo el evaluado
    // la práctica aparece en scenarios con practice:true
    expect(p.scenarios.find((s) => s.scenarioId === 'CR-PRACTICE-01').practice).toBe(true);
  });

  it('privacidad: un payload con campos crudos prohibidos es rechazado', () => {
    const bad = { session: { messageText: 'cierra V3', rawEvents: [{ event: 'X' }] } };
    const v = validateControlRoomPayloadPrivacy(bad);
    expect(v.ok).toBe(false);
    expect(v.violations).toEqual(expect.arrayContaining(['messageText', 'rawEvents']));
  });

  it('agregado vacío: completed false, dimensiones null, payload válido', () => {
    const agg = buildControlRoomSessionAggregate([]);
    expect(agg.completed).toBe(false);
    expect(agg.dimensions.clarity).toBeNull();
    const p = buildControlRoomSessionPayload({ results: [] });
    expect(p.session.evaluatedScenarioCount).toBe(0);
    expect(p.privacyValidation.ok).toBe(true);
    expect(p.integrity.allScenariosScored).toBe(false);
  });
});
