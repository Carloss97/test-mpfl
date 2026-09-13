// F.1 (KRU-118): tests del banner de consentimiento de analytics.
// Forma documentada en docs/legal/politica-privacidad.md: "Aceptar analytics"
// / "Solo esenciales" + decisión en cookie_consent (1 año).
import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ConsentBanner from './ConsentBanner.jsx';
import { LanguageProvider } from '../i18n/LanguageContext.jsx';

function renderBanner() {
  return render(
    <LanguageProvider>
      <ConsentBanner />
    </LanguageProvider>,
  );
}

beforeEach(() => {
  // jsdom: borrar cookie con 'expires' en el pasado (max-age=0 no siempre respeta).
  document.cookie = 'cookie_consent=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
});

describe('ConsentBanner', () => {
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
