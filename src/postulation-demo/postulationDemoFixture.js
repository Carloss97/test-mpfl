import { buildPostulationDemoArtifacts } from './postulationDemoSessionBuilder.js';
import { listVisiblePostulationBlocks, POSTULATION_DEMO_BATTERY } from './postulationDemoConfig.js';

export const POSTULATION_DEMO_FIXTURE_RUN_ID = 'postulation-demo-fixture-v1';
export const POSTULATION_DEMO_FIXTURE_LABEL = 'Datos sintéticos de demostración';

export function isPostulationFixtureMode(search = globalThis.location?.search ?? '') {
  const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
  return params.get('fixture') === '1';
}

function blockSummary(block, index) {
  const accuracy = [0.88, 0.76, 0.82, 0.9][index] ?? 0.82;
  const score = [0.84, 0.72, 0.8, 0.87][index] ?? 0.8;
  const meanReactionTimeMs = [520, 610, 680, 740][index] ?? 620;
  return {
    gameId: block.gameId,
    completedTrialCount: block.trialCount,
    trialCount: block.trialCount,
    accuracy,
    score,
    meanReactionTimeMs,
  };
}

function syntheticGameEvents(blocks) {
  return blocks.flatMap((block, index) => {
    const base = 1000 + (index * 1600);
    return [
      {
        type: 'game_event_v1',
        eventType: 'stimulus_shown',
        gameId: block.gameId,
        trialId: `${block.gameId}-fixture-1`,
        targetId: `${block.gameId}-cue-1`,
        timestamp: base,
        stimulus: { kind: `${block.gameId}_fixture_cue` },
      },
      {
        type: 'game_event_v1',
        eventType: 'response',
        gameId: block.gameId,
        trialId: `${block.gameId}-fixture-1`,
        targetId: `${block.gameId}-cue-1`,
        timestamp: base + 420 + (index * 35),
        response: {
          correct: index !== 1,
          outcome: index === 1 ? 'controlled_error' : 'correct_response',
          reactionTimeMs: 420 + (index * 35),
          score: [0.86, 0.68, 0.82, 0.9][index] ?? 0.8,
          pointerSummary: { pathEfficiency: 0.78 + (index * 0.03), correctionCount: index === 1 ? 2 : 0 },
        },
      },
    ];
  });
}

function syntheticSignalContext() {
  return {
    faceSamples: [
      { timestamp: 780, quality: { facePresent: true, confidence: 0.78 }, blendshapes: { browDownLeft: 0.04, browDownRight: 0.04, eyeBlinkLeft: 0.02, eyeBlinkRight: 0.02 } },
      { timestamp: 1160, quality: { facePresent: true, confidence: 0.84 }, blendshapes: { browDownLeft: 0.12, browDownRight: 0.13, eyeBlinkLeft: 0.04, eyeBlinkRight: 0.04 } },
      { timestamp: 2760, quality: { facePresent: true, confidence: 0.82 }, blendshapes: { browDownLeft: 0.1, browDownRight: 0.11, eyeBlinkLeft: 0.05, eyeBlinkRight: 0.05 } },
      { timestamp: 4380, quality: { facePresent: true, confidence: 0.86 }, blendshapes: { browDownLeft: 0.08, browDownRight: 0.08, eyeBlinkLeft: 0.03, eyeBlinkRight: 0.03 } },
      { timestamp: 5980, quality: { facePresent: true, confidence: 0.88 }, blendshapes: { browDownLeft: 0.06, browDownRight: 0.07, eyeBlinkLeft: 0.03, eyeBlinkRight: 0.03 } },
    ],
    gazeSamples: [
      { timestamp: 1160, lookingAtScreen: true, confidence: 0.82, screenX: 0.5, screenY: 0.48 },
      { timestamp: 2760, lookingAtScreen: true, confidence: 0.78, screenX: 0.52, screenY: 0.5 },
      { timestamp: 4380, lookingAtScreen: true, confidence: 0.84, screenX: 0.49, screenY: 0.52 },
      { timestamp: 5980, lookingAtScreen: true, confidence: 0.86, screenX: 0.51, screenY: 0.49 },
    ],
    postureSamples: [
      { timestamp: 1160, postureScore: 0.76, headForward: 0.22, confidence: 0.8 },
      { timestamp: 2760, postureScore: 0.72, headForward: 0.28, confidence: 0.78 },
      { timestamp: 4380, postureScore: 0.8, headForward: 0.18, confidence: 0.82 },
      { timestamp: 5980, postureScore: 0.83, headForward: 0.16, confidence: 0.84 },
    ],
    upperBodySamples: [
      { timestamp: 1160, confidence: 0.78, armActivity: 0.32, upperBodyCoverage: 0.72 },
      { timestamp: 2760, confidence: 0.8, armActivity: 0.36, upperBodyCoverage: 0.74 },
      { timestamp: 4380, confidence: 0.82, armActivity: 0.28, upperBodyCoverage: 0.76 },
      { timestamp: 5980, confidence: 0.84, armActivity: 0.24, upperBodyCoverage: 0.78 },
    ],
    latestGaze: { lookingAtScreen: true, confidence: 0.86, screenX: 0.51, screenY: 0.49 },
    latestPosture: { postureScore: 0.83, headForward: 0.16, confidence: 0.84 },
    moveNetPose: { confidence: 0.84, symmetry: 0.9, armActivity: 0.24, upperBodyCoverage: 0.78 },
    runtime: { delegate: 'synthetic-fixture', source: 'postulation_demo_fixture' },
  };
}

export function buildPostulationDemoFixture({ generatedAt = '2026-07-09T22:00:00.000Z' } = {}) {
  const blocks = listVisiblePostulationBlocks(POSTULATION_DEMO_BATTERY);
  const completedDemo = {
    completedCount: blocks.length,
    totalCount: blocks.length,
    blocks: blocks.map((block, index) => ({ block, summary: blockSummary(block, index) })),
  };
  const artifacts = buildPostulationDemoArtifacts({
    completedDemo,
    gameEvents: syntheticGameEvents(blocks),
    signalSnapshot: {
      camera: 'ok',
      face: 'ok',
      signal: 'ok',
      events: blocks.length * 2,
      sampleCount: 48,
      facePresenceRatio: 0.88,
      meanConfidence: 0.83,
      fpsEstimate: 15,
      caveats: ['synthetic_demo_fixture'],
    },
    signalContext: syntheticSignalContext(),
    generatedAt,
    runId: POSTULATION_DEMO_FIXTURE_RUN_ID,
    participant: { mode: 'synthetic_demo_fixture' },
  });
  return {
    summary: completedDemo,
    artifacts: {
      ...artifacts,
      fixture: {
        synthetic: true,
        label: POSTULATION_DEMO_FIXTURE_LABEL,
        description: 'Fixture local privacy-safe para reuniones, QA visual y fallback sin cámara.',
      },
    },
  };
}
