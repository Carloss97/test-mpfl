import { describe, expect, it } from 'vitest';
import {
  buildLaserPuzzleAuthoringReview,
  summarizeLaserPuzzleAuthoring,
} from './laserPuzzleAuthoringReview.js';
import { buildLaserDemoLevels } from './laserPuzzleTelemetry.js';

const FORBIDDEN_AUTHORING_KEYS = new Set([
  'cells',
  'solutionPlacements',
  'beamCells',
  'litAntennas',
  'visited',
  'grid',
  'rawGameEvents',
  'pointerSamples',
  'clickTrace',
]);

function expectNoForbiddenKeys(value) {
  const stack = [value];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== 'object') continue;
    for (const [key, child] of Object.entries(current)) {
      expect(FORBIDDEN_AUTHORING_KEYS.has(key)).toBe(false);
      if (child && typeof child === 'object') stack.push(child);
    }
  }
}

describe('laser puzzle authoring review', () => {
  it('reviews the product-ready Laser sequence as progressive, solvable and privacy-safe', () => {
    const review = buildLaserPuzzleAuthoringReview(buildLaserDemoLevels());

    expect(review).toMatchObject({
      schemaVersion: 'laser_puzzle_authoring_review_v1',
      levelAuthoringStatus: 'valid_for_internal_demo',
      recommendedLevelAction: 'keep_current_levels_for_internal_demo',
      privacy: { authoringOnly: true, rawBeamUsed: false, authoredGeometryExported: false },
    });
    expect(review.solverConsistency).toMatchObject({
      totalLevels: 3,
      solvedByAuthoredPlacements: 3,
      boardFitLevels: 3,
      multiObjectiveLevels: 1,
      portalRoutingLevels: 2,
      parCalibratedLevels: 3,
      unresolvedLevelIds: [],
    });
    expect(review.levelSummaries.map((level) => level.name)).toEqual([
      'Órbita quebrada',
      'Salto cuántico',
      'Nexo gemelo',
    ]);
    expect(review.levelSummaries[0]).toMatchObject({ challengeType: 'single_target_reflection', authoredMoveCount: 4, usesPortal: false });
    expect(review.levelSummaries[1]).toMatchObject({ challengeType: 'portal_routing', authoredMoveCount: 5, usesPortal: true });
    expect(review.levelSummaries[2]).toMatchObject({ challengeType: 'multi_target_splitter', antennaCount: 2, authoredMoveCount: 6, usesPortal: true });
    expectNoForbiddenKeys(review);
  });

  it('flags levels that cannot be solved by their authored placements', () => {
    const broken = buildLaserDemoLevels().map((level, index) => (index === 0
      ? { ...level, solutionPlacements: [] }
      : level));

    const review = buildLaserPuzzleAuthoringReview(broken);

    expect(review.levelAuthoringStatus).toBe('needs_authoring_review');
    expect(review.recommendedLevelAction).toBe('revise_unsolved_or_unfitted_levels_before_candidate_use');
    expect(review.solverConsistency.unresolvedLevelIds).toEqual(['laser-v2-1-orbita-quebrada']);
    expect(review.levelSummaries[0]).toMatchObject({ solvedByAuthoredPlacements: false });
    expectNoForbiddenKeys(review);
  });

  it('marks par calibration caveats without requiring raw beam or movement history', () => {
    const overGenerousPar = buildLaserDemoLevels().map((level, index) => (index === 1
      ? { ...level, par: 16 }
      : level));

    const review = buildLaserPuzzleAuthoringReview(overGenerousPar);

    expect(review.levelAuthoringStatus).toBe('needs_authoring_review');
    expect(review.levelSummaries[1]).toMatchObject({
      parStatus: 'too_generous',
      authoredMoveCount: 5,
      par: 16,
    });
    expect(review.parCalibrationNote).toMatch(/revisar par/i);
    expectNoForbiddenKeys(review);
  });

  it('provides a compact summary helper for docs and technical drawer', () => {
    const summary = summarizeLaserPuzzleAuthoring(buildLaserDemoLevels());

    expect(summary).toMatchObject({
      totalLevels: 3,
      solvedLevels: 3,
      authoringStatus: 'valid_for_internal_demo',
      multiObjectiveLevels: 1,
      portalRoutingLevels: 2,
      recommendedLevelAction: 'keep_current_levels_for_internal_demo',
    });
  });
});
