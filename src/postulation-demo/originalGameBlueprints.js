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
]);

export const ORIGINAL_GAME_BLUEPRINTS = Object.freeze([
  Object.freeze({
    gameId: 'laser_puzzle',
    label: 'Puzzle láser',
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
      durationLabel: '2 min',
      trialCount: 2,
      description: 'Reconstruye una ruta de láser con reflectores y reglas visibles, preservando solo métricas agregadas.',
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
      durationLabel: '3 min',
      trialCount: 2,
      description: 'Planifica rutas para recoger pasajeros y llevarlos a destino bajo restricciones de tiempo y presupuesto operativo.',
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
