import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GameRuntime from '../GameRuntime.jsx';
import { useLanguage } from '../../i18n/LanguageContext.jsx';
import {
  buildTeamCoordinationResponseAggregate,
  buildTeamCoordinationScenarios,
  sanitizeTeamCoordinationResponsePayload,
} from './teamCoordinationTelemetry.js';

const TEAM_COORDINATION_GAME_DEFINITION = Object.freeze({
  id: 'team_coordination',
  label: 'Operación Faro',
  difficulty: 'structured_social_judgment',
});

const TEAM_TARGET_SCORE = 0.75;
const TEAM_PARTY = Object.freeze([
  Object.freeze({ name: 'Mara', role: 'Operaciones', portrait: '🧭' }),
  Object.freeze({ name: 'Leo', role: 'Comunicaciones', portrait: '📡' }),
  Object.freeze({ name: 'Nia', role: 'Campo', portrait: '🛠️' }),
]);

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

function BehindPanel({ scenario, selectedOption, aggregate, t }) {
  const hasDecisions = Number(aggregate.completedScenarioCount) > 0;
  const displayMetric = (value) => (hasDecisions ? pct(value) : '—');
  return (
    <aside className="team-coordination-task__behind" aria-label={t('Trabajo por detrás', 'Behind-the-scenes work')}>
      <strong>{t('Bitácora táctica', 'Tactical logbook')}</strong>
      <span className="team-coordination-task__behind-label">{t('Trabajo por detrás', 'Behind-the-scenes work')}</span>
      <p>{t('KRUMM observa elecciones estructuradas; no guarda texto libre ni conversación real.', 'KRUMM observes structured choices; it stores no free text or real conversation.')}</p>
      <div className="team-coordination-task__chips" aria-label={t('Métricas activas', 'Active metrics')}>
        {(scenario?.measuredConstructs ?? []).map((construct) => <span key={construct}>{construct}</span>)}
      </div>
      <dl>
        <div><dt>{t('Liderazgo', 'Leadership')}</dt><dd>{displayMetric(aggregate.leadershipScore)}</dd></div>
        <div><dt>{t('Comunicación', 'Communication')}</dt><dd>{displayMetric(aggregate.communicationScore)}</dd></div>
        <div><dt>{t('Adaptabilidad', 'Adaptability')}</dt><dd>{displayMetric(aggregate.adaptabilityScore)}</dd></div>
        <div><dt>{t('Decisión', 'Decision')}</dt><dd>{displayMetric(aggregate.decisionQualityScore)}</dd></div>
      </dl>
      {selectedOption && (
        <p className="team-coordination-task__explain"><strong>{t('Señal registrada:', 'Signal recorded:')}</strong> {selectedOption.why}</p>
      )}
      <small>{t('Se persisten solo scores agregados y conteos; no se guarda la opción ni su categoría.', 'Only aggregated scores and counts persist; the option and its category are not stored.')}</small>
    </aside>
  );
}

function RpgScene({ scenario, currentIndex, scenarioCount, selectedOption, onSelect, t }) {
  const scene = scenario?.scene ?? {};
  const memberEffects = {
    Mara: selectedOption ? (selectedOption.scores.leadership >= 0.7 ? t('Rumbo alineado', 'Aligned course') : t('Rumbo en revisión', 'Course under review')) : t('En puesto', 'On post'),
    Leo: selectedOption ? (selectedOption.scores.communication >= 0.7 ? t('Canal claro', 'Clear channel') : t('Canal en revisión', 'Channel under review')) : t('En puesto', 'On post'),
    Nia: selectedOption ? (selectedOption.scores.adaptability >= 0.7 ? t('Plan adaptable', 'Adaptable plan') : t('Plan en revisión', 'Plan under review')) : t('En puesto', 'On post'),
  };
  return (
    <section className="team-coordination-task__rpg" aria-label={t('Comando de crisis RPG', 'Crisis command RPG')}>
      <div className="team-coordination-task__rpg-stage">
        <div className="team-coordination-task__rpg-topline">
          <span>{t('RPG táctico', 'Tactical RPG')}</span>
          <strong>{scene.locationEn ?? scene.location}</strong>
          <small>{t('Turno', 'Turn')} {currentIndex + 1} {t('de', 'of')} {scenarioCount}</small>
        </div>
        <div className="team-coordination-task__party" aria-label={t('Escuadrón', 'Squad')}>
          <strong>{t('Escuadrón', 'Squad')}</strong>
          {TEAM_PARTY.map((member) => (
            <div key={member.name} className={member.name === scene.speaker ? 'active' : ''} aria-label={`${member.name}, ${member.roleEn ?? member.role}, ${memberEffects[member.name]}`}>
              <span aria-hidden="true">{member.portrait}</span>
              <small><b>{member.name}</b><br />{member.roleEn ?? member.role}<em>{memberEffects[member.name]}</em></small>
            </div>
          ))}
        </div>
        <div className="team-coordination-task__dialogue">
          <span className="team-coordination-task__portrait" aria-hidden="true">{scene.portrait}</span>
          <div>
            <span>{scene.actEn ?? scene.act}</span>
            <strong>{scene.speaker} · {scene.roleEn ?? scene.role}</strong>
            <p>{scene.narrationEn ?? scene.narration}</p>
          </div>
        </div>
      </div>
      <div className="team-coordination-task__scenario">
        <span className="team-coordination-task__eyebrow">{t('Decisión de comando', 'Command decision')}</span>
        <h4>{scenario.titleEn ?? scenario.title}</h4>
        <p>{scenario.promptEn ?? scenario.prompt}</p>
        <div className="team-coordination-task__options" role="group" aria-label={t('Opciones de intervención', 'Intervention options')}>
          {scenario.options.map((option, optionIndex) => (
            <button
              key={option.id}
              type="button"
              className={`team-coordination-task__option ${selectedOption?.id === option.id ? 'team-coordination-task__option--selected' : ''}`}
              disabled={Boolean(selectedOption)}
              aria-pressed={selectedOption?.id === option.id}
              onClick={() => onSelect(option)}
            >
              <span>{t('Comando', 'Command')} {String.fromCharCode(65 + optionIndex)} · {selectedOption?.id === option.id ? t('Seleccionado', 'Selected') : t('Elegir', 'Choose')}</span>
              <strong>{option.labelEn ?? option.label}</strong>
            </button>
          ))}
        </div>
        {selectedOption && (
          <div className="team-coordination-task__turn-effect" role="status">
            <strong>{t('Consecuencia de turno', 'Turn consequence')}</strong>
            <p>{selectedOption.whyEn ?? selectedOption.why}</p>
          </div>
        )}
      </div>
    </section>
  );
}

function MissionPanel({ aggregate, t }) {
  const score = Number(aggregate.score) || 0;
  const hasDecisions = Number(aggregate.completedScenarioCount) > 0;
  const targetReached = score >= TEAM_TARGET_SCORE;
  return (
    <section className="team-coordination-task__mission" aria-label={t('Misión Operación Faro', 'Faro Operation mission')}>
      <div>
        <span className="team-coordination-task__eyebrow">{t('Misión del equipo', 'Team mission')}</span>
        <strong>{t('Mantener Operación Faro coordinada', 'Keep Faro Operation coordinated')}</strong>
        <p>{t('Elige intervenciones para mantener la coordinación sobre', 'Choose interventions to keep coordination above')} {pct(TEAM_TARGET_SCORE)}. {t('KRUMM muestra el cálculo agregado mientras juegas.', 'KRUMM shows the aggregated calculation while you play.')}</p>
      </div>
      <div className="team-coordination-task__scoreboard">
        <span>{t('Coordinación agregada', 'Aggregated coordination')}</span>
        <strong>{hasDecisions ? pct(score) : '—'}</strong>
        <small>{hasDecisions && targetReached ? t('Meta alcanzada', 'Target reached') : `${t('Meta', 'Target')} ${pct(TEAM_TARGET_SCORE)}`}</small>
        <div className="team-coordination-task__meter" aria-label={hasDecisions ? `${t('Coordinación', 'Coordination')} ${pct(score)}` : t('Coordinación sin decisiones', 'Coordination without decisions')}>
          <i style={{ width: `${Math.min(100, Math.round(score * 100))}%` }} />
        </div>
      </div>
    </section>
  );
}

function TeamCoordinationInner({ emit, trialCount, onComplete }) {
  const { t } = useLanguage();
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
  const [status, setStatus] = useState(t('Lee el escenario y elige la intervención más útil para el equipo.', 'Read the scenario and choose the most useful intervention for the team.'));
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
    setStatus(t('Señal registrada: coordinación ${pct(interimAggregate.score)}. Revisa el panel lateral para ver qué se calculó por detrás.', 'Signal recorded: coordination ${pct(interimAggregate.score)}. Check the side panel to see what was computed behind.'));
    emitRef.current({
      eventType: 'response',
      trialId: scenario.id,
      targetId: `${scenario.id}-choice`,
      timestamp: responseTime,
      response: sanitizeTeamCoordinationResponsePayload({
        correct: optionScore(option) >= 0.7,
        outcome: 'structured_choice',
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
      setStatus(t('Nuevo escenario: ajusta el brief según la situación del equipo.', 'New scenario: adjust the brief to the team\'s situation.'));
      return;
    }
    const finalAggregate = buildTeamCoordinationResponseAggregate({
      completed: true,
      scenarioCount: scenarios.length,
      responses: responsesRef.current,
      timeMs: now() - startTimeRef.current,
    });
    setFinished(true);
    setStatus(t('Operación Faro completada con métricas agregadas.', 'Faro Operation completed with aggregated metrics.'));
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
        <h3>Operación Faro completada</h3>
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
        <h3 className="task-title">🛡️ Operación Faro</h3>
        <span className="task-progress">Misión en curso</span>
        <span className="task-progress">Coordinación {responses.length ? pct(aggregate.score) : '—'}</span>
      </div>
      <MissionPanel aggregate={aggregate} t={t} />
      <div className="team-coordination-task__workspace">
        <RpgScene
          scenario={scenario}
          currentIndex={currentIndex}
          scenarioCount={scenarios.length}
          selectedOption={selectedOption}
          onSelect={handleOptionSelect}
          t={t}
        />
        <BehindPanel scenario={scenario} selectedOption={selectedOption} aggregate={aggregate} t={t} />
      </div>
      <div className="team-coordination-task__footer">
        <p role="status">{status}</p>
        <button type="button" className="primary" disabled={!selectedOption} onClick={advance}>
          {!selectedOption ? 'Selecciona un comando' : currentIndex >= scenarios.length - 1 ? 'Cerrar misión' : 'Continuar aventura'}
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
