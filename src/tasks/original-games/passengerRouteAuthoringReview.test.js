import { describe, expect, it } from 'vitest';
import {
  buildPassengerRouteAuthoringReview,
  summarizePassengerRouteAuthoring,
} from './passengerRouteAuthoringReview.js';
import { buildPassengerRouteDemoLevels } from './passengerRouteTelemetry.js';

const FORBIDDEN_AUTHORING_KEYS = new Set([
  'fullRoute',
  'routeTrace',
  'visitedCells',
  'stepByStepPath',
  'rawGameEvents',
  'pointerSamples',
  'walls',
  'passengers',
  'start',
  'destination',
]);

function collectKeys(value, keys = []) {
  if (!value || typeof value !== 'object') return keys;
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, keys);
    return keys;
  }
  for (const [key, child] of Object.entries(value)) {
    keys.push(key);
    collectKeys(child, keys);
  }
  return keys;
}

function expectNoForbiddenAuthoringKeys(value) {
  expect(collectKeys(value).filter((key) => FORBIDDEN_AUTHORING_KEYS.has(key))).toEqual([]);
}

describe('passenger route authoring review', () => {
  it('reviews the current demo levels as solvable, compact, and privacy-safe', () => {
    const review = buildPassengerRouteAuthoringReview({
      levels: buildPassengerRouteDemoLevels(),
      viewport: { width: 606, height: 338 },
    });

    expect(review).toMatchObject({
      moduleId: 'passenger.route-authoring-review',
      gameId: 'passenger_routes',
      status: 'available',
      routeAuthoringStatus: 'valid_for_internal_demo',
      recommendedLevelAction: 'keep_current_levels_for_internal_demo',
      privacy: { authoringOnly: true, rawRoutesUsed: false, authoredGeometryExported: false },
    });
    expect(review.solverConsistency).toMatchObject({
      totalLevels: 3,
      solvableLevels: 3,
      unsolvableLevelIds: [],
      minimumStationUseLevels: 1,
      fairEnergyMarginLevels: 3,
      boardFitLevels: 3,
    });
    expect(review.levelSummaries.every((level) => level.solvable && level.boardFits)).toBe(true);
    expect(review.levelSummaries.map((level) => level.remainingBudget)).toEqual([4, 5, 4]);
    expect(review.levelSummaries.every((level) => level.energyMarginSafe)).toBe(true);
    expectNoForbiddenAuthoringKeys(review);
  });

  it('flags unsolvable authoring without exporting walls, routes, or coordinates', () => {
    const review = buildPassengerRouteAuthoringReview({
      levels: [{
        id: 'blocked-authoring-case',
        cols: 3,
        rows: 3,
        routeBudget: 8,
        start: { x: 1, y: 1 },
        walls: ['0,1', '2,1', '1,0', '1,2'],
        stations: [],
        passengers: [{ id: 'A', x: 0, y: 0, destination: { x: 2, y: 2 } }],
      }],
      viewport: { width: 606, height: 338 },
    });

    expect(review.routeAuthoringStatus).toBe('needs_authoring_fix');
    expect(review.solverConsistency.unsolvableLevelIds).toEqual(['blocked-authoring-case']);
    expect(review.recommendedLevelAction).toMatch(/revisar solvencia/i);
    expectNoForbiddenAuthoringKeys(review);
  });

  it('distinguishes candidate constraint trouble from authoring defects when levels are valid', () => {
    const review = buildPassengerRouteAuthoringReview({
      levels: buildPassengerRouteDemoLevels(),
      aggregate: {
        aggregateOnly: true,
        completed: false,
        passengersDelivered: 1,
        destinationCount: 3,
        routeEfficiency: 0.42,
        movementAttemptCount: 12,
        stationUseCount: 0,
        constraintViolationCount: 4,
      },
    });

    expect(review.routeAuthoringStatus).toBe('valid_for_internal_demo');
    expect(review.candidateOutcomeReview).toBe('candidate_or_instruction_review_not_authoring');
    expect(review.budgetFairnessNote).toMatch(/paradas/i);
  });

  it('provides a compact summary helper for docs and dashboards', () => {
    const summary = summarizePassengerRouteAuthoring(buildPassengerRouteDemoLevels());

    expect(summary).toMatchObject({
      totalLevels: 3,
      solvableLevels: 3,
      authoringStatus: 'valid_for_internal_demo',
    });
    expect(summary.minimumStationUseLevels).toBe(1);
    expect(summary.fairEnergyMarginLevels).toBe(3);
  });
});
