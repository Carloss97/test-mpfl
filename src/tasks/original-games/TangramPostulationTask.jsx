import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GameRuntime from '../GameRuntime.jsx';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import {
  TANGRAM_EXP_ID,
  buildTangramLevelAggregate,
  buildTangramSessionAggregate,
  getTangramLevelParams,
  isValidSnap,
  normalizeRotationDeg,
  sanitizeTangramPayload,
} from './tangramTelemetry.js';
import { coveragePercent as calcCoverage } from './tangramStages.js';
import {
  buildTangramSlots,
  buildTangramTray,
  slotVerticesPx,
  toPixels,
  trayVerticesPx,
  TANGRAM_SILHOUETTE,
} from './tangramStages.js';
import {
  deriveTangramUiState,
  getTangramCanvasSignalClass,
  getTangramHudCopy,
  getTangramOutcomeMessage,
  getTangramTransitionCopy,
  getTangramFinalCopy,
  getTangramWelcomeCopy,
} from './tangramFeedback.js';
import GamePips from '../../postulation-demo/GamePips.jsx';
import GameMicroIntro from '../../postulation-demo/GameMicroIntro.jsx';
import { playSfx } from './originalGameSfx.js';
import { installGameFocusClock, now } from './gameClock.js';
import { GAME_KEYBOARD, tangramKeyAction } from './gameKeyboard.js';
import { markPracticeSummary } from '../../postulation-demo/originalGamePractice.js';

installGameFocusClock();

const TANGRAM_GAME_DEFINITION = Object.freeze({ id: 'tangram_exp001', label: 'Tangram: Ensamblaje Geométrico', difficulty: 'spatial_planning' });

const ROTATION_STEP = 45;

// Canvas lógico fijo (se escala visualmente con CSS a viewport real).
const LOGICAL_W = 600;
const LOGICAL_H = 420;

function polyPath(verts) {
  if (!verts?.length) return '';
  return verts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ') + ' Z';
}

function TangramInner({ emit, width, height, onComplete, practice = false }) {
  const { t } = useLanguage();
  const emitRef = useRef(emit);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { emitRef.current = emit; }, [emit]);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  // fases: welcome -> tutorial -> transition -> play(1..4) -> finished
  const [phase, setPhase] = useState('welcome');
  const [level, setLevel] = useState(1);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [introDone, setIntroDone] = useState(false);
  const [finished, setFinished] = useState(false);

  // piezas del nivel actual
  const slots = useMemo(() => (phase === 'play' ? buildTangramSlots(level) : []), [level, phase]);
  const [pieces, setPieces] = useState([]);
  const [selectedPieceId, setSelectedPieceId] = useState(null);
  const [snapFlashId, setSnapFlashId] = useState(null);
  const [levelOutcome, setLevelOutcome] = useState(null); // 'success' | 'timeout' | 'moves_exhausted'

  // refs para métricas
  const levelStartRef = useRef(0);
  const firstInteractionRef = useRef(null); // timestamp primer pointer-down
  const dragPathRef = useRef([]); // distancia acumulada de drag (eficiencia trayectoria)
  const straightDistanceRef = useRef(0); // distancia ideal pieza→slot
  const hesitationRef = useRef(0);
  const lastMoveRef = useRef(0);
  const movesRef = useRef(0);
  const rotationsRef = useRef(0);
  const levelAggregatesRef = useRef([]);
  const timeoutsRef = useRef([]);
  const jitterWindowRef = useRef([]); // [t, x, y] últimos 10s
  const moveLimitRef = useRef(0);

  const pushTimeout = (fn, ms) => {
    const id = window.setTimeout(fn, ms);
    timeoutsRef.current.push(id);
    return id;
  };
  useEffect(() => () => { timeoutsRef.current.forEach((id) => window.clearTimeout(id)); }, []);

  const params = getTangramLevelParams(level);
  const moveLimit = params?.moveLimit ?? 0;
  const allowMoves = moveLimit > 0;
  const allowTimed = (params?.timeLimitS ?? 0) > 0;

  const initLevel = useCallback((lvl) => {
    const p = getTangramLevelParams(lvl);
    setLevel(lvl);
    setPieces(buildTangramTray(lvl, LOGICAL_W, LOGICAL_H));
    setSelectedPieceId(null);
    setLevelOutcome(null);
    setSnapFlashId(null);
    movesRef.current = 0;
    rotationsRef.current = 0;
    firstInteractionRef.current = null;
    dragPathRef.current = [];
    straightDistanceRef.current = 0;
    hesitationRef.current = 0;
    jitterWindowRef.current = [];
    moveLimitRef.current = p.moveLimit ?? 0;
    levelStartRef.current = now();
    setSecondsLeft(p.timeLimitS ?? 0);
  }, []);

  // inicio: bienvenida + tutorial
  useEffect(() => {
    if (phase === 'welcome') return;
    if (phase === 'tutorial') {
      initLevel(0);
      return;
    }
    if (phase === 'play') {
      initLevel(level);
      pushTimeout(() => {
        if (introDone && level > 0) {
          const shownSlots = buildTangramSlots(level);
          emitRef.current({
            eventType: 'stimulus_shown',
            trialId: `tangram_level_${level}`,
            targetId: `tangram_level_${level}_slots`,
            timestamp: now(),
            stimulus: {
              kind: 'tangram_level',
              payload: { level, levelCount: 4, pieceCount: shownSlots.length, timeLimitS: getTangramLevelParams(level)?.timeLimitS ?? 0 },
            },
            gameState: { level, difficulty: 'tangram', score: 0 },
          });
        }
      }, 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, level, introDone]);

  // temporizador (solo niveles evaluativos con tiempo)
  useEffect(() => {
    if (phase !== 'play' || !introDone || !allowTimed || finished || levelOutcome) return undefined;
    const tick = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.clearInterval(tick);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(tick);
  }, [phase, introDone, allowTimed, finished, level, levelOutcome]);

  const placedCount = useMemo(() => pieces.filter((p) => p.snappedSlotId).length, [pieces]);
  const coverage = useMemo(() => calcCoverage(pieces, slots), [pieces, slots]);

  // terminar nivel
  const finishLevel = useCallback((outcome, extraMetrics = {}) => {
    if (levelOutcome) return;
    setLevelOutcome(outcome);
    const p = getTangramLevelParams(level);
    const levelTimeMs = now() - levelStartRef.current;

    // jitter last 10s: varianza de aceleración aproximada en la ventana
    const window = jitterWindowRef.current;
    const cutoff = levelTimeMs - 10000;
    const recent = window.filter(([tt]) => tt >= cutoff);
    let jitter = 0;
    if (recent.length > 2) {
      const accs = [];
      for (let i = 2; i < recent.length; i += 1) {
        const dx = recent[i][1] - recent[i - 1][1];
        const dy = recent[i][2] - recent[i - 1][2];
        const dt = Math.max(1, recent[i][0] - recent[i - 1][0]);
        accs.push((Math.abs(dx) + Math.abs(dy)) / dt);
      }
      const mean = accs.reduce((a, b) => a + b, 0) / accs.length;
      jitter = accs.reduce((a, b) => a + (b - mean) ** 2, 0) / accs.length / 1e6;
    }

    const solved = outcome === 'success';
    const levelMetrics = {
      completed: solved,
      timedOut: outcome === 'timeout',
      moveLimitReached: outcome === 'moves_exhausted',
      coveragePercent: coverage,
      movesUsed: movesRef.current,
      rotationsUsed: rotationsRef.current,
      timeMs: levelTimeMs,
      score: solved ? 100 : 0,
      initialLatencyMs: firstInteractionRef.current ? (firstInteractionRef.current - levelStartRef.current) : 0,
      trajectoryDistance: dragPathRef.current,
      idealDistance: straightDistanceRef.current,
      hesitationMs: hesitationRef.current,
      optimalMoves: p.optimalMoves ?? placedCount,
      last10sJitter: jitter,
      ...extraMetrics,
    };
    const levelAggregate = buildTangramLevelAggregate(level, levelMetrics, { noiseFlag: false });
    levelAggregatesRef.current.push(levelAggregate);

    playSfx(solved ? 'success' : 'denied');
    emitRef.current({
      eventType: 'response',
      trialId: `tangram_level_${level}`,
      targetId: `tangram_level_${level}_slots`,
      timestamp: now(),
      response: sanitizeTangramPayload(levelAggregate),
      gameState: { level, difficulty: 'tangram', score: levelAggregate.score },
    });
  }, [coverage, level, levelOutcome]);

  // transición a siguiente nivel o fin
  useEffect(() => {
    if (!levelOutcome || phase !== 'play') return undefined;
    pushTimeout(() => {
      if (level >= 4 || practice) {
        // fin del módulo
        setFinished(true);
        playSfx('complete');
        const session = buildTangramSessionAggregate(levelAggregatesRef.current, {
          highLatencyAtStress: false,
        });
        const aggregate = sanitizeTangramPayload({
          ...session,
          completed: true,
          score: Math.round(session.avgCoveragePercent * 0.6 + (session.solvedLevels / Math.max(1, session.levelsAttempted)) * 40),
        });
        emitRef.current({
          eventType: 'game_end',
          timestamp: now(),
          gameState: { level: 4, difficulty: 'tangram', score: aggregate.score },
        });
        onCompleteRef.current?.({
          gameId: 'tangram_exp001',
          ...aggregate,
          ...(practice ? markPracticeSummary('tangram_exp001', aggregate) : null),
        });
        return;
      }
      // tutorial completado -> transición evaluativa
      if (level === 0) {
        setPhase('transition');
        return;
      }
      setLevel((lv) => lv + 1);
      setLevelOutcome(null);
    }, 1400);
    return () => undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelOutcome, phase]);

  const rotateSelected = useCallback(() => {
    if (phase !== 'play' || !introDone || levelOutcome) return;
    const sel = selectedPieceId;
    if (!sel) return;
    setPieces((ps) => ps.map((p) => (
      p.pieceId === sel && !p.snappedSlotId
        ? { ...p, rotationDeg: normalizeRotationDeg(p.rotationDeg + ROTATION_STEP) }
        : p
    )));
    rotationsRef.current += 1;
    playSfx('rotate');
  }, [phase, introDone, levelOutcome, selectedPieceId]);

  const selectPiece = useCallback((pieceId) => {
    if (phase !== 'play' && phase !== 'tutorial') return;
    setSelectedPieceId(pieceId);
    playSfx('select');
  }, [phase]);

  // mover pieza (drag) — simplificación de interacción: click en pieza la selecciona,
  // click en slot encaja si válida. Drag continuo registrado vía pointer events.
  const attemptSnapToSlot = useCallback((slot) => {
    if (!selectedPieceId || levelOutcome) return;
    const piece = pieces.find((p) => p.pieceId === selectedPieceId);
    if (!piece || piece.snappedSlotId) return;
    const candidate = {
      shapeId: piece.shapeId,
      rotationDeg: piece.rotationDeg,
      position: slot.position,
    };
    // distancia ideal pieza->slot
    const [px, py] = toPixels(piece.trayPosition, LOGICAL_W, LOGICAL_H);
    const [sx, sy] = toPixels(slot.position, LOGICAL_W, LOGICAL_H);
    if (straightDistanceRef.current === 0) {
      straightDistanceRef.current = Math.hypot(sx - px, sy - py);
    }

    const valid = isValidSnap(candidate, slot, 8)
      && !pieces.some((p) => p.snappedSlotId === slot.slotId);
    if (valid) {
      setPieces((ps) => ps.map((p) => (p.pieceId === selectedPieceId ? { ...p, snappedSlotId: slot.slotId } : p)));
      setSnapFlashId(slot.slotId);
      pushTimeout(() => setSnapFlashId(null), 250);
      movesRef.current += 1;
      playSfx('place');
      setSelectedPieceId(null);
      // cobertura completa -> éxito
      const newCoverage = calcCoverage(
        pieces.map((p) => (p.pieceId === selectedPieceId ? { ...p, snappedSlotId: slot.slotId } : p)),
        slots,
      );
      if (newCoverage >= 100) {
        finishLevel('success');
        return;
      }
      // check límite movimientos
      if (allowMoves && movesRef.current >= moveLimitRef.current) {
        finishLevel('moves_exhausted');
      }
    } else {
      movesRef.current += 1;
      playSfx('denied');
      setSnapFlashId(null);
      if (allowMoves && movesRef.current >= moveLimitRef.current) {
        finishLevel('moves_exhausted');
      }
    }
  }, [selectedPieceId, pieces, slots, levelOutcome, allowMoves, finishLevel]);

  const lastPointerRef = useRef(null);
  const handlePointerMove = useCallback((e) => {
    if (phase !== 'play' && phase !== 'tutorial') return;
    const t = now();
    if (firstInteractionRef.current === null) {
      firstInteractionRef.current = t;
    }
    const x = e.nativeEvent?.clientX ?? 0;
    const y = e.nativeEvent?.clientY ?? 0;
    if (lastPointerRef.current) {
      const seg = Math.hypot(x - lastPointerRef.current[0], y - lastPointerRef.current[1]);
      dragPathRef.current += seg;
    }
    lastPointerRef.current = [x, y];
    jitterWindowRef.current.push([t, x, y]);
    if (jitterWindowRef.current.length > 300) jitterWindowRef.current.shift();
  }, [phase]);

  const handleBoardKeyDown = useCallback((event) => {
    const action = tangramKeyAction(event.key, pieces.filter((p) => !p.snappedSlotId).length);
    if (!action) return;
    event.preventDefault();
    if (action.action === 'select') {
      const free = pieces.filter((p) => !p.snappedSlotId);
      if (free[action.index]) selectPiece(free[action.index].pieceId);
    } else if (action.action === 'rotate') {
      rotateSelected();
    } else if (action.action === 'snap') {
      // snap to first free slot
      const sel = pieces.find((p) => p.pieceId === selectedPieceId);
      if (sel) {
        const freeSlot = slots.find((s) => !pieces.some((p) => p.snappedSlotId === s.slotId));
        if (freeSlot) attemptSnapToSlot(freeSlot);
      }
    } else if (action.action === 'return') {
      setSelectedPieceId(null);
    }
  }, [attemptSnapToSlot, pieces, rotateSelected, selectPiece, selectedPieceId, slots]);

  // UI state
  const uiState = deriveTangramUiState({
    secondsLeft,
    movesLeft: allowMoves ? Math.max(0, moveLimitRef.current - movesRef.current) : Infinity,
    allowTimed,
    allowMoves,
  });
  const hud = getTangramHudCopy(t, uiState, {
    secondsLeft: allowTimed ? secondsLeft : 0,
    movesLeft: allowMoves ? Math.max(0, moveLimitRef.current - movesRef.current) : Infinity,
    level,
    of: 4,
  });
  const welcome = getTangramWelcomeCopy(t);
  const transition = getTangramTransitionCopy(t);
  const finalCopy = getTangramFinalCopy(t);
  const outcomeMsg = getTangramOutcomeMessage(t, levelOutcome);

  if (phase === 'welcome') {
    return (
      <div className="tangram-task tangram-task--welcome" data-testid="tangram-welcome" onPointerMove={handlePointerMove}>
        <h3 className="task-title">🧩 {welcome.title}</h3>
        <p className="tangram-welcome__intro">{welcome.intro}</p>
        <ul className="tangram-welcome__points">
          <li>{welcome.pieces}</li>
          <li>{welcome.resources}</li>
          <li>{welcome.precision}</li>
        </ul>
        <button type="button" className="primary tangram-welcome__cta" data-testid="tangram-start-tutorial" onClick={() => setPhase('tutorial')}>
          {welcome.cta}
        </button>
      </div>
    );
  }

  if (phase === 'transition') {
    return (
      <div className="tangram-task tangram-task--transition" data-testid="tangram-transition" onPointerMove={handlePointerMove}>
        <h3 className="task-title">{transition.title}</h3>
        <p>{transition.message}</p>
        <button type="button" className="primary" data-testid="tangram-start-eval" onClick={() => { setPhase('play'); setLevel(1); }}>
          {transition.cta}
        </button>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="tangram-task tangram-task--finished" data-testid="tangram-finished" onPointerMove={handlePointerMove}>
        <h3 className="task-title">{finalCopy.title}</h3>
        <p>{finalCopy.message}</p>
      </div>
    );
  }

  const silPath = polyPath(TANGRAM_SILHOUETTE.map(([x, y]) => toPixels([x, y], LOGICAL_W, LOGICAL_H)));

  return (
    <div className="tangram-task" data-testid="tangram-task" onPointerMove={handlePointerMove}>
      <div className="task-header tangram-task__header">
        <h3 className="task-title">🧩 {t('Ensamblaje Geométrico', 'Geometric Assembly')}</h3>
        <span className="task-progress" data-testid="tangram-level-label">{phase === 'tutorial' ? t('Práctica', 'Practice') : hud.level}</span>
        {phase === 'play' && <GamePips step={level - 1} total={4} />}
        <span className={`task-progress tangram-hud-${uiState}`} data-testid="tangram-moves">{hud.moves}</span>
        {allowTimed && <span className={`task-progress tangram-hud-${uiState}`} data-testid="tangram-time">{hud.time}</span>}
      </div>

      {phase === 'tutorial' && (
        <p className="tangram-task__tutorial-hint" data-testid="tangram-tutorial-hint">
          {t('Tutorial: clic en una pieza y luego en la zona de su forma para encajarla. Usa Espacio/R para rotar 45°.', 'Tutorial: click a piece then its matching zone to snap. Use Space/R to rotate 45°.')
          }
        </p>
      )}

      <div className="tangram-task__canvas-wrap">
        <svg
          className={`tangram-canvas ${getTangramCanvasSignalClass(uiState)} ${phase === 'tutorial' ? 'tangram-canvas--tutorial' : ''}`}
          viewBox={`0 0 ${LOGICAL_W} ${LOGICAL_H}`}
          width="100%"
          height="100%"
          role="application"
          tabIndex={0}
          aria-label={t('Lienzo Tangram. Selecciona una pieza y encajala en la zona de su forma. Espacio/R rota, Q deselecciona.', 'Tangram canvas. Select a piece and place it in its matching zone. Space/R rotates, Q deselects.')}
          onKeyDown={handleBoardKeyDown}
          data-testid="tangram-canvas"
        >
          {/* silueta objetivo */}
          <path d={silPath} className="tangram-silhouette" fill="none" stroke="#2B6CB0" strokeWidth="3" strokeDasharray="8 4" />
          {/* slots objetivo */}
          {slots.map((slot) => {
            const filled = pieces.some((p) => p.snappedSlotId === slot.slotId);
            const verts = slotVerticesPx(slot, LOGICAL_W, LOGICAL_H);
            return (
              <g key={slot.slotId} data-testid={`tangram-slot-${slot.shapeId}-${slot.slotIndex}`} className={filled ? 'tangram-slot tangram-slot--filled' : 'tangram-slot'}>
                <path d={polyPath(verts)} onClick={() => attemptSnapToSlot(slot)} fill={filled ? 'rgba(59,130,246,0.7)' : 'rgba(43,108,176,0.12)'} stroke={filled ? '#3B82F6' : '#2B6CB0'} strokeWidth={snapFlashId === slot.slotId ? 4 : 1.5} className={snapFlashId === slot.slotId ? 'tangram-slot--flash' : ''} />
              </g>
            );
          })}
          {/* piezas libres en bandeja (bajo el lienzo) */}
          {pieces.filter((p) => !p.snappedSlotId).map((p, i) => {
            const [cx, cy] = toPixels(p.trayPosition, LOGICAL_W, LOGICAL_H);
            const verts = trayVerticesPx({ ...p, trayPosition: p.trayPosition }, LOGICAL_W, LOGICAL_H);
            return (
              <g key={p.pieceId} data-testid={`tangram-piece-${i + 1}`} className={selectedPieceId === p.pieceId ? 'tangram-piece tangram-piece--selected' : 'tangram-piece'} onClick={() => selectPiece(p.pieceId)} role="button" aria-label={t('Pieza {s}', 'Piece {s}').replace('{s}', p.shapeId)}>
                <path d={polyPath(verts)} fill={selectedPieceId === p.pieceId ? '#F6AD55' : '#4A5568'} stroke={selectedPieceId === p.pieceId ? '#D69E2E' : '#2D3748'} strokeWidth="2" />
                <text x={cx} y={cy} className="tangram-piece__idx" fill="#fff" textAnchor="middle" pointerEvents="none">{i + 1}</text>
              </g>
            );
          })}
        </svg>

        {levelOutcome && (
          <div className="tangram-task__overlay" data-testid="tangram-outcome" role="status">
            <div className={`tangram-task__overlay-card ${levelOutcome === 'success' ? 'tangram-task__overlay-card--success' : 'tangram-task__overlay-card--fail'}`}>
              <strong>{outcomeMsg}</strong>
              <span>{t('Cobertura: {c}%', 'Coverage: {c}%').replace('{c}', coverage)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="tangram-task__footer">
        <p role="status">{phase === 'tutorial' ? t('Encaja todas las piezas para cerrar la práctica.', 'Fit all pieces to close the practice.') : t('Cobertura en tiempo real', 'Real-time coverage')}: <strong data-testid="tangram-coverage">{coverage}%</strong></p>
        <small className="tangram-task__keyboard-hint">{t(GAME_KEYBOARD.tangram.hintEs, GAME_KEYBOARD.tangram.hintEn)}</small>
        <div className="tangram-task__actions">
          <button type="button" className="secondary" data-testid="tangram-rotate-btn" onClick={rotateSelected}>
            {t('Rotar 45°', 'Rotate 45°')}
          </button>
          <button type="button" className="secondary" data-testid="tangram-deselect-btn" onClick={() => setSelectedPieceId(null)}>
            {t('Deseleccionar', 'Deselect')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TangramPostulationTask({ active = false, onGameEvent, onComplete, trialCount = 1, width = 606, height = 338, practice = false }) {
  return (
    <GameRuntime
      active={active}
      gameDefinition={TANGRAM_GAME_DEFINITION}
      onEvent={onGameEvent}
      renderTrial={(_, emit) => (
        <TangramInner emit={emit} width={width} height={height} onComplete={onComplete} practice={practice} />
      )}
    />
  );
}