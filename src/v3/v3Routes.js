// t_1c27edbf (V0 fase v3): registro de rutas de la fase (plan maestro §2).
// SPA actual sin react-router: main.jsx selecciona el RootApp por pathname
// (mismo patrón que postulationDemoRoute.js). resolveV3Route es puro y testable.
//
// Las 12 rutas de la fase:
//   /portal, /candidato, /candidato/acceso, /empleos,
//   /empresa/acceso, /empresa, /empresa/procesos, /empresa/proceso/:id,
//   /empresa/proceso/:id/candidatos/:sessionId, /empresa/nueva-solicitud,
//   /empresa/nueva-solicitud/diseño, /empresa/nueva-solicitud/subida.
//
// V1–V4 reutilizan este registro: cambian el contenido de página, no las rutas.
// Los campos `page`, `sectionKey`, `breadcrumbKey` y `navActive` son claves de
// V3_COPY (src/v3/v3Copy.js) o identificadores de sección de la sidebar.

export const V3_SHELLS = Object.freeze({
  CANDIDATE: 'candidate',   // topbar logo+breadcrumb+EN|ES+Help+footer (ref candidate.html)
  COMPANY: 'company',       // sidebar+user chip+breadcrumb+banner demo (ref company.html)
  PORTAL: 'portal',         // bare: brand+toggle (ref portal.html)
  COMPANY_LOGIN: 'companyLogin', // bare: brand+toggle (ref login-company.html)
});

export const V3_ROUTES = Object.freeze([
  Object.freeze({ path: '/portal', shell: V3_SHELLS.PORTAL, page: 'portal' }),
  Object.freeze({ path: '/candidato', shell: V3_SHELLS.CANDIDATE, page: 'candidateHome', breadcrumbKey: 'cp_candidatePortal' }),
  Object.freeze({ path: '/candidato/acceso', shell: V3_SHELLS.CANDIDATE, page: 'candidateAccess', breadcrumbKey: 'cp_access' }),
  Object.freeze({ path: '/empleos', shell: V3_SHELLS.CANDIDATE, page: 'jobs', breadcrumbKey: 'cp_jobs' }),
  Object.freeze({ path: '/empresa/acceso', shell: V3_SHELLS.COMPANY_LOGIN, page: 'companyAccess' }),
  Object.freeze({ path: '/empresa', shell: V3_SHELLS.COMPANY, page: 'dashboard', sectionKey: 'company_dashboard', navActive: 'dashboard' }),
  Object.freeze({ path: '/empresa/procesos', shell: V3_SHELLS.COMPANY, page: 'processes', sectionKey: 'company_processesTitle', navActive: 'processes' }),
  Object.freeze({ path: '/empresa/proceso/:id', shell: V3_SHELLS.COMPANY, page: 'processDetail', sectionKey: 'company_processDetail', navActive: 'processes' }),
  Object.freeze({ path: '/empresa/proceso/:id/candidatos/:sessionId', shell: V3_SHELLS.COMPANY, page: 'processReport', sectionKey: 'company_processReport', navActive: 'processes' }),
  Object.freeze({ path: '/empresa/nueva-solicitud', shell: V3_SHELLS.COMPANY, page: 'newRequest', sectionKey: 'company_newRequest', navActive: 'newRequest' }),
  Object.freeze({ path: '/empresa/nueva-solicitud/diseño', shell: V3_SHELLS.COMPANY, page: 'requestDesign', sectionKey: 'company_requestDesign', navActive: 'newRequest' }),
  Object.freeze({ path: '/empresa/nueva-solicitud/subida', shell: V3_SHELLS.COMPANY, page: 'requestUpload', sectionKey: 'company_requestUpload', navActive: 'newRequest' }),
]);

// Divide un pathname en segmentos, normalizando el trailing slash
// ('/empresa/' → ['empresa']) y decodificando percent-encoding UTF-8:
// location.pathname serializa caracteres no ASCII (la ruta 'diseño' llega
// como 'dise%C3%B1o' tanto en jsdom como en navegadores reales).
// El raíz '/' → []. Pathnames sin '/' inicial → null (no relativo).
function decodeSegment(segment) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function toSegments(pathname) {
  let value = String(pathname || '').split('?')[0].split('#')[0];
  if (value.length > 1 && value.endsWith('/')) value = value.slice(0, -1);
  if (value === '/' || value === '') return [];
  if (!value.startsWith('/')) return null;
  return value.slice(1).split('/').filter((segment) => segment.length > 0).map(decodeSegment);
}

// Compone un patrón ('/empresa/proceso/:id') en segmentos; ':param' captura 1 segmento.
const PATTERN_SEGMENTS = new Map();
for (const route of V3_ROUTES) {
  PATTERN_SEGMENTS.set(route.path, toSegments(route.path));
}

/**
 * Resuelve el pathname actual contra el registro de la fase.
 * @returns {{ route: object, params: Object<string,string>, page: string, shell: string } | null}
 */
export function resolveV3Route(pathname = '') {
  const segments = toSegments(pathname);
  if (segments === null) return null;
  for (const route of V3_ROUTES) {
    const pattern = PATTERN_SEGMENTS.get(route.path);
    if (pattern.length !== segments.length) continue;
    const params = {};
    let matches = true;
    for (let i = 0; i < pattern.length; i += 1) {
      if (pattern[i].startsWith(':')) {
        params[pattern[i].slice(1)] = segments[i];
      } else if (pattern[i] !== segments[i]) {
        matches = false;
        break;
      }
    }
    if (matches) {
      return { route, params, page: route.page, shell: route.shell };
    }
  }
  return null;
}
