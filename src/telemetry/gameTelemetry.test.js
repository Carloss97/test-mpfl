import { describe, expect, it } from 'vitest';
import {
  GAME_EVENT_TYPE,
  createGameTelemetrySession,
  normalizeGameEvent,
  appendGameEvent,
  summarizeGameEvents,
} from './gameTelemetry.js';

describe('gameTelemetry v1', () => {
  it('creates a telemetry session with stable identity and privacy defaults', () => {
    const session = createGameTelemetrySession({ sessionId: 's-1', gameId: 'simple_rt', startedAt: 100 });

    expect(session).toMatchObject({
      schemaVersion: 'game_telemetry_session_v1',
      sessionId: 's-1',
      gameId: 'simple_rt',
      startedAt: 100,
      privacy: { rawPointerPathStored: false, rawVideoStored: false, rawFramesStored: false, landmarksStored: false },
    });
  });

  it('normalizes a new game event without retaining raw pointer paths', () => {
    const event = normalizeGameEvent({
      timestamp: 120,
      sessionId: 's-1',
      gameId: 'precision_targeting',
      trialId: 't-1',
      eventType: 'pointer_move',
      pointer: { x: 10.1234, y: 20.5678, button: 0, pressure: 0.5, rawPath: [{ x: 1, y: 1 }] },
      gameState: { score: 2, level: 1, difficulty: 0.4, combo: 1 },
    });

    expect(event.type).toBe(GAME_EVENT_TYPE);
    expect(event.pointer).toEqual({ x: 10.12, y: 20.57, button: 0, pressure: 0.5 });
    expect(JSON.stringify(event)).not.toContain('rawPath');
    expect(event.privacy.rawPointer).toBe(false);
  });

  it('normalizes legacy SimpleRT shown/click events into game_event_v1', () => {
    const shown = normalizeGameEvent({
      type: 'target_shown', trialId: 'rt-1', targetId: 'rt-circle', timestamp: 200,
      context: { taskId: 'simple_rt', taskLabel: 'RT Simple', trial: 1, position: { x: 100, y: 80 } },
    }, { sessionId: 's-legacy' });
    const clicked = normalizeGameEvent({
      type: 'target_click', trialId: 'rt-1', targetId: 'rt-circle', timestamp: 450,
      reactionTimeMs: 250, correct: true, clickPosition: { x: 103, y: 84 },
      context: { taskId: 'simple_rt', outcome: 'correct', score: 1 },
    }, { sessionId: 's-legacy' });

    expect(shown).toMatchObject({ type: GAME_EVENT_TYPE, eventType: 'stimulus_shown', gameId: 'simple_rt', trialId: 'rt-1' });
    expect(shown.stimulus.payload.position).toEqual({ x: 100, y: 80 });
    expect(clicked).toMatchObject({ type: GAME_EVENT_TYPE, eventType: 'response', gameId: 'simple_rt', trialId: 'rt-1' });
    expect(clicked.response).toMatchObject({ correct: true, outcome: 'correct', reactionTimeMs: 250, score: 1 });
    expect(clicked.pointer).toEqual({ x: 103, y: 84 });
  });

  it('appends events immutably and summarizes privacy-safe aggregates', () => {
    const events = [];
    const withShown = appendGameEvent(events, { type: 'target_shown', trialId: 'rt-1', targetId: 'rt-circle', timestamp: 100, context: { taskId: 'simple_rt' } }, { sessionId: 's-1' });
    const withResponse = appendGameEvent(withShown, { type: 'target_click', trialId: 'rt-1', targetId: 'rt-circle', timestamp: 320, reactionTimeMs: 220, correct: true, clickPosition: { x: 10, y: 12 }, context: { taskId: 'simple_rt', outcome: 'correct', score: 1 } }, { sessionId: 's-1' });
    const summary = summarizeGameEvents(withResponse);

    expect(events).toHaveLength(0);
    expect(withResponse).toHaveLength(2);
    expect(summary).toMatchObject({
      schemaVersion: 'game_telemetry_summary_v1',
      eventCount: 2,
      trialCount: 1,
      completedTrialCount: 1,
      accuracy: 1,
      meanReactionTimeMs: 220,
      byEventType: { stimulus_shown: 1, response: 1 },
      privacy: { containsRawPointerPath: false, containsRawVideo: false, containsLandmarks: false },
    });
    expect(JSON.stringify(summary)).not.toContain('clickPosition');
    expect(JSON.stringify(summary)).not.toContain('pointerSamples');
  });
});
