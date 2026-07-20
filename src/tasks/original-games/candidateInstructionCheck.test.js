import { describe, expect, it } from 'vitest';
import {
  buildCandidateInstructionCheck,
  summarizeCandidateInstructionCheck,
} from './candidateInstructionCheck.js';

const FORBIDDEN_OUTPUT_KEYS = new Set([
  'fullRoute',
  'routeTrace',
  'visitedCells',
  'stepByStepPath',
  'rawPointerPath',
  'pointerSamples',
  'rawGameEvents',
  'pumpSequence',
  'beamCells',
  'trials',
  'clickTrace',
]);

function expectNoForbiddenKeys(value) {
  const stack = [value];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== 'object') continue;
    for (const [key, child] of Object.entries(current)) {
      expect(FORBIDDEN_OUTPUT_KEYS.has(key)).toBe(false);
      if (child && typeof child === 'object') stack.push(child);
    }
  }
}

describe('candidate instruction check', () => {
  it('keeps a clean completed original-games fixture as low instruction risk', () => {
    const check = buildCandidateInstructionCheck([
      { gameId: 'laser_puzzle', result: { aggregateOnly: true, completed: true, solvedLevels: 3, levelCount: 3, ruleViolationCount: 0 } },
      { gameId: 'balloon_risk', result: { aggregateOnly: true, completed: true, roundsCompleted: 8, totalRounds: 8, popCount: 2, cashoutCount: 6 } },
      { gameId: 'passenger_routes', result: { aggregateOnly: true, completed: true, passengersDelivered: 5, destinationCount: 5, constraintViolationCount: 0, movementAttemptCount: 39 } },
    ]);

    expect(check).toMatchObject({
      schemaVersion: 'candidate_instruction_check_v1',
      instructionRiskFlag: 'low',
      excludeFromTalentMappingFlag: false,
      privacy: { aggregateOnly: true, rawEventsUsed: false },
    });
    expect(check.gameSummaries.every((game) => game.instructionRisk === 'low')).toBe(true);
    expect(check.copyRevisionSuggestion).toMatch(/sin señales agregadas/i);
    expectNoForbiddenKeys(check);
  });

  it('flags Laser rule confusion as instruction review instead of low ability', () => {
    const check = buildCandidateInstructionCheck([
      { gameId: 'laser_puzzle', result: { aggregateOnly: true, completed: false, solvedLevels: 0, levelCount: 3, ruleViolationCount: 4 } },
    ]);

    expect(check.instructionRiskFlag).toBe('high');
    expect(check.excludeFromTalentMappingFlag).toBe(true);
    expect(check.gameSummaries[0]).toMatchObject({
      gameId: 'laser_puzzle',
      instructionRisk: 'high',
      reason: 'rule_comprehension_review',
    });
    expect(check.copyRevisionSuggestion).toMatch(/instrucciones/i);
    expect(check.copyRevisionSuggestion).not.toMatch(/baja capacidad|mal desempeño/i);
    expectNoForbiddenKeys(check);
  });

  it('flags Passenger constraint trouble using violation rate, not raw route cells', () => {
    const check = buildCandidateInstructionCheck([
      { gameId: 'passenger_routes', result: { aggregateOnly: true, completed: false, passengersDelivered: 1, destinationCount: 5, constraintViolationCount: 6, movementAttemptCount: 16 } },
    ]);

    expect(check.instructionRiskFlag).toBe('high');
    expect(check.excludeFromTalentMappingFlag).toBe(true);
    expect(check.gameSummaries[0]).toMatchObject({
      gameId: 'passenger_routes',
      instructionRisk: 'high',
      reason: 'constraint_instruction_review',
    });
    expect(check.gameSummaries[0].diagnostics.constraintViolationRate).toBeCloseTo(0.375, 4);
    expect(JSON.stringify(check)).not.toMatch(/fullRoute|visitedCells|stepByStepPath|rawGameEvents/i);
  });

  it('flags Balloon completion or loss extremes as copy/calibration review without personality claims', () => {
    const check = buildCandidateInstructionCheck([
      { gameId: 'balloon_risk', result: { aggregateOnly: true, completed: true, roundsCompleted: 8, totalRounds: 8, popCount: 7, cashoutCount: 1 } },
    ]);

    expect(check.instructionRiskFlag).toBe('review');
    expect(check.excludeFromTalentMappingFlag).toBe(false);
    expect(check.gameSummaries[0]).toMatchObject({
      gameId: 'balloon_risk',
      instructionRisk: 'review',
      reason: 'risk_feedback_copy_or_threshold_review',
    });
    expect(JSON.stringify(check)).not.toMatch(/personalidad|impulsividad|frustración baja/i);
  });

  it('rejects non aggregate or raw-field contaminated inputs', () => {
    const check = buildCandidateInstructionCheck([
      { gameId: 'laser_puzzle', result: { aggregateOnly: true, completed: true, beamCells: ['1,1'] } },
      { gameId: 'passenger_routes', result: { aggregateOnly: false, fullRoute: ['0,0', '1,0'] } },
    ]);

    expect(check.instructionRiskFlag).toBe('high');
    expect(check.excludeFromTalentMappingFlag).toBe(true);
    expect(check.gameSummaries.map((game) => game.reason)).toEqual([
      'raw_or_reconstructive_input_detected',
      'non_aggregate_input',
    ]);
    expectNoForbiddenKeys(check);
  });

  it('provides a compact summary helper for the technical drawer', () => {
    const summary = summarizeCandidateInstructionCheck([
      { gameId: 'laser_puzzle', result: { aggregateOnly: true, completed: true, solvedLevels: 3, levelCount: 3, ruleViolationCount: 0 } },
      { gameId: 'passenger_routes', result: { aggregateOnly: true, completed: false, passengersDelivered: 1, destinationCount: 5, constraintViolationCount: 6, movementAttemptCount: 16 } },
    ]);

    expect(summary).toMatchObject({
      instructionRiskFlag: 'high',
      excludeFromTalentMappingFlag: true,
      reviewedGames: 2,
      highRiskGames: 1,
    });
  });
});
