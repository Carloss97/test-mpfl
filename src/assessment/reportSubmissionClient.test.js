import { describe, expect, it, vi } from 'vitest';
import { FINAL_ASSESSMENT_PAYLOAD_SCHEMA } from './finalAssessmentPayload.js';
import {
  REPORT_DELIVERY_BUNDLE_SCHEMA,
  buildLocalReportBundle,
  createReportDownloadDescriptors,
  submitAssessmentReport,
} from './reportSubmissionClient.js';

const payload = {
  schemaVersion: FINAL_ASSESSMENT_PAYLOAD_SCHEMA,
  runId: 'run-x-001',
  batteryId: 'krumm_unified_battery_v1',
  generatedAt: '2026-06-19T01:20:00.000Z',
  quality: { sampleCount: 180 },
  behavioral: { gameSummary: { performance: { accuracy: 0.8 } } },
  talentProfile: { schemaVersion: 'krumm_talent_profile_v1', dimensions: {}, globalSummary: {} },
  edgeAI: { modelVersion: 'krumm-edge-ai-v9.1.0-game-aware' },
  governance: { humanReviewOnly: true, noAutomatedDecision: true, observationalOnly: true, privacySafe: true },
};

const reports = [
  { format: 'markdown', mimeType: 'text/markdown', fileName: 'report.md', content: '# Reporte' },
  { format: 'html', mimeType: 'text/html', fileName: 'report.html', content: '<h1>Reporte</h1>' },
  { format: 'json', mimeType: 'application/json', fileName: 'report.json', content: { ok: true } },
];

describe('reportSubmissionClient', () => {
  it('builds local report bundle descriptors for download without raw fields', () => {
    const bundle = buildLocalReportBundle({ payload, reports, researchExports: [{ fileName: 'research.jsonl', mimeType: 'application/x-ndjson', content: '{"ok":true}' }] });

    expect(bundle).toMatchObject({
      schemaVersion: REPORT_DELIVERY_BUNDLE_SCHEMA,
      deliveryMode: 'local',
      runId: 'run-x-001',
      validation: { ok: true, violations: [] },
    });
    expect(bundle.files.map((file) => file.fileName)).toEqual(['report.md', 'report.html', 'report.json', 'research.jsonl']);
    expect(bundle.payload).toEqual(payload);
    expect(bundle.manifest.includesStructuredPayload).toBe(true);
    expect(JSON.stringify(bundle)).not.toContain('faceSamples');
  });

  it('creates browser download descriptors with stable filenames and content strings', () => {
    const descriptors = createReportDownloadDescriptors({ payload, reports });
    expect(descriptors).toHaveLength(3);
    expect(descriptors[0]).toMatchObject({ fileName: 'report.md', mimeType: 'text/markdown' });
    expect(descriptors[2].content).toContain('"ok":true');
  });

  it('submits to a future backend only after payload validation', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 201, json: async () => ({ id: 'remote-report-1' }) }));
    const result = await submitAssessmentReport({ payload, reports, endpoint: '/api/assessment-reports', fetchImpl });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][0]).toBe('/api/assessment-reports');
    const submitted = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(submitted.schemaVersion).toBe(REPORT_DELIVERY_BUNDLE_SCHEMA);
    expect(submitted.deliveryMode).toBe('http');
    expect(submitted.payload).toMatchObject({ schemaVersion: FINAL_ASSESSMENT_PAYLOAD_SCHEMA, runId: 'run-x-001' });
    expect(result).toEqual({ ok: true, status: 201, id: 'remote-report-1' });
  });

  it('rejects unsafe payloads before local bundle or remote submission', async () => {
    const unsafe = { ...payload, behavioral: { rawGameEvents: [] } };
    expect(() => buildLocalReportBundle({ payload: unsafe, reports })).toThrow(/Unsafe final assessment payload/);
    await expect(submitAssessmentReport({ payload: unsafe, reports, endpoint: '/api/x', fetchImpl: vi.fn() })).rejects.toThrow(/Unsafe final assessment payload/);
  });
});
