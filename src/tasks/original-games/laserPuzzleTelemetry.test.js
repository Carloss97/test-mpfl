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

describe('laser puzzle postulation telemetry helpers', () => {
  it('builds compact demo levels with an unsolved start and authored solution', () => {
    const levels = buildLaserDemoLevels();
    expect(levels).toHaveLength(3);
    expect(levels.map((level) => level.name)).toEqual([
      'Calibración orbital',
      'Corredor de meteoritos',
      'Red dual de comunicaciones',
    ]);
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
    }
  });

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
