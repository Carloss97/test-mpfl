// t_90a5157c (V2 fase v3): modo real end-to-end — VITE_KRUMM_API_BASE
// configurada (mockeada vía vi.mock del config) + fetch stub global:
// V3RootApp → CompanyWorkspace → useCompanyData → GET /sessions →
// banner "Sesiones reales (staging)" (prop note del shell) + KPIs/tabla
// derivados de las sesiones. Fallback: fetch falla → demo (patrón v1).
// El resto del modo real (hook, mapping, fetch) está cubierto en
// V2Company.test.jsx (§A/§B) sin dependencias de VITE_*.
import React from 'react';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// vi.mock se hoistea antes de los imports: KRUMM_API_BASE = api fake.
// t_84f00355 (V3): el detalle/reporte importan el builder del flujo, que a su
// vez necesita el resto de los exports del config → importar el original y
// sobrescribir SOLO KRUMM_API_BASE (los datos demo del detalle no dependen de
// la API).
vi.mock('../postulation-demo/postulationDemoConfig.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, KRUMM_API_BASE: 'https://api.krumm.test/staging' };
});

import { LanguageProvider } from '../i18n/LanguageContext.jsx';
import { V3_COPY } from './v3Copy.js';
import V3RootApp from './V3RootApp.jsx';
import { buildCompanyDataFromSessions } from './companyData.js';

// jsdom: mock de localStorage (mismo patrón que V0/V1).
const storage = {};
const localStorageMock = {
  getItem: (key) => (key in storage ? storage[key] : null),
  setItem: (key, value) => { storage[key] = String(value); },
  removeItem: (key) => { delete storage[key]; },
  clear: () => { for (const key of Object.keys(storage)) delete storage[key]; },
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock, configurable: true });

// Fixture (mismo shape que /sessions v1; 5 sesiones, 2 roles + 1 sin rol).
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

const okFetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ candidates: FIXTURE_SESSIONS, total: 5, hasMore: false }),
});

function renderRoute(pathname) {
  cleanup();
  window.history.pushState({}, '', pathname);
  return render(
    <LanguageProvider>
      <V3RootApp />
    </LanguageProvider>,
  );
}

afterEach(() => {
  cleanup();
  window.history.pushState({}, '', '/');
  localStorage.clear();
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('V2CompanyReal — modo real (VITE_KRUMM_API_BASE + GET /sessions)', () => {
  it('/empresa real: banner "Sesiones reales (staging)" + aviso humanReviewOnly + KPIs derivados (3/4/75%/3)', async () => {
    vi.stubGlobal('fetch', okFetch);
    const { container } = renderRoute('/empresa');
    // el fetch es async: esperar el badge real (sale de 'checking')
    await screen.findByText(V3_COPY.es.company_liveBadge);
    expect(screen.getByText(V3_COPY.es.company_liveNotice)).toBeInTheDocument();
    expect(screen.queryByText(V3_COPY.es.company_demoNotice)).toBeNull();
    expect(okFetch).toHaveBeenCalledWith(
      'https://api.krumm.test/staging/sessions?limit=50',
      expect.objectContaining({ headers: expect.any(Object) }),
    );
    const metrics = screen.getByRole('region', { name: V3_COPY.es.company_overview });
    expect(within(metrics).getAllByText('3')).toHaveLength(2); // activos + recomendados
    expect(within(metrics).getByText('4')).toBeInTheDocument(); // evaluados
    expect(within(metrics).getByText('75%')).toBeInTheDocument(); // ponderado
    // tabla: 3 filas (roles) + "Cargo no especificado" (D3)
    expect(container.querySelectorAll('.v3-co-table tbody tr')).toHaveLength(3);
    expect(screen.getByText(V3_COPY.es.company_unspecifiedRole)).toBeInTheDocument();
    expect(container.querySelector('.v3-placeholder')).toBeNull();
  });

  it('/empresa/procesos real: selects department/location ocultos + 3 cards + count', async () => {
    vi.stubGlobal('fetch', okFetch);
    renderRoute('/empresa/procesos');
    await screen.findByText(V3_COPY.es.company_liveBadge);
    expect(screen.queryByLabelText(V3_COPY.es.pd_department)).toBeNull();
    expect(screen.queryByLabelText(V3_COPY.es.pd_location)).toBeNull();
    expect(screen.getAllByTestId(/^v2-card-/)).toHaveLength(3);
    expect(screen.getByTestId('v2-process-count')).toHaveTextContent('3');
    // cards con los datos agregados del fixture
    const analyst = screen.getByTestId('v2-card-operations-analyst');
    expect(analyst).toHaveTextContent('3');
    expect(analyst).toHaveTextContent('75%');
  });

  it('fetch falla → fallback demo: badge demo + KPIs 3/85/81%/24 (patrón v1, sin error vacío)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('staging down')));
    const { container } = renderRoute('/empresa');
    await waitFor(() => expect(screen.getByText(V3_COPY.es.company_demoNotice)).toBeInTheDocument());
    const metrics = screen.getByRole('region', { name: V3_COPY.es.company_overview });
    expect(within(metrics).getByText('85')).toBeInTheDocument();
    expect(within(metrics).getByText('81%')).toBeInTheDocument();
    expect(container.querySelectorAll('.v3-co-table tbody tr')).toHaveLength(3);
    expect(screen.getByText(V3_COPY.es.company_supervisor)).toBeInTheDocument();
  });

  it('fetch vacío → fallback demo (mismo que fallo)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ candidates: [], total: 0 }) }));
    renderRoute('/empresa');
    await waitFor(() => expect(screen.getByText(V3_COPY.es.company_demoNotice)).toBeInTheDocument());
    expect(screen.queryByText(V3_COPY.es.company_liveBadge)).toBeNull();
  });

  it('placeholder empresa (V4) con API: enabled=false → no fetch, banner demo', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('no debe llamarse')));
    renderRoute('/empresa/nueva-solicitud');
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: V3_COPY.es.pages.newRequest.title })).toBeInTheDocument());
    expect(screen.getByText(V3_COPY.es.company_demoBadge)).toBeInTheDocument();
    expect(okFetch).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('V3: /empresa/proceso/:id real ahora fetcha (detalle por rol) y no es placeholder', async () => {
    vi.stubGlobal('fetch', okFetch);
    renderRoute('/empresa/proceso/operations-analyst');
    await screen.findByRole('heading', { level: 1, name: 'Operations Analyst' });
    expect(okFetch).toHaveBeenCalledTimes(1);
    expect(document.body.querySelector('.v3-placeholder')).toBeNull();
  });

  it('sanity: buildCompanyDataFromSessions del fixture (coherencia con el banner real)', () => {
    const processes = buildCompanyDataFromSessions(FIXTURE_SESSIONS);
    expect(processes.map((process) => process.id)).toEqual(['maintenance-tech', 'operations-analyst', 'unspecified']);
  });
});
