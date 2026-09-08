// t_482f57b2 (V1 fase v3): spec de declaración — lado candidato:
// home (/candidato, 2 cards de la referencia), acceso (/candidato/acceso,
// integración del guard de invitación: token/link → /postulaciones) y
// job board honesto (/empleos, placeholder idéntico a la referencia).
// Referencia visual: docs/spec/frontend-ref-v2 (candidate.html/css/js,
// login-candidate.html, jobs.html). Criterio de aceptación de la card:
// recorrido portal → home → acceso → invitación válida → /postulaciones
// (flujo intacto); ES/EN; smoke 2 viewports.
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { LanguageProvider } from '../i18n/LanguageContext.jsx';
import { V3_COPY } from './v3Copy.js';
import { buildInvitationUrl, extractInviteToken } from '../postulation-demo/postulationDemoInvite.js';
import CandidateShell from './CandidateShell.jsx';
import CandidateHomePage from './CandidateHomePage.jsx';
import CandidateAccessPage from './CandidateAccessPage.jsx';
import V3RootApp from './V3RootApp.jsx';

// jsdom corre con URL sin origin útil para localStorage → mock de módulo
// (mismo patrón que V3Shells.test.jsx de V0).
const storage = {};
const localStorageMock = {
  getItem: (key) => (key in storage ? storage[key] : null),
  setItem: (key, value) => { storage[key] = String(value); },
  removeItem: (key) => { delete storage[key]; },
  clear: () => { for (const key of Object.keys(storage)) delete storage[key]; },
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock, configurable: true });

function renderWithLanguage(ui) {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

function renderV3Route(pathname) {
  // Renders secuenciales dentro del mismo test: cleanup explícito (mismo
  // patrón documentado en V3Shells.test.jsx de V0).
  cleanup();
  window.history.pushState({}, '', pathname);
  return renderWithLanguage(<V3RootApp />);
}

afterEach(() => {
  // Reset determinista entre tests: URL al root + borrar idioma persistido
  // por LanguageContext (los tests i18n terminan en EN).
  window.history.pushState({}, '', '/');
  localStorage.clear();
  document.body.innerHTML = '';
});

describe('CandidateHomePage (ref candidate.html)', () => {
  it('hero: eyebrow + h1 "Find your next opportunity" (ES) + subtitle', () => {
    renderWithLanguage(<CandidateHomePage />);
    expect(screen.getByText(V3_COPY.es.cp_eyebrow)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: V3_COPY.es.cp_title })).toBeInTheDocument();
    expect(screen.getByText(V3_COPY.es.cp_subtitle)).toBeInTheDocument();
  });

  it('pregunta h2 "¿Cómo quieres continuar?"', () => {
    renderWithLanguage(<CandidateHomePage />);
    expect(screen.getByRole('heading', { level: 2, name: V3_COPY.es.cp_question })).toBeInTheDocument();
  });

  it('card Explore opportunities → /empleos con copias de la referencia', () => {
    const { container } = renderWithLanguage(<CandidateHomePage />);
    const card = container.querySelector('.v3-cp-card[href="/empleos"]');
    expect(card).not.toBeNull();
    expect(within(card).getByRole('heading', { level: 3, name: V3_COPY.es.cp_explore })).toBeInTheDocument();
    expect(within(card).getByText(V3_COPY.es.cp_exploreText)).toBeInTheDocument();
    expect(within(card).getByText(V3_COPY.es.cp_exploreAction)).toBeInTheDocument();
    expect(within(card).getByText(V3_COPY.es.cp_exploreHint)).toBeInTheDocument();
  });

  it('card I already have an invitation → /candidato/acceso con CTA Sign in', () => {
    const { container } = renderWithLanguage(<CandidateHomePage />);
    const card = container.querySelector('.v3-cp-card[href="/candidato/acceso"]');
    expect(card).not.toBeNull();
    expect(within(card).getByRole('heading', { level: 3, name: V3_COPY.es.cp_invitation })).toBeInTheDocument();
    expect(within(card).getByText(V3_COPY.es.cp_invitationText)).toBeInTheDocument();
    expect(within(card).getByText(V3_COPY.es.cp_signIn)).toBeInTheDocument();
    expect(within(card).getByText(V3_COPY.es.cp_invitationHint)).toBeInTheDocument();
  });

  it('dos cards con iconos svg (aria-hidden) y un solo h1', () => {
    const { container } = renderWithLanguage(<CandidateHomePage />);
    const cards = container.querySelectorAll('.v3-cp-card');
    expect(cards).toHaveLength(2);
    const icons = container.querySelectorAll('.v3-cp-card-icon svg');
    expect(icons).toHaveLength(2);
    icons.forEach((icon) => expect(icon).toHaveAttribute('aria-hidden', 'true'));
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('i18n: click EN traduce hero, cards y CTA (copias de la referencia EN)', () => {
    // El toggle EN|ES vive en CandidateShell (chrome, ref candidate.html) →
    // se renderiza la home dentro del shell, igual que en la app.
    renderWithLanguage(
      <CandidateShell breadcrumb={V3_COPY.es.cp_candidatePortal}>
        <CandidateHomePage />
      </CandidateShell>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'EN' }));
    expect(screen.getByRole('heading', { level: 1, name: V3_COPY.en.cp_title })).toBeInTheDocument();
    expect(screen.getByText(V3_COPY.en.cp_subtitle)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: V3_COPY.en.cp_question })).toBeInTheDocument();
    const explore = screen.getByRole('link', { name: new RegExp(V3_COPY.en.cp_explore) });
    expect(explore).toHaveAttribute('href', '/empleos');
    const invitation = screen.getByRole('link', { name: new RegExp(V3_COPY.en.cp_invitation) });
    expect(invitation).toHaveAttribute('href', '/candidato/acceso');
    expect(within(invitation).getByText(V3_COPY.en.cp_signIn)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'ES' }));
    expect(screen.getByRole('heading', { level: 1, name: V3_COPY.es.cp_title })).toBeInTheDocument();
  });
});

describe('CandidateAccessPage (integración del guard de invitación)', () => {
  function renderAccess(options = {}) {
    const onNavigate = options.onNavigate ?? vi.fn();
    const { container } = renderWithLanguage(
      <CandidateAccessPage onNavigate={onNavigate} initialSearch={options.initialSearch ?? ''} />,
    );
    // jsdom no implementa la submission de formularios por click en el botón
    // submit (lo simula el evento `submit` del form, el mismo que dispara un
    // click/Enter real en el navegador).
    const submitForm = () => fireEvent.submit(container.querySelector('form'));
    return { container, onNavigate, submitForm };
  }

  it('chrome: eyebrow + h1 "Acceso candidato" + intro + back al hub', () => {
    renderAccess();
    expect(screen.getByText(V3_COPY.es.cp_eyebrow)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: V3_COPY.es.cp_access })).toBeInTheDocument();
    expect(screen.getByText(V3_COPY.es.ca_intro)).toBeInTheDocument();
    expect(screen.getByText(V3_COPY.es.ca_note)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: V3_COPY.es.cp_back })).toHaveAttribute('href', '/candidato');
  });

  it('form: label + input (placeholder de formato) + submit "Iniciar sesión"', () => {
    renderAccess();
    expect(screen.getByLabelText(V3_COPY.es.ca_label)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(V3_COPY.es.ca_inputPlaceholder)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: V3_COPY.es.cp_signIn })).toBeInTheDocument();
  });

  it('submit vacío → error role=alert y sin navegación', () => {
    const { onNavigate, submitForm } = renderAccess();
    submitForm();
    expect(screen.getByRole('alert')).toHaveTextContent(V3_COPY.es.ca_formatError);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('submit basura → error y sin navegación', () => {
    const { onNavigate, submitForm } = renderAccess();
    fireEvent.change(screen.getByLabelText(V3_COPY.es.ca_label), { target: { value: 'hola mundo' } });
    submitForm();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('submit token crudo válido → navega a /postulaciones?invite=<token>', () => {
    const { onNavigate, submitForm } = renderAccess();
    fireEvent.change(screen.getByLabelText(V3_COPY.es.ca_label), { target: { value: 'tok-valid-abc123' } });
    submitForm();
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith(buildInvitationUrl('tok-valid-abc123'));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('submit URL completa (link de invitación pegado) → extrae el token y navega', () => {
    const { onNavigate, submitForm } = renderAccess();
    fireEvent.change(screen.getByLabelText(V3_COPY.es.ca_label), {
      target: { value: 'https://krumm.cl/postulaciones?invite=tok-valid-abc123' },
    });
    submitForm();
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith('/postulaciones?invite=tok-valid-abc123');
  });

  it('submit URL sin param invite → error (no navega)', () => {
    const { onNavigate, submitForm } = renderAccess();
    fireEvent.change(screen.getByLabelText(V3_COPY.es.ca_label), {
      target: { value: 'https://krumm.cl/postulaciones?battery=stable_dg' },
    });
    submitForm();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('el error se limpia al corregir el input (y revalidar)', () => {
    const { onNavigate, submitForm } = renderAccess();
    fireEvent.change(screen.getByLabelText(V3_COPY.es.ca_label), { target: { value: 'x' } });
    submitForm();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(V3_COPY.es.ca_label), { target: { value: 'tok-valid-abc123' } });
    submitForm();
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('auto-navegación: llega con ?invite=<token> en la URL → navega 1 vez (guard idempotente)', () => {
    const { onNavigate } = renderAccess({ initialSearch: '?invite=tok-valid-abc123' });
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith(buildInvitationUrl('tok-valid-abc123'));
    // el form sigue renderizado (la navegación real ocurre en el navegador)
    expect(screen.getByLabelText(V3_COPY.es.ca_label)).toBeInTheDocument();
  });

  it('sin token en initialSearch → no auto-navega', () => {
    const first = renderAccess({ initialSearch: '' });
    expect(first.onNavigate).not.toHaveBeenCalled();
    cleanup();
    const second = renderAccess({ initialSearch: '?battery=stable_dg' });
    expect(second.onNavigate).not.toHaveBeenCalled();
  });

  it('i18n: click EN traduce página de acceso (intro/label/placeholder/error/note)', () => {
    // Toggle EN|ES en el shell (como en la app); onNavigate inyectado.
    const onNavigate = vi.fn();
    renderWithLanguage(
      <CandidateShell breadcrumb={V3_COPY.es.cp_access}>
        <CandidateAccessPage onNavigate={onNavigate} />
      </CandidateShell>,
    );
    const submit = () => fireEvent.submit(document.querySelector('form'));
    fireEvent.click(screen.getByRole('button', { name: 'EN' }));
    expect(screen.getByRole('heading', { level: 1, name: V3_COPY.en.cp_access })).toBeInTheDocument();
    expect(screen.getByText(V3_COPY.en.ca_intro)).toBeInTheDocument();
    expect(screen.getByLabelText(V3_COPY.en.ca_label)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(V3_COPY.en.ca_label), { target: { value: 'nope' } });
    submit();
    expect(screen.getByRole('alert')).toHaveTextContent(V3_COPY.en.ca_formatError);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('extractInviteToken (módulo dueño del formato) cubre los 3 shapes del input', () => {
    // Guardián de la integración: la página usa el mismo helper que valida
    // el formato de token del guard de /postulaciones.
    expect(extractInviteToken('tok-valid-abc123')).toBe('tok-valid-abc123');
    expect(extractInviteToken('https://krumm.cl/postulaciones?invite=tok-valid-abc123')).toBe('tok-valid-abc123');
    expect(extractInviteToken('hola')).toBeNull();
  });
});

describe('Régimen V1 — color de enlaces (bug morado UA detectado en smoke)', () => {
  const css = fs.readFileSync(path.resolve(process.cwd(), 'src/v3/v3Shells.css'), 'utf8');

  it('enlaces v3 heredan el color de texto (ref `a { color: inherit }`) — sin morado UA en h2/h3 dentro de <a>', () => {
    // jsdom no implementa el color UA de los enlaces → se asertan las
    // declaraciones (mismo patrón que el régimen de tokens de V0).
    expect(css).toMatch(/\.v3-candidate a,[\s\S]{0,600}?color: inherit;/);
    expect(css).toMatch(/\.v3-company a,[\s\S]{0,600}?color: inherit;/);
    expect(css).toMatch(/\.v3-bare a,[\s\S]{0,600}?color: inherit;/);
  });

  it('los back links conservan terracota con especificidad > la regla de enlaces (0,2,0 > 0,1,1)', () => {
    expect(css).toMatch(/\.v3-candidate \.v3-back,\s*\n\s*\.v3-company \.v3-back,\s*\n\s*\.v3-bare \.v3-back\s*\{[^}]*--k-ink-terracotta/);
  });
});

describe('V3RootApp — integración V1 (recorrido del lado candidato)', () => {
  it('/candidato: home real (hero + 2 cards), sin placeholder', () => {
    const { container } = renderV3Route('/candidato');
    expect(container.querySelector('.v3-candidate')).not.toBeNull();
    expect(container.querySelector('.v3-placeholder')).toBeNull();
    const grid = container.querySelector('.v3-cp-grid');
    expect(grid).not.toBeNull();
    expect(grid.querySelectorAll('.v3-cp-card')).toHaveLength(2);
    expect(screen.getByRole('heading', { level: 1, name: V3_COPY.es.cp_title })).toBeInTheDocument();
    // breadcrumb del hub (registro V0)
    const breadcrumb = screen.getByRole('navigation', { name: V3_COPY.es.cp_breadcrumb });
    expect(within(breadcrumb).getByTestId('v3-breadcrumb-current')).toHaveTextContent(V3_COPY.es.cp_candidatePortal);
  });

  it('/candidato/acceso: form dentro de CandidateShell con breadcrumb "Acceso candidato"', () => {
    const { container } = renderV3Route('/candidato/acceso');
    expect(container.querySelector('.v3-candidate')).not.toBeNull();
    const breadcrumb = screen.getByRole('navigation', { name: V3_COPY.es.cp_breadcrumb });
    expect(within(breadcrumb).getByTestId('v3-breadcrumb-current')).toHaveTextContent(V3_COPY.es.cp_access);
    expect(screen.getByLabelText(V3_COPY.es.ca_label)).toBeInTheDocument();
    expect(container.querySelector('.v3-placeholder')).toBeNull();
  });

  it('/empleos: job board honesto "próxima iteración" (placeholder, igual que la ref)', () => {
    const { container } = renderV3Route('/empleos');
    expect(container.querySelector('.v3-placeholder')).not.toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: V3_COPY.es.pages.jobs.title })).toBeInTheDocument();
    expect(screen.getByText(V3_COPY.es.pages.jobs.note)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: V3_COPY.es.pages.jobs.backLabel })).toHaveAttribute('href', '/candidato');
  });

  it('recorrido home → acceso: la card de invitación lleva al form', () => {
    renderV3Route('/candidato');
    const invitationCard = screen.getByRole('link', { name: new RegExp(V3_COPY.es.cp_invitation) });
    expect(invitationCard).toHaveAttribute('href', '/candidato/acceso');
    const exploreCard = screen.getByRole('link', { name: new RegExp(V3_COPY.es.cp_explore) });
    expect(exploreCard).toHaveAttribute('href', '/empleos');
  });
});
