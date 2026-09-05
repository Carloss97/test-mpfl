import { describe, expect, it } from 'vitest';
import {
  POSTULATION_DEMO_BASE_PATH,
  POSTULATION_HR_DASHBOARD_PATH,
  isPostulationDemoPath,
  isPostulationHrDashboardPath,
  isLegacyPostulationPath,
  isLegacyPostulationHrPath,
  normalizeLegacyPostulationPath,
} from './postulationDemoRoute.js';

describe('postulation demo routes (producción)', () => {
  it('usa /postulaciones como base de producto y /reclutador para HR', () => {
    expect(POSTULATION_DEMO_BASE_PATH).toBe('/postulaciones');
    expect(POSTULATION_HR_DASHBOARD_PATH).toBe('/reclutador');
  });

  it('reconoce rutas HR actuales sin confundir hijos', () => {
    expect(isPostulationHrDashboardPath('/reclutador')).toBe(true);
    expect(isPostulationHrDashboardPath('/reclutador/')).toBe(true);
    expect(isPostulationHrDashboardPath('/reclutador-report')).toBe(false);
    expect(isPostulationHrDashboardPath('/postulaciones')).toBe(false);
  });

  it('reconoce la base candidata y sus hijos', () => {
    expect(isPostulationDemoPath('/postulaciones')).toBe(true);
    expect(isPostulationDemoPath('/postulaciones/')).toBe(true);
    expect(isPostulationDemoPath('/postulaciones/resultado')).toBe(true);
    expect(isPostulationDemoPath('/unrelated')).toBe(false);
  });

  it('detecta rutas legacy /postulaciones-demo sin colisionar', () => {
    expect(isLegacyPostulationPath('/postulaciones-demo')).toBe(true);
    expect(isLegacyPostulationPath('/postulaciones-demo/fixture')).toBe(true);
    expect(isLegacyPostulationPath('/postulaciones')).toBe(false);
    expect(isLegacyPostulationHrPath('/postulaciones-demo/hr')).toBe(true);
    expect(isLegacyPostulationHrPath('/postulaciones-demo')).toBe(false);
  });

  it('normaliza rutas legacy a producción en deep-redirect', () => {
    expect(normalizeLegacyPostulationPath('/postulaciones-demo')).toBe('/postulaciones');
    expect(normalizeLegacyPostulationPath('/postulaciones-demo/hr')).toBe('/reclutador');
    expect(normalizeLegacyPostulationPath('/postulaciones-demo/resultado')).toBe('/postulaciones/resultado');
    expect(normalizeLegacyPostulationPath('/otro')).toBe('/otro');
  });
});
