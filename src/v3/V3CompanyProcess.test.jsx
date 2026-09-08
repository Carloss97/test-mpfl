// t_84f00355 (V3 fase v3): spec de declaración — detalle de proceso
// (/empresa/proceso/:id) + motor demo del reporte.
//   A. companyProcessDetail.js: perfiles demo (referencia literal), coherencia
//      con V2 DEMO_PROCESSES, bandas de fit (D2), overalls del motor.
//   B. Motor H4.3: artifacts demo (builder del flujo) — validation, fixture,
//      determinismo, light==full (D3), privacidad (sin claves prohibidas).
//   C. CompanyProcessDetailPage demo ES (secciones de la referencia).
//   D. EN (paridad i18n).
//   E. Acciones (diálogo preview + menú ⋯ — D4).
//   F. Modo real (fetch stub, D6) + not-found (D7).
// Referencia visual: process-detail*.html + script.js (pd_/pa_).
import React from 'react';
import {
  cleanup, fireEvent, render, screen, waitFor, within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ASSESSMENT_FORBIDDEN_KEYS } from '../assessment/assessmentSession.js';
import { LanguageProvider } from '../i18n/LanguageContext.jsx';
import { V3_COPY } from './v3Copy.js';
import CompanyProcessDetailPage from './CompanyProcessDetailPage.jsx';
import { DEMO_PROCESSES } from './companyData.js';
import {
  DEMO_PROCESS_IDS,
  DEMO_PROCESS_PROFILES,
  buildRealProcessDetail,
  fitForScore,
  getDemoCandidateOverall,
  getDemoCandidateReport,
  getDemoProcessDetail,
  resetDemoReportCache,
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

function renderDetail(processId = 'supervisor', data = demoData(), lang = 'es') {
  cleanup();
  window.history.pushState({}, '', `/empresa/proceso/${processId}${lang === 'en' ? '?lang=en' : ''}`);
  return render(
    <LanguageProvider>
      <CompanyProcessDetailPage data={data} processId={processId} />
    </LanguageProvider>,
  );
}

function collectForbiddenKeys(value, out = new Set()) {
  if (!value || typeof value !== 'object') return out;
  if (Array.isArray(value)) { value.forEach((item) => collectForbiddenKeys(item, out)); return out; }
  for (const [key, child] of Object.entries(value)) {
    if (ASSESSMENT_FORBIDDEN_KEYS.includes(key)) out.add(key);
    collectForbiddenKeys(child, out);
  }
  return out;
}

afterEach(() => {
  cleanup();
  window.history.pushState({}, '', '/');
  localStorage.clear();
  document.body.innerHTML = '';
  resetDemoReportCache();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

// ── A. Datos demo (referencia) ───────────────────────────────────────────────

describe('A. companyProcessDetail — perfiles demo (referencia process-detail*)', () => {
  it('3 perfiles con los valores exactos de la referencia (días, stats, avanzadas)', () => {
    const supervisor = getDemoProcessDetail('supervisor');
    expect(supervisor.daysActive).toBe(18);
    expect(supervisor.created).toEqual({ es: '20 de agosto de 2026', en: 'August 20, 2026' });
    expect(supervisor.stats).toMatchObject({ applicants: 23, evaluated: 19, pending: 4 });
    expect(supervisor.stats.distribution.map((d) => d.count)).toEqual([2, 4, 7, 5, 1]);
    expect(supervisor.stats.avgTimeMin).toBe(14);
    expect(supervisor.advanced.age).toMatchObject({ avg: 36 });
    expect(supervisor.advanced.age.bars.map((b) => b.count)).toEqual([3, 9, 7, 4]);
    expect(supervisor.advanced.experience.bars.map((b) => b.count)).toEqual([2, 6, 9, 6]);
    expect(supervisor.advanced.cognitivePresent.map((c) => c.value)).toEqual([84, 79, 74]);
    expect(supervisor.advanced.cognitiveScarce.map((c) => c.value)).toEqual([37, 32, 26]);

    const operator = getDemoProcessDetail('operator');
    expect(operator.daysActive).toBe(13);
    expect(operator.stats).toMatchObject({ applicants: 47, evaluated: 40, pending: 7 });
    expect(operator.stats.distribution.map((d) => d.count)).toEqual([2, 4, 9, 18, 7]);
    expect(operator.advanced.age.bars.map((b) => b.count)).toEqual([12, 18, 11, 6]);

    const technician = getDemoProcessDetail('technician');
    expect(technician.daysActive).toBe(9);
    expect(technician.stats).toMatchObject({ applicants: 31, evaluated: 26, pending: 5 });
    expect(technician.stats.distribution.map((d) => d.count)).toEqual([1, 2, 4, 12, 7]);
    expect(technician.advanced.cognitivePresent.map((c) => c.value)).toEqual([88, 81, 77]);
  });

  it('coherencia con V2 DEMO_PROCESSES (mismas filas: cand/eval/score/fecha/área/ubicación)', () => {
    for (const process of DEMO_PROCESSES) {
      const detail = getDemoProcessDetail(process.id);
      expect(detail).not.toBeNull();
      expect(detail.stats.applicants).toBe(process.candidates);
      expect(detail.stats.evaluated).toBe(process.evaluated);
      expect(detail.averageScore).toBe(process.averageScore);
      expect(detail.openedAt).toBe(process.openedAt);
      expect(detail.department).toBe(process.department);
      expect(detail.location).toBe(process.location);
      expect(detail.stats.pending).toBe(process.candidates - process.evaluated);
    }
  });

  it('6 candidatos por proceso (nombres ref, targets 94/91/87/82/79/76, ids únicos)', () => {
    for (const id of DEMO_PROCESS_IDS) {
      const detail = getDemoProcessDetail(id);
      expect(detail.candidates).toHaveLength(6);
      expect(detail.candidates.map((c) => c.target)).toEqual([94, 91, 87, 82, 79, 76]);
      const ids = detail.candidates.map((c) => c.id);
      expect(new Set(ids).size).toBe(6);
      expect(ids).not.toContain('');
      expect(detail.candidates[0].initials.length).toBeGreaterThan(1);
    }
    expect(getDemoProcessDetail('supervisor').candidates.map((c) => c.name)).toEqual([
      'María González', 'Diego Ramírez', 'Camila Soto', 'Juan Pérez', 'Sebastián Torres', 'Valentina Rojas',
    ]);
    expect(getDemoProcessDetail('operator').candidates[0].name).toBe('Pablo Morales');
    expect(getDemoProcessDetail('technician').candidates[0].name).toBe('Nicolás Fuentes');
    expect(getDemoProcessDetail('nope')).toBeNull();
  });

  it('fitForScore: bandas calibradas (D2) preservan el fit de la referencia', () => {
    expect(fitForScore(89)).toBe('excellent');
    expect(fitForScore(87)).toBe('excellent');
    expect(fitForScore(85)).toBe('veryGood');
    expect(fitForScore(82)).toBe('good');
    expect(fitForScore(80)).toBe('good');
    expect(fitForScore(78)).toBe('good');
    expect(fitForScore(77)).toBe('fair');
    expect(fitForScore(null)).toBeNull();
  });

  it('overalls del motor: monótonos estrictos + fit Ex/Ex/VG/G/G/G por proceso', () => {
    for (const id of DEMO_PROCESS_IDS) {
      const detail = getDemoProcessDetail(id);
      const overalls = detail.candidates.map((c) => getDemoCandidateOverall(id, c.id));
      expect(overalls).not.toContain(null);
      for (let i = 1; i < overalls.length; i += 1) {
        expect(overalls[i - 1]).toBeGreaterThan(overalls[i]);
      }
      expect(overalls.map((value) => fitForScore(value))).toEqual(
        ['excellent', 'excellent', 'veryGood', 'good', 'good', 'good'],
      );
    }
  });
});

// ── B. Motor H4.3 (artifacts demo) ───────────────────────────────────────────

describe('B. Motor H4.3 — artifacts demo (builder del flujo, D3)', () => {
  it('artifacts completos: validation ok, fixture synthetic, batería original, runId determinista', () => {
    const report = getDemoCandidateReport('supervisor', 'maria-gonzalez');
    expect(report).not.toBeNull();
    expect(report.artifacts.validation.ok).toBe(true);
    expect(report.artifacts.fixture.synthetic).toBe(true);
    expect(report.artifacts.batteryMode).toBe('original_games');
    expect(report.artifacts.runId).toBe('krumm-company-demo-supervisor-maria-gonzalez');
    expect(report.overall).toBe(89);
    expect(report.fit).toBe('excellent');
    expect(report.completedAt).toBe('2026-08-21T00:00:00.000Z');
  });

  it('talentFramework: 8 constructos — 6 provisional_score + 2 descriptive_only (R-6)', () => {
    const report = getDemoCandidateReport('supervisor', 'maria-gonzalez');
    const framework = report.artifacts.assessmentSession.talentFramework;
    expect(framework.constructOrder).toHaveLength(8);
    const constructs = framework.constructs;
    expect(constructs.decisionMaking.availability).toBe('descriptive_only');
    expect(constructs.decisionMaking.score).toBeNull();
    expect(constructs.adaptability.availability).toBe('descriptive_only');
    expect(constructs.adaptability.score).toBeNull();
    const scored = framework.constructOrder
      .map((id) => constructs[id].score)
      .filter((value) => value != null);
    expect(scored).toHaveLength(6);
    // overall = media de constructos no-nulos (mismas semánticas V2)
    expect(report.overall).toBe(Math.round(scored.reduce((a, b) => a + b, 0) / scored.length));
  });

  it('overall ligero (tabla) === overall completo (reporte) en los 18 candidatos', () => {
    for (const id of DEMO_PROCESS_IDS) {
      const detail = getDemoProcessDetail(id);
      for (const candidate of detail.candidates) {
        expect(getDemoCandidateOverall(id, candidate.id))
          .toBe(getDemoCandidateReport(id, candidate.id).overall);
      }
    }
  });

  it('determinismo: cache referencial + reconstrucción idempotente', () => {
    const first = getDemoCandidateReport('operator', 'pablo-morales');
    expect(getDemoCandidateReport('operator', 'pablo-morales')).toBe(first);
    resetDemoReportCache();
    const second = getDemoCandidateReport('operator', 'pablo-morales');
    expect(second).not.toBe(first);
    expect(second.overall).toBe(first.overall);
    expect(second.artifacts.runId).toBe(first.artifacts.runId);
  });

  it('privacidad: los artifacts no contienen claves prohibidas del flujo (allowlist-only)', () => {
    const report = getDemoCandidateReport('supervisor', 'juan-perez');
    const forbidden = collectForbiddenKeys(report.artifacts);
    expect([...forbidden]).toEqual([]);
  });

  it('candidato/proceso desconocidos → null (sin throw)', () => {
    expect(getDemoCandidateReport('supervisor', 'inexistente')).toBeNull();
    expect(getDemoCandidateReport('inexistente', 'maria-gonzalez')).toBeNull();
    expect(getDemoCandidateOverall('supervisor', 'inexistente')).toBeNull();
  });
});

// ── C. Detalle demo ES ───────────────────────────────────────────────────────

describe('C. CompanyProcessDetailPage — demo ES (secciones de la referencia)', () => {
  it('header: h1 cargo, sub con fecha creada, back a procesos, estado + días activos', () => {
    const copy = V3_COPY.es;
    renderDetail('supervisor');
    expect(screen.getByRole('heading', { level: 1, name: 'Supervisor de Planta' })).toBeInTheDocument();
    expect(screen.getByText(`${copy.pd_subtitlePrefix} ${copy.pd_createdOn}20 de agosto de 2026`)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: copy.pl_back })).toHaveAttribute('href', '/empresa/procesos');
    // 'Activo' aparece 2× (estado del header + estado en configuration)
    expect(screen.getAllByText(copy.company_active)).toHaveLength(2);
    expect(screen.getByText(`18 ${copy.pd_daysActive}`)).toBeInTheDocument();
  });

  it('4 métricas (días/candidatos/evaluados/score) con notas de la referencia', () => {
    const copy = V3_COPY.es;
    const { container } = renderDetail('supervisor');
    const metrics = screen.getByRole('region', { name: copy.pd_metrics });
    expect(within(metrics).getByText('18')).toBeInTheDocument();
    expect(within(metrics).getByText(copy.pd_since)).toBeInTheDocument();
    expect(within(metrics).getByText('23')).toBeInTheDocument();
    expect(within(metrics).getByText(copy.pd_received)).toBeInTheDocument();
    expect(within(metrics).getByText('19')).toBeInTheDocument();
    expect(within(metrics).getByText(copy.company_completedAssessments)).toBeInTheDocument();
    expect(within(metrics).getByText('78%')).toBeInTheDocument();
    expect(within(metrics).getByText(copy.company_krummScore)).toBeInTheDocument();
    expect(container.querySelector('.v3-placeholder')).toBeNull();
  });

  it('configuration: cargo/área/ubicación/modalidad/perfil/estado (ref)', () => {
    const copy = V3_COPY.es;
    renderDetail('supervisor');
    const config = screen.getByRole('region', { name: copy.pd_configuration });
    expect(within(config).getByText(copy.pd_role)).toBeInTheDocument();
    expect(within(config).getByText('Supervisor de Planta')).toBeInTheDocument();
    expect(within(config).getByText(copy.pd_department)).toBeInTheDocument();
    expect(within(config).getByText(copy.pd_operations)).toBeInTheDocument();
    expect(within(config).getByText(copy.pd_location)).toBeInTheDocument();
    expect(within(config).getByText('Antofagasta, Chile')).toBeInTheDocument();
    expect(within(config).getByText(copy.pd_mode)).toBeInTheDocument();
    expect(within(config).getByText('Presencial')).toBeInTheDocument();
    expect(within(config).getByText(copy.pd_profile)).toBeInTheDocument();
    expect(within(config).getByText(DEMO_PROCESS_PROFILES.supervisor.profile.es)).toBeInTheDocument();
    expect(within(config).getByText(copy.company_status)).toBeInTheDocument();
    expect(within(config).getByText(copy.pd_editConfig)).toBeInTheDocument();
  });

  it('statistics: postulantes + legend evaluados/pendientes + distribución 2/4/7/5/1 + 14 min', () => {
    const copy = V3_COPY.es;
    renderDetail('supervisor');
    const stats = screen.getByRole('region', { name: copy.pd_statistics });
    expect(within(stats).getByText(copy.pd_applicants)).toBeInTheDocument();
    expect(within(stats).getByText('23')).toBeInTheDocument();
    // legend (el '4' también existe en la distribución → scope por ítem;
    // closest incluye el elemento → parentElement al span contenedor)
    const evaluatedItem = within(stats).getByText(copy.pd_evaluated).parentElement;
    expect(evaluatedItem).toHaveTextContent('19');
    const pendingItem = within(stats).getByText(copy.pd_pending).parentElement;
    expect(pendingItem).toHaveTextContent('4');
    expect(within(stats).getByText(copy.pd_distribution)).toBeInTheDocument();
    // el count va en <strong> con sr-only "Candidatos" dentro → extraer el número
    const distCounts = [...stats.querySelectorAll('.v3-pd-distribution strong')]
      .map((node) => (node.textContent.match(/^\d+/) ?? [null])[0]);
    expect(distCounts).toEqual(['2', '4', '7', '5', '1']);
    expect(within(stats).getByText(copy.pd_averageTime)).toBeInTheDocument();
    expect(within(stats).getByText('14')).toBeInTheDocument();
    expect(within(stats).getByText(copy.pd_perCandidate)).toBeInTheDocument();
  });

  it('advanced statistics (details): edad/experiencia/cognitivas de la referencia', () => {
    const copy = V3_COPY.es;
    renderDetail('supervisor');
    const details = screen.getByRole('button', { name: new RegExp(copy.pa_title) });
    expect(details).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(details);
    expect(details).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(copy.pa_note)).toBeInTheDocument();
    expect(screen.getByText(copy.pa_age)).toBeInTheDocument();
    expect(screen.getByText('36')).toBeInTheDocument();
    // 'años' aparece en edad Y experiencia
    expect(screen.getAllByText(copy.pa_years)).toHaveLength(2);
    expect(screen.getByText(copy.pa_experience)).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText(copy.pa_attention)).toBeInTheDocument();
    expect(screen.getByText('84%')).toBeInTheDocument();
    expect(screen.getByText(copy.pa_reasoning)).toBeInTheDocument();
    expect(screen.getByText('79%')).toBeInTheDocument();
    expect(screen.getByText(copy.pa_memory)).toBeInTheDocument();
    expect(screen.getByText(copy.pa_flexibility)).toBeInTheDocument();
    expect(screen.getByText('37%')).toBeInTheDocument();
    expect(screen.getByText(copy.pa_planning)).toBeInTheDocument();
    expect(screen.getByText('32%')).toBeInTheDocument();
    expect(screen.getByText(copy.pa_speed)).toBeInTheDocument();
    expect(screen.getByText('26%')).toBeInTheDocument();
  });

  it('recommended: tabla 6 rows — nombres ref, score del motor (89/87/85/82/80/78), fit, status, link al reporte', () => {
    const copy = V3_COPY.es;
    renderDetail('supervisor');
    const ranking = screen.getByRole('region', { name: copy.pd_recommended });
    const rows = within(ranking).getAllByRole('row');
    expect(rows).toHaveLength(7); // thead + 6
    const expected = [
      ['María González', '89%', 'Excelente'],
      ['Diego Ramírez', '87%', 'Excelente'],
      ['Camila Soto', '85%', 'Muy bueno'],
      ['Juan Pérez', '82%', 'Bueno'],
      ['Sebastián Torres', '80%', 'Bueno'],
      ['Valentina Rojas', '78%', 'Bueno'],
    ];
    expected.forEach(([name, score, fit], index) => {
      const row = rows[index + 1];
      expect(within(row).getByText(name)).toBeInTheDocument();
      expect(within(row).getByText(score)).toBeInTheDocument();
      expect(within(row).getByText(fit)).toBeInTheDocument();
      expect(within(row).getByText(copy.pd_evaluatedStatus)).toBeInTheDocument();
    });
    const link = within(rows[1]).getByRole('link', { name: /Ver informe/ });
    expect(link).toHaveAttribute('href', '/empresa/proceso/supervisor/candidatos/maria-gonzalez');
    expect(within(ranking).getByText(copy.pd_rankingSubtitle)).toBeInTheDocument();
  });

  it('technician: área Mantenimiento + candidatos technician + links al proceso correcto', () => {
    const copy = V3_COPY.es;
    renderDetail('technician');
    expect(screen.getByRole('heading', { level: 1, name: 'Técnico de Mantención' })).toBeInTheDocument();
    const config = screen.getByRole('region', { name: copy.pd_configuration });
    expect(within(config).getByText(copy.pd_maintenance)).toBeInTheDocument();
    const ranking = screen.getByRole('region', { name: copy.pd_recommended });
    const link = within(ranking).getAllByRole('link').find((node) => /Ver informe/.test(node.textContent));
    expect(link).toHaveAttribute('href', '/empresa/proceso/technician/candidatos/nicolas-fuentes');
  });

  it('process actions + footer (ref)', () => {
    const copy = V3_COPY.es;
    renderDetail('supervisor');
    const actions = screen.getByRole('region', { name: copy.pd_actions });
    expect(within(actions).getByRole('button', { name: copy.pd_edit })).toBeInTheDocument();
    expect(within(actions).getByRole('button', { name: copy.pd_allCandidates })).toBeInTheDocument();
    expect(within(actions).getByRole('button', { name: copy.pd_pause })).toBeInTheDocument();
    expect(screen.getByText(copy.common_footerYear)).toBeInTheDocument();
    expect(screen.getByText(copy.common_tagline)).toBeInTheDocument();
  });
});

// ── D. EN ────────────────────────────────────────────────────────────────────

describe('D. CompanyProcessDetailPage — EN (paridad i18n)', () => {
  it('títulos/secciones/candidatos en inglés (ref EN)', () => {
    const copy = V3_COPY.en;
    renderDetail('supervisor', demoData(), 'en');
    expect(screen.getByRole('heading', { level: 1, name: 'Plant Supervisor' })).toBeInTheDocument();
    expect(screen.getByText(`${copy.pd_subtitlePrefix} ${copy.pd_createdOn}August 20, 2026`)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: copy.pl_back })).toHaveAttribute('href', '/empresa/procesos');
    expect(screen.getByText(`18 ${copy.pd_daysActive}`)).toBeInTheDocument();
    const stats = screen.getByRole('region', { name: copy.pd_statistics });
    expect(within(stats).getByText(copy.pd_distribution)).toBeInTheDocument();
    const ranking = screen.getByRole('region', { name: copy.pd_recommended });
    expect(within(ranking).getAllByText('Excellent')).toHaveLength(2);
    expect(within(ranking).getByText('Very good')).toBeInTheDocument();
    expect(within(ranking).getAllByText('Good')).toHaveLength(3);
    const link = within(ranking).getAllByRole('link').find((node) => /View report/.test(node.textContent));
    expect(link).toHaveAttribute('href', '/empresa/proceso/supervisor/candidatos/maria-gonzalez');
  });

  it('advanced EN: cognitive skills labels de la referencia', () => {
    const copy = V3_COPY.en;
    renderDetail('operator', demoData(), 'en');
    fireEvent.click(screen.getByRole('button', { name: new RegExp(copy.pa_title) }));
    expect(screen.getByText(copy.pa_present)).toBeInTheDocument();
    expect(screen.getByText('Sustained attention')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
    expect(screen.getByText(copy.pa_scarce)).toBeInTheDocument();
    expect(screen.getByText('Processing speed')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
  });
});

// ── E. Acciones (D4: preview, estado local) ──────────────────────────────────

describe('E. Acciones — diálogo preview + menú ⋯', () => {
  it('Pausar proceso (sección actions) abre el diálogo con título y pd_mockAction; Cerrar lo cierra', () => {
    const copy = V3_COPY.es;
    renderDetail('supervisor');
    const actions = screen.getByRole('region', { name: copy.pd_actions });
    fireEvent.click(within(actions).getByRole('button', { name: copy.pd_pause }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: copy.pd_pause })).toBeInTheDocument();
    expect(within(dialog).getByText(copy.pd_mockAction)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: copy.common_close }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('menú ⋯ abre las 3 acciones (menuitems); Edit desde el menú abre el diálogo de edit', () => {
    const copy = V3_COPY.es;
    renderDetail('supervisor');
    const more = screen.getByRole('button', { name: copy.pd_more });
    expect(screen.queryAllByRole('menuitem')).toHaveLength(0);
    fireEvent.click(more);
    expect(screen.getAllByRole('menuitem')).toHaveLength(3);
    const menuEdit = screen.getAllByRole('menuitem').find((button) => button.textContent === copy.pd_edit);
    expect(menuEdit).not.toBeNull();
    fireEvent.click(menuEdit);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: copy.pd_edit })).toBeInTheDocument();
    // la acción también cierra el menú
    expect(screen.queryAllByRole('menuitem')).toHaveLength(0);
  });

  it('menú ⋯: click fuera lo cierra; Escape lo cierra y devuelve el focus al trigger', () => {
    const copy = V3_COPY.es;
    renderDetail('supervisor');
    const more = screen.getByRole('button', { name: copy.pd_more });
    expect(screen.queryAllByRole('menuitem')).toHaveLength(0);
    fireEvent.click(more);
    expect(screen.getAllByRole('menuitem')).toHaveLength(3);
    fireEvent.mouseDown(document.body);
    expect(screen.queryAllByRole('menuitem')).toHaveLength(0);
    fireEvent.click(more);
    expect(screen.getAllByRole('menuitem')).toHaveLength(3);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryAllByRole('menuitem')).toHaveLength(0);
    expect(more).toHaveFocus();
  });

  it('Edit configuration (panel) también abre el diálogo preview (ref)', () => {
    const copy = V3_COPY.es;
    renderDetail('supervisor');
    fireEvent.click(screen.getByRole('button', { name: copy.pd_editConfig }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: copy.pd_editConfig })).toBeInTheDocument();
    expect(within(dialog).getByText(copy.pd_mockAction)).toBeInTheDocument();
  });
});

// ── F. Real + not-found ──────────────────────────────────────────────────────

describe('F. Modo real (D6) y not-found (D7)', () => {
  it('buildRealProcessDetail: grupo por rol con alias, orden overall desc, sin datos inventados', () => {
    const rows = [
      { id: 's1', alias: 'session-abcdef12', status: 'ready', completedAt: '2026-08-01T10:00:00.000Z', constructs: [{ id: 'problemSolving', score: 80, confidence: 0.5 }] },
      { id: 's2', alias: 'session-xyz98765', status: 'in_progress', completedAt: '2026-08-10T10:00:00.000Z', constructs: [{ id: 'planning', score: 90, confidence: 0.5 }] },
      { id: 's3', alias: 'session-mid43210', status: 'needs_review', completedAt: '2026-08-20T10:00:00.000Z', constructs: [] },
    ];
    const detail = buildRealProcessDetail(
      { id: 'operations-analyst', role: 'Operations Analyst', roleEn: 'Operations Analyst', candidates: 3, evaluated: 2, averageScore: 85, status: 'active' },
      rows,
    );
    expect(detail.kind).toBe('real');
    expect(detail.daysActive).toBeNull();
    expect(detail.distribution ?? detail.stats.distribution).toBeNull();
    expect(detail.advanced).toBeNull();
    expect(detail.department).toBeNull();
    expect(detail.candidates.map((c) => c.id)).toEqual(['s2', 's1', 's3']); // 90, 80, null al final
    expect(detail.candidates[0].alias).toBe('session-xyz98765');
    expect(detail.candidates[2].overall).toBeNull();
  });

  it('detalle demo id desconocido: estado honesto (h1 de página + texto + back; sin placeholder)', () => {
    const copy = V3_COPY.es;
    const { container } = renderDetail('no-existe');
    expect(screen.getByRole('heading', { level: 1, name: copy.pages.processDetail.title })).toBeInTheDocument();
    expect(screen.getByText(copy.pd_notFound)).toBeInTheDocument();
    expect(screen.getByText(copy.pd_notFoundText)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: copy.pl_back })).toHaveAttribute('href', '/empresa/procesos');
    expect(container.querySelector('.v3-placeholder')).toBeNull();
    expect(container.textContent).not.toContain('no-existe');
  });
});

// ── F2. Integración V3RootApp modo real (fetch stub, patrón V2CompanyReal) ──

vi.mock('../postulation-demo/postulationDemoConfig.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, KRUMM_API_BASE: 'https://api.krumm.test/v3' };
});

import V3RootApp from './V3RootApp.jsx'; // eslint-disable-line import/first

function fixtureSessionV3({ id, role = null, status, completedAt, scores }) {
  return {
    id,
    alias: `alias-${id}`,
    role,
    status,
    completedAt,
    completion: { completed: 4, total: 4 },
    constructs: scores.map((score, index) => ({
      id: ['decisionMaking', 'problemSolving', 'riskFeedbackProfile', 'planning', 'adaptability', 'analyticalThinking', 'leadership', 'communication'][index],
      label: 'L', labelEn: 'L', score, confidence: 0.5,
    })),
  };
}

const FIXTURE_SESSIONS_V3 = [
  fixtureSessionV3({ id: 's1', role: 'Operations Analyst', status: 'ready', completedAt: '2026-08-01T10:00:00.000Z', scores: [80, 80, null, 78, null, 82, null, null] }),
  fixtureSessionV3({ id: 's2', role: 'Operations Analyst', status: 'needs_review', completedAt: '2026-08-10T11:00:00.000Z', scores: [70, null, 70, 70, 70, 70, 70, 70] }),
  fixtureSessionV3({ id: 's3', role: 'Operations Analyst', status: 'in_progress', completedAt: '2026-08-15T12:00:00.000Z', scores: [90, 90, 90, 90, null, null, null, null] }),
  fixtureSessionV3({ id: 's4', role: 'Maintenance Tech', status: 'ready', completedAt: '2026-08-20T09:00:00.000Z', scores: [90, 90, 90, 90, 90, 90, 90, 90] }),
  fixtureSessionV3({ id: 's5', status: 'ready', completedAt: '2026-08-05T08:00:00.000Z', scores: [60, 60, 60, 60, 60, 60, 60, 60] }),
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

describe('F2. V3RootApp — detalle en modo real', () => {
  it('/empresa/proceso/operations-analyst real: h1 rol, sin placeholder, días "—", 3 candidatos con link de reporte', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: FIXTURE_SESSIONS_V3, total: 5, hasMore: false }),
    }));
    renderRouteV3('/empresa/proceso/operations-analyst');
    await waitFor(() => expect(screen.getByText(V3_COPY.es.company_liveBadge)).toBeInTheDocument());
    expect(screen.getByRole('heading', { level: 1, name: 'Operations Analyst' })).toBeInTheDocument();
    expect(document.body.querySelector('.v3-placeholder')).toBeNull();
    expect(screen.queryByText(/Estadísticas avanzadas/i)).toBeNull();
    expect(screen.queryByText(V3_COPY.es.pd_distribution)).toBeNull();
    // métricas: días "—", candidatos 3, evaluados 2, score 75%
    // (V2 D3: media de overalls de evaluados: s1 80 + s2 70 → 75)
    const metrics = screen.getByRole('region', { name: V3_COPY.es.pd_metrics });
    expect(within(metrics).getByText('—')).toBeInTheDocument();
    expect(within(metrics).getByText('3')).toBeInTheDocument();
    expect(within(metrics).getByText('2')).toBeInTheDocument();
    expect(within(metrics).getByText('75%')).toBeInTheDocument();
    // config: solo cargo + estado (sin área/ubicación/modalidad/perfil)
    const config = screen.getByRole('region', { name: V3_COPY.es.pd_configuration });
    expect(within(config).queryByText(V3_COPY.es.pd_department)).toBeNull();
    expect(within(config).queryByText(V3_COPY.es.pd_location)).toBeNull();
    expect(within(config).queryByText(V3_COPY.es.pd_mode)).toBeNull();
    expect(within(config).queryByText(V3_COPY.es.pd_profile)).toBeNull();
    // candidatos: 3 filas alias, orden overall desc (s3 90, s1 80, s2 70)
    const ranking = screen.getByRole('region', { name: V3_COPY.es.pd_recommended });
    const rows = within(ranking).getAllByRole('row');
    expect(rows).toHaveLength(4); // thead + 3
    expect(within(rows[1]).getByText('alias-s3')).toBeInTheDocument();
    expect(within(rows[1]).getByText('90%')).toBeInTheDocument();
    expect(within(rows[2]).getByText('alias-s1')).toBeInTheDocument();
    expect(within(rows[2]).getByText('80%')).toBeInTheDocument();
    expect(within(rows[3]).getByText('alias-s2')).toBeInTheDocument();
    const reportLink = within(rows[1]).getByRole('link', { name: /Ver informe/ });
    expect(reportLink).toHaveAttribute('href', '/empresa/proceso/operations-analyst/candidatos/s3');
  });

  it('/empresa/proceso/<id-inexistente> real: not-found honesto (sin fetch fallido visible)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: FIXTURE_SESSIONS_V3, total: 5, hasMore: false }),
    }));
    renderRouteV3('/empresa/proceso/no-existe');
    await waitFor(() => expect(screen.getByText(V3_COPY.es.company_liveBadge)).toBeInTheDocument());
    expect(screen.getByText(V3_COPY.es.pd_notFound)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: V3_COPY.es.pl_back })).toHaveAttribute('href', '/empresa/procesos');
  });
});
