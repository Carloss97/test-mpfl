// F.1 (KRU-118): tests del módulo de analytics PostHog privacy-safe.
// Invariantes de privacidad (plan §F.1 + política de privacidad):
// - sin key de build → no-op total (sin importar posthog-js);
// - sin consent → no-op;
// - modo fixture → no-op;
// - /postulaciones* y /dev* → sin pageview; solo whitelist de funnel;
// - scrubber: keys prohibidas (biometría/PII/tokens) NUNCA viajan.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// posthog-js mocked. NOTA: el factory de vi.mock se cachea (no re-ejecuta en
// cada resetModules) → se devuelve SIEMPRE el mismo objeto mock; el historial
// de llamadas se limpia con vi.clearAllMocks() entre tests.
// El mock debe apuntar a la MISMA ruta que importa analytics.js
// (variante no-external).
const posthogState = { mock: null };
vi.mock('posthog-js/dist/module.no-external.js', () => {
  if (!posthogState.mock) {
    posthogState.mock = { init: vi.fn(), page: vi.fn(), capture: vi.fn(), reset: vi.fn() };
  }
  return { default: posthogState.mock };
});

let a;
async function freshAnalytics() {
  vi.resetModules();
  a = await import('./analytics.js');
  a.__resetAnalyticsForTests();
  return a;
}

beforeEach(() => {
  vi.clearAllMocks();
  document.cookie = 'cookie_consent=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe('gates (key + consent + fixture)', () => {
  it('sin key de build: track/pageview = no-op (ni importa posthog-js)', async () => {
    await freshAnalytics();
    a.setConsent(true);
    expect(await a.track('recruiter_login')).toBe(false);
    if (posthogState.mock) expect(posthogState.mock.init).not.toHaveBeenCalled();
  });

  it('con key pero sin consent: no-op', async () => {
    vi.stubEnv('VITE_POSTHOG_API', 'test_project_credential');
    await freshAnalytics();
    expect(a.isAnalyticsActive('/candidato', '')).toBe(false);
    expect(await a.track('invite_opened')).toBe(false);
    if (posthogState.mock) expect(posthogState.mock.init).not.toHaveBeenCalled();
  });

  it('con key + consent: track envía vía posthog', async () => {
    vi.stubEnv('VITE_POSTHOG_API', 'test_project_credential');
    vi.stubEnv('VITE_POSTHOG_HOST', 'https://us.i.posthog.com');
    await freshAnalytics();
    a.setConsent(true);
    expect(a.hasAnalyticsConsent()).toBe(true);
    const ok = await a.track('recruiter_login', {}, { path: '/empresa', search: '' });
    expect(ok).toBe(true);
    const ph = posthogState.mock;
    expect(ph.init).toHaveBeenCalledTimes(1);
    const [apiKey, options] = ph.init.mock.calls[0];
    expect(apiKey).toBe('test_project_credential');
    expect(options).toMatchObject({
      api_host: 'https://us.i.posthog.com',
      autocapture: false,
      capture_pageview: false,
      person_profiles: 'never',
    });
    expect(ph.capture).toHaveBeenCalledWith('recruiter_login', {});
  });

  it('modo fixture (?fixture=1): no-op aunque haya key + consent', async () => {
    vi.stubEnv('VITE_POSTHOG_API', 'test_project_credential');
    await freshAnalytics();
    a.setConsent(true);
    expect(a.isAnalyticsActive('/postulaciones', '?fixture=1')).toBe(false);
    expect(await a.track('game_1_completed', {}, { path: '/postulaciones', search: '?fixture=1' })).toBe(false);
  });
});

describe('cookie de consent (cookie_consent, 1 año)', () => {
  it('setConsent(true) escribe cookie analytics; consentFromStorage la lee', async () => {
    await freshAnalytics();
    a.setConsent(true);
    expect(document.cookie).toContain('cookie_consent=analytics');
    expect(a.consentFromStorage()).toBe('granted');
  });

  it('setConsent(false) escribe cookie essential', async () => {
    await freshAnalytics();
    a.setConsent(false);
    expect(document.cookie).toContain('cookie_consent=essential');
    expect(a.consentFromStorage()).toBe('denied');
    expect(a.hasAnalyticsConsent()).toBe(false);
  });

  it('sin cookie → unknown (banner visible)', async () => {
    await freshAnalytics();
    expect(a.consentFromStorage()).toBe('unknown');
  });
});

describe('rutas excluidas (/postulaciones* y /dev*)', () => {
  async function active() {
    vi.stubEnv('VITE_POSTHOG_API', 'test_project_credential');
    await freshAnalytics();
    a.setConsent(true);
    return a;
  }

  it('isExcludedRoute: /postulaciones, /postulaciones/x, /dev/bomb → true; el resto → false', async () => {
    await active();
    expect(a.isExcludedRoute('/postulaciones')).toBe(true);
    expect(a.isExcludedRoute('/postulaciones/123')).toBe(true);
    expect(a.isExcludedRoute('/dev/bomb')).toBe(true);
    expect(a.isExcludedRoute('/candidato')).toBe(false);
    expect(a.isExcludedRoute('/empresa')).toBe(false);
    expect(a.isExcludedRoute('/')).toBe(false);
  });

  it('en ruta excluida: pageview bloqueada', async () => {
    await active();
    expect(await a.trackPageView('/postulaciones', '?invite=x')).toBe(false);
    const ph = posthogState.mock;
    if (ph) {
      expect(ph.page).not.toHaveBeenCalled();
      expect(ph.capture).not.toHaveBeenCalled();
    }
  });
  it('en ruta excluida: whitelist de funnel SÍ pasa (consent_accepted, game_N_completed, report_viewed, invite_opened, nps_submitted)', async () => {
    await active();
    const ctx = { path: '/postulaciones', search: '?invite=x' };
    expect(await a.track('consent_accepted', {}, ctx)).toBe(true);
    expect(await a.track('game_3_completed', { game_index: 3 }, ctx)).toBe(true);
    expect(await a.track('report_viewed', { viewer: 'candidate' }, ctx)).toBe(true);
    expect(await a.track('invite_opened', {}, ctx)).toBe(true);
    expect(await a.track('nps_submitted', { score: 8 }, ctx)).toBe(true);
  });

  it('en ruta excluida: evento fuera de whitelist bloqueado', async () => {
    await active();
    const ctx = { path: '/postulaciones', search: '' };
    expect(await a.track('some_other_event', {}, ctx)).toBe(false);
    expect(await a.track('export_downloaded', {}, ctx)).toBe(false);
    const ph = posthogState.mock;
    if (ph) expect(ph.capture).not.toHaveBeenCalled();
  });

  it('en ruta normal: pageview pasa como capture($pageview)', async () => {
    await active();
    expect(await a.trackPageView('/candidato', '')).toBe(true);
    expect(posthogState.mock.capture).toHaveBeenCalledWith('$pageview', { path: '/candidato' });
  });
});

describe('scrubber de propiedades (doble barrera)', () => {
  it('descarta keys prohibidas (biometría, PII, tokens, contenido) y conserva las del funnel', async () => {
    await freshAnalytics();
    const clean = a.sanitizeProperties({
      game_index: 2,
      game_id: 'balloon_risk',
      practice: false,
      viewer: 'candidate',
      format: 'csv',
      // — prohibidas (nunca deben viajar):
      landmarks: [1, 2, 3],
      video: true,
      face_signal: { x: 1 },
      pose_keypoints: [0.1],
      pointer_trajectory: 'abc',
      answer: 'respuesta',
      email: 'a@b.cl',
      name: 'candidato',
      invite_token: 'uuid-1234',
      session_payload: { raw: true },
      biometric_sample: 1,
    });
    expect(clean).toEqual({
      game_index: 2,
      game_id: 'balloon_risk',
      practice: false,
      viewer: 'candidate',
      format: 'csv',
    });
  });

  it('trunca strings (>120) y limita profundidad/arreglos', async () => {
    await freshAnalytics();
    const long = 'x'.repeat(500);
    const deep = { l1: { l2: { l3: { l4: 'muy_profundo' } } } };
    const many = Array.from({ length: 50 }, (_, i) => i);
    const clean = a.sanitizeProperties({ long, deep, many });
    expect(clean.long.length).toBe(120);
    // MAX_DEPTH=3: deep(1)→l1(2)→l2(3) sobreviven; l3(4) cae y arrastra a l4.
    expect(clean.deep.l1.l2).toEqual({});
    expect(clean.deep.l1.l2.l3).toBeUndefined();
    expect(clean.many.length).toBe(10);
  });

  it('track limpia las propiedades antes de enviar', async () => {
    vi.stubEnv('VITE_POSTHOG_API', 'test_project_credential');
    await freshAnalytics();
    a.setConsent(true);
    await a.track('game_1_completed', { game_id: 'laser_puzzle', landmarks: [1] }, { path: '/postulaciones', search: '' });
    expect(posthogState.mock.capture).toHaveBeenCalledWith('game_1_completed', { game_id: 'laser_puzzle' });
  });
});

describe('route observer (pageviews por cambio de ruta)', () => {
  it('emite la ruta inicial, las pushState/replaceState y popstate; stop() detiene popstate', async () => {
    await freshAnalytics();
    const calls = [];
    const stop = a.startRouteObserver((p) => calls.push(p));
    expect(calls).toEqual(['/']); // URL inicial de jsdom
    window.history.pushState(null, '', '/empresa');
    expect(calls).toEqual(['/', '/empresa']);
    window.history.replaceState(null, '', '/empresa/informes');
    expect(calls).toEqual(['/', '/empresa', '/empresa/informes']);
    stop();
    window.dispatchEvent(new PopStateEvent('popstate'));
    // popstate sin cambio de URL no reemite (report() compara lastPath)
    expect(calls).toEqual(['/', '/empresa', '/empresa/informes']);
  });
});
