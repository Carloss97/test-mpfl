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
    };
  });
  // Orden base = más reciente primero (default sort 'recent').
  return processes.sort((a, b) => String(b.openedAt ?? '').localeCompare(String(a.openedAt ?? '')));
}

// ── Fetch real (mismo contract que hr-dashboard v1; D9: módulo propio) ─────

export async function fetchCompanySessions({ apiBase, fetchImpl = globalThis.fetch, limit = 50 } = {}) {
  if (!apiBase || typeof fetchImpl !== 'function') return null;
  try {
    const response = await fetchImpl(`${apiBase}/sessions?limit=${Number(limit) || 50}`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    const body = typeof response.json === 'function' ? await response.json() : null;
    const candidates = Array.isArray(body?.candidates) ? body.candidates : null;
    return candidates && candidates.length > 0 ? candidates : null;
  } catch {
    return null;
  }
}
