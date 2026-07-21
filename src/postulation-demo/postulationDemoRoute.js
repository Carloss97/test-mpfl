export const POSTULATION_DEMO_BASE_PATH = '/postulaciones-demo';
export const POSTULATION_HR_DASHBOARD_PATH = `${POSTULATION_DEMO_BASE_PATH}/hr`;

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
