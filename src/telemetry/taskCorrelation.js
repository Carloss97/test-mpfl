/**
 * Task-Signal Correlation Engine v2
 *
 * Mejoras:
 *  - Feature windows pre-trial (baseline), during-trial, post-trial
 *  - Significance scoring: qué AUs cambiaron significativamente
 *  - Aggregation por tipo de outcome (correct/incorrect/timeout)
 *  - Trial-level AU deltas con confidence
 */

import { buildPointerKinematics } from './kinematics.js';
import { MICROGESTURE_GROUPS, extractMicrogestureWindow } from './microgestureFeatures.js';
import { computeAUs } from './gestureInsights.js';

const SHOWN_EVENT_TYPES = new Set(['target_shown', 'task_shown']);
const COMPLETION_EVENT_TYPES = new Set(['target_click', 'task_response']);

function round(value, digits = 4) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function mean(values) {
  const numeric = values.filter((v) => Number.isFinite(v)).map(Number);
  if (!numeric.length) return 0;
  return round(numeric.reduce((s, v) => s + v, 0) / numeric.length);
}

function std(values) {
  const avg = mean(values);
  const numeric = values.filter((v) => Number.isFinite(v)).map(Number);
  if (numeric.length < 2) return 0;
  const variance = numeric.reduce((s, v) => s + (v - avg) ** 2, 0) / (numeric.length - 1);
  return Math.sqrt(variance);
}

function samplesBetween(samples, from, to) {
  return samples.filter((s) => {
    const t = Number(s?.timestamp);
    return Number.isFinite(t) && t >= from && t <= to;
  });
}

/**
 * Compute AU deltas between two windows.
 * Returns per-AU delta + significance flag.
 */
function computeAUDeltas(samplesBefore, samplesDuring) {
  const ausBefore = computeAUs(samplesBefore);
  const ausDuring = computeAUs(samplesDuring);

  const deltas = {};
  for (const code of Object.keys(ausDuring)) {
    const before = ausBefore[code]?.intensity ?? 0;
    const during = ausDuring[code]?.intensity ?? 0;
    deltas[code] = {
      delta: round(during - before),
      before: round(before),
      during: round(during),
      significant: Math.abs(during - before) > 0.08,
    };
  }
  return deltas;
}

function groupBy(arr, keyFn) {
  const groups = {};
  for (const item of arr) {
    const key = keyFn(item);
    if (!key) continue;
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}

/**
 * Correlaciona task events con features faciales, incluyendo
 * AUs reales y significancia estadística por trial.
 */
export function correlateSignalsWithTasks({
  taskEvents = [], faceSamples = [], pointerSamples = [],
  preTaskMs = 300, postTaskMs = 400,
} = {}) {
  const events = taskEvents
    .filter((e) => e?.type && e?.trialId && Number.isFinite(e?.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp);

  const shownEvents = events.filter((e) => SHOWN_EVENT_TYPES.has(e.type));
  const completionEvents = events.filter((e) => COMPLETION_EVENT_TYPES.has(e.type));

  const trials = shownEvents.map((shown) => {
    const completed = completionEvents.find(
      (e) => e.trialId === shown.trialId && e.timestamp >= shown.timestamp,
    );
    const completedAt = completed?.timestamp ?? null;
    const responseEnd = completedAt ?? shown.timestamp;

    // Windows
    const preSamples = samplesBetween(faceSamples, shown.timestamp - preTaskMs, shown.timestamp);
    const duringSamples = samplesBetween(faceSamples, shown.timestamp, responseEnd);
    const postSamples = samplesBetween(faceSamples, responseEnd, responseEnd + postTaskMs);

    // Features
    const preWindow = extractMicrogestureWindow(faceSamples, { from: shown.timestamp - preTaskMs, to: shown.timestamp });
    const duringWindow = extractMicrogestureWindow(faceSamples, { from: shown.timestamp, to: responseEnd });
    const postWindow = extractMicrogestureWindow(faceSamples, { from: responseEnd, to: responseEnd + postTaskMs });

    // AU deltas
    const auDeltas = computeAUDeltas(preSamples, duringSamples);

    // Pointer
    const pointerSummary = buildPointerKinematics(samplesBetween(pointerSamples, shown.timestamp, responseEnd));

    // Performance
    const correct = completed?.context?.correct === true;
    const outcome = completed?.context?.outcome ?? (completed ? (correct ? 'correct' : 'incorrect') : 'incomplete');
    const reactionTimeMs = completedAt ? round(completedAt - shown.timestamp, 2) : null;
    const taskId = shown.context?.taskId ?? completed?.context?.taskId ?? 'target_click';

    // Significance: count AUs with significant deltas
    const significantAUs = Object.entries(auDeltas)
      .filter(([, d]) => d.significant)
      .map(([code]) => code);

    return {
      trialId: shown.trialId, taskId,
      taskLabel: shown.context?.taskLabel ?? taskId,
      targetId: shown.targetId,
      shownAt: shown.timestamp, completedAt,
      reactionTimeMs, correct, outcome,
      score: completed?.context?.score ?? (correct ? 1 : 0),
      preWindow, duringWindow, postWindow,
      auDeltas,
      significantAUs,
      significantAUCount: significantAUs.length,
      pointerSummary,
    };
  });

  // Aggregate
  const completedTrials = trials.filter((t) => t.completedAt !== null);
  const correctTrials = completedTrials.filter((t) => t.correct);

  // Mean AU deltas across all trials
  const meanAUDeltas = {};
  const auCodes = new Set();
  for (const t of completedTrials) {
    for (const code of Object.keys(t.auDeltas || {})) auCodes.add(code);
  }
  for (const code of auCodes) {
    const deltas = completedTrials.map((t) => t.auDeltas?.[code]?.delta ?? 0);
    meanAUDeltas[code] = {
      meanDelta: mean(deltas),
      stdDelta: round(std(deltas)),
      significantCount: completedTrials.filter((t) => t.auDeltas?.[code]?.significant).length,
    };
  }

  // By outcome
  const byOutcome = {};
  const byOutcomeGroups = groupBy(completedTrials, (t) => t.outcome);
  for (const [outcome, group] of Object.entries(byOutcomeGroups)) {
    const rts = group.map((t) => t.reactionTimeMs).filter((v) => v !== null);
    byOutcome[outcome] = {
      count: group.length,
      accuracy: outcome === 'correct' ? 1 : outcome === 'incorrect' ? 0 : round(correctTrials.length / group.length),
      meanRT: mean(rts),
      meanSignificantAUs: mean(group.map((t) => t.significantAUCount)),
    };
  }

  // Top AUs by significance
  const topAUs = Object.entries(meanAUDeltas)
    .sort((a, b) => b[1].significantCount - a[1].significantCount)
    .slice(0, 10)
    .map(([code, data]) => ({ code, ...data }));

  return {
    type: 'task_signal_correlation_v2',
    aggregate: {
      trialCount: trials.length,
      completedCount: completedTrials.length,
      accuracy: completedTrials.length ? round(correctTrials.length / completedTrials.length) : 0,
      meanRT: mean(completedTrials.map((t) => t.reactionTimeMs).filter((v) => v !== null)),
      meanSignificantAUs: mean(completedTrials.map((t) => t.significantAUCount)),
      topAUs,
      byOutcome,
    },
    trials,
  };
}