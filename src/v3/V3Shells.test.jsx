// t_1c27edbf (V0 fase v3): spec de declaración — shells candidato/empresa +
// rutas + i18n base. Criterios de aceptación de la card:
//   1. Shells renderizan en 2 viewports con 0 overflow/0 errors
//      (jsdom: estructura + CSS de régimen; overflow/errors → smoke Playwright).
//   2. Tokens --k-* sin hex en vistas (régimen de test, patrón LandingPage.test.jsx).
//   3. Spec de declaración verde.
// Referencia visual: docs/spec/frontend-ref-v2 (candidate.html/css/js,
// company.html/css/js, portal.html, login-company.html).
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react';
import { describe, expect, it, afterEach } from 'vitest';
import { LanguageProvider } from '../i18n/LanguageContext.jsx';
import CandidateShell from './CandidateShell.jsx';
import CompanyShell from './CompanyShell.jsx';
import V3RootApp from './V3RootApp.jsx';
import { V3_COPY } from './v3Copy.js';
import { V3_ROUTES } from './v3Routes.js';

// jsdom corre con URL sin origin útil para localStorage → mock de módulo
// (mismo patrón que PostulationFlowDesignSystem.test.jsx).
const storage = {};
const localStorageMock = {
  getItem: (key) => (key in storage ? storage[key] : null),
  setItem: (key, value) => { storage[key] = String(value); },
  removeItem: (key) => { delete storage[key]; },
  clear: () => { for (const key of Object.keys(storage)) delete storage[key]; },
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock, configurable: true });

function renderCandidate(children, options = {}) {
  return render(
    <LanguageProvider>
      <CandidateShell breadcrumb={options.breadcrumb}>{children}</CandidateShell>
    </LanguageProvider>,
  );
}

function renderCompany(children, options = {}) {
  return render(
    <LanguageProvider>
      <CompanyShell section={options.section ?? V3_COPY.es.company_dashboard} active={options.active ?? 'dashboard'}>
        {children}
      </CompanyShell>
    </LanguageProvider>,
  );
}

function renderV3Route(pathname) {
  // Renders secuenciales dentro del mismo test: cleanup explícito (el auto
  // cleanup solo corre entre tests) para no acumular roots/listeners stale.
  cleanup();
  window.history.pushState({}, '', pathname);
  return render(
    <LanguageProvider>
      <V3RootApp />
    </LanguageProvider>,
  );
}

afterEach(() => {
  // Reset determinista entre tests: URL al root y borrar el idioma persistido
  // por LanguageContext (los tests i18n terminan en EN y contaminarían al
  // siguiente render si no se limpia).
  window.history.pushState({}, '', '/');
  localStorage.clear();
  document.body.innerHTML = '';
});

describe('CandidateShell (ref candidate.html)', () => {
  it('skip link, topbar con logo (alt i18n), breadcrumb, toggle de idioma y Help', () => {
    renderCandidate(<section>contenido</section>, { breadcrumb: V3_COPY.es.cp_access });
    const skip = screen.getByRole('link', { name: V3_COPY.es.common_skipContent });
    expect(skip).toHaveAttribute('href', '#v3-candidate-main');
    const logo = screen.getByRole('link', { name: V3_COPY.es.common_logoAlt });
    expect(logo).toHaveAttribute('href', '/');
    expect(within(logo).getByAltText(V3_COPY.es.common_logoAlt)).toHaveAttribute('src', '/assets/krumm-logo-borderless-no-text.png');
    expect(screen.getByRole('group', { name: /Idioma/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: V3_COPY.es.cp_help })).toBeInTheDocument();
    const breadcrumb = screen.getByRole('navigation', { name: V3_COPY.es.cp_breadcrumb });
    expect(within(breadcrumb).getByTestId('v3-breadcrumb-current')).toHaveTextContent(V3_COPY.es.cp_access);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('footer: © 2026 KRUMM + Privacy/Terms (referencia)', () => {
    renderCandidate(<section>contenido</section>);
    const footer = screen.getByRole('contentinfo');
    expect(footer).toHaveTextContent(V3_COPY.es.common_footerYear);
    expect(within(footer).getByRole('button', { name: V3_COPY.es.cp_privacy })).toBeInTheDocument();
    expect(within(footer).getByRole('button', { name: V3_COPY.es.cp_terms })).toBeInTheDocument();
  });

  it('Help abre diálogo accesible; Cerrar y Escape lo cierran y devuelven focus al trigger', () => {
    renderCandidate(<section>contenido</section>);
    const helpButton = screen.getByRole('button', { name: V3_COPY.es.cp_help });
    // jsdom no implementa la activación de focus por mousedown/click (en el
    // navegador el mousedown enfoca el trigger): se enfoca explícitamente para
    // modelar el retorno de focus real.
    helpButton.focus();
    fireEvent.click(helpButton);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAccessibleName(V3_COPY.es.cp_help);
    expect(within(dialog).getByRole('heading', { name: V3_COPY.es.cp_help })).toBeInTheDocument();
    expect(within(dialog).getByText(V3_COPY.es.cp_helpText)).toBeInTheDocument();
    expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: V3_COPY.es.common_close }));
    // Escape cierra y devuelve el focus al trigger
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(helpButton);
    // Reabrir y cerrar con el botón
    helpButton.focus();
    fireEvent.click(helpButton);
    fireEvent.click(screen.getByRole('dialog').querySelector('.v3-dialog__close'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Privacy y Terms abren el diálogo con la nota de próxima iteración (placeholder honesto)', () => {
    renderCandidate(<section>contenido</section>);
    const footer = screen.getByRole('contentinfo');
    fireEvent.click(within(footer).getByRole('button', { name: V3_COPY.es.cp_privacy }));
    let dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: V3_COPY.es.cp_privacy })).toBeInTheDocument();
    expect(within(dialog).getByText(V3_COPY.es.common_nextIteration)).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(within(footer).getByRole('button', { name: V3_COPY.es.cp_terms }));
    dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: V3_COPY.es.cp_terms })).toBeInTheDocument();
  });

  it('i18n: click EN traduce el chrome (skip, help, footer)', () => {
    // Sin breadcrumb prop: el texto del breadcrumb lo da la app desde el
    // diccionario (reactivo al idioma) — se cubre en los tests de V3RootApp.
    renderCandidate(<section>contenido</section>);
    fireEvent.click(screen.getByRole('button', { name: 'EN' }));
    expect(screen.getByRole('link', { name: V3_COPY.en.common_skipContent })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: V3_COPY.en.cp_help })).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toHaveTextContent(V3_COPY.en.common_footerYear);
    fireEvent.click(screen.getByRole('button', { name: 'ES' }));
    expect(screen.getByRole('button', { name: V3_COPY.es.cp_help })).toBeInTheDocument();
  });

  it('un solo h1 por página', () => {
    renderCandidate(<section><h1>h1 de página</h1></section>);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });
});

describe('CompanyShell (ref company.html)', () => {
  it('sidebar: workspace, nav Dashboard/New request/Processes + Settings/Help + user chip demo', () => {
    renderCompany(<section>contenido</section>);
    const aside = document.querySelector('.v3-co-sidebar');
    expect(aside).not.toBeNull();
    expect(within(aside).getByText(V3_COPY.es.company_workspace)).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: V3_COPY.es.company_portalNavigation });
    expect(within(nav).getByRole('link', { name: V3_COPY.es.company_dashboard })).toHaveAttribute('href', '/empresa');
    expect(within(nav).getByRole('link', { name: V3_COPY.es.company_newRequest })).toHaveAttribute('href', '/empresa/nueva-solicitud');
    expect(within(nav).getByRole('link', { name: V3_COPY.es.company_processes })).toHaveAttribute('href', '/empresa/procesos');
    expect(within(nav).getByRole('button', { name: V3_COPY.es.company_settings })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: V3_COPY.es.company_help })).toBeInTheDocument();
    // user chip demo (referencia: Alex Morgan · Andes Industries · Account↗)
    expect(within(aside).getByText(V3_COPY.es.company_userName)).toBeInTheDocument();
    expect(within(aside).getByText(V3_COPY.es.company_userOrg)).toBeInTheDocument();
    expect(within(aside).getByText(V3_COPY.es.company_userInitials)).toBeInTheDocument();
    expect(within(aside).getByRole('button', { name: new RegExp(V3_COPY.es.company_account) })).toBeInTheDocument();
    // brand → /portal
    const brand = within(aside).getByRole('link', { name: V3_COPY.es.common_logoAlt });
    expect(brand).toHaveAttribute('href', '/portal');
  });

  it('estado activo: aria-current + is-active en el ítem indicado', () => {
    renderCompany(<section>contenido</section>, { active: 'processes', section: V3_COPY.es.company_processesTitle });
    const nav = screen.getByRole('navigation', { name: V3_COPY.es.company_portalNavigation });
    const active = within(nav).getByRole('link', { name: V3_COPY.es.company_processes });
    expect(active).toHaveAttribute('aria-current', 'page');
    expect(active).toHaveClass('is-active');
    const dashboard = within(nav).getByRole('link', { name: V3_COPY.es.company_dashboard });
    expect(dashboard).not.toHaveAttribute('aria-current');
  });

  it('header: breadcrumb KRUMM / {sección} + toggle + notificaciones + perfil', () => {
    renderCompany(<section>contenido</section>, { section: V3_COPY.es.company_processesTitle });
    const breadcrumb = screen.getByRole('navigation', { name: V3_COPY.es.company_breadcrumb });
    expect(within(breadcrumb).getByTestId('v3-breadcrumb-root')).toHaveTextContent(V3_COPY.es.common_krumm);
    expect(within(breadcrumb).getByTestId('v3-breadcrumb-current')).toHaveTextContent(V3_COPY.es.company_processesTitle);
    expect(screen.getByRole('group', { name: /Idioma/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: V3_COPY.es.company_notifications })).toBeInTheDocument();
    // El avatar del perfil tiene aria-label = company_account (referencia
    // company.html); se busca dentro del header para no confundirlo con el
    // botón Account de la sidebar (mismo nombre accesible).
    const header = document.querySelector('.v3-co-header');
    expect(within(header).getByRole('button', { name: V3_COPY.es.company_account })).toBeInTheDocument();
  });

  it('banner demo workspace (privacidad: datos ficticios, humanReviewOnly)', () => {
    renderCompany(<section>contenido</section>);
    expect(screen.getByText(V3_COPY.es.company_demoBadge)).toBeInTheDocument();
    expect(screen.getByText(V3_COPY.es.company_demoNotice)).toBeInTheDocument();
  });

  it('Settings/Help/Notifications/Account abren diálogos "próxima etapa" (referencia company.js)', () => {
    renderCompany(<section>contenido</section>);
    const nav = screen.getByRole('navigation', { name: V3_COPY.es.company_portalNavigation });
    fireEvent.click(within(nav).getByRole('button', { name: V3_COPY.es.company_settings }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: V3_COPY.es.company_settings })).toBeInTheDocument();
    expect(within(dialog).getByText(V3_COPY.es.company_previewText)).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: V3_COPY.es.company_notifications }));
    expect(within(screen.getByRole('dialog')).getByText(V3_COPY.es.company_notificationsText)).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    const aside = document.querySelector('.v3-co-sidebar');
    fireEvent.click(within(aside).getByRole('button', { name: new RegExp(V3_COPY.es.company_account) }));
    expect(within(screen.getByRole('dialog')).getByText(V3_COPY.es.company_accountText)).toBeInTheDocument();
  });

  it('perfil: dropdown Sign out → /portal; Escape cierra y devuelve focus', () => {
    renderCompany(<section>contenido</section>);
    // aria-label = company_account (ref company.html); scoped al header para
    // no colisionar con el botón Account de la sidebar.
    const header = document.querySelector('.v3-co-header');
    const profile = within(header).getByRole('button', { name: V3_COPY.es.company_account });
    profile.focus();
    fireEvent.click(profile);
    const dropdown = screen.getByRole('menu', { name: V3_COPY.es.company_account });
    expect(within(dropdown).getByRole('link', { name: V3_COPY.es.company_signOut })).toHaveAttribute('href', '/portal');
    expect(profile).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(profile).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(profile);
  });

  it('menú móvil: botón aria-expanded, abre/cierra .is-open, Escape cierra', () => {
    renderCompany(<section>contenido</section>);
    // El botón de menú es display:none en desktop (ref company.css ≤760px);
    // con css:true el computed style lo marca inaccesible para getByRole — se
    // consulta por selector estable y se asertan los aria directamente
    // (mismo patrón documentado en LandingPage.test.jsx para el hamburger).
    const menu = document.querySelector('.v3-co-menu');
    expect(menu).not.toBeNull();
    expect(menu).toHaveAttribute('aria-label', V3_COPY.es.company_openNavigation);
    expect(menu).toHaveAttribute('aria-expanded', 'false');
    expect(menu).toHaveAttribute('aria-controls', 'v3-company-sidebar');
    fireEvent.click(menu);
    expect(menu).toHaveAttribute('aria-expanded', 'true');
    expect(document.querySelector('.v3-co-sidebar')).toHaveClass('is-open');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(menu).toHaveAttribute('aria-expanded', 'false');
    expect(document.querySelector('.v3-co-sidebar')).not.toHaveClass('is-open');
    expect(document.activeElement).toBe(menu);
  });

  it('i18n: click EN traduce nav, banner y user chip', () => {
    renderCompany(<section>contenido</section>);
    fireEvent.click(screen.getByRole('button', { name: 'EN' }));
    const nav = screen.getByRole('navigation', { name: V3_COPY.en.company_portalNavigation });
    expect(within(nav).getByRole('link', { name: V3_COPY.en.company_newRequest })).toBeInTheDocument();
    expect(screen.getByText(V3_COPY.en.company_demoBadge)).toBeInTheDocument();
    expect(screen.getByText(V3_COPY.en.company_demoNotice)).toBeInTheDocument();
    expect(document.querySelector('.v3-co-sidebar')).toHaveTextContent(V3_COPY.en.company_workspace);
  });
});

describe('V3RootApp (registro de rutas de la fase con placeholders)', () => {
  it(`resuelve las ${V3_ROUTES.length} rutas del plan maestro §2`, () => {
    for (const route of V3_ROUTES) {
      const pathname = route.path
        .replace(':id', 'supervisor')
        .replace(':sessionId', 'ses-1')
        .replace(':slug', 'analista-control-planta');
      const { container } = renderV3Route(pathname);
      expect(container.querySelector('h1'), pathname).not.toBeNull();
      // shell correcto según el registro
      if (route.shell === 'candidate') expect(container.querySelector('.v3-candidate'), pathname).not.toBeNull();
      if (route.shell === 'company') {
        expect(container.querySelector('.v3-company'), pathname).not.toBeNull();
        expect(container.querySelector('.v3-co-demo-badge'), pathname).not.toBeNull();
      }
      if (route.shell === 'portal') expect(container.querySelector('.v3-portal'), pathname).not.toBeNull();
      if (route.shell === 'companyLogin') expect(container.querySelector('.v3-company-login'), pathname).not.toBeNull();
      // t_482f57b2 (V1): /candidato y /candidato/acceso son páginas reales
      // (home de la referencia + form de acceso); /empleos y /empleos/:slug
      // son páginas reales con datos de jobsData.js (t_7aad621f FASE A.3).
      // t_84f00355 (V3): /empresa/proceso/:id es real (h1 = cargo; :id
      // sustituido por 'supervisor' arriba); el reporte con :sessionId='ses-1'
      // (desconocido en demo) cae al not-found que conserva el título de la
      // página ('Informe del candidato' = pages.processReport.title).
      const expectedTitle = route.page === 'candidateHome'
        ? V3_COPY.es.cp_title
        : route.page === 'candidateAccess'
          ? V3_COPY.es.cp_access
          : route.page === 'jobs'
            ? V3_COPY.es.pages.jobs.title
            : route.page === 'jobDetail'
              ? 'Analista de Control de Planta' // h1 del detalle = título de la oferta (slug analista-control-planta)
              : route.page === 'processDetail'
                ? V3_COPY.es.company_supervisor
                : V3_COPY.es.pages[route.page].title;
      expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent), pathname).toContain(expectedTitle);
    }
  });

  it('rutas candidato: /empleos job board real (lista de ofertas, sin placeholder); el hub ya no es placeholder', () => {
    const { container } = renderV3Route('/empleos');
    expect(container.querySelector('.v3-candidate')).not.toBeNull();
    expect(container.querySelector('.v3-placeholder')).toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: V3_COPY.es.pages.jobs.title })).toBeInTheDocument();
    // job board real renderiza cards de ofertas
    expect(container.querySelector('.v3-jobs-grid')).not.toBeNull();
    expect(container.querySelectorAll('.v3-job-card')).toHaveLength(4);
    // back link al hub
    expect(screen.getByRole('link', { name: V3_COPY.es.cp_back })).toHaveAttribute('href', '/candidato');
    // el hub /candidato (V1: home real) no muestra back a sí mismo
    const { container: hubContainer } = renderV3Route('/candidato');
    expect(hubContainer.querySelector('.v3-back')).toBeNull();
    expect(hubContainer.querySelector('.v3-placeholder')).toBeNull();
  });

  it('rutas empresa (V3/V4 reales): detalle real con back a procesos; dashboard y procesos sin placeholder', () => {
    // t_84f00355 (V3): /empresa/proceso/:id es página real (detalle);
    // t_9319e84d (V4): new request también es real (ya no hay placeholders
    // en rutas empresa; su verificación vive en V4CompanyRequest.test.jsx).
    renderV3Route('/empresa/proceso/supervisor');
    expect(screen.getByRole('heading', { level: 1, name: V3_COPY.es.company_supervisor })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: V3_COPY.es.pl_back })).toHaveAttribute('href', '/empresa/procesos');
    expect(screen.queryByText(V3_COPY.es.pages.processDetail.note)).toBeNull();
    window.history.pushState({}, '', '/empresa');
    const { container: dashContainer } = renderV3Route('/empresa');
    expect(dashContainer.querySelector('.v3-back')).toBeNull();
    expect(dashContainer.querySelector('.v3-placeholder')).toBeNull();
    window.history.pushState({}, '', '/empresa/procesos');
    const { container: procsContainer } = renderV3Route('/empresa/procesos');
    expect(procsContainer.querySelector('.v3-back')).toBeNull();
    expect(procsContainer.querySelector('.v3-placeholder')).toBeNull();
  });

  it('/portal: 2 cards de la referencia con hrefs correctos + back home', () => {
    renderV3Route('/portal');
    const companyCard = screen.getByRole('link', { name: new RegExp(V3_COPY.es.portal_company) });
    expect(companyCard).toHaveAttribute('href', '/empresa/acceso');
    const candidateCard = screen.getByRole('link', { name: new RegExp(V3_COPY.es.portal_candidate) });
    expect(candidateCard).toHaveAttribute('href', '/candidato');
    expect(screen.getByRole('link', { name: V3_COPY.es.common_backHome })).toHaveAttribute('href', '/');
  });

  it('/empresa/acceso (A.2): login real + demo + back portals', () => {
    renderV3Route('/empresa/acceso');
    expect(screen.getByRole('heading', { level: 1, name: V3_COPY.es.pages.companyAccess.title })).toBeInTheDocument();
    expect(screen.getByText(V3_COPY.es.pages.companyAccess.loginSubtitle)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: V3_COPY.es.pages.companyAccess.loginCta })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: V3_COPY.es.pages.companyAccess.demoCta })).toHaveAttribute('href', '/empresa');
    expect(screen.getByRole('link', { name: V3_COPY.es.pages.companyAccess.backLabel })).toHaveAttribute('href', '/portal');
  });

  it('rutas dinámicas: el param no se expone como título; el placeholder es genérico', () => {
    const { container } = renderV3Route('/empresa/proceso/supervisor/candidatos/ses-1');
    expect(container.textContent).not.toContain('supervisor');
    expect(container.textContent).not.toContain('ses-1');
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toContain(V3_COPY.es.pages.processReport.title);
  });

  it('i18n en el root app: EN traduce página real de acceso + shells', () => {
    renderV3Route('/candidato/acceso');
    fireEvent.click(screen.getByRole('button', { name: 'EN' }));
    // t_482f57b2 (V1): /candidato/acceso es el form real (sin note de
    // placeholder); h1 = cp_access EN + intro de la página.
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toContain(V3_COPY.en.cp_access);
    expect(screen.getByText(V3_COPY.en.ca_intro)).toBeInTheDocument();
  });
});

describe('Régimen de tokens (v3Shells.css — sin estilos ad-hoc)', () => {
  const css = fs.readFileSync(path.resolve(process.cwd(), 'src/v3/v3Shells.css'), 'utf8');

  it('sin colores hardcodeados (hex/rgb/hsl): todo vía var(--k-*)', () => {
    const hex = css.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
    expect(hex).toEqual([]);
    expect(css).not.toMatch(/\b(rgb|rgba|hsl|hsla)\s*\(/);
    const tokenUses = (css.match(/var\(--k-[a-z0-9-]+\)/gi) ?? []).length;
    expect(tokenUses).toBeGreaterThanOrEqual(60);
  });

  it('tipografía por tokens (Archivo display + Manrope body)', () => {
    expect(css).toContain('var(--k-font-display)');
    expect(css).toContain('var(--k-font-sans)');
  });

  it('estados obligatorios en interactivo + reduced-motion (design-system §6.1)', () => {
    expect(css).toMatch(/:hover/);
    expect(css).toMatch(/:focus-visible/);
    expect(css).toContain('prefers-reduced-motion');
  });
});
