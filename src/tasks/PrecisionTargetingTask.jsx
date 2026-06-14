import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GameRuntime from './GameRuntime.jsx';
import { createPointerSampler, appendPointerSample } from '../telemetry/pointerSampler.js';
import { summarizePointerTrial } from '../telemetry/kinematics.js';

const DEFAULT_WIDTH = 600;
const DEFAULT_HEIGHT = 400;
const DEFAULT_TRIAL_COUNT = 8;
const TARGET_RADII = [34, 26, 20, 16];

function round(value, digits = 4) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  const factor = 10 ** digits;
  return Math.round(numeric * factor) / factor;
}

function distance(a, b) {
  return Math.hypot(Number(b.x) - Number(a.x), Number(b.y) - Number(a.y));
}

export function computeFittsIndex({ distancePx = 0, targetWidthPx = 1 } = {}) {
  const distanceValue = Math.max(0, Number(distancePx) || 0);
  const widthValue = Math.max(1, Number(targetWidthPx) || 1);
  if (distanceValue === 0) return 0;
  return round(Math.log2(distanceValue / widthValue + 1), 4);
}

export function buildPrecisionTrials({ width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT, count = DEFAULT_TRIAL_COUNT } = {}) {
  const safeWidth = Math.max(240, Number(width) || DEFAULT_WIDTH);
  const safeHeight = Math.max(180, Number(height) || DEFAULT_HEIGHT);
  const center = { x: safeWidth / 2, y: safeHeight / 2 };
  const maxRadius = Math.max(70, Math.min(safeWidth, safeHeight) * 0.34);
  return Array.from({ length: Math.max(1, Math.floor(Number(count) || DEFAULT_TRIAL_COUNT)) }, (_, index) => {
    const angle = (index * Math.PI * 0.78) + Math.PI / 6;
    const orbit = maxRadius * (0.62 + (index % 3) * 0.16);
    const radius = TARGET_RADII[index % TARGET_RADII.length];
    const target = {
      x: round(Math.min(safeWidth - radius - 16, Math.max(radius + 16, center.x + Math.cos(angle) * orbit)), 2),
      y: round(Math.min(safeHeight - radius - 16, Math.max(radius + 16, center.y + Math.sin(angle) * orbit)), 2),
      radius,
    };
    const distancePx = distance(center, target);
    const targetWidthPx = radius * 2;
    return {
      trialId: `precision-${index}`,
      targetId: `precision-target-${index}`,
      trialIndex: index,
      origin: center,
      target,
      distancePx: round(distancePx, 2),
      targetWidthPx,
      fittsId: computeFittsIndex({ distancePx, targetWidthPx }),
    };
  });
}

function PrecisionTargetingInner({ emit, trialCount, width, height, onComplete }) {
  const areaRef = useRef(null);
  const [current, setCurrent] = useState(0);
  const [finished, setFinished] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const trialsRef = useRef([]);
  const startTimeRef = useRef(0);
  const pointerSamplerRef = useRef(createPointerSampler({ maxSamples: 900, sessionId: 'precision_targeting' }));
  const trials = useMemo(() => buildPrecisionTrials({ width, height, count: trialCount }), [width, height, trialCount]);
  const trial = trials[current];

  useEffect(() => {
    if (!trial || finished) return;
    startTimeRef.current = performance.now();
    pointerSamplerRef.current = createPointerSampler({ maxSamples: 900, sessionId: 'precision_targeting' });
    emit({
      eventType: 'stimulus_shown',
      trialId: trial.trialId,
      targetId: trial.targetId,
      timestamp: startTimeRef.current,
      stimulus: {
        kind: 'fitts_target',
        payload: {
          target: trial.target,
          origin: trial.origin,
          distancePx: trial.distancePx,
          targetWidthPx: trial.targetWidthPx,
          indexDifficulty: trial.fittsId,
        },
      },
      gameState: { score: trialsRef.current.reduce((sum, item) => sum + item.score, 0), level: current + 1, difficulty: trial.fittsId },
    });
  }, [current, emit, finished, trial]);

  const toLocalPointer = useCallback((event) => {
    const rect = areaRef.current?.getBoundingClientRect();
    return {
      x: rect ? event.clientX - rect.left : event.clientX,
      y: rect ? event.clientY - rect.top : event.clientY,
      button: event.button,
      pressure: event.pressure,
      timestamp: event.timeStamp ?? performance.now(),
    };
  }, []);

  const recordPointer = useCallback((event) => {
    if (finished || !trial) return;
    pointerSamplerRef.current = appendPointerSample(pointerSamplerRef.current, toLocalPointer(event));
  }, [finished, toLocalPointer, trial]);

  const finishTrial = useCallback((event) => {
    if (finished || !trial) return;
    const pointer = toLocalPointer(event);
    pointerSamplerRef.current = appendPointerSample(pointerSamplerRef.current, pointer);
    const now = performance.now();
    const rt = Math.max(0, now - startTimeRef.current);
    const click = { x: pointer.x, y: pointer.y };
    const clickDistance = distance(click, trial.target);
    const correct = clickDistance <= trial.target.radius;
    const score = correct ? 1 : 0;
    const pointerSummary = summarizePointerTrial(pointerSamplerRef.current.samples, {
      shownAt: startTimeRef.current,
      responseAt: now,
      target: trial.target,
      click,
    });
    const throughput = rt > 0 ? trial.fittsId / (rt / 1000) : 0;
    const result = {
      trialId: trial.trialId,
      score,
      correct,
      reactionTimeMs: Math.round(rt),
      clickDistanceToTargetPx: round(clickDistance, 2),
      fittsId: trial.fittsId,
    };
    trialsRef.current = [...trialsRef.current, result];
    emit({
      eventType: 'response',
      trialId: trial.trialId,
      targetId: trial.targetId,
      timestamp: now,
      pointer: click,
      response: {
        correct,
        outcome: correct ? 'hit' : 'miss',
        reactionTimeMs: Math.round(rt),
        score,
        fitts: {
          distancePx: trial.distancePx,
          targetWidthPx: trial.targetWidthPx,
          indexDifficulty: trial.fittsId,
          throughput: round(throughput, 4),
        },
        pointerSummary,
      },
      gameState: { score: trialsRef.current.reduce((sum, item) => sum + item.score, 0), level: current + 1, difficulty: trial.fittsId },
    });
    setFeedback({ correct, rt: Math.round(rt) });
    const next = current + 1;
    if (next >= trials.length) {
      const completed = trialsRef.current;
      const accuracy = completed.filter((item) => item.correct).length / Math.max(1, completed.length);
      const meanScore = completed.reduce((sum, item) => sum + item.score, 0) / Math.max(1, completed.length);
      const meanRT = completed.reduce((sum, item) => sum + item.reactionTimeMs, 0) / Math.max(1, completed.length);
      const summary = {
        gameId: 'precision_targeting',
        totalTrials: completed.length,
        accuracy: round(accuracy, 4),
        meanScore: round(meanScore, 4),
        meanRT: round(meanRT, 2),
        trials: completed,
      };
      setFinished(true);
      emit({ eventType: 'game_end', timestamp: now, gameState: { score: completed.reduce((sum, item) => sum + item.score, 0), level: trials.length, difficulty: trial.fittsId } });
      onComplete?.(summary);
    } else {
      setCurrent(next);
    }
  }, [current, emit, finished, onComplete, toLocalPointer, trial, trials.length]);

  if (finished) {
    const completed = trialsRef.current;
    const accuracy = completed.filter((item) => item.correct).length / Math.max(1, completed.length);
    return (
      <div className="precision-targeting-task" data-testid="precision-task-finished">
        <h3>Precisión completada</h3>
        <p>Precisión: {Math.round(accuracy * 100)}%</p>
      </div>
    );
  }

  if (!trial) return null;

  return (
    <div className="precision-targeting-task">
      <div className="task-header">
        <span className="task-title">🎯 Precisión visomotora</span>
        <span className="task-progress">{current + 1}/{trials.length}</span>
        <span className="task-progress">ID {trial.fittsId.toFixed(2)}</span>
      </div>
      <div
        ref={areaRef}
        className="task-area"
        data-testid="precision-task-area"
        style={{ width, height, position: 'relative', cursor: 'crosshair' }}
        onPointerMove={recordPointer}
        onClick={finishTrial}
      >
        <div
          className="rt-target"
          data-testid="precision-target"
          data-x={trial.target.x}
          data-y={trial.target.y}
          style={{
            left: trial.target.x - trial.target.radius,
            top: trial.target.y - trial.target.radius,
            width: trial.target.radius * 2,
            height: trial.target.radius * 2,
            borderRadius: '999px',
          }}
        />
        {feedback && (
          <div className="trial-feedback" style={{ left: '50%', top: '50%' }}>
            <span style={{ fontSize: '2rem' }}>{feedback.correct ? '✓' : '✗'}</span>
            <span className="rt-display">{feedback.rt}ms</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PrecisionTargetingTask({ active = false, trialCount = DEFAULT_TRIAL_COUNT, width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT, onGameEvent, onComplete }) {
  return (
    <GameRuntime
      active={active}
      sessionId="precision_targeting"
      gameDefinition={{ id: 'precision_targeting', label: 'Precisión visomotora', difficulty: 'fitts' }}
      onEvent={onGameEvent}
      renderTrial={(_, emit) => (
        <PrecisionTargetingInner
          emit={emit}
          trialCount={trialCount}
          width={width}
          height={height}
          onComplete={onComplete}
        />
      )}
    />
  );
}
