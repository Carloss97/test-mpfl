import { describe, expect, it } from 'vitest';
import { buildMultimodalFeatures } from './multimodalFeatures.js';

function sample(timestamp, blendshapes = {}) {
  return {
    timestamp,
    quality: { facePresent: true, confidence: 0.9 },
    blendshapes: {
      mouthSmileLeft: 0.2,
      mouthSmileRight: 0.2,
      cheekSquintLeft: 0.1,
      cheekSquintRight: 0.1,
      browDownLeft: 0.03,
      browDownRight: 0.03,
      eyeBlinkLeft: 0.02,
      eyeBlinkRight: 0.02,
      ...blendshapes,
    },
  };
}

describe('buildMultimodalFeatures', () => {
  it('combines temporal features, AUs, emotions, gaze, posture and MoveNet upper-body signals', () => {
    const features = buildMultimodalFeatures({
      faceSamples: [
        sample(0),
        sample(33, { mouthSmileLeft: 0.5, mouthSmileRight: 0.5 }),
        sample(66, { mouthSmileLeft: 0.6, mouthSmileRight: 0.6 }),
      ],
      taskEvents: [{ eventType: 'trial-end', reactionTimeMs: 420, correct: true, timestamp: 100 }],
      latestGaze: { screenX: 0.52, screenY: 0.48, lookingAtScreen: true, confidence: 0.8, calibrationFrames: 60 },
      latestPosture: { postureScore: 0.84, headTiltDeg: -3.4, headForward: 0.12, asymmetry: 0.08, stability: 0.91, confidence: 0.76 },
      moveNetPose: { shoulderAngle: 2.2, symmetry: 0.93, confidence: 0.82, upperBodyCoverage: 0.72, visibleUpperBodyKeypoints: 8, armsVisible: 2, armActivity: 0.44, source: 'movenet_test' },
    });

    expect(features.temporal).toBeTruthy();
    expect(features.aus.AU12.intensity).toBeGreaterThan(0);
    expect(features.emotions.dominant).toBeTruthy();
    expect(features.gaze).toMatchObject({ available: true, lookingAtScreen: true, confidence: 0.8 });
    expect(features.posture).toMatchObject({ available: true, postureScore: 0.84, headForward: 0.12 });
    expect(features.upperBody).toMatchObject({ available: true, shoulderSymmetry: 0.93, visibleUpperBodyKeypoints: 8, armsVisible: 2, armActivity: 0.44 });
    expect(features.sampleCounts.usableFaceSamples).toBe(3);
  });

  it('returns safe unavailable defaults when optional multimodal signals are absent', () => {
    const features = buildMultimodalFeatures({
      faceSamples: [sample(0), sample(33)],
    });

    expect(features.gaze.available).toBe(false);
    expect(features.posture.available).toBe(false);
    expect(features.upperBody.available).toBe(false);
    expect(features.quality.facePresenceRatio).toBeGreaterThan(0);
  });
});
