import { buildOriginalGamePostulationBlocks } from './originalGameBlueprints.js';

// Base URL de la API backend (DynamoDB + Lambda). Se fija en build-time vía
// VITE_KRUMM_API_BASE. null/'' = modo local sin backend (demo determinista).
export const KRUMM_API_BASE = (typeof import.meta !== 'undefined'
  && import.meta.env?.VITE_KRUMM_API_BASE) || null;

export const POSTULATION_DEMO_BATTERY_MODES = Object.freeze({
  STABLE_DG: 'stable_dg',
  ORIGINAL_GAMES: 'original_games',
});

export const POSTULATION_DEMO_BATTERY_IDS = Object.freeze({
  stable_dg: 'krumm_postulation_demo_stable_dg_v1',
  original_games: 'krumm_postulation_demo_original_games_v1',
});

export const POSTULATION_DEMO_DEFAULT_BATTERY_MODE = POSTULATION_DEMO_BATTERY_MODES.STABLE_DG;

export const POSTULATION_DEMO_BATTERY_STABLE_DG = Object.freeze([
  Object.freeze({
    gameId: 'simple_rt',
    label: 'Calentamiento de reacción',
    shortLabel: 'Warmup',
    skill: 'processing_speed',
    phase: 'postulation_demo',
    durationLabel: '30 s',
    trialCount: 4,
    visible: false,
    description: 'Ensayo breve para ajustar ritmo de respuesta antes de las tareas principales.',
  }),
  Object.freeze({
    gameId: 'precision_targeting',
    label: 'Ruta de precisión adaptativa',
    shortLabel: 'Precisión',
    skill: 'visuomotor_precision',
    phase: 'postulation_demo',
    durationLabel: '1 min',
    trialCount: 4,
    visible: true,
    description: 'Toca inicio, sigue el corredor ideal y alcanza blancos activos de tamaño/distancia variable sin guardar rutas crudas.',
  }),
  Object.freeze({
    gameId: 'go_nogo',
    label: 'Control inhibitorio',
    shortLabel: 'Go/No-Go',
    skill: 'inhibitory_control',
    phase: 'postulation_demo',
    durationLabel: '1 min',
    trialCount: 8,
    visible: true,
    description: 'Responde a señales GO e inhibe respuestas ante señales NO-GO.',
  }),
  Object.freeze({
    gameId: 'color_interference',
    label: 'Interferencia cognitiva',
    shortLabel: 'Stroop',
    skill: 'interference_control',
    phase: 'postulation_demo',
    durationLabel: '1 min',
    trialCount: 8,
    visible: true,
    description: 'Selecciona el color real de la palabra y gestiona conflicto atencional.',
  }),
  Object.freeze({
    gameId: 'visual_search',
    label: 'Búsqueda visual',
    shortLabel: 'Búsqueda',
    skill: 'visual_search_efficiency',
    phase: 'postulation_demo',
    durationLabel: '1 min',
    trialCount: 4,
    visible: true,
    description: 'Encuentra un objetivo entre distractores con foco y eficiencia.',
  }),
]);

export const POSTULATION_DEMO_BATTERY_ORIGINAL_GAMES = Object.freeze(
  buildOriginalGamePostulationBlocks().map((block) => Object.freeze({
    gameId: block.gameId,
    label: block.label,
    shortLabel: block.shortLabel,
    skill: block.skill,
    phase: block.phase,
    durationLabel: block.durationLabel,
    trialCount: block.trialCount,
    description: block.description,
    visible: true,
    activationStatus: 'controlled_active',
  })),
);

// Backwards-compatible alias. R-5 keeps DG as the default until R-7 decides otherwise.
export const POSTULATION_DEMO_BATTERY = POSTULATION_DEMO_BATTERY_STABLE_DG;

export function normalizePostulationDemoBatteryMode(mode) {
  const normalized = String(mode ?? '').trim().toLowerCase();
  if (['original', 'original_games', 'original-games'].includes(normalized)) {
    return POSTULATION_DEMO_BATTERY_MODES.ORIGINAL_GAMES;
  }
  return POSTULATION_DEMO_BATTERY_MODES.STABLE_DG;
}

export function resolvePostulationDemoBatteryMode(search = globalThis.location?.search ?? '') {
  const normalizedSearch = String(search ?? '');
  const params = new URLSearchParams(normalizedSearch.startsWith('?') ? normalizedSearch : `?${normalizedSearch}`);
  return normalizePostulationDemoBatteryMode(params.get('battery'));
}

export function getPostulationDemoBattery(mode = POSTULATION_DEMO_DEFAULT_BATTERY_MODE) {
  return normalizePostulationDemoBatteryMode(mode) === POSTULATION_DEMO_BATTERY_MODES.ORIGINAL_GAMES
    ? POSTULATION_DEMO_BATTERY_ORIGINAL_GAMES
    : POSTULATION_DEMO_BATTERY_STABLE_DG;
}

export function getPostulationDemoBatteryId(mode = POSTULATION_DEMO_DEFAULT_BATTERY_MODE) {
  return POSTULATION_DEMO_BATTERY_IDS[normalizePostulationDemoBatteryMode(mode)];
}

export function listVisiblePostulationBlocks(blocks = POSTULATION_DEMO_BATTERY) {
  return blocks.filter((block) => block.visible !== false);
}

export function getPostulationDemoBlock(gameId, blocks = POSTULATION_DEMO_BATTERY) {
  return blocks.find((block) => block.gameId === gameId) ?? null;
}
