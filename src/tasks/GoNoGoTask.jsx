import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GameRuntime from './GameRuntime.jsx';

const DEFAULT_TRIAL_COUNT = 10;
const DEFAULT_STIMULUS_MS = 900;
const DEFAULT_ITI_MS = 350;
const GO_NOGO_GAME_DEFINITION = Object.freeze({ id: 'go_nogo', label: 'Go/No-Go inhibición motora', difficulty: 'response_inhibition' });

function round(value, digits = 4) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  const factor = 10 ** digits;
  return Math.round(numeric * factor) / factor;
}

function mean(values) {
  const numeric = values.filter((value) => Number.isFinite(Number(value))).map(Number);
  if (!numeric.length) return 0;
  return round(numeric.reduce((sum, value) => sum + value, 0) / numeric.length, 2);
}

export function buildGoNoGoTrials({ count = DEFAULT_TRIAL_COUNT, noGoEvery = 3 } = {}) {
  const safeCount = Math.max(1, Math.floor(Number(count) || DEFAULT_TRIAL_COUNT));
  const safeNoGoEvery = Math.max(2, Math.floor(Number(noGoEvery) || 3));
  return Array.from({ length: safeCount }, (_, index) => {
    const isNoGo = (index + 1) % safeNoGoEvery === 0;
    return {
      trialId: `gonogo-${index}`,
      targetId: `gonogo-cue-${index}`,
      trialIndex: index,
      cue: isNoGo ? 'NO-GO' : 'GO',
      responseRequired: !isNoGo,
      expectedResponse: isNoGo ? 'withhold' : 'press',
    };
  });
}

export function scoreGoNoGoResponse({ trial, response, shownAt = 0, timestamp = 0 } = {}) {
  const normalizedResponse = String(response ?? '').toLowerCase();
  const cue = trial?.cue ?? 'GO';
  const responseRequired = trial?.responseRequired !== false;
  const rt = normalizedResponse === 'press' ? Math.max(0, Number(timestamp) - Number(shownAt)) : null;

  let outcome;
  let correct;
  if (responseRequired && normalizedResponse === 'press') {
    outcome = 'correct_go';
    correct = true;
  } else if (responseRequired) {
    outcome = 'omission_error';
    correct = false;
  } else if (normalizedResponse === 'press') {
    outcome = 'commission_error';
    correct = false;
  } else {
    outcome = 'correct_withhold';
    correct = true;
  }

  return {
    trialId: trial?.trialId ?? null,
    cue,
    responseRequired,
    response: normalizedResponse || (responseRequired ? 'timeout' : 'withhold'),
    correct,
    outcome,
    reactionTimeMs: rt === null ? null : Math.round(rt),
    score: correct ? 1 : 0,
  };
}

export function summarizeGoNoGoResults(results = []) {
  const completed = results.filter(Boolean);
  const goTrials = completed.filter((result) => result.responseRequired === true || result.cue === 'GO');
  const noGoTrials = completed.filter((result) => result.responseRequired === false || result.cue === 'NO-GO');
  const correct = completed.filter((result) => result.correct === true);
  const commissionErrors = completed.filter((result) => result.outcome === 'commission_error');
  const omissionErrors = completed.filter((result) => result.outcome === 'omission_error');
  const correctGoRTs = completed
    .filter((result) => result.outcome === 'correct_go')
    .map((result) => result.reactionTimeMs)
    .filter((value) => Number.isFinite(Number(value)));

  let postErrorSlowingMs = 0;
  const shifts = [];
  for (let index = 1; index < completed.length; index += 1) {
    const previous = completed[index - 1];
    const current = completed[index];
    if (previous.correct === false && Number.isFinite(Number(current.reactionTimeMs))) {
      const priorCorrectMean = mean(completed.slice(0, index).filter((item) => item.outcome === 'correct_go').map((item) => item.reactionTimeMs));
      if (priorCorrectMean > 0) shifts.push(Number(current.reactionTimeMs) - priorCorrectMean);
    }
  }
  if (shifts.length) postErrorSlowingMs = mean(shifts);

  return {
    gameId: 'go_nogo',
    totalTrials: completed.length,
    accuracy: completed.length ? round(correct.length / completed.length, 4) : 0,
    meanScore: completed.length ? round(completed.reduce((sum, result) => sum + Number(result.score ?? 0), 0) / completed.length, 4) : 0,
    commissionErrorRate: noGoTrials.length ? round(commissionErrors.length / noGoTrials.length, 4) : 0,
    omissionErrorRate: goTrials.length ? round(omissionErrors.length / goTrials.length, 4) : 0,
    correctGoRT: mean(correctGoRTs),
    postErrorSlowingMs: round(postErrorSlowingMs, 2),
    trials: completed,
  };
}

function GoNoGoInner({ emit, trialCount, stimulusMs, itiMs, onComplete }) {
  const trials = useMemo(() => buildGoNoGoTrials({ count: trialCount, noGoEvery: 2 }), [trialCount]);
  const emitRef = useRef(emit);
  const onCompleteRef = useRef(onComplete);
  const [current, setCurrent] = useState(0);
  const [finished, setFinished] = useState(false);
  const resultsRef = useRef([]);
  const shownAtRef = useRef(0);
  const handledRef = useRef(false);
  const timeoutRef = useRef(null);
  const itiRef = useRef(null);
  const trial = trials[current];

  useEffect(() => { emitRef.current = emit; }, [emit]);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  const completeIfFinished = useCallback((nextResults, now) => {
    if (nextResults.length >= trials.length) {
      const summary = summarizeGoNoGoResults(nextResults);
      setFinished(true);
      emitRef.current({ eventType: 'game_end', timestamp: now, gameState: { score: summary.meanScore, level: trials.length, difficulty: 'go_no_go' } });
      onCompleteRef.current?.(summary);
      return true;
    }
    return false;
  }, [trials.length]);

  const finalizeTrial = useCallback((response) => {
    if (!trial || handledRef.current || finished) return;
    handledRef.current = true;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const now = performance.now();
    const scored = scoreGoNoGoResponse({ trial, response, shownAt: shownAtRef.current, timestamp: now });
    const nextResults = [...resultsRef.current, scored];
    resultsRef.current = nextResults;

    emitRef.current({
      eventType: 'response',
      trialId: trial.trialId,
      targetId: trial.targetId,
      timestamp: now,
      response: {
        correct: scored.correct,
        outcome: scored.outcome,
        reactionTimeMs: scored.reactionTimeMs,
        score: scored.score,
        inhibition: {
          cue: trial.cue,
          responseRequired: trial.responseRequired,
          response: scored.response,
        },
      },
      gameState: { score: nextResults.reduce((sum, result) => sum + result.score, 0), level: current + 1, difficulty: 'go_no_go' },
    });

    if (!completeIfFinished(nextResults, now)) {
      itiRef.current = setTimeout(() => setCurrent((value) => value + 1), itiMs);
    }
  }, [completeIfFinished, current, finished, itiMs, trial]);

  useEffect(() => {
    if (!trial || finished) return undefined;
    handledRef.current = false;
    shownAtRef.current = performance.now();
    emitRef.current({
      eventType: 'stimulus_shown',
      trialId: trial.trialId,
      targetId: trial.targetId,
      timestamp: shownAtRef.current,
      stimulus: { kind: 'go_nogo_cue', payload: { cue: trial.cue, responseRequired: trial.responseRequired } },
      gameState: { score: resultsRef.current.reduce((sum, result) => sum + result.score, 0), level: current + 1, difficulty: 'go_no_go' },
    });
    timeoutRef.current = setTimeout(() => {
      finalizeTrial(trial.responseRequired ? 'timeout' : 'withhold');
    }, stimulusMs);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (itiRef.current) clearTimeout(itiRef.current);
    };
  }, [current, finalizeTrial, finished, stimulusMs, trial]);

  if (finished) {
    const summary = summarizeGoNoGoResults(resultsRef.current);
    return (
      <div className="go-nogo-task" data-testid="gonogo-finished">
        <h3>Go/No-Go completado</h3>
        <p>Precisión: {Math.round(summary.accuracy * 100)}%</p>
      </div>
    );
  }

  if (!trial) return null;

  return (
    <div className="go-nogo-task">
      <div className="task-header">
        <span className="task-title">🟢 Go/No-Go</span>
        <span className="task-progress">{current + 1}/{trials.length}</span>
      </div>
      <div className="task-area" data-testid="gonogo-task-area" style={{ width: 420, height: 220, display: 'grid', placeItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div
            data-testid="gonogo-cue"
            style={{
              fontSize: '3rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              color: trial.responseRequired ? '#4dd4ac' : '#ff6b7a',
            }}
          >
            {trial.cue}
          </div>
          <button type="button" className="secondary" onClick={() => finalizeTrial('press')} style={{ marginTop: '16px' }}>
            Responder
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GoNoGoTask({ active = false, trialCount = DEFAULT_TRIAL_COUNT, stimulusMs = DEFAULT_STIMULUS_MS, itiMs = DEFAULT_ITI_MS, onGameEvent, onComplete }) {
  return (
    <GameRuntime
      active={active}
      sessionId="go_nogo"
      gameDefinition={GO_NOGO_GAME_DEFINITION}
      onEvent={onGameEvent}
      renderTrial={(_, emit) => (
        <GoNoGoInner
          emit={emit}
          trialCount={trialCount}
          stimulusMs={stimulusMs}
          itiMs={itiMs}
          onComplete={onComplete}
        />
      )}
    />
  );
}
