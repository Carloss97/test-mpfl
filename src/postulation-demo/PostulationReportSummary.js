import { buildBalloonRiskFeedback } from '../tasks/original-games/balloonRiskFeedback.js';
import { buildLaserPuzzleFeedback } from '../tasks/original-games/laserPuzzleFeedback.js';
import { buildPassengerConstraintFeedback } from '../tasks/original-games/passengerRouteFeedback.js';
import { buildTeamCoordinationFeedback } from '../tasks/original-games/teamCoordinationFeedback.js';

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

function getOriginalGameMetrics(gameId, result = {}, fallbackTrialCount = 0) {
  const metrics = [];
  if (gameId === 'laser_puzzle') {
    pushMetric(metrics, 'Mapas', `${result.solvedLevels ?? 0}/${result.levelCount ?? fallbackTrialCount ?? 0}`);
    if (Number(result.levelCount) > 0) pushMetric(metrics, 'Precisión', pct((Number(result.solvedLevels) || 0) / Number(result.levelCount)));
    pushMetric(metrics, 'Eficiencia', pct(result.solutionEfficiency));
    pushMetric(metrics, 'Tiempo total', formatDurationMs(result.timeMs));
    return metrics;
  }
  if (gameId === 'balloon_risk') {
    pushMetric(metrics, 'Rondas', `${result.roundsCompleted ?? 0}/${result.totalRounds ?? fallbackTrialCount ?? 0}`);
    pushMetric(metrics, 'Eficiencia riesgo', pct(result.riskEfficiency ?? result.score));
    pushMetric(metrics, 'Asegurados', result.cashoutCount);
    pushMetric(metrics, 'Tiempo total', formatDurationMs(result.timeMs));
    return metrics;
  }
  if (gameId === 'passenger_routes') {
    pushMetric(metrics, 'Entregas', `${result.passengersDelivered ?? 0}/${result.destinationCount ?? fallbackTrialCount ?? 0}`);
    if (Number(result.destinationCount) > 0) pushMetric(metrics, 'Precisión', pct((Number(result.passengersDelivered) || 0) / Number(result.destinationCount)));
    pushMetric(metrics, 'Eficiencia ruta', pct(result.routeEfficiency));
    pushMetric(metrics, 'Tiempo total', formatDurationMs(result.timeMs));
    return metrics;
  }
  if (gameId === 'team_coordination') {
    pushMetric(metrics, 'Escenarios', `${result.completedScenarioCount ?? 0}/${result.scenarioCount ?? fallbackTrialCount ?? 0}`);
    pushMetric(metrics, 'Coordinación', formatGameScore(result.score));
    pushMetric(metrics, 'Adaptabilidad', pct(result.adaptabilityScore));
    pushMetric(metrics, 'Tiempo total', formatDurationMs(result.timeMs));
    return metrics;
  }
  return metrics;
}

function getDefaultGameMetrics(result = {}, fallbackTrialCount = 0) {
  const accuracy = result.accuracy ?? (result.totalTrials ? result.trials?.filter?.((trial) => trial.correct)?.length / result.totalTrials : null);
  const scoreValue = result.score ?? result.meanScore ?? null;
  const meanRt = result.meanReactionTimeMs ?? result.meanRT ?? result.correctGoRT ?? null;
  const metrics = [];
  pushMetric(metrics, 'Ensayos', result.trialCount ?? result.completedTrialCount ?? result.totalTrials ?? fallbackTrialCount ?? 0);
  pushMetric(metrics, 'Precisión', Number.isFinite(Number(accuracy)) ? pct(accuracy) : null);
  pushMetric(metrics, 'Puntaje', formatGameScore(scoreValue));
  pushMetric(metrics, 'Tiempo', formatDurationMs(meanRt));
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
  clear_solution: 'Solución clara',
  rule_confusion_review: 'Reglas a revisar',
  incomplete_goal: 'Objetivo incompleto',
  high_effort_solution: 'Solución con alto esfuerzo',
  balanced_feedback_strategy: 'Estrategia riesgo/recompensa',
  conservative_cashout_strategy: 'Estrategia conservadora',
  feedback_not_observed: 'Feedback no observado',
  loss_exposure_review: 'Exposición a pérdidas',
  mixed_risk_strategy: 'Estrategia mixta',
  clear_success: 'Ruta eficiente',
  constraint_blocked: 'Restricciones a revisar',
  resource_use_review: 'Uso de recursos',
  route_inefficient_incomplete: 'Ruta incompleta/ineficiente',
  incomplete_delivery: 'Entrega incompleta',
  mixed_strategy_review: 'Estrategia mixta',
  structured_coordination_signal: 'Coordinación estructurada',
  incomplete_structured_brief: 'Brief incompleto',
  structured_coordination_review: 'Coordinación a revisar',
});

function normalizeFeedback(feedback = null) {
  if (feedback?.status !== 'available') return null;
  const displayCategory = feedback.feedbackCategory ?? feedback.constraintFeedbackCategory ?? 'review';
  return {
    ...feedback,
    displayCategory,
    displayCategoryLabel: FEEDBACK_CATEGORY_LABELS[displayCategory] ?? 'Revisión contextual',
  };
}

const AVAILABILITY_LABELS = Object.freeze({
  provisional_score: 'Lectura preliminar',
  descriptive_only: 'Solo descriptivo',
  insufficient: 'Evidencia insuficiente',
  not_measured: 'No medido',
  unknown: 'Sin clasificar',
});

const CONSTRUCT_DEMO_EXPLANATIONS = Object.freeze({
  decisionMaking: Object.freeze({
    reason: 'La demo observa estrategias en juegos, pero todavía no tiene un criterio externo para decir que una estrategia sea mejor que otra entre candidatos.',
    nextStep: 'Definir criterios del rol y comparar estas métricas con entrevista estructurada o tareas externas de decisión.',
  }),
  problemSolving: Object.freeze({
    reason: 'Se usa una lectura preliminar porque Laser y Rutas sí generan problemas con reglas, pero aún no existen normas ni validación con personas.',
    nextStep: 'Validar dificultad, confiabilidad y convergencia con pruebas externas de resolución de problemas.',
  }),
  riskFeedbackProfile: Object.freeze({
    reason: 'Balloon describe cómo se manejó riesgo/recompensa dentro del juego; eso no equivale a personalidad ni tolerancia a frustración.',
    nextStep: 'Comparar con una medida validada de toma de riesgo si se quiere convertir en indicador más fuerte.',
  }),
  planning: Object.freeze({
    reason: 'Rutas observa planificación bajo restricciones dentro del juego; sigue siendo una lectura preliminar.',
    nextStep: 'Validar con tareas externas de planificación y revisar sesgos por experiencia en juegos/dispositivo.',
  }),
  adaptability: Object.freeze({
    reason: 'El brief de equipo agrega cambios controlados de prioridad, recursos y feedback para observar ajuste estructurado.',
    nextStep: 'Validar la estabilidad de estos escenarios con formas paralelas, entrevistas cognitivas y criterio externo.',
  }),
  analyticalThinking: Object.freeze({
    reason: 'Laser y Rutas aportan señales de análisis de reglas/recursos, pero la demo no valida pensamiento analítico laboral general.',
    nextStep: 'Diseñar tareas paralelas y comparar contra criterios externos de análisis o resolución lógica.',
  }),
  leadership: Object.freeze({
    reason: 'El brief de equipo observa decisiones estructuradas de foco, roles y trade-offs; no es interacción grupal real.',
    nextStep: 'Complementar con role-play, simulación grupal o tarea colaborativa validada si se quiere usar fuera de demo.',
  }),
  communication: Object.freeze({
    reason: 'El brief de equipo mide claridad estructurada: contexto, siguiente paso y uso de feedback sin guardar texto libre.',
    nextStep: 'Agregar evaluación de mensaje escrito/oral con rúbrica y consentimiento si se requiere comunicación expresiva real.',
  }),
});

function getScoreLabel(construct = {}) {
  const formatted = score(construct.score);
  if (formatted != null) return `${formatted}`;
  if (construct.availability === 'descriptive_only') return 'Descriptivo';
  if (construct.availability === 'insufficient') return 'Insuficiente';
  return 'No medido';
}

function getConstructDemoExplanation(id, availability) {
  return CONSTRUCT_DEMO_EXPLANATIONS[id] ?? {
    reason: availability === 'not_measured'
      ? 'La demo actual no genera una señal suficiente para este indicador.'
      : 'La señal existe, pero su interpretación todavía es preliminar.',
    nextStep: 'Definir una tarea específica, evidencia esperada y validación R-7 antes de usarlo para comparar personas.',
  };
}

export function getPostulationQualityCards(artifacts = null) {
  const quality = artifacts?.assessmentSession?.qualitySummary ?? artifacts?.payload?.quality ?? {};
  const consent = artifacts?.assessmentSession?.consent ?? {};
  const validationOk = artifacts?.payload?.validation?.ok === true && artifacts?.validation?.ok !== false;
  return [
    { label: 'Validación', value: validationOk ? 'Aprobada' : 'Bloqueada', tone: validationOk ? 'ok' : 'danger' },
    { label: 'Cámara local', value: consent.camera ? 'Activada' : 'Con caveats', tone: consent.camera ? 'ok' : 'warn' },
    { label: 'Muestras', value: String(quality.sampleCount ?? 0), tone: safeNumber(quality.sampleCount) >= 20 ? 'ok' : 'warn' },
    { label: 'Rostro presente', value: pct(quality.facePresenceRatio), tone: safeNumber(quality.facePresenceRatio) >= 0.7 ? 'ok' : 'warn' },
    { label: 'Confianza facial', value: pct(quality.meanConfidence), tone: safeNumber(quality.meanConfidence) >= 0.55 ? 'ok' : 'warn' },
    { label: 'Ensayos correlacionados', value: String(quality.correlatedTrialCount ?? 0), tone: safeNumber(quality.correlatedTrialCount) > 0 ? 'ok' : 'warn' },
  ];
}

export function getPostulationGameCards(artifacts = null, completedDemo = null) {
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
    const feedback = normalizeFeedback(buildOriginalGameFeedback(block.gameId, result));
    const trialCount = result.trialCount ?? result.completedTrialCount ?? result.totalTrials ?? block.trialCount ?? 0;
    const originalMetrics = getOriginalGameMetrics(block.gameId, result, trialCount);
    return {
      id: block.gameId ?? `game-${index}`,
      label: block.label ?? block.gameId ?? 'Juego',
      status: block.status ?? 'completed',
      trialCount,
      accuracy: Number.isFinite(Number(accuracy)) ? pct(accuracy) : '—',
      score: formatGameScore(scoreValue),
      meanRt: formatDurationMs(meanRt),
      metrics: originalMetrics.length ? originalMetrics : getDefaultGameMetrics(result, trialCount),
      feedback,
    };
  });
}

export function getTopTalentDimensions(artifacts = null, limit = 6) {
  const dimensions = Object.values(artifacts?.talentProfile?.dimensions ?? artifacts?.payload?.talentProfile?.dimensions ?? {});
  return dimensions
    .filter(Boolean)
    .sort((a, b) => (score(b.score) ?? -1) - (score(a.score) ?? -1))
    .slice(0, limit)
    .map((dimension) => ({
      id: dimension.id,
      label: dimension.label ?? dimension.id,
      score: score(dimension.score),
      confidence: pct(dimension.confidence),
      evidence: (dimension.evidence ?? []).slice(0, 2),
      caveats: dimension.caveats ?? [],
      interpretation: dimension.interpretation ?? 'Señal observacional para revisión humana.',
    }))
    .filter((dimension) => dimension.score != null);
}

export function getPostulationCaveats(artifacts = null) {
  const quality = artifacts?.assessmentSession?.qualitySummary ?? artifacts?.payload?.quality ?? {};
  const edge = artifacts?.assessmentSession?.edgeAI ?? artifacts?.payload?.edgeAI ?? {};
  return [...new Set([...(quality.caveats ?? []), ...(edge.caveats ?? [])])];
}

export function getWorkbookTalentFrameworkCards(artifacts = null) {
  const framework = artifacts?.talentFramework ?? artifacts?.payload?.talentFramework ?? artifacts?.assessmentSession?.talentFramework ?? null;
  if (!framework?.constructs) return [];
  return (framework.constructOrder ?? Object.keys(framework.constructs)).map((id) => {
    const construct = framework.constructs[id] ?? {};
    return {
      id,
      label: construct.label ?? id,
      score: score(construct.score),
      scoreLabel: getScoreLabel(construct),
      confidence: pct(construct.confidence),
      availability: construct.availability ?? 'unknown',
      availabilityLabel: AVAILABILITY_LABELS[construct.availability] ?? AVAILABILITY_LABELS.unknown,
      demoExplanation: getConstructDemoExplanation(id, construct.availability ?? 'unknown'),
      evidence: construct.evidence ?? [],
      caveats: construct.caveats ?? [],
      narrative: construct.narrative ?? 'Lectura provisional para revisión humana.',
    };
  });
}

export function getPostulationExecutiveSummary(artifacts = null, completedDemo = null) {
  const batteryMode = artifacts?.batteryMode ?? completedDemo?.batteryMode ?? 'stable_dg';
  const validationOk = artifacts?.payload?.validation?.ok === true && artifacts?.validation?.ok !== false;
  const completedCount = completedDemo?.completedCount ?? artifacts?.assessmentSession?.blocks?.filter((block) => block.status === 'completed').length ?? 0;
  const totalCount = completedDemo?.totalCount ?? artifacts?.assessmentSession?.blocks?.length ?? 0;
  const caveats = getPostulationCaveats(artifacts);
  const workbookCards = getWorkbookTalentFrameworkCards(artifacts);
  const notMeasured = workbookCards.filter((card) => /not_measured|insufficient/i.test(card.availability)).length;
  const descriptive = workbookCards.filter((card) => /descriptive/i.test(card.availability)).length;
  const isOriginalBattery = batteryMode === 'original_games';
  return {
    headline: isOriginalBattery
      ? 'Batería original: lectura preliminar controlada'
      : 'Batería estable: lectura observacional',
    statusLabel: validationOk ? 'Listo para revisión humana' : 'Validación bloqueada',
    cards: [
      {
        label: 'Qué se observó',
        title: `${completedCount}/${totalCount} juegos completados`,
        body: isOriginalBattery
          ? 'Laser, Balloon, Passenger y Brief de equipo aportan señales agregadas: reglas, riesgo/recompensa, rutas y coordinación estructurada.'
          : 'La batería estable aporta señales agregadas de desempeño en tareas cortas de atención, control e interferencia.',
      },
      {
        label: 'Cómo usarlo',
        title: 'Guía de entrevista',
        body: 'Contrastar con entrevista, CV y evidencia laboral. No ranking automático ni decisión de selección.',
      },
      {
        label: 'Qué no mide',
        title: isOriginalBattery && notMeasured === 0 ? 'Cobertura completa de demo' : isOriginalBattery ? 'No medido explícito' : 'Caveats visibles',
        body: isOriginalBattery
          ? notMeasured === 0
            ? `${descriptive} lectura(s) se mantienen descriptivas por prudencia científica, pero ninguna capacidad queda sin tarea de demo asociada.`
            : `${notMeasured} capacidades quedan como No medido o evidencia insuficiente; ${descriptive} lectura(s) son solo descriptivas. Cada tarjeta explica qué habría que agregar para medirlas.`
          : `${caveats.length} caveat(s) acompañan la sesión; la cámara se usa como calidad/contexto, no como inferencia diagnóstica.`,
      },
      {
        label: 'Siguiente paso',
        title: isOriginalBattery ? 'Validar antes de comparar candidatos' : 'Revisión humana documentada',
        body: isOriginalBattery
          ? 'Ejecutar R-7 con QA, entrevistas cognitivas y revisión experta antes de usar comparaciones entre personas.'
          : 'Revisar consistencia con entrevista y criterios del rol antes de cualquier decisión humana.',
      },
    ],
  };
}

export function formatPostulationScore(value) {
  const formatted = score(value);
  return formatted == null ? 'No medido' : `${formatted}`;
}
