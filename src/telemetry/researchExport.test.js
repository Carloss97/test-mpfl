import { describe, expect, it } from 'vitest';
import { buildGameFeatureVectorV2 } from './gameFeatureVector.js';
import {
  buildResearchDataset,
  exportResearchCsv,
  exportResearchJsonl,
} from './researchExport.js';

const gameSummary = {
  performance: { trialCount: 2, completedTrialCount: 2, accuracy: 0.5, meanReactionTimeMs: 500, meanScore: 0.5 },
  motor: { pathEfficiencyMean: 0.7, overshootRate: 0.2, jerkMean: 0.01 },
  inhibition: { commissionErrorRate: 0.5, omissionErrorRate: 0, postErrorSlowingMs: 120 },
  interference: { conflictCostMs: 220, errorRate: 0.2 },
  visualSearch: { searchEfficiency: 0.6, meanSetSize: 12, errorRate: 0.2 },
};

const gameCorrelation = {
  schemaVersion: 'game_signal_correlation_v3',
  aggregate: { trialCount: 2, completedTrialCount: 2, accuracy: 0.5, meanReactionTimeMs: 500, meanReactionPostureDelta: -0.1, byGameId: { go_nogo: 1, visual_search: 1 } },
  trials: [
    { trialId: 'raw-id-1', gameId: 'go_nogo', outcome: 'commission_error', correct: false, reactionTimeMs: 480, windows: { reaction: { raw: 'secret-window' } }, game: { items: [{ id: 'raw-stimulus' }] } },
    { trialId: 'raw-id-2', gameId: 'visual_search', outcome: 'target_found', correct: true, reactionTimeMs: 520, windows: { reaction: { raw: 'secret-window' } } },
  ],
};

const featureVector = buildGameFeatureVectorV2({
  runId: 'session-a',
  generatedAt: '2026-06-18T19:00:00.000Z',
  gameSummary,
  gameCorrelation,
  edgeModelOutput: { confidence: { score: 0.8 }, channels: { taskPerformance: { score: 66 }, motorControl: { score: 70 } } },
});

describe('researchExport', () => {
  it('builds privacy-safe per-trial research records compatible with feature vector v2', () => {
    const dataset = buildResearchDataset({
      studyId: 'krumm-local-study',
      generatedAt: '2026-06-18T19:05:00.000Z',
      sessions: [{ runId: 'session-a', participantAlias: 'should-not-export', gameSummary, gameCorrelation, featureVector }],
    });

    expect(dataset).toMatchObject({
      schemaVersion: 'krumm_research_export_v1',
      studyId: 'krumm-local-study',
      generatedAt: '2026-06-18T19:05:00.000Z',
      privacy: {
        containsPII: false,
        containsRawVideo: false,
        containsRawPointerPath: false,
        containsFacialLandmarks: false,
        containsRawGameEvents: false,
      },
    });
    expect(dataset.featureOrder).toEqual(featureVector.featureOrder);
    expect(dataset.records).toHaveLength(2);
    expect(dataset.records[0]).toMatchObject({
      runId: 'session-a',
      trialIndex: 0,
      gameId: 'go_nogo',
      outcome: 'commission_error',
      correct: false,
      reactionTimeMs: 480,
      featureVectorType: 'assessment_feature_vector_v2',
    });
    const text = JSON.stringify(dataset);
    expect(text).not.toContain('should-not-export');
    expect(text).not.toContain('raw-id');
    expect(text).not.toContain('windows');
    expect(text).not.toContain('raw-stimulus');
    expect(text).not.toContain('secret-window');
    expect(text).not.toContain('landmarks');
  });

  it('exports JSONL and CSV with stable columns', () => {
    const dataset = buildResearchDataset({ sessions: [{ runId: 'session-a', gameSummary, gameCorrelation, featureVector }] });
    const jsonl = exportResearchJsonl(dataset);
    const lines = jsonl.trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]).runId).toBe('session-a');

    const csv = exportResearchCsv(dataset);
    const rows = csv.trim().split('\n');
    expect(rows[0]).toContain('runId,trialIndex,gameId,outcome,correct,reactionTimeMs');
    expect(rows[0]).toContain('feature.game.accuracy');
    expect(rows).toHaveLength(3);
    expect(csv).not.toContain('windows');
    expect(csv).not.toContain('raw-stimulus');
  });
});
