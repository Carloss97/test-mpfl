const LASER_FEEDBACK_FORBIDDEN_KEYS = Object.freeze([
  'beamCells',
  'fullRoute',
  'routeTrace',
  'visitedCells',
  'rawPointerPath',
  'pointerSamples',
  'rawGameEvents',
  'clickTrace',
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
  return LASER_FEEDBACK_FORBIDDEN_KEYS.some((key) => Object.hasOwn(value, key));
}

function unavailable(reason) {
  return {
    gameId: 'laser_puzzle',
    moduleId: 'laser.failure-explanation',
    status: 'not_available',
    feedbackCategory: reason,
    candidateHint: 'No hay datos agregados suficientes para explicar el puzzle láser.',
    reviewerCaveat: 'No interpretar ausencia o inconsistencia como baja resolución de problemas.',
    nextDesignProbe: 'Revisar agregados de niveles, par esperado e instrucciones antes de interpretar.',
    diagnostics: {},
    privacy: { aggregateOnly: false, rawBeamUsed: false },
  };
}

export function buildLaserPuzzleFeedback(aggregate = {}) {
  if (!aggregate || typeof aggregate !== 'object' || aggregate.aggregateOnly !== true || hasForbiddenKeys(aggregate)) {
    return unavailable('invalid_or_non_aggregate');
  }

  const levelCount = nonNegativeInteger(aggregate.levelCount);
  const solvedLevels = nonNegativeInteger(aggregate.solvedLevels);
  const moveCount = nonNegativeInteger(aggregate.moveCount ?? aggregate.reconfigurationCount ?? 0);
  const solutionEfficiency = ratio(aggregate.solutionEfficiency ?? aggregate.score);
  const ruleViolations = nonNegativeInteger(aggregate.ruleViolationCount ?? 0);
  const hintCount = nonNegativeInteger(aggregate.hintCount ?? 0);

  const valid = levelCount != null
    && levelCount > 0
    && solvedLevels != null
    && solvedLevels <= levelCount
    && moveCount != null
    && solutionEfficiency != null
    && ruleViolations != null
    && hintCount != null;

  if (!valid) return unavailable('invalid_or_non_aggregate');

  const solvedRate = solvedLevels / levelCount;
  const ruleViolationRate = ruleViolations / levelCount;
  const common = {
    gameId: 'laser_puzzle',
    moduleId: 'laser.failure-explanation',
    status: 'available',
    diagnostics: {
      solvedRate: round(solvedRate),
      solutionEfficiency: round(solutionEfficiency),
      ruleViolationRate: round(ruleViolationRate),
      moveCount,
      hintCount,
    },
    privacy: { aggregateOnly: true, rawBeamUsed: false },
  };

  if (ruleViolations > 0) {
    return {
      ...common,
      feedbackCategory: 'rule_confusion_review',
      candidateHint: 'El puzzle registró choques con reglas o restricciones visibles; conviene revisar reglas, orientación de reflectores e instrucciones antes de interpretar la solución.',
      reviewerCaveat: 'Este patrón puede reflejar comprensión de instrucciones o controles, no necesariamente baja capacidad de razonamiento.',
      nextDesignProbe: 'Revisar copy de reglas, affordances visuales y controles del puzzle sin guardar la trayectoria del haz.',
    };
  }

  if (solvedRate < 1) {
    return {
      ...common,
      feedbackCategory: 'incomplete_goal',
      candidateHint: 'No se completaron todos los objetivos del puzzle; revisar si faltó conectar antenas o entender la condición de término.',
      reviewerCaveat: 'Un objetivo incompleto necesita contexto de dificultad, tiempo e instrucciones antes de inferir resolución de problemas.',
      nextDesignProbe: 'Validar claridad del objetivo y calibración de nivel/par esperado.',
    };
  }

  if (solutionEfficiency < 0.55 || moveCount > levelCount * 7) {
    return {
      ...common,
      feedbackCategory: 'high_effort_solution',
      candidateHint: 'Resolviste el puzzle, pero usaste más movimientos o reconfiguraciones que una solución más directa.',
      reviewerCaveat: 'Una solución con alto esfuerzo puede reflejar exploración, práctica o par de nivel mal calibrado; no es un diagnóstico.',
      nextDesignProbe: 'Comparar solutionEfficiency con revisión de authoring y formas paralelas antes de puntuar.',
    };
  }

  return {
    ...common,
    feedbackCategory: 'clear_solution',
    candidateHint: 'Resolviste el puzzle respetando las reglas principales y con una ruta agregada eficiente.',
    reviewerCaveat: 'Buen desempeño en esta tarea específica no equivale a inteligencia general ni desempeño laboral validado.',
    nextDesignProbe: 'Mantener como evidencia provisional de resolución de problemas y validar con niveles paralelos.',
  };
}
