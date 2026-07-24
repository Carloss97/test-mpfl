import { buildBalloonRiskFeedback } from '../tasks/original-games/balloonRiskFeedback.js';
import { buildLaserPuzzleFeedback } from '../tasks/original-games/laserPuzzleFeedback.js';
import { buildPassengerConstraintFeedback } from '../tasks/original-games/passengerRouteFeedback.js';
import { buildTeamCoordinationFeedback } from '../tasks/original-games/teamCoordinationFeedback.js';
import { getOriginalGameBlueprint } from './originalGameBlueprints.js';
import { getConstructDefinition } from '../assessment/originalGameTalentMapping.js';

function pct(value) {
  if (value == null) return '—';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  return `${Math.round(numeric * 100)}%`;
}

function score(value) {
  if (value == null) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric) : null;
}

function safeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function formatGameScore(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  return Math.abs(numeric) <= 1 ? pct(numeric) : `${Math.round(numeric)}`;
}

function formatDurationMs(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return '—';
  if (numeric >= 1000) {
    const seconds = numeric / 1000;
    return `${seconds < 10 ? seconds.toFixed(1) : Math.round(seconds)}s`;
  }
  return `${Math.round(numeric)}ms`;
}

function pushMetric(metrics, label, value) {
  if (value == null || value === '—' || value === '') return;
  metrics.push({ label, value: String(value) });
}

function getOriginalGameMetrics(t, gameId, result = {}, fallbackTrialCount = 0) {
  const metrics = [];
  if (gameId === 'laser_puzzle') {
    pushMetric(metrics, t('Mapas', 'Maps'), `${result.solvedLevels ?? 0}/${result.levelCount ?? fallbackTrialCount ?? 0}`);
    if (Number(result.levelCount) > 0) pushMetric(metrics, t('Precisión', 'Accuracy'), pct((Number(result.solvedLevels) || 0) / Number(result.levelCount)));
    pushMetric(metrics, t('Eficiencia', 'Efficiency'), pct(result.solutionEfficiency));
    pushMetric(metrics, t('Tiempo total', 'Total time'), formatDurationMs(result.timeMs));
    return metrics;
  }
  if (gameId === 'balloon_risk') {
    pushMetric(metrics, t('Rondas', 'Rounds'), `${result.roundsCompleted ?? 0}/${result.totalRounds ?? fallbackTrialCount ?? 0}`);
    pushMetric(metrics, t('Eficiencia riesgo', 'Risk efficiency'), pct(result.riskEfficiency ?? result.score));
    pushMetric(metrics, t('Asegurados', 'Cashed out'), result.cashoutCount);
    pushMetric(metrics, t('Tiempo total', 'Total time'), formatDurationMs(result.timeMs));
    return metrics;
  }
  if (gameId === 'passenger_routes') {
    pushMetric(metrics, t('Entregas', 'Deliveries'), `${result.passengersDelivered ?? 0}/${result.destinationCount ?? fallbackTrialCount ?? 0}`);
    if (Number(result.destinationCount) > 0) pushMetric(metrics, t('Precisión', 'Accuracy'), pct((Number(result.passengersDelivered) || 0) / Number(result.destinationCount)));
    pushMetric(metrics, t('Eficiencia ruta', 'Route efficiency'), pct(result.routeEfficiency));
    pushMetric(metrics, t('Tiempo total', 'Total time'), formatDurationMs(result.timeMs));
    return metrics;
  }
  if (gameId === 'team_coordination') {
    pushMetric(metrics, t('Escenarios', 'Scenarios'), `${result.completedScenarioCount ?? 0}/${result.scenarioCount ?? fallbackTrialCount ?? 0}`);
    pushMetric(metrics, t('Coordinación', 'Coordination'), formatGameScore(result.score));
    pushMetric(metrics, t('Adaptabilidad', 'Adaptability'), pct(result.adaptabilityScore));
    pushMetric(metrics, t('Tiempo total', 'Total time'), formatDurationMs(result.timeMs));
    return metrics;
  }
  return metrics;
}

function getDefaultGameMetrics(t, result = {}, fallbackTrialCount = 0) {
  const accuracy = result.accuracy ?? (result.totalTrials ? result.trials?.filter?.((trial) => trial.correct)?.length / result.totalTrials : null);
  const scoreValue = result.score ?? result.meanScore ?? null;
  const meanRt = result.meanReactionTimeMs ?? result.meanRT ?? result.correctGoRT ?? null;
  const metrics = [];
  pushMetric(metrics, t('Ensayos', 'Trials'), result.trialCount ?? result.completedTrialCount ?? result.totalTrials ?? fallbackTrialCount ?? 0);
  pushMetric(metrics, t('Precisión', 'Accuracy'), Number.isFinite(Number(accuracy)) ? pct(accuracy) : null);
  pushMetric(metrics, t('Puntaje', 'Score'), formatGameScore(scoreValue));
  pushMetric(metrics, t('Tiempo', 'Time'), formatDurationMs(meanRt));
  return metrics;
}

function buildOriginalGameFeedback(gameId, result) {
  if (gameId === 'laser_puzzle') return buildLaserPuzzleFeedback(result);
  if (gameId === 'balloon_risk') return buildBalloonRiskFeedback(result);
  if (gameId === 'passenger_routes') return buildPassengerConstraintFeedback(result);
  if (gameId === 'team_coordination') return buildTeamCoordinationFeedback(result);
  return null;
}

const FEEDBACK_CATEGORY_LABELS = Object.freeze({
  clear_solution: { es: 'Solución clara', en: 'Clear solution' },
  rule_confusion_review: { es: 'Reglas a revisar', en: 'Rules to review' },
  incomplete_goal: { es: 'Objetivo incompleto', en: 'Incomplete goal' },
  high_effort_solution: { es: 'Solución con alto esfuerzo', en: 'High-effort solution' },
  balanced_feedback_strategy: { es: 'Estrategia riesgo/recompensa', en: 'Risk/reward strategy' },
  conservative_cashout_strategy: { es: 'Estrategia conservadora', en: 'Conservative strategy' },
  feedback_not_observed: { es: 'Feedback no observado', en: 'Feedback not observed' },
  loss_exposure_review: { es: 'Exposición a pérdidas', en: 'Loss exposure' },
  mixed_risk_strategy: { es: 'Estrategia mixta', en: 'Mixed strategy' },
  clear_success: { es: 'Ruta eficiente', en: 'Efficient route' },
  constraint_blocked: { es: 'Restricciones a revisar', en: 'Constraints to review' },
  resource_use_review: { es: 'Uso de recursos', en: 'Resource use' },
  route_inefficient_incomplete: { es: 'Ruta incompleta/ineficiente', en: 'Incomplete/inefficient route' },
  incomplete_delivery: { es: 'Entrega incompleta', en: 'Incomplete delivery' },
  mixed_strategy_review: { es: 'Estrategia mixta', en: 'Mixed strategy' },
  structured_coordination_signal: { es: 'Coordinación estructurada', en: 'Structured coordination' },
  incomplete_structured_brief: { es: 'Brief incompleto', en: 'Incomplete brief' },
  structured_coordination_review: { es: 'Coordinación a revisar', en: 'Coordination to review' },
});

function normalizeFeedback(t, feedback = null) {
  if (feedback?.status !== 'available') return null;
  const displayCategory = feedback.feedbackCategory ?? feedback.constraintFeedbackCategory ?? 'review';
  const categoryLabel = FEEDBACK_CATEGORY_LABELS[displayCategory] ?? null;
  return {
    ...feedback,
    displayCategory,
    displayCategoryLabel: categoryLabel
      ? t(categoryLabel.es, categoryLabel.en)
      : t('Revisión contextual', 'Contextual review'),
    candidateHint: t(feedback.candidateHint ?? '', feedback.candidateHintEn ?? feedback.candidateHint ?? ''),
    reviewerCaveat: t(feedback.reviewerCaveat ?? '', feedback.reviewerCaveatEn ?? feedback.reviewerCaveat ?? ''),
  };
}

const AVAILABILITY_LABELS = Object.freeze({
  provisional_score: { es: 'Lectura preliminar', en: 'Preliminary reading' },
  descriptive_only: { es: 'Solo descriptivo', en: 'Descriptive only' },
  insufficient: { es: 'Evidencia insuficiente', en: 'Insufficient evidence' },
  not_measured: { es: 'No medido', en: 'Not measured' },
  unknown: { es: 'Sin clasificar', en: 'Unclassified' },
});

const CONSTRUCT_DEMO_EXPLANATIONS = Object.freeze({
  decisionMaking: Object.freeze({
    reason: { es: 'La demo observa estrategias en juegos, pero todavía no tiene un criterio externo para decir que una estrategia sea mejor que otra entre candidatos.', en: 'The demo observes in-game strategies, but it still lacks an external criterion to say one strategy is better than another across candidates.' },
    nextStep: { es: 'Definir criterios del rol y comparar estas métricas con entrevista estructurada o tareas externas de decisión.', en: 'Define role criteria and compare these metrics with structured interview or external decision tasks.' },
  }),
  problemSolving: Object.freeze({
    reason: { es: 'Se usa una lectura preliminar porque Laser y Rutas sí generan problemas con reglas, pero aún no existen normas ni validación con personas.', en: 'A preliminary reading is used because Laser and Routes do generate rule-based problems, but there are no norms or validation with people yet.' },
    nextStep: { es: 'Validar dificultad, confiabilidad y convergencia con pruebas externas de resolución de problemas.', en: 'Validate difficulty, reliability, and convergence with external problem-solving tests.' },
  }),
  riskFeedbackProfile: Object.freeze({
    reason: { es: 'Balloon describe cómo se manejó riesgo/recompensa dentro del juego; eso no equivale a personalidad ni tolerancia a frustración.', en: 'Balloon describes how risk/reward was handled within the game; that is not equivalent to personality or frustration tolerance.' },
    nextStep: { es: 'Comparar con una medida validada de toma de riesgo si se quiere convertir en indicador más fuerte.', en: 'Compare with a validated risk-taking measure if a stronger indicator is wanted.' },
  }),
  planning: Object.freeze({
    reason: { es: 'Rutas observa planificación bajo restricciones dentro del juego; sigue siendo una lectura preliminar.', en: 'Routes observes planning under constraints within the game; it remains a preliminary reading.' },
    nextStep: { es: 'Validar con tareas externas de planificación y revisar sesgos por experiencia en juegos/dispositivo.', en: 'Validate with external planning tasks and review biases from game/device experience.' },
  }),
  adaptability: Object.freeze({
    reason: { es: 'El brief de equipo agrega cambios controlados de prioridad, recursos y feedback para observar ajuste estructurado.', en: 'The team brief adds controlled changes in priority, resources, and feedback to observe structured adjustment.' },
    nextStep: { es: 'Validar la estabilidad de estos escenarios con formas paralelas, entrevistas cognitivas y criterio externo.', en: 'Validate the stability of these scenarios with parallel forms, cognitive interviews, and external criteria.' },
  }),
  analyticalThinking: Object.freeze({
    reason: { es: 'Laser y Rutas aportan señales de análisis de reglas/recursos, pero la demo no valida pensamiento analítico laboral general.', en: 'Laser and Routes provide rule/resource analysis signals, but the demo does not validate general workplace analytical thinking.' },
    nextStep: { es: 'Diseñar tareas paralelas y comparar contra criterios externos de análisis o resolución lógica.', en: 'Design parallel tasks and compare against external criteria for analysis or logical reasoning.' },
  }),
  leadership: Object.freeze({
    reason: { es: 'El brief de equipo observa decisiones estructuradas de foco, roles y trade-offs; no es interacción grupal real.', en: 'The team brief observes structured focus, role, and trade-off decisions; it is not real group interaction.' },
    nextStep: { es: 'Complementar con role-play, simulación grupal o tarea colaborativa validada si se quiere usar fuera de demo.', en: 'Complement with role-play, group simulation, or validated collaborative task if used beyond demo.' },
  }),
  communication: Object.freeze({
    reason: { es: 'El brief de equipo mide claridad estructurada: contexto, siguiente paso y uso de feedback sin guardar texto libre.', en: 'The team brief measures structured clarity: context, next step, and feedback use without storing free text.' },
    nextStep: { es: 'Agregar evaluación de mensaje escrito/oral con rúbrica y consentimiento si se requiere comunicación expresiva real.', en: 'Add written/oral message assessment with rubric and consent if real expressive communication is required.' },
  }),
});

function getScoreLabel(t, construct = {}) {
  const formatted = score(construct.score);
  if (formatted != null) return `${formatted}`;
  if (construct.availability === 'descriptive_only') return t('Descriptivo', 'Descriptive');
  if (construct.availability === 'insufficient') return t('Insuficiente', 'Insufficient');
  return t('No medido', 'Not measured');
}

function getConstructDemoExplanation(t, id, availability) {
  const entry = CONSTRUCT_DEMO_EXPLANATIONS[id] ?? {
    reason: availability === 'not_measured'
      ? { es: 'La demo actual no genera una señal suficiente para este indicador.', en: 'The current demo does not generate a sufficient signal for this indicator.' }
      : { es: 'La señal existe, pero su interpretación todavía es preliminar.', en: 'The signal exists, but its interpretation is still preliminary.' },
    nextStep: { es: 'Definir una tarea específica, evidencia esperada y validación empírica adicional antes de usarlo para comparar personas.', en: 'Define a specific task, expected evidence, and additional empirical validation before using it to compare people.' },
  };
  return { reason: t(entry.reason.es, entry.reason.en), nextStep: t(entry.nextStep.es, entry.nextStep.en) };
}

export function getPostulationQualityCards(t, artifacts = null) {
  const quality = artifacts?.assessmentSession?.qualitySummary ?? artifacts?.payload?.quality ?? {};
  const consent = artifacts?.assessmentSession?.consent ?? {};
  const validationOk = artifacts?.payload?.validation?.ok === true && artifacts?.validation?.ok !== false;
  const synthetic = artifacts?.fixture?.synthetic === true;
  if (synthetic) {
    return [
      { label: t('Integridad técnica', 'Technical integrity'), value: validationOk ? t('Verificada', 'Verified') : t('Bloqueada', 'Blocked'), tone: validationOk ? 'ok' : 'danger' },
      { label: t('Cámara del fixture', 'Fixture camera'), value: t('Simulada', 'Simulated'), tone: 'ok' },
      { label: t('Muestras simuladas', 'Simulated samples'), value: String(quality.sampleCount ?? 0), tone: safeNumber(quality.sampleCount) >= 20 ? 'ok' : 'warn' },
      { label: t('Presencia facial simulada', 'Simulated face presence'), value: pct(quality.facePresenceRatio), tone: safeNumber(quality.facePresenceRatio) >= 0.7 ? 'ok' : 'warn' },
      { label: t('Confianza simulada', 'Simulated confidence'), value: pct(quality.meanConfidence), tone: safeNumber(quality.meanConfidence) >= 0.55 ? 'ok' : 'warn' },
      { label: t('Ensayos del fixture', 'Fixture trials'), value: String(quality.correlatedTrialCount ?? 0), tone: safeNumber(quality.correlatedTrialCount) > 0 ? 'ok' : 'warn' },
    ];
  }
  return [
    { label: t('Integridad técnica', 'Technical integrity'), value: validationOk ? t('Verificada', 'Verified') : t('Bloqueada', 'Blocked'), tone: validationOk ? 'ok' : 'danger' },
    { label: t('Cámara local', 'Local camera'), value: consent.camera ? t('Activada', 'Enabled') : t('Con caveats', 'With caveats'), tone: consent.camera ? 'ok' : 'warn' },
    { label: t('Muestras', 'Samples'), value: String(quality.sampleCount ?? 0), tone: safeNumber(quality.sampleCount) >= 20 ? 'ok' : 'warn' },
    { label: t('Rostro presente', 'Face present'), value: pct(quality.facePresenceRatio), tone: safeNumber(quality.facePresenceRatio) >= 0.7 ? 'ok' : 'warn' },
    { label: t('Confianza facial', 'Facial confidence'), value: pct(quality.meanConfidence), tone: safeNumber(quality.meanConfidence) >= 0.55 ? 'ok' : 'warn' },
    { label: t('Ensayos correlacionados', 'Correlated trials'), value: String(quality.correlatedTrialCount ?? 0), tone: safeNumber(quality.correlatedTrialCount) > 0 ? 'ok' : 'warn' },
  ];
}

export function getPostulationGameCards(t, artifacts = null, completedDemo = null) {
  const blocks = artifacts?.assessmentSession?.blocks ?? completedDemo?.blocks?.map((entry, index) => ({
    index,
    gameId: entry.block?.gameId,
    label: entry.block?.label,
    result: entry.summary,
    trialCount: entry.block?.trialCount,
  })) ?? [];
  return blocks.map((block, index) => {
    const result = block.result ?? {};
    const accuracy = result.accuracy ?? (result.totalTrials ? result.trials?.filter?.((trial) => trial.correct)?.length / result.totalTrials : null);
    const scoreValue = result.score ?? result.meanScore ?? null;
    const meanRt = result.meanReactionTimeMs ?? result.meanRT ?? result.correctGoRT ?? null;
    const feedback = normalizeFeedback(t, buildOriginalGameFeedback(block.gameId, result));
    const trialCount = result.trialCount ?? result.completedTrialCount ?? result.totalTrials ?? block.trialCount ?? 0;
    const originalMetrics = getOriginalGameMetrics(t, block.gameId, result, trialCount);
    return {
      id: block.gameId ?? `game-${index}`,
      label: t(block.label ?? block.gameId ?? t('Juego', 'Game'), getOriginalGameBlueprint(block.gameId)?.labelEn ?? block.labelEn ?? block.gameId ?? 'Game'),
      status: block.status ?? 'completed',
      trialCount,
      accuracy: Number.isFinite(Number(accuracy)) ? pct(accuracy) : '—',
      score: formatGameScore(scoreValue),
      meanRt: formatDurationMs(meanRt),
      metrics: originalMetrics.length ? originalMetrics : getDefaultGameMetrics(t, result, trialCount),
      feedback,
    };
  });
}

export function getTopTalentDimensions(t, artifacts = null, limit = 6) {
  const dimensions = Object.values(artifacts?.talentProfile?.dimensions ?? artifacts?.payload?.talentProfile?.dimensions ?? {});
  return dimensions
    .filter(Boolean)
    .sort((a, b) => (score(b.score) ?? -1) - (score(a.score) ?? -1))
    .slice(0, limit)
    .map((dimension) => ({
      id: dimension.id,
      label: t(dimension.label ?? dimension.id, dimension.labelEn ?? dimension.label ?? dimension.id),
      labelEn: dimension.labelEn,
      score: score(dimension.score),
      confidence: pct(dimension.confidence),
      evidence: (dimension.evidence ?? []).slice(0, 2),
      caveats: dimension.caveats ?? [],
      interpretation: dimension.interpretation ?? t('Señal observacional para revisión humana.', 'Observational signal for human review.'),
    }))
    .filter((dimension) => dimension.score != null);
}

export function getPostulationCaveats(t, artifacts = null) {
  const quality = artifacts?.assessmentSession?.qualitySummary ?? artifacts?.payload?.quality ?? {};
  const edge = artifacts?.assessmentSession?.edgeAI ?? artifacts?.payload?.edgeAI ?? {};
  const labels = {
    synthetic_demo_fixture: t('Datos sintéticos de demostración; no corresponden a una persona real.', 'Synthetic demonstration data; does not correspond to a real person.'),
    original_games_r6d_provisional_mapping: t('Mapeo de constructos provisional; requiere validación psicométrica adicional.', 'Provisional construct mapping; requires additional psychometric validation.'),
    low_model_confidence: t('Confianza limitada en la señal local; interpretar con cautela.', 'Limited confidence in the local signal; interpret with caution.'),
    original_games_r6d_mapping_available_in_talent_framework: t('Scores de demo disponibles con límites explicados por constructo.', 'Demo scores available with per-construct explained limits.'),
    'Modelo bayesiano basado en AUs del FACS.': t('El modelo local aporta contexto técnico, no inferencia directa de talento.', 'The local model provides technical context, not direct talent inference.'),
  };
  return [...new Set([...(quality.caveats ?? []), ...(edge.caveats ?? [])].map((caveat) => labels[caveat] ?? caveat))];
}

export function getWorkbookTalentFrameworkCards(t, artifacts = null) {
  const framework = artifacts?.talentFramework ?? artifacts?.payload?.talentFramework ?? artifacts?.assessmentSession?.talentFramework ?? null;
  if (!framework?.constructs) return [];
  return (framework.constructOrder ?? Object.keys(framework.constructs)).map((id) => {
    const construct = framework.constructs[id] ?? {};
    return {
      id,
      label: t(construct.label ?? id, getConstructDefinition(id)?.labelEn ?? construct.labelEn ?? construct.label ?? id),
      score: score(construct.score),
      scoreLabel: getScoreLabel(t, construct),
      confidence: pct(construct.confidence),
      availability: construct.availability ?? 'unknown',
      availabilityLabel: (() => {
        const availability = AVAILABILITY_LABELS[construct.availability] ?? AVAILABILITY_LABELS.unknown;
        return t(availability.es, availability.en);
      })(),
      description: t(construct.description ?? '', getConstructDefinition(id)?.descriptionEn ?? construct.descriptionEn ?? construct.description ?? ''),
      demoExplanation: getConstructDemoExplanation(t, id, construct.availability ?? 'unknown'),
      evidence: construct.evidence ?? [],
      caveats: construct.caveats ?? [],
      narrative: t(construct.narrative ?? t('Lectura provisional para revisión humana.', 'Provisional reading for human review.'), construct.narrativeEn ?? construct.narrative ?? 'Provisional reading for human review.'),
    };
  });
}

export function getPostulationExecutiveSummary(t, artifacts = null, completedDemo = null) {
  const batteryMode = artifacts?.batteryMode ?? completedDemo?.batteryMode ?? 'stable_dg';
  const validationOk = artifacts?.payload?.validation?.ok === true && artifacts?.validation?.ok !== false;
  const completedCount = completedDemo?.completedCount ?? artifacts?.assessmentSession?.blocks?.filter((block) => block.status === 'completed').length ?? 0;
  const totalCount = completedDemo?.totalCount ?? artifacts?.assessmentSession?.blocks?.length ?? 0;
  const caveats = getPostulationCaveats(t, artifacts);
  const workbookCards = getWorkbookTalentFrameworkCards(t, artifacts);
  const notMeasured = workbookCards.filter((card) => /not_measured|insufficient/i.test(card.availability)).length;
  const descriptive = workbookCards.filter((card) => /descriptive/i.test(card.availability)).length;
  const isOriginalBattery = batteryMode === 'original_games';
  const observationLabel = `${caveats.length} ${caveats.length === 1 ? t('observación', 'observation') : t('observaciones', 'observations')} de alcance`;
  return {
    headline: isOriginalBattery
      ? t('Batería original: lectura preliminar controlada', 'Original battery: controlled preliminary reading')
      : t('Batería estable: lectura observacional', 'Stable battery: observational reading'),
    statusLabel: validationOk ? t('Listo para revisión humana', 'Ready for human review') : t('Validación bloqueada', 'Validation blocked'),
    cards: [
      {
        label: t('Qué se observó', 'What was observed'),
        title: `${completedCount}/${totalCount} ${t('juegos completados', 'games completed')}`,
        body: isOriginalBattery
          ? t('Laser, Balloon, Passenger y Operación Faro aportan señales agregadas: reglas, riesgo/recompensa, rutas y coordinación estructurada.', 'Laser, Balloon, Passenger, and Operación Faro provide aggregated signals: rules, risk/reward, routes, and structured coordination.')
          : t('La batería estable aporta señales agregadas de desempeño en tareas cortas de atención, control e interferencia.', 'The stable battery provides aggregated performance signals from short attention, control, and interference tasks.'),
      },
      {
        label: t('Cómo usarlo', 'How to use it'),
        title: t('Guía de entrevista', 'Interview guide'),
        body: t('Contrastar con entrevista, CV y evidencia laboral. No ranking automático ni decisión de selección.', 'Contrast with interview, CV, and work evidence. No automatic ranking or selection decision.'),
      },
      {
        label: isOriginalBattery ? t('Cobertura y límites', 'Coverage and limits') : t('Qué no mide', 'What it does not measure'),
        title: isOriginalBattery && notMeasured === 0 ? t('8 constructos con señal de demo', '8 constructs with demo signal') : isOriginalBattery ? t('No medido explícito', 'Explicit not measured') : t('Caveats visibles', 'Visible caveats'),
        body: isOriginalBattery
          ? notMeasured === 0
            ? descriptive === 0
              ? `${workbookCards.length} ${t('constructos tienen score provisional y confianza por constructo; ninguna capacidad queda sin tarea de demo asociada.', 'constructs have provisional score and per-construct confidence; no capability is left without an associated demo task.')}`
              : `${descriptive} ${t('lectura(s) se mantienen descriptivas por prudencia científica, pero ninguna capacidad queda sin tarea de demo asociada.', 'reading(s) remain descriptive for scientific prudence, but no capability is left without an associated demo task.')}`
            : `${notMeasured} ${t('capacidades quedan como No medido o evidencia insuficiente;', 'capabilities remain Not measured or insufficient evidence;')} ${descriptive} ${t('lectura(s) son solo descriptivas. Cada tarjeta explica qué habría que agregar para medirlas.', 'reading(s) are descriptive only. Each card explains what would need to be added to measure them.')}`
          : `${observationLabel} ${t('acompañan la sesión; la cámara se usa como calidad/contexto, no como inferencia diagnóstica.', 'accompany the session; the camera is used as quality/context, not diagnostic inference.')}`,
      },
      {
        label: t('Siguiente paso', 'Next step'),
        title: isOriginalBattery ? t('Validar antes de comparar candidatos', 'Validate before comparing candidates') : t('Revisión humana documentada', 'Documented human review'),
        body: isOriginalBattery
          ? t('Ejecutar validación con QA, entrevistas cognitivas y revisión experta antes de usar comparaciones entre personas.', 'Run validation with QA, cognitive interviews, and expert review before using cross-person comparisons.')
          : t('Revisar consistencia con entrevista y criterios del rol antes de cualquier decisión humana.', 'Review consistency with interview and role criteria before any human decision.'),
      },
    ],
  };
}

export function formatPostulationScore(t, value) {
  const formatted = score(value);
  return formatted == null ? t('No medido', 'Not measured') : `${formatted}`;
}
