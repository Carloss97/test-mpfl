import { describe, expect, it } from 'vitest';
import { buildBalloonRiskFeedback } from './balloonRiskFeedback.js';

describe('buildBalloonRiskFeedback', () => {
  it('explains a balanced risk/reward strategy without personality claims', () => {
    const feedback = buildBalloonRiskFeedback({
      completed: true,
      roundsCompleted: 8,
      totalRounds: 8,
      averagePumps: 5.8,
      cashoutCount: 6,
      popCount: 2,
      postPopAdjustment: -1.5,
      postPopAdjustmentCount: 1,
      riskEfficiency: 0.72,
      aggregateOnly: true,
    });

    expect(feedback).toMatchObject({
      gameId: 'balloon_risk',
      moduleId: 'balloon.feedback-comprehension',
      status: 'available',
      feedbackCategory: 'balanced_feedback_strategy',
      postLossOpportunityLabel: 'observed',
      privacy: { aggregateOnly: true, rawRoundsUsed: false },
    });
    expect(feedback.candidateHint).toMatch(/riesgo|recompensa/i);
    expect(feedback.reviewerCaveat).toMatch(/personalidad|frustración/i);
    expect(JSON.stringify(feedback)).not.toMatch(/pumpSequence|rawGameEvents|clickTrace|pointerSamples/i);
  });

  it('does not treat missing post-loss opportunities as low adjustment', () => {
    const feedback = buildBalloonRiskFeedback({
      completed: true,
      roundsCompleted: 8,
      totalRounds: 8,
      averagePumps: 3.2,
      cashoutCount: 8,
      popCount: 0,
      postPopAdjustment: 0,
      postPopAdjustmentCount: 0,
      riskEfficiency: 0.62,
      aggregateOnly: true,
    });

    expect(feedback.feedbackCategory).toBe('conservative_cashout_strategy');
    expect(feedback.postLossOpportunityLabel).toBe('not_observed');
    expect(feedback.candidateHint).toMatch(/no hubo suficientes pérdidas/i);
    expect(feedback.candidateHint).not.toMatch(/bajo desempeño|mala tolerancia/i);
  });

  it('explains high loss exposure as task feedback, not personal failure', () => {
    const feedback = buildBalloonRiskFeedback({
      completed: true,
      roundsCompleted: 8,
      totalRounds: 8,
      averagePumps: 8.5,
      cashoutCount: 3,
      popCount: 5,
      postPopAdjustment: -0.5,
      postPopAdjustmentCount: 4,
      riskEfficiency: 0.38,
      aggregateOnly: true,
    });

    expect(feedback.feedbackCategory).toBe('loss_exposure_review');
    expect(feedback.diagnostics.popRate).toBeCloseTo(0.625, 4);
    expect(feedback.candidateHint).toMatch(/pérdidas/i);
    expect(feedback.reviewerCaveat).toMatch(/azar|estructura/i);
  });

  it('does not produce feedback from non aggregate-only or inconsistent results', () => {
    expect(buildBalloonRiskFeedback({ aggregateOnly: false })).toMatchObject({
      status: 'not_available',
      feedbackCategory: 'invalid_or_non_aggregate',
    });
    expect(buildBalloonRiskFeedback({
      aggregateOnly: true,
      roundsCompleted: 9,
      totalRounds: 8,
      cashoutCount: 8,
      popCount: 2,
      riskEfficiency: 0.5,
    })).toMatchObject({
      status: 'not_available',
      feedbackCategory: 'invalid_or_non_aggregate',
    });
  });
});
