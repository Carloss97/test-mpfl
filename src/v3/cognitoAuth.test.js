// A.2 (KRU-113): tests de cognitoAuth.js — PKCE, OAuth URLs, callback,
// storage. Todo inyectable: sin crypto.subtle real ni navegación en jsdom.
import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  AUTH_STORAGE_KEY,
  PENDING_AUTH_KEY,
  base64Url,
  beginCognitoLogin,
  buildAuthorizeUrl,
  clearAuth,
  cognitoAuthorizeUrl,
  cognitoLogoutUrl,
  cognitoTokenUrl,
  createPkce,
  exchangeCodeForTokens,
  generatePkceVerifier,
  getPendingAuth,
  getStoredAuth,
  handleAuthCallback,
  isTokenFresh,
  pkceChallenge,
  refreshAccessToken,
  refreshStoredAuth,
  savePendingAuth,
  storeAuth,
} from './cognitoAuth.js';

// subtle determinista: SHA-256 fake pero estable (digest fijo de 32 bytes).
const fakeSubtle = {
  digest: async () => new Uint8Array(32).map((_, i) => (i + 1) & 0xff),
};
const fakeRandom = (arr) => { for (let i = 0; i < arr.length; i += 1) arr[i] = (i * 7) % 256; return arr; };
const fakeSubtleChallenge = async () => base64Url(new Uint8Array(32).map((_, i) => (i + 1) & 0xff));

function tokens(overrides = {}) {
  return {
    access_token: 'at-1',
    refresh_token: 'rt-1',
    id_token: 'idt-1',
    expires_in: 3600,
    token_type: 'Bearer',
    ...overrides,
  };
}

describe('cognitoAuth (A.2 — login Cognito empresas)', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  describe('PKCE', () => {
    it('verifier: longitud y charset RFC 7636', () => {
      const v = generatePkceVerifier({ random: fakeRandom });
      expect(v.length).toBe(64);
      expect(v).toMatch(/^[A-Za-z0-9\-._~]+$/);
    });

    it('challenge = base64url(sha256(verifier)) vía subtle inyectado', async () => {
      const challenge = await pkceChallenge('verifier-value', fakeSubtle);
      // digest fake: bytes 1..32 → base64url conocido
      expect(challenge).toBe(base64Url(new Uint8Array(32).map((_, i) => (i + 1) & 0xff)));
      expect(challenge).not.toMatch(/[+/=]/);
    });

    it('createPkce retorna {verifier, challenge, state} coherente', async () => {
      const pair = await createPkce({ random: fakeRandom, subtle: fakeSubtle });
      expect(pair.verifier).toMatch(/^[A-Za-z0-9\-._~]{43,128}$/);
      expect(pair.state).toMatch(/^[A-Za-z0-9\-._~]+$/);
      expect(pair.challenge).toBe(await fakeSubtleChallenge());
    });
  });

  describe('URLs OAuth', () => {
    it('buildAuthorizeUrl: params completos con code_challenge S256', () => {
      const url = buildAuthorizeUrl({ redirectUri: 'https://stage.krumm.cl/empresa/acceso', state: 'st-1', challenge: 'ch-1' });
      expect(url.startsWith(cognitoAuthorizeUrl() + '?')).toBe(true);
      const params = new URLSearchParams(url.split('?')[1]);
      expect(params.get('response_type')).toBe('code');
      expect(params.get('client_id')).toMatch(/^[a-z0-9]{20,}$/);
      expect(params.get('redirect_uri')).toBe('https://stage.krumm.cl/empresa/acceso');
      expect(params.get('scope')).toBe('openid email profile');
      expect(params.get('state')).toBe('st-1');
      expect(params.get('code_challenge')).toBe('ch-1');
      expect(params.get('code_challenge_method')).toBe('S256');
    });

    it('token/logout apuntan al host del pool', () => {
      expect(cognitoTokenUrl()).toMatch(/^https:\/\/.+\.auth\.us-east-1\.amazoncognito\.com\/oauth2\/token$/);
      expect(cognitoLogoutUrl()).toMatch(/\/logout\?client_id=/);
    });
  });

  describe('exchange / refresh', () => {
    it('exchangeCodeForTokens: POST form con code + code_verifier + redirect_uri', async () => {
      const calls = [];
      const fetchImpl = async (url, init) => {
        calls.push({ url, init });
        return { ok: true, status: 200, json: async () => tokens() };
      };
      const out = await exchangeCodeForTokens({ code: 'abc', codeVerifier: 'ver', redirectUri: 'https://x/empresa/acceso', fetchImpl });
      expect(out.access_token).toBe('at-1');
      expect(calls[0].url).toBe(cognitoTokenUrl());
      expect(calls[0].init.method).toBe('POST');
      const body = calls[0].init.body;
      expect(body.get('grant_type')).toBe('authorization_code');
      expect(body.get('code')).toBe('abc');
      expect(body.get('code_verifier')).toBe('ver');
      expect(body.get('redirect_uri')).toBe('https://x/empresa/acceso');
      expect(body.get('client_id')).toMatch(/^[a-z0-9]{20,}$/);
    });

    it('exchange falla → error con code de Cognito', async () => {
      const fetchImpl = async () => ({ ok: false, status: 400, json: async () => ({ error: 'invalid_grant' }) });
      await expect(exchangeCodeForTokens({ code: 'x', codeVerifier: 'v', redirectUri: 'https://x', fetchImpl }))
        .rejects.toMatchObject({ code: 'invalid_grant' });
    });

    it('refreshAccessToken: grant_type=refresh_token', async () => {
      const calls = [];
      const fetchImpl = async (url, init) => { calls.push(init); return { ok: true, status: 200, json: async () => tokens({ access_token: 'at-2' }) }; };
      const out = await refreshAccessToken({ refreshToken: 'rt-1', fetchImpl });
      expect(out.access_token).toBe('at-2');
      expect(calls[0].body.get('grant_type')).toBe('refresh_token');
      expect(calls[0].body.get('refresh_token')).toBe('rt-1');
    });
  });

  describe('storage de sesión', () => {
    it('storeAuth persiste con exp absoluto y se lee con getStoredAuth', () => {
      const now = 1_000_000_000;
      storeAuth(tokens(), { now: () => now });
      const auth = getStoredAuth({ now: () => now });
      expect(auth.accessToken).toBe('at-1');
      expect(auth.refreshToken).toBe('rt-1');
      expect(auth.exp).toBe(now + 3600 * 1000);
    });

    it('isTokenFresh: skew de 30 s', () => {
      const now = 1_000_000_000;
      const auth = storeAuth(tokens(), { now: () => now });
      expect(isTokenFresh(auth, { now: () => now + 29_000 })).toBe(true);
      expect(isTokenFresh(auth, { now: () => now + 3600 * 1000 - 29_000 })).toBe(false);
      expect(isTokenFresh(auth, { now: () => now + 3600 * 1000 + 1 })).toBe(false);
    });

    it('clearAuth borra auth + pending', () => {
      storeAuth(tokens());
      savePendingAuth({ state: 's', verifier: 'v', redirectUri: 'r' });
      clearAuth();
      expect(getStoredAuth()).toBeNull();
      expect(getPendingAuth()).toBeNull();
      expect(sessionStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
      expect(sessionStorage.getItem(PENDING_AUTH_KEY)).toBeNull();
    });

    it('getStoredAuth tolera JSON corrupto (null, sin throw)', () => {
      sessionStorage.setItem(AUTH_STORAGE_KEY, '{no-json');
      expect(getStoredAuth()).toBeNull();
    });

    it('refreshStoredAuth: refresca + persiste (rt válido); null si falla o no hay rt', async () => {
      const fetchImpl = async () => ({ ok: true, status: 200, json: async () => tokens({ access_token: 'at-2', refresh_token: 'rt-2' }) });
      const auth = storeAuth(tokens());
      const refreshed = await refreshStoredAuth(auth, { fetchImpl });
      expect(refreshed.accessToken).toBe('at-2');
      expect(getStoredAuth().accessToken).toBe('at-2');
      expect(await refreshStoredAuth({ ...auth, refreshToken: null }, { fetchImpl })).toBeNull();
      const badFetch = async () => ({ ok: false, status: 400, json: async () => ({ error: 'expired_token' }) });
      expect(await refreshStoredAuth(auth, { fetchImpl: badFetch })).toBeNull();
    });
  });

  describe('beginCognitoLogin (orquestación)', () => {
    it('genera PKCE, guarda pending y navega al authorize URL', async () => {
      const navigate = vi.fn();
      await beginCognitoLogin({
        origin: 'https://stage.krumm.cl',
        createPkcePair: async () => ({ verifier: 'ver-1', challenge: 'ch-1', state: 'st-1' }),
        navigate,
      });
      const pending = getPendingAuth();
      expect(pending).toMatchObject({ state: 'st-1', verifier: 'ver-1', redirectUri: 'https://stage.krumm.cl/empresa/acceso' });
      expect(navigate).toHaveBeenCalledTimes(1);
      const url = navigate.mock.calls[0][0];
      expect(url).toContain('code_challenge=ch-1');
      expect(url).toContain('code_challenge_method=S256');
      expect(url).toContain('state=st-1');
    });
  });

  describe('handleAuthCallback (retorno con ?code=)', () => {
    function setup() {
      const navigate = vi.fn();
      const params = (qs) => new URLSearchParams(qs);
      return { navigate, params };
    }

    it('code+state válidos: exchange → store → navigate /empresa', async () => {
      const { navigate, params } = setup();
      savePendingAuth({ state: 'st-1', verifier: 'ver-1', redirectUri: 'https://stage.krumm.cl/empresa/acceso' });
      const exchange = vi.fn(async () => tokens());
      const out = await handleAuthCallback({
        searchParams: params('code=c-1&state=st-1'),
        exchange,
        navigate,
      });
      expect(out).toMatchObject({ ok: true });
      expect(exchange).toHaveBeenCalledWith({ code: 'c-1', codeVerifier: 'ver-1', redirectUri: 'https://stage.krumm.cl/empresa/acceso' });
      expect(getStoredAuth().accessToken).toBe('at-1');
      expect(navigate).toHaveBeenCalledWith('/empresa');
      expect(getPendingAuth()).toBeNull(); // clearAuth al terminar (store no borra pending; el clear post-exchange ocurre por éxito? no — ver abajo)
    });

    it('state mismatch → clear + error', async () => {
      const { navigate, params } = setup();
      savePendingAuth({ state: 'st-1', verifier: 'ver-1', redirectUri: 'r' });
      const out = await handleAuthCallback({
        searchParams: params('code=c-1&state=st-OTRO'),
        navigate,
      });
      expect(out).toMatchObject({ ok: false, reason: 'state_mismatch' });
      expect(getStoredAuth()).toBeNull();
      expect(navigate).toHaveBeenCalledWith('/empresa/acceso?error=auth_state_mismatch');
    });

    it('exchange falla → clear + error auth_exchange_failed', async () => {
      const { navigate, params } = setup();
      savePendingAuth({ state: 'st-1', verifier: 'ver-1', redirectUri: 'r' });
      const exchange = vi.fn(async () => { throw Object.assign(new Error('x'), { code: 'invalid_grant' }); });
      const out = await handleAuthCallback({ searchParams: params('code=c-1&state=st-1'), exchange, navigate });
      expect(out).toMatchObject({ ok: false, reason: 'exchange_failed', code: 'invalid_grant' });
      expect(getStoredAuth()).toBeNull();
      expect(navigate).toHaveBeenCalledWith('/empresa/acceso?error=auth_exchange_failed');
    });

    it('sin pending (tab cerrada / refresh) → error missing_pending', async () => {
      const { navigate, params } = setup();
      const out = await handleAuthCallback({ searchParams: params('code=c-1&state=st-1'), navigate });
      expect(out).toMatchObject({ ok: false, reason: 'missing_pending' });
      expect(navigate).toHaveBeenCalledWith(expect.stringContaining('error='));
    });
  });
});
