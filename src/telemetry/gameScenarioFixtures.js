function stableFaceSamples({ tension = 0.04, blink = 0.03, smile = 0.08 } = {}) {
  return Array.from({ length: 12 }, (_, index) => ({
    timestamp: 1000 + index * 33,
    quality: { facePresent: true, confidence: 0.9 },
    blendshapes: {
      browInnerUp: tension,
      browDownLeft: tension,
      browDownRight: tension,
      mouthSmileLeft: smile,
      mouthSmileRight: smile,
      eyeBlinkLeft: blink,
      eyeBlinkRight: blink,
      eyeSquintLeft: tension,
      eyeSquintRight: tension,
      eyeWideLeft: 0.05,
      eyeWideRight: 0.05,
      jawOpen: tension,
      mouthPressLeft: tension / 2,
      mouthPressRight: tension / 2,
    },
  }));
}

function makeSummary({
  accuracy = 0.85,
  rt = 420,
  score = accuracy,
  path = 0.8,
  pursuit = 0.75,
  loss = 0.1,
  overshoot = 0.1,
  commission = 0.05,
  omission = 0.05,
  conflict = 120,
  interferenceError = 0.05,
  visual = 0.7,
  visualError = 0.05,
  completed = 8,
  trials = 8,
} = {}) {
  return {
    eventCount: completed * 2 + 1,
    performance: { trialCount: trials, completedTrialCount: completed, accuracy, meanReactionTimeMs: rt, meanScore: score },
    motor: { pathEfficiencyMean: path, smoothPursuitScore: pursuit, trackingLossRatio: loss, overshootRate: overshoot, jerkMean: 0.01, correctionRate: 0.6 },
    fitts: { meanThroughput: path * 5, meanIndexDifficulty: 3.1 },
    inhibition: { commissionErrorRate: commission, omissionErrorRate: omission, postErrorSlowingMs: conflict / 2 },
    interference: { conflictCostMs: conflict, errorRate: interferenceError },
    visualSearch: { searchEfficiency: visual, meanSetSize: 12, errorRate: visualError },
  };
}

function makeCorrelation({ accuracy = 0.85, rt = 420, postureDelta = 0, faceDelta = 0.02, trials = 8, completed = 8 } = {}) {
  return {
    schemaVersion: 'game_signal_correlation_v3',
    aggregate: {
      trialCount: trials,
      completedTrialCount: completed,
      accuracy,
      meanReactionTimeMs: rt,
      meanReactionPostureDelta: postureDelta,
      meanReactionFacePresenceDelta: faceDelta,
      byGameId: { visual_search: 2, precision_targeting: 2, go_nogo: 2 },
    },
    trials: [
      {
        trialId: 'synthetic-1',
        gameId: 'visual_search',
        correct: accuracy >= 0.7,
        outcome: accuracy >= 0.7 ? 'target_found' : 'incorrect',
        reactionTimeMs: rt,
        windows: {
          reaction: {
            gaze: { lookingAtScreenRatio: accuracy >= 0.7 ? 0.9 : 0.45 },
            posture: { meanHeadForward: postureDelta < -0.1 ? 0.45 : 0.12, meanPostureScore: postureDelta < -0.1 ? 0.58 : 0.82 },
            upperBody: { meanArmActivity: accuracy >= 0.7 ? 0.25 : 0.55 },
            face: { activeAUCount: accuracy >= 0.7 ? 2 : 5 },
          },
        },
        deltas: { postVsPre: { activeAUCountDelta: accuracy >= 0.7 ? 0.1 : 1.2 } },
      },
    ],
  };
}

function edgeInput({ face = {}, summary = {}, correlation = {}, gaze = {}, posture = {}, upper = {} } = {}) {
  return {
    faceSamples: stableFaceSamples(face),
    gameSummary: makeSummary(summary),
    gameCorrelation: makeCorrelation(correlation),
    latestGaze: { available: true, lookingAtScreen: true, confidence: 0.92, ...gaze },
    latestPosture: { available: true, postureScore: 0.86, headForward: 0.08, headTilt: 0.03, confidence: 0.84, ...posture },
    moveNetPose: { available: true, symmetry: 0.92, confidence: 0.82, upperBodyCoverage: 0.75, visibleUpperBodyKeypoints: 8, ...upper },
  };
}

export const GAME_SCENARIO_FIXTURES = Object.freeze({
  good_motor_control: {
    id: 'good_motor_control',
    label: 'Buen control motor',
    edgeInput: edgeInput({
      summary: { accuracy: 0.92, rt: 340, score: 0.88, path: 0.9, pursuit: 0.86, loss: 0.03, overshoot: 0.05, commission: 0.03, omission: 0.02, conflict: 80, visual: 0.84 },
      correlation: { accuracy: 0.92, rt: 340, postureDelta: -0.01, faceDelta: 0.03 },
    }),
    expected: { difficultyDirection: 'up', minVisuomotorPrecision: 75 },
  },
  fatigue: {
    id: 'fatigue',
    label: 'Fatiga observable',
    edgeInput: edgeInput({
      face: { tension: 0.08, blink: 0.25, smile: 0.02 },
      summary: { accuracy: 0.62, rt: 780, score: 0.55, path: 0.55, pursuit: 0.5, loss: 0.22, overshoot: 0.35, conflict: 250, visual: 0.5 },
      correlation: { accuracy: 0.62, rt: 780, postureDelta: -0.22, faceDelta: -0.05 },
      gaze: { lookingAtScreen: false, confidence: 0.45 },
      posture: { postureScore: 0.48, headForward: 0.72, confidence: 0.72 },
      upper: { symmetry: 0.62, confidence: 0.62, upperBodyCoverage: 0.42 },
    }),
    expected: { minFatigueDelta: 10 },
  },
  stress_error: {
    id: 'stress_error',
    label: 'Estrés/error',
    edgeInput: edgeInput({
      face: { tension: 0.18, blink: 0.08, smile: 0.01 },
      summary: { accuracy: 0.42, rt: 1100, score: 0.35, path: 0.35, pursuit: 0.28, loss: 0.48, overshoot: 0.85, commission: 0.55, omission: 0.35, conflict: 560, interferenceError: 0.48, visual: 0.28, visualError: 0.45, completed: 6, trials: 8 },
      correlation: { accuracy: 0.42, rt: 1100, postureDelta: -0.28, faceDelta: -0.12, completed: 6 },
    }),
    expected: { difficultyDirection: 'down' },
  },
  distraction: {
    id: 'distraction',
    label: 'Distracción',
    edgeInput: edgeInput({
      summary: { accuracy: 0.58, rt: 850, score: 0.5, path: 0.6, pursuit: 0.5, loss: 0.25, visual: 0.22, visualError: 0.5 },
      correlation: { accuracy: 0.58, rt: 850, postureDelta: -0.08, faceDelta: -0.08 },
      gaze: { lookingAtScreen: false, confidence: 0.35 },
    }),
    expected: { maxVisualAttention: 45 },
  },
  practice_improvement: {
    id: 'practice_improvement',
    label: 'Mejora por práctica',
    segments: {
      early: {
        edgeInput: edgeInput({
          summary: { accuracy: 0.55, rt: 820, score: 0.5, path: 0.5, pursuit: 0.45, loss: 0.3, overshoot: 0.45, commission: 0.2, omission: 0.18, conflict: 260, visual: 0.42 },
          correlation: { accuracy: 0.55, rt: 820, postureDelta: -0.1, faceDelta: -0.04 },
        }),
      },
      late: {
        edgeInput: edgeInput({
          summary: { accuracy: 0.9, rt: 390, score: 0.86, path: 0.86, pursuit: 0.82, loss: 0.06, overshoot: 0.08, commission: 0.04, omission: 0.03, conflict: 95, visual: 0.78 },
          correlation: { accuracy: 0.9, rt: 390, postureDelta: -0.02, faceDelta: 0.02 },
        }),
      },
    },
    expected: { difficultyDirection: 'up' },
  },
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function listScenarioIds() {
  return Object.keys(GAME_SCENARIO_FIXTURES);
}

export function buildSyntheticGameSession(id) {
  const fixture = GAME_SCENARIO_FIXTURES[id];
  if (!fixture) throw new Error(`Unknown game scenario: ${id}`);
  return clone(fixture);
}

export function summarizePracticeImprovement(scenario = GAME_SCENARIO_FIXTURES.practice_improvement) {
  const early = scenario.segments?.early?.edgeInput?.gameSummary?.performance ?? {};
  const late = scenario.segments?.late?.edgeInput?.gameSummary?.performance ?? {};
  const earlyMotor = scenario.segments?.early?.edgeInput?.gameSummary?.motor ?? {};
  const lateMotor = scenario.segments?.late?.edgeInput?.gameSummary?.motor ?? {};
  return {
    accuracyDelta: Number((Number(late.accuracy ?? 0) - Number(early.accuracy ?? 0)).toFixed(4)),
    reactionTimeDeltaMs: Number((Number(late.meanReactionTimeMs ?? 0) - Number(early.meanReactionTimeMs ?? 0)).toFixed(2)),
    pathEfficiencyDelta: Number((Number(lateMotor.pathEfficiencyMean ?? 0) - Number(earlyMotor.pathEfficiencyMean ?? 0)).toFixed(4)),
  };
}
