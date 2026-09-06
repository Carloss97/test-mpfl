import { describe, expect, it } from 'vitest';
import {
  buildLaserDemoLevels,
  buildLaserGrid,
  buildLaserResponseAggregate,
  getLaserBoardMetrics,
  getLaserEfficiency,
  sanitizeLaserResponsePayload,
  traceLaserBeam,
} from './laserPuzzleTelemetry.js';

function compactGrid(grid) {
  return Object.fromEntries(Object.entries(grid).filter(([, cell]) => Boolean(cell)));
}

function movableKeys(grid) {
  return Object.entries(grid).filter(([, cell]) => cell?.movable).map(([key]) => key);
}

function emptyKeys(level, grid) {
  const keys = [];
  for (let y = 0; y < level.rows; y += 1) {
    for (let x = 0; x < level.cols; x += 1) {
      const key = `${x},${y}`;
      if (!grid[key]) keys.push(key);
    }
  }
  return keys;
}

function movedGrid(grid, fromKey, toKey) {
  const next = { ...grid };
  const cell = next[fromKey];
  delete next[fromKey];
  next[toKey] = { ...cell };
  return compactGrid(next);
}

function isSolved(level, grid) {
  const trace = traceLaserBeam(grid, level.cols, level.rows);
  const relayCount = (level.cells ?? []).filter((cell) => cell.type === 'relay').length;
  return trace.litAntennaCount === level.antennaCount && trace.litRelayCount === relayCount;
}

function findMinimumLaserMoves(level, maxDepth = 4) {
  const start = compactGrid(buildLaserGrid(level));
  if (isSolved(level, start)) return 0;
  let frontier = [start];
  const seen = new Set([JSON.stringify(start)]);
  for (let depth = 1; depth <= maxDepth; depth += 1) {
    const nextFrontier = [];
    for (const gridState of frontier) {
      for (const fromKey of movableKeys(gridState)) {
        for (const toKey of emptyKeys(level, gridState)) {
          const grid = movedGrid(gridState, fromKey, toKey);
          const signature = JSON.stringify(grid);
          if (seen.has(signature)) continue;
          if (isSolved(level, grid)) return depth;
          seen.add(signature);
          nextFrontier.push(grid);
        }
      }
    }
    frontier = nextFrontier;
  }
  return null;
}

describe('laser puzzle postulation telemetry helpers', () => {
  it('builds compact demo levels with an unsolved start and authored solution', () => {
    const levels = buildLaserDemoLevels();
    expect(levels).toHaveLength(3);
    expect(levels.map((level) => level.name)).toEqual([
      'Órbita quebrada',
      'Salto cuántico',
      'Nexo gemelo',
    ]);
    expect(levels.map((level) => level.solutionPlacements.length)).toEqual([4, 5, 6]);
    expect(levels.filter((level) => level.cells.some((cell) => String(cell.type).startsWith('portal_')))).toHaveLength(2);
    for (const level of levels) {
      const start = traceLaserBeam(buildLaserGrid(level), level.cols, level.rows);
      expect(start.litAntennaCount).toBeLessThan(level.antennaCount);

      const solvedGrid = buildLaserGrid(level);
      level.solutionPlacements.forEach(([fromKey, toKey]) => {
        const cell = solvedGrid[fromKey];
        delete solvedGrid[fromKey];
        solvedGrid[toKey] = { ...cell };
      });
      const solved = traceLaserBeam(solvedGrid, level.cols, level.rows);
      expect(solved.litAntennaCount).toBe(level.antennaCount);
      expect(solved.litRelayCount).toBe((level.cells ?? []).filter((cell) => cell.type === 'relay').length);

      level.solutionPlacements.forEach((_, omittedIndex) => {
        const partialGrid = buildLaserGrid(level);
        level.solutionPlacements.forEach(([fromKey, toKey], placementIndex) => {
          if (placementIndex === omittedIndex) return;
          const cell = partialGrid[fromKey];
          delete partialGrid[fromKey];
          partialGrid[toKey] = { ...cell };
        });
        expect(isSolved(level, partialGrid)).toBe(false);
      });
    }
  });

  it('does not author throwaway one- or two-move Laser levels after the intro', () => {
    const minimumMoves = buildLaserDemoLevels().map((level) => ({
      name: level.name,
      moves: findMinimumLaserMoves(level, 2),
      authoredMoves: level.solutionPlacements.length,
    }));

    expect(minimumMoves).toEqual([
      { name: 'Órbita quebrada', moves: null, authoredMoves: 4 },
      { name: 'Salto cuántico', moves: null, authoredMoves: 5 },
      { name: 'Nexo gemelo', moves: null, authoredMoves: 6 },
    ]);
    expect(minimumMoves.every((level) => level.moves === null && level.authoredMoves >= 4)).toBe(true);
    // BFS de 3 niveles bajo carga en Raspberry Pi puede exceder el testTimeout
    // global de 30 s; el test es verificación de diseño de niveles, no de runtime.
  }, 180_000);

  it('fits every Laser board inside compact postulation stages', () => {
    const viewport = { width: 606, height: 338 };
    for (const level of buildLaserDemoLevels()) {
      const metrics = getLaserBoardMetrics(level, viewport);
      expect(metrics.boardWidth).toBeLessThanOrEqual(viewport.width);
      expect(metrics.boardHeight).toBeLessThanOrEqual(viewport.height);
      expect(metrics.cellSize).toBeGreaterThanOrEqual(24);
      expect(metrics.compact).toBe(true);
    }
  });

  it('computes efficiency and privacy-safe response aggregate without reconstructive route fields', () => {
    expect(getLaserEfficiency({ moves: 4, par: 4 })).toBe(1);
    expect(getLaserEfficiency({ moves: 8, par: 4 })).toBe(0.5);

    const aggregate = buildLaserResponseAggregate({
      completed: true,
      solvedLevels: 1,
      levelCount: 2,
      moveCount: 5,
      parTotal: 8,
      timeMs: 42000,
      ruleViolationCount: 1,
      hintCount: 0,
      reconfigurationCount: 5,
    });

    expect(aggregate).toMatchObject({
      completed: true,
      solvedLevels: 1,
      levelCount: 2,
      moveCount: 5,
      solutionEfficiency: 1,
      ruleViolationCount: 1,
      aggregateOnly: true,
    });
    expect(JSON.stringify(aggregate)).not.toMatch(/beamCells|fullRoute|pointerSamples|rawGameEvents/i);
  });

  it('sanitizes emitted response payload to aggregate-only fields', () => {
    const payload = sanitizeLaserResponsePayload({
      correct: true,
      outcome: 'level_solved',
      reactionTimeMs: 1200,
      score: 0.88,
      laserPuzzle: {
        solvedLevels: 1,
        moveCount: 4,
        solutionEfficiency: 1,
        rawPointerPath: [{ x: 1, y: 2 }],
        beamCells: ['1,1', '2,1'],
        fullRoute: ['0,0', '1,0'],
      },
    });

    expect(payload).toEqual({
      correct: true,
      outcome: 'level_solved',
      reactionTimeMs: 1200,
      score: 0.88,
      laserPuzzle: {
        solvedLevels: 1,
        moveCount: 4,
        solutionEfficiency: 1,
      },
    });
  });
});
