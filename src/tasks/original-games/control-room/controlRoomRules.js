// controlRoomRules.js — EXP-COMM-001 (Sala de Control / Control Room) · C1: manifest
// versionado + máquina de diálogos deterministas + taxonomía + diccionario de eventos.
//
// Fuente de verdad: docs/spec/EXP-COMM-001/ (Doc 1 Especificación Técnica v1.1 FINAL — "ley";
// Doc 2 Diseño UI/UX y Reglas v1.0.0). Secciones usadas aquí:
//   - §5 manifest control-room-v1.1, §6.3 formas paralelas, §7 máquina de estados,
//     §8 validador semántico, §9 acciones comunicativas, §11 telemetría, §12.3 input gate,
//     §13 error handling + taxonomía de errores, §14.2 flags de integridad.
//   - Doc 2 §9 sistema de acciones, §10 matriz de niveles, §11 biblioteca de escenarios,
//     §12 construcción de mensajes, §13 comportamiento del NPC (determinista), §5 tutorial.
//
// Regla dura: el contenido (escenarios, cartas, diálogos) vive SOLO en este manifest.
// Motor/validador/UI consumen `CONTROL_ROOM_SCENARIOS` + `buildControlRoomLevelSpec`;
// NINGUN otro sitio codifica el texto de un escenario o el árbol de diálogo.
//
// Modelo de diálogo (determinista, sin aleatoriedad del malentendido — Doc 2 §13):
//   Un escenario = secuencia de `steps`. Cada step: el NPC dice algo + presenta cartas de
//   respuesta (o un compositor de bloques). El validador clasifica la acción del usuario
//   contra `verdicts`/`composerVerdicts` y el campo `next` (map clase→stepId|'end') decide
//   el paso siguiente. Todo es determinista: mismo form_id => misma oportunidad (Doc 1 §1.1).
//
// Formas paralelas (§6.3): cada escenario evaluado tiene forma A (base) y B (paralela):
//   misma estructura (hechos, diálogos, aceptación) con detalles superficiales distintos
//   (id de incidente, valores numéricos, nombre del receptor). La forma B se deriva de la A
//   con `deriveParallelForm` para garantizar la invarianza estructural.

import { COMM_INTENTS, COMM_ERROR_CLASSES, COMM_VERDICTS } from './controlRoomTaxonomy.js';

/** Identidad de experiencia y versiones (observabilidad, §15). */
export const CONTROL_ROOM_EXPERIENCE_ID = 'EXP-COMM-001';
export const CONTROL_ROOM_BUILD_VERSION = '1.1.0';
export const CONTROL_ROOM_CONFIG_VERSION = 'control-room-v1.1';
export const CONTROL_ROOM_MANIFEST_VERSION = '1.1.0';

/** Delay de respuesta del NPC (Doc 1 §14.1: "200–400 ms tras el envío"). */
export const CONTROL_ROOM_NPC_REPLY_DELAY_MS = 300;
/** Duración de la consecuencia (Doc 1 §14.1: "1,5–2,5 s o tap para continuar"). */
export const CONTROL_ROOM_CONSEQUENCE_MS = 2000;
/** Transición (Doc 1 §14.1: "0,4–0,8 s"). */
export const CONTROL_ROOM_TRANSITION_MS = 500;

/** Bloques de evaluación 1-6 (Doc 2 §10). */
export const CONTROL_ROOM_BLOCKS = Object.freeze([1, 2, 3, 4, 5, 6]);

/**
 * Budget temporal por bloque (Doc 1 §12.3 + §14.1): SIN countdown visible en bloques 1-5
 * (límite técnico amplio => timeoutMs: null); timer visible solo en bloque 6 (45 s, Doc 2 §14
 * "presión moderada"; Doc 1 §12.3 "Solo B6 en v1, sin penalización").
 */
export const CONTROL_ROOM_TIMEOUT_MS_BY_BLOCK = Object.freeze({
  1: null, 2: null, 3: null, 4: null, 5: null, 6: 45000,
});

// ----------------------------------------------------------------------------
// 11. BLOQUE 1 · CLARIDAD (Doc 2 §11 CR-L1-S01)
//   Dar instrucción con información completa. Referentes similares.
// ----------------------------------------------------------------------------
const BASE_L1 = {
  id: 'CR-L1-S01',
  name: { es: 'Válvula secundaria', en: 'Secondary valve' },
  block: 1,
  practice: false,
  receiver: { role: 'operator', name: { es: 'Operador Rivas', en: 'Operator Rivas' } },
  facts: [
    { key: 'pressure', value: '8.4 bar', critical: true },
    { key: 'valve', value: 'V3 abierta', critical: true },
    { key: 'rule', value: 'Si presión > 8, cerrar V3 antes de reiniciar', critical: true },
    { key: 'temp', value: '72 °C', critical: false },
    { key: 'shift', value: 'Turno 2', critical: false },
  ],
  steps: [
    {
      nodeId: 'npc_open',
      npc: { es: 'Estoy frente al panel. ¿Qué hago?', en: 'I am in front of the panel. What do I do?' },
      composer: false,
      cards: [
        { id: 'c1_instruct_close', intent: COMM_INTENTS.INSTRUCT, text: { es: 'Cierra la válvula V3.', en: 'Close valve V3.' } },
        { id: 'c1_instruct_close_verify', intent: COMM_INTENTS.VERIFY, text: { es: 'Cierra la válvula V3 y confírmame cuando quede cerrada.', en: 'Close valve V3 and confirm to me once it is closed.' } },
        { id: 'c1_instruct_reboot', intent: COMM_INTENTS.INSTRUCT, text: { es: 'Reinicia la línea.', en: 'Restart the line.' } },
        { id: 'c1_ambiguous', intent: COMM_INTENTS.INSTRUCT, text: { es: 'Cierra la válvula de la derecha.', en: 'Close the right valve.' } },
      ],
      verdicts: {
        c1_instruct_close_verify: COMM_VERDICTS.OPTIMAL,
        c1_instruct_close: COMM_VERDICTS.ACCEPTABLE,
        c1_instruct_reboot: COMM_ERROR_CLASSES.PREMATURE_ACTION,
        c1_ambiguous: COMM_ERROR_CLASSES.AMBIGUOUS_REF,
      },
      next: { optimal: 'npc_confirm', acceptable: 'npc_confirm', AMBIGUOUS_REF: 'npc_misunderstand', PREMATURE_ACTION: 'npc_outcome' },
    },
    {
      nodeId: 'npc_misunderstand',
      npc: { es: '¿La válvula de la derecha… es V3?', en: 'The right valve… is that V3?' },
      composer: false,
      cards: [
        { id: 'c1_correct_v3', intent: COMM_INTENTS.CORRECT, text: { es: 'No. Es la válvula V3, identificada en el panel.', en: 'No. It is valve V3, labeled on the panel.' } },
        { id: 'c1_repeat', intent: COMM_INTENTS.INSTRUCT, text: { es: 'Cierra la válvula de la derecha.', en: 'Close the right valve.' } },
      ],
      verdicts: { c1_correct_v3: COMM_VERDICTS.OPTIMAL, c1_repeat: COMM_ERROR_CLASSES.UNRECOVERED_MISUNDERSTANDING },
      next: { optimal: 'npc_confirm', UNRECOVERED_MISUNDERSTANDING: 'npc_outcome' },
    },
    {
      nodeId: 'npc_confirm',
      npc: { es: 'V3 cerrada. Presión bajando.', en: 'V3 closed. Pressure dropping.' },
      composer: false,
      cards: [
        { id: 'c1_final_verify', intent: COMM_INTENTS.VERIFY, text: { es: 'Confírmame que quedó estabilizada.', en: 'Confirm to me that it stabilized.' } },
        { id: 'c1_final_ok', intent: COMM_INTENTS.INFORM, text: { es: 'Perfecto, sigue observando.', en: 'Perfect, keep monitoring.' } },
      ],
      verdicts: { c1_final_verify: COMM_VERDICTS.OPTIMAL, c1_final_ok: COMM_VERDICTS.ACCEPTABLE },
      next: { optimal: 'end', acceptable: 'end' },
    },
    { nodeId: 'npc_outcome', terminal: true, npc: { es: 'El operador quedó esperando clarificación.', en: 'The operator is left waiting for clarification.' } },
  ],
  outcome: {
    resolved: { es: 'La operación continúa con el nuevo estado.', en: 'The operation continues with the new state.' },
    unresolved: { es: 'La acción no resolvió el incidente.', en: 'The action did not resolve the incident.' },
  },
};

// ----------------------------------------------------------------------------
// B2. BLOQUE 2 · RELEVANCIA (Doc 2 §11 CR-L2-S01)
//   Comunicar con exceso de datos; 4-8 distractores. Separar señal de ruido.
// ----------------------------------------------------------------------------
const BASE_L2 = {
  id: 'CR-L2-S01',
  name: { es: 'Línea detenida', en: 'Line down' },
  block: 2,
  practice: false,
  receiver: { role: 'technician', name: { es: 'Técnica Ortega', en: 'Technician Ortega' } },
  facts: [
    { key: 'pressure', value: '8.6 bar', critical: true },
    { key: 'valve', value: 'V3 abierta', critical: true },
    { key: 'ambient_temp', value: '21 °C', critical: false },
    { key: 'shift', value: 'Turno 1', critical: false },
    { key: 'cabinet_id', value: 'GAB-7', critical: false },
    { key: 'humidity', value: '48 %', critical: false },
    { key: 'operator_name', value: 'Rivas', critical: false },
    { key: 'uptime', value: '36 h', critical: false },
  ],
  steps: [
    {
      nodeId: 'npc_open',
      npc: { es: '¿Qué información necesitas que revise primero?', en: 'What information do you need me to check first?' },
      composer: false,
      cards: [
        { id: 'c2_critical', intent: COMM_INTENTS.ASK, text: { es: 'Revisa la presión y el estado de V3.', en: 'Check the pressure and the state of V3.' } },
        { id: 'c2_noise', intent: COMM_INTENTS.ASK, text: { es: 'Revisa presión, temperatura ambiente, turno, humedad e ID de gabinete.', en: 'Check pressure, ambient temperature, shift, humidity and cabinet ID.' } },
        { id: 'c2_irrelevant', intent: COMM_INTENTS.ASK, text: { es: 'Revisa el nombre del operador y el uptime.', en: 'Check the operator name and the uptime.' } },
      ],
      verdicts: {
        c2_critical: COMM_VERDICTS.OPTIMAL,
        c2_noise: COMM_ERROR_CLASSES.IRRELEVANT_DETAIL,
        c2_irrelevant: COMM_ERROR_CLASSES.IRRELEVANT_DETAIL,
      },
      next: { optimal: 'npc_data', IRRELEVANT_DETAIL: 'npc_data' },
    },
    {
      nodeId: 'npc_data',
      npc: { es: 'Presión 8.6 bar y V3 abierta.', en: 'Pressure 8.6 bar and V3 open.' },
      composer: false,
      cards: [
        { id: 'c2_act', intent: COMM_INTENTS.INSTRUCT, text: { es: 'Cierra V3 antes de reiniciar.', en: 'Close V3 before restarting.' } },
        { id: 'c2_act_verify', intent: COMM_INTENTS.VERIFY, text: { es: 'Cierra V3 antes de reiniciar y confírmame cuando esté cerrada.', en: 'Close V3 before restarting and confirm once it is closed.' } },
        { id: 'c2_early', intent: COMM_INTENTS.INSTRUCT, text: { es: 'Reinicia la línea ahora.', en: 'Restart the line now.' } },
      ],
      verdicts: { c2_act_verify: COMM_VERDICTS.OPTIMAL, c2_act: COMM_VERDICTS.ACCEPTABLE, c2_early: COMM_ERROR_CLASSES.PREMATURE_ACTION },
      next: { optimal: 'end', acceptable: 'end', PREMATURE_ACTION: 'npc_outcome' },
    },
    { nodeId: 'npc_outcome', terminal: true, npc: { es: 'La alarma sigue activa.', en: 'The alarm is still active.' } },
  ],
  outcome: {
    resolved: { es: 'La línea se estabiliza con el dato crítico actuado.', en: 'The line stabilizes with the critical data acted on.' },
    unresolved: { es: 'La acción no resolvió el incidente.', en: 'The action did not resolve the incident.' },
  },
};

// ----------------------------------------------------------------------------
// B3. BLOQUE 3 · INDAGACIÓN (Doc 2 §11 CR-L3-S01 + §11.1 ejemplo)
//   Falta un dato crítico; no se puede resolver al inicio. Premiar preguntar.
// ----------------------------------------------------------------------------
const BASE_L3 = {
  id: 'CR-L3-S01',
  name: { es: 'Etiqueta de contenedor', en: 'Container label' },
  block: 3,
  practice: false,
  receiver: { role: 'operator', name: { es: 'Operador Fuentes', en: 'Operator Fuentes' } },
  facts: [
    { key: 'container_id', value: 'AX-42', critical: true },
    { key: 'temp', value: '36 °C', critical: true },
    { key: 'rule', value: 'Etiqueta roja → zona C', critical: true },
    { key: 'label_color', value: 'desconocido', critical: true },
    { key: 'bay', value: 'Bahía 9', critical: false },
  ],
  steps: [
    {
      nodeId: 'npc_open',
      npc: { es: 'Tengo el contenedor AX-42. ¿Lo llevo a zona C?', en: 'I have container AX-42. Do I take it to zone C?' },
      composer: false,
      cards: [
        { id: 'c3_ask_color', intent: COMM_INTENTS.ASK, text: { es: '¿De qué color es la etiqueta?', en: 'What color is the label?' } },
        { id: 'c3_ask_vague', intent: COMM_INTENTS.ASK, text: { es: '¿Qué ves en el contenedor?', en: 'What do you see on the container?' } },
        { id: 'c3_premature', intent: COMM_INTENTS.INSTRUCT, text: { es: 'Sí, llévalo a zona C.', en: 'Yes, take it to zone C.' } },
      ],
      verdicts: {
        c3_ask_color: COMM_VERDICTS.OPTIMAL,
        c3_ask_vague: COMM_ERROR_CLASSES.MISSING_INFORMATION,
        c3_premature: COMM_ERROR_CLASSES.PREMATURE_ACTION,
      },
      next: { optimal: 'npc_color', MISSING_INFORMATION: 'npc_vague', PREMATURE_ACTION: 'npc_outcome' },
    },
    {
      nodeId: 'npc_vague',
      npc: { es: 'Es un contenedor estándar, 36 °C, baha 9. No veo más.', en: 'It is a standard container, 36 °C, bay 9. I do not see more.' },
      composer: false,
      cards: [
        { id: 'c3_ask_color2', intent: COMM_INTENTS.ASK, text: { es: '¿De qué color es la etiqueta?', en: 'What color is the label?' } },
      ],
      verdicts: { c3_ask_color2: COMM_VERDICTS.OPTIMAL },
      next: { optimal: 'npc_color' },
    },
    {
      nodeId: 'npc_color',
      npc: { es: 'Roja.', en: 'Red.' },
      composer: false,
      cards: [
        { id: 'c3_instruct_verify', intent: COMM_INTENTS.VERIFY, text: { es: 'Llévalo a zona C y confirma entrega.', en: 'Take it to zone C and confirm delivery.' } },
        { id: 'c3_instruct', intent: COMM_INTENTS.INSTRUCT, text: { es: 'Llévalo a zona C.', en: 'Take it to zone C.' } },
      ],
      verdicts: { c3_instruct_verify: COMM_VERDICTS.OPTIMAL, c3_instruct: COMM_VERDICTS.ACCEPTABLE },
      next: { optimal: 'end', acceptable: 'end' },
    },
    { nodeId: 'npc_outcome', terminal: true, npc: { es: 'El contenedor quedó en duda.', en: 'The container is left in doubt.' } },
  ],
  outcome: {
    resolved: { es: 'Traslado correcto a la zona indicada.', en: 'Correct transfer to the indicated zone.' },
    unresolved: { es: 'Compromiso prematuro; se registra el error.', en: 'Premature commitment; the error is recorded.' },
  },
};

// ----------------------------------------------------------------------------
// B4. BLOQUE 4 · REPARACIÓN (Doc 2 §11 CR-L4-S01)
//   El NPC interpreta mal (malentendido controlado y DETERMINISTA). Observar
//   reformulación y precisión.
// ----------------------------------------------------------------------------
const BASE_L4 = {
  id: 'CR-L4-S01',
  name: { es: 'Interruptor ambiguo', en: 'Ambiguous switch' },
  block: 4,
  practice: false,
  receiver: { role: 'operator', name: { es: 'Operador Soto', en: 'Operator Soto' } },
  facts: [
    { key: 'sw1', value: 'SW-1 amarillo', critical: true },
    { key: 'sw2', value: 'SW-2 azul', critical: true },
    { key: 'sw3', value: 'SW-3 rojo (extremo derecho)', critical: true },
  ],
  steps: [
    {
      nodeId: 'npc_open',
      npc: { es: 'Tengo tres interruptores en el panel. ¿Cuál activo?', en: 'I have three switches on the panel. Which one do I activate?' },
      composer: false,
      cards: [
        { id: 'c4_precise', intent: COMM_INTENTS.INSTRUCT, text: { es: 'Activa SW-3, el interruptor rojo del extremo derecho.', en: 'Activate SW-3, the red switch on the far right.' } },
        { id: 'c4_ambiguous', intent: COMM_INTENTS.INSTRUCT, text: { es: 'Activa el interruptor derecho.', en: 'Activate the right switch.' } },
      ],
      verdicts: { c4_precise: COMM_VERDICTS.OPTIMAL, c4_ambiguous: COMM_ERROR_CLASSES.AMBIGUOUS_REF },
      next: { optimal: 'npc_confirm', AMBIGUOUS_REF: 'npc_misunderstand' },
    },
    {
      nodeId: 'npc_misunderstand',
      // Malentendido CONTROLADO y fijado por el blueprint (Doc 2 §13): siempre "¿El amarillo?".
      npc: { es: '¿El amarillo?', en: 'The yellow one?' },
      composer: false,
      cards: [
        { id: 'c4_correct', intent: COMM_INTENTS.CORRECT, text: { es: 'No. Activa SW-3, el interruptor rojo del extremo derecho.', en: 'No. Activate SW-3, the red switch on the far right.' } },
        { id: 'c4_agree', intent: COMM_INTENTS.INFORM, text: { es: 'Sí, el amarillo.', en: 'Yes, the yellow one.' } },
      ],
      verdicts: { c4_correct: COMM_VERDICTS.OPTIMAL, c4_agree: COMM_ERROR_CLASSES.UNRECOVERED_MISUNDERSTANDING },
      next: { optimal: 'npc_confirm', UNRECOVERED_MISUNDERSTANDING: 'npc_outcome' },
    },
    {
      nodeId: 'npc_confirm',
      npc: { es: 'SW-3 activado.', en: 'SW-3 activated.' },
      composer: false,
      cards: [
        { id: 'c4_verify', intent: COMM_INTENTS.VERIFY, text: { es: 'Confírmame que quedó estabilizado.', en: 'Confirm to me that it stabilized.' } },
      ],
      verdicts: { c4_verify: COMM_VERDICTS.OPTIMAL },
      next: { optimal: 'end' },
    },
    { nodeId: 'npc_outcome', terminal: true, npc: { es: 'El interruptor equivocado quedó activo.', en: 'The wrong switch is left active.' } },
  ],
  outcome: {
    resolved: { es: 'El interruptor correcto está activo.', en: 'The correct switch is active.' },
    unresolved: { es: 'El malentendido no se reparó.', en: 'The misunderstanding was not repaired.' },
  },
};

// ----------------------------------------------------------------------------
// B5. BLOQUE 5 · ADAPTACIÓN AL RECEPTOR (Doc 2 §11 CR-L5-S01)
//   Mismo problema técnico que L1, receptor distinto (supervisor). Cambiar
//   detalle y registro (no técnico).
// ----------------------------------------------------------------------------
const BASE_L5 = {
  id: 'CR-L5-S01',
  name: { es: 'Sobrepresión', en: 'Overpressure' },
  block: 5,
  practice: false,
  receiver: { role: 'supervisor', name: { es: 'Supervisora Méndez', en: 'Supervisor Méndez' } },
  facts: [
    { key: 'pressure', value: '8.4 bar', critical: true },
    { key: 'valve', value: 'V3 abierta', critical: true },
    { key: 'status', value: 'línea detenida', critical: true },
  ],
  steps: [
    {
      nodeId: 'npc_open',
      npc: { es: '¿Qué está pasando con la línea?', en: 'What is happening with the line?' },
      composer: false,
      cards: [
        { id: 'c5_adapted', intent: COMM_INTENTS.INFORM, text: { es: 'Hay una sobrepresión. La línea seguirá detenida mientras estabilizamos el sistema.', en: 'There is an overpressure. The line will stay down while we stabilize the system.' } },
        { id: 'c5_technical', intent: COMM_INTENTS.INSTRUCT, text: { es: 'Cierra V3, luego verifica el manómetro y ajusta el setpoint a 6 bar.', en: 'Close V3, then check the gauge and adjust the setpoint to 6 bar.' } },
        { id: 'c5_vague', intent: COMM_INTENTS.INFORM, text: { es: 'Está todo bien, solo un ajuste.', en: 'Everything is fine, just an adjustment.' } },
      ],
      verdicts: {
        c5_adapted: COMM_VERDICTS.OPTIMAL,
        c5_technical: COMM_ERROR_CLASSES.MISMATCH_REGISTER,
        c5_vague: COMM_ERROR_CLASSES.MISSING_INFORMATION,
      },
      next: { optimal: 'npc_close', MISMATCH_REGISTER: 'npc_close', MISSING_INFORMATION: 'npc_close' },
    },
    {
      nodeId: 'npc_close',
      npc: { es: 'Entendido, gracias por la información.', en: 'Understood, thanks for the update.' },
      composer: false,
      cards: [
        { id: 'c5_status', intent: COMM_INTENTS.INFORM, text: { es: 'Te aviso en cuanto se estabilice.', en: 'I will let you know once it stabilizes.' } },
      ],
      verdicts: { c5_status: COMM_VERDICTS.OPTIMAL },
      next: { optimal: 'end' },
    },
  ],
  outcome: {
    resolved: { es: 'El supervisor recibió información apropiada a su rol.', en: 'The supervisor received information appropriate to their role.' },
    unresolved: { es: 'La comunicación no se adaptó al receptor.', en: 'The communication was not adapted to the receiver.' },
  },
};

// ----------------------------------------------------------------------------
// B6. BLOQUE 6 · INTEGRACIÓN BAJO PRESIÓN (Doc 2 §11 CR-L6-S01)
//   Incidente complejo: ruido + incertidumbre + tiempo (45 s). Combinar
//   habilidades. Con composer de bloques (Doc 2 §12) para riqueza conductual.
// ----------------------------------------------------------------------------
const BASE_L6 = {
  id: 'CR-L6-S01',
  name: { es: 'Doble incidencia', en: 'Double incident' },
  block: 6,
  practice: false,
  receiver: { role: 'operator', name: { es: 'Operador Rivas', en: 'Operator Rivas' } },
  facts: [
    { key: 'pressure', value: '8.9 bar', critical: true },
    { key: 'valve', value: 'V3 abierta', critical: true },
    { key: 'alarm', value: 'alarma secundaria activa', critical: true },
    { key: 'label_color', value: 'desconocido', critical: true },
    { key: 'temp', value: '74 °C', critical: false },
    { key: 'shift', value: 'Turno 2', critical: false },
  ],
  steps: [
    {
      nodeId: 'npc_open',
      npc: { es: 'Tengo dos alarmas activas. ¿Procedo con el reinicio?', en: 'I have two active alarms. Should I proceed with the restart?' },
      composer: false,
      cards: [
        { id: 'c6_ask_critical', intent: COMM_INTENTS.ASK, text: { es: 'Antes: ¿de qué color es la etiqueta del contenedor?', en: 'First: what color is the container label?' } },
        { id: 'c6_restart_now', intent: COMM_INTENTS.INSTRUCT, text: { es: 'Sí, reinicia ahora.', en: 'Yes, restart now.' } },
      ],
      verdicts: { c6_ask_critical: COMM_VERDICTS.OPTIMAL, c6_restart_now: COMM_ERROR_CLASSES.PREMATURE_ACTION },
      next: { optimal: 'npc_color', PREMATURE_ACTION: 'npc_outcome' },
    },
    {
      nodeId: 'npc_color',
      npc: { es: 'Roja.', en: 'Red.' },
      composer: true,
      blocks: [
        { id: 'b_close', text: { es: 'Cierra', en: 'Close' } },
        { id: 'b_v3', text: { es: 'V3', en: 'V3' } },
        { id: 'b_before', text: { es: 'antes de', en: 'before' } },
        { id: 'b_restart', text: { es: 'reiniciar', en: 'restarting' } },
        { id: 'b_confirm', text: { es: 'y confírmame', en: 'and confirm to me' } },
        { id: 'b_done', text: { es: 'cuando esté cerrada', en: 'once it is closed' } },
      ],
      composerVerdicts: {
        optimal: ['b_close', 'b_v3', 'b_before', 'b_restart', 'b_confirm', 'b_done'],
        acceptable: [
          ['b_close', 'b_v3', 'b_before', 'b_restart', 'b_confirm', 'b_done'],
          ['b_close', 'b_v3', 'b_before', 'b_restart'],
        ],
      },
      next: { optimal: 'npc_confirm', acceptable: 'npc_confirm', MISSING_INFORMATION: 'npc_outcome' },
    },
    {
      nodeId: 'npc_confirm',
      npc: { es: 'V3 cerrada. Presión bajando.', en: 'V3 closed. Pressure dropping.' },
      composer: false,
      cards: [
        { id: 'c6_final_verify', intent: COMM_INTENTS.VERIFY, text: { es: 'Confírmame cuando esté estabilizada.', en: 'Confirm to me once it is stabilized.' } },
      ],
      verdicts: { c6_final_verify: COMM_VERDICTS.OPTIMAL },
      next: { optimal: 'end' },
    },
    { nodeId: 'npc_outcome', terminal: true, npc: { es: 'La alarma sigue activa.', en: 'The alarm is still active.' } },
  ],
  outcome: {
    resolved: { es: 'El doble incidente se controla con el dato crítico y la acción previa.', en: 'The double incident is controlled with the critical data and the prior action.' },
    unresolved: { es: 'El reinicio prematuro dejó la alarma activa.', en: 'The premature restart left the alarm active.' },
  },
};

// ----------------------------------------------------------------------------
// PRÁCTICA (2 escenarios, sin score, no entran al payload §19 — Doc 1 §13.2 / §17)
//   P1 enseña: selección + envío + verificación (T1, T2, T5).
//   P2 enseña: indagación + compositor de bloques (T3, T4).
// ----------------------------------------------------------------------------
const PRACTICE_1 = {
  id: 'CR-PRACTICE-01',
  name: { es: 'Práctica: cerrar válvula', en: 'Practice: close valve' },
  block: 0, // 0 = práctica (no bloque evaluado 1-6)
  practice: true,
  receiver: { role: 'operator', name: { es: 'Operador (práctica)', en: 'Operator (practice)' } },
  facts: [
    { key: 'pressure', value: '8.2 bar', critical: true },
    { key: 'valve', value: 'V1 abierta', critical: true },
  ],
  steps: [
    {
      nodeId: 'npc_open',
      npc: { es: 'Toca una respuesta para seleccionarla, luego envía.', en: 'Tap a response to select it, then send.' },
      composer: false,
      cards: [
        { id: 'p1_instruct', intent: COMM_INTENTS.INSTRUCT, text: { es: 'Cierra la válvula V1.', en: 'Close valve V1.' } },
        { id: 'p1_instruct_verify', intent: COMM_INTENTS.VERIFY, text: { es: 'Cierra la válvula V1 y confírmame cuando quede cerrada.', en: 'Close valve V1 and confirm once it is closed.' } },
      ],
      verdicts: { p1_instruct_verify: COMM_VERDICTS.OPTIMAL, p1_instruct: COMM_VERDICTS.ACCEPTABLE },
      next: { optimal: 'npc_confirm', acceptable: 'npc_confirm' },
    },
    {
      nodeId: 'npc_confirm',
      npc: { es: 'V1 cerrada.', en: 'V1 closed.' },
      composer: false,
      cards: [
        { id: 'p1_verify', intent: COMM_INTENTS.VERIFY, text: { es: 'Confírmame que está cerrada.', en: 'Confirm to me that it is closed.' } },
      ],
      verdicts: { p1_verify: COMM_VERDICTS.OPTIMAL },
      next: { optimal: 'end' },
    },
  ],
  outcome: {
    resolved: { es: 'Práctica completada.', en: 'Practice complete.' },
    unresolved: { es: 'Práctica completada.', en: 'Practice complete.' },
  },
};

const PRACTICE_2 = {
  id: 'CR-PRACTICE-02',
  name: { es: 'Práctica: color de etiqueta', en: 'Practice: label color' },
  block: 0,
  practice: true,
  receiver: { role: 'operator', name: { es: 'Operador (práctica)', en: 'Operator (practice)' } },
  facts: [
    { key: 'container_id', value: 'BX-07', critical: true },
    { key: 'rule', value: 'Etiqueta azul → zona A', critical: true },
  ],
  steps: [
    {
      nodeId: 'npc_open',
      npc: { es: 'Tengo el contenedor BX-07. ¿A qué zona lo llevo?', en: 'I have container BX-07. Which zone do I take it to?' },
      composer: false,
      cards: [
        { id: 'p2_ask_color', intent: COMM_INTENTS.ASK, text: { es: '¿De qué color es la etiqueta?', en: 'What color is the label?' } },
        { id: 'p2_assume', intent: COMM_INTENTS.INSTRUCT, text: { es: 'Llévalo a zona A.', en: 'Take it to zone A.' } },
      ],
      verdicts: { p2_ask_color: COMM_VERDICTS.OPTIMAL, p2_assume: COMM_ERROR_CLASSES.MISSING_INFORMATION },
      next: { optimal: 'npc_color', MISSING_INFORMATION: 'npc_color' },
    },
    {
      nodeId: 'npc_color',
      npc: { es: 'Azul.', en: 'Blue.' },
      composer: true,
      blocks: [
        { id: 'b_take', text: { es: 'Llévalo a', en: 'Take it to' } },
        { id: 'b_zone', text: { es: 'zona A', en: 'zone A' } },
        { id: 'b_confirm', text: { es: 'y confirma', en: 'and confirm' } },
        { id: 'b_delivery', text: { es: 'entrega', en: 'delivery' } },
      ],
      composerVerdicts: {
        optimal: ['b_take', 'b_zone', 'b_confirm', 'b_delivery'],
        acceptable: [['b_take', 'b_zone', 'b_confirm', 'b_delivery'], ['b_take', 'b_zone']],
      },
      next: { optimal: 'end', acceptable: 'end' },
    },
  ],
  outcome: {
    resolved: { es: 'Práctica completada.', en: 'Practice complete.' },
    unresolved: { es: 'Práctica completada.', en: 'Practice complete.' },
  },
};

// ----------------------------------------------------------------------------
// Derivación de la forma paralela B (§6.3): misma estructura, superficie distinta.
// ----------------------------------------------------------------------------
function remapText(text, block) {
  let out = text;
  // Referencias de válvula (bloque 1 y 6 usan V3 → V5; práctica 1 usa V1 → V2)
  out = out.replace(/\bV3\b/g, block === 1 ? 'V5' : (block === 6 ? 'V5' : 'V3'));
  out = out.replace(/\bV1\b/g, 'V2');
  // Interruptores (bloque 4): superficie distinta en la forma paralela
  out = out.replace(/\bSW-1\b/g, 'SW-7').replace(/\bSW-2\b/g, 'SW-8').replace(/\bSW-3\b/g, 'SW-9');
  // Números de presión
  out = out.replace(/8\.4 bar/g, '8.7 bar').replace(/8\.6 bar/g, '8.8 bar').replace(/8\.9 bar/g, '9.1 bar');
  // Nombres de personas por rol
  out = out.replace(/\bRivas\b/g, 'Castro').replace(/\bFuentes\b/g, 'León').replace(/\bSoto\b/g, 'Paredes');
  out = out.replace(/\bOrtega\b/g, 'Vargas').replace(/\bMéndez\b/g, 'Reyes');
  // Contenedor
  out = out.replace(/\bAX-42\b/g, 'AX-58');
  return out;
}

function remapValue(value, block) {
  let out = String(value);
  out = out.replace(/\bV3\b/g, block === 1 ? 'V5' : (block === 6 ? 'V5' : 'V3'));
  out = out.replace(/\bV1\b/g, 'V2');
  out = out.replace(/\bSW-1\b/g, 'SW-7').replace(/\bSW-2\b/g, 'SW-8').replace(/\bSW-3\b/g, 'SW-9');
  out = out.replace(/8\.4 bar/g, '8.7 bar').replace(/8\.6 bar/g, '8.8 bar').replace(/8\.9 bar/g, '9.1 bar');
  out = out.replace(/\bRivas\b/g, 'Castro').replace(/\bFuentes\b/g, 'León').replace(/\bSoto\b/g, 'Paredes');
  out = out.replace(/\bOrtega\b/g, 'Vargas').replace(/\bMéndez\b/g, 'Reyes');
  out = out.replace(/\bAX-42\b/g, 'AX-58');
  return out;
}

/** Deriva la forma B a partir de una forma base A (misma estructura, superficie distinta). */
export function deriveParallelForm(base) {
  const cloned = {
    id: `${base.id}-B`,
    name: { ...base.name, es: base.name.es, en: base.name.en },
    block: base.block,
    practice: base.practice,
    form: 'B',
    receiver: {
      role: base.receiver.role,
      name: {
        es: remapText(base.receiver.name.es, base.block),
        en: remapText(base.receiver.name.en, base.block),
      },
    },
    facts: base.facts.map((f) => ({ key: f.key, value: remapValue(f.value, base.block), critical: f.critical })),
    steps: base.steps.map((step) => ({
      nodeId: step.nodeId,
      npc: { es: remapText(step.npc.es, base.block), en: remapText(step.npc.en, base.block) },
      composer: step.composer === true,
      cards: step.cards
        ? step.cards.map((c) => ({ id: c.id, intent: c.intent, text: { es: remapText(c.text.es, base.block), en: remapText(c.text.en, base.block) } }))
        : undefined,
      blocks: step.blocks
        ? step.blocks.map((b) => ({ id: b.id, text: { es: remapText(b.text.es, base.block), en: remapText(b.text.en, base.block) } }))
        : undefined,
      verdicts: step.verdicts,
      composerVerdicts: step.composerVerdicts,
      next: step.next,
      terminal: step.terminal === true,
    })),
    outcome: {
      resolved: { es: base.outcome.resolved.es, en: base.outcome.resolved.en },
      unresolved: { es: base.outcome.unresolved.es, en: base.outcome.unresolved.en },
    },
  };
  return cloned;
}

function withForm(base, form) {
  return { ...base, form };
}

/**
 * Manifest completo: 14 escenarios = 6 evaluados × 2 formas (A base + B paralela)
 * + 2 práctica (solo forma A, sin derivar). Timeout solo en bloque 6 (§12.3).
 */
function buildScenarioManifest() {
  const bases = [BASE_L1, BASE_L2, BASE_L3, BASE_L4, BASE_L5, BASE_L6];
  const scenarios = [];
  for (const base of bases) {
    scenarios.push(withForm(base, 'A'));
    scenarios.push(deriveParallelForm(base));
  }
  scenarios.push(withForm(PRACTICE_1, 'A'));
  scenarios.push(withForm(PRACTICE_2, 'A'));
  return Object.freeze(scenarios.map((s) => Object.freeze({
    ...s,
    timeoutMs: CONTROL_ROOM_TIMEOUT_MS_BY_BLOCK[s.block] ?? null,
    npcReplyDelayMs: CONTROL_ROOM_NPC_REPLY_DELAY_MS,
    consequenceMs: CONTROL_ROOM_CONSEQUENCE_MS,
    transitionMs: CONTROL_ROOM_TRANSITION_MS,
  })));
}

/** Los 14 escenarios (frozen). */
export const CONTROL_ROOM_SCENARIOS = buildScenarioManifest();

// ----------------------------------------------------------------------------
// Selectores y builders
// ----------------------------------------------------------------------------

export function getControlRoomScenario(id, scenarios = CONTROL_ROOM_SCENARIOS) {
  return scenarios.find((s) => s.id === id) ?? null;
}

export function listEvaluatedScenarios(scenarios = CONTROL_ROOM_SCENARIOS) {
  return scenarios.filter((s) => !s.practice);
}

export function listPracticeScenarios(scenarios = CONTROL_ROOM_SCENARIOS) {
  return scenarios.filter((s) => s.practice);
}

export function scenariosForBlock(block, scenarios = CONTROL_ROOM_SCENARIOS) {
  return scenarios.filter((s) => s.block === block && !s.practice);
}

/** Hash determinista simple (djb2) sobre una cadena. */
function djb2(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i += 1) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * Asigna forma (A/B) de manera determinista por hash del scenario + seed (§6.3:
 * "forma paralela asignada deterministicamente por hash del scenario"). El seed por
 * defecto es una constante de campaña (mismo que BOMB_DEFAULT_SESSION_SEED de la batería).
 */
export function selectControlRoomForm(scenarioId, seed = 20260911) {
  return djb2(`${scenarioId}:${seed}`) % 2 === 0 ? 'A' : 'B';
}

/**
 * Resuelve el escenario a jugar. Acepta:
 *  - id base de forma A (ej. 'CR-L6-S01') + form 'A'|'B' → resuelve 'CR-L6-S01' / 'CR-L6-S01-B'.
 *  - id ya con sufijo de forma (ej. 'CR-L6-S01-B') → se usa tal cual (form redundante).
 * Devuelve el escenario con `timeoutMs` resuelto según bloque, o null si no existe.
 */
export function buildControlRoomLevelSpec(id, form, scenarios = CONTROL_ROOM_SCENARIOS) {
  const isBaked = String(id).endsWith('-B');
  const targetId = (!isBaked && form === 'B') ? `${id}-B` : id;
  const scenario = scenarios.find((s) => s.id === targetId) ?? null;
  if (!scenario) return null;
  return {
    ...scenario,
    timeoutMs: scenario.timeoutMs ?? CONTROL_ROOM_TIMEOUT_MS_BY_BLOCK[scenario.block] ?? null,
  };
}

/**
 * Orden de evaluación (12 escenarios): por bloque 1→6, primero la forma A y luego su
 * forma paralela B (Doc 1 §6.3 + plan C1 "6 bloques × 2 escenarios"). La práctica (2
 * escenarios, block 0) NO está aquí: se juega antes (C3), sin score.
 */
export const CONTROL_ROOM_EVALUATION_ORDER = Object.freeze(
  [1, 2, 3, 4, 5, 6].flatMap((block) =>
    scenariosForBlock(block)
      .slice()
      .sort((a, b) => ((a.form === 'A' ? 0 : 1) - (b.form === 'A' ? 0 : 1)))
      .map((s) => s.id),
  ),
);

// ----------------------------------------------------------------------------
// C3: contenido de flujo (Doc 2 §4/§5/§15): bienvenida, tutorial T1-T5, salida del
// tutorial, intros de bloque y pantalla final. ES fuente + EN. La UI (controlRoomGame)
// consume estos textos; NINGUN copy vive en el componente.
// ----------------------------------------------------------------------------

/** §5.1 Pantalla de bienvenida. */
export const CONTROL_ROOM_WELCOME = Object.freeze({
  title: { es: 'Sala de Control', en: 'Control Room' },
  sub: { es: 'Coordina incidentes comunicándote con personas en terreno.', en: 'Coordinate incidents by communicating with people in the field.' },
  message: {
    es: 'Revisa la información disponible, decide qué necesitas saber y envía instrucciones claras. En algunos casos tendrás que preguntar o corregir un malentendido antes de continuar.',
    en: 'Review the available information, decide what you need to know, and send clear instructions. In some cases you will have to ask or correct a misunderstanding before continuing.',
  },
  cta: { es: 'Iniciar práctica', en: 'Start practice' },
});

/** §5.2 Nodos del tutorial guiado T1-T5 (overlay + acción esperada). */
export const CONTROL_ROOM_TUTORIAL_NODES = Object.freeze({
  T1: Object.freeze({ id: 'T1', focus: 'seleccion', copy: { es: 'Toca una respuesta para seleccionarla.', en: 'Tap a response to select it.' }, expected: { es: 'Elegir una tarjeta.', en: 'Pick a card.' } }),
  T2: Object.freeze({ id: 'T2', focus: 'envio', copy: { es: 'Confirma cuando estés conforme. Después de enviar no podrás editar.', en: 'Confirm when you are ready. After sending you cannot edit.' }, expected: { es: 'Tap en Enviar.', en: 'Tap Send.' } }),
  T3: Object.freeze({ id: 'T3', focus: 'pregunta', copy: { es: 'Si falta información importante, puedes preguntar antes de dar una instrucción.', en: 'If important information is missing, you can ask before giving an instruction.' }, expected: { es: 'Elegir pregunta crítica.', en: 'Pick the critical question.' } }),
  T4: Object.freeze({ id: 'T4', focus: 'bloques', copy: { es: 'Toca los bloques para construir el mensaje. Puedes cambiar el orden antes de enviarlo.', en: 'Tap the blocks to build the message. You can reorder them before sending.' }, expected: { es: 'Agregar y reordenar.', en: 'Add and reorder.' } }),
  T5: Object.freeze({ id: 'T5', focus: 'verificacion', copy: { es: 'A veces necesitarás confirmar que la instrucción fue entendida o ejecutada.', en: 'Sometimes you will need to confirm the instruction was understood or carried out.' }, expected: { es: 'Enviar verificación.', en: 'Send verification.' } }),
});

/** Escenarios de práctica que vehiculizan el tutorial (block 0, sin score). */
export const CONTROL_ROOM_TUTORIAL_ORDER = Object.freeze(['CR-PRACTICE-01', 'CR-PRACTICE-02']);

/** Nodos T1-T5 por escenario de práctica (para el overlay contextual de la UI). */
export const CONTROL_ROOM_TUTORIAL_HINTS_BY_SCENARIO = Object.freeze({
  'CR-PRACTICE-01': Object.freeze({ npc_open: ['T1', 'T2'], npc_confirm: ['T5'] }),
  'CR-PRACTICE-02': Object.freeze({ npc_open: ['T3'], npc_color: ['T4'] }),
});

/** §5.3 Salida del tutorial (modal). */
export const CONTROL_ROOM_TUTORIAL_EXIT = Object.freeze({
  text: {
    es: 'Práctica completada. A partir de ahora tus decisiones formarán parte de la evaluación. Lee con atención la información disponible y responde como lo harías en una situación real.',
    en: 'Practice complete. From now on your decisions will be part of the evaluation. Read the available information carefully and respond as you would in a real situation.',
  },
  cta: { es: 'Comenzar evaluación', en: 'Start evaluation' },
});

/** Intros de bloque (Doc 2 §15 + matriz §10). Antes del primer escenario de cada bloque. */
export const CONTROL_ROOM_BLOCK_INTROS = Object.freeze({
  1: { es: 'Bloque 1 · Claridad. Da una instrucción específica con la información completa.', en: 'Block 1 · Clarity. Give a specific instruction using the full information.' },
  2: { es: 'Bloque 2 · Relevancia. Hay más datos de los necesarios; comunica solo lo crítico.', en: 'Block 2 · Relevance. There is more data than needed; communicate only what is critical.' },
  3: { es: 'Bloque 3 · Indagación. Falta un dato clave; pregunta antes de asumir.', en: 'Block 3 · Inquiry. A key data point is missing; ask before assuming.' },
  4: { es: 'Bloque 4 · Reparación. Si el interlocutor interpreta mal, corrige con precisión.', en: 'Block 4 · Repair. If the contact misinterprets, correct them precisely.' },
  5: { es: 'Bloque 5 · Adaptación. Ajusta el detalle y el registro al rol de la persona.', en: 'Block 5 · Adaptation. Adjust the detail and register to the person’s role.' },
  6: { es: 'Bloque 6 · Integración bajo presión. Combina habilidades con tiempo limitado (45 s).', en: 'Block 6 · Integration under pressure. Combine skills with a time limit (45 s).' },
});

/** §15 / §4.4 Pantalla final neutra. */
export const CONTROL_ROOM_FINAL = Object.freeze({
  text: { es: 'Simulación finalizada. Tus respuestas fueron registradas correctamente.', en: 'Simulation complete. Your responses were recorded correctly.' },
});
