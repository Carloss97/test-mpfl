import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
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
import {
  BATTERY_MODE_OPTIONS,
  UNIFIED_BATTERY_CONFIG,
  getBatteryConfigByMode,
  getBatteryModeLabel,
  listBatteryConfigs,
} from './batteryConfig.js';
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
  signalReadiness = {},
} = {}) {
  const { t } = useLanguage();
  const availableConfigs = useMemo(() => {
    const defaults = listBatteryConfigs();
    return defaults.some((item) => item.id === config.id) ? defaults : [config, ...defaults];
  }, [config]);
  const [selectedMode, setSelectedMode] = useState(config.mode ?? 'standardized');
  const selectedConfig = useMemo(() => (
    availableConfigs.find((item) => item.mode === selectedMode) ?? getBatteryConfigByMode(selectedMode)
  ), [availableConfigs, selectedMode]);
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

  const changeBatteryMode = useCallback((event) => {
    const nextMode = event.target.value;
    const nextConfig = availableConfigs.find((item) => item.mode === nextMode) ?? getBatteryConfigByMode(nextMode);
    setSelectedMode(nextMode);
    setNotice(null);
    setSession(createBatterySession({ config: nextConfig, now: now() }));
  }, [availableConfigs]);

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
      setNotice(t('Se requiere cámara activa para iniciar la batería evaluativa.', 'An active camera is required to start the assessment battery.'));
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
  const modeLocked = session.state !== BATTERY_STATES.IDLE;

  return (
    <section className="panel unified-battery-panel" aria-label={t('Evaluación gamificada unificada', 'Unified gamified assessment')}>
      <div className="panel-heading">
        <div>
          <h2>🧭 {t('Evaluación gamificada unificada', 'Unified gamified assessment')}</h2>
          <p className="caption">{t('Secuencia R-Z · modo', 'Sequence R-Z · mode')} {selectedConfig.mode} · {getBatteryModeLabel(selectedConfig)} · {t('progreso', 'progress')} {totalLabel}</p>
        </div>
        <span className="dash-section-badge">{t('Estado', 'Status')}: {stateLabel(session.state)}</span>
      </div>

      <div className="dash-section-body" style={{ display: 'flex', gap: '0.75rem', alignItems: 'end', flexWrap: 'wrap' }}>
        <label className="caption" htmlFor="battery-mode-select" style={{ display: 'grid', gap: '0.25rem' }}>
          {t('Modo de batería', 'Battery mode')}
          <select id="battery-mode-select" value={selectedMode} onChange={changeBatteryMode} disabled={modeLocked} aria-label={t('Modo de batería', 'Battery mode')}>
            {BATTERY_MODE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </label>
        <p className="caption">{modeLocked ? t('Modo bloqueado durante una evaluación activa.', 'Mode locked during an active assessment.') : t('Elige demo rápida para reuniones o evaluación estándar para comparabilidad.', 'Choose quick demo for meetings or standard assessment for comparability.')}</p>
      </div>

      <BatteryProgress completedBlocks={progress.completedBlocks} totalBlocks={progress.totalBlocks} currentBlock={currentBlock} state={session.state} />

      {notice && <p className="caption" role="status">{notice}</p>}

      {session.state === BATTERY_STATES.IDLE && (
        <button type="button" className="primary" onClick={startConsent}>{t('Preparar evaluación', 'Prepare assessment')}</button>
      )}

      {session.state === BATTERY_STATES.CONSENT && (
        <ConsentCalibrationScreen stage="consent" onAcceptConsent={acceptConsent} onCancel={cancelBattery} />
      )}

      {session.state === BATTERY_STATES.CAMERA_CHECK && (
        <ConsentCalibrationScreen
          stage="camera_check"
          cameraActive={cameraActive}
          signalReadiness={signalReadiness}
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
          <p className="caption">{t('Descanso breve antes del siguiente bloque.', 'Short break before the next block.')}</p>
          <button type="button" className="primary" onClick={() => dispatch({ type: 'REST_COMPLETE' })}>{t('Continuar', 'Continue')}</button>
          <button type="button" className="secondary" onClick={cancelBattery}>{t('Cancelar evaluación', 'Cancel assessment')}</button>
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
        <p className="caption">{t('Evaluación cancelada por el participante.', 'Assessment cancelled by the participant.')}</p>
      )}
    </section>
  );
}
