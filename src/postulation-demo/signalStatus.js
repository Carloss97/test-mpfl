// Fuente única de estados de señal para el flujo candidato (H2).
// `buildBehindTheScenesStatus` se mueve sin cambios de BehindTheScenesMiniHud.jsx
// (2026-09-07, H2): el HUD/drawer "qué pasa detrás" se elimina; esta función sigue
// siendo la normalizadora de estados que consume `SignalErrorHint`.

function normalizeStatus(value) {
  return ['ok', 'warning', 'pending', 'error', 'idle'].includes(value) ? value : 'idle';
}

function countReady(statuses) {
  return statuses.filter((status) => status === 'ok').length;
}

function statusLabel(status, t) {
  if (status === 'pending') return t('Pendiente', 'Pending');
  if (status === 'error') return t('Error', 'Error');
  if (status === 'idle') return t('En espera', 'On hold');
  return t('Caveat', 'Caveat');
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

// Regla H2.1 (plan docs/plans/2026-09-07-plan-ux-vistas-idioma-landing.md):
// un solo indicador a la vez, por prioridad. `blocking` = único estado que ofrece
// "Detener evaluación" (decisión 2 del usuario): error de cámara sostenido.
export function getSignalErrorHint(status = {}) {
  if (status.camera === 'error') return { key: 'camera-error', blocking: true };
  if (status.face === 'error') return { key: 'face-error', blocking: false };
  if (status.signal === 'warning') return { key: 'signal-warning', blocking: false };
  if (status.face === 'warning') return { key: 'face-warning', blocking: false };
  return null;
}
