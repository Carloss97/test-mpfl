export const FORBIDDEN_IMPROVEMENT_INPUT_FIELDS = Object.freeze([
  'fullRoute',
  'routeTrace',
  'visitedCells',
  'stepByStepPath',
  'rawPointerPath',
  'pointerSamples',
  'rawGameEvents',
  'pumpSequence',
  'beamCells',
  'trials',
  'landmarks',
  'keypoints',
  'faceSamples',
  'windows',
]);

const MODULES = Object.freeze([
  Object.freeze({
    id: 'laser.failure-explanation',
    title: 'Explicación modular de fallos en Puzzle Láser',
    status: 'implemented_core',
    priority: 'high',
    gameIds: Object.freeze(['laser_puzzle']),
    purpose: 'Separar la explicación de fallos del componente visual para que el candidato entienda si faltó resolver antenas, eficiencia o regla sin exponer ruta ni beamCells.',
    candidateInputs: Object.freeze(['completed', 'solvedLevels', 'levelCount', 'moveCount', 'solutionEfficiency', 'ruleViolationCount', 'hintCount']),
    expectedOutputs: Object.freeze(['failureCategory', 'humanReadableHint', 'candidateCopy', 'reviewerCaveat']),
    acceptanceTests: Object.freeze([
      'sin antenas resueltas => failureCategory: incomplete_goal',
      'ruleViolationCount > 0 => copy de reglas antes que interpretación de capacidad',
      'no output contiene beamCells, piezas movidas ni ruta del haz',
    ]),
    privacyNotes: Object.freeze(['Usar solo agregados allowlist; sin beamCells ni secuencia de movimientos.']),
    implementation: 'buildLaserPuzzleFeedback in laserPuzzleFeedback.js',
  }),
  Object.freeze({
    id: 'laser.level-authoring-review',
    title: 'Revisión modular de niveles Laser y par esperado',
    status: 'implemented_core',
    priority: 'high',
    gameIds: Object.freeze(['laser_puzzle']),
    purpose: 'Aislar validación de niveles, par, dificultad y solvencia para evitar que solutionEfficiency castigue niveles mal calibrados.',
    candidateInputs: Object.freeze(['levelCount', 'moveCount', 'solutionEfficiency', 'ruleViolationCount']),
    expectedOutputs: Object.freeze(['levelAuthoringStatus', 'parCalibrationNote', 'recommendedLevelAction']),
    acceptanceTests: Object.freeze([
      'cada nivel autorado tiene solución esperada',
      'par extremo genera caveat de authoring',
      'la revisión no lee ni exporta grillas completas en payload final',
    ]),
    privacyNotes: Object.freeze(['La auditoría de authoring puede usar fixtures locales, pero el payload de candidato sigue aggregate-only.']),
    implementation: 'buildLaserPuzzleAuthoringReview in laserPuzzleAuthoringReview.js',
  }),
  Object.freeze({
    id: 'balloon.feedback-comprehension',
    title: 'Comprensión de feedback riesgo/recompensa en Balloon',
    status: 'implemented_core',
    priority: 'high',
    gameIds: Object.freeze(['balloon_risk']),
    purpose: 'Hacer explícito cuándo el resultado fue cashout, pérdida o oportunidad post-pérdida para reducir errores difíciles de explicar.',
    candidateInputs: Object.freeze(['roundsCompleted', 'totalRounds', 'averagePumps', 'cashoutCount', 'popCount', 'postPopAdjustmentCount', 'riskEfficiency']),
    expectedOutputs: Object.freeze(['feedbackState', 'candidateExplanation', 'postLossOpportunityLabel', 'interpretationCaveat']),
    acceptanceTests: Object.freeze([
      'postPopAdjustmentCount === 0 => no se muestra ajuste post-pérdida como bajo desempeño',
      'riskEfficiency alto no produce etiqueta de mejor personalidad',
      'copy explica incertidumbre sin revelar thresholds crudos',
    ]),
    privacyNotes: Object.freeze(['Usar agregados por bloque; sin pumpSequence ni eventos de click.']),
    implementation: 'buildBalloonRiskFeedback in balloonRiskFeedback.js',
  }),
  Object.freeze({
    id: 'balloon.threshold-calibration-review',
    title: 'Calibración modular de dificultad/thresholds Balloon',
    status: 'implemented_core',
    priority: 'high',
    gameIds: Object.freeze(['balloon_risk']),
    purpose: 'Separar revisión de distribución de pérdidas del componente de juego para distinguir azar, dificultad y estrategia observada.',
    candidateInputs: Object.freeze(['totalRounds', 'averagePumps', 'cashoutCount', 'popCount', 'riskEfficiency']),
    expectedOutputs: Object.freeze(['thresholdCalibrationStatus', 'lossOpportunityBalance', 'recommendedRoundConfig']),
    acceptanceTests: Object.freeze([
      'popRate extremo en fixture se marca como calibración a revisar',
      'no se emite diagnóstico de impulsividad',
      'la salida permite comparar versiones de configuración sin raw rounds',
    ]),
    privacyNotes: Object.freeze(['Sin thresholds por candidato si permiten reconstruir decisiones; usar configuración versionada global.']),
    implementation: 'buildBalloonThresholdCalibrationReview in balloonThresholdCalibrationReview.js',
  }),
  Object.freeze({
    id: 'passenger.constraint-feedback',
    title: 'Explicación modular de restricciones en Passenger Routes',
    status: 'implemented_core',
    priority: 'high',
    gameIds: Object.freeze(['passenger_routes']),
    purpose: 'Separar la explicación de presupuesto, bloqueos, paradas y restricciones para que los errores de ruta sean entendibles sin guardar celdas visitadas.',
    candidateInputs: Object.freeze(['passengersDelivered', 'destinationCount', 'routeEfficiency', 'movementAttemptCount', 'replanCount', 'stationUseCount', 'constraintViolationCount', 'satisfactionScore']),
    expectedOutputs: Object.freeze(['constraintFeedbackCategory', 'candidateHint', 'reviewerCaveat', 'nextDesignProbe']),
    acceptanceTests: Object.freeze([
      'constraintViolationCount > 0 y movementAttemptCount alto => feedback proporcional, no castigo absoluto',
      'stationUseCount se explica como recurso, no como error',
      'no output contiene fullRoute, visitedCells ni stepByStepPath',
    ]),
    privacyNotes: Object.freeze(['Solo usar conteos y ratios agregados; sin rutas, coordenadas ni intentos crudos.']),
    implementation: 'buildPassengerConstraintFeedback in passengerRouteFeedback.js',
  }),
  Object.freeze({
    id: 'passenger.route-authoring-review',
    title: 'Revisión modular de solvencia y dificultad Passenger Routes',
    status: 'implemented_core',
    priority: 'high',
    gameIds: Object.freeze(['passenger_routes']),
    purpose: 'Aislar solver, coste mínimo, presupuesto y paradas para que routeEfficiency dependa de niveles justos y explicables.',
    candidateInputs: Object.freeze(['destinationCount', 'routeEfficiency', 'movementAttemptCount', 'stationUseCount', 'constraintViolationCount']),
    expectedOutputs: Object.freeze(['routeAuthoringStatus', 'solverConsistency', 'budgetFairnessNote', 'recommendedLevelAction']),
    acceptanceTests: Object.freeze([
      'cada nivel demo tiene solución con Dijkstra',
      'routeEfficiency bajo por presupuesto insuficiente se marca como issue de authoring',
      'no se requiere ruta del candidato para revisar dificultad',
    ]),
    privacyNotes: Object.freeze(['El solver puede operar sobre niveles autorados; sin rutas reales del candidato ni celdas agregadas al payload.']),
    implementation: 'buildPassengerRouteAuthoringReview in passengerRouteAuthoringReview.js',
  }),
  Object.freeze({
    id: 'shared.candidate-instruction-check',
    title: 'Chequeo modular de comprensión de instrucciones',
    status: 'implemented_core',
    priority: 'high',
    gameIds: Object.freeze(['laser_puzzle', 'balloon_risk', 'passenger_routes']),
    purpose: 'Agregar micro-chequeos no evaluativos antes de cada juego para distinguir error de comprensión de conducta de tarea.',
    candidateInputs: Object.freeze(['completed', 'timeMs', 'ruleViolationCount', 'constraintViolationCount']),
    expectedOutputs: Object.freeze(['instructionRiskFlag', 'copyRevisionSuggestion', 'excludeFromTalentMappingFlag']),
    acceptanceTests: Object.freeze([
      'si falla comprensión, el framework marca caveat y no baja score de talento',
      'el chequeo no introduce preguntas de personalidad',
      'las respuestas se resumen aggregate-only',
    ]),
    privacyNotes: Object.freeze(['No guardar respuestas textuales crudas si son libres; usar categorías agregadas.']),
    implementation: 'buildCandidateInstructionCheck in candidateInstructionCheck.js',
  }),
  Object.freeze({
    id: 'shared.mobile-accessibility-qa',
    title: 'QA modular mobile/accesibilidad para juegos originales',
    status: 'planned',
    priority: 'medium',
    gameIds: Object.freeze(['laser_puzzle', 'balloon_risk', 'passenger_routes']),
    purpose: 'Mantener pruebas de layout, targets táctiles y copy largo separadas de la lógica de juego.',
    candidateInputs: Object.freeze(['viewportWidth', 'viewportHeight', 'gameId', 'overflowFlag', 'touchTargetSummary']),
    expectedOutputs: Object.freeze(['responsiveStatus', 'accessibilityIssueList', 'recommendedCssModule']),
    acceptanceTests: Object.freeze([
      '390×844 no presenta overflow horizontal',
      'controles principales tienen área táctil suficiente',
      'labels largos hacen wrap sin romper tablero',
    ]),
    privacyNotes: Object.freeze(['Estos datos son QA técnico de viewport, sin evaluación conductual del candidato.']),
  }),
]);

export function listOriginalGameImprovementModules(gameId = null) {
  const modules = MODULES.map((module) => ({
    ...module,
    gameIds: [...module.gameIds],
    candidateInputs: [...module.candidateInputs],
    expectedOutputs: [...module.expectedOutputs],
    acceptanceTests: [...module.acceptanceTests],
    privacyNotes: [...module.privacyNotes],
  }));
  if (!gameId) return modules;
  return modules.filter((module) => module.gameIds.includes(gameId));
}

export function getOriginalGameImprovementModule(moduleId) {
  return listOriginalGameImprovementModules().find((module) => module.id === moduleId) ?? null;
}

export function summarizeOriginalGameImprovementModules() {
  const modules = listOriginalGameImprovementModules();
  const byStatus = {};
  const byGame = {};
  for (const module of modules) {
    byStatus[module.status] = (byStatus[module.status] ?? 0) + 1;
    for (const gameId of module.gameIds) byGame[gameId] = (byGame[gameId] ?? 0) + 1;
  }
  return {
    total: modules.length,
    byStatus,
    byGame,
    nextModules: modules.some((module) => module.status === 'ready_for_tdd')
      ? modules.filter((module) => module.status === 'ready_for_tdd')
      : modules.filter((module) => module.status === 'planned'),
  };
}
