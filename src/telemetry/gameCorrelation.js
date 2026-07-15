/**
 * Game-Signal Correlation v3
 *
 * Correlates privacy-safe game_event_v1 trials with multimodal signal windows.
 * This module never returns raw face samples, blendshapes, landmarks, pointer paths,
 * or full game stimulus items.
 */

import { computeAUs } from './gestureInsights.js';
import { buildPointerKinematics } from './kinematics.js';

const GAME_CORRELATION_SCHEMA = 'game_signal_correlation_v3';

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

function samplesBetween(samples = [], from = 0, to = 0) {
  return samples.filter((sample) => {
    const timestamp = Number(sample?.timestamp);
    return Number.isFinite(timestamp) && timestamp >= from && timestamp <= to;
  });
}

function summarizeFace(samples = []) {
  const present = samples.filter((sample) => sample?.quality?.facePresent !== false);
  const aus = computeAUs(present);
  const activeAUs = Object.entries(aus)
    .filter(([, au]) => (au?.intensity ?? 0) > 0.04)
    .map(([code, au]) => ({ code, intensity: round(au.intensity ?? 0) }))
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, 6);
  return {
    sampleCount: samples.length,
    facePresenceRatio: samples.length ? round(present.length / samples.length, 4) : 0,
    meanConfidence: mean(samples.map((sample) => sample?.quality?.confidence ?? 0), 4),
    activeAUCount: activeAUs.length,
    topAUs: activeAUs,
  };
}

function summarizeGaze(samples = []) {
  return {
    sampleCount: samples.length,
    lookingAtScreenRatio: samples.length ? round(samples.filter((sample) => sample?.lookingAtScreen).length / samples.length, 4) : 0,
    meanConfidence: mean(samples.map((sample) => sample?.confidence ?? 0), 4),
    meanScreenX: mean(samples.map((sample) => sample?.screenX), 4),
    meanScreenY: mean(samples.map((sample) => sample?.screenY), 4),
  };
}

function summarizePosture(samples = []) {
  return {
    sampleCount: samples.length,
    meanPostureScore: mean(samples.map((sample) => sample?.postureScore), 4),
    meanHeadForward: mean(samples.map((sample) => sample?.headForward), 4),
    meanConfidence: mean(samples.map((sample) => sample?.confidence), 4),
  };
}

function summarizeUpperBody(samples = []) {
  return {
    sampleCount: samples.length,
    meanArmActivity: mean(samples.map((sample) => sample?.armActivity), 4),
    meanUpperBodyCoverage: mean(samples.map((sample) => sample?.upperBodyCoverage), 4),
    meanConfidence: mean(samples.map((sample) => sample?.confidence), 4),
  };
}

export function summarizeSignalWindow({
  from = 0,
  to = 0,
  faceSamples = [],
  pointerSamples = [],
  gazeSamples = [],
  postureSamples = [],
  upperBodySamples = [],
} = {}) {
  const safeFrom = Number.isFinite(Number(from)) ? Number(from) : 0;
  const safeTo = Number.isFinite(Number(to)) ? Number(to) : safeFrom;
  const normalizedFrom = Math.min(safeFrom, safeTo);
  const normalizedTo = Math.max(safeFrom, safeTo);

  const faceWindow = samplesBetween(faceSamples, normalizedFrom, normalizedTo);
  const pointerWindow = samplesBetween(pointerSamples, normalizedFrom, normalizedTo);
  const gazeWindow = samplesBetween(gazeSamples, normalizedFrom, normalizedTo);
  const postureWindow = samplesBetween(postureSamples, normalizedFrom, normalizedTo);
  const upperBodyWindow = samplesBetween(upperBodySamples, normalizedFrom, normalizedTo);

  return {
    range: { from: round(normalizedFrom, 2), to: round(normalizedTo, 2), durationMs: round(normalizedTo - normalizedFrom, 2) },
    face: summarizeFace(faceWindow),
    pointer: buildPointerKinematics(pointerWindow),
    gaze: summarizeGaze(gazeWindow),
    posture: summarizePosture(postureWindow),
    upperBody: summarizeUpperBody(upperBodyWindow),
  };
}

function trialPairKey(event = {}) {
  return `${event.gameId ?? 'unknown_game'}::${event.trialId ?? ''}`;
}

function findTrialPairs(events = []) {
  const normalized = events
    .filter((event) => event?.eventType && Number.isFinite(Number(event?.timestamp)))
    .sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
  const shown = normalized.filter((event) => event.eventType === 'stimulus_shown' && event.trialId);
  const responsesByTrial = new Map();
  for (const response of normalized) {
    if (response.eventType !== 'response' || !response.trialId) continue;
    const key = trialPairKey(response);
    const bucket = responsesByTrial.get(key) ?? [];
    bucket.push(response);
    responsesByTrial.set(key, bucket);
  }
  return shown.map((stimulus) => {
    const responses = responsesByTrial.get(trialPairKey(stimulus)) ?? [];
    const response = responses.find((candidate) => (
      Number(candidate.timestamp) >= Number(stimulus.timestamp)
      && (!stimulus.targetId || !candidate.targetId || candidate.targetId === stimulus.targetId)
    ));
    return { stimulus, response: response ?? null };
  });
}

function delta(a = 0, b = 0) {
  return round((Number(b) || 0) - (Number(a) || 0), 4);
}

function computeWindowDeltas(preTrial, reaction, postResponse) {
  return {
    reactionVsPre: {
      facePresenceDelta: delta(preTrial?.face?.facePresenceRatio, reaction?.face?.facePresenceRatio),
      activeAUCountDelta: delta(preTrial?.face?.activeAUCount, reaction?.face?.activeAUCount),
      gazeFocusDelta: delta(preTrial?.gaze?.lookingAtScreenRatio, reaction?.gaze?.lookingAtScreenRatio),
      postureScoreDelta: delta(preTrial?.posture?.meanPostureScore, reaction?.posture?.meanPostureScore),
      armActivityDelta: delta(preTrial?.upperBody?.meanArmActivity, reaction?.upperBody?.meanArmActivity),
    },
    postVsPre: {
      facePresenceDelta: postResponse ? delta(preTrial?.face?.facePresenceRatio, postResponse?.face?.facePresenceRatio) : 0,
      activeAUCountDelta: postResponse ? delta(preTrial?.face?.activeAUCount, postResponse?.face?.activeAUCount) : 0,
      gazeFocusDelta: postResponse ? delta(preTrial?.gaze?.lookingAtScreenRatio, postResponse?.gaze?.lookingAtScreenRatio) : 0,
      postureScoreDelta: postResponse ? delta(preTrial?.posture?.meanPostureScore, postResponse?.posture?.meanPostureScore) : 0,
      armActivityDelta: postResponse ? delta(preTrial?.upperBody?.meanArmActivity, postResponse?.upperBody?.meanArmActivity) : 0,
    },
  };
}

function sanitizeGameContext(stimulus, response) {
  const responsePayload = response?.response ?? {};
  return {
    stimulusKind: stimulus?.stimulus?.kind ?? null,
    setSize: stimulus?.stimulus?.payload?.setSize ?? responsePayload.visualSearch?.setSize ?? null,
    distractorCount: stimulus?.stimulus?.payload?.distractorCount ?? responsePayload.visualSearch?.distractorCount ?? null,
    score: responsePayload.score ?? null,
    correct: responsePayload.correct ?? false,
    outcome: responsePayload.outcome ?? (response ? 'unknown' : 'incomplete'),
  };
}

export function correlateGameWithMultimodalSignals({
  gameEvents = [],
  faceSamples = [],
  pointerSamples = [],
  gazeSamples = [],
  postureSamples = [],
  upperBodySamples = [],
  preTrialMs = 300,
  postResponseMs = 500,
  recoveryMs = 1000,
} = {}) {
  const pairs = findTrialPairs(gameEvents);
  const trials = pairs.map(({ stimulus, response }) => {
    const shownAt = Number(stimulus.timestamp);
    const completedAt = response ? Number(response.timestamp) : null;
    const responseEnd = completedAt ?? shownAt;

    const preTrial = summarizeSignalWindow({
      from: shownAt - preTrialMs,
      to: shownAt,
      faceSamples,
      pointerSamples,
      gazeSamples,
      postureSamples,
      upperBodySamples,
    });
    const reaction = summarizeSignalWindow({
      from: shownAt,
      to: responseEnd,
      faceSamples,
      pointerSamples,
      gazeSamples,
      postureSamples,
      upperBodySamples,
    });
    const postResponse = completedAt === null ? null : summarizeSignalWindow({
      from: completedAt,
      to: completedAt + postResponseMs,
      faceSamples,
      pointerSamples,
      gazeSamples,
      postureSamples,
      upperBodySamples,
    });
    const recovery = completedAt === null ? null : summarizeSignalWindow({
      from: completedAt + postResponseMs,
      to: completedAt + postResponseMs + recoveryMs,
      faceSamples,
      pointerSamples,
      gazeSamples,
      postureSamples,
      upperBodySamples,
    });

    return {
      trialId: stimulus.trialId,
      gameId: stimulus.gameId ?? response?.gameId ?? 'unknown_game',
      targetId: stimulus.targetId ?? response?.targetId ?? null,
      shownAt: round(shownAt, 2),
      completedAt: completedAt === null ? null : round(completedAt, 2),
      reactionTimeMs: completedAt === null ? null : round(completedAt - shownAt, 2),
      correct: response?.response?.correct === true,
      outcome: response?.response?.outcome ?? 'incomplete',
      game: sanitizeGameContext(stimulus, response),
      windows: {
        preTrial,
        reaction,
        postResponse,
        recovery,
      },
      deltas: computeWindowDeltas(preTrial, reaction, postResponse),
    };
  });

  const completed = trials.filter((trial) => trial.completedAt !== null);
  const correct = completed.filter((trial) => trial.correct);
  const byGameId = {};
  for (const trial of trials) {
    byGameId[trial.gameId] = (byGameId[trial.gameId] ?? 0) + 1;
  }

  return {
    schemaVersion: GAME_CORRELATION_SCHEMA,
    aggregate: {
      trialCount: trials.length,
      completedTrialCount: completed.length,
      accuracy: completed.length ? round(correct.length / completed.length, 4) : 0,
      meanReactionTimeMs: mean(completed.map((trial) => trial.reactionTimeMs), 2),
      meanReactionFacePresenceDelta: mean(completed.map((trial) => trial.deltas.reactionVsPre.facePresenceDelta), 4),
      meanReactionPostureDelta: mean(completed.map((trial) => trial.deltas.reactionVsPre.postureScoreDelta), 4),
      byGameId,
    },
    privacy: {
      containsRawFaceSamples: false,
      containsRawPointerPath: false,
      containsRawGameStimuli: false,
      aggregateOnlyWindows: true,
    },
    trials,
  };
}
