// test: HR dashboard synthetic aggregate data
import { describe, expect, it } from 'vitest';
import {
  HR_DASHBOARD_CANDIDATES,
  buildHrDashboardSummary,
  filterHrDashboardCandidates,
  getHrDashboardRoles,
  validateHrDashboardDataPrivacy,
  mapSessionToCandidate,
} from './hrDashboardData.js';

describe('HR dashboard synthetic aggregate data', () => {
  it('provides deterministic review cases without direct identifiers or raw telemetry', () => {
    expect(HR_DASHBOARD_CANDIDATES.length).toBeGreaterThanOrEqual(5);
    expect(HR_DASHBOARD_CANDIDATES.every((candidate) => /^Perfil\s\d{3}$/.test(candidate.alias))).toBe(true);
    expect(HR_DASHBOARD_CANDIDATES.every((candidate) => !candidate.name && !candidate.email)).toBe(true);
    expect(validateHrDashboardDataPrivacy(HR_DASHBOARD_CANDIDATES)).toEqual({ ok: true, violations: [] });
  });

  it('keeps completed profiles comparable at evidence level without ranking candidates', () => {
    const completed = HR_DASHBOARD_CANDIDATES.filter((candidate) => candidate.status !== 'in_progress');
    expect(completed.length).toBeGreaterThan(0);
    for (const candidate of completed) {
      expect(candidate.constructs).toHaveLength(8);
      expect(candidate.constructs.every((construct) => Number.isFinite(construct.score))).toBe(true);
      expect(candidate.constructs.every((construct) => construct.confidence >= 0.55 && construct.confidence <= 0.6)).toBe(true);
      expect(candidate).not.toHaveProperty('rank');
      expect(candidate).not.toHaveProperty('recommendation');
    }
    const inProgress = HR_DASHBOARD_CANDIDATES.find((candidate) => candidate.status === 'in_progress');
    expect(inProgress.constructs.filter((construct) => construct.score == null)).toHaveLength(4);
  });

  it('summarizes the review queue using coverage and workflow states', () => {
    const summary = buildHrDashboardSummary(HR_DASHBOARD_CANDIDATES);

    expect(summary).toMatchObject({
      total: HR_DASHBOARD_CANDIDATES.length,
      completed: expect.any(Number),
      ready: expect.any(Number),
      needsReview: expect.any(Number),
      averageCoverage: expect.any(Number),
    });
    expect(summary.completed).toBeGreaterThan(summary.ready - 1);
    expect(summary.averageCoverage).toBeGreaterThan(0);
    expect(summary.averageCoverage).toBeLessThanOrEqual(1);
  });

  it('filters by free-text, status and role without mutating the source list', () => {
    const sourceIds = HR_DASHBOARD_CANDIDATES.map((candidate) => candidate.id);
    const target = HR_DASHBOARD_CANDIDATES[1];
    const filtered = filterHrDashboardCandidates(HR_DASHBOARD_CANDIDATES, {
      query: target.alias.slice(-3),
      status: target.status,
      role: target.role,
    });

    expect(filtered.map((candidate) => candidate.id)).toContain(target.id);
    expect(HR_DASHBOARD_CANDIDATES.map((candidate) => candidate.id)).toEqual(sourceIds);
    expect(getHrDashboardRoles(HR_DASHBOARD_CANDIDATES)).toEqual(
      [...new Set(HR_DASHBOARD_CANDIDATES.map((candidate) => candidate.role))].sort((a, b) => a.localeCompare(b, 'es')),
    );
  });

  it('maps backend session items to candidate format', () => {
    // Test mapping with a sample session item shaped like backend DynamoDB output.
    const sampleSession = {
      sessionId: 'run-m2-001',
      payload: {
        schemaVersion: 'krumm_final_assessment_payload_v1',
        runId: 'run-m2-001',
        batteryId: 'krumm_unified_battery_v1',
        participant: {
          aliasHash: 'Perfil-042',
          declaredRoleTarget: 'Analista de Operaciones',
        },
        quality: {
          sampleCount: 150,
          facePresenceRatio: 0.91,
          meanConfidence: 0.88,
          caveats: [],
        },
        behavioral: {
          gameSummary: {
            performance: {
              accuracy: 0.84,
              completedTrialCount: 18,
              meanReactionTimeMs: 420,
              meanScore: 0.88,
            },
            eventCount: 18,
          },
          gameCorrelationAggregate: {
            completedTrialCount: 18,
          },
          featureVectorV2: {
            type: 'assessment_feature_vector_v2',
            version: '0.2.0',
            featureOrder: ['game.accuracy'],
            featureMap: { 'game.accuracy': 0.84 },
            qualityFlags: [],
          },
          gameResults: [
            { index: 0, gameId: 'laser', label: 'Puzzle láser', status: 'completed', trialCount: 2, result: { score: 0.88, solvedLevels: 2, aggregateOnly: true } },
            { index: 1, gameId: 'balloon', label: 'Riesgo y feedback', status: 'completed', trialCount: 8, result: { score: 0.72, aggregateOnly: true } },
            { index: 2, gameId: 'routes', label: 'Rutas', status: 'completed', trialCount: 5, result: { score: 0.95, aggregateOnly: true } },
            { index: 3, gameId: 'team', label: 'Operación Faro', status: 'completed', trialCount: 4, result: { score: 0.83, aggregateOnly: true } },
          ],
        },
        talentProfile: {
          schemaVersion: 'krumm_talent_profile_v1',
          runId: 'run-m2-001',
          batteryId: 'krumm_unified_battery_v1',
          dimensions: {
            decisionMaking: { id: 'decisionMaking', label: 'Toma de decisiones', labelEn: 'Decision making', score: 86, confidence: 0.58 },
            problemSolving: { id: 'problemSolving', label: 'Resolución de problemas', labelEn: 'Problem solving', score: 92, confidence: 0.58 },
            riskFeedbackProfile: { id: 'riskFeedbackProfile', label: 'Riesgo y feedback', labelEn: 'Risk and feedback', score: 71, confidence: 0.58 },
            planning: { id: 'planning', label: 'Planificación', labelEn: 'Planning', score: 94, confidence: 0.58 },
            adaptability: { id: 'adaptability', label: 'Adaptabilidad', labelEn: 'Adaptability', score: 82, confidence: 0.58 },
            analyticalThinking: { id: 'analyticalThinking', label: 'Pensamiento analítico', labelEn: 'Analytical thinking', score: 78, confidence: 0.58 },
            leadership: { id: 'leadership', label: 'Liderazgo', labelEn: 'Leadership', score: 84, confidence: 0.58 },
            communication: { id: 'communication', label: 'Comunicación', labelEn: 'Communication', score: 89, confidence: 0.58 },
          },
          globalSummary: {
            strengths: ['Liderazgo', 'Comunicación'],
            watchAreas: ['Toma de decisiones', 'Áreas a revisar'],
            confidence: 0.58,
          },
          governance: {
            humanReviewOnly: true,
            noAutomatedDecision: true,
            observationalOnly: true,
          },
        },
        edgeAI: null,
      },
      createdAt: '2026-09-03T14:30:00.000Z',
    };

    const candidate = mapSessionToCandidate(sampleSession);

    expect(candidate.id).toBe('run-m2-001');
    expect(candidate.alias).toBe('Perfil-042');
    expect(candidate.role).toBe('Analista de Operaciones');
    expect(candidate.completedAt).toBe('2026-09-03T14:30:00.000Z');
    expect(candidate.status).toBe('ready'); // all 4 games completed
    expect(candidate.completedGames).toBe(4);
    expect(candidate.sessionQuality).toBeCloseTo(0.91);
    expect(candidate.scores).toHaveLength(8);
    expect(candidate.scores.every(s => Number.isFinite(s))).toBe(true);
    expect(candidate.games).toHaveLength(4);
    expect(candidate.games[0].value).toBe(88); // laser score from result
    expect(candidate.games[1].value).toBe(72); // balloon score from result
    expect(candidate.games[2].value).toBe(95); // routes score from result
    expect(candidate.games[3].value).toBe(83); // team score from result
    // Summary contains first strength and first watchArea
    expect(candidate.summary).toContain('Liderazgo');
    expect(candidate.summary).toContain('Toma de decisiones');
    // Verify no forbidden keys leaked.
    const privacy = validateHrDashboardDataPrivacy(candidate);
    expect(privacy.ok).toBe(true);
    expect(privacy.violations).toEqual([]);
  });

  it('maps backend session without talent dimensions gracefully', () => {
    // Test mapping a minimal session without dimensions.
    const minimalSession = {
      sessionId: 'run-min-001',
      payload: {
        schemaVersion: 'krumm_final_assessment_payload_v1',
        runId: 'run-min-001',
        batteryId: 'krumm_unified_battery_v1',
        participant: {
          aliasHash: 'Perfil-099',
        },
        quality: {
          sampleCount: 30,
          facePresenceRatio: 0.65,
          meanConfidence: 0.5,
          caveats: ['low_sample_count', 'low_face_presence'],
        },
        behavioral: {
          gameSummary: {
            performance: {
              accuracy: 0.6,
              completedTrialCount: 3,
            },
          },
        },
        talentProfile: {
          schemaVersion: 'krumm_talent_profile_v1',
          runId: 'run-min-001',
          dimensions: {}, // empty dimensions
          globalSummary: {
            strengths: [],
            watchAreas: [],
            confidence: 0.5,
          },
          governance: {
            humanReviewOnly: true,
            noAutomatedDecision: true,
            observationalOnly: true,
          },
        },
      },
      createdAt: '2026-09-03T10:00:00.000Z',
    };

    const candidate = mapSessionToCandidate(minimalSession);

    expect(candidate.id).toBe('run-min-001');
    expect(candidate.alias).toBe('Perfil-099');
    expect(candidate.status).toBe('in_progress'); // not all games completed
    expect(candidate.completedGames).toBe(0);
    expect(candidate.scores).toHaveLength(8);
    // All scores should be null when no dimensions
    expect(candidate.scores.every(s => s === null)).toBe(true);
    expect(candidate.sessionQuality).toBeCloseTo(0.65);
    expect(candidate.caveats).toContain('low_sample_count');
    expect(candidate.caveats).toContain('low_face_presence');
    // Summary should be generic when no globalSummary details
    expect(candidate.summary).toBe('Evaluación en progreso');
  });
});