// A.2 (KRU-113): autenticación Cognito para el portal de empresas (pre-beta).
//
// Flujo: Authorization Code + PKCE S256 (cliente SPA público, sin secret).
//   /empresa/acceso → botón "Iniciar sesión" → Cognito hosted UI →
//   retorno a /empresa/acceso?code=..&state=.. → exchange en /oauth2/token →
//   sessionStorage (token en memoria de sesión; sin cookie, sin localStorage).
//
// Diseño testable: toda la lógica pura (PKCE, URLs, callback, storage) es
// inyectable (random, subtle, fetch, navigate, now) — los tests jsdom no
// dependen de crypto.subtle ni de navegación real.
//
// Config pre-beta: pool/client fijos del stack staging (ver AGENTS.md).
// Overrides por env Vite: VITE_KRUMM_COGNITO_HOST / VITE_KRUMM_COGNITO_CLIENT.

const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};

export const COGNITO_CONFIG = Object.freeze({
  poolId: env.VITE_KRUMM_COGNITO_POOL ?? 'us-east-1_FX1VyzTTA',
  poolName: env.VITE_KRUMM_COGNITO_POOL_NAME ?? 'krumm-staging-recruiters',
  clientId: env.VITE_KRUMM_COGNITO_CLIENT ?? '7vpliahah8jbc5fh0d59qbjgej',
  region: env.VITE_KRUMM_COGNITO_REGION ?? 'us-east-1',
  scope: 'openid email profile',
});

export const AUTH_STORAGE_KEY = 'krumm_company_auth_v1';
export const PENDING_AUTH_KEY = 'krumm_auth_pending_v1';

export function cognitoHost() {
  return env.VITE_KRUMM_COGNITO_HOST
    ?? `${COGNITO_CONFIG.poolName}.auth.${COGNITO_CONFIG.region}.amazoncognito.com`;
}

export function cognitoAuthorizeUrl() {
  return `https://${cognitoHost()}/oauth2/authorize`;
}
export function cognitoTokenUrl() {
  return `https://${cognitoHost()}/oauth2/token`;
}
export function cognitoLogoutUrl() {
  // logout_uri debe coincidir con una LogoutURL registrada en el client
  // (krumm.cl/empresa + stage.krumm.cl/empresa).
  const redirect = typeof window !== 'undefined' ? `${window.location.origin}/empresa` : 'https://krumm.cl/empresa';
  return `https://${cognitoHost()}/logout?client_id=${encodeURIComponent(COGNITO_CONFIG.clientId)}&logout_uri=${encodeURIComponent(redirect)}`;
}

// ── PKCE ─────────────────────────────────────────────────────────────────────

const PKCE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
const PKCE_MIN = 43;
const PKCE_MAX = 128;

export function generatePkceVerifier({ random = defaultRandom, length = 64 } = {}) {
  if (length < PKCE_MIN || length > PKCE_MAX) length = 64;
  const bytes = new Uint8Array(length);
  random(bytes);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += PKCE_CHARS[bytes[i] % PKCE_CHARS.length];
  }
  return out;
}

function defaultRandom(arr) {
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(arr);
    return arr;
  }
  // Fallback no criptográfico (solo para entornos sin crypto — tests).
  for (let i = 0; i < arr.length; i += 1) arr[i] = Math.floor(Math.random() * 256);
  return arr;
}

export function base64Url(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

export async function pkceChallenge(verifier, subtle = globalThis.crypto?.subtle) {
  if (!subtle?.digest) throw new Error('webcrypto_subtle_required');
  const digest = await subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

export async function createPkce({ random, subtle } = {}) {
  const verifier = generatePkceVerifier(random ? { random } : {});
  const challenge = await pkceChallenge(verifier, subtle);
  const state = generatePkceVerifier({ random, length: 32 });
  return { verifier, challenge, state };
}

// ── URLs del flujo OAuth ─────────────────────────────────────────────────────

export function buildAuthorizeUrl({ redirectUri, state, challenge }) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: COGNITO_CONFIG.clientId,
    redirect_uri: redirectUri,
    scope: COGNITO_CONFIG.scope,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  return `${cognitoAuthorizeUrl()}?${params.toString()}`;
}

async function tokenRequest({ grantType, extra = {}, fetchImpl = globalThis.fetch }) {
  const body = new URLSearchParams({
    grant_type: grantType,
    client_id: COGNITO_CONFIG.clientId,
    ...extra,
  });
  const response = await fetchImpl(cognitoTokenUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = typeof response.json === 'function' ? await response.json() : null;
  if (!response.ok) {
    const err = new Error(typeof data?.error === 'string' ? data.error : `token_error_${response.status}`);
    err.code = typeof data?.error === 'string' ? data.error : `token_error_${response.status}`;
    throw err;
  }
  return data;
}

export function exchangeCodeForTokens({ code, codeVerifier, redirectUri, fetchImpl }) {
  return tokenRequest({
    grantType: 'authorization_code',
    extra: { code, code_verifier: codeVerifier, redirect_uri: redirectUri },
    fetchImpl,
  });
}

export function refreshAccessToken({ refreshToken, fetchImpl }) {
  return tokenRequest({
    grantType: 'refresh_token',
    extra: { refresh_token: refreshToken },
    fetchImpl,
  });
}

// ── Storage de sesión (sessionStorage; sin cookie/localStorage) ─────────────

function storage() {
  return typeof sessionStorage !== 'undefined' ? sessionStorage : null;
}

export function storeAuth(tokens, { now = () => Date.now() } = {}) {
  const s = storage();
  if (!s) return null;
  const expiresIn = Number(tokens.expires_in) || 3600;
  const record = {
    accessToken: tokens.access_token ?? null,
    refreshToken: tokens.refresh_token ?? null,
    idToken: tokens.id_token ?? null,
    exp: now() + expiresIn * 1000,
    obtainedAt: now(),
  };
  s.setItem(AUTH_STORAGE_KEY, JSON.stringify(record));
  return record;
}

export function getStoredAuth() {
  const s = storage();
  if (!s) return null;
  try {
    const raw = s.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const record = JSON.parse(raw);
    if (!record?.accessToken) return null;
    return record;
  } catch {
    return null;
  }
}

export function isTokenFresh(auth, { now = () => Date.now(), skewMs = 30_000 } = {}) {
  return Boolean(auth && typeof auth.exp === 'number' && auth.exp - now() > skewMs);
}

export function clearAuth() {
  const s = storage();
  if (!s) return;
  s.removeItem(AUTH_STORAGE_KEY);
  s.removeItem(PENDING_AUTH_KEY);
}

export function savePendingAuth(pending) {
  storage()?.setItem(PENDING_AUTH_KEY, JSON.stringify(pending));
}

export function getPendingAuth() {
  const s = storage();
  if (!s) return null;
  try {
    return JSON.parse(s.getItem(PENDING_AUTH_KEY) ?? 'null');
  } catch {
    return null;
  }
}

export function clearPendingAuth() {
  storage()?.removeItem(PENDING_AUTH_KEY);
}

// ── Orquestación del flujo (inyectable para tests) ──────────────────────────

export function beginCognitoLogin({
  origin,
  createPkcePair = createPkce,
  savePending = savePendingAuth,
  navigate,
} = {}) {
  const redirectUri = `${origin}/empresa/acceso`;
  return createPkcePair().then((pair) => {
    savePending({ state: pair.state, verifier: pair.verifier, redirectUri, createdAt: Date.now() });
    navigate(buildAuthorizeUrl({ redirectUri, state: pair.state, challenge: pair.challenge }));
  });
}

export async function handleAuthCallback({
  searchParams,
  pending = getPendingAuth(),
  exchange = exchangeCodeForTokens,
  store = storeAuth,
  clear = clearAuth,
  navigate,
} = {}) {
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  if (!code || !state || !pending) {
    navigate?.(`/empresa/acceso?error=${state ? 'auth_missing_code' : 'auth_missing_state'}`);
    return { ok: false, reason: pending ? 'missing_params' : 'missing_pending' };
  }
  if (pending.state !== state) {
    clear();
    navigate?.('/empresa/acceso?error=auth_state_mismatch');
    return { ok: false, reason: 'state_mismatch' };
  }
  try {
    const tokens = await exchange({
      code,
      codeVerifier: pending.verifier,
      redirectUri: pending.redirectUri,
    });
    store(tokens);
    clearPendingAuth();
    navigate?.('/empresa');
    return { ok: true };
  } catch (err) {
    clear();
    navigate?.('/empresa/acceso?error=auth_exchange_failed');
    return { ok: false, reason: 'exchange_failed', code: err?.code ?? 'unknown' };
  }
}

// Refresh + persistir (uso: useCompanyData cuando el access token expira).
export async function refreshStoredAuth(auth, { fetchImpl } = {}) {
  if (!auth?.refreshToken) return null;
  try {
    const tokens = await refreshAccessToken({ refreshToken: auth.refreshToken, fetchImpl });
    return storeAuth(tokens, {});
  } catch {
    return null;
  }
}

// A.1-UI (KRU-112): resuelve un token válido para llamadas fetch (fresco o
// refresh único). null = sin sesión recuperable (el caller redirige al login).
export async function resolveValidToken({ fetchImpl } = {}) {
  const authed = getStoredAuth();
  if (!authed) return null;
  if (isTokenFresh(authed)) return authed.accessToken;
  if (!authed.refreshToken) return null;
  const refreshed = await refreshStoredAuth(authed, { fetchImpl });
  return refreshed?.accessToken ?? null;
}
