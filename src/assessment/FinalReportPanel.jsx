import React, { useMemo, useState } from 'react';

function pct(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  return `${Math.round(numeric * 100)}%`;
}

function stringifyContent(content) {
  return typeof content === 'string' ? content : JSON.stringify(content);
}

function prettyJson(value) {
  try {
    return JSON.stringify(typeof value === 'string' ? JSON.parse(value) : value, null, 2);
  } catch {
    return String(value ?? '');
  }
}

function reportByFormat(reports = [], format) {
  return reports.find((report) => report.format === format)
    ?? reports.find((report) => String(report.fileName ?? '').toLowerCase().endsWith(`.${format === 'markdown' ? 'md' : format}`))
    ?? null;
}

function normalizeReportDescriptor(report, index = 0, runId = 'assessment') {
  return {
    fileName: report.fileName ?? `${runId}-report-${index + 1}.txt`,
    mimeType: report.mimeType ?? 'text/plain',
    content: stringifyContent(report.content ?? ''),
  };
}

function uniqueViolations(payload = {}, bundle = {}) {
  return [...new Set([
    ...(payload.validation?.violations ?? []),
    ...(bundle.validation?.violations ?? []),
  ])];
}

export function formatReportPreview(content) {
  if (content && typeof content === 'object') return prettyJson(content);
  return String(content ?? '');
}

export function buildFinalReportDownloadDescriptors({ payload, reports = [], bundle = {} } = {}) {
  const runId = payload?.runId ?? bundle?.runId ?? 'assessment';
  const normalizedReports = reports.length
    ? reports.map((report, index) => normalizeReportDescriptor(report, index, runId))
    : (bundle.files ?? []).map((file, index) => normalizeReportDescriptor(file, index, runId));

  return [
    {
      fileName: `${runId}-final-payload.json`,
      mimeType: 'application/json',
      content: JSON.stringify(payload ?? {}, null, 2),
    },
    {
      fileName: `${runId}-report-manifest.json`,
      mimeType: 'application/json',
      content: JSON.stringify({
        schemaVersion: bundle?.schemaVersion ?? 'krumm_report_delivery_bundle_v1',
        runId,
        batteryId: payload?.batteryId ?? bundle?.batteryId ?? null,
        generatedAt: bundle?.generatedAt ?? payload?.generatedAt ?? null,
        validation: bundle?.validation ?? payload?.validation ?? null,
        manifest: bundle?.manifest ?? { fileCount: normalizedReports.length },
      }, null, 2),
    },
    ...normalizedReports,
  ];
}

export default function FinalReportPanel({
  payload = null,
  reports = [],
  bundle = null,
  storageRecord = null,
  onDownloadFile,
  onDownloadAll,
  onSaveAgain,
} = {}) {
  const [activeFormat, setActiveFormat] = useState('markdown');
  const safePayload = payload ?? storageRecord?.payload ?? null;
  const safeBundle = bundle ?? storageRecord?.bundle ?? null;
  const validationOk = safePayload?.validation?.ok === true && (safeBundle?.validation?.ok ?? true) === true;
  const violations = uniqueViolations(safePayload ?? {}, safeBundle ?? {});
  const descriptors = useMemo(() => buildFinalReportDownloadDescriptors({ payload: safePayload, reports, bundle: safeBundle }), [safePayload, reports, safeBundle]);

  const selectedReport = reportByFormat(reports, activeFormat)
    ?? descriptors.find((descriptor) => descriptor.fileName.toLowerCase().endsWith(activeFormat === 'markdown' ? '.md' : `.${activeFormat}`));
  const preview = formatReportPreview(selectedReport?.content ?? 'Reporte no disponible todavía.');

  const downloadDescriptor = (descriptor) => {
    if (!validationOk || !descriptor) return;
    onDownloadFile?.(descriptor);
  };

  const downloadAll = () => {
    if (!validationOk) return;
    onDownloadAll?.(descriptors);
  };

  const markdownDescriptor = descriptors.find((descriptor) => descriptor.fileName.toLowerCase().endsWith('.md'));
  const htmlDescriptor = descriptors.find((descriptor) => descriptor.fileName.toLowerCase().endsWith('.html'));
  const jsonDescriptor = descriptors.find((descriptor) => descriptor.fileName.toLowerCase().endsWith('.json') && descriptor.fileName.includes('report'));
  const payloadDescriptor = descriptors.find((descriptor) => descriptor.fileName.endsWith('-final-payload.json'));
  const manifestDescriptor = descriptors.find((descriptor) => descriptor.fileName.endsWith('-report-manifest.json'));

  return (
    <section className="panel final-report-panel" aria-label="Reporte final de evaluación">
      <div className="panel-heading">
        <div>
          <h2>📄 Reporte final listo</h2>
          <p className="caption">Reporte observacional para revisión humana; sin decisión automatizada.</p>
        </div>
        <span className="dash-section-badge">{validationOk ? 'Validación OK' : 'Validación bloqueada'}</span>
      </div>

      {!safePayload ? (
        <p className="caption">Completa la batería para generar el payload y reporte final.</p>
      ) : (
        <>
          <div className="guide-summary-grid" aria-label="Resumen del reporte final">
            <div><span>Run</span><strong>{safePayload.runId ?? '—'}</strong></div>
            <div><span>Batería</span><strong>{safePayload.batteryId ?? '—'}</strong></div>
            <div><span>Muestras</span><strong>Muestras: {safePayload.quality?.sampleCount ?? 0}</strong></div>
            <div><span>Rostro</span><strong>Rostro: {pct(safePayload.quality?.facePresenceRatio)}</strong></div>
            <div><span>Confianza</span><strong>Confianza facial: {pct(safePayload.quality?.meanConfidence)}</strong></div>
            <div><span>Trials correlacionados</span><strong>{safePayload.quality?.correlatedTrialCount ?? 0}</strong></div>
          </div>

          <p className="caption">Gobernanza: revisión humana · sin decisión automatizada · observacional · privacy-safe.</p>
          {violations.length > 0 && (
            <p className="error" role="alert">Violaciones detectadas: {violations.join(', ')}</p>
          )}

          <div className="modal-tabs" aria-label="Formato de preview final">
            {[
              ['markdown', 'Markdown'],
              ['html', 'HTML'],
              ['json', 'JSON'],
            ].map(([format, label]) => (
              <button
                key={format}
                type="button"
                className={activeFormat === format ? 'active' : ''}
                onClick={() => setActiveFormat(format)}
              >
                {label}
              </button>
            ))}
          </div>

          <pre className="report-preview" data-testid="final-report-preview"><code>{preview}</code></pre>

          <div className="modal-actions" style={{ flexWrap: 'wrap' }}>
            <button type="button" className="primary" disabled={!validationOk || !markdownDescriptor} onClick={() => downloadDescriptor(markdownDescriptor)}>Descargar Markdown</button>
            <button type="button" className="secondary" disabled={!validationOk || !htmlDescriptor} onClick={() => downloadDescriptor(htmlDescriptor)}>Descargar HTML</button>
            <button type="button" className="secondary" disabled={!validationOk || !jsonDescriptor} onClick={() => downloadDescriptor(jsonDescriptor)}>Descargar JSON</button>
            <button type="button" className="secondary" disabled={!validationOk || !payloadDescriptor} onClick={() => downloadDescriptor(payloadDescriptor)}>Descargar payload</button>
            <button type="button" className="secondary" disabled={!validationOk || !manifestDescriptor} onClick={() => downloadDescriptor(manifestDescriptor)}>Descargar manifiesto</button>
            <button type="button" className="primary" disabled={!validationOk} onClick={downloadAll}>Descargar todo</button>
            {onSaveAgain && <button type="button" className="secondary" disabled={!validationOk} onClick={onSaveAgain}>Guardar de nuevo</button>}
          </div>
        </>
      )}
    </section>
  );
}
