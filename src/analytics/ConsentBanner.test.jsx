// F.1 (KRU-118): tests del banner de consentimiento de analytics.
// Forma documentada en docs/legal/politica-privacidad.md: "Aceptar analytics"
// / "Solo esenciales" + decisión en cookie_consent (1 año).
// El banner solo se muestra si hay key de build (analytics configurado).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// posthog-js mocked (variante no-external, la MISMA ruta que importa
// analytics.js): sin el mock, el test "Aceptar analytics" carga la librería
// REAL en jsdom (setConsent → bootstrap → import) → rejection no controlada
// que rompe CI (timing-dependente). Factory estable (se cachea) +
// vi.clearAllMocks() entre tests.
vi.mock('posthog-js/dist/module.no-external.js', () => ({
  default: { init: vi.fn(), page: vi.fn(), capture: vi.fn(), reset: vi.fn() },
}));

// Key de build simulada ANTES del import del módulo (lee import.meta.env al cargar).
vi.stubEnv('VITE_POSTHOG_API', 'test_project_credential');
const { default: ConsentBanner } = await import('./ConsentBanner.jsx');
const { LanguageProvider } = await import('../i18n/LanguageContext.jsx');

function renderBanner() {
  return render(
    <LanguageProvider>
      <ConsentBanner />
    </LanguageProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  // jsdom: borrar cookie con 'expires' en el pasado (max-age=0 no siempre respeta).
  document.cookie = 'cookie_consent=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
});

describe('ConsentBanner (con key de build)', () => {
  it('sin cookie: visible con los dos botones (forma de la política)', () => {
    renderBanner();
    expect(screen.getByTestId('consent-essential')).toHaveTextContent('Solo esenciales');
    expect(screen.getByTestId('consent-analytics')).toHaveTextContent('Aceptar analytics');
  });

  it('"Aceptar analytics": escribe cookie_consent=analytics y oculta el banner', () => {
    renderBanner();
    fireEvent.click(screen.getByTestId('consent-analytics'));
    expect(document.cookie).toContain('cookie_consent=analytics');
    expect(screen.queryByTestId('consent-analytics')).toBeNull();
  });

  it('"Solo esenciales": escribe cookie_consent=essential y oculta el banner', () => {
    renderBanner();
    fireEvent.click(screen.getByTestId('consent-essential'));
    expect(document.cookie).toContain('cookie_consent=essential');
    expect(screen.queryByTestId('consent-essential')).toBeNull();
  });

  it('con cookie previa: nunca se muestra', () => {
    document.cookie = 'cookie_consent=essential; path=/';
    renderBanner();
    expect(screen.queryByTestId('consent-analytics')).toBeNull();
    expect(screen.queryByTestId('consent-essential')).toBeNull();
  });
});

describe('ConsentBanner (sin key de build)', () => {
  it('nunca se muestra: no hay analítica que consentir', async () => {
    vi.resetModules();
    vi.unstubAllEnvs();
    document.cookie = 'cookie_consent=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    const fresh = await import('./ConsentBanner.jsx');
    const tree = render(
      <LanguageProvider>
        <fresh.default />
      </LanguageProvider>,
    );
    expect(tree.baseElement.textContent).not.toContain('Aceptar analytics');
  });
});
