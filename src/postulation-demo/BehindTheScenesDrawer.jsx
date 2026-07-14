import React from 'react';

const PIPELINE_STEPS = Object.freeze([
  {
    id: 'sync',
    kicker: 'Sincronización',
    title: 'Reloj único de la sesión',
    body: 'KRUMM alinea juegos y señales locales con el mismo tiempo interno para que el reporte sea consistente.',
    technical: 'performance.now()',
  },
  {
    id: 'local-inference',
    kicker: 'Procesamiento local',
    title: 'Procesamiento local en navegador',
    body: 'La cámara, calidad de señal y eventos del juego se resumen en tu navegador antes de generar evidencia agregada.',
    technical: 'LOCAL INFERENCE · Browser / Edge AI',
  },
  {
    id: 'correlation',
    kicker: 'Evidencia agregada',
    title: 'Cruce de juego y señales',
    body: 'El sistema resume qué ocurrió alrededor de cada respuesta sin guardar rutas de puntero ni datos reconstructivos.',
    technical: 'gameCorrelation.aggregate',
  },
  {
    id: 'feature-vector',
    kicker: 'Resumen estable',
    title: 'Vector de evaluación',
    body: 'Las métricas quedan compactadas en variables versionadas para el reporte y futura revisión de RR.HH.',
    technical: 'assessment_feature_vector_v2',
  },
  {
    id: 'report',
    kicker: 'Cierre humano',
    title: 'Reporte para revisión humana',
    body: 'Al terminar, KRUMM prepara un reporte observacional con caveats. No toma decisiones automáticas.',
    technical: 'human-review-only report bundle',
  },
]);

export function buildBehindTheScenesPipeline(status = {}) {
  return PIPELINE_STEPS.map((step) => {
    if (step.id === 'sync') return { ...step, status: status.eventStatus === 'ok' ? 'ok' : 'pending' };
    if (step.id === 'local-inference') return { ...step, status: status.signal === 'ok' ? 'ok' : status.signal === 'warning' ? 'warning' : 'pending' };
    if (step.id === 'report') return { ...step, status: status.report === 'ok' ? 'ok' : 'pending' };
    return { ...step, status: status.events > 0 ? 'ok' : 'pending' };
  });
}

export default function BehindTheScenesDrawer({ status }) {
  const steps = buildBehindTheScenesPipeline(status);
  return (
    <div className="postulation-demo__hud-drawer" aria-label="Detalle del procesamiento local">
      <div className="postulation-demo__hud-drawer-head">
        <strong>Qué pasa detrás</strong>
        <span>Sin video, frames ni rutas reconstructivas. Solo señales locales agregadas.</span>
      </div>
      <ol className="postulation-demo__hud-pipeline">
        {steps.map((step) => (
          <li key={step.id} className={`postulation-demo__hud-pipeline-step postulation-demo__hud-pipeline-step--${step.status}`}>
            <span>{step.kicker}</span>
            <strong>{step.title}</strong>
            <p>{step.body}</p>
          </li>
        ))}
      </ol>
      <details className="postulation-demo__hud-technical-details">
        <summary>Detalle técnico</summary>
        <ul>
          {steps.map((step) => <li key={`${step.id}-technical`}>{step.technical}</li>)}
        </ul>
        <p>No contiene datos reconstructivos.</p>
      </details>
    </div>
  );
}
