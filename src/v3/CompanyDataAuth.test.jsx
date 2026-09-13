// A.2 (KRU-113): useCompanyData con sesión Cognito — Bearer en GET /sessions,
// refresh automático (token expirado / 401), y la regla pre-beta: authada y sin
// token recuperable → clearAuth + redirect al login (nunca demo silencioso
// bajo credenciales); visitante sin auth → fallback demo (showcase público).
import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../i18n/LanguageContext.jsx';
import { useCompanyData } from './useCompanyData.js';
import { AUTH_STORAGE_KEY, cognitoTokenUrl, getStoredAuth, storeAuth } from './cognitoAuth.js';

const TOKEN_URL = cognitoTokenUrl();
const bearerOf = (t) => ['Bearer', t].join(' ');

// Candidato mínimo con el shape v1 de /sessions (fetchCompanySessions exige
// candidates.length > 0 para no caer al fallback demo).
const CANDIDATE = {
  id: 's1',
  alias: 'alias-s1',
  role: 'Operations Analyst',
  status: 'ready',
  completedAt: '2026-08-01T10:00:00.000Z',
  completion: { completed: 4, total: 4 },
  constructs: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ id: `c${i}`, label: 'L', labelEn: 'L', score: 80, confidence: 0.5 })),
};
const okBody = { candidates: [CANDIDATE], total: 1, hasMore: false };

function Probe({ apiBase, fetchImpl, navigate }) {
  const data = useCompanyData({ apiBase, fetchImpl, navigate });
  return <div data-testid="probe-src">{data.source}</div>;
}

function expiredAuth(at = 'at-1', rt = 'rt-1') {
  sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
    accessToken: at,
    refreshToken: rt,
    idToken: null,
    exp: Date.now() - 1000,
    obtainedAt: Date.now() - 3600_000,
  }));
}

// fetchImpl enrutador: TOKEN_URL → token endpoint; resto → /sessions en orden.
function makeFetch(sessionResults, tokenResults = []) {
  const calls = { token: [], sessions: [] };
  let si = 0; let ti = 0;
  const fetchImpl = vi.fn(async (url, init) => {
    const respond = (r) => ({ ok: r.ok, status: r.status, json: async () => r.body });
    if (url === TOKEN_URL) {
      calls.token.push(init);
      return respond(tokenResults[ti++] ?? { ok: true, status: 200, body: { access_token: 'at-2', refresh_token: 'rt-2', expires_in: 3600 } });
    }
    calls.sessions.push({ url, init });
    return respond(sessionResults[si++] ?? { ok: true, status: 200, body: okBody });
  });
  return { fetchImpl, calls };
}

function renderProbe(fetchImpl, navigate) {
  return render(
    <LanguageProvider>
      <Probe apiBase="https://api.test" fetchImpl={fetchImpl} navigate={navigate} />
    </LanguageProvider>,
  );
}

describe('A.2 — useCompanyData: autenticación Cognito (Bearer / refresh / 401)', () => {
  const navigate = () => vi.fn();

  beforeEach(() => { sessionStorage.clear(); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('visitante sin auth: GET /sessions sin Authorization; real si responde 200', async () => {
    const { fetchImpl, calls } = makeFetch([{ ok: true, status: 200, body: okBody }]);
    renderProbe(fetchImpl, navigate());
    await waitFor(() => { expect(document.querySelector('[data-testid=probe-src]').textContent).toBe('real'); });
    expect(calls.sessions).toHaveLength(1);
    expect(calls.sessions[0].url).toBe('https://api.test/sessions?limit=50');
    expect(calls.sessions[0].init.headers.Authorization).toBeUndefined();
  });

  it('authed con token fresco: Authorization Bearer en el fetch', async () => {
    storeAuth({ access_token: 'at-1', refresh_token: 'rt-1', expires_in: 3600 });
    const { fetchImpl, calls } = makeFetch([{ ok: true, status: 200, body: okBody }]);
    renderProbe(fetchImpl, navigate());
    await waitFor(() => { expect(document.querySelector('[data-testid=probe-src]').textContent).toBe('real'); });
    expect(calls.sessions[0].init.headers.Authorization).toBe(bearerOf('at-1'));
    expect(calls.token).toHaveLength(0);
  });

  it('authed con token expirado: refresh único → Bearer del token nuevo', async () => {
    expiredAuth();
    const { fetchImpl, calls } = makeFetch(
      [{ ok: true, status: 200, body: okBody }],
      [{ ok: true, status: 200, body: { access_token: 'at-2', refresh_token: 'rt-2', expires_in: 3600 } }],
    );
    renderProbe(fetchImpl, navigate());
    await waitFor(() => { expect(document.querySelector('[data-testid=probe-src]').textContent).toBe('real'); });
    expect(calls.token).toHaveLength(1);
    expect(calls.token[0].body.get('refresh_token')).toBe('rt-1');
    expect(calls.sessions[0].init.headers.Authorization).toBe(bearerOf('at-2'));
    expect(getStoredAuth().accessToken).toBe('at-2'); // refresh persistido
  });

  it('401 con token fresco: refresh + retry único de /sessions', async () => {
    storeAuth({ access_token: 'at-1', refresh_token: 'rt-1', expires_in: 3600 });
    const { fetchImpl, calls } = makeFetch(
      [
        { ok: false, status: 401, body: {} },
        { ok: true, status: 200, body: okBody },
      ],
      [{ ok: true, status: 200, body: { access_token: 'at-2', refresh_token: 'rt-2', expires_in: 3600 } }],
    );
    renderProbe(fetchImpl, navigate());
    await waitFor(() => { expect(document.querySelector('[data-testid=probe-src]').textContent).toBe('real'); });
    expect(calls.sessions).toHaveLength(2);
    expect(calls.sessions[0].init.headers.Authorization).toBe(bearerOf('at-1'));
    expect(calls.sessions[1].init.headers.Authorization).toBe(bearerOf('at-2'));
  });

  it('401 + refresh falla: clearAuth + redirect al login (sin demo silencioso)', async () => {
    storeAuth({ access_token: 'at-1', refresh_token: 'rt-1', expires_in: 3600 });
    const nav = vi.fn();
    const { fetchImpl } = makeFetch(
      [{ ok: false, status: 401, body: {} }],
      [{ ok: false, status: 400, body: { error: 'expired_token' } }],
    );
    renderProbe(fetchImpl, nav);
    await waitFor(() => { expect(nav).toHaveBeenCalledWith('/empresa/acceso'); });
    expect(getStoredAuth()).toBeNull();
  });

  it('authed + 403 (token válido, sin grupo): clearAuth + redirect al login, sin refresh', async () => {
    storeAuth({ access_token: 'at-1', refresh_token: 'rt-1', expires_in: 3600 });
    const nav = vi.fn();
    const { fetchImpl, calls } = makeFetch([{ ok: false, status: 403, body: { error: 'forbidden' } }]);
    renderProbe(fetchImpl, nav);
    await waitFor(() => { expect(nav).toHaveBeenCalledWith('/empresa/acceso'); });
    expect(getStoredAuth()).toBeNull();
    expect(calls.token).toHaveLength(0); // 403 no intenta refresh
  });

  it('token expirado + refresh falla: clearAuth + redirect al login', async () => {
    expiredAuth();
    const nav = vi.fn();
    const { fetchImpl } = makeFetch(
      [{ ok: false, status: 401, body: {} }],
      [{ ok: false, status: 400, body: { error: 'expired_token' } }],
    );
    renderProbe(fetchImpl, nav);
    await waitFor(() => { expect(nav).toHaveBeenCalledWith('/empresa/acceso'); });
    expect(getStoredAuth()).toBeNull();
  });

  it('visitante sin auth + 401 (authorizer activo): fallback demo, sin redirect', async () => {
    const nav = vi.fn();
    const { fetchImpl } = makeFetch([{ ok: false, status: 401, body: {} }]);
    renderProbe(fetchImpl, nav);
    await waitFor(() => { expect(document.querySelector('[data-testid=probe-src]').textContent).toBe('demo'); });
    expect(nav).not.toHaveBeenCalled();
  });
});
