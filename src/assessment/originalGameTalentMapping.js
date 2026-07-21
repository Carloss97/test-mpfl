export const WORKBOOK_TALENT_FRAMEWORK_SCHEMA = 'krumm_workbook_talent_framework_v1';
export const WORKBOOK_TALENT_FRAMEWORK_VERSION = '1.0.0';

export const WORKBOOK_TALENT_CONSTRUCT_ORDER = Object.freeze([
  'decisionMaking',
  'problemSolving',
  'riskFeedbackProfile',
  'planning',
  'adaptability',
  'analyticalThinking',
  'leadership',
  'communication',
]);

const CONSTRUCT_DEFINITIONS = Object.freeze({
  decisionMaking: Object.freeze({
    label: 'Toma de decisiones',
    workbookRow: 3,
    description: 'Estrategias observadas ante alternativas y restricciones de tarea.',
  }),
  problemSolving: Object.freeze({
    label: 'Resolución de problemas',
    workbookRow: 4,
    description: 'Transformación de estados iniciales a metas bajo reglas explícitas.',
  }),
  riskFeedbackProfile: Object.freeze({
    label: 'Asunción de riesgo y feedback',
    workbookRow: 5,
    description: 'Estrategia descriptiva de acumulación, pérdida y ajuste posterior dentro de Balloon.',
  }),
  planning: Object.freeze({
    label: 'Planificación',
    workbookRow: 6,
    description: 'Organización de acciones y recursos bajo restricciones de ruta.',
  }),
  adaptability: Object.freeze({
    label: 'Adaptabilidad / flexibilidad cognitiva',
    workbookRow: 7,
    description: 'Cambio flexible ante reglas o demandas situacionales nuevas.',
  }),
  analyticalThinking: Object.freeze({
    label: 'Pensamiento analítico',
    workbookRow: 8,
    description: 'Descomposición lógica de reglas, recursos y caminos de solución.',
  }),
  leadership: Object.freeze({
    label: 'Liderazgo',
    workbookRow: 9,
    description: 'Dirección social, toma de responsabilidad y coordinación interpersonal.',
  }),
  communication: Object.freeze({
    label: 'Comunicación',
    workbookRow: 10,
    description: 'Formulación, entrega y recepción de información/feedback.',
  }),
});

function roundScore(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.round(Math.max(0, Math.min(1, numeric)) * 100);
}

function roundConfidence(value, ceiling) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Number(Math.min(ceiling, Math.max(0, numeric)).toFixed(3));
}

function getFeature(vector, key) {
  return vector?.featureAvailability?.[key] === 'observed' ? Number(vector.featureMap?.[key]) : null;
}

function hasObserved(vector, keys) {
  return keys.every((key) => getFeature(vector, key) !== null);
}

function isComplete(vector, gameId) {
  return vector?.gameAvailability?.[gameId] === 'measured_complete';
}

function baseConstruct(id, overrides = {}) {
  const definition = CONSTRUCT_DEFINITIONS[id];
  return {
    id,
    label: definition.label,
    workbookRow: definition.workbookRow,
    description: definition.description,
    score: Object.hasOwn(overrides, 'score') ? overrides.score : null,
    confidence: Object.hasOwn(overrides, 'confidence') ? overrides.confidence : 0,
    confidenceCeiling: overrides.confidenceCeiling ?? 0,
    availability: overrides.availability ?? 'not_measured',
    evidence: overrides.evidence ?? [],
    caveats: [...new Set(overrides.caveats ?? [])],
    narrative: overrides.narrative ?? 'No hay evidencia suficiente para puntuar este constructo con la batería actual.',
  };
}

function scoredConstruct(id, { scoreValue, confidenceCeiling, evidence, caveats = [], narrative }) {
  return baseConstruct(id, {
    score: roundScore(scoreValue),
    confidence: roundConfidence(confidenceCeiling, confidenceCeiling),
    confidenceCeiling,
    availability: 'provisional_score',
    evidence,
    caveats: ['provisional_mapping_requires_validation', ...caveats],
    narrative,
  });
}

function insufficientConstruct(id, evidence = []) {
  return baseConstruct(id, {
    availability: 'insufficient',
    evidence,
    caveats: ['insufficient_evidence_for_construct', 'provisional_mapping_requires_validation'],
    narrative: 'La batería actual no entrega evidencia completa para puntuar este constructo sin reponderar datos faltantes.',
  });
}

function laserComposite(vector) {
  if (!isComplete(vector, 'laser_puzzle') || !hasObserved(vector, [
    'laser.solutionEfficiency',
    'laser.solvedRate',
    'laser.ruleCompliance',
  ])) return null;
  return (0.55 * getFeature(vector, 'laser.solutionEfficiency'))
    + (0.30 * getFeature(vector, 'laser.solvedRate'))
    + (0.15 * getFeature(vector, 'laser.ruleCompliance'));
}

function passengerComposite(vector) {
  if (!isComplete(vector, 'passenger_routes') || !hasObserved(vector, [
    'passenger.routeEfficiency',
    'passenger.deliveryRate',
    'passenger.constraintCompliance',
  ])) return null;
  return (0.50 * getFeature(vector, 'passenger.routeEfficiency'))
    + (0.30 * getFeature(vector, 'passenger.deliveryRate'))
    + (0.20 * getFeature(vector, 'passenger.constraintCompliance'));
}

function teamComposite(vector) {
  if (!hasObserved(vector, [
    'team.leadershipScore',
    'team.communicationScore',
    'team.adaptabilityScore',
    'team.decisionQualityScore',
  ])) return null;
  return {
    leadership: getFeature(vector, 'team.leadershipScore'),
    communication: getFeature(vector, 'team.communicationScore'),
    adaptability: getFeature(vector, 'team.adaptabilityScore'),
    decision: getFeature(vector, 'team.decisionQualityScore'),
    alignment: getFeature(vector, 'team.alignmentScore') ?? getFeature(vector, 'team.communicationScore'),
    roleClarity: getFeature(vector, 'team.roleClarityScore') ?? getFeature(vector, 'team.leadershipScore'),
    feedbackUse: getFeature(vector, 'team.feedbackUseScore') ?? getFeature(vector, 'team.communicationScore'),
    changeResponse: getFeature(vector, 'team.changeResponseScore') ?? getFeature(vector, 'team.adaptabilityScore'),
  };
}

function buildProblemSolving(vector, L, P) {
  if (L === null || P === null) return insufficientConstruct('problemSolving', ['Requiere Laser y Passenger completos.']);
  const value = (0.65 * L) + (0.35 * P);
  return scoredConstruct('problemSolving', {
    scoreValue: value,
    confidenceCeiling: 0.5,
    evidence: [
      { feature: 'laser.solutionEfficiency', value: getFeature(vector, 'laser.solutionEfficiency') },
      { feature: 'laser.solvedRate', value: getFeature(vector, 'laser.solvedRate') },
      { feature: 'passenger.routeEfficiency', value: getFeature(vector, 'passenger.routeEfficiency') },
      { formula: '0.65·L + 0.35·P', value },
    ],
    narrative: 'Índice provisional de desempeño en resolución de problemas dentro de tareas con reglas explícitas y planificación de restricciones.',
  });
}

function buildPlanning(vector, P) {
  if (P === null) return insufficientConstruct('planning', ['Requiere Passenger Routes completo y válido.']);
  return scoredConstruct('planning', {
    scoreValue: P,
    confidenceCeiling: 0.5,
    evidence: [
      { feature: 'passenger.routeEfficiency', value: getFeature(vector, 'passenger.routeEfficiency') },
      { feature: 'passenger.deliveryRate', value: getFeature(vector, 'passenger.deliveryRate') },
      { feature: 'passenger.constraintCompliance', value: getFeature(vector, 'passenger.constraintCompliance') },
      { formula: 'P = 0.50·routeEfficiency + 0.30·deliveryRate + 0.20·constraintCompliance', value: P },
    ],
    narrative: 'Índice provisional de planificación bajo restricciones dentro de Passenger Routes.',
  });
}

function buildAnalyticalThinking(vector, L, P) {
  if (L === null || P === null) return insufficientConstruct('analyticalThinking', ['Requiere Laser y Passenger completos.']);
  const value = (0.50 * L) + (0.50 * P);
  return scoredConstruct('analyticalThinking', {
    scoreValue: value,
    confidenceCeiling: 0.45,
    evidence: [
      { feature: 'laser.solutionEfficiency', value: getFeature(vector, 'laser.solutionEfficiency') },
      { feature: 'passenger.routeEfficiency', value: getFeature(vector, 'passenger.routeEfficiency') },
      { formula: '0.50·L + 0.50·P', value },
    ],
    narrative: 'Índice provisional de análisis de reglas, rutas y restricciones; no equivale a capacidad analítica laboral validada.',
  });
}

function buildDecisionMaking(vector, P, T) {
  const evidence = [];
  const risk = getFeature(vector, 'balloon.riskEfficiency');
  if (risk !== null) evidence.push({ feature: 'balloon.riskEfficiency', value: risk });
  if (P !== null) evidence.push({ feature: 'passengerComposite', value: P });
  if (T !== null) evidence.push({ feature: 'team.decisionQualityScore', value: T.decision });
  if (T !== null && P !== null) {
    const value = (0.60 * T.decision) + (0.25 * P) + (0.15 * T.alignment);
    return scoredConstruct('decisionMaking', {
      scoreValue: value,
      confidenceCeiling: 0.45,
      evidence: [
        ...evidence,
        { formula: '0.60·teamDecision + 0.25·routePlanning + 0.15·teamAlignment', value },
      ],
      caveats: ['structured_scenario_requires_validation', 'no_automated_decision'],
      narrative: 'Índice preliminar de decisión estructurada: combina trade-offs explícitos del brief de equipo con planificación de rutas; no es ranking ni criterio de selección.',
    });
  }
  return baseConstruct('decisionMaking', {
    availability: 'descriptive_only',
    confidenceCeiling: evidence.length ? 0.2 : 0,
    confidence: evidence.length ? 0.2 : 0,
    evidence,
    caveats: ['no_normative_direction_for_decision_quality', 'provisional_mapping_requires_validation'],
    narrative: 'Se reportan estrategias observadas, pero no se transforma una mayor exposición al riesgo o una ruta específica en “mejor” toma de decisiones.',
  });
}

function buildRiskFeedback(vector) {
  const evidence = [];
  for (const key of ['balloon.riskEfficiency', 'balloon.cashoutRate', 'balloon.popRate', 'balloon.postLossAdjustment']) {
    const value = getFeature(vector, key);
    if (value !== null) evidence.push({ feature: key, value });
  }
  return baseConstruct('riskFeedbackProfile', {
    availability: 'descriptive_only',
    confidenceCeiling: evidence.length ? 0.2 : 0,
    confidence: evidence.length ? 0.2 : 0,
    evidence,
    caveats: ['frustration_tolerance_not_measured', 'risk_index_not_personality_trait', 'provisional_mapping_requires_validation'],
    narrative: 'Describe estrategia riesgo/recompensa y ajuste ante pérdida dentro de Balloon; no mide tolerancia a la frustración ni personalidad.',
  });
}

function buildAdaptability(T) {
  if (T === null) {
    return baseConstruct('adaptability', {
      availability: 'insufficient',
      caveats: ['adaptability_requires_controlled_rule_or_context_changes', 'provisional_mapping_requires_validation'],
      narrative: 'La batería actual no incluye cambios controlados suficientes para puntuar adaptabilidad o flexibilidad cognitiva.',
    });
  }
  const value = (0.70 * T.adaptability) + (0.30 * T.changeResponse);
  return scoredConstruct('adaptability', {
    scoreValue: value,
    confidenceCeiling: 0.4,
    evidence: [
      { feature: 'team.adaptabilityScore', value: T.adaptability },
      { feature: 'team.changeResponseScore', value: T.changeResponse },
      { formula: '0.70·adaptability + 0.30·changeResponse', value },
    ],
    caveats: ['structured_scenario_requires_validation'],
    narrative: 'Índice preliminar de adaptación ante cambios controlados dentro del brief de equipo; requiere validación antes de comparar candidatos.',
  });
}

function buildLeadership(T) {
  if (T === null) {
    return baseConstruct('leadership', {
      availability: 'not_measured',
      narrative: 'No medido: las tareas actuales son individuales y no observan dirección social, roles o coordinación interpersonal.',
    });
  }
  const value = (0.50 * T.leadership) + (0.30 * T.roleClarity) + (0.20 * T.alignment);
  return scoredConstruct('leadership', {
    scoreValue: value,
    confidenceCeiling: 0.4,
    evidence: [
      { feature: 'team.leadershipScore', value: T.leadership },
      { feature: 'team.roleClarityScore', value: T.roleClarity },
      { feature: 'team.alignmentScore', value: T.alignment },
      { formula: '0.50·leadership + 0.30·roleClarity + 0.20·alignment', value },
    ],
    caveats: ['structured_scenario_not_group_interaction', 'provisional_mapping_requires_validation'],
    narrative: 'Índice preliminar de liderazgo en micro-situaciones estructuradas: clarifica objetivos, roles y trade-offs; no reemplaza evaluación grupal real.',
  });
}

function buildCommunication(T) {
  if (T === null) {
    return baseConstruct('communication', {
      availability: 'not_measured',
      narrative: 'No medido: la batería actual no contiene producción/recepción de mensajes ni interacción social codificada.',
    });
  }
  const value = (0.55 * T.communication) + (0.25 * T.feedbackUse) + (0.20 * T.alignment);
  return scoredConstruct('communication', {
    scoreValue: value,
    confidenceCeiling: 0.4,
    evidence: [
      { feature: 'team.communicationScore', value: T.communication },
      { feature: 'team.feedbackUseScore', value: T.feedbackUse },
      { feature: 'team.alignmentScore', value: T.alignment },
      { formula: '0.55·communication + 0.25·feedbackUse + 0.20·alignment', value },
    ],
    caveats: ['structured_choices_no_free_text_or_live_speech', 'provisional_mapping_requires_validation'],
    narrative: 'Índice preliminar de comunicación estructurada: claridad de contexto, pasos accionables y uso de feedback sin guardar texto libre.',
  });
}

function withCameraCaveat(construct, signalQuality) {
  if (!signalQuality || Number(signalQuality.sampleCount ?? 0) > 0) return construct;
  return {
    ...construct,
    caveats: [...new Set([...construct.caveats, 'camera_signal_context_not_used_for_talent_mapping'])],
  };
}

export function buildOriginalGameTalentFramework({
  originalGameFeatureVector,
  generatedAt = new Date().toISOString(),
  signalQuality = null,
} = {}) {
  const vector = originalGameFeatureVector ?? {};
  const L = laserComposite(vector);
  const P = passengerComposite(vector);
  const T = teamComposite(vector);
  const constructs = {
    decisionMaking: buildDecisionMaking(vector, P, T),
    problemSolving: buildProblemSolving(vector, L, P),
    riskFeedbackProfile: buildRiskFeedback(vector),
    planning: buildPlanning(vector, P),
    adaptability: buildAdaptability(T),
    analyticalThinking: buildAnalyticalThinking(vector, L, P),
    leadership: buildLeadership(T),
    communication: buildCommunication(T),
  };

  const constructsWithCameraCaveats = Object.fromEntries(
    WORKBOOK_TALENT_CONSTRUCT_ORDER.map((id) => [id, withCameraCaveat(constructs[id], signalQuality)]),
  );

  return {
    schemaVersion: WORKBOOK_TALENT_FRAMEWORK_SCHEMA,
    version: WORKBOOK_TALENT_FRAMEWORK_VERSION,
    status: 'provisional',
    generatedAt,
    sourceVector: {
      type: vector.type ?? 'original_game_feature_vector_v1',
      version: vector.version ?? null,
    },
    constructOrder: [...WORKBOOK_TALENT_CONSTRUCT_ORDER],
    constructs: constructsWithCameraCaveats,
    classification: {
      strengths: null,
      watchAreas: null,
      availability: 'not_available_without_norms',
    },
    governance: {
      humanReviewOnly: true,
      noAutomatedDecision: true,
      observationalOnly: true,
      privacySafe: true,
    },
  };
}
