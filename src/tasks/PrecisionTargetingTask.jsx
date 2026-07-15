import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GameRuntime from './GameRuntime.jsx';
import { createPointerSampler, appendPointerSample } from '../telemetry/pointerSampler.js';
import { summarizePointerTrial } from '../telemetry/kinematics.js';

const DEFAULT_WIDTH = 600;
const DEFAULT_HEIGHT = 400;
const DEFAULT_TRIAL_COUNT = 8;
const TARGET_RADII = [34, 26, 20, 16];
const PRECISION_GAME_DEFINITION = Object.freeze({ id: 'precision_targeting', label: 'Precisión visomotora', difficulty: 'fitts' });

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

export function buildPrecisionRouteGuide(trial = {}) {
  const origin = trial.origin ?? { x: 0, y: 0 };
  const target = trial.target ?? { x: 0, y: 0, radius: 16 };
  const distancePx = Number(trial.distancePx ?? distance(origin, target)) || 0;
  const targetWidthPx = Number(trial.targetWidthPx ?? Number(target.radius ?? 16) * 2) || 32;
  const indexDifficulty = Number(trial.fittsId ?? computeFittsIndex({ distancePx, targetWidthPx })) || 0;
  const corridorWidthPx = Math.max(targetWidthPx, Math.min(96, targetWidthPx + indexDifficulty * 8));
  const angleDeg = distancePx > 0 ? Math.atan2(Number(target.y) - Number(origin.y), Number(target.x) - Number(origin.x)) * (180 / Math.PI) : 0;
  return {
    label: 'Ruta de precisión adaptativa',
    corridorLabel: 'Corredor ideal',
    startLabel: 'Inicio controlado',
    targetLabel: 'Blanco activo',
    distancePx: round(distancePx, 2),
    targetWidthPx: round(targetWidthPx, 2),
    indexDifficulty: round(indexDifficulty, 4),
    corridorWidthPx: round(corridorWidthPx, 2),
    angleDeg: round(angleDeg, 2),
    difficultyTone: indexDifficulty >= 2.4 ? 'high' : indexDifficulty >= 1.6 ? 'medium' : 'low',
  };
}

export function buildPrecisionResponseAggregate({ pointerSummary = {}, clickDistanceToTargetPx = null } = {}) {
  const pathEfficiency = round(Number(pointerSummary.pathEfficiency ?? 0), 4);
  const overshootCount = Math.max(0, Math.round(Number(pointerSummary.overshootCount ?? 0) || 0));
  const correctionCount = Math.max(0, Math.round(Number(pointerSummary.correctionCount ?? 0) || 0));
  const dwellTimeMs = Math.max(0, Math.round(Number(pointerSummary.dwellTimeMs ?? 0) || 0));
  const deviationRmsPx = round(Number(pointerSummary.deviationRmsPx ?? 0), 2);
  const clickDistance = clickDistanceToTargetPx === null ? null : round(Number(clickDistanceToTargetPx) || 0, 2);
  const needsCorrection = overshootCount > 0 || correctionCount > 1 || pathEfficiency < 0.75 || deviationRmsPx > 18;
  const routeLabel = needsCorrection ? 'Ruta con correcciones' : pathEfficiency >= 0.9 ? 'Ruta precisa' : 'Ruta estable';
  return {
    routeLabel,
    pathEfficiency,
    overshootCount,
    correctionCount,
    dwellTimeMs,
    deviationRmsPx,
    clickDistanceToTargetPx: clickDistance,
    aggregateOnly: true,
    rawPointerPathStored: false,
  };
}

export function buildPrecisionTrialFeedback({ correct = false, reactionTimeMs = 0, clickDistanceToTargetPx = 0, score = 0, pointerSummary = {} } = {}) {
  const aggregate = buildPrecisionResponseAggregate({ pointerSummary, clickDistanceToTargetPx });
  const efficientRoute = aggregate.pathEfficiency >= 0.75 && aggregate.overshootCount === 0 && aggregate.correctionCount <= 1;
  const tone = correct && efficientRoute ? 'ok' : 'warn';
  return {
    tone,
    headline: tone === 'ok' ? 'Precisión estable' : 'Ajuste fino requerido',
    routeLabel: aggregate.routeLabel,
    detail: `${Math.round(Number(reactionTimeMs) || 0)}ms · error ${round(Number(clickDistanceToTargetPx) || 0, 1)}px · score ${Math.round((Number(score) || 0) * 100)}%`,
    displayMode: 'status-strip',
    intrusivePopup: false,
    aggregate,
  };
}

function PrecisionFeedbackStrip({ feedback }) {
  if (!feedback) return null;
  return (
    <div
      className={`precision-targeting-task__feedback-strip precision-targeting-task__feedback-strip--${feedback.tone}`}
      role="status"
      aria-label="Feedback de precisión"
    >
      <strong>{feedback.headline}</strong>
      <span>{feedback.routeLabel}</span>
      <span>{feedback.detail}</span>
    </div>
  );
}

function PrecisionTargetingInner({ emit, trialCount, width, height, onComplete }) {
  const areaRef = useRef(null);
  const emitRef = useRef(emit);
  const onCompleteRef = useRef(onComplete);
  const [current, setCurrent] = useState(0);
  const [phase, setPhase] = useState('ready');
  const [finished, setFinished] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const trialsRef = useRef([]);
  const startTimeRef = useRef(0);
  const pointerSamplerRef = useRef(createPointerSampler({ maxSamples: 900, sessionId: 'precision_targeting' }));
  const trials = useMemo(() => buildPrecisionTrials({ width, height, count: trialCount }), [width, height, trialCount]);
  const trial = trials[current];

  useEffect(() => { emitRef.current = emit; }, [emit]);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  useEffect(() => {
    if (!trial || finished) return;
    pointerSamplerRef.current = createPointerSampler({ maxSamples: 900, sessionId: 'precision_targeting' });
    setFeedback(null);
    setPhase('ready');
  }, [current, finished, trial]);

  const toLocalPointer = useCallback((event) => {
    const rect = areaRef.current?.getBoundingClientRect();
    return {
      x: rect ? event.clientX - rect.left : event.clientX,
      y: rect ? event.clientY - rect.top : event.clientY,
      button: event.button,
      pressure: event.pressure,
      timestamp: performance.now(),
    };
  }, []);

  const beginMovement = useCallback((event) => {
    event.stopPropagation();
    if (finished || !trial || phase !== 'ready') return;
    startTimeRef.current = performance.now();
    pointerSamplerRef.current = createPointerSampler({ maxSamples: 900, sessionId: 'precision_targeting' });
    pointerSamplerRef.current = appendPointerSample(pointerSamplerRef.current, {
      timestamp: startTimeRef.current,
      x: trial.origin.x,
      y: trial.origin.y,
      button: 0,
      pressure: 0,
    });
    setPhase('target');
    emitRef.current({
      eventType: 'stimulus_shown',
      trialId: trial.trialId,
      targetId: trial.targetId,
      timestamp: startTimeRef.current,
      stimulus: {
        kind: 'fitts_target_after_start_pad',
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
  }, [current, finished, phase, trial]);

  const recordPointer = useCallback((event) => {
    if (finished || !trial || phase !== 'target') return;
    pointerSamplerRef.current = appendPointerSample(pointerSamplerRef.current, toLocalPointer(event));
  }, [finished, phase, toLocalPointer, trial]);

  const finishTrial = useCallback((event) => {
    if (finished || !trial || phase !== 'target') return;
    const pointer = toLocalPointer(event);
    pointerSamplerRef.current = appendPointerSample(pointerSamplerRef.current, pointer);
    const now = performance.now();
    const rt = Math.max(0, now - startTimeRef.current);
    const click = { x: pointer.x, y: pointer.y };
    const clickDistance = distance(click, trial.target);
    const correct = clickDistance <= trial.target.radius;
    const spatialErrorRatio = Math.min(1, clickDistance / Math.max(1, trial.target.radius * 3));
    const score = correct ? round(Math.max(0.25, 1 - spatialErrorRatio), 4) : 0;
    const pointerSummary = summarizePointerTrial(pointerSamplerRef.current.samples, {
      shownAt: startTimeRef.current,
      responseAt: now,
      target: trial.target,
      click,
    });
    const throughput = rt > 0 ? trial.fittsId / (rt / 1000) : 0;
    const clickDistanceRounded = round(clickDistance, 2);
    const adaptivePrecision = buildPrecisionResponseAggregate({ pointerSummary, clickDistanceToTargetPx: clickDistanceRounded });
    const result = {
      trialId: trial.trialId,
      score,
      correct,
      reactionTimeMs: Math.round(rt),
      clickDistanceToTargetPx: clickDistanceRounded,
      fittsId: trial.fittsId,
      pathEfficiency: pointerSummary.pathEfficiency,
      overshootCount: adaptivePrecision.overshootCount,
      correctionCount: adaptivePrecision.correctionCount,
      dwellTimeMs: adaptivePrecision.dwellTimeMs,
      deviationRmsPx: adaptivePrecision.deviationRmsPx,
      routeLabel: adaptivePrecision.routeLabel,
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
        outcome: correct ? 'hit' : 'miss',
        reactionTimeMs: Math.round(rt),
        score,
        fitts: {
          distancePx: trial.distancePx,
          targetWidthPx: trial.targetWidthPx,
          indexDifficulty: trial.fittsId,
          throughput: round(throughput, 4),
        },
        adaptivePrecision,
        pointerSummary,
      },
      gameState: { score: trialsRef.current.reduce((sum, item) => sum + item.score, 0), level: current + 1, difficulty: trial.fittsId },
    });
    setFeedback(buildPrecisionTrialFeedback({ correct, reactionTimeMs: Math.round(rt), clickDistanceToTargetPx: clickDistanceRounded, score, pointerSummary }));
    setPhase('feedback');
    const next = current + 1;
    if (next >= trials.length) {
      const completed = trialsRef.current;
      const accuracy = completed.filter((item) => item.correct).length / Math.max(1, completed.length);
      const meanScore = completed.reduce((sum, item) => sum + item.score, 0) / Math.max(1, completed.length);
      const meanRT = completed.reduce((sum, item) => sum + item.reactionTimeMs, 0) / Math.max(1, completed.length);
      const meanPathEfficiency = completed.reduce((sum, item) => sum + (item.pathEfficiency ?? 0), 0) / Math.max(1, completed.length);
      const summary = {
        gameId: 'precision_targeting',
        totalTrials: completed.length,
        accuracy: round(accuracy, 4),
        meanScore: round(meanScore, 4),
        meanRT: round(meanRT, 2),
        meanPathEfficiency: round(meanPathEfficiency, 4),
        trials: completed,
      };
      setFinished(true);
      emitRef.current({ eventType: 'game_end', timestamp: now, gameState: { score: completed.reduce((sum, item) => sum + item.score, 0), level: trials.length, difficulty: trial.fittsId } });
      onCompleteRef.current?.(summary);
    } else {
      window.setTimeout(() => {
        setCurrent(next);
      }, 450);
    }
  }, [current, finished, phase, toLocalPointer, trial, trials.length]);

  if (finished) {
    const completed = trialsRef.current;
    const accuracy = completed.filter((item) => item.correct).length / Math.max(1, completed.length);
    const meanPathEfficiency = completed.reduce((sum, item) => sum + (item.pathEfficiency ?? 0), 0) / Math.max(1, completed.length);
    return (
      <div className="precision-targeting-task" data-testid="precision-task-finished">
        <PrecisionFeedbackStrip feedback={feedback} />
        <h3>Precisión completada</h3>
        <p>Precisión espacial: {Math.round(accuracy * 100)}%</p>
        <p>Eficiencia de trayectoria: {Math.round(meanPathEfficiency * 100)}%</p>
      </div>
    );
  }

  if (!trial) return null;

  const routeGuide = buildPrecisionRouteGuide(trial);

  return (
    <div className="precision-targeting-task">
      <div className="task-header">
        <span className="task-title">🎯 Ruta de precisión adaptativa</span>
        <span className="task-progress">Objetivo {current + 1} de {trials.length}</span>
        <span className="task-progress">Fitts ID {trial.fittsId.toFixed(2)}</span>
      </div>
      <p className="caption" style={{ margin: '4px 0 8px' }}>
        No es RT simple: toca el punto de inicio y luego alcanza un blanco de tamaño/distancia variable. Se penaliza error espacial, overshoot y trayectoria ineficiente.
      </p>
      <div className="precision-targeting-task__route-card" data-tone={routeGuide.difficultyTone}>
        <strong>{routeGuide.label}</strong>
        <span>{routeGuide.startLabel}</span>
        <span>{routeGuide.corridorLabel}</span>
        <span>{routeGuide.targetLabel}</span>
      </div>
      <PrecisionFeedbackStrip feedback={feedback} />
      <div
        ref={areaRef}
        className="task-area"
        data-testid="precision-task-area"
        style={{ width, height, position: 'relative', cursor: phase === 'target' ? 'crosshair' : 'default' }}
        onPointerMove={recordPointer}
        onClick={finishTrial}
      >
        <button
          type="button"
          data-testid="precision-start-pad"
          className="precision-targeting-task__start-pad"
          onClick={beginMovement}
          disabled={phase !== 'ready'}
          style={{
            position: 'absolute',
            left: trial.origin.x - 28,
            top: trial.origin.y - 28,
            width: 56,
            height: 56,
            borderRadius: '999px',
            fontWeight: 800,
            zIndex: 2,
          }}
          aria-label="Punto de inicio"
        >
          Inicio
        </button>
        {phase === 'ready' && (
          <div className="trial-feedback" style={{ left: '50%', top: '22%' }}>
            <span className="rt-display">Toca el punto de inicio</span>
          </div>
        )}
        {phase === 'target' && (
          <>
            <svg width={width} height={height} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.35 }}>
              <line x1={trial.origin.x} y1={trial.origin.y} x2={trial.target.x} y2={trial.target.y} stroke="rgba(20, 184, 166, 0.18)" strokeLinecap="round" strokeWidth={routeGuide.corridorWidthPx} />
              <line x1={trial.origin.x} y1={trial.origin.y} x2={trial.target.x} y2={trial.target.y} stroke="#0f766e" strokeDasharray="7 7" strokeWidth="3" />
            </svg>
            <div
              className="precision-targeting-task__target-label"
              style={{ left: trial.target.x, top: trial.target.y - trial.target.radius - 24 }}
            >
              {routeGuide.targetLabel}
            </div>
            <div
              className="rt-target precision-targeting-task__target"
              data-testid="precision-target"
              data-x={trial.target.x}
              data-y={trial.target.y}
              style={{
                left: trial.target.x - trial.target.radius,
                top: trial.target.y - trial.target.radius,
                width: trial.target.radius * 2,
                height: trial.target.radius * 2,
                borderRadius: '999px',
                boxShadow: '0 0 0 8px rgba(255,255,255,0.04), 0 0 24px rgba(255,209,102,0.35)',
              }}
            />
          </>
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
      gameDefinition={PRECISION_GAME_DEFINITION}
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
