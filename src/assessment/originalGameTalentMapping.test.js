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
      schemaVersion: 'krumm_workbook_talent_framework_v2',
      version: '2.0.0',
      status: 'provisional',
      generatedAt: '2026-07-18T22:00:00.000Z',
      sourceVector: { type: 'original_game_feature_vector_v1', version: '1.0.0' },
      classification: { strengths: null, watchAreas: null, availability: 'not_available_without_norms' },
    });
    expect(framework.constructOrder).toEqual(WORKBOOK_TALENT_CONSTRUCT_ORDER);
    expect(WORKBOOK_TALENT_CONSTRUCT_ORDER).toHaveLength(9);
    expect(WORKBOOK_TALENT_CONSTRUCT_ORDER.at(-1)).toBe('proceduralWorkingMemory');
    const descriptiveOnly = new Set(['decisionMaking', 'adaptability']);
    for (const id of WORKBOOK_TALENT_CONSTRUCT_ORDER) {
      // B6: sin BOMB en la sesión, el 9° constructo queda not_measured
      // (señal ausente ≠ bajo desempeño; la batería original lo administra).
      if (id === 'proceduralWorkingMemory') {
        expect(framework.constructs[id].availability).toBe('not_measured');
        expect(framework.constructs[id].score).toBeNull();
        expect(framework.constructs[id].caveats).toContain('experimental_module_not_administered');
        continue;
      }
      if (descriptiveOnly.has(id)) {
        expect(framework.constructs[id].availability).toBe('descriptive_only');
        expect(framework.constructs[id].score).toBeNull();
        expect(framework.constructs[id].confidence).toBeLessThanOrEqual(0.2);
        continue;
      }
      expect(framework.constructs[id].availability).toBe('provisional_score');
      expect(framework.constructs[id].score).toEqual(expect.any(Number));
      expect(framework.constructs[id].confidence).toBeGreaterThanOrEqual(0.55);
      expect(framework.constructs[id].caveats).toEqual(expect.arrayContaining(['provisional_mapping_requires_validation']));
    }
    expect(framework.constructs.problemSolving.confidenceCeiling).toBe(0.6);
    expect(framework.constructs.problemSolving.score).toBeGreaterThan(80);
    expect(framework.constructs.planning.score).toBeGreaterThan(80);
    expect(framework.constructs.analyticalThinking.score).toBeGreaterThan(80);
    expect(framework.constructs.decisionMaking).toMatchObject({ availability: 'descriptive_only', confidenceCeiling: 0.2 });
    expect(framework.constructs.riskFeedbackProfile).toMatchObject({ availability: 'provisional_score', confidenceCeiling: 0.55 });
    expect(framework.constructs.adaptability).toMatchObject({ availability: 'descriptive_only', confidenceCeiling: 0.2 });
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

// ── B6 (EXP-BOMB-001): 9° constructo proceduralWorkingMemory ────────────────

const VALID_BOMB_RESULT = Object.freeze({
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

function vectorWithBomb(bombResult = VALID_BOMB_RESULT) {
  return buildOriginalGameFeatureVector({
    blocks: [{ gameId: 'bomb_defusal', status: 'completed', result: bombResult }],
  });
}

describe('proceduralWorkingMemory (9° constructo, EXP-BOMB-001 — experimental)', () => {
  it('is descriptive_only with the §12 metrics as evidence and NO composite score (spec §12.1)', () => {
    const framework = buildOriginalGameTalentFramework({ originalGameFeatureVector: vectorWithBomb() });
    const construct = framework.constructs.proceduralWorkingMemory;
    expect(construct.availability).toBe('descriptive_only');
    expect(construct.score).toBeNull();
    expect(construct.confidence).toBeLessThanOrEqual(0.2);
    expect(construct.confidenceCeiling).toBe(0.2);
    expect(construct.caveats).toEqual(expect.arrayContaining([
      'experimental_module_validation_pending',
      'no_composite_score_weights_unfixed',
      'errors_not_memory_deficit',
      'provisional_mapping_requires_validation',
    ]));
    expect(construct.evidence).toEqual(expect.arrayContaining([
      expect.objectContaining({ feature: 'bomb.retentionAccuracyRate', value: 0.9 }),
      expect.objectContaining({ feature: 'bomb.serialPositionAccuracy', value: 0.95 }),
      expect.objectContaining({ feature: 'bomb.interferenceErrorCount', value: 1 }),
      expect.objectContaining({ feature: 'bomb.memoryDecaySlope', value: -0.02 }),
    ]));
    // nextStep = fases A–G de validación (spec §17.1).
    expect(construct.nextStep).toMatch(/17\.1/);
    expect(construct.nextStep).toMatch(/A–G|fases/i);
    expect(construct.narrative).toMatch(/experimental/i);
    expect(construct.narrativeEn).toMatch(/experimental|no composite score/i);
  });

  it('is not_measured when BOMB is not administered (never low performance)', () => {
    const framework = buildOriginalGameTalentFramework({
      originalGameFeatureVector: buildOriginalGameFeatureVector({ blocks: [] }),
    });
    expect(framework.constructs.proceduralWorkingMemory).toMatchObject({
      availability: 'not_measured',
      score: null,
    });
    expect(framework.constructs.proceduralWorkingMemory.caveats).toContain('experimental_module_not_administered');
  });

  it('keeps a partially completed BOMB session descriptive with an incomplete_session caveat', () => {
    const framework = buildOriginalGameTalentFramework({
      originalGameFeatureVector: vectorWithBomb({
        aggregateSchemaVersion: 'bomb_defusal_aggregate_v1',
        completed: false,
        aggregateOnly: true,
        reachedLevelCount: 2,
        levelsCompleted: 1,
        levelsFailed: 1,
        retentionAccuracyRate: 0.5,
      }),
    });
    const construct = framework.constructs.proceduralWorkingMemory;
    expect(construct.availability).toBe('descriptive_only');
    expect(construct.score).toBeNull();
    expect(construct.caveats).toContain('incomplete_session');
  });

  it('treats an invalid BOMB aggregate as not_measured (signal ausente ≠ bajo desempeño)', () => {
    const framework = buildOriginalGameTalentFramework({
      originalGameFeatureVector: vectorWithBomb({
        aggregateSchemaVersion: 'bomb_defusal_aggregate_v1',
        completed: true,
        aggregateOnly: false,
        reachedLevelCount: 4,
        levelsCompleted: 4,
      }),
    });
    expect(framework.constructs.proceduralWorkingMemory.availability).toBe('not_measured');
  });

  it('does not turn bomb metrics into a composite score that varies with performance (spec §12.1)', () => {
    const good = buildOriginalGameTalentFramework({ originalGameFeatureVector: vectorWithBomb() });
    const poor = buildOriginalGameTalentFramework({
      originalGameFeatureVector: vectorWithBomb({
        aggregateSchemaVersion: 'bomb_defusal_aggregate_v1',
        completed: true,
        aggregateOnly: true,
        reachedLevelCount: 4,
        levelsCompleted: 4,
        retentionAccuracyRate: 0.4,
        serialPositionAccuracy: 0.5,
        interferenceErrorCount: 3,
      }),
    });
    // score null en ambos (sin pesos compuestos fijados); la evidencia SÍ cambia.
    expect(good.constructs.proceduralWorkingMemory.score).toBe(poor.constructs.proceduralWorkingMemory.score);
    expect(poor.constructs.proceduralWorkingMemory.evidence).toEqual(expect.arrayContaining([
      expect.objectContaining({ feature: 'bomb.interferenceErrorCount', value: 3 }),
      expect.objectContaining({ feature: 'bomb.retentionAccuracyRate', value: 0.4 }),
    ]));
  });
});
