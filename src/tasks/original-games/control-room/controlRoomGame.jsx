// controlRoomGame.jsx — EXP-COMM-001 (Sala de Control) · C2: UI responsive sala de control.
//
// Especificación (ley): docs/spec/EXP-COMM-001/ Doc 2 §6 (arquitectura de pantallas),
// §7 (layout responsive 3 tiers), §8 (componentes), §9 (acciones), §12 (compositor),
// §14 (timing), §16 (feedback), §17 (dirección visual), §18 (accesibilidad), §20 (errores).
// Doc 1 §7 (máquina de estados), §12.3 (input gate), §14.2 (integrity).
//
// Reglas duras:
//   - La UI consume el motor (controlRoomEngine.js) + manifest (controlRoomRules.js):
//     el estado conversacional ES el motor (single source of truth); la UI solo pinta y
//     despacha acciones. Ninguna regla de diálogo/veredicto vive aquí.
//   - Mundo NO tokenizado (H4.5): la paleta "centro de operaciones" vive en controlRoom.css;
//     solo el chrome compartido (pills, pips, sfx-toggle) usa tokens --k-*.
//   - Sin feedback que revele la respuesta: la consecuencia es narrativa neutral (§20.1);
//     nunca se muestra "correcto/incorrecto" ni la clave.
//   - A11y §18: targets ≥44px, sin hover, color+texto+icono, reduced-motion, audio opcional.
//
// Alcance C2: render de UN escenario (práctica por defecto para smoke). El bucle de la
// batería (12 escenarios + práctica, C5) monta este componente por escenario. C3 agrega el
// contenido tutorial T1-T5 + intros de bloque; C4 la telemetría agregada en onComplete.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../../i18n/LanguageContext.jsx';
import { playSfx, getGameSfxEnabled } from '../originalGameSfx.js';
import {
  buildControlRoomLevelSpec,
  getControlRoomScenario,
  CONTROL_ROOM_SCENARIOS,
  CONTROL_ROOM_NPC_REPLY_DELAY_MS,
} from './controlRoomRules.js';
import { createControlRoomEngine, CONTROL_ROOM_STATES } from './controlRoomEngine.js';
import './controlRoom.css';

export const CONTROL_ROOM_GAME_DEFINITION = Object.freeze({
  id: 'control_room',
  label: 'Sala de Control',
  labelEn: 'Control Room',
  difficulty: 'applied_communication',
});

// Escenario por defecto para smoke/C2: práctica determinista sin timeout.
export const CONTROL_ROOM_DEFAULT_SCENARIO_ID = 'CR-PRACTICE-01';

const S = CONTROL_ROOM_STATES;

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

const RECEIVER_ICONS = Object.freeze({
  operator: '👷',
  technician: '🔧',
  supervisor: '📋',
  client: '🤝',
});

function formatTimer(ms) {
  if (ms == null) return '';
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
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
  const [tick, setTick] = useState(0);
  const engineRef = useRef(null);
  const onGameEventRef = useRef(onGameEvent);
  const onCompleteRef = useRef(onComplete);
  const completedRef = useRef(false);
  const viewport = useViewportSize();
  const isMobile = viewport.width < 600;
  const isTablet = viewport.width >= 600 && viewport.width < 1024;

  useEffect(() => { onGameEventRef.current = onGameEvent; }, [onGameEvent]);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  const bump = useCallback(() => setTick((x) => x + 1), []);
  const sfx = useCallback((name) => {
    if (getGameSfxEnabled()) playSfx(name);
  }, []);

  // Crear + arrancar el motor al activarse (o cambiar de escenario).
  useEffect(() => {
    if (!active) return undefined;
    const resolvedId = scenarioId ?? (practice ? CONTROL_ROOM_DEFAULT_SCENARIO_ID : 'CR-L1-S01');
    const scenario = buildControlRoomLevelSpec(resolvedId, practice ? 'A' : undefined)
      ?? getControlRoomScenario(resolvedId)
      ?? CONTROL_ROOM_SCENARIOS[0];
    const engine = createControlRoomEngine({
      scenario,
      now: now ?? DEFAULT_NOW,
      log: (rec) => onGameEventRef.current?.(rec),
    });
    engine.start();
    engineRef.current = engine;
    completedRef.current = false;
    bump();

    // Ticker de timeout (solo escenarios con presión, B6).
    let interval = null;
    if (scenario.timeoutMs) {
      interval = setInterval(() => { engine.tick(); bump(); }, 250);
    }
    // Visibility (RESUME_SESSION / VISIBILITY_CHANGE, §14.2).
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
  }, [active, scenarioId, practice, bump, now]);

  const engine = engineRef.current;

  // Auto-avance del loop de verificación: el NPC confirma tras el reply delay (Doc 2 §14).
  useEffect(() => {
    if (!engine || engine.state !== S.VERIFICATION) return undefined;
    const id = setTimeout(() => { engine.completeVerification(); bump(); }, CONTROL_ROOM_NPC_REPLY_DELAY_MS);
    return () => clearTimeout(id);
  }, [tick, engine, bump]);

  // Auto-avance consecuencia → complete (Doc 2 §14: "1,5-2,5 s o tap para continuar").
  // Deja el escenario en COMPLETE para que la batería (C5) avance al siguiente.
  useEffect(() => {
    if (!engine || engine.state !== S.CONSEQUENCE) return undefined;
    const id = setTimeout(() => { engine.completeScenario(); bump(); }, engine.scenario.consequenceMs ?? 2000);
    return () => clearTimeout(id);
  }, [tick, engine, bump]);

  // Completar el escenario → onComplete con agregado (C4 enriquece el payload).
  useEffect(() => {
    if (!engine || completedRef.current) return;
    if (engine.state === S.COMPLETE || engine.state === S.TECHNICAL_ERROR) {
      completedRef.current = true;
      const m = engine.metrics();
      onCompleteRef.current?.({
        aggregateSchemaVersion: 'control_room_aggregate_v1',
        gameId: 'control_room',
        scenarioId: engine.scenario.id,
        form: engine.scenario.form ?? null,
        block: engine.scenario.block,
        practice: engine.scenario.practice === true,
        completed: true,
        scored: engine.scored === true,
        resolved: engine.resolved === true,
        ...m,
        dimensions: engine.dimensionScores(),
        integrityFlags: engine.integrityFlags(),
        aggregateOnly: true,
      });
    }
  }, [tick, engine]);

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
  const headerTimer = scenario.timeoutMs != null
    ? formatTimer(engine.timerRemainingMs())
    : null;

  function handleCardSelect(id) {
    const res = engine.selectCard(id);
    if (res.ok && res.changed) sfx('select');
    bump();
  }
  function handleSend() {
    const res = engine.send();
    if (res.ok) { sfx('bomb_success'); } else if (res.reason === 'no_selection') { sfx('denied'); }
    bump();
  }
  function handleAddBlock(id) {
    const res = engine.addBlock(id);
    if (res.ok) sfx('place');
    bump();
  }
  function handleRemoveBlock(id) {
    engine.removeBlock(id);
    sfx('move');
    bump();
  }
  function handleReorder(from, to) {
    engine.reorderBlock(from, to);
    sfx('move');
    bump();
  }

  const blockLabel = scenario.practice
    ? t('Práctica', 'Practice')
    : t(`Bloque ${scenario.block}`, `Block ${scenario.block}`);

  return (
    <section
      className="control-room"
      data-testid="control-room"
      data-cr-state={state}
      data-cr-mobile={isMobile || undefined}
      data-cr-tablet={isTablet || undefined}
      aria-label={t('Sala de Control', 'Control room')}
    >
      <header className="cr-header">
        <span className="cr-header__block">{blockLabel}</span>
        <span className="cr-header__incident" data-testid="cr-incident">
          {scenario.name?.[lang]}
        </span>
        {scenario.timeoutMs != null && (
          <span className="cr-header__timer" data-testid="cr-timer" aria-label={t('Tiempo restante', 'Time remaining')}>
            {headerTimer}
          </span>
        )}
      </header>

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
            <span className="cr-npc__avatar" aria-hidden="true">
              {RECEIVER_ICONS[scenario.receiver.role] ?? '👤'}
            </span>
            <span className="cr-npc__role">{scenario.receiver.name?.[lang]}</span>
          </div>
          {step && (state === S.NPC_TURN || state === S.RESPONSE || state === S.VERIFICATION) && (
            <div className="cr-npc__bubble" data-testid="cr-npc-bubble">{step.npc?.[lang]}</div>
          )}
        </div>
      </div>

      {state === S.RESPONSE || state === S.VERIFICATION ? (
        <div className="cr-response" data-testid="cr-response">
          {isComposerStep ? (
            <div className="cr-composer">
              <div className="cr-composer__tray" role="group" aria-label={t('Bloques disponibles', 'Available blocks')}>
                {trayBlocks.map((b) => {
                  const added = composed.includes(b.id);
                  return (
                    <button
                      key={b.id}
                      type="button"
                      className={`cr-block${added ? ' cr-block--added' : ''}`}
                      data-testid={`cr-block-${b.id}`}
                      disabled={added}
                      aria-pressed={added}
                      onClick={() => handleAddBlock(b.id)}
                    >
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
                          <button type="button" className="cr-composed__ctl" aria-label={t('Mover a la izquierda', 'Move left')}
                            disabled={i === 0} onClick={() => handleReorder(i, i - 1)}>‹</button>
                          <button type="button" className="cr-composed__ctl" aria-label={t('Mover a la derecha', 'Move right')}
                            disabled={i === composed.length - 1} onClick={() => handleReorder(i, i + 1)}>›</button>
                          <button type="button" className="cr-composed__ctl cr-composed__ctl--remove" aria-label={t('Quitar bloque', 'Remove block')}
                            onClick={() => handleRemoveBlock(id)}>×</button>
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
                  <button
                    key={c.id}
                    type="button"
                    className={`cr-card${selected ? ' cr-card--selected' : ''}`}
                    data-testid={`cr-card-${c.id}`}
                    aria-pressed={selected}
                    onClick={() => handleCardSelect(c.id)}
                  >
                    {c.text?.[lang]}
                  </button>
                );
              })}
            </div>
          )}

          <div className="cr-actions">
            {state === S.VERIFICATION ? (
              <p className="cr-actions__verify" data-testid="cr-verifying">{t('Confirmando con el interlocutor…', 'Confirming with the contact…')}</p>
            ) : (
              <button
                type="button"
                className="cr-send"
                data-testid="cr-send"
                disabled={!canSend}
                onClick={handleSend}
              >
                {t('Enviar mensaje', 'Send message')}
              </button>
            )}
          </div>
        </div>
      ) : null}

      {state === S.CONSEQUENCE && (
        <div className="cr-consequence" data-testid="cr-consequence" role="status">
          <p>{(scenario.outcome?.[engine.resolved ? 'resolved' : 'unresolved'])?.[lang]}</p>
        </div>
      )}

      {state === S.COMPLETE && (
        <div className="cr-complete" data-testid="cr-complete" role="status">
          <p>{t('Simulación finalizada. Tus respuestas fueron registradas correctamente.', 'Simulation complete. Your responses were recorded.')}</p>
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
