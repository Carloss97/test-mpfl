// controlRoomFeedback.js — EXP-COMM-001 (Sala de Control) · C6: feedback aggregate-only
// por sub-dimensión para el reporte.
//
// Especificación (ley): docs/spec/EXP-COMM-001/ Doc 1 §12.2 (7 dimensiones, sin score
// global hasta estructura factorial), §17/§17.1 (plan de validación psicométrica, 7
// fases), §14.3 (privacidad), §18 (riesgo "score compuesto prematuro"). Doc 2 §2
// (neutralidad evaluativa: el feedback describe consecuencias, no enseña la clave),
// §16 (feedback), §20.1 (error evaluativo como consecuencia narrativa).
//
// Patrón: bombFeedback.js (EXP-BOMB-001). Consume SOLO campos escalares del agregado
// control_room_block_summary_v1 (buildControlRoomBlockSummary); no exporta eventos crudos,
// acciones, tarjetas, bloques, texto libre ni biometría. Lectura descriptiva: 7
// sub-dimensiones por separado, SIN score compuesto ni baremos (spec §12.2).
//
// Semántica de señal ausente (R-6): dimensión null = NO observada → se omite, NUNCA 0
// (guard explícito contra Number(null) === 0).

const CONTROL_ROOM_FEEDBACK_FORBIDDEN_KEYS = Object.freeze([
  'rawPointerPath',
  'pointerSamples',
  'rawGameEvents',
  'eventLog',
  'eventCounts',
  'trials',
  'scenarios',
  'actions',
  'messageText',
  'cardTexts',
  'blockTexts',
  'npcMessages',
  'rawTexts',
  'freeText',
  'typedResponse',
  'frames',
  'facePoints',
]);

function finite(value) {
  // R-6: null/undefined = señal ausente, nunca 0 (Number(null) === 0).
  if (value == null) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}
function nonNegativeInteger(value) {
  const numeric = finite(value);
  if (numeric == null || numeric < 0) return null;
  return Math.round(numeric);
}
function percentBand(value) {
  const n = finite(value);
  if (n == null) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}
function hasForbiddenKeys(value) {
  if (!value || typeof value !== 'object') return false;
  return CONTROL_ROOM_FEEDBACK_FORBIDDEN_KEYS.some((key) => Object.hasOwn(value, key));
}

function unavailable(reason) {
  return {
    gameId: 'control_room',
    moduleId: 'control-room.applied-communication-explanation',
    status: 'not_available',
    feedbackCategory: reason,
    candidateHint: 'No hay datos agregados suficientes para explicar la coordinación comunicativa.',
    candidateHintEn: 'There is not enough aggregate data to explain the communication coordination.',
    reviewerCaveat: 'Módulo experimental en validación (EXP-COMM-001 spec §17): lectura descriptiva sin baremos ni score compuesto (spec §12.2); no revela la respuesta correcta (Doc 2 §2/§20.1).',
    reviewerCaveatEn: 'Experimental module under validation (EXP-COMM-001 spec §17): descriptive reading without norms or composite score (spec §12.2); does not reveal the correct answer (Doc 2 §2/§20.1).',
    nextDesignProbe: 'Completar una sesión evaluada de la Sala de Control para obtener las 7 sub-dimensiones agregadas.',
    nextDesignProbeEn: 'Complete an evaluated Control Room session to obtain the 7 aggregated sub-dimensions.',
    dimensionFeedback: [],
    diagnostics: {},
    privacy: { aggregateOnly: false, rawEventsUsed: false, rawBiometricsStored: false },
  };
}

const REVIEWER_CAVEAT = Object.freeze({
  es: 'Módulo experimental en validación (EXP-COMM-001 spec §17): 7 sub-dimensiones descriptivas por separado, SIN score compuesto ni baremos (pesos §12.2 no fijados hasta piloto psicométrico §17.1); el feedback no revela qué respuesta era correcta (Doc 2 §2/§20.1).',
  en: 'Experimental module under validation (EXP-COMM-001 spec §17): 7 descriptive sub-dimensions separately, NO composite score or norms (§12.2 weights unfixed until the psychometric pilot, §17.1); feedback does not reveal the correct answer (Doc 2 §2/§20.1).',
});
const NEXT_DESIGN_PROBE = Object.freeze({
  es: 'Ejecutar las fases de validación psicométrica (EXP-COMM-001 spec §17.1): validez de contenido, entrevistas cognitivas, piloto técnico, piloto psicométrico, evidencia convergente, criterial y equidad — antes de definir cualquier score compuesto (spec §12.2/§18).',
  en: 'Run the psychometric validation phases (EXP-COMM-001 spec §17.1): content validity, cognitive interviews, technical pilot, psychometric pilot, convergent, criterion and fairness evidence — before defining any composite score (spec §12.2/§18).',
});

// 7 sub-dimensiones §12.2: etiqueta + "¿por qué aparece esta señal?" (descriptivo).
const DIMENSION_META = Object.freeze([
  {
    key: 'clarity', label: 'Claridad', labelEn: 'Clarity',
    whyEs: 'Señal de claridad: instrucciones con referencia específica y no ambigua. Aparece cuando hay acciones observadas en la dimensión claridad a lo largo de los bloques de coordinación.',
    whyEn: 'Clarity signal: specific, unambiguous instructions. Appears when actions in the clarity dimension are observed across coordination blocks.',
  },
  {
    key: 'relevance_and_synthesis', label: 'Relevancia/síntesis', labelEn: 'Relevance/synthesis',
    whyEs: 'Separación de información crítica vs distractores (bloque 2). Aparece cuando se observó selección/omisión de datos del estado del sistema.',
    whyEn: 'Separating critical information from distractors (block 2). Appears when data selection/omission of system state was observed.',
  },
  {
    key: 'inquiry', label: 'Indagación', labelEn: 'Inquiry',
    whyEs: 'Preguntar antes de asumir cuando falta un dato crítico (bloques 3 y 6). Aparece cuando hubo solicitudes de información observadas.',
    whyEn: 'Asking before assuming when a critical data point is missing (blocks 3 and 6). Appears when information requests were observed.',
  },
  {
    key: 'verification_closed_loop', label: 'Verificación en bucle cerrado', labelEn: 'Closed-loop verification',
    whyEs: 'Confirmar que la instrucción fue entendida o ejecutada. Aparece cuando hubo solicitudes de confirmación observadas.',
    whyEn: 'Confirming the instruction was understood or executed. Appears when confirmation requests were observed.',
  },
  {
    key: 'adaptation', label: 'Adaptación', labelEn: 'Adaptation',
    whyEs: 'Ajustar nivel de detalle y registro al receptor (bloque 5: supervisor vs operador). Aparece cuando se observó comunicación adaptada al rol.',
    whyEn: 'Adjusting detail level and register to the recipient (block 5: supervisor vs operator). Appears when role-adapted communication was observed.',
  },
  {
    key: 'repair', label: 'Reparación', labelEn: 'Repair',
    whyEs: 'Corregir el malentendido controlado (bloque 4) sin perder el objetivo. Aparece cuando se observó corrección tras ambigüedad.',
    whyEn: 'Correcting the controlled misunderstanding (block 4) without losing the goal. Appears when correction after ambiguity was observed.',
  },
  {
    key: 'receptive_understanding', label: 'Comprensión receptiva', labelEn: 'Receptive understanding',
    whyEs: 'Comprensión del mensaje del receptor (NPC). Aparece como señal descriptiva de la interacción; no se revela qué era correcto.',
    whyEn: 'Understanding the recipient\'s (NPC) message. Appears as a descriptive interaction signal; the correct answer is not revealed.',
  },
]);

export function buildControlRoomFeedback(aggregate = {}) {
  if (!aggregate || typeof aggregate !== 'object' || aggregate.aggregateOnly !== true || hasForbiddenKeys(aggregate)) {
    return unavailable('invalid_or_non_aggregate');
  }
  const scenarioCount = nonNegativeInteger(aggregate.scenarioCount);
  const scoredCount = nonNegativeInteger(aggregate.scoredCount ?? 0);
  const resolvedCount = nonNegativeInteger(aggregate.resolvedCount ?? 0);
  const totalMessages = nonNegativeInteger(aggregate.total_message_count ?? 0);
  if (scenarioCount == null || scenarioCount === 0) return unavailable('incomplete_session');

  // 7 sub-dimensiones por separado (spec §12.2): score 0-100 o null (no observado).
  const dimensionFeedback = [];
  for (const meta of DIMENSION_META) {
    const score = percentBand(aggregate[meta.key]);
    if (score == null) continue;
    dimensionFeedback.push({
      dimension: meta.key,
      label: meta.label,
      labelEn: meta.labelEn,
      score,
      whyEs: meta.whyEs,
      whyEn: meta.whyEn,
    });
  }

  let feedbackCategory;
  let candidateHint;
  let candidateHintEn;
  if (scoredCount === 0) {
    feedbackCategory = 'incomplete_session';
    candidateHint = 'La sesión no produjo escenarios puntuados; no hay evidencia para una lectura de coordinación comunicativa.';
    candidateHintEn = 'The session produced no scored scenarios; there is no evidence for a communication-coordination reading.';
  } else if (resolvedCount >= Math.max(1, Math.ceil(scoredCount * 0.75))) {
    feedbackCategory = 'coordination_effective';
    candidateHint = 'Coordinaste la mayoría de los incidentes comunicando con claridad y cerrando el bucle; las 7 sub-dimensiones se muestran por separado como lectura descriptiva.';
    candidateHintEn = 'You coordinated most incidents by communicating clearly and closing the loop; the 7 sub-dimensions are shown separately as a descriptive reading.';
  } else if (resolvedCount >= 1) {
    feedbackCategory = 'partial_coordination';
    candidateHint = 'Resolviste parte de los incidentes de coordinación; el patrón por sub-dimensión (claridad, indagación, verificación, etc.) se revisa como dato descriptivo pendiente de validación.';
    candidateHintEn = 'You resolved some coordination incidents; the per-sub-dimension pattern (clarity, inquiry, verification, etc.) is reviewed as descriptive data pending validation.';
  } else {
    feedbackCategory = 'coordination_review';
    candidateHint = 'No se cerraron incidentes de coordinación; el origen (lectura de datos, timing, claridad) requiere revisión humana. No es una norma de desempeño comunicativo.';
    candidateHintEn = 'No coordination incidents were closed; the origin (data reading, timing, clarity) requires human review. It is not a communication performance norm.';
  }

  return {
    gameId: 'control_room',
    moduleId: 'control-room.applied-communication-explanation',
    status: 'available',
    feedbackCategory,
    candidateHint,
    candidateHintEn,
    reviewerCaveat: REVIEWER_CAVEAT.es,
    reviewerCaveatEn: REVIEWER_CAVEAT.en,
    nextDesignProbe: NEXT_DESIGN_PROBE.es,
    nextDesignProbeEn: NEXT_DESIGN_PROBE.en,
    dimensionFeedback,
    diagnostics: { scenarioCount, scoredCount, resolvedCount, totalMessages },
    privacy: { aggregateOnly: true, rawEventsUsed: false, rawBiometricsStored: false },
  };
}
