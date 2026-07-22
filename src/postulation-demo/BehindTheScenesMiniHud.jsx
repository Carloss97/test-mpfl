import React, { useState } from 'react';
import BehindTheScenesDrawer from './BehindTheScenesDrawer.jsx';

const STATUS_LABEL = Object.freeze({
  ok: 'OK',
  warning: 'Caveat',
  pending: 'Pendiente',
  error: 'Error',
  idle: 'En espera',
});

function normalizeStatus(value) {
  return ['ok', 'warning', 'pending', 'error', 'idle'].includes(value) ? value : 'idle';
}

function countReady(statuses) {
  return statuses.filter((status) => status === 'ok').length;
}

function reportValue(status) {
  if (status === 'pending') return 'Se generará al finalizar';
  return STATUS_LABEL[status];
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
    reportText: reportValue(report),
    readyCount,
    totalCount,
    caveats: Array.isArray(safeSnapshot.caveats) ? safeSnapshot.caveats : [],
    activityLabel: cameraUnavailable ? 'Cámara opcional no disponible' : idleBeforeStart ? 'Listo para comenzar' : 'Procesando en segundo plano',
    progressLabel: idleBeforeStart ? 'Puedes continuar sin cámara' : `Procesos listos ${readyCount} de ${totalCount}`,
  };
}

function StatusDot({ status }) {
  return <span className={`postulation-demo__hud-dot postulation-demo__hud-dot--${status}`} aria-hidden="true" />;
}

function StatusRow({ label, status, value }) {
  return (
    <div className="postulation-demo__hud-row">
      <span><StatusDot status={status} />{label}</span>
      <strong>{value ?? STATUS_LABEL[status]}</strong>
    </div>
  );
}

export default function BehindTheScenesMiniHud({ snapshot }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const status = buildBehindTheScenesStatus(snapshot);
  return (
    <aside className="postulation-demo__hud" aria-label="Procesamiento en segundo plano">
      <div className="postulation-demo__hud-topline">
        <span className="postulation-demo__hud-badge">{status.activityLabel}</span>
        <strong>{status.progressLabel}</strong>
      </div>
      <div className="postulation-demo__hud-grid">
        <StatusRow label="Cámara" status={status.camera} />
        <StatusRow label="Rostro" status={status.face} />
        <StatusRow label="Señal" status={status.signal} />
        <StatusRow label="Eventos capturados" status={status.eventStatus} value={String(status.events)} />
        <StatusRow label={status.report === 'pending' ? 'Reporte: se generará al finalizar' : 'Reporte'} status={status.report} value={status.reportText} />
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
        {drawerOpen ? 'Ocultar detalle' : 'Ver qué pasa detrás'}
      </button>
      {drawerOpen && <BehindTheScenesDrawer status={status} />}
      <p className="postulation-demo__hud-note">Señales locales agregadas · revisión humana</p>
    </aside>
  );
}
