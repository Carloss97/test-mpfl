import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FINAL_ASSESSMENT_PAYLOAD_SCHEMA } from './finalAssessmentPayload.js';
import FinalAssessmentHistoryPanel, { downloadStoredSessionDescriptors } from './FinalAssessmentHistoryPanel.jsx';
import { buildFinalAssessmentStorageRecord } from './finalAssessmentStorage.js';

const payload = {
  schemaVersion: FINAL_ASSESSMENT_PAYLOAD_SCHEMA,
  runId: 'run-history-001',
  batteryId: 'krumm_unified_battery_v1',
  generatedAt: '2026-07-08T12:00:00.000Z',
  quality: { sampleCount: 120, facePresenceRatio: 0.9, meanConfidence: 0.8, correlatedTrialCount: 6, caveats: [] },
  behavioral: { gameSummary: { performance: { accuracy: 0.82, completedTrialCount: 6 } } },
  talentProfile: { schemaVersion: 'krumm_talent_profile_v1', dimensions: {}, globalSummary: { strengths: [], watchAreas: [], confidence: 0.8 } },
  edgeAI: { modelVersion: 'krumm-edge-ai-v9.1.0-game-aware', composite: { score: 72 }, confidence: { score: 0.8 }, channels: {}, caveats: [] },
  governance: { humanReviewOnly: true, noAutomatedDecision: true, observationalOnly: true, privacySafe: true },
};

const record = buildFinalAssessmentStorageRecord({
  payload,
  bundle: {
    schemaVersion: 'krumm_report_delivery_bundle_v1',
    runId: 'run-history-001',
    batteryId: 'krumm_unified_battery_v1',
    generatedAt: '2026-07-08T12:01:00.000Z',
    validation: { ok: true, violations: [] },
    manifest: { fileCount: 1, reportFormats: ['markdown'], researchExportCount: 0 },
    files: [{ fileName: 'report.md', mimeType: 'text/markdown', content: '# Reporte' }],
  },
  savedAt: '2026-07-08T12:02:00.000Z',
});

describe('FinalAssessmentHistoryPanel', () => {
  it('renders empty and populated final assessment history states', () => {
    const { rerender } = render(<FinalAssessmentHistoryPanel sessions={[]} status="listo" />);
    expect(screen.getByText(/Sin evaluaciones finales guardadas/i)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('listo');

    rerender(<FinalAssessmentHistoryPanel sessions={[record]} />);
    expect(screen.getByText(/Run: run-history-001/i)).toBeInTheDocument();
    expect(screen.getByText(/Rostro: 90%/i)).toBeInTheDocument();
    expect(screen.getByText(/Accuracy: 82%/i)).toBeInTheDocument();
  });

  it('passes stored descriptors to the download callback', () => {
    const onDownloadSession = vi.fn();
    render(<FinalAssessmentHistoryPanel sessions={[record]} onDownloadSession={onDownloadSession} />);

    fireEvent.click(screen.getByRole('button', { name: /Descargar artefactos/i }));
    expect(onDownloadSession).toHaveBeenCalledTimes(1);
    expect(onDownloadSession.mock.calls[0][0].runId).toBe('run-history-001');
    expect(onDownloadSession.mock.calls[0][1].map((file) => file.fileName)).toEqual([
      'run-history-001-final-payload.json',
      'run-history-001-storage-manifest.json',
      'report.md',
    ]);
  });

  it('downloads descriptors through browser Blob URLs when no callback is injected', () => {
    const click = vi.fn();
    const anchor = { click, href: '', download: '' };
    const documentRef = { createElement: vi.fn(() => anchor) };
    const urlRef = { createObjectURL: vi.fn(() => 'blob://artifact'), revokeObjectURL: vi.fn() };

    const ok = downloadStoredSessionDescriptors([{ fileName: 'a.txt', mimeType: 'text/plain', content: 'hola' }], { documentRef, urlRef });

    expect(ok).toBe(true);
    expect(documentRef.createElement).toHaveBeenCalledWith('a');
    expect(anchor.download).toBe('a.txt');
    expect(click).toHaveBeenCalledTimes(1);
    expect(urlRef.revokeObjectURL).toHaveBeenCalledWith('blob://artifact');
  });
});
