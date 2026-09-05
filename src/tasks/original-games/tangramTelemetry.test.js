import { describe, it, expect } from 'vitest';
import {
  TANGRAM_EXP_ID,
  TANGRAM_SHAPES,
  TANGRAM_LEVEL_PARAMS,
  getTangramLevelParams,
  buildTangramLevelShapes,
  rotatePoint,
  getShapeVertices,
  normalizeRotationDeg,
  polygonCentroid,
  translatePolygon,
  isValidSnap,
  polygonsOverlap,
  computeTangramBehavioralMetrics,
  TANGRAM_LEVEL_PARAMS as PARAMS,
  buildTangramLevelAggregate,
  buildTangramSessionAggregate,
  computeTangramStaircase,
  sanitizeTangramPayload,
  FORBIDDEN_TANGRAM_FIELDS,
} from './tangramTelemetry.js';

describe('tangramTelemetry — geometría', () => {
  it('rota un punto 90 grados', () => {
    const [x, y] = rotatePoint([1, 0], 90);
    expect(x).toBeCloseTo(0, 5);
    expect(y).toBeCloseTo(1, 5);
  });

  it('normaliza rotaciones a [0,360)', () => {
    expect(normalizeRotationDeg(450)).toBe(90);
    expect(normalizeRotationDeg(-90)).toBe(270);
    expect(normalizeRotationDeg(0)).toBe(0);
  });

  it('calcula el centroide de un cuadrado', () => {
    const verts = [[0, 0], [1, 0], [1, 1], [0, 1]];
    const [cx, cy] = polygonCentroid(verts);
    expect(cx).toBeCloseTo(0.5, 3);
    expect(cy).toBeCloseTo(0.5, 3);
  });

  it('genera vertices de geometria con escala y rotacion', () => {
    const verts = getShapeVertices('square', 0, 10);
    expect(verts.length).toBe(4);
    expect(verts[1]).toEqual([10, 0]);
  });

  it('traslada un poligono', () => {
    const moved = translatePolygon([[0, 0], [1, 0]], [5, 3]);
    expect(moved).toEqual([[5, 3], [6, 3]]);
  });
});

describe('tangramTelemetry — snap', () => {
  const slot = { shapeId: 'square', rotationDeg: 0, position: [100, 100], scale: 1 };

  it('encaja cuando pieza esta dentro de tolerancia y con rotacion compatible', () => {
    expect(isValidSnap({ shapeId: 'square', rotationDeg: 0, position: [102, 98] }, slot, 8)).toBe(true);
  });

  it('rechaza pieza fuera de la tolerancia', () => {
    expect(isValidSnap({ shapeId: 'square', rotationDeg: 0, position: [130, 100] }, slot, 8)).toBe(false);
  });

  it('rechaza forma distinta', () => {
    expect(isValidSnap({ shapeId: 'tri_small', rotationDeg: 0, position: [100, 100] }, slot, 8)).toBe(false);
  });

  it('acepta rotaciones simétricas del cuadrado (90) y rechaza una incompat (45)', () => {
    expect(isValidSnap({ shapeId: 'square', rotationDeg: 90, position: [100, 100] }, slot, 8)).toBe(true);
    expect(isValidSnap({ shapeId: 'square', rotationDeg: 45, position: [100, 100] }, slot, 8)).toBe(false);
  });

  it('acepta triangulos a 180 (simetria) y rechaza a 90', () => {
    const triSlot = { shapeId: 'tri_large', rotationDeg: 0, position: [50, 50], scale: 1 };
    expect(isValidSnap({ shapeId: 'tri_large', rotationDeg: 180, position: [50, 50] }, triSlot, 8)).toBe(true);
    expect(isValidSnap({ shapeId: 'tri_large', rotationDeg: 90, position: [50, 50] }, triSlot, 8)).toBe(false);
  });
});

describe('tangramTelemetry — overlap', () => {
  it('detecta solapamiento entre dos cuadrados', () => {
    const a = [[0, 0], [10, 0], [10, 10], [0, 10]];
    const b = [[5, 5], [15, 5], [15, 15], [5, 15]];
    expect(polygonsOverlap(a, b)).toBe(true);
  });

  it('no reporta solapamiento cuando estan separadas', () => {
    const a = [[0, 0], [10, 0], [10, 10], [0, 10]];
    const b = [[20, 20], [30, 20], [30, 30], [20, 30]];
    expect(polygonsOverlap(a, b)).toBe(false);
  });
});

describe('tangramTelemetry — niveles', () => {
  it('expone la configuracion de los 5 niveles (0-4) con la matriz de dificultad', () => {
    expect(PARAMS).toHaveLength(5);
    expect(getTangramLevelParams(0).isTutorial).toBe(true);
    expect(getTangramLevelParams(1)).toMatchObject({ pieceCount: 4, timeLimitS: 60, moveLimit: 0, purpose: 'calibration' });
    expect(getTangramLevelParams(2)).toMatchObject({ pieceCount: 5, timeLimitS: 45, moveLimit: 3, purpose: 'planning' });
    expect(getTangramLevelParams(3)).toMatchObject({ pieceCount: 6, timeLimitS: 30, moveLimit: 0, purpose: 'stress' });
    expect(getTangramLevelParams(4)).toMatchObject({ pieceCount: 7, timeLimitS: 35, moveLimit: 4, purpose: 'dual_constraint' });
  });

  it('genera piezas en cantidad correcta por nivel', () => {
    expect(buildTangramLevelShapes(1)).toHaveLength(4);
    expect(buildTangramLevelShapes(4)).toHaveLength(7);
  });
});

describe('tangramTelemetry — behaviorales', () => {
  it('calcula metricas agregadas desde entradas simples', () => {
    const m = computeTangramBehavioralMetrics({
      initialLatencyMs: 4250, trajectoryDistance: 100, idealDistance: 82,
      hesitationMs: 1120, actualMoves: 4, optimalMoves: 2, last10sJitter: 0.045,
    });
    expect(m.initial_latency_ms).toBe(4250);
    expect(m.trajectory_efficiency_ratio).toBeCloseTo(0.82, 2);
    expect(m.hesitation_time_ms).toBe(1120);
    expect(m.move_overhead_count).toBe(2);
    expect(m.jitter_index_last_10s).toBeCloseTo(0.045, 3);
  });
});

describe('tangramTelemetry — agregados y privacidad', () => {
  it('construye agregado de nivel con allowlist y flags', () => {
    const agg = buildTangramLevelAggregate(2, {
      completed: true, coveragePercent: 100, movesUsed: 3, rotationsUsed: 2, timeMs: 40000, score: 100,
      initialLatencyMs: 3000, trajectoryDistance: 100, idealDistance: 80, hesitationMs: 200, optimalMoves: 1, last10sJitter: 0.01,
    });
    expect(agg.exp_id).toBe(TANGRAM_EXP_ID);
    expect(agg.solved).toBe(true);
    expect(agg.coveragePercent).toBe(100);
    expect(agg.aggregateOnly).toBe(true);
    expect(agg.privacySafe).toBe(true);
    expect(agg.humanReviewOnly).toBe(true);
    expect(agg.move_overhead_count).toBe(2);
  });

  it('construye agregado de sesion solo con metricas agregadas', () => {
    const levels = [
      buildTangramLevelAggregate(1, { completed: true, coveragePercent: 100, movesUsed: 4, timeMs: 55000, initialLatencyMs: 2000 }),
      buildTangramLevelAggregate(2, { completed: false, coveragePercent: 62, movesUsed: 3, timeMs: 45000 }),
    ];
    const sess = buildTangramSessionAggregate(levels);
    expect(sess.levelsAttempted).toBe(2);
    expect(sess.completedLevels).toBe(1);
    expect(sess.solvedLevels).toBe(1);
    expect(sess.totalMoves).toBe(7);
    expect(sess.avgCoveragePercent).toBe(81);
  });

  it('sanitiza payload eliminando campos prohibidos y no-allowlist', () => {
    const clean = sanitizeTangramPayload({
      aggregateSchemaVersion: 1, exp_id: TANGRAM_EXP_ID, completed: true, coveragePercent: 50,
      pointerSamples: [1, 2, 3], rawPointerPath: 'x', fullRoute: 'A', eventLog: 'drop', raw_positions: 'x',
    });
    expect(clean.pointerSamples).toBeUndefined();
    expect(clean.rawPointerPath).toBeUndefined();
    expect(clean.fullRoute).toBeUndefined();
    expect(clean.raw_positions).toBeUndefined();
    expect(clean.coveragePercent).toBe(50);
  });

  it('los campos prohibidos estan protegidos por sanitiser', () => {
    expect(FORBIDDEN_TANGRAM_FIELDS).toContain('rawPointerPath');
    expect(FORBIDDEN_TANGRAM_FIELDS).toContain('raw_positions');
  });
});

describe('tangramTelemetry — staircase', () => {
  it('no ajusta en niveles bajos', () => {
    expect(computeTangramStaircase({ level: 1 })).toEqual({ adjust: 'none' });
  });

  it('con planificacion optima en nivel 2, ajusta tiempo en nivel 3', () => {
    expect(computeTangramStaircase({ level: 2, completed: true, move_overhead_count: 0 })).toEqual({ adjust: 'time_15pct' });
  });

  it('si agota >80% de movimientos en nivel 2, introduce formas complejas', () => {
    expect(computeTangramStaircase({ level: 2, completed: false, movesUsed: 3, moveLimit: 3 })).toEqual({ adjust: 'complex_shapes' });
  });

  it('sin condiciones especiales no ajusta', () => {
    expect(computeTangramStaircase({ level: 3, completed: true, move_overhead_count: 1 })).toEqual({ adjust: 'none' });
  });
});