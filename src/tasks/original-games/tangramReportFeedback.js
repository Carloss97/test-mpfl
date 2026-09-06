// Tangram (EXP-001) — reporte de feedback aggregate-only.
// Patrón de laserPuzzleFeedback/balloonRiskFeedback: consume SOLO campos
// allowlisted del agregado tangram_exp001_aggregate_v1 y devuelve copia
// estructurada para el reporte. No exporta posiciones de piezas, rutas de
// puntero, secuencias de movimientos ni eventos crudos.

const TANGRAM_FEEDBACK_FORBIDDEN_KEYS = Object.freeze([
  'rawPointerPath',
  'pointerSamples',
  'piecePositions',
  'rawGameEvents',
  'moveTrace',
  'clickTrace',
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

function round(value, digits = 4) {
  const numeric = finite(value);
  if (numeric == null) return null;
  const factor = 10 ** digits;
  return Math.round(numeric * factor) / factor;
}

function hasForbiddenKeys(value) {
  if (!value || typeof value !== 'object') return false;
  return TANGRAM_FEEDBACK_FORBIDDEN_KEYS.some((key) => Object.hasOwn(value, key));
}

function unavailable(reason) {
  return {
    gameId: 'tangram_exp001',
    moduleId: 'tangram.assembly-explanation',
    status: 'not_available',
    feedbackCategory: reason,
    candidateHint: 'No hay datos agregados suficientes para explicar el ensamble geométrico.',
    candidateHintEn: 'There is not enough aggregate data to explain the geometric assembly.',
    reviewerCaveat: 'Módulo nuevo en validación: lectura observacional sin baremos; no interpretar como norma ni como tolerancia a la frustración.',
    reviewerCaveatEn: 'New module under validation: observational reading without norms; do not interpret as a norm or frustration tolerance.',
    nextDesignProbe: 'Revisar agregados por nivel y cobertura antes de interpretar.',
    nextDesignProbeEn: 'Review per-level aggregates and coverage before interpreting.',
    diagnostics: {},
    privacy: { aggregateOnly: false, rawPointerPathUsed: false },
  };
}

const REVIEWER_CAVEAT = Object.freeze({
  es: 'Módulo nuevo en validación: lectura observacional sin baremos; no interpretar como norma ni como tolerancia a la frustración.',
  en: 'New module under validation: observational reading without norms; do not interpret as a norm or frustration tolerance.',
});

const NEXT_DESIGN_PROBE = Object.freeze({
  es: 'Calibrar dificultad con usuarios reales: comparar solvedLevels, totalMoves y avgHesitationTimeMs por nivel.',
  en: 'Calibrate difficulty with real users: compare solvedLevels, totalMoves and avgHesitationTimeMs per level.',
});

export function buildTangramReportFeedback(aggregate = {}) {
  if (!aggregate || typeof aggregate !== 'object' || aggregate.aggregateOnly !== true || hasForbiddenKeys(aggregate)) {
    return unavailable('invalid_or_non_aggregate');
  }

  const levelsAttempted = nonNegativeInteger(aggregate.levelsAttempted);
  const completedLevels = nonNegativeInteger(aggregate.completedLevels);
  const solvedLevels = nonNegativeInteger(aggregate.solvedLevels);
  const totalMoves = nonNegativeInteger(aggregate.totalMoves);
  const avgTrajectoryEfficiency = finite(aggregate.avgTrajectoryEfficiency);
  const timingPressureHighLatency = aggregate.timingPressureHighLatency === true;

  const valid = levelsAttempted != null
    && levelsAttempted > 0
    && completedLevels != null
    && completedLevels <= levelsAttempted
    && solvedLevels != null
    && solvedLevels <= levelsAttempted
    && totalMoves != null;

  if (!valid) return unavailable('invalid_or_non_aggregate');

  const solvedRate = solvedLevels / levelsAttempted;
  const completedRate = completedLevels / levelsAttempted;

  let feedbackCategory;
  let candidateHint;
  let candidateHintEn;
  if (solvedRate >= 0.75) {
    feedbackCategory = 'efficient_assembly';
    candidateHint = 'Ensamblaste la mayoría de las figuras con rotaciones y ajustes de piezas; un nivel quedó sin resolver, posiblemente por presión de tiempo o priorización.';
    candidateHintEn = 'You assembled most figures using rotations and piece adjustments; one level stayed unsolved, possibly due to time pressure or prioritization.';
  } else if (solvedRate <= 0.25) {
    feedbackCategory = 'incomplete_assembly';
    candidateHint = 'No alcanzaste a completar la mayoría de las figuras dentro de los límites de tiempo o movimientos.';
    candidateHintEn = 'You did not complete most figures within the time or move limits.';
  } else if (completedRate >= 0.75) {
    feedbackCategory = 'move_overhead_review';
    candidateHint = 'Completaste los niveles, pero el número de movimientos sugiere ensayo y error antes de encontrar el encaje correcto.';
    candidateHintEn = 'You completed the levels, but the number of moves suggests trial and error before finding the right fit.';
  } else {
    feedbackCategory = 'incomplete_assembly';
    candidateHint = 'No alcanzaste a completar la mayoría de las figuras dentro de los límites de tiempo o movimientos.';
    candidateHintEn = 'You did not complete most figures within the time or move limits.';
  }

  return {
    gameId: 'tangram_exp001',
    moduleId: 'tangram.assembly-explanation',
    status: 'available',
    feedbackCategory,
    candidateHint,
    candidateHintEn,
    reviewerCaveat: REVIEWER_CAVEAT.es,
    reviewerCaveatEn: REVIEWER_CAVEAT.en,
    nextDesignProbe: NEXT_DESIGN_PROBE.es,
    nextDesignProbeEn: NEXT_DESIGN_PROBE.en,
    diagnostics: {
      solvedRate: round(solvedRate),
      completedRate: round(completedRate),
      totalMoves,
      avgTrajectoryEfficiency: round(avgTrajectoryEfficiency),
      timingPressureHighLatency,
    },
    privacy: { aggregateOnly: true, rawPointerPathUsed: false },
  };
}
