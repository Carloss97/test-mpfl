import { buildPostulationDemoArtifacts } from './postulationDemoSessionBuilder.js';
import {
  POSTULATION_DEMO_BATTERY_MODES,
  getPostulationDemoBattery,
  getPostulationDemoBatteryId,
  listVisiblePostulationBlocks,
  normalizePostulationDemoBatteryMode,
} from './postulationDemoConfig.js';

export const POSTULATION_DEMO_FIXTURE_RUN_ID = 'postulation-demo-fixture-v1';
export const POSTULATION_DEMO_ORIGINAL_FIXTURE_RUN_ID = 'postulation-demo-original-games-fixture-v1';
export const POSTULATION_DEMO_FIXTURE_LABEL = 'Datos sintéticos de demostración';

export function isPostulationFixtureMode(search = globalThis.location?.search ?? '') {
  const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
  return params.get('fixture') === '1';
}

function blockSummary(block, index) {
  if (block.gameId === 'laser_puzzle') {
    return {
      gameId: block.gameId,
      completed: true,
      completedTrialCount: block.trialCount,
      trialCount: block.trialCount,
      score: 0.88,
      levelCount: block.trialCount,
      solvedLevels: block.trialCount,
      moveCount: 7,
      reconfigurationCount: 7,
      hintCount: 0,
      timeMs: 74_000,
      solutionEfficiency: 0.9,
      ruleViolationCount: 0,
      aggregateOnly: true,
    };
  }
  if (block.gameId === 'balloon_risk') {
    return {
      gameId: block.gameId,
      completed: true,
      completedTrialCount: block.trialCount,
      trialCount: block.trialCount,
      score: 0.72,
      roundsCompleted: block.trialCount,
      totalRounds: block.trialCount,
      averagePumps: 5.8,
      cashoutCount: 6,
      popCount: 2,
      postPopAdjustment: -1.5,
      riskEfficiency: 0.72,
      timeMs: 68_000,
      aggregateOnly: true,
    };
  }
  if (block.gameId === 'passenger_routes') {
    return {
      gameId: block.gameId,
      completed: true,
      completedTrialCount: block.trialCount,
      trialCount: block.trialCount,
      score: 0.84,
      passengersDelivered: 3,
      destinationCount: 3,
      routeEfficiency: 0.84,
      replanCount: 1,
      stationUseCount: 1,
      constraintViolationCount: 0,
      satisfactionScore: 88,
      timeMs: 92_000,
      aggregateOnly: true,
    };
  }
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

function fixtureResponse(block, index) {
  const summary = blockSummary(block, index);
  const base = {
    correct: index !== 1,
    outcome: index === 1 ? 'controlled_error' : 'correct_response',
    reactionTimeMs: 420 + (index * 35),
    score: summary.score,
  };
  if (block.gameId === 'laser_puzzle') return { ...base, correct: true, outcome: 'level_solved', laserPuzzle: summary };
  if (block.gameId === 'balloon_risk') return { ...base, outcome: 'cashout', balloonRisk: summary };
  if (block.gameId === 'passenger_routes') return { ...base, correct: true, outcome: 'route_completed', passengerRoutes: summary };
  return {
    ...base,
    pointerSummary: { pathEfficiency: 0.78 + (index * 0.03), correctionCount: index === 1 ? 2 : 0 },
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
        response: fixtureResponse(block, index),
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

export function buildPostulationDemoFixture({
  generatedAt = '2026-07-09T22:00:00.000Z',
  batteryMode: requestedBatteryMode = POSTULATION_DEMO_BATTERY_MODES.STABLE_DG,
} = {}) {
  const batteryMode = normalizePostulationDemoBatteryMode(requestedBatteryMode);
  const batteryId = getPostulationDemoBatteryId(batteryMode);
  const blocks = listVisiblePostulationBlocks(getPostulationDemoBattery(batteryMode));
  const runId = batteryMode === POSTULATION_DEMO_BATTERY_MODES.ORIGINAL_GAMES
    ? POSTULATION_DEMO_ORIGINAL_FIXTURE_RUN_ID
    : POSTULATION_DEMO_FIXTURE_RUN_ID;
  const completedDemo = {
    batteryMode,
    batteryId,
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
    runId,
    batteryMode,
    cameraConsent: true,
    participant: { mode: 'synthetic_demo_fixture' },
  });
  return {
    summary: completedDemo,
    artifacts: {
      ...artifacts,
      fixture: {
        synthetic: true,
        batteryMode,
        label: POSTULATION_DEMO_FIXTURE_LABEL,
        description: 'Fixture local privacy-safe para reuniones, QA visual y fallback sin cámara.',
      },
    },
  };
}
