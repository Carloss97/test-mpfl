import { describe, expect, it } from 'vitest';
import { advanceBatteryState, createBatterySession } from './batteryRuntime.js';
import {
  ASSESSMENT_FORBIDDEN_KEYS,
  buildQualitySummary,
  buildUnifiedAssessmentSession,
  validateAssessmentSessionPrivacy,
} from './assessmentSession.js';

function completedBatterySession() {
  let session = createBatterySession({ runId: 'battery-t-001', now: 100 });
  session = advanceBatteryState(session, { type: 'START_CONSENT', timestamp: 110 });
  session = advanceBatteryState(session, { type: 'ACCEPT_CONSENT', timestamp: 120 });
  session = advanceBatteryState(session, { type: 'CAMERA_READY', timestamp: 130 });
  session = advanceBatteryState(session, { type: 'BASELINE_COMPLETE', timestamp: 160 });
  for (let index = 0; index < session.blocks.length; index += 1) {
    session = advanceBatteryState(session, { type: 'START_BLOCK', timestamp: 200 + index * 20 });
    session = advanceBatteryState(session, { type: 'BLOCK_COMPLETE', timestamp: 210 + index * 20, result: { completedTrialCount: session.blocks[index].trialCount, accuracy: 0.8 } });
    if (index < session.blocks.length - 1) {
      session = advanceBatteryState(session, { type: 'REST_COMPLETE', timestamp: 215 + index * 20 });
    }
  }
  session = advanceBatteryState(session, { type: 'RECOVERY_COMPLETE', timestamp: 400 });
  return session;
}

const gameSummary = {
  eventCount: 42,
  performance: { trialCount: 12, completedTrialCount: 12, accuracy: 0.83, meanReactionTimeMs: 430, meanScore: 0.78 },
  motor: { pathEfficiencyMean: 0.81, smoothPursuitScore: 0.76, overshootRate: 0.14 },
  inhibition: { commissionErrorRate: 0.08, omissionErrorRate: 0.04, postErrorSlowingMs: 110 },
  interference: { conflictCostMs: 180, errorRate: 0.12 },
  visualSearch: { searchEfficiency: 0.72, meanSetSize: 12, errorRate: 0.1 },
};

const gameCorrelation = {
  schemaVersion: 'game_signal_correlation_v3',
  aggregate: {
    trialCount: 12,
    completedTrialCount: 12,
    accuracy: 0.83,
    meanReactionTimeMs: 430,
    meanReactionPostureDelta: -0.04,
    byGameId: { simple_rt: 2, visual_search: 2 },
  },
  trials: [
    {
      trialId: 'raw-trial-id',
      gameId: 'visual_search',
      windows: { reaction: { rawFaceSamples: [{ landmarks: [1, 2, 3] }] } },
      game: { items: [{ id: 'raw-stimulus' }] },
    },
  ],
};

const edgeAIResult = {
  modelVersion: 'krumm-edge-ai-v9.1.0-game-aware',
  schemaVersion: 'edge_ai_model_output_v8',
  composite: { score: 74, level: 'high' },
  confidence: { score: 0.82, level: 'high' },
  channels: {
    taskPerformance: { score: 78, level: 'high', label: 'Rendimiento' },
    motorControl: { score: 72, level: 'medium', label: 'Control motor' },
  },
  caveats: ['observational_only'],
  multimodal: { faceSamples: [{ landmarks: [9] }], gameCorrelation: { trials: [{ windows: {} }] } },
};

const featureVectorV2 = {
  type: 'assessment_feature_vector_v2',
  version: '0.2.0',
  featureOrder: ['game.accuracy', 'edge.taskPerformanceScore'],
  featureArray: [0.83, 78],
  featureMap: { 'game.accuracy': 0.83, 'edge.taskPerformanceScore': 78 },
  qualityFlags: [],
  privacy: { aggregateOnly: true },
  rawGameEvents: [{ should: 'not-export' }],
};

const adaptiveDifficultyTrace = [{
  type: 'adaptive_difficulty_recommendation_v1',
  previousLevel: 4,
  nextLevel: 5,
  direction: 'up',
  reasonCodes: ['high_accuracy'],
  trace: { timestamp: 350, metricsUsed: ['accuracy'] },
  snapshot: { accuracy: 0.83, meanReactionTimeMs: 430 },
}];

describe('assessmentSession', () => {
  it('builds a unified assessment session from completed battery and aggregate telemetry', () => {
    const session = buildUnifiedAssessmentSession({
      batterySession: completedBatterySession(),
      generatedAt: '2026-06-18T23:00:00.000Z',
      consent: { camera: true, aggregateExport: true, humanReviewOnly: true },
      telemetry: { sampleCount: 120, facePresenceRatio: 0.92, meanConfidence: 0.87, fpsEstimate: 15 },
      gameSummary,
      gameCorrelation,
      edgeAIResult,
      featureVectorV2,
      adaptiveDifficultyTrace,
    });

    expect(session).toMatchObject({
      schemaVersion: 'krumm_unified_assessment_session_v1',
      runId: 'battery-t-001',
      batteryId: 'krumm_unified_battery_v1',
      generatedAt: '2026-06-18T23:00:00.000Z',
      consent: { camera: true, aggregateExport: true, humanReviewOnly: true },
      gameSummary: { eventCount: 42, performance: { accuracy: 0.83 } },
      gameCorrelation: { schemaVersion: 'game_signal_correlation_v3', aggregate: { completedTrialCount: 12 } },
      featureVectorV2: { type: 'assessment_feature_vector_v2', version: '0.2.0' },
      governance: { humanReviewOnly: true, noAutomatedDecision: true, observationalOnly: true, privacySafe: true },
    });
    expect(session.blocks).toHaveLength(6);
    expect(session.qualitySummary).toMatchObject({ sampleCount: 120, facePresenceRatio: 0.92, meanConfidence: 0.87, correlatedTrialCount: 12 });
    expect(session.edgeAI).toMatchObject({ modelVersion: 'krumm-edge-ai-v9.1.0-game-aware', composite: { score: 74 } });
    expect(validateAssessmentSessionPrivacy(session)).toEqual({ ok: true, violations: [] });

    const serialized = JSON.stringify(session);
    expect(serialized).not.toContain('raw-stimulus');
    expect(serialized).not.toContain('raw-trial-id');
    expect(serialized).not.toContain('windows');
    expect(serialized).not.toContain('faceSamples');
    expect(serialized).not.toContain('pointerSamples');
    expect(serialized).not.toContain('landmarks');
    expect(serialized).not.toContain('rawGameEvents');
  });

  it('builds quality summary with signal caveats', () => {
    const quality = buildQualitySummary({
      telemetry: { sampleCount: 12, facePresenceRatio: 0.55, meanConfidence: 0.42, fpsEstimate: 8 },
      gameCorrelation: { aggregate: { completedTrialCount: 0 } },
      edgeAIResult: { confidence: { score: 0.4 } },
    });

    expect(quality.caveats).toEqual(expect.arrayContaining([
      'low_face_presence',
      'low_face_confidence',
      'missing_game_correlation',
      'low_model_confidence',
    ]));
  });

  it('detects forbidden raw-data keys before export', () => {
    const unsafe = {
      ok: true,
      nested: {
        faceSamples: [],
        rawGameEvents: [],
        pointerSamples: [],
        fullRoute: ['0,0', '1,0'],
        routeTrace: [{ x: 0, y: 0 }],
        visitedCells: ['0,0'],
        stepByStepPath: ['right'],
        keypoints: [{ x: 0.5, y: 0.5 }],
        normalizedKeypoints: [{ x: 0.5, y: 0.5 }],
        clickTrace: [{ t: 1 }],
        eventLog: [{ type: 'move' }],
        trials: [{ x: 1, y: 2 }],
      },
    };
    const result = validateAssessmentSessionPrivacy(unsafe);
    expect(result.ok).toBe(false);
    expect(result.violations).toEqual(expect.arrayContaining([
      'faceSamples',
      'rawGameEvents',
      'pointerSamples',
      'fullRoute',
      'routeTrace',
      'visitedCells',
      'stepByStepPath',
      'keypoints',
      'normalizedKeypoints',
      'clickTrace',
      'eventLog',
      'trials',
    ]));
    expect(ASSESSMENT_FORBIDDEN_KEYS).toContain('landmarks');
  });
});
