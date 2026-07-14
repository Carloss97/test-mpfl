import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GameRuntime from './GameRuntime.jsx';

const COLOR_OPTIONS = Object.freeze([
  { value: 'red', label: 'Rojo', word: 'ROJO', css: '#dc2626' },
  { value: 'blue', label: 'Azul', word: 'AZUL', css: '#2563eb' },
  { value: 'green', label: 'Verde', word: 'VERDE', css: '#059669' },
  { value: 'yellow', label: 'Amarillo', word: 'AMARILLO', css: '#b45309' },
]);

const TRIAL_PATTERN = Object.freeze([
  { word: 'ROJO', ink: 'red', congruent: true },
  { word: 'AMARILLO', ink: 'green', congruent: false },
  { word: 'AZUL', ink: 'blue', congruent: true },
  { word: 'VERDE', ink: 'yellow', congruent: false },
  { word: 'AMARILLO', ink: 'yellow', congruent: true },
  { word: 'ROJO', ink: 'blue', congruent: false },
]);
const COLOR_INTERFERENCE_GAME_DEFINITION = Object.freeze({ id: 'color_interference', label: 'Interferencia color-palabra', difficulty: 'conflict' });

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

function labelForColor(value) {
  return COLOR_OPTIONS.find((option) => option.value === value)?.label ?? String(value);
}

function cssForColor(value) {
  return COLOR_OPTIONS.find((option) => option.value === value)?.css ?? '#e7eef8';
}

export function classifyStimulusWordLength(word = '') {
  return String(word).length >= 8 ? 'long-word' : 'normal-word';
}

export function buildColorInterferenceTrials({ count = 8 } = {}) {
  const safeCount = Math.max(1, Math.floor(Number(count) || 8));
  return Array.from({ length: safeCount }, (_, index) => {
    const pattern = TRIAL_PATTERN[index % TRIAL_PATTERN.length];
    return {
      trialId: `color-${index}`,
      targetId: `color-stimulus-${index}`,
      trialIndex: index,
      word: pattern.word,
      ink: pattern.ink,
      expectedResponse: pattern.ink,
      expectedLabel: labelForColor(pattern.ink),
      congruent: pattern.congruent,
    };
  });
}

export function buildColorInterferenceChoiceCards(trial = {}) {
  const expectedResponse = String(trial?.expectedResponse ?? trial?.ink ?? '').toLowerCase();
  return COLOR_OPTIONS.map((option) => ({
    ...option,
    isExpected: option.value === expectedResponse,
    ariaLabel: `Elegir tinta ${option.label}`,
    className: `secondary color-interference-task__option color-interference-task__choice-card color-interference-task__choice-card--${option.value}`,
  }));
}

export function buildColorInterferenceFeedback(scored = {}) {
  const expectedLabel = labelForColor(scored.expectedResponse ?? scored.ink);
  const correct = scored.correct === true;
  return {
    tone: correct ? 'correct' : 'incorrect',
    label: correct ? 'Correcto' : 'Interferencia detectada',
    detail: `Tinta esperada: ${expectedLabel}`,
  };
}

export function scoreColorInterferenceResponse({ trial, response, shownAt = 0, timestamp = 0 } = {}) {
  const normalizedResponse = String(response ?? '').toLowerCase();
  const expectedResponse = String(trial?.expectedResponse ?? trial?.ink ?? '').toLowerCase();
  const correct = normalizedResponse === expectedResponse;
  return {
    trialId: trial?.trialId ?? null,
    word: trial?.word ?? '',
    ink: trial?.ink ?? expectedResponse,
    congruent: trial?.congruent === true,
    expectedResponse,
    response: normalizedResponse,
    correct,
    outcome: correct ? 'correct' : 'incorrect',
    reactionTimeMs: Math.max(0, Math.round(Number(timestamp) - Number(shownAt))),
    score: correct ? 1 : 0,
  };
}

export function summarizeColorInterferenceResults(results = []) {
  const completed = results.filter(Boolean);
  const congruent = completed.filter((result) => result.congruent);
  const incongruent = completed.filter((result) => !result.congruent);
  const correct = completed.filter((result) => result.correct);
  const congruentCorrect = congruent.filter((result) => result.correct);
  const incongruentCorrect = incongruent.filter((result) => result.correct);
  const congruentRT = mean(congruent.filter((result) => result.correct).map((result) => result.reactionTimeMs));
  const incongruentRT = mean(incongruent.filter((result) => result.correct).map((result) => result.reactionTimeMs));
  return {
    gameId: 'color_interference',
    totalTrials: completed.length,
    accuracy: completed.length ? round(correct.length / completed.length, 4) : 0,
    meanScore: completed.length ? round(completed.reduce((sum, result) => sum + Number(result.score ?? 0), 0) / completed.length, 4) : 0,
    errorRate: completed.length ? round(1 - correct.length / completed.length, 4) : 0,
    congruentAccuracy: congruent.length ? round(congruentCorrect.length / congruent.length, 4) : 0,
    incongruentAccuracy: incongruent.length ? round(incongruentCorrect.length / incongruent.length, 4) : 0,
    congruentRT,
    incongruentRT,
    conflictCostMs: congruentRT > 0 && incongruentRT > 0 ? round(incongruentRT - congruentRT, 2) : 0,
    trials: completed,
  };
}

function ColorInterferenceInner({ emit, trialCount, itiMs, onComplete }) {
  const trials = useMemo(() => buildColorInterferenceTrials({ count: trialCount }), [trialCount]);
  const emitRef = useRef(emit);
  const onCompleteRef = useRef(onComplete);
  const [current, setCurrent] = useState(0);
  const [finished, setFinished] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const resultsRef = useRef([]);
  const shownAtRef = useRef(0);
  const trial = trials[current];

  useEffect(() => { emitRef.current = emit; }, [emit]);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  useEffect(() => {
    setFeedback(null);
  }, [current]);

  useEffect(() => {
    if (!trial || finished) return;
    shownAtRef.current = performance.now();
    emitRef.current({
      eventType: 'stimulus_shown',
      trialId: trial.trialId,
      targetId: trial.targetId,
      timestamp: shownAtRef.current,
      stimulus: {
        kind: 'color_word',
        payload: {
          word: trial.word,
          ink: trial.ink,
          expectedResponse: trial.expectedResponse,
          congruent: trial.congruent,
          wordFit: classifyStimulusWordLength(trial.word),
        },
      },
      gameState: { score: resultsRef.current.reduce((sum, result) => sum + result.score, 0), level: current + 1, difficulty: trial.congruent ? 'congruent' : 'incongruent' },
    });
  }, [current, finished, trial]);

  const handleResponse = useCallback((response) => {
    if (!trial || finished || feedback) return;
    const now = performance.now();
    const scored = scoreColorInterferenceResponse({ trial, response, shownAt: shownAtRef.current, timestamp: now });
    const nextResults = [...resultsRef.current, scored];
    resultsRef.current = nextResults;
    setFeedback(buildColorInterferenceFeedback(scored));
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
        interference: {
          word: trial.word,
          ink: trial.ink,
          congruent: trial.congruent,
          expectedResponse: trial.expectedResponse,
          response: scored.response,
        },
      },
      gameState: { score: nextResults.reduce((sum, result) => sum + result.score, 0), level: current + 1, difficulty: trial.congruent ? 'congruent' : 'incongruent' },
    });
    const next = current + 1;
    if (next >= trials.length) {
      setTimeout(() => {
        const summary = summarizeColorInterferenceResults(nextResults);
        setFinished(true);
        emitRef.current({ eventType: 'game_end', timestamp: performance.now(), gameState: { score: summary.meanScore, level: trials.length, difficulty: 'mixed_interference' } });
        onCompleteRef.current?.(summary);
      }, itiMs);
    } else {
      setTimeout(() => setCurrent(next), itiMs);
    }
  }, [current, feedback, finished, itiMs, trial, trials.length]);

  if (finished) {
    const summary = summarizeColorInterferenceResults(resultsRef.current);
    return (
      <div className="color-interference-task" data-testid="color-finished">
        <h3>Interferencia completada</h3>
        <p>Precisión: {Math.round(summary.accuracy * 100)}%</p>
      </div>
    );
  }

  if (!trial) return null;
  const choiceCards = buildColorInterferenceChoiceCards(trial);

  return (
    <div className="color-interference-task">
      <div className="task-header">
        <span className="task-title">🌈 Tarjetas de color</span>
        <span className="task-progress">Pregunta {current + 1} de {trials.length}</span>
        <span className="task-progress">Tipo: {trial.congruent ? 'congruente' : 'incongruente'}</span>
      </div>
      <div className="task-area" data-testid="color-task-area" style={{ width: 520, minHeight: 260, display: 'grid', placeItems: 'center' }}>
        <div className="color-interference-task__card-stage">
          <p className="color-interference-task__prompt">Elige la tinta, ignora el texto.</p>
          <div
            data-testid="color-stimulus"
            className={`color-interference-task__stimulus-card ${classifyStimulusWordLength(trial.word)}`}
            style={{
              color: cssForColor(trial.ink),
              fontSize: classifyStimulusWordLength(trial.word) === 'long-word' ? '2.5rem' : '3rem',
              letterSpacing: classifyStimulusWordLength(trial.word) === 'long-word' ? '0.04em' : '0.08em',
              fontWeight: 900,
              maxWidth: '100%',
              overflowWrap: 'anywhere',
            }}
          >
            {trial.word}
          </div>
          <p className="caption">Selecciona el color de la tinta, no la palabra.</p>
          <div className="color-interference-task__choice-grid">
            {choiceCards.map((option) => (
              <button key={option.value} type="button" aria-label={option.ariaLabel} className={option.className} onClick={() => handleResponse(option.value)}>
                {option.label}
              </button>
            ))}
          </div>
          {feedback && (
            <div className={`color-interference-task__feedback color-interference-task__feedback--${feedback.tone}`} role="status">
              <strong>{feedback.label}</strong>
              <span>{feedback.detail}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ColorInterferenceTask({ active = false, trialCount = 8, itiMs = 250, onGameEvent, onComplete }) {
  return (
    <GameRuntime
      active={active}
      sessionId="color_interference"
      gameDefinition={COLOR_INTERFERENCE_GAME_DEFINITION}
      onEvent={onGameEvent}
      renderTrial={(_, emit) => (
        <ColorInterferenceInner
          emit={emit}
          trialCount={trialCount}
          itiMs={itiMs}
          onComplete={onComplete}
        />
      )}
    />
  );
}
