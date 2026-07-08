import { beforeEach, describe, expect, it } from 'vitest';
import { FINAL_ASSESSMENT_PAYLOAD_SCHEMA } from './finalAssessmentPayload.js';
import {
  FINAL_ASSESSMENT_STORAGE_KEY,
  FINAL_ASSESSMENT_STORAGE_SCHEMA,
  buildFinalAssessmentStorageRecord,
  clearFinalAssessmentSessions,
  createStoredSessionDownloadDescriptors,
  loadFinalAssessmentSessions,
  saveFinalAssessmentSession,
  validateFinalAssessmentStorageRecord,
} from './finalAssessmentStorage.js';

function createMemoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    clear: () => map.clear(),
  };
}

const safePayload = {
  schemaVersion: FINAL_ASSESSMENT_PAYLOAD_SCHEMA,
  runId: 'run-ab-001',
  batteryId: 'krumm_unified_battery_v1',
  generatedAt: '2026-07-08T12:00:00.000Z',
  participant: { aliasHash: 'participant-hash', declaredRoleTarget: 'Analista' },
  quality: { sampleCount: 180, facePresenceRatio: 0.92, meanConfidence: 0.86, correlatedTrialCount: 24, caveats: [] },
  behavioral: { gameSummary: { performance: { accuracy: 0.86 } } },
  talentProfile: { schemaVersion: 'krumm_talent_profile_v1', dimensions: {}, globalSummary: { strengths: [], watchAreas: [], confidence: 0.8 } },
  edgeAI: { modelVersion: 'krumm-edge-ai-v9.1.0-game-aware', composite: { score: 76 }, confidence: { score: 0.82 }, channels: {}, caveats: [] },
  governance: { humanReviewOnly: true, noAutomatedDecision: true, observationalOnly: true, privacySafe: true },
};

const bundle = {
  schemaVersion: 'krumm_report_delivery_bundle_v1',
  runId: 'run-ab-001',
  batteryId: 'krumm_unified_battery_v1',
  generatedAt: '2026-07-08T12:01:00.000Z',
  validation: { ok: true, violations: [] },
  manifest: { fileCount: 2, reportFormats: ['markdown', 'json'], researchExportCount: 0 },
  files: [
    { fileName: 'run-ab-001-report.md', mimeType: 'text/markdown', content: '# Reporte\nNo se exportaron landmarks crudos.' },
    { fileName: 'run-ab-001-report.json', mimeType: 'application/json', content: '{"ok":true}' },
  ],
};

describe('finalAssessmentStorage', () => {
  let storage;

  beforeEach(() => {
    storage = createMemoryStorage();
  });

  it('builds privacy-safe storage records with payload, manifest and download descriptors', () => {
    const record = buildFinalAssessmentStorageRecord({ payload: safePayload, bundle, savedAt: '2026-07-08T12:02:00.000Z' });

    expect(record).toMatchObject({
      schemaVersion: FINAL_ASSESSMENT_STORAGE_SCHEMA,
      runId: 'run-ab-001',
      batteryId: 'krumm_unified_battery_v1',
      savedAt: '2026-07-08T12:02:00.000Z',
      quality: { sampleCount: 180, facePresenceRatio: 0.92, meanConfidence: 0.86 },
      governance: { humanReviewOnly: true, noAutomatedDecision: true, observationalOnly: true, privacySafe: true },
      payload: { schemaVersion: FINAL_ASSESSMENT_PAYLOAD_SCHEMA },
      bundle: { manifest: { fileCount: 2 } },
    });
    expect(validateFinalAssessmentStorageRecord(record)).toEqual({ ok: true, violations: [] });
    expect(JSON.stringify(record)).not.toContain('faceSamples');
    expect(JSON.stringify(record)).not.toContain('rawGameEvents');
    expect(JSON.stringify(record)).not.toContain('pointerSamples');
  });

  it('saves, lists newest first, and prunes older final assessment sessions', async () => {
    await saveFinalAssessmentSession({ payload: { ...safePayload, runId: 'run-old' }, bundle: { ...bundle, runId: 'run-old' }, storage, maxRecords: 2, savedAt: '2026-07-08T12:00:00.000Z' });
    await saveFinalAssessmentSession({ payload: { ...safePayload, runId: 'run-mid' }, bundle: { ...bundle, runId: 'run-mid' }, storage, maxRecords: 2, savedAt: '2026-07-08T12:01:00.000Z' });
    await saveFinalAssessmentSession({ payload: { ...safePayload, runId: 'run-new' }, bundle: { ...bundle, runId: 'run-new' }, storage, maxRecords: 2, savedAt: '2026-07-08T12:02:00.000Z' });

    const sessions = await loadFinalAssessmentSessions({ storage });
    expect(sessions.map((session) => session.runId)).toEqual(['run-new', 'run-mid']);
    expect(storage.getItem(FINAL_ASSESSMENT_STORAGE_KEY)).toContain('run-new');
    expect(storage.getItem(FINAL_ASSESSMENT_STORAGE_KEY)).not.toContain('run-old');
  });

  it('creates descriptors to re-download stored final artifacts', () => {
    const record = buildFinalAssessmentStorageRecord({ payload: safePayload, bundle, savedAt: '2026-07-08T12:02:00.000Z' });
    const descriptors = createStoredSessionDownloadDescriptors(record);

    expect(descriptors.map((file) => file.fileName)).toEqual([
      'run-ab-001-final-payload.json',
      'run-ab-001-storage-manifest.json',
      'run-ab-001-report.md',
      'run-ab-001-report.json',
    ]);
    expect(descriptors[0].content).toContain(FINAL_ASSESSMENT_PAYLOAD_SCHEMA);
  });

  it('rejects unsafe payloads or JSON report contents before persistence', async () => {
    const unsafePayload = { ...safePayload, behavioral: { rawGameEvents: [] } };
    await expect(saveFinalAssessmentSession({ payload: unsafePayload, bundle, storage })).rejects.toThrow(/Unsafe final assessment storage record/);

    const unsafeBundle = {
      ...bundle,
      files: [{ fileName: 'bad.json', mimeType: 'application/json', content: '{"landmarks":[1,2,3]}' }],
    };
    await expect(saveFinalAssessmentSession({ payload: safePayload, bundle: unsafeBundle, storage })).rejects.toThrow(/landmarks/);
  });

  it('clears final assessment sessions', async () => {
    await saveFinalAssessmentSession({ payload: safePayload, bundle, storage, savedAt: '2026-07-08T12:02:00.000Z' });
    expect(await loadFinalAssessmentSessions({ storage })).toHaveLength(1);

    await clearFinalAssessmentSessions({ storage });
    expect(await loadFinalAssessmentSessions({ storage })).toEqual([]);
  });
});
