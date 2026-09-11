// controlRoomGame.jsx — EXP-COMM-001 (Sala de Control) · C2: UI responsive + C3: orquestación
// de sesión (bienvenida → tutorial T1-T5 → evaluación 12 escenarios con intros de bloque →
// final neutra). Especificación (ley): Doc 2 §4 (flujo), §5 (tutorial), §6-§9 (pantallas,
// layout, componentes, acciones), §12 (compositor), §14 (timing), §15 (copy), §18 (a11y);
// Doc 1 §7 (máquina de estados), §12.3 (input gate), §13.2/§17 (práctica sin score).
//
// Dos modos de entrada:
//   - MODO SESIÓN (sin scenarioId y practice !== true): el flujo completo §4. Es lo que
//     monta la batería (C5). onComplete se llama UNA vez al final con el agregado de sesión.
//   - MODO ÚNICO (scenarioId o practice === true): renderiza directamente un escenario (dev/
//     QA/smoke, jsdom). onComplete al terminar ese escenario.
//
// Reglas duras:
//   - La UI consume el motor C1 + manifest C3 (single source of truth); NINGÚN copy ni regla
//     de diálogo vive en el componente (los textos vienen de CONTROL_ROOM_*).
//   - Práctica (block 0) NO puntúa y NO entra al agregado de evaluación (Doc 1 §13.2/§17).
//   - Mundo NO tokenizado (H4.5): paleta en controlRoom.css.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../../i18n/LanguageContext.jsx';
import { playSfx, getGameSfxEnabled } from '../originalGameSfx.js';
import {
  buildControlRoomLevelSpec,
  getControlRoomScenario,
  CONTROL_ROOM_SCENARIOS,
  CONTROL_ROOM_NPC_REPLY_DELAY_MS,
  CONTROL_ROOM_TUTORIAL_ORDER,
  CONTROL_ROOM_EVALUATION_ORDER,
  CONTROL_ROOM_TUTORIAL_NODES,
  CONTROL_ROOM_TUTORIAL_HINTS_BY_SCENARIO,
  CONTROL_ROOM_WELCOME,
  CONTROL_ROOM_TUTORIAL_EXIT,
  CONTROL_ROOM_BLOCK_INTROS,
  CONTROL_ROOM_FINAL,
} from './controlRoomRules.js';
import { createControlRoomEngine, CONTROL_ROOM_STATES } from './controlRoomEngine.js';
import { COMM_DIMENSION_KEYS } from './controlRoomTaxonomy.js';
import './controlRoom.css';

export const CONTROL_ROOM_GAME_DEFINITION = Object.freeze({
  id: 'control_room',
  label: 'Sala de Control',
  labelEn: 'Control Room',
  difficulty: 'applied_communication',
});

export const CONTROL_ROOM_DEFAULT_SCENARIO_ID = 'CR-PRACTICE-01';

const S = CONTROL_ROOM_STATES;
const PHASE = Object.freeze({
  WELCOME: 'welcome',
  SCENARIO: 'scenario',
  BLOCK_INTRO: 'block_intro',
  TUTORIAL_EXIT: 'tutorial_exit',
  FINAL: 'final',
});

const DEFAULT_NOW = () => (typeof performance !== 'undefined' && typeof performance.now === 'function'
  ? performance.now()
  : Date.now());

function getCurrentViewport() {
  if (typeof window === 'undefined') return { width: 1440, height: 900 };
  return { width: window.innerWidth || 1440, height: window.innerHeight || 900 };
}

function useViewportSize() {
  const [viewport, setViewport] = useState(getCurrentViewport);
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const update = () => setViewport(getCurrentViewport());
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener?.('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener?.('resize', update);
    };
  }, []);
  return viewport;
}

const RECEIVER_ICONS = Object.freeze({ operator: '👷', technician: '🔧', supervisor: '📋', client: '🤝' });

function formatTimer(ms) {
  if (ms == null) return '';
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** Agrega los resultados de escenarios evaluados al agregado de sesión (métricas 11 + dimensiones 7). */
export function buildControlRoomSessionAggregate(results = []) {
  const m = {
    first_decision_latency_ms: null,
    average_decision_latency_ms: null,
    time_spent_reading_ms: 0,
    pre_send_edit_count: 0,
    pre_send_reorder_count: 0,
    total_message_count: 0,
    question_count: 0,
    verification_count: 0,
    confirmation_requested: false,
    confirmation_given: false,
    timeout_count: 0,
  };
  let first = null;
  let latWeightedSum = 0;
  let latWeight = 0;
  const dim = Object.fromEntries(COMM_DIMENSION_KEYS.map((k) => [k, { opportunity: 0, success: 0 }]));
  for (const r of results) {
    const mm = r.metrics ?? {};
    if (mm.first_decision_latency_ms != null) {
      first = first == null ? mm.first_decision_latency_ms : Math.min(first, mm.first_decision_latency_ms);
    }
    if (mm.average_decision_latency_ms != null && (mm.total_message_count ?? 0) > 0) {
      latWeightedSum += mm.average_decision_latency_ms * mm.total_message_count;
      latWeight += mm.total_message_count;
    }
    m.time_spent_reading_ms += mm.time_spent_reading_ms || 0;
    m.pre_send_edit_count += mm.pre_send_edit_count || 0;
    m.pre_send_reorder_count += mm.pre_send_reorder_count || 0;
    m.total_message_count += mm.total_message_count || 0;
    m.question_count += mm.question_count || 0;
    m.verification_count += mm.verification_count || 0;
    m.confirmation_requested = m.confirmation_requested || mm.confirmation_requested === true;
    m.confirmation_given = m.confirmation_given || mm.confirmation_given === true;
    m.timeout_count += mm.timeout_count || 0;
    for (const k of COMM_DIMENSION_KEYS) {
      const d = r.dimensionStats?.[k];
      if (d) { dim[k].opportunity += d.opportunity; dim[k].success += d.success; }
    }
  }
  m.first_decision_latency_ms = first;
  m.average_decision_latency_ms = latWeight > 0 ? Math.round(latWeightedSum / latWeight) : null;
  const dimensions = Object.fromEntries(COMM_DIMENSION_KEYS.map((k) => (
    [k, dim[k].opportunity > 0 ? Math.round((dim[k].success / dim[k].opportunity) * 100) : null]
  )));
  return {
    aggregateSchemaVersion: 'control_room_aggregate_v1',
    gameId: 'control_room',
    completed: results.length > 0,
    scenarioCount: results.length,
    scoredCount: results.filter((r) => r.scored === true).length,
    resolvedCount: results.filter((r) => r.resolved === true).length,
    ...m,
    dimensions,
    scenarios: results.map((r) => ({
      scenarioId: r.scenarioId,
      form: r.form,
      block: r.block,
      scored: r.scored === true,
      resolved: r.resolved === true,
      timeout: (r.metrics?.timeout_count ?? 0) > 0,
      integrityFlags: r.integrityFlags ?? [],
    })),
    integrityFlags: [...new Set(results.flatMap((r) => r.integrityFlags ?? []))],
    aggregateOnly: true,
  };
}

export default function ControlRoomGame({
  active = true,
  block: _block,
  practice,
  scenarioId,
  trialCount: _trialCount,
  durationMs: _durationMs,
  width: _width,
  height: _height,
  onGameEvent,
  onComplete,
  now,
} = {}) {
  const { t, language } = useLanguage();
  const lang = language === 'en' ? 'en' : 'es';
  const singleMode = !!scenarioId || practice === true;
  const [phase, setPhase] = useState(singleMode ? PHASE.SCENARIO : PHASE.WELCOME);
  const [mode, setMode] = useState('tutorial');
  const [sessionIndex, setSessionIndex] = useState(0);
  const [tick, setTick] = useState(0);
  const engineRef = useRef(null);
  const resultsRef = useRef([]);
  const advancedRef = useRef(false);
  const onGameEventRef = useRef(onGameEvent);
  const onCompleteRef = useRef(onComplete);
  const viewport = useViewportSize();
  const isMobile = viewport.width < 600;
  const isTablet = viewport.width >= 600 && viewport.width < 1024;

  useEffect(() => { onGameEventRef.current = onGameEvent; }, [onGameEvent]);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  const bump = useCallback(() => setTick((x) => x + 1), []);
  const sfx = useCallback((name) => { if (getGameSfxEnabled()) playSfx(name); }, []);

  const list = singleMode
    ? [scenarioId ?? CONTROL_ROOM_DEFAULT_SCENARIO_ID]
    : (mode === 'tutorial' ? CONTROL_ROOM_TUTORIAL_ORDER : CONTROL_ROOM_EVALUATION_ORDER);
  const currentScenarioId = phase === PHASE.SCENARIO ? list[sessionIndex] ?? null : null;

  // Crear + arrancar el motor del escenario actual.
  useEffect(() => {
    if (!active || phase !== PHASE.SCENARIO || !currentScenarioId) return undefined;
    const scenario = buildControlRoomLevelSpec(currentScenarioId, undefined)
      ?? getControlRoomScenario(currentScenarioId)
      ?? CONTROL_ROOM_SCENARIOS[0];
    const engine = createControlRoomEngine({
      scenario,
      now: now ?? DEFAULT_NOW,
      log: (rec) => onGameEventRef.current?.(rec),
    });
    engine.start();
    engineRef.current = engine;
    advancedRef.current = false;
    bump();
    let interval = null;
    if (scenario.timeoutMs) interval = setInterval(() => { engine.tick(); bump(); }, 250);
    const onVisibility = () => {
      if (typeof document === 'undefined') return;
      if (document.hidden) engine.visibilityChange(true);
      else { engine.visibilityChange(false); engine.resume(); }
      bump();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [active, phase, currentScenarioId, bump, now]);

  // Auto-avance del loop de verificación (NPC confirma, Doc 2 §14).
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || engine.state !== S.VERIFICATION) return undefined;
    const id = setTimeout(() => { engine.completeVerification(); bump(); }, CONTROL_ROOM_NPC_REPLY_DELAY_MS);
    return () => clearTimeout(id);
  }, [tick, bump]);

  // Auto-avance consecuencia → complete (Doc 2 §14).
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || engine.state !== S.CONSEQUENCE) return undefined;
    const id = setTimeout(() => { engine.completeScenario(); bump(); }, engine.scenario.consequenceMs ?? 2000);
    return () => clearTimeout(id);
  }, [tick, bump]);

  // Escenario completo → avanzar la fase de sesión (o onComplete en modo único).
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || advancedRef.current) return;
    if (engine.state !== S.COMPLETE && engine.state !== S.TECHNICAL_ERROR) return;
    advancedRef.current = true;
    const isPractice = engine.scenario.practice === true;
    if (singleMode) {
      onCompleteRef.current?.({
        aggregateSchemaVersion: 'control_room_aggregate_v1',
        gameId: 'control_room',
        scenarioId: engine.scenario.id,
        form: engine.scenario.form ?? null,
        block: engine.scenario.block,
        practice: isPractice,
        completed: true,
        scored: engine.scored === true,
        resolved: engine.resolved === true,
        ...engine.metrics(),
        dimensions: engine.dimensionScores(),
        integrityFlags: engine.integrityFlags(),
        aggregateOnly: true,
      });
      return;
    }
    if (!isPractice) {
      resultsRef.current.push({
        scenarioId: engine.scenario.id,
        form: engine.scenario.form ?? null,
        block: engine.scenario.block,
        scored: engine.scored === true,
        resolved: engine.resolved === true,
        metrics: engine.metrics(),
        dimensionStats: engine.dimensionStats(),
        integrityFlags: engine.integrityFlags(),
      });
    }
    const nextIndex = sessionIndex + 1;
    if (mode === 'tutorial') {
      if (nextIndex < list.length) setSessionIndex(nextIndex);
      else setPhase(PHASE.TUTORIAL_EXIT);
    } else {
      if (nextIndex >= list.length) { setPhase(PHASE.FINAL); }
      else {
        const nextBlock = getControlRoomScenario(list[nextIndex]).block;
        const curBlock = getControlRoomScenario(list[sessionIndex]).block;
        setSessionIndex(nextIndex);
        setPhase(nextBlock !== curBlock ? PHASE.BLOCK_INTRO : PHASE.SCENARIO);
      }
    }
    bump();
  }, [tick]);

  // Final → onComplete con el agregado de sesión (12 escenarios evaluados).
  useEffect(() => {
    if (phase !== PHASE.FINAL) return;
    onCompleteRef.current?.(buildControlRoomSessionAggregate(resultsRef.current));
  }, [phase]);

  // ---------- Pantallas de flujo (modo sesión) ----------
  if (phase === PHASE.WELCOME) {
    const W = CONTROL_ROOM_WELCOME;
    return (
      <section className="control-room control-room--screen" data-testid="control-room" data-cr-phase="welcome" aria-label={W.title[lang]}>
        <h1 className="cr-screen__title">{W.title[lang]}</h1>
        <p className="cr-screen__sub">{W.sub[lang]}</p>
        <p className="cr-screen__body">{W.message[lang]}</p>
        <button type="button" className="cr-send" data-testid="cr-welcome-cta" onClick={() => { setMode('tutorial'); setSessionIndex(0); setPhase(PHASE.SCENARIO); bump(); }}>
          {W.cta[lang]}
        </button>
      </section>
    );
  }

  if (phase === PHASE.TUTORIAL_EXIT) {
    const E = CONTROL_ROOM_TUTORIAL_EXIT;
    return (
      <section className="control-room control-room--screen" data-testid="control-room" data-cr-phase="tutorial_exit" aria-label={t('Práctica completada', 'Practice complete')}>
        <p className="cr-screen__body">{E.text[lang]}</p>
        <button type="button" className="cr-send" data-testid="cr-start-evaluation"
          onClick={() => { setMode('evaluation'); setSessionIndex(0); setPhase(PHASE.BLOCK_INTRO); bump(); }}>
          {E.cta[lang]}
        </button>
      </section>
    );
  }

  if (phase === PHASE.BLOCK_INTRO) {
    const introBlock = getControlRoomScenario(list[sessionIndex])?.block ?? 1;
    const intro = CONTROL_ROOM_BLOCK_INTROS[introBlock];
    return (
      <section className="control-room control-room--screen" data-testid="control-room" data-cr-phase="block_intro" aria-label={t('Introducción del bloque', 'Block introduction')}>
        <p className="cr-screen__body" data-testid="cr-block-intro">{intro?.[lang]}</p>
        <button type="button" className="cr-send" data-testid="cr-block-continue" onClick={() => { setPhase(PHASE.SCENARIO); bump(); }}>
          {t('Continuar', 'Continue')}
        </button>
      </section>
    );
  }

  if (phase === PHASE.FINAL) {
    return (
      <section className="control-room control-room--screen" data-testid="control-room" data-cr-phase="final" role="status" aria-label={t('Final', 'Final')}>
        <p className="cr-screen__body" data-testid="cr-final">{CONTROL_ROOM_FINAL.text[lang]}</p>
      </section>
    );
  }

  // ---------- phase === SCENARIO: sala de control (C2) + overlay tutorial (C3) ----------
  const engine = engineRef.current;
  if (!engine) {
    return (
      <section className="control-room" data-testid="control-room" aria-label={t('Sala de Control', 'Control room')}>
        <p className="cr-loading">{t('Preparando la simulación…', 'Preparing the simulation…')}</p>
      </section>
    );
  }

  const scenario = engine.scenario;
  const step = engine.currentStep();
  const state = engine.state;
  const cards = engine.availableCards();
  const trayBlocks = engine.composerBlocks();
  const composed = engine.composerSelection;
  const isComposerStep = !!step?.composer;
  const canSend = state === S.RESPONSE && (isComposerStep ? composed.length > 0 : engine.selectedCardId != null);
  const headerTimer = scenario.timeoutMs != null ? formatTimer(engine.timerRemainingMs()) : null;
  const isTutorial = !singleMode && mode === 'tutorial';
  const tutorialHints = isTutorial ? (CONTROL_ROOM_TUTORIAL_HINTS_BY_SCENARIO[scenario.id]?.[step?.nodeId] ?? []) : [];

  function handleCardSelect(id) { const res = engine.selectCard(id); if (res.ok && res.changed) sfx('select'); bump(); }
  function handleSend() { const res = engine.send(); if (res.ok) sfx('bomb_success'); else if (res.reason === 'no_selection') sfx('denied'); bump(); }
  function handleAddBlock(id) { if (engine.addBlock(id).ok) sfx('place'); bump(); }
  function handleRemoveBlock(id) { engine.removeBlock(id); sfx('move'); bump(); }
  function handleReorder(from, to) { engine.reorderBlock(from, to); sfx('move'); bump(); }

  const blockLabel = scenario.practice ? t('Práctica', 'Practice') : t(`Bloque ${scenario.block}`, `Block ${scenario.block}`);

  return (
    <section
      className="control-room"
      data-testid="control-room"
      data-cr-state={state}
      data-cr-phase="scenario"
      data-cr-mode={singleMode ? 'single' : mode}
      data-cr-mobile={isMobile || undefined}
      data-cr-tablet={isTablet || undefined}
      aria-label={t('Sala de Control', 'Control room')}
    >
      <header className="cr-header">
        <span className="cr-header__block">{blockLabel}</span>
        <span className="cr-header__incident" data-testid="cr-incident">{scenario.name?.[lang]}</span>
        {scenario.timeoutMs != null && (
          <span className="cr-header__timer" data-testid="cr-timer" aria-label={t('Tiempo restante', 'Time remaining')}>{headerTimer}</span>
        )}
      </header>

      {isTutorial && tutorialHints.length > 0 && (
        <div className="cr-tutorial-hint" data-testid="cr-tutorial-hint" role="note">
          <span className="cr-tutorial-hint__badge">{t('Tutorial', 'Tutorial')}</span>
          {tutorialHints.map((tid) => (
            <span key={tid} className="cr-tutorial-hint__text">{CONTROL_ROOM_TUTORIAL_NODES[tid]?.copy[lang]}</span>
          ))}
        </div>
      )}

      <div className="cr-main">
        <aside className="cr-facts" aria-label={t('Datos del sistema', 'System data')} data-testid="cr-facts">
          <h2 className="cr-facts__title">{t('Datos del sistema', 'System data')}</h2>
          <ul className="cr-facts__list">
            {scenario.facts.map((f) => (
              <li key={f.key} className={`cr-fact${f.critical ? ' cr-fact--critical' : ''}`}>
                <span className="cr-fact__key">{f.key}</span>
                <span className="cr-fact__value">{f.value}</span>
                {f.critical && <span className="cr-fact__tag" aria-hidden="true">!</span>}
              </li>
            ))}
          </ul>
        </aside>

        <div className="cr-npc" aria-live="polite" data-testid="cr-npc">
          <div className="cr-npc__id">
            <span className="cr-npc__avatar" aria-hidden="true">{RECEIVER_ICONS[scenario.receiver.role] ?? '👤'}</span>
            <span className="cr-npc__role">{scenario.receiver.name?.[lang]}</span>
          </div>
          {step && (state === S.NPC_TURN || state === S.RESPONSE || state === S.VERIFICATION) && (
            <div className="cr-npc__bubble" data-testid="cr-npc-bubble">{step.npc?.[lang]}</div>
          )}
        </div>
      </div>

      {(state === S.RESPONSE || state === S.VERIFICATION) && (
        <div className="cr-response" data-testid="cr-response">
          {isComposerStep ? (
            <div className="cr-composer">
              <div className="cr-composer__tray" role="group" aria-label={t('Bloques disponibles', 'Available blocks')}>
                {trayBlocks.map((b) => {
                  const added = composed.includes(b.id);
                  return (
                    <button key={b.id} type="button" className={`cr-block${added ? ' cr-block--added' : ''}`}
                      data-testid={`cr-block-${b.id}`} disabled={added} aria-pressed={added} onClick={() => handleAddBlock(b.id)}>
                      {b.text?.[lang]}
                    </button>
                  );
                })}
              </div>
              <div className="cr-composer__stage" aria-label={t('Mensaje construido', 'Built message')}>
                {composed.length === 0
                  ? <p className="cr-composer__empty">{t('Toca los bloques para construir el mensaje.', 'Tap blocks to build the message.')}</p>
                  : composed.map((id, i) => {
                      const b = trayBlocks.find((x) => x.id === id);
                      return (
                        <span key={id} className="cr-composed" data-testid={`cr-composed-${id}`}>
                          <span className="cr-composed__text">{b?.text?.[lang]}</span>
                          <button type="button" className="cr-composed__ctl" aria-label={t('Mover a la izquierda', 'Move left')} disabled={i === 0} onClick={() => handleReorder(i, i - 1)}>‹</button>
                          <button type="button" className="cr-composed__ctl" aria-label={t('Mover a la derecha', 'Move right')} disabled={i === composed.length - 1} onClick={() => handleReorder(i, i + 1)}>›</button>
                          <button type="button" className="cr-composed__ctl cr-composed__ctl--remove" aria-label={t('Quitar bloque', 'Remove block')} onClick={() => handleRemoveBlock(id)}>×</button>
                        </span>
                      );
                    })}
              </div>
            </div>
          ) : (
            <div className="cr-cards" role="group" aria-label={t('Respuestas', 'Responses')}>
              {cards.map((c) => {
                const selected = engine.selectedCardId === c.id;
                return (
                  <button key={c.id} type="button" className={`cr-card${selected ? ' cr-card--selected' : ''}`}
                    data-testid={`cr-card-${c.id}`} aria-pressed={selected} onClick={() => handleCardSelect(c.id)}>
                    {c.text?.[lang]}
                  </button>
                );
              })}
            </div>
          )}

          <div className="cr-actions">
            {state === S.VERIFICATION
              ? <p className="cr-actions__verify" data-testid="cr-verifying">{t('Confirmando con el interlocutor…', 'Confirming with the contact…')}</p>
              : (
                <button type="button" className="cr-send" data-testid="cr-send" disabled={!canSend} onClick={handleSend}>
                  {t('Enviar mensaje', 'Send message')}
                </button>
              )}
          </div>
        </div>
      )}

      {state === S.CONSEQUENCE && (
        <div className="cr-consequence" data-testid="cr-consequence" role="status">
          <p>{(scenario.outcome?.[engine.resolved ? 'resolved' : 'unresolved'])?.[lang]}</p>
        </div>
      )}
      {state === S.TECHNICAL_ERROR && (
        <div className="cr-error" data-testid="cr-error" role="alert">
          <p>{t('Se produjo un problema técnico con la simulación.', 'A technical issue occurred in the simulation.')}</p>
        </div>
      )}
    </section>
  );
}
