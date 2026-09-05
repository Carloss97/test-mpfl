import { describe, expect, it } from 'vitest';
import {
  BATTERY_MODE_OPTIONS,
  DEMO_BATTERY_CONFIG,
  UNIFIED_BATTERY_CONFIG,
  getBatteryBlockByGameId,
  getBatteryConfigByMode,
  getBatteryModeLabel,
  listBatteryConfigs,
  listBatteryGameIds,
} from './batteryConfig.js';

describe('demo battery configuration', () => {
  it('defines a short demo battery with the same game order as the standardized battery', () => {
    expect(DEMO_BATTERY_CONFIG).toMatchObject({
      id: 'krumm_unified_battery_demo_v1',
      mode: 'demo',
      label: 'KRUMM — Demo rápida',
    });
    expect(DEMO_BATTERY_CONFIG.baselineDurationMs).toBeLessThan(UNIFIED_BATTERY_CONFIG.baselineDurationMs);
    expect(DEMO_BATTERY_CONFIG.recoveryDurationMs).toBeLessThan(UNIFIED_BATTERY_CONFIG.recoveryDurationMs);
    expect(DEMO_BATTERY_CONFIG.restDurationMs).toBeLessThan(UNIFIED_BATTERY_CONFIG.restDurationMs);
    expect(listBatteryGameIds(DEMO_BATTERY_CONFIG)).toEqual(listBatteryGameIds(UNIFIED_BATTERY_CONFIG));
  });

  it('keeps demo trials and durations below the standardized configuration', () => {
    for (const demoBlock of DEMO_BATTERY_CONFIG.blocks) {
      const standardBlock = getBatteryBlockByGameId(demoBlock.gameId, UNIFIED_BATTERY_CONFIG);
      expect(standardBlock).toBeTruthy();
      if (Number.isFinite(demoBlock.trialCount)) {
        expect(demoBlock.trialCount).toBeGreaterThan(0);
        expect(demoBlock.trialCount).toBeLessThanOrEqual(standardBlock.trialCount);
      }
      if (Number.isFinite(demoBlock.durationMs)) {
        expect(demoBlock.durationMs).toBeGreaterThan(0);
        expect(demoBlock.durationMs).toBeLessThanOrEqual(standardBlock.durationMs ?? 6000);
      }
    }
  });

  it('exposes selectable battery modes for the UI', () => {
    expect(BATTERY_MODE_OPTIONS).toEqual([
      { id: 'demo', label: 'Demo rápida', configId: 'krumm_unified_battery_demo_v1' },
      { id: 'standardized', label: 'Evaluación estándar', configId: 'krumm_unified_battery_v1' },
    ]);
    expect(listBatteryConfigs().map((config) => config.mode)).toEqual(['demo', 'standardized']);
    expect(getBatteryConfigByMode('demo')).toBe(DEMO_BATTERY_CONFIG);
    expect(getBatteryConfigByMode('standardized')).toBe(UNIFIED_BATTERY_CONFIG);
    expect(getBatteryModeLabel(DEMO_BATTERY_CONFIG)).toBe('Demo rápida');
    expect(getBatteryModeLabel(UNIFIED_BATTERY_CONFIG)).toBe('Evaluación estándar');
  });
});
