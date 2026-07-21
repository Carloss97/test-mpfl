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
      {
        gameId: 'team_coordination',
        status: 'completed',
        result: {
          aggregateSchemaVersion: 'team_coordination_aggregate_v1',
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
    for (const id of WORKBOOK_TALENT_CONSTRUCT_ORDER) {
      expect(framework.constructs[id].availability).toBe('provisional_score');
      expect(framework.constructs[id].score).toEqual(expect.any(Number));
      expect(framework.constructs[id].confidence).toBeGreaterThanOrEqual(0.55);
      expect(framework.constructs[id].caveats).toEqual(expect.arrayContaining(['provisional_mapping_requires_validation']));
    }
    expect(framework.constructs.problemSolving.confidenceCeiling).toBe(0.6);
    expect(framework.constructs.problemSolving.score).toBeGreaterThan(80);
    expect(framework.constructs.planning.score).toBeGreaterThan(80);
    expect(framework.constructs.analyticalThinking.score).toBeGreaterThan(80);
    expect(framework.constructs.decisionMaking).toMatchObject({ availability: 'provisional_score', confidenceCeiling: 0.6 });
    expect(framework.constructs.riskFeedbackProfile).toMatchObject({ availability: 'provisional_score', confidenceCeiling: 0.55 });
    expect(framework.constructs.adaptability).toMatchObject({ availability: 'provisional_score', confidenceCeiling: 0.55 });
    expect(framework.constructs.leadership).toMatchObject({ availability: 'provisional_score', confidenceCeiling: 0.55 });
    expect(framework.constructs.communication).toMatchObject({ availability: 'provisional_score', confidenceCeiling: 0.55 });
    expect(framework.constructs.leadership.score).toBeGreaterThan(80);
    expect(framework.constructs.communication.score).toBeGreaterThan(80);
    expect(framework.constructs.communication.narrative).toMatch(/sin guardar texto libre/i);
  });

  it('does not convert higher risk-taking into a better talent score', () => {
    const lowRisk = buildOriginalGameTalentFramework({ originalGameFeatureVector: vectorFromResults({ balloonRisk: 0.2 }) });
    const highRisk = buildOriginalGameTalentFramework({ originalGameFeatureVector: vectorFromResults({ balloonRisk: 0.95 }) });

    expect(lowRisk.constructs.decisionMaking.score).toBe(highRisk.constructs.decisionMaking.score);
    expect(lowRisk.constructs.decisionMaking.evidence).toEqual(expect.arrayContaining([
      expect.objectContaining({ feature: 'team.decisionQualityScore' }),
    ]));
    expect(lowRisk.constructs.riskFeedbackProfile.score).toEqual(expect.any(Number));
    expect(highRisk.constructs.riskFeedbackProfile.score).toEqual(expect.any(Number));
    expect(JSON.stringify(highRisk.constructs.riskFeedbackProfile.evidence)).toContain('balloon.riskEfficiency');
    expect(highRisk.constructs.riskFeedbackProfile.caveats).toContain('frustration_tolerance_not_measured');
    expect(highRisk.constructs.riskFeedbackProfile.caveats).toContain('risk_index_not_personality_trait');
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
