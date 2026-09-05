const BALLOON_THRESHOLDS = Object.freeze([7, 10, 8, 12, 9, 11, 13, 8]);
const BALLOON_ALLOWED_RESPONSE_FIELDS = Object.freeze([
  'aggregateSchemaVersion',
  'score',
  'completed',
  'roundsCompleted',
  'totalRounds',
  'averagePumps',
  'cashoutCount',
  'popCount',
  'postPopAdjustment',
  'postPopAdjustmentCount',
  'riskEfficiency',
  'timeMs',
  'aggregateOnly',
]);

function round(value, digits = 4) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  const factor = 10 ** digits;
  return Math.round(numeric * factor) / factor;
}

function mean(values, digits = 4) {
  const numeric = values.map(Number).filter(Number.isFinite);
  if (!numeric.length) return 0;
  return round(numeric.reduce((sum, value) => sum + value, 0) / numeric.length, digits);
}

export function buildBalloonRiskRounds({ count = 8 } = {}) {
  const total = Math.max(1, Math.floor(Number(count) || 8));
  return Array.from({ length: total }, (_, index) => Object.freeze({
    roundId: `balloon-risk-${index}`,
    roundIndex: index,
    threshold: BALLOON_THRESHOLDS[index % BALLOON_THRESHOLDS.length],
    pointValue: 10 + (index % 3) * 2,
  }));
}

export function getBalloonRiskLayoutMetrics(viewport = {}) {
  const width = Number(viewport.width) || 606;
  const height = Number(viewport.height) || 338;
  const compact = width <= 620 || height <= 360;
  const veryShort = height <= 320;
  return {
    compact,
    containerMinHeight: compact ? 0 : 520,
    maxBalloonScale: veryShort ? 1.85 : compact ? 2.05 : 2.6,
    controlsGap: compact ? 8 : 14,
    statColumns: compact ? 2 : 4,
    bodyPadding: compact ? 12 : 18,
  };
}

export function buildBalloonResponseAggregate({
  roundsCompleted = 0,
  totalRounds = 1,
  pumpCounts = [],
  cashoutCount = 0,
  popCount = 0,
  totalScore = 0,
  postPopAdjustments = [],
  timeMs = 0,
} = {}) {
  const completedRounds = Math.max(0, Math.round(Number(roundsCompleted) || 0));
  const total = Math.max(1, Math.round(Number(totalRounds) || 1));
  const averagePumps = mean(pumpCounts, 2);
  const points = Math.max(0, Math.round(Number(totalScore) || 0));
  const riskEfficiency = round((points / Math.max(1, total * 100)) * (1 - Math.min(0.6, Number(popCount) * 0.12)), 4);
  return {
    aggregateSchemaVersion: 'balloon_risk_aggregate_v1',
    score: riskEfficiency,
    completed: completedRounds >= total,
    roundsCompleted: completedRounds,
    totalRounds: total,
    averagePumps,
    cashoutCount: Math.max(0, Math.round(Number(cashoutCount) || 0)),
    popCount: Math.max(0, Math.round(Number(popCount) || 0)),
    postPopAdjustment: mean(postPopAdjustments, 2),
    postPopAdjustmentCount: Math.max(0, postPopAdjustments.length),
    riskEfficiency,
    timeMs: Math.max(0, Math.round(Number(timeMs) || 0)),
    aggregateOnly: true,
  };
}

function sanitizeBalloonAggregateFields(balloonRisk = {}) {
  const allowed = new Set(BALLOON_ALLOWED_RESPONSE_FIELDS);
  return Object.fromEntries(
    Object.entries(balloonRisk).filter(([key, value]) => (
      allowed.has(key)
      && (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string')
    )),
  );
}

export function sanitizeBalloonResponsePayload(response = {}) {
  const sanitized = {
    correct: response.correct === true,
    outcome: typeof response.outcome === 'string' ? response.outcome : 'round_completed',
    reactionTimeMs: Math.max(0, Math.round(Number(response.reactionTimeMs) || 0)),
    score: round(Number(response.score) || 0, 4),
  };
  const balloonRisk = sanitizeBalloonAggregateFields(response.balloonRisk ?? {});
  if (Object.keys(balloonRisk).length) sanitized.balloonRisk = balloonRisk;
  return sanitized;
}
