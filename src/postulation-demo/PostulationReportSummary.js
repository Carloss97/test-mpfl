import { buildBalloonRiskFeedback } from '../tasks/original-games/balloonRiskFeedback.js';
import { buildLaserPuzzleFeedback } from '../tasks/original-games/laserPuzzleFeedback.js';
import { buildPassengerConstraintFeedback } from '../tasks/original-games/passengerRouteFeedback.js';

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

function buildOriginalGameFeedback(gameId, result) {
  if (gameId === 'laser_puzzle') return buildLaserPuzzleFeedback(result);
  if (gameId === 'balloon_risk') return buildBalloonRiskFeedback(result);
  if (gameId === 'passenger_routes') return buildPassengerConstraintFeedback(result);
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
    return {
      id: block.gameId ?? `game-${index}`,
      label: block.label ?? block.gameId ?? 'Juego',
      status: block.status ?? 'completed',
      trialCount: result.trialCount ?? result.completedTrialCount ?? result.totalTrials ?? block.trialCount ?? 0,
      accuracy: Number.isFinite(Number(accuracy)) ? pct(accuracy) : '—',
      score: formatGameScore(scoreValue),
      meanRt: Number.isFinite(Number(meanRt)) && Number(meanRt) > 0 ? `${Math.round(Number(meanRt))}ms` : '—',
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
    }));
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
      scoreLabel: construct.score == null ? 'No medido' : `${score(construct.score)}`,
      confidence: pct(construct.confidence),
      availability: construct.availability ?? 'unknown',
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
  const notMeasured = workbookCards.filter((card) => /not_measured|insufficient/i.test(card.availability) || card.score == null).length;
  const descriptive = workbookCards.filter((card) => /descriptive/i.test(card.availability)).length;
  const isOriginalBattery = batteryMode === 'original_games';
  return {
    headline: isOriginalBattery
      ? 'Batería original: lectura preliminar controlada'
      : 'Batería estable: lectura observacional',
    statusLabel: validationOk ? 'Apto para revisión humana' : 'Validación bloqueada',
    cards: [
      {
        label: 'Qué se observó',
        title: `${completedCount}/${totalCount} juegos completados`,
        body: isOriginalBattery
          ? 'Laser, Balloon y Passenger aportan métricas agregadas de tarea; el mapeo a constructos sigue siendo provisional.'
          : 'La batería estable aporta señales agregadas de desempeño en tareas cortas de atención, control e interferencia.',
      },
      {
        label: 'Cómo usarlo',
        title: 'Guía de entrevista',
        body: 'Contrastar con entrevista, CV y evidencia laboral. No ranking automático ni decisión de selección.',
      },
      {
        label: 'Qué no mide',
        title: isOriginalBattery ? 'No medido explícito' : 'Caveats visibles',
        body: isOriginalBattery
          ? `${notMeasured} constructos quedan como No medido o evidencia insuficiente; ${descriptive} lectura(s) son solo descriptivas.`
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
