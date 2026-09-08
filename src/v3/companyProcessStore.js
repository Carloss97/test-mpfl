// t_9319e84d (V4 fase v3): store de procesos demo creados por el flujo de
// diseño — memoria de cliente (sessionStorage de la pestaña), SIN backend.
//
// Decisión D1 (plan V4): la card dice "persiste solo en memoria (sin backend
// de procesos aún)". La app navega por `<a>` de carga completa (sin router de
// cliente: main.jsx solo resuelve el pathname al montar) → un store puramente
// en RAM haría invisible el proceso creado al ir a /empresa/procesos en el
// navegador real (rompe la aceptación). Se usa sessionStorage: memoria del
// cliente acotada a la sesión de la pestaña (muere al cerrarla, nunca en un
// servidor) — el follow-up de backend de procesos queda documentado (plan §4).
//
// Política del repo: sin librerías de state → React 19 useSyncExternalStore.
// El snapshot es un array frozen que se SUSTITUYE en cada cambio (referencia
// estable entre cambios: requisito de getSnapshot de useSyncExternalStore).
//
// Shape del borrador: superconjunto de la fila de lista V2 (id/role/roleEn/
// department/location/openedAt/candidates/evaluated/recommended/averageScore/
// status) + source:'design' + mode + profile (buildDraftProcess, companyData.js).
// ids únicos frente a los 3 procesos demo + drafts previos (uniqueProcessId).
//
// Privacidad: solo campos que el usuario tipea en el formulario (cargo/área/
// ubicación/modalidad/perfil); nunca telemetría ni datos de candidatos.
import { useSyncExternalStore } from 'react';
import {
  buildDraftProcess,
  DEMO_PROCESSES,
  validateDesignInput,
} from './companyData.js';

const STORAGE_KEY = 'krumm.company.processDrafts.v1';
const SCHEMA_VERSION = 1;

let snapshot = loadSnapshot();
const listeners = new Set();

function storage() {
  try {
    return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined'
      ? window.sessionStorage
      : null;
  } catch {
    return null;
  }
}

// Lectura defensiva: forma inválida o ajena → [] (nunca crashea, nunca
// adopta datos que no reconocen el schema v1).
function loadSnapshot() {
  const store = storage();
  if (!store) return Object.freeze([]);
  let raw = null;
  try {
    raw = store.getItem(STORAGE_KEY);
  } catch {
    return Object.freeze([]);
  }
  if (!raw) return Object.freeze([]);
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.version !== SCHEMA_VERSION || !Array.isArray(parsed.processes)) return Object.freeze([]);
    const valid = parsed.processes.filter(
      (entry) => entry && typeof entry === 'object'
        && typeof entry.id === 'string'
        && typeof entry.role === 'string'
        && entry.source === 'design',
    );
    return Object.freeze(valid);
  } catch {
    return Object.freeze([]);
  }
}

function persistSnapshot(list) {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify({ version: SCHEMA_VERSION, processes: [...list] }));
  } catch {
    // quota / modo privado: sigue funcionando solo en RAM (degradación honesta)
  }
}

function emit() {
  for (const listener of listeners) listener();
}

function commit(next) {
  snapshot = Object.freeze(next);
  persistSnapshot(next);
  emit();
}

export function subscribeCompanyProcesses(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDraftProcesses() {
  return snapshot;
}

// Crea un borrador desde la entrada validada del formulario de diseño.
// `now` inyectable (tests deterministas). Lanza Error si la entrada no pasa
// validateDesignInput (la UI valida antes; esto es la barrera defensiva).
export function createDraftProcess(input, { now = new Date() } = {}) {
  const errors = validateDesignInput(input);
  if (Object.keys(errors).length > 0) {
    throw new Error(`createDraftProcess: entrada inválida (${Object.keys(errors).join(', ')})`);
  }
  const existingIds = [
    ...DEMO_PROCESSES.map((process) => process.id),
    ...snapshot.map((process) => process.id),
  ];
  const process = buildDraftProcess(input, now.toISOString().slice(0, 10), existingIds);
  commit([...snapshot, process]);
  return process;
}

// Vacía el estado (tests / nueva sesión demo): RAM + sessionStorage.
export function resetCompanyProcessStore() {
  commit([]);
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(STORAGE_KEY);
  } catch {
    // no-op
  }
}

// Hook reactivo para componentes (CompanyWorkspace vía useCompanyData,
// y páginas que necesiten leer el store directamente).
export function useCompanyDraftProcesses() {
  return useSyncExternalStore(subscribeCompanyProcesses, getDraftProcesses, getDraftProcesses);
}

export { STORAGE_KEY as COMPANY_DRAFTS_STORAGE_KEY };
