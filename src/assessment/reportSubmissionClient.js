import { validateFinalAssessmentPayload } from './finalAssessmentPayload.js';

export const REPORT_DELIVERY_BUNDLE_SCHEMA = 'krumm_report_delivery_bundle_v1';

function stringifyContent(content) {
  return typeof content === 'string' ? content : JSON.stringify(content);
}

function assertSafePayload(payload) {
  const validation = validateFinalAssessmentPayload(payload);
  if (!validation.ok) {
    throw new Error(`Unsafe final assessment payload: ${validation.violations.join(', ')}`);
  }
  return validation;
}

export function createReportDownloadDescriptors({ payload, reports = [], researchExports = [] } = {}) {
  assertSafePayload(payload);
  return [...reports, ...researchExports].map((item, index) => ({
    fileName: item.fileName ?? `${payload.runId ?? 'assessment'}-artifact-${index + 1}.txt`,
    mimeType: item.mimeType ?? 'text/plain',
    content: stringifyContent(item.content ?? ''),
  }));
}

export function buildLocalReportBundle({ payload, reports = [], researchExports = [], generatedAt = new Date().toISOString() } = {}) {
  const validation = assertSafePayload(payload);
  return {
    schemaVersion: REPORT_DELIVERY_BUNDLE_SCHEMA,
    deliveryMode: 'local',
    runId: payload.runId ?? null,
    batteryId: payload.batteryId ?? null,
    generatedAt,
    validation,
    manifest: {
      fileCount: reports.length + researchExports.length,
      reportFormats: reports.map((report) => report.format ?? report.mimeType ?? 'unknown'),
      researchExportCount: researchExports.length,
    },
    files: createReportDownloadDescriptors({ payload, reports, researchExports }),
  };
}

export async function submitAssessmentReport({ payload, reports = [], researchExports = [], endpoint, fetchImpl = globalThis.fetch } = {}) {
  if (!endpoint) throw new Error('endpoint_required');
  if (typeof fetchImpl !== 'function') throw new Error('fetch_unavailable');
  const bundle = buildLocalReportBundle({ payload, reports, researchExports });
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bundle),
  });
  const body = typeof response.json === 'function' ? await response.json() : {};
  return {
    ok: Boolean(response.ok),
    status: response.status,
    id: body.id ?? body.reportId ?? null,
  };
}
