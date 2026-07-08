import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FinalReportPanel, { buildFinalReportDownloadDescriptors, formatReportPreview } from './FinalReportPanel.jsx';
import { FINAL_ASSESSMENT_PAYLOAD_SCHEMA } from './finalAssessmentPayload.js';

const payload = {
  schemaVersion: FINAL_ASSESSMENT_PAYLOAD_SCHEMA,
  runId: 'run-ac-001',
  batteryId: 'krumm_unified_battery_v1',
  generatedAt: '2026-07-08T15:00:00.000Z',
  participant: { aliasHash: null, declaredRoleTarget: null },
  quality: { sampleCount: 180, facePresenceRatio: 0.92, meanConfidence: 0.86, correlatedTrialCount: 24, caveats: ['lighting_moderate'] },
  behavioral: { gameSummary: { performance: { accuracy: 0.86, completedTrialCount: 24 } } },
  talentProfile: { schemaVersion: 'krumm_talent_profile_v1', dimensions: {}, globalSummary: { strengths: ['Control inhibitorio'], watchAreas: [], confidence: 0.82 } },
  edgeAI: { modelVersion: 'krumm-edge-ai-v9.1.0-game-aware', composite: { score: 76 }, confidence: { score: 0.82 }, channels: {}, caveats: [] },
  governance: { humanReviewOnly: true, noAutomatedDecision: true, observationalOnly: true, privacySafe: true },
  validation: { ok: true, violations: [] },
};

const reports = [
  { format: 'markdown', mimeType: 'text/markdown', fileName: 'run-ac-001-report.md', content: '# KRUMM\nReporte para revisión humana.' },
  { format: 'html', mimeType: 'text/html', fileName: 'run-ac-001-report.html', content: '<h1>KRUMM</h1><p>Reporte HTML</p>' },
  { format: 'json', mimeType: 'application/json', fileName: 'run-ac-001-report.json', content: { schemaVersion: 'krumm_talent_report_v1', ok: true } },
];

const bundle = {
  schemaVersion: 'krumm_report_delivery_bundle_v1',
  runId: 'run-ac-001',
  batteryId: 'krumm_unified_battery_v1',
  generatedAt: '2026-07-08T15:01:00.000Z',
  validation: { ok: true, violations: [] },
  manifest: { fileCount: 3, reportFormats: ['markdown', 'html', 'json'], researchExportCount: 0 },
  files: reports.map((report) => ({
    fileName: report.fileName,
    mimeType: report.mimeType,
    content: typeof report.content === 'string' ? report.content : JSON.stringify(report.content),
  })),
};

describe('FinalReportPanel', () => {
  it('renders final report metadata, validation, quality and human-review copy', () => {
    render(<FinalReportPanel payload={payload} reports={reports} bundle={bundle} />);

    expect(screen.getByRole('heading', { name: /Reporte final listo/i })).toBeInTheDocument();
    expect(screen.getByText(/run-ac-001/i)).toBeInTheDocument();
    expect(screen.getByText(/krumm_unified_battery_v1/i)).toBeInTheDocument();
    expect(screen.getByText(/Validación OK/i)).toBeInTheDocument();
    expect(screen.getByText(/Muestras: 180/i)).toBeInTheDocument();
    expect(screen.getByText(/Rostro: 92%/i)).toBeInTheDocument();
    expect(screen.getByText(/Confianza facial: 86%/i)).toBeInTheDocument();
    expect(screen.getAllByText(/revisión humana/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/sin decisión automatizada/i).length).toBeGreaterThan(0);
  });

  it('previews markdown, html and json as safe text without rendering HTML', () => {
    render(<FinalReportPanel payload={payload} reports={reports} bundle={bundle} />);

    expect(screen.getByTestId('final-report-preview')).toHaveTextContent('# KRUMM');
    fireEvent.click(screen.getByRole('button', { name: /^HTML$/i }));
    expect(screen.getByTestId('final-report-preview')).toHaveTextContent('<h1>KRUMM</h1>');
    expect(screen.queryByRole('heading', { name: 'KRUMM' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^JSON$/i }));
    expect(screen.getByTestId('final-report-preview')).toHaveTextContent('krumm_talent_report_v1');
  });

  it('builds payload, manifest and report descriptors for download', () => {
    const descriptors = buildFinalReportDownloadDescriptors({ payload, reports, bundle });
    expect(descriptors.map((descriptor) => descriptor.fileName)).toEqual([
      'run-ac-001-final-payload.json',
      'run-ac-001-report-manifest.json',
      'run-ac-001-report.md',
      'run-ac-001-report.html',
      'run-ac-001-report.json',
    ]);
    expect(descriptors[0].content).toContain(FINAL_ASSESSMENT_PAYLOAD_SCHEMA);
    expect(descriptors[1].content).toContain('krumm_report_delivery_bundle_v1');
  });

  it('calls download callbacks with single file and all descriptors', () => {
    const onDownloadFile = vi.fn();
    const onDownloadAll = vi.fn();
    render(<FinalReportPanel payload={payload} reports={reports} bundle={bundle} onDownloadFile={onDownloadFile} onDownloadAll={onDownloadAll} />);

    fireEvent.click(screen.getByRole('button', { name: /Descargar Markdown/i }));
    expect(onDownloadFile).toHaveBeenCalledWith(expect.objectContaining({ fileName: 'run-ac-001-report.md' }));

    fireEvent.click(screen.getByRole('button', { name: /Descargar todo/i }));
    expect(onDownloadAll).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ fileName: 'run-ac-001-final-payload.json' }),
      expect.objectContaining({ fileName: 'run-ac-001-report-manifest.json' }),
    ]));
  });

  it('blocks downloads and shows violations when validation fails', () => {
    const unsafePayload = {
      ...payload,
      validation: { ok: false, violations: ['rawGameEvents', 'landmarks'] },
    };
    render(<FinalReportPanel payload={unsafePayload} reports={reports} bundle={{ ...bundle, validation: { ok: false, violations: ['rawGameEvents'] } }} />);

    expect(screen.getByText(/Validación bloqueada/i)).toBeInTheDocument();
    expect(screen.getByText(/rawGameEvents/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Descargar todo/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Descargar Markdown/i })).toBeDisabled();
  });
});

describe('formatReportPreview', () => {
  it('formats object content as pretty JSON', () => {
    expect(formatReportPreview({ ok: true })).toContain('"ok": true');
  });
});
