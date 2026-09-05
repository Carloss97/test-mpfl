import React, { useCallback, useRef, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import PostulationConsentSetup from './PostulationConsentSetup.jsx';
import PostulationGameStage from './PostulationGameStage.jsx';
import PostulationLanding from './PostulationLanding.jsx';
import BackgroundSignalOrchestrator from './BackgroundSignalOrchestrator.jsx';
import PostulationReportScreen from './PostulationReportScreen.jsx';
import { buildPostulationDemoFixture, isPostulationFixtureMode } from './postulationDemoFixture.js';
import { buildPostulationDemoArtifacts } from './postulationDemoSessionBuilder.js';
import { getPostulationDemoBattery, getPostulationDemoBatteryId, listVisiblePostulationBlocks, normalizePostulationDemoBatteryMode, resolvePostulationDemoBatteryMode } from './postulationDemoConfig.js';
import { parseInviteToken, validateInvitationToken, runIdForInvitation, INVITATION_STATUS, INVITATION_GUARD_MESSAGES } from './postulationDemoInvite.js';
import './postulationDemo.css';
import './originalGameThemes.css';
import './originalGameAnimations.css';

function sameSnapshot(a, b) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function triggerDownload(descriptor) {
  if (!descriptor || typeof document === 'undefined') return;
  const blob = new Blob([descriptor.content ?? ''], { type: descriptor.mimeType ?? 'text/plain' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = descriptor.fileName ?? 'krumm-report.txt';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function buildInitialDemoState(requestedBatteryMode) {
  const batteryMode = requestedBatteryMode == null
    ? resolvePostulationDemoBatteryMode()
    : normalizePostulationDemoBatteryMode(requestedBatteryMode);
  const batteryId = getPostulationDemoBatteryId(batteryMode);
  const blocks = listVisiblePostulationBlocks(getPostulationDemoBattery(batteryMode));
  const inviteToken = parseInviteToken(globalThis.location?.search ?? '');
  if (!isPostulationFixtureMode()) {
    return {
      phase: inviteToken ? 'invite-check' : 'landing',
      inviteToken,
      inviteStatus: inviteToken ? INVITATION_STATUS.CHECKING : null,
      demoSummary: null, demoArtifacts: null, batteryMode, batteryId, blocks,
    };
  }
  const fixture = buildPostulationDemoFixture({ batteryMode });
  return {
    phase: 'report-preview',
    demoSummary: fixture.summary,
    demoArtifacts: fixture.artifacts,
    batteryMode, batteryId, blocks,
    inviteToken,
    inviteStatus: null,
  };
}

export default function PostulationDemoApp({ gameComponents, batteryMode: requestedBatteryMode } = {}) {
  const initialStateRef = useRef(null);
  if (initialStateRef.current === null) initialStateRef.current = buildInitialDemoState(requestedBatteryMode);
  const { batteryMode, batteryId, blocks, inviteToken, inviteStatus } = initialStateRef.current;
  const gameEventsRef = useRef([]);
  const signalContextRef = useRef(null);
  const [phase, setPhase] = useState(initialStateRef.current.phase);
  const [backgroundActive, setBackgroundActive] = useState(false);
  const [signalSnapshot, setSignalSnapshot] = useState(null);
  const [gameEventCount, setGameEventCount] = useState(0);
  const [demoSummary, setDemoSummary] = useState(initialStateRef.current.demoSummary);
  const [demoArtifacts, setDemoArtifacts] = useState(initialStateRef.current.demoArtifacts);
  const [reportError, setReportError] = useState(null);

  const handleSnapshot = useCallback((nextSnapshot) => {
    if (nextSnapshot?.camera === 'error') setBackgroundActive(false);
    setSignalSnapshot((previous) => (sameSnapshot(previous, nextSnapshot) ? previous : nextSnapshot));
  }, []);

  const handleSignalContext = useCallback((nextContext) => {
    signalContextRef.current = nextContext;
  }, []);

  const handleGameEvent = useCallback((event) => {
    if (!event) return;
    gameEventsRef.current.push(event);
    if (gameEventsRef.current.length > 1000) {
      gameEventsRef.current.splice(0, gameEventsRef.current.length - 1000);
    }
    setGameEventCount((count) => count + 1);
  }, []);

  const handleDownloadFile = useCallback((descriptor) => {
    triggerDownload(descriptor);
  }, []);

  const handleDownloadAll = useCallback((descriptors = []) => {
    descriptors.forEach((descriptor) => triggerDownload(descriptor));
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

  const finishDemo = useCallback((summary) => {
    const completedDemo = { ...summary, batteryMode, batteryId };
    const runId = inviteToken ? runIdForInvitation(inviteToken) : `postulation-demo-${Date.now()}`;
    setDemoSummary(completedDemo);
    try {
      const artifacts = buildPostulationDemoArtifacts({
        completedDemo, batteryMode,
        cameraConsent: backgroundActive,
        gameEvents: gameEventsRef.current,
        signalSnapshot, signalContext: signalContextRef.current,
        runId, invitationToken: inviteToken ?? null,
      });
      setDemoArtifacts(artifacts);
      setReportError(null);
    } catch (error) {
      setDemoArtifacts(null);
      setReportError(error?.message ?? String(error));
    }
    setPhase('report-preview');
  }, [backgroundActive, batteryId, batteryMode, inviteToken, signalSnapshot]);

  if (phase === 'invite-invalid') {
    return (
      <main className="postulation-demo__invite-guard postulation-demo__invite-guard--invalid">
        <h1>{t('Invitación no válida', 'Invalid invitation')}</h1>
        <p>{t('No pudimos validar tu enlace.', 'We could not validate your link.')}</p>
      </main>
    );
  }

  if (phase === 'setup') {
    return (
      <div className="postulation-demo" data-demo-phase="setup" data-battery-mode={batteryMode}>
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
      <div className="postulation-demo postulation-demo--gameplay" data-demo-phase="gameplay" data-battery-mode={batteryMode}>
        <BackgroundSignalOrchestrator active={backgroundActive} eventCount={gameEventCount} mode="hidden" onSnapshot={handleSnapshot} onSignalContext={handleSignalContext} />
        <PostulationGameStage
          blocks={blocks}
          gameComponents={gameComponents}
          signalSnapshot={signalSnapshot}
          onGameEvent={handleGameEvent}
          onCompleteDemo={finishDemo}
        />
      </div>
    );
  }

  if (phase === 'report-preview') {
    return (
      <div className="postulation-demo" data-demo-phase="report-preview" data-battery-mode={batteryMode}>
        <PostulationReportScreen
          artifacts={demoArtifacts}
          completedDemo={demoSummary}
          reportError={reportError}
          onRestart={goLanding}
          onDownloadFile={handleDownloadFile}
          onDownloadAll={handleDownloadAll}
        />
      </div>
    );
  }

  return (
    <div className="postulation-demo" data-demo-phase="landing" data-battery-mode={batteryMode}>
      <PostulationLanding batteryMode={batteryMode} onStart={() => setPhase('setup')} />
    </div>
  );
}