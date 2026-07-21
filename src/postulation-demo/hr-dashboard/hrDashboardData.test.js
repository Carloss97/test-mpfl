import { describe, expect, it } from 'vitest';
import {
  HR_DASHBOARD_CANDIDATES,
  buildHrDashboardSummary,
  filterHrDashboardCandidates,
  getHrDashboardRoles,
  validateHrDashboardDataPrivacy,
} from './hrDashboardData.js';

describe('HR dashboard synthetic aggregate data', () => {
  it('provides deterministic review cases without direct identifiers or raw telemetry', () => {
    expect(HR_DASHBOARD_CANDIDATES.length).toBeGreaterThanOrEqual(5);
    expect(HR_DASHBOARD_CANDIDATES.every((candidate) => /^Perfil \d{3}$/.test(candidate.alias))).toBe(true);
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
});
