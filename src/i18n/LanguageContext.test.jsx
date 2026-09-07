import React from 'react';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LanguageToggle from './LanguageToggle.jsx';
import { LanguageProvider, SUPPORTED_LANGUAGES, useLanguage } from './LanguageContext.jsx';

const STORAGE_KEY = 'krumm-lang';

// jsdom corre con URL about:blank (sin origin) → window.localStorage es undefined.
// Mock de módulo (patrón App.test.jsx): cada archivo de test recibe su propio jsdom.
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

function wrapper({ children }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}

function setQuery(search) {
  window.history.replaceState(null, '', search ? `/?${search}` : '/');
}

describe('LanguageContext (H3.1 — persistencia localStorage)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setQuery('');
    document.documentElement.lang = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('soporta solo es y en, y el default es es', () => {
    expect(SUPPORTED_LANGUAGES).toEqual(['es', 'en']);
    const { result } = renderHook(() => useLanguage(), { wrapper });
    expect(result.current.language).toBe('es');
  });

  it('setLanguage("en") actualiza contexto, t() y localStorage', () => {
    const { result } = renderHook(() => useLanguage(), { wrapper });
    act(() => {
      result.current.setLanguage('en');
    });
    expect(result.current.language).toBe('en');
    expect(result.current.t('Hola', 'Hi')).toBe('Hi');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('en');
  });

  it('setLanguage ignora idiomas no soportados', () => {
    const { result } = renderHook(() => useLanguage(), { wrapper });
    act(() => {
      result.current.setLanguage('fr');
    });
    expect(result.current.language).toBe('es');
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBe('fr');
  });

  it('toggle alterna es<->en y persiste cada cambio', () => {
    const { result } = renderHook(() => useLanguage(), { wrapper });
    act(() => result.current.toggle());
    expect(result.current.language).toBe('en');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('en');
    act(() => result.current.toggle());
    expect(result.current.language).toBe('es');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('es');
  });

  it('hidrata desde localStorage ANTES del primer render (sin flash)', () => {
    window.localStorage.setItem(STORAGE_KEY, 'en');
    const { result } = renderHook(() => useLanguage(), { wrapper });
    // Sin act(): el primer render ya debe traer el idioma persistido.
    expect(result.current.language).toBe('en');
    expect(result.current.t('Hola', 'Hi')).toBe('Hi');
  });

  it('recarga de la app preserva el idioma (provider nuevo lee storage)', () => {
    const first = renderHook(() => useLanguage(), { wrapper });
    act(() => first.result.current.setLanguage('en'));
    first.unmount(); // simula la navegación/recarga
    const second = renderHook(() => useLanguage(), { wrapper });
    expect(second.result.current.language).toBe('en');
    second.unmount();
  });

  it('?lang=en tiene prioridad sobre localStorage (deep-link)', () => {
    window.localStorage.setItem(STORAGE_KEY, 'es');
    setQuery('lang=en');
    const { result } = renderHook(() => useLanguage(), { wrapper });
    expect(result.current.language).toBe('en');
  });

  it('?lang inválido cae a localStorage y luego a es', () => {
    window.localStorage.setItem(STORAGE_KEY, 'en');
    setQuery('lang=xx');
    const { result } = renderHook(() => useLanguage(), { wrapper });
    expect(result.current.language).toBe('en');
    setQuery('');
    window.localStorage.clear();
    const { result: fallback } = renderHook(() => useLanguage(), { wrapper });
    expect(fallback.current.language).toBe('es');
  });

  it('actualiza <html lang> al cambiar de idioma', () => {
    const { result } = renderHook(() => useLanguage(), { wrapper });
    expect(document.documentElement.lang).toBe('es');
    act(() => result.current.setLanguage('en'));
    expect(document.documentElement.lang).toBe('en');
  });

  it('sin storage disponible (private mode): no lanza y sigue funcionando en memoria', () => {
    const storageError = new Error('Storage not available');
    vi.spyOn(localStorageMock, 'getItem').mockImplementation(() => {
      throw storageError;
    });
    vi.spyOn(localStorageMock, 'setItem').mockImplementation(() => {
      throw storageError;
    });
    const { result } = renderHook(() => useLanguage(), { wrapper });
    expect(result.current.language).toBe('es');
    expect(() => act(() => result.current.toggle())).not.toThrow();
    expect(result.current.language).toBe('en');
    expect(result.current.t('Hola', 'Hi')).toBe('Hi');
  });

  it('useLanguage sin provider: fallback estable (no rompe la app)', () => {
    const { result } = renderHook(() => useLanguage());
    expect(result.current.language).toBe('es');
    expect(result.current.t('Hola', 'Hi')).toBe('Hola');
    expect(() => act(() => {
      result.current.setLanguage('en');
      result.current.toggle();
    })).not.toThrow();
  });

  it('LanguageToggle: clic EN -> contexto + localStorage; clic ES -> vuelve', () => {
    render(
      <LanguageProvider>
        <LanguageToggle />
      </LanguageProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'EN' }));
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('en');
    expect(screen.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'ES' }));
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('es');
    expect(screen.getByRole('button', { name: 'ES' })).toHaveAttribute('aria-pressed', 'true');
  });
});
