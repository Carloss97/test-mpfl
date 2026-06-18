const MIN_LEVEL = 1;
const MAX_LEVEL = 10;

function round(value, digits = 4) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  const factor = 10 ** digits;
  return Math.round(numeric * factor) / factor;
}

function clamp(value, min = 0, max = 1) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  return Math.min(max, Math.max(min, numeric));
}

export function clampDifficultyLevel(level, min = MIN_LEVEL, max = MAX_LEVEL) {
  const numeric = Math.round(Number(level));
  if (!Number.isFinite(numeric)) return min;
  return Math.min(max, Math.max(min, numeric));
}

function completionRatio(performance = {}) {
  const trialCount = Number(performance.trialCount ?? 0);
  const completed = Number(performance.completedTrialCount ?? 0);
  return trialCount > 0 ? clamp(completed / trialCount) : 0;
}

export function buildDifficultySnapshot({ gameSummary = {}, edgeAIResult = {} } = {}) {
  const performance = gameSummary.performance ?? {};
  const motor = gameSummary.motor ?? {};
  const inhibition = gameSummary.inhibition ?? {};
  const interference = gameSummary.interference ?? {};
  const visualSearch = gameSummary.visualSearch ?? {};
  const channels = edgeAIResult.channels ?? {};

  return {
    accuracy: round(performance.accuracy ?? 0),
    completedTrialRatio: round(completionRatio(performance)),
    meanScore: round(performance.meanScore ?? performance.accuracy ?? 0),
    meanReactionTimeMs: round(performance.meanReactionTimeMs ?? 0, 2),
    pathEfficiency: round(motor.pathEfficiencyMean ?? 0),
    smoothPursuitScore: round(motor.smoothPursuitScore ?? 0),
    trackingLossRatio: round(motor.trackingLossRatio ?? 0),
    overshootRate: round(motor.overshootRate ?? 0),
    commissionErrorRate: round(inhibition.commissionErrorRate ?? 0),
    omissionErrorRate: round(inhibition.omissionErrorRate ?? 0),
    conflictCostMs: round(interference.conflictCostMs ?? 0, 2),
    interferenceErrorRate: round(interference.errorRate ?? 0),
    visualSearchEfficiency: round(visualSearch.searchEfficiency ?? 0),
    visualSearchErrorRate: round(visualSearch.errorRate ?? 0),
    cognitiveLoadScore: round(channels.cognitiveLoad?.score ?? 50, 2),
    motorControlScore: round(channels.motorControl?.score ?? 50, 2),
    inhibitionControlScore: round(channels.inhibitionControl?.score ?? 50, 2),
    visuomotorPrecisionScore: round(channels.visuomotorPrecision?.score ?? 50, 2),
  };
}

function scoreEvidence(snapshot) {
  let up = 0;
  let down = 0;
  const reasonCodes = [];

  if (snapshot.accuracy >= 0.85) { up += 2; reasonCodes.push('high_accuracy'); }
  if (snapshot.accuracy <= 0.55) { down += 2; reasonCodes.push('low_accuracy'); }

  if (snapshot.completedTrialRatio >= 0.9) { up += 1; reasonCodes.push('high_completion'); }
  if (snapshot.completedTrialRatio < 0.75) { down += 1; reasonCodes.push('incomplete_coverage'); }

  if (snapshot.meanReactionTimeMs > 0 && snapshot.meanReactionTimeMs <= 500) { up += 1; reasonCodes.push('fast_rt'); }
  if (snapshot.meanReactionTimeMs >= 900) { down += 1; reasonCodes.push('slow_rt'); }

  const motorStrong = snapshot.pathEfficiency >= 0.8 || snapshot.smoothPursuitScore >= 0.78 || snapshot.motorControlScore >= 75;
  const motorWeak = snapshot.pathEfficiency > 0 && snapshot.pathEfficiency < 0.5 || snapshot.smoothPursuitScore > 0 && snapshot.smoothPursuitScore < 0.45 || snapshot.motorControlScore < 45;
  if (motorStrong && snapshot.trackingLossRatio <= 0.15 && snapshot.overshootRate <= 0.25) { up += 2; reasonCodes.push('stable_motor_control'); }
  if (motorWeak || snapshot.trackingLossRatio >= 0.35 || snapshot.overshootRate >= 0.6) { down += 2; reasonCodes.push('weak_motor_control'); }

  const inhibitionErrors = Math.max(snapshot.commissionErrorRate, snapshot.omissionErrorRate);
  if (inhibitionErrors <= 0.08) { up += 1; reasonCodes.push('low_inhibition_errors'); }
  if (inhibitionErrors >= 0.3) { down += 2; reasonCodes.push('high_inhibition_errors'); }

  if (snapshot.conflictCostMs >= 450 || snapshot.interferenceErrorRate >= 0.35) { down += 2; reasonCodes.push('high_interference_cost'); }
  if (snapshot.cognitiveLoadScore >= 75) { down += 2; reasonCodes.push('high_cognitive_load'); }
  if (snapshot.cognitiveLoadScore <= 45) { up += 1; reasonCodes.push('controlled_cognitive_load'); }

  if (snapshot.visualSearchEfficiency >= 0.75) { up += 1; reasonCodes.push('efficient_visual_search'); }
  if (snapshot.visualSearchEfficiency > 0 && snapshot.visualSearchEfficiency < 0.4) { down += 1; reasonCodes.push('inefficient_visual_search'); }

  return { up, down, reasonCodes };
}

export function recommendAdaptiveDifficulty({
  currentLevel = 1,
  gameSummary = {},
  edgeAIResult = {},
  timestamp = null,
  minLevel = MIN_LEVEL,
  maxLevel = MAX_LEVEL,
} = {}) {
  const previousLevel = clampDifficultyLevel(currentLevel, minLevel, maxLevel);
  const snapshot = buildDifficultySnapshot({ gameSummary, edgeAIResult });
  const evidence = scoreEvidence(snapshot);

  let direction = 'hold';
  if (evidence.up >= evidence.down + 2) direction = 'up';
  else if (evidence.down >= evidence.up + 2) direction = 'down';

  const nextLevel = direction === 'up'
    ? clampDifficultyLevel(previousLevel + 1, minLevel, maxLevel)
    : direction === 'down'
      ? clampDifficultyLevel(previousLevel - 1, minLevel, maxLevel)
      : previousLevel;

  const reasonCodes = direction === 'hold'
    ? [...evidence.reasonCodes, 'mixed_evidence']
    : evidence.reasonCodes;

  return {
    type: 'adaptive_difficulty_recommendation_v1',
    previousLevel,
    nextLevel,
    direction,
    reasonCodes: [...new Set(reasonCodes)],
    evidenceScore: { up: evidence.up, down: evidence.down },
    snapshot,
    trace: {
      timestamp: timestamp ?? null,
      previousLevel,
      nextLevel,
      direction,
      reasonCodes: [...new Set(reasonCodes)],
      metricsUsed: Object.keys(snapshot),
    },
  };
}
