import { describe, expect, it } from 'vitest';
import {
  buildPassengerRouteDemoLevels,
  getPassengerRouteBoardMetrics,
  solvePassengerRouteLevel,
} from './passengerRouteTelemetry.js';

const RECONSTRUCTIVE_RESULT_FIELDS = /fullRoute|routeTrace|visitedCells|stepByStepPath|path/i;

describe('passenger route demo level solvability', () => {
  it('defines a compact progressive passenger/destination sequence with operational constraints', () => {
    const levels = buildPassengerRouteDemoLevels();

    expect(levels).toHaveLength(3);
    expect(levels.map((level) => level.name)).toEqual([
      'Barrio Luz: entrega guiada',
      'Mercado de los Puentes',
      'Operación Terminal Norte',
    ]);
    expect(levels.every((level) => level.passengers.length >= 1)).toBe(true);
    expect(levels.every((level) => level.passengers.every((passenger) => passenger.destination))).toBe(true);
    expect(levels.some((level) => level.stations.length >= 1)).toBe(true);
    expect(levels.every((level) => level.routeBudget > 0)).toBe(true);
  });

  it('solves every authored level with weighted movement and physically reachable recharges', () => {
    const results = buildPassengerRouteDemoLevels().map((level) => solvePassengerRouteLevel(level));

    for (const result of results) {
      expect(result.solvable).toBe(true);
      expect(result.minimumCost).toBeGreaterThan(0);
      expect(result.minimumMoves).toBeGreaterThan(0);
      expect(JSON.stringify(result)).not.toMatch(RECONSTRUCTIVE_RESULT_FIELDS);
    }
    expect(results.map((result) => result.minimumMoves)).toEqual([7, 13, 16]);
    expect(results.map((result) => result.minimumStationUses)).toEqual([0, 0, 1]);
    expect(results.map((result) => result.remainingBudget)).toEqual([4, 5, 4]);
    expect(results[1].remainingBudget).toBeGreaterThanOrEqual(4);
    expect(results[2].minimumStationUses).toBe(1);
  });

  it('rejects a passenger level blocked by walls instead of returning a false positive', () => {
    const impossible = {
      id: 'blocked-passenger-route',
      cols: 3,
      rows: 3,
      routeBudget: 8,
      start: { x: 1, y: 1 },
      walls: ['0,1', '2,1', '1,0', '1,2'],
      stations: [],
      passengers: [
        { id: 'A', x: 0, y: 0, destination: { x: 2, y: 2 } },
      ],
    };

    expect(solvePassengerRouteLevel(impossible)).toEqual({
      solvable: false,
      minimumCost: null,
      minimumMoves: null,
      minimumStationUses: null,
    });
  });

  it('fits every route board inside the compact postulation viewport without board scroll', () => {
    const viewport = { width: 606, height: 338 };

    for (const level of buildPassengerRouteDemoLevels()) {
      const metrics = getPassengerRouteBoardMetrics(level, viewport);
      expect(metrics.boardWidth).toBeLessThanOrEqual(viewport.width);
      expect(metrics.boardHeight).toBeLessThanOrEqual(viewport.height);
      expect(metrics.cellSize).toBeGreaterThanOrEqual(24);
      expect(metrics.compact).toBe(true);
    }
  });
});
