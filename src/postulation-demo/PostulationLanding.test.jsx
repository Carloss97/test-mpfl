import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PostulationLanding from './PostulationLanding.jsx';
import { POSTULATION_DEMO_BATTERY_MODES } from './postulationDemoConfig.js';
import { LanguageProvider } from '../i18n/LanguageContext.jsx';

// jsdom corre con URL about:blank (sin origin) → window.localStorage es undefined.
// Mock de módulo (patrón LanguageContext.test.jsx): cada archivo de test recibe su propio jsdom.
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock, configurable: true });

describe('PostulationLanding HR dashboard access', () => {
  it('offers a separate HR dashboard link without replacing the candidate CTA', () => {
    render(<PostulationLanding onStart={vi.fn()} batteryMode={POSTULATION_DEMO_BATTERY_MODES.ORIGINAL_GAMES} />);

    expect(screen.getByRole('button', { name: /Comenzar prueba de postulación/i })).toBeInTheDocument();
    const hrLink = screen.getByRole('link', { name: /Abrir vista reclutador/i });
    expect(hrLink).toHaveAttribute('href', '/reclutador');
    expect(hrLink.closest('.postulation-demo__brief')).not.toBeNull();
    expect(screen.getByText(/14–16 min/i)).toBeInTheDocument();
    expect(screen.getByText(/Sesión local · batería original/i)).toBeInTheDocument();
    expect(screen.getByText(/no reduce el desempeño de los juegos/i)).toBeInTheDocument();
  });
});

describe('PostulationLanding H3.2 — LanguageToggle', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('muestra el toggle ES/EN en la landing interna y cambia el copy con persistencia', () => {
    render(
      <LanguageProvider>
        <PostulationLanding onStart={vi.fn()} batteryMode={POSTULATION_DEMO_BATTERY_MODES.ORIGINAL_GAMES} />
      </LanguageProvider>,
    );

    expect(screen.getByRole('group', { name: /Idioma \/ Language/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /KRUMM Postulaciones/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'EN' }));
    expect(window.localStorage.getItem('krumm-lang')).toBe('en');
    expect(screen.getByRole('heading', { name: /KRUMM Applications/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Start application assessment/i })).toBeInTheDocument();
    expect(screen.getByText(/Open recruiter view/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'ES' }));
    expect(window.localStorage.getItem('krumm-lang')).toBe('es');
    expect(screen.getByRole('heading', { name: /KRUMM Postulaciones/i })).toBeInTheDocument();
  });
});
