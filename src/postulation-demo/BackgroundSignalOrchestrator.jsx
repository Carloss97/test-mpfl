import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { normalizeVideoInputDevices } from '../telemetry/cameraDevices.js';
import { requestCameraWithFallback, stopStream } from '../telemetry/adaptiveCapture.js';
import { useFaceLandmarkerWorker } from '../telemetry/useFaceLandmarkerWorker.js';
import { sanitizeFaceSampleForAggregation } from '../telemetry/samplePrivacy.js';
import { estimateGaze, resetGazeEstimator } from '../telemetry/gazeEstimator.js';
import { estimateUpperBodyPosture, resetUpperBodyPostureState } from '../telemetry/upperBodyPosture.js';
import { resetAUCache } from '../telemetry/auEnhancer.js';
import { computeAUs } from '../telemetry/gestureInsights.js';
import { useMoveNet } from '../telemetry/useMoveNet.js';

const SIGNAL_CONTEXT_SCHEMA = 'krumm_postulation_demo_signal_context_v1';
const MAX_FACE_SAMPLES = 600;
const MAX_GAZE_SAMPLES = 600;
const MAX_POSTURE_SAMPLES = 600;
const MAX_UPPER_BODY_SAMPLES = 600;

function clamp01(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(1, numeric));
}

function mean(values) {
  const numeric = values.map(Number).filter(Number.isFinite);
  return numeric.length ? numeric.reduce((sum, value) => sum + value, 0) / numeric.length : 0;
}

function appendBounded(list, item, max = 600) {
  const target = Array.isArray(list) ? list : [];
  target.push(item);
  if (target.length > max) target.splice(0, target.length - max);
  return target;
}

function nowMs() {
  return globalThis.performance?.now?.() ?? Date.now();
}

function finiteOrNull(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function round(value, digits = 4) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  const factor = 10 ** digits;
  return Math.round(numeric * factor) / factor;
}

function includeFinite(target, key, value, digits = 4) {
  const numeric = finiteOrNull(value);
  if (numeric !== null) target[key] = round(numeric, digits);
}

function sanitizeHistory(items = [], sanitizer, max) {
  return (Array.isArray(items) ? items : [])
    .map((item) => sanitizer(item, { requireTimestamp: true }))
    .filter(Boolean)
    .slice(-max);
}

function sanitizeFaceHistory(samples = []) {
  return (Array.isArray(samples) ? samples : [])
    .map((sample) => sanitizeFaceSampleForAggregation(sample))
    .filter((sample) => finiteOrNull(sample?.timestamp) !== null)
    .slice(-MAX_FACE_SAMPLES);
}

function sanitizeGazeSample(sample = null, { requireTimestamp = false } = {}) {
  if (!sample || typeof sample !== 'object') return null;
  const timestamp = finiteOrNull(sample.timestamp);
  if (requireTimestamp && timestamp === null) return null;
  const safe = {
    lookingAtScreen: Boolean(sample.lookingAtScreen),
    confidence: clamp01(sample.confidence),
    screenX: round(sample.screenX ?? 0.5),
    screenY: round(sample.screenY ?? 0.5),
  };
  if (timestamp !== null) safe.timestamp = round(timestamp, 2);
  if (sample.calibrationFrames !== undefined) safe.calibrationFrames = Number(sample.calibrationFrames) || 0;
  return safe;
}

function sanitizePostureSample(sample = null, { requireTimestamp = false } = {}) {
  if (!sample || typeof sample !== 'object') return null;
  const timestamp = finiteOrNull(sample.timestamp);
  if (requireTimestamp && timestamp === null) return null;
  const safe = {
    postureScore: clamp01(sample.postureScore ?? 0),
    headForward: clamp01(sample.headForward ?? 0),
    confidence: clamp01(sample.confidence ?? 0),
  };
  if (timestamp !== null) safe.timestamp = round(timestamp, 2);
  includeFinite(safe, 'headTilt', sample.headTilt);
  includeFinite(safe, 'headTiltDeg', sample.headTiltDeg, 2);
  includeFinite(safe, 'asymmetry', sample.asymmetry);
  includeFinite(safe, 'stability', sample.stability);
  if (sample.source) safe.source = String(sample.source);
  if (Array.isArray(sample.caveats)) safe.caveats = sample.caveats.map(String).slice(0, 6);
  return safe;
}

function sanitizeUpperBodySample(sample = null, { requireTimestamp = false } = {}) {
  if (!sample || typeof sample !== 'object') return null;
  const timestamp = finiteOrNull(sample.timestamp);
  if (requireTimestamp && timestamp === null) return null;
  const symmetry = clamp01(sample.symmetry ?? sample.shoulderSymmetry ?? 0);
  const safe = {
    source: sample.source ? String(sample.source) : 'movenet',
    confidence: clamp01(sample.confidence ?? 0),
    symmetry,
    shoulderSymmetry: symmetry,
    upperBodyCoverage: clamp01(sample.upperBodyCoverage ?? 0),
    visibleUpperBodyKeypoints: Number(sample.visibleUpperBodyKeypoints ?? 0),
    armsVisible: Number(sample.armsVisible ?? 0),
    armActivity: clamp01(sample.armActivity ?? 0),
  };
  if (timestamp !== null) safe.timestamp = round(timestamp, 2);
  if (sample.shoulderAngle !== null && sample.shoulderAngle !== undefined) includeFinite(safe, 'shoulderAngle', sample.shoulderAngle, 2);
  if (sample.shoulderWidthPx !== null && sample.shoulderWidthPx !== undefined) includeFinite(safe, 'shoulderWidthPx', sample.shoulderWidthPx, 2);
  return safe;
}

export function buildPostulationSignalContext({
  faceSamples = [],
  gazeSamples = [],
  postureSamples = [],
  upperBodySamples = [],
  latestGaze = null,
  latestPosture = null,
  moveNetPose = null,
  runtime = {},
} = {}) {
  return {
    schemaVersion: SIGNAL_CONTEXT_SCHEMA,
    faceSamples: sanitizeFaceHistory(faceSamples),
    gazeSamples: sanitizeHistory(gazeSamples, sanitizeGazeSample, MAX_GAZE_SAMPLES),
    postureSamples: sanitizeHistory(postureSamples, sanitizePostureSample, MAX_POSTURE_SAMPLES),
    upperBodySamples: sanitizeHistory(upperBodySamples, sanitizeUpperBodySample, MAX_UPPER_BODY_SAMPLES),
    latestGaze: sanitizeGazeSample(latestGaze),
    latestPosture: sanitizePostureSample(latestPosture),
    moveNetPose: sanitizeUpperBodySample(moveNetPose),
    runtime: {
      delegate: runtime.delegate ?? null,
      source: 'postulation_demo_background_orchestrator',
    },
    privacy: {
      mediaStreamStored: false,
      frameDataStored: false,
      landmarkDataStored: false,
      pointerPathStored: false,
      gameEventLogStored: false,
      aggregateContextOnly: true,
    },
  };
}

function workerError(faceWorker) {
  return faceWorker?.error || faceWorker?.status === 'error';
}

export function buildPostulationSignalSnapshot({
  active = false,
  cameraActive = false,
  cameraError = null,
  faceWorker = {},
  faceSamples = [],
  latestGaze = null,
  latestPose = null,
  moveNet = {},
  moveNetPose = null,
  events = 0,
} = {}) {
  const recent = faceSamples.slice(-60);
  const present = recent.filter((sample) => sample?.quality?.facePresent !== false);
  const sampleCount = faceSamples.length;
  const facePresenceRatio = recent.length ? present.length / recent.length : 0;
  const meanConfidence = mean(present.map((sample) => sample?.quality?.confidence ?? 0));
  const activeAUCount = Object.values(computeAUs(present)).filter((au) => (au?.intensity ?? 0) > 0.035).length;
  const caveats = [];

  if (cameraError) caveats.push('Cámara no disponible');
  if (sampleCount > 0 && facePresenceRatio < 0.7) caveats.push('Rostro con baja presencia');
  if (sampleCount > 0 && meanConfidence < 0.55) caveats.push('Confianza facial baja');
  if (moveNet?.status === 'ready' && !moveNetPose) caveats.push('MoveNet sin hombros visibles');
  if (moveNet?.error || moveNet?.status === 'error') caveats.push('MoveNet en error');

  const camera = cameraError ? 'error' : cameraActive ? 'ok' : active ? 'pending' : 'idle';
  const face = workerError(faceWorker)
    ? 'error'
    : sampleCount > 0 && facePresenceRatio >= 0.7
      ? 'ok'
      : sampleCount > 0
        ? 'warning'
        : cameraActive ? 'pending' : 'idle';
  const signal = sampleCount > 0 && meanConfidence >= 0.55 && activeAUCount > 0
    ? 'ok'
    : sampleCount > 0
      ? 'warning'
      : cameraActive ? 'pending' : 'idle';

  return {
    camera,
    face,
    signal,
    events: Math.max(0, Number(events) || 0),
    report: 'pending',
    sampleCount,
    facePresenceRatio: clamp01(facePresenceRatio),
    meanConfidence: clamp01(meanConfidence),
    activeAUCount,
    gazeConfidence: clamp01(latestGaze?.confidence ?? 0),
    postureScore: clamp01(latestPose?.postureScore ?? 0),
    moveNetStatus: moveNet?.status ?? 'idle',
    moveNetHasShoulders: Boolean(moveNetPose),
    caveats,
  };
}

export default function BackgroundSignalOrchestrator({ active = false, eventCount = 0, mode = 'setup', onSnapshot, onSignalContext }) {
  const { t } = useLanguage();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const faceSamplesRef = useRef([]);
  const gazeSamplesRef = useRef([]);
  const postureSamplesRef = useRef([]);
  const upperBodySamplesRef = useRef([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [cameraDevices, setCameraDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [latestFaceSample, setLatestFaceSample] = useState(null);
  const [latestGaze, setLatestGaze] = useState(null);
  const [latestPose, setLatestPose] = useState(null);
  const [moveNetPose, setMoveNetPose] = useState(null);

  const refreshCameraDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setCameraDevices([]);
      return [];
    }
    const allDevices = await navigator.mediaDevices.enumerateDevices();
    const normalized = normalizeVideoInputDevices(allDevices.filter((device) => device.kind === 'videoinput'));
    setCameraDevices(normalized);
    if (!selectedDeviceId && normalized[0]?.deviceId) setSelectedDeviceId(normalized[0].deviceId);
    return normalized;
  }, [selectedDeviceId]);

  const attachStream = useCallback(async (stream) => {
    if (streamRef.current) stopStream(streamRef.current);
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => {});
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      stopStream(streamRef.current);
      streamRef.current = null;
    }
    setCameraActive(false);
    setMoveNetPose(null);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('getUserMedia no disponible.');
      resetAUCache();
      resetGazeEstimator();
      resetUpperBodyPostureState();
      faceSamplesRef.current = [];
      gazeSamplesRef.current = [];
      postureSamplesRef.current = [];
      upperBodySamplesRef.current = [];
      setLatestFaceSample(null);
      setLatestGaze(null);
      setLatestPose(null);
      setMoveNetPose(null);
      const { stream } = await requestCameraWithFallback(selectedDeviceId, 'medium');
      await attachStream(stream);
      await refreshCameraDevices().catch(() => []);
      setCameraActive(true);
    } catch (error) {
      setCameraActive(false);
      setCameraError(error?.message ?? String(error));
    }
  }, [attachStream, refreshCameraDevices, selectedDeviceId]);

  useEffect(() => {
    if (!active) {
      stopCamera();
      return undefined;
    }
    startCamera();
    return undefined;
  }, [active, startCamera, stopCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const recordFaceSample = useCallback((sample, landmarks) => {
    if (!sample?.blendshapes) return;
    const safeSample = sanitizeFaceSampleForAggregation(sample);
    const timestamp = finiteOrNull(safeSample.timestamp) ?? nowMs();
    faceSamplesRef.current = appendBounded(faceSamplesRef.current, safeSample, MAX_FACE_SAMPLES);
    setLatestFaceSample(safeSample);
    if (landmarks) {
      try {
        const gaze = sanitizeGazeSample({ ...estimateGaze(landmarks), timestamp });
        if (gaze) {
          gazeSamplesRef.current = appendBounded(gazeSamplesRef.current, gaze, MAX_GAZE_SAMPLES);
          setLatestGaze(gaze);
        }
        const posture = sanitizePostureSample({ ...estimateUpperBodyPosture(landmarks), timestamp });
        if (posture) {
          postureSamplesRef.current = appendBounded(postureSamplesRef.current, posture, MAX_POSTURE_SAMPLES);
          setLatestPose(posture);
        }
      } catch {
        // Optional background signal; keep gameplay resilient.
      }
    }
  }, []);

  const faceWorker = useFaceLandmarkerWorker({
    videoRef,
    active: cameraActive,
    onSample: recordFaceSample,
    fps: 10,
    preferredDelegate: 'GPU',
  });

  const moveNetSample = useCallback((sample) => {
    if (!sample?.metrics) return;
    const safeMoveNetPose = sanitizeUpperBodySample({ timestamp: finiteOrNull(sample.timestamp) ?? nowMs(), ...sample.metrics });
    if (!safeMoveNetPose) return;
    upperBodySamplesRef.current = appendBounded(upperBodySamplesRef.current, safeMoveNetPose, MAX_UPPER_BODY_SAMPLES);
    setMoveNetPose(safeMoveNetPose);
  }, []);

  const moveNet = useMoveNet({ videoRef, active: cameraActive, fps: 6, onSample: moveNetSample });

  const snapshot = useMemo(() => buildPostulationSignalSnapshot({
    active,
    cameraActive,
    cameraError,
    faceWorker,
    faceSamples: faceSamplesRef.current,
    latestGaze,
    latestPose,
    moveNet,
    moveNetPose,
    events: eventCount,
  }), [active, cameraActive, cameraError, eventCount, faceWorker, latestFaceSample, latestGaze, latestPose, moveNet, moveNetPose]);

  const signalContext = useMemo(() => buildPostulationSignalContext({
    faceSamples: faceSamplesRef.current,
    gazeSamples: gazeSamplesRef.current,
    postureSamples: postureSamplesRef.current,
    upperBodySamples: upperBodySamplesRef.current,
    latestGaze,
    latestPosture: latestPose,
    moveNetPose,
    runtime: { delegate: faceWorker.delegate ?? null },
  }), [faceWorker.delegate, latestFaceSample, latestGaze, latestPose, moveNetPose]);

  useEffect(() => {
    onSnapshot?.(snapshot);
  }, [onSnapshot, snapshot]);

  useEffect(() => {
    onSignalContext?.(signalContext);
  }, [onSignalContext, signalContext]);

  if (mode === 'hidden') {
    return (
      <video
        ref={videoRef}
        className="postulation-demo__camera-hidden"
        muted
        playsInline
        aria-label="Vista previa local de cámara"
      />
    );
  }

  return (
    <section className="postulation-demo__signal-orchestrator" aria-label={t('Cámara local de fondo', 'Background local camera')}>
      <div className="postulation-demo__camera-card">
        <video ref={videoRef} className="postulation-demo__camera-preview" muted playsInline aria-label={t('Vista previa local de cámara', 'Local camera preview')} />
        <div>
          <strong>{cameraActive ? t('Cámara local activa', 'Local camera active') : active ? t('Solicitando cámara local', 'Requesting local camera') : t('Cámara local en espera', 'Local camera on standby')}</strong>
          <p>{cameraError ? `Caveat: ${cameraError}` : t('La vista se usa solo para procesamiento local de señales agregadas.', 'The view is used only for local processing of aggregated signals.')}</p>
        </div>
      </div>
      {cameraDevices.length > 1 && (
        <label className="postulation-demo__device-label" htmlFor="postulation-camera-device">
          {t('Cámara', 'Camera')}
          <select id="postulation-camera-device" value={selectedDeviceId} onChange={(event) => setSelectedDeviceId(event.target.value)}>
            {cameraDevices.map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label}</option>)}
          </select>
        </label>
      )}
    </section>
  );
}
