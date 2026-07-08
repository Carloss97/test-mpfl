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

export const DEMO_BATTERY_CONFIG = Object.freeze({
  id: 'krumm_unified_battery_demo_v1',
  label: 'KRUMM — Demo rápida',
  mode: 'demo',
  baselineDurationMs: 8000,
  restDurationMs: 1500,
  recoveryDurationMs: 5000,
  blocks: Object.freeze([
    Object.freeze({ gameId: 'simple_rt', label: 'RT Simple', trialCount: 4, skill: 'processing_speed' }),
    Object.freeze({ gameId: 'precision_targeting', label: 'Precisión visomotora', trialCount: 4, skill: 'visuomotor_precision' }),
    Object.freeze({ gameId: 'pursuit_tracking', label: 'Seguimiento continuo', durationMs: 4000, skill: 'continuous_motor_control' }),
    Object.freeze({ gameId: 'go_nogo', label: 'Go/No-Go', trialCount: 8, skill: 'inhibitory_control' }),
    Object.freeze({ gameId: 'color_interference', label: 'Interferencia color-palabra', trialCount: 8, skill: 'interference_control' }),
    Object.freeze({ gameId: 'visual_search', label: 'Búsqueda visual', trialCount: 4, skill: 'visual_search_efficiency' }),
  ]),
});

export const BATTERY_MODE_OPTIONS = Object.freeze([
  Object.freeze({ id: 'demo', label: 'Demo rápida', configId: DEMO_BATTERY_CONFIG.id }),
  Object.freeze({ id: 'standardized', label: 'Evaluación estándar', configId: UNIFIED_BATTERY_CONFIG.id }),
]);

const BATTERY_CONFIGS = Object.freeze([DEMO_BATTERY_CONFIG, UNIFIED_BATTERY_CONFIG]);

export function listBatteryConfigs() {
  return [...BATTERY_CONFIGS];
}

export function getBatteryModeLabel(config = UNIFIED_BATTERY_CONFIG) {
  return BATTERY_MODE_OPTIONS.find((option) => option.id === config?.mode)?.label ?? config?.label ?? 'Evaluación';
}

export function getBatteryConfigByMode(mode = 'standardized') {
  return BATTERY_CONFIGS.find((config) => config.mode === mode) ?? UNIFIED_BATTERY_CONFIG;
}

export function getBatteryConfigById(configId = UNIFIED_BATTERY_CONFIG.id) {
  return BATTERY_CONFIGS.find((config) => config.id === configId) ?? UNIFIED_BATTERY_CONFIG;
}

export function listBatteryGameIds(config = UNIFIED_BATTERY_CONFIG) {
  return (config.blocks ?? []).map((block) => block.gameId);
}

export function getBatteryBlockByGameId(gameId, config = UNIFIED_BATTERY_CONFIG) {
  return (config.blocks ?? []).find((block) => block.gameId === gameId) ?? null;
}
