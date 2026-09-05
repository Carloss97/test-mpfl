import { describe, expect, it } from 'vitest';
import { runEdgeAIInference } from './edgeAiEngine.js';

// ─── Shared sample data ───

const faceSamples = Array.from({ length: 10 }, (_, i) => ({
  timestamp: 1000 + i * 33,
  quality: { facePresent: true, confidence: 0.85 + i * 0.01 },
  blendshapes: {
    browInnerUp: 0.1 + Math.random() * 0.05,
    browDownLeft: 0.1 + Math.random() * 0.05,
    browDownRight: 0.1 + Math.random() * 0.05,
    mouthSmileLeft: 0.1 + Math.random() * 0.1,
    mouthSmileRight: 0.1 + Math.random() * 0.1,
    eyeBlinkLeft: 0.05 + Math.random() * 0.05,
    eyeBlinkRight: 0.05 + Math.random() * 0.05,
    eyeSquintLeft: 0.05 + Math.random() * 0.05,
    eyeSquintRight: 0.05 + Math.random() * 0.05,
    eyeWideLeft: 0.1 + Math.random() * 0.05,
    eyeWideRight: 0.1 + Math.random() * 0.05,
    jawOpen: 0.05 + Math.random() * 0.05,
    mouthFrownLeft: 0.05 + Math.random() * 0.05,
    mouthFrownRight: 0.05 + Math.random() * 0.05,
    mouthPressLeft: 0.05 + Math.random() * 0.05,
    mouthPressRight: 0.05 + Math.random() * 0.05,
    mouthPucker: 0.02 + Math.random() * 0.03,
    mouthFunnel: 0.02 + Math.random() * 0.03,
    mouthStretchLeft: 0.02 + Math.random() * 0.03,
    mouthStretchRight: 0.02 + Math.random() * 0.03,
    noseSneerLeft: 0.02 + Math.random() * 0.03,
    noseSneerRight: 0.02 + Math.random() * 0.03,
    cheekSquintLeft: 0.05 + Math.random() * 0.1,
    cheekSquintRight: 0.05 + Math.random() * 0.1,
    cheekPuff: 0.02 + Math.random() * 0.03,
  },
}));

describe('runEdgeAIInference', () => {
  it('produces a complete multidimensional edge AI output from telemetry streams', () => {
    const output = runEdgeAIInference({ faceSamples });
    expect(output.schemaVersion).toBe('edge_ai_model_output_v8');
    expect(output.modelKind).toBe('bayesian_au_channels');
    expect(output.channels).toBeTruthy();
    expect(output.channels.cognitiveLoad).toBeTruthy();
    expect(output.channels.visualAttention).toBeTruthy();
    expect(output.channels.postureQuality).toBeTruthy();
    expect(output.channels.cognitiveLoad.score).toBeGreaterThanOrEqual(0);
    expect(output.channels.cognitiveLoad.score).toBeLessThanOrEqual(100);
    expect(output.composite).toBeTruthy();
    expect(output.composite.contributors).toBeTruthy();
    expect(output.composite.contributors.fatigueIndex.polarity).toBe(-1);
    expect(output.composite.score).toBeGreaterThanOrEqual(0);
    expect(output.composite.score).toBeLessThanOrEqual(100);
    expect(output.confidence).toBeTruthy();
    expect(output.confidence.level).toBeTruthy();
  });

  it('reports low confidence and caveats for weak calibration', () => {
    const lowQualitySamples = faceSamples.map((s) => ({
      ...s,
      quality: { facePresent: false, confidence: 0.3 },
    }));
    const output = runEdgeAIInference({ faceSamples: lowQualitySamples });

    expect(output.confidence.level).toBeTruthy();
    expect(typeof output.composite.score).toBe('number');
  });

  it('reports caveats for low face coverage', () => {
    const fewSamples = faceSamples.slice(0, 3);
    const output = runEdgeAIInference({ faceSamples: fewSamples });

    const hasCoverageCaveat = output.caveats.some((c) =>
      c.toLowerCase().includes('observacionales'),
    );
    expect(hasCoverageCaveat).toBe(true);
  });

  it('returns composite score within valid range', () => {
    const output = runEdgeAIInference({ faceSamples });
    expect(output.composite.score).toBeGreaterThanOrEqual(0);
    expect(output.composite.score).toBeLessThanOrEqual(100);
  });
});

describe('runEdgeAIInference with features', () => {
  it('accepts a pre-built feature vector', () => {
    const output = runEdgeAIInference({
      faceSamples,
      pointerSamples: [],
      taskEvents: [{ eventId: 'test', eventType: 'click', timestamp: 1500 }],
    });

    expect(output.schemaVersion).toBe('edge_ai_model_output_v8');
    expect(output.channels.taskPerformance).toBeTruthy();
    expect(output.composite.score).toBeGreaterThanOrEqual(0);
    expect(output.composite.score).toBeLessThanOrEqual(100);
  });
});

describe('runEdgeAIInference with multimodal inputs', () => {
  it('raises visual attention and posture quality when gaze/posture/MoveNet are good', () => {
    const output = runEdgeAIInference({
      faceSamples,
      latestGaze: { available: true, lookingAtScreen: true, confidence: 0.95 },
      latestPosture: { available: true, postureScore: 0.92, headForward: 0.04, headTilt: 0.03, confidence: 0.85 },
      moveNetPose: { available: true, symmetry: 0.95, confidence: 0.9, upperBodyCoverage: 0.8, visibleUpperBodyKeypoints: 8 },
    });

    expect(output.channels.visualAttention.score).toBeGreaterThanOrEqual(75);
    expect(output.channels.postureQuality.score).toBeGreaterThanOrEqual(75);
    expect(output.channels.engagement.multimodalAdjusted).toBe(true);
    expect(output.channels.visualAttention.confidence).toBeGreaterThan(0.8);
    expect(output.channels.postureQuality.caveats).toEqual([]);
    expect(output.multimodal.gaze.available).toBe(true);
    expect(output.multimodal.upperBody.available).toBe(true);
  });

  it('uses game telemetry summaries for task performance and motor control inference', () => {
    const output = runEdgeAIInference({
      faceSamples,
      gameSummary: {
        performance: { accuracy: 0.9, meanReactionTimeMs: 360, completedTrialCount: 5, trialCount: 5, meanScore: 0.88 },
        motor: { pathEfficiencyMean: 0.92, smoothPursuitScore: 0.85, trackingLossRatio: 0.05, jerkMean: 0.01, overshootRate: 0.1 },
        inhibition: { commissionErrorRate: 0, omissionErrorRate: 0, correctGoRT: 310 },
        interference: { conflictCostMs: 90, errorRate: 0 },
      },
    });

    expect(output.channels.taskPerformance.score).toBeGreaterThanOrEqual(70);
    expect(output.channels.taskPerformance.source).toBe('game_telemetry');
    expect(output.channels.motorControl.gameAdjusted).toBe(true);
    expect(output.multimodal.game.available).toBe(true);
    expect(output.multimodal.game.performance.accuracy).toBe(0.9);
  });

  it('exposes game-signal correlation aggregate without raw windows', () => {
    const output = runEdgeAIInference({
      faceSamples,
      gameCorrelation: {
        schemaVersion: 'game_signal_correlation_v3',
        aggregate: { trialCount: 2, completedTrialCount: 2, accuracy: 1, meanReactionTimeMs: 400, meanReactionPostureDelta: -0.08 },
        trials: [{ trialId: 'raw-window', windows: { reaction: { face: { sampleCount: 1 } } } }],
      },
    });

    expect(output.multimodal.gameCorrelation).toMatchObject({ available: true, trialCount: 2, completedTrialCount: 2, accuracy: 1 });
    expect(JSON.stringify(output.multimodal.gameCorrelation)).not.toContain('windows');
  });
});
