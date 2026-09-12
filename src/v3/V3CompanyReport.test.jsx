// t_84f00355 (V3 fase v3): spec de declaración — reporte de candidato embebido
// (/empresa/proceso/:id/candidatos/:sessionId), motor H4.3 (plan D3/D6).
//   G. Reporte demo ES: header + banner demo + resumen ejecutivo (engine) +
//      mapa de evidencia 8 constructos + warning + juegos + calidad +
//      gobernanza/caveats + back + score==tabla (D2).
//   H. EN (paridad i18n).
//   I. Not-found (D7: sin expedir el par raw).
//   J. Modo real (fetch stub, D6: alias, constructos null→insufficient,
//      caveats traducidos, juegos contract v1, integridad guard).
//   K. Integración V3RootApp demo (detail/report ya no placeholders;
//      breadcrumbs; V4 intacto).
import React from 'react';
import {
  cleanup, render, screen, waitFor, within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../i18n/LanguageContext.jsx';
import { V3_COPY } from './v3Copy.js';
import CompanyProcessReportPage from './CompanyProcessReportPage.jsx';
import { DEMO_PROCESSES } from './companyData.js';
import {
  getDemoCandidateOverall,
  getDemoCandidateReport,
  getDemoProcessDetail,
} from './companyProcessDetail.js';

// jsdom: mock de localStorage (mismo patrón que V0/V1/V2).
const storage = {};
const localStorageMock = {
  getItem: (key) => (key in storage ? storage[key] : null),
  setItem: (key, value) => { storage[key] = String(value); },
  removeItem: (key) => { delete storage[key]; },
  clear: () => { for (const key of Object.keys(storage)) delete storage[key]; },
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock, configurable: true });

function demoData() {
  return { source: 'demo', processes: DEMO_PROCESSES, sessions: [] };
}

function renderReport(processId, sessionId, data = demoData(), lang = 'es') {
  cleanup();
  window.history.pushState({}, '', `/empresa/proceso/${processId}/candidatos/${sessionId}${lang === 'en' ? '?lang=en' : ''}`);
  return render(
    <LanguageProvider>
      <CompanyProcessReportPage data={data} processId={processId} sessionId={sessionId} />
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

// ── G. Reporte demo ES ───────────────────────────────────────────────────────

describe('G. Reporte demo ES (motor H4.3)', () => {
  const copy = V3_COPY.es;

  it('header: h1, nombre, contexto (cargo + fecha), score==tabla (D2), back al proceso', () => {
    const { container } = renderReport('supervisor', 'maria-gonzalez');
    expect(screen.getByRole('heading', { level: 1, name: copy.pd_report })).toBeInTheDocument();
    expect(screen.getByText('María González')).toBeInTheDocument();
    expect(screen.getByText('Supervisor de Planta')).toBeInTheDocument();
    const time = container.querySelector('time');
    expect(time).toHaveAttribute('datetime', '2026-08-21T00:00:00.000Z');
    expect(time).toHaveTextContent('2026-08-21');
    // score del header = overall del motor = el mismo de la tabla del detalle
    expect(screen.getByText(copy.company_krummScore)).toBeInTheDocument();
    expect(screen.getByText('89%')).toBeInTheDocument();
    expect(screen.getByText('Excelente')).toBeInTheDocument();
    const back = screen.getByRole('link', { name: copy.pd_backProcess });
    expect(back).toHaveAttribute('href', '/empresa/proceso/supervisor');
    expect(container.querySelector('.v3-placeholder')).toBeNull();
  });

  it('banner demo (fixture synthetic) + batería original en validación', () => {
    renderReport('supervisor', 'maria-gonzalez');
    expect(screen.getByText('Candidato de demostración')).toBeInTheDocument();
    expect(screen.getByText('Datos sintéticos del workspace de demostración; no corresponden a una persona real.')).toBeInTheDocument();
    expect(screen.getByText('Batería original en validación interna')).toBeInTheDocument();
  });

  it('resumen ejecutivo (engine): headline + status + 4 cards', () => {
    renderReport('supervisor', 'maria-gonzalez');
    expect(screen.getByText('Resumen ejecutivo HR')).toBeInTheDocument();
    expect(screen.getByText('Batería original: lectura preliminar controlada')).toBeInTheDocument();
    expect(screen.getByText('Listo para revisión humana')).toBeInTheDocument();
    expect(screen.getByText('7/7 juegos completados')).toBeInTheDocument();
    expect(screen.getByText('Cómo usarlo')).toBeInTheDocument();
    expect(screen.getByText('Guía de entrevista')).toBeInTheDocument();
    expect(screen.getByText('10 constructos con señal de prueba')).toBeInTheDocument();
    expect(screen.getByText(/4 lectura\(s\) se mantienen descriptivas/)).toBeInTheDocument();
    expect(screen.getByText('Validar antes de comparar candidatos')).toBeInTheDocument();
  });

  it('mapa de evidencia: 10 constructos (6 provisional + 4 descriptivos) + warning + score provisional', () => {
    renderReport('supervisor', 'maria-gonzalez');
    expect(screen.getByText('Mapa de evidencia KRUMM')).toBeInTheDocument();
    expect(screen.getByText('Scores provisionales no validados, sin baremos y no aptos para comparar personas.')).toBeInTheDocument();
    // constructos con score (María: 99/77/89/98/87/85)
    for (const score of ['99', '77', '89', '98', '87', '85']) {
      expect(screen.getAllByText(score).length).toBeGreaterThan(0);
    }
    // los 4 descriptivos sin score (R-6: decisionMaking + adaptability +
    // proceduralWorkingMemory + appliedCommunication)
    expect(screen.getAllByText('Descriptivo')).toHaveLength(4);
    expect(screen.getAllByText('Lectura descriptiva')).toHaveLength(4);
    expect(screen.getAllByText('Score provisional')).toHaveLength(6);
    expect(screen.getAllByText('Sin baremos · no comparable')).toHaveLength(6);
  });

  it('resultados por juego: 7 juegos de la batería original, completados', () => {
    renderReport('supervisor', 'maria-gonzalez');
    expect(screen.getByText('Resultados por juego')).toBeInTheDocument();
    for (const game of ['Puzzle láser', 'Globo de riesgo', 'Optimización de rutas de pasajeros', 'Operación Faro: coordinación de equipo', 'Ensamblaje Geométrico (Tangram)', 'Desactivación de secuencias (Bomba)', 'Sala de Control']) {
      expect(screen.getByText(game)).toBeInTheDocument();
    }
    expect(screen.getAllByText('Completado')).toHaveLength(7);
  });

  it('calidad (engine, fixture): 6 cards — integridad verificada, cámara/muestras/rostro/confianza/ensayos simulados', () => {
    renderReport('supervisor', 'maria-gonzalez');
    // artifacts.fixture.synthetic=true → el motor usa los labels "simulado" del fixture
    expect(screen.getByText('Integridad técnica')).toBeInTheDocument();
    expect(screen.getByText('Verificada')).toBeInTheDocument();
    expect(screen.getByText('Cámara del fixture')).toBeInTheDocument();
    expect(screen.getByText('Simulada')).toBeInTheDocument();
    expect(screen.getByText('Muestras simuladas')).toBeInTheDocument();
    expect(screen.getByText('48')).toBeInTheDocument();
    // 88%/83% también aparecen en las cards de juego (cobertura tangram) →
    // scoping por la card de calidad
    const presenceCard = screen.getByText('Presencia facial simulada').closest('.v3-pr-quality-card');
    expect(within(presenceCard).getByText('88%')).toBeInTheDocument();
    const confidenceCard = screen.getByText('Confianza simulada').closest('.v3-pr-quality-card');
    expect(within(confidenceCard).getByText('83%')).toBeInTheDocument();
    expect(screen.getByText('Ensayos del fixture')).toBeInTheDocument();
  });

  it('gobernanza: caveats del engine (fixture + mapeo provisional) + nota de privacidad (sin crudos)', () => {
    renderReport('supervisor', 'maria-gonzalez');
    expect(screen.getByText('Gobernanza y observaciones')).toBeInTheDocument();
    expect(screen.getByText('Datos sintéticos de muestra; no corresponden a una persona real.')).toBeInTheDocument();
    expect(screen.getByText('Mapeo de constructos provisional; requiere validación psicométrica adicional.')).toBeInTheDocument();
    expect(screen.getByText('Uso exclusivo como soporte para revisión humana. Sin decisión automatizada, sin diagnóstico y sin inferir rasgos internos.')).toBeInTheDocument();
    expect(screen.getByText('No contiene video, frames, puntos reconstructivos faciales/corporales ni rutas crudas de puntero.')).toBeInTheDocument();
    // sin datos biométricos crudos expuestos en la vista
    const text = document.body.textContent;
    expect(text).not.toMatch(/blendshape|landmark|keypoint|pointerSample/i);
  });

  it('candidato rank 6 (Valentina): overall 78 + fit Bueno + su banner (mismo motor)', () => {
    renderReport('supervisor', 'valentina-rojas');
    expect(screen.getByText('Valentina Rojas')).toBeInTheDocument();
    expect(screen.getByText('78%')).toBeInTheDocument();
    expect(screen.getByText('Bueno')).toBeInTheDocument();
    expect(screen.getByText('Candidato de demostración')).toBeInTheDocument();
  });

  it('el overall del reporte coincide con el overall ligero de la tabla (una sola fuente, D2)', () => {
    for (const candidate of getDemoProcessDetail('supervisor').candidates) {
      expect(getDemoCandidateOverall('supervisor', candidate.id)).toBe(
        getDemoCandidateReport('supervisor', candidate.id).overall,
      );
    }
  });
});

// ── H. EN ────────────────────────────────────────────────────────────────────

describe('H. Reporte demo EN', () => {
  it('títulos/labels/constructos/juegos en inglés', () => {
    renderReport('supervisor', 'maria-gonzalez', demoData(), 'en');
    expect(screen.getByRole('heading', { level: 1, name: 'Candidate report' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to process' })).toHaveAttribute('href', '/empresa/proceso/supervisor');
    expect(screen.getByText('HR executive summary')).toBeInTheDocument();
    expect(screen.getByText('Original battery: controlled preliminary reading')).toBeInTheDocument();
    expect(screen.getByText('Ready for human review')).toBeInTheDocument();
    expect(screen.getByText('7/7 games completed')).toBeInTheDocument();
    expect(screen.getByText('KRUMM evidence map')).toBeInTheDocument();
    expect(screen.getByText('Unvalidated provisional scores, no norms, and not suitable for comparing people.')).toBeInTheDocument();
    expect(screen.getByText('Demo candidate')).toBeInTheDocument();
    expect(screen.getByText('Results by game')).toBeInTheDocument();
    expect(screen.getByText('Laser puzzle')).toBeInTheDocument();
    expect(screen.getByText('Sequence defusal (Bomb)')).toBeInTheDocument();
    expect(screen.getByText('Control Room')).toBeInTheDocument();
    expect(screen.getAllByText('Provisional score')).toHaveLength(6);
    expect(screen.getAllByText('Descriptive')).toHaveLength(4);
    expect(screen.getByText('Excellent')).toBeInTheDocument();
    expect(screen.getByText('KRUMM score')).toBeInTheDocument();
  });
});

// ── I. Not-found (D7) ────────────────────────────────────────────────────────

describe('I. Not-found (sin expedir el par raw)', () => {
  it('sessionId desconocida (demo): estado honesto + back al proceso', () => {
    const copy = V3_COPY.es;
    const { container } = renderReport('supervisor', 'sesion-inexistente');
    expect(screen.getByRole('heading', { level: 1, name: copy.pd_report })).toBeInTheDocument();
    expect(screen.getByText('Informe no encontrado')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: copy.pd_backProcess })).toHaveAttribute('href', '/empresa/proceso/supervisor');
    expect(container.textContent).not.toContain('sesion-inexistente');
    expect(container.textContent).not.toContain('María González');
    expect(container.querySelector('.v3-placeholder')).toBeNull();
  });

  it('proceso desconocido (demo): not-found', () => {
    renderReport('no-existe', 'maria-gonzalez');
    expect(screen.getByText('Informe no encontrado')).toBeInTheDocument();
  });
});

// ── J. Modo real (D6) ────────────────────────────────────────────────────────

vi.mock('../postulation-demo/postulationDemoConfig.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, KRUMM_API_BASE: 'https://api.krumm.test/v3' };
});

import V3RootApp from './V3RootApp.jsx'; // eslint-disable-line import/first

function fixtureSessionV3({ id, role = null, status, completedAt, scores, sessionQuality, caveats, games }) {
  return {
    id,
    alias: `alias-${id}`,
    role,
    status,
    completedAt,
    sessionQuality,
    completion: { completed: 4, total: 4 },
    constructs: scores.map((score, index) => ({
      id: ['decisionMaking', 'problemSolving', 'riskFeedbackProfile', 'planning', 'adaptability', 'analyticalThinking', 'leadership', 'communication'][index],
      label: 'L', labelEn: 'L', score, confidence: 0.5,
    })),
    caveats,
    games,
  };
}

const FIXTURE_SESSIONS_V3 = [
  fixtureSessionV3({
    id: 's1', role: 'Operations Analyst', status: 'ready', completedAt: '2026-08-01T10:00:00.000Z',
    scores: [80, 80, null, 78, null, 82, null, null], sessionQuality: 0.9,
    caveats: ['low_face_presence'],
    games: [
      { id: 'laser', label: 'Puzzle láser', labelEn: 'Laser puzzle', metric: '3/3 mapas', value: 93 },
      { id: 'balloon', label: 'Riesgo y feedback', labelEn: 'Risk and feedback', metric: '8/8 rondas', value: null },
      { id: 'routes', label: 'Rutas', labelEn: 'Routes', metric: '5/5 entregas', value: null },
      { id: 'team', label: 'Operación Faro', labelEn: 'Faro Operation', metric: '4/4 escenarios', value: null },
    ],
  }),
  fixtureSessionV3({
    id: 's2', role: 'Operations Analyst', status: 'needs_review', completedAt: '2026-08-10T11:00:00.000Z',
    scores: [70, null, 70, 70, 70, 70, 70, 70], sessionQuality: 0.6, caveats: [], games: [],
  }),
];

function renderRouteV3(pathname) {
  cleanup();
  window.history.pushState({}, '', pathname);
  return render(
    <LanguageProvider>
      <V3RootApp />
    </LanguageProvider>,
  );
}

describe('J. Reporte real (GET /sessions → mismo data-model)', () => {
  it('header: alias (no nombre), cargo, fecha, overall 80 + fit Bueno, back al proceso real', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: FIXTURE_SESSIONS_V3, total: 2, hasMore: false }),
    }));
    const { container } = renderRouteV3('/empresa/proceso/operations-analyst/candidatos/s1');
    await waitFor(() => expect(screen.getByText(V3_COPY.es.company_liveBadge)).toBeInTheDocument());
    expect(screen.getByRole('heading', { level: 1, name: V3_COPY.es.pd_report })).toBeInTheDocument();
    expect(screen.getByText('alias-s1')).toBeInTheDocument();
    expect(screen.getByText('Operations Analyst')).toBeInTheDocument();
    expect(container.querySelector('time')).toHaveTextContent('2026-08-01');
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByText('Bueno')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: V3_COPY.es.pd_backProcess })).toHaveAttribute('href', '/empresa/proceso/operations-analyst');
    expect(container.querySelector('.v3-placeholder')).toBeNull();
  });

  it('8 constructos: 4 provisional + 4 "Evidencia insuficiente" (score null) con labels del flujo', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: FIXTURE_SESSIONS_V3, total: 2, hasMore: false }),
    }));
    renderRouteV3('/empresa/proceso/operations-analyst/candidatos/s1');
    await screen.findByRole('heading', { level: 1, name: V3_COPY.es.pd_report });
    await screen.findAllByText('Evidencia insuficiente');
    expect(screen.getAllByText('Evidencia insuficiente')).toHaveLength(4);
    expect(screen.getAllByText('Lectura preliminar')).toHaveLength(4);
    // labels canónicos del flujo (definición, no el stub 'L')
    expect(screen.getByText('Toma de decisiones (descriptiva)')).toBeInTheDocument();
    expect(screen.getByText('Resolución de problemas')).toBeInTheDocument();
    expect(screen.getByText('Planificación')).toBeInTheDocument();
    expect(screen.getByText('Pensamiento analítico')).toBeInTheDocument();
  });

  it('caveats traducidos + juegos contract v1 (93 / 3 pendientes) + cobertura/calidad/estado/integridad', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: FIXTURE_SESSIONS_V3, total: 2, hasMore: false }),
    }));
    renderRouteV3('/empresa/proceso/operations-analyst/candidatos/s1');
    await screen.findByRole('heading', { level: 1, name: V3_COPY.es.pd_report });
    expect(screen.getByText('Presencia facial baja durante la captura.')).toBeInTheDocument();
    expect(screen.getByText('Puzzle láser')).toBeInTheDocument();
    expect(screen.getByText('3/3 mapas')).toBeInTheDocument();
    expect(screen.getByText('93')).toBeInTheDocument();
    expect(screen.getAllByText('Resultado pendiente')).toHaveLength(3);
    expect(screen.getByText('4/4')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
    expect(screen.getByText('Listo para revisión')).toBeInTheDocument();
    expect(screen.getByText('Verificada')).toBeInTheDocument();
  });

  it('fila inexistente en real: not-found honesto', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: FIXTURE_SESSIONS_V3, total: 2, hasMore: false }),
    }));
    renderRouteV3('/empresa/proceso/operations-analyst/candidatos/s99');
    await waitFor(() => expect(screen.getByText(V3_COPY.es.company_liveBadge)).toBeInTheDocument());
    expect(screen.getByText('Informe no encontrado')).toBeInTheDocument();
  });
});

// ── K. Integración V3RootApp (modo real, fetch stub) ────────────────────────
// El vi.mock de arriba fija KRUMM_API_BASE → estas rutas corren en modo real
// (detalle/reporte del grupo por rol). La integración en modo DEMO (dispatch
// sin placeholder + breadcrumb) está en V3Shells.test.jsx (sin mock).

describe('K. V3RootApp — integración modo real (detalle + reporte)', () => {
  const okFetchStub = () => vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ candidates: FIXTURE_SESSIONS_V3, total: 2, hasMore: false }),
  });

  it('/empresa/proceso/operations-analyst: detalle real sin placeholder + breadcrumb "Detalle del proceso"', async () => {
    vi.stubGlobal('fetch', okFetchStub());
    cleanup();
    window.history.pushState({}, '', '/empresa/proceso/operations-analyst');
    render(<LanguageProvider><V3RootApp /></LanguageProvider>);
    await screen.findByRole('heading', { level: 1, name: 'Operations Analyst' });
    expect(document.body.querySelector('.v3-placeholder')).toBeNull();
    expect(screen.getByTestId('v3-breadcrumb-current')).toHaveTextContent(V3_COPY.es.company_processDetail);
  });

  it('/empresa/proceso/operations-analyst/candidatos/s1: reporte real sin placeholder + breadcrumb "Informe del candidato"', async () => {
    vi.stubGlobal('fetch', okFetchStub());
    cleanup();
    window.history.pushState({}, '', '/empresa/proceso/operations-analyst/candidatos/s1');
    render(<LanguageProvider><V3RootApp /></LanguageProvider>);
    await screen.findByRole('heading', { level: 1, name: V3_COPY.es.pd_report });
    expect(document.body.querySelector('.v3-placeholder')).toBeNull();
    expect(screen.getByTestId('v3-breadcrumb-current')).toHaveTextContent(V3_COPY.es.company_processReport);
  });

  it('/empresa/nueva-solicitud: página real V4 (2 cards) — sin fetch (enabled=false)', async () => {
    const fetchStub = vi.fn().mockRejectedValue(new Error('no debe llamarse'));
    vi.stubGlobal('fetch', fetchStub);
    cleanup();
    window.history.pushState({}, '', '/empresa/nueva-solicitud');
    render(<LanguageProvider><V3RootApp /></LanguageProvider>);
    expect(screen.getByRole('heading', { level: 1, name: V3_COPY.es.pages.newRequest.title })).toBeInTheDocument();
    // V4 (t_9319e84d): el placeholder de V3 se reemplaza por las 2 cards reales
    expect(document.body.querySelector('.v3-placeholder')).toBeNull();
    expect(screen.getByRole('link', { name: new RegExp(V3_COPY.es.request_upload) })).toHaveAttribute('href', '/empresa/nueva-solicitud/subida');
    expect(screen.getByRole('link', { name: new RegExp(V3_COPY.es.request_design) })).toHaveAttribute('href', '/empresa/nueva-solicitud/diseño');
    expect(fetchStub).not.toHaveBeenCalled();
  });
});
