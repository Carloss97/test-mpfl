import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GameRuntime from './GameRuntime.jsx';

const DEFAULT_WIDTH = 600;
const DEFAULT_HEIGHT = 400;
const DEFAULT_TRIAL_COUNT = 6;
const TARGET_SYMBOL = '●';
const DISTRACTOR_SYMBOLS = ['○', '◇', '□', '△'];
const VISUAL_SEARCH_GAME_DEFINITION = Object.freeze({ id: 'visual_search', label: 'Búsqueda visual', difficulty: 'set_size' });

function round(value, digits = 4) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  const factor = 10 ** digits;
  return Math.round(numeric * factor) / factor;
}

function distance(a, b) {
  return Math.hypot(Number(b.x) - Number(a.x), Number(b.y) - Number(a.y));
}

function gridPositions(width, height, count) {
  const cols = Math.ceil(Math.sqrt(count * (width / Math.max(1, height))));
  const rows = Math.ceil(count / cols);
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

export function buildVisualSearchTrials({ width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT, count = DEFAULT_TRIAL_COUNT } = {}) {
  const safeWidth = Math.max(260, Number(width) || DEFAULT_WIDTH);
  const safeHeight = Math.max(200, Number(height) || DEFAULT_HEIGHT);
  const trialCount = Math.max(1, Math.floor(Number(count) || DEFAULT_TRIAL_COUNT));
  return Array.from({ length: trialCount }, (_, trialIndex) => {
    const setSize = 8 + (trialIndex % 4) * 4;
    const positions = gridPositions(safeWidth, safeHeight, setSize);
    const targetIndex = (trialIndex * 5 + 3) % setSize;
    const items = positions.map((position, index) => {
      const isTarget = index === targetIndex;
      return {
        id: `vs-${trialIndex}-${index}`,
        x: position.x,
        y: position.y,
        isTarget,
        symbol: isTarget ? TARGET_SYMBOL : DISTRACTOR_SYMBOLS[(index + trialIndex) % DISTRACTOR_SYMBOLS.length],
        color: isTarget ? '#7df0cb' : '#9fb0c2',
      };
    });
    return {
      trialId: `visual-search-${trialIndex}`,
      targetId: items[targetIndex].id,
      trialIndex,
      setSize,
      distractorCount: setSize - 1,
      target: items[targetIndex],
      items,
    };
  });
}

export function summarizeVisualSearchResults(trials = []) {
  const totalTrials = trials.length;
  const correct = trials.filter((trial) => trial.correct).length;
  const meanRT = totalTrials ? trials.reduce((sum, trial) => sum + (trial.reactionTimeMs ?? 0), 0) / totalTrials : 0;
  const meanSetSize = totalTrials ? trials.reduce((sum, trial) => sum + (trial.setSize ?? 0), 0) / totalTrials : 0;
  const meanDistractorCount = totalTrials ? trials.reduce((sum, trial) => sum + (trial.distractorCount ?? 0), 0) / totalTrials : 0;
  const meanClickDistance = totalTrials ? trials.reduce((sum, trial) => sum + (trial.clickDistanceToTargetPx ?? 0), 0) / totalTrials : 0;
  const searchEfficiency = meanRT > 0 ? round((correct / Math.max(1, totalTrials)) / (meanRT / 1000) / Math.max(1, meanSetSize / 8), 4) : 0;
  return {
    gameId: 'visual_search',
    totalTrials,
    accuracy: totalTrials ? round(correct / totalTrials, 4) : 0,
    errorRate: totalTrials ? round(1 - correct / totalTrials, 4) : 0,
    meanRT: round(meanRT, 2),
    meanSetSize: round(meanSetSize, 2),
    meanDistractorCount: round(meanDistractorCount, 2),
    meanClickDistanceToTargetPx: round(meanClickDistance, 2),
    searchEfficiency,
    trials,
  };
}

function VisualSearchInner({ emit, trialCount, width, height, onComplete }) {
  const emitRef = useRef(emit);
  const onCompleteRef = useRef(onComplete);
  const [current, setCurrent] = useState(0);
  const [finished, setFinished] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const trialsRef = useRef([]);
  const startTimeRef = useRef(0);
  const trials = useMemo(() => buildVisualSearchTrials({ width, height, count: trialCount }), [width, height, trialCount]);
  const trial = trials[current];

  useEffect(() => { emitRef.current = emit; }, [emit]);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  useEffect(() => {
    if (!trial || finished) return;
    setFeedback(null);
    startTimeRef.current = performance.now();
    emitRef.current({
      eventType: 'stimulus_shown',
      trialId: trial.trialId,
      targetId: trial.targetId,
      timestamp: startTimeRef.current,
      stimulus: {
        kind: 'visual_search_array',
        payload: {
          setSize: trial.setSize,
          distractorCount: trial.distractorCount,
          targetSymbol: TARGET_SYMBOL,
        },
      },
      gameState: { score: trialsRef.current.filter((item) => item.correct).length, level: current + 1, difficulty: trial.setSize },
    });
  }, [current, finished, trial]);

  const handleItemClick = useCallback((event, item) => {
    if (!trial || finished) return;
    const now = performance.now();
    const click = { x: item.x, y: item.y };
    const reactionTimeMs = Math.max(0, Math.round(now - startTimeRef.current));
    const clickDistanceToTargetPx = round(distance(click, trial.target), 2);
    const correct = item.isTarget;
    const searchEfficiency = reactionTimeMs > 0 ? round((correct ? 1 : 0) / (reactionTimeMs / 1000) / Math.max(1, trial.setSize / 8), 4) : 0;
    const result = {
      trialId: trial.trialId,
      correct,
      reactionTimeMs,
      setSize: trial.setSize,
      distractorCount: trial.distractorCount,
      clickDistanceToTargetPx,
      searchEfficiency,
    };
    trialsRef.current = [...trialsRef.current, result];
    emitRef.current({
      eventType: 'response',
      trialId: trial.trialId,
      targetId: trial.targetId,
      timestamp: now,
      pointer: click,
      response: {
        correct,
        outcome: correct ? 'target_found' : 'distractor_click',
        reactionTimeMs,
        score: correct ? 1 : 0,
        visualSearch: {
          setSize: trial.setSize,
          distractorCount: trial.distractorCount,
          clickDistanceToTargetPx,
          searchEfficiency,
        },
      },
      gameState: { score: trialsRef.current.filter((item) => item.correct).length, level: current + 1, difficulty: trial.setSize },
    });
    setFeedback({ correct, reactionTimeMs });
    const next = current + 1;
    if (next >= trials.length) {
      const summary = summarizeVisualSearchResults(trialsRef.current);
      setFinished(true);
      emitRef.current({ eventType: 'game_end', timestamp: now, gameState: { score: summary.accuracy, level: trials.length, difficulty: trial.setSize } });
      onCompleteRef.current?.(summary);
    } else {
      window.setTimeout(() => setCurrent(next), 350);
    }
  }, [current, finished, trial, trials.length]);

  if (finished) {
    const summary = summarizeVisualSearchResults(trialsRef.current);
    return (
      <div className="visual-search-task" data-testid="visual-search-finished">
        <h3>Búsqueda visual completada</h3>
        <p>Precisión: {Math.round(summary.accuracy * 100)}%</p>
        <p>Eficiencia: {summary.searchEfficiency.toFixed(2)}</p>
      </div>
    );
  }

  if (!trial) return null;

  return (
    <div className="visual-search-task">
      <div className="task-header">
        <span className="task-title">🔎 Búsqueda visual</span>
        <span className="task-progress">Panel {current + 1} de {trials.length}</span>
        <span className="task-progress">{trial.setSize} estímulos</span>
      </div>
      <p className="caption" style={{ margin: '4px 0 8px' }}>
        Encuentra el punto sólido entre distractores. Mide eficiencia de búsqueda, distracción y precisión bajo carga visual.
      </p>
      <div className="task-area" data-testid="visual-search-area" style={{ width, height, position: 'relative', cursor: 'pointer' }}>
        {trial.items.map((item) => (
          <button
            key={item.id}
            type="button"
            data-testid={item.isTarget ? 'visual-search-target' : 'visual-search-distractor'}
            data-x={item.x}
            data-y={item.y}
            className={`visual-search-task__item ${item.isTarget ? 'visual-search-task__item--target' : 'visual-search-task__item--distractor'}`}
            aria-label={item.isTarget ? 'Objetivo de búsqueda visual' : 'Distractor de búsqueda visual'}
            onClick={(event) => handleItemClick(event, item)}
            style={{
              position: 'absolute',
              left: item.x - 16,
              top: item.y - 16,
              width: 32,
              height: 32,
              fontSize: '1.2rem',
              fontWeight: 900,
            }}
          >
            {item.symbol}
          </button>
        ))}
        {feedback && (
          <div className="trial-feedback" style={{ left: '50%', top: '50%' }}>
            <span style={{ fontSize: '2rem' }}>{feedback.correct ? '✓' : '✗'}</span>
            <span className="rt-display">{feedback.reactionTimeMs}ms</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VisualSearchTask({ active = false, trialCount = DEFAULT_TRIAL_COUNT, width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT, onGameEvent, onComplete }) {
  return (
    <GameRuntime
      active={active}
      sessionId="visual_search"
      gameDefinition={VISUAL_SEARCH_GAME_DEFINITION}
      onEvent={onGameEvent}
      renderTrial={(_, emit) => (
        <VisualSearchInner emit={emit} trialCount={trialCount} width={width} height={height} onComplete={onComplete} />
      )}
    />
  );
}
