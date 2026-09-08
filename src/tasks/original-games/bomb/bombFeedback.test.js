import { describe, expect, it } from 'vitest';
import { buildBombDefusalFeedback } from './bombFeedback.js';
import { buildBombBlockSummary, generateBombSyntheticSessionPayload } from './bombTelemetry.js';

function expectNoForbiddenKeys(feedback) {
  const serialized = JSON.stringify(feedback);
  expect(serialized).not.toMatch(/"(rawPointerPath|pointerSamples|rawGameEvents|eventLog|trials|actionSequence|sequenceTrace|componentStates)"/i);
}

describe('buildBombDefusalFeedback', () => {
  it('derives protocol-retained from the real engine aggregate (fixture, 4/4 niveles)', () => {
    const payload = generateBombSyntheticSessionPayload({ seed: 42 });
    const aggregate = buildBombBlockSummary(payload, { state: 'SESSION_COMPLETE' });

    const feedback = buildBombDefusalFeedback(aggregate);

    expect(feedback).toMatchObject({
      gameId: 'bomb_defusal',
      moduleId: 'bomb.sequence-defusal-explanation',
      status: 'available',
      feedbackCategory: 'protocol_retained',
      privacy: { aggregateOnly: true, rawEventsUsed: false },
    });
    expect(feedback.diagnostics).toMatchObject({
      levelsCompleted: 4,
      reachedLevelCount: 4,
    });
    expect(feedback.diagnostics.interferenceErrorCount).toBeGreaterThanOrEqual(1); // QA-04: 1 TYPE_INTERFERENCE en L4
    expect(feedback.candidateHint).toMatch(/descriptiva|no como desempeño/i);
    expect(feedback.reviewerCaveat).toMatch(/sin baremos|experimental/i);
    expect(feedback.reviewerCaveat).toMatch(/3\.3/i);
    expectNoForbiddenKeys(feedback);
  });

  it('marks partial sequence execution when some (not most) levels are completed', () => {
    const feedback = buildBombDefusalFeedback({
      aggregateSchemaVersion: 'bomb_defusal_aggregate_v1',
      aggregateOnly: true,
      completed: false,
      reachedLevelCount: 4,
      levelsCompleted: 2,
      levelsFailed: 2,
      totalErrorCount: 3,
      timeoutCount: 1,
      interferenceErrorCount: 0,
    });

    expect(feedback).toMatchObject({ status: 'available', feedbackCategory: 'partial_sequence_execution' });
    expect(feedback.candidateHint).toMatch(/pendiente de validación|descriptivo/i);
    expectNoForbiddenKeys(feedback);
  });

  it('marks sequence-not-completed when no level is completed but some reached', () => {
    const feedback = buildBombDefusalFeedback({
      aggregateOnly: true,
      completed: false,
      reachedLevelCount: 2,
      levelsCompleted: 0,
      levelsFailed: 2,
      totalErrorCount: 2,
      timeoutCount: 2,
      interferenceErrorCount: 0,
    });

    expect(feedback).toMatchObject({ status: 'available', feedbackCategory: 'sequence_not_completed' });
    expect(feedback.candidateHint).toMatch(/revisión humana|human review/i);
    expectNoForbiddenKeys(feedback);
  });

  it('marks incomplete session when no evaluated level was reached', () => {
    const feedback = buildBombDefusalFeedback({
      aggregateOnly: true,
      completed: false,
      reachedLevelCount: 0,
      levelsCompleted: 0,
      levelsFailed: 0,
      totalErrorCount: 0,
      timeoutCount: 0,
      interferenceErrorCount: 0,
    });

    expect(feedback).toMatchObject({ status: 'available', feedbackCategory: 'incomplete_session' });
    expect(feedback.candidateHint).toMatch(/no hay evidencia|no evidence/i);
    expectNoForbiddenKeys(feedback);
  });

  it('rejects non-aggregate, inconsistent or raw-contaminated inputs', () => {
    expect(buildBombDefusalFeedback({ reachedLevelCount: 4, levelsCompleted: 4 }).status).toBe('not_available');
    expect(buildBombDefusalFeedback({ aggregateOnly: true, reachedLevelCount: 2, levelsCompleted: 5 }).status).toBe('not_available');
    const contaminated = buildBombDefusalFeedback({
      aggregateOnly: true,
      reachedLevelCount: 4,
      levelsCompleted: 4,
      rawGameEvents: [{ event: 'ACTION_SWITCH' }],
    });
    expect(contaminated).toMatchObject({ status: 'not_available', feedbackCategory: 'invalid_or_non_aggregate' });
    expectNoForbiddenKeys(contaminated);
  });

  it('keeps the reviewer language experimental (no déficit, sin pesos compuestos §12.1)', () => {
    const feedback = buildBombDefusalFeedback({
      aggregateOnly: true,
      reachedLevelCount: 4,
      levelsCompleted: 4,
      totalErrorCount: 2,
      timeoutCount: 0,
      interferenceErrorCount: 1,
    });
    const text = feedback.candidateHint; // solo el copy del candidato no puede afirmar déficit/diagnóstico
    expect(text).not.toMatch(/déficit|deficit|diagnóstic|diagnos/i);
    // El caveat del revisor SÍ enmarca la no-interpretación (protección §3.3).
    expect(feedback.reviewerCaveat).toMatch(/no se interpretan como déficit|not interpreted as/i);
    expect(feedback.reviewerCaveat).toMatch(/12\.1/i);
    expect(feedback.nextDesignProbe).toMatch(/17\.1/i);
    expect(feedback.candidateHintEn.length).toBeGreaterThan(10);
    expect(feedback.reviewerCaveatEn.length).toBeGreaterThan(10);
  });
});
