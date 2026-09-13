// t_90a5157c (V2 fase v3): datos demo + lógica pura del lado empresa.
// Fuente demo: referencia krumm_frontend.zip v2 (company.html + processes.html)
// — 3 procesos Andes Industries idénticos a la referencia (cargos, áreas,
// ubicaciones, fechas, candidatos, evaluados, score). Los KPIs del dashboard
// se DERIVAN de esta misma lista (plan V2 D1: "KPIs coherentes con la lista";
// la ref mostraba 12/184/78/24 workspace-wide con solo 3 filas — incoherente).
//
// Modo real (VITE_KRUMM_API_BASE, plan maestro §2 + pitfall B1.6):
// GET {apiBase}/sessions?limit=50 -> { candidates, total, hasMore } (mismo
// contract que hr-dashboard v1; el backend mapea payload->fila).
// buildCompanyDataFromSessions agrupa por role (D3): cada rol = una búsqueda
// activa; sesiones sin rol -> grupo "unspecified". Sin department/location en
// /sessions -> esos filtros solo existen en modo demo (ocultos en real).
//
// Privacidad: solo agregados (counts + medias de constructos); los alias del
// backend ya son pseudónimos (aliasHash / session-xxxx); humanReviewOnly.

// ── Datos demo (referencia company.html / processes.html) ────────────────────

// ids de área demo (los labels localizados viven en v3Copy.js: pd_operations /
// pd_maintenance — la página arma el mapa id→label y lo pasa a filterProcesses).
export const DEMO_DEPARTMENT_IDS = Object.freeze(['operations', 'maintenance']);

export const DEMO_PROCESSES = Object.freeze([
  Object.freeze({
    id: 'supervisor',
    role: 'Supervisor de Planta',
    roleEn: 'Plant Supervisor',
    department: 'operations',
    location: 'Antofagasta, Chile',
    openedAt: '2026-08-20',
    candidates: 23,
    evaluated: 19,
    recommended: 5,
    averageScore: 78,
    status: 'active',
  }),
  Object.freeze({
    id: 'operator',
    role: 'Operador de Planta',
    roleEn: 'Plant Operator',
    department: 'operations',
    location: 'Calama, Chile',
    openedAt: '2026-08-25',
    candidates: 47,
    evaluated: 40,
    recommended: 12,
    averageScore: 81,
    status: 'active',
  }),
  Object.freeze({
    id: 'technician',
    role: 'Técnico de Mantención',
    roleEn: 'Maintenance Technician',
    department: 'maintenance',
    location: 'Antofagasta, Chile',
    openedAt: '2026-08-29',
    candidates: 31,
    evaluated: 26,
    recommended: 7,
    averageScore: 84,
    status: 'active',
  }),
]);

// ── Texto / búsqueda (patrón processes.js de la referencia) ─────────────────

// NFD + strip de diacríticos + minúsculas + trim (idéntico a la ref).
export function normalizeProcessText(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function localizeProcessRole(process, language) {
  if (!process) return '';
  if (language === 'en') return process.roleEn ?? process.role ?? '';
  return process.role ?? '';
}

// Texto buscable = lo que se muestra en la card (D6): cargo + área + ubicación.
export function processSearchText(process, language, departmentLabels = {}) {
  const parts = [localizeProcessRole(process, language)];
  if (process?.department) {
    parts.push(departmentLabels[process.department] ?? process.department);
  }
  if (process?.location) parts.push(process.location);
  return parts.filter(Boolean).join(' ');
}

export function filterProcesses(processes = [], filters = {}, options = {}) {
  const { language = 'es', departmentLabels = {} } = options;
  const query = normalizeProcessText(filters.query);
  const department = filters.department ?? '';
  const location = filters.location ?? '';
  return processes.filter((process) => {
    if (department && process.department !== department) return false;
    if (location && process.location !== location) return false;
    if (!query) return true;
    return normalizeProcessText(processSearchText(process, language, departmentLabels)).includes(query);
  });
}

// ── Sort (patrón processes.js + tiebreak determinista, plan V2 D5) ──────────

export const PROCESS_SORTS = Object.freeze(['recent', 'oldest', 'candidates', 'score', 'name']);

export function sortProcesses(processes = [], sort = 'recent', language = 'es') {
  const byName = (a, b) =>
    localizeProcessRole(a, language).localeCompare(localizeProcessRole(b, language), language);
  const byDateDesc = (a, b) =>
    String(b.openedAt ?? '').localeCompare(String(a.openedAt ?? '')) || byName(a, b);
  const ordered = [...processes];
  switch (sort) {
    case 'oldest':
      ordered.sort((a, b) => String(a.openedAt ?? '').localeCompare(String(b.openedAt ?? '')) || byName(a, b));
      break;
    case 'candidates':
      ordered.sort((a, b) => (b.candidates ?? 0) - (a.candidates ?? 0) || byName(a, b));
      break;
    case 'score':
      // null al final (no hay evidencia de score aún)
      ordered.sort((a, b) => (b.averageScore ?? -1) - (a.averageScore ?? -1) || byName(a, b));
      break;
    case 'name':
      ordered.sort(byName);
      break;
    case 'recent':
    default:
      ordered.sort(byDateDesc);
      break;
  }
  return ordered;
}

// ── KPIs (una sola fuente para dashboard Y lista → coherencia, plan V2 D1) ──

export function buildCompanyKpis(processes = []) {
  const active = processes.filter((process) => process.status === 'active');
  const evaluatedTotal = active.reduce((sum, process) => sum + (process.evaluated ?? 0), 0);
  const weightedScore = active.reduce(
    (sum, process) => sum + (process.evaluated ?? 0) * (process.averageScore ?? 0),
    0,
  );
  return {
    activeProcesses: active.length,
    evaluated: evaluatedTotal,
    averageScore: evaluatedTotal > 0 ? Math.round(weightedScore / evaluatedTotal) : null,
    recommended: active.reduce((sum, process) => sum + (process.recommended ?? 0), 0),
  };
}

// ── Modo real: sesiones (/sessions) → procesos (agrupación por rol, D3) ────

// Score global de un candidato real = media de los constructos no-nulos
// (feature vector v2, 8 constructos; score null = sin evidencia — NO 0:
// Number(null)===0 contamina la media; la señal ausente sigue ausente).
export function candidateOverallScore(candidate) {
  const constructs = Array.isArray(candidate?.constructs) ? candidate.constructs : [];
  const scores = constructs
    .map((construct) => {
      if (construct?.score == null) return null;
      const value = Number(construct.score);
      return Number.isFinite(value) ? value : null;
    })
    .filter((value) => value != null);
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length);
}

export function slugifyProcessId(role) {
  return normalizeProcessText(role).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export const UNSPECIFIED_PROCESS_ID = 'unspecified';

export function buildCompanyDataFromSessions(sessions = []) {
  const groups = new Map();
  for (const session of sessions) {
    if (!session || typeof session !== 'object') continue;
    const role = typeof session.role === 'string' && session.role.trim() ? session.role.trim() : null;
    const key = role ?? UNSPECIFIED_PROCESS_ID;
    if (!groups.has(key)) groups.set(key, { role, sessions: [] });
    groups.get(key).sessions.push(session);
  }
  const processes = [...groups.values()].map((group) => {
    const evaluated = group.sessions.filter((session) => session.status !== 'in_progress');
    const scores = evaluated
      .map((session) => candidateOverallScore(session))
      .filter((value) => value != null);
    const dates = group.sessions
      .map((session) => String(session.completedAt ?? '').slice(0, 10))
      .filter(Boolean);
    return {
      id: group.role ? slugifyProcessId(group.role) : UNSPECIFIED_PROCESS_ID,
      role: group.role,
      roleEn: group.role, // real: no existe variante EN en /sessions
      department: null,
      location: null,
      openedAt: dates.length > 0 ? [...dates].sort().at(-1) : null,
      candidates: group.sessions.length,
      evaluated: evaluated.length,
      recommended: group.sessions.filter((session) => session.status === 'ready').length,
      averageScore: scores.length > 0 ? Math.round(scores.reduce((sum, v) => sum + v, 0) / scores.length) : null,
      status: 'active',
      // B3 (KRU-50): estado VIVO derivado de las sesiones (in_progress >
      // completed > open). `status` sigue 'active' por semántica de KPIs (D1).
      realStatus: deriveProcessStatus(group.sessions),
    };
  });
  // Orden base = más reciente primero (default sort 'recent').
  return processes.sort((a, b) => String(b.openedAt ?? '').localeCompare(String(a.openedAt ?? '')));
}

// ── B3 (KRU-50): estado vivo derivado + filtros de modo real ───────────────
// Los procesos reales son agrupaciones por rol de /sessions; no tienen
// ciclo abierto/cerrado propio. `realStatus` deriva el estado VIVO del grupo
// (prioridad: in_progress > completed > open):
//   - in_progress: alguna sesión sigue en curso
//   - completed: al menos una sesión evaluada (ready/needs_review) y ninguna
//     en curso
//   - open: sin sesiones evaluadas (o sin sesiones)
export const REAL_PROCESS_STATUS = Object.freeze({
  in_progress: 'in_progress',
  completed: 'completed',
  open: 'open',
});

export function deriveProcessStatus(sessions = []) {
  const list = (Array.isArray(sessions) ? sessions : []).filter(Boolean);
  if (list.length === 0) return REAL_PROCESS_STATUS.open;
  if (list.some((session) => session?.status === 'in_progress')) return REAL_PROCESS_STATUS.in_progress;
  if (list.some((session) => session?.status === 'ready' || session?.status === 'needs_review')) return REAL_PROCESS_STATUS.completed;
  return REAL_PROCESS_STATUS.open;
}

export const REAL_DATE_RANGES = Object.freeze(['all', '7d', '30d']);

// Filtros modo real (B3): rango de fecha sobre openedAt (ISO 'YYYY-MM-DD' —
// comparación lexicográfica determinista, sin zonas horarias) + estado vivo.
// `now` inyectable para tests (determinismo CI/Pi).
export function filterRealProcesses(processes, { dateRange = 'all', status = '' } = {}, { now = new Date() } = {}) {
  let list = Array.isArray(processes) ? [...processes] : [];
  if (dateRange && dateRange !== 'all') {
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : null;
    if (days != null) {
      const cutoff = new Date(now);
      cutoff.setUTCDate(cutoff.getUTCDate() - (days - 1));
      const cutoffDay = [
        cutoff.getUTCFullYear(),
        String(cutoff.getUTCMonth() + 1).padStart(2, '0'),
        String(cutoff.getUTCDate()).padStart(2, '0'),
      ].join('-');
      list = list.filter((process) => String(process?.openedAt ?? '') >= cutoffDay);
    }
  }
  if (status) list = list.filter((process) => process?.realStatus === status);
  return list;
}

// ── Fetch real (mismo contract que hr-dashboard v1; D9: módulo propio) ─────

export async function fetchCompanySessions({
  apiBase,
  fetchImpl = globalThis.fetch,
  limit = 50,
  headers = {},
  onResponse,
} = {}) {
  if (!apiBase || typeof fetchImpl !== 'function') return null;
  try {
    const response = await fetchImpl(`${apiBase}/sessions?limit=${Number(limit) || 50}`, {
      headers: { Accept: 'application/json', ...headers },
    });
    if (onResponse) onResponse(response);
    if (!response.ok) return null;
    const body = typeof response.json === 'function' ? await response.json() : null;
    const candidates = Array.isArray(body?.candidates) ? body.candidates : null;
    return candidates && candidates.length > 0 ? candidates : null;
  } catch {
    return null;
  }
}

// ── V4 (t_9319e84d): borradores de proceso (flujo de diseño) + upload ───────
// Plan: docs/plans/2026-09-08-plan-t9319e84d-v4-company-request.md (D1/D3/D5).
// Las funciones del flujo de diseño son puras (testables sin store); el state
// vive en companyProcessStore.js (solo en memoria — sin backend de procesos).

export const DESIGN_MODE_IDS = Object.freeze(['onsite', 'hybrid', 'remote']);

export const DESIGN_FIELD_LIMITS = Object.freeze({ role: 80, location: 80, profile: 300 });

// Validación del formulario guiado: role + department requeridos, mode dentro
// de DESIGN_MODE_IDS (si se pasa), longitudes máximas. Devuelve un mapa
// campo→true (la UI traduce a mensajes; sin texto en la lógica pura).
export function validateDesignInput(input = {}) {
  const errors = {};
  const role = String(input.role ?? '').trim();
  if (!role || role.length > DESIGN_FIELD_LIMITS.role) errors.role = true;
  if (!DEMO_DEPARTMENT_IDS.includes(String(input.department ?? ''))) errors.department = true;
  const mode = String(input.mode ?? '');
  if (mode && !DESIGN_MODE_IDS.includes(mode)) errors.mode = true;
  if (String(input.location ?? '').trim().length > DESIGN_FIELD_LIMITS.location) errors.location = true;
  if (String(input.profile ?? '').trim().length > DESIGN_FIELD_LIMITS.profile) errors.profile = true;
  return errors;
}

// id único: base (slug del cargo) o "proceso" si el slug queda vacío; sufijo
// -2, -3… ante colisión con los procesos demo u otros drafts (D1).
export function uniqueProcessId(base, existingIds = []) {
  const clean = String(base || '').trim() || 'proceso';
  const existing = new Set(existingIds);
  if (!existing.has(clean)) return clean;
  let n = 2;
  while (existing.has(`${clean}-${n}`)) n += 1;
  return `${clean}-${n}`;
}

// Proceso borrador en el shape de la lista (V2) + campos del diseño
// (source/mode/profile). roleEn = role: entrada del usuario, sin traducción
// inventada (D3). Ceros + averageScore null (señal ausente ≠ 0).
export function buildDraftProcess(input, openedAt, existingIds = []) {
  const role = String(input.role ?? '').trim();
  const location = String(input.location ?? '').trim();
  const profile = String(input.profile ?? '').trim();
  return Object.freeze({
    id: uniqueProcessId(slugifyProcessId(role), existingIds),
    role,
    roleEn: role,
    department: String(input.department ?? ''),
    location: location || null,
    openedAt: String(openedAt ?? ''),
    candidates: 0,
    evaluated: 0,
    recommended: 0,
    averageScore: null,
    status: 'active',
    source: 'design',
    mode: DESIGN_MODE_IDS.includes(String(input.mode ?? '')) ? String(input.mode) : 'onsite',
    profile: profile || null,
  });
}

// Lista demo = 3 procesos de la referencia + drafts al final (D2: una sola
// fuente para dashboard KPIs y /empresa/procesos — coherencia V2 D1).
export function mergeDemoProcesses(drafts = []) {
  return [...DEMO_PROCESSES, ...(Array.isArray(drafts) ? drafts : [])];
}

// ── V4: upload de perfil (pdf/docx/txt; SOLO metadatos, nunca contenido) ────

export const PROFILE_FILE_TYPES = Object.freeze(['pdf', 'docx', 'txt']);
export const PROFILE_FILE_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

// Validación de tipo/tamaño de un File (D5). El resultado solo expone
// ok/error/type: la función no lee el contenido del archivo (privacidad por
// construcción; la UI registra únicamente name/size/type/fecha).
export function validateProfileFile(file) {
  const name = String(file?.name ?? '').toLowerCase();
  const extension = name.includes('.') ? name.split('.').pop() : '';
  const size = Number(file?.size ?? 0);
  if (!PROFILE_FILE_TYPES.includes(extension)) return { ok: false, error: 'type', type: null };
  if (!Number.isFinite(size) || size <= 0) return { ok: false, error: 'empty', type: extension };
  if (size > PROFILE_FILE_MAX_BYTES) return { ok: false, error: 'size', type: extension };
  return { ok: true, error: null, type: extension };
}

export function formatFileSize(bytes) {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size < 0) return '0 B';
  if (size < 1024) return `${Math.round(size)} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
