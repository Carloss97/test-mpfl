import React, { useCallback, useEffect, useMemo, useState } from 'react';
import SimpleRTTask from '../tasks/SimpleRTTask.jsx';
import PrecisionTargetingTask from '../tasks/PrecisionTargetingTask.jsx';
import PursuitTrackingTask from '../tasks/PursuitTrackingTask.jsx';
import GoNoGoTask from '../tasks/GoNoGoTask.jsx';
import ColorInterferenceTask from '../tasks/ColorInterferenceTask.jsx';
import VisualSearchTask from '../tasks/VisualSearchTask.jsx';
import BatteryProgress from './BatteryProgress.jsx';
import BlockInstructionScreen from './BlockInstructionScreen.jsx';
import ConsentCalibrationScreen from './ConsentCalibrationScreen.jsx';
import FinalAssessmentScreen from './FinalAssessmentScreen.jsx';
import { UNIFIED_BATTERY_CONFIG } from './batteryConfig.js';
import {
  BATTERY_STATES,
  advanceBatteryState,
  createBatterySession,
  deriveBatteryProgress,
  getCurrentBatteryBlock,
} from './batteryRuntime.js';

const DEFAULT_GAME_COMPONENTS = Object.freeze({
  simple_rt: SimpleRTTask,
  precision_targeting: PrecisionTargetingTask,
  pursuit_tracking: PursuitTrackingTask,
  go_nogo: GoNoGoTask,
  color_interference: ColorInterferenceTask,
  visual_search: VisualSearchTask,
});

const STATE_LABELS = Object.freeze({
  [BATTERY_STATES.IDLE]: 'idle',
  [BATTERY_STATES.CONSENT]: 'Consentimiento',
  [BATTERY_STATES.CAMERA_CHECK]: 'Check de cámara',
  [BATTERY_STATES.BASELINE]: 'Baseline neutral',
  [BATTERY_STATES.INSTRUCTIONS]: 'Instrucciones',
  [BATTERY_STATES.RUNNING_BLOCK]: 'Bloque activo',
  [BATTERY_STATES.REST]: 'Descanso',
  [BATTERY_STATES.RECOVERY]: 'Recuperación',
  [BATTERY_STATES.COMPLETED]: 'Completada',
  [BATTERY_STATES.REPORT_READY]: 'Reporte listo',
  [BATTERY_STATES.CANCELLED]: 'cancelled',
});

function now() {
  return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
}

function stateLabel(state) {
  return STATE_LABELS[state] ?? state;
}

export default function UnifiedGameBattery({
  config = UNIFIED_BATTERY_CONFIG,
  cameraActive = false,
  gameComponents = {},
  onRequestCamera,
  onGameEvent,
  onBatterySessionChange,
  onBatteryComplete,
  onBlockComplete,
} = {}) {
  const [session, setSession] = useState(() => createBatterySession({ config, now: now() }));
  const [notice, setNotice] = useState(null);
  const progress = deriveBatteryProgress(session);
  const currentBlock = getCurrentBatteryBlock(session);
  const componentMap = useMemo(() => ({ ...DEFAULT_GAME_COMPONENTS, ...gameComponents }), [gameComponents]);
  const CurrentGame = currentBlock ? componentMap[currentBlock.gameId] : null;

  useEffect(() => {
    onBatterySessionChange?.(session);
    if (session.state === BATTERY_STATES.REPORT_READY) onBatteryComplete?.(session);
  }, [session, onBatterySessionChange, onBatteryComplete]);

  const dispatch = useCallback((action) => {
    setSession((previous) => advanceBatteryState(previous, { ...action, timestamp: action.timestamp ?? now() }));
  }, []);

  const startConsent = useCallback(() => {
    setNotice(null);
    dispatch({ type: 'START_CONSENT' });
  }, [dispatch]);

  const acceptConsent = useCallback(() => {
    setNotice(null);
    dispatch({ type: 'ACCEPT_CONSENT' });
  }, [dispatch]);

  const startBaseline = useCallback(() => {
    if (!cameraActive) {
      setNotice('Se requiere cámara activa para iniciar la batería evaluativa.');
      onRequestCamera?.();
      return;
    }
    setNotice(null);
    dispatch({ type: 'CAMERA_READY' });
  }, [cameraActive, dispatch, onRequestCamera]);

  const completeBlock = useCallback((summary) => {
    onBlockComplete?.({ block: currentBlock, summary });
    dispatch({ type: 'BLOCK_COMPLETE', result: summary ?? null });
  }, [currentBlock, dispatch, onBlockComplete]);

  const cancelBattery = useCallback(() => {
    dispatch({ type: 'CANCEL', reason: 'participant_requested' });
  }, [dispatch]);

  const totalLabel = `${progress.completedBlocks}/${progress.totalBlocks}`;

  return (
    <section className="panel unified-battery-panel" aria-label="Evaluación gamificada unificada">
      <div className="panel-heading">
        <div>
          <h2>🧭 Evaluación gamificada unificada</h2>
          <p className="caption">Secuencia R-Z · modo {config.mode} · progreso {totalLabel}</p>
        </div>
        <span className="dash-section-badge">Estado: {stateLabel(session.state)}</span>
      </div>

      <BatteryProgress completedBlocks={progress.completedBlocks} totalBlocks={progress.totalBlocks} currentBlock={currentBlock} state={session.state} />

      {notice && <p className="caption" role="status">{notice}</p>}

      {session.state === BATTERY_STATES.IDLE && (
        <button type="button" className="primary" onClick={startConsent}>Preparar evaluación</button>
      )}

      {session.state === BATTERY_STATES.CONSENT && (
        <ConsentCalibrationScreen stage="consent" onAcceptConsent={acceptConsent} onCancel={cancelBattery} />
      )}

      {session.state === BATTERY_STATES.CAMERA_CHECK && (
        <ConsentCalibrationScreen
          stage="camera_check"
          cameraActive={cameraActive}
          onRequestCamera={startBaseline}
          onStartBaseline={startBaseline}
          onCancel={cancelBattery}
        />
      )}

      {session.state === BATTERY_STATES.BASELINE && (
        <ConsentCalibrationScreen stage="baseline" onCompleteBaseline={() => dispatch({ type: 'BASELINE_COMPLETE' })} onCancel={cancelBattery} />
      )}

      {session.state === BATTERY_STATES.INSTRUCTIONS && currentBlock && (
        <BlockInstructionScreen block={currentBlock} totalBlocks={progress.totalBlocks} onStartBlock={() => dispatch({ type: 'START_BLOCK' })} onCancel={cancelBattery} />
      )}

      {session.state === BATTERY_STATES.RUNNING_BLOCK && currentBlock && CurrentGame && (
        <div className="dash-section-body">
          <h3>{currentBlock.label}</h3>
          <CurrentGame
            active
            trialCount={currentBlock.trialCount}
            durationMs={currentBlock.durationMs}
            width={600}
            height={400}
            onGameEvent={onGameEvent}
            onComplete={completeBlock}
          />
        </div>
      )}

      {session.state === BATTERY_STATES.REST && (
        <div className="dash-section-body">
          <p className="caption">Descanso breve antes del siguiente bloque.</p>
          <button type="button" className="primary" onClick={() => dispatch({ type: 'REST_COMPLETE' })}>Continuar</button>
          <button type="button" className="secondary" onClick={cancelBattery}>Cancelar evaluación</button>
        </div>
      )}

      {session.state === BATTERY_STATES.RECOVERY && (
        <FinalAssessmentScreen state="recovery" onCompleteRecovery={() => dispatch({ type: 'RECOVERY_COMPLETE' })} />
      )}

      {session.state === BATTERY_STATES.COMPLETED && (
        <FinalAssessmentScreen state="completed" onGenerateReport={() => dispatch({ type: 'REPORT_READY' })} />
      )}

      {session.state === BATTERY_STATES.REPORT_READY && (
        <FinalAssessmentScreen state="report_ready" />
      )}

      {session.state === BATTERY_STATES.CANCELLED && (
        <p className="caption">Evaluación cancelada por el participante.</p>
      )}
    </section>
  );
}
