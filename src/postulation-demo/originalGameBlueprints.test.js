import { describe, expect, it } from 'vitest';
import {
  FORBIDDEN_ORIGINAL_GAME_FIELDS,
  ORIGINAL_GAME_BLUEPRINTS,
  buildOriginalGamePostulationBlocks,
  getOriginalGameBlueprint,
  sanitizeOriginalGameAggregate,
} from './originalGameBlueprints.js';

describe('original game integration blueprints', () => {
  it('declares the original games plus the structured team brief completion probe and the tangram module', () => {
    expect(ORIGINAL_GAME_BLUEPRINTS.map((blueprint) => blueprint.gameId)).toEqual([
      'laser_puzzle',
      'balloon_risk',
      'passenger_routes',
      'team_coordination',
      'tangram_exp001',
    ]);
  });

  it('keeps source paths, target roles, aggregate fields and human-review language explicit', () => {
    for (const blueprint of ORIGINAL_GAME_BLUEPRINTS) {
      expect(blueprint.label).toMatch(/\S/);
      expect(blueprint.source.primary).toMatch(['team_coordination', 'tangram_exp001'].includes(blueprint.gameId) ? /src\/tasks\/original-games/ : /\/Test\/src\//);
      expect(blueprint.postulation.skill).toMatch(/\S/);
      expect(blueprint.postulation.durationLabel).toMatch(/min|s/);
      expect(blueprint.allowedAggregateFields.length).toBeGreaterThanOrEqual(5);
      expect(blueprint.reportDimension).toMatch(/revisión humana/i);
      expect(['planned', 'ported_hidden', 'controlled_active']).toContain(blueprint.activation.status);
    }
  });

  it('exposes a non-visible planned battery without changing the stable DG battery yet', () => {
    expect(buildOriginalGamePostulationBlocks()).toEqual([
      expect.objectContaining({ gameId: 'laser_puzzle', visible: false, phase: 'original_games_replacement', activationStatus: 'ported_hidden' }),
      expect.objectContaining({ gameId: 'balloon_risk', visible: false, phase: 'original_games_replacement', activationStatus: 'ported_hidden' }),
      expect.objectContaining({ gameId: 'passenger_routes', visible: false, phase: 'original_games_replacement', activationStatus: 'ported_hidden' }),
      expect.objectContaining({ gameId: 'team_coordination', visible: false, phase: 'original_games_completion_probe', activationStatus: 'controlled_active' }),
      expect.objectContaining({ gameId: 'tangram_exp001', visible: false, phase: 'original_games_completion_probe', activationStatus: 'controlled_active' }),
    ]);
  });

  it('defines privacy-forbidden fields that must not leave game components', () => {
    expect(FORBIDDEN_ORIGINAL_GAME_FIELDS).toEqual(expect.arrayContaining([
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
      'freeText',
      'typedResponse',
    ]));
  });

  it('sanitizes aggregate payloads to allowed non-reconstructive fields only', () => {
    const aggregate = sanitizeOriginalGameAggregate('passenger_routes', {
      score: 82,
      completed: true,
      passengersDelivered: 5,
      routeEfficiency: 0.74,
      replanCount: 2,
      rawPointerPath: [{ x: 1, y: 2 }],
      pointerSamples: [{ x: 3, y: 4 }],
      rawGameEvents: [{ event: 'move', x: 5, y: 6 }],
      fullRoute: ['a', 'b', 'c'],
      domEvent: { clientX: 9 },
      screenshot: 'data:image/png;base64,abc',
    });

    expect(aggregate).toEqual({
      score: 82,
      completed: true,
      passengersDelivered: 5,
      routeEfficiency: 0.74,
      replanCount: 2,
    });
  });

  it('returns null for unknown blueprints and empty aggregates for unknown games', () => {
    expect(getOriginalGameBlueprint('unknown')).toBeNull();
    expect(sanitizeOriginalGameAggregate('unknown', { score: 99 })).toEqual({});
  });
});
