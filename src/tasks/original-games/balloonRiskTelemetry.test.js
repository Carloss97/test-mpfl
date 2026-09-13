import { describe, expect, it } from 'vitest';
import {
  buildBalloonResponseAggregate,
  buildBalloonRiskRounds,
  getBalloonRiskLayoutMetrics,
  sanitizeBalloonResponsePayload,
} from './balloonRiskTelemetry.js';

describe('balloon risk postulation telemetry helpers', () => {
  it('builds deterministic round thresholds for short postulation demos', () => {
    const rounds = buildBalloonRiskRounds({ count: 4 });
    expect(rounds).toHaveLength(4);
    expect(rounds.map((round) => round.threshold)).toEqual([7, 10, 8, 12]);
    expect(rounds.every((round) => round.roundId.startsWith('balloon-risk-'))).toBe(true);
  });

  it('computes compact layout metrics without fixed 600px body requirements', () => {
    const compact = getBalloonRiskLayoutMetrics({ width: 606, height: 338 });
    expect(compact.containerMinHeight).toBe(0);
    expect(compact.maxBalloonScale).toBeLessThanOrEqual(2.1);
    expect(compact.controlsGap).toBeLessThanOrEqual(10);
  });

  it('summarizes risk/reward as aggregate-only fields', () => {
    const aggregate = buildBalloonResponseAggregate({
      roundsCompleted: 4,
      totalRounds: 4,
      pumpCounts: [4, 5, 8, 3],
      cashoutCount: 3,
      popCount: 1,
      totalScore: 120,
      postPopAdjustments: [-3],
      timeMs: 55_000,
    });

    expect(aggregate).toMatchObject({
      completed: true,
      roundsCompleted: 4,
      averagePumps: 5,
      cashoutCount: 3,
      popCount: 1,
      postPopAdjustment: -3,
      aggregateOnly: true,
    });
    expect(aggregate.score).toBe(aggregate.riskEfficiency);
    expect(aggregate.score).toBeGreaterThanOrEqual(0);
    expect(aggregate.score).toBeLessThanOrEqual(1);
    expect(JSON.stringify(aggregate)).not.toMatch(/rawGameEvents|clickTrace|pointerSamples|pumpSequence/i);
  });

  it('clamps riskEfficiency to [0,1] when the 8-round true max exceeds the nominal denominator (B.6)', () => {
    // Máximo alcanzable con 8 rondas = Σ (threshold - 1) * pointValue
    // = 60+108+98+110+96+140+120+84 = 816 > 8*100 (denominador nominal).
    // Un jugador óptimo (0 pops) NO debe invalidar el bloque aguas abajo
    // (validRatio [0,1] en originalGameFeatureVector).
    const aggregate = buildBalloonResponseAggregate({
      roundsCompleted: 8,
      totalRounds: 8,
      pumpCounts: [6, 9, 7, 11, 8, 10, 12, 7],
      cashoutCount: 8,
      popCount: 0,
      totalScore: 816,
      postPopAdjustments: [],
      timeMs: 90_000,
    });

    expect(aggregate.completed).toBe(true);
    expect(aggregate.riskEfficiency).toBeLessThanOrEqual(1);
    expect(aggregate.score).toBeLessThanOrEqual(1);
  });

  it('sanitizes response payload and strips reconstructive pump/click traces', () => {
    const payload = sanitizeBalloonResponsePayload({
      correct: true,
      outcome: 'cashout',
      reactionTimeMs: 3000,
      score: 0.77,
      balloonRisk: {
        roundsCompleted: 2,
        averagePumps: 5.5,
        cashoutCount: 1,
        popCount: 1,
        pumpSequence: [1, 2, 3, 4],
        rawGameEvents: [{ event: 'pump' }],
        clickTrace: [{ t: 1 }],
      },
    });

    expect(payload).toEqual({
      correct: true,
      outcome: 'cashout',
      reactionTimeMs: 3000,
      score: 0.77,
      balloonRisk: {
        roundsCompleted: 2,
        averagePumps: 5.5,
        cashoutCount: 1,
        popCount: 1,
      },
    });
  });
});
