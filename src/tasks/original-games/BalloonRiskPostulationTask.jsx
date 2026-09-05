import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GameRuntime from '../GameRuntime.jsx';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import {
  buildBalloonResponseAggregate,
  buildBalloonRiskRounds,
  getBalloonRiskLayoutMetrics,
  sanitizeBalloonResponsePayload,
} from './balloonRiskTelemetry.js';
import GamePips from '../../postulation-demo/GamePips.jsx';
import GameMicroIntro from '../../postulation-demo/GameMicroIntro.jsx';
import { playSfx } from './originalGameSfx.js';
import { installGameFocusClock, now } from './gameClock.js';
import { balloonKeyAction, GAME_KEYBOARD } from './gameKeyboard.js';
import { markPracticeSummary } from '../../postulation-demo/originalGamePractice.js';

const BALLOON_GAME_DEFINITION = Object.freeze({ id: 'balloon_risk', label: 'Globo de riesgo', difficulty: 'risk_feedback' });

installGameFocusClock();

function BalloonRiskInner({ emit, trialCount, width, height, onComplete, practice = false, popFxMs = 900, cashoutFxMs = 500 }) {
  const { t } = useLanguage();
  const emitRef = useRef(emit);
  const onCompleteRef = useRef(onComplete);
  const rounds = useMemo(() => buildBalloonRiskRounds({ count: trialCount }), [trialCount]);
  const metrics = useMemo(() => getBalloonRiskLayoutMetrics({ width, height }), [height, width]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [pumpCount, setPumpCount] = useState(0);
  const [roundPoints, setRoundPoints] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [status, setStatus] = useState(t('Infla el globo y asegura puntos antes de que explote.', 'Inflate the balloon and secure points before it pops.'));
  const [finished, setFinished] = useState(false);
  const [popFx, setPopFx] = useState(false);
  const [cashFx, setCashFx] = useState(false);
  const [roundOutcomes, setRoundOutcomes] = useState([]);
  const [introDone, setIntroDone] = useState(false);
  const startTimeRef = useRef(now());
  const roundStartRef = useRef(now());
  const shownRoundsRef = useRef(new Set());
  const pumpCountsRef = useRef([]);
  const cashoutsRef = useRef(0);
  const popsRef = useRef(0);
  const postPopAdjustmentsRef = useRef([]);
  const previousPopPumpRef = useRef(null);
  const timeoutsRef = useRef([]);
  const pushTimeout = (fn, ms) => {
    const id = window.setTimeout(fn, ms);
    timeoutsRef.current.push(id);
    return id;
  };
  useEffect(() => () => { timeoutsRef.current.forEach((id) => window.clearTimeout(id)); }, []);

  const handleIntroDone = useCallback(() => {
    setIntroDone(true);
    startTimeRef.current = now();
  }, []);

  const round = rounds[roundIndex];

  useEffect(() => { emitRef.current = emit; }, [emit]);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  useEffect(() => {
    if (!introDone || !round || finished || shownRoundsRef.current.has(round.roundId)) return;
    shownRoundsRef.current.add(round.roundId);
    roundStartRef.current = now();
    emitRef.current({
      eventType: 'stimulus_shown',
      trialId: round.roundId,
      targetId: `${round.roundId}-decision`,
      timestamp: roundStartRef.current,
      stimulus: {
        kind: 'balloon_risk_round',
        payload: {
          roundIndex: roundIndex + 1,
          totalRounds: rounds.length,
          riskBand: round.threshold <= 8 ? 'alto' : round.threshold <= 10 ? 'medio' : 'bajo',
        },
      },
      gameState: { level: roundIndex + 1, difficulty: 'risk_feedback', score: totalScore },
    });
  }, [finished, introDone, round, roundIndex, rounds.length, totalScore]);

  const completeGame = useCallback((finalScore) => {
    playSfx('complete');
    const aggregate = buildBalloonResponseAggregate({
      roundsCompleted: rounds.length,
      totalRounds: rounds.length,
      pumpCounts: pumpCountsRef.current,
      cashoutCount: cashoutsRef.current,
      popCount: popsRef.current,
      totalScore: finalScore,
      postPopAdjustments: postPopAdjustmentsRef.current,
      timeMs: now() - startTimeRef.current,
    });
    setFinished(true);
    emitRef.current({
      eventType: 'game_end',
      timestamp: now(),
      gameState: { level: rounds.length, difficulty: 'risk_feedback', score: aggregate.riskEfficiency },
    });
    onCompleteRef.current?.({ gameId: 'balloon_risk', ...(practice ? markPracticeSummary('balloon_risk', aggregate) : aggregate) });
  }, [practice, rounds.length]);

  const finishRound = useCallback((outcome, finalPumpCount, gainedPoints) => {
    const nextPumpCounts = [...pumpCountsRef.current, finalPumpCount];
    pumpCountsRef.current = nextPumpCounts;
    if (outcome === 'cashout') cashoutsRef.current += 1;
    if (outcome === 'pop') {
      popsRef.current += 1;
      previousPopPumpRef.current = finalPumpCount;
    } else if (previousPopPumpRef.current !== null) {
      postPopAdjustmentsRef.current = [...postPopAdjustmentsRef.current, finalPumpCount - previousPopPumpRef.current];
      previousPopPumpRef.current = null;
    }

    const nextTotalScore = totalScore + gainedPoints;
    setTotalScore(nextTotalScore);
    const aggregate = buildBalloonResponseAggregate({
      roundsCompleted: roundIndex + 1,
      totalRounds: rounds.length,
      pumpCounts: nextPumpCounts,
      cashoutCount: cashoutsRef.current,
      popCount: popsRef.current,
      totalScore: nextTotalScore,
      postPopAdjustments: postPopAdjustmentsRef.current,
      timeMs: now() - startTimeRef.current,
    });
    emitRef.current({
      eventType: 'response',
      trialId: round.roundId,
      targetId: `${round.roundId}-decision`,
      timestamp: now(),
      response: sanitizeBalloonResponsePayload({
        correct: outcome === 'cashout',
        outcome,
        reactionTimeMs: now() - roundStartRef.current,
        score: aggregate.riskEfficiency,
        balloonRisk: aggregate,
      }),
      gameState: { level: roundIndex + 1, difficulty: 'risk_feedback', score: aggregate.riskEfficiency },
    });

    const nextIndex = roundIndex + 1;
    const advanceToNextRound = () => {
      setPopFx(false);
      setCashFx(false);
      if (nextIndex >= rounds.length) {
        completeGame(nextTotalScore);
        return;
      }
      setRoundIndex(nextIndex);
      setPumpCount(0);
      setRoundPoints(0);
      setRoundOutcomes((current) => [...current, outcome]);
      setStatus(t('Nueva ronda: decide cuánto riesgo tomar.', 'New round: decide how much risk to take.'));
    };

    if (outcome === 'pop') {
      setPopFx(true);
      playSfx('pop');
      if (popFxMs === 0) {
        advanceToNextRound();
        return;
      }
      pushTimeout(advanceToNextRound, popFxMs);
      return;
    }

    playSfx('cashout');
    if (cashoutFxMs === 0) {
      advanceToNextRound();
      return;
    }
    setCashFx(true);
    pushTimeout(advanceToNextRound, cashoutFxMs);
  }, [cashoutFxMs, completeGame, popFxMs, round, roundIndex, rounds.length, totalScore]);

  const pump = useCallback(() => {
    if (!introDone || !round || finished) return;
    const nextPump = pumpCount + 1;
    if (nextPump >= round.threshold) {
      setPumpCount(nextPump);
      setRoundPoints(0);
      setStatus(t('El globo explotó. Observa si ajustas la siguiente ronda.', 'The balloon popped. Watch whether you adjust the next round.'));
      finishRound('pop', nextPump, 0);
      return;
    }
    setPumpCount(nextPump);
    playSfx('move');
    setRoundPoints((points) => points + round.pointValue);
    setStatus(t('Puntos acumulados. Puedes seguir o asegurar.', 'Points accumulated. You can keep going or secure them.'));
  }, [finishRound, finished, introDone, pumpCount, round]);

  const cashout = useCallback(() => {
    if (!introDone || !round || finished) return;
    setStatus(t('Puntos asegurados.', 'Points secured.'));
    finishRound('cashout', pumpCount, roundPoints);
  }, [finishRound, finished, introDone, pumpCount, round, roundPoints]);

  const handleKeyDown = useCallback((event) => {
    if (!introDone || finished || !round) return;
    const action = balloonKeyAction(event.key);
    if (!action) return;
    event.preventDefault();
    if (action === 'pump') pump();
    else if (action === 'secure') cashout();
  }, [cashout, finished, introDone, pump, round]);

  if (!round) return null;

  if (finished) {
    return (
      <div className="balloon-risk-task balloon-risk-task--finished" data-testid="balloon-risk-finished">
        <h3>{t('Globo de riesgo completado', 'Risk balloon completed')}</h3>
        <p>{t('Rondas completadas', 'Rounds completed')}: {rounds.length}</p>
        <p>{t('Puntaje agregado', 'Aggregated score')}: {totalScore}</p>
      </div>
    );
  }

  const balloonScale = Math.min(metrics.maxBalloonScale, 1 + pumpCount * 0.16);
  const shakeAmp = Math.min(4, 0.6 + pumpCount * 0.5);

  return (
    <div className="balloon-risk-task" tabIndex={0} onKeyDown={handleKeyDown} aria-label={`${t('Globo de riesgo', 'Risk balloon')} — ${t('Usa las flechas o Espacio para inflar y bajar para asegurar.', 'Use arrows or Space to inflate and down to secure.')}`} style={{ minHeight: metrics.containerMinHeight, padding: metrics.bodyPadding }}>
      <div className="task-header balloon-risk-task__header">
        <h3 className="task-title">🎈 {t('Globo de riesgo', 'Risk balloon')}</h3>
        <span className="task-progress">{t('Ronda', 'Round')} {roundIndex + 1} {t('de', 'of')} {rounds.length}</span>
        <GamePips step={roundIndex} total={rounds.length} states={roundOutcomes} className="game-pips--compact" />
        <span className="task-progress">{t('Puntos', 'Points')} {totalScore + roundPoints}</span>
      </div>
      <p className="caption balloon-risk-task__caption">
        {t('Infla para acumular puntos y decide cuándo asegurar. Se registra estrategia agregada, no una secuencia cruda de clicks.', 'Inflate to accumulate points and decide when to secure them. Aggregated strategy is recorded, not a raw click sequence.')}
      </p>
      <div className={`balloon-risk-task__arena ${popFx ? 'balloon-risk-task__arena--shaking' : ''}`}>
        {!introDone && (
          <div className="game-micro-intro__backdrop" data-testid="game-micro-intro-backdrop">
            <GameMicroIntro gameId="balloon_risk" t={t} onDone={handleIntroDone} />
          </div>
        )}
        <div
          className={`balloon-risk-task__balloon ${popFx ? 'balloon-risk-task__balloon--popped' : ''}`}
          aria-label={t('Globo actual', 'Current balloon')}
          style={{ transform: `scale(${balloonScale})`, '--shake-amp': `${shakeAmp}px` }}
        >
          <span className={`balloon-risk-task__balloon-emoji ${pumpCount >= 2 && !popFx ? 'balloon-risk-task__balloon-emoji--tense' : ''}`}>
            {popFx ? '💥' : '🎈'}
          </span>
        </div>
        <div className={`balloon-risk-task__stats ${cashFx ? 'balloon-risk-task__stats--cashout' : ''}`} style={{ gridTemplateColumns: `repeat(${metrics.statColumns}, minmax(0, 1fr))` }}>
          <span><strong>{pumpCount}</strong><small>{t('Infladas', 'Pumps')}</small></span>
          <span><strong>{roundPoints}</strong><small>{t('En riesgo', 'At risk')}</small></span>
          <span><strong>{cashoutsRef.current}</strong><small>{t('Aseguradas', 'Secured')}</small></span>
          <span><strong>{popsRef.current}</strong><small>{t('Explosiones', 'Pops')}</small></span>
        </div>
      </div>
      <div className="balloon-risk-task__controls" style={{ gap: metrics.controlsGap }}>
        <button type="button" className="primary" onClick={pump}>{t('Inflar', 'Inflate')}</button>
        <button type="button" className="secondary" onClick={cashout}>{t('Asegurar puntos', 'Secure points')}</button>
      </div>
      <p className="balloon-risk-task__status" role="status">{status} <small className="balloon-risk-task__keyboard-hint">{t(GAME_KEYBOARD.balloon.hintEs, GAME_KEYBOARD.balloon.hintEn)}</small></p>
    </div>
  );
}

export default function BalloonRiskPostulationTask({ active = false, onGameEvent, onComplete, trialCount = 4, width = 606, height = 338, practice = false, popFxMs = 900, cashoutFxMs = 500 }) {
  return (
    <GameRuntime
      active={active}
      gameDefinition={BALLOON_GAME_DEFINITION}
      onEvent={onGameEvent}
      renderTrial={(_, emit) => (
        <BalloonRiskInner
          emit={emit}
          trialCount={trialCount}
          width={width}
          height={height}
          practice={practice}
          onComplete={onComplete}
          popFxMs={popFxMs}
          cashoutFxMs={cashoutFxMs}
        />
      )}
    />
  );
}
