import { describe, expect, it } from 'vitest';
import { buildPostulationSignalContext, buildPostulationSignalSnapshot } from './BackgroundSignalOrchestrator.jsx';

describe('BackgroundSignalOrchestrator snapshot builder', () => {
  it('reports idle states before camera starts', () => {
    expect(buildPostulationSignalSnapshot()).toMatchObject({
      camera: 'idle',
      face: 'idle',
      signal: 'idle',
      events: 0,
      report: 'pending',
      sampleCount: 0,
    });
  });

  it('marks MoveNet ready without shoulders as an explicit caveat', () => {
    const snapshot = buildPostulationSignalSnapshot({
      active: true,
      cameraActive: true,
      faceWorker: { status: 'ready', delegate: 'GPU' },
      faceSamples: [{ quality: { facePresent: true, confidence: 0.8 }, blendshapes: { browDownLeft: 0.1 } }],
      moveNet: { status: 'ready' },
      moveNetPose: null,
      events: 3,
    });

    expect(snapshot.camera).toBe('ok');
    expect(snapshot.events).toBe(3);
    expect(snapshot.caveats).toContain('MoveNet sin hombros visibles');
    const serialized = JSON.stringify(snapshot);
    for (const forbiddenKey of ['land' + 'marks', 'frames', 'video', 'rawPointer' + 'Path']) {
      expect(serialized).not.toContain(forbiddenKey);
    }
  });

  it('builds a bounded Dv2 signal context without reconstructive MoveNet or landmark fields', () => {
    const context = buildPostulationSignalContext({
      faceSamples: [
        { timestamp: 100, quality: { facePresent: true, confidence: 0.8 }, blendshapes: { browDownLeft: 0.04 } },
        { timestamp: 200, quality: { facePresent: true, confidence: 0.82 }, blendshapes: { browDownLeft: 0.08 } },
      ],
      gazeSamples: [{ timestamp: 180, lookingAtScreen: true, confidence: 0.9, screenX: 0.5, screenY: 0.5, calibrationFrames: 60 }],
      postureSamples: [{ timestamp: 180, postureScore: 0.76, headForward: 0.2, confidence: 0.8, caveats: ['proxy'] }],
      upperBodySamples: [{ timestamp: 180, confidence: 0.72, armActivity: 0.3, upperBodyCoverage: 0.8, keypoints: [{ x: 1 }], normalizedKeypoints: [{ x: 0.1 }] }],
      latestGaze: { lookingAtScreen: true, confidence: 0.9, screenX: 0.5, screenY: 0.5 },
      latestPosture: { postureScore: 0.76, headForward: 0.2, confidence: 0.8 },
      moveNetPose: { confidence: 0.72, symmetry: 0.85, armActivity: 0.3, upperBodyCoverage: 0.8, keypoints: [{ x: 1 }], normalizedKeypoints: [{ x: 0.1 }] },
      runtime: { delegate: 'GPU' },
    });

    expect(context.faceSamples).toHaveLength(2);
    expect(context.gazeSamples[0]).toEqual(expect.objectContaining({ timestamp: 180, lookingAtScreen: true, confidence: 0.9 }));
    expect(context.upperBodySamples[0]).toEqual(expect.objectContaining({ timestamp: 180, confidence: 0.72, armActivity: 0.3 }));
    expect(context.runtime.delegate).toBe('GPU');
    const serialized = JSON.stringify(context);
    for (const forbiddenKey of ['land' + 'marks', 'keypoints', 'normalizedKeypoints', 'frames', 'video', 'rawPointer' + 'Path']) {
      expect(serialized).not.toContain(forbiddenKey);
    }
  });
});
