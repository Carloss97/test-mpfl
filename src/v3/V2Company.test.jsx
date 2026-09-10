// t_90a5157c (V2 fase v3): spec de declaración — lado empresa:
//   A. companyData.js: datos demo (ref), KPIs derivados (D1), normalización,
//      filtros y sort (patrón processes.js), mapping /sessions→procesos (D3),
//      fetch real (contract v1).
//   B. useCompanyData: demo (sin apiBase, sin fetch) / checking / real / fallback.
//   C. CompanyDashboardPage: KPIs + tabla (demo/checking/real, ES/EN).
//   D. CompanyProcessesPage: búsqueda + filtros + sort operativos (aceptación),
//      reset, empty state, real sin selects department/location, ES/EN.
//   E. V3RootApp: /empresa y /empresa/procesos son páginas reales; proceso/:id
//      sigue placeholder (V3); /empresa/acceso intacto (V0).
//   F. CompanyShell: prop note (banner real/loading; default demo V0).
// Referencia visual: docs/spec/frontend-ref-v2 (company.html/css/js,
// processes.html/css/js, script.js). El modo real end-to-end (fetch stub +
// banner en V3RootApp) está en V2CompanyReal.test.jsx (vi.mock del config).
import React from 'react';
import {
  cleanup, fireEvent, render, renderHook, screen, waitFor, within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../i18n/LanguageContext.jsx';
import { V3_COPY } from './v3Copy.js';
import CompanyDashboardPage from './CompanyDashboardPage.jsx';
import CompanyProcessesPage from './CompanyProcessesPage.jsx';
import CompanyShell from './CompanyShell.jsx';
import V3RootApp from './V3RootApp.jsx';
import {
  buildCompanyDataFromSessions,
  buildCompanyKpis,
  candidateOverallScore,
  DEMO_PROCESSES,
  deriveProcessStatus,
  filterProcesses,
  filterRealProcesses,
  fetchCompanySessions,
  localizeProcessRole,
  normalizeProcessText,
  slugifyProcessId,
  sortProcesses,
  UNSPECIFIED_PROCESS_ID,
} from './companyData.js';
import { useCompanyData } from './useCompanyData.js';

// jsdom: mock de localStorage (mismo patrón que V0/V1).
const storage = {};
const localStorageMock = {
  getItem: (key) => (key in storage ? storage[key] : null),
  setItem: (key, value) => { storage[key] = String(value); },
  removeItem: (key) => { delete storage[key]; },
  clear: () => { for (const key of Object.keys(storage)) delete storage[key]; },
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock, configurable: true });

function renderWithLanguage(ui) {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

function renderV3Route(pathname) {
  cleanup();
  window.history.pushState({}, '', pathname);
  return renderWithLanguage(<V3RootApp />);
}

function demoData() {
  return { source: 'demo', processes: DEMO_PROCESSES };
}

function cardIds() {
  return screen.queryAllByTestId(/^v2-card-/).map((el) => el.getAttribute('data-testid'));
}

afterEach(() => {
  window.history.pushState({}, '', '/');
  localStorage.clear();
  document.body.innerHTML = '';
});

// Fixture de sesiones reales (shape /sessions v1: role/status/completedAt +
// 8 constructos). 5 sesiones, 2 roles + 1 sin rol.
function fixtureSession({ id, role = null, status, completedAt, scores }) {
  return {
    id,
    alias: `alias-${id}`,
    role,
    status,
    completedAt,
    completion: { completed: 4, total: 4 },
    constructs: scores.map((score, index) => ({
      id: `c${index}`, label: 'L', labelEn: 'L', score, confidence: 0.5,
    })),
  };
}

const FIXTURE_SESSIONS = [
  fixtureSession({ id: 's1', role: 'Operations Analyst', status: 'ready', completedAt: '2026-08-01T10:00:00.000Z', scores: [80, 80, 80, 80, 80, 80, 80, 80] }),
  fixtureSession({ id: 's2', role: 'Operations Analyst', status: 'needs_review', completedAt: '2026-08-10T11:00:00.000Z', scores: [70, null, 70, 70, 70, 70, 70, 70] }),
  fixtureSession({ id: 's3', role: 'Operations Analyst', status: 'in_progress', completedAt: '2026-08-15T12:00:00.000Z', scores: [90, 90, 90, 90, null, null, null, null] }),
  fixtureSession({ id: 's4', role: 'Maintenance Tech', status: 'ready', completedAt: '2026-08-20T09:00:00.000Z', scores: [90, 90, 90, 90, 90, 90, 90, 90] }),
  fixtureSession({ id: 's5', status: 'ready', completedAt: '2026-08-05T08:00:00.000Z', scores: [60, 60, 60, 60, 60, 60, 60, 60] }),
];

// ── A. companyData.js ────────────────────────────────────────────────────────

describe('A. companyData — datos demo (referencia company/processes.html)', () => {
  it('DEMO_PROCESSES: los 3 procesos de la referencia con sus valores exactos', () => {
    expect(DEMO_PROCESSES).toHaveLength(3);
    expect(DEMO_PROCESSES).toEqual([
      expect.objectContaining({ id: 'supervisor', role: 'Supervisor de Planta', roleEn: 'Plant Supervisor', department: 'operations', location: 'Antofagasta, Chile', openedAt: '2026-08-20', candidates: 23, evaluated: 19, averageScore: 78, status: 'active' }),
      expect.objectContaining({ id: 'operator', role: 'Operador de Planta', roleEn: 'Plant Operator', department: 'operations', location: 'Calama, Chile', openedAt: '2026-08-25', candidates: 47, evaluated: 40, averageScore: 81, status: 'active' }),
      expect.objectContaining({ id: 'technician', role: 'Técnico de Mantención', roleEn: 'Maintenance Technician', department: 'maintenance', location: 'Antofagasta, Chile', openedAt: '2026-08-29', candidates: 31, evaluated: 26, averageScore: 84, status: 'active' }),
    ]);
    // "recommended" demo por proceso (plan V2 D2): 5/12/7 = 24 (KPI ref)
    expect(DEMO_PROCESSES.map((process) => process.recommended)).toEqual([5, 12, 7]);
  });

  it('normalizeProcessText: NFD + minúsculas + trim (patrón processes.js)', () => {
    expect(normalizeProcessText('Supervisor de Planta ')).toBe('supervisor de planta');
    expect(normalizeProcessText('MANTENCIÓN')).toBe('mantencion');
    expect(normalizeProcessText('  Antofagasta, Chile')).toBe('antofagasta, chile');
    expect(normalizeProcessText(undefined)).toBe('');
  });

  it('localizeProcessRole: es→role (canónico), en→roleEn (fallback role)', () => {
    const process = DEMO_PROCESSES[0];
    expect(localizeProcessRole(process, 'es')).toBe('Supervisor de Planta');
    expect(localizeProcessRole(process, 'en')).toBe('Plant Supervisor');
    expect(localizeProcessRole({ role: 'Solo ES' }, 'en')).toBe('Solo ES');
  });
});

describe('A. companyData — KPIs derivados de la lista (plan V2 D1)', () => {
  it('buildCompanyKpis (demo): 3 activos / 85 evaluados / 81% ponderado / 24 recomendados', () => {
    expect(buildCompanyKpis(DEMO_PROCESSES)).toEqual({
      activeProcesses: 3,
      evaluated: 85,
      averageScore: 81, // (19·78 + 40·81 + 26·84) / 85 = 81.25 → 81
      recommended: 24,
    });
  });

  it('buildCompanyKpis (vacío): 0/0/null/0 — sin division por cero', () => {
    expect(buildCompanyKpis([])).toEqual({ activeProcesses: 0, evaluated: 0, averageScore: null, recommended: 0 });
  });

  it('buildCompanyKpis: pondera por evaluados y excluye procesos no activos', () => {
    const processes = [
      { status: 'active', evaluated: 10, averageScore: 50, recommended: 1 },
      { status: 'active', evaluated: 30, averageScore: 70, recommended: 2 },
      { status: 'paused', evaluated: 100, averageScore: 99, recommended: 99 },
    ];
    expect(buildCompanyKpis(processes)).toEqual({
      activeProcesses: 2,
      evaluated: 40,
      averageScore: 65, // (10·50 + 30·70) / 40
      recommended: 3,
    });
  });
});

describe('A. companyData — filtros (patrón processes.js de la referencia)', () => {
  it('sin filtros: todos los procesos', () => {
    expect(filterProcesses(DEMO_PROCESSES)).toHaveLength(3);
  });

  it('búsqueda: insensible a acentos y mayúsculas, por cargo y ubicación', () => {
    expect(filterProcesses(DEMO_PROCESSES, { query: 'calama' }, { language: 'es' })).toHaveLength(1);
    expect(filterProcesses(DEMO_PROCESSES, { query: 'CALAMA, CHILE' }, { language: 'es' })).toHaveLength(1);
    expect(filterProcesses(DEMO_PROCESSES, { query: 'antofagasta' }, { language: 'es' })).toHaveLength(2);
    expect(filterProcesses(DEMO_PROCESSES, { query: 'supervisor' }, { language: 'es' })).toHaveLength(1);
    // NFD: "mantencion" (sin tilde) debe matchear "Mantención"
    expect(filterProcesses(DEMO_PROCESSES, { query: 'mantencion' }, { language: 'es' })).toHaveLength(1);
    // D6 (texto localizado visible): EN busca la variante EN — 'planta' no
    // existe en inglés; ES: 'planta' está dentro de "…de Planta"
    expect(filterProcesses(DEMO_PROCESSES, { query: 'plant' }, { language: 'en' })).toHaveLength(2);
    expect(filterProcesses(DEMO_PROCESSES, { query: 'planta' }, { language: 'en' })).toHaveLength(0);
    expect(filterProcesses(DEMO_PROCESSES, { query: 'planta' }, { language: 'es' })).toHaveLength(2);
  });

  it('búsqueda: también por área (el label localizado del filtro)', () => {
    expect(filterProcesses(DEMO_PROCESSES, { query: 'operaciones' }, { language: 'es', departmentLabels: { operations: 'Operaciones', maintenance: 'Mantenimiento' } })).toHaveLength(2);
    expect(filterProcesses(DEMO_PROCESSES, { query: 'maintenance' }, { language: 'en', departmentLabels: { operations: 'Operations', maintenance: 'Maintenance' } })).toHaveLength(1);
  });

  it('filtro department: operations → 2, maintenance → 1', () => {
    expect(filterProcesses(DEMO_PROCESSES, { department: 'operations' })).toHaveLength(2);
    expect(filterProcesses(DEMO_PROCESSES, { department: 'maintenance' })).toHaveLength(1);
    expect(filterProcesses(DEMO_PROCESSES, { department: '' })).toHaveLength(3);
  });

  it('filtro location: exacto por ubicación', () => {
    expect(filterProcesses(DEMO_PROCESSES, { location: 'Calama, Chile' })).toHaveLength(1);
    expect(filterProcesses(DEMO_PROCESSES, { location: 'Antofagasta, Chile' })).toHaveLength(2);
  });

  it('filtros combinados (query + department + location)', () => {
    expect(filterProcesses(DEMO_PROCESSES, { query: 'planta', department: 'operations' }, { language: 'es' })).toHaveLength(2);
    expect(filterProcesses(DEMO_PROCESSES, { query: 'planta', department: 'maintenance' }, { language: 'es' })).toHaveLength(0);
    expect(filterProcesses(DEMO_PROCESSES, { department: 'operations', location: 'Calama, Chile' })).toHaveLength(1);
    expect(filterProcesses(DEMO_PROCESSES, { query: 'zzz' })).toHaveLength(0);
  });
});

describe('A. companyData — sort (5 opciones de la referencia + tiebreak D5)', () => {
  const ids = (processes) => processes.map((process) => process.id);

  it('recent (default): más reciente primero (fechas ISO desc)', () => {
    expect(ids(sortProcesses(DEMO_PROCESSES, 'recent', 'es'))).toEqual(['technician', 'operator', 'supervisor']);
  });

  it('oldest: más antiguo primero', () => {
    expect(ids(sortProcesses(DEMO_PROCESSES, 'oldest', 'es'))).toEqual(['supervisor', 'operator', 'technician']);
  });

  it('candidates: más candidatos primero (desc)', () => {
    expect(ids(sortProcesses(DEMO_PROCESSES, 'candidates', 'es'))).toEqual(['operator', 'technician', 'supervisor']);
  });

  it('score: mayor score primero; null al final', () => {
    expect(ids(sortProcesses(DEMO_PROCESSES, 'score', 'es'))).toEqual(['technician', 'operator', 'supervisor']);
    const withNull = [
      { id: 'a', role: 'A', openedAt: '2026-01-01', averageScore: null },
      { id: 'b', role: 'B', openedAt: '2026-01-02', averageScore: 50 },
    ];
    expect(ids(sortProcesses(withNull, 'score', 'en'))).toEqual(['b', 'a']);
  });

  it('name: A–Z con locale del idioma activo (la ref usa currentLanguage)', () => {
    expect(ids(sortProcesses(DEMO_PROCESSES, 'name', 'es'))).toEqual(['operator', 'supervisor', 'technician']); // Operador < Supervisor < Técnico
    expect(ids(sortProcesses(DEMO_PROCESSES, 'name', 'en'))).toEqual(['technician', 'operator', 'supervisor']); // Maintenance < Plant O < Plant S
  });

  it('sort no muta la lista de origen', () => {
    const original = [...DEMO_PROCESSES];
    sortProcesses(original, 'candidates', 'es');
    expect(original.map((process) => process.id)).toEqual(['supervisor', 'operator', 'technician']);
  });
});

describe('A. companyData — modo real (D3: /sessions → procesos por rol)', () => {
  it('candidateOverallScore: media de constructos no-nulos; null sin evidencia', () => {
    expect(candidateOverallScore(FIXTURE_SESSIONS[0])).toBe(80);
    // s2: 70×7 + null → media de los 7 = 70
    expect(candidateOverallScore(FIXTURE_SESSIONS[1])).toBe(70);
    expect(candidateOverallScore({ constructs: [{ score: null }, { score: null }] })).toBeNull();
    expect(candidateOverallScore({})).toBeNull();
  });

  it('slugifyProcessId: minúsculas, guiones, sin acentos', () => {
    expect(slugifyProcessId('Operations Analyst')).toBe('operations-analyst');
    expect(slugifyProcessId('  Mantenimiento · Sur  ')).toBe('mantenimiento-sur');
  });

  it('buildCompanyDataFromSessions: agrupa por rol y agrega (candidates/evaluated/recommended/score/fecha)', () => {
    const processes = buildCompanyDataFromSessions(FIXTURE_SESSIONS);
    expect(processes).toHaveLength(3);
    // orden base: más reciente primero
    expect(processes.map((process) => process.id)).toEqual(['maintenance-tech', 'operations-analyst', UNSPECIFIED_PROCESS_ID]);
    const analyst = processes.find((process) => process.id === 'operations-analyst');
    expect(analyst).toEqual(expect.objectContaining({
      role: 'Operations Analyst',
      candidates: 3,
      evaluated: 2, // s1 ready + s2 needs_review (s3 in_progress no cuenta)
      recommended: 1, // solo s1 'ready'
      averageScore: 75, // media(80, 70)
      openedAt: '2026-08-15', // máx completedAt del grupo
      status: 'active',
      department: null,
      location: null,
    }));
    const unspecified = processes.find((process) => process.id === UNSPECIFIED_PROCESS_ID);
    expect(unspecified).toEqual(expect.objectContaining({ role: null, candidates: 1, evaluated: 1, recommended: 1, averageScore: 60 }));
  });

  it('buildCompanyDataFromSessions: grupo sin evaluados → averageScore null (señal ausente, no 0)', () => {
    const processes = buildCompanyDataFromSessions([
      fixtureSession({ id: 'x', role: 'Solo Role', status: 'in_progress', completedAt: '2026-08-01T00:00:00.000Z', scores: [null, null, null, null, null, null, null, null] }),
    ]);
    expect(processes).toHaveLength(1);
    expect(processes[0].averageScore).toBeNull();
    expect(processes[0].evaluated).toBe(0);
  });

  it('KPIs derivados de sesiones reales: coherentes con el agrupado (D1)', () => {
    const processes = buildCompanyDataFromSessions(FIXTURE_SESSIONS);
    expect(buildCompanyKpis(processes)).toEqual({
      activeProcesses: 3,
      evaluated: 4,
      averageScore: 75, // (1·90 + 2·75 + 1·60) / 4
      recommended: 3,
    });
  });
});

// ── A. companyData — B3 (KRU-50): estado vivo derivado + filtros modo real ──

describe('A. companyData — B3: deriveProcessStatus + filterRealProcesses', () => {
  it('deriveProcessStatus: prioridad in_progress > completed > open', () => {
    expect(deriveProcessStatus([
      { status: 'ready' }, { status: 'in_progress' }, { status: 'needs_review' },
    ])).toBe('in_progress');
    expect(deriveProcessStatus([{ status: 'ready' }, { status: 'needs_review' }])).toBe('completed');
    expect(deriveProcessStatus([{ status: 'in_progress' }])).toBe('in_progress');
    expect(deriveProcessStatus([])).toBe('open');
    expect(deriveProcessStatus(null)).toBe('open');
    expect(deriveProcessStatus([null, undefined])).toBe('open');
  });

  it('buildCompanyDataFromSessions: realStatus derivado por grupo; `status` sigue active (KPIs D1)', () => {
    const processes = buildCompanyDataFromSessions(FIXTURE_SESSIONS);
    const ops = processes.find((process) => process.role === 'Operations Analyst');
    const maint = processes.find((process) => process.role === 'Maintenance Tech');
    const unsp = processes.find((process) => process.id === UNSPECIFIED_PROCESS_ID);
    expect(ops.realStatus).toBe('in_progress'); // s3 in curso mezcla grupo
    expect(maint.realStatus).toBe('completed');
    expect(unsp.realStatus).toBe('completed');
    expect([ops, maint, unsp].map((process) => process.status)).toEqual(['active', 'active', 'active']);
  });

  it('filterRealProcesses: rango de fecha determinista (now inyectado; 7d incluye el corte)', () => {
    const now = new Date('2026-09-10T00:00:00.000Z'); // 7d → corte 2026-09-04
    const processes = [
      { id: 'a', openedAt: '2026-09-09', realStatus: 'completed' },
      { id: 'b', openedAt: '2026-09-04', realStatus: 'completed' }, // borde: incluido
      { id: 'c', openedAt: '2026-09-03', realStatus: 'completed' },
      { id: 'd', openedAt: '2026-08-15', realStatus: 'in_progress' },
      { id: 'e', openedAt: null, realStatus: 'open' },
    ];
    expect(filterRealProcesses(processes, { dateRange: 'all' }, { now })).toHaveLength(5);
    expect(filterRealProcesses(processes, { dateRange: '7d' }, { now })).toHaveLength(2);
    expect(filterRealProcesses(processes, { dateRange: '7d' }, { now }).map((p) => p.id)).toEqual(['a', 'b']);
    expect(filterRealProcesses(processes, { dateRange: '30d' }, { now })).toHaveLength(4); // a,b,c,d
    expect(filterRealProcesses({}, {}, { now })).toHaveLength(0);
  });

  it('filterRealProcesses: filtro por estado vivo (combinable con fecha)', () => {
    const now = new Date('2026-09-10T00:00:00.000Z');
    const processes = [
      { id: 'a', openedAt: '2026-09-09', realStatus: 'completed' },
      { id: 'b', openedAt: '2026-09-08', realStatus: 'in_progress' },
      { id: 'c', openedAt: '2026-08-01', realStatus: 'in_progress' },
    ];
    expect(filterRealProcesses(processes, { status: 'in_progress' }, { now })).toHaveLength(2);
    expect(filterRealProcesses(processes, { status: 'in_progress', dateRange: '7d' }, { now }))
      .toEqual(expect.arrayContaining([processes[1]]));
    expect(filterRealProcesses(processes, { status: 'nope' }, { now })).toHaveLength(0);
    expect(filterRealProcesses(processes, {}, { now })).toHaveLength(3);
  });
});

describe('A. companyData — fetch real (contract v1)', () => {
  it('fetchCompanySessions: GET {apiBase}/sessions?limit=N y devuelve candidates', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ candidates: FIXTURE_SESSIONS, total: 5, hasMore: false }) });
    const out = await fetchCompanySessions({ apiBase: 'https://api.test', fetchImpl, limit: 50 });
    expect(out).toBe(FIXTURE_SESSIONS);
    expect(fetchImpl).toHaveBeenCalledWith('https://api.test/sessions?limit=50', expect.objectContaining({ headers: expect.any(Object) }));
  });

  it('fetchCompanySessions: null ante error HTTP, lista vacía, shape raro, fallo de red o sin apiBase', async () => {
    expect(await fetchCompanySessions({ apiBase: 'https://x', fetchImpl: vi.fn().mockResolvedValue({ ok: false, status: 500 }) })).toBeNull();
    expect(await fetchCompanySessions({ apiBase: 'https://x', fetchImpl: vi.fn().mockResolvedValue({ ok: true, json: async () => ({ candidates: [], total: 0 }) }) })).toBeNull();
    expect(await fetchCompanySessions({ apiBase: 'https://x', fetchImpl: vi.fn().mockResolvedValue({ ok: true, json: async () => ({ total: 0 }) }) })).toBeNull();
    expect(await fetchCompanySessions({ apiBase: 'https://x', fetchImpl: vi.fn().mockRejectedValue(new Error('network')) })).toBeNull();
    const neverCalled = vi.fn();
    expect(await fetchCompanySessions({ apiBase: null, fetchImpl: neverCalled })).toBeNull();
    expect(neverCalled).not.toHaveBeenCalled();
  });
});

// ── B. useCompanyData ────────────────────────────────────────────────────────

describe('B. useCompanyData — fuente de datos del workspace empresa', () => {
  it('sin apiBase (jsdom/demo): modo demo sin llamar a fetch', () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('no debe llamarse'));
    const { result } = renderHook(() => useCompanyData());
    expect(result.current.source).toBe('demo');
    // V4 (t_9319e84d, D2): el demo devuelve mergeDemoProcesses(drafts) — array
    // derivado (mismo contenido que DEMO_PROCESSES sin drafts), no la ref.
    expect(result.current.processes).toEqual(DEMO_PROCESSES);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('enabled=false: no fetch aunque haya apiBase (placeholders V4)', () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ candidates: FIXTURE_SESSIONS }) });
    const { result } = renderHook(() => useCompanyData({ apiBase: 'https://api.test', fetchImpl, enabled: false }));
    expect(result.current.source).toBe('demo');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('apiBase + fetch pendiente: checking con lista vacía (sin parpadeo demo→real)', () => {
    const fetchImpl = vi.fn(() => new Promise(() => {})); // nunca resuelve
    const { result } = renderHook(() => useCompanyData({ apiBase: 'https://api.test', fetchImpl }));
    expect(result.current.source).toBe('checking');
    expect(result.current.processes).toEqual([]);
  });

  it('apiBase + ok: real con procesos derivados de /sessions', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ candidates: FIXTURE_SESSIONS, total: 5, hasMore: false }) });
    const { result } = renderHook(() => useCompanyData({ apiBase: 'https://api.test', fetchImpl }));
    await waitFor(() => expect(result.current.source).toBe('real'));
    expect(result.current.processes).toHaveLength(3);
    expect(result.current.processes.map((process) => process.id)).toEqual(['maintenance-tech', 'operations-analyst', UNSPECIFIED_PROCESS_ID]);
  });

  it('apiBase + fallo/vacío: fallback a demo (nunca error vacío, patrón v1)', async () => {
    const { result } = renderHook(() => useCompanyData({
      apiBase: 'https://api.test',
      fetchImpl: vi.fn().mockRejectedValue(new Error('network down')),
    }));
    await waitFor(() => expect(result.current.source).toBe('demo'));
    // V4 (t_9319e84d, D2): demo derivado (array, no la ref de DEMO_PROCESSES)
    expect(result.current.processes).toEqual(DEMO_PROCESSES);
  });
});

// ── C. CompanyDashboardPage (/empresa) ──────────────────────────────────────

describe('C. CompanyDashboardPage (ref company.html)', () => {
  it('demo: eyebrow ANDES + h1 Dashboard + overview + CTA New request', () => {
    renderWithLanguage(<CompanyDashboardPage data={demoData()} />);
    expect(screen.getByText(V3_COPY.es.company_eyebrow)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: V3_COPY.es.pages.dashboard.title })).toBeInTheDocument();
    expect(screen.getByText(V3_COPY.es.company_overview)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: new RegExp(V3_COPY.es.company_newRequest) })).toHaveAttribute('href', '/empresa/nueva-solicitud');
  });

  it('demo: 4 KPIs derivados de la lista — 3 / 85 / 81% / 24 (aceptación: coherencia)', () => {
    renderWithLanguage(<CompanyDashboardPage data={demoData()} />);
    // ref company.html: aria-label de .co-metrics = company_overview
    const metrics = screen.getByRole('region', { name: V3_COPY.es.company_overview });
    expect(within(metrics).getByText('3')).toBeInTheDocument();
    expect(within(metrics).getByText('85')).toBeInTheDocument();
    expect(within(metrics).getByText('81%')).toBeInTheDocument();
    expect(within(metrics).getByText('24')).toBeInTheDocument();
    // labels + sub-capas de la referencia
    for (const text of [
      V3_COPY.es.company_activeProcesses, V3_COPY.es.company_evaluated,
      V3_COPY.es.company_averageScore, V3_COPY.es.company_recommended,
      V3_COPY.es.company_openSearches, V3_COPY.es.company_completedAssessments,
      V3_COPY.es.company_krummScore, V3_COPY.es.company_readyReview,
    ]) {
      expect(within(metrics).getByText(text), text).toBeInTheDocument();
    }
  });

  it('demo: tabla con los 3 procesos de la ref (cargo, cand., score+track, estado, acción)', () => {
    renderWithLanguage(<CompanyDashboardPage data={demoData()} />);
    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(4); // header + 3
    expect(within(rows[1]).getByText(V3_COPY.es.company_supervisor)).toBeInTheDocument();
    expect(within(rows[1]).getByText('23')).toBeInTheDocument();
    expect(within(rows[1]).getByText('78%')).toBeInTheDocument();
    expect(within(rows[2]).getByText(V3_COPY.es.company_operator)).toBeInTheDocument();
    expect(within(rows[2]).getByText('47')).toBeInTheDocument();
    expect(within(rows[3]).getByText(V3_COPY.es.company_technician)).toBeInTheDocument();
    // pill de estado + acción por fila
    expect(within(table).getAllByText(V3_COPY.es.company_active)).toHaveLength(3);
    const viewLinks = within(table).getAllByRole('link', { name: new RegExp(V3_COPY.es.company_viewProcess) });
    expect(viewLinks.map((link) => link.getAttribute('href'))).toEqual([
      '/empresa/proceso/supervisor', '/empresa/proceso/operator', '/empresa/proceso/technician',
    ]);
    // mini-track con el ancho del score (ref: <i style="width:78%">")
    const tracks = table.querySelectorAll('.v3-co-mini-track i');
    expect([...tracks].map((track) => track.style.width)).toEqual(['78%', '81%', '84%']);
  });

  it('"View all processes" → /empresa/procesos + footer © 2026 KRUMM / tagline', () => {
    renderWithLanguage(<CompanyDashboardPage data={demoData()} />);
    expect(screen.getByRole('link', { name: new RegExp(V3_COPY.es.company_viewAll) })).toHaveAttribute('href', '/empresa/procesos');
    expect(screen.getByText(V3_COPY.es.common_footerYear)).toBeInTheDocument();
    expect(screen.getByText(V3_COPY.es.common_tagline)).toBeInTheDocument();
  });

  it('checking: KPIs "—" + fila de carga (sin datos falsos mientras fetch)', () => {
    renderWithLanguage(<CompanyDashboardPage data={{ source: 'checking', processes: [] }} />);
    const metrics = screen.getByRole('region', { name: V3_COPY.es.company_overview });
    expect(within(metrics).getAllByText('—')).toHaveLength(4);
    expect(screen.getByTestId('v2-dash-loading')).toHaveTextContent(V3_COPY.es.company_loading);
    expect(screen.getByRole('table').querySelectorAll('tbody tr')).toHaveLength(1);
  });

  it('real: KPIs + tabla derivados de las sesiones (fixture §A)', () => {
    const processes = buildCompanyDataFromSessions(FIXTURE_SESSIONS);
    renderWithLanguage(<CompanyDashboardPage data={{ source: 'real', processes }} />);
    const metrics = screen.getByRole('region', { name: V3_COPY.es.company_overview });
    // fixture §A: 3 procesos activos, 4 evaluados, 75% ponderado, 3 recomendados
    expect(within(metrics).getAllByText('3')).toHaveLength(2); // activos + recomendados
    expect(within(metrics).getByText('4')).toBeInTheDocument();
    expect(within(metrics).getByText('75%')).toBeInTheDocument();
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(4);
    // sin rol → label honesto "Cargo no especificado" (D3)
    expect(within(table).getByText(V3_COPY.es.company_unspecifiedRole)).toBeInTheDocument();
  });

  it('EN: KPIs y tabla traducen (cargos en inglés de la ref)', () => {
    renderWithLanguage(
      <CompanyShell section={V3_COPY.es.company_dashboard} active="dashboard">
        <CompanyDashboardPage data={demoData()} />
      </CompanyShell>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'EN' }));
    const metrics = screen.getByRole('region', { name: V3_COPY.en.company_overview });
    expect(within(metrics).getByText('81%')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: new RegExp(V3_COPY.en.company_viewAll) })).toHaveAttribute('href', '/empresa/procesos');
    const table = screen.getByRole('table');
    expect(within(table).getByText(V3_COPY.en.company_supervisor)).toBeInTheDocument();
    expect(within(table).getByText(V3_COPY.en.company_technician)).toBeInTheDocument();
    expect(within(table).getAllByText(V3_COPY.en.company_active)).toHaveLength(3);
  });
});

// ── D. CompanyProcessesPage (/empresa/procesos) ─────────────────────────────

describe('D. CompanyProcessesPage (ref processes.html/js — filtros y sort operativos)', () => {
  function renderProcesses(data = demoData()) {
    return renderWithLanguage(<CompanyProcessesPage data={data} />);
  }

  it('demo: h1 + intro + CTA; 3 cards; count 3', () => {
    renderProcesses();
    expect(screen.getByRole('heading', { level: 1, name: V3_COPY.es.pages.processes.title })).toBeInTheDocument();
    expect(screen.getByText(V3_COPY.es.pl_intro)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: new RegExp(V3_COPY.es.company_newRequest) })).toHaveAttribute('href', '/empresa/nueva-solicitud');
    expect(cardIds()).toHaveLength(3);
    expect(screen.getByTestId('v2-process-count')).toHaveTextContent('3');
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('card: pill Activo + fecha + cargo + "área · ubicación" + dl (cand/eval/score) + View process', () => {
    renderProcesses();
    const card = screen.getByTestId('v2-card-operator');
    expect(within(card).getByText(V3_COPY.es.company_operator)).toBeInTheDocument();
    expect(within(card).getByText('Operaciones · Calama, Chile')).toBeInTheDocument();
    expect(within(card).getByText('2026-08-25')).toBeInTheDocument();
    expect(within(card).getByText(V3_COPY.es.company_active)).toBeInTheDocument();
    expect(within(card).getByText('47')).toBeInTheDocument();
    expect(within(card).getByText('40')).toBeInTheDocument();
    expect(within(card).getByText('81%')).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: new RegExp(V3_COPY.es.company_viewProcess) })).toHaveAttribute('href', '/empresa/proceso/operator');
  });

  it('búsqueda "calama" → 1 card (operator) + count 1 (aceptación: filtros operativos)', () => {
    renderProcesses();
    fireEvent.change(screen.getByLabelText(V3_COPY.es.pl_search), { target: { value: 'calama' } });
    expect(cardIds()).toEqual(['v2-card-operator']);
    expect(screen.getByTestId('v2-process-count')).toHaveTextContent('1');
  });

  it('búsqueda "planta" (ES) → 2 cards; insensible a acentos ("mantencion" → 1)', () => {
    renderProcesses();
    const search = screen.getByLabelText(V3_COPY.es.pl_search);
    fireEvent.change(search, { target: { value: 'planta' } });
    expect(cardIds()).toEqual(['v2-card-operator', 'v2-card-supervisor']);
    fireEvent.change(search, { target: { value: 'mantencion' } });
    expect(cardIds()).toEqual(['v2-card-technician']);
  });

  it('búsqueda sin coincidencias → empty state + count 0', () => {
    renderProcesses();
    fireEvent.change(screen.getByLabelText(V3_COPY.es.pl_search), { target: { value: 'zzz' } });
    expect(cardIds()).toHaveLength(0);
    expect(screen.getByTestId('v2-process-count')).toHaveTextContent('0');
    expect(screen.getByTestId('v2-procs-empty')).toHaveTextContent(V3_COPY.es.pl_empty);
  });

  it('filtro departamento: maintenance → 1 card (technician); operations → 2', () => {
    renderProcesses();
    const department = screen.getByLabelText(V3_COPY.es.pd_department);
    fireEvent.change(department, { target: { value: 'maintenance' } });
    expect(cardIds()).toEqual(['v2-card-technician']);
    fireEvent.change(department, { target: { value: 'operations' } });
    expect(cardIds()).toEqual(['v2-card-operator', 'v2-card-supervisor']);
  });

  it('filtro ubicación: Calama → 1 (operator); Antofagasta → 2', () => {
    renderProcesses();
    const location = screen.getByLabelText(V3_COPY.es.pd_location);
    expect(within(location).getAllByRole('option')).toHaveLength(3); // all + 2 únicas
    fireEvent.change(location, { target: { value: 'Calama, Chile' } });
    expect(cardIds()).toEqual(['v2-card-operator']);
    fireEvent.change(location, { target: { value: 'Antofagasta, Chile' } });
    expect(cardIds()).toEqual(['v2-card-technician', 'v2-card-supervisor']);
  });

  it('filtros combinados: operations + "planta" → 2; operations + "mantención" → 0 + empty', () => {
    renderProcesses();
    fireEvent.change(screen.getByLabelText(V3_COPY.es.pd_department), { target: { value: 'operations' } });
    fireEvent.change(screen.getByLabelText(V3_COPY.es.pl_search), { target: { value: 'planta' } });
    expect(cardIds()).toHaveLength(2);
    fireEvent.change(screen.getByLabelText(V3_COPY.es.pl_search), { target: { value: 'mantencion' } });
    expect(cardIds()).toHaveLength(0);
    expect(screen.getByTestId('v2-procs-empty')).toBeInTheDocument();
  });

  it('sort "Más candidatos" → operator (47) primero', () => {
    renderProcesses();
    fireEvent.change(screen.getByLabelText(V3_COPY.es.pl_sort), { target: { value: 'candidates' } });
    expect(cardIds()).toEqual(['v2-card-operator', 'v2-card-technician', 'v2-card-supervisor']);
  });

  it('sort "Mayor puntaje promedio" → technician (84%) primero', () => {
    renderProcesses();
    fireEvent.change(screen.getByLabelText(V3_COPY.es.pl_sort), { target: { value: 'score' } });
    expect(cardIds()).toEqual(['v2-card-technician', 'v2-card-operator', 'v2-card-supervisor']);
  });

  it('sort "Más antiguos" → supervisor (2026-08-20) primero', () => {
    renderProcesses();
    fireEvent.change(screen.getByLabelText(V3_COPY.es.pl_sort), { target: { value: 'oldest' } });
    expect(cardIds()).toEqual(['v2-card-supervisor', 'v2-card-operator', 'v2-card-technician']);
  });

  it('sort "Cargo A–Z" (ES) → Operador, Supervisor, Técnico', () => {
    renderProcesses();
    fireEvent.change(screen.getByLabelText(V3_COPY.es.pl_sort), { target: { value: 'name' } });
    expect(cardIds()).toEqual(['v2-card-operator', 'v2-card-supervisor', 'v2-card-technician']);
  });

  it('"Limpiar filtros" resetea query/department/location/sort → recent + 3 cards (ref process-reset)', () => {
    renderProcesses();
    fireEvent.change(screen.getByLabelText(V3_COPY.es.pl_search), { target: { value: 'calama' } });
    fireEvent.change(screen.getByLabelText(V3_COPY.es.pd_department), { target: { value: 'maintenance' } });
    fireEvent.change(screen.getByLabelText(V3_COPY.es.pl_sort), { target: { value: 'candidates' } });
    expect(cardIds()).toHaveLength(0); // calama AND maintenance → vacío
    fireEvent.click(screen.getByRole('button', { name: V3_COPY.es.pl_reset }));
    expect(cardIds()).toHaveLength(3);
    expect(screen.getByTestId('v2-process-count')).toHaveTextContent('3');
    expect(screen.getByLabelText(V3_COPY.es.pl_search)).toHaveValue('');
    expect(screen.getByLabelText(V3_COPY.es.pd_department)).toHaveValue('');
    expect(screen.getByLabelText(V3_COPY.es.pl_sort)).toHaveValue('recent');
  });

  it('real: department/location sin datos → selects ocultos; búsqueda y sort siguen operativos (D3)', () => {
    const processes = buildCompanyDataFromSessions(FIXTURE_SESSIONS);
    renderProcesses({ source: 'real', processes });
    expect(screen.queryByLabelText(V3_COPY.es.pd_department)).toBeNull();
    expect(screen.queryByLabelText(V3_COPY.es.pd_location)).toBeNull();
    expect(cardIds()).toHaveLength(3);
    fireEvent.change(screen.getByLabelText(V3_COPY.es.pl_search), { target: { value: 'operations' } });
    expect(cardIds()).toEqual(['v2-card-operations-analyst']);
    fireEvent.change(screen.getByLabelText(V3_COPY.es.pl_search), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText(V3_COPY.es.pl_sort), { target: { value: 'candidates' } });
    // tiebreak byName (D5): sin rol ('' A–Z) antes que 'Maintenance Tech'
    expect(cardIds()).toEqual(['v2-card-operations-analyst', 'v2-card-unspecified', 'v2-card-maintenance-tech']);
  });

  it('checking: panel de carga (sin grid ni empty state)', () => {
    renderProcesses({ source: 'checking', processes: [] });
    expect(screen.getByTestId('v2-procs-loading')).toHaveTextContent(V3_COPY.es.company_loading);
    expect(cardIds()).toHaveLength(0);
    expect(screen.queryByTestId('v2-procs-empty')).toBeNull();
  });

  it('EN (shell): labels EN + cargo EN + sort "Role A–Z" → Maintenance Technician primero', () => {
    renderWithLanguage(
      <CompanyShell section={V3_COPY.es.company_processesTitle} active="processes">
        <CompanyProcessesPage data={demoData()} />
      </CompanyShell>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'EN' }));
    expect(screen.getByRole('heading', { level: 1, name: V3_COPY.en.pages.processes.title })).toBeInTheDocument();
    expect(screen.getByLabelText(V3_COPY.en.pl_search)).toBeInTheDocument();
    expect(screen.getByLabelText(V3_COPY.en.pd_department)).toBeInTheDocument();
    expect(screen.getByLabelText(V3_COPY.en.pd_location)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(V3_COPY.en.pl_sort), { target: { value: 'name' } });
    expect(cardIds()).toEqual(['v2-card-technician', 'v2-card-operator', 'v2-card-supervisor']);
    expect(screen.getByTestId('v2-card-technician')).toHaveTextContent(V3_COPY.en.company_technician);
  });
});

// ── E. V3RootApp — integración V2 ───────────────────────────────────────────

describe('E. V3RootApp — /empresa y /empresa/procesos son páginas reales (V2)', () => {
  it('/empresa: dashboard real (sin placeholder) + badge demo + KPIs demo', () => {
    const { container } = renderV3Route('/empresa');
    expect(container.querySelector('.v3-company')).not.toBeNull();
    expect(container.querySelector('.v3-placeholder')).toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: V3_COPY.es.pages.dashboard.title })).toBeInTheDocument();
    expect(screen.getByText(V3_COPY.es.company_demoBadge)).toBeInTheDocument();
    const metrics = screen.getByRole('region', { name: V3_COPY.es.company_overview });
    expect(within(metrics).getByText('85')).toBeInTheDocument();
    expect(container.querySelectorAll('.v3-co-table tbody tr')).toHaveLength(3);
  });

  it('/empresa/procesos: lista real (sin placeholder) + 3 cards + count 3', () => {
    const { container } = renderV3Route('/empresa/procesos');
    expect(container.querySelector('.v3-placeholder')).toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: V3_COPY.es.pages.processes.title })).toBeInTheDocument();
    expect(cardIds()).toHaveLength(3);
    expect(screen.getByTestId('v2-process-count')).toHaveTextContent('3');
  });

  it('/empresa/proceso/:id ya es página real (V3): back a procesos, sin placeholder', () => {
    const { container } = renderV3Route('/empresa/proceso/supervisor');
    expect(container.querySelector('.v3-placeholder')).toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: V3_COPY.es.company_supervisor })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: V3_COPY.es.pl_back })).toHaveAttribute('href', '/empresa/procesos');
  });

  it('/empresa/acceso intacto (V0): coming soon + CTA al demo', () => {
    renderV3Route('/empresa/acceso');
    expect(screen.getByText(V3_COPY.es.pages.companyAccess.comingSoon)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: V3_COPY.es.pages.companyAccess.cta })).toHaveAttribute('href', '/empresa');
  });
});

// ── F. CompanyShell — prop note (banner por fuente de datos) ────────────────

describe('F. CompanyShell — banner note (default demo V0 / real / loading)', () => {
  it('default (sin note): banner demo workspace de V0', () => {
    renderWithLanguage(
      <CompanyShell section={V3_COPY.es.company_dashboard} active="dashboard">
        <section>x</section>
      </CompanyShell>,
    );
    expect(screen.getByText(V3_COPY.es.company_demoBadge)).toBeInTheDocument();
    expect(screen.getByText(V3_COPY.es.company_demoNotice)).toBeInTheDocument();
  });

  it('note custom: badge + texto dados (modo real / checking)', () => {
    renderWithLanguage(
      <CompanyShell
        section={V3_COPY.es.company_dashboard}
        active="dashboard"
        note={{ badge: V3_COPY.es.company_liveBadge, text: V3_COPY.es.company_liveNotice }}
      >
        <section>x</section>
      </CompanyShell>,
    );
    expect(screen.getByText(V3_COPY.es.company_liveBadge)).toBeInTheDocument();
    expect(screen.getByText(V3_COPY.es.company_liveNotice)).toBeInTheDocument();
    expect(screen.queryByText(V3_COPY.es.company_demoBadge)).toBeNull();
    expect(screen.queryByText(V3_COPY.es.company_demoNotice)).toBeNull();
  });
});
