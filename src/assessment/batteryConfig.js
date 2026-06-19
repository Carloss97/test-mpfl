export const UNIFIED_BATTERY_CONFIG = Object.freeze({
  id: 'krumm_unified_battery_v1',
  label: 'KRUMM — Batería gamificada unificada',
  mode: 'standardized',
  baselineDurationMs: 30000,
  restDurationMs: 5000,
  recoveryDurationMs: 15000,
  blocks: Object.freeze([
    Object.freeze({ gameId: 'simple_rt', label: 'RT Simple', trialCount: 10, skill: 'processing_speed' }),
    Object.freeze({ gameId: 'precision_targeting', label: 'Precisión visomotora', trialCount: 8, skill: 'visuomotor_precision' }),
    Object.freeze({ gameId: 'pursuit_tracking', label: 'Seguimiento continuo', trialCount: 4, skill: 'continuous_motor_control' }),
    Object.freeze({ gameId: 'go_nogo', label: 'Go/No-Go', trialCount: 24, skill: 'inhibitory_control' }),
    Object.freeze({ gameId: 'color_interference', label: 'Interferencia color-palabra', trialCount: 24, skill: 'interference_control' }),
    Object.freeze({ gameId: 'visual_search', label: 'Búsqueda visual', trialCount: 12, skill: 'visual_search_efficiency' }),
  ]),
});

export function listBatteryGameIds(config = UNIFIED_BATTERY_CONFIG) {
  return (config.blocks ?? []).map((block) => block.gameId);
}

export function getBatteryBlockByGameId(gameId, config = UNIFIED_BATTERY_CONFIG) {
  return (config.blocks ?? []).find((block) => block.gameId === gameId) ?? null;
}
