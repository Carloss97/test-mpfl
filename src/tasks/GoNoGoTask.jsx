import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GameRuntime from './GameRuntime.jsx';
import { useLanguage } from '../i18n/LanguageContext.jsx';

const DEFAULT_TRIAL_COUNT = 10;
const DEFAULT_STIMULUS_MS = 900;
const DEFAULT_ITI_MS = 350;
const DEFAULT_NO_GO_PROBABILITY = 0.35;
const GO_NOGO_GAME_DEFINITION = Object.freeze({ id: 'go_nogo', label: 'Go/No-Go inhibición motora', difficulty: 'go_no_go' });

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

function shuffleIndices(indices, rng) {
  const arr = [...indices];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    // clamp: el contrato de rng es [0,1), pero un rng de test que devuelve 1.0
    // haría j = i+1 (out-of-bounds) y corruptaría el array.
    const j = Math.max(0, Math.min(i, Math.floor(rng() * (i + 1))));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Secuencia aleatorizada de cues (FASE B.3, GNP-P1-1): la alternación
// determinista GO/NO-GO (noGoEvery) telegrafiaba el tipo de cada trial y un
// candidato podía lograr 100% de precisión sin inhibir nada — inválido para el
// constructo de control inhibitorio. Ahora:
//  - el trial 0 es siempre GO (enseña el mapeo de respuesta antes de la primera
//    demanda de inhibición);
//  - los trials ≥1 son NO-GO con probabilidad `noGoProbability` (default 0.35,
//    rango típico 25–50% en tareas go/no-go);
//  - se garantiza un piso `minNoGo` (default 2) para que siempre exista señal de
//    inhibición, y un tope `maxNoGo` (default count/2) para mantener la mayoría
//    de trials GO (señal de RT motor);
//  - `rng` inyectable para tests deterministas (default Math.random).
export function buildGoNoGoTrials({
  count = DEFAULT_TRIAL_COUNT,
  noGoProbability = DEFAULT_NO_GO_PROBABILITY,
  minNoGo = 2,
  maxNoGo = null,
  rng = Math.random,
} = {}) {
  const safeCount = Math.max(1, Math.floor(Number(count) || DEFAULT_TRIAL_COUNT));
  const probability = Number(noGoProbability);
  const safeP = Number.isFinite(probability) ? Math.min(0.9, Math.max(0.05, probability)) : DEFAULT_NO_GO_PROBABILITY;
  const requestedMax = maxNoGo == null ? null : Math.floor(Number(maxNoGo));
  const safeMax = requestedMax == null ? Math.floor(safeCount / 2) : Math.max(0, Math.min(safeCount, requestedMax));
  const safeMin = Math.min(safeMax, safeCount - 1, Math.max(0, Math.floor(Number(minNoGo) || 2)));

  const isNoGo = Array.from({ length: safeCount }, () => false);
  for (let index = 1; index < safeCount; index += 1) {
    isNoGo[index] = rng() < safeP;
  }
  let noGoCount = isNoGo.filter(Boolean).length;
  if (noGoCount < safeMin) {
    const goCandidates = shuffleIndices(
      isNoGo.map((flag, index) => (!flag && index > 0) ? index : -1).filter((index) => index >= 0),
      rng,
    );
    for (const index of goCandidates) {
      if (noGoCount >= safeMin) break;
      isNoGo[index] = true;
      noGoCount += 1;
    }
  } else if (noGoCount > safeMax) {
    const noGoCandidates = shuffleIndices(
      isNoGo.map((flag, index) => (flag && index > 0) ? index : -1).filter((index) => index >= 0),
      rng,
    );
    for (const index of noGoCandidates) {
      if (noGoCount <= safeMax) break;
      isNoGo[index] = false;
      noGoCount -= 1;
    }
  }

  return Array.from({ length: safeCount }, (_, index) => {
    const trialIsNoGo = isNoGo[index];
    return {
      trialId: `gonogo-${index}`,
      targetId: `gonogo-cue-${index}`,
      trialIndex: index,
      cue: trialIsNoGo ? 'NO-GO' : 'GO',
      responseRequired: !trialIsNoGo,
      expectedResponse: trialIsNoGo ? 'withhold' : 'press',
    };
  });
}

export function buildGoNoGoCuePresentation(trial = {}) {
  const responseRequired = trial?.responseRequired !== false;
  if (responseRequired) {
    return {
      state: 'go',
      heading: 'Semáforo de impulso',
      instruction: 'Pulsa responder solo cuando aparezca GO.',
      buttonLabel: 'Responder ahora',
      cueClassName: 'go-nogo-task__cue--go',
    };
  }
  return {
    state: 'no-go',
    heading: 'Semáforo de impulso',
    instruction: 'NO-GO: espera sin pulsar para inhibir la respuesta.',
    buttonLabel: 'Responder ahora',
    cueClassName: 'go-nogo-task__cue--no-go',
    temptationLabel: 'No lo pulses en NO-GO',
  };
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

// Post-error slowing incremental (misma semántica que el resumen): si el trial
// anterior fue error y el trial actual tiene RT finito (correct_go o comisión),
// delta = rtActual − media de los correct_go anteriores. Solo se define cuando
// hay evidencia suficiente (≥1 correct_go anterior).
function computePostErrorSlowingMs(priorResults, currentResult) {
  const previous = priorResults[priorResults.length - 1];
  if (!previous || previous.correct !== false) return undefined;
  if (!Number.isFinite(Number(currentResult?.reactionTimeMs))) return undefined;
  const priorCorrectMean = mean(priorResults.filter((item) => item.outcome === 'correct_go').map((item) => item.reactionTimeMs));
  if (!(priorCorrectMean > 0)) return undefined;
  return Math.round(Number(currentResult.reactionTimeMs) - priorCorrectMean);
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

  const correctGoRT = mean(correctGoRTs);
  return {
    gameId: 'go_nogo',
    totalTrials: completed.length,
    // Claves de contrato del session builder (summarizeCompletedBlocks):
    // completedTrialCount + meanReactionTimeMs (RT medible solo en trials GO;
    // la RT de correct-go es la señal de velocidad asociada a esta tarea).
    completedTrialCount: completed.length,
    meanReactionTimeMs: correctGoRT,
    accuracy: completed.length ? round(correct.length / completed.length, 4) : 0,
    meanScore: completed.length ? round(completed.reduce((sum, result) => sum + Number(result.score ?? 0), 0) / completed.length, 4) : 0,
    commissionErrorRate: noGoTrials.length ? round(commissionErrors.length / noGoTrials.length, 4) : 0,
    omissionErrorRate: goTrials.length ? round(omissionErrors.length / goTrials.length, 4) : 0,
    correctGoRT,
    goTrialCount: goTrials.length,
    noGoTrialCount: noGoTrials.length,
    postErrorSlowingMs: round(postErrorSlowingMs, 2),
    trials: completed,
  };
}

function GoNoGoInner({ emit, trialCount, stimulusMs, itiMs, width = 520, height = 300, rng, onComplete }) {
  const { t } = useLanguage();
  const rngRef = useRef(rng ?? Math.random);
  const trials = useMemo(() => buildGoNoGoTrials({ count: trialCount, rng: rngRef.current }), [trialCount]);
  const emitRef = useRef(emit);
  const onCompleteRef = useRef(onComplete);
  const [current, setCurrent] = useState(0);
  const [finished, setFinished] = useState(false);
  const resultsRef = useRef([]);
  const shownAtRef = useRef(0);
  const handledRef = useRef(false);
  const emittedForRef = useRef(-1);
  const timeoutRef = useRef(null);
  const itiRef = useRef(null);
  const trial = trials[current];

  useEffect(() => { emitRef.current = emit; }, [emit]);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  const completeIfFinished = useCallback((nextResults, now) => {
    if (nextResults.length >= trials.length) {
      const summary = summarizeGoNoGoResults(nextResults);
      setFinished(true);
      // game_end: score en escala 0-100 (contrato simple_rt/precision B.1/B.2)
      // y difficulty unificada 'go_no_go' (GNP-P3-2/P3-3).
      emitRef.current({ eventType: 'game_end', timestamp: now, gameState: { score: Math.round(summary.meanScore * 100), level: trials.length, difficulty: 'go_no_go' } });
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
    const priorResults = resultsRef.current;
    const postErrorSlowingMs = computePostErrorSlowingMs(priorResults, scored);
    const nextResults = [...priorResults, scored];
    resultsRef.current = nextResults;

    const responsePayload = {
      correct: scored.correct,
      outcome: scored.outcome,
      reactionTimeMs: scored.reactionTimeMs,
      score: scored.score,
      inhibition: {
        cue: trial.cue,
        responseRequired: trial.responseRequired,
        response: scored.response,
      },
    };
    // GNP-P2-2: el agregado por eventos (summarizeGameEvents → feature vector
    // response.postErrorSlowingMs) necesita el valor por respuesta; sin esto
    // quedaba siempre 0 aunque el resumen del juego sí lo midiera.
    if (postErrorSlowingMs !== undefined) responsePayload.postErrorSlowingMs = postErrorSlowingMs;

    emitRef.current({
      eventType: 'response',
      trialId: trial.trialId,
      targetId: trial.targetId,
      timestamp: now,
      response: responsePayload,
      gameState: { score: nextResults.reduce((sum, result) => sum + result.score, 0), level: current + 1, difficulty: 'go_no_go' },
    });

    if (!completeIfFinished(nextResults, now)) {
      // GNP-P2-5: ITI con jitter [0.75, 1.25] × itiMs — el ritmo fijo de
      // 350 ms telegrafiaba el timing del próximo estímulo.
      const jitteredItiMs = itiMs * (0.75 + 0.5 * Math.random());
      itiRef.current = setTimeout(() => setCurrent((value) => value + 1), jitteredItiMs);
    }
  }, [completeIfFinished, current, finished, itiMs, trial]);

  useEffect(() => {
    if (!trial || finished) return undefined;
    handledRef.current = false;
    shownAtRef.current = performance.now();
    // GNP-P3-6: StrictMode (dev) re-ejecuta el effect sin resetear refs —
    // sin este guard, el trial 0 emitía stimulus_shown dos veces.
    if (emittedForRef.current !== current) {
      emittedForRef.current = current;
      emitRef.current({
        eventType: 'stimulus_shown',
        trialId: trial.trialId,
        targetId: trial.targetId,
        timestamp: shownAtRef.current,
        stimulus: { kind: 'go_nogo_cue', payload: { cue: trial.cue, responseRequired: trial.responseRequired } },
        gameState: { score: resultsRef.current.reduce((sum, result) => sum + result.score, 0), level: current + 1, difficulty: 'go_no_go' },
      });
    }
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
        <h3>{t('Go/No-Go completado', 'Go/No-Go complete')}</h3>
        <p>{t('Precisión: {pct}%', 'Accuracy: {pct}%', { pct: `${Math.round(summary.accuracy * 100)}%` })}</p>
      </div>
    );
  }

  if (!trial) return null;
  const presentation = buildGoNoGoCuePresentation(trial);

  return (
    <div className="go-nogo-task">
      <div className="task-header">
        <span className="task-title">🚦 {t('Semáforo de impulso', 'Impulse traffic light')}</span>
        <span className="task-progress">{t('Señal {n} de {total}', 'Signal {n} of {total}', { n: current + 1, total: trials.length })}</span>
      </div>
      <div className="task-area" data-testid="gonogo-task-area" style={{ width, height, display: 'grid', placeItems: 'center' }}>
        <div className="go-nogo-task__cue-card">
          <div
            data-testid="gonogo-cue"
            className={`go-nogo-task__cue ${presentation.cueClassName}`}
            style={{
              fontSize: 'clamp(3rem, 9vw, 4.8rem)',
              fontWeight: 800,
              letterSpacing: '0.08em',
              whiteSpace: 'nowrap',
            }}
          >
            {trial.cue}
          </div>
          <p className="go-nogo-task__instruction">
            {presentation.state === 'go'
              ? t('Pulsa responder solo cuando aparezca GO.', 'Press respond only when GO appears.')
              : t('NO-GO: espera sin pulsar para inhibir la respuesta.', 'NO-GO: wait without pressing to inhibit the response.')}
          </p>
          {presentation.temptationLabel && (
            <p className="go-nogo-task__temptation">{t('No lo pulses en NO-GO', 'Do not press on NO-GO')}</p>
          )}
          <button
            type="button"
            className="secondary go-nogo-task__response"
            data-state={presentation.state}
            onClick={() => finalizeTrial('press')}
          >
            {t('Responder ahora', 'Respond now')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GoNoGoTask({ active = false, trialCount = DEFAULT_TRIAL_COUNT, stimulusMs = DEFAULT_STIMULUS_MS, itiMs = DEFAULT_ITI_MS, width = 520, height = 300, rng = Math.random, onGameEvent, onComplete }) {
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
          width={width}
          height={height}
          rng={rng}
          onComplete={onComplete}
        />
      )}
    />
  );
}
