import { describe, expect, it } from 'vitest';
import {
  POSTULATION_DEMO_FIXTURE_RUN_ID,
  buildPostulationDemoFixture,
  isPostulationFixtureMode,
} from './postulationDemoFixture.js';
import { POSTULATION_DEMO_BATTERY_MODES } from './postulationDemoConfig.js';

function stringifyCoreArtifacts(fixture) {
  return JSON.stringify({
    assessmentSession: fixture.artifacts.assessmentSession,
    payload: fixture.artifacts.payload,
    manifest: fixture.artifacts.bundle.manifest,
  });
}

describe('postulationDemoFixture', () => {
  it('detects ?fixture=1 without treating other query values as synthetic mode', () => {
    expect(isPostulationFixtureMode('?fixture=1')).toBe(true);
    expect(isPostulationFixtureMode('?fixture=true')).toBe(false);
    expect(isPostulationFixtureMode('?mode=record')).toBe(false);
  });

  it('builds a deterministic synthetic report fixture with explicit labeling and privacy-safe artifacts', () => {
    const fixture = buildPostulationDemoFixture({ generatedAt: '2026-07-09T22:00:00.000Z' });
    expect(fixture.summary.completedCount).toBe(4);
    expect(fixture.summary.totalCount).toBe(4);
    expect(fixture.artifacts.runId).toBe(POSTULATION_DEMO_FIXTURE_RUN_ID);
    expect(fixture.artifacts.fixture).toMatchObject({ synthetic: true, label: 'Datos sintéticos de demostración' });
    expect(fixture.artifacts.validation.ok).toBe(true);
    expect(fixture.artifacts.assessmentSession.gameCorrelation.aggregate.completedTrialCount).toBeGreaterThan(0);
    expect(fixture.artifacts.assessmentSession.featureVectorV2.type).toBe('assessment_feature_vector_v2');

    const text = stringifyCoreArtifacts(fixture);
    for (const forbidden of ['rawGameEvents', 'pointerSamples', 'faceSamples', 'landmarks', 'keypoints', 'normalizedKeypoints', 'windows']) {
      expect(text).not.toContain(forbidden);
    }
  });

  it('builds an original-games fixture with mode metadata and aggregate-only game summaries', () => {
    const fixture = buildPostulationDemoFixture({
      generatedAt: '2026-07-09T22:00:00.000Z',
      batteryMode: POSTULATION_DEMO_BATTERY_MODES.ORIGINAL_GAMES,
    });

    expect(fixture.summary.batteryMode).toBe('original_games');
    expect(fixture.summary.completedCount).toBe(6);
    expect(fixture.summary.blocks.map((entry) => entry.block.gameId)).toEqual([
      'laser_puzzle',
      'balloon_risk',
      'passenger_routes',
      'team_coordination',
      'tangram_exp001',
      'bomb_defusal',
    ]);
    expect(fixture.artifacts.batteryMode).toBe('original_games');
    expect(fixture.artifacts.assessmentSession.blocks).toHaveLength(6);
    expect(fixture.artifacts.payload.behavioral.gameResults.map((result) => result.gameId)).toEqual([
      'laser_puzzle',
      'balloon_risk',
      'passenger_routes',
      'team_coordination',
      'tangram_exp001',
      'bomb_defusal',
    ]);
    // B5: el agregado del fixture es GENUINO del motor (payload §19, seed 42):
    // métricas §12 presentes y biometría off.
    const bombResult = fixture.artifacts.assessmentSession.blocks.find((block) => block.gameId === 'bomb_defusal');
    expect(bombResult.result.aggregateSchemaVersion).toBe('bomb_defusal_aggregate_v1');
    expect(bombResult.result.completed).toBe(true);
    expect(bombResult.result.seed).toBe(42);
    expect(bombResult.result.bioTrackingLossMs).toBe(0);
    expect(typeof bombResult.result.retentionAccuracyRate).toBe('number');
    expect(stringifyCoreArtifacts(fixture)).not.toMatch(/fullRoute|routeTrace|visitedCells|rawGameEvents|pointerSamples|freeText|typedResponse/i);
  });
});
