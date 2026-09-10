// t_90a5157c (V2 fase v3): modo real end-to-end — VITE_KRUMM_API_BASE
// configurada (mockeada vía vi.mock del config) + fetch stub global:
// V3RootApp → CompanyWorkspace → useCompanyData → GET /sessions →
// banner "Sesiones reales (staging)" (prop note del shell) + KPIs/tabla
// derivados de las sesiones. Fallback: fetch falla → demo (patrón v1).
// El resto del modo real (hook, mapping, fetch) está cubierto en
// V2Company.test.jsx (§A/§B) sin dependencias de VITE_*.
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
  vi.restoreAllMocks();
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

// ── B3 (KRU-50): filtros modo real + brief de entrevista + exports ──────────

describe('B3 (KRU-50) — filtros real + brief + exports', () => {
  it('/empresa/procesos real: selects Periodo + Estado presentes; badge por realStatus derivado', async () => {
    vi.stubGlobal('fetch', okFetch);
    renderRoute('/empresa/procesos');
    await screen.findByText(V3_COPY.es.company_liveBadge);
    expect(screen.getByLabelText(V3_COPY.es.pl_period)).toBeInTheDocument();
    expect(screen.getByLabelText(V3_COPY.es.pl_status)).toBeInTheDocument();
    // Operations Analyst tiene s3 in_progress → "En curso"; Maintenance (ready) → "Completados"
    expect(screen.getByTestId('v2-card-operations-analyst')).toHaveTextContent(V3_COPY.es.pl_status_in_progress);
    expect(screen.getByTestId('v2-card-maintenance-tech')).toHaveTextContent(V3_COPY.es.pl_status_completed);
  });

  it('demo (fetch falla): selects Periodo/Estado ausentes (solo modo real)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('staging down')));
    renderRoute('/empresa/procesos');
    await waitFor(() => expect(screen.getByText(V3_COPY.es.company_demoNotice)).toBeInTheDocument());
    expect(screen.queryByLabelText(V3_COPY.es.pl_period)).toBeNull();
    expect(screen.queryByLabelText(V3_COPY.es.pl_status)).toBeNull();
  });

  it('filtro Estado: in_progress → solo el grupo con sesiones en curso; reset restaura', async () => {
    vi.stubGlobal('fetch', okFetch);
    renderRoute('/empresa/procesos');
    await screen.findByText(V3_COPY.es.company_liveBadge);
    fireEvent.change(screen.getByLabelText(V3_COPY.es.pl_status), { target: { value: 'in_progress' } });
    expect(screen.getByTestId('v2-process-count')).toHaveTextContent('1');
    expect(screen.getByTestId('v2-card-operations-analyst')).toBeInTheDocument();
    expect(screen.queryByTestId('v2-card-maintenance-tech')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: V3_COPY.es.pl_reset }));
    expect(screen.getByTestId('v2-process-count')).toHaveTextContent('3');
  });

  it('filtro Periodo: 7d conserva solo procesos recientes (fixture determinista)', async () => {
    const now = Date.now();
    const iso = (daysAgo) => new Date(now - daysAgo * 86400000).toISOString().slice(0, 10);
    const sessions = [
      fixtureSession({ id: 'r1', role: 'Recent Role', status: 'ready', completedAt: `${iso(2)}T10:00:00.000Z`, scores: [80, 80, 80, 80, 80, 80, 80, 80] }),
      fixtureSession({ id: 'r2', role: 'Old Role', status: 'ready', completedAt: `${iso(20)}T10:00:00.000Z`, scores: [70, 70, 70, 70, 70, 70, 70, 70] }),
    ];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ candidates: sessions, total: 2, hasMore: false }) }));
    renderRoute('/empresa/procesos');
    await screen.findByText(V3_COPY.es.company_liveBadge);
    fireEvent.change(screen.getByLabelText(V3_COPY.es.pl_period), { target: { value: '7d' } });
    expect(screen.getByTestId('v2-process-count')).toHaveTextContent('1');
    expect(screen.getByTestId('v2-card-recent-role')).toBeInTheDocument();
    expect(screen.queryByTestId('v2-card-old-role')).toBeNull();
    // 30d: ambos
    fireEvent.change(screen.getByLabelText(V3_COPY.es.pl_period), { target: { value: '30d' } });
    expect(screen.getByTestId('v2-process-count')).toHaveTextContent('2');
  });

  it('detalle real: columna Brief + botón export CSV (BOM, header, null = celda vacía)', async () => {
    vi.stubGlobal('fetch', okFetch);
    renderRoute('/empresa/proceso/operations-analyst');
    await screen.findByRole('heading', { level: 1, name: 'Operations Analyst' });
    expect(screen.getByRole('columnheader', { name: V3_COPY.es.pd_brief })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: V3_COPY.es.pd_brief_toggle })).toHaveLength(3);

    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-csv');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click');
    fireEvent.click(screen.getByTestId('v3-pd-export-csv'));
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0];
    expect(blob.type).toBe('text/csv;charset=utf-8');
    // filename en anchor.download (Blob no tiene .name)
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy.mock.instances[0].download).toMatch(/^krumm-brief-operations-analyst-\d{4}-\d{2}-\d{2}\.csv$/);
    // BOM UTF-8 en bytes (el decodificador por defecto lo descarta del texto)
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    const text = new TextDecoder('utf-8').decode(bytes);
    expect(text.startsWith('process_id,role,candidate_alias,candidate_status,completed_at,overall_score,construct_id,construct_label,construct_score,construct_availability,caveats')).toBe(true);
    expect(text).toContain('operations-analyst');
    expect(text).toContain('alias-s1');
    // s2 tiene c1 = null → fila con celda de score vacía (nunca 0)
    expect(text).toMatch(/,c1,L,,insufficient,/);
  });

  it('detalle real: expandir brief → disclaimer + prompts + notas descriptivas + MD por candidato', async () => {
    vi.stubGlobal('fetch', okFetch);
    renderRoute('/empresa/proceso/operations-analyst');
    await screen.findByRole('heading', { level: 1, name: 'Operations Analyst' });
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-md');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    // Orden por overall desc: s3 (90), s1 (80), s2 (70) → toggle[0] = s3 (4 nulls)
    const toggles = screen.getAllByRole('button', { name: V3_COPY.es.pd_brief_toggle });
    expect(toggles[0]).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggles[0]);
    const panel = await screen.findByTestId('v3-pd-brief-s3');
    expect(toggles[0]).toHaveAttribute('aria-expanded', 'true');
    expect(panel).toHaveTextContent(V3_COPY.es.pd_brief_disclaimer);
    expect(panel).toHaveTextContent(V3_COPY.es.pd_brief_prompts);
    expect(panel).toHaveTextContent(V3_COPY.es.pd_brief_notes);
    // 5 prompts (apertura + 4 constructos con señal)
    expect(panel.querySelectorAll('ol li')).toHaveLength(5);
    expect(panel.querySelector('ol li')).toHaveTextContent(/cómo decidió y priorizó/);
    // 4 notas "sin señal" (c4..c7 null) — la ausencia NUNCA se lee como bajo desempeño
    expect(panel.querySelectorAll('ul li')).toHaveLength(4);
    expect(panel).toHaveTextContent('no interpretar como bajo desempeño');

    // Descargar brief MD del candidato
    fireEvent.click(screen.getByTestId('v3-pd-brief-md-s3'));
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0];
    expect(blob.type).toBe('text/markdown;charset=utf-8');
    const text = await blob.text();
    expect(text).toContain('# Brief de entrevista — Operations Analyst');
    expect(text).toContain('## alias-s3 · in_progress');
    expect(text).toContain('humanReviewOnly · noAutomatedDecision · observationalOnly · privacySafe');
    expect(text).toContain('Puntaje global (descriptivo):** 90/100');
    expect(text).toContain('sin señal en esta batería');
  });

  it('detalle demo: sin columna Brief ni export (los datos demo no son sesiones reales)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('sin api')));
    renderRoute('/empresa/proceso/supervisor');
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: V3_COPY.es.company_supervisor })).toBeInTheDocument());
    expect(screen.queryByRole('columnheader', { name: V3_COPY.es.pd_brief })).toBeNull();
    expect(screen.queryByTestId('v3-pd-export-csv')).toBeNull();
  });
});
