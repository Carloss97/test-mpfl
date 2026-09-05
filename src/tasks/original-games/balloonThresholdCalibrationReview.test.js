import { describe, expect, it } from 'vitest';
import {
  buildBalloonThresholdCalibrationReview,
  summarizeBalloonThresholdCalibration,
} from './balloonThresholdCalibrationReview.js';
import { buildBalloonRiskRounds } from './balloonRiskTelemetry.js';

const FORBIDDEN_BALLOON_AUTHORING_KEYS = new Set([
  'thresholds',
  'roundThresholds',
  'pumpSequence',
  'rawGameEvents',
  'clickTrace',
  'rawPointerPath',
  'pointerSamples',
  'trials',
]);

function expectNoForbiddenKeys(value) {
  const stack = [value];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== 'object') continue;
    for (const [key, child] of Object.entries(current)) {
      expect(FORBIDDEN_BALLOON_AUTHORING_KEYS.has(key)).toBe(false);
      if (child && typeof child === 'object') stack.push(child);
    }
  }
}

describe('balloon threshold calibration review', () => {
  it('reviews the current Balloon round distribution as balanced for internal demo', () => {
    const review = buildBalloonThresholdCalibrationReview(buildBalloonRiskRounds({ count: 8 }));

    expect(review).toMatchObject({
      schemaVersion: 'balloon_threshold_calibration_review_v1',
      thresholdCalibrationStatus: 'valid_for_internal_demo',
      lossOpportunityBalance: {
        totalRounds: 8,
        highRiskRounds: 3,
        mediumRiskRounds: 2,
        lowRiskRounds: 3,
      },
      recommendedRoundConfig: 'keep_current_threshold_distribution_for_internal_demo',
      privacy: { authoringOnly: true, rawThresholdsExported: false, candidatePumpSequenceRequired: false },
    });
    expect(review.thresholdRangeLabel).toBe('mixed_7_to_13');
    expect(review.interpretationCaveat).toMatch(/no mide personalidad/i);
    expectNoForbiddenKeys(review);
  });

  it('flags extreme loss frequency as calibration/instruction review, not personal failure', () => {
    const review = buildBalloonThresholdCalibrationReview(buildBalloonRiskRounds({ count: 8 }), {
      aggregate: {
        aggregateOnly: true,
        roundsCompleted: 8,
        totalRounds: 8,
        cashoutCount: 1,
        popCount: 7,
        riskEfficiency: 0.18,
      },
    });

    expect(review.thresholdCalibrationStatus).toBe('needs_calibration_review');
    expect(review.candidateOutcomeReview).toMatchObject({
      category: 'loss_frequency_extreme',
      popRate: 0.875,
      cashoutRate: 0.125,
    });
    expect(review.candidateOutcomeReview.note).toMatch(/instrucciones|thresholds|azar/i);
    expect(JSON.stringify(review)).not.toMatch(/frustración baja|fracaso personal|mejor personalidad/i);
    expectNoForbiddenKeys(review);
  });

  it('marks no-loss outcomes as insufficient post-loss opportunity instead of high talent', () => {
    const review = buildBalloonThresholdCalibrationReview(buildBalloonRiskRounds({ count: 8 }), {
      aggregate: {
        aggregateOnly: true,
        roundsCompleted: 8,
        totalRounds: 8,
        cashoutCount: 8,
        popCount: 0,
        riskEfficiency: 0.62,
      },
    });

    expect(review.thresholdCalibrationStatus).toBe('valid_for_internal_demo');
    expect(review.candidateOutcomeReview).toMatchObject({
      category: 'post_loss_opportunity_insufficient',
      popRate: 0,
      cashoutRate: 1,
    });
    expect(review.candidateOutcomeReview.note).toMatch(/desconocido|no inferir/i);
    expect(review.candidateOutcomeReview.note).not.toMatch(/superior|mejor personalidad/i);
  });

  it('flags authoring with too few or one-band rounds before candidate use', () => {
    const tooShort = buildBalloonThresholdCalibrationReview(buildBalloonRiskRounds({ count: 3 }));
    expect(tooShort.thresholdCalibrationStatus).toBe('needs_authoring_review');
    expect(tooShort.recommendedRoundConfig).toBe('revise_round_count_or_risk_band_balance_before_candidate_use');

    const oneBand = buildBalloonThresholdCalibrationReview([
      { roundId: 'a', threshold: 7 },
      { roundId: 'b', threshold: 8 },
      { roundId: 'c', threshold: 8 },
      { roundId: 'd', threshold: 7 },
      { roundId: 'e', threshold: 8 },
      { roundId: 'f', threshold: 7 },
    ]);
    expect(oneBand.thresholdCalibrationStatus).toBe('needs_authoring_review');
    expect(oneBand.lossOpportunityBalance.uniqueRiskBands).toBe(1);
    expectNoForbiddenKeys(oneBand);
  });

  it('provides a compact summary helper for technical drawer', () => {
    const summary = summarizeBalloonThresholdCalibration(buildBalloonRiskRounds({ count: 8 }));

    expect(summary).toMatchObject({
      totalRounds: 8,
      thresholdCalibrationStatus: 'valid_for_internal_demo',
      highRiskRounds: 3,
      mediumRiskRounds: 2,
      lowRiskRounds: 3,
      recommendedRoundConfig: 'keep_current_threshold_distribution_for_internal_demo',
    });
  });
});
