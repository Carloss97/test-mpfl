// t_1c27edbf (V0 fase v3): diccionario i18n base del chrome + placeholders.
// Fuente EN: referencia krumm_frontend.zip v2 (docs/spec/frontend-ref-v2/script.js,
// bloque "en"); ES: mismo bloque "es" de la referencia (reutilizado textualmente)
// + las páginas nuevas de la fase. Regla del plan maestro §3-V0: "Copys EN de la
// referencia + diccionario ES (t(es,en))".
//
// Convenciones (plan V0, decisión 2):
// - Claves planas espejo de la referencia (cp_*, company_*, portal_*) + `pages`
//   anidado para los placeholders (title/note/backLabel por ruta).
// - Los componentes V0/V1..V4 consumen el diccionario vía useV3Copy() (hook sobre
//   useLanguage); las cadenas one-shot fuera del diccionario usan t(es, en).
// - V1–V4 amplían este módulo con sus claves de contenido (pl_*, pd_*, request_*).
import { useLanguage } from '../i18n/LanguageContext.jsx';

const EN = Object.freeze({
  // ── común ────────────────────────────────────────────────────────────────
  common_skipContent: 'Skip to content',
  common_logoAlt: 'KRUMM — Tech for talent assessment',
  common_language: 'Language',
  common_close: 'Close',
  common_krumm: 'KRUMM',
  common_footerYear: '© 2026 KRUMM',
  common_nextIteration: 'This experience will be developed in the next iteration.',
  common_backHome: '← Back to KRUMM',
  common_backPortals: '← Choose another portal',
  // ── chrome candidato (ref: candidate.html + candidate.js) ────────────────
  cp_breadcrumb: 'Breadcrumb',
  cp_help: 'Help',
  cp_helpText: 'Choose “View opportunities” to explore available roles, or “Sign in” if you already have an invitation.',
  cp_privacy: 'Privacy notice',
  cp_terms: 'Terms',
  cp_candidatePortal: 'Candidate portal',
  cp_access: 'Candidate access',
  cp_jobs: 'Job board',
  cp_back: 'Back to candidate portal',
  cp_eyebrow: 'KRUMM · TALENT ASSESSMENT',
  // ── chrome empresa (ref: company.html + company.js) ──────────────────────
  company_workspace: 'Company workspace',
  company_dashboard: 'Dashboard',
  company_newRequest: 'New request',
  company_processes: 'Processes',
  company_settings: 'Settings',
  company_help: 'Help',
  company_account: 'Account',
  company_notifications: 'Notifications',
  company_signOut: 'Sign out',
  company_openNavigation: 'Toggle navigation',
  company_portalNavigation: 'Company navigation',
  company_breadcrumb: 'Breadcrumb',
  company_demoBadge: 'Demo workspace',
  company_demoNotice: 'All names, processes and results shown here are fictional.',
  company_previewTitle: 'Next in the preview',
  company_previewText: 'This screen will be designed in the next stage. For now, you can explore the dashboard.',
  company_notificationsText: 'You’re all caught up. This is a visual preview of your notification center.',
  company_accountText: 'Demo account · People & Culture · Andes Industries',
  company_userName: 'Alex Morgan',
  company_userOrg: 'Andes Industries',
  company_userInitials: 'AM',
  company_eyebrow: 'ANDES INDUSTRIES',
  company_enterDemo: 'Explore company demo →',
  company_comingSoon: 'Coming soon',
  company_loginPreview: 'This portal is being prepared. Sign-in will be available here soon.',
  company_processesTitle: 'Active processes',
  company_processDetail: 'Process detail',
  company_processReport: 'Candidate report',
  company_requestDesign: 'New request · Design with KRUMM',
  company_requestUpload: 'New request · Upload profile',
  company_backDashboard: 'Back to dashboard',
  // ── portal bare (ref: portal.html + login-company.html) ──────────────────
  portal_title: 'Choose your portal',
  portal_subtitle: 'Access your KRUMM workspace.',
  portal_companies: 'Companies',
  portal_company: 'Company Portal',
  portal_companyDescription: 'Manage assessments, candidates, results and teams.',
  portal_companyCta: 'Sign in as a company →',
  portal_candidates: 'Candidates',
  portal_candidate: 'Candidate Portal',
  portal_candidateDescription: 'Access your assessments and KRUMM experiences.',
  portal_candidateCta: 'Explore candidate portal →',
  // ── placeholders por ruta (plan maestro §2: contenido real en V1–V4) ─────
  pages: Object.freeze({
    candidateHome: Object.freeze({
      title: 'Candidate portal',
      note: 'This experience will be developed in the next iteration.',
      backLabel: 'Back to candidate portal',
    }),
    candidateAccess: Object.freeze({
      title: 'Candidate access',
      note: 'This experience will be developed in the next iteration.',
      backLabel: 'Back to candidate portal',
    }),
    jobs: Object.freeze({
      title: 'Job board',
      note: 'This experience will be developed in the next iteration.',
      backLabel: 'Back to candidate portal',
    }),
    dashboard: Object.freeze({
      title: 'Dashboard',
    }),
    processes: Object.freeze({
      title: 'Active processes',
      note: 'This screen will be designed in the next stage.',
      backLabel: 'Back to dashboard',
    }),
    processDetail: Object.freeze({
      title: 'Process detail',
      note: 'This screen will be designed in the next stage.',
      backLabel: 'Back to dashboard',
    }),
    processReport: Object.freeze({
      title: 'Candidate report',
      note: 'This screen will be designed in the next stage.',
      backLabel: 'Back to dashboard',
    }),
    newRequest: Object.freeze({
      title: 'New request',
      note: 'This screen will be designed in the next stage.',
      backLabel: 'Back to dashboard',
    }),
    requestDesign: Object.freeze({
      title: 'New request · Design with KRUMM',
      note: 'This screen will be designed in the next stage.',
      backLabel: 'Back to dashboard',
    }),
    requestUpload: Object.freeze({
      title: 'New request · Upload profile',
      note: 'This screen will be designed in the next stage.',
      backLabel: 'Back to dashboard',
    }),
    portal: Object.freeze({
      title: 'Choose your portal',
      subtitle: 'Access your KRUMM workspace.',
    }),
    companyAccess: Object.freeze({
      title: 'Company Portal',
      comingSoon: 'Coming soon',
      preview: 'This portal is being prepared. Sign-in will be available here soon.',
      cta: 'Explore company demo →',
      backLabel: '← Choose another portal',
    }),
  }),
});

const ES = Object.freeze({
  // ── común ────────────────────────────────────────────────────────────────
  common_skipContent: 'Ir al contenido',
  common_logoAlt: 'KRUMM — Tecnología para la evaluación de talento',
  common_language: 'Idioma',
  common_close: 'Cerrar',
  common_krumm: 'KRUMM',
  common_footerYear: '© 2026 KRUMM',
  common_nextIteration: 'Esta experiencia será desarrollada en la siguiente iteración.',
  common_backHome: '← Volver a KRUMM',
  common_backPortals: '← Elegir otro portal',
  // ── chrome candidato ─────────────────────────────────────────────────────
  cp_breadcrumb: 'Ruta de navegación',
  cp_help: 'Ayuda',
  cp_helpText: 'Elige «Ver oportunidades» para explorar cargos disponibles o «Iniciar sesión» si ya tienes una invitación.',
  cp_privacy: 'Aviso de privacidad',
  cp_terms: 'Términos',
  cp_candidatePortal: 'Portal para candidatos',
  cp_access: 'Acceso candidato',
  cp_jobs: 'Bolsa de empleos',
  cp_back: 'Volver al portal candidato',
  cp_eyebrow: 'KRUMM · EVALUACIÓN DE TALENTO',
  // ── chrome empresa ───────────────────────────────────────────────────────
  company_workspace: 'Espacio de empresa',
  company_dashboard: 'Dashboard',
  company_newRequest: 'Nueva solicitud',
  company_processes: 'Procesos',
  company_settings: 'Configuración',
  company_help: 'Ayuda',
  company_account: 'Cuenta',
  company_notifications: 'Notificaciones',
  company_signOut: 'Cerrar sesión',
  company_openNavigation: 'Mostrar u ocultar navegación',
  company_portalNavigation: 'Navegación de empresa',
  company_breadcrumb: 'Ruta de navegación',
  company_demoBadge: 'Espacio de demostración',
  company_demoNotice: 'Todos los nombres, procesos y resultados mostrados son ficticios.',
  company_previewTitle: 'Próximamente en la vista previa',
  company_previewText: 'Esta pantalla se diseñará en la siguiente etapa. Por ahora, puedes explorar el dashboard.',
  company_notificationsText: 'Estás al día. Esta es una vista previa visual del centro de notificaciones.',
  company_accountText: 'Cuenta de demostración · Gestión de Personas · Andes Industries',
  company_userName: 'Alex Morgan',
  company_userOrg: 'Andes Industries',
  company_userInitials: 'AM',
  company_eyebrow: 'ANDES INDUSTRIES',
  company_enterDemo: 'Explorar demo de empresas →',
  company_comingSoon: 'Próximamente',
  company_loginPreview: 'Estamos preparando este portal. Pronto podrás iniciar sesión aquí.',
  company_processesTitle: 'Procesos activos',
  company_processDetail: 'Detalle del proceso',
  company_processReport: 'Informe del candidato',
  company_requestDesign: 'Nueva solicitud · Diseñar con KRUMM',
  company_requestUpload: 'Nueva solicitud · Subir perfil',
  company_backDashboard: 'Volver al dashboard',
  // ── portal bare ──────────────────────────────────────────────────────────
  portal_title: 'Elige tu portal',
  portal_subtitle: 'Accede a tu espacio KRUMM.',
  portal_companies: 'Empresas',
  portal_company: 'Portal para empresas',
  portal_companyDescription: 'Gestiona procesos de evaluación, candidatos, resultados y equipos.',
  portal_companyCta: 'Ingresar como empresa →',
  portal_candidates: 'Candidatos',
  portal_candidate: 'Portal para candidatos',
  portal_candidateDescription: 'Accede a tus evaluaciones y experiencias KRUMM.',
  portal_candidateCta: 'Explorar portal candidato →',
  // ── placeholders por ruta ────────────────────────────────────────────────
  pages: Object.freeze({
    candidateHome: Object.freeze({
      title: 'Portal para candidatos',
      note: 'Esta experiencia será desarrollada en la siguiente iteración.',
      backLabel: 'Volver al portal candidato',
    }),
    candidateAccess: Object.freeze({
      title: 'Acceso candidato',
      note: 'Esta experiencia será desarrollada en la siguiente iteración.',
      backLabel: 'Volver al portal candidato',
    }),
    jobs: Object.freeze({
      title: 'Bolsa de empleos',
      note: 'Esta experiencia será desarrollada en la siguiente iteración.',
      backLabel: 'Volver al portal candidato',
    }),
    dashboard: Object.freeze({
      title: 'Dashboard',
    }),
    processes: Object.freeze({
      title: 'Procesos activos',
      note: 'Esta pantalla se diseñará en la siguiente etapa.',
      backLabel: 'Volver al dashboard',
    }),
    processDetail: Object.freeze({
      title: 'Detalle del proceso',
      note: 'Esta pantalla se diseñará en la siguiente etapa.',
      backLabel: 'Volver al dashboard',
    }),
    processReport: Object.freeze({
      title: 'Informe del candidato',
      note: 'Esta pantalla se diseñará en la siguiente etapa.',
      backLabel: 'Volver al dashboard',
    }),
    newRequest: Object.freeze({
      title: 'Nueva solicitud',
      note: 'Esta pantalla se diseñará en la siguiente etapa.',
      backLabel: 'Volver al dashboard',
    }),
    requestDesign: Object.freeze({
      title: 'Nueva solicitud · Diseñar con KRUMM',
      note: 'Esta pantalla se diseñará en la siguiente etapa.',
      backLabel: 'Volver al dashboard',
    }),
    requestUpload: Object.freeze({
      title: 'Nueva solicitud · Subir perfil',
      note: 'Esta pantalla se diseñará en la siguiente etapa.',
      backLabel: 'Volver al dashboard',
    }),
    portal: Object.freeze({
      title: 'Elige tu portal',
      subtitle: 'Accede a tu espacio KRUMM.',
    }),
    companyAccess: Object.freeze({
      title: 'Portal para empresas',
      comingSoon: 'Próximamente',
      preview: 'Estamos preparando este portal. Pronto podrás iniciar sesión aquí.',
      cta: 'Explorar demo de empresas →',
      backLabel: '← Elegir otro portal',
    }),
  }),
});

export const V3_COPY = Object.freeze({ en: EN, es: ES });

export function getV3Copy(language) {
  if (language === 'es') return V3_COPY.es;
  if (language === 'en') return V3_COPY.en;
  return V3_COPY.es;
}

export function useV3Copy() {
  const { language } = useLanguage();
  return getV3Copy(language);
}

// Arboleda plana de claves (path.join('.')) — para tests de paridad externas.
export function flattenKeys(node, prefix = '', out = []) {
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out.push(path);
    else if (value && typeof value === 'object') flattenKeys(value, path, out);
  }
  return out;
}
