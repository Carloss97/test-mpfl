import { describe, expect, it } from 'vitest';
import {
  POSTULATION_DEMO_BATTERY,
  POSTULATION_DEMO_BATTERY_IDS,
  POSTULATION_DEMO_BATTERY_MODES,
  POSTULATION_DEMO_BATTERY_ORIGINAL_GAMES,
  POSTULATION_DEMO_BATTERY_STABLE_DG,
  POSTULATION_DEMO_DEFAULT_BATTERY_MODE,
  getPostulationDemoBattery,
  getPostulationDemoBatteryId,
  getPostulationDemoBlock,
  listVisiblePostulationBlocks,
  resolvePostulationDemoBatteryMode,
} from './postulationDemoConfig.js';

describe('postulation demo config', () => {
  it('defines a short candidate-facing game sequence with stable test-mpfl game ids', () => {
    expect(POSTULATION_DEMO_BATTERY.length).toBeGreaterThanOrEqual(4);
    expect(POSTULATION_DEMO_BATTERY.map((block) => block.gameId)).toEqual([
      'simple_rt',
      'precision_targeting',
      'go_nogo',
      'color_interference',
      'visual_search',
    ]);
    expect(POSTULATION_DEMO_BATTERY.every((block) => block.phase === 'postulation_demo')).toBe(true);
    expect(POSTULATION_DEMO_BATTERY.every((block) => block.durationLabel)).toBe(true);
  });

  it('exposes visible progress blocks and lookup helpers', () => {
    expect(listVisiblePostulationBlocks().map((block) => block.gameId)).toEqual([
      'precision_targeting',
      'go_nogo',
      'color_interference',
      'visual_search',
    ]);
    expect(getPostulationDemoBlock('go_nogo')).toMatchObject({ label: 'Control inhibitorio' });
    expect(getPostulationDemoBlock('missing')).toBeNull();
  });

  it('keeps stable DG as the explicit default and backwards-compatible battery alias', () => {
    expect(POSTULATION_DEMO_DEFAULT_BATTERY_MODE).toBe(POSTULATION_DEMO_BATTERY_MODES.STABLE_DG);
    expect(POSTULATION_DEMO_BATTERY).toBe(POSTULATION_DEMO_BATTERY_STABLE_DG);
    expect(getPostulationDemoBattery()).toBe(POSTULATION_DEMO_BATTERY_STABLE_DG);
    expect(listVisiblePostulationBlocks(getPostulationDemoBattery()).map((block) => block.gameId)).toEqual([
      'precision_targeting',
      'go_nogo',
      'color_interference',
      'visual_search',
    ]);
  });

  it('exposes the original games as a separate controlled battery without mutating blueprints', () => {
    expect(POSTULATION_DEMO_BATTERY_ORIGINAL_GAMES.map((block) => block.gameId)).toEqual([
      'laser_puzzle',
      'balloon_risk',
      'passenger_routes',
    ]);
    expect(POSTULATION_DEMO_BATTERY_ORIGINAL_GAMES.every((block) => block.visible === true)).toBe(true);
    expect(POSTULATION_DEMO_BATTERY_ORIGINAL_GAMES.every((block) => !Object.hasOwn(block, 'sourceGame'))).toBe(true);
    expect(getPostulationDemoBattery(POSTULATION_DEMO_BATTERY_MODES.ORIGINAL_GAMES)).toBe(POSTULATION_DEMO_BATTERY_ORIGINAL_GAMES);
    expect(getPostulationDemoBatteryId(POSTULATION_DEMO_BATTERY_MODES.ORIGINAL_GAMES)).toBe(POSTULATION_DEMO_BATTERY_IDS.original_games);
    expect(POSTULATION_DEMO_BATTERY_IDS.original_games).not.toBe(POSTULATION_DEMO_BATTERY_IDS.stable_dg);
  });

  it('resolves explicit query aliases and safely falls back to stable DG', () => {
    expect(resolvePostulationDemoBatteryMode('?battery=original')).toBe(POSTULATION_DEMO_BATTERY_MODES.ORIGINAL_GAMES);
    expect(resolvePostulationDemoBatteryMode('?fixture=1&battery=original_games')).toBe(POSTULATION_DEMO_BATTERY_MODES.ORIGINAL_GAMES);
    expect(resolvePostulationDemoBatteryMode('?battery=stable')).toBe(POSTULATION_DEMO_BATTERY_MODES.STABLE_DG);
    expect(resolvePostulationDemoBatteryMode('?battery=unknown')).toBe(POSTULATION_DEMO_BATTERY_MODES.STABLE_DG);
    expect(resolvePostulationDemoBatteryMode('')).toBe(POSTULATION_DEMO_BATTERY_MODES.STABLE_DG);
  });
});
