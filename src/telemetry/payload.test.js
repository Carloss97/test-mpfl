import { describe, expect, it } from 'vitest';
import {
  buildFusionPayload,
  summarizeBlendshapes,
  summarizeFaceAroundClick,
} from './payload.js';

const faceSamples = [
  {
    timestamp: 100,
    blendshapes: { jawOpen: 0.1, browInnerUp: 0.2, eyeWideLeft: 0.3 },
    quality: { facePresent: true, faceCount: 1, confidence: 0.91 },
  },
  {
    timestamp: 200,
    blendshapes: { jawOpen: 0.3, browInnerUp: 0.4, eyeWideLeft: 0.1 },
    quality: { facePresent: true, faceCount: 1, confidence: 0.94 },
  },
  {
    timestamp: 360,
    blendshapes: { jawOpen: 0.8, browInnerUp: 0.7, eyeWideLeft: 0.6 },
    quality: { facePresent: true, faceCount: 1, confidence: 0.9 },
  },
  {
    timestamp: 480,
    blendshapes: { jawOpen: 0.4, browInnerUp: 0.5, eyeWideLeft: 0.2 },
    quality: { facePresent: true, faceCount: 1, confidence: 0.88 },
  },
  {
    timestamp: 750,
    blendshapes: { jawOpen: 0.2, browInnerUp: 0.1, eyeWideLeft: 0.2 },
    quality: { facePresent: true, faceCount: 1, confidence: 0.89 },
  },
];

describe('summarizeBlendshapes', () => {
  it('computes average and max values for selected MediaPipe blendshapes', () => {
    const summary = summarizeBlendshapes(faceSamples, ['jawOpen', 'browInnerUp']);

    expect(summary).toEqual({
      sampleCount: 5,
      jawOpen: { avg: 0.36, max: 0.8 },
      browInnerUp: { avg: 0.38, max: 0.7 },
      signalQuality: {
        facePresenceRatio: 1,
        meanConfidence: 0.904,
      },
    });
  });
});

describe('summarizeFaceAroundClick', () => {
  it('splits facial tension into before, during, and after click windows', () => {
    const windows = summarizeFaceAroundClick(faceSamples, {
      eventId: 'target-click-1',
      timestamp: 300,
      targetId: 'moving-target',
    }, {
      beforeMs: 250,
      duringMs: 250,
      afterMs: 300,
      blendshapeNames: ['jawOpen'],
    });

    expect(windows).toEqual({
      eventId: 'target-click-1',
      targetId: 'moving-target',
      clickedAt: 300,
      before: {
        from: 50,
        to: 300,
        sampleCount: 2,
        jawOpen: { avg: 0.2, max: 0.3 },
        signalQuality: { facePresenceRatio: 1, meanConfidence: 0.925 },
      },
      during: {
        from: 300,
        to: 550,
        sampleCount: 2,
        jawOpen: { avg: 0.6, max: 0.8 },
        signalQuality: { facePresenceRatio: 1, meanConfidence: 0.89 },
      },
      after: {
        from: 550,
        to: 850,
        sampleCount: 1,
        jawOpen: { avg: 0.2, max: 0.2 },
        signalQuality: { facePresenceRatio: 1, meanConfidence: 0.89 },
      },
    });
  });
});

describe('buildFusionPayload', () => {
  it('creates a compact privacy-safe JSON payload with facial, pointer, and click-window summaries', () => {
    const payload = buildFusionPayload({
      runId: 'local-run-001',
      generatedAt: '2026-05-28T12:00:00.000Z',
      startedAt: 0,
      endedAt: 1000,
      faceSamples,
      pointerSummary: {
        sampleCount: 60,
        durationMs: 960,
        totalDistancePx: 340,
        straightLineDistancePx: 290,
        pathEfficiency: 0.8529,
        meanSpeedPxPerMs: 0.3542,
        maxSpeedPxPerMs: 1.11,
        meanAccelerationPxPerMs2: 0.015,
        maxAccelerationPxPerMs2: 0.044,
        deviationRmsPx: 8.2,
      },
      clickEvents: [
        { eventId: 'target-click-1', targetId: 'moving-target', timestamp: 300 },
      ],
      blendshapeNames: ['jawOpen', 'browInnerUp'],
    });

    expect(payload).toMatchObject({
      schemaVersion: 'krumm_edge_fusion_poc_v1',
      runId: 'local-run-001',
      generatedAt: '2026-05-28T12:00:00.000Z',
      window: { startedAt: 0, endedAt: 1000, durationMs: 1000 },
      privacy: {
        rawVideoStored: false,
        rawFramesStored: false,
        rawPointerPathStored: false,
        facialLandmarksStored: false,
        payloadContainsAggregatesOnly: true,
      },
      facialSummary: {
        sampleCount: 5,
        jawOpen: { avg: 0.36, max: 0.8 },
        browInnerUp: { avg: 0.38, max: 0.7 },
      },
      pointerSummary: {
        sampleCount: 60,
        durationMs: 960,
        totalDistancePx: 340,
      },
      clickWindows: [
        expect.objectContaining({
          eventId: 'target-click-1',
          before: expect.objectContaining({ sampleCount: 2 }),
          during: expect.objectContaining({ sampleCount: 2 }),
          after: expect.objectContaining({ sampleCount: 1 }),
        }),
      ],
      edgeAI: expect.objectContaining({
        schemaVersion: 'edge_ai_model_output_v3',
        modelKind: 'aus_driven_multidimensional',
        channels: expect.any(Object),
        composite: expect.any(Object),
        confidence: expect.any(Object),
      }),
    });
    expect(JSON.stringify(payload)).not.toContain('faceSamples');
    expect(JSON.stringify(payload)).not.toContain('clientX');
    expect(JSON.stringify(payload)).not.toContain('screenX');
  });

  it('adds task-signal correlation and local edge model output when task metadata is supplied', () => {
    const payload = buildFusionPayload({
      runId: 'local-run-002',
      generatedAt: '2026-05-28T16:00:00.000Z',
      startedAt: 0,
      endedAt: 800,
      faceSamples: [
        { timestamp: 0, blendshapes: { browInnerUp: 0.1, jawOpen: 0.1, eyeSquintLeft: 0.1 }, quality: { facePresent: true, faceCount: 1, confidence: 0.9 } },
        { timestamp: 80, blendshapes: { browInnerUp: 0.1, jawOpen: 0.1, eyeSquintLeft: 0.1 }, quality: { facePresent: true, faceCount: 1, confidence: 0.91 } },
        { timestamp: 220, blendshapes: { browInnerUp: 0.5, jawOpen: 0.6, eyeSquintLeft: 0.4 }, quality: { facePresent: true, faceCount: 1, confidence: 0.88 } },
        { timestamp: 360, blendshapes: { browInnerUp: 0.6, jawOpen: 0.7, eyeSquintLeft: 0.5 }, quality: { facePresent: true, faceCount: 1, confidence: 0.87 } },
      ],
      pointerSamples: [
        { timestamp: 100, x: 0, y: 0 },
        { timestamp: 260, x: 80, y: 20 },
        { timestamp: 420, x: 160, y: 0 },
      ],
      pointerSummary: { sampleCount: 3, durationMs: 320, totalDistancePx: 164.92423 },
      taskEvents: [
        { type: 'target_shown', trialId: 'trial-1', targetId: 'moving-target', timestamp: 100, context: { difficulty: 'baseline' } },
        { type: 'target_click', trialId: 'trial-1', targetId: 'moving-target', timestamp: 420, context: { difficulty: 'baseline' } },
      ],
      calibrationProfile: { eligible: true, caveats: [] },
      runtime: { delegate: 'GPU', fpsTarget: 30 },
    });

    expect(payload).toMatchObject({
      taskCorrelation: {
        type: 'task_signal_correlation_v2',
        aggregate: {
          completedCount: 1,
        },
      },
      edgeModelOutput: {
        schemaVersion: 'edge_local_model_output_v1',
        modelKind: 'explainable_rules_poc',
        runtime: { delegate: 'GPU', fpsTarget: 30 },
        governance: {
          humanReviewOnly: true,
          noAutomatedHiringDecision: true,
          observationalSignalsOnly: true,
        },
      },
      assessmentFeatureVector: {
        type: 'assessment_feature_vector_v1',
        privacy: {
          rawVideoStored: false,
          rawFramesStored: false,
          rawPointerPathStored: false,
          facialLandmarksStored: false,
        },
        aggregate: {
          completedTrialCount: expect.any(Number),
        },
      },
    });
    expect(JSON.stringify(payload)).not.toContain('pointerSamples');
    expect(JSON.stringify(payload)).not.toContain('normalizedLandmarks');
  });
});
