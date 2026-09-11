// controlRoomTaxonomy.js — EXP-COMM-001 · C1: taxonomía canónica (intents, veredictos,
// clases de error, diccionario de eventos §11/§13, métricas §12.1, dimensiones §12.2).
//
// Fuente de verdad: Doc 1 Especificación Técnica v1.1 FINAL (ley):
//   §9 acciones comunicativas, §11 telemetría (18 eventos), §12.1 métricas (11),
//   §12.2 dimensions (7), §13 error handling + taxonomía de errores, §13.1 eventos críticos.
//
// Este módulo es la FUENTE ÚNICA de los nombres/códigos. Motor, rules, telemetría,
// feature vector y report los importan de aquí; ningún otro sitio los redefine.

/** §9 Sistema de acciones comunicativas (intención interna de cada tarjeta). */
export const COMM_INTENTS = Object.freeze({
  ASK: 'ASK',
  INFORM: 'INFORM',
  INSTRUCT: 'INSTRUCT',
  CONDITION: 'CONDITION',
  VERIFY: 'VERIFY',
  CORRECT: 'CORRECT',
  ESCALATE: 'ESCALATE',
});

/** Veredictos del validador semántico (§8): calidad de la acción del usuario. */
export const COMM_VERDICTS = Object.freeze({
  OPTIMAL: 'optimal',
  ACCEPTABLE: 'acceptable',
});

/** §13 Taxonomía de errores. `code` canónico; `meaning` descriptivo (report/docs). */
export const COMM_ERROR_CLASSES = Object.freeze({
  AMBIGUOUS_REF: Object.freeze({
    code: 'AMBIGUOUS_REF',
    meaning: 'Referencia ambigua que generó o podía generar un malentendido',
  }),
  MISSING_INFORMATION: Object.freeze({
    code: 'MISSING_INFORMATION',
    meaning: 'Asumió un dato crítico que no estaba disponible (debió preguntar)',
  }),
  IRRELEVANT_DETAIL: Object.freeze({
    code: 'IRRELEVANT_DETAIL',
    meaning: 'Incluyó distractores innecesarios en la comunicación',
  }),
  PREMATURE_ACTION: Object.freeze({
    code: 'PREMATURE_ACTION',
    meaning: 'Instruyó antes de reunir la información necesaria',
  }),
  UNCONFIRMED_ACTION: Object.freeze({
    code: 'UNCONFIRMED_ACTION',
    meaning: 'No cerró el loop de verificación (closed loop)',
  }),
  MISMATCH_REGISTER: Object.freeze({
    code: 'MISMATCH_REGISTER',
    meaning: 'Registro/detalle no adaptado al rol del receptor',
  }),
  UNRECOVERED_MISUNDERSTANDING: Object.freeze({
    code: 'UNRECOVERED_MISUNDERSTANDING',
    meaning: 'No reparó el malentendido tras la señal del NPC',
  }),
  TECHNICAL_ABORT: Object.freeze({
    code: 'TECHNICAL_ABORT',
    meaning: 'Evento sin nodo válido / fallo técnico (sin score, §13.1)',
  }),
});

/** Códigos de error (solo los strings, para lookup rápido). */
export const COMM_ERROR_CODES = Object.freeze([
  'AMBIGUOUS_REF',
  'MISSING_INFORMATION',
  'IRRELEVANT_DETAIL',
  'PREMATURE_ACTION',
  'UNCONFIRMED_ACTION',
  'MISMATCH_REGISTER',
  'UNRECOVERED_MISUNDERSTANDING',
  'TECHNICAL_ABORT',
]);

/**
 * §11 Telemetría — diccionario canónico de eventos (18). Fuente única: el whitelist de la
 * UI y los verificados del payload se derivan de aquí. `t_ms` relativo al inicio del
 * escenario; `scenario_id` (y `block`/`step`) en todos los críticos (§13.1).
 */
export const COMM_EVENT_NAMES = Object.freeze(new Set([
  'SCENARIO_START',
  'INFO_CARD_TAP',
  'INFO_PANEL_SCROLL',
  'NPC_MSG_SHOWN',
  'CARD_SELECTED',
  'CARD_DESELECTED',
  'BLOCK_ADDED',
  'BLOCK_REORDERED',
  'BLOCK_REMOVED',
  'MESSAGE_SEND',
  'MESSAGE_EDIT_AFTER_SEND',
  'NPC_REPLY_SHOWN',
  'VERIFICATION_SENT',
  'VERIFICATION_RECEIVED',
  'CONSEQUENCE_SHOWN',
  'TIMEOUT_TRIGGERED',
  'RESUME_SESSION',
  'VISIBILITY_CHANGE',
]));

/**
 * §13.1 Eventos críticos: "Cada evento crítico incluye t_ms, scenario_id, y el nodo NPC o
 * step afectado". Son los que delimitan el flujo conversacional / integridad.
 */
export const COMM_CRITICAL_EVENTS = Object.freeze(new Set([
  'NPC_MSG_SHOWN',
  'MESSAGE_SEND',
  'NPC_REPLY_SHOWN',
  'VERIFICATION_SENT',
  'TIMEOUT_TRIGGERED',
  'RESUME_SESSION',
]));

/**
 * §12.1 Métricas derivadas (11) — claves del bloque summary / payload §19.
 * Unidades: *_ms = ms; *_count = entero; *_requested/*_given = boolean/ratio.
 */
export const COMM_METRIC_KEYS = Object.freeze([
  'first_decision_latency_ms',
  'average_decision_latency_ms',
  'time_spent_reading_ms',
  'pre_send_edit_count',
  'pre_send_reorder_count',
  'total_message_count',
  'question_count',
  'verification_count',
  'confirmation_requested',
  'confirmation_given',
  'timeout_count',
]);

/**
 * §12.2 Dimensions (7). Puntaje 0-100 (ratio de acciones exitosas en esa dimensión).
 * NO hay score global. `construct` = constructo del report C6 (10°).
 */
export const COMM_DIMENSIONS = Object.freeze([
  Object.freeze({ key: 'clarity', label: { es: 'Claridad', en: 'Clarity' }, construct: 'appliedCommunication' }),
  Object.freeze({ key: 'relevance_and_synthesis', label: { es: 'Relevancia y síntesis', en: 'Relevance and synthesis' }, construct: 'appliedCommunication' }),
  Object.freeze({ key: 'inquiry', label: { es: 'Indagación', en: 'Inquiry' }, construct: 'appliedCommunication' }),
  Object.freeze({ key: 'verification_closed_loop', label: { es: 'Verificación y cierre de loop', en: 'Verification and closed loop' }, construct: 'appliedCommunication' }),
  Object.freeze({ key: 'adaptation', label: { es: 'Adaptación al receptor', en: 'Adaptation to the receiver' }, construct: 'appliedCommunication' }),
  Object.freeze({ key: 'repair', label: { es: 'Reparación de malentendidos', en: 'Misunderstanding repair' }, construct: 'appliedCommunication' }),
  Object.freeze({ key: 'receptive_understanding', label: { es: 'Comprensión receptiva', en: 'Receptive understanding' }, construct: 'appliedCommunication' }),
]);

export const COMM_DIMENSION_KEYS = Object.freeze(COMM_DIMENSIONS.map((d) => d.key));

/** Constructo (10° del report, C6) — provisorio, descriptive_only, sin composite (spec §12.2). */
export const COMM_CONSTRUCT_KEY = 'appliedCommunication';

/** Códigos de integrity flags (§14.2) que puede levantar este módulo de eventos. */
export const COMM_INTEGRITY_FLAGS = Object.freeze(new Set([
  'event_schema_violation',
  'duplicate_message_send',
  'edit_after_send_ignored',
  'npc_reply_without_send',
  'unknown_step_transition',
  'clock_drift',
  'timeout_no_score',
  'no_message_sent',
]));
