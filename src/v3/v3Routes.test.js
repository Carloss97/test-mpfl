// t_1c27edbf (V0 fase v3): registro de rutas de la fase (plan maestro §2).
// Helper puro (sin DOM): resolveV3Route(pathname) → { route, params } | null.
// V1–V4 reutilizan este registro: solo cambia el contenido de página, no las rutas.
import { describe, expect, it } from 'vitest';
import { resolveV3Route, V3_ROUTES, V3_SHELLS } from './v3Routes.js';

describe('v3Routes (fase v3 — registro de rutas)', () => {
  it('registra las 12 rutas del plan maestro §2', () => {
    expect(V3_ROUTES).toHaveLength(12);
    const paths = V3_ROUTES.map((route) => route.path).sort();
    expect(paths).toEqual([
      '/candidato',
      '/candidato/acceso',
      '/empleos',
      '/empresa',
      '/empresa/acceso',
      '/empresa/nueva-solicitud',
      '/empresa/nueva-solicitud/diseño',
      '/empresa/nueva-solicitud/subida',
      '/empresa/proceso/:id',
      '/empresa/proceso/:id/candidatos/:sessionId',
      '/empresa/procesos',
      '/portal',
    ]);
  });

  it('cada ruta tiene shell, page y una sección nav válida', () => {
    for (const route of V3_ROUTES) {
      expect(route.shell, route.path).toBeOneOf(Object.values(V3_SHELLS));
      expect(route.page, route.path).toBeTruthy();
      if (route.shell === V3_SHELLS.COMPANY) {
        // páginas empresa: nav activa para is-active de la sidebar
        expect(route.navActive, route.path).toBeOneOf(['dashboard', 'newRequest', 'processes', 'settings']);
        expect(route.sectionKey, route.path).toBeTruthy();
      }
      if (route.shell === V3_SHELLS.CANDIDATE) {
        expect(route.breadcrumbKey, route.path).toBeTruthy();
      }
    }
  });

  describe('resolveV3Route — rutas literales', () => {
    const cases = [
      ['/portal', 'portal', {}],
      ['/candidato', 'candidateHome', {}],
      ['/candidato/acceso', 'candidateAccess', {}],
      ['/empleos', 'jobs', {}],
      ['/empresa/acceso', 'companyAccess', {}],
      ['/empresa', 'dashboard', {}],
      ['/empresa/procesos', 'processes', {}],
      ['/empresa/nueva-solicitud', 'newRequest', {}],
      ['/empresa/nueva-solicitud/diseño', 'requestDesign', {}],
      ['/empresa/nueva-solicitud/subida', 'requestUpload', {}],
    ];
    for (const [path, page] of cases) {
      it(`resuelve ${path} → ${page}`, () => {
        const resolved = resolveV3Route(path);
        expect(resolved).toBeTruthy();
        expect(resolved.page).toBe(page);
      });
    }

    it('normaliza trailing slash', () => {
      expect(resolveV3Route('/empresa/').page).toBe('dashboard');
      expect(resolveV3Route('/candidato/').page).toBe('candidateHome');
      expect(resolveV3Route('/portal/').page).toBe('portal');
    });

    it('decodifica percent-encoding UTF-8 (location.pathname encodea ñ)', () => {
      // En navegadores reales y jsdom, pushState('/empresa/nueva-solicitud/diseño')
      // produce location.pathname = '/empresa/nueva-solicitud/dise%C3%B1o'.
      expect(resolveV3Route('/empresa/nueva-solicitud/dise%C3%B1o').page).toBe('requestDesign');
      expect(resolveV3Route('/empresa/nueva-solicitud/diseño').page).toBe('requestDesign');
    });

    it('no matcha rutas profundas no registradas', () => {
      expect(resolveV3Route('/empresa/otro')).toBeNull();
      expect(resolveV3Route('/candidato/otra')).toBeNull();
      expect(resolveV3Route('/portal/otra')).toBeNull();
    });
  });

  describe('resolveV3Route — rutas dinámicas', () => {
    it('captura :id en /empresa/proceso/:id', () => {
      const resolved = resolveV3Route('/empresa/proceso/supervisor');
      expect(resolved.page).toBe('processDetail');
      expect(resolved.params).toEqual({ id: 'supervisor' });
    });

    it('captura :id y :sessionId en el reporte de proceso', () => {
      const resolved = resolveV3Route('/empresa/proceso/operador/candidatos/ses-123');
      expect(resolved.page).toBe('processReport');
      expect(resolved.params).toEqual({ id: 'operador', sessionId: 'ses-123' });
    });

    it('el reporte gana sobre el detalle cuando hay más segmentos', () => {
      // /empresa/proceso/x/candidatos/y → processReport (no processDetail con id=x)
      expect(resolveV3Route('/empresa/proceso/x/candidatos/y').page).toBe('processReport');
      // un segmento extra distinto de "candidatos" → no match
      expect(resolveV3Route('/empresa/proceso/x/otra/y')).toBeNull();
    });

    it('el parámetro no contiene separadores (segmento simple)', () => {
      expect(resolveV3Route('/empresa/proceso/a/b')).toBeNull();
    });
  });

  it('NO pisa las rutas existentes del producto (main.jsx las resuelve antes)', () => {
    for (const path of [
      '/', '/postulaciones', '/postulaciones?invite=x', '/reclutador',
      '/tecnico', '/dev/camera', '/postulaciones-demo', '/algo-que-no-existe',
    ]) {
      expect(resolveV3Route(path.split('?')[0]), path).toBeNull();
    }
  });

  it('shell correcto por grupo de rutas', () => {
    expect(resolveV3Route('/candidato').shell).toBe(V3_SHELLS.CANDIDATE);
    expect(resolveV3Route('/empleos').shell).toBe(V3_SHELLS.CANDIDATE);
    expect(resolveV3Route('/empresa').shell).toBe(V3_SHELLS.COMPANY);
    expect(resolveV3Route('/empresa/proceso/x').shell).toBe(V3_SHELLS.COMPANY);
    expect(resolveV3Route('/portal').shell).toBe(V3_SHELLS.PORTAL);
    expect(resolveV3Route('/empresa/acceso').shell).toBe(V3_SHELLS.COMPANY_LOGIN);
  });
});
