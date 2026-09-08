// bombGame.jsx — EXP-BOMB-001 · B2: panel + HUD + accesibilidad (mundo "Desactivación").
//
// Especificación (ley): docs/spec/EXP-BOMB-001/ (Draft v1.1.0):
//   Doc 2 §6 (HUD/layout 2 columnas), §7 (componentes + estados), §12 (feedback
//   visual/sonoro), §14 (accesibilidad), §15 (responsive: baseline 1280×720,
//   aviso <1024 px), §16 (animaciones: durations/curvas fijas), §17 (assets: 6-8 SFX),
//   §19 (casos límite), §20 (QA visual/DoD).
//   Doc 1 §5 (inputs), §6 (Feedback Controller), §15 (a11y/teclado), §16.2 (DoD).
//
// Reglas duras heredadas (DoD §16.2):
//   - La UI consume el motor (bombEngine.js) + el manifest (bombRules.js): el estado
//     físico del panel ES `engine.components` (single source of truth); ninguna regla
//     de secuencia/transformación vive en este archivo.
//   - Mundo NO tokenizado (H4.5): la paleta táctico/industrial vive en bomb.css; solo
//     el chrome compartido (pills .task-title/.task-progress, pips, sfx-toggle, footer)
//     usa tokens --k-* / overrides para superficie oscura.
//   - Sin feedback que revele la respuesta en evaluación: los STEP_ERROR renderizan
//     LED + SFX + (B3) shake; nunca el paso esperado. En práctica (tutorial, no
//     evaluado) el LED marca "secuencia incorrecta" sin revelar el orden.
//
// Alcance B2 (card t_2fdada28):
//   - Mundo completo + panel operativo en modo práctica (TUTORIAL_PLAY del motor:
//     sin timer de presión, no evaluado, irreversibilidad de cables §8.3).
//   - HUD: nivel (práctica), timer (fases normal/warning/critical + idle; sin saltos
//     de layout), placa MODEL A/B (letra + textura, no solo color), LED de estado.
//   - SFX 8 (toggle compartido del stage) + beeps de temporizador §10.1 (activo con
//     timer corriendo; B3 los ejercita en ejecución evaluada).
//   - a11y §14: nombres accesibles, foco visible, hitbox ≥44 px, reduced-motion,
//     aviso <1024 px, audio opcional sin perder información.
//   Fuera de B2 (siguen las cards de la cadena): fases de niveles (B3), tutorial
//   guiado T1-T5 + bienvenida completa (B4), telemetría final + batería (B5).

import React, { useCallback, useEffect, useRef, useState } from 'react';
import GameRuntime from '../../GameRuntime.jsx';
import { useLanguage } from '../../../i18n/LanguageContext.jsx';
import { playSfx, getGameSfxEnabled } from '../originalGameSfx.js';
import {
  BOMB_COMPONENTS,
  BOMB_RULE_MANIFEST,
  buildManualText,
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

// Claves permitidas en la telemetría forward (diccionario §11 + §19 del manifest).
// Todo lo demás (p.ej. coordenadas, DOM, rostro) NUNCA sale por onGameEvent.
const BOMB_TELEMETRY_META_KEYS = new Set([
  'session_id', 'build_version', 'config_version', 'rule_manifest_version', 'seed',
  'level', 'bomb_type', 'seq_ids', 'evaluated', 'exposure_ms', 'reason', 'duration_ms',
  'time_limit_s', 'id', 'from', 'to', 'op', 'valid', 'hold_ms', 'observed_hold_ms',
  'step_id', 'serial_pos', 'expected', 'error_class', 'step_position', 'penalizes',
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

function BombInner({ emit, nowFn, seed }) {
  const { t } = useLanguage();
  const nowRef = useRef(typeof nowFn === 'function' ? nowFn : null);
  useEffect(() => {
    nowRef.current = typeof nowFn === 'function' ? nowFn : null;
  }, [nowFn]);

  const readNow = useCallback(() => (nowRef.current ? nowRef.current() : DEFAULT_NOW()), []);
  const seedRef = useRef(typeof seed === 'number' ? seed : null);

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
      // El copy "Tiempo penalizado" llega con TIME_PENALTY (B3): aquí NO se revela el paso.
    }
    if (event === 'LEVEL_SUCCESS') {
      setLed('success'); // §12: LED verde + timer congelado (el motor detiene el timer)
      playSfx('bomb_success'); // §12: chime breve
    }
    if (event === 'LEVEL_FAIL') {
      setLed('fail'); // §12: panel se desactiva (baja saturación, CSS --fail)
      playSfx('bomb_fail'); // §12: tono grave breve
    }
  }, [flashHoldAccepted, flashShake, flashSpark, scheduleLedReset]);

  const handleEngineEvent = useCallback((event, meta = {}) => {
    const engine = engineRef.current;
    const tms = readNow();
    if (sessionAnchorRef.current == null) sessionAnchorRef.current = tms;
    const sanitized = sanitizeBombMeta(meta);
    eventsRef.current.push({ t_ms: Math.max(0, Math.round(tms - sessionAnchorRef.current)), event, meta: sanitized });
    if (eventsRef.current.length > 400) eventsRef.current.splice(0, eventsRef.current.length - 400);
    // Forward privacy-safe (game_event_v1 vía GameRuntime.emit). La respuesta es
    // agregado del diccionario §11; nunca coordenadas/DOM/rostro.
    const levelValue = engine?.level && typeof engine.level.level === 'number' ? engine.level.level : 0;
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
  const components = engine.components ?? FALLBACK_COMPONENTS;
  const model = level?.bombType ?? 'A';
  const holdPressed = components.buttons[BOMB_COMPONENTS.HOLD_BUTTON] === 'PRESSED';

  // ---- Timer beeps §10.1 (solo con timer corriendo: ejecución evaluada, B3) ----
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

  // ---- Bucle vivo: tick del motor + beeps + refresco (ring de hold / timer) ----
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
      }
      bump();
      if (typeof requestAnimationFrame === 'function') rafId = requestAnimationFrame(loop);
    };
    rafId = typeof requestAnimationFrame === 'function' ? requestAnimationFrame(loop) : 0;
    return () => {
      mounted = false;
      if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(rafId);
    };
  }, [loopActive, bump, maybeBeep]);

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

  // Focus (QA-09/B5): siempre registrado; el timer de ejecución no se pausa (v1).
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const onVisibility = () => {
      engineRef.current?.focusChange(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => () => {
    window.clearTimeout(ledFlashTimerRef.current);
    window.clearTimeout(sparkTimerRef.current);
    window.clearTimeout(shakeTimerRef.current);
    window.clearTimeout(acceptedTimerRef.current);
  }, []);

  // ---- Acciones (solo vía engine.action: el motor decide, la UI pinta — DoD) ----
  const handleSwitch = useCallback((id) => {
    const current = engineRef.current;
    if (!current || !isPanelOpenState(current.state)) return;
    const from = current.components.switches[id];
    const to = from === 'ON' ? 'OFF' : 'ON';
    current.action({ kind: 'SWITCH', id, from, to });
  }, []);

  const handleWire = useCallback((id) => {
    const current = engineRef.current;
    if (!current || !isPanelOpenState(current.state)) return;
    if (current.components.wires[id] !== 'INTACT') return; // corte irreversible (§8.3)
    current.action({ kind: 'WIRE', id, op: 'CUT' });
  }, []);

  const holdDown = useCallback(() => {
    const current = engineRef.current;
    if (!current || !isPanelOpenState(current.state)) return;
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
    window.clearTimeout(ledFlashTimerRef.current);
    const current = engineRef.current;
    current.beginSession();
    current.startTutorial();
    bump();
  }, [bump, readNow]);

  // ---- Derivados de render ----
  const sfxOn = getGameSfxEnabled();
  const timer = engine.timer ?? null;
  const remainingMs = timer ? timer.remainingMs() : null;
  const timerPhase = remainingMs === null ? 'idle' : timer.phase();
  let timerText = '—:—';
  if (remainingMs !== null) {
    const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
    timerText = `${String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')}`;
  }

  const levelLabel = state === BOMB_STATES.TUTORIAL_PLAY
    ? t('Práctica', 'Practice')
    : level && typeof level.level === 'number' && level.level > 0
      ? t('Nivel {n} de 4', 'Level {n} of 4', { n: level.level })
      : t('—', '—');

  // Label textual de fase del timer (a11y §14: el estado no depende solo del
  // color; en práctica "sin límite" deja claro que no hay countdown).
  const timerPhaseLabel = {
    idle: t('sin límite', 'no limit'),
    normal: t('normal', 'normal'),
    warning: t('warning', 'warning'),
    critical: t('crítico', 'critical'),
  }[timerPhase] ?? t('sin límite', 'no limit');

  const ledLabel = {
    neutral: t('Listo', 'Ready'),
    penalty: t('Secuencia incorrecta', 'Incorrect sequence'),
    success: t('Neutralizado', 'Neutralized'),
    fail: t('Bloqueado', 'Locked'),
  }[led] ?? t('Listo', 'Ready');

  const statusText = state === BOMB_STATES.BOOT
    ? t('Pulsa "Iniciar práctica" para explorar el panel.', 'Press "Start practice" to explore the panel.')
    : (state === BOMB_STATES.LEVEL_SUCCESS && engine.levelKey === 'tutorial')
      ? t('Práctica completada.', 'Practice complete.')
      : ledLabel;

  const manualVisible = state === BOMB_STATES.TUTORIAL_PLAY; // B3: + INSTRUCTION_ENCODING
  const manual = level ? buildManualText(level.sequenceIds, level.bombType, engine.manifest) : null;

  const holdTargetMs = BOMB_RULE_MANIFEST.hold.targetMs;
  const holdProgress = holdPressed && engine.hold.downAt != null
    ? Math.min(1, Math.max(0, (readNow() - engine.hold.downAt) / holdTargetMs))
    : 0;
  const showHoldRing = holdPressed && level && level.evaluated === false; // §7: ring SOLO en tutorial/práctica

  const practiceDone = state === BOMB_STATES.LEVEL_SUCCESS && engine.levelKey === 'tutorial';

  const panelClasses = [
    'bomb-panel',
    panelOpen ? 'bomb-panel--powered' : '',
    shaking ? 'bomb-panel--shake' : '',
    state === BOMB_STATES.LEVEL_FAIL ? 'bomb-panel--fail' : '',
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
          className={`bomb-timer ${timerPhase !== 'idle' ? `bomb-timer--${timerPhase}` : ''}`}
          data-testid="bomb-timer"
          data-phase={timerPhase}
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
        {/* Columna manual (solo visible en encoding/tutorial; en ejecución ausente, §5) */}
        <section className="bomb-manual" data-testid="bomb-manual" aria-label={t('Manual / Protocolo', 'Manual / Protocol')}>
          <h4 className="bomb-manual__title">{t('Manual / Protocolo', 'Manual / Protocol')}</h4>
          {manualVisible && manual ? (
            <>
              <ol className="bomb-manual__lines">
                {manual.lines.map((line) => <li key={line}>{line}</li>)}
              </ol>
              {manual.notice && <p className="bomb-manual__notice">{manual.notice}</p>}
            </>
          ) : (
            <p className="bomb-manual__placeholder" data-testid="bomb-manual-placeholder">
              {t('El protocolo aparecerá aquí.', 'The protocol will appear here.')}
            </p>
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
                    aria-label={t(
                      'Interruptor {n} ({label}): {state}',
                      'Switch {n} ({label}): {state}',
                      { n: SWITCH_NUMBER[id], label: SWITCH_DISPLAY[id], state: on ? t('activado', 'on') : t('desactivado', 'off') },
                    )}
                    disabled={!panelOpen}
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
                    aria-label={t(
                      'Cable {color} ({letter}): {state}',
                      'Wire {color} ({letter}): {state}',
                      {
                        color: t(display.colorEs, display.colorEn),
                        letter: display.letter,
                        state: cut ? t('cortado', 'cut') : t('intacto', 'intact'),
                      },
                    )}
                    disabled={!panelOpen || cut}
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
                aria-label={t(
                  'Botón amarillo: {state}',
                  'Yellow button: {state}',
                  { state: holdPressed ? t('presionado', 'pressed') : t('suelto', 'idle') },
                )}
                disabled={!panelOpen}
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
      </div>

      {/* Fila inferior §6.1: estado/aviso breve · Audio ON/OFF */}
      <div className="bomb-statusbar" data-testid="bomb-statusbar">
        <p className="bomb-status" data-testid="bomb-status" role="status">{statusText}</p>
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

      {/* Práctica completada (B4: modal §4.3 + "Comenzar evaluación") */}
      {practiceDone && (
        <div className="bomb-overlay" data-testid="bomb-practice-done-overlay">
          <div className="bomb-practice-done" data-testid="bomb-practice-done">
            <h2>{t('Práctica completada', 'Practice complete')}</h2>
            <p>{t('Puedes repetir la práctica las veces que necesites.', 'You can repeat the practice as many times as you need.')}</p>
            <button type="button" className="bomb-cta" data-testid="bomb-practice-restart" onClick={restartPractice}>
              {t('Repetir práctica', 'Repeat practice')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BombDefusalGame({ active = false, onGameEvent, nowFn, seed } = {}) {
  return (
    <GameRuntime
      active={active}
      gameDefinition={BOMB_GAME_DEFINITION}
      onEvent={onGameEvent}
      renderTrial={(_state, emit) => (
        <BombInner emit={emit} nowFn={nowFn} seed={seed} />
      )}
    />
  );
}
