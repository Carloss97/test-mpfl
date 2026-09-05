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
