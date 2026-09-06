import { describe, expect, it } from 'vitest';
import { buildTangramReportFeedback } from './tangramReportFeedback.js';

const FIXTURE_AGGREGATE = Object.freeze({
  aggregateSchemaVersion: 'tangram_exp001_aggregate_v1',
  completed: true,
  levelsAttempted: 4,
  completedLevels: 4,
  solvedLevels: 3,
  totalTimeMs: 214000,
  totalMoves: 19,
  totalRotations: 11,
  avgCoveragePercent: 88,
  avgInitialLatencyMs: 3400,
  avgTrajectoryEfficiency: 0.82,
  avgHesitationTimeMs: 900,
  totalMoveOverhead: 3,
  timingPressureHighLatency: false,
  aggregateOnly: true,
});

function expectNoForbiddenKeys(feedback) {
  const serialized = JSON.stringify(feedback);
  expect(serialized).not.toMatch(/"(rawPointerPath|pointerSamples|piecePositions|rawGameEvents|moveTrace|clickTrace|trials)"/i);
}

describe('buildTangramReportFeedback', () => {
  it('derives an efficient-assembly signal from a good fixture aggregate', () => {
    const feedback = buildTangramReportFeedback(FIXTURE_AGGREGATE);

    expect(feedback).toMatchObject({
      gameId: 'tangram_exp001',
      moduleId: 'tangram.assembly-explanation',
      status: 'available',
      feedbackCategory: 'efficient_assembly',
      privacy: { aggregateOnly: true, rawPointerPathUsed: false },
    });
    expect(feedback.diagnostics).toMatchObject({
      solvedRate: 0.75,
      completedRate: 1,
      totalMoves: 19,
      timingPressureHighLatency: false,
    });
    expect(feedback.candidateHint).toMatch(/figuras|rotaciones|piezas/i);
    expect(feedback.reviewerCaveat).toMatch(/sin baremos/i);
    expectNoForbiddenKeys(feedback);
  });

  it('marks move-overhead review when levels complete but few are solved', () => {
    const feedback = buildTangramReportFeedback({
      ...FIXTURE_AGGREGATE,
      solvedLevels: 2,
      completedLevels: 4,
      totalMoves: 31,
    });

    expect(feedback.status).toBe('available');
    expect(feedback.feedbackCategory).toBe('move_overhead_review');
    expect(feedback.candidateHint).toMatch(/movimientos/i);
    expectNoForbiddenKeys(feedback);
  });

  it('marks incomplete assembly when most levels stay unsolved', () => {
    const feedback = buildTangramReportFeedback({
      ...FIXTURE_AGGREGATE,
      solvedLevels: 1,
      completedLevels: 3,
    });

    expect(feedback.status).toBe('available');
    expect(feedback.feedbackCategory).toBe('incomplete_assembly');
    expectNoForbiddenKeys(feedback);
  });

  it('stays not available for non-aggregate or forbidden inputs', () => {
    const nonAggregate = buildTangramReportFeedback({ ...FIXTURE_AGGREGATE, aggregateOnly: false });
    expect(nonAggregate.status).toBe('not_available');
    expect(nonAggregate.feedbackCategory).toBe('invalid_or_non_aggregate');

    const forbidden = buildTangramReportFeedback({ ...FIXTURE_AGGREGATE, piecePositions: [[0, 0], [1, 1]] });
    expect(forbidden.status).toBe('not_available');
    expect(forbidden.feedbackCategory).toBe('invalid_or_non_aggregate');
    expectNoForbiddenKeys(forbidden);
  });

  it('stays not available when core fields are missing or inconsistent', () => {
    expect(buildTangramReportFeedback({}).status).toBe('not_available');
    expect(buildTangramReportFeedback({ ...FIXTURE_AGGREGATE, levelsAttempted: 0 }).status).toBe('not_available');
    expect(buildTangramReportFeedback({ ...FIXTURE_AGGREGATE, solvedLevels: 5 }).status).toBe('not_available');
    expect(buildTangramReportFeedback({ ...FIXTURE_AGGREGATE, completedLevels: 5 }).status).toBe('not_available');
  });
});
