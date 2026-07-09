import React, { useCallback, useRef, useState } from 'react';
import PostulationConsentSetup from './PostulationConsentSetup.jsx';
import PostulationGameStage from './PostulationGameStage.jsx';
import PostulationLanding from './PostulationLanding.jsx';
import BackgroundSignalOrchestrator from './BackgroundSignalOrchestrator.jsx';
import { buildPostulationDemoArtifacts } from './postulationDemoSessionBuilder.js';
import './postulationDemo.css';

function sameSnapshot(a, b) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function reportPreviewText(artifacts) {
  const markdown = artifacts?.reports?.find((report) => report.format === 'markdown')?.content ?? '';
  return markdown.split('\n').slice(0, 28).join('\n');
}

export default function PostulationDemoApp({ gameComponents } = {}) {
  const gameEventsRef = useRef([]);
  const signalContextRef = useRef(null);
  const [phase, setPhase] = useState('landing');
  const [backgroundActive, setBackgroundActive] = useState(false);
  const [signalSnapshot, setSignalSnapshot] = useState(null);
  const [gameEventCount, setGameEventCount] = useState(0);
  const [demoSummary, setDemoSummary] = useState(null);
  const [demoArtifacts, setDemoArtifacts] = useState(null);
  const [reportError, setReportError] = useState(null);

  const handleSnapshot = useCallback((nextSnapshot) => {
    setSignalSnapshot((previous) => (sameSnapshot(previous, nextSnapshot) ? previous : nextSnapshot));
  }, []);

  const handleSignalContext = useCallback((nextContext) => {
    signalContextRef.current = nextContext;
  }, []);

  const goLanding = useCallback(() => {
    setBackgroundActive(false);
    setGameEventCount(0);
    gameEventsRef.current = [];
    signalContextRef.current = null;
    setDemoSummary(null);
    setDemoArtifacts(null);
    setReportError(null);
    setPhase('landing');
  }, []);

  const handleGameEvent = useCallback((event) => {
    if (event) gameEventsRef.current = [...gameEventsRef.current, event].slice(-1000);
    setGameEventCount((count) => count + 1);
  }, []);

  const finishDemo = useCallback((summary) => {
    setDemoSummary(summary);
    try {
      const artifacts = buildPostulationDemoArtifacts({
        completedDemo: summary,
        gameEvents: gameEventsRef.current,
        signalSnapshot,
        signalContext: signalContextRef.current,
      });
      setDemoArtifacts(artifacts);
      setReportError(null);
    } catch (error) {
      setDemoArtifacts(null);
      setReportError(error?.message ?? String(error));
    }
    setPhase('report-preview');
  }, [signalSnapshot]);

  if (phase === 'setup') {
    return (
      <div className="postulation-demo" data-demo-phase="setup">
        <PostulationConsentSetup
          backgroundActive={backgroundActive}
          signalSnapshot={signalSnapshot}
          onEnableCamera={() => setBackgroundActive(true)}
          onContinue={() => setPhase('gameplay')}
          onBack={goLanding}
        >
          <BackgroundSignalOrchestrator active={backgroundActive} eventCount={gameEventCount} onSnapshot={handleSnapshot} onSignalContext={handleSignalContext} />
        </PostulationConsentSetup>
      </div>
    );
  }

  if (phase === 'gameplay') {
    return (
      <div className="postulation-demo postulation-demo--gameplay" data-demo-phase="gameplay">
        <BackgroundSignalOrchestrator active={backgroundActive} eventCount={gameEventCount} mode="hidden" onSnapshot={handleSnapshot} onSignalContext={handleSignalContext} />
        <PostulationGameStage
          gameComponents={gameComponents}
          signalSnapshot={signalSnapshot}
          onGameEvent={handleGameEvent}
          onCompleteDemo={finishDemo}
        />
      </div>
    );
  }

  if (phase === 'report-preview') {
    const validationOk = demoArtifacts?.payload?.validation?.ok === true;
    return (
      <div className="postulation-demo" data-demo-phase="report-preview">
        <section className="postulation-demo__report-preview" aria-labelledby="postulation-report-title">
          <span className="postulation-demo__eyebrow">Fase D</span>
          <h1 id="postulation-report-title">Reporte generado</h1>
          <p>Completaste {demoSummary?.completedCount ?? 0} de {demoSummary?.totalCount ?? 0} juegos. KRUMM ya preparó una sesión final agregada, payload validado y bundle local para revisión humana.</p>
          {reportError && <p className="postulation-demo__report-error">No se pudo generar el reporte: {reportError}</p>}
          {demoArtifacts && (
            <div className="postulation-demo__report-grid">
              <div>
                <span>Run ID</span>
                <strong>{demoArtifacts.runId}</strong>
              </div>
              <div>
                <span>Validación</span>
                <strong>{validationOk ? 'OK privacy-safe' : 'Bloqueada'}</strong>
              </div>
              <div>
                <span>Archivos</span>
                <strong>{demoArtifacts.bundle.manifest.fileCount}</strong>
              </div>
              <div>
                <span>Muestras</span>
                <strong>{demoArtifacts.assessmentSession.qualitySummary.sampleCount}</strong>
              </div>
            </div>
          )}
          {demoArtifacts && (
            <pre className="postulation-demo__report-text" aria-label="Preview del reporte final">
              {reportPreviewText(demoArtifacts)}
            </pre>
          )}
          <button type="button" className="postulation-demo__primary" onClick={goLanding}>
            Reiniciar demo
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="postulation-demo" data-demo-phase="landing">
      <PostulationLanding onStart={() => setPhase('setup')} />
    </div>
  );
}
