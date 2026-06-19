import React from 'react';

export default function ConsentCalibrationScreen({
  stage = 'consent',
  cameraActive = false,
  onAcceptConsent,
  onRequestCamera,
  onStartBaseline,
  onCompleteBaseline,
  onCancel,
}) {
  if (stage === 'consent') {
    return (
      <div className="dash-section-body">
        <p className="caption">Consentimiento: cámara local, agregados privacy-safe y reporte para revisión humana. No se guarda video, frames, landmarks crudos ni trayectorias crudas.</p>
        <button type="button" className="primary" onClick={onAcceptConsent}>Acepto condiciones</button>
        {onCancel && <button type="button" className="secondary" onClick={onCancel}>Cancelar evaluación</button>}
      </div>
    );
  }

  if (stage === 'camera_check') {
    return (
      <div className="dash-section-body">
        <p className="caption">{cameraActive ? 'Cámara lista para baseline.' : 'Se requiere cámara activa para iniciar la batería evaluativa.'}</p>
        {cameraActive ? (
          <button type="button" className="primary" onClick={onStartBaseline}>Iniciar baseline</button>
        ) : (
          <button type="button" className="primary" onClick={onRequestCamera}>Iniciar cámara</button>
        )}
        {onCancel && <button type="button" className="secondary" onClick={onCancel}>Cancelar evaluación</button>}
      </div>
    );
  }

  return (
    <div className="dash-section-body">
      <p className="caption">Baseline neutral: mantener postura estable y mirar al centro. En esta primera fase el cierre es manual; Fase S añadirá temporizador guiado.</p>
      <button type="button" className="primary" onClick={onCompleteBaseline}>Completar baseline</button>
      {onCancel && <button type="button" className="secondary" onClick={onCancel}>Cancelar evaluación</button>}
    </div>
  );
}
