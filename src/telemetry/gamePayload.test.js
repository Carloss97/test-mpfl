import { describe, expect, it } from 'vitest';
import { buildFusionPayload } from './payload.js';
import { generateReport } from './reportGenerator.js';
import { buildGameFeatureVectorV2 } from './gameFeatureVector.js';

const faceSamples = [
  { timestamp: 0, blendshapes: { jawOpen: 0.1, browInnerUp: 0.1 }, quality: { facePresent: true, confidence: 0.9 } },
  { timestamp: 100, blendshapes: { jawOpen: 0.2, browInnerUp: 0.2 }, quality: { facePresent: true, confidence: 0.92 } },
  { timestamp: 200, blendshapes: { jawOpen: 0.3, browInnerUp: 0.2 }, quality: { facePresent: true, confidence: 0.88 } },
];

const gameSummary = {
  eventCount: 9,
  performance: { trialCount: 4, completedTrialCount: 4, accuracy: 0.75, meanReactionTimeMs: 420, meanScore: 0.7 },
  motor: { pathEfficiencyMean: 0.82, smoothPursuitScore: 0.78, overshootRate: 0.2, jerkMean: 0.01 },
  inhibition: { commissionErrorRate: 0.25, omissionErrorRate: 0, postErrorSlowingMs: 90 },
  interference: { conflictCostMs: 120, errorRate: 0.1 },
  visualSearch: { searchEfficiency: 0.66, meanSetSize: 12, errorRate: 0.1 },
};

const gameCorrelation = {
  schemaVersion: 'game_signal_correlation_v3',
  aggregate: { trialCount: 4, completedTrialCount: 4, accuracy: 0.75, meanReactionTimeMs: 420, meanReactionPostureDelta: -0.06, meanReactionFacePresenceDelta: 0.02, byGameId: { visual_search: 2 } },
  trials: [{ trialId: 't1', windows: { reaction: { raw: 'should-not-export' } }, game: { items: [{ id: 'raw-stimulus' }] } }],
};

describe('game payload privacy-safe export', () => {
  it('adds game summary, correlation aggregate, and feature vector v2 without raw telemetry', () => {
    const vector = buildGameFeatureVectorV2({ gameSummary, gameCorrelation, edgeModelOutput: { confidence: { score: 0.8 }, channels: {} } });
    const payload = buildFusionPayload({
      runId: 'run-n-001',
      generatedAt: '2026-06-18T18:00:00.000Z',
      startedAt: 0,
      endedAt: 1000,
      faceSamples,
      pointerSummary: { sampleCount: 0 },
      gameSummary,
      gameCorrelation,
      gameFeatureVector: vector,
      runtime: { delegate: 'GPU' },
    });

    expect(payload.gameTelemetry).toMatchObject({
      summary: { eventCount: 9, performance: { accuracy: 0.75, completedTrialCount: 4 } },
      correlation: { schemaVersion: 'game_signal_correlation_v3', aggregate: { completedTrialCount: 4 } },
      featureVector: { type: 'assessment_feature_vector_v2', version: '0.2.0' },
    });
    expect(payload.privacy.rawGameEventsStored).toBe(false);
    const text = JSON.stringify(payload);
    expect(text).not.toContain('windows');
    expect(text).not.toContain('raw-stimulus');
    expect(text).not.toContain('items');
    expect(text).not.toContain('gameEvents');
    expect(text).not.toContain('pointerSamples');
    expect(text).not.toContain('landmarks');
  });
});

describe('game telemetry report sections', () => {
  it('includes gamified activity and feature vector sections in markdown and json reports', () => {
    const vector = buildGameFeatureVectorV2({ gameSummary, gameCorrelation, edgeModelOutput: { confidence: { score: 0.8 }, channels: {} } });
    const telemetry = { sampleCount: 25, facePresenceRatio: 0.9, meanConfidence: 0.88, fpsEstimate: 15, insights: {} };
    const markdown = generateReport({
      format: 'markdown',
      telemetry,
      edgeAIResult: { composite: { score: 71, level: 'high' }, confidence: { score: 0.8, level: 'high' }, channels: {}, caveats: [] },
      gameSummary,
      gameCorrelation,
      assessmentFeatureVector: vector,
      sessionInfo: { runId: 'run-n-001', durationSeconds: 12, durationMs: 12000 },
    });
    expect(markdown).toContain('Actividad gamificada');
    expect(markdown).toContain('Feature vector v2');
    expect(markdown).toContain('75%');

    const json = JSON.parse(generateReport({
      format: 'json',
      telemetry,
      edgeAIResult: { composite: { score: 71, level: 'high' }, confidence: { score: 0.8, level: 'high' }, channels: {}, caveats: [] },
      gameSummary,
      gameCorrelation,
      assessmentFeatureVector: vector,
    }));
    expect(json.gameTelemetry.summary.performance.accuracy).toBe(0.75);
    expect(json.gameTelemetry.correlation.aggregate.completedTrialCount).toBe(4);
    expect(json.gameTelemetry.assessmentFeatureVector.type).toBe('assessment_feature_vector_v2');
    expect(JSON.stringify(json)).not.toContain('windows');
    expect(JSON.stringify(json)).not.toContain('raw-stimulus');
  });
});
