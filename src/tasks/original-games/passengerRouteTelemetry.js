const PASSENGER_ROUTE_ALLOWED_AGGREGATE_FIELDS = Object.freeze([
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
]);

const DIRECTIONS = Object.freeze([
  Object.freeze({ dx: 1, dy: 0, cost: 1 }),
  Object.freeze({ dx: -1, dy: 0, cost: 1 }),
  Object.freeze({ dx: 0, dy: 1, cost: 2 }),
  Object.freeze({ dx: 0, dy: -1, cost: 2 }),
]);

function round(value, digits = 4) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  const factor = 10 ** digits;
  return Math.round(numeric * factor) / factor;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function freezeCoordinate(coordinate = {}) {
  return Object.freeze({ x: Number(coordinate.x) || 0, y: Number(coordinate.y) || 0 });
}

function freezePassenger(passenger = {}) {
  return Object.freeze({
    id: String(passenger.id ?? ''),
    label: String(passenger.label ?? passenger.id ?? ''),
    x: Number(passenger.x) || 0,
    y: Number(passenger.y) || 0,
    color: String(passenger.color ?? '#4f46e5'),
    destination: freezeCoordinate(passenger.destination),
  });
}

function freezeLevel(level = {}) {
  return Object.freeze({
    ...level,
    start: freezeCoordinate(level.start),
    walls: Object.freeze([...(level.walls ?? [])].map(String)),
    stations: Object.freeze((level.stations ?? []).map(freezeCoordinate)),
    passengers: Object.freeze((level.passengers ?? []).map(freezePassenger)),
  });
}

export function buildPassengerRouteDemoLevels() {
  return [
    freezeLevel({
      id: 'passenger-final-1-centro',
      name: 'Centro: primera entrega',
      difficulty: 'intro · una entrega',
      objective: 'Recoger un pasajero y llevarlo a su destino administrando costos horizontales y verticales.',
      coreChallenge: 'Entender presupuesto operativo, dirección de movimiento y condición de entrega.',
      cols: 7,
      rows: 6,
      routeBudget: 12,
      timeLimitMs: 75_000,
      start: { x: 1, y: 4 },
      walls: ['0,0', '1,0', '6,0', '0,2', '3,2', '4,2', '0,5', '6,5'],
      stations: [],
      passengers: [
        {
          id: 'A',
          label: 'Pasajero A',
          x: 2,
          y: 4,
          color: '#4f46e5',
          destination: { x: 5, y: 1 },
        },
      ],
    }),
    freezeLevel({
      id: 'passenger-final-2-intermodal',
      name: 'Conexión intermodal',
      difficulty: 'planning · dos entregas',
      objective: 'Coordinar dos pasajeros y una parada de apoyo para sostener el presupuesto.',
      coreChallenge: 'Decidir cuándo recargar sin convertir la parada en un error automático.',
      cols: 8,
      rows: 7,
      routeBudget: 11,
      timeLimitMs: 95_000,
      start: { x: 1, y: 5 },
      walls: ['0,0', '2,0', '3,0', '5,0', '7,0', '0,3', '3,3', '7,3', '0,6', '3,6', '4,6', '7,6'],
      stations: [{ x: 4, y: 4 }],
      passengers: [
        {
          id: 'A',
          label: 'Pasajero A',
          x: 2,
          y: 5,
          color: '#0f766e',
          destination: { x: 6, y: 4 },
        },
        {
          id: 'B',
          label: 'Pasajero B',
          x: 5,
          y: 2,
          color: '#c2410c',
          destination: { x: 1, y: 1 },
        },
      ],
    }),
    freezeLevel({
      id: 'passenger-final-3-hora-punta',
      name: 'Hora punta: red crítica',
      difficulty: 'advanced · secuencia y recargas',
      objective: 'Resolver dos entregas encadenadas con recargas obligatorias y presupuesto ajustado.',
      coreChallenge: 'Priorizar orden de entrega, uso de paradas y eficiencia de ruta sin depender de ensayo-error.',
      cols: 9,
      rows: 7,
      routeBudget: 9,
      timeLimitMs: 120_000,
      start: { x: 1, y: 5 },
      walls: ['0,0', '2,0', '5,0', '8,0', '0,2', '3,2', '5,2', '8,2', '0,4', '3,4', '6,4', '8,4', '0,6', '4,6', '8,6'],
      stations: [{ x: 5, y: 5 }, { x: 4, y: 3 }],
      passengers: [
        {
          id: 'A',
          label: 'Pasajero A',
          x: 2,
          y: 5,
          color: '#4f46e5',
          destination: { x: 7, y: 5 },
        },
        {
          id: 'B',
          label: 'Pasajero B',
          x: 7,
          y: 3,
          color: '#be123c',
          destination: { x: 1, y: 1 },
        },
      ],
    }),
  ];
}

function stateKey(state) {
  return [state.x, state.y, state.budget, state.onboard, state.deliveredMask].join('|');
}

function isBetterCandidate(candidate, previous) {
  if (!previous) return true;
  if (candidate.cost !== previous.cost) return candidate.cost < previous.cost;
  if (candidate.moves !== previous.moves) return candidate.moves < previous.moves;
  return candidate.stationUses < previous.stationUses;
}

function applyPassengerInteractions(state, passengers) {
  let onboard = state.onboard;
  let deliveredMask = state.deliveredMask;

  if (onboard >= 0) {
    const destination = passengers[onboard]?.destination;
    if (destination?.x === state.x && destination?.y === state.y) {
      deliveredMask |= (1 << onboard);
      onboard = -1;
    }
  }

  if (onboard < 0) {
    const pickupIndex = passengers.findIndex((passenger, index) => (
      (deliveredMask & (1 << index)) === 0
      && passenger.x === state.x
      && passenger.y === state.y
    ));
    if (pickupIndex >= 0) onboard = pickupIndex;
  }

  return { ...state, onboard, deliveredMask };
}

export function solvePassengerRouteLevel(level = {}) {
  const cols = Math.max(0, Math.floor(Number(level.cols) || 0));
  const rows = Math.max(0, Math.floor(Number(level.rows) || 0));
  const routeBudget = Math.max(0, Math.floor(Number(level.routeBudget) || 0));
  const passengers = Array.isArray(level.passengers) ? level.passengers : [];
  const start = level.start ?? {};
  const walls = new Set(Array.isArray(level.walls) ? level.walls.map(String) : []);
  const stations = new Set((Array.isArray(level.stations) ? level.stations : []).map(({ x, y }) => `${x},${y}`));
  const failure = {
    solvable: false,
    minimumCost: null,
    minimumMoves: null,
    minimumStationUses: null,
  };

  if (
    cols < 1
    || rows < 1
    || routeBudget < 1
    || passengers.length < 1
    || !Number.isInteger(start.x)
    || !Number.isInteger(start.y)
    || start.x < 0
    || start.y < 0
    || start.x >= cols
    || start.y >= rows
    || walls.has(`${start.x},${start.y}`)
  ) return failure;

  const deliveredGoal = (1 << passengers.length) - 1;
  const initial = applyPassengerInteractions({
    x: start.x,
    y: start.y,
    budget: routeBudget,
    onboard: -1,
    deliveredMask: 0,
    cost: 0,
    moves: 0,
    stationUses: 0,
  }, passengers);
  const queue = [initial];
  const best = new Map([[stateKey(initial), { cost: 0, moves: 0, stationUses: 0 }]]);

  while (queue.length > 0) {
    queue.sort((a, b) => (
      a.cost - b.cost
      || a.moves - b.moves
      || a.stationUses - b.stationUses
    ));
    const current = queue.shift();
    const known = best.get(stateKey(current));
    if (
      !known
      || current.cost !== known.cost
      || current.moves !== known.moves
      || current.stationUses !== known.stationUses
    ) continue;

    if (current.deliveredMask === deliveredGoal && current.onboard < 0) {
      return {
        solvable: true,
        minimumCost: current.cost,
        minimumMoves: current.moves,
        minimumStationUses: current.stationUses,
      };
    }

    for (const direction of DIRECTIONS) {
      const x = current.x + direction.dx;
      const y = current.y + direction.dy;
      if (x < 0 || y < 0 || x >= cols || y >= rows || walls.has(`${x},${y}`)) continue;
      if (current.budget < direction.cost) continue;

      let budget = current.budget - direction.cost;
      let stationUses = current.stationUses;
      if (stations.has(`${x},${y}`) && budget < routeBudget) {
        budget = routeBudget;
        stationUses += 1;
      }

      const candidate = applyPassengerInteractions({
        x,
        y,
        budget,
        onboard: current.onboard,
        deliveredMask: current.deliveredMask,
        cost: current.cost + direction.cost,
        moves: current.moves + 1,
        stationUses,
      }, passengers);
      const key = stateKey(candidate);
      const previous = best.get(key);
      if (!isBetterCandidate(candidate, previous)) continue;
      best.set(key, {
        cost: candidate.cost,
        moves: candidate.moves,
        stationUses: candidate.stationUses,
      });
      queue.push(candidate);
    }
  }

  return failure;
}

export function getPassengerRouteBoardMetrics(level = {}, viewport = {}) {
  const cols = Math.max(1, Math.floor(Number(level.cols) || 7));
  const rows = Math.max(1, Math.floor(Number(level.rows) || 6));
  const width = Math.max(320, Number(viewport.width) || 606);
  const height = Math.max(260, Number(viewport.height) || 338);
  const compact = width <= 620 || height <= 360;
  const gap = compact ? 2 : 3;
  const padding = compact ? 8 : 10;
  const preferredCell = compact ? 32 : 38;
  const minCell = 24;
  const boardWidthBudget = compact ? Math.max(280, width * 0.64) : width * 0.68;
  const boardHeightBudget = compact ? Math.max(240, height - 70) : height - 60;
  const maxCellByWidth = (boardWidthBudget - (padding * 2) - ((cols - 1) * gap)) / cols;
  const maxCellByHeight = (boardHeightBudget - (padding * 2) - ((rows - 1) * gap)) / rows;
  const cellSize = Math.max(minCell, Math.floor(Math.min(preferredCell, maxCellByWidth, maxCellByHeight)));

  return {
    cellSize,
    gap,
    padding,
    boardWidth: Math.ceil((cols * cellSize) + ((cols - 1) * gap) + (padding * 2)),
    boardHeight: Math.ceil((rows * cellSize) + ((rows - 1) * gap) + (padding * 2)),
    compact,
    controlSize: compact ? 44 : 50,
  };
}

export function buildPassengerRouteResponseAggregate({
  completed = false,
  passengersDelivered = 0,
  destinationCount = 1,
  actualCost = 0,
  minimumCost = 0,
  movementAttemptCount = 0,
  replanCount = 0,
  stationUseCount = 0,
  constraintViolationCount = 0,
  satisfactionScore = 0,
  timeMs = 0,
} = {}) {
  const delivered = Math.max(0, Math.round(Number(passengersDelivered) || 0));
  const destinations = Math.max(1, Math.round(Number(destinationCount) || 1));
  const actual = Math.max(0, Number(actualCost) || 0);
  const minimum = Math.max(0, Number(minimumCost) || 0);
  const routeEfficiency = actual > 0 ? round(clamp(minimum / actual, 0, 1), 4) : 0;
  const satisfaction = round(clamp(Number(satisfactionScore) || 0, 0, 100), 2);
  const completionRate = clamp(delivered / destinations, 0, 1);
  const violationCount = Math.max(0, Math.round(Number(constraintViolationCount) || 0));
  const replans = Math.max(0, Math.round(Number(replanCount) || 0));
  const score = round(clamp(
    (completionRate * 0.4)
      + (routeEfficiency * 0.35)
      + ((satisfaction / 100) * 0.25)
      - (violationCount * 0.02)
      - (replans * 0.005),
    0,
    1,
  ), 4);

  return {
    aggregateSchemaVersion: 'passenger_routes_aggregate_v1',
    score,
    completed: Boolean(completed),
    passengersDelivered: delivered,
    destinationCount: destinations,
    routeEfficiency,
    movementAttemptCount: Math.max(0, Math.round(Number(movementAttemptCount) || 0)),
    replanCount: replans,
    stationUseCount: Math.max(0, Math.round(Number(stationUseCount) || 0)),
    constraintViolationCount: violationCount,
    satisfactionScore: satisfaction,
    timeMs: Math.max(0, Math.round(Number(timeMs) || 0)),
    aggregateOnly: true,
  };
}

export function sanitizePassengerRouteAggregate(aggregate = {}) {
  if (!aggregate || typeof aggregate !== 'object' || Array.isArray(aggregate)) return {};
  const allowed = new Set(PASSENGER_ROUTE_ALLOWED_AGGREGATE_FIELDS);
  return Object.fromEntries(
    Object.entries(aggregate).filter(([key, value]) => (
      allowed.has(key)
      && (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string')
    )),
  );
}

export function sanitizePassengerRouteResponsePayload(response = {}) {
  const sanitized = {
    correct: response.correct === true,
    outcome: typeof response.outcome === 'string' ? response.outcome : (response.correct ? 'route_completed' : 'route_incomplete'),
    reactionTimeMs: Math.max(0, Math.round(Number(response.reactionTimeMs) || 0)),
    score: round(Number(response.score) || 0, 4),
  };
  const passengerRoutes = sanitizePassengerRouteAggregate(response.passengerRoutes ?? {});
  if (Object.keys(passengerRoutes).length > 0) sanitized.passengerRoutes = passengerRoutes;
  return sanitized;
}
