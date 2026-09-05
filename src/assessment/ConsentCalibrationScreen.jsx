import React from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import SignalReadinessPanel from './SignalReadinessPanel.jsx';

export default function ConsentCalibrationScreen({
  stage = 'consent',
  cameraActive = false,
  onAcceptConsent,
  onRequestCamera,
  onStartBaseline,
  onCompleteBaseline,
  onCancel,
  signalReadiness,
}) {
  const { t } = useLanguage();
  if (stage === 'consent') {
    return (
      <div className="dash-section-body">
        <p className="caption">{t('Consentimiento: cámara local, agregados privacy-safe y reporte para revisión humana. No se guarda video, frames, landmarks crudos ni trayectorias crudas.', 'Consent: local camera, privacy-safe aggregates, and a report for human review. No video, frames, raw landmarks, or raw trajectories are stored.')}</p>
        <button type="button" className="primary" onClick={onAcceptConsent}>{t('Acepto condiciones', 'I accept the terms')}</button>
        {onCancel && <button type="button" className="secondary" onClick={onCancel}>{t('Cancelar evaluación', 'Cancel assessment')}</button>}
      </div>
    );
  }

  if (stage === 'camera_check') {
    return (
      <div className="dash-section-body">
        <p className="caption">{cameraActive ? t('Cámara lista para baseline.', 'Camera ready for baseline.') : t('Se requiere cámara activa para iniciar la batería evaluativa.', 'An active camera is required to start the assessment battery.')}</p>
        <SignalReadinessPanel cameraActive={cameraActive} {...signalReadiness} />
        {cameraActive ? (
          <button type="button" className="primary" onClick={onStartBaseline}>{t('Iniciar baseline', 'Start baseline')}</button>
        ) : (
          <button type="button" className="primary" onClick={onRequestCamera}>{t('Iniciar cámara', 'Start camera')}</button>
        )}
        {onCancel && <button type="button" className="secondary" onClick={onCancel}>{t('Cancelar evaluación', 'Cancel assessment')}</button>}
      </div>
    );
  }

  return (
    <div className="dash-section-body">
      <p className="caption">{t('Baseline neutral: mantener postura estable y mirar al centro. En esta primera fase el cierre es manual; Fase S añadirá temporizador guiado.', 'Neutral baseline: keep a stable posture and look at the center. In this first phase the closure is manual; Phase S will add a guided timer.')}</p>
      <button type="button" className="primary" onClick={onCompleteBaseline}>{t('Completar baseline', 'Complete baseline')}</button>
      {onCancel && <button type="button" className="secondary" onClick={onCancel}>{t('Cancelar evaluación', 'Cancel assessment')}</button>}
    </div>
  );
}
