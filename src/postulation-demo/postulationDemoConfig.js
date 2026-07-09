export const POSTULATION_DEMO_BATTERY = Object.freeze([
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
    label: 'Precisión visomotora',
    shortLabel: 'Precisión',
    skill: 'visuomotor_precision',
    phase: 'postulation_demo',
    durationLabel: '1 min',
    trialCount: 4,
    visible: true,
    description: 'Toca objetivos de distinto tamaño y distancia priorizando precisión y control.',
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

export function listVisiblePostulationBlocks(blocks = POSTULATION_DEMO_BATTERY) {
  return blocks.filter((block) => block.visible !== false);
}

export function getPostulationDemoBlock(gameId, blocks = POSTULATION_DEMO_BATTERY) {
  return blocks.find((block) => block.gameId === gameId) ?? null;
}
