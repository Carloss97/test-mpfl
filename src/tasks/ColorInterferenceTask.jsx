import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GameRuntime from './GameRuntime.jsx';
import { useLanguage } from '../i18n/LanguageContext.jsx';

// Colores de tinta + nombres del estímulo ES/EN (note c FASE B.4: el estímulo se
// renderiza en el idioma de la sesión; antes la palabra era SIEMPRE española y en
// EN el estímulo dejaba de ser una palabra de color válida → constructo Stroop
// inválido en esa sesión).
const COLOR_OPTIONS = Object.freeze([
  { value: 'red', wordEs: 'ROJO', wordEn: 'RED', label: 'Rojo', labelEn: 'Red', css: '#dc2626' },
  { value: 'blue', wordEs: 'AZUL', wordEn: 'BLUE', label: 'Azul', labelEn: 'Blue', css: '#2563eb' },
  { value: 'green', wordEs: 'VERDE', wordEn: 'GREEN', label: 'Verde', labelEn: 'Green', css: '#059669' },
  { value: 'yellow', wordEs: 'AMARILLO', wordEn: 'YELLOW', label: 'Amarillo', labelEn: 'Yellow', css: '#b45309' },
]);

// Estímulo neutral (no-palabra de color): estándar Stroop de 3 condiciones.
const NEUTRAL_STIMULUS_WORD = 'XXXXX';
const STROOP_CONDITIONS = Object.freeze(['congruent', 'incongruent', 'neutral']);

const COLOR_INTERFERENCE_GAME_DEFINITION = Object.freeze({ id: 'color_interference', label: 'Interferencia color-palabra', difficulty: 'color_interference' });
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

function shuffleIndices(indices, rng) {
  const arr = [...indices];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    // clamp: el contrato de rng es [0,1), pero un rng de test que devuelve 1.0
    // haría j = i+1 (out-of-bounds) y corruptaría el array (patrón B.3 GNP-P1-1).
    const j = Math.max(0, Math.min(i, Math.floor(rng() * (i + 1))));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
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

// Secuencia aleatorizada de condiciones Stroop (FASE B.4, CIP-P1-1):
// el patrón legado (TRIAL_PATTERN 7-ciclo → C/I/C/I… estricto en 8 trials)
// telegrafiaba la condición de cada trial — y además la UI la anunciaba con el
// pill "Tipo: congruente/incongruente" — así que el candidato predecía qué
// condición venía y el "costo de interferencia" se medía inválido para el
// constructo `interference_control`. Ahora:
//  - 3 condiciones (congruent / incongruent / neutral) ~1/3 cada una;
//  - el trial 0 es SIEMPRE congruent (enseña el mapeo tinta→respuesta antes de
//    la primera demanda de conflicto, patrón B.3 "trial 0 GO");
//  - piso `minPerCondition` (default: 2 en batería de 8; escala con count) para
//    que las 3 condiciones tengan señal por sesión (sin piso, una sesión
//    azarosa dejaría una condición sin RT de referencia y el costo Stroop
//    sería incalculable);
//  - `rng` inyectable para tests deterministas (default Math.random).
export function buildColorInterferenceTrials({ count = 8, minPerCondition = null, rng = Math.random } = {}) {
  const safeCount = Math.max(1, Math.floor(Number(count) || 8));
  const minPer = minPerCondition == null
    ? Math.min(2, Math.max(1, Math.floor(safeCount / 4)))
    : Math.max(0, Math.min(2, Math.floor(Number(minPerCondition))));

  const conditions = Array(safeCount).fill(null);
  conditions[0] = 'congruent';
  for (let index = 1; index < safeCount; index += 1) {
    const draw = rng();
    conditions[index] = draw < 0.34 ? 'congruent' : draw < 0.67 ? 'incongruent' : 'neutral';
  }

  // Piso por condición: solo se roban trials a condiciones POR ENCIMA del piso
  // (nunca se deja otra condición sin señal); si no hay candidato, se deja como
  // quedó (counts degenerados: n=2 no puede garantizar las 3 condiciones).
  for (const target of STROOP_CONDITIONS) {
    while (conditions.filter((condition) => condition === target).length < minPer) {
      const overFloorCounts = {};
      for (const condition of STROOP_CONDITIONS) overFloorCounts[condition] = conditions.filter((entry) => entry === condition).length;
      const candidates = conditions
        .map((condition, index) => (index > 0 && condition !== target && overFloorCounts[condition] > minPer ? index : -1))
        .filter((index) => index >= 0);
      if (!candidates.length) break;
      conditions[shuffleIndices(candidates, rng)[0]] = target;
    }
  }

  return Array.from({ length: safeCount }, (_, index) => {
    const condition = conditions[index];
    const inkIndex = Math.floor(rng() * COLOR_OPTIONS.length);
    const ink = COLOR_OPTIONS[inkIndex];
    let wordColor = null;
    if (condition === 'congruent') {
      wordColor = ink.value;
    } else if (condition === 'incongruent') {
      const others = COLOR_OPTIONS.map((option, optionIndex) => optionIndex).filter((optionIndex) => optionIndex !== inkIndex);
      wordColor = COLOR_OPTIONS[others[Math.floor(rng() * others.length)]].value;
    }
    const wordOption = wordColor == null ? null : COLOR_OPTIONS.find((option) => option.value === wordColor);
    return {
      trialId: `color-${index}`,
      targetId: `color-stimulus-${index}`,
      trialIndex: index,
      condition,
      // Booleano legado para compat con filtros viejos; neutral = null
      // (excluido de ambos, nunca contado como "incongruente").
      congruent: condition === 'congruent' ? true : condition === 'incongruent' ? false : null,
      ink: ink.value,
      wordColor,
      wordEs: wordOption ? wordOption.wordEs : NEUTRAL_STIMULUS_WORD,
      wordEn: wordOption ? wordOption.wordEn : NEUTRAL_STIMULUS_WORD,
      expectedResponse: ink.value,
      expectedLabel: labelForColor(ink.value),
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
  const condition = trial?.condition ?? (trial?.congruent === true ? 'congruent' : trial?.congruent === false ? 'incongruent' : null);
  return {
    trialId: trial?.trialId ?? null,
    condition,
    congruent: trial?.congruent === true ? true : trial?.congruent === false ? false : null,
    wordEs: trial?.wordEs ?? '',
    wordEn: trial?.wordEn ?? '',
    wordColor: trial?.wordColor ?? null,
    ink: trial?.ink ?? expectedResponse,
    expectedResponse,
    response: timedOut ? 'timeout' : normalizedResponse,
    correct,
    outcome: timedOut ? 'timeout' : correct ? 'correct' : 'incorrect',
    reactionTimeMs: Math.max(0, Math.round(Number(timestamp) - Number(shownAt))),
    score: correct ? 1 : 0,
    timedOut,
  };
}

// Stroop clásico (3 condiciones):
//  - conflictCostMs = RT medio incongruente − RT medio neutral (costo de
//    interferencia; el patrón legado usaba − congruente, que mide
//    facilitación/conflicto combinado, no interferencia pura).
//  - facilitationMs = RT medio congruente − RT medio neutral (extra, descriptivo).
//  - Sin RT de referencia en una condición → 0 (nunca negativo: un costo
//    negativo se leería como desempeño óptimo en `conflictScore` del
//    talentProfile — CIP-P3-7).
export function summarizeColorInterferenceResults(results = []) {
  const completed = results.filter(Boolean);
  const byCondition = (condition) => completed.filter((result) => result.condition === condition);
  const congruent = byCondition('congruent');
  const incongruent = byCondition('incongruent');
  const neutral = byCondition('neutral');
  const correct = completed.filter((result) => result.correct === true);
  const correctRTs = (list) => list.filter((result) => result.correct === true).map((result) => result.reactionTimeMs);
  const accuracyOf = (list) => (list.length ? round(list.filter((result) => result.correct === true).length / list.length, 4) : 0);
  const congruentRT = mean(correctRTs(congruent));
  const incongruentRT = mean(correctRTs(incongruent));
  const neutralRT = mean(correctRTs(neutral));
  return {
    gameId: 'color_interference',
    totalTrials: completed.length,
    // Claves de contrato del session builder (summarizeCompletedBlocks):
    // completedTrialCount + meanReactionTimeMs — sin ellas la RT de este juego
    // no entraba a la media de batería y el reporte mostraba "Tiempo" ausente
    // (fix CIP-P2-1; mismo bug que GNP-P2-1 en B.3). meanReactionTimeMs = RT
    // media de aciertos en las 3 condiciones (la señal de velocidad de Stroop).
    completedTrialCount: completed.length,
    meanReactionTimeMs: mean(correctRTs(completed)),
    accuracy: completed.length ? round(correct.length / completed.length, 4) : 0,
    meanScore: completed.length ? round(completed.reduce((sum, result) => sum + Number(result.score ?? 0), 0) / completed.length, 4) : 0,
    errorRate: completed.length ? round(1 - correct.length / completed.length, 4) : 0,
    congruentAccuracy: accuracyOf(congruent),
    incongruentAccuracy: accuracyOf(incongruent),
    neutralAccuracy: accuracyOf(neutral),
    congruentRT,
    incongruentRT,
    neutralRT,
    conflictCostMs: incongruentRT > 0 && neutralRT > 0 ? round(incongruentRT - neutralRT, 2) : 0,
    facilitationMs: congruentRT > 0 && neutralRT > 0 ? round(congruentRT - neutralRT, 2) : 0,
    conditionCounts: { congruent: congruent.length, incongruent: incongruent.length, neutral: neutral.length },
    // Por trial (agregados seguros): se elimina del payload por
    // ASSESSMENT_FORBIDDEN_KEYS (incl. `trials`) en el session builder (§12).
    trials: completed,
  };
}

function ColorInterferenceInner({ emit, trialCount, itiMs, trialDurationMs, width = 520, height = 300, rng, onComplete }) {
  const { t } = useLanguage();
  const rngRef = useRef(rng ?? Math.random);
  const trials = useMemo(() => buildColorInterferenceTrials({ count: trialCount, rng: rngRef.current }), [trialCount]);
  const emitRef = useRef(emit);
  const onCompleteRef = useRef(onComplete);
  const [current, setCurrent] = useState(0);
  const [finished, setFinished] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [remainingMs, setRemainingMs] = useState(trialDurationMs);
  const resultsRef = useRef([]);
  const shownAtRef = useRef(0);
  const handledRef = useRef(false);
  const emittedForRef = useRef(-1);
  const timeoutRef = useRef(null);
  const tickRef = useRef(null);
  const itiRef = useRef(null);
  const handleResponseRef = useRef(null);
  const trial = trials[current];

  useEffect(() => { emitRef.current = emit; }, [emit]);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  const completeIfFinished = useCallback((nextResults, now) => {
    if (nextResults.length >= trials.length) {
      const summary = summarizeColorInterferenceResults(nextResults);
      setFinished(true);
      // game_end: score en escala 0-100 (contrato simple_rt/precision B.1/B.2,
      // GNP-P3-2 en B.3) y difficulty unificada 'color_interference'
      // (CIP-P3-3; la condición por trial vive en el payload de estímulo/
      // respuesta, no en gameState.difficulty).
      emitRef.current({
        eventType: 'game_end',
        timestamp: now,
        gameState: { score: Math.round(summary.meanScore * 100), level: trials.length, difficulty: 'color_interference' },
      });
      onCompleteRef.current?.(summary);
      return true;
    }
    return false;
  }, [trials.length]);

  const handleResponse = useCallback((response) => {
    if (!trial || handledRef.current || finished) return;
    handledRef.current = true;
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
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
        // Bloque interference (agregado seguro, allowlist): la condición va
        // aquí — nunca en gameState.difficulty ni anunciada en la UI
        // (fix CIP-P1-1).
        interference: {
          condition: scored.condition,
          congruent: scored.congruent,
          wordEs: scored.wordEs,
          wordEn: scored.wordEn,
          wordColor: scored.wordColor,
          ink: trial.ink,
          expectedResponse: trial.expectedResponse,
          response: scored.response,
          timedOut: scored.timedOut,
          trialDurationMs,
        },
      },
      gameState: { score: nextResults.reduce((sum, result) => sum + result.score, 0), level: current + 1, difficulty: 'color_interference' },
    });
    if (!completeIfFinished(nextResults, now)) {
      // ITI con jitter [0.75, 1.25] × itiMs (fix CIP-P2-4; mismo patrón que
      // GNP-P2-5 en B.3: el ritmo fijo telegrafiaba el timing del próximo
      // estímulo) y con ref tracked (CIP-P2-3: el setTimeout legado no se
      // limpiaba en unmount → onComplete tardío tras abortar la sesión).
      const jitteredItiMs = itiMs * (0.75 + 0.5 * Math.random());
      itiRef.current = setTimeout(() => setCurrent((value) => value + 1), jitteredItiMs);
    }
  }, [completeIfFinished, current, finished, itiMs, trial, trialDurationMs]);

  useEffect(() => {
    handleResponseRef.current = handleResponse;
  }, [handleResponse]);

  useEffect(() => {
    if (!trial || finished) return undefined;
    handledRef.current = false;
    setFeedback(null);
    setRemainingMs(trialDurationMs);
    shownAtRef.current = performance.now();
    // StrictMode (dev) re-ejecuta el effect sin resetear refs — sin este guard
    // el trial 0 emitía stimulus_shown dos veces (fix CIP-P3-4; patrón
    // GNP-P3-6 de B.3).
    if (emittedForRef.current !== current) {
      emittedForRef.current = current;
      emitRef.current({
        eventType: 'stimulus_shown',
        trialId: trial.trialId,
        targetId: trial.targetId,
        timestamp: shownAtRef.current,
        stimulus: {
          kind: 'color_word',
          // Metadatos del estímulo (allowlist): palabras ES y EN + color de
          // palabra/tinta + condición. Sin coordenadas ni muestras crudas.
          payload: {
            wordEs: trial.wordEs,
            wordEn: trial.wordEn,
            wordColor: trial.wordColor,
            ink: trial.ink,
            expectedResponse: trial.expectedResponse,
            condition: trial.condition,
            congruent: trial.congruent,
            wordFit: classifyStimulusWordLength(trial.wordEs),
          },
        },
        gameState: { score: resultsRef.current.reduce((sum, result) => sum + result.score, 0), level: current + 1, difficulty: 'color_interference' },
      });
    }

    timeoutRef.current = setTimeout(() => {
      handleResponseRef.current?.('timeout');
    }, trialDurationMs);
    tickRef.current = setInterval(() => {
      const elapsed = performance.now() - shownAtRef.current;
      setRemainingMs(Math.max(0, trialDurationMs - elapsed));
    }, 100);
    return () => {
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
      // CIP-P2-3: limpiar el ITI pendiente (unmount / cambio de trial / abort).
      if (itiRef.current) { clearTimeout(itiRef.current); itiRef.current = null; }
    };
  }, [current, finished, trial, trialDurationMs]);

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
  // Estímulo en el idioma de la sesión (note c): EN no tiene palabra de color
  // de ≥8 letras, la clasificación de tamaño se hace por idioma (CIP-P1-1).
  const displayedWord = t(trial.wordEs, trial.wordEn);
  const wordClass = classifyStimulusWordLength(displayedWord);

  return (
    <div className="color-interference-task">
      <div className="task-header">
        <span className="task-title">🌈 {t('Tarjetas de color', 'Color cards')}</span>
        <span className="task-progress">{t('Pregunta {n} de {total}', 'Question {n} of {total}', { n: current + 1, total: trials.length })}</span>
        <span className="task-progress color-interference-task__timer" role="timer" aria-label={t('Tiempo restante', 'Time remaining')}>{t(timing.label, timing.labelEn)}</span>
      </div>
      <div className="task-area" data-testid="color-task-area" style={{ width, height, display: 'grid', placeItems: 'center' }}>
        <div className="color-interference-task__card-stage">
          <div className="color-interference-task__timebar" data-testid="color-timebar" data-urgency={timing.urgency}>
            <span style={{ width: `${timing.percentRemaining}%` }} />
          </div>
          <p className="color-interference-task__prompt">{t('Elige la tinta, ignora el texto.', 'Pick the ink, ignore the text.')}</p>
          <div
            data-testid="color-stimulus"
            className={`color-interference-task__stimulus-card ${wordClass}`}
            style={{
              color: cssForColor(trial.ink),
              fontSize: wordClass === 'long-word' ? '2.5rem' : '3rem',
              letterSpacing: wordClass === 'long-word' ? '0.04em' : '0.08em',
              fontWeight: 900,
              maxWidth: '100%',
              overflowWrap: 'anywhere',
            }}
          >
            {displayedWord}
          </div>
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

export default function ColorInterferenceTask({ active = false, trialCount = 8, itiMs = 250, trialDurationMs = DEFAULT_TRIAL_DURATION_MS, width = 520, height = 300, rng = Math.random, onGameEvent, onComplete }) {
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
          height={height}
          rng={rng}
          onComplete={onComplete}
        />
      )}
    />
  );
}

export { COLOR_OPTIONS };
