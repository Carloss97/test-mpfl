import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PostulationConsentSetup from './PostulationConsentSetup.jsx';
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

describe('PostulationConsentSetup H3.2 — LanguageToggle', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('muestra el toggle ES/EN en el setup y cambia el copy con persistencia', () => {
    render(
      <LanguageProvider>
        <PostulationConsentSetup
          signalSnapshot={null}
          onContinue={vi.fn()}
          onBack={vi.fn()}
          onEnableCamera={vi.fn()}
        />
      </LanguageProvider>,
    );

    expect(screen.getByRole('heading', { name: /Preparación de la sesión/i })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /Idioma \/ Language/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'EN' }));
    expect(window.localStorage.getItem('krumm-lang')).toBe('en');
    expect(screen.getByRole('heading', { name: /Session preparation/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue to games/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /EN/ })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'ES' }));
    expect(window.localStorage.getItem('krumm-lang')).toBe('es');
    expect(screen.getByRole('heading', { name: /Preparación de la sesión/i })).toBeInTheDocument();
  });

  it('render sin provider (fallback useLanguage) no rompe el setup', () => {
    render(
      <PostulationConsentSetup
        signalSnapshot={null}
        onContinue={vi.fn()}
        onBack={vi.fn()}
        onEnableCamera={vi.fn()}
      />,
    );

    expect(screen.getByRole('group', { name: /Idioma \/ Language/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Preparación de la sesión/i })).toBeInTheDocument();
  });
});
