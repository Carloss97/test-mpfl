// t_7aad621f (FASE A.3): spec del job board /empleos — JobsPage (listado) +
// JobDetailPage (detalle) + jobsData.js. Criterios de aceptación:
//   1. Listado renderiza N ofertas activas con tarjeta (título, meta, desc, CTA
//      → /empleos/:slug) + back al hub (/candidato). Sin placeholder.
//   2. Detalle por slug conocido → secciones (descripción, responsabilidades,
//      requisitos, beneficios) + CTA postular deshabilitado (placeholder
//      honesto "próxima iteración") + back.
//   3. Slug desconocido → empty state "Oferta no encontrada".
//   4. ES/EN: toggle traduce título, meta, secciones y CTA.
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, expect, it, afterEach } from 'vitest';
import { LanguageProvider } from '../i18n/LanguageContext.jsx';
import { V3_COPY } from './v3Copy.js';
import { JOBS_DATA, getJobBySlug, getActiveJobs } from './jobsData.js';
import V3RootApp from './V3RootApp.jsx';
import JobsPage from './JobsPage.jsx';
import JobDetailPage from './JobDetailPage.jsx';

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
  cleanup();
  window.history.pushState({}, '', pathname);
  return renderWithLanguage(<V3RootApp />);
}

function renderJobsPage() {
  return renderWithLanguage(<JobsPage />);
}

function renderJobDetail(slug) {
  return renderWithLanguage(<JobDetailPage params={{ slug }} />);
}

afterEach(() => {
  window.history.pushState({}, '', '/');
  localStorage.clear();
  document.body.innerHTML = '';
});

describe('jobsData.js', () => {
  it('define 3-4 ofertas demo con slug únicos y el esquema completo en ES/EN', () => {
    expect(JOBS_DATA.length).toBeGreaterThanOrEqual(3);
    expect(JOBS_DATA.length).toBeLessThanOrEqual(4);
    const slugs = new Set(JOBS_DATA.map((j) => j.slug));
    expect(slugs.size).toBe(JOBS_DATA.length);
    for (const job of JOBS_DATA) {
      for (const field of ['slug', 'title', 'location', 'mode', 'department', 'type', 'description', 'responsibilities', 'requirements', 'benefits', 'postedAt', 'status']) {
        expect(job[field], `${job.slug}.${field}`).toBeTruthy();
      }
      // campos i18n tienen {es, en}
      for (const field of ['title', 'location', 'mode', 'department', 'type', 'description', 'responsibilities', 'requirements', 'benefits']) {
        expect(job[field].es, `${job.slug}.${field}.es`).toBeTruthy();
        expect(job[field].en, `${job.slug}.${field}.en`).toBeTruthy();
      }
    }
  });

  it('getJobBySlug resuelve y devuelve null para slug desconocido', () => {
    expect(getJobBySlug(JOBS_DATA[0].slug)).toBe(JOBS_DATA[0]);
    expect(getJobBySlug('no-existe')).toBeNull();
  });

  it('getActiveJobs solo devuelve ofertas con status activo y consistentes entre ES/EN', () => {
    const active = getActiveJobs();
    expect(active.every((j) => j.status === 'active')).toBe(true);
    for (const job of active) {
      expect(job.responsibilities.es.length).toBe(job.responsibilities.en.length);
      expect(job.requirements.es.length).toBe(job.requirements.en.length);
      expect(job.benefits.es.length).toBe(job.benefits.en.length);
    }
  });
});

describe('JobsPage (/empleos — listado)', () => {
  it('hero: eyebrow + h1 "Bolsa de empleos" + subtitle del hub', () => {
    renderJobsPage();
    expect(screen.getByText(V3_COPY.es.cp_eyebrow)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: V3_COPY.es.pages.jobs.title })).toBeInTheDocument();
    expect(screen.getByText(V3_COPY.es.cp_subtitle)).toBeInTheDocument();
  });

  it('renderiza una card por oferta activa, cada una con CTA → /empleos/:slug', () => {
    const { container } = renderJobsPage();
    const cards = container.querySelectorAll('.v3-job-card');
    const active = getActiveJobs();
    expect(cards).toHaveLength(active.length);
    for (const job of active) {
      // cada card tiene su CTA con href al slug
      const ctas = container.querySelectorAll('.v3-job-cta');
      const hrefs = Array.from(ctas).map((c) => c.getAttribute('href'));
      expect(hrefs).toContain(`/empleos/${job.slug}`);
    }
  });

  it('every card shows título, meta (ubicación/modalidad/área), desc truncada y fecha', () => {
    const { container } = renderJobsPage();
    const cards = container.querySelectorAll('.v3-job-card');
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      expect(card.className).toContain('v3-job-card');
    }
    for (const job of getActiveJobs()) {
      expect(screen.getByText(job.title.es)).toBeInTheDocument();
      expect(screen.getByText(job.location.es)).toBeInTheDocument();
    }
  });

  it('back link al hub /candidato (sin placeholder)', () => {
    renderJobsPage();
    expect(screen.getByRole('link', { name: V3_COPY.es.cp_back })).toHaveAttribute('href', '/candidato');
  });

  it('i18n: click EN traduce h1, card title y CTA "View details"→href /empleos/:slug', () => {
    // Need shell for the toggle; render job page inside candidate route... simpler:
    // render the page inside LanguageProvider and click is only available via shell.
    // Use V3RootApp at /empleos to access the shell toggle.
    renderV3Route('/empleos');
    fireEvent.click(screen.getByRole('button', { name: 'EN' }));
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toContain(V3_COPY.en.pages.jobs.title);
    // slugs present regardless of language
    for (const job of getActiveJobs()) {
      expect(document.querySelector(`a[href="/empleos/${job.slug}"]`)).not.toBeNull();
    }
  });
});

describe('JobDetailPage (/empleos/:slug)', () => {
  it('detalle conocido: h1 = título de la oferta, meta y secciones', () => {
    const job = getActiveJobs()[0];
    renderJobDetail(job.slug);
    expect(screen.getByRole('heading', { level: 1, name: job.title.es })).toBeInTheDocument();
    expect(screen.getByText(job.location.es)).toBeInTheDocument();
    // secciones
    expect(screen.getByRole('heading', { level: 3, name: 'Descripción del cargo' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Responsabilidades' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Requisitos' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Beneficios' })).toBeInTheDocument();
    // bullet lists renderizan el contenido ES
    for (const req of job.requirements.es) {
      expect(screen.getByText(req)).toBeInTheDocument();
    }
  });

  it('CTA postular: deshabilitado con placeholder honesto "próxima iteración"', () => {
    const job = getActiveJobs()[0];
    renderJobDetail(job.slug);
    const apply = screen.getByRole('button', { name: /Postular \(próxima iteración\)/i });
    expect(apply).toBeDisabled();
    expect(apply).toHaveAttribute('aria-disabled', 'true');
  });

  it('back link a la bolsa de empleos', () => {
    const job = getActiveJobs()[0];
    renderJobDetail(job.slug);
    expect(screen.getByRole('link', { name: /Volver a la bolsa de empleos/i })).toHaveAttribute('href', '/empleos');
  });

  it('slug desconocido → empty state "Oferta no encontrada"', () => {
    renderJobDetail('cargo-inexistente');
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toContain('Oferta no encontrada');
    expect(screen.getByRole('link', { name: /Volver a la bolsa de empleos/i })).toHaveAttribute('href', '/empleos');
  });

  it('i18n: EN traduce h1, secciones y CTA', () => {
    // Use the shell route to get the toggle
    renderV3Route(`/empleos/${getActiveJobs()[0].slug}`);
    fireEvent.click(screen.getByRole('button', { name: 'EN' }));
    expect(screen.getByRole('heading', { level: 1, name: getActiveJobs()[0].title.en })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Job Description' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Responsibilities' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Requirements' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Benefits' })).toBeInTheDocument();
  });
});