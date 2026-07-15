import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GameRuntime from '../GameRuntime.jsx';
import {
  buildBalloonResponseAggregate,
  buildBalloonRiskRounds,
  getBalloonRiskLayoutMetrics,
  sanitizeBalloonResponsePayload,
} from './balloonRiskTelemetry.js';

const BALLOON_GAME_DEFINITION = Object.freeze({ id: 'balloon_risk', label: 'Globo de riesgo', difficulty: 'risk_feedback' });

function now() {
  return globalThis.performance?.now?.() ?? Date.now();
}

function BalloonRiskInner({ emit, trialCount, width, height, onComplete }) {
  const emitRef = useRef(emit);
  const onCompleteRef = useRef(onComplete);
  const rounds = useMemo(() => buildBalloonRiskRounds({ count: trialCount }), [trialCount]);
  const metrics = useMemo(() => getBalloonRiskLayoutMetrics({ width, height }), [height, width]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [pumpCount, setPumpCount] = useState(0);
  const [roundPoints, setRoundPoints] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [status, setStatus] = useState('Infla el globo y asegura puntos antes de que explote.');
  const [finished, setFinished] = useState(false);
  const startTimeRef = useRef(now());
  const roundStartRef = useRef(now());
  const shownRoundsRef = useRef(new Set());
  const pumpCountsRef = useRef([]);
  const cashoutsRef = useRef(0);
  const popsRef = useRef(0);
  const postPopAdjustmentsRef = useRef([]);
  const previousPopPumpRef = useRef(null);

  const round = rounds[roundIndex];

  useEffect(() => { emitRef.current = emit; }, [emit]);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  useEffect(() => {
    if (!round || finished || shownRoundsRef.current.has(round.roundId)) return;
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
  }, [finished, round, roundIndex, rounds.length, totalScore]);

  const completeGame = useCallback(() => {
    const aggregate = buildBalloonResponseAggregate({
      roundsCompleted: rounds.length,
      totalRounds: rounds.length,
      pumpCounts: pumpCountsRef.current,
      cashoutCount: cashoutsRef.current,
      popCount: popsRef.current,
      totalScore,
      postPopAdjustments: postPopAdjustmentsRef.current,
      timeMs: now() - startTimeRef.current,
    });
    setFinished(true);
    emitRef.current({
      eventType: 'game_end',
      timestamp: now(),
      gameState: { level: rounds.length, difficulty: 'risk_feedback', score: aggregate.riskEfficiency },
    });
    onCompleteRef.current?.({ gameId: 'balloon_risk', ...aggregate });
  }, [rounds.length, totalScore]);

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
    if (nextIndex >= rounds.length) {
      completeGame();
      return;
    }
    setRoundIndex(nextIndex);
    setPumpCount(0);
    setRoundPoints(0);
    setStatus('Nueva ronda: decide cuánto riesgo tomar.');
  }, [completeGame, round, roundIndex, rounds.length, totalScore]);

  const pump = useCallback(() => {
    if (!round || finished) return;
    const nextPump = pumpCount + 1;
    if (nextPump >= round.threshold) {
      setPumpCount(nextPump);
      setRoundPoints(0);
      setStatus('El globo explotó. Observa si ajustas la siguiente ronda.');
      finishRound('pop', nextPump, 0);
      return;
    }
    setPumpCount(nextPump);
    setRoundPoints((points) => points + round.pointValue);
    setStatus('Puntos acumulados. Puedes seguir o asegurar.');
  }, [finishRound, finished, pumpCount, round]);

  const cashout = useCallback(() => {
    if (!round || finished) return;
    setStatus('Puntos asegurados.');
    finishRound('cashout', pumpCount, roundPoints);
  }, [finishRound, finished, pumpCount, round, roundPoints]);

  if (!round) return null;

  if (finished) {
    return (
      <div className="balloon-risk-task balloon-risk-task--finished" data-testid="balloon-risk-finished">
        <h3>Globo de riesgo completado</h3>
        <p>Rondas completadas: {rounds.length}</p>
        <p>Puntaje agregado: {totalScore}</p>
      </div>
    );
  }

  const balloonScale = Math.min(metrics.maxBalloonScale, 1 + pumpCount * 0.16);

  return (
    <div className="balloon-risk-task" style={{ minHeight: metrics.containerMinHeight, padding: metrics.bodyPadding }}>
      <div className="task-header balloon-risk-task__header">
        <h3 className="task-title">🎈 Globo de riesgo</h3>
        <span className="task-progress">Ronda {roundIndex + 1} de {rounds.length}</span>
        <span className="task-progress">Puntos {totalScore + roundPoints}</span>
      </div>
      <p className="caption balloon-risk-task__caption">
        Infla para acumular puntos y decide cuándo asegurar. Se registra estrategia agregada, no una secuencia cruda de clicks.
      </p>
      <div className="balloon-risk-task__arena">
        <div
          className="balloon-risk-task__balloon"
          aria-label="Globo actual"
          style={{ transform: `scale(${balloonScale})` }}
        >
          🎈
        </div>
        <div className="balloon-risk-task__stats" style={{ gridTemplateColumns: `repeat(${metrics.statColumns}, minmax(0, 1fr))` }}>
          <span><strong>{pumpCount}</strong><small>Infladas</small></span>
          <span><strong>{roundPoints}</strong><small>En riesgo</small></span>
          <span><strong>{cashoutsRef.current}</strong><small>Aseguradas</small></span>
          <span><strong>{popsRef.current}</strong><small>Explosiones</small></span>
        </div>
      </div>
      <div className="balloon-risk-task__controls" style={{ gap: metrics.controlsGap }}>
        <button type="button" className="primary" onClick={pump}>Inflar</button>
        <button type="button" className="secondary" onClick={cashout}>Asegurar puntos</button>
      </div>
      <p className="balloon-risk-task__status" role="status">{status}</p>
    </div>
  );
}

export default function BalloonRiskPostulationTask({ active = false, onGameEvent, onComplete, trialCount = 4, width = 606, height = 338 }) {
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
          onComplete={onComplete}
        />
      )}
    />
  );
}
