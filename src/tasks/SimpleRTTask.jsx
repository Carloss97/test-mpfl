import React, { useCallback, useEffect, useRef, useState } from 'react';
import { normalizeGameEvent } from '../telemetry/gameTelemetry.js';
import { createPointerSampler, appendPointerSample } from '../telemetry/pointerSampler.js';
import { summarizePointerTrial } from '../telemetry/kinematics.js';

const TRIAL_COUNT = 10;
const MAX_RT_MS = 3000;
const MIN_ITI_MS = 600;
const MAX_ITI_MS = 1000;
const TARGET_RADIUS = 30;

function randomPos(w, h, m = 60) { return { x: m + Math.random() * (w - m * 2), y: m + Math.random() * (h - m * 2) }; }

export default function SimpleRTTask({ active = false, trialCount = TRIAL_COUNT, onTrialStart, onTrialEnd, onComplete, onGameEvent, width = 600, height = 400 }) {
  const containerRef = useRef(null);
  const stateRef = useRef({
    trials: [], trialId: 0, current: 0, phase: 'idle',
    targetPos: null, startTime: 0, timeoutId: null, itiId: null,
    pointerSampler: createPointerSampler({ maxSamples: 600, sessionId: 'simple_rt' }),
  });
  const [render, setRender] = useState({ phase: 'idle', current: 0, targetPos: null, feedback: null, scores: null });

  const triggerRender = useCallback((patch) => {
    setRender((prev) => ({ ...prev, ...patch }));
  }, []);

  const emitGameEvent = useCallback((event) => {
    if (!onGameEvent) return null;
    const normalized = normalizeGameEvent(event, { gameId: 'simple_rt', sessionId: 'simple_rt' });
    onGameEvent(normalized);
    return normalized;
  }, [onGameEvent]);

  // ─── Core logic as refs (no re-render dependencies) ───

  const doStartTrial = useCallback(() => {
    const s = stateRef.current;
    if (s.timeoutId) clearTimeout(s.timeoutId);
    if (s.itiId) clearTimeout(s.itiId);

    const pos = randomPos(width, height);
    s.targetPos = pos;
    s.startTime = performance.now();
    s.phase = 'target';
    triggerRender({ phase: 'target', targetPos: pos, feedback: null });

    const tid = `rt-${s.trialId++}`;
    s.pointerSampler = createPointerSampler({ maxSamples: 600, sessionId: 'simple_rt' });
    const shownEvent = {
      type: 'target_shown', trialId: tid, targetId: 'rt-circle',
      timestamp: s.startTime,
      context: { taskId: 'simple_rt', taskLabel: 'RT Simple', trial: s.current + 1, position: pos },
    };
    onTrialStart?.(shownEvent);
    emitGameEvent({
      eventType: 'stimulus_shown', trialId: tid, targetId: 'rt-circle', timestamp: s.startTime,
      stimulus: { kind: 'circle', payload: { position: pos, radius: TARGET_RADIUS } },
      gameState: { score: s.trials.filter((trial) => trial.correct).length, level: 1, difficulty: 'baseline', combo: 0 },
    });

    // Timeout
    s.timeoutId = setTimeout(() => {
      doEndTrial(false, null, true);
    }, MAX_RT_MS);
  }, [width, height, onTrialStart, emitGameEvent, triggerRender]);

  const doEndTrial = useCallback((correct, clickPos, timeout = false) => {
    const s = stateRef.current;
    if (s.timeoutId) { clearTimeout(s.timeoutId); s.timeoutId = null; }

    const now = performance.now();
    const rt = now - s.startTime;
    const tid = `rt-${s.trialId - 1}`;

    const result = {
      trialId: tid, targetId: 'rt-circle', timestamp: now,
      correct, reactionTimeMs: Math.round(Math.min(rt, MAX_RT_MS)),
      position: s.targetPos, clickPosition: clickPos,
    };
    const pointerSummary = summarizePointerTrial(s.pointerSampler?.samples ?? [], {
      shownAt: s.startTime,
      responseAt: now,
      target: s.targetPos ? { ...s.targetPos, radius: TARGET_RADIUS } : null,
      click: clickPos,
    });
    s.trials = [...s.trials, result];
    s.phase = 'feedback';

    triggerRender({ phase: 'feedback', feedback: { correct, rt: Math.round(Math.min(rt, MAX_RT_MS)), timeout } });

    const legacyEndEvent = {
      type: 'target_click', ...result,
      context: {
        taskId: 'simple_rt', taskLabel: 'RT Simple',
        correct, outcome: timeout ? 'timeout' : correct ? 'correct' : 'incorrect',
        score: correct ? 1 : 0,
      },
    };
    onTrialEnd?.(legacyEndEvent);
    emitGameEvent({
      eventType: 'response', trialId: tid, targetId: 'rt-circle', timestamp: now,
      pointer: clickPos,
      response: {
        correct,
        outcome: timeout ? 'timeout' : correct ? 'correct' : 'incorrect',
        reactionTimeMs: Math.round(Math.min(rt, MAX_RT_MS)),
        score: correct ? 1 : 0,
        pointerSummary,
      },
      gameState: { score: s.trials.filter((trial) => trial.correct).length, level: 1, difficulty: 'baseline' },
    });

    // Schedule next trial
    const next = s.current + 1;
    const iti = MIN_ITI_MS + Math.random() * (MAX_ITI_MS - MIN_ITI_MS);
    s.itiId = setTimeout(() => {
      if (next >= trialCount) {
        s.phase = 'finished';
        const t = s.trials;
        const mid = Math.floor(Math.max(1, t.length) / 2);
        const fh = t.slice(0, mid), sh = t.slice(mid);
        const summary = {
          trials: t, totalTrials: t.length,
          accuracy: t.filter((x) => x.correct).length / Math.max(1, t.length),
          meanRT: t.reduce((sum, x) => sum + x.reactionTimeMs, 0) / Math.max(1, t.length),
          firstHalf: fh.length ? {
            accuracy: fh.filter((x) => x.correct).length / fh.length,
            meanRT: fh.reduce((sum, x) => sum + x.reactionTimeMs, 0) / fh.length,
          } : { accuracy: 0, meanRT: 0 },
          secondHalf: sh.length ? {
            accuracy: sh.filter((x) => x.correct).length / sh.length,
            meanRT: sh.reduce((sum, x) => sum + x.reactionTimeMs, 0) / sh.length,
          } : { accuracy: 0, meanRT: 0 },
        };
        triggerRender({ phase: 'finished', scores: summary });
        onComplete?.(summary);
      } else {
        s.current = next;
        triggerRender({ current: next });
        doStartTrial();
      }
    }, iti);
  }, [trialCount, onTrialEnd, onComplete, emitGameEvent, doStartTrial, triggerRender]);

  const handlePointerMove = useCallback((e) => {
    const s = stateRef.current;
    if (s.phase !== 'target') return;
    const rect = containerRef.current?.getBoundingClientRect();
    const x = rect ? e.clientX - rect.left : e.clientX;
    const y = rect ? e.clientY - rect.top : e.clientY;
    s.pointerSampler = appendPointerSample(s.pointerSampler, {
      timestamp: e.timeStamp ?? performance.now(),
      x,
      y,
      button: e.button,
      pressure: e.pressure,
    });
  }, []);

  const handleClick = useCallback((e) => {
    const s = stateRef.current;
    if (s.phase !== 'target' || !s.targetPos) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    s.pointerSampler = appendPointerSample(s.pointerSampler, {
      timestamp: e.timeStamp ?? performance.now(),
      x: cx,
      y: cy,
      button: e.button,
      pressure: e.pressure,
    });
    const dist = Math.hypot(cx - s.targetPos.x, cy - s.targetPos.y);
    doEndTrial(dist < TARGET_RADIUS, { x: cx, y: cy });
  }, [doEndTrial]);

  // ─── Activate / deactivate ───

  useEffect(() => {
    if (!active) {
      const s = stateRef.current;
      if (s.timeoutId) clearTimeout(s.timeoutId);
      if (s.itiId) clearTimeout(s.itiId);
      Object.assign(s, { trials: [], trialId: 0, current: 0, phase: 'idle', targetPos: null, timeoutId: null, itiId: null, pointerSampler: createPointerSampler({ maxSamples: 600, sessionId: 'simple_rt' }) });
      triggerRender({ phase: 'idle', current: 0, targetPos: null, feedback: null, scores: null });
      return;
    }
    // Start fresh
    const s = stateRef.current;
    if (s.timeoutId) clearTimeout(s.timeoutId);
    if (s.itiId) clearTimeout(s.itiId);
    Object.assign(s, { trials: [], trialId: 0, current: 0, phase: 'idle', targetPos: null, timeoutId: null, itiId: null, pointerSampler: createPointerSampler({ maxSamples: 600, sessionId: 'simple_rt' }) });
    triggerRender({ phase: 'idle', current: 0, targetPos: null, feedback: null, scores: null });
    emitGameEvent({ eventType: 'game_start', timestamp: performance.now(), gameState: { score: 0, level: 1, difficulty: 'baseline', combo: 0 } });
    // Small delay then start
    const t = setTimeout(() => doStartTrial(), 200);
    return () => clearTimeout(t);
  }, [active, doStartTrial, emitGameEvent, triggerRender]);

  // Cleanup on unmount
  useEffect(() => () => {
    const s = stateRef.current;
    if (s.timeoutId) clearTimeout(s.timeoutId);
    if (s.itiId) clearTimeout(s.itiId);
  }, []);

  const { phase, current, targetPos, feedback, scores } = render;

  if (!active) return null;

  return (
    <div className="simple-rt-task" id="task-area">
      <div className="task-header">
        <span className="task-title">🎯 Tarea: Tiempo de Reacción</span>
        <span className="task-progress">{current + 1}/{trialCount}</span>
        {phase === 'finished' && <span className="task-progress" style={{ background: 'rgba(77,212,172,0.2)' }}>✓</span>}
      </div>
      <div ref={containerRef} className="task-area" style={{ width, height, position: 'relative', cursor: phase === 'target' ? 'crosshair' : 'default' }} onPointerMove={handlePointerMove} onClick={handleClick}>
        {phase === 'target' && targetPos && (
          <div className="rt-target" style={{ left: targetPos.x - 25, top: targetPos.y - 25, width: 50, height: 50 }} />
        )}
        {phase === 'feedback' && feedback && (
          <div className="trial-feedback" style={{ left: '50%', top: '50%' }}>
            <span style={{ fontSize: '2.5rem' }}>{feedback.correct ? '✓' : '✗'}</span>
            <span className="rt-display">{feedback.rt}ms{feedback.timeout ? ' ⏰' : ''}</span>
          </div>
        )}
        {phase === 'finished' && scores && (
          <div className="task-results" style={{ left: '50%', top: '50%' }}>
            <h3>✓ Completado</h3>
            <p>Precisión: {Math.round(scores.accuracy * 100)}%</p>
            <p>RT medio: {Math.round(scores.meanRT)}ms</p>
            <p>1ª mitad: {Math.round(scores.firstHalf.meanRT)}ms ({Math.round(scores.firstHalf.accuracy * 100)}%)</p>
            <p>2ª mitad: {Math.round(scores.secondHalf.meanRT)}ms ({Math.round(scores.secondHalf.accuracy * 100)}%)</p>
            <button type="button" className="secondary" onClick={() => {
              const s = stateRef.current;
              if (s.timeoutId) clearTimeout(s.timeoutId);
              if (s.itiId) clearTimeout(s.itiId);
              Object.assign(s, { trials: [], trialId: 0, current: 0, phase: 'idle', targetPos: null, timeoutId: null, itiId: null, pointerSampler: createPointerSampler({ maxSamples: 600, sessionId: 'simple_rt' }) });
              triggerRender({ phase: 'idle', current: 0, targetPos: null, feedback: null, scores: null });
              setTimeout(() => doStartTrial(), 200);
            }} style={{ marginTop: '12px' }}>Repetir</button>
          </div>
        )}
      </div>
    </div>
  );
}