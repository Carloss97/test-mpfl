import { buildBalloonRiskRounds } from './balloonRiskTelemetry.js';

const DEFAULT_ROUND_COUNT = 8;
const MIN_INTERNAL_DEMO_ROUNDS = 6;

function finite(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function nonNegativeInteger(value) {
  const numeric = finite(value);
  if (numeric == null || numeric < 0) return null;
  return Math.round(numeric);
}

function round(value, digits = 4) {
  const numeric = finite(value);
  if (numeric == null) return null;
  const factor = 10 ** digits;
  return Math.round(numeric * factor) / factor;
}

function riskBandForThreshold(threshold) {
  const numeric = finite(threshold);
  if (numeric == null) return 'unknown';
  if (numeric <= 8) return 'high';
  if (numeric <= 10) return 'medium';
  return 'low';
}

function getRoundThresholds(rounds = []) {
  return rounds
    .map((round) => finite(round?.threshold))
    .filter((threshold) => threshold != null && threshold > 0);
}

function summarizeBands(thresholdValues = []) {
  const bands = { high: 0, medium: 0, low: 0, unknown: 0 };
  for (const threshold of thresholdValues) bands[riskBandForThreshold(threshold)] += 1;
  const uniqueRiskBands = ['high', 'medium', 'low'].filter((band) => bands[band] > 0).length;
  return {
    totalRounds: thresholdValues.length,
    highRiskRounds: bands.high,
    mediumRiskRounds: bands.medium,
    lowRiskRounds: bands.low,
    uniqueRiskBands,
  };
}

function buildCandidateOutcomeReview(aggregate = null) {
  if (!aggregate || typeof aggregate !== 'object' || aggregate.aggregateOnly !== true) {
    return {
      category: 'not_provided',
      popRate: null,
      cashoutRate: null,
      note: 'Sin agregado candidato; se revisa solo la configuración global del juego.',
    };
  }

  const totalRounds = nonNegativeInteger(aggregate.totalRounds);
  const popCount = nonNegativeInteger(aggregate.popCount ?? 0);
  const cashoutCount = nonNegativeInteger(aggregate.cashoutCount ?? 0);
  if (!totalRounds || popCount == null || cashoutCount == null || popCount + cashoutCount > totalRounds) {
    return {
      category: 'invalid_aggregate',
      popRate: null,
      cashoutRate: null,
      note: 'Agregado inconsistente; no interpretar exposición a pérdida ni cashouts.',
    };
  }

  const popRate = round(popCount / totalRounds);
  const cashoutRate = round(cashoutCount / totalRounds);
  if (popRate >= 0.5) {
    return {
      category: 'loss_frequency_extreme',
      popRate,
      cashoutRate,
      note: 'Frecuencia de pérdidas extrema: revisar instrucciones, thresholds y azar de la configuración antes de atribuirlo a estrategia del candidato.',
    };
  }
  if (popRate === 0) {
    return {
      category: 'post_loss_opportunity_insufficient',
      popRate,
      cashoutRate,
      note: 'No hubo pérdidas observadas; el ajuste post-pérdida queda desconocido y no debe inferirse como alto o bajo.',
    };
  }
  return {
    category: 'within_expected_demo_range',
    popRate,
    cashoutRate,
    note: 'La frecuencia agregada de pérdidas está dentro del rango esperable para demo; sigue siendo descriptiva y requiere validación.',
  };
}

export function buildBalloonThresholdCalibrationReview(
  rounds = buildBalloonRiskRounds({ count: DEFAULT_ROUND_COUNT }),
  { aggregate = null } = {},
) {
  const roundList = Array.isArray(rounds) ? rounds : [];
  const thresholdValues = getRoundThresholds(roundList);
  const bandSummary = summarizeBands(thresholdValues);
  const minThreshold = thresholdValues.length ? Math.min(...thresholdValues) : null;
  const maxThreshold = thresholdValues.length ? Math.max(...thresholdValues) : null;
  const candidateOutcomeReview = buildCandidateOutcomeReview(aggregate);
  const authoringValid = bandSummary.totalRounds >= MIN_INTERNAL_DEMO_ROUNDS
    && bandSummary.uniqueRiskBands >= 2
    && bandSummary.highRiskRounds > 0
    && bandSummary.lowRiskRounds > 0;
  const candidateNeedsReview = candidateOutcomeReview.category === 'loss_frequency_extreme';
  const status = !authoringValid
    ? 'needs_authoring_review'
    : candidateNeedsReview
      ? 'needs_calibration_review'
      : 'valid_for_internal_demo';
  return {
    schemaVersion: 'balloon_threshold_calibration_review_v1',
    thresholdCalibrationStatus: status,
    thresholdRangeLabel: minThreshold != null && maxThreshold != null ? `mixed_${minThreshold}_to_${maxThreshold}` : 'unknown',
    lossOpportunityBalance: {
      ...bandSummary,
      lossOpportunityBalance: bandSummary.highRiskRounds > 0 && bandSummary.lowRiskRounds > 0 ? 'mixed' : 'unbalanced',
    },
    candidateOutcomeReview,
    interpretationCaveat: 'La configuración crea oportunidades de pérdida y cashout dentro del juego; no mide personalidad, impulsividad clínica ni tolerancia a la frustración.',
    recommendedRoundConfig: status === 'needs_authoring_review'
      ? 'revise_round_count_or_risk_band_balance_before_candidate_use'
      : candidateNeedsReview
        ? 'review_threshold_distribution_and_instruction_copy'
        : 'keep_current_threshold_distribution_for_internal_demo',
    privacy: {
      authoringOnly: true,
      rawThresholdsExported: false,
      candidatePumpSequenceRequired: false,
    },
  };
}

export function summarizeBalloonThresholdCalibration(rounds = buildBalloonRiskRounds({ count: DEFAULT_ROUND_COUNT })) {
  const review = buildBalloonThresholdCalibrationReview(rounds);
  return {
    totalRounds: review.lossOpportunityBalance.totalRounds,
    thresholdCalibrationStatus: review.thresholdCalibrationStatus,
    highRiskRounds: review.lossOpportunityBalance.highRiskRounds,
    mediumRiskRounds: review.lossOpportunityBalance.mediumRiskRounds,
    lowRiskRounds: review.lossOpportunityBalance.lowRiskRounds,
    recommendedRoundConfig: review.recommendedRoundConfig,
  };
}
