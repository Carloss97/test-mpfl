// G.2 (KRU): Sentry frontend — init opcional + sanitización + ErrorBoundary.
// Reglas: docs/security/error-tracking.md (NUNCA payloads de sesión/bio/PII).
import { describe, expect, it, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// init mockeado (no toca la red ni registra handlers globales en tests);
// ErrorBoundary usa el real (viene de importOriginal).
vi.mock('@sentry/react', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, init: vi.fn() };
});

import {
  initSentry,
  sentryConfig,
  sanitizeBreadcrumb,
  sanitizeEvent,
  FORBIDDEN_BREADCRUMB_CATEGORIES,
  ErrorBoundary,
} from './sentry.js';
import SentryFallback from './SentryFallback.jsx';

describe('G.2 Sentry frontend', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('sin DSN (default de test): deshabilitado, initSentry() = false (no-op seguro)', () => {
    expect(sentryConfig.enabled).toBe(false);
    expect(initSentry()).toBe(false);
  });

  it('con DSN (env stub): habilitado, initSentry() = true', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://abc123@o1.ingest.us.sentry.io/1');
    vi.resetModules();
    const mod = await import('./sentry.js');
    expect(mod.sentryConfig.enabled).toBe(true);
    expect(mod.initSentry()).toBe(true);
  });

  describe('sanitizeBreadcrumb', () => {
    it('descarta categorías prohibidas (sesión/telemetría/bio/respuesta)', () => {
      for (const cat of FORBIDDEN_BREADCRUMB_CATEGORIES) {
        expect(sanitizeBreadcrumb({ category: cat, message: 'x' })).toBeNull();
      }
    });

    it('limpia data: strings truncados a 500, números OK, objetos/arrays fuera', () => {
      const crumb = sanitizeBreadcrumb({
        category: 'fetch',
        data: {
          url: '/sessions',
          status: 500,
          longMsg: 'x'.repeat(600),
          sessionPayload: { sessionId: 'S1', samples: [1, 2, 3] },
        },
      });
      expect(crumb.data.url).toBe('/sessions');
      expect(crumb.data.status).toBe(500);
      expect(crumb.data.longMsg).toHaveLength(500);
      expect(crumb.data.sessionPayload).toBeUndefined();
    });

    it('breadcrumb sin data pasa intacto', () => {
      const crumb = { category: 'navigation', message: '/portal → /empresa' };
      expect(sanitizeBreadcrumb(crumb)).toEqual(crumb);
    });
  });

  describe('sanitizeEvent', () => {
    it('elimina tags de sesión/bio/PII y conserva los neutros', () => {
      const event = sanitizeEvent({
        tags: {
          session_id: 'S1',
          token: 'jwt',
          email: 'x@y.cl',
          blendshape: 'v',
          route: '/empresa',
          http_status: 500,
        },
      });
      expect(event.tags).toEqual({ route: '/empresa', http_status: 500 });
    });

    it('event sin tags pasa intacto', () => {
      const event = { message: 'boom' };
      expect(sanitizeEvent(event)).toEqual(event);
    });
  });

  it('ErrorBoundary: error de React → fallback de marca + Recargar', () => {
    function Boom() {
      throw new Error('boom-g2');
    }
    render(
      <ErrorBoundary fallback={<SentryFallback />}>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Algo salió mal')).toBeInTheDocument();
    const btn = screen.getByRole('button', { name: /Recargar/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn); // resetErrorBoundary no debe explotar
  });
});
