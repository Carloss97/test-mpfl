// bombGame.jsx — EXP-BOMB-001 · B2: panel + HUD + a11y · B3: niveles 1-4 + fases.
//
// Especificación (ley): docs/spec/EXP-BOMB-001/ (Draft v1.1.0):
//   Doc 1 §4 (paradigma/fases), §5 (inputs), §6 (módulos: Feedback Controller),
//   §7 (máquina de estados), §11 (diccionario de eventos), §13 (taxonomía),
//   §15 (requisitos no funcionales: determinismo, rendimiento), §16 (QA-01..10 + DoD).
//   Doc 2 §5 (arquitectura de pantallas), §6 (HUD), §7 (componentes), §8 (matriz de
//   niveles), §10 (timing/penalizaciones: countdown 0.5 s, delay, time limit),
//   §11 (UX copy completo), §12 (feedback), §14 (accesibilidad), §15 (responsive),
//   §16 (animaciones), §17 (assets), §19 (casos límite), §20 (DoD visual).
//
// Reglas duras heredadas (DoD §16.2):
//   - La UI consume el motor (bombEngine.js) + el manifest (bombRules.js): el estado
//     físico del panel ES `engine.components` (single source of truth); ninguna regla
//     de secuencia/transformación vive en este archivo.
//   - Mundo NO tokenizado (H4.5): la paleta táctico/industrial vive en bomb.css; solo
//     el chrome compartido (pills .task-title/.task-progress, pips, sfx-toggle, footer)
//     usa tokens --k-* / overrides para superficie oscura.
//   - Sin feedback que revele la respuesta en evaluación: los STEP_ERROR renderizan
//     LED + SFX + shake + copy genérico (manifest intro.penaltyEs); nunca el paso
//     esperado. En práctica (tutorial, no evaluado) igual: sin revelar el orden.
//
// Alcance B3 (card t_7c5cd0c0):
//   - Flujo evaluado completo: práctica → "Comenzar evaluación" → L1..L4 →
//     SESSION_COMPLETE → "Finalizar" (onComplete con sessionSummary agregado).
//   - Fases por nivel (Doc 1 §4 / Doc 2 §5): LEVEL_INTRO (regla nueva destacada +
//     copy "Antes de Lx"), countdown 0.5 s (Doc 2 §10: no consume exposición),
//     INSTRUCTION_ENCODING (manual; exposición libre L1 / 3 s / 2 s / 2 s; barra de
//     exposición; pre-fade "manual hide" 150-250 ms §16), BLIND_DELAY (pantalla
//     oscura con estática sutil §16/§14, inputs bloqueados → INPUT_DURING_LOCK QA-08,
//     sin pistas residuales del manual), EXECUTION (timer vivo + beeps §10.1),
//     penalty state (LED + shake + "Secuencia incorrecta. Tiempo penalizado."),
//     success (LED verde, timer congelado, microresumen neutro), fail (razón general
//     sin revelar respuesta), TRANSITION (copy "Antes de Lx" en la intro; decisión
//     B1 #7), aviso MODEL B antes de L4, SESSION_COMPLETE ("Simulación finalizada...").
//   - DoD §16.2: timer visual vs lógico ≤100 ms (display a resolución de 100 ms desde
//     el MISMO reloj lógico del motor — un solo reloj, sin timers visuales propios);
//     no hay camino de UI que muestre el manual durante EXECUTION en niveles 2-4.
//   - QA-09: blur siempre registrado (FOCUS_CHANGE), timer de ejecución no se pausa.
//   - QA-10: pagehide/beforeunload en nivel evaluado → recordTechnicalAbort (sesión
//     incompleta; no reanudar silenciosamente).
//
// Fuera de B3 (siguen las cards de la cadena): tutorial guiado T1-T5 + bienvenida
// completa §4.1/§4.3 (B4), telemetría final + registro en batería + ES/EN diccionario
// §11 completo (B5), constructo + reporte (B6).

import React, { useCallback, useEffect, useRef, useState } from 'react';
import GameRuntime from '../../GameRuntime.jsx';
import { useLanguage } from '../../../i18n/LanguageContext.jsx';
import { playSfx, getGameSfxEnabled } from '../originalGameSfx.js';
import {
  BOMB_COMPONENTS,
  BOMB_RULE_MANIFEST,
  buildManualText,
  newRuleForLevel,
} from './bombRules.js';
import { BOMB_STATES, createBombEngine } from './bombEngine.js';
import './bomb.css';

export const BOMB_GAME_DEFINITION = Object.freeze({
  id: 'bomb_defusal',
  label: 'Desactivación',
  difficulty: 'procedural_memory',
});

/** Spec Doc 2 §15: <1024 px de ancho = no recomendado para evaluación v1 → aviso. */
export const BOMB_VIEWPORT_WARNING_MIN_WIDTH = 1024;

/**
 * Countdown de inicio de encoding (spec Doc 2 §10: "Inicio encoding: Countdown de
 * 0.5 s opcional — evita que el usuario pierda exposición por transición"). La UI
 * hace el beat de 500 ms ANTES de llamar `startLevelExecution()`: el reloj de
 * exposición del motor arranca exactamente cuando el manual aparece (la exposición
 * no se recorta por la transición).
 */
export const BOMB_ENCODING_COUNTDOWN_MS = 500;

/**
 * Umbral de pre-fade del manual (spec Doc 2 §16 "Manual hide 150-250 ms,
 * linear/ease-in, Finaliza antes de iniciar delay"): 200 ms antes del fin de la
 * exposición, el contenido del manual empieza a desvanecerse (clase CSS); el
 * `INSTRUCTIONS_HIDE` lo dispara el motor en su tick exacto (el reloj lógico manda).
 */
export const BOMB_MANUAL_PREHIDE_MS = 200;

const DEFAULT_NOW = () => (typeof performance !== 'undefined' && typeof performance.now === 'function'
  ? performance.now()
  : Date.now());

const SWITCH_STATE_LABELS = Object.freeze({ ON: 'ON', OFF: 'OFF' });
const WIRE_STATE_LABELS = Object.freeze({ INTACT: 'INTACT', CUT: 'CUT' });
const WIRE_DISPLAY = Object.freeze({
  WIRE_RED: Object.freeze({ css: 'red', letter: 'R', colorEs: 'rojo', colorEn: 'red' }),
  WIRE_BLUE: Object.freeze({ css: 'blue', letter: 'B', colorEs: 'azul', colorEn: 'blue' }),
  WIRE_GREEN: Object.freeze({ css: 'green', letter: 'G', colorEs: 'verde', colorEn: 'green' }),
  WIRE_YELLOW: Object.freeze({ css: 'yellow', letter: 'Y', colorEs: 'amarillo', colorEn: 'yellow' }),
});
const SWITCH_DISPLAY = Object.freeze({ SW_1: 'SW1', SW_2: 'SW2', SW_3: 'SW3' });
const SWITCH_NUMBER = Object.freeze({ SW_1: 1, SW_2: 2, SW_3: 3 });
const RING_CIRCUMFERENCE = 289; // 2π·46 (viewBox 100, r=46)

/**
 * Traducciones EN del copy de UI (B5 completa el diccionario §11; el ES fuente de
 * verdad vive en el manifest — Doc 2 §11/§9.2). Solo copy de la capa B3.
 */
const BOMB_TRANSITION_EN = Object.freeze({
  1: 'First you will learn the base protocol of MODEL A.',
  2: 'A new instruction will be added. The previous rules remain in effect.',
  3: 'The sequence will be longer and you will have less time to remember it.',
  4: 'ATTENTION: this artifact is MODEL B. Some instructions change. Review the protocol before continuing.',
});
const BOMB_RULE_EN = Object.freeze({
  A1: 'Activate SWITCH 1.',
  A2: 'Cut the RED WIRE.',
  B1: 'Hold the YELLOW BUTTON down for 2 seconds.',
  C1: 'Cut the GREEN WIRE.',
});
const BOMB_TYPEB_NOTICE_EN =
  'ATTENTION - MODEL B: Where the protocol says SWITCH 1, use SWITCH 3. '
  + 'Where it says RED WIRE, cut the BLUE WIRE. The other instructions do not change.';

function isPanelOpenState(state) {
  return state === BOMB_STATES.EXECUTION || state === BOMB_STATES.TUTORIAL_PLAY;
}

/**
 * Decisión pura del beep de temporizador (spec Doc 2 §10.1):
 *   >30% restante → beep discreto cada 2 s (segundos pares);
 *   30%–10%       → beep cada 1 s;
 *   <10% o últimos 3 s → beep corto y marcado (bomb_beep_hi) cada 1 s.
 * El audio es opcional y NUNCA el único canal de información (§14): todo estado
 * crítico está también en el timer visual (fases normal/warning/critical).
 *
 * @returns {{play: 'bomb_beep'|'bomb_beep_hi'|null, second: number|null}}
 */
export function bombTimerBeepDecision(remainingMs, timeLimitMs, lastBeepSecond) {
  if (typeof remainingMs !== 'number' || !Number.isFinite(remainingMs) || remainingMs <= 0 || !timeLimitMs) {
    return { play: null, second: null };
  }
  const fraction = remainingMs / timeLimitMs;
  const second = Math.ceil(remainingMs / 1000);
  if (fraction < 0.10 || remainingMs <= 3000) {
    return { play: second !== lastBeepSecond ? 'bomb_beep_hi' : null, second };
  }
  if (fraction <= 0.30) {
    return { play: second !== lastBeepSecond ? 'bomb_beep' : null, second };
  }
  return { play: second !== lastBeepSecond && second % 2 === 0 ? 'bomb_beep' : null, second };
}

/**
 * Formato del timer visual: 'MM:SS.d' a resolución de 100 ms (DoD §16.2: el timer
 * visual y el reloj lógico nunca difieren >100 ms). El display es una función pura
 * del reloj lógico del motor (mismo `now` inyectado; se re-renderiza por frame) —
 * no existe un segundo reloj visual. `Math.round(remaining/100)*100` acota la
 * divergencia a ±50 ms de redondeo (+≤1 frame de render, ~17 ms) < 100 ms.
 * `null` (sin presión temporal: tutorial/BOOT) → '—:—'.
 */
export function formatBombTimer(remainingMs) {
  if (typeof remainingMs !== 'number' || !Number.isFinite(remainingMs)) return '—:—';
  const clamped = Math.max(0, remainingMs);
  const tenths = Math.round(clamped / 100);
  const minutes = Math.floor(tenths / 600);
  const sec = Math.floor((tenths % 600) / 10);
  const tenth = (tenths % 600) % 10;
  return `${String(minutes).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${tenth}`;
}

/** Invierte `formatBombTimer` para verificación/telemetría (ms representados). */
export function parseBombTimerText(text) {
  if (typeof text !== 'string') return null;
  const match = /^(\d+):(\d{2})\.(\d)$/.exec(text);
  if (!match) return null;
  return (Number(match[1]) * 60 + Number(match[2])) * 1000 + Number(match[3]) * 100;
}

/**
 * Snapshot de los valores VISUALES que el bucle rAF puede cambiar (decisión de
 * re-render — degradación controlada, Doc 1 §15: el tick del motor sigue a 60 Hz
 * con el reloj real; React solo se re-renderiza cuando algo visible cambia):
 *   tenths  — timer a resolución de 100 ms (10 Hz)
 *   phase   — fase del timer / estado
 *   exposure— barra de exposición a pasos de 1 %
 *   prehide — flag de pre-fade del manual (§16)
 *   hold    — anillo de práctica a pasos de 1 % (solo TUTORIAL_PLAY)
 */
export function bombLoopSnapshot(engine, readNow) {
  const st = engine.state;
  const timer = engine.timer;
  const rem = timer ? timer.remainingMs() : null;
  const t = readNow();
  const lvl = engine.level;
  const encEnd = engine.encodingEndAt;
  return {
    tenths: typeof rem === 'number' ? Math.round(rem / 100) : null,
    phase: st === BOMB_STATES.EXECUTION && timer ? timer.phase() : st,
    exposure: st === BOMB_STATES.INSTRUCTION_ENCODING && lvl?.exposureMs != null && encEnd != null
      ? Math.max(0, Math.min(100, Math.round(((encEnd - t) / lvl.exposureMs) * 100)))
      : null,
    prehide: st === BOMB_STATES.INSTRUCTION_ENCODING && lvl?.exposureMs != null && encEnd != null
      ? ((encEnd - t) <= BOMB_MANUAL_PREHIDE_MS && (encEnd - t) > -1000)
      : null,
    hold: st === BOMB_STATES.TUTORIAL_PLAY && engine.hold.downAt != null
      ? Math.min(100, Math.max(0, Math.round(((t - engine.hold.downAt) / BOMB_RULE_MANIFEST.hold.targetMs) * 100)))
      : null,
  };
}

/**
 * Fase de display del timer (separa "no corriendo" de "congelado"):
 *   idle — sin límite (tutorial/BOOT, timeLimitMs null)
 *   ready — límite cargado pero ventana no iniciada (intro/encoding/delay)
 *   normal/warning/critical — ventana corriendo (EXECUTION; fases del motor)
 *   stopped — ventana terminada (LEVEL_SUCCESS/FAIL/SESSION_COMPLETE): congelado
 */
export function bombTimerDisplayPhase(state, timer) {
  if (!timer || timer.config.timeLimitMs === null) return 'idle';
  if (state === BOMB_STATES.EXECUTION) return timer.phase();
  if (state === BOMB_STATES.LEVEL_SUCCESS
    || state === BOMB_STATES.LEVEL_FAIL
    || state === BOMB_STATES.SESSION_COMPLETE) return 'stopped';
  return 'ready';
}

// Claves permitidas en la telemetría forward (diccionario §11 + §19 del manifest).
// Todo lo demás (p.ej. coordenadas, DOM, rostro) NUNCA sale por onGameEvent.
const BOMB_TELEMETRY_META_KEYS = new Set([
  'session_id', 'build_version', 'config_version', 'rule_manifest_version', 'seed',
  'level', 'bomb_type', 'seq_ids', 'evaluated', 'exposure_ms', 'reason', 'duration_ms',
  'time_limit_s', 'id', 'from', 'to', 'op', 'valid', 'hold_ms', 'observed_hold_ms',
  'step_id', 'serial_pos', 'expected', 'observed', 'error_class', 'step_position', 'penalizes',
  'pct', 'ms_removed', 'elapsed_ms', 'errors', 'omitted_steps', 'omission_error_class',
  'visible', 'blur_count', 'component_id', 'next_level', 'tutorial',
]);

function sanitizeBombMeta(meta = {}) {
  const out = {};
  for (const key of Object.keys(meta)) {
    if (!BOMB_TELEMETRY_META_KEYS.has(key)) continue;
    const value = meta[key];
    if (value === undefined || value === null) continue;
    out[key] = typeof value === 'object' ? JSON.stringify(value) : value;
  }
  return out;
}

const FALLBACK_COMPONENTS = Object.freeze({
  switches: Object.freeze({ SW_1: 'OFF', SW_2: 'OFF', SW_3: 'OFF' }),
  wires: Object.freeze({ WIRE_RED: 'INTACT', WIRE_BLUE: 'INTACT', WIRE_GREEN: 'INTACT', WIRE_YELLOW: 'INTACT' }),
  buttons: Object.freeze({ BTN_YELLOW: 'IDLE' }),
});

function BombInner({ emit, nowFn, seed, onComplete }) {
  const { t } = useLanguage();
  const nowRef = useRef(typeof nowFn === 'function' ? nowFn : null);
  useEffect(() => {
    nowRef.current = typeof nowFn === 'function' ? nowFn : null;
  }, [nowFn]);

  const readNow = useCallback(() => (nowRef.current ? nowRef.current() : DEFAULT_NOW()), []);
  const seedRef = useRef(typeof seed === 'number' ? seed : null);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  const engineRef = useRef(null);
  const [view, setView] = useState(0);
  const bump = useCallback(() => setView((v) => v + 1), []);
  const viewRef = useRef(0);
  viewRef.current = view;

  const [led, setLed] = useState('neutral');
  const ledFlashTimerRef = useRef(null);
  const [sparkWire, setSparkWire] = useState(null);
  const sparkTimerRef = useRef(null);
  const [shaking, setShaking] = useState(false);
  const shakeTimerRef = useRef(null);
  const [holdAccepted, setHoldAccepted] = useState(false);
  const acceptedTimerRef = useRef(null);
  const lastBeepSecondRef = useRef(null);

  // ---- Estados B3: fases de niveles ----
  const [countdown, setCountdown] = useState(false);
  const countdownTimerRef = useRef(null);
  const [penaltyNotice, setPenaltyNotice] = useState(false);
  const penaltyNoticeTimerRef = useRef(null);
  const [successMeta, setSuccessMeta] = useState(null); // { level, elapsed_ms, errors }
  const [failMeta, setFailMeta] = useState(null); // { level, reason: 'TIMEOUT'|'MAX_ERRORS' }

  const eventsRef = useRef([]); // B5: buffer reconstruible (t_ms relativo al inicio de sesión)
  const sessionAnchorRef = useRef(null);
  const emitRef = useRef(emit);
  useEffect(() => { emitRef.current = emit; }, [emit]);

  // ---- Feedback Controller (Doc 1 §6): eventos del motor → audio/visual/animación ----
  const scheduleLedReset = useCallback(() => {
    window.clearTimeout(ledFlashTimerRef.current);
    ledFlashTimerRef.current = window.setTimeout(() => {
      setLed((current) => (current === 'penalty' ? 'neutral' : current));
    }, 900);
  }, []);

  const flashSpark = useCallback((wireId) => {
    window.clearTimeout(sparkTimerRef.current);
    setSparkWire(wireId);
    sparkTimerRef.current = window.setTimeout(() => setSparkWire(null), 180);
  }, []);

  const flashShake = useCallback(() => {
    window.clearTimeout(shakeTimerRef.current);
    setShaking(true);
    shakeTimerRef.current = window.setTimeout(() => setShaking(false), 150);
  }, []);

  const flashHoldAccepted = useCallback(() => {
    window.clearTimeout(acceptedTimerRef.current);
    setHoldAccepted(true);
    acceptedTimerRef.current = window.setTimeout(() => setHoldAccepted(false), 300);
  }, []);

  const flashPenaltyNotice = useCallback(() => {
    window.clearTimeout(penaltyNoticeTimerRef.current);
    setPenaltyNotice(true);
    penaltyNoticeTimerRef.current = window.setTimeout(() => setPenaltyNotice(false), 1600);
  }, []);

  const applyFeedback = useCallback((event, meta, engine) => {
    const evaluated = Boolean(engine?.level?.evaluated);
    if (event === 'ACTION_SWITCH' && meta.from && meta.to && meta.from !== meta.to) {
      playSfx('bomb_switch'); // §12: click mecánico
    }
    if (event === 'ACTION_WIRE_CUT') {
      // §12 + pilar 3: feedback FÍSICO de la interacción (snip + chispa mínima),
      // sin revelar si la decisión fue cognitivamente correcta (valid es solo
      // telemetría; el LED/penalty llega por STEP_ERROR).
      playSfx('bomb_wire_cut');
      flashSpark(meta.id);
    }
    if (event === 'ACTION_BUTTON_DOWN' && meta.valid !== false) {
      playSfx('bomb_button'); // §12: click down
    }
    if (event === 'STEP_SUCCESS' && meta.step_id === 'HOLD_YELLOW_2000') {
      flashHoldAccepted(); // estado "accepted" del botón (§7), sin revelar más
    }
    if (event === 'STEP_ERROR') {
      if (meta.error_class === 'INPUT_DURING_LOCK') return; // §13/QA-08: ignorado físicamente
      setLed('penalty'); // §12: LED rojo (complementado con texto, nunca solo color)
      scheduleLedReset();
      playSfx('bomb_penalty'); // §12: alerta corta
      if (evaluated) flashShake(); // §12/§16: shake 100-150 ms solo en evaluación
      // copy genérico "Secuencia incorrecta. Tiempo penalizado." llega con TIME_PENALTY
      // (Doc 2 §11): aquí NO se revela el paso (pilar 4, §13.1).
    }
    if (event === 'TIME_PENALTY' && evaluated) {
      // Penalty state (Doc 2 §5): flash/LED/sonido + tiempo actualizado; el copy
      // genérico (manifest) va a la barra de estado mientras el nivel continúa.
      flashPenaltyNotice();
    }
    if (event === 'LEVEL_SUCCESS') {
      setLed('success'); // §12: LED verde + timer congelado (el motor detiene el timer)
      playSfx('bomb_success'); // §12: chime breve
    }
    if (event === 'LEVEL_FAIL') {
      setLed('fail'); // §12: panel se desactiva (baja saturación, CSS --fail)
      playSfx('bomb_fail'); // §12: tono grave breve
    }
  }, [flashHoldAccepted, flashPenaltyNotice, flashShake, flashSpark, scheduleLedReset]);

  const handleEngineEvent = useCallback((event, meta = {}) => {
    const engine = engineRef.current;
    const tms = readNow();
    if (sessionAnchorRef.current == null) sessionAnchorRef.current = tms;
    const sanitized = sanitizeBombMeta(meta);
    eventsRef.current.push({ t_ms: Math.max(0, Math.round(tms - sessionAnchorRef.current)), event, meta: sanitized });
    if (eventsRef.current.length > 400) eventsRef.current.splice(0, eventsRef.current.length - 400);
    const levelValue = engine?.level && typeof engine.level.level === 'number' ? engine.level.level : 0;
    // B3: capturar resultados evaluados (microresumen neutro / razón general del fail).
    if (event === 'LEVEL_SUCCESS' && Boolean(engine?.level?.evaluated)) {
      setSuccessMeta({ level: levelValue, elapsed_ms: meta.elapsed_ms ?? 0, errors: meta.errors ?? 0 });
    }
    if (event === 'LEVEL_FAIL' && Boolean(engine?.level?.evaluated)) {
      setFailMeta({ level: levelValue, reason: meta.reason ?? null });
    }
    // Forward privacy-safe (game_event_v1 vía GameRuntime.emit). La respuesta es
    // agregado del diccionario §11; nunca coordenadas/DOM/rostro.
    emitRef.current({
      eventType: 'response',
      trialId: meta.step_id ?? (meta.id ? `${event}:${meta.id}` : event),
      targetId: meta.id ?? meta.component_id ?? null,
      timestamp: tms,
      response: { bomb: { event, meta: sanitized } },
      gameState: { level: levelValue, difficulty: 'procedural_memory' },
    });
    applyFeedback(event, meta, engine);
    bump();
  }, [applyFeedback, bump, readNow]);

  const handleEngineEventRef = useRef(handleEngineEvent);
  useEffect(() => { handleEngineEventRef.current = handleEngineEvent; }, [handleEngineEvent]);

  const getEngine = useCallback(() => {
    if (!engineRef.current) {
      engineRef.current = createBombEngine({
        now: readNow,
        log: (event, meta) => handleEngineEventRef.current(event, meta),
        seed: seedRef.current,
      });
    }
    return engineRef.current;
  }, [readNow]);

  const engine = getEngine();
  const state = engine.state;
  const panelOpen = isPanelOpenState(state);
  const level = engine.level ?? null;
  const levelKey = engine.levelKey ?? null;
  const manifest = engine.manifest;
  const components = engine.components ?? FALLBACK_COMPONENTS;
  const model = level?.bombType ?? 'A';
  const holdPressed = components.buttons[BOMB_COMPONENTS.HOLD_BUTTON] === 'PRESSED';

  // ---- Controles: qué estados dejan el input FÍSICAMENTE habilitado ----
  // Encendido: TUTORIAL_PLAY y EXECUTION (el motor decide; la UI pinta).
  // Bloqueado con reenvío (INPUT_DURING_LOCK, QA-08/taxonomía §13): LEVEL_INTRO e
  //   INSTRUCTION_ENCODING — los controles quedan atenuados (cursor not-allowed) pero
  //   operables, para que el intento llegue al input gate del motor y se registre
  //   (Doc 1 §4: "input de bomba bloqueado"; §13: "Problema de control o bug UI").
  // Bloqueado duro (disabled + overlay): BOOT, TUTORIAL_INTRO/RESULT, BLIND_DELAY
  //   ("sin targets accionables", Doc 2 §5; el overlay captura el intento),
  //   resultados evaluados (overlay de success/fail), SESSION_COMPLETE.
  const tutorialSuccess = state === BOMB_STATES.LEVEL_SUCCESS && levelKey === 'tutorial';
  const controlsDisabled = state === BOMB_STATES.BOOT
    || state === BOMB_STATES.TUTORIAL_INTRO
    || state === BOMB_STATES.TUTORIAL_RESULT
    || state === BOMB_STATES.BLIND_DELAY
    || state === BOMB_STATES.LEVEL_RESULT
    || tutorialSuccess
    || (state === BOMB_STATES.LEVEL_SUCCESS && level?.evaluated)
    || (state === BOMB_STATES.LEVEL_FAIL && level?.evaluated)
    || state === BOMB_STATES.SESSION_COMPLETE;
  const controlsLockedVisual = !controlsDisabled && !panelOpen; // intro/encoding: atenuados

  // ---- Timer beeps §10.1 (solo con timer corriendo: ejecución evaluada) ----
  const maybeBeep = useCallback(() => {
    const current = engineRef.current;
    const timer = current?.timer;
    if (!timer || !timer.isRunning()) return;
    const decision = bombTimerBeepDecision(timer.remainingMs(), timer.config.timeLimitMs, lastBeepSecondRef.current);
    if (decision.play) {
      playSfx(decision.play);
      lastBeepSecondRef.current = decision.second;
    }
  }, []);

  // ---- Bucle vivo: tick del motor (reloj lógico manda) + beeps + refresco.
  // El tick corre por frame (precisión de las transiciones); el re-render de React
  // solo cuando cambia un valor visible (snapshot — Doc 1 §15: "60 FPS objetivo;
  // degradación controlada a 30 FPS sin alterar timers monotónicos").
  const lastSnapRef = useRef({});
  const loopActive = state === BOMB_STATES.EXECUTION
    || state === BOMB_STATES.BLIND_DELAY
    || state === BOMB_STATES.INSTRUCTION_ENCODING
    || (state === BOMB_STATES.TUTORIAL_PLAY && holdPressed);
  useEffect(() => {
    if (!loopActive) return undefined;
    let mounted = true;
    let rafId = 0;
    const loop = () => {
      if (!mounted) return;
      const current = engineRef.current;
      if (current) {
        current.tick();
        maybeBeep();
        const snap = bombLoopSnapshot(current, readNow);
        const last = lastSnapRef.current;
        if (snap.tenths !== last.tenths || snap.exposure !== last.exposure
          || snap.hold !== last.hold || snap.phase !== last.phase || snap.prehide !== last.prehide) {
          lastSnapRef.current = snap;
          bump();
        }
      }
      if (typeof requestAnimationFrame === 'function') rafId = requestAnimationFrame(loop);
    };
    rafId = typeof requestAnimationFrame === 'function' ? requestAnimationFrame(loop) : 0;
    return () => {
      mounted = false;
      if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(rafId);
    };
  }, [loopActive, bump, maybeBeep, readNow]);

  // Si el hold se suelta fuera del botón (fuera del viewport/elemento), libéralo.
  const holdUpRef = useRef(null);
  useEffect(() => {
    if (!holdPressed) return undefined;
    const release = () => holdUpRef.current?.();
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    return () => {
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
    };
  }, [holdPressed]);

  // ---- Aviso de viewport §15 (<1024 px) + integrity de resize (B5: viewport events) ----
  const [narrow, setNarrow] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < BOMB_VIEWPORT_WARNING_MIN_WIDTH : false));
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const update = () => setNarrow(window.innerWidth < BOMB_VIEWPORT_WARNING_MIN_WIDTH);
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Focus (QA-09): siempre registrado; el timer de ejecución NO se pausa (v1, Doc 1
  // decisión B1 #6: la presión temporal es parte de la tarea).
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const onVisibility = () => {
      engineRef.current?.focusChange(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // QA-10 (Doc 1 §16.1 / Doc 2 §13.2 "Recarga"): cierre de página en medio de un nivel
  // evaluado → sesión marcada incompleta (TECHNICAL_ABORT). La UI NUNCA reanuda
  // silenciosamente: al recargar el componente arranca en BOOT.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onPageHide = () => {
      const current = engineRef.current;
      if (!current) return;
      const midLevel = current.state === BOMB_STATES.LEVEL_INTRO
        || current.state === BOMB_STATES.INSTRUCTION_ENCODING
        || current.state === BOMB_STATES.BLIND_DELAY
        || current.state === BOMB_STATES.EXECUTION;
      if (midLevel && current.level?.evaluated) current.recordTechnicalAbort('pagehide');
    };
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('beforeunload', onPageHide);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('beforeunload', onPageHide);
    };
  }, []);

  useEffect(() => () => {
    window.clearTimeout(ledFlashTimerRef.current);
    window.clearTimeout(sparkTimerRef.current);
    window.clearTimeout(shakeTimerRef.current);
    window.clearTimeout(acceptedTimerRef.current);
    window.clearTimeout(countdownTimerRef.current);
    window.clearTimeout(penaltyNoticeTimerRef.current);
  }, []);

  // ---- Acciones: SIEMPRE vía engine.action (el motor decide, la UI pinta — DoD).
  // En estados con input bloqueado el motor registra INPUT_DURING_LOCK (QA-08) y no
  // cambia el estado físico (spec §5/§19: "Input bloqueado; no cambia estado físico").
  const handleSwitch = useCallback((id) => {
    const current = engineRef.current;
    if (!current) return;
    const from = current.components.switches[id];
    const to = from === 'ON' ? 'OFF' : 'ON';
    current.action({ kind: 'SWITCH', id, from, to });
  }, []);

  const handleWire = useCallback((id) => {
    const current = engineRef.current;
    if (!current) return;
    if (current.components.wires[id] !== 'INTACT') return; // corte irreversible (§8.3)
    current.action({ kind: 'WIRE', id, op: 'CUT' });
  }, []);

  const holdDown = useCallback(() => {
    const current = engineRef.current;
    if (!current) return;
    if (current.hold.downAt != null) return;
    current.action({ kind: 'BUTTON', id: BOMB_COMPONENTS.HOLD_BUTTON, phase: 'DOWN' });
  }, []);

  const holdUp = useCallback(() => {
    const current = engineRef.current;
    if (!current || current.hold.downAt == null) return;
    const holdMs = Math.max(0, readNow() - current.hold.downAt);
    current.action({ kind: 'BUTTON', id: BOMB_COMPONENTS.HOLD_BUTTON, phase: 'UP', holdMs });
  }, [readNow]);
  useEffect(() => { holdUpRef.current = holdUp; }, [holdUp]);

  // Intento de input sobre superficie bloqueada (blind delay / overlays de resultado):
  // reenviado al input gate del motor → INPUT_DURING_LOCK (QA-08), sin estado físico.
  const forwardLockedClick = useCallback((event) => {
    // Solo el fondo del overlay (no la tarjeta con el CTA): un click "esperado" en la
    // tarjeta no es un intento de input sobre el panel.
    if (event && event.target !== event.currentTarget) return;
    const current = engineRef.current;
    if (!current || isPanelOpenState(current.state)) return;
    current.action({ kind: 'UNKNOWN' });
  }, []);

  // Blind delay: TODA la pantalla es zona ciega (Doc 2 §5: "sin manual ni targets
  // accionables") — cualquier click dentro (incluido sobre el texto) es un intento de
  // input durante el lock (QA-08).
  const forwardDelayClick = useCallback(() => {
    const current = engineRef.current;
    if (!current || current.state !== BOMB_STATES.BLIND_DELAY) return;
    current.action({ kind: 'UNKNOWN' });
  }, []);

  const onPanelPointerDown = useCallback((event) => {
    const target = event.target;
    if (target instanceof Element && target.closest('[data-bomb-control]')) return;
    const current = engineRef.current;
    if (current && isPanelOpenState(current.state)) current.recordMisclick('panel_bg'); // §13: nunca penaliza
  }, []);

  const startPractice = useCallback(() => {
    const current = getEngine();
    current.beginSession();
    current.startTutorial();
    lastBeepSecondRef.current = null;
    bump();
  }, [bump, getEngine]);

  const restartPractice = useCallback(() => {
    engineRef.current = createBombEngine({
      now: readNow,
      log: (ev, meta) => handleEngineEventRef.current(ev, meta),
      seed: seedRef.current,
    });
    sessionAnchorRef.current = null;
    eventsRef.current = [];
    lastBeepSecondRef.current = null;
    setLed('neutral');
    setPenaltyNotice(false);
    setSuccessMeta(null);
    setFailMeta(null);
    setCountdown(false);
    window.clearTimeout(ledFlashTimerRef.current);
    window.clearTimeout(countdownTimerRef.current);
    const current = engineRef.current;
    current.beginSession();
    current.startTutorial();
    bump();
  }, [bump, readNow]);

  // ---- Transiciones B3 (flujo evaluado) ----

  // Práctica completada → "Comenzar evaluación" (Doc 2 §4.3; B4 completa el modal):
  // TUTORIAL_RESULT → TRANSITION → LEVEL_INTRO (L1). El motor loguea NEXT_LEVEL.
  const startEvaluation = useCallback(() => {
    const current = engineRef.current;
    if (!current || current.state !== BOMB_STATES.LEVEL_SUCCESS || current.levelKey !== 'tutorial') return;
    current.tutorialComplete();
    current.continueFromResult();
    lastBeepSecondRef.current = null;
    bump();
  }, [bump]);

  // Intro → countdown 0.5 s (UI) → INSTRUCTION_ENCODING (el motor ancla la exposición
  // AHORA: la transición no recorta la exposición, Doc 2 §10).
  const beginLevelFromIntro = useCallback(() => {
    const current = engineRef.current;
    if (!current || current.state !== BOMB_STATES.LEVEL_INTRO) return;
    setCountdown(true);
    window.clearTimeout(countdownTimerRef.current);
    countdownTimerRef.current = window.setTimeout(() => {
      setCountdown(false);
      const engineNow = engineRef.current;
      if (engineNow && engineNow.state === BOMB_STATES.LEVEL_INTRO) engineNow.startLevelExecution();
      lastBeepSecondRef.current = null;
      bump();
    }, BOMB_ENCODING_COUNTDOWN_MS);
  }, [bump]);

  // Encoding con exposición libre (L1): CTA "Continuar" → INSTRUCTIONS_HIDE (reason
  // 'continue'). L2-L4: sin CTA; el tick del motor oculta al agotar la exposición.
  const continueEncoding = useCallback(() => {
    const current = engineRef.current;
    if (!current || current.state !== BOMB_STATES.INSTRUCTION_ENCODING) return;
    if (current.level?.exposureMs != null) return; // solo exposición libre (L1)
    current.continueEncoding();
    lastBeepSecondRef.current = null;
    bump();
  }, [bump]);

  // Resultado (success/fail) → "Siguiente nivel"/"Continuar": acknowledgeResult →
  // LEVEL_RESULT → continueFromResult → TRANSITION + LEVEL_INTRO (o SESSION_COMPLETE
  // tras L4). Un solo click del usuario; el motor recorre los dos estados.
  const continueFromResultUi = useCallback(() => {
    const current = engineRef.current;
    if (!current) return;
    if (current.state === BOMB_STATES.LEVEL_SUCCESS || current.state === BOMB_STATES.LEVEL_FAIL) {
      current.acknowledgeResult();
    }
    if (current.state === BOMB_STATES.LEVEL_RESULT) {
      current.continueFromResult();
    }
    setLed('neutral');
    setPenaltyNotice(false);
    setSuccessMeta(null);
    setFailMeta(null);
    lastBeepSecondRef.current = null;
    bump();
  }, [bump]);

  // SESSION_COMPLETE → "Finalizar" → cierre de bloque (batería, B5). El summary es
  // agregado-only (sessionSummary del motor: niveles, integridad, versiones, seed).
  const finishSession = useCallback(() => {
    const current = engineRef.current;
    if (!current || current.state !== BOMB_STATES.SESSION_COMPLETE) return;
    onCompleteRef.current?.(current.sessionSummary());
  }, []);

  // ---- Derivados de render ----
  const sfxOn = getGameSfxEnabled();
  const timer = engine.timer ?? null;
  const remainingMs = timer ? timer.remainingMs() : null;
  const timerDisplayPhase = bombTimerDisplayPhase(state, timer);
  const timerText = formatBombTimer(remainingMs);

  const levelLabel = state === BOMB_STATES.TUTORIAL_PLAY
    ? t('Práctica', 'Practice')
    : level && typeof level.level === 'number' && level.level > 0
      ? t('Nivel {n} de 4', 'Level {n} of 4', { n: level.level })
      : t('—', '—');

  // Label textual de fase del timer (a11y §14: el estado no depende solo del color).
  const timerPhaseLabel = {
    idle: t('sin límite', 'no limit'),
    ready: t('en espera', 'ready'),
    normal: t('normal', 'normal'),
    warning: t('warning', 'warning'),
    critical: t('crítico', 'critical'),
    stopped: t('congelado', 'frozen'),
  }[timerDisplayPhase] ?? t('sin límite', 'no limit');

  const ledLabel = {
    neutral: t('Listo', 'Ready'),
    penalty: t('Secuencia incorrecta', 'Incorrect sequence'),
    success: t('Neutralizado', 'Neutralized'),
    fail: t('Bloqueado', 'Locked'),
  }[led] ?? t('Listo', 'Ready');

  const statusText = penaltyNotice
    ? t(manifest.intro.penaltyEs, 'Incorrect sequence. Time penalized.')
    : state === BOMB_STATES.BOOT
      ? t('Pulsa "Iniciar práctica" para explorar el panel.', 'Press "Start practice" to explore the panel.')
      : tutorialSuccess
        ? t('Práctica completada.', 'Practice complete.')
        : state === BOMB_STATES.BLIND_DELAY
          ? t(manifest.intro.delayEs, 'Memorize the sequence.')
          : countdown
            ? t('Listo…', 'Ready…')
            : ledLabel;

  // Modo de la columna manual (Doc 2 §5: Manual visible SOLO en encoding/tutorial):
  //   practice  — TUTORIAL_PLAY (práctica, no evaluada)
  //   intro     — LEVEL_INTRO (resumen breve + regla nueva destacada + Continuar)
  //   protocol  — INSTRUCTION_ENCODING (manual; DoD: ausente en EXECUTION L2-4)
  //   countdown — beat de 0.5 s antes de encoding (overlay)
  //   hidden    — lo demás (execución/resultados: placeholder neutro, sin pistas)
  const manualMode = state === BOMB_STATES.TUTORIAL_PLAY
    ? 'practice'
    : state === BOMB_STATES.INSTRUCTION_ENCODING
      ? 'protocol'
      : state === BOMB_STATES.LEVEL_INTRO
        ? (countdown ? 'countdown' : 'intro')
        : 'hidden';

  const manual = level ? buildManualText(level.sequenceIds, level.bombType, manifest) : null;

  // Exposición (B3): fracción restante para la barra (L2-L4) + pre-fade §16.
  const encodingActive = state === BOMB_STATES.INSTRUCTION_ENCODING && level?.exposureMs != null
    && engine.encodingEndAt != null;
  const exposureFrac = encodingActive
    ? Math.min(1, Math.max(0, (engine.encodingEndAt - readNow()) / level.exposureMs))
    : null;
  const manualPrehide = encodingActive
    && (engine.encodingEndAt - readNow()) <= BOMB_MANUAL_PREHIDE_MS
    && (engine.encodingEndAt - readNow()) > -1000;

  // Intro (Doc 2 §5: "Nivel, modelo de bomba, regla nueva destacada"): todo derivado
  // del manifest (transición §11 + newRuleForLevel + typeBNoticeEs — DoD §16.2).
  const introTransitionEs = level && typeof level.level === 'number' ? manifest.intro.transitionEs[level.level] : null;
  const introHighlight = (() => {
    if (!level || level.evaluated === false) return null;
    if (level.bombType === 'B') {
      return { isB: true, es: manifest.typeBNoticeEs, en: BOMB_TYPEB_NOTICE_EN };
    }
    const ruleId = newRuleForLevel(levelKey, manifest);
    if (!ruleId) return null; // L1: el protocolo base (la transición ya lo destaca)
    const rule = manifest.rules[ruleId];
    return { isB: false, es: rule.manualEs[level.bombType], en: BOMB_RULE_EN[ruleId] ?? rule.manualEs[level.bombType] };
  })();
  const isLastEvaluatedLevel = levelKey !== null
    && manifest.levelOrder.filter((k) => k !== 'tutorial').at(-1) === levelKey;

  const holdTargetMs = BOMB_RULE_MANIFEST.hold.targetMs;
  const holdProgress = holdPressed && engine.hold.downAt != null
    ? Math.min(1, Math.max(0, (readNow() - engine.hold.downAt) / holdTargetMs))
    : 0;
  const showHoldRing = holdPressed && level && level.evaluated === false; // §7: ring SOLO en tutorial/práctica

  const practiceDone = state === BOMB_STATES.LEVEL_SUCCESS && levelKey === 'tutorial';

  const evaluatedSuccess = state === BOMB_STATES.LEVEL_SUCCESS && level?.evaluated;
  const evaluatedFail = state === BOMB_STATES.LEVEL_FAIL && level?.evaluated;

  const panelClasses = [
    'bomb-panel',
    panelOpen ? 'bomb-panel--powered' : '',
    controlsLockedVisual ? 'bomb-panel--locked' : '',
    shaking ? 'bomb-panel--shake' : '',
    evaluatedFail ? 'bomb-panel--fail' : '',
    evaluatedSuccess ? 'bomb-panel--success' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="bomb-game" data-testid="bomb-game">
      {narrow && (
        <p className="bomb-viewport-warning" data-testid="bomb-viewport-warning" role="note">
          {t(
            '⚠ Evaluación recomendada en pantallas de al menos 1024 px de ancho.',
            '⚠ Evaluation recommended on screens at least 1024 px wide.',
          )}
        </p>
      )}

      <div className="task-header bomb-game__header">
        <h3 className="task-title">{t('Desactivación', 'Defusal')}</h3>
        <span className="task-progress" data-testid="bomb-level">{levelLabel}</span>
      </div>

      {/* HUD §6.1: nivel · timer · MODEL A/B (siempre visibles durante ejecución) */}
      <div className="bomb-hud" data-testid="bomb-hud">
        <span className="bomb-hud__level" aria-hidden="true">{levelLabel}</span>
        <span
          className={`bomb-timer ${timerDisplayPhase !== 'idle' && timerDisplayPhase !== 'ready' && timerDisplayPhase !== 'stopped' ? `bomb-timer--${timerDisplayPhase}` : ''}`}
          data-testid="bomb-timer"
          data-phase={timerDisplayPhase}
          data-remaining-ms={typeof remainingMs === 'number' ? Math.round(remainingMs) : null}
          role="timer"
          aria-label={t('Tiempo restante', 'Time remaining')}
        >
          <strong className="bomb-timer__digits" aria-hidden="true">{timerText}</strong>
          <small className="bomb-timer__phase">{timerPhaseLabel}</small>
        </span>
        <span
          className={`bomb-model bomb-model--${model}`}
          data-testid="bomb-model"
          data-model={model}
        >
          <small>{t('MODELO', 'MODEL')}</small>
          <strong aria-hidden="true">{model}</strong>
          <span className="bomb-model__sr">{t('Modelo {m}', 'Model {m}', { m: model })}</span>
        </span>
      </div>

      <div className="bomb-columns">
        {/* Columna manual (Doc 2 §5): contenido por fase */}
        <section className="bomb-manual" data-testid="bomb-manual" aria-label={t('Manual / Protocolo', 'Manual / Protocol')}>
          <h4 className="bomb-manual__title">{t('Manual / Protocolo', 'Manual / Protocol')}</h4>

          {manualMode === 'practice' && manual ? (
            <>
              <ol className="bomb-manual__lines">
                {manual.lines.map((line) => <li key={line}>{line}</li>)}
              </ol>
              {manual.notice && <p className="bomb-manual__notice">{manual.notice}</p>}
            </>
          ) : null}

          {manualMode === 'protocol' && manual && level ? (
            <div className="bomb-encoding" data-testid="bomb-encoding">
              {level.exposureMs != null ? (
                <div
                  className="bomb-exposure"
                  data-testid="bomb-exposure-bar"
                  aria-hidden="true"
                >
                  <div className="bomb-exposure__fill" style={{ width: `${(exposureFrac ?? 0) * 100}%` }} />
                </div>
              ) : (
                <p className="bomb-encoding__free" data-testid="bomb-encoding-free">
                  {t('Lectura libre', 'Free reading')}
                </p>
              )}
              <ol className={`bomb-manual__lines${manualPrehide ? ' bomb-manual__lines--prehide' : ''}`}>
                {manual.lines.map((line) => <li key={line}>{line}</li>)}
              </ol>
              {manual.notice && <p className="bomb-manual__notice">{manual.notice}</p>}
              {level.exposureMs == null && (
                <button
                  type="button"
                  className="bomb-cta"
                  data-testid="bomb-encoding-continue"
                  onClick={continueEncoding}
                >
                  {t('Continuar', 'Continue')}
                </button>
              )}
            </div>
          ) : null}

          {manualMode === 'intro' && level && introTransitionEs ? (
            <div className="bomb-intro" data-testid="bomb-level-intro">
              <p className="bomb-intro__level">{levelLabel}</p>
              <span className={`bomb-intro__model bomb-intro__model--${level.bombType}`} data-testid="bomb-intro-model">
                {t('MODELO {m}', 'MODEL {m}', { m: level.bombType })}
              </span>
              <p className="bomb-intro__transition">{t(introTransitionEs, BOMB_TRANSITION_EN[level.level] ?? introTransitionEs)}</p>
              {introHighlight ? (
                <div
                  className={`bomb-intro__highlight${introHighlight.isB ? ' bomb-intro__highlight--B' : ''}`}
                  data-testid="bomb-intro-highlight"
                >
                  <span className="bomb-intro__tag">
                    {introHighlight.isB ? t('MODELO B', 'MODEL B') : t('NUEVA REGLA', 'NEW RULE')}
                  </span>
                  <p className="bomb-intro__highlight-text">{t(introHighlight.es, introHighlight.en)}</p>
                </div>
              ) : null}
              <button
                type="button"
                className="bomb-cta"
                data-testid="bomb-intro-continue"
                onClick={beginLevelFromIntro}
              >
                {t('Continuar', 'Continue')}
              </button>
            </div>
          ) : null}

          {manualMode === 'hidden' && (
            <p className="bomb-manual__placeholder" data-testid="bomb-manual-placeholder">···</p>
          )}
        </section>

        {/* Panel de bomba (mundo): switches · cables · botón amarillo · LED */}
        <div className={panelClasses} data-testid="bomb-panel" onPointerDownCapture={onPanelPointerDown}>
          <div className="bomb-panel__inset" data-testid="bomb-panel-bg">
            <div className="bomb-switches" role="group" aria-label={t('Interruptores', 'Switches')}>
              {BOMB_COMPONENTS.SWITCHES.map((id) => {
                const on = components.switches[id] === 'ON';
                return (
                  <button
                    key={id}
                    type="button"
                    data-bomb-control
                    data-testid={`bomb-switch-${id}`}
                    className={`bomb-switch ${on ? 'bomb-switch--on' : ''}`}
                    aria-pressed={on}
                    aria-disabled={controlsLockedVisual || undefined}
                    aria-label={t(
                      'Interruptor {n} ({label}): {state}',
                      'Switch {n} ({label}): {state}',
                      { n: SWITCH_NUMBER[id], label: SWITCH_DISPLAY[id], state: on ? t('activado', 'on') : t('desactivado', 'off') },
                    )}
                    disabled={controlsDisabled}
                    onClick={() => handleSwitch(id)}
                  >
                    <span className="bomb-switch__track" aria-hidden="true"><span className="bomb-switch__knob" /></span>
                    <span className="bomb-switch__label" aria-hidden="true">{SWITCH_DISPLAY[id]}</span>
                    <span className="bomb-switch__state" aria-hidden="true">{SWITCH_STATE_LABELS[components.switches[id]]}</span>
                  </button>
                );
              })}
            </div>

            <div className="bomb-wires" role="group" aria-label={t('Cables', 'Wires')}>
              {BOMB_COMPONENTS.WIRES.map((id) => {
                const wireState = components.wires[id];
                const cut = wireState === 'CUT';
                const display = WIRE_DISPLAY[id];
                return (
                  <button
                    key={id}
                    type="button"
                    data-bomb-control
                    data-testid={`bomb-wire-${id}`}
                    className={[
                      'bomb-wire',
                      `bomb-wire--${display.css}`,
                      cut ? 'bomb-wire--cut' : '',
                      sparkWire === id ? 'bomb-wire--spark' : '',
                    ].filter(Boolean).join(' ')}
                    aria-disabled={controlsLockedVisual || undefined}
                    aria-label={t(
                      'Cable {color} ({letter}): {state}',
                      'Wire {color} ({letter}): {state}',
                      {
                        color: t(display.colorEs, display.colorEn),
                        letter: display.letter,
                        state: cut ? t('cortado', 'cut') : t('intacto', 'intact'),
                      },
                    )}
                    disabled={controlsDisabled || cut}
                    onClick={() => handleWire(id)}
                  >
                    <span className="bomb-wire__cable" aria-hidden="true">
                      <i className="bomb-wire__spark-dot" aria-hidden="true" />
                    </span>
                    <span className="bomb-wire__badge" aria-hidden="true">{display.letter}</span>
                    <span className="bomb-wire__state" aria-hidden="true">{WIRE_STATE_LABELS[wireState]}</span>
                  </button>
                );
              })}
            </div>

            <div className="bomb-button-row">
              <button
                type="button"
                data-bomb-control
                data-testid="bomb-hold-btn"
                className={[
                  'bomb-hold-btn',
                  holdPressed ? 'bomb-hold-btn--pressed' : '',
                  holdAccepted ? 'bomb-hold-btn--accepted' : '',
                ].filter(Boolean).join(' ')}
                aria-disabled={controlsLockedVisual || undefined}
                aria-label={t(
                  'Botón amarillo: {state}',
                  'Yellow button: {state}',
                  { state: holdPressed ? t('presionado', 'pressed') : t('suelto', 'idle') },
                )}
                disabled={controlsDisabled}
                onPointerDown={holdDown}
                onPointerUp={holdUp}
                onPointerCancel={holdUp}
                onKeyDown={(event) => {
                  if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
                    event.preventDefault();
                    holdDown();
                  }
                }}
                onKeyUp={(event) => {
                  if (event.key === ' ' || event.key === 'Enter') {
                    event.preventDefault();
                    holdUp();
                  }
                }}
              >
                <span className="bomb-hold-btn__label" aria-hidden="true">HOLD</span>
                {showHoldRing && (
                  <svg className="bomb-hold-btn__ring" viewBox="0 0 100 100" data-testid="bomb-hold-ring" aria-hidden="true">
                    <circle className="bomb-hold-btn__ring-track" cx="50" cy="50" r="46" fill="none" strokeWidth="6" />
                    <circle
                      className="bomb-hold-btn__ring-fill"
                      cx="50"
                      cy="50"
                      r="46"
                      fill="none"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={`${holdProgress * RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
                      transform="rotate(-90 50 50)"
                    />
                  </svg>
                )}
              </button>
              <span className="bomb-hint" aria-hidden="true">
                {t('Mantén 2 s', 'Hold 2 s')}
              </span>
            </div>
          </div>
        </div>

        {/* Countdown de 0.5 s antes de encoding (Doc 2 §10; UI-only: la exposición
            del motor arranca cuando termina). El motor sigue en LEVEL_INTRO (bloqueado):
            los clicks se registran como INPUT_DURING_LOCK. */}
        {state === BOMB_STATES.LEVEL_INTRO && countdown && (
          <div className="bomb-countdown" data-testid="bomb-countdown" onClick={forwardLockedClick}>
            <p className="bomb-countdown__text" role="status">{t('Listo…', 'Ready…')}</p>
            <div className="bomb-countdown__track" aria-hidden="true">
              <div className="bomb-countdown__fill" />
            </div>
          </div>
        )}

        {/* Blind delay (Doc 1 §4/§7, Doc 2 §5): pantalla oscura con estática sutil;
            sin manual ni targets accionables; inputs → INPUT_DURING_LOCK (QA-08).
            DoD: no deja pistas residuales del manual (la columna queda 'hidden'). */}
        {state === BOMB_STATES.BLIND_DELAY && (
          <div className="bomb-delay-screen" data-testid="bomb-delay-screen" onClick={forwardDelayClick}>
            <p className="bomb-delay-screen__text" role="status">
              {t(manifest.intro.delayEs, 'Memorize the sequence.')}
            </p>
          </div>
        )}

        {/* Resultado de nivel evaluado (Doc 2 §5): success = LED verde + timer
            congelado + microresumen neutro; fail = razón general SIN revelar la
            respuesta correcta (§13.1). Overlay solo sobre columnas: el HUD (LED,
            timer congelado) sigue visible. */}
        {evaluatedSuccess && successMeta && (
          <div className="bomb-columns-overlay" data-testid="bomb-success-overlay" onClick={forwardLockedClick}>
            <div className="bomb-result bomb-result--success" data-testid="bomb-success-card">
              <h2 className="bomb-result__title">{t(manifest.intro.successEs, 'Artifact neutralized.')}</h2>
              <p className="bomb-result__summary">
                {t(
                  'Nivel {n} · Tiempo: {time} s · Errores: {e}',
                  'Level {n} · Time: {time} s · Errors: {e}',
                  { n: successMeta.level, time: (successMeta.elapsed_ms / 1000).toFixed(1), e: successMeta.errors },
                )}
              </p>
              <button type="button" className="bomb-cta" data-testid="bomb-result-continue" onClick={continueFromResultUi}>
                {isLastEvaluatedLevel ? t('Continuar', 'Continue') : t('Siguiente nivel', 'Next level')}
              </button>
            </div>
          </div>
        )}
        {evaluatedFail && failMeta && (
          <div className="bomb-columns-overlay" data-testid="bomb-fail-overlay" onClick={forwardLockedClick}>
            <div className="bomb-result bomb-result--fail" data-testid="bomb-fail-card">
              <h2 className="bomb-result__title">
                {failMeta.reason === 'TIMEOUT'
                  ? t(manifest.intro.failTimeoutEs, 'Time up. Level finished.')
                  : t(manifest.intro.failErrorsEs, 'The error limit was reached. Level finished.')}
              </h2>
              <button type="button" className="bomb-cta" data-testid="bomb-result-continue" onClick={continueFromResultUi}>
                {t('Continuar', 'Continue')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Fila inferior §6.1: estado/aviso breve · LED · Audio ON/OFF */}
      <div className="bomb-statusbar" data-testid="bomb-statusbar">
        <p
          className={`bomb-status${penaltyNotice ? ' bomb-status--penalty' : ''}`}
          data-testid="bomb-status"
          role="status"
        >
          {statusText}
        </p>
        <span className="bomb-led" data-testid="bomb-led" data-led={led}>
          <i className="bomb-led__dot" aria-hidden="true" />
          <span>{ledLabel}</span>
        </span>
        <span className="bomb-audio" data-testid="bomb-audio">{`Audio: ${sfxOn ? 'ON' : 'OFF'}`}</span>
      </div>

      {/* Bienvenida (BOOT) — B4 expande a la pantalla completa §4.1 */}
      {state === BOMB_STATES.BOOT && (
        <div className="bomb-overlay" data-testid="bomb-welcome-overlay">
          <div className="bomb-welcome" data-testid="bomb-welcome">
            <h2 className="bomb-welcome__title">
              {t('Simulación de Protocolo Operativo: Desactivación', 'Operational Protocol Simulation: Defusal')}
            </h2>
            <p className="bomb-welcome__sub">
              {t('Memoriza el protocolo y ejecuta cada paso en el orden indicado.', 'Memorize the protocol and execute each step in the indicated order.')}
            </p>
            <button type="button" className="bomb-cta" data-testid="bomb-start-practice" onClick={startPractice}>
              {t('Iniciar práctica', 'Start practice')}
            </button>
          </div>
        </div>
      )}

      {/* Práctica completada (B4: modal §4.3 completo con "Comenzar evaluación") */}
      {practiceDone && (
        <div className="bomb-overlay" data-testid="bomb-practice-done-overlay">
          <div className="bomb-practice-done" data-testid="bomb-practice-done">
            <h2>{t('Práctica completada', 'Practice complete')}</h2>
            <p>{t('Puedes repetir la práctica las veces que necesites.', 'You can repeat the practice as many times as you need.')}</p>
            <button type="button" className="bomb-cta" data-testid="bomb-start-evaluation" onClick={startEvaluation}>
              {t('Comenzar evaluación', 'Start evaluation')}
            </button>
            <button type="button" className="bomb-cta bomb-cta--secondary" data-testid="bomb-practice-restart" onClick={restartPractice}>
              {t('Repetir práctica', 'Repeat practice')}
            </button>
          </div>
        </div>
      )}

      {/* Cierre de sesión (Doc 2 §5 "Session End": cierre + confirmación). El summary
          agregado (sessionSummary) viaja por onComplete (B5: payload de batería). */}
      {state === BOMB_STATES.SESSION_COMPLETE && (
        <div className="bomb-overlay" data-testid="bomb-session-complete-overlay">
          <div className="bomb-session-complete" data-testid="bomb-session-complete">
            <h2>{t(manifest.intro.sessionCompleteEs, 'Simulation finished. Your results have been processed.')}</h2>
            <button type="button" className="bomb-cta" data-testid="bomb-session-finish" onClick={finishSession}>
              {t('Finalizar', 'Finish')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BombDefusalGame({ active = false, onGameEvent, nowFn, seed, onComplete } = {}) {
  return (
    <GameRuntime
      active={active}
      gameDefinition={BOMB_GAME_DEFINITION}
      onEvent={onGameEvent}
      renderTrial={(_state, emit) => (
        <BombInner emit={emit} nowFn={nowFn} seed={seed} onComplete={onComplete} />
      )}
    />
  );
}
