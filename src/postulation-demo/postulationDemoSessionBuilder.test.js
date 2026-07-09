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

const dv2GameEvents = Object.freeze([
  { type: 'game_event_v1', eventType: 'stimulus_shown', gameId: 'precision_targeting', trialId: 'p1', targetId: 'target-1', timestamp: 1000, stimulus: { kind: 'fitts_target_after_start_pad', payload: { items: [{ id: 'raw-item' }], target: { x: 100, y: 80 }, origin: { x: 20, y: 20 } } } },
  { type: 'game_event_v1', eventType: 'response', gameId: 'precision_targeting', trialId: 'p1', targetId: 'target-1', timestamp: 1320, response: { correct: true, outcome: 'hit', reactionTimeMs: 320, score: 0.9, fitts: { indexDifficulty: 3.1, throughput: 4.2 }, pointerSummary: { pathEfficiency: 0.82, overshootCount: 0, correctionCount: 1, meanJerkPxPerMs3: 0.004 } } },
  { type: 'game_event_v1', eventType: 'stimulus_shown', gameId: 'go_nogo', trialId: 'g1', targetId: 'cue-1', timestamp: 1800, stimulus: { kind: 'go_nogo_cue', payload: { cue: 'NO-GO', responseRequired: false } } },
  { type: 'game_event_v1', eventType: 'response', gameId: 'go_nogo', trialId: 'g1', targetId: 'cue-1', timestamp: 2100, response: { correct: false, outcome: 'commission_error', reactionTimeMs: 300, score: 0, inhibition: { responseRequired: false } } },
]);

const dv2SignalContext = Object.freeze({
  faceSamples: [
    { timestamp: 820, quality: { facePresent: true, confidence: 0.78 }, blendshapes: { browDownLeft: 0.03, browDownRight: 0.03, eyeBlinkLeft: 0.02, eyeBlinkRight: 0.02 } },
    { timestamp: 1040, quality: { facePresent: true, confidence: 0.84 }, blendshapes: { browDownLeft: 0.16, browDownRight: 0.17, eyeBlinkLeft: 0.03, eyeBlinkRight: 0.03 } },
    { timestamp: 1240, quality: { facePresent: true, confidence: 0.87 }, blendshapes: { browDownLeft: 0.18, browDownRight: 0.2, eyeBlinkLeft: 0.04, eyeBlinkRight: 0.04 } },
    { timestamp: 1840, quality: { facePresent: true, confidence: 0.82 }, blendshapes: { browDownLeft: 0.09, browDownRight: 0.1, eyeBlinkLeft: 0.03, eyeBlinkRight: 0.03 } },
    { timestamp: 2080, quality: { facePresent: true, confidence: 0.8 }, blendshapes: { browDownLeft: 0.2, browDownRight: 0.21, eyeBlinkLeft: 0.05, eyeBlinkRight: 0.05 } },
  ],
  gazeSamples: [
    { timestamp: 900, lookingAtScreen: true, confidence: 0.86, screenX: 0.5, screenY: 0.5 },
    { timestamp: 1200, lookingAtScreen: true, confidence: 0.82, screenX: 0.53, screenY: 0.48 },
    { timestamp: 2000, lookingAtScreen: false, confidence: 0.44, screenX: 0.82, screenY: 0.22 },
  ],
  postureSamples: [
    { timestamp: 900, postureScore: 0.88, headForward: 0.08, confidence: 0.8 },
    { timestamp: 1200, postureScore: 0.72, headForward: 0.28, confidence: 0.8 },
    { timestamp: 2000, postureScore: 0.68, headForward: 0.32, confidence: 0.75 },
  ],
  upperBodySamples: [
    { timestamp: 900, confidence: 0.78, armActivity: 0.12, upperBodyCoverage: 0.62 },
    { timestamp: 1220, confidence: 0.82, armActivity: 0.38, upperBodyCoverage: 0.8 },
    { timestamp: 2020, confidence: 0.76, armActivity: 0.31, upperBodyCoverage: 0.74 },
  ],
  latestGaze: { lookingAtScreen: true, confidence: 0.82, screenX: 0.53, screenY: 0.48 },
  latestPosture: { postureScore: 0.72, headForward: 0.28, confidence: 0.8 },
  moveNetPose: { confidence: 0.82, symmetry: 0.9, upperBodyCoverage: 0.8, armActivity: 0.38, visibleUpperBodyKeypoints: 8, armsVisible: 2 },
  runtime: { delegate: 'GPU' },
});

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

  it('Dv2 builds route-specific correlation aggregate and assessment_feature_vector_v2 without exporting raw windows', () => {
    const artifacts = buildPostulationDemoArtifacts({
      completedDemo,
      gameEvents: dv2GameEvents,
      signalSnapshot: {
        sampleCount: 42,
        facePresenceRatio: 0.86,
        meanConfidence: 0.81,
        caveats: [],
      },
      signalContext: dv2SignalContext,
      generatedAt: '2026-07-09T17:32:00.000Z',
      runId: 'postulation-demo-dv2',
    });

    expect(artifacts.assessmentSession.gameCorrelation).toMatchObject({
      schemaVersion: 'game_signal_correlation_v3',
      aggregate: {
        trialCount: 2,
        completedTrialCount: 2,
        byGameId: { precision_targeting: 1, go_nogo: 1 },
      },
    });
    expect(artifacts.assessmentSession.qualitySummary.correlatedTrialCount).toBe(2);
    expect(artifacts.assessmentSession.qualitySummary.caveats).not.toContain('missing_game_correlation');
    expect(artifacts.assessmentSession.featureVectorV2).toMatchObject({
      type: 'assessment_feature_vector_v2',
      aggregate: { correlatedTrialCount: 2 },
      privacy: { payloadContainsAggregatesOnly: true },
    });
    expect(artifacts.payload.behavioral.gameCorrelationAggregate.completedTrialCount).toBe(2);
    expect(artifacts.payload.behavioral.featureVectorV2.type).toBe('assessment_feature_vector_v2');
    expect(artifacts.payload.edgeAI.modelVersion).toBe('krumm-edge-ai-v9.1.0-game-aware');
    expect(artifacts.validation.ok).toBe(true);

    const serializedSafeOutputs = JSON.stringify({
      assessmentSession: artifacts.assessmentSession,
      payload: artifacts.payload,
      manifest: artifacts.bundle.manifest,
    });
    for (const forbiddenKey of ['windows', 'land' + 'marks', 'face' + 'Samples', 'pointer' + 'Samples', 'raw' + 'GameEvents', 'stimuli', 'items', 'keypoints']) {
      expect(serializedSafeOutputs).not.toContain(forbiddenKey);
    }
  });
});
