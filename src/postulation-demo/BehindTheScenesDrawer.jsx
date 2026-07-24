import React from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';

function buildPipelineSteps(t) {
  return [
    {
      id: 'sync',
      kicker: t('Sincronización', 'Synchronization'),
      title: t('Reloj único de la sesión', 'Single session clock'),
      body: t(
        'KRUMM alinea juegos y señales locales con el mismo tiempo interno para que el reporte sea consistente.',
        'KRUMM aligns games and local signals with the same internal clock so the report is consistent.',
      ),
      technical: 'performance.now()',
    },
    {
      id: 'local-inference',
      kicker: t('Procesamiento local', 'Local processing'),
      title: t('Procesamiento local en navegador', 'In-browser local processing'),
      body: t(
        'La cámara, calidad de señal y eventos del juego se resumen en tu navegador antes de generar evidencia agregada.',
        'Camera, signal quality, and game events are summarized in your browser before producing aggregated evidence.',
      ),
      technical: 'LOCAL INFERENCE · Browser / Edge AI',
    },
    {
      id: 'correlation',
      kicker: t('Evidencia agregada', 'Aggregated evidence'),
      title: t('Cruce de juego y señales', 'Game and signal correlation'),
      body: t(
        'El sistema resume qué ocurrió alrededor de cada respuesta sin guardar rutas de puntero ni datos reconstructivos.',
        'The system summarizes what happened around each response without storing pointer paths or reconstructive data.',
      ),
      technical: 'gameCorrelation.aggregate',
    },
    {
      id: 'feature-vector',
      kicker: t('Resumen estable', 'Stable summary'),
      title: t('Vector de evaluación', 'Assessment vector'),
      body: t(
        'Las métricas quedan compactadas en variables versionadas para el reporte y futura revisión de RR.HH.',
        'Metrics are compacted into versioned variables for the report and future HR review.',
      ),
      technical: 'assessment_feature_vector_v2',
    },
    {
      id: 'report',
      kicker: t('Cierre humano', 'Human closing'),
      title: t('Reporte para revisión humana', 'Report for human review'),
      body: t(
        'Al terminar, KRUMM prepara un reporte observacional con caveats. No toma decisiones automáticas.',
        'At the end, KRUMM prepares an observational report with caveats. It makes no automated decisions.',
      ),
      technical: 'human-review-only report bundle',
    },
  ];
}

export function buildBehindTheScenesPipeline(status = {}) {
  const steps = buildPipelineSteps((es) => es);
  return steps.map((step) => {
    if (step.id === 'sync') return { ...step, status: status.eventStatus === 'ok' ? 'ok' : 'pending' };
    if (step.id === 'local-inference') return { ...step, status: status.signal === 'ok' ? 'ok' : status.signal === 'warning' ? 'warning' : 'pending' };
    if (step.id === 'report') return { ...step, status: status.report === 'ok' ? 'ok' : 'pending' };
    return { ...step, status: status.events > 0 ? 'ok' : 'pending' };
  });
}

export default function BehindTheScenesDrawer({ snapshot }) {
  const { t } = useLanguage();
  const steps = buildPipelineSteps(t);
  return (
    <div className="postulation-demo__hud-drawer" aria-label={t('Detalle del procesamiento local', 'Local processing detail')}>
      <div className="postulation-demo__hud-drawer-head">
        <strong>{t('Qué pasa detrás', 'What happens behind')}</strong>
        <span>{t('Sin video, frames ni rutas reconstructivas. Solo señales locales agregadas.', 'No video, frames, or reconstructive paths. Only aggregated local signals.')}</span>
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
        <summary>{t('Detalle técnico', 'Technical detail')}</summary>
        <ul>
          {steps.map((step) => <li key={`${step.id}-technical`}>{step.technical}</li>)}
        </ul>
        <p>{t('No contiene datos reconstructivos.', 'Contains no reconstructive data.')}</p>
      </details>
    </div>
  );
}
