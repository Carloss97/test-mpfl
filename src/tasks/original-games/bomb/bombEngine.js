// bombEngine.js — EXP-BOMB-001 · B1: state machine pura + input gate + action validator.
//
// Especificación: Doc 1 §5 (inputs), §6 (módulos: Rule Engine / Action Validator / Timer
// Service / Input Gate), §7 (máquina de estados), §8 (resolución de secuencia y tolerancias),
// §13 (taxonomía), §16.2 (DoD). Doc 2 §19 (casos límite de UI: clamp, hold cancelado en
// transición, cola determinista de inputs).
//
// Pureza: sin DOM ni temporizadores de navegador. El reloj (`now`) y el logger (`log`) se
// inyectan; en headless/tests se usa reloj falso (riesgo #2 del plan EXP-7). La UI (B2/B3)
// es el único lugar que pinta y despacha; este módulo decide.
//
// Reglas duras heredadas:
// - Secuencia efectiva SOLO desde `transformSequence` del manifest (DoD §16.2).
// - Sin feedback de respuesta correcta durante evaluación (show_step_feedback=false): los
//   eventos STEP_ERROR no incluyen más que expected/observed/error_class para telemetría;
//   el host UI no debe renderizar `expected` en niveles evaluados.
// - Tutorial no puntúa: sin timer, sin penalización, sin fail por errores (DoD §16.2).
// - Política de focus (Doc 2 §13.2 v1): el blur SIEMPRE se registra (FOCUS_CHANGE) pero NO
//   pausa el timer de ejecución (la presión temporal es parte de la tarea).

import {
  BOMB_RULE_MANIFEST,
  BOMB_ERROR_CLASSES,
  BOMB_MATCH,
  buildLevelSpec,
  typeAOnlyActions,
} from './bombRules.js';
import { createBombTimer } from './bombTimer.js';

export const BOMB_STATES = Object.freeze({
  BOOT: 'BOOT',
  TUTORIAL_INTRO: 'TUTORIAL_INTRO',
  TUTORIAL_PLAY: 'TUTORIAL_PLAY',
  TUTORIAL_RESULT: 'TUTORIAL_RESULT',
  LEVEL_INTRO: 'LEVEL_INTRO',
  INSTRUCTION_ENCODING: 'INSTRUCTION_ENCODING',
  BLIND_DELAY: 'BLIND_DELAY',
  EXECUTION: 'EXECUTION',
  LEVEL_SUCCESS: 'LEVEL_SUCCESS',
  LEVEL_FAIL: 'LEVEL_FAIL',
  LEVEL_RESULT: 'LEVEL_RESULT',
  TRANSITION: 'TRANSITION',
  SESSION_COMPLETE: 'SESSION_COMPLETE',
});

const STATES = BOMB_STATES;

const DEFAULT_NOW = () => (typeof performance !== 'undefined' && typeof performance.now === 'function'
  ? performance.now()
  : Date.now());

/** Normaliza una acción observada de la UI a descriptor canónico. */
export function normalizeObservedAction(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const { kind, id } = raw;
  if (kind === 'SWITCH' && id) {
    return { kind: 'SWITCH', id, to: raw.to ?? null, from: raw.from ?? null, holdMs: null };
  }
  if (kind === 'WIRE' && id && raw.op === 'CUT') {
    return { kind: 'WIRE', id, to: null, op: 'CUT', holdMs: null };
  }
  if (kind === 'BUTTON' && id && raw.op === 'HOLD') {
    return { kind: 'BUTTON', id, to: null, op: 'HOLD', holdMs: typeof raw.holdMs === 'number' ? raw.holdMs : null };
  }
  return null;
}

/**
 * Action validator puro (spec §8.2 + §13). Clasifica una acción observada contra el paso
 * esperado y el contexto del nivel. Prioridad documentada:
 *   1. REPEAT_ACTION (componente ya resuelto/consumido: cable CUT es irreversible, spec §8.3).
 *   2. EXACT_MATCH (switch OFF→ON esperado / cable esperado / hold dentro de ventana ±tol).
 *   3. TYPE_INTERFERENCE (en Modelo B, acción exclusiva Tipo A: SW_1 ON, WIRE_RED CUT).
 *   4. ORDER_ERROR (paso de la secuencia efectiva pero en posición posterior a la esperada).
 *   5. WRONG_TARGET (componente/acción que no existe en la secuencia del nivel).
 *   Hold fuera de ventana CUANDO ES el paso esperado: HOLD_TOO_SHORT / HOLD_TOO_LONG (no
 *   cae en ORDER_ERROR: es el paso correcto con control temporal deficiente, spec §13).
 *
 * `ctx.consumed`: { wires:Set, switches:Set, buttons:Set } — estado físico/resolución del nivel
 * (lo construye el motor a partir de `components` y `completedActions`).
 */
export function classifyAction(observed, ctx) {
  const { effectiveSequence, stepIndex, holdWindow, typeAOnly, consumed } = ctx;
  const expected = effectiveSequence[stepIndex] ?? null;
  const isSwitchOn = observed.kind === 'SWITCH' && observed.to === 'ON';
  const isSwitch = observed.kind === 'SWITCH'; // cualquier edge (para REPEAT sobre switch resuelto)
  const isCut = observed.kind === 'WIRE' && observed.op === 'CUT';
  const isHold = observed.kind === 'BUTTON' && observed.op === 'HOLD';
  const isCanonical = isSwitchOn || isCut || isHold;

  // 1. REPEAT_ACTION (spec §8.3: duplicado sobre componente ya consumido/resuelto)
  if (consumed) {
    if (isCut && consumed.wires.has(observed.id)) {
      return { match: BOMB_MATCH.STEP_ERROR, errorClass: 'REPEAT_ACTION', stepPosition: null };
    }
    if (isSwitch && consumed.switches.has(observed.id)) {
      return { match: BOMB_MATCH.STEP_ERROR, errorClass: 'REPEAT_ACTION', stepPosition: null };
    }
    if (isHold && consumed.buttons.has(observed.id)) {
      return { match: BOMB_MATCH.STEP_ERROR, errorClass: 'REPEAT_ACTION', stepPosition: null };
    }
  }

  // 2. EXACT_MATCH (solo acciones canónicas; el hold se valida contra la ventana ±tolerancia)
  if (isCanonical && expected) {
    const expectedIsSwitch = expected.kind === 'SWITCH' && expected.to === 'ON';
    const expectedIsCut = expected.kind === 'WIRE' && expected.op === 'CUT';
    const expectedIsHold = expected.kind === 'BUTTON' && expected.op === 'HOLD';
    if (isSwitchOn && expectedIsSwitch && observed.id === expected.id) {
      return { match: BOMB_MATCH.EXACT_MATCH, errorClass: null, stepPosition: stepIndex };
    }
    if (isCut && expectedIsCut && observed.id === expected.id) {
      return { match: BOMB_MATCH.EXACT_MATCH, errorClass: null, stepPosition: stepIndex };
    }
    if (isHold && expectedIsHold && observed.id === expected.id) {
      const [minMs, maxMs] = holdWindow;
      const d = observed.holdMs;
      if (typeof d === 'number' && d >= minMs && d <= maxMs) {
        return { match: BOMB_MATCH.EXACT_MATCH, errorClass: null, stepPosition: stepIndex, holdMs: d };
      }
      if (typeof d === 'number' && d < minMs) {
        return { match: BOMB_MATCH.STEP_ERROR, errorClass: 'HOLD_TOO_SHORT', stepPosition: null, holdMs: d };
      }
      if (typeof d === 'number' && d > maxMs) {
        return { match: BOMB_MATCH.STEP_ERROR, errorClass: 'HOLD_TOO_LONG', stepPosition: null, holdMs: d };
      }
      // holdMs ausente (p.ej. UP sin DOWN registrado) => no es un match exacto; sigue la cadena.
    }
  }

  // 3. TYPE_INTERFERENCE (solo Modelo B, acciones exclusivas Tipo A)
  if (typeAOnly) {
    for (const a of typeAOnly) {
      if (isSwitchOn && a.kind === 'SWITCH' && a.id === observed.id && (a.to ?? 'ON') === 'ON') {
        return { match: BOMB_MATCH.STEP_ERROR, errorClass: 'TYPE_INTERFERENCE', stepPosition: null };
      }
      if (isCut && a.kind === 'WIRE' && a.id === observed.id && a.op === 'CUT') {
        return { match: BOMB_MATCH.STEP_ERROR, errorClass: 'TYPE_INTERFERENCE', stepPosition: null };
      }
    }
  }

  // 4. ORDER_ERROR (paso válido de la secuencia, posición > esperada)
  for (let i = stepIndex + 1; i < effectiveSequence.length; i += 1) {
    const step = effectiveSequence[i];
    if (isSwitchOn && step.kind === 'SWITCH' && step.id === observed.id && step.to === 'ON') {
      return { match: BOMB_MATCH.STEP_ERROR, errorClass: 'ORDER_ERROR', stepPosition: i };
    }
    if (isCut && step.kind === 'WIRE' && step.id === observed.id && step.op === 'CUT') {
      return { match: BOMB_MATCH.STEP_ERROR, errorClass: 'ORDER_ERROR', stepPosition: i };
    }
    if (isHold && step.kind === 'BUTTON' && step.id === observed.id && step.op === 'HOLD') {
      return { match: BOMB_MATCH.STEP_ERROR, errorClass: 'ORDER_ERROR', stepPosition: i };
    }
  }

  // 5. WRONG_TARGET
  return { match: BOMB_MATCH.STEP_ERROR, errorClass: 'WRONG_TARGET', stepPosition: null };
}

function initialComponents() {
  return {
    switches: { SW_1: 'OFF', SW_2: 'OFF', SW_3: 'OFF' },
    wires: { WIRE_RED: 'INTACT', WIRE_BLUE: 'INTACT', WIRE_GREEN: 'INTACT', WIRE_YELLOW: 'INTACT' },
    buttons: { BTN_YELLOW: 'IDLE' },
  };
}

/**
 * Crea el motor (Experience Orchestrator + Rule Engine + Validator + Input Gate + Timer).
 *
 * @param {object} options
 * @param {object} [options.manifest] por defecto BOMB_RULE_MANIFEST.
 * @param {Function} [options.now] reloj monotónico inyectable (ms). Default performance.now.
 * @param {Function} [options.log] (eventName, meta) => void. Default no-op (B5 conecta el
 *   Telemetry Logger real; los tests inyectan un collector).
 * @param {number|null} [options.seed] session seed (determinismo, spec §15/§9).
 * @param {string} [options.sessionId] para los eventos (host lo provee; opcional en B1).
 */
export function createBombEngine(options = {}) {
  const manifest = options.manifest ?? BOMB_RULE_MANIFEST;
  const now = options.now ?? DEFAULT_NOW;
  const log = options.log ?? (() => {});
  const seed = typeof options.seed === 'number' ? options.seed : null;
  const sessionId = options.sessionId ?? null;
  const holdWindow = manifest.hold.window;
  const typeAOnly = typeAOnlyActions(manifest);
  const levelKeys = manifest.levelOrder;

  const engine = {
    state: STATES.BOOT,
    stateHistory: [STATES.BOOT],
    seed,
    manifest,
    sessionId,
    levelKey: null,
    level: null,
    effectiveSequence: [],
    stepIndex: 0,
    errorCount: 0,
    completedActions: [],
    components: initialComponents(),
    timer: null,
    levelsCompleted: [],
    sessionIncomplete: false,
    tutorialSegment: 0, // B4: segmento del tutorial guiado (1..N, manifest tutorial.segments)
    tutorialReplayCount: 0, // B4: Doc 2 §18 tutorial_replay_count (INPUT_RESTART_TUTORIAL)
    integrity: {
      blurCount: 0,
      totalBlurMs: 0,
      inputDuringLockCount: 0,
      misclickCount: 0,
      technicalAbortCount: 0,
      unexpectedStateTransitionCount: 0,
    },
    hold: { downAt: null, buttonId: null },
    lastBlurAt: null,
  };

  function enterState(next) {
    engine.state = next;
    engine.stateHistory.push(next);
  }

  function requireState(...allowed) {
    if (allowed.includes(engine.state)) return true;
    engine.integrity.unexpectedStateTransitionCount += 1;
    return false;
  }

  function resetLevelRuntime() {
    engine.stepIndex = 0;
    engine.errorCount = 0;
    engine.completedActions = [];
    engine.components = initialComponents();
    engine.hold.downAt = null;
    engine.hold.buttonId = null;
  }

  function startLevelRuntime(key) {
    engine.levelKey = key;
    engine.level = buildLevelSpec(key, manifest);
    engine.effectiveSequence = engine.level.effectiveSequence;
    resetLevelRuntime();
    engine.timer = createBombTimer({
      timeLimitMs: engine.level.timeLimitMs,
      now,
      warningRemainingPct: manifest.timer.warningRemainingPct,
      criticalRemainingMs: manifest.timer.criticalRemainingMs,
    });
  }

  // ---------------- Sesión / tutorial ----------------

  engine.beginSession = function beginSession() {
    if (!requireState(STATES.BOOT)) return { ok: false, reason: 'INVALID_STATE' };
    log('SESSION_START', {
      session_id: sessionId,
      build_version: manifest.buildVersion,
      config_version: manifest.configVersion,
      rule_manifest_version: manifest.manifestVersion,
      seed,
    });
    enterState(STATES.TUTORIAL_INTRO);
    return { ok: true };
  };

  engine.startTutorial = function startTutorial() {
    if (!requireState(STATES.TUTORIAL_INTRO)) return { ok: false, reason: 'INVALID_STATE' };
    engine.tutorialSegment = 1;
    startLevelRuntime('tutorial');
    enterState(STATES.TUTORIAL_PLAY);
    log('LEVEL_START', {
      level: 0,
      bomb_type: engine.level.bombType,
      seq_ids: engine.level.sequenceIds,
      seed,
      evaluated: false,
    });
    log('INSTRUCTIONS_SHOW', { exposure_ms: null, tutorial: true, segment: 1 });
    log('TUTORIAL_SEGMENT', { segment: 1, mode: manifest.tutorial.segments[0].mode, tutorial: true, evaluated: false });
    return { ok: true };
  };

  /**
   * B4: avance a la siguiente porción del tutorial guiado (Doc 2 §4.2: T4 en panel
   * fresh; T5 = lectura → delay breve → ejecución sin manual). Reinicia el runtime del
   * nivel tutorial (sin estado físico heredado — Decisión B4 #1) y queda en el estado
   * que el modo del segmento exige. Todo derivado del manifest `tutorial.segments`
   * (DoD §16.2: nada de segmentación codificada en el motor fuera del manifest).
   */
  function advanceTutorialSegment() {
    const segs = manifest.tutorial.segments;
    engine.tutorialSegment += 1;
    const seg = segs[engine.tutorialSegment - 1];
    startLevelRuntime('tutorial'); // panel fresh
    if (seg.mode === 'memory') {
      // T5: lectura fija (INSTRUCTION_ENCODING con exposición) → delay breve →
      // ejecución. Reutiliza el flujo de encoding/delay del motor (eventos §11).
      engine.level = Object.freeze({ ...engine.level, exposureMs: seg.readMs, delayMs: seg.delayMs });
      enterState(STATES.INSTRUCTION_ENCODING);
      engine.encodingEndAt = now() + seg.readMs;
      log('INSTRUCTIONS_SHOW', { exposure_ms: seg.readMs, tutorial: true, segment: engine.tutorialSegment });
    } else {
      enterState(STATES.TUTORIAL_PLAY);
      log('INSTRUCTIONS_SHOW', { exposure_ms: null, tutorial: true, segment: engine.tutorialSegment });
    }
    log('TUTORIAL_SEGMENT', {
      segment: engine.tutorialSegment,
      mode: seg.mode,
      tutorial: true,
      evaluated: false,
    });
    return { ok: true, reason: 'TUTORIAL_SEGMENT', segment: engine.tutorialSegment };
  }

  /**
   * B4: replay del tutorial (Doc 1 §5.1 INPUT_RESTART_TUTORIAL; §10.1 "repetir
   * tutorial sin incluir sus datos en scoring"; Doc 2 §18 tutorial_replay_count).
   * Válido SOLO durante el tutorial (cualquier estado con levelKey 'tutorial'):
   * segmento 1, panel fresh, contador incrementado. Fuera del tutorial →
   * INVALID_STATE (no interfiere con la evaluación).
   */
  engine.restartTutorial = function restartTutorial() {
    const inTutorial = engine.levelKey === 'tutorial' && (
      engine.state === STATES.TUTORIAL_PLAY
      || engine.state === STATES.INSTRUCTION_ENCODING
      || engine.state === STATES.BLIND_DELAY
      || engine.state === STATES.EXECUTION
      || engine.state === STATES.LEVEL_SUCCESS
    );
    if (!inTutorial) return { ok: false, reason: 'INVALID_STATE' };
    engine.tutorialReplayCount += 1;
    engine.tutorialSegment = 1;
    startLevelRuntime('tutorial');
    enterState(STATES.TUTORIAL_PLAY);
    log('TUTORIAL_REPLAY', { count: engine.tutorialReplayCount, tutorial: true, evaluated: false });
    log('INSTRUCTIONS_SHOW', { exposure_ms: null, tutorial: true, segment: 1 });
    return { ok: true, reason: 'TUTORIAL_RESTART' };
  };

  // ---------------- Flujo por nivel ----------------

  engine.startLevelExecution = function startLevelExecution() {
    if (!requireState(STATES.LEVEL_INTRO)) return { ok: false, reason: 'INVALID_STATE' };
    enterState(STATES.INSTRUCTION_ENCODING);
    engine.encodingEndAt = engine.level.exposureMs != null ? now() + engine.level.exposureMs : null;
    log('INSTRUCTIONS_SHOW', { exposure_ms: engine.level.exposureMs });
    return { ok: true };
  };

  engine.continueEncoding = function continueEncoding() {
    if (!requireState(STATES.INSTRUCTION_ENCODING)) return { ok: false, reason: 'INVALID_STATE' };
    return engine.hideInstructions('continue');
  };

  engine.hideInstructions = function hideInstructions(reason) {
    if (!requireState(STATES.INSTRUCTION_ENCODING)) return { ok: false, reason: 'INVALID_STATE' };
    log('INSTRUCTIONS_HIDE', { reason });
    if (engine.level.delayMs > 0) {
      enterState(STATES.BLIND_DELAY);
      engine.delayEndAt = now() + engine.level.delayMs;
      log('BLACK_SCREEN_START', { duration_ms: engine.level.delayMs });
    } else {
      engine.beginExecution();
    }
    return { ok: true };
  };

  engine.endDelay = function endDelay() {
    if (!requireState(STATES.BLIND_DELAY)) return { ok: false, reason: 'INVALID_STATE' };
    log('BLACK_SCREEN_END', {});
    engine.beginExecution();
    return { ok: true };
  };

  engine.beginExecution = function beginExecution() {
    enterState(STATES.EXECUTION);
    engine.executionStartAt = now();
    log('EXECUTION_START', { time_limit_s: engine.level.timeLimitMs != null ? engine.level.timeLimitMs / 1000 : null });
    engine.timer.start();
  };

  engine.acknowledgeResult = function acknowledgeResult() {
    if (!requireState(STATES.LEVEL_SUCCESS, STATES.LEVEL_FAIL)) return { ok: false, reason: 'INVALID_STATE' };
    enterState(STATES.LEVEL_RESULT);
    return { ok: true };
  };

  engine.continueFromResult = function continueFromResult() {
    if (!requireState(STATES.LEVEL_RESULT, STATES.TUTORIAL_RESULT)) return { ok: false, reason: 'INVALID_STATE' };
    const idx = levelKeys.indexOf(engine.levelKey);
    const nextKey = idx >= 0 ? levelKeys[idx + 1] : null;
    if (!nextKey) {
      finishSession();
      return { ok: true };
    }
    enterState(STATES.TRANSITION);
    log('NEXT_LEVEL', { next_level: nextKey === 'tutorial' ? 0 : nextKey });
    // TRANSITION es momentáneo en el motor: la pantalla de transición (copy "Antes de Lx",
    // Doc 2 §11) y la de LEVEL_INTRO se renderizan juntas por la UI (B3).
    startLevelRuntime(nextKey);
    enterState(STATES.LEVEL_INTRO);
    log('LEVEL_START', {
      level: nextKey === 'tutorial' ? 0 : nextKey,
      bomb_type: engine.level.bombType,
      seq_ids: engine.level.sequenceIds,
      seed,
      evaluated: engine.level.evaluated,
    });
    return { ok: true };
  };

  function finishSession() {
    enterState(STATES.SESSION_COMPLETE);
    log('SESSION_COMPLETE', { levels_completed: engine.levelsCompleted });
  }

  // ---------------- Tick del host (reloj falso en tests) ----------------

  /**
   * La UI llama `tick()` por frame. Gestiona los expiratorios del motor con el reloj
   * inyectado: fin de exposición, fin de delay, timeout de ejecución (Doc 2 §19: "el reloj
   * lógico manda"). Devuelve eventos generados por el tick (para host reactivos).
   */
  engine.tick = function tick() {
    const fired = [];
    const t = now();
    if (engine.state === STATES.INSTRUCTION_ENCODING && engine.encodingEndAt != null && t >= engine.encodingEndAt) {
      fired.push(engine.hideInstructions('exposure_elapsed'));
    } else if (engine.state === STATES.BLIND_DELAY && engine.delayEndAt != null && t >= engine.delayEndAt) {
      fired.push(engine.endDelay());
    } else if (engine.state === STATES.EXECUTION && engine.timer.isExpired()) {
      fired.push(engine.failLevel('TIMEOUT'));
    }
    return fired;
  };

  // ---------------- Input gate + acciones ----------------

  function actionEventName(observed) {
    if (observed.kind === 'SWITCH') return 'ACTION_SWITCH';
    if (observed.kind === 'WIRE') return 'ACTION_WIRE_CUT';
    if (observed.kind === 'BUTTON' && observed.phase === 'DOWN') return 'ACTION_BUTTON_DOWN';
    return 'ACTION_BUTTON_UP';
  }

  /**
   * Punto de entrada de inputs sobre el panel (spec §5.1). Devuelve el veredicto del input
   * gate para que la UI decida feedback físico (sin revelar corrección en evaluación).
   *
   * `observed`:
   *  - { kind:'SWITCH', id, from, to } (valida flanco OFF→ON, spec §8.3)
   *  - { kind:'WIRE', id, op:'CUT' } (corte irreversible, spec §8.3)
   *  - { kind:'BUTTON', id, phase:'DOWN' } / { kind:'BUTTON', id, phase:'UP' }
   *    (duración canónica medida con el reloj del motor; `holdMs` observable solo se registra)
   */
  engine.action = function action(observed) {
    const open = engine.state === STATES.EXECUTION || engine.state === STATES.TUTORIAL_PLAY;
    if (!open) {
      // QA-08: ignorado físicamente + INPUT_DURING_LOCK (sin conteo de errores ni penalización).
      engine.integrity.inputDuringLockCount += 1;
      if (observed?.kind === 'BUTTON') {
        const phase = observed.phase === 'DOWN' ? 'DOWN' : 'UP';
        log(phase === 'DOWN' ? 'ACTION_BUTTON_DOWN' : 'ACTION_BUTTON_UP', {
          id: observed.id,
          valid: false,
          reason: 'INPUT_DURING_LOCK',
        });
      } else {
        const norm = normalizeObservedAction({
          kind: observed?.kind, id: observed?.id, op: observed?.op, to: observed?.to,
        });
        if (norm) {
          log(actionEventName(norm), { id: norm.id, valid: false, reason: 'INPUT_DURING_LOCK' });
          log('STEP_ERROR', {
            expected: null,
            observed: normStepId(norm),
            error_class: 'INPUT_DURING_LOCK',
            penalizes: false,
          });
        } else {
          log('STEP_ERROR', {
            expected: null,
            observed: 'UNKNOWN',
            error_class: 'INPUT_DURING_LOCK',
            penalizes: false,
          });
        }
      }
      return { ok: true, accepted: false, reason: 'INPUT_DURING_LOCK' };
    }

    // Botón: DOWN/UP separados (hold canónico por reloj del motor, Doc 2 §19: no heredar hold
    // en transiciones; si el nivel terminó, el hold en curso se cancela silenciosamente).
    if (observed?.kind === 'BUTTON') {
      return engine.buttonAction(observed.id, observed.phase === 'DOWN' ? 'DOWN' : 'UP', observed.holdMs);
    }

    const norm = normalizeObservedAction(observed);
    if (!norm) return { ok: false, accepted: false, reason: 'INVALID_ACTION' };

    const expected = engine.effectiveSequence[engine.stepIndex] ?? null;
    const verdict = classifyAction(norm, classifyCtx());

    if (norm.kind === 'SWITCH') {
      // El estado físico solo cambia en edges válidos del input real (la UI manda from/to).
      if (norm.to === 'ON' || norm.to === 'OFF') {
        engine.components.switches[norm.id] = norm.to === 'ON' ? 'ON' : 'OFF';
      }
      log('ACTION_SWITCH', { id: norm.id, from: norm.from ?? null, to: norm.to ?? null, valid: verdict.match === BOMB_MATCH.EXACT_MATCH });
    } else if (norm.kind === 'WIRE') {
      // Corte irreversible dentro del nivel (spec §8.3): se refleja en el estado físico
      // aunque la clasificación sea error (Doc 2 §19: "Cable puede mostrar corte físico;
      // lógica aplica penalización").
      engine.components.wires[norm.id] = 'CUT';
      log('ACTION_WIRE_CUT', { id: norm.id, valid: verdict.match === BOMB_MATCH.EXACT_MATCH });
    }

    return settleAction(norm, verdict, expected);
  };

  function normStepId(norm) {
    if (norm.kind === 'SWITCH') return `SWITCH_${norm.id}_${norm.to ?? '?'}`;
    if (norm.kind === 'WIRE') return `CUT_${norm.id}`;
    if (norm.kind === 'BUTTON') return `HOLD_${norm.id}`;
    return 'UNKNOWN';
  }

  /** Componentes consumidos/resueltos en el nivel (spec §8.3) para el validator. */
  function buildConsumed() {
    return {
      wires: new Set(
        Object.entries(engine.components.wires)
          .filter(([, s]) => s === 'CUT')
          .map(([id]) => id),
      ),
      switches: new Set(engine.completedActions.filter((a) => a.kind === 'SWITCH').map((a) => a.id)),
      buttons: new Set(engine.completedActions.filter((a) => a.kind === 'BUTTON').map((a) => a.id)),
    };
  }

  function classifyCtx() {
    return {
      effectiveSequence: engine.effectiveSequence,
      stepIndex: engine.stepIndex,
      holdWindow,
      typeAOnly: engine.level?.bombType === 'B' ? typeAOnly : null,
      consumed: buildConsumed(),
    };
  }

  engine.buttonAction = function buttonAction(id, phase, observedHoldMs) {
    const open = engine.state === STATES.EXECUTION || engine.state === STATES.TUTORIAL_PLAY;
    if (!open) {
      // Input gate (defensa para llamados directos fuera de action(), p.ej. en tests/dev):
      // mismo tratamiento INPUT_DURING_LOCK, sin recursión (action() solo delega si open).
      return engine.action({ kind: 'BUTTON', id, phase, holdMs: observedHoldMs });
    }
    if (phase === 'DOWN') {
      if (engine.hold.downAt != null) {
        // Segundo DOWN mientras ya hay hold: ignorar (UI debe evitarlo; determinismo).
        log('ACTION_BUTTON_DOWN', { id, valid: false, reason: 'ALREADY_PRESSED' });
        return { ok: true, accepted: false, reason: 'ALREADY_PRESSED' };
      }
      engine.hold.downAt = now();
      engine.hold.buttonId = id;
      engine.components.buttons[id] = 'PRESSED';
      log('ACTION_BUTTON_DOWN', { id, valid: null });
      return { ok: true, accepted: true, reason: 'HOLD_STARTED' };
    }
    // phase === 'UP'
    if (engine.hold.downAt == null || engine.hold.buttonId !== id) {
      log('ACTION_BUTTON_UP', { id, hold_ms: null, valid: false, reason: 'NO_HOLD_IN_FLIGHT' });
      return { ok: true, accepted: false, reason: 'NO_HOLD_IN_FLIGHT' };
    }
    const holdMs = Math.max(0, now() - engine.hold.downAt);
    engine.hold.downAt = null;
    engine.hold.buttonId = null;
    engine.components.buttons[id] = 'IDLE';
    log('ACTION_BUTTON_UP', {
      id,
      hold_ms: Math.round(holdMs),
      observed_hold_ms: typeof observedHoldMs === 'number' ? Math.round(observedHoldMs) : null,
      valid: null, // se resuelve en settleAction
    });
    const norm = { kind: 'BUTTON', id, op: 'HOLD', holdMs };
    const expected = engine.effectiveSequence[engine.stepIndex] ?? null;
    const verdict = classifyAction(norm, classifyCtx());
    return settleAction(norm, verdict, expected);
  };

  function settleAction(norm, verdict, expected) {
    if (verdict.match === BOMB_MATCH.EXACT_MATCH) {
      const step = expected;
      const meta = { step_id: step.stepId, serial_pos: verdict.stepPosition + 1 };
      if (verdict.holdMs != null) meta.hold_ms = Math.round(verdict.holdMs); // spec §8.3: duración exacta aunque aceptada
      log('STEP_SUCCESS', meta);
      engine.completedActions.push({
        kind: norm.kind, id: norm.id, op: norm.op ?? (norm.to === 'ON' ? 'ON' : null), to: norm.to ?? null,
      });
      engine.stepIndex += 1;
      if (engine.stepIndex >= engine.effectiveSequence.length) {
        // B4: en el tutorial guiado, completar el runtime de un segmento NO termina la
        // práctica: avanza al siguiente segmento (T4 en panel fresh / T5 lectura+delay),
        // salvo el último, que cierra con LEVEL_SUCCESS (Doc 2 §4.2 criterios de avance).
        if (engine.levelKey === 'tutorial' && engine.level && !engine.level.evaluated) {
          const segs = manifest.tutorial.segments;
          if (engine.tutorialSegment < segs.length) return advanceTutorialSegment();
        }
        return finishLevelSuccess();
      }
      return { ok: true, accepted: true, reason: 'STEP_SUCCESS', stepId: step.stepId };
    }

    const errorClass = verdict.errorClass;
    log('STEP_ERROR', {
      expected: expected ? expected.stepId : null,
      observed: normStepId(norm),
      error_class: errorClass,
      step_position: verdict.stepPosition ?? null,
      ...(verdict.holdMs != null ? { hold_ms: Math.round(verdict.holdMs) } : {}),
      penalizes: BOMB_ERROR_CLASSES[errorClass]?.penalizes ?? false,
    });

    if (!engine.level?.evaluated) {
      // Tutorial: se registra pero no puntúa (DoD §16.2).
      return { ok: true, accepted: false, reason: 'STEP_ERROR', errorClass, tutorial: true };
    }

    engine.errorCount += 1;
    const pct = manifest.penalty.errorTimePenaltyPct;
    const removed = engine.timer.applyPenalty(pct);
    log('TIME_PENALTY', { pct, ms_removed: Math.round(removed) });

    if (engine.errorCount >= manifest.maxErrors) {
      engine.failLevel('MAX_ERRORS');
      return { ok: true, accepted: false, reason: 'LEVEL_FAIL', errorClass, failReason: 'MAX_ERRORS' };
    }
    if (engine.timer.isExpired()) {
      engine.failLevel('TIMEOUT');
      return { ok: true, accepted: false, reason: 'LEVEL_FAIL', errorClass, failReason: 'TIMEOUT' };
    }
    return { ok: true, accepted: false, reason: 'STEP_ERROR', errorClass };
  }

  function finishLevelSuccess() {
    const elapsed = engine.timer.isRunning() ? engine.timer.elapsedMs() : 0;
    engine.timer.stop();
    enterState(STATES.LEVEL_SUCCESS);
    if (engine.level?.evaluated) engine.levelsCompleted.push(engine.levelKey);
    log('LEVEL_SUCCESS', {
      level: engine.levelKey,
      elapsed_ms: Math.round(elapsed ?? 0),
      errors: engine.errorCount,
      evaluated: engine.level?.evaluated ?? false,
    });
    return { ok: true, accepted: true, reason: 'LEVEL_SUCCESS' };
  }

  engine.failLevel = function failLevel(reason) {
    if (!requireState(STATES.EXECUTION, STATES.TUTORIAL_PLAY)) return { ok: false, reason: 'INVALID_STATE' };
    if (reason === 'MAX_ERRORS' || reason === 'TIMEOUT') {
      if (engine.level && !engine.level.evaluated) {
        // El tutorial no falla por errores ni por timeout (sin presión, DoD §16.2).
        return { ok: false, reason: 'TUTORIAL_NOT_EVALUATED' };
      }
    }
    const elapsed = engine.timer.isRunning() ? engine.timer.elapsedMs() : 0;
    engine.timer.stop();
    engine.hold.downAt = null; // Doc 2 §19: no heredar hold en transiciones
    engine.hold.buttonId = null;
    enterState(STATES.LEVEL_FAIL);
    const meta = {
      reason,
      level: engine.levelKey,
      elapsed_ms: Math.round(elapsed ?? 0),
      errors: engine.errorCount,
    };
    if (reason === 'TIMEOUT') {
      meta.omitted_steps = engine.effectiveSequence
        .slice(engine.stepIndex)
        .map((s) => s.stepId); // taxonomía OMISSION (spec §13)
      meta.omission_error_class = 'OMISSION';
    }
    log('LEVEL_FAIL', meta);
    return { ok: true, reason };
  };

  engine.tutorialComplete = function tutorialComplete() {
    if (engine.state !== STATES.LEVEL_SUCCESS || engine.levelKey !== 'tutorial') {
      return { ok: false, reason: 'INVALID_STATE' };
    }
    enterState(STATES.TUTORIAL_RESULT);
    return { ok: true };
  };

  // ---------------- Integridad (spec §14, QA-09/10) ----------------

  engine.focusChange = function focusChange(visible) {
    log('FOCUS_CHANGE', { visible: !!visible, blur_count: engine.integrity.blurCount });
    if (visible) {
      if (engine.lastBlurAt != null) {
        engine.integrity.totalBlurMs += Math.max(0, now() - engine.lastBlurAt);
        engine.lastBlurAt = null;
      }
      return { ok: true };
    }
    engine.integrity.blurCount += 1;
    engine.lastBlurAt = now();
    return { ok: true };
  };

  engine.recordMisclick = function recordMisclick(componentId) {
    // Ruido motor (spec §13): se registra para analítica de diseño (Doc 2 §18
    // misclick_rate_by_component); NUNCA penaliza.
    engine.integrity.misclickCount += 1;
    log('MISCLICK_PROXIMAL', { component_id: componentId ?? null, error_class: 'MISCLICK_PROXIMAL', penalizes: false });
    return { ok: true };
  };

  engine.recordTechnicalAbort = function recordTechnicalAbort(reason) {
    // Doc 2 §13.2 / QA-10: recarga/interrupción técnica => sesión marcada incompleta,
    // nunca se reanuda silenciosamente un nivel evaluativo.
    engine.integrity.technicalAbortCount += 1;
    engine.sessionIncomplete = true;
    log('TECHNICAL_ABORT', { reason: reason ?? 'unknown', error_class: 'TECHNICAL_ABORT' });
    return { ok: true };
  };

  // ---------------- Resumen (para B5: payload sesión, spec §19) ----------------

  engine.sessionSummary = function sessionSummary() {
    return {
      exp_id: manifest.experienceId,
      build_version: manifest.buildVersion,
      config_version: manifest.configVersion,
      rule_manifest_version: manifest.manifestVersion,
      session_id: sessionId,
      seed,
      state: engine.state,
      levels_completed: engine.levelsCompleted,
      session_incomplete: engine.sessionIncomplete,
      tutorial_replay_count: engine.tutorialReplayCount, // B4: Doc 2 §18 (analítica de diseño)
      integrity: { ...engine.integrity },
    };
  };

  return engine;
}
