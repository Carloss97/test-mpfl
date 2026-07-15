import { describe, expect, it } from 'vitest';
import {
  buildPassengerRouteResponseAggregate,
  sanitizePassengerRouteAggregate,
  sanitizePassengerRouteResponsePayload,
} from './passengerRouteTelemetry.js';

const FORBIDDEN_ROUTE_FIELDS = /fullRoute|routeTrace|visitedCells|stepByStepPath|rawPointerPath|pointerSamples|rawGameEvents/i;

describe('passenger route privacy-safe telemetry helpers', () => {
  it('builds a normalized aggregate-only route summary', () => {
    const aggregate = buildPassengerRouteResponseAggregate({
      completed: true,
      passengersDelivered: 2,
      destinationCount: 2,
      actualCost: 18,
      minimumCost: 15,
      replanCount: 1,
      stationUseCount: 1,
      constraintViolationCount: 0,
      satisfactionScore: 91,
      timeMs: 42_300.4,
    });

    expect(aggregate).toMatchObject({
      completed: true,
      passengersDelivered: 2,
      destinationCount: 2,
      routeEfficiency: 0.8333,
      replanCount: 1,
      stationUseCount: 1,
      constraintViolationCount: 0,
      satisfactionScore: 91,
      timeMs: 42300,
      aggregateOnly: true,
    });
    expect(aggregate.score).toBeGreaterThan(0);
    expect(aggregate.score).toBeLessThanOrEqual(100);
    expect(JSON.stringify(aggregate)).not.toMatch(FORBIDDEN_ROUTE_FIELDS);
  });

  it('sanitizes passenger route aggregates with an explicit scalar allowlist', () => {
    const unsafe = {
      score: 84,
      completed: true,
      passengersDelivered: 2,
      destinationCount: 2,
      routeEfficiency: 0.81,
      replanCount: 1,
      stationUseCount: 1,
      constraintViolationCount: 2,
      satisfactionScore: 88,
      timeMs: 31_000,
      aggregateOnly: true,
      fullRoute: ['1,4', '2,4'],
      routeTrace: [{ x: 1, y: 4 }],
      visitedCells: ['1,4'],
      stepByStepPath: ['right'],
      rawPointerPath: [{ x: 10, y: 20 }],
      pointerSamples: [{ t: 1 }],
      rawGameEvents: [{ event: 'move' }],
      nestedMetadata: { route: ['reconstructive'] },
    };

    expect(sanitizePassengerRouteAggregate(unsafe)).toEqual({
      score: 84,
      completed: true,
      passengersDelivered: 2,
      destinationCount: 2,
      routeEfficiency: 0.81,
      replanCount: 1,
      stationUseCount: 1,
      constraintViolationCount: 2,
      satisfactionScore: 88,
      timeMs: 31000,
      aggregateOnly: true,
    });
    expect(unsafe.fullRoute).toEqual(['1,4', '2,4']);
  });

  it('sanitizes response telemetry without leaking reconstructive route data', () => {
    const payload = sanitizePassengerRouteResponsePayload({
      correct: true,
      outcome: 'route_completed',
      reactionTimeMs: 12_345.8,
      score: 87.12345,
      passengerRoutes: {
        completed: true,
        passengersDelivered: 1,
        destinationCount: 1,
        routeEfficiency: 0.9,
        satisfactionScore: 94,
        aggregateOnly: true,
        fullRoute: ['1,4', '2,4'],
        visitedCells: ['1,4'],
        rawGameEvents: [{ event: 'move' }],
      },
    });

    expect(payload).toEqual({
      correct: true,
      outcome: 'route_completed',
      reactionTimeMs: 12346,
      score: 87.1235,
      passengerRoutes: {
        completed: true,
        passengersDelivered: 1,
        destinationCount: 1,
        routeEfficiency: 0.9,
        satisfactionScore: 94,
        aggregateOnly: true,
      },
    });
    expect(JSON.stringify(payload)).not.toMatch(FORBIDDEN_ROUTE_FIELDS);
  });
});
