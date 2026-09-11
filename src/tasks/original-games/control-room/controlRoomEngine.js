// controlRoomEngine.js — EXP-COMM-001 (Sala de Control) · C1: máquina de estados pura +
// input gate + validador semántico + buffer de eventos + acumuladores de métricas.
//
// Fuente de verdad: Doc 1 (ley) §5, §6, §7 (máquina de estados), §8 (validador),
// §9 (intents), §11 (telemetría), §12.3 (input gate), §13 (error handling),
// §13.1 (eventos críticos), §14.1 (timing/clock), §14.2 (integrity flags), §19 (payload).
//
// Pureza (espejo de bombEngine.js): SIN DOM ni timers de navegador. Reloj `now` (lógico,
// monotónico) y `eventNow` (timestamps de eventos) inyectables; logger `log` inyectable.
// La UI (C2) es la única que pinta y despacha; este módulo decide.
//
// Estados (§7): intro → reading → npc_turn → response → verification → consequence →
// transition → complete. Más 'technical_error' (defensivo).
//   - 'verification' es un estado DE REPOSO real: tras un VERIFY enviado, el motor espera
//     `completeVerification()` (el NPC confirma). Mientras está en 'verification', un 2°
//     `send()` se IGNORA (QA §16.1 #5: "Enviar durante verification: 2º SEND ignorado").
//
// Modelo: un escenario = grafo determinista de `steps` (controlRoomRules.js). El motor
// camina los steps; el validador clasifica cada acción (optimal/acceptable/errorClass) y
// el campo `next` del step decide el paso siguiente. Sin aleatoriedad (Doc 2 §13).
//
// Privacy: `eventBuffer` y `actions` son datos crudos INTERNOS (para scoring C4). El
// payload final (C4 §19) emite SOLO agregados; el agregado está versionado.

import {
  COMM_INTENTS,
  COMM_VERDICTS,
  COMM_ERROR_CODES,
  COMM_EVENT_NAMES,
  COMM_CRITICAL_EVENTS,
  COMM_DIMENSION_KEYS,
  COMM_INTEGRITY_FLAGS,
} from './controlRoomTaxonomy.js';
import { createControlRoomTimer } from './controlRoomTimer.js';

export const CONTROL_ROOM_STATES = Object.freeze({
  INTRO: 'intro',
  READING: 'reading',
  NPC_TURN: 'npc_turn',
  RESPONSE: 'response',
  VERIFICATION: 'verification',
  CONSEQUENCE: 'consequence',
  TRANSITION: 'transition',
  COMPLETE: 'complete',
  TECHNICAL_ERROR: 'technical_error',
});

const S = CONTROL_ROOM_STATES;
const DEFAULT_NOW = () => (typeof performance !== 'undefined' && typeof performance.now === 'function'
  ? performance.now()
  : Date.now());
const NOOP = () => {};

const CLOCK_DRIFT_THRESHOLD_MS = 250;

function isErrorCode(code) {
  return COMM_ERROR_CODES.includes(code);
}

function dimensionFor(block, intent) {
  if (block === 2) return 'relevance_and_synthesis'; // selección dato crítico vs distractores
  if (block === 5) return 'adaptation'; // registro/rol del receptor
  if (intent === COMM_INTENTS.ASK) return 'inquiry';
  if (intent === COMM_INTENTS.VERIFY) return 'verification_closed_loop';
  if (intent === COMM_INTENTS.CORRECT) return 'repair';
  return 'clarity'; // INSTRUCT/INFORM/CONDITION/ESCALATE (bloques 1,3,4,6)
}

/** Clasifica una secuencia del compositor contra composerVerdicts (§8). */
export function classifyComposerSelection(composerVerdicts, selection = []) {
  const seq = selection.join('|');
  const optimal = composerVerdicts?.optimal ?? [];
  if (optimal.join('|') === seq) return COMM_VERDICTS.OPTIMAL;
  const acceptable = composerVerdicts?.acceptable ?? [];
  if (acceptable.some((a) => a.join('|') === seq)) return COMM_VERDICTS.ACCEPTABLE;
  const optimalSet = new Set(optimal);
  const selectionSet = new Set(selection);
  const missing = [...optimalSet].filter((b) => !selectionSet.has(b));
  const extra = [...selectionSet].filter((b) => !optimalSet.has(b));
  if (missing.length > 0) return 'MISSING_INFORMATION';
  if (extra.length > 0) return 'IRRELEVANT_DETAIL';
  return COMM_VERDICTS.ACCEPTABLE;
}

export function createControlRoomEngine({
  scenario,
  now = DEFAULT_NOW,
  eventNow = null,
  log = NOOP,
  driftThresholdMs = CLOCK_DRIFT_THRESHOLD_MS,
} = {}) {
  if (!scenario) throw new Error('controlRoomEngine: scenario requerido');
  const eventClock = eventNow ?? now;
  const timer = createControlRoomTimer({ timeLimitMs: scenario.timeoutMs ?? null, now });

  const st = {
    scenario,
    state: S.INTRO,
    stepIndex: -1,
    selectedCardId: null,
    composerSelection: [],
    pendingNextRef: null,
    firstSendDone: false,
    scored: null, // null = aún no determinado; true/false al terminar (§12.3)
    resolved: null,
    completedSteps: 0,
    // acumuladores
    eventBuffer: [],
    actions: [],
    decisionLatencies: [],
    readingTimeMs: 0,
    preSendEditCount: 0,
    preSendReorderCount: 0,
    totalMessageCount: 0,
    questionCount: 0,
    verificationCount: 0,
    confirmationRequested: false,
    confirmationGiven: false,
    timeoutCount: 0,
    integrityFlags: new Set(),
    dimensionStats: Object.fromEntries(COMM_DIMENSION_KEYS.map((k) => [k, { opportunity: 0, success: 0 }])),
    t0: null,
    stepStartT: 0,
    sentThisStep: false,
  };

  function tMs() {
    if (st.t0 == null) return 0;
    return Math.max(0, Math.round(now() - st.t0));
  }

  function emit(event, meta = {}) {
    if (!COMM_EVENT_NAMES.has(event)) {
      st.integrityFlags.add('event_schema_violation');
      return null;
    }
    const t = tMs();
    const isCritical = COMM_CRITICAL_EVENTS.has(event);
    if (isCritical) {
      const drift = Math.abs(eventClock() - now());
      if (drift > driftThresholdMs) st.integrityFlags.add('clock_drift');
    }
    const record = Object.freeze({
      t_ms: t,
      event,
      scenario_id: scenario.id,
      form: scenario.form ?? null,
      block: scenario.block,
      practice: scenario.practice === true,
      step: st.stepIndex >= 0 ? (scenario.steps[st.stepIndex]?.nodeId ?? null) : null,
      critical: isCritical,
      meta: Object.freeze(meta),
    });
    st.eventBuffer.push(record);
    log(record);
    return record;
  }

  function currentStep() {
    return st.stepIndex >= 0 ? scenario.steps[st.stepIndex] : null;
  }

  function finishScenario(resolved) {
    st.resolved = resolved === true;
    st.scored = st.firstSendDone; // §12.3: timeout antes del 1er envío => no se puntúa
    st.state = S.CONSEQUENCE;
    st.completedSteps += 1;
    st.pendingNextRef = null;
    emit('CONSEQUENCE_SHOWN', { resolved: st.resolved });
    if (!st.firstSendDone) st.integrityFlags.add('no_message_sent');
  }

  function enterStepByNodeId(nodeId, { isReply = false } = {}) {
    const idx = scenario.steps.findIndex((s) => s.nodeId === nodeId);
    if (idx < 0) {
      // Evento sin nodo válido (§13.1) → technical_error, sin score, sin consecuencia narrativa.
      st.integrityFlags.add('unknown_step_transition');
      st.state = S.TECHNICAL_ERROR;
      st.scored = false;
      st.resolved = false;
      return false;
    }
    st.stepIndex = idx;
    st.selectedCardId = null;
    st.composerSelection = [];
    st.sentThisStep = false;
    st.stepStartT = tMs();
    const step = scenario.steps[idx];
    if (step.terminal) {
      // Nodo terminal (ej. "npc_outcome"): consecuencia directa, no es response.
      finishScenario(!/outcome|misunderstand/i.test(step.nodeId));
      return true;
    }
    st.state = S.NPC_TURN;
    if (isReply) {
      if (!st.firstSendDone) st.integrityFlags.add('npc_reply_without_send');
      emit('NPC_REPLY_SHOWN', { nodeId: step.nodeId });
    } else {
      emit('NPC_MSG_SHOWN', { nodeId: step.nodeId });
    }
    st.state = S.RESPONSE;
    return true;
  }

  function start() {
    if (st.state !== S.INTRO) return st.state;
    st.t0 = now();
    timer.start();
    emit('SCENARIO_START', { form: scenario.form ?? null, block: scenario.block, practice: scenario.practice === true });
    st.state = S.READING;
    // v1: sin gate de lectura real (límite amplio, §14.1); pasa a la apertura del NPC.
    const first = scenario.steps[0]?.nodeId;
    if (first) enterStepByNodeId(first, { isReply: false });
    return st.state;
  }

  function selectCard(id) {
    if (st.state !== S.RESPONSE) return { ok: false, reason: 'not_response' };
    const step = currentStep();
    if (!step || step.composer) return { ok: false, reason: 'composer_step' };
    const card = (step.cards ?? []).find((c) => c.id === id);
    if (!card) return { ok: false, reason: 'invalid_card' };
    if (st.selectedCardId === id) return { ok: true, changed: false }; // 2° tap mantiene (Doc 2 §8)
    st.selectedCardId = id;
    emit('CARD_SELECTED', { cardId: id, intent: card.intent });
    return { ok: true, changed: true, intent: card.intent };
  }

  function deselectCard() {
    if (st.state !== S.RESPONSE) return { ok: false, reason: 'not_response' };
    const step = currentStep();
    if (!step || step.composer) return { ok: false, reason: 'composer_step' };
    if (st.selectedCardId == null) return { ok: true, changed: false };
    st.selectedCardId = null;
    st.preSendEditCount += 1;
    emit('CARD_DESELECTED', {});
    return { ok: true, changed: true };
  }

  function addBlock(id) {
    if (st.state !== S.RESPONSE) return { ok: false, reason: 'not_response' };
    const step = currentStep();
    if (!step || !step.composer) return { ok: false, reason: 'not_composer' };
    const block = (step.blocks ?? []).find((b) => b.id === id);
    if (!block) return { ok: false, reason: 'invalid_block' };
    if (st.composerSelection.includes(id)) return { ok: false, reason: 'already_added' };
    st.composerSelection.push(id);
    emit('BLOCK_ADDED', { blockId: id });
    return { ok: true };
  }

  function removeBlock(id) {
    if (st.state !== S.RESPONSE) return { ok: false, reason: 'not_response' };
    const step = currentStep();
    if (!step || !step.composer) return { ok: false, reason: 'not_composer' };
    const i = st.composerSelection.indexOf(id);
    if (i < 0) return { ok: false, reason: 'not_added' };
    st.composerSelection.splice(i, 1);
    st.preSendEditCount += 1;
    emit('BLOCK_REMOVED', { blockId: id });
    return { ok: true };
  }

  function reorderBlock(fromIndex, toIndex) {
    if (st.state !== S.RESPONSE) return { ok: false, reason: 'not_response' };
    const step = currentStep();
    if (!step || !step.composer) return { ok: false, reason: 'not_composer' };
    const arr = st.composerSelection;
    if (fromIndex < 0 || fromIndex >= arr.length || toIndex < 0 || toIndex >= arr.length || fromIndex === toIndex) {
      return { ok: false, reason: 'invalid_index' };
    }
    const [moved] = arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, moved);
    st.preSendEditCount += 1;
    st.preSendReorderCount += 1;
    emit('BLOCK_REORDERED', { fromIndex, toIndex, blockId: moved });
    return { ok: true };
  }

  function classificationForSend() {
    const step = currentStep();
    if (!step) return null;
    if (step.composer) {
      const verdict = classifyComposerSelection(step.composerVerdicts, st.composerSelection);
      return { verdict, intent: COMM_INTENTS.INSTRUCT, kind: 'composer' };
    }
    const card = (step.cards ?? []).find((c) => c.id === st.selectedCardId);
    if (!card) return null;
    const verdict = step.verdicts?.[card.id] ?? COMM_VERDICTS.ACCEPTABLE;
    return { verdict, intent: card.intent, kind: 'card' };
  }

  function send() {
    // QA §16.1 #5: send mientras verification activa → 2° SEND ignorado.
    if (st.state === S.VERIFICATION) return { ok: false, reason: 'verification_active' };
    if (st.state !== S.RESPONSE) return { ok: false, reason: 'not_response' };
    const step = currentStep();
    if (!step) return { ok: false, reason: 'no_step' };
    // Input gate (§12.3): Enviar deshabilitado sin selección válida.
    const hasSelection = step.composer ? st.composerSelection.length > 0 : st.selectedCardId != null;
    if (!hasSelection) return { ok: false, reason: 'no_selection' };
    // Debounce/doble-send (Doc 2 §20): un solo MESSAGE_SEND por paso.
    if (st.sentThisStep) {
      st.integrityFlags.add('duplicate_message_send');
      return { ok: false, reason: 'duplicate_send' };
    }

    const { verdict, intent, kind } = classificationForSend();
    if (!verdict) return { ok: false, reason: 'no_classification' };

    const t = tMs();
    st.sentThisStep = true;
    st.firstSendDone = true;
    st.totalMessageCount += 1;
    if (intent === COMM_INTENTS.ASK) st.questionCount += 1;
    if (intent === COMM_INTENTS.VERIFY) { st.verificationCount += 1; st.confirmationRequested = true; }

    emit('MESSAGE_SEND', { intent, kind, verdict: isErrorCode(verdict) ? null : verdict });

    const latency = Math.max(0, t - st.stepStartT);
    st.decisionLatencies.push(latency);
    st.readingTimeMs += latency;

    const dimension = dimensionFor(scenario.block, intent);
    const stat = st.dimensionStats[dimension];
    if (stat) {
      stat.opportunity += 1;
      if (verdict === COMM_VERDICTS.OPTIMAL || verdict === COMM_VERDICTS.ACCEPTABLE) stat.success += 1;
    }
    st.actions.push({
      t, step: step.nodeId, intent, verdict, dimension, kind,
      errorClass: isErrorCode(verdict) ? verdict : null,
    });

    const success = verdict === COMM_VERDICTS.OPTIMAL || verdict === COMM_VERDICTS.ACCEPTABLE;
    const nextRef = step.next?.[verdict] ?? (success ? step.next?.[COMM_VERDICTS.ACCEPTABLE] : step.next?.[verdict]) ?? 'end';

    if (intent === COMM_INTENTS.VERIFY) {
      // Verificación = estado de reposo real (§7). El host llama a completeVerification().
      st.state = S.VERIFICATION;
      st.pendingNextRef = nextRef;
      emit('VERIFICATION_SENT', { step: step.nodeId });
      return { ok: true, verdict, pendingVerification: true };
    }

    if (nextRef === 'end') {
      finishScenario(success);
    } else {
      enterStepByNodeId(nextRef, { isReply: true });
    }
    return { ok: true, verdict, next: nextRef };
  }

  /**
   * Completa el loop de verificación (el NPC confirma). Solo desde 'verification'.
   * Emite VERIFICATION_RECEIVED y avanza al paso pendiente (o a consecuencia).
   */
  function completeVerification() {
    if (st.state !== S.VERIFICATION) return { ok: false, reason: 'not_in_verification' };
    emit('VERIFICATION_RECEIVED', { step: currentStep()?.nodeId ?? null });
    st.confirmationGiven = true;
    const nextRef = st.pendingNextRef ?? 'end';
    st.pendingNextRef = null;
    if (nextRef === 'end') {
      finishScenario(st.resolved === true || st.actions[st.actions.length - 1]?.verdict === COMM_VERDICTS.OPTIMAL);
    } else {
      st.state = S.NPC_TURN;
      enterStepByNodeId(nextRef, { isReply: true });
    }
    return { ok: true, next: nextRef };
  }

  function tick() {
    if (st.state === S.CONSEQUENCE || st.state === S.COMPLETE || st.state === S.TECHNICAL_ERROR) {
      return { expired: false, phase: 'normal' };
    }
    if (timer.isExpired()) {
      const beforeFirstSend = !st.firstSendDone;
      st.timeoutCount += 1;
      emit('TIMEOUT_TRIGGERED', { before_first_send: beforeFirstSend, step: currentStep()?.nodeId ?? null });
      if (beforeFirstSend) st.integrityFlags.add('timeout_no_score');
      finishScenario(false);
      return { expired: true, phase: 'critical' };
    }
    return { expired: false, phase: timer.phase() };
  }

  function resume() {
    emit('RESUME_SESSION', { state: st.state, step: currentStep()?.nodeId ?? null });
    return st.state;
  }

  function visibilityChange(hidden) {
    emit('VISIBILITY_CHANGE', { hidden: hidden === true });
  }

  function completeScenario() {
    if (st.state === S.CONSEQUENCE) {
      st.state = S.COMPLETE;
      timer.stop();
    }
    return st.state;
  }

  function computeMetrics() {
    const first = st.decisionLatencies.length ? st.decisionLatencies[0] : null;
    const avg = st.decisionLatencies.length
      ? st.decisionLatencies.reduce((a, b) => a + b, 0) / st.decisionLatencies.length
      : null;
    return {
      first_decision_latency_ms: first,
      average_decision_latency_ms: avg == null ? null : Math.round(avg),
      time_spent_reading_ms: st.readingTimeMs,
      pre_send_edit_count: st.preSendEditCount,
      pre_send_reorder_count: st.preSendReorderCount,
      total_message_count: st.totalMessageCount,
      question_count: st.questionCount,
      verification_count: st.verificationCount,
      confirmation_requested: st.confirmationRequested,
      confirmation_given: st.confirmationGiven,
      timeout_count: st.timeoutCount,
    };
  }

  function dimensionScores() {
    return Object.fromEntries(COMM_DIMENSION_KEYS.map((k) => {
      const { opportunity, success } = st.dimensionStats[k];
      return [k, opportunity > 0 ? Math.round((success / opportunity) * 100) : null];
    }));
  }

  function eventCount(name) {
    return st.eventBuffer.filter((e) => e.event === name).length;
  }

  return {
    get state() { return st.state; },
    get scenario() { return scenario; },
    get selectedCardId() { return st.selectedCardId; },
    get composerSelection() { return [...st.composerSelection]; },
    get firstSendDone() { return st.firstSendDone; },
    get scored() { return st.scored; },
    get resolved() { return st.resolved; },
    currentStep,
    npcMessage: () => { const s = currentStep(); return s ? s.npc : null; },
    availableCards: () => { const s = currentStep(); return s && !s.composer ? s.cards : []; },
    composerBlocks: () => { const s = currentStep(); return s && s.composer ? s.blocks : []; },
    timerConfig: () => timer.config,
    timerRemainingMs: () => timer.remainingMs(),
    timerPhase: () => timer.phase(),
    start,
    selectCard,
    deselectCard,
    addBlock,
    removeBlock,
    reorderBlock,
    send,
    completeVerification,
    tick,
    resume,
    visibilityChange,
    completeScenario,
    metrics: computeMetrics,
    dimensionScores,
    eventCount,
    eventBuffer: () => st.eventBuffer,
    actions: () => st.actions,
    integrityFlags: () => [...st.integrityFlags].filter((f) => COMM_INTEGRITY_FLAGS.has(f)),
    allIntegrityFlags: () => [...st.integrityFlags],
  };
}
