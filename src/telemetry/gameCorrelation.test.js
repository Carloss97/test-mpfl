import { describe, expect, it } from 'vitest';
import { correlateGameWithMultimodalSignals, summarizeSignalWindow } from './gameCorrelation.js';

const faceSamples = [
  { timestamp: 700, quality: { facePresent: true, confidence: 0.7 }, blendshapes: { browDownLeft: 0.02, browDownRight: 0.02, eyeBlinkLeft: 0.02, eyeBlinkRight: 0.02 } },
  { timestamp: 900, quality: { facePresent: true, confidence: 0.8 }, blendshapes: { browDownLeft: 0.03, browDownRight: 0.03, eyeBlinkLeft: 0.02, eyeBlinkRight: 0.02 } },
  { timestamp: 1050, quality: { facePresent: true, confidence: 0.86 }, blendshapes: { browDownLeft: 0.2, browDownRight: 0.22, eyeBlinkLeft: 0.03, eyeBlinkRight: 0.03 } },
  { timestamp: 1250, quality: { facePresent: true, confidence: 0.9 }, blendshapes: { browDownLeft: 0.25, browDownRight: 0.24, eyeBlinkLeft: 0.04, eyeBlinkRight: 0.04 } },
  { timestamp: 1550, quality: { facePresent: true, confidence: 0.82 }, blendshapes: { browDownLeft: 0.08, browDownRight: 0.08, eyeBlinkLeft: 0.05, eyeBlinkRight: 0.05 } },
  { timestamp: 2300, quality: { facePresent: true, confidence: 0.78 }, blendshapes: { browDownLeft: 0.04, browDownRight: 0.04, eyeBlinkLeft: 0.03, eyeBlinkRight: 0.03 } },
];

const pointerSamples = [
  { timestamp: 1000, x: 100, y: 100 },
  { timestamp: 1120, x: 180, y: 130 },
  { timestamp: 1300, x: 250, y: 140 },
  { timestamp: 1800, x: 260, y: 150 },
];

const gameEvents = [
  { type: 'game_event_v1', eventType: 'game_start', timestamp: 500, gameId: 'visual_search', trialId: null },
  { type: 'game_event_v1', eventType: 'stimulus_shown', timestamp: 1000, gameId: 'visual_search', trialId: 'vs-1', targetId: 'target-1', stimulus: { kind: 'visual_search_array', payload: { setSize: 12, distractorCount: 11, items: [{ id: 'raw' }] } } },
  { type: 'game_event_v1', eventType: 'response', timestamp: 1320, gameId: 'visual_search', trialId: 'vs-1', targetId: 'target-1', response: { correct: true, outcome: 'target_found', reactionTimeMs: 320, score: 1, visualSearch: { setSize: 12, distractorCount: 11, searchEfficiency: 1.9, items: [{ id: 'raw' }] } } },
];

const gazeSamples = [
  { timestamp: 900, lookingAtScreen: true, confidence: 0.9, screenX: 0.5, screenY: 0.5 },
  { timestamp: 1120, lookingAtScreen: true, confidence: 0.8, screenX: 0.54, screenY: 0.51 },
  { timestamp: 1500, lookingAtScreen: false, confidence: 0.4, screenX: 0.9, screenY: 0.2 },
];

const postureSamples = [
  { timestamp: 900, postureScore: 0.9, headForward: 0.05, confidence: 0.8 },
  { timestamp: 1200, postureScore: 0.75, headForward: 0.2, confidence: 0.8 },
  { timestamp: 1700, postureScore: 0.7, headForward: 0.3, confidence: 0.7 },
];

const upperBodySamples = [
  { timestamp: 900, confidence: 0.8, armActivity: 0.1, upperBodyCoverage: 0.6 },
  { timestamp: 1200, confidence: 0.85, armActivity: 0.4, upperBodyCoverage: 0.8 },
];

describe('gameCorrelation v3', () => {
  it('summarizes signal windows without raw samples', () => {
    const summary = summarizeSignalWindow({
      from: 800,
      to: 1300,
      faceSamples,
      pointerSamples,
      gazeSamples,
      postureSamples,
      upperBodySamples,
    });

    expect(summary.face.sampleCount).toBeGreaterThan(0);
    expect(summary.face.meanConfidence).toBeGreaterThan(0);
    expect(summary.pointer.sampleCount).toBeGreaterThan(0);
    expect(summary.gaze.lookingAtScreenRatio).toBeGreaterThan(0);
    expect(summary.posture.meanPostureScore).toBeGreaterThan(0);
    expect(summary.upperBody.meanArmActivity).toBeGreaterThan(0);
    expect(JSON.stringify(summary)).not.toContain('blendshapes');
    expect(JSON.stringify(summary)).not.toContain('landmarks');
    expect(JSON.stringify(summary)).not.toContain('items');
  });

  it('builds pre/reaction/post/recovery windows for each completed game trial', () => {
    const correlation = correlateGameWithMultimodalSignals({
      gameEvents,
      faceSamples,
      pointerSamples,
      gazeSamples,
      postureSamples,
      upperBodySamples,
    });

    expect(correlation.schemaVersion).toBe('game_signal_correlation_v3');
    expect(correlation.aggregate).toMatchObject({ trialCount: 1, completedTrialCount: 1, accuracy: 1 });
    expect(correlation.trials).toHaveLength(1);
    const trial = correlation.trials[0];
    expect(trial).toMatchObject({ trialId: 'vs-1', gameId: 'visual_search', outcome: 'target_found', reactionTimeMs: 320 });
    expect(Object.keys(trial.windows)).toEqual(['preTrial', 'reaction', 'postResponse', 'recovery']);
    expect(trial.windows.preTrial.range).toMatchObject({ from: 700, to: 1000 });
    expect(trial.windows.reaction.range).toMatchObject({ from: 1000, to: 1320 });
    expect(trial.deltas.reactionVsPre.facePresenceDelta).toBeGreaterThanOrEqual(-1);
    expect(trial.deltas.postVsPre.postureScoreDelta).toBeLessThanOrEqual(1);
    expect(JSON.stringify(correlation)).not.toContain('items');
    expect(JSON.stringify(correlation)).not.toContain('blendshapes');
  });

  it('handles incomplete trials without fabricating response windows', () => {
    const correlation = correlateGameWithMultimodalSignals({
      gameEvents: [gameEvents[1]],
      faceSamples,
      pointerSamples,
    });

    expect(correlation.aggregate.trialCount).toBe(1);
    expect(correlation.aggregate.completedTrialCount).toBe(0);
    expect(correlation.trials[0].completedAt).toBe(null);
    expect(correlation.trials[0].outcome).toBe('incomplete');
  });
});
