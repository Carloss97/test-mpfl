import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GameRuntime from '../GameRuntime.jsx';
import {
  buildTeamCoordinationResponseAggregate,
  buildTeamCoordinationScenarios,
  sanitizeTeamCoordinationResponsePayload,
} from './teamCoordinationTelemetry.js';

const TEAM_COORDINATION_GAME_DEFINITION = Object.freeze({
  id: 'team_coordination',
  label: 'Brief de coordinación',
  difficulty: 'structured_social_judgment',
});

const TEAM_TARGET_SCORE = 0.75;

function now() {
  return globalThis.performance?.now?.() ?? Date.now();
}

function pct(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`;
}

function optionScore(option) {
  const scores = option?.scores ?? {};
  return (Number(scores.leadership ?? 0)
    + Number(scores.communication ?? 0)
    + Number(scores.adaptability ?? 0)
    + Number(scores.decision ?? 0)) / 4;
}

function buildResponseEntry(option) {
  return {
    category: option.category,
    scores: {
      leadership: option.scores.leadership,
      communication: option.scores.communication,
      adaptability: option.scores.adaptability,
      decision: option.scores.decision,
      alignment: option.scores.alignment,
      roleClarity: option.scores.roleClarity,
      feedbackUse: option.scores.feedbackUse,
      changeResponse: option.scores.changeResponse,
    },
  };
}

function BehindPanel({ scenario, selectedOption, aggregate }) {
  return (
    <aside className="team-coordination-task__behind" aria-label="Trabajo por detrás">
      <strong>Trabajo por detrás</strong>
      <p>KRUMM observa elecciones estructuradas; no guarda texto libre ni conversación real.</p>
      <div className="team-coordination-task__chips" aria-label="Métricas activas">
        {(scenario?.measuredConstructs ?? []).map((construct) => <span key={construct}>{construct}</span>)}
      </div>
      <dl>
        <div><dt>Liderazgo</dt><dd>{pct(aggregate.leadershipScore)}</dd></div>
        <div><dt>Comunicación</dt><dd>{pct(aggregate.communicationScore)}</dd></div>
        <div><dt>Adaptabilidad</dt><dd>{pct(aggregate.adaptabilityScore)}</dd></div>
        <div><dt>Decisión</dt><dd>{pct(aggregate.decisionQualityScore)}</dd></div>
      </dl>
      {selectedOption && (
        <p className="team-coordination-task__explain"><strong>Señal registrada:</strong> {selectedOption.why}</p>
      )}
      <small>Se persisten solo scores agregados, conteos y categoría de elección.</small>
    </aside>
  );
}

function MissionPanel({ aggregate, scenario, currentIndex, scenarioCount }) {
  const score = Number(aggregate.score) || 0;
  const targetReached = score >= TEAM_TARGET_SCORE;
  return (
    <section className="team-coordination-task__mission" aria-label="Misión del brief de equipo">
      <div>
        <span className="team-coordination-task__eyebrow">Misión del equipo</span>
        <strong>Coordinar el sprint sin perder claridad</strong>
        <p>Elige intervenciones para mantener la coordinación sobre {pct(TEAM_TARGET_SCORE)}. KRUMM muestra el cálculo agregado mientras juegas.</p>
      </div>
      <div className="team-coordination-task__scoreboard">
        <span>Escenario {currentIndex + 1}/{scenarioCount}</span>
        <strong>{pct(score)}</strong>
        <small>{targetReached ? 'Meta alcanzada' : `Meta ${pct(TEAM_TARGET_SCORE)}`}</small>
        <div className="team-coordination-task__meter" aria-label={`Coordinación ${pct(score)}`}>
          <i style={{ width: `${Math.min(100, Math.round(score * 100))}%` }} />
        </div>
      </div>
      <small>{scenario?.title}</small>
    </section>
  );
}

function TeamCoordinationInner({ emit, trialCount, onComplete }) {
  const emitRef = useRef(emit);
  const onCompleteRef = useRef(onComplete);
  const scenarios = useMemo(
    () => buildTeamCoordinationScenarios().slice(0, Math.max(1, Number(trialCount) || 4)),
    [trialCount],
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState([]);
  const responsesRef = useRef([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [finished, setFinished] = useState(false);
  const [status, setStatus] = useState('Lee el escenario y elige la intervención más útil para el equipo.');
  const startTimeRef = useRef(now());
  const scenarioStartRef = useRef(now());
  const shownScenariosRef = useRef(new Set());
  const scenario = scenarios[currentIndex] ?? null;
  const aggregate = useMemo(() => buildTeamCoordinationResponseAggregate({
    completed: false,
    scenarioCount: scenarios.length,
    responses,
    timeMs: now() - startTimeRef.current,
  }), [responses, scenarios.length]);

  useEffect(() => { emitRef.current = emit; }, [emit]);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  useEffect(() => {
    if (!scenario || finished || shownScenariosRef.current.has(scenario.id)) return;
    shownScenariosRef.current.add(scenario.id);
    scenarioStartRef.current = now();
    emitRef.current({
      eventType: 'stimulus_shown',
      trialId: scenario.id,
      targetId: `${scenario.id}-choice`,
      timestamp: scenarioStartRef.current,
      stimulus: {
        kind: 'team_coordination_scenario',
        payload: {
          scenarioIndex: currentIndex + 1,
          scenarioCount: scenarios.length,
          optionCount: scenario.options.length,
          measuredConstructCount: scenario.measuredConstructs.length,
        },
      },
      gameState: { level: currentIndex + 1, difficulty: 'structured_social_judgment', score: responses.length },
    });
  }, [currentIndex, finished, responses.length, scenario, scenarios.length]);

  const handleOptionSelect = useCallback((option) => {
    if (!scenario || selectedOption || finished) return;
    const responseTime = now();
    const entry = buildResponseEntry(option);
    const nextResponses = [...responses, entry];
    const interimAggregate = buildTeamCoordinationResponseAggregate({
      completed: false,
      scenarioCount: scenarios.length,
      responses: nextResponses,
      timeMs: responseTime - startTimeRef.current,
    });
    responsesRef.current = nextResponses;
    setResponses(nextResponses);
    setSelectedOption(option);
    setStatus(`Señal registrada: coordinación ${pct(interimAggregate.score)}. Revisa el panel lateral para ver qué se calculó por detrás.`);
    emitRef.current({
      eventType: 'response',
      trialId: scenario.id,
      targetId: `${scenario.id}-choice`,
      timestamp: responseTime,
      response: sanitizeTeamCoordinationResponsePayload({
        correct: optionScore(option) >= 0.7,
        outcome: 'structured_choice',
        choiceCategory: option.category,
        reactionTimeMs: responseTime - scenarioStartRef.current,
        score: optionScore(option),
        teamCoordination: interimAggregate,
      }),
      gameState: { level: currentIndex + 1, difficulty: 'structured_social_judgment', score: interimAggregate.score },
    });
  }, [currentIndex, finished, responses, scenario, scenarios.length, selectedOption]);

  const advance = useCallback(() => {
    if (!scenario || !selectedOption) return;
    const isLast = currentIndex >= scenarios.length - 1;
    if (!isLast) {
      setCurrentIndex((index) => Math.min(index + 1, scenarios.length - 1));
      setSelectedOption(null);
      setStatus('Nuevo escenario: ajusta el brief según la situación del equipo.');
      return;
    }
    const finalAggregate = buildTeamCoordinationResponseAggregate({
      completed: true,
      scenarioCount: scenarios.length,
      responses: responsesRef.current,
      timeMs: now() - startTimeRef.current,
    });
    setFinished(true);
    setStatus('Brief de coordinación completado con métricas agregadas.');
    emitRef.current({
      eventType: 'game_end',
      timestamp: now(),
      gameState: { level: scenarios.length, difficulty: 'structured_social_judgment', score: finalAggregate.score },
    });
    onCompleteRef.current?.({
      gameId: 'team_coordination',
      ...finalAggregate,
    });
  }, [currentIndex, scenario, scenarios.length, selectedOption]);

  if (!scenario) return null;

  if (finished) {
    const finalAggregate = buildTeamCoordinationResponseAggregate({
      completed: true,
      scenarioCount: scenarios.length,
      responses: responsesRef.current,
      timeMs: now() - startTimeRef.current,
    });
    return (
      <div className="team-coordination-task team-coordination-task--finished" data-testid="team-coordination-finished">
        <h3>Brief de coordinación completado</h3>
        <p>Se generaron señales agregadas para liderazgo, comunicación, adaptabilidad y decisión.</p>
        <dl>
          <div><dt>Liderazgo</dt><dd>{pct(finalAggregate.leadershipScore)}</dd></div>
          <div><dt>Comunicación</dt><dd>{pct(finalAggregate.communicationScore)}</dd></div>
          <div><dt>Adaptabilidad</dt><dd>{pct(finalAggregate.adaptabilityScore)}</dd></div>
        </dl>
      </div>
    );
  }

  return (
    <div className="team-coordination-task">
      <div className="task-header team-coordination-task__header">
        <h3 className="task-title">🤝 Brief de coordinación</h3>
        <span className="task-progress">Escenario {currentIndex + 1} de {scenarios.length}</span>
        <span className="task-progress">Coordinación {pct(aggregate.score)}</span>
      </div>
      <MissionPanel aggregate={aggregate} scenario={scenario} currentIndex={currentIndex} scenarioCount={scenarios.length} />
      <div className="team-coordination-task__workspace">
        <section className="team-coordination-task__scenario" aria-label="Escenario de coordinación">
          <span className="team-coordination-task__eyebrow">Simulación estructurada</span>
          <h4>{scenario.title}</h4>
          <p>{scenario.prompt}</p>
          <div className="team-coordination-task__options" role="group" aria-label="Opciones de intervención">
            {scenario.options.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`team-coordination-task__option ${selectedOption?.id === option.id ? 'team-coordination-task__option--selected' : ''}`}
                disabled={Boolean(selectedOption)}
                onClick={() => handleOptionSelect(option)}
              >
                <strong>{option.label}</strong>
                <span>{option.category.replaceAll('_', ' ')}</span>
              </button>
            ))}
          </div>
        </section>
        <BehindPanel scenario={scenario} selectedOption={selectedOption} aggregate={aggregate} />
      </div>
      <div className="team-coordination-task__footer">
        <p role="status">{status}</p>
        <button type="button" className="primary" disabled={!selectedOption} onClick={advance}>
          {currentIndex >= scenarios.length - 1 ? 'Finalizar brief' : 'Siguiente escenario'}
        </button>
      </div>
    </div>
  );
}

export default function TeamCoordinationPostulationTask({
  active = false,
  onGameEvent,
  onComplete,
  trialCount = 4,
}) {
  return (
    <GameRuntime
      active={active}
      gameDefinition={TEAM_COORDINATION_GAME_DEFINITION}
      onEvent={onGameEvent}
      renderTrial={(_, emit) => (
        <TeamCoordinationInner
          emit={emit}
          trialCount={trialCount}
          onComplete={onComplete}
        />
      )}
    />
  );
}
