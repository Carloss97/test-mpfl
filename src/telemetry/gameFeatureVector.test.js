import { describe, expect, it } from 'vitest';
import { buildGameFeatureVectorV2, GAME_FEATURE_VECTOR_V2_ORDER } from './gameFeatureVector.js';
import { buildAssessmentFeatureVector, buildAssessmentFeatureVectorV2 } from './assessmentFeatureVector.js';

const gameSummary = {
  eventCount: 18,
  performance: {
    trialCount: 6,
    completedTrialCount: 5,
    accuracy: 0.8,
    meanReactionTimeMs: 430,
    meanScore: 0.74,
  },
  motor: {
    pathEfficiencyMean: 0.82,
    jerkMean: 0.012,
    correctionRate: 1.4,
    overshootRate: 0.25,
    trackingLossRatio: 0.1,
    smoothPursuitScore: 0.78,
  },
  fitts: {
    meanIndexDifficulty: 3.2,
    meanThroughput: 4.1,
  },
  inhibition: {
    commissionErrorRate: 0.2,
    omissionErrorRate: 0.1,
    postErrorSlowingMs: 85,
  },
  interference: {
    conflictCostMs: 140,
    errorRate: 0.15,
  },
  visualSearch: {
    meanSetSize: 14,
    meanDistractorCount: 13,
    searchEfficiency: 0.68,
    errorRate: 0.1,
  },
};

const gameCorrelation = {
  schemaVersion: 'game_signal_correlation_v3',
  aggregate: {
    trialCount: 6,
    completedTrialCount: 5,
    accuracy: 0.8,
    meanReactionTimeMs: 430,
    meanReactionFacePresenceDelta: 0.03,
    meanReactionPostureDelta: -0.08,
    byGameId: { visual_search: 2, go_nogo: 2, precision_targeting: 2 },
  },
  trials: [
    {
      trialId: 't1',
      gameId: 'visual_search',
      outcome: 'target_found',
      correct: true,
      reactionTimeMs: 390,
      game: { setSize: 12, distractorCount: 11, items: [{ id: 'raw-stimulus' }] },
      windows: {
        reaction: {
          gaze: { lookingAtScreenRatio: 1 },
          posture: { meanHeadForward: 0.12, meanPostureScore: 0.84 },
          upperBody: { meanArmActivity: 0.22 },
          face: { activeAUCount: 2 },
        },
      },
      deltas: { postVsPre: { activeAUCountDelta: 0.1 } },
    },
    {
      trialId: 't2',
      gameId: 'go_nogo',
      outcome: 'commission_error',
      correct: false,
      reactionTimeMs: 510,
      windows: {
        reaction: {
          gaze: { lookingAtScreenRatio: 0.5 },
          posture: { meanHeadForward: 0.35, meanPostureScore: 0.62 },
          upperBody: { meanArmActivity: 0.58 },
          face: { activeAUCount: 5 },
        },
      },
      deltas: { postVsPre: { activeAUCountDelta: 1.4 } },
    },
  ],
};

const edgeModelOutput = {
  modelVersion: 'krumm-edge-ai-v8.2.0-game-aware',
  confidence: { score: 0.76, level: 'high' },
  channels: {
    taskPerformance: { score: 81 },
    motorControl: { score: 74 },
  },
  multimodal: { gameCorrelation: { available: true, trialCount: 6 } },
};

describe('buildGameFeatureVectorV2', () => {
  it('builds a stable numeric assessment_feature_vector_v2 from game summary and correlation', () => {
    const vector = buildGameFeatureVectorV2({
      runId: 'run-k-001',
      generatedAt: '2026-06-18T17:00:00.000Z',
      gameSummary,
      gameCorrelation,
      edgeModelOutput,
      runtime: { delegate: 'GPU' },
    });

    expect(vector).toMatchObject({
      type: 'assessment_feature_vector_v2',
      version: '0.2.0',
      runId: 'run-k-001',
      generatedAt: '2026-06-18T17:00:00.000Z',
      privacy: {
        rawVideoStored: false,
        rawFramesStored: false,
        rawPointerPathStored: false,
        facialLandmarksStored: false,
        rawGameEventsStored: false,
        payloadContainsAggregatesOnly: true,
      },
      aggregate: {
        trialCount: 6,
        completedTrialCount: 5,
        accuracy: 0.8,
        meanReactionTimeMs: 430,
        correlatedTrialCount: 5,
      },
      game: {
        meanScore: 0.74,
        visualSearchEfficiency: 0.68,
        fittsThroughput: 4.1,
      },
      response: {
        commissionErrorRate: 0.2,
        omissionErrorRate: 0.1,
        postErrorSlowingMs: 85,
      },
      multimodalDuringTrials: {
        gazeOffscreenRatio: 0.25,
        meanHeadForward: 0.235,
        meanArmActivity: 0.4,
        postErrorTensionDelta: 1.4,
      },
    });
    expect(vector.featureOrder).toEqual(GAME_FEATURE_VECTOR_V2_ORDER);
    expect(vector.featureArray).toHaveLength(GAME_FEATURE_VECTOR_V2_ORDER.length);
    expect(vector.featureArray.every(Number.isFinite)).toBe(true);
    expect(vector.featureMap['game.meanScore']).toBe(0.74);
    expect(vector.featureMap['pointer.pathEfficiencyMean']).toBe(0.82);
    expect(vector.featureMap['gaze.offscreenDuringTrialsRatio']).toBe(0.25);
  });

  it('is privacy-safe and does not include raw windows, stimuli, landmarks, or paths', () => {
    const vector = buildGameFeatureVectorV2({ gameSummary, gameCorrelation, edgeModelOutput });
    const text = JSON.stringify(vector);
    expect(text).not.toContain('windows');
    expect(text).not.toContain('raw-stimulus');
    expect(text).not.toContain('items');
    expect(text).not.toContain('blendshapes');
    expect(text).not.toContain('landmarks');
    expect(text).not.toContain('pointerSamples');
  });

  it('adds quality flags for weak coverage without breaking numeric dimensionality', () => {
    const vector = buildGameFeatureVectorV2({
      gameSummary: { performance: { trialCount: 4, completedTrialCount: 1, accuracy: 0.25 } },
      gameCorrelation: { aggregate: { trialCount: 4, completedTrialCount: 1, accuracy: 0.25 }, trials: [] },
      edgeModelOutput: { confidence: { score: 0.2 } },
    });

    expect(vector.qualityFlags).toContain('incomplete_game_coverage');
    expect(vector.qualityFlags).toContain('low_model_confidence');
    expect(vector.featureArray.every(Number.isFinite)).toBe(true);
  });
});

describe('assessmentFeatureVector v2 integration', () => {
  it('keeps v1 unchanged and exposes a v2 builder for game-aware vectors', () => {
    expect(buildAssessmentFeatureVector({}).type).toBe('assessment_feature_vector_v1');
    const vector = buildAssessmentFeatureVectorV2({ gameSummary, gameCorrelation, edgeModelOutput });
    expect(vector.type).toBe('assessment_feature_vector_v2');
    expect(vector.featureOrder).toEqual(GAME_FEATURE_VECTOR_V2_ORDER);
  });
});
