import {
  buildPassengerRouteDemoLevels,
  getPassengerRouteBoardMetrics,
  solvePassengerRouteLevel,
} from './passengerRouteTelemetry.js';

const DEFAULT_VIEWPORT = Object.freeze({ width: 606, height: 338 });

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

function safeLevelId(level, index) {
  return String(level?.id ?? `passenger-route-level-${index + 1}`);
}

function unavailable(reason) {
  return {
    moduleId: 'passenger.route-authoring-review',
    gameId: 'passenger_routes',
    status: 'not_available',
    routeAuthoringStatus: reason,
    solverConsistency: {
      totalLevels: 0,
      solvableLevels: 0,
      unsolvableLevelIds: [],
      minimumStationUseLevels: 0,
      boardFitLevels: 0,
    },
    budgetFairnessNote: 'No hay niveles autorados suficientes para revisar solvencia o dificultad.',
    recommendedLevelAction: 'provide_authoring_levels_before_interpretation',
    candidateOutcomeReview: 'not_reviewed',
    levelSummaries: [],
    privacy: { authoringOnly: true, rawRoutesUsed: false, authoredGeometryExported: false },
  };
}

function summarizeLevel(level, index, viewport) {
  const solution = solvePassengerRouteLevel(level);
  const metrics = getPassengerRouteBoardMetrics(level, viewport);
  const routeBudget = Math.max(0, Math.round(Number(level?.routeBudget) || 0));
  const destinationCount = Array.isArray(level?.passengers) ? level.passengers.length : 0;
  const stationCount = Array.isArray(level?.stations) ? level.stations.length : 0;
  const boardFits = metrics.boardWidth <= viewport.width
    && metrics.boardHeight <= viewport.height
    && metrics.cellSize >= 24;
  const minimumCost = solution.minimumCost;
  const budgetUseRatio = solution.solvable && routeBudget > 0
    ? round(minimumCost / routeBudget)
    : null;
  const tightBudget = solution.solvable
    && routeBudget > 0
    && Number(solution.minimumStationUses ?? 0) === 0
    && budgetUseRatio != null
    && budgetUseRatio >= 0.9;
  return {
    id: safeLevelId(level, index),
    solvable: solution.solvable === true,
    destinationCount,
    stationCount,
    routeBudget,
    minimumCost: solution.solvable ? solution.minimumCost : null,
    minimumMoves: solution.solvable ? solution.minimumMoves : null,
    minimumStationUses: solution.solvable ? solution.minimumStationUses : null,
    budgetUseRatio,
    tightBudget,
    boardFits,
    boardWidth: metrics.boardWidth,
    boardHeight: metrics.boardHeight,
    cellSize: metrics.cellSize,
  };
}

function candidateOutcomeReviewFor({ aggregate, routeAuthoringStatus }) {
  if (!aggregate || typeof aggregate !== 'object' || aggregate.aggregateOnly !== true) return 'not_reviewed';
  if (routeAuthoringStatus !== 'valid_for_internal_demo' && routeAuthoringStatus !== 'budget_tight_review') {
    return 'do_not_interpret_candidate_score_until_authoring_fixed';
  }
  const routeEfficiency = ratio(aggregate.routeEfficiency);
  const violations = nonNegativeInteger(aggregate.constraintViolationCount ?? 0);
  const attempts = nonNegativeInteger(aggregate.movementAttemptCount ?? 0);
  const delivered = nonNegativeInteger(aggregate.passengersDelivered);
  const destinations = nonNegativeInteger(aggregate.destinationCount);
  const violationRate = attempts > 0 && violations != null ? violations / attempts : 0;
  const deliveryRate = destinations > 0 && delivered != null ? delivered / destinations : 1;
  if ((routeEfficiency != null && routeEfficiency < 0.55) || violationRate >= 0.15 || deliveryRate < 1) {
    return 'candidate_or_instruction_review_not_authoring';
  }
  return 'candidate_outcome_consistent_with_valid_authoring';
}

function statusFromLevelSummaries(levelSummaries) {
  if (levelSummaries.some((level) => !level.solvable)) return 'needs_authoring_fix';
  if (levelSummaries.some((level) => !level.boardFits)) return 'layout_review';
  if (levelSummaries.some((level) => level.tightBudget)) return 'budget_tight_review';
  return 'valid_for_internal_demo';
}

function noteForStatus(status, levelSummaries) {
  if (status === 'needs_authoring_fix') {
    return 'Al menos un nivel no es resoluble por el solver; no se debe interpretar routeEfficiency hasta corregir authoring.';
  }
  if (status === 'layout_review') {
    return 'La solvencia es adecuada, pero al menos un tablero excede el viewport compacto o el tamaño mínimo de celda.';
  }
  if (status === 'budget_tight_review') {
    return 'La solvencia existe, pero al menos un nivel consume casi todo el presupuesto sin paradas; revisar tolerancia a errores antes de piloto.';
  }
  const stationLevels = levelSummaries.filter((level) => Number(level.minimumStationUses ?? 0) > 0).length;
  return stationLevels > 0
    ? 'Los niveles son resolubles; algunos requieren paradas, lo que permite observar manejo de recursos sin convertirlo automáticamente en error.'
    : 'Los niveles son resolubles dentro del presupuesto autorado y no requieren paradas obligatorias.';
}

function actionForStatus(status) {
  if (status === 'needs_authoring_fix') return 'revisar solvencia, obstáculos y presupuesto antes de volver a medir';
  if (status === 'layout_review') return 'ajustar layout o viewport metrics antes de presentación';
  if (status === 'budget_tight_review') return 'revisar presupuesto o añadir apoyo visual antes de piloto';
  return 'keep_current_levels_for_internal_demo';
}

export function buildPassengerRouteAuthoringReview({
  levels = buildPassengerRouteDemoLevels(),
  viewport = DEFAULT_VIEWPORT,
  aggregate = null,
} = {}) {
  const authoredLevels = Array.isArray(levels) ? levels : [];
  if (!authoredLevels.length) return unavailable('missing_authoring_levels');
  const safeViewport = {
    width: Math.max(1, Number(viewport?.width) || DEFAULT_VIEWPORT.width),
    height: Math.max(1, Number(viewport?.height) || DEFAULT_VIEWPORT.height),
  };
  const levelSummaries = authoredLevels.map((level, index) => summarizeLevel(level, index, safeViewport));
  const routeAuthoringStatus = statusFromLevelSummaries(levelSummaries);
  const solverConsistency = {
    totalLevels: levelSummaries.length,
    solvableLevels: levelSummaries.filter((level) => level.solvable).length,
    unsolvableLevelIds: levelSummaries.filter((level) => !level.solvable).map((level) => level.id),
    minimumStationUseLevels: levelSummaries.filter((level) => Number(level.minimumStationUses ?? 0) > 0).length,
    boardFitLevels: levelSummaries.filter((level) => level.boardFits).length,
  };

  return {
    moduleId: 'passenger.route-authoring-review',
    gameId: 'passenger_routes',
    status: 'available',
    routeAuthoringStatus,
    solverConsistency,
    budgetFairnessNote: noteForStatus(routeAuthoringStatus, levelSummaries),
    recommendedLevelAction: actionForStatus(routeAuthoringStatus),
    candidateOutcomeReview: candidateOutcomeReviewFor({ aggregate, routeAuthoringStatus }),
    levelSummaries,
    privacy: { authoringOnly: true, rawRoutesUsed: false, authoredGeometryExported: false },
  };
}

export function summarizePassengerRouteAuthoring(levels = buildPassengerRouteDemoLevels()) {
  const review = buildPassengerRouteAuthoringReview({ levels });
  return {
    totalLevels: review.solverConsistency.totalLevels,
    solvableLevels: review.solverConsistency.solvableLevels,
    minimumStationUseLevels: review.solverConsistency.minimumStationUseLevels,
    boardFitLevels: review.solverConsistency.boardFitLevels,
    authoringStatus: review.routeAuthoringStatus,
    recommendedLevelAction: review.recommendedLevelAction,
  };
}
