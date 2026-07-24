const CONSTRUCTS = Object.freeze([
  ['decisionMaking', 'Toma de decisiones', 'Decision making'],
  ['problemSolving', 'Resolución de problemas', 'Problem solving'],
  ['riskFeedbackProfile', 'Riesgo y feedback', 'Risk and feedback'],
  ['planning', 'Planificación', 'Planning'],
  ['adaptability', 'Adaptabilidad', 'Adaptability'],
  ['analyticalThinking', 'Pensamiento analítico', 'Analytical thinking'],
  ['leadership', 'Liderazgo', 'Leadership'],
  ['communication', 'Comunicación', 'Communication'],
]);

const FORBIDDEN_KEYS = new Set([
  'name',
  'email',
  'phone',
  'video',
  'frames',
  'imageData',
  'screenshot',
  'landmarks',
  'keypoints',
  'pointerSamples',
  'rawPointerPath',
  'fullRoute',
  'routeTrace',
  'visitedCells',
  'choiceSequence',
  'freeText',
  'typedResponse',
  'rawGameEvents',
]);

function clampScore(value) {
  if (value == null) return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.round(Math.max(0, Math.min(100, numeric)));
}

function buildConstructs(scores = [], confidence = 0.55) {
  return Object.freeze(CONSTRUCTS.map(([id, label, labelEn], index) => Object.freeze({
    id,
    label,
    labelEn,
    score: clampScore(scores[index]),
    confidence: Number((index < 4 ? Math.min(0.6, confidence + 0.05) : confidence).toFixed(2)),
  })));
}

function freezeGames(games) {
  return Object.freeze(games.map((game) => Object.freeze({ ...game })));
}

function candidate({
  id,
  alias,
  role,
  completedAt,
  status,
  completedGames,
  sessionQuality,
  scores,
  summary,
  prompts,
  caveats,
  games,
}) {
  return Object.freeze({
    id,
    alias,
    role,
    completedAt,
    status,
    completion: Object.freeze({ completed: completedGames, total: 4 }),
    sessionQuality,
    constructs: buildConstructs(scores, status === 'needs_review' ? 0.55 : 0.55),
    summary,
    interviewPrompts: Object.freeze([...prompts]),
    caveats: Object.freeze([...caveats]),
    games: freezeGames(games),
    privacy: Object.freeze({ synthetic: true, aggregateOnly: true, directIdentifiersStored: false }),
  });
}

export const HR_DASHBOARD_CANDIDATES = Object.freeze([
  candidate({
    id: 'profile-042',
    alias: 'Perfil 042',
    role: 'Analista de Operaciones', roleEn: 'Operations Analyst',
    completedAt: '2026-07-21T15:42:00.000Z',
    status: 'ready',
    completedGames: 4,
    sessionQuality: 0.91,
    scores: [86, 92, 71, 94, 82, 90, 78, 84],
    summary: 'Señales de juego consistentes en planificación, análisis de restricciones y comunicación estructurada.',
    prompts: [
      'Pedir un ejemplo real de priorización con recursos limitados.',
      'Contrastar cómo comunica cambios de prioridad a personas no técnicas.',
    ],
    caveats: ['Scores provisionales de demo; contrastar con entrevista y evidencia laboral.'],
    games: [
      { id: 'laser', label: 'Puzzle láser', labelEn: 'Laser puzzle', metric: '3/3 mapas', value: 93 },
      { id: 'balloon', label: 'Riesgo y feedback', labelEn: 'Risk and feedback', metric: '8/8 rondas', value: 72 },
      { id: 'routes', label: 'Rutas', labelEn: 'Routes', metric: '5/5 entregas', value: 95 },
      { id: 'team', label: 'Operación Faro', labelEn: 'Faro Operation', metric: '4/4 escenarios', value: 83 },
    ],
  }),
  candidate({
    id: 'profile-017',
    alias: 'Perfil 017',
    role: 'Coordinación de Proyectos', roleEn: 'Project Coordination',
    completedAt: '2026-07-21T14:18:00.000Z',
    status: 'ready',
    completedGames: 4,
    sessionQuality: 0.86,
    scores: [88, 81, 76, 85, 91, 79, 92, 89],
    summary: 'El brief estructurado aporta evidencia útil de adaptación, coordinación de roles y comunicación de cambios.',
    prompts: [
      'Explorar una situación donde tuvo que redistribuir responsabilidades.',
      'Pedir cómo verificó que el equipo comprendiera un cambio de alcance.',
    ],
    caveats: ['Liderazgo observado en escenarios estructurados, no en interacción grupal real.'],
    games: [
      { id: 'laser', label: 'Puzzle láser', metric: '3/3 mapas', value: 82 },
      { id: 'balloon', label: 'Riesgo y feedback', metric: '8/8 rondas', value: 78 },
      { id: 'routes', label: 'Rutas', metric: '5/5 entregas', value: 86 },
      { id: 'team', label: 'Operación Faro', metric: '4/4 escenarios', value: 91 },
    ],
  }),
  candidate({
    id: 'profile-063',
    alias: 'Perfil 063',
    role: 'Analista de Operaciones', roleEn: 'Operations Analyst',
    completedAt: '2026-07-21T12:06:00.000Z',
    status: 'needs_review',
    completedGames: 4,
    sessionQuality: 0.68,
    scores: [74, 87, 64, 88, 69, 85, 72, 75],
    summary: 'La tarea de rutas fue completada; conviene revisar caveats de captura antes de profundizar la interpretación.',
    prompts: [
      'Contrastar el proceso de planificación utilizado en la tarea de rutas.',
      'Verificar condiciones de dispositivo o interrupciones durante la sesión.',
    ],
    caveats: ['Calidad de sesión moderada.', 'Interpretar tiempos solo como contexto, no como norma de velocidad.'],
    games: [
      { id: 'laser', label: 'Puzzle láser', metric: '3/3 mapas', value: 88 },
      { id: 'balloon', label: 'Riesgo y feedback', metric: '8/8 rondas', value: 66 },
      { id: 'routes', label: 'Rutas', metric: '5/5 entregas', value: 90 },
      { id: 'team', label: 'Operación Faro', metric: '4/4 escenarios', value: 73 },
    ],
  }),
  candidate({
    id: 'profile-028',
    alias: 'Perfil 028',
    role: 'Product Operations',
    completedAt: '2026-07-20T18:34:00.000Z',
    status: 'ready',
    completedGames: 4,
    sessionQuality: 0.88,
    scores: [91, 89, 80, 87, 86, 91, 83, 90],
    summary: 'Cobertura equilibrada en decisión estructurada, análisis y comunicación; requiere contraste con experiencia del rol.',
    prompts: [
      'Profundizar en decisiones tomadas con información incompleta.',
      'Solicitar un ejemplo de coordinación entre operaciones y producto.',
    ],
    caveats: ['No usar los scores como ranking ni criterio de corte.'],
    games: [
      { id: 'laser', label: 'Puzzle láser', metric: '3/3 mapas', value: 91 },
      { id: 'balloon', label: 'Riesgo y feedback', metric: '8/8 rondas', value: 81 },
      { id: 'routes', label: 'Rutas', metric: '5/5 entregas', value: 88 },
      { id: 'team', label: 'Operación Faro', metric: '4/4 escenarios', value: 89 },
    ],
  }),
  candidate({
    id: 'profile-075',
    alias: 'Perfil 075',
    role: 'Coordinación de Proyectos', roleEn: 'Project Coordination',
    completedAt: '2026-07-21T16:05:00.000Z',
    status: 'in_progress',
    completedGames: 2,
    sessionQuality: 0.79,
    scores: [78, 82, 70, 80, null, null, null, null],
    summary: 'Evaluación en progreso. El perfil se completará cuando estén disponibles los cuatro bloques agregados.',
    prompts: ['Esperar la finalización antes de iniciar una revisión de constructos.'],
    caveats: ['Cobertura parcial: 2 de 4 juegos completados.'],
    games: [
      { id: 'laser', label: 'Puzzle láser', metric: '3/3 mapas', value: 84 },
      { id: 'balloon', label: 'Riesgo y feedback', metric: '8/8 rondas', value: 71 },
      { id: 'routes', label: 'Rutas', metric: 'Pendiente', value: null },
      { id: 'team', label: 'Operación Faro', metric: 'Pendiente', value: null },
    ],
  }),
]);

export const HR_DASHBOARD_STATUS = Object.freeze({
  ready: Object.freeze({ label: 'Listo para revisión', labelEn: 'Ready for review', tone: 'ready' }),
  needs_review: Object.freeze({ label: 'Revisar caveats', labelEn: 'Review caveats', tone: 'review' }),
  in_progress: Object.freeze({ label: 'En progreso', labelEn: 'In progress', tone: 'progress' }),
});

export function getHrDashboardRoles(candidates = HR_DASHBOARD_CANDIDATES) {
  return [...new Set(candidates.map((item) => item.role).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
}

export function filterHrDashboardCandidates(candidates = HR_DASHBOARD_CANDIDATES, filters = {}) {
  const query = String(filters.query ?? '').trim().toLocaleLowerCase('es');
  const status = String(filters.status ?? 'all');
  const role = String(filters.role ?? 'all');
  return [...candidates]
    .filter((item) => !query || `${item.alias} ${item.role}`.toLocaleLowerCase('es').includes(query))
    .filter((item) => status === 'all' || item.status === status)
    .filter((item) => role === 'all' || item.role === role)
    .sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt)));
}

export function buildHrDashboardSummary(candidates = HR_DASHBOARD_CANDIDATES) {
  const total = candidates.length;
  const completed = candidates.filter((item) => item.status !== 'in_progress').length;
  const ready = candidates.filter((item) => item.status === 'ready').length;
  const needsReview = candidates.filter((item) => item.status === 'needs_review').length;
  const coverage = candidates.map((item) => item.completion.completed / Math.max(1, item.completion.total));
  const averageCoverage = total > 0 ? coverage.reduce((sum, value) => sum + value, 0) / total : 0;
  return { total, completed, ready, needsReview, averageCoverage };
}

export function validateHrDashboardDataPrivacy(value) {
  const violations = [];
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      if (FORBIDDEN_KEYS.has(key)) violations.push(key);
      visit(child);
    }
  };
  visit(value);
  return { ok: violations.length === 0, violations: [...new Set(violations)] };
}
