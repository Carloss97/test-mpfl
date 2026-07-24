const BALLOON_FEEDBACK_FORBIDDEN_KEYS = Object.freeze([
  'pumpSequence',
  'rawGameEvents',
  'clickTrace',
  'rawPointerPath',
  'pointerSamples',
  'trials',
]);

function finite(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function nonNegativeInteger(value) {
  const numeric = finite(value);
  if (numeric == null || numeric < 0) return null;
  return Math.round(numeric);
}

function ratio(value) {
  const numeric = finite(value);
  if (numeric == null || numeric < 0 || numeric > 1) return null;
  return numeric;
}

function round(value, digits = 4) {
  const numeric = finite(value);
  if (numeric == null) return null;
  const factor = 10 ** digits;
  return Math.round(numeric * factor) / factor;
}

function hasForbiddenKeys(value) {
  if (!value || typeof value !== 'object') return false;
  return BALLOON_FEEDBACK_FORBIDDEN_KEYS.some((key) => Object.hasOwn(value, key));
}

function unavailable(reason) {
  return {
    gameId: 'balloon_risk',
    moduleId: 'balloon.feedback-comprehension',
    status: 'not_available',
    feedbackCategory: reason,
    postLossOpportunityLabel: 'unknown',
    candidateHint: 'No hay datos agregados suficientes para explicar el juego de globo.',
    candidateHintEn: 'There is not enough aggregate data to explain the balloon game.',
    reviewerCaveat: 'No interpretar ausencia o inconsistencia como baja tolerancia al riesgo o frustración.',
    reviewerCaveatEn: 'Do not interpret absence or inconsistency as low risk tolerance or frustration.',
    nextDesignProbe: 'Revisar agregados de rondas, pérdidas y cashouts antes de interpretar.',
    diagnostics: {},
    privacy: { aggregateOnly: false, rawRoundsUsed: false },
  };
}

export function buildBalloonRiskFeedback(aggregate = {}) {
  if (!aggregate || typeof aggregate !== 'object' || aggregate.aggregateOnly !== true || hasForbiddenKeys(aggregate)) {
    return unavailable('invalid_or_non_aggregate');
  }

  const roundsCompleted = nonNegativeInteger(aggregate.roundsCompleted);
  const totalRounds = nonNegativeInteger(aggregate.totalRounds);
  const cashouts = nonNegativeInteger(aggregate.cashoutCount ?? 0);
  const pops = nonNegativeInteger(aggregate.popCount ?? 0);
  const averagePumps = finite(aggregate.averagePumps);
  const postLossCount = nonNegativeInteger(aggregate.postPopAdjustmentCount ?? 0);
  const postLossAdjustment = finite(aggregate.postPopAdjustment ?? 0);
  const riskEfficiency = ratio(aggregate.riskEfficiency ?? aggregate.score);

  const valid = totalRounds != null
    && totalRounds > 0
    && roundsCompleted != null
    && roundsCompleted <= totalRounds
    && cashouts != null
    && pops != null
    && cashouts + pops <= Math.max(totalRounds, roundsCompleted)
    && (averagePumps == null || averagePumps >= 0)
    && postLossCount != null
    && postLossAdjustment != null
    && riskEfficiency != null;

  if (!valid) return unavailable('invalid_or_non_aggregate');

  const cashoutRate = cashouts / totalRounds;
  const popRate = pops / totalRounds;
  const postLossOpportunityLabel = postLossCount > 0 ? 'observed' : 'not_observed';
  const common = {
    gameId: 'balloon_risk',
    moduleId: 'balloon.feedback-comprehension',
    status: 'available',
    postLossOpportunityLabel,
    diagnostics: {
      cashoutRate: round(cashoutRate),
      popRate: round(popRate),
      riskEfficiency: round(riskEfficiency),
      averagePumps: round(averagePumps),
      postLossAdjustment: postLossOpportunityLabel === 'observed' ? round(postLossAdjustment) : null,
      postLossAdjustmentObserved: postLossOpportunityLabel === 'observed',
    },
    privacy: { aggregateOnly: true, rawRoundsUsed: false },
  };

  if (popRate >= 0.5 || (riskEfficiency < 0.45 && popRate >= 0.25)) {
    return {
      ...common,
      feedbackCategory: 'loss_exposure_review',
      candidateHint: 'El juego acumuló varias pérdidas del globo; esto describe exposición a pérdidas dentro de una tarea de riesgo/recompensa.',
      candidateHintEn: 'The game accumulated several balloon losses; this describes loss exposure within a risk/reward task.',
      reviewerCaveat: 'Las pérdidas dependen del azar y de la estructura del juego; no son fracaso personal, impulsividad clínica ni tolerancia a la frustración.',
      reviewerCaveatEn: 'Losses depend on chance and game structure; they are not personal failure, clinical impulsivity, or frustration tolerance.',
      nextDesignProbe: 'Revisar distribución de thresholds, claridad de feedback y estabilidad test-retest antes de puntuar.',
    };
  }

  if (postLossOpportunityLabel === 'not_observed') {
    return {
      ...common,
      feedbackCategory: cashoutRate >= 0.75 ? 'conservative_cashout_strategy' : 'feedback_not_observed',
      candidateHint: 'No hubo suficientes pérdidas observadas para estimar ajuste post-pérdida; la señal queda desconocida, no baja.',
      candidateHintEn: 'There were not enough observed losses to estimate post-loss adjustment; the signal remains unknown, not low.',
      reviewerCaveat: 'Sin oportunidad post-pérdida, el ajuste ante feedback queda desconocido; no inferir tolerancia a frustración.',
      reviewerCaveatEn: 'Without a post-loss opportunity, feedback adjustment remains unknown; do not infer frustration tolerance.',
      nextDesignProbe: 'Asegurar oportunidades post-pérdida suficientes o mantener la salida como descriptiva.',
    };
  }

  if (riskEfficiency >= 0.6 && cashoutRate >= 0.45) {
    return {
      ...common,
      feedbackCategory: 'balanced_feedback_strategy',
      candidateHint: 'Mostraste una estrategia agregada de riesgo/recompensa con cashouts y ajuste ante feedback observado.',
      candidateHintEn: 'You showed an aggregated risk/reward strategy with cashouts and observed feedback adjustment.',
      reviewerCaveat: 'Este patrón no demuestra personalidad, frustración ni mejor toma de decisiones fuera del juego.',
      reviewerCaveatEn: 'This pattern does not demonstrate personality, frustration, or better decision making outside the game.',
      nextDesignProbe: 'Validar estabilidad contra formas paralelas o instrumentos de riesgo si se decide estudiar convergencia.',
    };
  }

  return {
    ...common,
    feedbackCategory: 'mixed_risk_strategy',
    candidateHint: 'La estrategia de globo fue mixta: combina acumulación, cashouts y pérdidas que deben revisarse como descripción de tarea.',
    candidateHintEn: 'The balloon strategy was mixed: it combines accumulation, cashouts, and losses that should be reviewed as task description.',
    reviewerCaveat: 'No asignar dirección normativa sin criterio externo, calibración de thresholds y muestra suficiente.',
    reviewerCaveatEn: 'Do not assign normative direction without external criteria, threshold calibration, and sufficient sample.',
    nextDesignProbe: 'Analizar configuración del juego y entrevistas cognitivas antes de interpretar.',
  };
}
