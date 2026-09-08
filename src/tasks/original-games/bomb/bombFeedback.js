// BOMB (EXP-BOMB-001) — reporte de feedback aggregate-only.
//
// Patrón de tangramReportFeedback/laserPuzzleFeedback: consume SOLO campos
// allowlisted del agregado bomb_defusal_aggregate_v1 (buildBombBlockSummary)
// y devuelve copia estructurada para el reporte. No exporta secuencias de
// acciones, eventos crudos, posiciones de componentes ni telemetría reconstruible.
//
// Estatus científico (spec v1.1.0 §12.1/§17/§3.3): módulo EXPERIMENTAL —
// no hay score compuesto (pesos NO fijados hasta pilotaje), el lenguaje es
// observacional y los errores se interpretan como señal descriptiva, nunca
// como déficit de memoria.

const BOMB_FEEDBACK_FORBIDDEN_KEYS = Object.freeze([
  'rawPointerPath',
  'pointerSamples',
  'rawGameEvents',
  'eventLog',
  'trials',
  'actionSequence',
  'sequenceTrace',
  'componentStates',
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

function hasForbiddenKeys(value) {
  if (!value || typeof value !== 'object') return false;
  return BOMB_FEEDBACK_FORBIDDEN_KEYS.some((key) => Object.hasOwn(value, key));
}

function unavailable(reason) {
  return {
    gameId: 'bomb_defusal',
    moduleId: 'bomb.sequence-defusal-explanation',
    status: 'not_available',
    feedbackCategory: reason,
    candidateHint: 'No hay datos agregados suficientes para explicar la simulación de desactivación.',
    candidateHintEn: 'There is not enough aggregate data to explain the defusal simulation.',
    reviewerCaveat: 'Módulo experimental en validación (fases A–G, spec §17): lectura observacional sin baremos; los errores no se interpretan como déficit de memoria (spec §3.3).',
    reviewerCaveatEn: 'Experimental module under validation (phases A–G, spec §17): observational reading without norms; errors are not interpreted as a memory deficit (spec §3.3).',
    nextDesignProbe: 'Completar una sesión evaluada para obtener métricas §12 agregadas.',
    nextDesignProbeEn: 'Complete an evaluated session to obtain aggregated §12 metrics.',
    diagnostics: {},
    privacy: { aggregateOnly: false, rawEventsUsed: false },
  };
}

const REVIEWER_CAVEAT = Object.freeze({
  es: 'Módulo experimental en validación (fases A–G, spec §17): lectura observacional sin baremos ni score compuesto (pesos §12.1 no fijados); los errores de secuencia NO se interpretan como déficit de memoria (spec §3.3).',
  en: 'Experimental module under validation (phases A–G, spec §17): observational reading without norms or composite score (§12.1 weights unfixed); sequence errors are NOT interpreted as a memory deficit (spec §3.3).',
});

const NEXT_DESIGN_PROBE = Object.freeze({
  es: 'Piloto psicométrico (fase C, spec §17.1): comparar retention_accuracy_rate, serial_position_accuracy y memory_decay_slope por nivel y usuario antes de definir cualquier score compuesto.',
  en: 'Psychometric pilot (phase C, spec §17.1): compare retention_accuracy_rate, serial_position_accuracy and memory_decay_slope per level and user before defining any composite score.',
});

export function buildBombDefusalFeedback(aggregate = {}) {
  if (!aggregate || typeof aggregate !== 'object' || aggregate.aggregateOnly !== true || hasForbiddenKeys(aggregate)) {
    return unavailable('invalid_or_non_aggregate');
  }

  const reachedLevelCount = nonNegativeInteger(aggregate.reachedLevelCount);
  const levelsCompleted = nonNegativeInteger(aggregate.levelsCompleted);
  const totalErrorCount = nonNegativeInteger(aggregate.totalErrorCount ?? 0);
  const timeoutCount = nonNegativeInteger(aggregate.timeoutCount ?? 0);
  const interferenceErrorCount = nonNegativeInteger(aggregate.interferenceErrorCount ?? 0);

  if (reachedLevelCount == null || levelsCompleted == null || levelsCompleted > reachedLevelCount) {
    return unavailable('invalid_or_non_aggregate');
  }

  let feedbackCategory;
  let candidateHint;
  let candidateHintEn;
  if (reachedLevelCount === 0) {
    feedbackCategory = 'incomplete_session';
    candidateHint = 'La sesión no alcanzó niveles evaluados; no hay evidencia para una lectura.';
    candidateHintEn = 'The session did not reach evaluated levels; there is no evidence for a reading.';
  } else if (levelsCompleted >= Math.max(1, Math.ceil(reachedLevelCount * 0.75))) {
    feedbackCategory = 'protocol_retained';
    candidateHint = 'Ejecutaste el protocolo de desactivación en la mayoría de los niveles; los errores y tiempos se registran como señal descriptiva, no como desempeño de memoria.';
    candidateHintEn = 'You executed the defusal protocol in most levels; errors and timings are recorded as a descriptive signal, not as memory performance.';
  } else if (levelsCompleted >= 1) {
    feedbackCategory = 'partial_sequence_execution';
    candidateHint = 'Completaste parte de los niveles; el patrón de errores y omisiones se revisa como dato descriptivo pendiente de validación.';
    candidateHintEn = 'You completed some levels; the error and omission pattern is reviewed as descriptive data pending validation.';
  } else {
    feedbackCategory = 'sequence_not_completed';
    candidateHint = 'No completaste niveles dentro de los límites de tiempo; el origen (lectura del manual, controles, presión temporal) requiere revisión humana.';
    candidateHintEn = 'You did not complete levels within the time limits; the origin (manual reading, controls, time pressure) requires human review.';
  }

  return {
    gameId: 'bomb_defusal',
    moduleId: 'bomb.sequence-defusal-explanation',
    status: 'available',
    feedbackCategory,
    candidateHint,
    candidateHintEn,
    reviewerCaveat: REVIEWER_CAVEAT.es,
    reviewerCaveatEn: REVIEWER_CAVEAT.en,
    nextDesignProbe: NEXT_DESIGN_PROBE.es,
    nextDesignProbeEn: NEXT_DESIGN_PROBE.en,
    diagnostics: {
      levelsCompleted,
      reachedLevelCount,
      totalErrorCount,
      timeoutCount,
      interferenceErrorCount,
    },
    privacy: { aggregateOnly: true, rawEventsUsed: false },
  };
}
