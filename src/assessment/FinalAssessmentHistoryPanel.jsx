import React from 'react';
import { createStoredSessionDownloadDescriptors } from './finalAssessmentStorage.js';

export function downloadStoredSessionDescriptors(descriptors = [], { documentRef = globalThis.document, urlRef = globalThis.URL } = {}) {
  if (!documentRef || !urlRef?.createObjectURL) return false;
  descriptors.forEach((descriptor) => {
    const blob = new Blob([descriptor.content ?? ''], { type: descriptor.mimeType ?? 'text/plain' });
    const url = urlRef.createObjectURL(blob);
    const anchor = documentRef.createElement('a');
    anchor.href = url;
    anchor.download = descriptor.fileName ?? 'assessment-artifact.txt';
    anchor.click();
    urlRef.revokeObjectURL?.(url);
  });
  return true;
}

function fmtPct(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  return `${Math.round(numeric * 100)}%`;
}

function fmtDate(value) {
  if (!value) return 'fecha no disponible';
  try {
    return new Date(value).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'medium' });
  } catch {
    return String(value);
  }
}

export default function FinalAssessmentHistoryPanel({
  sessions = [],
  status = null,
  onRefresh,
  onClear,
  onDownloadSession,
} = {}) {
  const downloadSession = (session) => {
    const descriptors = createStoredSessionDownloadDescriptors(session);
    if (onDownloadSession) {
      onDownloadSession(session, descriptors);
      return;
    }
    downloadStoredSessionDescriptors(descriptors);
  };

  return (
    <section className="panel final-assessment-history-panel" aria-label="Historial local de evaluaciones finales">
      <div className="panel-heading">
        <div>
          <h2>5. Evaluaciones finales guardadas</h2>
          <p className="caption">Payload final + manifiesto + reportes almacenados localmente, sin video ni datos crudos.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {onRefresh && <button type="button" className="secondary" onClick={onRefresh}>Actualizar</button>}
          {onClear && <button type="button" className="secondary" onClick={onClear}>Limpiar finales</button>}
        </div>
      </div>

      {status && <p className="caption" role="status">{status}</p>}

      {sessions.length === 0 ? (
        <p className="caption">Sin evaluaciones finales guardadas todavía. Completa la batería y genera el reporte para guardar la primera sesión final.</p>
      ) : (
        <div className="sessions-list">
          {sessions.map((session) => (
            <div className="session-row" key={session.id ?? session.runId}>
              <div className="session-meta">
                <span className="session-date">{fmtDate(session.savedAt)}</span>
                <span className="session-duration">Run: {session.runId ?? '—'}</span>
                <span className="session-face-presence">Rostro: {fmtPct(session.quality?.facePresenceRatio)}</span>
                <span className="session-face-presence">Accuracy: {fmtPct(session.summary?.accuracy)}</span>
                <span className="session-face-presence">Archivos: {session.bundle?.manifest?.fileCount ?? session.bundle?.files?.length ?? 0}</span>
              </div>
              <button type="button" className="primary" onClick={() => downloadSession(session)}>
                Descargar artefactos
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
