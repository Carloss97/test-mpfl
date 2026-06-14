import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { normalizeVideoInputDevices } from './telemetry/cameraDevices.js';
import { buildGestureInsights } from './telemetry/gestureInsights.js';
import { computeInsightsFromAUs } from './telemetry/insightMetrics.js';
import { computeEnhancedAUs, resetAUCache } from './telemetry/auEnhancer.js';
import { setAUBaseline } from './telemetry/auProcessor.js';
import { estimateGaze, resetGazeEstimator, calibrateGazeCenter } from './telemetry/gazeEstimator.js';
import { useFaceLandmarkerWorker } from './telemetry/useFaceLandmarkerWorker.js';
import { estimateUpperBodyPosture, resetUpperBodyPostureState, calibrateUpperBodyPostureUpright } from './telemetry/upperBodyPosture.js';
import { useMoveNet } from './telemetry/useMoveNet.js';

import { buildCalibrationProfile } from './telemetry/microgestureFeatures.js';
import { requestCameraWithFallback, stopStream } from './telemetry/adaptiveCapture.js';
import { adaptiveCalibrationSamples, estimateLightingQuality, canCalibrate } from './telemetry/lightingAdapter.js';
import { runEdgeAIInference } from './telemetry/edgeAiEngine.js';
import { createEmotionTemporalSmoother } from './telemetry/emotionTemporalSmoother.js';
import Dashboard from './components/Dashboard.jsx';
import StickyHeader from './components/StickyHeader.jsx';
import SimpleRTTask from './tasks/SimpleRTTask.jsx';
import PrecisionTargetingTask from './tasks/PrecisionTargetingTask.jsx';
import PursuitTrackingTask from './tasks/PursuitTrackingTask.jsx';
import GoNoGoTask from './tasks/GoNoGoTask.jsx';
import ColorInterferenceTask from './tasks/ColorInterferenceTask.jsx';
import { summarizeGameEvents } from './telemetry/gameTelemetry.js';
import ReferenceGuide from './components/ReferenceGuide.jsx';
import TaskImpact from './components/TaskImpact.jsx';
import { generateReport } from './telemetry/reportGenerator.js';
import { loadSessionsSafe, clearSessionsSafe } from './telemetry/storageManager.js';
import { getRecommendedConfig } from './telemetry/deviceCapabilities.js';
import { sanitizeFaceSampleForAggregation } from './telemetry/samplePrivacy.js';
import './styles.css';
import './dashboard.css';
import './dashboard-ux.css';
import './dashboard-v2.css';
import './dashboard-stats.css';
import './sticky.css';
import './dashboard-toggles.css';
import './reference-guide.css';

const DEVICE_CONFIG = getRecommendedConfig();
const MIN_SAMPLES_FOR_REPORT = 20;

const GAME_ACTIVITY_OPTIONS = Object.freeze([
  { id: 'simple_rt', label: 'RT Simple', description: 'Tiempo de reacción básico' },
  { id: 'precision_targeting', label: 'Precisión visomotora', description: 'Fitts Law, precisión y trayectoria' },
  { id: 'pursuit_tracking', label: 'Seguimiento continuo', description: 'Tracking visuomotor y pérdida de seguimiento' },
  { id: 'go_nogo', label: 'Go/No-Go', description: 'Inhibición motora y errores de comisión/omisión' },
  { id: 'color_interference', label: 'Interferencia color-palabra', description: 'Conflicto cognitivo tipo Stroop' },
]);

function clamp(v, min = 0, max = 1) { return Math.min(max, Math.max(min, Number.isFinite(v) ? v : min)); }
function formatPercent(v) { return `${Math.round(clamp(v) * 100)}%`; }
function hasEnoughSamples(t) { return (t?.sampleCount ?? 0) >= MIN_SAMPLES_FOR_REPORT; }

export default function App() {
  // Error boundary for debugging
  useEffect(() => {
    const handler = (e) => { console.error('[App Runtime Error]', e.error?.message || e.message); };
    window.addEventListener('error', handler);
    window.addEventListener('unhandledrejection', handler);
    return () => { window.removeEventListener('error', handler); window.removeEventListener('unhandledrejection', handler); };
  }, []);

  const videoRef = useRef(null);
  const faceSamplesRef = useRef([]);
  const taskEventsRef = useRef([]);
  const gameEventsRef = useRef([]);
  const sessionStartRef = useRef(0);
  const calibrationTimerRef = useRef(null);
  const streamRef = useRef(null);
  const emotionSmootherRef = useRef(createEmotionTemporalSmoother());

  const [isCameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [cameraDevices, setCameraDevices] = useState([]);
  const [showMesh, setShowMesh] = useState(true);
  const [selectedGameId, setSelectedGameId] = useState('simple_rt');
  const [taskActive, setTaskActive] = useState(false);
  const [taskEventCount, setTaskEventCount] = useState(0);
  const [gameEventCount, setGameEventCount] = useState(0);
  const [lastGameSummary, setLastGameSummary] = useState(null);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationProfile, setCalibrationProfile] = useState(null);
  const [latestFaceSample, setLatestFaceSample] = useState(null);
  const [latestLandmarks, setLatestLandmarks] = useState(null);
  const [latestGaze, setLatestGaze] = useState(null);
  const [latestPose, setLatestPose] = useState(null);
  const [moveNetPose, setMoveNetPose] = useState(null);
  const [lastQuality, setLastQuality] = useState({});
  const [, setBlendshapeNames] = useState([]);
  const [, setExportStatus] = useState(null);
  const [, setShowReport] = useState(false);
  const [reportContent, setReportContent] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [reportTab, setReportTab] = useState('markdown');
  const [reportFormat, setReportFormat] = useState('markdown');
  const [manualCalStatus, setManualCalStatus] = useState(null);

  const recordFaceSample = useCallback((sample, landmarks) => {
    if (!sample?.blendshapes) return;
    const safeSample = sanitizeFaceSampleForAggregation(sample);
    faceSamplesRef.current = [...faceSamplesRef.current, safeSample];
    setLatestFaceSample(safeSample);
    setLatestLandmarks(landmarks ?? null);
    if (landmarks) {
      try {
        const gaze = estimateGaze(landmarks);
        setLatestGaze(gaze);
        const posture = estimateUpperBodyPosture(landmarks);
        setLatestPose(posture);
      } catch { /* optional */ }
    }
    setLastQuality(safeSample.quality ?? {});
    if (safeSample.blendshapes) setBlendshapeNames(Object.keys(safeSample.blendshapes).sort());
  }, []);

  const faceWorker = useFaceLandmarkerWorker({
    videoRef, active: isCameraActive, onSample: recordFaceSample,
    fps: DEVICE_CONFIG?.fpsTarget ?? 15,
    preferredDelegate: DEVICE_CONFIG?.mediapipeDelegate ?? 'GPU',
  });

  const moveNetSample = useCallback((sample) => {
    if (sample?.metrics) setMoveNetPose(sample.metrics);
  }, []);

  const moveNet = useMoveNet({
    videoRef, active: isCameraActive, fps: 8, onSample: moveNetSample,
  });

  const refreshCameraDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) { setCameraDevices([]); return []; }
    const all = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = all.filter((d) => d.kind === 'videoinput');
    const normalized = normalizeVideoInputDevices(videoDevices);
    setCameraDevices(normalized);
    if (!selectedDeviceId && normalized.length > 0) setSelectedDeviceId(normalized[0].deviceId);
    return normalized;
  }, [selectedDeviceId]);

  const attachCameraStream = useCallback(async (stream) => {
    if (streamRef.current) stopStream(streamRef.current);
    streamRef.current = stream;
    if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => {}); }
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('getUserMedia no disponible.');
      const { stream } = await requestCameraWithFallback(selectedDeviceId, 'medium');
      await attachCameraStream(stream);
      await refreshCameraDevices().catch(() => []);
      faceSamplesRef.current = [];
      resetAUCache();
      resetGazeEstimator();
      resetUpperBodyPostureState();
      emotionSmootherRef.current.reset();
      sessionStartRef.current = performance.now();
      setCalibrationProfile(null);
      setIsCalibrating(false);
      setShowReport(false);
      setReportContent(null);
      setShowReportModal(false);
      setManualCalStatus(null);
      setLatestFaceSample(null);
      setLatestLandmarks(null);
      setBlendshapeNames([]);
      setCameraActive(true);
    } catch (err) { setCameraError(err?.message ?? String(err)); setCameraActive(false); }
  }, [selectedDeviceId, attachCameraStream, refreshCameraDevices]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) { stopStream(streamRef.current); streamRef.current = null; }
    setCameraActive(false);
    setLatestFaceSample(null);
    setLatestLandmarks(null);
  }, []);

  const handleCalibrateGazeCenter = useCallback(() => {
    const result = calibrateGazeCenter(latestLandmarks);
    setManualCalStatus(result.ok ? 'Mirada calibrada al centro' : 'No hay iris/rostro suficiente para calibrar mirada');
  }, [latestLandmarks]);

  const handleCalibratePostureUpright = useCallback(() => {
    const result = calibrateUpperBodyPostureUpright(latestLandmarks);
    setManualCalStatus(result.ok ? 'Postura erguida calibrada' : 'No hay rostro suficiente para calibrar postura');
  }, [latestLandmarks]);

  const switchCamera = useCallback(async (deviceId) => {
    setSelectedDeviceId(deviceId);
    if (!isCameraActive) return;
    try {
      const { stream } = await requestCameraWithFallback(deviceId, 'medium');
      await attachCameraStream(stream);
      await refreshCameraDevices().catch(() => []);
    } catch (err) { setCameraError(err?.message ?? String(err)); }
  }, [isCameraActive, attachCameraStream, refreshCameraDevices]);

  const handleTaskStart = useCallback((event) => {
    taskEventsRef.current = [...taskEventsRef.current, event];
    setTaskEventCount((c) => c + 1);
  }, []);
  const handleTaskEnd = useCallback((event) => {
    taskEventsRef.current = [...taskEventsRef.current, event];
    setTaskEventCount((c) => c + 1);
  }, []);
  const handleGameEvent = useCallback((event) => {
    gameEventsRef.current = [...gameEventsRef.current, event];
    setGameEventCount((c) => c + 1);
  }, []);
  const handleTaskComplete = useCallback((summary) => {
    setLastGameSummary(summary ?? null);
  }, []);

  const startTask = useCallback(() => {
    taskEventsRef.current = [];
    gameEventsRef.current = [];
    setTaskEventCount(0);
    setGameEventCount(0);
    setLastGameSummary(null);
    setTaskActive(true);
    setTimeout(() => {
      const el = document.querySelector('.task-panel');
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  }, []);

  const startCalibration = useCallback(() => {
    setIsCalibrating(true);
    setCalibrationProfile(null);
    const light = estimateLightingQuality(faceSamplesRef.current);
    const adapt = adaptiveCalibrationSamples(light);
    const duration = adapt.durationMs;
    calibrationTimerRef.current = setTimeout(() => {
      const samples = faceSamplesRef.current;
      const check = canCalibrate(samples, { minSamples: adapt.minSamples, minPresenceRatio: 0.2, minConfidence: 0.3 });
      if (!check.eligible) {
        setCalibrationProfile({ eligible: false, caveats: [check.reason], usableSampleCount: samples.length });
        setIsCalibrating(false);
        return;
      }
      const actualSamples = samples.filter((s) => s?.quality?.facePresent);
      const firstTs = actualSamples[0]?.timestamp ?? samples[0]?.timestamp ?? performance.now();
      const lastTs = samples[samples.length - 1]?.timestamp ?? firstTs + duration;
      const profile = buildCalibrationProfile(samples, { from: firstTs, to: lastTs });
      setCalibrationProfile(profile);
      if (profile.eligible) { setAUBaseline(computeEnhancedAUs(samples)); }
      setIsCalibrating(false);
    }, duration);
  }, []);

  const cancelCalibration = useCallback(() => {
    if (calibrationTimerRef.current) { clearTimeout(calibrationTimerRef.current); calibrationTimerRef.current = null; }
    setIsCalibrating(false);
  }, []);

  useEffect(() => () => { if (calibrationTimerRef.current) clearTimeout(calibrationTimerRef.current); }, []);

  // ─── Telemetry ───
  const gameSummary = useMemo(() => summarizeGameEvents(gameEventsRef.current), [gameEventCount]);

  const telemetry = useMemo(() => {
    const allSamples = faceSamplesRef.current;
    const recentSamples = allSamples.slice(-60);
    const recentCount = recentSamples.length;
    const presentSamples = recentSamples.filter((s) => s?.quality?.facePresent);
    const facePresenceRatio = recentCount ? presentSamples.length / recentCount : 0;
    const confidences = presentSamples.map((s) => s?.quality?.confidence ?? 0);
    const meanConfidence = confidences.length ? confidences.reduce((s, v) => s + v, 0) / confidences.length : 0;
    const fpsEstimate = allSamples.length ? allSamples.length / Math.max(1, (performance.now() - (sessionStartRef.current || performance.now())) / 1000) : 0;
    const insights = buildGestureInsights(recentSamples);
    // Override metric proxies with AU-based calculations
    if (recentSamples.length > 0 && insights.auScores) {
      const auMetrics = computeInsightsFromAUs(insights.auScores, facePresenceRatio, {
        gaze: latestGaze,
        posture: latestPose,
        upperBody: moveNetPose,
        task: gameSummary.performance,
      });
      Object.assign(insights, auMetrics);
    }
    if (recentSamples.length > 0) {
      const enhanced = computeEnhancedAUs(recentSamples);
      insights.enhancedAUs = enhanced;
    }
    return { sampleCount: allSamples.length, recentCount, facePresenceRatio, meanConfidence, fpsEstimate, insights };
  }, [latestFaceSample, latestGaze, latestPose, moveNetPose, gameSummary]);

  // ─── Edge AI Inference (direct, no worker) ───
  const edgeAIResult = useMemo(() => {
    const samples = faceSamplesRef.current;
    if (!samples.length || samples.length < 2) return null;
    try {
      const result = runEdgeAIInference({
        faceSamples: samples,
        pointerSamples: [],
        taskEvents: taskEventsRef.current,
        calibrationProfile,
        runtime: { delegate: faceWorker.delegate ?? 'CPU' },
        latestGaze,
        latestPosture: latestPose,
        moveNetPose,
        gameSummary,
      });
      return { ...result, emotions: emotionSmootherRef.current.smooth(result.emotions, { timestamp: latestFaceSample?.timestamp ?? null }) };
    } catch (e) { console.error('Edge AI inference failed:', e); return null; }
  }, [latestFaceSample, calibrationProfile, faceWorker.delegate, taskEventCount, gameEventCount, faceSamplesRef.current?.length, latestGaze, latestPose, moveNetPose, gameSummary]);

  // ─── Pipeline Worker (future: optional, fallback to direct) ───
  // const pipeline = usePipelineWorker({ ... });
  // Currently using direct inference for stability; pipeline worker
  // can be re-enabled once structured clone + transferables are solved.

  const edgeChannels = edgeAIResult?.calibratedChannels ?? edgeAIResult?.channels ?? {};
  const edgeConfidence = edgeAIResult?.confidence;
  const edgeComposite = edgeAIResult?.composite;
  const selectedGame = GAME_ACTIVITY_OPTIONS.find((option) => option.id === selectedGameId) ?? GAME_ACTIVITY_OPTIONS[0];

  const handleGenerateReport = useCallback((format = 'markdown') => {
    if (!hasEnoughSamples(telemetry)) return;
    const durationMs = performance.now() - (sessionStartRef.current ?? performance.now());
    const report = generateReport({
      format, telemetry, edgeAIResult, calibrationProfile,
      runtime: { delegate: faceWorker.delegate ?? 'CPU' },
      durationMs, sessionId: `session-${Date.now()}`,
    });
    setReportContent(report);
    setReportFormat(format);
    setShowReportModal(true);
  }, [telemetry, edgeAIResult, calibrationProfile, faceWorker.delegate]);

  const handleExportReport = useCallback(() => {
    if (!reportContent) return;
    const ext = reportFormat === 'markdown' ? 'md' : reportFormat === 'html' ? 'html' : 'json';
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `krumm-report-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.${ext}`;
    a.click(); URL.revokeObjectURL(url);
    setExportStatus('exported');
    setTimeout(() => setExportStatus(null), 3000);
  }, [reportContent, reportFormat]);

  // ─── Derived values ───
  const insightItems = [
    { id: 'tension', label: 'Tensión', value: telemetry.insights?.tension ?? 0 },
    { id: 'attention', label: 'Atención', value: telemetry.insights?.attention ?? 0 },
    { id: 'surprise', label: 'Sorpresa', value: telemetry.insights?.surprise ?? 0 },
    { id: 'fatigue', label: 'Fatiga', value: telemetry.insights?.fatigue ?? 0 },
    { id: 'stress', label: 'Estrés', value: telemetry.insights?.stress ?? 0 },
    { id: 'calmness', label: 'Calma', value: telemetry.insights?.calmness ?? 0 },
    { id: 'engagement', label: 'Engagement', value: telemetry.insights?.engagement ?? 0 },
    { id: 'boredom', label: 'Aburrimiento', value: telemetry.insights?.boredom ?? 0 },
    { id: 'confusion', label: 'Confusión', value: telemetry.insights?.confusion ?? 0 },
    { id: 'cognitive', label: 'Carga cognitiva', value: telemetry.insights?.cognitiveLoad ?? 0 },
    { id: 'valence', label: 'Valencia', value: telemetry.insights?.valence ?? 0 },
  ];
  const auEntries = Object.entries(telemetry.insights?.auScores ?? {}).sort((a, b) => (b[1]?.intensity ?? 0) - (a[1]?.intensity ?? 0));
  const activeAUCount = auEntries.filter(([, au]) => au.intensity > 0.03).length;
  const calStatusLabel = isCalibrating ? 'Calibrando...'
    : !calibrationProfile ? 'Sin calibrar'
    : calibrationProfile.eligible ? 'Baseline válido' : 'Baseline no elegible';
  const statusClassName = isCalibrating ? 'calibrating'
    : calibrationProfile?.eligible ? 'ready'
    : calibrationProfile && !calibrationProfile.eligible ? 'error' : '';

  useEffect(() => {
    loadSessionsSafe().then(setSessions).catch(() => setSessions([]));
  }, []);

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>KRUMM Edge Fusion PoC</h1>
        <p className="subtitle">Telemetría facial · AUs (FACS) · Edge AI · Tareas cognitivas</p>
      </header>

      {(isCameraActive) && (
        <StickyHeader
          edgeComposite={edgeComposite}
          edgeConfidence={edgeConfidence}
          auEntries={auEntries}
          topChannels={Object.entries(edgeChannels).sort((a, b) => b[1].score - a[1].score).slice(0, 1)}
          calibrationProfile={calibrationProfile}
          calStatusLabel={calStatusLabel}
          telemetry={telemetry}
          faceWorker={faceWorker}
          emotions={edgeAIResult?.emotions}
          captureQuality={edgeAIResult?.confidence?.captureQuality}
        />
      )}

      <section className="hero-card">
        <div className="hero-controls">
          <div className="camera-controls">
            {!isCameraActive ? (
              <button type="button" className="primary" onClick={startCamera}>Iniciar cámara</button>
            ) : (
              <button type="button" className="secondary" onClick={stopCamera}>Detener cámara</button>
            )}
            <select value={selectedDeviceId} onChange={(e) => switchCamera(e.target.value)} aria-label="Seleccionar cámara">
              <option value="">Cámara por defecto</option>
              {cameraDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
              ))}
            </select>
            <button type="button" onClick={startCalibration} disabled={!isCameraActive || isCalibrating} className={isCalibrating ? 'secondary' : 'primary'}>
              {isCalibrating ? 'Calibrando...' : 'Calibrar baseline'}
            </button>
            <button type="button" onClick={cancelCalibration} disabled={!isCalibrating} className="secondary">Cancelar</button>
          </div>
          <div className="task-controls">
            <div style={{display:'grid',gap:'6px',minWidth:'260px'}}>
              <strong>Actividades gamificadas</strong>
              <label className="caption" htmlFor="game-activity-select">Actividad gamificada</label>
              <select id="game-activity-select" value={selectedGameId} onChange={(e) => setSelectedGameId(e.target.value)} disabled={taskActive} aria-label="Actividad gamificada">
                {GAME_ACTIVITY_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
              <span className="caption">Fases A-H disponibles · {selectedGame.description}</span>
            </div>
            {!taskActive ? (
              <button type="button" onClick={startTask} className="primary">
                ▶ Iniciar actividad
              </button>
            ) : (
              <button type="button" onClick={() => setTaskActive(false)} className="secondary">
                Detener actividad
              </button>
            )}
            <button type="button" onClick={() => handleGenerateReport('markdown')} disabled={!hasEnoughSamples(telemetry)} className="secondary">
              📝 Reporte MD
            </button>
          </div>
        </div>
        {cameraError && <p className="error">{cameraError}</p>}
        {faceWorker.error && <p className="error">Error de MediaPipe: {faceWorker.error}</p>}
      </section>

      {isCameraActive ? (
        <Dashboard
          videoRef={videoRef} isCameraActive={isCameraActive} showMesh={showMesh} setShowMesh={setShowMesh}
          telemetry={telemetry} faceWorker={faceWorker} statusClassName={statusClassName} lastQuality={lastQuality}
          calibrationProfile={calibrationProfile} calStatusLabel={calStatusLabel}
          insightItems={insightItems} auEntries={auEntries} activeAUCount={activeAUCount}
          edgeAIResult={edgeAIResult} edgeChannels={edgeChannels} edgeConfidence={edgeConfidence} edgeComposite={edgeComposite}
          latestLandmarks={latestLandmarks} latestGaze={latestGaze} latestPose={latestPose} moveNetPose={moveNetPose} moveNet={moveNet} auRegionSummary={telemetry.insights?.auRegionSummary}
          gameSummary={gameSummary}
          DEVICE_CONFIG={DEVICE_CONFIG}
          onCalibrateGazeCenter={handleCalibrateGazeCenter}
          onCalibratePostureUpright={handleCalibratePostureUpright}
          manualCalStatus={manualCalStatus}
        />
      ) : (
        <section className="grid-two">
          <article className="panel">
            <div className="panel-heading"><h2>1. Cámara y señal</h2></div>
            <div className="camera-container"><video ref={videoRef} className="camera" muted playsInline aria-label="Vista previa local de cámara" /></div>
            <p className="caption">Inicia la cámara para comenzar la telemetría.</p>
          </article>
          <article className="panel">
            <p className="caption">Inicia la cámara para ver indicadores de microgestos.</p>
          </article>
        </section>
      )}

      {taskActive && (
        <section className="panel task-panel" style={{ scrollMarginTop: '80px' }}>
          <div className="panel-heading">
            <div>
              <h2>🎮 {selectedGame.label}</h2>
              <p className="caption">Eventos de juego: {gameEventCount} · Eventos legacy: {taskEventCount}</p>
            </div>
          </div>
          {selectedGameId === 'simple_rt' && (
            <SimpleRTTask
              active={taskActive}
              onTrialStart={handleTaskStart}
              onTrialEnd={handleTaskEnd}
              onGameEvent={handleGameEvent}
              onComplete={handleTaskComplete}
              width={600} height={400}
            />
          )}
          {selectedGameId === 'precision_targeting' && (
            <PrecisionTargetingTask active={taskActive} onGameEvent={handleGameEvent} onComplete={handleTaskComplete} width={600} height={400}/>
          )}
          {selectedGameId === 'pursuit_tracking' && (
            <PursuitTrackingTask active={taskActive} onGameEvent={handleGameEvent} onComplete={handleTaskComplete} width={600} height={400} durationMs={6000}/>
          )}
          {selectedGameId === 'go_nogo' && (
            <GoNoGoTask active={taskActive} onGameEvent={handleGameEvent} onComplete={handleTaskComplete}/>
          )}
          {selectedGameId === 'color_interference' && (
            <ColorInterferenceTask active={taskActive} onGameEvent={handleGameEvent} onComplete={handleTaskComplete}/>
          )}
          {lastGameSummary && (
            <p className="caption">Último resultado: {Math.round((lastGameSummary.accuracy ?? lastGameSummary.meanScore ?? lastGameSummary.score ?? 0) * 100)}%</p>
          )}
          {gameSummary.eventCount > 0 && (
            <div className="summary-grid summary-grid-compact" style={{marginTop:'10px'}}>
              <div><span>Game events</span><strong>{gameSummary.eventCount}</strong></div>
              <div><span>Precisión</span><strong>{formatPercent(gameSummary.performance?.accuracy??0)}</strong></div>
              <div><span>RT medio</span><strong>{Math.round(gameSummary.performance?.meanReactionTimeMs??0)}ms</strong></div>
              <div><span>Motor</span><strong>{formatPercent(gameSummary.motor?.pathEfficiencyMean??gameSummary.motor?.smoothPursuitScore??0)}</strong></div>
            </div>
          )}
          <TaskImpact edgeAIResult={edgeAIResult} taskActive={taskActive} gameSummary={gameSummary} />
        </section>
      )}

      {sessions.length > 0 && (
        <section className="panel sessions-panel">
          <div className="panel-heading">
            <div><h2>4. Sesiones guardadas</h2><p className="caption">Historial de mediciones almacenadas localmente.</p></div>
            <button type="button" className="secondary" onClick={() => { clearSessionsSafe(); setSessions([]); }} style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}>Limpiar historial</button>
          </div>
          <div className="sessions-list">
            {sessions.map((session) => (
              <div className="session-row" key={session.id}>
                <div className="session-meta">
                  <span className="session-date">{new Date(session.savedAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'medium' })}</span>
                  <span className="session-duration">{session.durationMs ? `${(session.durationMs / 1000).toFixed(1)}s` : '—'}</span>
                  <span className="session-face-presence">Rostro: {formatPercent(session.facePresenceRatio)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {showReportModal && reportContent && (
        <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Reporte generado</h2>
              <button type="button" className="secondary" onClick={() => setShowReportModal(false)}>✕</button>
            </div>
            <div className="modal-tabs">
              {['markdown', 'html', 'json'].map((fmt) => (
                <button key={fmt} className={reportTab === fmt ? 'active' : ''} onClick={() => { setReportTab(fmt); handleGenerateReport(fmt); }}>{fmt.toUpperCase()}</button>
              ))}
            </div>
            <pre className="report-preview"><code>{reportContent}</code></pre>
            <div className="modal-actions">
              <button type="button" className="primary" onClick={handleExportReport}>Descargar</button>
            </div>
          </div>
        </div>
      )}

      <ReferenceGuide />
    </div>
  );
}