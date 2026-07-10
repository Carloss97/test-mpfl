import React from 'react';

const PIPELINE_STEPS = Object.freeze([
  {
    id: 'sync',
    kicker: 'Sincronización',
    title: 'performance.now()',
    body: 'Eventos de juego y señales disponibles se alinean con un reloj común de navegador.',
  },
  {
    id: 'local-inference',
    kicker: 'LOCAL INFERENCE',
    title: 'Browser / Edge AI',
    body: 'El navegador estima calidad de señal, resumen multimodal y canales observacionales sin enviar medios a servidor.',
  },
  {
    id: 'correlation',
    kicker: 'Agregado temporal',
    title: 'gameCorrelation.aggregate',
    body: 'Los trials se cruzan con ventanas resumidas antes/reacción/después para obtener métricas agregadas.',
  },
  {
    id: 'feature-vector',
    kicker: 'Vector estable',
    title: 'assessment_feature_vector_v2',
    body: 'La sesión se compacta en variables numéricas versionadas para reporte y análisis posterior.',
  },
  {
    id: 'report',
    kicker: 'Cierre',
    title: 'Reporte para revisión humana',
    body: 'El reporte final combina desempeño, calidad, caveats y gobernanza; no toma decisiones automáticas.',
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
        <span>No contiene datos reconstructivos</span>
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
    </div>
  );
}
