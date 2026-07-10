import { describe, expect, it } from 'vitest';
import {
  POSTULATION_DEMO_FIXTURE_RUN_ID,
  buildPostulationDemoFixture,
  isPostulationFixtureMode,
} from './postulationDemoFixture.js';

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
});
