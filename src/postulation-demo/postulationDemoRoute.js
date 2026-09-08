// Rutas de producto (producción). Las rutas legacy /postulaciones-demo* se conservan
// como alias de redirección: antes no había red de usuarios masiva y estos links ya tienen
// fixtures guardados, pruebas, etc. Mantenerlos evita enlaces rotos.
export const POSTULATION_DEMO_BASE_PATH = '/postulaciones';
export const POSTULATION_HR_DASHBOARD_PATH = '/reclutador';

const LEGACY_POSTULATION_BASE = '/postulaciones-demo';
const LEGACY_HR_BASE = `${LEGACY_POSTULATION_BASE}/hr`;

// Devuelve true solo para rutas HR actuales (no legacy aislado: el manejo se hace en redirect
// profundo para caer en la ruta nueva)
export function isPostulationHrDashboardPath(pathname = '') {
  const value = String(pathname || '');
  return value === POSTULATION_HR_DASHBOARD_PATH
    || value === `${POSTULATION_HR_DASHBOARD_PATH}/`
    || value.startsWith(`${POSTULATION_HR_DASHBOARD_PATH}?`);
}

export function isPostulationDemoPath(pathname = '') {
  const value = String(pathname || '');
  return value === POSTULATION_DEMO_BASE_PATH
    || value.startsWith(`${POSTULATION_DEMO_BASE_PATH}/`)
    || value.startsWith(`${POSTULATION_DEMO_BASE_PATH}?`);
}

// Aliases legacy (compatibilidad con fixtures/links guardados).
// El SPA los acepta y main.jsx normalizará (deep redirect) a la ruta nueva.
export function isLegacyPostulationPath(pathname = '') {
  const value = String(pathname || '');
  return value === LEGACY_POSTULATION_BASE
    || value.startsWith(`${LEGACY_POSTULATION_BASE}/`)
    || value.startsWith(`${LEGACY_POSTULATION_BASE}?`);
}
export function isLegacyPostulationHrPath(pathname = '') {
  const value = String(pathname || '');
  return value === LEGACY_HR_BASE
    || value === `${LEGACY_HR_BASE}/`
    || value.startsWith(`${LEGACY_HR_BASE}?`);
}

// Convierte una ruta legacy a su equivalente producción. Si no es legacy, devuelve la ruta original.
export function normalizeLegacyPostulationPath(pathname = '') {
  const value = String(pathname || '');
  if (isLegacyPostulationHrPath(value)) {
    return value.replace(LEGACY_HR_BASE, POSTULATION_HR_DASHBOARD_PATH) || POSTULATION_HR_DASHBOARD_PATH;
  }
  if (isLegacyPostulationPath(value)) {
    return value.replace(LEGACY_POSTULATION_BASE, POSTULATION_DEMO_BASE_PATH) || POSTULATION_DEMO_BASE_PATH;
  }
  return value;
}

// ── V5 cutover (t_0184d2e6, fase v3 §2) ─────────────────────────────────────
// Las rutas viejas reemplazadas por la fase v3 redirigen a las nuevas:
//   /reclutador*      → /empresa    (hr-dashboard v1 deprecado)
//   /postulaciones*   → /candidato  (landing interna deprecada), SOLO cuando
//                       no hay invite (?invite=… entra al flujo de evaluación)
//                       ni fixture (?fixture=1 entra al reporte QA).
// Devuelve el path base de destino SIN query (main.jsx conserva el search y
// hash originales) o null si no aplica el cutover.
export function resolveV5Cutover(pathname = '', search = '') {
  const raw = String(pathname || '');
  const qIndex = raw.indexOf('?');
  const value = qIndex === -1 ? raw : raw.slice(0, qIndex);
  // La query puede llegar en `search` (window.location.search) o embebida en
  // el pathname (full URL): se combinan ambas para la decisión invite/fixture.
  const params = new URLSearchParams(
    (qIndex === -1 ? '' : raw.slice(qIndex + 1)) + '&' + String(search || '').replace(/^\?/, ''),
  );
  if (value === '/reclutador' || value.startsWith('/reclutador/')) {
    return '/empresa';
  }
  const stripped = value.length > 1 && value.endsWith('/') ? value.slice(0, -1) : value;
  if (stripped === POSTULATION_DEMO_BASE_PATH || stripped.startsWith(`${POSTULATION_DEMO_BASE_PATH}/`)) {
    if (!params.get('invite') && !params.get('fixture')) return '/candidato';
  }
  return null;
}

// Destino de salida del flujo de evaluación (las acciones "volver/salir/reiniciar"
// ya no llevan a la landing interna, deprecada en V5): home de candidato
// /candidato, conservando el idioma y descartando parámetros del flujo.
export function candidateHomeRedirectUrl(search = '') {
  const params = new URLSearchParams(String(search || ''));
  params.delete('invite');
  params.delete('battery');
  params.delete('fixture');
  const qs = params.toString();
  return '/candidato' + (qs ? `?${qs}` : '');
}
