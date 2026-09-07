import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GameRuntime from './GameRuntime.jsx';
import { useLanguage } from '../i18n/LanguageContext.jsx';

const COLOR_OPTIONS = Object.freeze([
  { value: 'red', label: 'Rojo', labelEn: 'Red', word: 'ROJO', css: '#dc2626' },
  { value: 'blue', label: 'Azul', labelEn: 'Blue', word: 'AZUL', css: '#2563eb' },
  { value: 'green', label: 'Verde', labelEn: 'Green', word: 'VERDE', css: '#059669' },
  { value: 'yellow', label: 'Amarillo', labelEn: 'Yellow', word: 'AMARILLO', css: '#b45309' },
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
const DEFAULT_TRIAL_DURATION_MS = 3200;

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

function labelEnForColor(value) {
  return COLOR_OPTIONS.find((option) => option.value === value)?.labelEn ?? labelForColor(value);
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
  const expectedLabelEn = labelEnForColor(scored.expectedResponse ?? scored.ink);
  const correct = scored.correct === true;
  // t_42978412: label/detail ES canónicos (tests + contrato); los siblings EN son
  // solo de presentación para el render.
  if (scored.outcome === 'timeout') {
    return {
      tone: 'incorrect',
      label: 'Tiempo agotado',
      labelEn: 'Time out',
      detail: `Tinta esperada: ${expectedLabel}`,
      detailEn: `Expected ink: ${expectedLabelEn}`,
    };
  }
  return {
    tone: correct ? 'correct' : 'incorrect',
    label: correct ? 'Correcto' : 'Interferencia detectada',
    labelEn: correct ? 'Correct' : 'Interference detected',
    detail: `Tinta esperada: ${expectedLabel}`,
    detailEn: `Expected ink: ${expectedLabelEn}`,
  };
}

export function buildColorInterferenceTiming({ durationMs = DEFAULT_TRIAL_DURATION_MS, remainingMs = DEFAULT_TRIAL_DURATION_MS } = {}) {
  const duration = Math.max(250, Number(durationMs) || DEFAULT_TRIAL_DURATION_MS);
  const remaining = Math.max(0, Math.min(duration, Number(remainingMs) || 0));
  const percentRemaining = Math.round((remaining / duration) * 100);
  return {
    durationMs: duration,
    remainingMs: Math.round(remaining),
    percentRemaining,
    label: `Tiempo ${(remaining / 1000).toFixed(1)}s`,
    labelEn: `Time ${(remaining / 1000).toFixed(1)}s`,
    urgency: percentRemaining <= 25 ? 'high' : percentRemaining <= 55 ? 'medium' : 'low',
  };
}

export function scoreColorInterferenceResponse({ trial, response, shownAt = 0, timestamp = 0 } = {}) {
  const normalizedResponse = String(response ?? '').toLowerCase();
  const expectedResponse = String(trial?.expectedResponse ?? trial?.ink ?? '').toLowerCase();
  const timedOut = normalizedResponse === 'timeout';
  const correct = normalizedResponse === expectedResponse;
  return {
    trialId: trial?.trialId ?? null,
    word: trial?.word ?? '',
    ink: trial?.ink ?? expectedResponse,
    congruent: trial?.congruent === true,
    expectedResponse,
    response: timedOut ? 'timeout' : normalizedResponse,
    correct,
    outcome: timedOut ? 'timeout' : correct ? 'correct' : 'incorrect',
    reactionTimeMs: Math.max(0, Math.round(Number(timestamp) - Number(shownAt))),
    score: correct ? 1 : 0,
    timedOut,
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

function ColorInterferenceInner({ emit, trialCount, itiMs, trialDurationMs, width = 520, onComplete }) {
  const { t } = useLanguage();
  const trials = useMemo(() => buildColorInterferenceTrials({ count: trialCount }), [trialCount]);
  const emitRef = useRef(emit);
  const onCompleteRef = useRef(onComplete);
  const [current, setCurrent] = useState(0);
  const [finished, setFinished] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [remainingMs, setRemainingMs] = useState(trialDurationMs);
  const resultsRef = useRef([]);
  const shownAtRef = useRef(0);
  const timeoutRef = useRef(null);
  const tickRef = useRef(null);
  const handleResponseRef = useRef(null);
  const trial = trials[current];

  useEffect(() => { emitRef.current = emit; }, [emit]);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  useEffect(() => {
    setFeedback(null);
    setRemainingMs(trialDurationMs);
  }, [current]);

  useEffect(() => {
    if (!trial || finished) return;
    shownAtRef.current = performance.now();
    setRemainingMs(trialDurationMs);
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

    timeoutRef.current = setTimeout(() => {
      handleResponseRef.current?.('timeout');
    }, trialDurationMs);
    tickRef.current = setInterval(() => {
      const elapsed = performance.now() - shownAtRef.current;
      setRemainingMs(Math.max(0, trialDurationMs - elapsed));
    }, 100);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [current, finished, trial, trialDurationMs]);

  const handleResponse = useCallback((response) => {
    if (!trial || finished || feedback) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
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
          timedOut: scored.timedOut,
          trialDurationMs,
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
  }, [current, feedback, finished, itiMs, trial, trialDurationMs, trials.length]);

  useEffect(() => {
    handleResponseRef.current = handleResponse;
  }, [handleResponse]);

  if (finished) {
    const summary = summarizeColorInterferenceResults(resultsRef.current);
    return (
      <div className="color-interference-task" data-testid="color-finished">
        <h3>{t('Interferencia completada', 'Interference complete')}</h3>
        <p>{t('Precisión: {pct}%', 'Accuracy: {pct}%', { pct: `${Math.round(summary.accuracy * 100)}%` })}</p>
      </div>
    );
  }

  if (!trial) return null;
  const choiceCards = buildColorInterferenceChoiceCards(trial);
  const timing = buildColorInterferenceTiming({ durationMs: trialDurationMs, remainingMs });

  return (
    <div className="color-interference-task">
      <div className="task-header">
        <span className="task-title">🌈 {t('Tarjetas de color', 'Color cards')}</span>
        <span className="task-progress">{t('Pregunta {n} de {total}', 'Question {n} of {total}', { n: current + 1, total: trials.length })}</span>
        <span className="task-progress">{t('Tipo: {type}', 'Type: {type}', { type: trial.congruent ? t('congruente', 'congruent') : t('incongruente', 'incongruent') })}</span>
        <span className="task-progress color-interference-task__timer" role="timer" aria-label={t('Tiempo restante', 'Time remaining')}>{t(timing.label, timing.labelEn)}</span>
      </div>
      <div className="task-area" data-testid="color-task-area" style={{ width, minHeight: 260, display: 'grid', placeItems: 'center' }}>
        <div className="color-interference-task__card-stage">
          <div className="color-interference-task__timebar" data-testid="color-timebar" data-urgency={timing.urgency}>
            <span style={{ width: `${timing.percentRemaining}%` }} />
          </div>
          <p className="color-interference-task__prompt">{t('Elige la tinta, ignora el texto.', 'Pick the ink, ignore the text.')}</p>
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
          <p className="caption">{t('Selecciona el color de la tinta, no la palabra.', 'Select the ink color, not the word.')}</p>
          <div className="color-interference-task__choice-grid">
            {choiceCards.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-label={t('Elegir tinta {color}', 'Pick ink {color}', { color: t(option.label, option.labelEn ?? option.label) })}
                className={option.className}
                onClick={() => handleResponse(option.value)}
              >
                {t(option.label, option.labelEn ?? option.label)}
              </button>
            ))}
          </div>
          {feedback && (
            <div className={`color-interference-task__feedback color-interference-task__feedback--${feedback.tone}`} role="status">
              <strong>{t(feedback.label, feedback.labelEn ?? feedback.label)}</strong>
              <span>{t(feedback.detail, feedback.detailEn ?? feedback.detail)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ColorInterferenceTask({ active = false, trialCount = 8, itiMs = 250, trialDurationMs = DEFAULT_TRIAL_DURATION_MS, width = 520, onGameEvent, onComplete }) {
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
          trialDurationMs={trialDurationMs}
          width={width}
          onComplete={onComplete}
        />
      )}
    />
  );
}
