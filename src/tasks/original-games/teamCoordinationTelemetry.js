const TEAM_COORDINATION_ALLOWED_RESPONSE_FIELDS = Object.freeze([
  'aggregateSchemaVersion',
  'score',
  'completed',
  'scenarioCount',
  'completedScenarioCount',
  'leadershipScore',
  'communicationScore',
  'adaptabilityScore',
  'decisionQualityScore',
  'alignmentScore',
  'roleClarityScore',
  'feedbackUseScore',
  'changeResponseScore',
  'timeMs',
  'aggregateOnly',
]);

const FORBIDDEN_TEAM_COORDINATION_KEYS = Object.freeze([
  'freeText',
  'typedResponse',
  'messageText',
  'optionText',
  'scenarioText',
  'selectedOptionId',
  'selectedOptionLabel',
  'choiceSequence',
  'rawChoices',
  'rawGameEvents',
  'pointerSamples',
  'clickTrace',
  'DOMEvent',
  'domEvent',
]);

function round(value, digits = 4) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  const factor = 10 ** digits;
  return Math.round(numeric * factor) / factor;
}

function clamp01(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(1, numeric));
}

function mean(values, fallback = 0) {
  const numeric = values.map(Number).filter(Number.isFinite);
  if (!numeric.length) return fallback;
  return numeric.reduce((sum, value) => sum + value, 0) / numeric.length;
}

function scoreBundle(values = {}) {
  return Object.freeze({
    leadership: clamp01(values.leadership),
    communication: clamp01(values.communication),
    adaptability: clamp01(values.adaptability),
    decision: clamp01(values.decision),
    alignment: clamp01(values.alignment),
    roleClarity: clamp01(values.roleClarity),
    feedbackUse: clamp01(values.feedbackUse),
    changeResponse: clamp01(values.changeResponse),
  });
}

export function buildTeamCoordinationScenarios() {
  return [
    Object.freeze({
      id: 'team-brief-1-alignment',
      title: 'Inicio de turno: tres frentes abiertos',
      prompt: 'El equipo tiene presión de tiempo, una persona nueva y dos tareas críticas. Elige cómo abrirías el brief.',
      measuredConstructs: Object.freeze(['liderazgo', 'comunicación', 'decisión']),
      options: Object.freeze([
        Object.freeze({
          id: 'align_roles_checkpoint',
          label: 'Alinear objetivo, asignar roles y fijar checkpoint de 10 minutos.',
          category: 'alignment_and_roles',
          why: 'Define norte, responsabilidades y un control temprano sin microgestionar.',
          scores: scoreBundle({ leadership: 0.88, communication: 0.84, adaptability: 0.58, decision: 0.82, alignment: 0.92, roleClarity: 0.9, feedbackUse: 0.52, changeResponse: 0.55 }),
        }),
        Object.freeze({
          id: 'solve_alone',
          label: 'Resolver personalmente lo urgente y pedir al equipo que espere instrucciones.',
          category: 'centralized_execution',
          why: 'Reduce ambigüedad, pero limita coordinación y autonomía del equipo.',
          scores: scoreBundle({ leadership: 0.38, communication: 0.34, adaptability: 0.36, decision: 0.52, alignment: 0.4, roleClarity: 0.28, feedbackUse: 0.3, changeResponse: 0.3 }),
        }),
        Object.freeze({
          id: 'ask_more_context',
          label: 'Pedir más contexto antes de decidir y posponer la asignación.',
          category: 'information_gathering',
          why: 'Puede ser prudente, pero retrasa coordinación cuando ya hay señales suficientes.',
          scores: scoreBundle({ leadership: 0.56, communication: 0.66, adaptability: 0.55, decision: 0.58, alignment: 0.58, roleClarity: 0.42, feedbackUse: 0.46, changeResponse: 0.48 }),
        }),
      ]),
    }),
    Object.freeze({
      id: 'team-brief-2-communication',
      title: 'Mensaje al equipo: cambio de prioridad',
      prompt: 'Aparece una prioridad nueva y hay que comunicarla sin perder confianza. ¿Qué mensaje eliges?',
      measuredConstructs: Object.freeze(['comunicación', 'adaptabilidad', 'decisión']),
      options: Object.freeze([
        Object.freeze({
          id: 'explain_change_next_steps',
          label: 'Explicar el motivo del cambio, qué se pausa y cuál es el siguiente paso concreto.',
          category: 'transparent_change_message',
          why: 'Reduce incertidumbre y convierte el cambio en instrucciones accionables.',
          scores: scoreBundle({ leadership: 0.76, communication: 0.92, adaptability: 0.84, decision: 0.82, alignment: 0.86, roleClarity: 0.78, feedbackUse: 0.62, changeResponse: 0.88 }),
        }),
        Object.freeze({
          id: 'announce_only',
          label: 'Anunciar que cambió la prioridad y pedir que todos avancen rápido.',
          category: 'directive_without_context',
          why: 'Es rápido, pero deja ambigüedad sobre razones, pausas y responsabilidades.',
          scores: scoreBundle({ leadership: 0.52, communication: 0.42, adaptability: 0.55, decision: 0.56, alignment: 0.48, roleClarity: 0.4, feedbackUse: 0.34, changeResponse: 0.56 }),
        }),
        Object.freeze({
          id: 'keep_original_plan',
          label: 'Mantener el plan original para evitar confundir al equipo.',
          category: 'rigid_plan',
          why: 'Protege estabilidad, pero no responde a una restricción nueva relevante.',
          scores: scoreBundle({ leadership: 0.42, communication: 0.56, adaptability: 0.24, decision: 0.38, alignment: 0.52, roleClarity: 0.58, feedbackUse: 0.3, changeResponse: 0.18 }),
        }),
      ]),
    }),
    Object.freeze({
      id: 'team-brief-3-feedback',
      title: 'Feedback del equipo: la tarea quedó poco clara',
      prompt: 'Dos personas indican que las instrucciones no se entendieron igual. Elige la reacción más útil.',
      measuredConstructs: Object.freeze(['comunicación', 'liderazgo', 'feedback']),
      options: Object.freeze([
        Object.freeze({
          id: 'acknowledge_reframe_check',
          label: 'Reconocer la ambigüedad, reformular en dos pasos y pedir confirmación breve.',
          category: 'feedback_integrated_clarification',
          why: 'Integra feedback, corrige el mensaje y verifica entendimiento sin culpar.',
          scores: scoreBundle({ leadership: 0.84, communication: 0.9, adaptability: 0.76, decision: 0.78, alignment: 0.86, roleClarity: 0.88, feedbackUse: 0.94, changeResponse: 0.74 }),
        }),
        Object.freeze({
          id: 'repeat_same_message',
          label: 'Repetir la instrucción original con más énfasis.',
          category: 'repeat_without_diagnosis',
          why: 'Puede sonar claro para quien lidera, pero no resuelve la fuente de ambigüedad.',
          scores: scoreBundle({ leadership: 0.44, communication: 0.4, adaptability: 0.34, decision: 0.44, alignment: 0.42, roleClarity: 0.38, feedbackUse: 0.2, changeResponse: 0.32 }),
        }),
        Object.freeze({
          id: 'delegate_clarification',
          label: 'Pedir a otra persona que explique al resto para ahorrar tiempo.',
          category: 'delegated_clarification',
          why: 'Puede ayudar, pero evita que quien coordina cierre la brecha de comunicación.',
          scores: scoreBundle({ leadership: 0.58, communication: 0.6, adaptability: 0.52, decision: 0.55, alignment: 0.54, roleClarity: 0.52, feedbackUse: 0.5, changeResponse: 0.5 }),
        }),
      ]),
    }),
    Object.freeze({
      id: 'team-brief-4-adaptation',
      title: 'Imprevisto final: falta un recurso clave',
      prompt: 'A mitad del trabajo falta un recurso. Hay que adaptar el plan sin perder el objetivo.',
      measuredConstructs: Object.freeze(['adaptabilidad', 'liderazgo', 'decisión']),
      options: Object.freeze([
        Object.freeze({
          id: 'reprioritize_and_reassign',
          label: 'Repriorizar el objetivo mínimo, reasignar roles y dejar explícito qué se descarta.',
          category: 'adaptive_reprioritization',
          why: 'Hace visible el trade-off, conserva foco y actualiza responsabilidades.',
          scores: scoreBundle({ leadership: 0.9, communication: 0.82, adaptability: 0.94, decision: 0.88, alignment: 0.88, roleClarity: 0.86, feedbackUse: 0.7, changeResponse: 0.95 }),
        }),
        Object.freeze({
          id: 'wait_for_resource',
          label: 'Esperar el recurso para no cambiar el estándar de entrega.',
          category: 'wait_for_original_conditions',
          why: 'Preserva calidad esperada, pero no adapta la operación al imprevisto.',
          scores: scoreBundle({ leadership: 0.48, communication: 0.52, adaptability: 0.22, decision: 0.42, alignment: 0.5, roleClarity: 0.44, feedbackUse: 0.34, changeResponse: 0.2 }),
        }),
        Object.freeze({
          id: 'ask_everyone_to_improvise',
          label: 'Pedir que cada persona improvise una alternativa y reportar al final.',
          category: 'unstructured_adaptation',
          why: 'Genera movimiento, pero deja alto riesgo de esfuerzos divergentes.',
          scores: scoreBundle({ leadership: 0.5, communication: 0.44, adaptability: 0.58, decision: 0.48, alignment: 0.36, roleClarity: 0.28, feedbackUse: 0.4, changeResponse: 0.56 }),
        }),
      ]),
    }),
  ];
}

function hasForbiddenKeys(value) {
  if (!value || typeof value !== 'object') return false;
  const stack = [value];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || typeof node !== 'object') continue;
    for (const [key, child] of Object.entries(node)) {
      if (FORBIDDEN_TEAM_COORDINATION_KEYS.includes(key)) return true;
      if (child && typeof child === 'object') stack.push(child);
    }
  }
  return false;
}

export function buildTeamCoordinationResponseAggregate({
  completed = false,
  scenarioCount = 1,
  responses = [],
  timeMs = 0,
} = {}) {
  const safeScenarioCount = Math.max(1, Math.round(Number(scenarioCount) || 1));
  const safeResponses = (Array.isArray(responses) ? responses : [])
    .map((response) => response?.scores ?? response)
    .filter((scores) => scores && typeof scores === 'object' && !hasForbiddenKeys(scores));
  const completedScenarioCount = Math.min(safeScenarioCount, safeResponses.length);
  const leadershipScore = mean(safeResponses.map((scores) => clamp01(scores.leadership)));
  const communicationScore = mean(safeResponses.map((scores) => clamp01(scores.communication)));
  const adaptabilityScore = mean(safeResponses.map((scores) => clamp01(scores.adaptability)));
  const decisionQualityScore = mean(safeResponses.map((scores) => clamp01(scores.decision)));
  const alignmentScore = mean(safeResponses.map((scores) => clamp01(scores.alignment)));
  const roleClarityScore = mean(safeResponses.map((scores) => clamp01(scores.roleClarity)));
  const feedbackUseScore = mean(safeResponses.map((scores) => clamp01(scores.feedbackUse)));
  const changeResponseScore = mean(safeResponses.map((scores) => clamp01(scores.changeResponse)));
  const score = mean([leadershipScore, communicationScore, adaptabilityScore, decisionQualityScore]);
  return {
    aggregateSchemaVersion: 'team_coordination_aggregate_v1',
    score: round(score),
    completed: Boolean(completed) && completedScenarioCount >= safeScenarioCount,
    scenarioCount: safeScenarioCount,
    completedScenarioCount,
    leadershipScore: round(leadershipScore),
    communicationScore: round(communicationScore),
    adaptabilityScore: round(adaptabilityScore),
    decisionQualityScore: round(decisionQualityScore),
    alignmentScore: round(alignmentScore),
    roleClarityScore: round(roleClarityScore),
    feedbackUseScore: round(feedbackUseScore),
    changeResponseScore: round(changeResponseScore),
    timeMs: Math.max(0, Math.round(Number(timeMs) || 0)),
    aggregateOnly: true,
  };
}

function sanitizeTeamCoordinationAggregateFields(teamCoordination = {}) {
  const allowed = new Set(TEAM_COORDINATION_ALLOWED_RESPONSE_FIELDS);
  return Object.fromEntries(
    Object.entries(teamCoordination).filter(([key, value]) => (
      allowed.has(key)
      && (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string')
    )),
  );
}

export function sanitizeTeamCoordinationResponsePayload(response = {}) {
  const sanitized = {
    correct: response.correct === true,
    outcome: typeof response.outcome === 'string' ? response.outcome : 'structured_choice',
    reactionTimeMs: Math.max(0, Math.round(Number(response.reactionTimeMs) || 0)),
    score: round(response.score),
  };
  if (typeof response.choiceCategory === 'string') sanitized.choiceCategory = response.choiceCategory;
  const teamCoordination = sanitizeTeamCoordinationAggregateFields(response.teamCoordination ?? {});
  if (Object.keys(teamCoordination).length) sanitized.teamCoordination = teamCoordination;
  return sanitized;
}

export function validateTeamCoordinationAggregatePrivacy(value = {}) {
  const violations = [];
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      if (FORBIDDEN_TEAM_COORDINATION_KEYS.includes(key)) violations.push(key);
      visit(child);
    }
  };
  visit(value);
  const unique = [...new Set(violations)];
  return { ok: unique.length === 0, violations: unique };
}
