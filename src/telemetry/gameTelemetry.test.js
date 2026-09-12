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

  it('summarizes rich game telemetry for inference without raw samples', () => {
    const events = [
      normalizeGameEvent({ timestamp: 0, gameId: 'precision_targeting', trialId: 'p-1', eventType: 'stimulus_shown' }),
      normalizeGameEvent({
        timestamp: 420, gameId: 'precision_targeting', trialId: 'p-1', eventType: 'response',
        response: {
          correct: true, outcome: 'hit', reactionTimeMs: 420, score: 1,
          fitts: { indexDifficulty: 2.5, throughput: 5.95 },
          pointerSummary: { pathEfficiency: 0.82, meanJerkPxPerMs3: 0.02, correctionCount: 2, overshootCount: 1, clickDistanceToTargetPx: 4, samples: [{ x: 1, y: 1 }] },
        },
      }),
      normalizeGameEvent({
        timestamp: 900, gameId: 'go_nogo', trialId: 'g-1', eventType: 'response',
        response: { correct: false, outcome: 'commission_error', reactionTimeMs: 180, score: 0, inhibition: { cue: 'NO-GO', responseRequired: false } },
      }),
      normalizeGameEvent({
        timestamp: 1300, gameId: 'color_interference', trialId: 'c-1', eventType: 'response',
        response: { correct: true, outcome: 'correct', reactionTimeMs: 380, score: 1, interference: { congruent: false, expectedResponse: 'green' } },
      }),
      normalizeGameEvent({
        timestamp: 1700, gameId: 'pursuit_tracking', trialId: 't-1', eventType: 'response',
        response: { correct: true, outcome: 'tracked', reactionTimeMs: 1000, score: 0.75, tracking: { rmsErrorPx: 12, lossRatio: 0.1, smoothPursuitScore: 0.8, samples: [{ x: 1 }] } },
      }),
      normalizeGameEvent({
        timestamp: 2100, gameId: 'visual_search', trialId: 'v-1', eventType: 'response',
        response: { correct: true, outcome: 'target_found', reactionTimeMs: 700, score: 1, visualSearch: { setSize: 12, distractorCount: 11, clickDistanceToTargetPx: 3, searchEfficiency: 0.76, items: [{ id: 'raw' }] } },
      }),
    ];

    const summary = summarizeGameEvents(events);

    expect(summary.performance).toMatchObject({ accuracy: 0.8, completedTrialCount: 5, meanScore: 0.75 });
    expect(summary.motor).toMatchObject({ pathEfficiencyMean: 0.82, correctionRate: 2, overshootRate: 1, trackingRmsErrorPx: 12, smoothPursuitScore: 0.8 });
    expect(summary.inhibition).toMatchObject({ commissionErrorRate: 1, omissionErrorRate: 0 });
    expect(summary.interference).toMatchObject({ incongruentAccuracy: 1, errorRate: 0 });
    expect(summary.fitts).toMatchObject({ meanIndexDifficulty: 2.5, meanThroughput: 5.95 });
    expect(summary.visualSearch).toMatchObject({ meanSetSize: 12, meanDistractorCount: 11, searchEfficiency: 0.76, meanClickDistanceToTargetPx: 3 });
    expect(JSON.stringify(summary)).not.toContain('samples');
    expect(JSON.stringify(summary)).not.toContain('items');
  });

  it('aggregates per-response postErrorSlowingMs into the inhibition summary (FASE B.3 GNP-P2-2)', () => {
    const events = [
      normalizeGameEvent({
        timestamp: 100, gameId: 'go_nogo', trialId: 'g-1', eventType: 'response',
        response: { correct: true, outcome: 'correct_go', reactionTimeMs: 300, score: 1, inhibition: { cue: 'GO', responseRequired: true } },
      }),
      normalizeGameEvent({
        timestamp: 500, gameId: 'go_nogo', trialId: 'g-2', eventType: 'response',
        response: { correct: false, outcome: 'commission_error', reactionTimeMs: 180, score: 0, inhibition: { cue: 'NO-GO', responseRequired: false } },
      }),
      normalizeGameEvent({
        timestamp: 900, gameId: 'go_nogo', trialId: 'g-3', eventType: 'response',
        response: { correct: true, outcome: 'correct_go', reactionTimeMs: 340, score: 1, postErrorSlowingMs: 40, inhibition: { cue: 'GO', responseRequired: true } },
      }),
    ];

    const summary = summarizeGameEvents(events);
    expect(summary.inhibition).toMatchObject({
      commissionErrorRate: 1,
      omissionErrorRate: 0,
      correctGoRT: 320,
      postErrorSlowingMs: 40,
    });
  });

  it('aggregates the neutral Stroop condition and computes conflict cost vs neutral (FASE B.4 CIP-P1-1/P2-2)', () => {
    const events = [
      normalizeGameEvent({
        timestamp: 100, gameId: 'color_interference', trialId: 'c-1', eventType: 'response',
        response: { correct: true, outcome: 'correct', reactionTimeMs: 200, score: 1, interference: { condition: 'congruent', congruent: true, ink: 'red', expectedResponse: 'red' } },
      }),
      normalizeGameEvent({
        timestamp: 500, gameId: 'color_interference', trialId: 'c-2', eventType: 'response',
        response: { correct: true, outcome: 'correct', reactionTimeMs: 320, score: 1, interference: { condition: 'incongruent', congruent: false, ink: 'green', expectedResponse: 'green' } },
      }),
      normalizeGameEvent({
        timestamp: 900, gameId: 'color_interference', trialId: 'c-3', eventType: 'response',
        response: { correct: true, outcome: 'correct', reactionTimeMs: 250, score: 1, interference: { condition: 'neutral', congruent: null, ink: 'blue', expectedResponse: 'blue' } },
      }),
    ];

    const summary = summarizeGameEvents(events);
    expect(summary.interference).toMatchObject({
      congruentAccuracy: 1,
      incongruentAccuracy: 1,
      neutralAccuracy: 1,
      congruentRT: 200,
      incongruentRT: 320,
      neutralRT: 250,
      // Stroop clásico: costo = RT incongruente − RT neutral (no − congruente).
      conflictCostMs: 70,
      errorRate: 0,
    });
  });

  it('keeps conflictCostMs non-negative when a condition has no correct RT (FASE B.4 CIP-P3-7) and classifies legacy boolean payloads', () => {
    const events = [
      normalizeGameEvent({
        timestamp: 100, gameId: 'color_interference', trialId: 'c-1', eventType: 'response',
        response: { correct: true, outcome: 'correct', reactionTimeMs: 200, score: 1, interference: { condition: 'congruent', congruent: true, ink: 'red', expectedResponse: 'red' } },
      }),
      normalizeGameEvent({
        timestamp: 500, gameId: 'color_interference', trialId: 'c-2', eventType: 'response',
        response: { correct: false, outcome: 'incorrect', reactionTimeMs: 380, score: 0, interference: { condition: 'incongruent', congruent: false, ink: 'green', expectedResponse: 'green' } },
      }),
      normalizeGameEvent({
        timestamp: 900, gameId: 'color_interference', trialId: 'c-3', eventType: 'response',
        response: { correct: true, outcome: 'correct', reactionTimeMs: 250, score: 1, interference: { condition: 'neutral', congruent: null, ink: 'blue', expectedResponse: 'blue' } },
      }),
      // Payload legado (solo booleano `congruent`, sin `condition`): sigue
      // clasificándose por el booleano (backward compat con eventos viejos).
      normalizeGameEvent({
        timestamp: 1300, gameId: 'color_interference', trialId: 'c-4', eventType: 'response',
        response: { correct: true, outcome: 'correct', reactionTimeMs: 310, score: 1, interference: { congruent: false, expectedResponse: 'green' } },
      }),
    ];

    const summary = summarizeGameEvents(events);
    // Sin RT de acierto incongruente (legacy c-4 cuenta: 310) → con la legacy,
    // sí hay incongruente correcta; se prueba el guard con neutral ausente:
    expect(summary.interference.conflictCostMs).toBeGreaterThanOrEqual(0);
    expect(summary.interference.incongruentRT).toBe(310);
    expect(summary.interference.incongruentAccuracy).toBe(0.5);

    const noNeutral = summarizeGameEvents([
      normalizeGameEvent({
        timestamp: 100, gameId: 'color_interference', trialId: 'n-1', eventType: 'response',
        response: { correct: true, outcome: 'correct', reactionTimeMs: 320, score: 1, interference: { condition: 'incongruent', congruent: false, ink: 'green', expectedResponse: 'green' } },
      }),
      normalizeGameEvent({
        timestamp: 200, gameId: 'color_interference', trialId: 'n-2', eventType: 'response',
        response: { correct: true, outcome: 'correct', reactionTimeMs: 200, score: 1, interference: { condition: 'congruent', congruent: true, ink: 'red', expectedResponse: 'red' } },
      }),
    ]);
    // Sin condición neutral: no hay baseline → costo 0 (antes: negativo).
    expect(noNeutral.interference.conflictCostMs).toBe(0);
    expect(noNeutral.interference.neutralRT).toBe(0);
  });

  it('counts measurable kinematics responses in the motor aggregate (touch vs mouse)', () => {
    const events = [
      normalizeGameEvent({
        timestamp: 100, gameId: 'precision_targeting', trialId: 'p-1', eventType: 'response',
        response: { correct: true, outcome: 'hit', reactionTimeMs: 420, score: 1, pointerSummary: { pathEfficiency: 1, sampleCount: 2 } },
      }),
      normalizeGameEvent({
        timestamp: 500, gameId: 'precision_targeting', trialId: 'p-2', eventType: 'response',
        response: { correct: true, outcome: 'hit', reactionTimeMs: 400, score: 1, pointerSummary: { pathEfficiency: 0.9, sampleCount: 40 } },
      }),
      normalizeGameEvent({
        timestamp: 900, gameId: 'simple_rt', trialId: 's-1', eventType: 'response',
        response: { correct: true, outcome: 'hit', reactionTimeMs: 380, score: 1, pointerSummary: { pathEfficiency: 0.8 } },
      }),
    ];

    const summary = summarizeGameEvents(events);

    // Two responses carry pointerSummary with sampleCount (one touch-degenerate,
    // one measurable) plus one legacy summary without sampleCount (treated as
    // unknown, not flagged).
    expect(summary.motor.kinematicsResponseCount).toBe(3);
    expect(summary.motor.kinematicsMeasuredCount).toBe(2);
  });
});
