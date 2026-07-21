import { describe, expect, it } from 'vitest';
import {
  ORIGINAL_GAME_FEATURE_DEFINITIONS,
  ORIGINAL_GAME_FEATURE_ORDER,
  buildOriginalGameFeatureVector,
  validateOriginalGameFeatureVectorPrivacy,
} from './originalGameFeatureVector.js';

const originalBlocks = Object.freeze([
  {
    index: 0,
    gameId: 'laser_puzzle',
    status: 'completed',
    result: {
      aggregateSchemaVersion: 'laser_puzzle_aggregate_v1',
      score: 0.88,
      completed: true,
      levelCount: 2,
      solvedLevels: 2,
      moveCount: 7,
      solutionEfficiency: 0.9,
      ruleViolationCount: 0,
      timeMs: 74000,
      aggregateOnly: true,
    },
  },
  {
    index: 1,
    gameId: 'balloon_risk',
    status: 'completed',
    result: {
      aggregateSchemaVersion: 'balloon_risk_aggregate_v1',
      score: 0.72,
      completed: true,
      roundsCompleted: 8,
      totalRounds: 8,
      averagePumps: 5.8,
      cashoutCount: 6,
      popCount: 2,
      postPopAdjustment: -1.5,
      postPopAdjustmentCount: 1,
      riskEfficiency: 0.72,
      timeMs: 68000,
      aggregateOnly: true,
    },
  },
  {
    index: 2,
    gameId: 'passenger_routes',
    status: 'completed',
    result: {
      aggregateSchemaVersion: 'passenger_routes_aggregate_v1',
      score: 0.84,
      completed: true,
      passengersDelivered: 3,
      destinationCount: 3,
      routeEfficiency: 0.84,
      movementAttemptCount: 16,
      replanCount: 1,
      stationUseCount: 1,
      constraintViolationCount: 0,
      satisfactionScore: 88,
      timeMs: 92000,
      aggregateOnly: true,
    },
  },
  {
    index: 3,
    gameId: 'team_coordination',
    status: 'completed',
    result: {
      aggregateSchemaVersion: 'team_coordination_aggregate_v1',
      score: 0.86,
      completed: true,
      scenarioCount: 4,
      completedScenarioCount: 4,
      leadershipScore: 0.87,
      communicationScore: 0.88,
      adaptabilityScore: 0.82,
      decisionQualityScore: 0.86,
      alignmentScore: 0.88,
      roleClarityScore: 0.86,
      feedbackUseScore: 0.76,
      changeResponseScore: 0.84,
      timeMs: 96000,
      aggregateOnly: true,
    },
  },
]);

describe('original_game_feature_vector_v1', () => {
  it('documents the aggregate input and rationale for every original-game feature', () => {
    expect(Object.keys(ORIGINAL_GAME_FEATURE_DEFINITIONS)).toEqual(ORIGINAL_GAME_FEATURE_ORDER);
    for (const featureName of ORIGINAL_GAME_FEATURE_ORDER) {
      const definition = ORIGINAL_GAME_FEATURE_DEFINITIONS[featureName];
      expect(definition).toMatchObject({
        sourceGame: expect.any(String),
        aggregateInputs: expect.any(Array),
        metricFormula: expect.any(String),
        metricRationale: expect.any(String),
        constructRelevance: expect.any(String),
        limitations: expect.any(Array),
      });
      expect(definition.aggregateInputs.length).toBeGreaterThan(0);
      expect(definition.metricRationale.length).toBeGreaterThan(24);
      expect(JSON.stringify(definition.aggregateInputs)).not.toMatch(/fullRoute|routeTrace|visitedCells|rawGameEvents|pointerSamples|landmarks|keypoints|trials/i);
    }

    expect(ORIGINAL_GAME_FEATURE_DEFINITIONS['laser.solutionEfficiency'].metricRationale).toMatch(/par|movimientos/i);
    expect(ORIGINAL_GAME_FEATURE_DEFINITIONS['balloon.riskEfficiency'].limitations.join(' ')).toMatch(/personalidad|frustración/i);
    expect(ORIGINAL_GAME_FEATURE_DEFINITIONS['passenger.constraintCompliance'].metricRationale).toMatch(/intentos|violaciones/i);
  });

  it('builds a fixed-order finite vector from aggregate-only original game results', () => {
    const vector = buildOriginalGameFeatureVector({
      blocks: originalBlocks,
      runId: 'r6-vector-test',
      batteryId: 'krumm_postulation_demo_original_games_v1',
    });

    expect(vector).toMatchObject({
      type: 'original_game_feature_vector_v1',
      version: '1.0.0',
      featureDefinitionsVersion: '1.0.0',
      runId: 'r6-vector-test',
      batteryId: 'krumm_postulation_demo_original_games_v1',
      encoding: { missingValue: 0, requiresObservedMask: true },
      privacy: { aggregateOnly: true, rawRoutesStored: false, rawEventsStored: false },
    });
    expect(vector.featureOrder).toEqual(ORIGINAL_GAME_FEATURE_ORDER);
    expect(vector.featureArray).toHaveLength(ORIGINAL_GAME_FEATURE_ORDER.length);
    expect(vector.observedMask).toHaveLength(ORIGINAL_GAME_FEATURE_ORDER.length);
    expect(vector.featureArray.every(Number.isFinite)).toBe(true);
    expect(vector.observedMask.every((value) => value === 0 || value === 1)).toBe(true);
    expect(vector.featureMap['laser.solvedRate']).toBe(1);
    expect(vector.featureMap['laser.solutionEfficiency']).toBe(0.9);
    expect(vector.featureMap['balloon.postLossAdjustmentObserved']).toBe(1);
    expect(vector.featureMap['passenger.deliveryRate']).toBe(1);
    expect(vector.featureMap['passenger.constraintCompliance']).toBe(1);
    expect(vector.gameAvailability).toMatchObject({
      laser_puzzle: 'measured_complete',
      balloon_risk: 'measured_complete',
      passenger_routes: 'measured_complete',
      team_coordination: 'measured_complete',
    });
    expect(vector.featureMap['team.leadershipScore']).toBe(0.87);
    expect(vector.featureMap['team.communicationScore']).toBe(0.88);
    expect(vector.featureMap['team.adaptabilityScore']).toBe(0.82);
    expect(validateOriginalGameFeatureVectorPrivacy(vector)).toEqual({ ok: true, violations: [] });
    expect(JSON.stringify(vector)).not.toMatch(/trials|fullRoute|visitedCells|rawGameEvents|pointerSamples|landmarks|keypoints|freeText|typedResponse|choiceSequence/i);
  });

  it('distinguishes missing games from observed zero values through availability and mask', () => {
    const vector = buildOriginalGameFeatureVector({
      blocks: [
        {
          gameId: 'balloon_risk',
          status: 'completed',
          result: {
            aggregateSchemaVersion: 'balloon_risk_aggregate_v1',
            completed: true,
            roundsCompleted: 8,
            totalRounds: 8,
            averagePumps: 0,
            cashoutCount: 0,
            popCount: 0,
            postPopAdjustment: 0,
            postPopAdjustmentCount: 0,
            riskEfficiency: 0,
            timeMs: 1000,
            aggregateOnly: true,
          },
        },
      ],
    });

    const riskIndex = vector.featureOrder.indexOf('balloon.riskEfficiency');
    const postLossIndex = vector.featureOrder.indexOf('balloon.postLossAdjustment');
    const laserIndex = vector.featureOrder.indexOf('laser.solvedRate');
    expect(vector.featureArray[riskIndex]).toBe(0);
    expect(vector.observedMask[riskIndex]).toBe(1);
    expect(vector.featureAvailability['balloon.riskEfficiency']).toBe('observed');
    expect(vector.featureArray[postLossIndex]).toBe(0);
    expect(vector.observedMask[postLossIndex]).toBe(0);
    expect(vector.featureAvailability['balloon.postLossAdjustment']).toBe('not_observed');
    expect(vector.featureArray[laserIndex]).toBe(0);
    expect(vector.observedMask[laserIndex]).toBe(0);
    expect(vector.gameAvailability.laser_puzzle).toBe('not_administered');
  });

  it('marks inconsistent or non-aggregate game results invalid without fabricating features', () => {
    const vector = buildOriginalGameFeatureVector({
      blocks: [{
        gameId: 'laser_puzzle',
        status: 'completed',
        result: {
          aggregateSchemaVersion: 'laser_puzzle_aggregate_v1',
          completed: true,
          levelCount: 2,
          solvedLevels: 3,
          solutionEfficiency: 1.4,
          ruleViolationCount: 0,
          aggregateOnly: false,
          fullRoute: ['0,0'],
        },
      }],
    });

    expect(vector.gameAvailability.laser_puzzle).toBe('invalid');
    expect(vector.qualityFlags).toEqual(expect.arrayContaining([
      'laser_puzzle_invalid_aggregate',
      'laser_puzzle_contains_forbidden_raw_keys',
    ]));
    expect(vector.featureAvailability['laser.solvedRate']).toBe('invalid');
    expect(vector.observedMask[vector.featureOrder.indexOf('laser.solvedRate')]).toBe(0);
  });
});
