import { describe, expect, it } from 'vitest';
import {
  validateSessionPayload,
  scanForbiddenKeys,
  extractRunId,
} from '../src/privacy/validatePayload.mjs';

const VALID_PAYLOAD = {
  schemaVersion: 'krumm_final_assessment_payload_v1',
  runId: 'run-m2-001',
  batteryId: 'krumm_unified_battery_v1',
  generatedAt: '2026-09-03T00:00:00.000Z',
  participant: { aliasHash: 'h-abc123', declaredRoleTarget: 'Analista' },
  quality: { sampleCount: 150, facePresenceRatio: 0.91 },
  behavioral: {
    gameSummary: { performance: { accuracy: 0.84, completedTrialCount: 18 } },
    gameCorrelationAggregate: { completedTrialCount: 18 },
    featureVectorV2: { type: 'assessment_feature_vector_v2', version: '0.2.0', featureOrder: ['game.accuracy'], featureArray: [0.84], featureMap: { 'game.accuracy': 0.84 }, qualityFlags: [] },
    gameResults: [{ index: 0, gameId: 'laser_puzzle', label: 'Puzzle láser', status: 'completed', trialCount: 2, result: { score: 0.88, solvedLevels: 2, aggregateOnly: true } }],
  },
  talentProfile: { schemaVersion: 'krumm_talent_profile_v1', runId: 'run-m2-001', dimensions: {}, globalSummary: {}, governance: { humanReviewOnly: true, noAutomatedDecision: true, observationalOnly: true } },
  governance: { humanReviewOnly: true, noAutomatedDecision: true, observationalOnly: true, privacySafe: true },
};

describe('backend privacy validateSessionPayload (server-side última frontera)', () => {
  it('acepta un payload aggregate-only válido', () => {
    const result = validateSessionPayload(VALID_PAYLOAD);
    expect(result).toEqual({ ok: true, violations: [] });
  });

  it('rechaza payload con raw fields anidados (FORBIDDEN_KEYS)', () => {
    const raw = {
      ...VALID_PAYLOAD,
      behavioral: {
        ...VALID_PAYLOAD.behavioral,
        rawGameEvents: [],
        gameResults: [{ result: { fullRoute: ['0,0'] } }],
      },
    };
    const result = validateSessionPayload(raw);
    expect(result.ok).toBe(false);
    expect(result.violations).toEqual(expect.arrayContaining(['rawGameEvents', 'fullRoute']));
  });

  it('rechaza payload con landmarks/pointerSamples en cualquier profundidad', () => {
    const raw = {
      ...VALID_PAYLOAD,
      edgeAI: { channels: { nested: { landmarks: [[0.1, 0.2]] } } },
    };
    const result = validateSessionPayload(raw);
    expect(result.ok).toBe(false);
    expect(result.violations).toEqual(expect.arrayContaining(['landmarks']));
  });

  it('rechaza payload con gobernanza incompleta', () => {
    const bad = { ...VALID_PAYLOAD, governance: { humanReviewOnly: false } };
    const result = validateSessionPayload(bad);
    expect(result.ok).toBe(false);
    expect(result.violations).toEqual(expect.arrayContaining(['humanReviewOnly_false']));
  });

  it('scanForbiddenKeys detecta claves prohibidas en arrays', () => {
    const violations = scanForbiddenKeys({ events: [{ pointerSamples: [1] }] });
    expect(violations).toEqual(expect.arrayContaining(['pointerSamples']));
  });

  it('extractRunId normaliza', () => {
    expect(extractRunId({ runId: '  abc  ' })).toBe('abc');
    expect(extractRunId({ runId: '' })).toBeNull();
    expect(extractRunId({})).toBeNull();
  });
});