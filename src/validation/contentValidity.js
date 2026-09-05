// KRUMM R-7B — Content validity gate (self-check + expert-panel instrument).
//
// Purpose: operationalize the R-7B advance condition ("ningún constructo
// puntuado puede tener 'rechazar' en relevancia o contaminación crítica") as a
// deterministic, testable rule over the constructo×tarea×feature matrix.
//
// IMPORTANT — provenance: the rows below labeled origin:'interna_previa' are a
// PROVISIONAL proposal drafted by the autonomous orchestrator from the R-6
// evidence chain (docs/research/...technical-study.md §4.5/§10 and T.4 verdicts).
// They are NOT expert I-O/psychometric validation. R-7B formally requires the
// sign-off of 2+ independent I-O/psychometry/product expert reviewers, who must
// fill the matrix in docs/research/krumm-r7b-content-validity-matrix.md (§5).
// Until that panel ratifies, these ratings do not authorize normative use.

import { WORKBOOK_TALENT_CONSTRUCT_ORDER } from '../assessment/originalGameTalentMapping.js';

export const CONTENT_VALIDITY_SCHEMA = 'krumm_r7b_content_validity_v1';

export const VERDICTS = Object.freeze(['aceptar', 'revisar', 'rechazar']);
export const SEVERITIES = Object.freeze(['baja', 'media', 'alta', 'critica']);
export const CONTAMINATION_LEVELS = Object.freeze(['baja', 'media', 'alta', 'critica']);
export const RELEVANCE_SCALE = Object.freeze([1, 2, 3, 4]); // 4 = muy relevante
export const CLARITY_SCALE = Object.freeze([1, 2, 3, 4]); // 4 = muy claro

// Availability each construct actually receives from the runtime mapping
// (originalGameTalentMapping.js). Only 'provisional_score' constructs are
// "puntuados" and therefore subject to the R-7B advance condition.
export const CONSTRUCT_AVAILABILITY = Object.freeze({
  decisionMaking: 'descriptive_only',
  problemSolving: 'provisional_score',
  riskFeedbackProfile: 'provisional_score',
  planning: 'provisional_score',
  adaptability: 'descriptive_only',
  analyticalThinking: 'provisional_score',
  leadership: 'provisional_score',
  communication: 'provisional_score',
});

const row = (r) =>
  Object.freeze({
    construct: r.construct,
    feature: r.feature,
    task: r.task,
    demanda: r.demanda,
    evidencia: r.evidencia, // directa | adyacente | ambigua | interna
    relevancia: r.relevancia, // 1..4
    claridad: r.claridad, // 1..4
    contaminacion: r.contaminacion, // baja|media|alta|critica
    omisiones: r.omisiones, // adecuada|parcial|amplia
    severidad: r.severidad, // baja|media|alta|critica
    veredicto: r.veredicto, // aceptar|revisar|rechazar
    comentario: r.comentario,
    origin: r.origin ?? 'interna_previa',
  });

// Provisional matrix (orchestrator draft). Expert panel overrides in §5 of the doc.
export const PROVISIONAL_MATRIX = Object.freeze([
  // ── Resolución de problemas (provisional_score) ───────────────────────────
  row({
    construct: 'problemSolving', feature: 'laser.solvedRate', task: 'Laser Puzzle',
    demanda: 'Convertir estados iniciales en meta bajo reglas explícitas de reflectores.',
    evidencia: 'directa', relevancia: 4, claridad: 4, contaminacion: 'media',
    omisiones: 'parcial', severidad: 'baja', veredicto: 'aceptar',
    comentario: 'ECD-backing (Almond 2015; Shute & Ventura 2013). Solo 3 niveles autorados: revisar cobertura normativa fuera de demo.',
  }),
  row({
    construct: 'problemSolving', feature: 'laser.solutionEfficiency', task: 'Laser Puzzle',
    demanda: 'Buscar configuración parsimoniosa respecto del par autorado.',
    evidencia: 'adyacente', relevancia: 4, claridad: 3, contaminacion: 'media',
    omisiones: 'parcial', severidad: 'media', veredicto: 'revisar',
    comentario: 'Depende de la calidad del par (authoring). Requiere validación de niveles con solver/experto.',
  }),
  row({
    construct: 'problemSolving', feature: 'laser.ruleCompliance', task: 'Laser Puzzle',
    demanda: 'Respetar restricciones explícitas del puzzle.',
    evidencia: 'directa', relevancia: 3, claridad: 3, contaminacion: 'media',
    omisiones: 'parcial', severidad: 'media', veredicto: 'revisar',
    comentario: 'Una violación puede reflejar malentendido de instrucciones/UI; usar candidateInstructionCheck antes de interpretar.',
  }),
  row({
    construct: 'problemSolving', feature: 'passenger.deliveryRate', task: 'Passenger Routes',
    demanda: 'Coordinar recogida/entrega bajo presupuesto de energía.',
    evidencia: 'adyacente', relevancia: 4, claridad: 3, contaminacion: 'media',
    omisiones: 'parcial', severidad: 'baja', veredicto: 'aceptar',
    comentario: 'Relación con planificación (Shallice 1982) y consecución de metas; pocos destinos por nivel.',
  }),
  row({
    construct: 'problemSolving', feature: 'passenger.routeEfficiency', task: 'Passenger Routes',
    demanda: 'Minimizar costo de ruta vs. óptimo del solver bajo presupuesto/recargas.',
    evidencia: 'adyacente', relevancia: 4, claridad: 3, contaminacion: 'media',
    omisiones: 'parcial', severidad: 'media', veredicto: 'revisar',
    comentario: 'Depende de solver y level authoring; no es evidencia de logística real.',
  }),

  // ── Planificación (provisional_score) ─────────────────────────────────────
  row({
    construct: 'planning', feature: 'passenger.routeEfficiency', task: 'Passenger Routes',
    demanda: 'Anticipar ruta, presupuesto y destinos bajo restricciones.',
    evidencia: 'adyacente', relevancia: 4, claridad: 3, contaminacion: 'media',
    omisiones: 'parcial', severidad: 'media', veredicto: 'revisar',
    comentario: 'Planificación no rutinaria (Shallice 1982); depende del solver y del nivel autorado.',
  }),
  row({
    construct: 'planning', feature: 'passenger.deliveryRate', task: 'Passenger Routes',
    demanda: 'Consecución de metas de entrega bajo restricciones.',
    evidencia: 'adyacente', relevancia: 4, claridad: 3, contaminacion: 'media',
    omisiones: 'parcial', severidad: 'baja', veredicto: 'aceptar',
    comentario: 'Indicador de bajo alcance de metas; complementario a routeEfficiency.',
  }),
  row({
    construct: 'planning', feature: 'passenger.constraintCompliance', task: 'Passenger Routes',
    demanda: 'Operar dentro de paredes/presupuesto/costos evitando violaciones por intento.',
    evidencia: 'adyacente', relevancia: 3, claridad: 3, contaminacion: 'media',
    omisiones: 'parcial', severidad: 'media', veredicto: 'revisar',
    comentario: 'Miyake 2000: no colapsar EF separables; denominador por intento evita sobreinterpretar conteos brutos.',
  }),

  // ── Pensamiento analítico (provisional_score) ─────────────────────────────
  row({
    construct: 'analyticalThinking', feature: 'laser.solutionEfficiency', task: 'Laser Puzzle',
    demanda: 'Descomposición lógica de reglas/relé/antena hacia solución parsimoniosa.',
    evidencia: 'adyacente', relevancia: 4, claridad: 3, contaminacion: 'media',
    omisiones: 'parcial', severidad: 'media', veredicto: 'revisar',
    comentario: 'Evidencia adyacente de análisis lógico; calidad del par limita la señal.',
  }),
  row({
    construct: 'analyticalThinking', feature: 'passenger.constraintCompliance', task: 'Passenger Routes',
    demanda: 'Respetar restricciones mientras se optimiza ruta.',
    evidencia: 'adyacente', relevancia: 3, claridad: 3, contaminacion: 'media',
    omisiones: 'parcial', severidad: 'media', veredicto: 'revisar',
    comentario: 'Violaciones pueden reflejar comprensión de UI y no solo análisis de reglas.',
  }),
  row({
    construct: 'analyticalThinking', feature: 'passenger.routeEfficiency', task: 'Passenger Routes',
    demanda: 'Estimar costos parciales y trade-offs bajo presupuesto.',
    evidencia: 'adyacente', relevancia: 3, claridad: 3, contaminacion: 'media',
    omisiones: 'parcial', severidad: 'media', veredicto: 'revisar',
    comentario: 'Proximidad a óptimo del solver como señal analítica; depende del authoring.',
  }),

  // ── Asunción de riesgo y feedback (provisional_score, descriptivo) ────────
  row({
    construct: 'riskFeedbackProfile', feature: 'balloon.riskEfficiency', task: 'Balloon Risk',
    demanda: 'Acumular recompensa bajo riesgo de pérdida; decidir cashout.',
    evidencia: 'directa', relevancia: 3, claridad: 3, contaminacion: 'media',
    omisiones: 'parcial', severidad: 'media', veredicto: 'aceptar',
    comentario: 'BART-anker (Lejuez 2002); Pleskac 2008: mezcla decisión y aprendizaje. Solo descriptivo, sin dirección normativa.',
  }),
  row({
    construct: 'riskFeedbackProfile', feature: 'balloon.cashoutRate', task: 'Balloon Risk',
    demanda: 'Asegurar recompensa antes de pérdida.',
    evidencia: 'adyacente', relevancia: 3, claridad: 3, contaminacion: 'media',
    omisiones: 'parcial', severidad: 'media', veredicto: 'revisar',
    comentario: 'Sin valencia normativa sin criterio externo.',
  }),
  row({
    construct: 'riskFeedbackProfile', feature: 'balloon.popRate', task: 'Balloon Risk',
    demanda: 'Exposición a pérdida durante la secuencia.',
    evidencia: 'adyacente', relevancia: 3, claridad: 3, contaminacion: 'media',
    omisiones: 'parcial', severidad: 'media', veredicto: 'revisar',
    comentario: 'Un pop no implica impulsividad ni mal desempeño.',
  }),
  row({
    construct: 'riskFeedbackProfile', feature: 'balloon.averagePumpsNormalized', task: 'Balloon Risk',
    demanda: 'Dosis promedio de riesgo por ronda.',
    evidencia: 'adyacente', relevancia: 3, claridad: 2, contaminacion: 'media',
    omisiones: 'parcial', severidad: 'media', veredicto: 'revisar',
    comentario: 'Cap 12 provisional y no normado; oculta adaptación ronda a ronda.',
  }),
  row({
    construct: 'riskFeedbackProfile', feature: 'balloon.postLossAdjustment', task: 'Balloon Risk',
    demanda: 'Ajuste agregado tras una pérdida observada.',
    evidencia: 'adyacente', relevancia: 2, claridad: 2, contaminacion: 'media',
    omisiones: 'parcial', severidad: 'media', veredicto: 'revisar',
    comentario: 'Solo si count>0; señal ausente = desconocida, nunca desempeño bajo.',
  }),

  // ── Toma de decisiones (descriptive_only — NO es constructo puntuado) ─────
  row({
    construct: 'decisionMaking', feature: 'team.decisionQualityScore', task: 'Team/Faro',
    demanda: 'Hacer trade-offs acotados y accionables en micro-briefs.',
    evidencia: 'adyacente', relevancia: 3, claridad: 3, contaminacion: 'alta',
    omisiones: 'parcial', severidad: 'media', veredicto: 'revisar',
    comentario: 'Evidencia de tarea, no de calidad normativa de decisión. No hay criterio externo; se mantiene descriptivo.',
  }),

  // ── Adaptabilidad (descriptive_only / insufficient) ───────────────────────
  row({
    construct: 'adaptability', feature: 'team.adaptabilityScore', task: 'Team/Faro',
    demanda: 'Responder a cambios de prioridad/recursos/feedback en escenarios controlados.',
    evidencia: 'ambigua', relevancia: 2, claridad: 3, contaminacion: 'alta',
    omisiones: 'amplia', severidad: 'alta', veredicto: 'revisar',
    comentario: 'Sesión única no constituye cambio controlado de regla/entorno (Miyake 2000). Aguardar longitud/controles; no puntuar.',
  }),
  row({
    construct: 'adaptability', feature: 'team.changeResponseScore', task: 'Team/Faro',
    demanda: 'Actualizar prioridades/responsabilidades ante cambios del brief.',
    evidencia: 'ambigua', relevancia: 2, claridad: 2, contaminacion: 'alta',
    omisiones: 'amplia', severidad: 'alta', veredicto: 'revisar',
    comentario: 'Señal de sesión única; mantener contextual, no score de constructo.',
  }),

  // ── Liderazgo (provisional_score — "estructurado") ────────────────────────
  row({
    construct: 'leadership', feature: 'team.leadershipScore', task: 'Team/Faro',
    demanda: 'Clarificar objetivos, roles y trade-offs en micro-situaciones de brief.',
    evidencia: 'ambigua', relevancia: 3, claridad: 3, contaminacion: 'media',
    omisiones: 'parcial', severidad: 'media', veredicto: 'revisar',
    comentario: 'Juicio social estructurado, NO interacción grupal real (Arthur 2003). Etiquetar "Liderazgo (estructurado)" obligatorio.',
  }),
  row({
    construct: 'leadership', feature: 'team.roleClarityScore', task: 'Team/Faro',
    demanda: 'Asignar/clarificar responsabilidades en el flujo simulado.',
    evidencia: 'interna', relevancia: 3, claridad: 2, contaminacion: 'media',
    omisiones: 'parcial', severidad: 'media', veredicto: 'revisar',
    comentario: 'No observa delegación real; contextual sub-componente.',
  }),
  row({
    construct: 'leadership', feature: 'team.alignmentScore', task: 'Team/Faro',
    demanda: 'Alinear objetivo/prioridad/acción en el brief.',
    evidencia: 'interna', relevancia: 3, claridad: 2, contaminacion: 'media',
    omisiones: 'parcial', severidad: 'media', veredicto: 'revisar',
    comentario: 'Feature contextual (laser/alignment fallback); no es evidencia de dirección grupal.',
  }),

  // ── Comunicación (provisional_score — "estructurada") ─────────────────────
  row({
    construct: 'communication', feature: 'team.communicationScore', task: 'Team/Faro',
    demanda: 'Explicar contexto, pasos y bucles de aclaración sin texto libre.',
    evidencia: 'ambigua', relevancia: 3, claridad: 3, contaminacion: 'media',
    omisiones: 'parcial', severidad: 'media', veredicto: 'revisar',
    comentario: 'Thornhill-Miller 2023: comunicación es amplia; opciones cerradas no la cubren. Etiquetar "Comunicación (estructurada)".',
  }),
  row({
    construct: 'communication', feature: 'team.feedbackUseScore', task: 'Team/Faro',
    demanda: 'Integrar feedback del equipo en aclaración/replanificación.',
    evidencia: 'interna', relevancia: 3, claridad: 2, contaminacion: 'media',
    omisiones: 'parcial', severidad: 'media', veredicto: 'revisar',
    comentario: 'Sin texto libre; no mide lenguaje efectivo real.',
  }),
  row({
    construct: 'communication', feature: 'team.alignmentScore', task: 'Team/Faro',
    demanda: 'Explicitar objetivo y siguiente acción en decisiones estructuradas.',
    evidencia: 'interna', relevancia: 3, claridad: 2, contaminacion: 'media',
    omisiones: 'parcial', severidad: 'media', veredicto: 'revisar',
    comentario: 'Reutilizado por varios constructos; claridad de constructo baja, revisar co-uso.',
  }),
]);

// ── R-7B advance condition ──────────────────────────────────────────────────
// "Ningún constructo puntuado puede tener 'rechazar' en relevancia o
// contaminación crítica." Scored constructs = those with CONSTRUCT_AVAILABILITY
// 'provisional_score' (the ones that yield a provisional score in the report).
export function contentValidityGate(matrix = PROVISIONAL_MATRIX) {
  const blocked = [];
  const scored = new Set(
    Object.entries(CONSTRUCT_AVAILABILITY)
      .filter(([, a]) => a === 'provisional_score')
      .map(([c]) => c),
  );
  for (const r of matrix) {
    if (!scored.has(r.construct)) continue; // solo constructos puntuados
    const relevanceRejected = r.veredicto === 'rechazar' || r.relevancia === 1;
    const criticalContamination = r.contaminacion === 'critica';
    if (relevanceRejected || criticalContamination) {
      blocked.push({
        construct: r.construct,
        feature: r.feature,
        reason: relevanceRejected && criticalContamination
          ? 'rechazo de relevancia y contaminación crítica'
          : relevanceRejected
            ? 'rechazo de relevancia'
            : 'contaminación crítica',
      });
    }
  }
  return {
    pass: blocked.length === 0,
    blocked,
    scoredConstructs: [...scored].sort(),
    schema: CONTENT_VALIDITY_SCHEMA,
  };
}

export function validateMatrix(matrix = PROVISIONAL_MATRIX) {
  const errors = [];
  const validConstructs = new Set(WORKBOOK_TALENT_CONSTRUCT_ORDER);
  matrix.forEach((r, i) => {
    const at = `row[${i}] ${r.feature || '(sin feature)'}`;
    if (!validConstructs.has(r.construct)) errors.push(`${at}: constructo desconocido '${r.construct}'`);
    if (!RELEVANCE_SCALE.includes(r.relevancia)) errors.push(`${at}: relevancia inválida ${r.relevancia}`);
    if (!CLARITY_SCALE.includes(r.claridad)) errors.push(`${at}: claridad inválida ${r.claridad}`);
    if (!CONTAMINATION_LEVELS.includes(r.contaminacion)) errors.push(`${at}: contaminación inválida ${r.contaminacion}`);
    if (!SEVERITIES.includes(r.severidad)) errors.push(`${at}: severidad inválida ${r.severidad}`);
    if (!VERDICTS.includes(r.veredicto)) errors.push(`${at}: veredicto inválido ${r.veredicto}`);
  });
  return { valid: errors.length === 0, errors };
}