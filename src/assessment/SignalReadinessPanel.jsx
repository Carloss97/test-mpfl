import React from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';

const STATUS_LABELS = Object.freeze({
  ok: 'OK',
  pending: 'Pendiente',
  warning: 'Caveat',
  error: 'Error',
});

function clamp01(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(1, numeric));
}

function pct(value) {
  return `${Math.round(clamp01(value) * 100)}%`;
}

function item(label, status, detail, action) {
  return { label, status, detail, action };
}

function isWorkerReady(status) {
  return status === 'ready' || status === 'running';
}

function isWorkerLoading(status) {
  return status === 'loading' || status === 'loading-model' || status === 'initializing';
}

export function buildSignalReadinessItems({
  cameraActive = false,
  telemetry = {},
  faceWorker = {},
  latestGaze = null,
  latestPose = null,
  moveNet = {},
  moveNetPose = null,
  activeAUCount = 0,
} = {}) {
  const sampleCount = Number(telemetry.sampleCount ?? 0);
  const facePresenceRatio = clamp01(telemetry.facePresenceRatio ?? 0);
  const meanConfidence = clamp01(telemetry.meanConfidence ?? 0);
  const gazeConfidence = clamp01(latestGaze?.confidence ?? 0);
  const postureScore = clamp01(latestPose?.postureScore ?? 0);
  const moveNetConfidence = clamp01(moveNetPose?.confidence ?? 0);
  const moveNetCoverage = clamp01(moveNetPose?.upperBodyCoverage ?? 0);
  const faceStatus = faceWorker?.status ?? 'idle';
  const moveNetStatus = moveNet?.status ?? 'idle';

  const faceMeshStatus = faceWorker?.error || faceStatus === 'error'
    ? 'error'
    : isWorkerReady(faceStatus) && sampleCount > 0
      ? 'ok'
      : isWorkerLoading(faceStatus) || cameraActive
        ? 'pending'
        : 'pending';

  const moveNetItemStatus = moveNet?.error || moveNetStatus === 'error'
    ? 'error'
    : moveNetConfidence >= 0.45
        ? 'ok'
        : isWorkerReady(moveNetStatus)
          ? 'warning'
          : !cameraActive || moveNetStatus === 'idle'
            ? 'pending'
            : 'pending';

  return [
    item(
      'Cámara',
      cameraActive ? 'ok' : 'pending',
      cameraActive ? 'Vista previa local activa' : 'Activa la cámara antes de baseline',
      cameraActive ? 'Mantener encuadre estable' : 'Usar botón Iniciar cámara',
    ),
    item(
      'FaceMesh',
      faceMeshStatus,
      faceMeshStatus === 'ok'
        ? `${sampleCount} muestras · delegate ${faceWorker?.delegate ?? '—'}`
        : faceMeshStatus === 'error'
          ? faceWorker?.error ?? 'Worker de rostro en error'
          : 'Esperando detector de rostro',
      'Esperar 2-3 s después de activar cámara',
    ),
    item(
      'Rostro',
      facePresenceRatio >= 0.7 ? 'ok' : sampleCount > 0 ? 'warning' : 'pending',
      `${pct(facePresenceRatio)} rostro presente`,
      facePresenceRatio >= 0.7 ? 'Encuadre suficiente' : 'Centrar rostro y mejorar iluminación',
    ),
    item(
      'Confianza facial',
      meanConfidence >= 0.55 ? 'ok' : sampleCount > 0 ? 'warning' : 'pending',
      `${pct(meanConfidence)} confianza`,
      meanConfidence >= 0.55 ? 'Calidad suficiente' : 'Aumentar luz frontal y evitar oclusiones',
    ),
    item(
      'AUs/FACS',
      activeAUCount > 0 ? 'ok' : sampleCount > 0 ? 'warning' : 'pending',
      `${Math.max(0, Number(activeAUCount) || 0)} AUs activos`,
      activeAUCount > 0 ? 'Señal expresiva disponible' : 'Esperar más muestras o revisar detector',
    ),
    item(
      'Gaze',
      gazeConfidence >= 0.35 ? 'ok' : latestGaze ? 'warning' : 'pending',
      latestGaze ? `${pct(gazeConfidence)} confianza de mirada` : 'calibrando mirada',
      gazeConfidence >= 0.35 ? 'Mirada usable como señal observacional' : 'Mirar al centro y esperar autocalibración',
    ),
    item(
      'Postura',
      postureScore >= 0.35 ? 'ok' : latestPose ? 'warning' : 'pending',
      latestPose ? `${pct(postureScore)} score de postura` : 'calibrando postura',
      postureScore >= 0.35 ? 'Postura facial/tronco proxy disponible' : 'Sentarse estable y calibrar postura erguida si hace falta',
    ),
    item(
      'MoveNet',
      moveNetItemStatus,
      moveNetItemStatus === 'ok'
        ? `${pct(moveNetConfidence)} hombros · ${pct(moveNetCoverage)} cobertura`
        : moveNetItemStatus === 'error'
          ? moveNet?.error ?? 'MoveNet en error'
          : isWorkerReady(moveNetStatus)
            ? 'sin hombros detectados'
            : 'cargando detector de hombros',
      moveNetItemStatus === 'ok' ? 'Hombros detectados' : 'Alejarse hasta que ambos hombros entren en cuadro',
    ),
    item(
      'Privacidad',
      'ok',
      'Agregados locales; revisión humana',
      'Sin persistencia de crudos reconstructivos',
    ),
  ];
}

export default function SignalReadinessPanel(props) {
  const { t } = useLanguage();
  const items = buildSignalReadinessItems(props);
  const okCount = items.filter((entry) => entry.status === 'ok').length;
  const blockingErrors = items.filter((entry) => entry.status === 'error').length;

  return (
    <section className="dash-section" aria-label={t('Listo de señal', 'Signal readiness')}>
      <div className="dash-section-hdr" style={{ cursor: 'default', userSelect: 'none' }}>
        <span className="dash-section-arrow">◆</span>
        <h3 className="dash-section-title">{t('Listo de señal', 'Signal readiness')}</h3>
        <span className="dash-section-badge">{okCount}/{items.length} OK</span>
      </div>
      <div className="dash-section-body">
        <h4>{t('Checklist antes del baseline', 'Checklist before baseline')}</h4>
        <p className="caption">{t('Confirma que las señales críticas estén visibles y explica cualquier caveat operativo.', 'Confirm the critical signals are visible and explain any operational caveat.')}</p>
        {blockingErrors > 0 && <p className="error" role="alert">{t('Hay', 'There are')} {blockingErrors} {t('señal(es) en error. Puedes continuar solo si explicas el caveat.', 'signal(s) in error. You may continue only if you explain the caveat.')}</p>}
        <div className="summary-grid summary-grid-compact">
          {items.map((entry) => (
            <div key={entry.label} data-testid={`readiness-${entry.label}`}>
              <span>{entry.label}</span>
              <strong>{STATUS_LABELS[entry.status] ?? entry.status}</strong>
              <small className="caption">{entry.detail}</small>
              <small className="caption">{entry.action}</small>
            </div>
          ))}
        </div>
        <ul className="caption">
          <li>{t('Si MoveNet no detecta hombros, aléjate hasta que ambos hombros entren en cuadro.', 'If MoveNet does not detect shoulders, step back until both shoulders are in frame.')}</li>
          <li>{t('La prueba puede continuar con caveats; no se inventan hombros ni datos faltantes.', 'The assessment may continue with caveats; no shoulders or missing data are invented.')}</li>
          <li>{t('No se guarda video, frames, landmarks crudos ni trayectorias de puntero.', 'No video, frames, raw landmarks, or pointer trajectories are stored.')}</li>
        </ul>
      </div>
    </section>
  );
}
