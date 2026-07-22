import { describe, expect, it } from 'vitest';
import {
  buildTeamCoordinationResponseAggregate,
  buildTeamCoordinationScenarios,
  sanitizeTeamCoordinationResponsePayload,
  validateTeamCoordinationAggregatePrivacy,
} from './teamCoordinationTelemetry.js';

describe('team_coordination_aggregate_v1', () => {
  it('defines four structured scenarios for leadership, communication and adaptability without free text', () => {
    const scenarios = buildTeamCoordinationScenarios();

    expect(scenarios).toHaveLength(4);
    expect(scenarios.map((scenario) => scenario.id)).toEqual([
      'team-brief-1-alignment',
      'team-brief-2-communication',
      'team-brief-3-feedback',
      'team-brief-4-adaptation',
    ]);
    for (const scenario of scenarios) {
      expect(scenario.options).toHaveLength(3);
      expect(scenario.measuredConstructs.length).toBeGreaterThanOrEqual(2);
      expect(JSON.stringify(scenario.options)).not.toMatch(/freeText|typedResponse|messageText/i);
    }
    const bestOptionIndexes = scenarios.map((scenario) => {
      const scores = scenario.options.map((option) => (
        option.scores.leadership
        + option.scores.communication
        + option.scores.adaptability
        + option.scores.decision
      ));
      return scores.indexOf(Math.max(...scores));
    });
    expect(bestOptionIndexes).toEqual([1, 2, 1, 2]);
  });

  it('builds an aggregate-only score vector from structured choices', () => {
    const scenarios = buildTeamCoordinationScenarios();
    const responses = scenarios.map((scenario) => scenario.options.reduce((best, option) => {
      const bestScore = best.scores.leadership + best.scores.communication + best.scores.adaptability + best.scores.decision;
      const optionScore = option.scores.leadership + option.scores.communication + option.scores.adaptability + option.scores.decision;
      return optionScore > bestScore ? option : best;
    }, scenario.options[0]));
    const aggregate = buildTeamCoordinationResponseAggregate({
      completed: true,
      scenarioCount: scenarios.length,
      responses,
      timeMs: 42_000,
    });

    expect(aggregate).toMatchObject({
      aggregateSchemaVersion: 'team_coordination_aggregate_v1',
      completed: true,
      scenarioCount: 4,
      completedScenarioCount: 4,
      aggregateOnly: true,
    });
    expect(aggregate.leadershipScore).toBeGreaterThan(0.8);
    expect(aggregate.communicationScore).toBeGreaterThan(0.8);
    expect(aggregate.adaptabilityScore).toBeGreaterThan(0.75);
    expect(aggregate.decisionQualityScore).toBeGreaterThan(0.8);
    expect(validateTeamCoordinationAggregatePrivacy(aggregate)).toEqual({ ok: true, violations: [] });
    expect(JSON.stringify(aggregate)).not.toMatch(/prompt|label|why|selectedOption|choiceSequence|rawGameEvents/i);
  });

  it('sanitizes response payloads to structured category and aggregate fields only', () => {
    const aggregate = buildTeamCoordinationResponseAggregate({
      completed: true,
      scenarioCount: 1,
      responses: [buildTeamCoordinationScenarios()[0].options[0]],
      timeMs: 1000,
    });

    const payload = sanitizeTeamCoordinationResponsePayload({
      correct: true,
      outcome: 'structured_choice',
      choiceCategory: 'alignment_and_roles',
      selectedOptionLabel: 'raw option label should not persist',
      reactionTimeMs: 1550.8,
      score: 0.88,
      teamCoordination: {
        ...aggregate,
        rawChoices: ['align_roles_checkpoint'],
        optionText: 'raw text',
      },
    });

    expect(payload).toEqual({
      correct: true,
      outcome: 'structured_choice',
      reactionTimeMs: 1551,
      score: 0.88,
      teamCoordination: aggregate,
    });
    expect(JSON.stringify(payload)).not.toMatch(/choiceCategory|selectedOptionLabel|rawChoices|optionText/i);
  });
});
