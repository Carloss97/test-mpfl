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
      featureDefinitionsVersion: '2.3.0',
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

  it('clamps over-delivered passenger aggregates instead of invalidating the whole planning signal', () => {
    const vector = buildOriginalGameFeatureVector({
      blocks: [{
        gameId: 'passenger_routes',
        status: 'completed',
        result: {
          aggregateSchemaVersion: 'passenger_routes_aggregate_v1',
          completed: true,
          passengersDelivered: 6,
          destinationCount: 5,
          routeEfficiency: 0.65,
          movementAttemptCount: 65,
          replanCount: 0,
          stationUseCount: 6,
          constraintViolationCount: 8,
          satisfactionScore: 25,
          timeMs: 27998,
          aggregateOnly: true,
        },
      }],
    });

    expect(vector.gameAvailability.passenger_routes).toBe('measured_complete');
    expect(vector.featureMap['passenger.deliveryRate']).toBe(1);
    expect(vector.featureAvailability['passenger.routeEfficiency']).toBe('observed');
    expect(vector.qualityFlags).toContain('passenger_routes_delivery_count_clamped');
  });

  // ── BOMB (EXP-BOMB-001, B6): delta aditivo en original_game_feature_vector ──

  const validBombResult = Object.freeze({
    aggregateSchemaVersion: 'bomb_defusal_aggregate_v1',
    completed: true,
    aggregateOnly: true,
    reachedLevelCount: 4,
    levelsCompleted: 4,
    levelsFailed: 0,
    totalErrorCount: 1,
    retentionAccuracyRate: 0.9,
    serialPositionAccuracy: 0.95,
    firstActionLatencyMs: 820,
    interStepLatencyMedianMs: 610,
    interferenceErrorCount: 1,
    switchCostMs: 1344,
    holdDurationErrorMs: 0,
    memoryDecaySlope: -0.02,
    timeoutRate: 0,
    errorRecoveryLatencyMs: 900,
    timeMs: 55100,
    seed: 42,
  });

  it('adds BOMB as an additive delta: first 41 features keep order, 12 bomb.* appended (no breaking)', () => {
    const vector = buildOriginalGameFeatureVector({ blocks: originalBlocks, runId: 'b6-no-bomb' });
    // Sin BOMB: las 12 bomb.* en 0 + mask 0 + not_observed; el resto intacto.
    expect(vector.featureOrder[40]).toBe('tangram.totalTimeMs');
    expect(vector.featureOrder.slice(41, 53)).toEqual([
      'bomb.completion',
      'bomb.retentionAccuracyRate',
      'bomb.serialPositionAccuracy',
      'bomb.firstActionLatencyMs',
      'bomb.interStepLatencyMedianMs',
      'bomb.interferenceErrorCount',
      'bomb.switchCostMs',
      'bomb.holdDurationErrorMs',
      'bomb.memoryDecaySlope',
      'bomb.timeoutRate',
      'bomb.errorRecoveryLatencyMs',
      'bomb.timeMs',
    ]);
    expect(vector.featureArray).toHaveLength(60);
    expect(vector.featureArray.every(Number.isFinite)).toBe(true);
    expect(vector.gameAvailability.bomb_defusal).toBe('not_administered');
    for (const key of vector.featureOrder.filter((feature) => feature.startsWith('bomb.'))) {
      expect(vector.featureMap[key]).toBeNull(); // raw map: null = no observado
      expect(vector.featureArray[vector.featureOrder.indexOf(key)]).toBe(0); // encoding: 0
      expect(vector.featureAvailability[key]).toBe('not_observed');
    }
    // Las features anteriores no cambian con el delta.
    expect(vector.featureMap['laser.solvedRate']).toBe(1);
    expect(vector.featureMap['passenger.deliveryRate']).toBe(1);
  });

  it('observes bomb.* from a valid BOMB aggregate (measured_complete)', () => {
    const vector = buildOriginalGameFeatureVector({
      blocks: [{ index: 0, gameId: 'bomb_defusal', status: 'completed', result: validBombResult }],
      runId: 'b6-bomb-vector',
    });
    expect(vector.gameAvailability.bomb_defusal).toBe('measured_complete');
    expect(vector.featureMap['bomb.completion']).toBe(1);
    expect(vector.featureMap['bomb.retentionAccuracyRate']).toBe(0.9);
    expect(vector.featureMap['bomb.serialPositionAccuracy']).toBe(0.95);
    expect(vector.featureMap['bomb.firstActionLatencyMs']).toBe(820);
    expect(vector.featureMap['bomb.interferenceErrorCount']).toBe(1);
    expect(vector.featureMap['bomb.switchCostMs']).toBe(1344);
    // memory_decay_slope negativo (decaimiento) y timeout_rate 0 observado (no ausente):
    expect(vector.featureMap['bomb.memoryDecaySlope']).toBe(-0.02);
    expect(vector.featureAvailability['bomb.memoryDecaySlope']).toBe('observed');
    expect(vector.featureMap['bomb.timeoutRate']).toBe(0);
    expect(vector.featureAvailability['bomb.timeoutRate']).toBe('observed');
    expect(vector.observedMask[vector.featureOrder.indexOf('bomb.completion')]).toBe(1);
    expect(validateOriginalGameFeatureVectorPrivacy(vector)).toEqual({ ok: true, violations: [] });
    expect(JSON.stringify(vector)).not.toMatch(/rawGameEvents|pointerSamples|eventLog|trials/i);
  });

  it('treats a partially completed BOMB session as measured_partial (0 completions is observed, not missing)', () => {
    const vector = buildOriginalGameFeatureVector({
      blocks: [{
        gameId: 'bomb_defusal',
        status: 'completed',
        result: {
          aggregateSchemaVersion: 'bomb_defusal_aggregate_v1',
          completed: false,
          aggregateOnly: true,
          reachedLevelCount: 3,
          levelsCompleted: 1,
          levelsFailed: 2,
          retentionAccuracyRate: 0.5,
          serialPositionAccuracy: 0.6,
          timeoutRate: 0.67,
          timeMs: 40000,
        },
      }],
    });
    expect(vector.gameAvailability.bomb_defusal).toBe('measured_partial');
    expect(vector.featureMap['bomb.completion']).toBe(0);
    expect(vector.featureAvailability['bomb.completion']).toBe('observed');
    expect(vector.featureMap['bomb.retentionAccuracyRate']).toBe(0.5);
  });

  it('marks invalid or non-aggregate BOMB results invalid without fabricating features', () => {
    const invalidAggregate = buildOriginalGameFeatureVector({
      blocks: [{
        gameId: 'bomb_defusal',
        status: 'completed',
        result: {
          aggregateSchemaVersion: 'bomb_defusal_aggregate_v1',
          completed: true,
          aggregateOnly: false,
          reachedLevelCount: 4,
          levelsCompleted: 4,
          rawGameEvents: [{ event: 'ACTION_SWITCH' }],
        },
      }],
    });
    expect(invalidAggregate.gameAvailability.bomb_defusal).toBe('invalid');
    expect(invalidAggregate.qualityFlags).toEqual(expect.arrayContaining([
      'bomb_defusal_invalid_aggregate',
      'bomb_defusal_contains_forbidden_raw_keys',
    ]));
    expect(invalidAggregate.featureAvailability['bomb.completion']).toBe('invalid');

    const outOfRange = buildOriginalGameFeatureVector({
      blocks: [{
        gameId: 'bomb_defusal',
        status: 'completed',
        result: {
          aggregateSchemaVersion: 'bomb_defusal_aggregate_v1',
          completed: true,
          aggregateOnly: true,
          reachedLevelCount: 4,
          levelsCompleted: 4,
          retentionAccuracyRate: 1.4,
        },
      }],
    });
    expect(outOfRange.gameAvailability.bomb_defusal).toBe('invalid');
  });

  it('adds CONTROL ROOM as an additive delta: first 53 keep order, 7 comm.* appended (no breaking)', () => {
    const vector = buildOriginalGameFeatureVector({ blocks: originalBlocks, runId: 'c5-no-control-room' });
    expect(vector.featureOrder[52]).toBe('bomb.timeMs');
    expect(vector.featureOrder.slice(53)).toEqual([
      'comm.clarity',
      'comm.relevance_and_synthesis',
      'comm.inquiry',
      'comm.verification_closed_loop',
      'comm.adaptation',
      'comm.repair',
      'comm.receptive_understanding',
    ]);
    expect(vector.featureArray).toHaveLength(60);
    expect(vector.gameAvailability.control_room).toBe('not_administered');
    for (const key of vector.featureOrder.filter((f) => f.startsWith('comm.'))) {
      expect(vector.featureMap[key]).toBeNull();
      expect(vector.featureArray[vector.featureOrder.indexOf(key)]).toBe(0);
      expect(vector.featureAvailability[key]).toBe('not_observed');
    }
    expect(vector.featureMap['laser.solvedRate']).toBe(1); // features anteriores intactos
  });

  it('sets comm.* from a valid control_room block summary (dimension/100, 0-1)', () => {
    const blocks = [
      ...originalBlocks,
      {
        index: 4,
        gameId: 'control_room',
        status: 'completed',
        result: {
          aggregateSchemaVersion: 'control_room_block_summary_v1',
          completed: true,
          scenarioCount: 12,
          scoredCount: 12,
          resolvedCount: 10,
          total_message_count: 40,
          question_count: 6,
          verification_count: 8,
          timeout_count: 0,
          clarity: 90,
          relevance_and_synthesis: 75,
          inquiry: 80,
          verification_closed_loop: 70,
          adaptation: 60,
          repair: 50,
          receptive_understanding: 85,
          aggregateOnly: true,
        },
      },
    ];
    const vector = buildOriginalGameFeatureVector({ blocks, runId: 'c5-with-control-room' });
    expect(vector.gameAvailability.control_room).toBe('measured_complete');
    expect(vector.featureMap['comm.clarity']).toBeCloseTo(0.9, 5);
    expect(vector.featureMap['comm.relevance_and_synthesis']).toBeCloseTo(0.75, 5);
    expect(vector.featureMap['comm.inquiry']).toBeCloseTo(0.8, 5);
    expect(vector.featureMap['comm.verification_closed_loop']).toBeCloseTo(0.7, 5);
    expect(vector.featureMap['comm.adaptation']).toBeCloseTo(0.6, 5);
    expect(vector.featureMap['comm.repair']).toBeCloseTo(0.5, 5);
    expect(vector.featureMap['comm.receptive_understanding']).toBeCloseTo(0.85, 5);
    expect(vector.observedMask[vector.featureOrder.indexOf('comm.clarity')]).toBe(1);
    expect(vector.featureDefinitionsVersion).toBe('2.3.0');
    expect(validateOriginalGameFeatureVectorPrivacy(vector)).toEqual({ ok: true, violations: [] });
  });

  it('marks an invalid control_room aggregate (dim out of range) invalid without fabricating comm.*', () => {
    const invalid = buildOriginalGameFeatureVector({
      blocks: [{
        gameId: 'control_room',
        status: 'completed',
        result: {
          aggregateSchemaVersion: 'control_room_block_summary_v1',
          completed: true,
          scenarioCount: 12,
          clarity: 120, // fuera de rango [0,100]
          aggregateOnly: true,
        },
      }],
    });
    expect(invalid.gameAvailability.control_room).toBe('invalid');
    expect(invalid.featureAvailability['comm.clarity']).toBe('invalid');
  });
});
