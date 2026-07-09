import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { normalizeVideoInputDevices } from '../telemetry/cameraDevices.js';
import { requestCameraWithFallback, stopStream } from '../telemetry/adaptiveCapture.js';
import { useFaceLandmarkerWorker } from '../telemetry/useFaceLandmarkerWorker.js';
import { sanitizeFaceSampleForAggregation } from '../telemetry/samplePrivacy.js';
import { estimateGaze, resetGazeEstimator } from '../telemetry/gazeEstimator.js';
import { estimateUpperBodyPosture, resetUpperBodyPostureState } from '../telemetry/upperBodyPosture.js';
import { resetAUCache } from '../telemetry/auEnhancer.js';
import { computeAUs } from '../telemetry/gestureInsights.js';
import { useMoveNet } from '../telemetry/useMoveNet.js';

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
  return [...list, item].slice(-max);
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

export default function BackgroundSignalOrchestrator({ active = false, eventCount = 0, mode = 'setup', onSnapshot }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const faceSamplesRef = useRef([]);
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
    faceSamplesRef.current = appendBounded(faceSamplesRef.current, safeSample);
    setLatestFaceSample(safeSample);
    if (landmarks) {
      try {
        const gaze = estimateGaze(landmarks);
        setLatestGaze(gaze);
        const posture = estimateUpperBodyPosture(landmarks);
        setLatestPose(posture);
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
    if (sample?.metrics) setMoveNetPose(sample.metrics);
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

  useEffect(() => {
    onSnapshot?.(snapshot);
  }, [onSnapshot, snapshot]);

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
    <section className="postulation-demo__signal-orchestrator" aria-label="Cámara local de fondo">
      <div className="postulation-demo__camera-card">
        <video ref={videoRef} className="postulation-demo__camera-preview" muted playsInline aria-label="Vista previa local de cámara" />
        <div>
          <strong>{cameraActive ? 'Cámara local activa' : active ? 'Solicitando cámara local' : 'Cámara local en espera'}</strong>
          <p>{cameraError ? `Caveat: ${cameraError}` : 'La vista se usa solo para procesamiento local de señales agregadas.'}</p>
        </div>
      </div>
      {cameraDevices.length > 1 && (
        <label className="postulation-demo__device-label" htmlFor="postulation-camera-device">
          Cámara
          <select id="postulation-camera-device" value={selectedDeviceId} onChange={(event) => setSelectedDeviceId(event.target.value)}>
            {cameraDevices.map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label}</option>)}
          </select>
        </label>
      )}
    </section>
  );
}
