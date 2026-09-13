#!/usr/bin/env node
// F.1 (KRU-118) — smoke live PostHog en stage (2026-09-13).
// Verifica con la key real (CD inyecta VITE_POSTHOG_API) que:
// 1) Primera visita: banner de consentimiento visible; "Aceptar analytics"
//    escribe cookie_consent=analytics y dispara el pageview retroactivo.
// 2) $pageview llega a PostHog (us.i.posthog.com/e/) en ruta permitida.
// 3) En /postulaciones (ruta excluida) NO hay $pageview, pero SÍ el evento
//    whitelist invite_opened.
//
// Notas de infra (2025+ posthog-js + CSP):
// - posthog-js filtra bots por UA y navigator.webdriver → contexto con UA
//   normal de Chrome + webdriver=false (emula navegador real; en producción
//   los navegadores reales traen webdriver=false).
// - El body del /e/ es GZIP y Playwright postData() lo corrompe (UTF-8 →
//   U+FFFD), y CDP Network.getRequestBody es inestable → se captura vía hook
//   de fetch/sendBeacon/XHR en addInitScript (ArrayBuffer crudo) y se
//   descomprime con gunzipSync en Node.
// - Variantes de posthog-js: el bundle usa dist/module.no-external.js (sin
//   scripts externos; CSP m6 solo expandió connect-src, no script-src).
import { chromium } from 'playwright';
import { gunzipSync } from 'node:zlib';

const STAGE = 'https://stage.krumm.cl';

const HOOK = `
  Object.defineProperty(navigator, 'webdriver', { get: () => false });
  window.__ph = [];
  const push = (url, bytes, src) => {
    try { window.__ph.push({ url, b64: btoa(String.fromCharCode(...new Uint8Array(bytes))), src }); } catch {}
  };
  const isCap = (u) => u.includes('posthog.com') && (u.includes('/e/') || u.includes('/capture/') || u.includes('/i/v0/e/'));
  const origFetch = window.fetch;
  window.fetch = async function (input, init = {}) {
    try {
      const url = typeof input === 'string' ? input : input?.url ?? '';
      const method = (init.method ?? 'GET').toUpperCase();
      let body = init.body;
      if (method === 'POST' && isCap(url) && body) {
        const buf = body instanceof ArrayBuffer ? body
          : body instanceof Uint8Array ? body
          : body instanceof Blob ? await body.arrayBuffer()
          : body instanceof ReadableStream ? await new Response(body).arrayBuffer()
          : new TextEncoder().encode(body);
        push(url, buf, 'fetch');
      }
    } catch {}
    return origFetch.apply(this, [input, init]);
  };
  const origBeacon = navigator.sendBeacon.bind(navigator);
  navigator.sendBeacon = (url, data) => {
    try {
      if (isCap(String(url)) && data && !(data instanceof Blob)) push(url, data, 'beacon');
    } catch {}
    return origBeacon(url, data);
  };
  const origSend = XMLHttpRequest.prototype.send;
  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (m, url) { this._url = url; return origOpen.apply(this, arguments); };
  XMLHttpRequest.prototype.send = function (body) {
    try {
      if (isCap(this._url || '') && body && typeof body !== 'string') push(this._url, body, 'xhr');
    } catch {}
    return origSend.apply(this, arguments);
  };
`;

const decodeAll = (items) => {
  const events = [];
  for (const c of items) {
    const buf = Buffer.from(c.b64, 'base64');
    let text = null;
    try { const t = buf.toString('utf8'); JSON.parse(t); text = t; } catch { /* no JSON directo */ }
    if (text === null) { try { text = gunzipSync(buf).toString('utf8'); } catch { /* no gzip */ } }
    if (text) {
      try {
        const body = JSON.parse(text);
        const arr = Array.isArray(body) ? body : body.batch ?? [body];
        for (const it of arr) if (it && it.event) {
          events.push({ event: it.event, url: it.properties?.$current_url || it.properties?.path || '', src: c.src });
        }
      } catch { /* noop */ }
    }
  }
  return events;
};

const browser = await chromium.launch({
  executablePath: '/home/sarlock/.cache/ms-playwright/chromium-1234/chrome-linux/chrome',
});
const context = await browser.newContext({
  locale: 'es-CL',
  timezoneId: 'America/Santiago',
  // UA normal (sin "Headless"): posthog-js filtra bots por user agent.
  userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
});
await context.addInitScript(HOOK);
const page = await context.newPage();
const failures = [];

const fail = async (msg) => {
  console.error(`FAIL F.1: ${msg}`);
  console.error('detalle:', JSON.stringify(failures));
  await page.screenshot({ path: '/tmp/f1-live-fail.png' }).catch(() => {});
  await browser.close();
  process.exit(1);
};

try {
  // Fase A: primera visita → banner → aceptar → pageview retroactivo
  await page.goto(`${STAGE}/`, { waitUntil: 'networkidle', timeout: 60000 });
  const accept = page.getByTestId('consent-analytics');
  await accept.waitFor({ timeout: 20000 });
  console.log('A1) banner de consentimiento visible en primera visita');
  await accept.click();
  const cookies = await context.cookies();
  const consent = cookies.find((c) => c.name === 'cookie_consent');
  console.log('A2) cookie_consent =', consent?.value ?? '(ausente)');
  if (consent?.value !== 'analytics') await fail('cookie_consent no se escribió con analytics');
  await page.waitForTimeout(15000); // flush por intervalo de posthog
  const evA = decodeAll(await page.evaluate(() => window.__ph || []));
  console.log('A3) eventos landing:', JSON.stringify(evA, null, 1));
  const pvLanding = evA.filter((e) => e.event === '$pageview' && e.url.startsWith(STAGE) && !e.url.includes('/postulaciones'));
  if (pvLanding.length < 1) await fail('Fase A: sin $pageview de landing (ruta permitida)');

  // Fase B: /postulaciones (invitación fake) → SIN pageview + invite_opened
  await page.goto(`${STAGE}/postulaciones?invite=00000000-0000-4000-8000-000000000000`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(15000);
  const evB = decodeAll(await page.evaluate(() => window.__ph || []));
  console.log('B) eventos /postulaciones:', JSON.stringify(evB, null, 1));
  const pvPostul = evB.filter((e) => e.event === '$pageview' && e.url.includes('/postulaciones'));
  const inviteOpened = evB.filter((e) => e.event === 'invite_opened');
  if (pvPostul.length > 0) await fail('Fase B: $pageview en /postulaciones (ruta excluida)');
  if (inviteOpened.length < 1) await fail('Fase B: sin invite_opened (whitelist de funnel)');

  await page.screenshot({ path: '/tmp/f1-live-final.png' });
  console.log('PASS F.1 live: banner+cookie, $pageview landing, exclusión /postulaciones, invite_opened whitelist');
  await browser.close();
  process.exit(0);
} catch (e) {
  await fail(`${e.name}: ${String(e.message).slice(0, 200)}`);
}
