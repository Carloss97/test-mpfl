import { describe, expect, it } from 'vitest';
import { buildPostulationSignalSnapshot } from './BackgroundSignalOrchestrator.jsx';

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
});
