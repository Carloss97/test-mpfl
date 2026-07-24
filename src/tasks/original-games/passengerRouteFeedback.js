const PASSENGER_FEEDBACK_FORBIDDEN_KEYS = Object.freeze([
  'fullRoute',
  'routeTrace',
  'visitedCells',
  'stepByStepPath',
  'rawPointerPath',
  'pointerSamples',
  'rawGameEvents',
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
  return PASSENGER_FEEDBACK_FORBIDDEN_KEYS.some((key) => Object.hasOwn(value, key));
}

function unavailable(reason) {
  return {
    gameId: 'passenger_routes',
    moduleId: 'passenger.constraint-feedback',
    status: 'not_available',
    constraintFeedbackCategory: reason,
    candidateHint: 'No hay datos agregados suficientes para explicar restricciones de rutas.',
    candidateHintEn: 'There is not enough aggregate data to explain route constraints.',
    reviewerCaveat: 'No interpretar ausencia o inconsistencia como bajo desempeño.',
    reviewerCaveatEn: 'Do not interpret absence or inconsistency as low performance.',
    nextDesignProbe: 'Revisar instrumentación agregada y configuración del nivel antes de interpretar.',
    diagnostics: {},
    privacy: { aggregateOnly: false, rawRoutesUsed: false },
  };
}

export function buildPassengerConstraintFeedback(aggregate = {}) {
  if (!aggregate || typeof aggregate !== 'object' || aggregate.aggregateOnly !== true || hasForbiddenKeys(aggregate)) {
    return unavailable('invalid_or_non_aggregate');
  }

  const delivered = nonNegativeInteger(aggregate.passengersDelivered);
  const destinations = nonNegativeInteger(aggregate.destinationCount);
  const routeEfficiency = ratio(aggregate.routeEfficiency);
  const attempts = nonNegativeInteger(aggregate.movementAttemptCount);
  const replans = nonNegativeInteger(aggregate.replanCount ?? 0);
  const stationUse = nonNegativeInteger(aggregate.stationUseCount ?? 0);
  const violations = nonNegativeInteger(aggregate.constraintViolationCount ?? 0);
  const satisfaction = finite(aggregate.satisfactionScore);

  const valid = destinations != null
    && destinations > 0
    && delivered != null
    && delivered <= destinations
    && routeEfficiency != null
    && attempts != null
    && attempts > 0
    && replans != null
    && stationUse != null
    && violations != null
    && (satisfaction == null || (satisfaction >= 0 && satisfaction <= 100));

  if (!valid) return unavailable('invalid_or_non_aggregate');

  const deliveryRate = delivered / destinations;
  const violationRate = violations / attempts;
  const replanRate = replans / attempts;
  const common = {
    gameId: 'passenger_routes',
    moduleId: 'passenger.constraint-feedback',
    status: 'available',
    diagnostics: {
      deliveryRate: round(deliveryRate),
      routeEfficiency: round(routeEfficiency),
      violationRate: round(violationRate),
      replanRate: round(replanRate),
      stationUseCount: stationUse,
      satisfactionNormalized: satisfaction == null ? null : round(satisfaction / 100),
    },
    privacy: { aggregateOnly: true, rawRoutesUsed: false },
  };

  if (violations > 0 && violationRate >= 0.15) {
    return {
      ...common,
      constraintFeedbackCategory: 'constraint_blocked',
      candidateHint: 'La ruta acumuló varias violaciones de restricciones respecto a los intentos realizados; conviene reforzar instrucciones de presupuesto, bloqueos y movimientos permitidos.',
      candidateHintEn: 'The route accumulated several constraint violations relative to attempts made; reinforce instructions on budget, blocks, and allowed moves.',
      reviewerCaveat: 'Este patrón puede indicar comprensión de reglas o controles, no necesariamente baja planificación.',
      reviewerCaveatEn: 'This pattern may indicate rule or control comprehension, not necessarily low planning.',
      nextDesignProbe: 'Revisar instrucciones, controles y señalización de restricciones antes de usar la métrica como evidencia conductual.',
    };
  }

  if (stationUse > 0 && routeEfficiency >= 0.65 && routeEfficiency < 0.8) {
    return {
      ...common,
      constraintFeedbackCategory: 'resource_use_review',
      candidateHint: 'Se usaron paradas o recursos de apoyo durante una ruta razonablemente eficiente; esto puede ser parte de una estrategia válida.',
      candidateHintEn: 'Stops or support resources were used during a reasonably efficient route; this may be part of a valid strategy.',
      reviewerCaveat: 'El uso de paradas puede ser adaptativo según el nivel; no debe contarse automáticamente como error.',
      reviewerCaveatEn: 'Stop use may be adaptive depending on the level; it should not be automatically counted as an error.',
      nextDesignProbe: 'Comparar stationUseCount con la solución mínima del nivel y con entrevistas cognitivas.',
    };
  }

  if (deliveryRate < 1) {
    return {
      ...common,
      constraintFeedbackCategory: routeEfficiency < 0.55 ? 'route_inefficient_incomplete' : 'incomplete_delivery',
      candidateHint: 'La ruta no completó todos los destinos; revisar si faltó priorizar entregas, presupuesto o replanificación.',
      candidateHintEn: 'The route did not complete all destinations; check whether prioritizing deliveries, budget, or replanning was missed.',
      reviewerCaveat: 'Una entrega incompleta necesita contexto de instrucciones, tiempo y controles antes de inferir planificación.',
      reviewerCaveatEn: 'An incomplete delivery needs instruction, time, and control context before inferring planning.',
      nextDesignProbe: 'Verificar si el nivel comunica claramente destinos, costos y condición de término.',
    };
  }

  if (routeEfficiency >= 0.8 && violations === 0) {
    return {
      ...common,
      constraintFeedbackCategory: 'clear_success',
      candidateHint: 'Completaste una ruta eficiente respetando las restricciones principales del juego.',
      candidateHintEn: 'You completed an efficient route respecting the game’s main constraints.',
      reviewerCaveat: 'Buen desempeño en esta tarea específica no equivale a liderazgo logístico ni desempeño laboral validado.',
      reviewerCaveatEn: 'Good performance on this specific task is not equivalent to logistics leadership or validated work performance.',
      nextDesignProbe: 'Mantener como evidencia provisional de planificación bajo restricciones y validar con tareas paralelas.',
    };
  }

  return {
    ...common,
    constraintFeedbackCategory: 'mixed_strategy_review',
    candidateHint: 'La ruta se completó, pero la eficiencia o replanificación sugieren una estrategia mixta que conviene revisar con más contexto.',
    candidateHintEn: 'The route was completed, but efficiency or replanning suggests a mixed strategy worth reviewing with more context.',
    reviewerCaveat: 'No asignar dirección normativa sin criterios externos y calibración por nivel.',
    reviewerCaveatEn: 'Do not assign normative direction without external criteria and per-level calibration.',
    nextDesignProbe: 'Cruzar con routeEfficiency, entrevistas cognitivas y dificultad del nivel.',
  };
}
