import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, expect, it, afterEach } from 'vitest';
import { LanguageProvider } from '../i18n/LanguageContext.jsx';
import { JOBS_DATA, getDemoJobs, getJobBySlug } from './jobsData.js';
import V3RootApp from './V3RootApp.jsx';
import JobsPage from './JobsPage.jsx';
import JobDetailPage from './JobDetailPage.jsx';

const storage = {};
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: (key) => (key in storage ? storage[key] : null),
    setItem: (key, value) => { storage[key] = String(value); },
    removeItem: (key) => { delete storage[key]; },
    clear: () => { for (const key of Object.keys(storage)) delete storage[key]; },
  },
  configurable: true,
});

function renderWithLanguage(ui) {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

function renderV3Route(pathname) {
  cleanup();
  window.history.pushState({}, '', pathname);
  return renderWithLanguage(<V3RootApp />);
}

afterEach(() => {
  window.history.pushState({}, '', '/');
  localStorage.clear();
  document.body.innerHTML = '';
});

describe('jobsData.js demonstration catalog', () => {
  it('contains unique bilingual role examples without vacancy-specific claims', () => {
    expect(JOBS_DATA).toHaveLength(4);
    expect(new Set(JOBS_DATA.map((job) => job.slug)).size).toBe(JOBS_DATA.length);

    for (const job of JOBS_DATA) {
      expect(job.title.es).toBeTruthy();
      expect(job.title.en).toBeTruthy();
      expect(job.description.es).toMatch(/ejemplo|demostración/i);
      expect(job.description.en).toMatch(/example|demonstration/i);
      expect(job.exampleStatus).toMatch(/^(active|paused|closed)$/);
      expect(job).not.toHaveProperty('location');
      expect(job).not.toHaveProperty('mode');
      expect(job).not.toHaveProperty('type');
      expect(job).not.toHaveProperty('benefits');
      expect(job).not.toHaveProperty('postedAt');
    }
  });

  it('keeps active, paused and closed only as clearly illustrative states', () => {
    expect(new Set(getDemoJobs().map((job) => job.exampleStatus))).toEqual(new Set(['active', 'paused', 'closed']));
    expect(getJobBySlug(JOBS_DATA[0].slug)).toBe(JOBS_DATA[0]);
    expect(getJobBySlug('no-existe')).toBeNull();
  });
});

describe('JobsPage demonstration catalog', () => {
  it('labels the catalog and every card as a demonstration role, not an open vacancy', () => {
    renderWithLanguage(<JobsPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Catálogo de demostración' })).toBeInTheDocument();
    expect(screen.getAllByText('Catálogo de demostración')).toHaveLength(3);
    expect(screen.getByText(/no publica vacantes activas/i)).toBeInTheDocument();
    expect(screen.getAllByText('Ejemplo de rol')).toHaveLength(JOBS_DATA.length);
    expect(document.querySelectorAll('.v3-job-card')).toHaveLength(JOBS_DATA.length);
  });

  it('links each role example to its detail with an accessible label', () => {
    renderWithLanguage(<JobsPage />);
    for (const job of JOBS_DATA) {
      expect(screen.getByRole('link', { name: `Ver ejemplo de ${job.title.es}` }))
        .toHaveAttribute('href', `/empleos/${job.slug}`);
    }
  });

  it('translates catalog labels, H1 and role CTAs to English', () => {
    renderV3Route('/empleos');
    fireEvent.click(screen.getByRole('button', { name: 'EN' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Demonstration catalog' })).toBeInTheDocument();
    expect(screen.getAllByText('Demonstration catalog')).toHaveLength(4);
    expect(screen.getAllByText('Role example')).toHaveLength(JOBS_DATA.length);
    expect(screen.getByRole('link', { name: `View example: ${JOBS_DATA[0].title.en}` })).toBeInTheDocument();
  });
});

describe('JobDetailPage demonstration role', () => {
  it.each([
    ['active', 'Activo'],
    ['paused', 'Pausado'],
    ['closed', 'Cerrado'],
  ])('renders %s only as a non-vacancy example state in Spanish', (status, label) => {
    const job = JOBS_DATA.find((candidate) => candidate.exampleStatus === status);
    renderWithLanguage(<JobDetailPage params={{ slug: job.slug }} />);
    expect(screen.getByText('Ejemplo de rol')).toBeInTheDocument();
    expect(screen.getByLabelText(`Estado de ejemplo: ${label}. No es una vacante.`)).toBeInTheDocument();
    expect(screen.getByText(/no es una vacante y no recibe postulaciones/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /postular/i })).not.toBeInTheDocument();
  });

  it('uses informative navigation instead of an application CTA', () => {
    const { container } = renderWithLanguage(<JobDetailPage params={{ slug: JOBS_DATA[0].slug }} />);
    expect(screen.getByRole('link', { name: 'Explorar el portal candidato' })).toHaveAttribute('href', '/candidato');
    expect(screen.getByRole('link', { name: 'Volver al catálogo de demostración' })).toHaveAttribute('href', '/empleos');
    expect(container.querySelectorAll('.v3-job-section-icon')).toHaveLength(3);
    expect(container.querySelectorAll('.v3-job-bullet-check')).toHaveLength(6);
  });

  it('translates the detail, state and informational CTA to English', () => {
    renderV3Route(`/empleos/${JOBS_DATA[0].slug}`);
    fireEvent.click(screen.getByRole('button', { name: 'EN' }));
    expect(screen.getByText('Role example')).toBeInTheDocument();
    expect(screen.getByLabelText('Example state: Active. This is not a vacancy.')).toBeInTheDocument();
    expect(screen.getByText(/not a vacancy and does not accept applications/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explore the candidate portal' })).toHaveAttribute('href', '/candidato');
  });

  it('shows a localized not-found state with a catalog back link', () => {
    renderWithLanguage(<JobDetailPage params={{ slug: 'cargo-inexistente' }} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Ejemplo no encontrado' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al catálogo de demostración' })).toHaveAttribute('href', '/empleos');
  });
});
