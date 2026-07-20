import { describe, expect, it } from 'vitest';
import { buildOriginalGameFeatureVector } from './originalGameFeatureVector.js';
import {
  WORKBOOK_TALENT_CONSTRUCT_ORDER,
  buildOriginalGameTalentFramework,
} from './originalGameTalentMapping.js';

function vectorFromResults({ laserEfficiency = 0.9, passengerEfficiency = 0.84, balloonRisk = 0.72 } = {}) {
  return buildOriginalGameFeatureVector({
    blocks: [
      {
        gameId: 'laser_puzzle',
        status: 'completed',
        result: {
          aggregateSchemaVersion: 'laser_puzzle_aggregate_v1',
          completed: true,
          levelCount: 2,
          solvedLevels: 2,
          moveCount: 7,
          solutionEfficiency: laserEfficiency,
          ruleViolationCount: 0,
          timeMs: 74000,
          aggregateOnly: true,
        },
      },
      {
        gameId: 'balloon_risk',
        status: 'completed',
        result: {
          aggregateSchemaVersion: 'balloon_risk_aggregate_v1',
          completed: true,
          roundsCompleted: 8,
          totalRounds: 8,
          averagePumps: 5.8,
          cashoutCount: 6,
          popCount: 2,
          postPopAdjustment: -1.5,
          postPopAdjustmentCount: 1,
          riskEfficiency: balloonRisk,
          timeMs: 68000,
          aggregateOnly: true,
        },
      },
      {
        gameId: 'passenger_routes',
        status: 'completed',
        result: {
          aggregateSchemaVersion: 'passenger_routes_aggregate_v1',
          completed: true,
          passengersDelivered: 3,
          destinationCount: 3,
          routeEfficiency: passengerEfficiency,
          movementAttemptCount: 16,
          replanCount: 1,
          stationUseCount: 1,
          constraintViolationCount: 0,
          satisfactionScore: 88,
          timeMs: 92000,
          aggregateOnly: true,
        },
      },
    ],
    runId: 'r6-mapping-test',
    batteryId: 'krumm_postulation_demo_original_games_v1',
  });
}

describe('krumm_workbook_talent_framework_v1', () => {
  it('maps original-game features to workbook constructs without altering DG dimensions', () => {
    const framework = buildOriginalGameTalentFramework({
      originalGameFeatureVector: vectorFromResults(),
      generatedAt: '2026-07-18T22:00:00.000Z',
    });

    expect(framework).toMatchObject({
      schemaVersion: 'krumm_workbook_talent_framework_v1',
      version: '1.0.0',
      status: 'provisional',
      generatedAt: '2026-07-18T22:00:00.000Z',
      sourceVector: { type: 'original_game_feature_vector_v1', version: '1.0.0' },
      classification: { strengths: null, watchAreas: null, availability: 'not_available_without_norms' },
    });
    expect(framework.constructOrder).toEqual(WORKBOOK_TALENT_CONSTRUCT_ORDER);
    expect(framework.constructs.problemSolving).toMatchObject({
      availability: 'provisional_score',
      confidenceCeiling: 0.5,
      caveats: expect.arrayContaining(['provisional_mapping_requires_validation']),
    });
    expect(framework.constructs.problemSolving.score).toBeGreaterThan(80);
    expect(framework.constructs.planning.score).toBeGreaterThan(80);
    expect(framework.constructs.analyticalThinking.score).toBeGreaterThan(80);
    expect(framework.constructs.leadership).toMatchObject({ score: null, confidence: 0, availability: 'not_measured' });
    expect(framework.constructs.communication).toMatchObject({ score: null, confidence: 0, availability: 'not_measured' });
  });

  it('does not convert higher risk-taking into a better talent score', () => {
    const lowRisk = buildOriginalGameTalentFramework({ originalGameFeatureVector: vectorFromResults({ balloonRisk: 0.2 }) });
    const highRisk = buildOriginalGameTalentFramework({ originalGameFeatureVector: vectorFromResults({ balloonRisk: 0.95 }) });

    expect(lowRisk.constructs.decisionMaking.score).toBeNull();
    expect(highRisk.constructs.decisionMaking.score).toBeNull();
    expect(lowRisk.constructs.riskFeedbackProfile.score).toBeNull();
    expect(highRisk.constructs.riskFeedbackProfile.score).toBeNull();
    expect(JSON.stringify(highRisk.constructs.riskFeedbackProfile.evidence)).toContain('balloon.riskEfficiency');
    expect(highRisk.constructs.riskFeedbackProfile.caveats).toContain('frustration_tolerance_not_measured');
  });

  it('requires complete Laser and Passenger evidence instead of silently reweighting missing data', () => {
    const vector = buildOriginalGameFeatureVector({
      blocks: [{
        gameId: 'laser_puzzle',
        status: 'completed',
        result: {
          aggregateSchemaVersion: 'laser_puzzle_aggregate_v1',
          completed: true,
          levelCount: 2,
          solvedLevels: 2,
          solutionEfficiency: 0.95,
          ruleViolationCount: 0,
          aggregateOnly: true,
        },
      }],
    });
    const framework = buildOriginalGameTalentFramework({ originalGameFeatureVector: vector });

    expect(framework.constructs.problemSolving).toMatchObject({ score: null, availability: 'insufficient' });
    expect(framework.constructs.analyticalThinking).toMatchObject({ score: null, availability: 'insufficient' });
    expect(framework.constructs.planning).toMatchObject({ score: null, availability: 'insufficient' });
  });

  it('keeps camera quality outside behavioral scores and confidence', () => {
    const vector = vectorFromResults();
    const withCamera = buildOriginalGameTalentFramework({ originalGameFeatureVector: vector, signalQuality: { sampleCount: 100, facePresenceRatio: 0.9 } });
    const withoutCamera = buildOriginalGameTalentFramework({ originalGameFeatureVector: vector, signalQuality: { sampleCount: 0, facePresenceRatio: 0 } });

    expect(withCamera.constructs.problemSolving.score).toBe(withoutCamera.constructs.problemSolving.score);
    expect(withCamera.constructs.problemSolving.confidence).toBe(withoutCamera.constructs.problemSolving.confidence);
    expect(withoutCamera.constructs.problemSolving.caveats).toContain('camera_signal_context_not_used_for_talent_mapping');
  });
});
