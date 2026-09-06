import React, { useState } from 'react';
import BehindTheScenesDrawer from './BehindTheScenesDrawer.jsx';
import { useLanguage } from '../i18n/LanguageContext.jsx';

function statusLabel(status, t) {
  if (status === 'pending') return t('Pendiente', 'Pending');
  if (status === 'error') return t('Error', 'Error');
  if (status === 'idle') return t('En espera', 'On hold');
  return t('Caveat', 'Caveat');
}

function normalizeStatus(value) {
  return ['ok', 'warning', 'pending', 'error', 'idle'].includes(value) ? value : 'idle';
}

function countReady(statuses) {
  return statuses.filter((status) => status === 'ok').length;
}

function reportValue(status, t) {
  if (status === 'pending') return t('Se generará al finalizar', 'Will be generated at the end');
  return statusLabel(status, t);
}

export function buildBehindTheScenesStatus(snapshot = {}) {
  const safeSnapshot = snapshot ?? {};
  const camera = normalizeStatus(safeSnapshot.camera);
  const face = normalizeStatus(safeSnapshot.face);
  const signal = normalizeStatus(safeSnapshot.signal);
  const report = normalizeStatus(safeSnapshot.report ?? 'pending');
  const eventCount = Math.max(0, Number(safeSnapshot.events ?? 0) || 0);
  const eventStatus = eventCount > 0 ? 'ok' : normalizeStatus(safeSnapshot.eventStatus ?? 'pending');
  const statuses = [camera, face, signal, eventStatus, report];
  const idleBeforeStart = camera === 'idle' && face === 'idle' && signal === 'idle' && eventCount === 0;
  const cameraUnavailable = camera === 'error';
  const readyCount = Number.isFinite(Number(safeSnapshot.readyCount)) ? Number(safeSnapshot.readyCount) : countReady(statuses);
  const totalCount = Number.isFinite(Number(safeSnapshot.totalCount)) ? Number(safeSnapshot.totalCount) : 5;
  return {
    camera,
    face,
    signal,
    events: eventCount,
    eventStatus,
    report,
    reportText: reportValue(report, (es, en) => (en ?? es)),
    readyCount,
    totalCount,
    caveats: Array.isArray(safeSnapshot.caveats) ? safeSnapshot.caveats : [],
    activityLabel: cameraUnavailable
      ? 'Cámara opcional no disponible'
      : idleBeforeStart
        ? 'Listo para comenzar'
        : 'Procesando en segundo plano',
    progressLabel: idleBeforeStart ? 'Puedes continuar sin cámara' : `${readyCount} de ${totalCount} listos`,
  };
}

function StatusDot({ status }) {
  return <span className={`postulation-demo__hud-dot postulation-demo__hud-dot--${status}`} aria-hidden="true" />;
}

function StatusRow({ label, status, value, t }) {
  return (
    <div className="postulation-demo__hud-row">
      <span><StatusDot status={status} />{label}</span>
      <strong>{value ?? statusLabel(status, t)}</strong>
    </div>
  );
}

export default function BehindTheScenesMiniHud({ snapshot }) {
  const { t } = useLanguage();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const status = buildBehindTheScenesStatus(snapshot);
  const activityText = status.camera === 'error'
    ? t('Cámara opcional no disponible', 'Optional camera unavailable')
    : status.activityLabel === 'Listo para comenzar'
      ? t('Listo para comenzar', 'Ready to start')
      : t('Procesando en segundo plano', 'Processing in the background');
  const progressText = status.activityLabel === 'Listo para comenzar' || (status.camera === 'idle' && status.face === 'idle' && status.signal === 'idle' && status.events === 0)
    ? t('Puedes continuar sin cámara', 'You can continue without a camera')
    : t('{ready} de {total} listos', '{ready} of {total} ready', { ready: status.readyCount, total: status.totalCount });
  return (
    <aside className="postulation-demo__hud" aria-label={t('Procesamiento en segundo plano', 'Background processing')}>
      <div className="postulation-demo__hud-topline">
        <span className="postulation-demo__hud-badge">{activityText}</span>
        <strong>{progressText}</strong>
      </div>
      <div className="postulation-demo__hud-grid">
        <StatusRow label={t('Cámara', 'Camera')} status={status.camera} t={t} />
        <StatusRow label={t('Rostro', 'Face')} status={status.face} t={t} />
        <StatusRow label={t('Señal', 'Signal')} status={status.signal} t={t} />
        <StatusRow label={t('Eventos capturados', 'Captured events')} status={status.eventStatus} value={String(status.events)} t={t} />
        <StatusRow label={status.report === 'pending' ? t('Reporte: se generará al finalizar', 'Report: will be generated at the end') : t('Reporte', 'Report')} status={status.report} value={status.report === 'pending' ? t('Se generará al finalizar', 'Will be generated at the end') : statusLabel(status.report, t)} t={t} />
      </div>
      {status.caveats.length > 0 && (
        <div className="postulation-demo__hud-caveats">
          {status.caveats.slice(0, 2).map((caveat) => <span key={caveat}>{caveat}</span>)}
        </div>
      )}
      <button
        type="button"
        className="postulation-demo__hud-toggle"
        aria-expanded={drawerOpen}
        onClick={() => setDrawerOpen((open) => !open)}
      >
        {drawerOpen ? t('Ocultar detalle', 'Hide details') : t('Ver qué pasa detrás', 'See what happens behind')}
      </button>
      {drawerOpen && <BehindTheScenesDrawer status={status} />}
      <p className="postulation-demo__hud-note">{t('Señales locales agregadas · revisión humana', 'Aggregated local signals · human review')}</p>
    </aside>
  );
}
