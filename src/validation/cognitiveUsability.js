// KRUMM R-7C — Cognitive interviews & usability gate (instrument + protocol).
//
// Purpose: operationalize the R-7C advance condition ("instrucciones y
// controles no deben explicar más varianza que el constructo pretendido")
// as a deterministic, testable rule over a comprehension/usability matrix.
//
// IMPORTANT — provenance. The rows below are a PROVISIONAL base-line drafted
// by the autonomous orchestrator from:
//   - the live usability audit `docs/design/game-experience-audit.md` (2026-08-27);
//   - the micro-instruction copy in `src/postulation-demo/GameMicroIntro.jsx` (G.2/W3);
//   - the telemetry instruction-risk channel `candidateInstructionCheck.js`;
//   - the R-7B construct×task×feature matrix (KRUMM-003).
// They are NOT the output of real cognitive interview sessions. R-7C formally
// requires live candidate sessions + concurrent probing + non-reconstructive
// observation (see docs/research/krumm-r7c-cognitive-interviews-usability.md).
// Until that protocol runs and the gate is re-validated, this deliverable does
// NOT authorize normative use.
//
// The gate blocks advance for a *scored* construct (availability
// 'provisional_score') when either:
//   - any of its comprehension rows is rejected (instructions/controls dominate
//     the variance instead of the construct), or
//   - any of its comprehension rows has critical severity (e.g. a confirmed
//     comprehension failure on a scored feature).

import { WORKBOOK_TALENT_CONSTRUCT_ORDER } from '../assessment/originalGameTalentMapping.js';
import {
  buildCandidateInstructionCheck,
  summarizeCandidateInstructionCheck,
} from '../tasks/original-games/candidateInstructionCheck.js';

export const COGNITIVE_USABILITY_SCHEMA = 'krumm_r7c_cognitive_usability_v1';

export const COMPREHENSION_VERDICTS = Object.freeze(['aceptar', 'revisar', 'rechazar']);
export const SEVERITIES = Object.freeze(['baja', 'media', 'alta', 'critica']);
export const ISSUE_TYPES = Object.freeze([
  'instrucciones',
  'controles',
  'accesibilidad',
  'dispositivo',
  'fatiga',
  'lenguaje_idioma',
  'tiempos_pacing',
  'señal_tecnica_privacidad',
]);

export const GAMES = Object.freeze([
  'landing_consent',
  'laser_puzzle',
  'balloon_risk',
  'passenger_routes',
  'team_coordination',
  'report_final',
]);

// Availability each construct receives from the runtime mapping (mirrors
// contentValidity.js; scored = 'provisional_score' → subject to the R-7C gate).
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
    game: r.game,
    construct: r.construct, // constructo puntuado afectado (nullable para fase-compuesta)
    surface: r.surface, // pantalla/control/copy a evaluar
    probe: r.probe, // pregunta/sonda de entrevista cognitiva (think-aloud / probing)
    issueType: r.issueType, // uno de ISSUE_TYPES
    comprehensionVerdict: r.comprehensionVerdict, // aceptar|revisar|rechazar
    severity: r.severity, // baja|media|alta|critica
    evidenceBasis: r.evidenceBasis, // auditoria_viva | copy_microintro | canal_telemetria | baseline
    comment: r.comment,
    origin: r.origin ?? 'interna_previa',
  });

// Provisional base-line matrix (orchestrator draft). Expert interviewer +
// product owner overrides it in §8 of the doc after real sessions.
export const PROVISIONAL_USABILITY_MATRIX = Object.freeze([
  // ── Landing + consentimiento (fase compuesta, sin constructo puntuado) ────
  row({
    game: 'landing_consent', construct: null, surface: 'Copy de cámara opcional / no se guarda video / ausencia = desconocida',
    probe: 'Describe con tus palabras qué hace la cámara durante la prueba y qué pasa si no la activas.',
    issueType: 'lenguaje_idioma', comprehensionVerdict: 'aceptar', severity: 'baja',
    evidenceBasis: 'auditoria_viva', comment: 'Copy verificado 2026-08-27 en recorrido vivo: claro, sin tecnicismos.',
  }),
  row({
    game: 'landing_consent', construct: null, surface: 'HUD "Procesos listos N de M" (señal/calibración de fondo)',
    probe: '¿Qué crees que significa "N de M listos" mientras jugas? ¿Afecta cómo decides?',
    issueType: 'señal_tecnica_privacidad', comprehensionVerdict: 'revisar', severity: 'media',
    evidenceBasis: 'auditoria_viva', comment: 'G1-L04: término técnico ("Procesos") reformulado a "N de M listos"; verificar en sesión que no sugiera habilidad ni biometría.',
  }),

  // ── Laser (problemSolving / analyticalThinking — provisional_score) ───────
  row({
    game: 'laser_puzzle', construct: 'problemSolving', surface: 'Micro-intro "El haz cambia de rumbo / cada reflección dobla el láser" + grid en vivo',
    probe: 'Al ver el camino del rayo dibujado en vivo, ¿qué información usas para decidir la siguiente pieza?',
    issueType: 'instrucciones', comprehensionVerdict: 'aceptar', severity: 'baja',
    evidenceBasis: 'copy_microintro', comment: 'Board path in live (G1: beam correct since mount). Confirm the live trace guides rule search, not guesswork.',
  }),
  row({
    game: 'laser_puzzle', construct: 'problemSolving', surface: 'Botón "Comprobar ruta" siempre activo (G1-L02) + hint "Comprueba cuando quieras…se registra al completar"',
    probe: '¿Cuándo tocarías "Comprobar ruta"? ¿Qué crees que registra si la ruta está incompleta?',
    issueType: 'controles', comprehensionVerdict: 'revisar', severity: 'media',
    evidenceBasis: 'copy_microintro', comment: 'Hint W2 mitiga el check prematuro; confirmar en sesión que no infla rule-violations por malentendido.',
  }),
  row({
    game: 'laser_puzzle', construct: 'problemSolving', surface: 'Regla de reflección / relés-antenna ',
    probe: 'Repite con tus palabras: ¿qué hace una pieza espejo cuando la rota?',
    issueType: 'instrucciones', comprehensionVerdict: 'aceptar', severity: 'baja',
    evidenceBasis: 'canal_telemetria', comment: 'Triangula con summarizeLaser(): ruleViolationRate ≥0.5 + solvedRate ≤0.34 ⇒ comprehension_review.',
  }),
  row({
    game: 'laser_puzzle', construct: 'analyticalThinking', surface: 'Descomposición lógica: reflecciones + relés/antena hacia el objetivo',
    probe: 'Cuando iluminas un objetivo, ¿qué pasos conscientes seguiste para que el rayo llegara?',
    issueType: 'instrucciones', comprehensionVerdict: 'aceptar', severity: 'baja',
    evidenceBasis: 'copy_microintro', comment: 'Congruente con laser.solutionEfficiency (análisis lógico→solución parsimoniosa). El par autorado debe ser la única fuente de eficiencia, no el copy.',
  }),

  // ── Balloon (riskFeedbackProfile — provisional_score) ─────────────────────
  row({
    game: 'balloon_risk', construct: 'riskFeedbackProfile', surface: 'Micro-intro "Infla para sumar / Asegura cuando quieras / Cuidado con la tensión"',
    probe: 'En tus palabras: ¿qué pasa si el globo explota y qué diferencia hay entre Inflar y Asegurar?',
    issueType: 'instrucciones', comprehensionVerdict: 'aceptar', severity: 'baja',
    evidenceBasis: 'copy_microintro', comment: 'Riesgo es el diseño del juego; confirmar que "tensión" no se lea como ansiedad del candidato.',
  }),
  row({
    game: 'balloon_risk', construct: 'riskFeedbackProfile', surface: 'Feedback "Puntos asegurados / Nueva ronda" y ausencia de pérdida como señal desconocida',
    probe: 'Después de una ronda sin pérdida, ¿cómo sabrías que estás "jugando de forma segura"? ¿Qué te impide sobre-inflar?',
    issueType: 'controles', comprehensionVerdict: 'aceptar', severity: 'media',
    evidenceBasis: 'canal_telemetria', comment: 'Triangula con summarizeBalloon(): popRate ≥0.75 y cashoutRate ≤0.25 ⇒ copy/threshold review.',
  }),

  // ── Passenger (planning / problemSolving / analyticalThinking) ────────────
  row({
    game: 'passenger_routes', construct: 'planning', surface: 'Micro-intro "Recoge y entrega / Administra la energía (←/→ 1, ↑/↓ 2)"',
    probe: 'Explica con tus palabras el costo de moverte en cada dirección y qué pasa si se agota la energía.',
    issueType: 'instrucciones', comprehensionVerdict: 'aceptar', severity: 'baja',
    evidenceBasis: 'copy_microintro', comment: 'Regla de energía explícita; confirmar retención de "paradas recargan".',
  }),
  row({
    game: 'passenger_routes', construct: 'planning', surface: 'Tarjeta "RESERVA AL FINALIZAR" vs reto "conservar al menos cuatro" (G1-L01)',
    probe: 'Esta tarjeta muestra "5" y el reto pide "conservar al menos cuatro". ¿Cuál es la regla real para completar el circuito?',
    issueType: 'controles', comprehensionVerdict: 'revisar', severity: 'alta',
    evidenceBasis: 'auditoria_viva', comment: 'G1-L01 (mayor): la tarjeta mostró remainingBudget 5 vs requisito "conservar ≥4" confundiendo la regla real de éxito. Es el hallazgo de comprensión crítico de la auditoría — monitorizar en sesión. A diferencia de solve-rate aquí la contaminación es de copy, no de regla.',
  }),
  row({
    game: 'passenger_routes', construct: 'planning', surface: 'Registrar replanteo (replan) y restricciones de pared/presupuesto',
    probe: '¿En qué momento usarías "Registrar replanteo" y qué crees que registra?',
    issueType: 'controles', comprehensionVerdict: 'aceptar', severity: 'media',
    evidenceBasis: 'canal_telemetria', comment: 'Triangula con summarizePassenger(): constraintViolationRate ≥0.25 + deliveryRate <0.7 ⇒ constraint_instruction_review. Replan no tiene dirección normativa (T.4 #1).',
  }),

  // ── Team/Faro (leadership/communication — provisional_score; decision/adapt descriptive) ──
  row({
    game: 'team_coordination', construct: 'leadership', surface: 'Opción A/B/C: "elige la intervención que alinee al equipo" + consecuencia por turno',
    probe: 'Describe tu selector A/B/C: ¿qué significa "alinear al equipo" en este escenario y cómo ves el efecto de tu elección?',
    issueType: 'instrucciones', comprehensionVerdict: 'aceptar', severity: 'baja',
    evidenceBasis: 'copy_microintro', comment: 'Juicio social estructurado (T.4 #2/#13): re-etiquetar "Liderazgo (estructurado)". Confirmar que la audiencia no lee "liderazgo grupal".',
  }),
  row({
    game: 'team_coordination', construct: 'communication', surface: 'Confirmación en 2 pasos por turno (elegir + "Selecciona un comando") — G1-L06',
    probe: '¿El paso extra de confirmación te resultó claro o añadió confusión? ¿Qué habrías simplificado?',
    issueType: 'controles', comprehensionVerdict: 'revisar', severity: 'media',
    evidenceBasis: 'auditoria_viva', comment: 'Decisión usuario = mantener 2 pasos (control de lectura). En sesión: medir fricción sin cambiar mecánica.',
  }),
  row({
    game: 'team_coordination', construct: 'communication', surface: 'BehindPanel con % de constructos en vivo (G1-P08)',
    probe: 'Este panel muestra "Liderazgo (estructurado) 67%" mientras juegas. ¿Qué crees que significa y afecta tu respuesta?',
    issueType: 'señal_tecnica_privacidad', comprehensionVerdict: 'revisar', severity: 'media',
    evidenceBasis: 'auditoria_viva', comment: 'Transparencia (decisión usuario mantener) pero el % en vivo puede sugerir "cuenta de desempeño". Caveat "solo revisión humana" obligatorio; wording según T.4.',
  }),
  row({
    game: 'team_coordination', construct: 'adaptability', surface: 'Respuesta a cambios de prioridad/recursos en el brief',
    probe: '¿Notaste que el brief cambiaba demandas entre turnos? ¿Cómo se compara con resolver un problema fijo?',
    issueType: 'tiempos_pacing', comprehensionVerdict: 'revisar', severity: 'alta',
    evidenceBasis: 'baseline', comment: 'Sesión única NO constituye cambio controlado de regla/entorno (Miyake 2000; T.4 #4/#12). La sonda confirma que la señal es descriptiva, no de adaptabilidad.',
  }),

  // ── Reporte final (fase compuesta) ─────────────────────────────────────────
  row({
    game: 'report_final', construct: null, surface: 'Jerarquía score 0–100 vs caveat "DEMO PROVISIONAL / Sin baremos" (G1-L07)',
    probe: 'Lee una tarjeta: ¿qué crees que "provisional / sin baremos" significa para tu resultado?',
    issueType: 'lenguaje_idioma', comprehensionVerdict: 'revisar', severity: 'media',
    evidenceBasis: 'auditoria_viva', comment: 'G1-L07/W5: número atenuado + caveat adyacente. Confirmar que la audiencia no lo lee como porcentaje de aptitud.',
  }),
  row({
    game: 'report_final', construct: null, surface: 'Caveats sin cámara: "MUESTRAS 0 / Confianza limitada"',
    probe: '¿Cómo interpretas "confianza limitada de la señal local"? ¿Lo asocias a algo sobre ti?',
    issueType: 'señal_tecnica_privacidad', comprehensionVerdict: 'aceptar', severity: 'baja',
    evidenceBasis: 'auditoria_viva', comment: 'Ausencia = desconocida/caveated, nunca desempeño bajo. Verificar que no sugiera incapacidad del candidato.',
  }),
]);

// ── R-7C advance condition ──────────────────────────────────────────────────
// "Instrucciones y controles no deben explicar más varianza que el constructo
// pretendido." A scored construct (provisional_score) advances only if none of
// its comprehension rows is rejected (comprensión dominada por instrucciones/
// controles) and none has critical severity on a scored feature.
export function cognitiveUsabilityGate(matrix = PROVISIONAL_USABILITY_MATRIX, candidateBlocks = null) {
  const blocked = [];
  const scored = new Set(
    Object.entries(CONSTRUCT_AVAILABILITY)
      .filter(([, a]) => a === 'provisional_score')
      .map(([c]) => c),
  );
  for (const r of matrix) {
    if (!r.construct || !scored.has(r.construct)) continue; // solo constructos puntuados
    const rejected = r.comprehensionVerdict === 'rechazar';
    const critical = r.severity === 'critica';
    if (rejected || critical) {
      blocked.push({
        construct: r.construct,
        game: r.game,
        surface: r.surface,
        reason: rejected && critical
          ? 'comprensión rechazada y severidad crítica'
          : rejected
            ? 'comprensión rechazada (instrucciones/controles dominan la varianza)'
            : 'severidad crítica en feature puntuada',
      });
    }
  }

  // Cross-check with the telemetry instruction-risk channel over raw aggregate
  // blocks (per-game summaries of the candidate's session).
  let telemetry = null;
  if (candidateBlocks) {
    try {
      const summarized = summarizeCandidateInstructionCheck(candidateBlocks);
      telemetry = {
        instructionRiskFlag: summarized.instructionRiskFlag,
        excludeFromTalentMappingFlag: summarized.excludeFromTalentMappingFlag,
        reviewedGames: summarized.reviewedGames,
        highRiskGames: summarized.highRiskGames,
        reviewGames: summarized.reviewGames,
      };
      if (summarized.excludeFromTalentMappingFlag) {
        blocked.push({
          construct: '(todos los puntuados)',
          game: '(telemetría agregada)',
          surface: 'candidateInstructionCheck',
          reason: `candidateInstructionCheck elevó excludeFromTalentMappingFlag=true (instructionRiskFlag=${summarized.instructionRiskFlag})`,
        });
      }
    } catch {
      telemetry = { error: 'candidateBlocks no pudieron resumirse' };
    }
  }

  return {
    pass: blocked.length === 0,
    blocked,
    reviewedGames: [...new Set(matrix.map((r) => r.game))],
    scoredConstructs: [...scored].sort(),
    telemetry,
    schema: COGNITIVE_USABILITY_SCHEMA,
  };
}

export function validateCognitiveUsabilityMatrix(matrix = PROVISIONAL_USABILITY_MATRIX) {
  const errors = [];
  const validConstructs = new Set(WORKBOOK_TALENT_CONSTRUCT_ORDER);
  matrix.forEach((r, i) => {
    const at = `row[${i}] ${r.game}${r.surface ? ` / ${r.surface}` : ''}`;
    if (!GAMES.includes(r.game)) errors.push(`${at}: juego desconocido '${r.game}'`);
    if (r.construct != null && !validConstructs.has(r.construct)) {
      errors.push(`${at}: constructo desconocido '${r.construct}'`);
    }
    if (!ISSUE_TYPES.includes(r.issueType)) errors.push(`${at}: issueType inválido '${r.issueType}'`);
    if (!COMPREHENSION_VERDICTS.includes(r.comprehensionVerdict)) {
      errors.push(`${at}: comprehensionVerdict inválido '${r.comprehensionVerdict}'`);
    }
    if (!SEVERITIES.includes(r.severity)) errors.push(`${at}: severidad inválida ${r.severity}`);
    if (r.comprehensionVerdict === 'rechazar' && r.severity === 'baja') {
      errors.push(`${at}: un rechazo de comprensión no puede tener severidad baja`);
    }
  });
  return { valid: errors.length === 0, errors };
}

// Guard: expose the builder used by tests without triggering side effects.
export { buildCandidateInstructionCheck };