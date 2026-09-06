export const WORKBOOK_TALENT_FRAMEWORK_SCHEMA = 'krumm_workbook_talent_framework_v2';
export const WORKBOOK_TALENT_FRAMEWORK_VERSION = '2.0.0';

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

export const CONSTRUCT_DEFINITIONS = Object.freeze({
  decisionMaking: Object.freeze({
    label: 'Toma de decisiones (descriptiva)',
    labelEn: 'Decision making (descriptive)',
    workbookRow: 3,
    description: 'Estrategias observadas ante alternativas y restricciones de tarea; lectura descriptiva, sin criterio normativo.',
    descriptionEn: 'Observed strategies facing task alternatives and constraints; descriptive reading, without normative criteria.',
  }),
  problemSolving: Object.freeze({
    label: 'Resolución de problemas',
    labelEn: 'Problem solving',
    workbookRow: 4,
    description: 'Transformación de estados iniciales a metas bajo reglas explícitas.',
    descriptionEn: 'Transformation of initial states into goals under explicit rules.',
  }),
  riskFeedbackProfile: Object.freeze({
    label: 'Asunción de riesgo y feedback',
    labelEn: 'Risk taking and feedback',
    workbookRow: 5,
    description: 'Estrategia descriptiva de acumulación, pérdida y ajuste posterior dentro de Balloon.',
    descriptionEn: 'Descriptive strategy of accumulation, loss, and post-adjustment within Balloon.',
  }),
  planning: Object.freeze({
    label: 'Planificación',
    labelEn: 'Planning',
    workbookRow: 6,
    description: 'Organización de acciones y recursos bajo restricciones de ruta.',
    descriptionEn: 'Organization of actions and resources under route constraints.',
  }),
  adaptability: Object.freeze({
    label: 'Adaptabilidad (contexto)',
    labelEn: 'Adaptability (context)',
    workbookRow: 7,
    description: 'Respuesta a cambios controlados en el brief; señal descriptiva de sesión única, no un constructo validado de flexibilidad cognitiva.',
    descriptionEn: 'Response to controlled brief changes; single-session descriptive signal, not a validated cognitive flexibility construct.',
  }),
  analyticalThinking: Object.freeze({
    label: 'Pensamiento analítico',
    labelEn: 'Analytical thinking',
    workbookRow: 8,
    description: 'Descomposición lógica de reglas, recursos y caminos de solución.',
    descriptionEn: 'Logical decomposition of rules, resources, and solution paths.',
  }),
  leadership: Object.freeze({
    label: 'Liderazgo (estructurado)',
    labelEn: 'Structured leadership',
    workbookRow: 9,
    description: 'Juicio social en micro-situaciones estructuradas: objetivos, roles y trade-offs explícitos. No observa interacción grupal real.',
    descriptionEn: 'Structured social judgment in micro-situations: explicit goals, roles, and trade-offs. Does not observe real group interaction.',
  }),
  communication: Object.freeze({
    label: 'Comunicación (estructurada)',
    labelEn: 'Structured communication',
    workbookRow: 10,
    description: 'Claridad de contexto, pasos accionables y uso de feedback en opciones estructuradas; sin texto libre ni habla en vivo.',
    descriptionEn: 'Context clarity, actionable steps, and use of feedback in structured options; no free text or live speech.',
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

export function getConstructDefinition(id) {
  return CONSTRUCT_DEFINITIONS[id] ?? null;
}

function baseConstruct(id, overrides = {}) {
  const definition = CONSTRUCT_DEFINITIONS[id];
  return {
    id,
    label: definition.label,
    labelEn: definition.labelEn,
    workbookRow: definition.workbookRow,
    description: definition.description,
    descriptionEn: definition.descriptionEn,
    score: Object.hasOwn(overrides, 'score') ? overrides.score : null,
    confidence: Object.hasOwn(overrides, 'confidence') ? overrides.confidence : 0,
    confidenceCeiling: overrides.confidenceCeiling ?? 0,
    availability: overrides.availability ?? 'not_measured',
    evidence: overrides.evidence ?? [],
    caveats: [...new Set(overrides.caveats ?? [])],
    narrative: overrides.narrative ?? 'No hay evidencia suficiente para puntuar este constructo con la batería actual.',
    narrativeEn: overrides.narrativeEn ?? 'There is not enough evidence to score this construct with the current battery.',
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
    narrativeEn: 'The current battery does not provide complete evidence to score this construct without reweighting missing data.',
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

function tangramComposite(vector) {
  if (!isComplete(vector, 'tangram_exp001') || !hasObserved(vector, [
    'tangram.solvedRate',
    'tangram.avgCoverage',
    'tangram.totalMoveOverhead',
  ])) return null;
  const solvedRate = getFeature(vector, 'tangram.solvedRate');
  const coverage = getFeature(vector, 'tangram.avgCoverage');
  const moves = getFeature(vector, 'tangram.totalMoves') ?? 1;
  const overhead = getFeature(vector, 'tangram.totalMoveOverhead');
  const moveEfficiency = Math.max(0, 1 - Math.min(1, overhead / Math.max(1, moves)));
  return (0.45 * solvedRate) + (0.35 * coverage) + (0.20 * moveEfficiency);
}

function buildProblemSolving(vector, L, P, TG) {
  if (L === null || P === null) return insufficientConstruct('problemSolving', ['Requiere Laser y Passenger completos.']);
  const value = (0.65 * L) + (0.35 * P);
  const evidence = [
    { feature: 'laser.solutionEfficiency', value: getFeature(vector, 'laser.solutionEfficiency') },
    { feature: 'laser.solvedRate', value: getFeature(vector, 'laser.solvedRate') },
    { feature: 'passenger.routeEfficiency', value: getFeature(vector, 'passenger.routeEfficiency') },
    { formula: '0.65·L + 0.35·P', value },
  ];
  if (TG !== null) {
    evidence.push(
      { feature: 'tangram.solvedRate', value: getFeature(vector, 'tangram.solvedRate') },
      { feature: 'tangram.avgCoverage', value: getFeature(vector, 'tangram.avgCoverage') },
    );
  }
  return scoredConstruct('problemSolving', {
    scoreValue: value,
    confidenceCeiling: 0.6,
    evidence,
    narrative: 'Índice provisional de desempeño en resolución de problemas dentro de tareas con reglas explícitas y planificación de restricciones.',
    narrativeEn: 'Provisional index of problem-solving performance within tasks with explicit rules and constraint planning.',
  });
}

function buildPlanning(vector, P, TG) {
  if (P === null && TG === null) return insufficientConstruct('planning', ['Requiere Passenger Routes o Tangram completo y válido.']);
  if (P !== null && TG !== null) {
    const value = (0.50 * P) + (0.50 * TG);
    return scoredConstruct('planning', {
      scoreValue: value,
      confidenceCeiling: 0.6,
      evidence: [
        { feature: 'passenger.routeEfficiency', value: getFeature(vector, 'passenger.routeEfficiency') },
        { feature: 'passenger.deliveryRate', value: getFeature(vector, 'passenger.deliveryRate') },
        { feature: 'passenger.constraintCompliance', value: getFeature(vector, 'passenger.constraintCompliance') },
        { feature: 'tangram.solvedRate', value: getFeature(vector, 'tangram.solvedRate') },
        { feature: 'tangram.avgCoverage', value: getFeature(vector, 'tangram.avgCoverage') },
        { formula: '0.50·P + 0.50·TG', value },
      ],
      narrative: 'Índice provisional de planificación: combina la planificación de restricciones de Passenger Routes con la planificación espacial del ensamblaje Tangram.',
      narrativeEn: 'Provisional planning index: combines Passenger Routes constraint planning with Tangram spatial assembly planning.',
    });
  }
  if (TG !== null) {
    return scoredConstruct('planning', {
      scoreValue: TG,
      confidenceCeiling: 0.55,
      evidence: [
        { feature: 'tangram.solvedRate', value: getFeature(vector, 'tangram.solvedRate') },
        { feature: 'tangram.avgCoverage', value: getFeature(vector, 'tangram.avgCoverage') },
        { feature: 'tangram.totalMoveOverhead', value: getFeature(vector, 'tangram.totalMoveOverhead') },
        { formula: 'TG = 0.45·solvedRate + 0.35·avgCoverage + 0.20·moveEfficiency', value: TG },
      ],
      caveats: ['single_game_evidence'],
      narrative: 'Índice provisional de planificación basado solo en el ensamblaje geométrico Tangram (espacio y restricciones).',
      narrativeEn: 'Provisional planning index based only on Tangram geometric assembly (space and constraints).',
    });
  }
  return scoredConstruct('planning', {
    scoreValue: P,
    confidenceCeiling: 0.6,
    evidence: [
      { feature: 'passenger.routeEfficiency', value: getFeature(vector, 'passenger.routeEfficiency') },
      { feature: 'passenger.deliveryRate', value: getFeature(vector, 'passenger.deliveryRate') },
      { feature: 'passenger.constraintCompliance', value: getFeature(vector, 'passenger.constraintCompliance') },
      { formula: 'P = 0.50·routeEfficiency + 0.30·deliveryRate + 0.20·constraintCompliance', value: P },
    ],
    narrative: 'Índice provisional de planificación bajo restricciones dentro de Passenger Routes.',
    narrativeEn: 'Provisional planning index under constraints within Passenger Routes.',
  });
}

function buildAnalyticalThinking(vector, L, P) {
  if (L === null || P === null) return insufficientConstruct('analyticalThinking', ['Requiere Laser y Passenger completos.']);
  const value = (0.50 * L) + (0.50 * P);
  return scoredConstruct('analyticalThinking', {
    scoreValue: value,
    confidenceCeiling: 0.6,
    evidence: [
      { feature: 'laser.solutionEfficiency', value: getFeature(vector, 'laser.solutionEfficiency') },
      { feature: 'passenger.routeEfficiency', value: getFeature(vector, 'passenger.routeEfficiency') },
      { formula: '0.50·L + 0.50·P', value },
    ],
    narrative: 'Índice provisional de análisis de reglas, rutas y restricciones; no equivale a capacidad analítica laboral validada.',
    narrativeEn: 'Provisional index of analysis of rules, routes, and constraints; it is not equivalent to validated workplace analytical ability.',
  });
}

function buildDecisionMaking(vector, P, T) {
  const evidence = [];
  const risk = getFeature(vector, 'balloon.riskEfficiency');
  if (risk !== null) evidence.push({ feature: 'balloon.riskEfficiency', value: risk });
  if (P !== null) evidence.push({ feature: 'passengerComposite', value: P });
  if (T !== null) evidence.push({ feature: 'team.decisionQualityScore', value: T.decision });
  const evidenceWithFormula = [...evidence];
  if (T !== null && P !== null) {
    const value = (0.60 * T.decision) + (0.25 * P) + (0.15 * T.alignment);
    evidenceWithFormula.push({ formula: '0.60·teamDecision + 0.25·routePlanning + 0.15·teamAlignment', value });
  }
  // T.4 #11: mantener el composite solo como evidencia agregada descriptiva.
  // Sin rama provisional_score; confianza ≤ 0.20; sin ceiling normativo.
  return baseConstruct('decisionMaking', {
    availability: 'descriptive_only',
    confidenceCeiling: evidenceWithFormula.length ? 0.2 : 0,
    confidence: evidenceWithFormula.length ? 0.2 : 0,
    evidence: evidenceWithFormula,
    caveats: ['no_normative_direction_for_decision_quality', 'provisional_mapping_requires_validation'],
    narrative: 'Se reporta evidencia agregada de decisión estructurada (trade-offs del brief, planificación de rutas y riesgo de globo) como lectura descriptiva; una mayor exposición al riesgo o una ruta específica no se convierte en “mejor” toma de decisiones.',
    narrativeEn: 'Aggregated evidence of structured decision making (brief trade-offs, route planning, and balloon risk) is reported as a descriptive reading; more risk exposure or a specific route is not turned into “better” decision making.',
  });
}

function buildRiskFeedback(vector) {
  const evidence = [];
  for (const key of ['balloon.riskEfficiency', 'balloon.cashoutRate', 'balloon.popRate', 'balloon.postLossAdjustment']) {
    const value = getFeature(vector, key);
    if (value !== null) evidence.push({ feature: key, value });
  }
  const riskEfficiency = getFeature(vector, 'balloon.riskEfficiency');
  const cashoutRate = getFeature(vector, 'balloon.cashoutRate');
  const popRate = getFeature(vector, 'balloon.popRate');
  const averagePumps = getFeature(vector, 'balloon.averagePumpsNormalized');
  if (riskEfficiency === null || cashoutRate === null || popRate === null || averagePumps === null) {
    return insufficientConstruct('riskFeedbackProfile', ['Requiere Balloon completo y válido.']);
  }
  const lossManagement = 1 - popRate;
  const balancedExploration = 1 - Math.min(1, Math.abs(averagePumps - 0.5) / 0.5);
  const value = (0.35 * riskEfficiency)
    + (0.25 * cashoutRate)
    + (0.25 * lossManagement)
    + (0.15 * balancedExploration);
  return scoredConstruct('riskFeedbackProfile', {
    scoreValue: value,
    confidenceCeiling: 0.55,
    evidence: [
      ...evidence,
      { feature: 'balloon.averagePumpsNormalized', value: averagePumps },
      { formula: '0.35·riskEfficiency + 0.25·cashoutRate + 0.25·lossManagement + 0.15·balancedExploration', value },
    ],
    caveats: ['frustration_tolerance_not_measured', 'risk_index_not_personality_trait', 'game_strategy_score_not_normative_trait'],
    narrative: 'Índice provisional de estrategia riesgo/feedback dentro de Balloon: resume eficiencia, aseguramiento, exposición a pérdidas y exploración balanceada; no mide personalidad ni tolerancia a la frustración.',
    narrativeEn: 'Provisional risk/feedback strategy index within Balloon: it summarizes efficiency, cashing out, loss exposure, and balanced exploration; it does not measure personality or frustration tolerance.',
  });
}

function buildAdaptability(T) {
  if (T === null) {
    return baseConstruct('adaptability', {
      availability: 'insufficient',
      caveats: ['adaptability_requires_controlled_rule_or_context_changes', 'provisional_mapping_requires_validation'],
      narrative: 'La batería actual no incluye cambios controlados suficientes para puntuar adaptabilidad o flexibilidad cognitiva.',
      narrativeEn: 'The current battery does not include enough controlled changes to score adaptability or cognitive flexibility.',
    });
  }
  const value = (0.70 * T.adaptability) + (0.30 * T.changeResponse);
  // T.4 #4/#12: adaptabilidad se degrada a señal descriptiva (score null).
  // Sin cambio controlado de regla/entorno no hay evidencia de flexibilidad cognitiva (Miyake 2000).
  return baseConstruct('adaptability', {
    availability: 'descriptive_only',
    score: null,
    confidenceCeiling: 0.2,
    confidence: 0.2,
    evidence: [
      { feature: 'team.adaptabilityScore', value: T.adaptability },
      { feature: 'team.changeResponseScore', value: T.changeResponse },
      { formula: '0.70·adaptability + 0.30·changeResponse', value },
    ],
    caveats: ['adaptability_requires_controlled_rule_or_context_changes', 'provisional_mapping_requires_validation'],
    narrative: 'Respuesta a cambios controlados en el brief de equipo (prioridades, recursos y feedback) reportada como señal descriptiva de sesión única; no se puntúa adaptabilidad sin cambios de regla/entorno validados.',
    narrativeEn: 'Response to controlled changes in the team brief (priorities, resources, and feedback) reported as a single-session descriptive signal; adaptability is not scored without validated rule/environment changes.',
  });
}

function buildLeadership(T) {
  if (T === null) {
    return baseConstruct('leadership', {
      availability: 'not_measured',
      narrative: 'No medido: las tareas actuales son individuales y no observan dirección social, roles o coordinación interpersonal.',
      narrativeEn: 'Not measured: the current tasks are individual and do not observe social direction, roles, or interpersonal coordination.',
    });
  }
  const value = (0.50 * T.leadership) + (0.30 * T.roleClarity) + (0.20 * T.alignment);
  // T.4 #13: liderazgo = juicio social estructurado (no interacción grupal real). Label con modificador; ceiling y caveat se mantienen.
  return scoredConstruct('leadership', {
    scoreValue: value,
    confidenceCeiling: 0.55,
    evidence: [
      { feature: 'team.leadershipScore', value: T.leadership },
      { feature: 'team.roleClarityScore', value: T.roleClarity },
      { feature: 'team.alignmentScore', value: T.alignment },
      { formula: '0.50·leadership + 0.30·roleClarity + 0.20·alignment', value },
    ],
    caveats: ['structured_scenario_not_group_interaction', 'provisional_mapping_requires_validation'],
    narrative: 'Liderazgo (estructurado): índice provisional de juicio social en micro-situaciones - clarifica objetivos, roles y trade-offs; no reemplaza evaluación grupal ni observa dirección social real.',
    narrativeEn: 'Structured leadership: provisional index of social judgment in micro-situations - clarifies goals, roles, and trade-offs; it does not replace group assessment nor observe real social direction.',
  });
}

function buildCommunication(T) {
  if (T === null) {
    return baseConstruct('communication', {
      availability: 'not_measured',
      narrative: 'No medido: la batería actual no contiene producción/recepción de mensajes ni interacción social codificada.',
      narrativeEn: 'Not measured: the current battery does not contain message production/reception nor coded social interaction.',
    });
  }
  const value = (0.55 * T.communication) + (0.25 * T.feedbackUse) + (0.20 * T.alignment);
  // T.4 #14: comunicación estructurada (claridad/contexto/pasos/uso de feedback). Label con modificador; ceiling y caveat se mantienen.
  return scoredConstruct('communication', {
    scoreValue: value,
    confidenceCeiling: 0.55,
    evidence: [
      { feature: 'team.communicationScore', value: T.communication },
      { feature: 'team.feedbackUseScore', value: T.feedbackUse },
      { feature: 'team.alignmentScore', value: T.alignment },
      { formula: '0.55·communication + 0.25·feedbackUse + 0.20·alignment', value },
    ],
    caveats: ['structured_choices_no_free_text_or_live_speech', 'provisional_mapping_requires_validation'],
    narrative: 'Comunicación (estructurada): índice provisional de claridad de contexto, pasos accionables y uso de feedback en opciones estructuradas, sin guardar texto libre ni habla en vivo.',
    narrativeEn: 'Structured communication: provisional index of context clarity, actionable steps, and feedback use in structured options, without storing free text or live speech.',
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
  const TG = tangramComposite(vector);
  const constructs = {
    decisionMaking: buildDecisionMaking(vector, P, T),
    problemSolving: buildProblemSolving(vector, L, P, TG),
    riskFeedbackProfile: buildRiskFeedback(vector),
    planning: buildPlanning(vector, P, TG),
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
