// Tangram EXP-TANGRAM-001 — telemetría y geometría (módulo puro, sin DOM).
// Ensamblaje geométrico: silueta objetivo + piezas poligonales con snap (+-8px, +-45deg).
// Privacidad por construcción: solo agrega métricas conductuales + biométricas consolidadas
// por sesión. Nunca persiste rutas crudas, pointer samples, posiciones por evento ni
// secuencias acción-por-acción.

export const TANGRAM_EXP_ID = 'EXP-TANGRAM-001';

export const TANGRAM_SHAPES = Object.freeze({
  // Formas base del tangram clásico representadas como poligonos de vertices normalizados [0..1][2].
  tri_large: Object.freeze({
    id: 'tri_large',
    kind: 'triangle',
    vertices: Object.freeze([[0, 0], [1, 0], [0, 1]]),
    symmetry: Object.freeze([0, 180]), // rotaciones (mod 360) que dejan la forma invariante
  }),
  tri_medium: Object.freeze({
    id: 'tri_medium',
    kind: 'triangle',
    vertices: Object.freeze([[0, 0], [Math.SQRT1_2, 0], [0, 1]]),
    symmetry: Object.freeze([0, 180]),
  }),
  tri_small: Object.freeze({
    id: 'tri_small',
    kind: 'triangle',
    vertices: Object.freeze([[0, 0], [0.5, 0], [0, 0.5]]),
    symmetry: Object.freeze([0, 180]),
  }),
  square: Object.freeze({
    id: 'square',
    kind: 'square',
    vertices: Object.freeze([[0, 0], [1, 0], [1, 1], [0, 1]]),
    symmetry: Object.freeze([0, 90, 180, 270]),
  }),
  rhombus: Object.freeze({
    id: 'rhombus',
    kind: 'rhombus',
    vertices: Object.freeze([[0, 0.3], [0.6, 0], [1, 0.3], [0.4, 0.6]]),
    symmetry: Object.freeze([0, 180]),
  }),
});

export const TANGRAM_SHAPE_ORDER = Object.freeze(['tri_large', 'tri_medium', 'tri_small', 'square', 'rhombus']);

const DEG = Math.PI / 180;

export function rotatePoint([x, y], deg) {
  const rad = deg * DEG;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return [x * cos - y * sin, x * sin + y * cos];
}

// Devuelve la silueta (poligono unitario) de una pieza con rotacion en grados y factor de escala.
export function getShapeVertices(shapeId, rotationDeg = 0, scale = 1) {
  const shape = TANGRAM_SHAPES[shapeId];
  if (!shape) return [];
  return shape.vertices
    .map(([x, y]) => rotatePoint([x * scale, y * scale], rotationDeg))
    .map(([x, y]) => [round3(x), round3(y)]);
}

function round3(n) {
  return Math.round(n * 1000) / 1000;
}

// Normaliza una rotacion (deg) al rango [0,360).
export function normalizeRotationDeg(deg) {
  const m = Number(deg) % 360;
  return m < 0 ? m + 360 : m;
}

// Centroide (x,y) de un poligono (vertex list) — prom genera mal en auto-cierres; usamos area.
export function polygonCentroid(vertices) {
  const n = vertices.length;
  if (n < 3) return [0, 0];
  let A = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < n; i += 1) {
    const [x0, y0] = vertices[i];
    const [x1, y1] = vertices[(i + 1) % n];
    const cross = x0 * y1 - x1 * y0;
    A += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  if (Math.abs(A) < 1e-9) return [0, 0];
  const f = 1 / (3 * A);
  return [round3(cx * f), round3(cy * f)];
}

// Aplica traslacion a un poligono. vertices: [[x,y]...], offset: [dx,dy].
export function translatePolygon(vertices, [dx, dy]) {
  return vertices.map(([x, y]) => [round3(x + dx), round3(y + dy)]);
}

// Checks: vertices dentro de tolerance de la posicion objetivo + rotacion compatible.
// pieza: { shapeId, rotationDeg, position:[cx,cy] } ; slot: { shapeId, rotationDeg, position:[cx,cy], scale }
export function isValidSnap(piece, slot, tolerancePx = 8) {
  if (!piece || !slot) return false;
  if (piece.shapeId !== slot.shapeId) return false;

  const pieceShape = TANGRAM_SHAPES[piece.shapeId];
  if (!pieceShape) return false;

  const rotDelta = normalizeRotationDeg(piece.rotationDeg - slot.rotationDeg);
  const symMatch = pieceShape.symmetry.some((s) => Math.abs(normalizeRotationDeg(rotDelta) - normalizeRotationDeg(s)) < 1e-6);
  if (!symMatch) return false;

  const dx = Math.abs((piece.position?.[0] ?? 0) - (slot.position?.[0] ?? 0));
  const dy = Math.abs((piece.position?.[1] ?? 0) - (slot.position?.[1] ?? 0));
  return dx <= tolerancePx && dy <= tolerancePx;
}

// Two polygons overlap if any edge crosses or a vertex of one is inside the other.
// Poligonos cerrados implícitamente. Se usa la forma mas simple orientada: AABB overlap +
// punto-en-poligono de 1 vertice ahorra falsos negativos para este dominio.
function pointInPolygon([px, py], vertices) {
  let inside = false;
  const n = vertices.length;
  for (let i = 0, j = n - 1; i < n; j = i, i += 1) {
    const [xi, yi] = vertices[i];
    const [xj, yj] = vertices[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-9) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function bbox(vertices) {
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (const [x, y] of vertices) {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  return [x0, y0, x1, y1];
}

export function polygonsOverlap(a, b) {
  if (!a?.length || !b?.length) return false;
  const [x0, y0, x1, y1] = bbox(a);
  const [X0, Y0, X1, Y1] = bbox(b);
  if (x1 < X0 || x0 > X1 || y1 < Y0 || y0 > Y1) return false;
  return a.some((v) => pointInPolygon(v, b)) || b.some((v) => pointInPolygon(v, a));
}

export const TANGRAM_LEVEL_PARAMS = Object.freeze([
  // Nivel 0 — Tutorial (is_tutorial, sin puntaje)
  Object.freeze({ level: 0, pieceCount: 2, timeLimitS: 0, moveLimit: 0, isTutorial: true, purpose: 'tutorial' }),
  // Nivel 1 — Calibración
  Object.freeze({ level: 1, pieceCount: 4, timeLimitS: 60, moveLimit: 0, isTutorial: false, purpose: 'calibration' }),
  // Nivel 2 — Planificación
  Object.freeze({ level: 2, pieceCount: 5, timeLimitS: 45, moveLimit: 3, optimalMoves: 1, isTutorial: false, purpose: 'planning' }),
  // Nivel 3 — Presión de tiempo
  Object.freeze({ level: 3, pieceCount: 6, timeLimitS: 30, moveLimit: 0, isTutorial: false, purpose: 'stress' }),
  // Nivel 4 — Carga crítica (tangram completo)
  Object.freeze({ level: 4, pieceCount: 7, timeLimitS: 35, moveLimit: 4, optimalMoves: 1, isTutorial: false, purpose: 'dual_constraint' }),
]);

export function getTangramLevelParams(level) {
  return TANGRAM_LEVEL_PARAMS.find((p) => p.level === level) ?? null;
}

// Builds the piece stack for a level. Deterministic selection of shapes.
export function buildTangramLevelShapes(level) {
  const params = getTangramLevelParams(level);
  const count = params?.pieceCount ?? 4;
  const queue = ['tri_large', 'tri_large', 'tri_medium', 'tri_small', 'tri_small', 'square', 'rhombus'];
  // rotate queue deterministically by level so higher levels get distinct compositions
  const rotated = [...queue.slice(level % queue.length), ...queue.slice(0, level % queue.length)];
  const selected = rotated.slice(0, count);
  // ensure uniqueness by picking unique first, then fill if count > distinct
  const uniq = [...new Set(selected)];
  while (uniq.length < count) {
    uniq.push(queue[(uniq.length + level * 3) % queue.length]);
  }
  return uniq;
}

// Métricas conductuales derivadas (agregadas, nunca crudas)
export function computeTangramBehavioralMetrics({
  initialLatencyMs = 0,
  trajectoryDistance = 0,
  idealDistance = 0,
  hesitationMs = 0,
  actualMoves = 0,
  optimalMoves = 1,
  last10sJitter = 0,
} = {}) {
  return {
    initial_latency_ms: Math.max(0, Math.round(Number(initialLatencyMs) || 0)),
    trajectory_efficiency_ratio: idealDistance > 0 ? round4(trajectoryDistance > 0 ? idealDistance / trajectoryDistance : 0) : 0,
    hesitation_time_ms: Math.max(0, Math.round(Number(hesitationMs) || 0)),
    move_overhead_count: Math.max(0, Number(actualMoves) - Number(optimalMoves)),
    jitter_index_last_10s: round4(Number(last10sJitter) || 0),
  };
}

function round4(n) {
  return Math.round(n * 10000) / 10000;
}

// Agregado por nivel (allowlist-only)
export function buildTangramLevelAggregate(level, levelMetrics = {}, context = {}) {
  const params = getTangramLevelParams(level);
  return {
    aggregateSchemaVersion: 1,
    exp_id: TANGRAM_EXP_ID,
    level,
    is_tutorial: Boolean(params?.isTutorial),
    purpose: params?.purpose ?? 'unknown',
    pieceCount: params?.pieceCount ?? 0,
    completed: Boolean(levelMetrics.completed),
    solved: Boolean(levelMetrics.completed && !levelMetrics.timedOut && !(levelMetrics.moveLimitReached)),
    timedOut: Boolean(levelMetrics.timedOut),
    moveLimitReached: Boolean(levelMetrics.moveLimitReached),
    coveragePercent: clampPct(Number(levelMetrics.coveragePercent) || 0),
    movesUsed: Number(levelMetrics.movesUsed) || 0,
    rotationsUsed: Number(levelMetrics.rotationsUsed) || 0,
    timeMs: Number(levelMetrics.timeMs) || 0,
    score: Number(levelMetrics.score) || 0,
    ...computeTangramBehavioralMetrics({
      initialLatencyMs: levelMetrics.initialLatencyMs,
      trajectoryDistance: levelMetrics.trajectoryDistance,
      idealDistance: levelMetrics.idealDistance,
      hesitationMs: levelMetrics.hesitationMs,
      actualMoves: levelMetrics.movesUsed,
      optimalMoves: levelMetrics.optimalMoves,
      last10sJitter: levelMetrics.last10sJitter,
    }),
    aggregateOnly: true,
    privacySafe: true,
    humanReviewOnly: true,
    noiseFlag: Boolean(context.noiseFlag),
  };
}

function clampPct(n) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

// Agregado de sesión consolidado
export function buildTangramSessionAggregate(levels, context = {}) {
  const evaluative = levels.filter((l) => !l.is_tutorial);
  const completedEvaluative = evaluative.filter((l) => l.completed);
  const solved = evaluative.filter((l) => l.solved);
  const sum = (key) => evaluative.reduce((acc, l) => acc + Number(l[key] ?? 0), 0);
  const sumCompleted = (key) => completedEvaluative.reduce((acc, l) => acc + Number(l[key] ?? 0), 0);
  const initialLatencies = evaluative.map((l) => l.initial_latency_ms ?? 0).filter((v) => v > 0);
  const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

  return {
    aggregateSchemaVersion: 1,
    exp_id: TANGRAM_EXP_ID,
    levelsAttempted: evaluative.length,
    completedLevels: completedEvaluative.length,
    solvedLevels: solved.length,
    totalTimeMs: sum('timeMs'),
    totalMoves: sum('movesUsed'),
    totalRotations: sum('rotationsUsed'),
    avgCoveragePercent: clampPct(mean(evaluative.map((l) => l.coveragePercent ?? 0))),
    avgInitialLatencyMs: Math.round(mean(initialLatencies)),
    avgTrajectoryEfficiency: round4(mean(evaluative.map((l) => l.trajectory_efficiency_ratio ?? 0))),
    avgHesitationTimeMs: Math.round(mean(evaluative.map((l) => l.hesitation_time_ms ?? 0))),
    totalMoveOverhead: sumCompleted('move_overhead_count'),
    timingPressureHighLatency: Boolean(context.highLatencyAtStress),
    aggregateOnly: true,
    privacySafe: true,
    humanReviewOnly: true,
    noAutomatedDecision: true,
  };
}

export const FORBIDDEN_TANGRAM_FIELDS = Object.freeze([
  'rawPointerPath', 'pointerSamples', 'rawGameEvents', 'frames', 'landmarks',
  'keypoints', 'domEvent', 'screenshot', 'fullRoute', 'stepByStepPath', 'clickTrace',
  'eventLog', 'pieceTrace', 'snapTrace', 'rawSeries', 'raw_positions', 'positions',
]);

export function sanitizeTangramPayload(payload = {}) {
  const source = payload.raw ?? payload;
  const allowed = new Set([
    'aggregateSchemaVersion', 'exp_id', 'level', 'is_tutorial', 'purpose', 'pieceCount',
    'completed', 'solved', 'timedOut', 'moveLimitReached', 'coveragePercent', 'movesUsed',
    'rotationsUsed', 'timeMs', 'score', 'initial_latency_ms', 'trajectory_efficiency_ratio',
    'hesitation_time_ms', 'move_overhead_count', 'jitter_index_last_10s', 'aggregateOnly',
    'privacySafe', 'humanReviewOnly', 'noiseFlag', 'levelsAttempted', 'completedLevels',
    'solvedLevels', 'totalTimeMs', 'totalMoves', 'totalRotations', 'avgCoveragePercent',
    'avgInitialLatencyMs', 'avgTrajectoryEfficiency', 'avgHesitationTimeMs', 'totalMoveOverhead',
    'timingPressureHighLatency', 'noAutomatedDecision',
  ]);
  const forbidden = new Set(FORBIDDEN_TANGRAM_FIELDS);
  return Object.fromEntries(
    Object.entries(source).filter(([key, value]) => (
      allowed.has(key)
      && !forbidden.has(key)
      && (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string')
    )),
  );
}

// Reaccion de dificultad (staircase). Devuelve ajuste opcional para el nivel siguiente.
export function computeTangramStaircase(levelMetrics) {
  if (levelMetrics.level < 2) return { adjust: 'none' };
  if (levelMetrics.level === 2 && levelMetrics.completed && levelMetrics.move_overhead_count === 0) {
    return { adjust: 'time_15pct' };
  }
  if (levelMetrics.level === 2 && !levelMetrics.completed && levelMetrics.movesUsed > 0
    && levelMetrics.movesUsed >= (levelMetrics.moveLimit ?? 0) * 0.8) {
    return { adjust: 'complex_shapes' };
  }
  return { adjust: 'none' };
}