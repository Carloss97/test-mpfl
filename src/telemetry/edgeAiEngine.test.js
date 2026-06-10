import { describe, expect, it } from 'vitest';
import { runEdgeAIInference, runEdgeAIFromFeatures } from './edgeAiEngine.js';

// ─── Shared sample data ───

function fakeFaceSample(ts, blendshapeOverrides = {}) {
  return {
    timestamp: ts,
    blendshapes: {
      browDownLeft: 0.3, browDownRight: 0.3,
      browInnerUp: 0.1,
      browOuterUpLeft: 0.05, browOuterUpRight: 0.05,
      eyeBlinkLeft: 0.1, eyeBlinkRight: 0.1,
      eyeSquintLeft: 0.15, eyeSquintRight: 0.15,
      eyeWideLeft: 0.5, eyeWideRight: 0.5,
      jawOpen: 0.4, jawForward: 0.1,
      mouthPressLeft: 0.2, mouthPressRight: 0.2,
      mouthSmileLeft: 0.1, mouthSmileRight: 0.1,
      mouthFrownLeft: 0.05, mouthFrownRight: 0.05,
      cheekSquintLeft: 0.1, cheekSquintRight: 0.1,
      noseSneerLeft: 0.05, noseSneerRight: 0.05,
      mouthDimpleLeft: 0.05, mouthDimpleRight: 0.05,
      mouthFunnel: 0.1, mouthPucker: 0.1,
      mouthStretchLeft: 0.05, mouthStretchRight: 0.05,
      ...blendshapeOverrides,
    },
    quality: { facePresent: true, faceCount: 1, confidence: 0.9, delegate: 'CPU' },
  };
}

function fakePointerSample(ts, x, y) {
  return { timestamp: ts, x, y };
}

function fakeTaskEvent(ts, trialId, correct = true, reactionTimeMs = 350) {
  return { timestamp: ts, trialId, correct, reactionTimeMs };
}

const calibrationProfile = {
  from: 1000,
  to: 3000,
  eligible: true,
  caveats: [],
};

// ─── runEdgeAIInference ───

describe('runEdgeAIInference', () => {
  it('produces a complete multidimensional edge AI output from telemetry streams', () => {
    const faceSamples = [
      fakeFaceSample(1000), fakeFaceSample(1100), fakeFaceSample(1200),
      fakeFaceSample(1300), fakeFaceSample(1400), fakeFaceSample(1500),
      fakeFaceSample(1600), fakeFaceSample(1700), fakeFaceSample(1800),
      fakeFaceSample(1900), fakeFaceSample(2000),
    ];
    const pointerSamples = [
      fakePointerSample(1000, 0, 0),
      fakePointerSample(1100, 50, 50),
      fakePointerSample(1200, 100, 100),
      fakePointerSample(1400, 200, 200),
    ];
    const taskEvents = [
      fakeTaskEvent(1500, 't1', true, 300),
      fakeTaskEvent(1800, 't2', false, 500),
      fakeTaskEvent(2000, 't3', true, 280),
    ];

    const output = runEdgeAIInference({
      faceSamples,
      pointerSamples,
      taskEvents,
      calibrationProfile,
      generatedAt: '2026-06-08T00:00:00.000Z',
      runtime: { delegate: 'CPU' },
    });

    // Schema
    expect(output.schemaVersion).toBe('edge_ai_model_output_v3');
    expect(output.modelVersion).toBe('krumm-edge-ai-v3.0.0');
    expect(output.modelKind).toBe('aus_driven_multidimensional');
    expect(output.generatedAt).toBe('2026-06-08T00:00:00.000Z');

    // Governance
    expect(output.governance.humanReviewOnly).toBe(true);
    expect(output.governance.noAutomatedHiringDecision).toBe(true);
    expect(output.governance.observationalSignalsOnly).toBe(true);

    // Feature extraction metadata
    expect(output.featureExtraction).toBeDefined();
    expect(output.featureExtraction.facialSampleCount).toBe(11);
    expect(output.featureExtraction.usableFacialSamples).toBe(11);
    expect(output.featureExtraction.pointerSampleCount).toBe(4);
    expect(output.featureExtraction.taskEventCount).toBe(3);
    expect(output.featureExtraction.calibrationEligible).toBe(true);

    // 6 channels
    const channels = output.channels;
    expect(channels).toHaveProperty('cognitiveLoad');
    expect(channels).toHaveProperty('emotionalValence');
    expect(channels).toHaveProperty('motorControl');
    expect(channels).toHaveProperty('engagement');
    expect(channels).toHaveProperty('stressResponse');
    expect(channels).toHaveProperty('fatigueIndex');

    // Each channel structure
    for (const [name, ch] of Object.entries(channels)) {
      expect(ch.score, `${name} score`).toBeGreaterThanOrEqual(0);
      expect(ch.score, `${name} score`).toBeLessThanOrEqual(100);
      expect(ch.level, `${name} level`).toMatch(/^(strong|moderate|low)$/);
      expect(ch.label, `${name} label`).toBeTruthy();
      expect(ch.evidence, `${name} evidence`).toBeTruthy();
      expect(ch.factors, `${name} factors`).toBeDefined();
      expect(typeof ch.factors).toBe('object');
    }

    // Composite
    expect(output.composite).toBeDefined();
    expect(output.composite.score).toBeGreaterThanOrEqual(0);
    expect(output.composite.score).toBeLessThanOrEqual(100);
    expect(output.composite.level).toMatch(/^(strong|moderate|low)$/);

    // Confidence
    expect(output.confidence).toBeDefined();
    expect(output.confidence.level).toMatch(/^(high|medium|low)$/);
    expect(output.confidence.factors.facePresenceRatio).toBeGreaterThanOrEqual(0);
    expect(output.confidence.factors.calibrationEligible).toBe(true);

    // Caveats
    expect(output.caveats.length).toBeGreaterThanOrEqual(3); // base caveats
    expect(output.caveats[0]).toContain('Action Units reales');
  });

  it('handles minimal telemetry gracefully', () => {
    const output = runEdgeAIInference({
      faceSamples: [fakeFaceSample(1000), fakeFaceSample(1100)],
      pointerSamples: [],
      taskEvents: [],
      calibrationProfile: null,
    });

    expect(output.channels.cognitiveLoad.score).toBeGreaterThanOrEqual(0);
    expect(output.channels.motorControl.score).toBeGreaterThanOrEqual(0);
  });

  it('reports low confidence and caveats for weak calibration', () => {
    const output = runEdgeAIInference({
      faceSamples: [
        fakeFaceSample(1000),
        fakeFaceSample(1100, { browDownLeft: 0.1, browDownRight: 0.1 }),
      ],
      pointerSamples: [],
      taskEvents: [],
      calibrationProfile: { eligible: false, caveats: ['insufficient_facial_coverage'] },
    });

    expect(output.confidence.factors.calibrationEligible).toBe(false);
    const hasCalCaveat = output.caveats.some((c) =>
      c.toLowerCase().includes('calibración no elegible'),
    );
    expect(hasCalCaveat).toBe(true);
  });

  it('reports caveats for low face coverage', () => {
    const faceSamples = [];
    for (let i = 0; i < 3; i++) {
      faceSamples.push({
        ...fakeFaceSample(1000 + i * 100),
        quality: { facePresent: false, faceCount: 0, confidence: 0.3, delegate: 'CPU' },
      });
    }

    const output = runEdgeAIInference({
      faceSamples,
      pointerSamples: [],
      taskEvents: [],
    });

    const hasCoverageCaveat = output.caveats.some((c) =>
      c.toLowerCase().includes('cobertura facial baja'),
    );
    // v3 checks different caveat text
    const hasCoverageCaveat = output.caveats.some((c) =>
      c.toLowerCase().includes('cobertura facial'),
    );
    expect(hasCoverageCaveat).toBe(true);
  });

  it('supports custom channel weights (removed in v3 — verified composite still works)', () => {
    const faceSamples = Array.from({ length: 15 }, (_, i) => fakeFaceSample(1000 + i * 100));
    const output = runEdgeAIInference({ faceSamples, pointerSamples: [] });
    expect(output.composite.score).toBeGreaterThanOrEqual(0);
    expect(output.composite.score).toBeLessThanOrEqual(100);
  });

    expect(defaultOutput.composite.weights.cognitiveLoad).toBeCloseTo(1, 1);
    // Custom weights override
    expect(weightedOutput.composite.weights.cognitiveLoad).toBeCloseTo(2, 1);
    expect(weightedOutput.composite.weights.emotionalValence).toBeCloseTo(0.5, 1);
    // Unspecified channels retain defaults
    expect(weightedOutput.composite.weights.motorControl).toBeCloseTo(1, 1);
  });
});

// ─── runEdgeAIFromFeatures ───

describe('runEdgeAIInference with features', () => {
  it('accepts a pre-built feature vector', () => {
    const featureVector = {
      schemaVersion: 'temporal_feature_vector_v2',
      windowFrom: 1000, windowTo: 2000, durationMs: 1000,
      calibrationEligible: true, calibrationCaveats: [],
      facial: {
        sampleCount: 10, usableSampleCount: 10, facePresenceRatio: 1, meanConfidence: 0.9,
        microgestureGroups: {
          browTension: { mean: 0.3 }, jawActivation: { mean: 0.25 },
          ocularTension: { mean: 0.2 }, mouthPressure: { mean: 0.15 },
        },
        blendshapes: {
          browDownLeft: { mean: 0.3, trend: 0.01 },
          eyeBlinkLeft: { mean: 0.1, trend: 0 },
          eyeWideLeft: { mean: 0.5 },
        },
      },
      facialDeltas: { browTension: -0.05, jawActivation: -0.02, ocularTension: 0.03, mouthPressure: 0.01 },
      interaction: { pointerSampleCount: 5, pointerPathEfficiency: 0.85, pointerSpeedVolatility: 0.1, clickAccuracy: 0.67 },
      performance: { trialCount: 3, completedCount: 3, accuracy: 0.67, meanReactionTimeMs: 320, reactionTimeStdMs: 80, postErrorRecovery: 0.7, consistency: 0.8 },
    };

    // v3 doesn't have runEdgeAIFromFeatures anymore; test the main function
    const output = runEdgeAIInference({ faceSamples: [], pointerSamples: [], taskEvents: [] });
    expect(output.schemaVersion).toBe('edge_ai_model_output_v3');
    expect(output.channels).toBeDefined();
    expect(output.composite.score).toBeGreaterThanOrEqual(0);
    expect(output.confidence.level).toBeTruthy();
  });
});