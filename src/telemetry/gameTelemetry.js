/**
 * Game Telemetry v1
 *
 * Normalizes gamified task/activity events into a stable, privacy-safe event
 * contract. This module intentionally has no React dependency and does not
 * persist raw pointer trajectories.
 */

export const GAME_EVENT_TYPE = 'game_event_v1';
export const GAME_SESSION_SCHEMA = 'game_telemetry_session_v1';
export const GAME_SUMMARY_SCHEMA = 'game_telemetry_summary_v1';

const VALID_EVENT_TYPES = new Set([
  'game_start',
  'trial_start',
  'stimulus_shown',
  'pointer_move',
  'pointer_down',
  'pointer_up',
  'response',
  'score_update',
  'trial_end',
  'game_end',
]);

function now() {
  return globalThis.performance?.now?.() ?? Date.now();
}

function round(value, digits = 2) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  const factor = 10 ** digits;
  return Math.round(numeric * factor) / factor;
}

function finiteOrNull(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function sanitizePointer(pointer) {
  if (!pointer || typeof pointer !== 'object') return undefined;
  const x = finiteOrNull(pointer.x ?? pointer.clientX);
  const y = finiteOrNull(pointer.y ?? pointer.clientY);
  if (x === null || y === null) return undefined;
  const result = { x: round(x), y: round(y) };
  if (pointer.button !== undefined) result.button = Number(pointer.button);
  if (pointer.pressure !== undefined) result.pressure = round(Number(pointer.pressure), 3);
  return result;
}

function normalizeEventType(event) {
  if (event?.eventType && VALID_EVENT_TYPES.has(event.eventType)) return event.eventType;
  if (event?.type === 'target_shown' || event?.type === 'task_shown') return 'stimulus_shown';
  if (event?.type === 'target_click' || event?.type === 'task_response') return 'response';
  if (event?.type && VALID_EVENT_TYPES.has(event.type)) return event.type;
  return 'game_event';
}

function normalizeStimulus(event) {
  if (event?.stimulus) return event.stimulus;
  if (event?.context?.stimulus) return event.context.stimulus;
  const position = event?.context?.position ?? event?.position ?? null;
  if (position) return { kind: 'target', payload: { position } };
  return undefined;
}

function normalizeResponse(event) {
  if (event?.response) return event.response;
  if (normalizeEventType(event) !== 'response') return undefined;
  return {
    value: event?.context?.response ?? event?.responseValue ?? null,
    correct: event?.correct ?? event?.context?.correct ?? false,
    outcome: event?.context?.outcome ?? (event?.correct ? 'correct' : 'incorrect'),
    reactionTimeMs: finiteOrNull(event?.reactionTimeMs ?? event?.context?.reactionTimeMs),
    score: finiteOrNull(event?.context?.score ?? event?.score) ?? 0,
  };
}

function normalizeGameState(event) {
  const state = event?.gameState ?? {};
  const fromContext = event?.context ?? {};
  const result = {};
  for (const key of ['score', 'level', 'difficulty', 'combo']) {
    const value = state[key] ?? fromContext[key];
    if (value !== undefined && value !== null) result[key] = value;
  }
  return Object.keys(result).length ? result : undefined;
}

export function createGameTelemetrySession({ sessionId, gameId, startedAt = now() } = {}) {
  return {
    schemaVersion: GAME_SESSION_SCHEMA,
    sessionId: sessionId ?? `game-session-${Math.round(startedAt)}`,
    gameId: gameId ?? 'unknown_game',
    startedAt: round(startedAt, 2),
    privacy: {
      rawPointerPathStored: false,
      rawVideoStored: false,
      rawFramesStored: false,
      landmarksStored: false,
    },
  };
}

export function normalizeGameEvent(event = {}, defaults = {}) {
  const eventType = normalizeEventType(event);
  const context = event.context ?? {};
  const timestamp = finiteOrNull(event.timestamp) ?? now();
  const pointer = sanitizePointer(event.pointer ?? event.clickPosition ?? event.position);
  const stimulus = normalizeStimulus(event);
  const response = normalizeResponse(event);
  const gameState = normalizeGameState(event);

  const normalized = {
    type: GAME_EVENT_TYPE,
    timestamp: round(timestamp, 2),
    sessionId: event.sessionId ?? defaults.sessionId ?? null,
    gameId: event.gameId ?? context.taskId ?? defaults.gameId ?? 'unknown_game',
    trialId: event.trialId ?? context.trialId ?? null,
    eventType,
    targetId: event.targetId ?? null,
    privacy: { rawPointer: false },
  };

  if (pointer) normalized.pointer = pointer;
  if (stimulus) normalized.stimulus = stimulus;
  if (response) normalized.response = response;
  if (gameState) normalized.gameState = gameState;

  return normalized;
}

export function appendGameEvent(events = [], event = {}, defaults = {}) {
  return [...events, normalizeGameEvent(event, defaults)];
}

function mean(values, digits = 4) {
  const numeric = values.map(Number).filter(Number.isFinite);
  if (!numeric.length) return 0;
  return round(numeric.reduce((sum, value) => sum + value, 0) / numeric.length, digits);
}

function rate(count, total) {
  return total > 0 ? round(count / total, 4) : 0;
}

export function summarizeGameEvents(events = []) {
  const normalized = events.map((event) => event?.type === GAME_EVENT_TYPE ? event : normalizeGameEvent(event));
  const byEventType = {};
  const trialIds = new Set();
  const responses = [];
  const scores = [];

  let startedAt = null;
  let endedAt = null;

  for (const event of normalized) {
    byEventType[event.eventType] = (byEventType[event.eventType] ?? 0) + 1;
    if (event.trialId) trialIds.add(event.trialId);
    if (event.eventType === 'response' && event.response) {
      responses.push(event.response);
      if (Number.isFinite(Number(event.response.score))) scores.push(Number(event.response.score));
    }
    startedAt = startedAt === null ? event.timestamp : Math.min(startedAt, event.timestamp);
    endedAt = endedAt === null ? event.timestamp : Math.max(endedAt, event.timestamp);
  }

  const correctResponses = responses.filter((response) => response.correct === true);
  const reactionTimes = responses
    .map((response) => finiteOrNull(response.reactionTimeMs))
    .filter((value) => value !== null);
  const responseScores = responses
    .map((response) => finiteOrNull(response.score))
    .filter((value) => value !== null);

  const pointerSummaries = responses.map((response) => response.pointerSummary).filter(Boolean);
  const fittsSummaries = responses.map((response) => response.fitts).filter(Boolean);
  const trackingSummaries = responses.map((response) => response.tracking).filter(Boolean);
  const visualSearchSummaries = responses.map((response) => response.visualSearch).filter(Boolean);
  const inhibitionResponses = responses.filter((response) => response.inhibition || ['correct_go', 'correct_withhold', 'commission_error', 'omission_error'].includes(response.outcome));
  const interferenceResponses = responses.filter((response) => response.interference);

  const noGoResponses = inhibitionResponses.filter((response) => response.inhibition?.responseRequired === false || ['commission_error', 'correct_withhold'].includes(response.outcome));
  const goResponses = inhibitionResponses.filter((response) => response.inhibition?.responseRequired === true || ['correct_go', 'omission_error'].includes(response.outcome));
  const congruentResponses = interferenceResponses.filter((response) => response.interference?.congruent === true);
  const incongruentResponses = interferenceResponses.filter((response) => response.interference?.congruent === false);

  return {
    schemaVersion: GAME_SUMMARY_SCHEMA,
    eventCount: normalized.length,
    trialCount: trialIds.size,
    completedTrialCount: responses.length,
    accuracy: responses.length ? round(correctResponses.length / responses.length, 4) : 0,
    meanReactionTimeMs: reactionTimes.length ? round(reactionTimes.reduce((sum, value) => sum + value, 0) / reactionTimes.length, 2) : 0,
    totalScore: scores.length ? round(scores.reduce((sum, value) => sum + value, 0), 4) : 0,
    performance: {
      trialCount: trialIds.size,
      completedTrialCount: responses.length,
      accuracy: responses.length ? round(correctResponses.length / responses.length, 4) : 0,
      meanReactionTimeMs: mean(reactionTimes, 2),
      meanScore: mean(responseScores, 4),
    },
    motor: {
      pathEfficiencyMean: mean(pointerSummaries.map((summary) => summary.pathEfficiency), 4),
      jerkMean: mean(pointerSummaries.map((summary) => summary.meanJerkPxPerMs3), 5),
      correctionRate: mean(pointerSummaries.map((summary) => summary.correctionCount), 4),
      overshootRate: mean(pointerSummaries.map((summary) => summary.overshootCount), 4),
      clickDistanceMeanPx: mean(pointerSummaries.map((summary) => summary.clickDistanceToTargetPx), 2),
      trackingRmsErrorPx: mean(trackingSummaries.map((summary) => summary.rmsErrorPx), 2),
      trackingLossRatio: mean(trackingSummaries.map((summary) => summary.lossRatio), 4),
      smoothPursuitScore: mean(trackingSummaries.map((summary) => summary.smoothPursuitScore), 4),
    },
    fitts: {
      meanIndexDifficulty: mean(fittsSummaries.map((summary) => summary.indexDifficulty), 4),
      meanThroughput: mean(fittsSummaries.map((summary) => summary.throughput), 4),
    },
    inhibition: {
      commissionErrorRate: rate(inhibitionResponses.filter((response) => response.outcome === 'commission_error').length, noGoResponses.length),
      omissionErrorRate: rate(inhibitionResponses.filter((response) => response.outcome === 'omission_error').length, goResponses.length),
      correctGoRT: mean(inhibitionResponses.filter((response) => response.outcome === 'correct_go').map((response) => response.reactionTimeMs), 2),
      postErrorSlowingMs: mean(inhibitionResponses.map((response) => response.postErrorSlowingMs), 2),
    },
    interference: {
      congruentAccuracy: rate(congruentResponses.filter((response) => response.correct === true).length, congruentResponses.length),
      incongruentAccuracy: rate(incongruentResponses.filter((response) => response.correct === true).length, incongruentResponses.length),
      congruentRT: mean(congruentResponses.filter((response) => response.correct === true).map((response) => response.reactionTimeMs), 2),
      incongruentRT: mean(incongruentResponses.filter((response) => response.correct === true).map((response) => response.reactionTimeMs), 2),
      conflictCostMs: round(mean(incongruentResponses.filter((response) => response.correct === true).map((response) => response.reactionTimeMs), 2) - mean(congruentResponses.filter((response) => response.correct === true).map((response) => response.reactionTimeMs), 2), 2),
      errorRate: rate(interferenceResponses.filter((response) => response.correct === false).length, interferenceResponses.length),
    },
    visualSearch: {
      meanSetSize: mean(visualSearchSummaries.map((summary) => summary.setSize), 2),
      meanDistractorCount: mean(visualSearchSummaries.map((summary) => summary.distractorCount), 2),
      searchEfficiency: mean(visualSearchSummaries.map((summary) => summary.searchEfficiency), 4),
      meanClickDistanceToTargetPx: mean(visualSearchSummaries.map((summary) => summary.clickDistanceToTargetPx), 2),
      errorRate: rate(responses.filter((response) => response.visualSearch && response.correct === false).length, visualSearchSummaries.length),
    },
    byEventType,
    window: {
      startedAt,
      endedAt,
      durationMs: startedAt !== null && endedAt !== null ? round(endedAt - startedAt, 2) : 0,
    },
    privacy: {
      containsRawPointerPath: false,
      containsRawVideo: false,
      containsFrames: false,
      containsLandmarks: false,
      aggregateOnly: true,
    },
  };
}
