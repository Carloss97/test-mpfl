export const FORBIDDEN_ORIGINAL_GAME_FIELDS = Object.freeze([
  'rawPointerPath',
  'pointerSamples',
  'rawGameEvents',
  'frames',
  'landmarks',
  'keypoints',
  'domEvent',
  'screenshot',
  'fullRoute',
  'routeTrace',
  'visitedCells',
  'stepByStepPath',
  'clickTrace',
  'eventLog',
  'freeText',
  'typedResponse',
  'messageText',
  'optionText',
  'scenarioText',
  'choiceSequence',
  'rawChoices',
]);

export const ORIGINAL_GAME_BLUEPRINTS = Object.freeze([
  Object.freeze({
    gameId: 'laser_puzzle',
    label: 'Puzzle láser',
    labelEn: 'Laser puzzle',
    shortLabel: 'Láser',
    source: Object.freeze({
      primary: '/mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/Test/src/games/LaserPuzzleGame.jsx',
      alternate: '/mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/Test/src/components/demo/LaserReflectGame.jsx',
      sourceRepo: 'Test',
    }),
    postulation: Object.freeze({
      replaces: 'visual_search',
      skill: 'spatial_planning',
      phase: 'original_games_replacement',
      durationLabel: '4 min',
      trialCount: 3,
      description: 'Reconstruye rutas ópticas de 4–6 movimientos con relés, portales y bifurcación, preservando solo métricas agregadas.',
    }),
    allowedAggregateFields: Object.freeze([
      'aggregateSchemaVersion',
      'score',
      'completed',
      'levelCount',
      'solvedLevels',
      'moveCount',
      'reconfigurationCount',
      'hintCount',
      'timeMs',
      'solutionEfficiency',
      'ruleViolationCount',
      'aggregateOnly',
    ]),
    reportDimension: 'Razonamiento espacial y planificación de reglas; lectura observacional para revisión humana.',
    activation: Object.freeze({ status: 'ported_hidden', phase: 'R-2' }),
  }),
  Object.freeze({
    gameId: 'balloon_risk',
    label: 'Globo de riesgo',
    labelEn: 'Risk balloon',
    shortLabel: 'Globo',
    source: Object.freeze({
      primary: '/mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/Test/src/games/BalloonGame.jsx',
      alternate: '/mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/Test/src/components/demo/BalloonGame.jsx',
      sourceRepo: 'Test',
    }),
    postulation: Object.freeze({
      replaces: null,
      skill: 'risk_feedback_adjustment',
      phase: 'original_games_replacement',
      durationLabel: '2 min',
      trialCount: 8,
      description: 'Gestiona acumulación de puntos frente a riesgo de pérdida, con interpretación conservadora y humana.',
    }),
    allowedAggregateFields: Object.freeze([
      'aggregateSchemaVersion',
      'score',
      'completed',
      'roundsCompleted',
      'totalRounds',
      'averagePumps',
      'cashoutCount',
      'popCount',
      'postPopAdjustment',
      'postPopAdjustmentCount',
      'riskEfficiency',
      'timeMs',
      'aggregateOnly',
    ]),
    reportDimension: 'Ajuste ante feedback y riesgo/recompensa; lectura observacional para revisión humana, no rasgo de personalidad.',
    activation: Object.freeze({ status: 'ported_hidden', phase: 'R-3' }),
  }),
  Object.freeze({
    gameId: 'passenger_routes',
    label: 'Optimización de rutas de pasajeros',
    labelEn: 'Passenger route optimization',
    shortLabel: 'Rutas',
    source: Object.freeze({
      primary: '/mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/Test/src/games/GridFlowGame.jsx',
      alternate: '/mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/Test/src/components/demo/CollectPeopleGame.jsx',
      sourceRepo: 'Test',
    }),
    postulation: Object.freeze({
      replaces: 'precision_targeting',
      skill: 'constraint_planning',
      phase: 'original_games_replacement',
      durationLabel: '4 min',
      trialCount: 3,
      description: 'Opera una central de movilidad con rutas progresivas, reserva energética segura y como máximo una recarga estratégica.',
    }),
    allowedAggregateFields: Object.freeze([
      'aggregateSchemaVersion',
      'score',
      'completed',
      'passengersDelivered',
      'destinationCount',
      'routeEfficiency',
      'movementAttemptCount',
      'replanCount',
      'stationUseCount',
      'constraintViolationCount',
      'satisfactionScore',
      'timeMs',
      'aggregateOnly',
    ]),
    reportDimension: 'Planificación bajo restricciones y eficiencia de rutas; lectura observacional para revisión humana.',
    activation: Object.freeze({ status: 'ported_hidden', phase: 'R-4' }),
  }),
  Object.freeze({
    gameId: 'team_coordination',
    label: 'Operación Faro: coordinación de equipo',
    labelEn: 'Operation Faro: team coordination',
    shortLabel: 'Faro',
    source: Object.freeze({
      primary: 'src/tasks/original-games/TeamCoordinationPostulationTask.jsx',
      alternate: null,
      sourceRepo: 'test-mpfl',
    }),
    postulation: Object.freeze({
      replaces: null,
      skill: 'structured_team_coordination',
      phase: 'original_games_completion_probe',
      durationLabel: '2 min',
      trialCount: 4,
      description: 'RPG táctico por texto: lidera un escuadrón ante cuatro crisis y observa métricas agregadas de comunicación, liderazgo y adaptabilidad.',
    }),
    allowedAggregateFields: Object.freeze([
      'aggregateSchemaVersion',
      'score',
      'completed',
      'scenarioCount',
      'completedScenarioCount',
      'leadershipScore',
      'communicationScore',
      'adaptabilityScore',
      'decisionQualityScore',
      'alignmentScore',
      'roleClarityScore',
      'feedbackUseScore',
      'changeResponseScore',
      'timeMs',
      'aggregateOnly',
    ]),
    reportDimension: 'Comunicación, liderazgo, adaptabilidad y decisión en escenarios estructurados; lectura provisional para revisión humana.',
    activation: Object.freeze({ status: 'controlled_active', phase: 'R-6-demo-completion' }),
  }),
  Object.freeze({
    gameId: 'tangram_exp001',
    label: 'Ensamblaje Geométrico (Tangram)',
    labelEn: 'Geometric assembly (Tangram)',
    shortLabel: 'Tangram',
    source: Object.freeze({
      primary: 'src/tasks/original-games/TangramPostulationTask.jsx',
      alternate: null,
      sourceRepo: 'test-mpfl',
    }),
    postulation: Object.freeze({
      replaces: null,
      skill: 'spatial_planning',
      phase: 'original_games_completion_probe',
      durationLabel: '4 min',
      trialCount: 4,
      description: 'Ensambla siluetas con piezas poligonales (drag, rotación 45° y snap) bajo límites de tiempo y movimientos; solo métricas agregadas por nivel.',
    }),
    allowedAggregateFields: Object.freeze([
      'aggregateSchemaVersion',
      'score',
      'completed',
      'levelsAttempted',
      'completedLevels',
      'solvedLevels',
      'totalTimeMs',
      'totalMoves',
      'totalRotations',
      'avgCoveragePercent',
      'avgInitialLatencyMs',
      'avgTrajectoryEfficiency',
      'avgHesitationTimeMs',
      'totalMoveOverhead',
      'timingPressureHighLatency',
      'aggregateOnly',
    ]),
    reportDimension: 'Planificación ejecutiva y resolución espacial bajo presión temporal; lectura observacional para revisión humana.',
    activation: Object.freeze({ status: 'controlled_active', phase: 'G-tangram' }),
  }),
]);

export function getOriginalGameBlueprint(gameId, blueprints = ORIGINAL_GAME_BLUEPRINTS) {
  return blueprints.find((blueprint) => blueprint.gameId === gameId) ?? null;
}

export function buildOriginalGamePostulationBlocks(blueprints = ORIGINAL_GAME_BLUEPRINTS) {
  return blueprints.map((blueprint) => Object.freeze({
    gameId: blueprint.gameId,
    label: blueprint.label,
    shortLabel: blueprint.shortLabel,
    skill: blueprint.postulation.skill,
    phase: blueprint.postulation.phase,
    durationLabel: blueprint.postulation.durationLabel,
    trialCount: blueprint.postulation.trialCount,
    visible: false,
    description: blueprint.postulation.description,
    sourceGame: blueprint.source.primary,
    activationStatus: blueprint.activation.status,
  }));
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function sanitizeOriginalGameAggregate(gameId, aggregate = {}) {
  const blueprint = getOriginalGameBlueprint(gameId);
  if (!blueprint || !isPlainObject(aggregate)) return {};

  const allowed = new Set(blueprint.allowedAggregateFields);
  const forbidden = new Set(FORBIDDEN_ORIGINAL_GAME_FIELDS);
  return Object.fromEntries(
    Object.entries(aggregate).filter(([key, value]) => (
      allowed.has(key)
      && !forbidden.has(key)
      && (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string')
    )),
  );
}
