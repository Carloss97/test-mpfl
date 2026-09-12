import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GameRuntime from './GameRuntime.jsx';
import { useLanguage } from '../i18n/LanguageContext.jsx';

const DEFAULT_WIDTH = 600;
const DEFAULT_HEIGHT = 400;
const DEFAULT_TRIAL_COUNT = 6;
const TARGET_SYMBOL = '●';
const DISTRACTOR_SYMBOLS = Object.freeze(['○', '◇', '□', '△']);
// FASE B.5 (VSP-P1-1): todo trial termina por click o timeout — mismo contrato
// que el resto de la familia stable_dg (SimpleRT 3000 ms, GoNoGo 900 ms,
// ColorInterference 3200 ms). 10 s es generoso para setSize 20 en canvas 240 px;
// peor caso batería = 4 × (10 s + ITI 0.4 s) ≈ 42 s (durationLabel '45 s').
const DEFAULT_TRIAL_TIMEOUT_MS = 10000;
const DEFAULT_ITI_MS = 350;
// Piso de tile 44 px = AA touch targets (WCAG 2.5.5/2.5.8); el código legado
// usaba 42 (VSP-P2-3, dim. 7).
const MIN_TILE_SIZE_PX = 44;
const MAX_TILE_SIZE_PX = 64;
// VSP-P3-3: difficulty unificada al id del juego (patrón CIP-P3-3); el setSize
// por trial vive en el payload estímulo/respuesta, no en gameState.difficulty.
const VISUAL_SEARCH_GAME_DEFINITION = Object.freeze({ id: 'visual_search', label: 'Búsqueda visual', difficulty: 'visual_search' });

function round(value, digits = 4) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  const factor = 10 ** digits;
  return Math.round(numeric * factor) / factor;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function meanOf(values, digits = 2) {
  const numeric = values.map(Number).filter(Number.isFinite);
  if (!numeric.length) return 0;
  const factor = 10 ** digits;
  return Math.round((numeric.reduce((sum, value) => sum + value, 0) / numeric.length) * factor) / factor;
}

// VSP-P2-3: la rejilla se calcula con el tamaño REAL del canvas (el stage pasa
// 240×280 como piso; el código legado usaba safeWidth = max(260, w) mientras el
// task-area se renderizaba con w=240 → columna derecha cortada por overflow:
// hidden en setSize 20). El guard solo cubre inputs degenerados (NaN/0).
export function buildVisualSearchGridMetrics({ width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT, setSize = 8 } = {}) {
  const safeWidth = (Number.isFinite(Number(width)) && Number(width) > 0) ? Number(width) : DEFAULT_WIDTH;
  const safeHeight = (Number.isFinite(Number(height)) && Number(height) > 0) ? Number(height) : DEFAULT_HEIGHT;
  const safeSetSize = Math.max(1, Math.floor(Number(setSize) || 8));
  const cols = Math.ceil(Math.sqrt(safeSetSize * (safeWidth / Math.max(1, safeHeight))));
  const rows = Math.ceil(safeSetSize / cols);
  const cellW = safeWidth / cols;
  const cellH = safeHeight / rows;
  const tileSize = clamp(Math.floor(Math.min(cellW, cellH) * 0.47), MIN_TILE_SIZE_PX, MAX_TILE_SIZE_PX);
  return {
    cols,
    rows,
    tileSize,
    compact: safeWidth < 480 || safeHeight < 320,
  };
}

export function buildVisualSearchTilePresentation(item = {}) {
  const target = item.isTarget === true;
  return {
    label: item.symbol ?? (target ? TARGET_SYMBOL : '○'),
    ariaLabel: target ? 'Objetivo: punto sólido' : 'Distractor: forma geométrica',
    // t_42978412: sibling EN de presentación (el aria ES canónico no cambia).
    ariaLabelEn: target ? 'Target: solid dot' : 'Distractor: geometric shape',
    className: `visual-search-task__item visual-search-task__tile ${target ? 'visual-search-task__tile--target visual-search-task__item--target' : 'visual-search-task__tile--distractor visual-search-task__item--distractor'}`,
    visualTone: 'neutral',
    preSelectionHighlight: false,
  };
}

function gridPositions(width, height, count) {
  const { cols, rows } = buildVisualSearchGridMetrics({ width, height, setSize: count });
  const cellW = width / cols;
  const cellH = height / rows;
  return Array.from({ length: count }, (_, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    return {
      x: round(cellW * col + cellW / 2, 2),
      y: round(cellH * row + cellH / 2, 2),
    };
  });
}

// VSP-P2-4: celda objetivo y símbolos distractor aleatorizados por sesión
// (rng inyectable, patrón B.3/B.4). La rampa de setSize (8→12→16→20) se
// conserva: es el diseño de dificultad 'set_size'. El código legado era
// determinista (targetIndex = (5i+3) % size; símbolo = (i+trial) % 4) → todos
// los candidatos veían los mismos panels, y en el flujo eval de 12 trials el
// panel 0 era pixel-igual al panel 8.
export function buildVisualSearchTrials({ width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT, count = DEFAULT_TRIAL_COUNT, rng = Math.random } = {}) {
  const safeWidth = (Number.isFinite(Number(width)) && Number(width) > 0) ? Number(width) : DEFAULT_WIDTH;
  const safeHeight = (Number.isFinite(Number(height)) && Number(height) > 0) ? Number(height) : DEFAULT_HEIGHT;
  const trialCount = Math.max(1, Math.floor(Number(count) || DEFAULT_TRIAL_COUNT));
  const draw = () => {
    const value = Number(typeof rng === 'function' ? rng() : 0);
    // clamp: el contrato de rng es [0,1); un rng de test que devuelve 1.0 haría
    // Math.floor(1 * size) = size (out-of-bounds) — patrón B.3 (shuffleIndices).
    return Math.max(0, Math.min(0.999999, Number.isFinite(value) ? value : 0));
  };
  return Array.from({ length: trialCount }, (_, trialIndex) => {
    const setSize = 8 + (trialIndex % 4) * 4;
    const metrics = buildVisualSearchGridMetrics({ width: safeWidth, height: safeHeight, setSize });
    const positions = gridPositions(safeWidth, safeHeight, setSize);
    const targetIndex = Math.floor(draw() * setSize);
    const items = positions.map((position, index) => {
      const isTarget = index === targetIndex;
      return {
        id: `vs-${trialIndex}-${index}`,
        x: position.x,
        y: position.y,
        isTarget,
        symbol: isTarget ? TARGET_SYMBOL : DISTRACTOR_SYMBOLS[Math.floor(draw() * DISTRACTOR_SYMBOLS.length)],
        color: '#334155',
        containerTone: 'neutral',
        preSelectionHighlight: false,
        tileSize: metrics.tileSize,
      };
    });
    return {
      trialId: `visual-search-${trialIndex}`,
      targetId: items[targetIndex].id,
      trialIndex,
      setSize,
      targetIndex,
      distractorCount: setSize - 1,
      target: items[targetIndex],
      items,
      grid: metrics,
    };
  });
}

export function summarizeVisualSearchResults(results = [], trialCount = null) {
  const completed = results.filter(Boolean);
  const total = completed.length;
  const correct = completed.filter((result) => result.correct === true).length;
  const correctRTs = completed.filter((result) => result.correct === true).map((result) => result.reactionTimeMs);
  const distances = completed
    .map((result) => result.clickDistanceToTargetPx)
    .filter((value) => value !== null && value !== undefined);
  const accuracy = total ? round(correct / total, 4) : 0;
  const meanSetSize = total ? round(completed.reduce((sum, result) => sum + (Number(result.setSize) || 0), 0) / total, 2) : 0;
  const meanDistractorCount = total ? round(completed.reduce((sum, result) => sum + (Number(result.distractorCount) || 0), 0) / total, 2) : 0;
  const meanRTAll = total ? round(completed.reduce((sum, result) => sum + (Number(result.reactionTimeMs) || 0), 0) / total, 2) : 0;
  return {
    gameId: 'visual_search',
    // VSP-P2-1 (patrón CIP-P2-1/GNP-P2-1): claves de contrato del session
    // builder + card de reporte — sin ellas la RT/Score de visual_search no
    // entraban a la media de batería ni al "Tiempo"/"Puntaje" del reporte.
    trialCount: trialCount ?? total,
    totalTrials: total,
    completedTrialCount: total,
    meanReactionTimeMs: meanOf(correctRTs, 2), // solo RT de aciertos (canónico; timeouts excluidos)
    meanScore: total ? round(correct / total, 4) : 0,
    accuracy,
    errorRate: total ? round(1 - correct / total, 4) : 0,
    timeoutCount: completed.filter((result) => result.timedOut === true).length,
    meanRT: meanRTAll,
    meanSetSize,
    meanDistractorCount,
    meanClickDistanceToTargetPx: meanOf(distances, 2),
    searchEfficiency: meanRTAll > 0 ? round((correct / Math.max(1, total)) / (meanRTAll / 1000) / Math.max(1, meanSetSize / 8), 4) : 0,
    // Por trial (agregados seguros): se elimina del payload por
    // ASSESSMENT_FORBIDDEN_KEYS (incl. `trials`) en el session builder.
    trials: completed,
  };
}

function VisualSearchInner({ emit, trialCount, width, height, trialTimeoutMs, itiMs, rng, onComplete }) {
  const { t } = useLanguage();
  const emitRef = useRef(emit);
  const onCompleteRef = useRef(onComplete);
  const rngRef = useRef(rng ?? Math.random);
  const areaRef = useRef(null);
  const [current, setCurrent] = useState(0);
  const [finished, setFinished] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const resultsRef = useRef([]);
  const startTimeRef = useRef(0);
  const handledRef = useRef(false);
  const emittedForRef = useRef(-1);
  const timeoutRef = useRef(null);
  const itiRef = useRef(null);
  const handleResponseRef = useRef(null);
  // VSP-P1-2 (patrón B.2 initialSizeRef): la geometría se bloquea al montar —
  // la re-medición del stage (resize/visualViewport a mitad de sesión) NO
  // reconstruye los trials ni re-emite stimulus_shown (estímulo huérfano +
  // reset de RT). El canvas conserva su tamaño inicial; si el contenedor se
  // encoge, el clip residual no deja el trial irresoluble (VSP-P1-1 cubre el
  // bound máximo).
  const initialSizeRef = useRef(null);
  if (initialSizeRef.current === null) initialSizeRef.current = { width, height };
  const lockedSize = initialSizeRef.current;
  const trials = useMemo(() => buildVisualSearchTrials({
    width: lockedSize.width,
    height: lockedSize.height,
    count: trialCount,
    rng: rngRef.current,
  }), [lockedSize, trialCount]);
  const trial = trials[current];

  useEffect(() => { emitRef.current = emit; }, [emit]);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  const completeIfFinished = useCallback((nextResults, now) => {
    if (nextResults.length >= trials.length) {
      const summary = summarizeVisualSearchResults(nextResults, trials.length);
      setFinished(true);
      // game_end: score 0-100 (VSP-P3-2, contrato simple_rt/precision/CI) y
      // difficulty unificada (VSP-P3-3). Inmediato, antes de onComplete
      // (patrón B.3) — la pantalla "finished" no se renderiza en batería
      // (onComplete monta la siguiente superficie en el mismo batch).
      emitRef.current({
        eventType: 'game_end',
        timestamp: now,
        gameState: { score: Math.round(summary.accuracy * 100), level: trials.length, difficulty: 'visual_search' },
      });
      onCompleteRef.current?.(summary);
      return true;
    }
    return false;
  }, [trials.length]);

  const handleResponse = useCallback((input) => {
    if (!trial || handledRef.current || finished) return;
    handledRef.current = true; // VSP-P3-5: 1 finalización por trial (doble-tap = no-op)
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    const timedOut = input === 'timeout';
    const item = timedOut ? null : input.item;
    const event = timedOut ? null : input.event;
    const now = performance.now();
    const reactionTimeMs = Math.max(0, Math.round(now - startTimeRef.current));
    let pointer = null;
    let clickDistanceToTargetPx = null;
    if (!timedOut && item) {
      // VSP-P2-2 (note (c)): localización REAL del click — coordenadas del
      // evento relativas al canvas (el código legado emitía el centro de la
      // celda: pointer = {x: item.x, y: item.y} y distancia celda-celda; el
      // event original se descartaba). Activación de teclado (detail === 0,
      // p. ej. Enter en el botón enfocado) o coords no-finias → fallback al
      // centro del tile: no se penaliza la localización por no-uso de puntero.
      // 1 getBoundingClientRect por respuesta (no por pointermove — note (f)
      // SRT-P3-2: N/A, sin pointer sampler en este juego).
      const fromEvent = event && Number(event.detail) > 0
        && Number.isFinite(event.clientX) && Number.isFinite(event.clientY);
      const rect = areaRef.current?.getBoundingClientRect?.() ?? null;
      const px = fromEvent ? round(event.clientX - (rect?.left ?? 0), 2) : round(item.x, 2);
      const py = fromEvent ? round(event.clientY - (rect?.top ?? 0), 2) : round(item.y, 2);
      pointer = { x: px, y: py };
      clickDistanceToTargetPx = round(Math.hypot(px - trial.target.x, py - trial.target.y), 2);
    }
    const correct = !timedOut && item?.isTarget === true;
    const searchEfficiency = reactionTimeMs > 0 ? round((correct ? 1 : 0) / (reactionTimeMs / 1000) / Math.max(1, trial.setSize / 8), 4) : 0;
    const result = {
      trialId: trial.trialId,
      correct,
      outcome: timedOut ? 'timeout' : correct ? 'target_found' : 'distractor_click',
      reactionTimeMs,
      setSize: trial.setSize,
      distractorCount: trial.distractorCount,
      clickDistanceToTargetPx,
      searchEfficiency,
      timedOut,
    };
    const nextResults = [...resultsRef.current, result];
    resultsRef.current = nextResults;
    setFeedback(timedOut
      ? { tone: 'timeout', glyph: '✗', reactionTimeMs }
      : correct
        ? { tone: 'correct', glyph: '✓', reactionTimeMs }
        : { tone: 'incorrect', glyph: '✗', reactionTimeMs });
    const emitEvent = {
      eventType: 'response',
      trialId: trial.trialId,
      targetId: trial.targetId,
      timestamp: now,
      response: {
        correct,
        outcome: result.outcome,
        reactionTimeMs,
        score: correct ? 1 : 0,
        timedOut,
        visualSearch: {
          setSize: trial.setSize,
          distractorCount: trial.distractorCount,
          clickDistanceToTargetPx,
          searchEfficiency,
          timedOut,
        },
      },
      gameState: { score: nextResults.filter((entry) => entry.correct).length, level: current + 1, difficulty: 'visual_search' },
    };
    if (pointer) emitEvent.pointer = pointer;
    emitRef.current(emitEvent);
    if (!completeIfFinished(nextResults, now)) {
      // VSP-P2-5 (patrones CIP-P2-3/CIP-P2-5): ITI tracked (itiRef + cleanup en
      // unmount/cambio de trial — el setTimeout legado sin ref dejaba un
      // completado tardío tras abort) con jitter [0.75, 1.25] (el ritmo fijo
      // telegrafiaba el timing del próximo panel).
      const jitteredItiMs = itiMs * (0.75 + 0.5 * Math.random());
      itiRef.current = window.setTimeout(() => {
        itiRef.current = null;
        setCurrent((value) => value + 1);
      }, jitteredItiMs);
    }
  }, [completeIfFinished, current, finished, itiMs, trial]);

  useEffect(() => { handleResponseRef.current = handleResponse; }, [handleResponse]);

  useEffect(() => {
    if (!trial || finished) return undefined;
    handledRef.current = false;
    setFeedback(null);
    startTimeRef.current = performance.now();
    // VSP-P3-4 (patrón CIP-P3-4): StrictMode (dev) re-ejecuta el effect sin
    // resetear refs — sin este guard el trial 0 emitía stimulus_shown 2 veces.
    if (emittedForRef.current !== current) {
      emittedForRef.current = current;
      emitRef.current({
        eventType: 'stimulus_shown',
        trialId: trial.trialId,
        targetId: trial.targetId,
        timestamp: startTimeRef.current,
        stimulus: {
          kind: 'visual_search_array',
          payload: {
            setSize: trial.setSize,
            targetIndex: trial.targetIndex,
            distractorCount: trial.distractorCount,
            targetSymbol: TARGET_SYMBOL,
          },
        },
        gameState: { score: resultsRef.current.filter((entry) => entry.correct).length, level: current + 1, difficulty: 'visual_search' },
      });
    }
    // VSP-P1-1: bound del trial — sin click, termina por timeout.
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
      handleResponseRef.current?.('timeout');
    }, trialTimeoutMs);
    return () => {
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
      if (itiRef.current) { clearTimeout(itiRef.current); itiRef.current = null; }
    };
  }, [current, finished, trial, trialTimeoutMs]);

  const handleItemClick = useCallback((event, item) => {
    handleResponse({ item, event });
  }, [handleResponse]);

  if (finished) {
    const summary = summarizeVisualSearchResults(resultsRef.current, trials.length);
    return (
      <div className="visual-search-task" data-testid="visual-search-finished">
        <h3>{t('Búsqueda visual completada', 'Visual search complete')}</h3>
        <p>{t('Precisión: {pct}%', 'Accuracy: {pct}%', { pct: `${Math.round(summary.accuracy * 100)}%` })}</p>
        <p>{t('Eficiencia: {value}', 'Efficiency: {value}', { value: summary.searchEfficiency.toFixed(2) })}</p>
      </div>
    );
  }

  if (!trial) return null;

  return (
    <div className="visual-search-task">
      <div className="task-header">
        <span className="task-title">🔎 {t('Búsqueda visual', 'Visual search')}</span>
        <span className="task-progress">{t('Panel {n} de {total}', 'Panel {n} of {total}', { n: current + 1, total: trials.length })}</span>
        {/* VSP layout: instrucción en header pill — el brief standalone y la
            caption se retiran para que el juego quepa sin scroll interno en el
            stage 290/340 px (patrón B.4 CIP-P2-4; la descripción del bloque
            ya se muestra en la pantalla de setup). */}
        <span className="task-progress">{t('Objetivo: punto sólido', 'Target: solid dot')}</span>
      </div>
      <div
        className="task-area"
        data-testid="visual-search-area"
        ref={areaRef}
        style={{ width: lockedSize.width, height: lockedSize.height, position: 'relative', cursor: 'pointer' }}
      >
        {trial.items.map((item) => {
          const presentation = buildVisualSearchTilePresentation(item);
          const tileSize = Number(item.tileSize ?? trial.grid?.tileSize ?? MIN_TILE_SIZE_PX);
          return (
            <button
              key={item.id}
              type="button"
              data-testid={item.isTarget ? 'visual-search-target' : 'visual-search-distractor'}
              data-x={item.x}
              data-y={item.y}
              className={presentation.className}
              aria-label={t(presentation.ariaLabel, presentation.ariaLabelEn ?? presentation.ariaLabel)}
              data-preselection-highlight={String(presentation.preSelectionHighlight)}
              data-visual-tone={presentation.visualTone}
              onClick={(event) => handleItemClick(event, item)}
              style={{
                position: 'absolute',
                left: item.x - tileSize / 2,
                top: item.y - tileSize / 2,
                width: tileSize,
                height: tileSize,
                fontSize: `${Math.max(1.2, tileSize / 28)}rem`,
                fontWeight: 900,
                backgroundColor: '#ffffff',
                borderColor: 'rgba(49, 46, 129, 0.42)',
                color: item.color,
                boxShadow: '0 10px 24px rgba(15, 23, 42, 0.1)',
              }}
            >
              {presentation.label}
            </button>
          );
        })}
        {feedback && (
          <div
            className={`visual-search-task__feedback visual-search-task__feedback--${feedback.tone}`}
            data-testid="visual-search-feedback"
            role="status"
          >
            <strong>{feedback.glyph}</strong>
            <span className="rt-display">{feedback.tone === 'timeout' ? t('Tiempo agotado', 'Time out') : `${feedback.reactionTimeMs}ms`}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VisualSearchTask({
  active = false,
  trialCount = DEFAULT_TRIAL_COUNT,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  trialTimeoutMs = DEFAULT_TRIAL_TIMEOUT_MS,
  itiMs = DEFAULT_ITI_MS,
  rng = Math.random,
  onGameEvent,
  onComplete,
}) {
  return (
    <GameRuntime
      active={active}
      sessionId="visual_search"
      gameDefinition={VISUAL_SEARCH_GAME_DEFINITION}
      onEvent={onGameEvent}
      renderTrial={(_, emit) => (
        <VisualSearchInner
          emit={emit}
          trialCount={trialCount}
          width={width}
          height={height}
          trialTimeoutMs={trialTimeoutMs}
          itiMs={itiMs}
          rng={rng}
          onComplete={onComplete}
        />
      )}
    />
  );
}
