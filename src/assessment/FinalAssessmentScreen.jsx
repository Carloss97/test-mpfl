import React from 'react';

export default function FinalAssessmentScreen({ state = 'completed', onGenerateReport, onCompleteRecovery }) {
  if (state === 'recovery') {
    return (
      <div className="dash-section-body">
        <p className="caption">Recuperación final: mantener postura estable para comparar post-tarea.</p>
        <button type="button" className="primary" onClick={onCompleteRecovery}>Completar recuperación</button>
      </div>
    );
  }

  if (state === 'report_ready') {
    return <p className="caption">Reporte de batería listo para la siguiente fase de payload final.</p>;
  }

  return (
    <div className="dash-section-body">
      <p className="caption">Batería completada. El siguiente paso genera payload/reporte final.</p>
      <button type="button" className="primary" onClick={onGenerateReport}>Generar reporte de batería</button>
    </div>
  );
}
