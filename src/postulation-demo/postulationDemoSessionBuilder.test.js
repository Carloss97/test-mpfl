import { describe, expect, it } from 'vitest';
import { validateFinalAssessmentPayload } from '../assessment/finalAssessmentPayload.js';
import { validateAssessmentSessionPrivacy } from '../assessment/assessmentSession.js';
import { buildPostulationDemoArtifacts } from './postulationDemoSessionBuilder.js';

const completedDemo = Object.freeze({
  completedCount: 2,
  totalCount: 2,
  blocks: [
    {
      block: { gameId: 'precision_targeting', label: 'Precisión visomotora', skill: 'visuomotor_precision', trialCount: 4 },
      summary: { completedTrialCount: 4, trialCount: 4, accuracy: 0.9, score: 0.82, meanReactionTimeMs: 520 },
    },
    {
      block: { gameId: 'go_nogo', label: 'Control inhibitorio', skill: 'inhibitory_control', trialCount: 8 },
      summary: { completedTrialCount: 8, trialCount: 8, accuracy: 0.75, score: 0.74, meanReactionTimeMs: 610 },
    },
  ],
});

const gameEvents = Object.freeze([
  { type: 'game_event_v1', eventType: 'game_start', gameId: 'precision_targeting', timestamp: 100 },
  { type: 'game_event_v1', eventType: 'response', gameId: 'precision_targeting', trialId: 'p1', timestamp: 300, response: { correct: true, reactionTimeMs: 520, score: 0.82 } },
  { type: 'game_event_v1', eventType: 'response', gameId: 'go_nogo', trialId: 'g1', timestamp: 900, response: { correct: false, outcome: 'commission_error', reactionTimeMs: 610, score: 0.4, inhibition: { responseRequired: false } } },
]);

describe('postulationDemoSessionBuilder', () => {
  it('builds privacy-safe final artifacts from completed demo blocks and aggregate signals', () => {
    const artifacts = buildPostulationDemoArtifacts({
      completedDemo,
      gameEvents,
      signalSnapshot: {
        sampleCount: 24,
        facePresenceRatio: 0.82,
        meanConfidence: 0.76,
        caveats: ['MoveNet sin hombros visibles'],
      },
      generatedAt: '2026-07-09T17:30:00.000Z',
      runId: 'postulation-demo-test',
    });

    expect(artifacts.schemaVersion).toBe('krumm_postulation_demo_artifacts_v1');
    expect(artifacts.assessmentSession.schemaVersion).toBe('krumm_unified_assessment_session_v1');
    expect(artifacts.assessmentSession.mode).toBe('postulation_demo');
    expect(artifacts.assessmentSession.blocks).toHaveLength(2);
    expect(artifacts.assessmentSession.gameSummary.performance.completedTrialCount).toBeGreaterThan(0);
    expect(artifacts.talentProfile.schemaVersion).toBe('krumm_talent_profile_v1');
    expect(validateFinalAssessmentPayload(artifacts.payload).ok).toBe(true);
    expect(validateAssessmentSessionPrivacy(artifacts.assessmentSession).ok).toBe(true);
    expect(artifacts.reports.map((report) => report.format)).toEqual(['markdown', 'html', 'json']);
    expect(artifacts.bundle.schemaVersion).toBe('krumm_report_delivery_bundle_v1');
    expect(artifacts.bundle.manifest.fileCount).toBe(3);
  });

  it('does not invent camera quality when no camera snapshot exists', () => {
    const artifacts = buildPostulationDemoArtifacts({
      completedDemo,
      gameEvents: [],
      signalSnapshot: null,
      generatedAt: '2026-07-09T17:31:00.000Z',
      runId: 'postulation-demo-no-camera',
    });

    expect(artifacts.assessmentSession.qualitySummary.sampleCount).toBe(0);
    expect(artifacts.assessmentSession.qualitySummary.facePresenceRatio).toBe(0);
    expect(artifacts.assessmentSession.qualitySummary.caveats).toEqual(expect.arrayContaining(['low_sample_count', 'low_face_presence', 'low_face_confidence']));
    expect(artifacts.payload.validation.ok).toBe(true);
    const serializedSafePayloads = JSON.stringify({
      assessmentSession: artifacts.assessmentSession,
      payload: artifacts.payload,
      manifest: artifacts.bundle.manifest,
    });
    for (const forbiddenKey of ['land' + 'marks', 'face' + 'Samples', 'pointer' + 'Samples', 'raw' + 'GameEvents']) {
      expect(serializedSafePayloads).not.toContain(forbiddenKey);
    }
  });
});
