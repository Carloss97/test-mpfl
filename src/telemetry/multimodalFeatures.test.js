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

  it('includes synchronized game telemetry summaries as task/game features', () => {
    const features = buildMultimodalFeatures({
      faceSamples: [sample(0), sample(33), sample(66)],
      gameSummary: {
        performance: { accuracy: 0.75, meanReactionTimeMs: 420, completedTrialCount: 4, trialCount: 4, meanScore: 0.7 },
        motor: { pathEfficiencyMean: 0.82, smoothPursuitScore: 0.8, trackingLossRatio: 0.1, correctionRate: 2 },
        inhibition: { commissionErrorRate: 0.25, omissionErrorRate: 0 },
        interference: { conflictCostMs: 180, errorRate: 0.1 },
      },
    });

    expect(features.game.available).toBe(true);
    expect(features.game.performance.accuracy).toBe(0.75);
    expect(features.task.accuracy).toBe(0.75);
    expect(features.game.motor.pathEfficiencyMean).toBe(0.82);
    expect(features.sampleCounts.gameEvents).toBe(4);
  });
});
