import { describe, expect, it } from 'vitest';
import { correlateSignalsWithTasks } from './taskCorrelation.js';

const faceSamples = [
  { timestamp: 50, blendshapes: { browInnerUp: 0.1, jawOpen: 0.1, eyeSquintLeft: 0.1 }, quality: { facePresent: true } },
  { timestamp: 130, blendshapes: { browInnerUp: 0.1, jawOpen: 0.1, eyeSquintLeft: 0.1 }, quality: { facePresent: true } },
  { timestamp: 270, blendshapes: { browInnerUp: 0.5, jawOpen: 0.6, eyeSquintLeft: 0.4 }, quality: { facePresent: true } },
  { timestamp: 410, blendshapes: { browInnerUp: 0.6, jawOpen: 0.7, eyeSquintLeft: 0.5 }, quality: { facePresent: true } },
  { timestamp: 550, blendshapes: { browInnerUp: 0.4, jawOpen: 0.4, eyeSquintLeft: 0.3 }, quality: { facePresent: true } },
];

const pointerSamples = [
  { timestamp: 150, x: 0, y: 0 },
  { timestamp: 310, x: 80, y: 20 },
  { timestamp: 450, x: 160, y: 0 },
];

describe('correlateSignalsWithTasks v2', () => {
  it('pairs shown/click events and computes trial-level AU deltas', () => {
    const taskEvents = [
      { type: 'target_shown', trialId: 't1', targetId: 'target', timestamp: 100, context: { taskId: 'simple_rt' } },
      { type: 'target_click', trialId: 't1', targetId: 'target', timestamp: 450, context: { correct: true, score: 1 } },
    ];

    const correlation = correlateSignalsWithTasks({
      taskEvents, faceSamples, pointerSamples,
    });

    expect(correlation.type).toBe('task_signal_correlation_v2');
    expect(correlation.aggregate.trialCount).toBe(1);
    expect(correlation.aggregate.completedCount).toBe(1);
    expect(correlation.aggregate.accuracy).toBe(1);
    expect(correlation.trials.length).toBe(1);
    expect(correlation.trials[0].significantAUs).toBeDefined();
    expect(correlation.trials[0].auDeltas).toBeDefined();
    expect(correlation.trials[0].correct).toBe(true);
    expect(correlation.trials[0].reactionTimeMs).toBe(350);
    expect(correlation.aggregate.topAUs).toBeDefined();
  });

  it('groups expression deltas by outcome', () => {
    const taskEvents = [
      { type: 'target_shown', trialId: 't1', targetId: 'target', timestamp: 100, context: { taskId: 'simple_rt' } },
      { type: 'target_click', trialId: 't1', targetId: 'target', timestamp: 400, context: { correct: true, outcome: 'correct', score: 1 } },
      { type: 'target_shown', trialId: 't2', targetId: 'target', timestamp: 500, context: { taskId: 'simple_rt' } },
      { type: 'target_click', trialId: 't2', targetId: 'target', timestamp: 800, context: { correct: false, outcome: 'incorrect', score: 0 } },
    ];

    const correlation = correlateSignalsWithTasks({
      taskEvents, faceSamples: [...faceSamples, ...faceSamples], pointerSamples,
    });

    expect(correlation.aggregate.byOutcome).toBeDefined();
    expect(correlation.aggregate.byOutcome.correct).toBeDefined();
    expect(correlation.aggregate.byOutcome.incorrect).toBeDefined();
    expect(correlation.aggregate.completedCount).toBe(2);
    expect(correlation.aggregate.accuracy).toBe(0.5);
  });

  it('handles empty task events gracefully', () => {
    const correlation = correlateSignalsWithTasks({ taskEvents: [], faceSamples, pointerSamples });
    expect(correlation.aggregate.trialCount).toBe(0);
    expect(correlation.aggregate.completedCount).toBe(0);
    expect(correlation.trials.length).toBe(0);
  });

  it('computes top AUs by significance across trials', () => {
    const taskEvents = [
      { type: 'target_shown', trialId: 't1', targetId: 'target', timestamp: 100, context: { taskId: 'simple_rt' } },
      { type: 'target_click', trialId: 't1', targetId: 'target', timestamp: 450, context: { correct: true } },
      { type: 'target_shown', trialId: 't2', targetId: 'target', timestamp: 500, context: { taskId: 'simple_rt' } },
      { type: 'target_click', trialId: 't2', targetId: 'target', timestamp: 850, context: { correct: true } },
    ];

    const correlation = correlateSignalsWithTasks({
      taskEvents, faceSamples: [...faceSamples, ...faceSamples], pointerSamples,
    });

    expect(correlation.aggregate.topAUs.length).toBeGreaterThan(0);
    expect(correlation.aggregate.meanSignificantAUs).toBeGreaterThanOrEqual(0);
  });
});