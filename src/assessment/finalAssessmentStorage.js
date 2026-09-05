import { ASSESSMENT_FORBIDDEN_KEYS } from './assessmentSession.js';
import { validateFinalAssessmentPayload } from './finalAssessmentPayload.js';
import { buildLocalReportBundle } from './reportSubmissionClient.js';

export const FINAL_ASSESSMENT_STORAGE_SCHEMA = 'krumm_final_assessment_storage_record_v1';
export const FINAL_ASSESSMENT_STORAGE_KEY = 'krumm.finalAssessment.sessions.v1';
export const FINAL_ASSESSMENT_STORAGE_ENVELOPE_SCHEMA = 'krumm_final_assessment_storage_v1';
const FINAL_ASSESSMENT_DB_NAME = 'krumm_final_assessments';
const FINAL_ASSESSMENT_DB_VERSION = 1;
const FINAL_ASSESSMENT_DB_STORE = 'finalAssessmentSessions';

const DEFAULT_MAX_RECORDS = 25;

function clonePlain(value) {
  if (!value || typeof value !== 'object') return value;
  return JSON.parse(JSON.stringify(value));
}

function fallbackId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `final-assessment-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getStorage(storage) {
  const candidate = storage ?? globalThis.localStorage;
  if (!candidate || typeof candidate.getItem !== 'function' || typeof candidate.setItem !== 'function') {
    throw new Error('final_assessment_storage_unavailable');
  }
  return candidate;
}

function hasIndexedDB() {
  return typeof globalThis.indexedDB !== 'undefined' && typeof globalThis.indexedDB.open === 'function';
}

function openFinalAssessmentDb() {
  return new Promise((resolve, reject) => {
    if (!hasIndexedDB()) {
      reject(new Error('indexeddb_unavailable'));
      return;
    }
    const request = globalThis.indexedDB.open(FINAL_ASSESSMENT_DB_NAME, FINAL_ASSESSMENT_DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(FINAL_ASSESSMENT_DB_STORE)) {
        const store = db.createObjectStore(FINAL_ASSESSMENT_DB_STORE, { keyPath: 'runId' });
        store.createIndex('savedAt', 'savedAt', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('indexeddb_open_failed'));
  });
}

async function readIndexedDbRecords() {
  const db = await openFinalAssessmentDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FINAL_ASSESSMENT_DB_STORE, 'readonly');
    const store = tx.objectStore(FINAL_ASSESSMENT_DB_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result ?? []);
    request.onerror = () => reject(request.error ?? new Error('indexeddb_read_failed'));
    tx.oncomplete = () => db.close();
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error('indexeddb_tx_failed')); };
  });
}

async function writeIndexedDbRecords(records) {
  const db = await openFinalAssessmentDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FINAL_ASSESSMENT_DB_STORE, 'readwrite');
    const store = tx.objectStore(FINAL_ASSESSMENT_DB_STORE);
    store.clear();
    records.forEach((record) => store.put(record));
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error('indexeddb_write_failed')); };
  });
}

async function clearIndexedDbRecords() {
  const db = await openFinalAssessmentDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FINAL_ASSESSMENT_DB_STORE, 'readwrite');
    tx.objectStore(FINAL_ASSESSMENT_DB_STORE).clear();
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error('indexeddb_clear_failed')); };
  });
}

function normalizeIso(value, fallback = new Date().toISOString()) {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
}

function scanForbiddenKeys(value, path = []) {
  const violations = [];
  const visit = (node, currentPath) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach((item, index) => visit(item, [...currentPath, String(index)]));
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      if (ASSESSMENT_FORBIDDEN_KEYS.includes(key)) violations.push(key);
      visit(child, [...currentPath, key]);
    }
  };
  visit(value, path);
  return violations;
}

function scanJsonFileContent(file) {
  const fileName = String(file?.fileName ?? '').toLowerCase();
  const mimeType = String(file?.mimeType ?? '').toLowerCase();
  const shouldParse = fileName.endsWith('.json') || mimeType.includes('json');
  if (!shouldParse || typeof file?.content !== 'string') return [];
  try {
    return scanForbiddenKeys(JSON.parse(file.content));
  } catch {
    return [];
  }
}

function normalizeFiles(files = []) {
  return files.map((file, index) => ({
    fileName: file.fileName ?? `artifact-${index + 1}.txt`,
    mimeType: file.mimeType ?? 'text/plain',
    content: typeof file.content === 'string' ? file.content : JSON.stringify(file.content ?? ''),
  }));
}

function normalizeBundle({ payload, bundle, reports = [], researchExports = [] }) {
  if (bundle) {
    return {
      schemaVersion: bundle.schemaVersion ?? 'krumm_report_delivery_bundle_v1',
      deliveryMode: bundle.deliveryMode ?? 'local',
      runId: bundle.runId ?? payload?.runId ?? null,
      batteryId: bundle.batteryId ?? payload?.batteryId ?? null,
      generatedAt: bundle.generatedAt ?? payload?.generatedAt ?? new Date().toISOString(),
      validation: clonePlain(bundle.validation ?? validateFinalAssessmentPayload(payload)),
      manifest: clonePlain(bundle.manifest ?? { fileCount: bundle.files?.length ?? 0, reportFormats: [], researchExportCount: 0 }),
      files: normalizeFiles(bundle.files ?? []),
    };
  }
  return buildLocalReportBundle({ payload, reports, researchExports });
}

export function validateFinalAssessmentStorageRecord(record = {}) {
  const violations = [];
  if (record.schemaVersion !== FINAL_ASSESSMENT_STORAGE_SCHEMA) violations.push('invalid_storage_schemaVersion');
  if (!record.runId) violations.push('missing_runId');
  if (record.governance?.humanReviewOnly !== true) violations.push('humanReviewOnly_false');
  if (record.governance?.noAutomatedDecision !== true) violations.push('noAutomatedDecision_false');
  if (record.governance?.observationalOnly !== true) violations.push('observationalOnly_false');
  if (record.governance?.privacySafe !== true) violations.push('privacySafe_false');

  const payloadValidation = validateFinalAssessmentPayload(record.payload ?? {});
  if (!payloadValidation.ok) violations.push(...payloadValidation.violations);
  violations.push(...scanForbiddenKeys(record));
  for (const file of record.bundle?.files ?? []) violations.push(...scanJsonFileContent(file));

  const unique = [...new Set(violations)];
  return { ok: unique.length === 0, violations: unique };
}

export function buildFinalAssessmentStorageRecord({
  payload,
  bundle,
  reports = [],
  researchExports = [],
  savedAt = new Date().toISOString(),
} = {}) {
  const payloadValidation = validateFinalAssessmentPayload(payload ?? {});
  const safeBundle = normalizeBundle({ payload, bundle, reports, researchExports });
  const record = {
    schemaVersion: FINAL_ASSESSMENT_STORAGE_SCHEMA,
    id: payload?.runId ?? safeBundle.runId ?? fallbackId(),
    runId: payload?.runId ?? safeBundle.runId ?? null,
    batteryId: payload?.batteryId ?? safeBundle.batteryId ?? null,
    savedAt: normalizeIso(savedAt),
    generatedAt: payload?.generatedAt ?? safeBundle.generatedAt ?? null,
    participant: clonePlain(payload?.participant ?? {}),
    quality: clonePlain(payload?.quality ?? {}),
    summary: {
      accuracy: payload?.behavioral?.gameSummary?.performance?.accuracy ?? null,
      completedTrialCount: payload?.behavioral?.gameSummary?.performance?.completedTrialCount ?? null,
      globalConfidence: payload?.talentProfile?.globalSummary?.confidence ?? null,
      strengths: [...(payload?.talentProfile?.globalSummary?.strengths ?? [])],
      watchAreas: [...(payload?.talentProfile?.globalSummary?.watchAreas ?? [])],
    },
    governance: {
      humanReviewOnly: true,
      noAutomatedDecision: true,
      observationalOnly: true,
      privacySafe: true,
    },
    validation: clonePlain(payloadValidation),
    payload: clonePlain(payload),
    bundle: {
      schemaVersion: safeBundle.schemaVersion,
      deliveryMode: safeBundle.deliveryMode ?? 'local',
      generatedAt: safeBundle.generatedAt,
      validation: clonePlain(safeBundle.validation ?? payloadValidation),
      manifest: clonePlain(safeBundle.manifest ?? {}),
      files: normalizeFiles(safeBundle.files ?? []),
    },
  };

  const validation = validateFinalAssessmentStorageRecord(record);
  if (!validation.ok) {
    throw new Error(`Unsafe final assessment storage record: ${validation.violations.join(', ')}`);
  }
  return record;
}

function parseEnvelope(raw) {
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) return parsed;
  if (parsed?.schemaVersion === FINAL_ASSESSMENT_STORAGE_ENVELOPE_SCHEMA && Array.isArray(parsed.records)) return parsed.records;
  return [];
}

function serializeEnvelope(records) {
  return JSON.stringify({
    schemaVersion: FINAL_ASSESSMENT_STORAGE_ENVELOPE_SCHEMA,
    updatedAt: new Date().toISOString(),
    records,
  });
}

function sortRecords(records) {
  return [...records].sort((a, b) => String(b.savedAt ?? '').localeCompare(String(a.savedAt ?? '')));
}

export async function loadFinalAssessmentSessions({ storage, key = FINAL_ASSESSMENT_STORAGE_KEY } = {}) {
  if (!storage) {
    try {
      const records = await readIndexedDbRecords();
      return sortRecords(records).filter((record) => validateFinalAssessmentStorageRecord(record).ok);
    } catch {
      // Fall through to localStorage fallback.
    }
  }
  const store = getStorage(storage);
  const records = parseEnvelope(store.getItem(key));
  return sortRecords(records).filter((record) => validateFinalAssessmentStorageRecord(record).ok);
}

export async function saveFinalAssessmentSession({
  payload,
  bundle,
  reports = [],
  researchExports = [],
  storage,
  key = FINAL_ASSESSMENT_STORAGE_KEY,
  maxRecords = DEFAULT_MAX_RECORDS,
  savedAt,
} = {}) {
  const record = buildFinalAssessmentStorageRecord({ payload, bundle, reports, researchExports, savedAt });

  if (!storage) {
    try {
      const existing = await readIndexedDbRecords();
      const deduped = existing.filter((item) => item.runId !== record.runId);
      const next = sortRecords([record, ...deduped]).slice(0, Math.max(1, Number(maxRecords) || DEFAULT_MAX_RECORDS));
      await writeIndexedDbRecords(next);
      return record;
    } catch {
      // Fall through to localStorage fallback.
    }
  }

  const store = getStorage(storage);
  const existing = parseEnvelope(store.getItem(key));
  const deduped = existing.filter((item) => item.runId !== record.runId);
  const next = sortRecords([record, ...deduped]).slice(0, Math.max(1, Number(maxRecords) || DEFAULT_MAX_RECORDS));
  store.setItem(key, serializeEnvelope(next));
  return record;
}

export async function clearFinalAssessmentSessions({ storage, key = FINAL_ASSESSMENT_STORAGE_KEY } = {}) {
  if (!storage) {
    await clearIndexedDbRecords().catch(() => {});
  }
  const store = getStorage(storage);
  store.removeItem(key);
}

export function createStoredSessionDownloadDescriptors(record = {}) {
  const validation = validateFinalAssessmentStorageRecord(record);
  if (!validation.ok) throw new Error(`Unsafe final assessment storage record: ${validation.violations.join(', ')}`);
  const runId = record.runId ?? 'assessment';
  return [
    {
      fileName: `${runId}-final-payload.json`,
      mimeType: 'application/json',
      content: JSON.stringify(record.payload, null, 2),
    },
    {
      fileName: `${runId}-storage-manifest.json`,
      mimeType: 'application/json',
      content: JSON.stringify({
        schemaVersion: record.schemaVersion,
        runId: record.runId,
        batteryId: record.batteryId,
        savedAt: record.savedAt,
        generatedAt: record.generatedAt,
        quality: record.quality,
        summary: record.summary,
        governance: record.governance,
        bundleManifest: record.bundle?.manifest ?? {},
      }, null, 2),
    },
    ...normalizeFiles(record.bundle?.files ?? []),
  ];
}
