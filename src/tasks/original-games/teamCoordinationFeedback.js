const TEAM_FEEDBACK_FORBIDDEN_KEYS = Object.freeze([
  'freeText',
  'typedResponse',
  'messageText',
  'optionText',
  'scenarioText',
  'selectedOptionId',
  'selectedOptionLabel',
  'choiceSequence',
  'rawChoices',
  'rawGameEvents',
  'pointerSamples',
]);

function finite(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
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
  return TEAM_FEEDBACK_FORBIDDEN_KEYS.some((key) => Object.hasOwn(value, key));
}

function unavailable(reason) {
  return {
    gameId: 'team_coordination',
    moduleId: 'team.structured-brief-feedback',
    status: 'not_available',
    feedbackCategory: reason,
    candidateHint: 'No hay datos agregados suficientes para explicar el brief de coordinación.',
    candidateHintEn: 'There is not enough aggregate data to explain the coordination brief.',
    reviewerCaveat: 'No interpretar ausencia o inconsistencia como baja comunicación o liderazgo.',
    reviewerCaveatEn: 'Do not interpret absence or inconsistency as low communication or leadership.',
    nextDesignProbe: 'Revisar agregados de escenarios, claridad de opciones y comprensión antes de interpretar.',
    diagnostics: {},
    privacy: { aggregateOnly: false, structuredChoicesOnly: false, openTextStored: false },
  };
}

export function buildTeamCoordinationFeedback(aggregate = {}) {
  if (!aggregate || typeof aggregate !== 'object' || aggregate.aggregateOnly !== true || hasForbiddenKeys(aggregate)) {
    return unavailable('invalid_or_non_aggregate');
  }
  const leadership = ratio(aggregate.leadershipScore);
  const communication = ratio(aggregate.communicationScore);
  const adaptability = ratio(aggregate.adaptabilityScore);
  const decision = ratio(aggregate.decisionQualityScore);
  const completed = Number(aggregate.completedScenarioCount ?? 0);
  const total = Number(aggregate.scenarioCount ?? 0);
  const valid = leadership != null
    && communication != null
    && adaptability != null
    && decision != null
    && total > 0
    && completed <= total;
  if (!valid) return unavailable('invalid_or_non_aggregate');

  const meanScore = (leadership + communication + adaptability + decision) / 4;
  const common = {
    gameId: 'team_coordination',
    moduleId: 'team.structured-brief-feedback',
    status: 'available',
    diagnostics: {
      leadershipScore: round(leadership),
      communicationScore: round(communication),
      adaptabilityScore: round(adaptability),
      decisionQualityScore: round(decision),
      completionRate: round(completed / total),
    },
    privacy: { aggregateOnly: true, structuredChoicesOnly: true, openTextStored: false },
  };

  if (completed < total) {
    return {
      ...common,
      feedbackCategory: 'incomplete_structured_brief',
      candidateHint: 'El brief no completó todos los escenarios; la lectura social queda incompleta.',
      candidateHintEn: 'The brief did not complete all scenarios; the social reading remains incomplete.',
      reviewerCaveat: 'No inferir comunicación, liderazgo o adaptabilidad desde una simulación incompleta.',
      reviewerCaveatEn: 'Do not infer communication, leadership, or adaptability from an incomplete simulation.',
      nextDesignProbe: 'Verificar duración, comprensión de instrucciones y layout del brief.',
    };
  }

  if (meanScore >= 0.75) {
    return {
      ...common,
      feedbackCategory: 'structured_coordination_signal',
      candidateHint: 'Completaste el brief eligiendo intervenciones estructuradas: objetivo claro, roles, feedback y ajuste ante cambios.',
      candidateHintEn: 'You completed the brief choosing structured interventions: clear goal, roles, feedback, and adjustment to changes.',
      reviewerCaveat: 'Es evidencia de demo en escenarios cerrados; no reemplaza una interacción grupal real ni una rúbrica validada.',
      reviewerCaveatEn: 'It is demo evidence in closed scenarios; it does not replace real group interaction or a validated rubric.',
      nextDesignProbe: 'Mantener como cobertura demo de liderazgo/comunicación/adaptabilidad y validar con formas paralelas.',
    };
  }

  return {
    ...common,
    feedbackCategory: 'structured_coordination_review',
    candidateHint: 'El brief muestra una estrategia mixta de coordinación; conviene revisar qué escenarios generaron menor claridad o adaptación.',
    candidateHintEn: 'The brief shows a mixed coordination strategy; review which scenarios generated less clarity or adaptation.',
    reviewerCaveat: 'La opción elegida puede reflejar interpretación del escenario, experiencia previa o comprensión del juego; no usar como diagnóstico.',
    reviewerCaveatEn: 'The chosen option may reflect scenario interpretation, prior experience, or game comprehension; do not use as a diagnosis.',
    nextDesignProbe: 'Revisar instrucciones, opciones y criterios antes de comparar candidatos.',
  };
}
