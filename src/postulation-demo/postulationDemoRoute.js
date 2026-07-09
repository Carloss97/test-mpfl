export const POSTULATION_DEMO_BASE_PATH = '/postulaciones-demo';

export function isPostulationDemoPath(pathname = '') {
  const value = String(pathname || '');
  return value === POSTULATION_DEMO_BASE_PATH
    || value.startsWith(`${POSTULATION_DEMO_BASE_PATH}/`)
    || value.startsWith(`${POSTULATION_DEMO_BASE_PATH}?`);
}
