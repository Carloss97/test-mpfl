// A.2 (KRU-113): CompanyLoginPage — retorno del hosted UI (?code=&state=),
// estados de error, sesión ya autenticada. El exchange real contra Cognito
// va por global fetch (stubbed) — misma URL que cognitoTokenUrl().
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../i18n/LanguageContext.jsx';
import V3RootApp from './V3RootApp.jsx';
import { V3_COPY } from './v3Copy.js';
import {
  cognitoTokenUrl,
  getPendingAuth,
  getStoredAuth,
  savePendingAuth,
  storeAuth,
} from './cognitoAuth.js';

const TOKEN_URL = cognitoTokenUrl();

function renderRoute(pathname) {
  window.history.pushState({}, '', pathname);
  return render(
    <LanguageProvider>
      <V3RootApp />
    </LanguageProvider>,
  );
}

function stubTokenEndpoint(tokensOut, { fail = false } = {}) {
  return vi.fn(async (url) => {
    if (url === TOKEN_URL) {
      if (fail) return { ok: false, status: 400, json: async () => ({ error: 'invalid_grant' }) };
      return { ok: true, status: 200, json: async () => tokensOut };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  });
}

const okTokens = {
  access_token: 'at-callback',
  refresh_token: 'rt-callback',
  id_token: 'idt-callback',
  expires_in: 3600,
  token_type: 'Bearer',
};

describe('A.2 — CompanyLoginPage (/empresa/acceso)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.pushState({}, '', '/');
  });

  it('retorno ?code=&state= con pending válido: exchange → auth en sessionStorage + pending limpiado', async () => {
    savePendingAuth({ state: 'st-1', verifier: 'ver-1', redirectUri: 'https://stage.krumm.cl/empresa/acceso' });
    const tokenFetch = stubTokenEndpoint(okTokens);
    vi.stubGlobal('fetch', tokenFetch);
    renderRoute('/empresa/acceso?code=c-1&state=st-1');
    await waitFor(() => {
      expect(getStoredAuth()?.accessToken).toBe('at-callback');
    });
    expect(getPendingAuth()).toBeNull();
    expect(tokenFetch).toHaveBeenCalledWith(TOKEN_URL, expect.objectContaining({ method: 'POST' }));
  });

  it('state mismatch → estado de error visible + sin auth', async () => {
    savePendingAuth({ state: 'st-OTRO', verifier: 'v', redirectUri: 'r' });
    const tokenFetch = stubTokenEndpoint(okTokens);
    vi.stubGlobal('fetch', tokenFetch);
    renderRoute('/empresa/acceso?code=c-1&state=st-1');
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(V3_COPY.es.pages.companyAccess.errorTitle);
    });
    expect(getStoredAuth()).toBeNull();
  });

  it('exchange falla (invalid_grant) → estado de error + sin auth', async () => {
    savePendingAuth({ state: 'st-1', verifier: 'v', redirectUri: 'r' });
    vi.stubGlobal('fetch', stubTokenEndpoint(okTokens, { fail: true }));
    renderRoute('/empresa/acceso?code=c-1&state=st-1');
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(V3_COPY.es.pages.companyAccess.errorText);
    });
    expect(getStoredAuth()).toBeNull();
  });

  it('sin pending (refresh de la URL / tab cerrada) → estado de error', async () => {
    renderRoute('/empresa/acceso?code=c-1&state=st-1');
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(V3_COPY.es.pages.companyAccess.errorTitle);
    });
    expect(getStoredAuth()).toBeNull();
  });

  it('?error=auth_exchange_failed → estado de error directo', async () => {
    renderRoute('/empresa/acceso?error=auth_exchange_failed');
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('con sesión fresca en sessionStorage: CTA al workspace + logout', async () => {
    storeAuth(okTokens);
    renderRoute('/empresa/acceso');
    await waitFor(() => {
      expect(screen.getByTestId('v3-company-authed-cta')).toHaveAttribute('href', '/empresa');
    });
    expect(screen.getByTestId('v3-company-logout')).toBeInTheDocument();
    expect(screen.queryByTestId('v3-company-login')).toBeNull();
  });

  it('click "Iniciar sesión": PKCE real (webcrypto presente), pending guardado, navegación al authorize', async () => {
    renderRoute('/empresa/acceso');
    const btn = await screen.findByRole('button', { name: V3_COPY.es.pages.companyAccess.loginCta });
    fireEvent.click(btn);
    await waitFor(() => {
      const pending = getPendingAuth();
      expect(pending?.state).toBeTruthy();
      expect(pending?.verifier).toMatch(/^[A-Za-z0-9\-._~]{43,128}$/);
      expect(pending?.redirectUri).toBe(`${window.location.origin}/empresa/acceso`);
    });
  }, 20000);
});
