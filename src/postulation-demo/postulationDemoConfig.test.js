import { describe, expect, it } from 'vitest';
import {
  POSTULATION_DEMO_BATTERY,
  getPostulationDemoBlock,
  listVisiblePostulationBlocks,
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
});
