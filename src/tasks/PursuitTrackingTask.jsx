import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GameRuntime from './GameRuntime.jsx';
import { createPointerSampler, appendPointerSample } from '../telemetry/pointerSampler.js';

const DEFAULT_WIDTH = 600;
const DEFAULT_HEIGHT = 400;
const DEFAULT_DURATION_MS = 6000;
const DEFAULT_STEPS = 25;
const DEFAULT_HIT_RADIUS = 28;

function round(value, digits = 4) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  const factor = 10 ** digits;
  return Math.round(numeric * factor) / factor;
}

function distance(a, b) {
  return Math.hypot(Number(b.x) - Number(a.x), Number(b.y) - Number(a.y));
}

export function buildPursuitPath({ width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT, durationMs = DEFAULT_DURATION_MS, steps = DEFAULT_STEPS } = {}) {
  const safeWidth = Math.max(240, Number(width) || DEFAULT_WIDTH);
  const safeHeight = Math.max(180, Number(height) || DEFAULT_HEIGHT);
  const safeDuration = Math.max(100, Number(durationMs) || DEFAULT_DURATION_MS);
  const safeSteps = Math.max(2, Math.floor(Number(steps) || DEFAULT_STEPS));
  const margin = 48;
  return Array.from({ length: safeSteps }, (_, index) => {
    const t = index / (safeSteps - 1);
    return {
      timestamp: round(t * safeDuration, 2),
      x: round(margin + t * (safeWidth - margin * 2), 2),
      y: round((safeHeight / 2) + Math.sin(t * Math.PI * 2) * (safeHeight * 0.22), 2),
    };
  });
}

function interpolateTarget(path, timestamp) {
  if (!path.length) return null;
  if (timestamp <= path[0].timestamp) return path[0];
  if (timestamp >= path.at(-1).timestamp) return path.at(-1);
  for (let index = 1; index < path.length; index += 1) {
    const previous = path[index - 1];
    const next = path[index];
    if (timestamp <= next.timestamp) {
      const span = Math.max(1, next.timestamp - previous.timestamp);
      const ratio = (timestamp - previous.timestamp) / span;
      return {
        timestamp,
        x: previous.x + (next.x - previous.x) * ratio,
        y: previous.y + (next.y - previous.y) * ratio,
      };
    }
  }
  return path.at(-1);
}

export function summarizePursuitSamples({ targetPath = [], pointerSamples = [], hitRadiusPx = DEFAULT_HIT_RADIUS } = {}) {
  const samples = pointerSamples
    .map((sample) => ({ timestamp: Number(sample.timestamp), x: Number(sample.x), y: Number(sample.y) }))
    .filter((sample) => Number.isFinite(sample.timestamp) && Number.isFinite(sample.x) && Number.isFinite(sample.y))
    .sort((a, b) => a.timestamp - b.timestamp);

  if (!samples.length || !targetPath.length) {
    return {
      sampleCount: samples.length,
      rmsErrorPx: 0,
      meanErrorPx: 0,
      maxErrorPx: 0,
      lossRatio: 1,
      smoothPursuitScore: 0,
      lagMs: 0,
      privacy: { rawPointerPathStored: false, aggregateOnly: true },
    };
  }

  const errors = samples.map((sample) => distance(sample, interpolateTarget(targetPath, sample.timestamp)));
  const meanError = errors.reduce((sum, value) => sum + value, 0) / errors.length;
  const rmsError = Math.sqrt(errors.reduce((sum, value) => sum + value ** 2, 0) / errors.length);
  const maxError = Math.max(...errors);
  const lost = errors.filter((value) => value > hitRadiusPx).length;
  const lossRatio = lost / errors.length;
  const smoothPursuitScore = Math.max(0, Math.min(1, 1 - rmsError / Math.max(1, hitRadiusPx * 3)));

  return {
    sampleCount: samples.length,
    rmsErrorPx: round(rmsError, 2),
    meanErrorPx: round(meanError, 2),
    maxErrorPx: round(maxError, 2),
    lossRatio: round(lossRatio, 4),
    smoothPursuitScore: round(smoothPursuitScore, 4),
    lagMs: 0,
    privacy: { rawPointerPathStored: false, aggregateOnly: true },
  };
}

function PursuitTrackingInner({ emit, width, height, durationMs, hitRadiusPx, onComplete }) {
  const areaRef = useRef(null);
  const [finished, setFinished] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef(0);
  const pointerSamplerRef = useRef(createPointerSampler({ maxSamples: 1200, sessionId: 'pursuit_tracking' }));
  const targetPath = useMemo(() => buildPursuitPath({ width, height, durationMs }), [durationMs, height, width]);

  useEffect(() => {
    startTimeRef.current = performance.now();
    pointerSamplerRef.current = createPointerSampler({ maxSamples: 1200, sessionId: 'pursuit_tracking' });
    emit({
      eventType: 'stimulus_shown',
      trialId: 'pursuit-0',
      targetId: 'pursuit-target',
      timestamp: startTimeRef.current,
      stimulus: { kind: 'moving_target_path', payload: { durationMs, hitRadiusPx, pointCount: targetPath.length } },
      gameState: { score: 0, level: 1, difficulty: 'continuous_tracking' },
    });
    const timer = setTimeout(() => {
      const summary = summarizePursuitSamples({
        targetPath,
        pointerSamples: pointerSamplerRef.current.samples,
        hitRadiusPx,
      });
      const score = summary.smoothPursuitScore;
      const now = performance.now();
      emit({
        eventType: 'response',
        trialId: 'pursuit-0',
        targetId: 'pursuit-target',
        timestamp: now,
        response: {
          correct: score >= 0.6,
          outcome: score >= 0.6 ? 'tracked' : 'lost_tracking',
          reactionTimeMs: durationMs,
          score,
          tracking: summary,
        },
        gameState: { score, level: 1, difficulty: 'continuous_tracking' },
      });
      emit({ eventType: 'game_end', timestamp: now, gameState: { score, level: 1, difficulty: 'continuous_tracking' } });
      setFinished(true);
      onComplete?.({ gameId: 'pursuit_tracking', totalTrials: 1, score, tracking: summary });
    }, durationMs);
    return () => clearTimeout(timer);
  }, [durationMs, emit, hitRadiusPx, onComplete, targetPath]);

  const toLocalPointer = useCallback((event) => {
    const rect = areaRef.current?.getBoundingClientRect();
    return {
      timestamp: event.timeStamp ?? Math.max(0, performance.now() - startTimeRef.current),
      x: rect ? event.clientX - rect.left : event.clientX,
      y: rect ? event.clientY - rect.top : event.clientY,
      button: event.button,
      pressure: event.pressure,
    };
  }, []);

  const recordPointer = useCallback((event) => {
    if (finished) return;
    const sample = toLocalPointer(event);
    pointerSamplerRef.current = appendPointerSample(pointerSamplerRef.current, sample);
    setElapsed(Math.max(0, Math.min(durationMs, Number(sample.timestamp) || 0)));
  }, [durationMs, finished, toLocalPointer]);

  const target = interpolateTarget(targetPath, elapsed) ?? targetPath[0];

  if (finished) {
    return (
      <div className="pursuit-tracking-task" data-testid="pursuit-finished">
        <h3>Seguimiento completado</h3>
      </div>
    );
  }

  return (
    <div className="pursuit-tracking-task">
      <div className="task-header">
        <span className="task-title">🎯 Seguimiento continuo</span>
        <span className="task-progress">{Math.round((elapsed / durationMs) * 100)}%</span>
      </div>
      <div
        ref={areaRef}
        className="task-area"
        data-testid="pursuit-task-area"
        style={{ width, height, position: 'relative', cursor: 'crosshair' }}
        onPointerMove={recordPointer}
      >
        <div
          className="rt-target"
          data-testid="pursuit-target"
          style={{
            left: target.x - hitRadiusPx,
            top: target.y - hitRadiusPx,
            width: hitRadiusPx * 2,
            height: hitRadiusPx * 2,
            borderRadius: '999px',
          }}
        />
      </div>
    </div>
  );
}

export default function PursuitTrackingTask({ active = false, width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT, durationMs = DEFAULT_DURATION_MS, hitRadiusPx = DEFAULT_HIT_RADIUS, onGameEvent, onComplete }) {
  return (
    <GameRuntime
      active={active}
      sessionId="pursuit_tracking"
      gameDefinition={{ id: 'pursuit_tracking', label: 'Seguimiento visuomotor', difficulty: 'continuous_tracking' }}
      onEvent={onGameEvent}
      renderTrial={(_, emit) => (
        <PursuitTrackingInner
          emit={emit}
          width={width}
          height={height}
          durationMs={durationMs}
          hitRadiusPx={hitRadiusPx}
          onComplete={onComplete}
        />
      )}
    />
  );
}
