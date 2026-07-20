const DIRS = Object.freeze({
  right: [1, 0],
  left: [-1, 0],
  up: [0, -1],
  down: [0, 1],
  upRight: [1, -1],
  downRight: [1, 1],
  downLeft: [-1, 1],
  upLeft: [-1, -1],
});

const DEFLECT_NE = Object.freeze({
  right: 'up',
  left: 'down',
  up: 'right',
  down: 'left',
  downRight: 'upLeft',
  upLeft: 'downRight',
  upRight: 'upRight',
  downLeft: 'downLeft',
});

const DEFLECT_NW = Object.freeze({
  right: 'down',
  left: 'up',
  up: 'left',
  down: 'right',
  downRight: 'downRight',
  upLeft: 'upLeft',
  upRight: 'downLeft',
  downLeft: 'upRight',
});

const BIFURCATE = Object.freeze({
  right: ['up', 'down'],
  left: ['up', 'down'],
  up: ['left', 'right'],
  down: ['left', 'right'],
  upRight: ['up', 'right'],
  downRight: ['down', 'right'],
  downLeft: ['down', 'left'],
  upLeft: ['up', 'left'],
});

const LASER_ALLOWED_RESPONSE_FIELDS = Object.freeze([
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
]);

function round(value, digits = 4) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  const factor = 10 ** digits;
  return Math.round(numeric * factor) / factor;
}

function wallCells(cells = []) {
  return cells.map(({ x, y }) => ({ x, y, type: 'wall' }));
}

export function buildLaserDemoLevels() {
  return [
    Object.freeze({
      id: 'laser-demo-1',
      name: 'Mapa láser 1',
      difficulty: 'intro',
      cols: 8,
      rows: 8,
      par: 4,
      antennaCount: 1,
      timeLimitMs: 75_000,
      solutionPlacements: Object.freeze([
        Object.freeze(['7,7', '2,0']),
        Object.freeze(['3,7', '0,5']),
        Object.freeze(['0,7', '2,5']),
      ]),
      cells: Object.freeze([
        Object.freeze({ x: 0, y: 0, type: 'ship', dir: 'down' }),
        Object.freeze({ x: 6, y: 0, type: 'antenna' }),
        Object.freeze({ x: 7, y: 7, type: 'reflector_ne', movable: true }),
        Object.freeze({ x: 3, y: 7, type: 'reflector_nw', movable: true }),
        Object.freeze({ x: 0, y: 7, type: 'reflector_ne', movable: true }),
        ...wallCells([
          { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 3, y: 1 }, { x: 6, y: 1 },
          { x: 1, y: 2 }, { x: 5, y: 2 }, { x: 1, y: 3 }, { x: 1, y: 4 },
          { x: 3, y: 4 }, { x: 5, y: 4 }, { x: 2, y: 6 }, { x: 6, y: 6 },
          { x: 4, y: 7 },
        ]).map(Object.freeze),
      ]),
    }),
    Object.freeze({
      id: 'laser-demo-2',
      name: 'Mapa láser 2',
      difficulty: 'planning',
      cols: 7,
      rows: 7,
      par: 3,
      antennaCount: 1,
      timeLimitMs: 70_000,
      solutionPlacements: Object.freeze([
        Object.freeze(['5,5', '2,3']),
        Object.freeze(['1,5', '2,0']),
      ]),
      cells: Object.freeze([
        Object.freeze({ x: 0, y: 3, type: 'ship', dir: 'right' }),
        Object.freeze({ x: 6, y: 0, type: 'antenna' }),
        Object.freeze({ x: 5, y: 5, type: 'reflector_ne', movable: true }),
        Object.freeze({ x: 1, y: 5, type: 'reflector_ne', movable: true }),
        ...wallCells([
          { x: 1, y: 1 }, { x: 4, y: 1 }, { x: 5, y: 1 },
          { x: 1, y: 2 }, { x: 4, y: 2 }, { x: 1, y: 4 },
          { x: 3, y: 4 }, { x: 4, y: 4 }, { x: 6, y: 4 },
        ]).map(Object.freeze),
      ]),
    }),
  ];
}

export function buildLaserGrid(level = {}) {
  return Object.fromEntries((level.cells ?? []).map((cell) => [`${cell.x},${cell.y}`, { ...cell }]));
}

function findLinkedPortalKey(grid, cellKey, cell) {
  const targetPortalId = cell?.targetPortalId;
  const portalId = cell?.portalId;
  const cellType = cell?.type;
  if (targetPortalId) {
    const match = Object.keys(grid).find((key) => key !== cellKey && grid[key].type === cellType && grid[key].portalId === targetPortalId);
    if (match) return match;
  }
  if (portalId) {
    const match = Object.keys(grid).find((key) => key !== cellKey && grid[key].type === cellType && grid[key].targetPortalId === portalId);
    if (match) return match;
  }
  return Object.keys(grid).find((key) => key !== cellKey && (grid[key].type === 'portal_blue' || grid[key].type === 'portal_red')) ?? null;
}

export function traceLaserBeam(grid = {}, cols = 0, rows = 0) {
  const shipEntry = Object.entries(grid).find(([, cell]) => cell.type === 'ship');
  if (!shipEntry) return { beamCells: new Set(), litAntennas: new Set(), litAntennaCount: 0 };

  const [shipKey, ship] = shipEntry;
  const [shipX, shipY] = shipKey.split(',').map(Number);
  const beamCells = new Set();
  const litAntennas = new Set();
  const visited = new Set();
  const queue = [{ x: shipX, y: shipY, dir: ship.dir }];

  while (queue.length > 0) {
    const { x, y, dir } = queue.shift();
    const stateKey = `${x},${y},${dir}`;
    if (visited.has(stateKey)) continue;
    visited.add(stateKey);

    const vector = DIRS[dir];
    if (!vector) continue;
    const [dx, dy] = vector;
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;

    const cellKey = `${nx},${ny}`;
    const cell = grid[cellKey];
    const type = cell?.type;
    if (!type || type === 'empty') {
      beamCells.add(cellKey);
      queue.push({ x: nx, y: ny, dir });
    } else if (type === 'wall') {
      continue;
    } else if (type === 'reflector_ne') {
      beamCells.add(cellKey);
      queue.push({ x: nx, y: ny, dir: DEFLECT_NE[dir] });
    } else if (type === 'reflector_nw') {
      beamCells.add(cellKey);
      queue.push({ x: nx, y: ny, dir: DEFLECT_NW[dir] });
    } else if (type === 'bifurcator') {
      beamCells.add(cellKey);
      for (const nextDir of BIFURCATE[dir] ?? []) queue.push({ x: nx, y: ny, dir: nextDir });
    } else if (type === 'portal_blue' || type === 'portal_red') {
      beamCells.add(cellKey);
      const otherPortalKey = findLinkedPortalKey(grid, cellKey, cell);
      if (otherPortalKey) {
        const [px, py] = otherPortalKey.split(',').map(Number);
        queue.push({ x: px, y: py, dir });
      }
    } else if (type === 'antenna') {
      beamCells.add(cellKey);
      litAntennas.add(cellKey);
    }
  }

  return { beamCells, litAntennas, litAntennaCount: litAntennas.size };
}

export function countAntennas(level = {}) {
  return (level.cells ?? []).filter((cell) => cell.type === 'antenna').length;
}

export function getLaserBoardMetrics(level = {}, viewport = {}) {
  const cols = Math.max(1, Number(level.cols) || 8);
  const rows = Math.max(1, Number(level.rows) || 8);
  const width = Math.max(260, Number(viewport.width) || 606);
  const height = Math.max(240, Number(viewport.height) || 338);
  const compact = width <= 620 || height <= 360;
  const gap = compact ? 2 : 4;
  const padding = compact ? 10 : 12;
  const preferredCell = compact ? 42 : 48;
  const minCell = compact ? 24 : 28;
  const maxCellByWidth = (width - (padding * 2) - ((cols - 1) * gap)) / cols;
  const maxCellByHeight = (height - (padding * 2) - ((rows - 1) * gap)) / rows;
  const cellSize = Math.max(minCell, Math.floor(Math.min(preferredCell, maxCellByWidth, maxCellByHeight)));
  return {
    cellSize,
    gap,
    padding,
    boardWidth: Math.ceil((cols * cellSize) + ((cols - 1) * gap) + (padding * 2)),
    boardHeight: Math.ceil((rows * cellSize) + ((rows - 1) * gap) + (padding * 2)),
    compact,
  };
}

export function getLaserEfficiency({ moves = 0, par = 1 } = {}) {
  const moveCount = Math.max(1, Number(moves) || 1);
  const parCount = Math.max(1, Number(par) || 1);
  return round(Math.min(1, parCount / moveCount), 4);
}

export function buildLaserResponseAggregate({
  completed = false,
  solvedLevels = 0,
  levelCount = 1,
  moveCount = 0,
  parTotal = 1,
  timeMs = 0,
  ruleViolationCount = 0,
  hintCount = 0,
  reconfigurationCount = 0,
} = {}) {
  const solutionEfficiency = getLaserEfficiency({ moves: moveCount, par: parTotal });
  const solvedRate = Math.max(0, Math.min(1, Number(solvedLevels) / Math.max(1, Number(levelCount) || 1)));
  const penalty = Math.min(0.35, Math.max(0, Number(ruleViolationCount) || 0) * 0.05);
  return {
    aggregateSchemaVersion: 'laser_puzzle_aggregate_v1',
    score: round(Math.max(0, (solutionEfficiency * 0.65) + (solvedRate * 0.35) - penalty), 4),
    completed: Boolean(completed),
    levelCount: Math.max(1, Math.round(Number(levelCount) || 1)),
    solvedLevels: Math.max(0, Math.round(Number(solvedLevels) || 0)),
    moveCount: Math.max(0, Math.round(Number(moveCount) || 0)),
    reconfigurationCount: Math.max(0, Math.round(Number(reconfigurationCount) || 0)),
    hintCount: Math.max(0, Math.round(Number(hintCount) || 0)),
    timeMs: Math.max(0, Math.round(Number(timeMs) || 0)),
    solutionEfficiency,
    ruleViolationCount: Math.max(0, Math.round(Number(ruleViolationCount) || 0)),
    aggregateOnly: true,
  };
}

function sanitizeLaserAggregateFields(laserPuzzle = {}) {
  const allowed = new Set(LASER_ALLOWED_RESPONSE_FIELDS);
  return Object.fromEntries(
    Object.entries(laserPuzzle).filter(([key, value]) => (
      allowed.has(key)
      && (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string')
    )),
  );
}

export function sanitizeLaserResponsePayload(response = {}) {
  const sanitized = {
    correct: response.correct === true,
    outcome: typeof response.outcome === 'string' ? response.outcome : (response.correct ? 'level_solved' : 'level_incomplete'),
    reactionTimeMs: Math.max(0, Math.round(Number(response.reactionTimeMs) || 0)),
    score: round(Number(response.score) || 0, 4),
  };
  const laserPuzzle = sanitizeLaserAggregateFields(response.laserPuzzle ?? {});
  if (Object.keys(laserPuzzle).length) sanitized.laserPuzzle = laserPuzzle;
  return sanitized;
}
