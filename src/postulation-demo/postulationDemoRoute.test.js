import { describe, expect, it } from 'vitest';
import {
  POSTULATION_DEMO_BASE_PATH,
  POSTULATION_HR_DASHBOARD_PATH,
  candidateHomeRedirectUrl,
  isPostulationDemoPath,
  isPostulationHrDashboardPath,
  isLegacyPostulationPath,
  isLegacyPostulationHrPath,
  normalizeLegacyPostulationPath,
  resolveV5Cutover,
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

describe('V5 cutover (t_0184d2e6, fase v3 §2) — redirecciones de rutas viejas', () => {
  it('/reclutador* → /empresa (hr-dashboard v1 deprecado)', () => {
    expect(resolveV5Cutover('/reclutador', '')).toBe('/empresa');
    expect(resolveV5Cutover('/reclutador/', '')).toBe('/empresa');
    expect(resolveV5Cutover('/reclutador', '?lang=en')).toBe('/empresa');
    expect(resolveV5Cutover('/reclutador/procesos', '')).toBe('/empresa');
    expect(resolveV5Cutover('/reclutador-report', '')).toBeNull();
  });

  it('/postulaciones sin invite ni fixture → /candidato (landing interna deprecada)', () => {
    expect(resolveV5Cutover('/postulaciones', '')).toBe('/candidato');
    expect(resolveV5Cutover('/postulaciones/', '')).toBe('/candidato');
    expect(resolveV5Cutover('/postulaciones', '?lang=en')).toBe('/candidato');
    expect(resolveV5Cutover('/postulaciones/reporte', '')).toBe('/candidato');
  });

  it('/postulaciones con invite → null (se conserva el flujo de evaluación)', () => {
    expect(resolveV5Cutover('/postulaciones', '?invite=tok-live-abc123')).toBeNull();
    expect(resolveV5Cutover('/postulaciones', '?invite=tok-live-abc123&battery=original&lang=es')).toBeNull();
    expect(resolveV5Cutover('/postulaciones?invite=tok-live-abc123', '')).toBeNull();
  });

  it('/postulaciones con fixture → null (se conserva el reporte QA)', () => {
    expect(resolveV5Cutover('/postulaciones', '?fixture=1')).toBeNull();
    expect(resolveV5Cutover('/postulaciones', '?fixture=1&battery=original')).toBeNull();
  });

  it('rutas nuevas y ajenas → null', () => {
    expect(resolveV5Cutover('/empresa', '')).toBeNull();
    expect(resolveV5Cutover('/candidato', '')).toBeNull();
    expect(resolveV5Cutover('/portal', '')).toBeNull();
    expect(resolveV5Cutover('/', '')).toBeNull();
    expect(resolveV5Cutover('/tecnico', '')).toBeNull();
  });

  it('candidateHomeRedirectUrl: destino de salida del flujo (preserva lang, descarta parámetros de flujo)', () => {
    expect(candidateHomeRedirectUrl('')).toBe('/candidato');
    expect(candidateHomeRedirectUrl('?lang=en')).toBe('/candidato?lang=en');
    expect(candidateHomeRedirectUrl('?invite=tok-live-abc123&battery=original&lang=en')).toBe('/candidato?lang=en');
    expect(candidateHomeRedirectUrl('?fixture=1&lang=en')).toBe('/candidato?lang=en');
    expect(candidateHomeRedirectUrl('?invite=tok-live-abc123')).toBe('/candidato');
  });
});
