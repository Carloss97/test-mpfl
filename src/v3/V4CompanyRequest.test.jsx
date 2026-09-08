// t_9319e84d (V4 fase v3): spec de declaración — new request empresa.
//   A. companyData.js (puras): validateDesignInput, uniqueProcessId,
//      buildDraftProcess, mergeDemoProcesses, validateProfileFile, formatFileSize.
//   B. companyProcessStore.js: solo en memoria (snapshot estable, ids únicos,
//      reset, hook reactivo useSyncExternalStore).
//   C. useCompanyData: demo mergea drafts en vivo; real NO mergea (D2).
//   D. /empresa/nueva-solicitud: 2 cards reales (QUICK upload / RECOMMENDED
//      design), hrefs, badges, ES/EN (sin placeholder).
//   E. /diseño: formulario guiado de 3 pasos (sin LLM) → crea proceso →
//      confirmación → visible en /empresa/procesos (count 4) + KPI dashboard
//      + detalle coherente (0/0/0/—, config del form, sin avanzadas, nota sin
//      candidatos, fecha larga localizada). notFound ajeno intacto.
//   F. /subida: validación de tipo/tamaño (pdf/docx/txt, >0, ≤10MB) →
//      metadatos + confirmación honesta (sin NLP) + reset. Privacy assert:
//      el contenido del archivo nunca aparece en la UI ni en el resultado
//      de validateProfileFile.
//   G. Regresión D7: company_candidate (header tabla detalle V3).
// Plan: docs/plans/2026-09-08-plan-t9319e84d-v4-company-request.md
import React from 'react';
import {
  act, cleanup, fireEvent, render, renderHook, screen, waitFor, within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../i18n/LanguageContext.jsx';
import { V3_COPY } from './v3Copy.js';
import V3RootApp from './V3RootApp.jsx';
import {
  buildDraftProcess,
  DEMO_PROCESSES,
  formatFileSize,
  mergeDemoProcesses,
  uniqueProcessId,
  validateDesignInput,
  validateProfileFile,
} from './companyData.js';
import {
  COMPANY_DRAFTS_STORAGE_KEY,
  createDraftProcess,
  getDraftProcesses,
  resetCompanyProcessStore,
  useCompanyDraftProcesses,
} from './companyProcessStore.js';
import { useCompanyData } from './useCompanyData.js';

// jsdom: mock de localStorage (mismo patrón V0–V3).
const storage = {};
const localStorageMock = {
  getItem: (key) => (key in storage ? storage[key] : null),
  setItem: (key, value) => { storage[key] = String(value); },
  removeItem: (key) => { delete storage[key]; },
  clear: () => { for (const key of Object.keys(storage)) delete storage[key]; },
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock, configurable: true });

const NOW = new Date('2026-09-08T12:00:00.000Z');

const VALID_INPUT = {
  role: 'Analista de Control',
  department: 'operations',
  location: 'Antofagasta, Chile',
  mode: 'onsite',
  profile: 'Perfil orientado a datos y control de procesos.',
};

function renderWithLanguage(ui) {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

function renderV3Route(pathname) {
  cleanup();
  window.history.pushState({}, '', pathname);
  return renderWithLanguage(<V3RootApp />);
}

function fileWithSize(name, size) {
  return new File([new ArrayBuffer(size)], name);
}

function fillStep1(es = true) {
  const copy = es ? V3_COPY.es : V3_COPY.en;
  fireEvent.change(screen.getByLabelText(copy.rd_role), { target: { value: 'Analista de Control' } });
  fireEvent.change(screen.getByLabelText(copy.rd_department), { target: { value: 'operations' } });
  fireEvent.change(screen.getByLabelText(copy.rd_location), { target: { value: 'Antofagasta, Chile' } });
}

afterEach(() => {
  resetCompanyProcessStore();
  window.history.pushState({}, '', '/');
  localStorage.clear();
  document.body.innerHTML = '';
});

// ── A. companyData.js (puras) ────────────────────────────────────────────────

describe('A. validación y construcción de borradores (puras)', () => {
  it('validateDesignInput: role y department requeridos; longitudes máximas', () => {
    expect(validateDesignInput({ role: '', department: '' }))
      .toEqual({ role: true, department: true });
    expect(validateDesignInput({ role: '   ', department: 'operations', mode: 'onsite' }))
      .toEqual({ role: true });
    expect(validateDesignInput({ role: 'X'.repeat(81), department: 'operations', mode: 'onsite' }))
      .toEqual({ role: true });
    expect(validateDesignInput({ role: 'Rol', department: 'operations', mode: 'onsite', location: 'X'.repeat(81) }))
      .toEqual({ location: true });
    expect(validateDesignInput({ role: 'Rol', department: 'operations', mode: 'onsite', profile: 'X'.repeat(301) }))
      .toEqual({ profile: true });
    expect(validateDesignInput({ role: 'Rol', department: 'other', mode: 'onsite' }))
      .toEqual({ department: true });
    expect(validateDesignInput(VALID_INPUT)).toEqual({});
  });

  it('uniqueProcessId: base libre → base; colisiones (demo + drafts) → -2, -3', () => {
    const demoIds = DEMO_PROCESSES.map((process) => process.id);
    expect(uniqueProcessId('analista-de-control', [])).toBe('analista-de-control');
    expect(uniqueProcessId('analista-de-control', ['analista-de-control'])).toBe('analista-de-control-2');
    expect(uniqueProcessId('analista-de-control', ['analista-de-control', 'analista-de-control-2']))
      .toBe('analista-de-control-3');
    expect(uniqueProcessId('supervisor', demoIds)).toBe('supervisor-2');
  });

  it('buildDraftProcess: shape coherente con la lista demo (ceros + null + source design)', () => {
    const process = buildDraftProcess(VALID_INPUT, '2026-09-08', []);
    expect(process).toEqual({
      id: 'analista-de-control',
      role: 'Analista de Control',
      roleEn: 'Analista de Control',
      department: 'operations',
      location: 'Antofagasta, Chile',
      openedAt: '2026-09-08',
      candidates: 0,
      evaluated: 0,
      recommended: 0,
      averageScore: null,
      status: 'active',
      source: 'design',
      mode: 'onsite',
      profile: VALID_INPUT.profile,
    });
  });

  it('buildDraftProcess: location/profile vacíos → null; roleEn = role (sin traducción inventada)', () => {
    const process = buildDraftProcess(
      { role: 'Ünïcødé', department: 'maintenance', mode: 'hybrid' },
      '2026-09-08',
      [],
    );
    // ø no decompone en NFD → se reemplaza por '-' en el slug
    expect(process.id).toBe('unic-de');
    expect(process.location).toBeNull();
    expect(process.profile).toBeNull();
    expect(process.roleEn).toBe('Ünïcødé');
    expect(process.mode).toBe('hybrid');
  });

  it('buildDraftProcess: slug vacío → "proceso" (con sufijo si colisiona)', () => {
    const process = buildDraftProcess(
      { role: '—', department: 'operations', mode: 'onsite' },
      '2026-09-08',
      ['proceso'],
    );
    expect(process.id).toBe('proceso-2');
  });

  it('mergeDemoProcesses: [] → 3 demo intactas; con drafts → demo + drafts al final', () => {
    expect(mergeDemoProcesses([])).toHaveLength(3);
    expect(mergeDemoProcesses([])).toEqual(DEMO_PROCESSES);
    const draft = buildDraftProcess(VALID_INPUT, '2026-09-08', []);
    const merged = mergeDemoProcesses([draft]);
    expect(merged).toHaveLength(4);
    expect(merged.slice(0, 3)).toEqual(DEMO_PROCESSES);
    expect(merged[3]).toBe(draft);
  });

  it('validateProfileFile: pdf/docx/txt case-insensitive; png/exe/zip → type; vacío → empty; >10MB → size', () => {
    expect(validateProfileFile(fileWithSize('perfil.txt', 1000)))
      .toEqual({ ok: true, error: null, type: 'txt' });
    expect(validateProfileFile(fileWithSize('PERFIL.PDF', 1000)))
      .toEqual({ ok: true, error: null, type: 'pdf' });
    expect(validateProfileFile(fileWithSize('perfil.Docx', 1000)))
      .toEqual({ ok: true, error: null, type: 'docx' });
    expect(validateProfileFile(fileWithSize('foto.png', 1000)).error).toBe('type');
    expect(validateProfileFile(fileWithSize('app.exe', 1000)).error).toBe('type');
    expect(validateProfileFile(fileWithSize('archivo.zip', 1000)).error).toBe('type');
    expect(validateProfileFile(fileWithSize('vacio.txt', 0)).error).toBe('empty');
    expect(validateProfileFile(fileWithSize('grande.txt', 11 * 1024 * 1024)).error).toBe('size');
    expect(validateProfileFile(fileWithSize('limite.txt', 10 * 1024 * 1024)).ok).toBe(true);
  });

  it('validateProfileFile: resultado sin campos de contenido (privacy — solo name/size/type)', () => {
    const result = validateProfileFile(fileWithSize('perfil.txt', 1000));
    expect(Object.keys(result).sort()).toEqual(['error', 'ok', 'type']);
  });

  it('formatFileSize: B / KB / MB (1 decimal)', () => {
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(1048576)).toBe('1.0 MB');
  });
});

// ── B. companyProcessStore.js (solo en memoria) ─────────────────────────────

describe('B. store de borradores (solo en memoria)', () => {
  it('createDraftProcess: valida (throws si inválido) y agrega un solo snapshot', () => {
    expect(() => createDraftProcess({ role: '', department: '' }, { now: NOW })).toThrow();
    const process = createDraftProcess(VALID_INPUT, { now: NOW });
    const snapshot = getDraftProcesses();
    expect(snapshot).toHaveLength(1);
    expect(snapshot[0]).toEqual(process);
    expect(snapshot[0].openedAt).toBe('2026-09-08');
    // referencia estable entre lecturas sin cambios (useSyncExternalStore)
    expect(getDraftProcesses()).toBe(snapshot);
  });

  it('ids únicos entre drafts y los 3 procesos demo', () => {
    createDraftProcess({ ...VALID_INPUT, role: 'Supervisor de Planta' }, { now: NOW });
    createDraftProcess({ ...VALID_INPUT, role: 'Supervisor de Planta' }, { now: NOW });
    createDraftProcess({ ...VALID_INPUT, role: 'Supervisor' }, { now: NOW });
    const ids = getDraftProcesses().map((entry) => entry.id);
    expect(ids).toEqual(['supervisor-de-planta', 'supervisor-de-planta-2', 'supervisor-2']);
  });

  it('resetCompanyProcessStore: vacía el estado (tests/recarga de sesión)', () => {
    createDraftProcess(VALID_INPUT, { now: NOW });
    resetCompanyProcessStore();
    expect(getDraftProcesses()).toEqual([]);
  });

  it('useCompanyDraftProcesses: reactivo ante createDraftProcess', () => {
    const { result } = renderHook(() => useCompanyDraftProcesses());
    expect(result.current).toEqual([]);
    act(() => { createDraftProcess(VALID_INPUT, { now: NOW }); });
    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe('analista-de-control');
  });

  it('sobrevive a la "recarga" de la pestaña (sessionStorage: memoria de cliente, no backend)', async () => {
    createDraftProcess(VALID_INPUT, { now: NOW });
    expect(window.sessionStorage.getItem(COMPANY_DRAFTS_STORAGE_KEY)).toBeTruthy();
    // nueva "carga de página": módulo fresco lee el estado de sessionStorage
    vi.resetModules();
    const fresh = await import('./companyProcessStore.js');
    expect(fresh.getDraftProcesses()).toHaveLength(1);
    expect(fresh.getDraftProcesses()[0].id).toBe('analista-de-control');
    // schema ajeno o corrupto → no se adopta (lectura defensiva)
    window.sessionStorage.setItem(COMPANY_DRAFTS_STORAGE_KEY, '{"version":99,"processes":[]}');
    vi.resetModules();
    const fresh2 = await import('./companyProcessStore.js');
    expect(fresh2.getDraftProcesses()).toEqual([]);
    window.sessionStorage.setItem(COMPANY_DRAFTS_STORAGE_KEY, 'no-json{');
    vi.resetModules();
    const fresh3 = await import('./companyProcessStore.js');
    expect(fresh3.getDraftProcesses()).toEqual([]);
  });
});

// ── C. useCompanyData: merge demo / no-merge real ───────────────────────────

describe('C. useCompanyData (integración D2)', () => {
  it('demo: 3 procesos; al crear un draft → 4 (el draft al final, source design)', () => {
    const { result } = renderHook(() => useCompanyData({ apiBase: undefined }));
    expect(result.current.source).toBe('demo');
    expect(result.current.processes).toHaveLength(3);
    act(() => { createDraftProcess(VALID_INPUT, { now: NOW }); });
    expect(result.current.processes).toHaveLength(4);
    expect(result.current.processes[3]).toMatchObject({ id: 'analista-de-control', source: 'design' });
    expect(result.current.source).toBe('demo');
  });

  it('real (GET /sessions): los drafts NO se mergean (D2)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{
          id: 's1', alias: 'alias-1', role: 'Ops Lead', status: 'ready',
          completedAt: '2026-08-01T10:00:00.000Z',
          constructs: Array.from({ length: 8 }, () => ({ id: 'c', label: 'L', labelEn: 'L', score: 80, confidence: 0.5 })),
        }],
      }),
    });
    const { result } = renderHook(() => useCompanyData({ apiBase: 'http://api.test', fetchImpl }));
    await waitFor(() => expect(result.current.source).toBe('real'));
    const length = result.current.processes.length;
    expect(length).toBe(1);
    act(() => { createDraftProcess(VALID_INPUT, { now: NOW }); });
    expect(result.current.processes).toHaveLength(length);
    expect(result.current.processes.every((process) => process.source !== 'design')).toBe(true);
  });
});

// ── D. /empresa/nueva-solicitud (hub, ref new-request.html) ─────────────────

describe('D. hub /empresa/nueva-solicitud (2 cards, sin placeholder)', () => {
  it('ES: h1 + subtitle + card QUICK (upload) y card RECOMMENDED (design) con hrefs', () => {
    const { container } = renderV3Route('/empresa/nueva-solicitud');
    expect(container.querySelector('.v3-company')).not.toBeNull();
    expect(container.querySelector('.v3-placeholder')).toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: V3_COPY.es.pages.newRequest.title })).toBeInTheDocument();
    expect(screen.getByText(V3_COPY.es.request_subtitle)).toBeInTheDocument();
    const uploadCard = screen.getByRole('link', { name: new RegExp(V3_COPY.es.request_upload) });
    expect(uploadCard).toHaveAttribute('href', '/empresa/nueva-solicitud/subida');
    expect(within(uploadCard).getByText(V3_COPY.es.request_quick)).toBeInTheDocument();
    expect(within(uploadCard).getByText(V3_COPY.es.request_uploadAction)).toBeInTheDocument();
    const designCard = screen.getByRole('link', { name: new RegExp(V3_COPY.es.request_design) });
    expect(designCard).toHaveAttribute('href', '/empresa/nueva-solicitud/diseño');
    expect(within(designCard).getByText(V3_COPY.es.request_recommended)).toBeInTheDocument();
    expect(within(designCard).getByText(V3_COPY.es.request_designAction)).toBeInTheDocument();
  });

  it('EN: toggle → copias EN de la referencia (badge QUICK/RECOMMENDED)', () => {
    renderV3Route('/empresa/nueva-solicitud');
    fireEvent.click(screen.getByRole('button', { name: 'EN' }));
    expect(screen.getByRole('heading', { level: 1, name: V3_COPY.en.pages.newRequest.title })).toBeInTheDocument();
    expect(screen.getByText(V3_COPY.en.request_subtitle)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: new RegExp(V3_COPY.en.request_upload) }))
      .toHaveAttribute('href', '/empresa/nueva-solicitud/subida');
    expect(screen.getByRole('link', { name: new RegExp(V3_COPY.en.request_design) }))
      .toHaveAttribute('href', '/empresa/nueva-solicitud/diseño');
  });
});

// ── E. /empresa/nueva-solicitud/diseño (formulario guiado, sin LLM) ─────────

describe('E. diseño guiado (3 pasos → proceso en estado demo)', () => {
  it('paso 1 vacío: Siguiente muestra errores y no avanza', () => {
    const { container } = renderV3Route('/empresa/nueva-solicitud/diseño');
    expect(container.querySelector('.v3-placeholder')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: V3_COPY.es.rd_next }));
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(V3_COPY.es.rd_errorRole);
    expect(alert).toHaveTextContent(V3_COPY.es.rd_errorDepartment);
    // sigue en el paso 1 (el select de área sigue visible)
    expect(screen.getByLabelText(V3_COPY.es.rd_department)).toBeInTheDocument();
  });

  it('flujo completo: crea → confirmación → visible en /empresa/procesos y dashboard', () => {
    renderV3Route('/empresa/nueva-solicitud/diseño');
    fillStep1();
    fireEvent.click(screen.getByRole('button', { name: V3_COPY.es.rd_next }));
    // paso 2: modo default onsite + perfil
    expect(screen.getByLabelText(V3_COPY.es.rd_mode)).toHaveValue('onsite');
    fireEvent.change(screen.getByLabelText(V3_COPY.es.rd_profile), { target: { value: 'Perfil orientado a datos.' } });
    fireEvent.click(screen.getByRole('button', { name: V3_COPY.es.rd_next }));
    // paso 3: resumen
    expect(screen.getByTestId('v4-rd-review')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: V3_COPY.es.rd_create }));
    // confirmación
    expect(screen.getByTestId('v4-rd-done')).toHaveTextContent(V3_COPY.es.rd_doneTitle);
    expect(screen.getByTestId('v4-rd-view')).toHaveAttribute('href', '/empresa/procesos');
    // SPA: el store persiste entre "navegaciones" (memoria, D1)
    renderV3Route('/empresa/procesos');
    expect(screen.getByTestId('v2-card-analista-de-control')).toBeInTheDocument();
    expect(screen.getByTestId('v2-process-count')).toHaveTextContent('4');
    renderV3Route('/empresa');
    expect(within(screen.getByRole('region', { name: V3_COPY.es.company_overview })).getByText('4')).toBeInTheDocument();
  });

  it('detalle del proceso creado: coherente (0/0/0/—, config del form, sin avanzadas, nota sin candidatos)', () => {
    renderV3Route('/empresa/nueva-solicitud/diseño');
    fillStep1();
    fireEvent.click(screen.getByRole('button', { name: V3_COPY.es.rd_next }));
    fireEvent.change(screen.getByLabelText(V3_COPY.es.rd_profile), { target: { value: 'Perfil orientado a datos.' } });
    fireEvent.click(screen.getByRole('button', { name: V3_COPY.es.rd_next }));
    fireEvent.click(screen.getByRole('button', { name: V3_COPY.es.rd_create }));
    expect(screen.getByTestId('v4-rd-done')).toBeInTheDocument();

    const { container } = renderV3Route('/empresa/proceso/analista-de-control');
    expect(container.querySelector('.v3-placeholder')).toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: 'Analista de Control' })).toBeInTheDocument();
    const metrics = screen.getByRole('region', { name: V3_COPY.es.pd_metrics });
    expect(within(metrics).getAllByText('0')).toHaveLength(3); // días + postulantes + evaluados
    expect(within(metrics).getByText('—')).toBeInTheDocument(); // promedio (sin evidencia)
    expect(screen.getByText(V3_COPY.es.pd_operations)).toBeInTheDocument();
    expect(screen.getByText('Antofagasta, Chile')).toBeInTheDocument();
    expect(screen.getByText('Presencial')).toBeInTheDocument();
    expect(screen.getByText('Perfil orientado a datos.')).toBeInTheDocument();
    expect(screen.getByText(/8 de septiembre de 2026/)).toBeInTheDocument();
    expect(screen.queryByText(V3_COPY.es.pa_title)).toBeNull(); // sin estadísticas avanzadas
    expect(screen.getByRole('columnheader', { name: V3_COPY.es.company_candidate })).toBeInTheDocument();
    expect(screen.getByTestId('v4-pd-no-candidates')).toHaveTextContent(V3_COPY.es.pd_noCandidatesYet);
  });

  it('id ajeno no creado: notFound intacto (comportamiento V3)', () => {
    renderV3Route('/empresa/proceso/nope');
    expect(screen.getByText(V3_COPY.es.pd_notFound)).toBeInTheDocument();
  });

  it('EN: labels del formulario EN (paso 1)', () => {
    renderV3Route('/empresa/nueva-solicitud/diseño');
    fireEvent.click(screen.getByRole('button', { name: 'EN' }));
    expect(screen.getByRole('heading', { level: 1, name: V3_COPY.en.pages.requestDesign.title })).toBeInTheDocument();
    expect(screen.getByLabelText(V3_COPY.en.rd_role)).toBeInTheDocument();
    expect(screen.getByLabelText(V3_COPY.en.rd_department)).toBeInTheDocument();
  });
});

// ── F. /empresa/nueva-solicitud/subida (upload: validación + metadatos) ─────

describe('F. upload (validación de tipo/tamaño → metadatos + confirmación, sin NLP)', () => {
  function renderUpload() {
    return renderV3Route('/empresa/nueva-solicitud/subida');
  }

  it('txt válido: metadatos (nombre/formato/tamaño) + confirmación honesta; el contenido NUNCA aparece', () => {
    renderUpload();
    const input = document.querySelector('input[type="file"]');
    expect(input).toHaveAttribute('accept', '.pdf,.docx,.txt');
    fireEvent.change(input, { target: { files: [new File(['012345678'], 'perfil.txt', { type: 'text/plain' })] } });
    const done = screen.getByTestId('v4-ru-done');
    expect(done).toHaveTextContent('perfil.txt');
    expect(done).toHaveTextContent('TXT');
    expect(done).toHaveTextContent('9 B');
    expect(done).toHaveTextContent(V3_COPY.es.ru_doneTitle);
    expect(done).toHaveTextContent(V3_COPY.es.ru_doneText);
    expect(done.textContent).not.toContain('012345678');
  });

  it('pdf y docx válidos (case-insensitive)', () => {
    renderUpload();
    const input = document.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [fileWithSize('PERFIL.PDF', 2000)] } });
    expect(screen.getByTestId('v4-ru-done')).toHaveTextContent('PDF');
    cleanup();
    renderUpload();
    const input2 = document.querySelector('input[type="file"]');
    fireEvent.change(input2, { target: { files: [fileWithSize('perfil.docx', 2000)] } });
    expect(screen.getByTestId('v4-ru-done')).toHaveTextContent('DOCX');
  });

  it('png / exe / zip → error de tipo, sin confirmación', () => {
    for (const name of ['foto.png', 'app.exe', 'archivo.zip']) {
      cleanup();
      renderUpload();
      const input = document.querySelector('input[type="file"]');
      fireEvent.change(input, { target: { files: [fileWithSize(name, 1000)] } });
      expect(screen.getByRole('alert')).toHaveTextContent(V3_COPY.es.ru_errorType);
      expect(screen.queryByTestId('v4-ru-done')).toBeNull();
    }
  });

  it('vacío → error empty; >10MB → error size', () => {
    renderUpload();
    let input = document.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [new File([], 'vacio.txt')] } });
    expect(screen.getByRole('alert')).toHaveTextContent(V3_COPY.es.ru_errorEmpty);
    cleanup();
    renderUpload();
    input = document.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [fileWithSize('grande.txt', 11 * 1024 * 1024)] } });
    expect(screen.getByRole('alert')).toHaveTextContent(V3_COPY.es.ru_errorSize);
    expect(screen.queryByTestId('v4-ru-done')).toBeNull();
  });

  it('"Elegir otro documento" resetea a estado inicial', () => {
    renderUpload();
    const input = document.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [new File(['x'], 'perfil.txt')] } });
    expect(screen.getByTestId('v4-ru-done')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: V3_COPY.es.ru_chooseAnother }));
    expect(screen.queryByTestId('v4-ru-done')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByTestId('v4-ru-drop')).toBeInTheDocument();
  });

  it('EN: dropzone + confirmación EN', () => {
    renderUpload();
    fireEvent.click(screen.getByRole('button', { name: 'EN' }));
    expect(screen.getByTestId('v4-ru-drop')).toHaveTextContent(V3_COPY.en.ru_dropLabel);
    const input = document.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [new File(['x'], 'perfil.txt')] } });
    expect(screen.getByTestId('v4-ru-done')).toHaveTextContent(V3_COPY.en.ru_doneTitle);
  });
});

// ── G. regresión D7: company_candidate ──────────────────────────────────────

describe('G. copias (regresión D7)', () => {
  it('company_candidate existe en ambos idiomas (header tabla detalle V3)', () => {
    expect(V3_COPY.es.company_candidate).toBe('Candidato');
    expect(V3_COPY.en.company_candidate).toBe('Candidate');
  });

  it('claves V4 presentes y no vacías (request_*/rd_*/ru_*)', () => {
    const keys = [
      'request_subtitle', 'request_quick', 'request_upload', 'request_uploadDescription',
      'request_uploadAction', 'request_recommended', 'request_design',
      'request_designDescription', 'request_designAction', 'request_back',
      'rd_step', 'rd_stepRole', 'rd_stepProfile', 'rd_stepReview',
      'rd_role', 'rd_department', 'rd_location', 'rd_mode', 'rd_profile',
      'rd_next', 'rd_back', 'rd_create', 'rd_errorRole', 'rd_errorDepartment',
      'rd_errorRoleMax', 'rd_errorLocationMax', 'rd_errorProfileMax',
      'rd_reviewTitle', 'rd_reviewNote', 'rd_doneTitle', 'rd_doneText',
      'rd_viewProcesses', 'rd_createAnother',
      'rd_mockRole', 'rd_mockArea', 'rd_mockProfile',
      'ru_intro', 'ru_dropLabel', 'ru_dropHint', 'ru_privacyNote',
      'ru_errorType', 'ru_errorEmpty', 'ru_errorSize',
      'ru_doneTitle', 'ru_doneText', 'ru_name', 'ru_format', 'ru_size',
      'ru_received', 'ru_chooseAnother',
      'pd_noCandidatesYet', 'company_candidate',
    ];
    for (const lang of ['en', 'es']) {
      for (const key of keys) {
        expect(V3_COPY[lang][key], `${lang}.${key}`).toBeTruthy();
      }
    }
  });
});
