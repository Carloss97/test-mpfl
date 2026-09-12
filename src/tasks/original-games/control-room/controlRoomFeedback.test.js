// C6 (EXP-COMM-001): tests del feedback aggregate-only de la Sala de Control.
// Patrón: bombFeedback.test.js (EXP-BOMB-001). El agregado de referencia es
// GENUINO del motor (payload determinista del guion óptimo, 12 escenarios
// evaluativos) — no inventado a mano.
//
// Reglas que protegen:
// - spec §12.2: 7 sub-dimensiones por separado, SIN score compuesto ni baremos.
// - R-6: señal ausente (dimensión null) = no observada → se OMITE, nunca 0
//   (guard explícito contra Number(null) === 0).
// - Doc 2 §2/§20.1: neutralidad — el feedback no revela la respuesta correcta.
// - Privacidad: solo escalares allowlist del block summary control_room_v1.
import { describe, expect, it } from 'vitest';
import { buildControlRoomFeedback } from './controlRoomFeedback.js';
import { buildControlRoomBlockSummary, generateControlRoomSyntheticSessionPayload } from './controlRoomTelemetry.js';

const DIMENSION_KEYS = [
  'clarity',
  'relevance_and_synthesis',
  'inquiry',
  'verification_closed_loop',
  'adaptation',
  'repair',
  'receptive_understanding',
];

function realEngineAggregate() {
  const payload = generateControlRoomSyntheticSessionPayload({ runId: 'control-room-feedback-test' });
  return buildControlRoomBlockSummary(payload, { state: 'SESSION_COMPLETE' });
}

function expectNoForbiddenKeys(feedback) {
  const serialized = JSON.stringify(feedback);
  expect(serialized).not.toMatch(/"(rawPointerPath|pointerSamples|rawGameEvents|eventLog|eventCounts|trials|scenarios|actions|messageText|cardTexts|blockTexts|npcMessages|freeText|typedResponse|frames|facePoints)"\s*:/i);
}

describe('buildControlRoomFeedback', () => {
  it('derives coordination_effective from the real engine aggregate (guion óptimo 12/12)', () => {
    const feedback = buildControlRoomFeedback(realEngineAggregate());

    expect(feedback).toMatchObject({
      gameId: 'control_room',
      moduleId: 'control-room.applied-communication-explanation',
      status: 'available',
      feedbackCategory: 'coordination_effective',
      privacy: { aggregateOnly: true, rawEventsUsed: false, rawBiometricsStored: false },
    });
    expect(feedback.diagnostics).toMatchObject({
      scenarioCount: 12,
      scoredCount: 12,
      resolvedCount: 12,
      totalMessages: 26,
    });
    expect(feedback.candidateHint).toMatch(/descriptiva/i);
    expect(feedback.candidateHintEn).toMatch(/descriptive/i);
    expect(feedback.reviewerCaveat).toMatch(/experimental/i);
    expect(feedback.reviewerCaveat).not.toMatch(/30-50/i);
    expect(feedback.reviewerCaveat).toMatch(/§17\.1/i);
    expect(feedback.nextDesignProbe).toMatch(/§17\.1/i);
    expectNoForbiddenKeys(feedback);
  });

  it('lists only OBSERVED dimensions — null is omitted, never 0 (R-6)', () => {
    const aggregate = realEngineAggregate();
    // El guion óptimo del motor no presenta oportunidades de reparación ni
    // receptivas en todos los bloques: esas dimensiones salen null.
    const observed = DIMENSION_KEYS.filter((key) => aggregate[key] != null);
    const absent = DIMENSION_KEYS.filter((key) => aggregate[key] == null);
    expect(observed.length).toBeGreaterThan(0);
    expect(absent.length).toBeGreaterThan(0);

    const feedback = buildControlRoomFeedback(aggregate);
    const listed = feedback.dimensionFeedback.map((entry) => entry.dimension);
    for (const key of observed) expect(listed).toContain(key);
    for (const key of absent) expect(listed).not.toContain(key);
    for (const entry of feedback.dimensionFeedback) {
      expect(Number.isFinite(entry.score)).toBe(true);
      expect(entry.score).toBeGreaterThanOrEqual(0);
      expect(entry.score).toBeLessThanOrEqual(100);
      expect(entry.whyEs).toBeTruthy();
      expect(entry.whyEn).toBeTruthy();
    }
    expectNoForbiddenKeys(feedback);
  });

  it('drops every dimension when all are null (no fake zeros)', () => {
    const aggregate = realEngineAggregate();
    for (const key of DIMENSION_KEYS) aggregate[key] = null;
    const feedback = buildControlRoomFeedback(aggregate);
    expect(feedback.status).toBe('available');
    expect(feedback.dimensionFeedback).toEqual([]);
    expectNoForbiddenKeys(feedback);
  });

  it('marks partial_coordination when some (not most) incidents are resolved', () => {
    const feedback = buildControlRoomFeedback({ ...realEngineAggregate(), scoredCount: 12, resolvedCount: 5 });
    expect(feedback).toMatchObject({ status: 'available', feedbackCategory: 'partial_coordination' });
    expect(feedback.candidateHint).toMatch(/descriptivo|pendiente de validación/i);
    expectNoForbiddenKeys(feedback);
  });

  it('marks coordination_review when no incident is resolved', () => {
    const feedback = buildControlRoomFeedback({ ...realEngineAggregate(), scoredCount: 12, resolvedCount: 0 });
    expect(feedback).toMatchObject({ status: 'available', feedbackCategory: 'coordination_review' });
    expect(feedback.candidateHint).toMatch(/revisión humana/i);
    // La negativa explícita ("No es una norma...") es el copy correcto de neutralidad.
    expect(feedback.candidateHint).toMatch(/no es una norma/i);
    expectNoForbiddenKeys(feedback);
  });

  it('marks incomplete_session when no scenario was scored', () => {
    const feedback = buildControlRoomFeedback({ ...realEngineAggregate(), scoredCount: 0 });
    expect(feedback).toMatchObject({ status: 'available', feedbackCategory: 'incomplete_session' });
    expect(feedback.candidateHint).toMatch(/no hay evidencia/i);
    expectNoForbiddenKeys(feedback);
  });

  it('is not_available for non-aggregate input (aggregateOnly missing)', () => {
    const feedback = buildControlRoomFeedback({ ...realEngineAggregate(), aggregateOnly: false });
    expect(feedback).toMatchObject({ status: 'not_available', feedbackCategory: 'invalid_or_non_aggregate' });
    expect(feedback.dimensionFeedback).toEqual([]);
    expect(feedback.privacy).toMatchObject({ aggregateOnly: false, rawEventsUsed: false, rawBiometricsStored: false });
    expectNoForbiddenKeys(feedback);
  });

  it('is not_available when forbidden raw keys leak into the aggregate', () => {
    const feedback = buildControlRoomFeedback({ ...realEngineAggregate(), messageText: 'presión en V3' });
    expect(feedback).toMatchObject({ status: 'not_available', feedbackCategory: 'invalid_or_non_aggregate' });
    const serialized = JSON.stringify(feedback);
    expect(serialized).not.toContain('presión en V3');
  });

  it('is not_available for empty/missing aggregates', () => {
    expect(buildControlRoomFeedback(null)).toMatchObject({ status: 'not_available' });
    expect(buildControlRoomFeedback({})).toMatchObject({ status: 'not_available' });
    expect(buildControlRoomFeedback({ aggregateOnly: true, scenarioCount: 0 })).toMatchObject({ status: 'not_available', feedbackCategory: 'incomplete_session' });
  });
});
