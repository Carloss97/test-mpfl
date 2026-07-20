import { describe, expect, it } from 'vitest';
import { buildLaserPuzzleFeedback } from './laserPuzzleFeedback.js';

describe('buildLaserPuzzleFeedback', () => {
  it('explains a clean solution as task-specific success without overclaiming ability', () => {
    const feedback = buildLaserPuzzleFeedback({
      completed: true,
      levelCount: 2,
      solvedLevels: 2,
      moveCount: 7,
      solutionEfficiency: 0.9,
      ruleViolationCount: 0,
      hintCount: 0,
      aggregateOnly: true,
    });

    expect(feedback).toMatchObject({
      gameId: 'laser_puzzle',
      moduleId: 'laser.failure-explanation',
      status: 'available',
      feedbackCategory: 'clear_solution',
      privacy: { aggregateOnly: true, rawBeamUsed: false },
    });
    expect(feedback.candidateHint).toMatch(/resolviste/i);
    expect(feedback.reviewerCaveat).toMatch(/tarea específica/i);
    expect(JSON.stringify(feedback)).not.toMatch(/beamCells|fullRoute|rawGameEvents|pointerSamples/i);
  });

  it('prioritizes rule explanation over ability interpretation when violations are present', () => {
    const feedback = buildLaserPuzzleFeedback({
      completed: false,
      levelCount: 2,
      solvedLevels: 1,
      moveCount: 18,
      solutionEfficiency: 0.42,
      ruleViolationCount: 2,
      hintCount: 1,
      aggregateOnly: true,
    });

    expect(feedback.feedbackCategory).toBe('rule_confusion_review');
    expect(feedback.candidateHint).toMatch(/reglas/i);
    expect(feedback.reviewerCaveat).toMatch(/comprensión|instrucciones/i);
    expect(feedback.nextDesignProbe).toMatch(/copy|instrucciones|controles/i);
  });

  it('separates incomplete goals from inefficient but completed solutions', () => {
    const incomplete = buildLaserPuzzleFeedback({
      completed: false,
      levelCount: 3,
      solvedLevels: 1,
      moveCount: 9,
      solutionEfficiency: 0.7,
      ruleViolationCount: 0,
      hintCount: 0,
      aggregateOnly: true,
    });
    const inefficient = buildLaserPuzzleFeedback({
      completed: true,
      levelCount: 3,
      solvedLevels: 3,
      moveCount: 26,
      solutionEfficiency: 0.46,
      ruleViolationCount: 0,
      hintCount: 0,
      aggregateOnly: true,
    });

    expect(incomplete.feedbackCategory).toBe('incomplete_goal');
    expect(incomplete.diagnostics.solvedRate).toBeCloseTo(0.3333, 4);
    expect(inefficient.feedbackCategory).toBe('high_effort_solution');
    expect(inefficient.candidateHint).toMatch(/más movimientos/i);
  });

  it('does not produce explanatory feedback from non aggregate-only or inconsistent results', () => {
    expect(buildLaserPuzzleFeedback({ aggregateOnly: false })).toMatchObject({
      status: 'not_available',
      feedbackCategory: 'invalid_or_non_aggregate',
    });
    expect(buildLaserPuzzleFeedback({
      aggregateOnly: true,
      completed: true,
      levelCount: 2,
      solvedLevels: 3,
      solutionEfficiency: 0.9,
      ruleViolationCount: 0,
    })).toMatchObject({
      status: 'not_available',
      feedbackCategory: 'invalid_or_non_aggregate',
    });
  });
});
