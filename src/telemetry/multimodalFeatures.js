/**
 * Multimodal Feature Builder
 *
 * Centralizes all observables used by KRUMM Edge AI:
 * - temporal features
 * - raw and processed AUs
 * - emotions
 * - capture quality
 * - gaze
 * - head/posture proxy
 * - MoveNet upper-body metrics
 * - task features
 *
 * This module is intentionally a thin orchestration layer: it should not invent
 * new algorithms yet. Later phases will make metrics and Edge AI consume this
 * object directly.
 */

import { buildFullFeatureVector } from './temporalFeatures.js';
import { computeAUs } from './gestureInsights.js';
import { processAllAUs } from './auProcessor.js';
import { classifyEmotions } from './emotionClassifier.js';
import { assessCaptureQuality } from './facialCapturePipeline.js';

function clamp(v, l = 0, h = 1) {
  return Math.min(h, Math.max(l, Number.isFinite(v) ? v : l));
}

function round(v, d = 4) {
  if (!Number.isFinite(v)) return 0;
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

function summarizeGaze(gaze = null) {
  if (!gaze) {
    return {
      available: false,
      screenX: 0.5,
      screenY: 0.5,
      confidence: 0,
      lookingAtScreen: false,
      distractionScore: 1,
      source: 'unavailable',
    };
  }
  const confidence = clamp(gaze.confidence ?? 0);
  return {
    available: true,
    screenX: round(gaze.screenX ?? 0.5),
    screenY: round(gaze.screenY ?? 0.5),
    confidence: round(confidence),
    lookingAtScreen: Boolean(gaze.lookingAtScreen),
    distractionScore: round(gaze.lookingAtScreen ? 1 - confidence : 1),
    calibrationFrames: gaze.calibrationFrames ?? null,
    source: 'iris_landmarks',
  };
}

function summarizePosture(posture = null) {
  if (!posture) {
    return {
      available: false,
      confidence: 0,
      postureScore: 0.5,
      headTilt: 0,
      headTiltDeg: 0,
      headForward: 0,
      asymmetry: 0,
      stability: 0,
      source: 'unavailable',
    };
  }
  return {
    available: true,
    confidence: round(posture.confidence ?? 0.5),
    postureScore: round(posture.postureScore ?? 0.5),
    headTilt: round(posture.headTilt ?? 0),
    headTiltDeg: round(posture.headTiltDeg ?? 0),
    headForward: round(posture.headForward ?? 0),
    asymmetry: round(posture.asymmetry ?? 0),
    stability: round(posture.stability ?? 0),
    caveats: posture.caveats ?? [],
    source: posture.source ?? 'face_landmark_proxy',
  };
}

function summarizeUpperBody(moveNetPose = null) {
  if (!moveNetPose) {
    return {
      available: false,
      confidence: 0,
      shoulderAngle: null,
      shoulderSymmetry: 0,
      upperBodyCoverage: 0,
      visibleUpperBodyKeypoints: 0,
      source: 'unavailable',
    };
  }
  return {
    available: true,
    confidence: round(moveNetPose.confidence ?? 0),
    shoulderAngle: Number.isFinite(moveNetPose.shoulderAngle) ? round(moveNetPose.shoulderAngle, 2) : null,
    shoulderSymmetry: round(moveNetPose.symmetry ?? 0),
    shoulderWidthPx: moveNetPose.shoulderWidthPx ?? null,
    upperBodyCoverage: round(moveNetPose.upperBodyCoverage ?? 0),
    visibleUpperBodyKeypoints: moveNetPose.visibleUpperBodyKeypoints ?? 0,
    armsVisible: moveNetPose.armsVisible ?? 0,
    armActivity: round(moveNetPose.armActivity ?? 0),
    source: moveNetPose.source ?? 'movenet',
  };
}

export function buildMultimodalFeatures({
  faceSamples = [],
  pointerSamples = [],
  taskEvents = [],
  calibrationProfile = null,
  latestGaze = null,
  latestPosture = null,
  moveNetPose = null,
} = {}) {
  const temporal = buildFullFeatureVector({ faceSamples, pointerSamples, taskEvents, calibrationProfile });

  const usableSamples = faceSamples.filter(
    (s) => s?.quality?.facePresent &&
      s?.timestamp >= temporal.windowFrom &&
      s?.timestamp <= temporal.windowTo,
  ).slice(-30);

  const rawAUs = computeAUs(usableSamples);
  const aus = processAllAUs(rawAUs);
  const emotions = classifyEmotions(aus);
  const captureQuality = assessCaptureQuality(faceSamples);

  const facePresenceRatio = temporal.facial?.facePresenceRatio ?? 0;
  const meanConfidence = temporal.facial?.meanConfidence ?? 0;

  return {
    temporal,
    rawAUs,
    aus,
    emotions,
    captureQuality,
    gaze: summarizeGaze(latestGaze),
    posture: summarizePosture(latestPosture),
    upperBody: summarizeUpperBody(moveNetPose),
    task: temporal.performance ?? {},
    quality: {
      facePresenceRatio: round(facePresenceRatio),
      meanConfidence: round(meanConfidence),
      captureOverallScore: captureQuality?.overallScore ?? 50,
      illumination: captureQuality?.illumination ?? 'unknown',
      occlusion: captureQuality?.occlusion ?? false,
    },
    sampleCounts: {
      faceSamples: faceSamples.length,
      usableFaceSamples: usableSamples.length,
      taskEvents: taskEvents.length,
      pointerSamples: pointerSamples.length,
    },
  };
}
