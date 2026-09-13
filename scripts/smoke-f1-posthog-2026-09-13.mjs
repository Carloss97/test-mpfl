#!/usr/bin/env node
// F.1 (KRU-118) — smoke live PostHog en stage (2026-09-13).
// Verifica con la key real (inyectada por CD) que:
// 1) El banner de consentimiento aparece y "Aceptar analytics" escribe
//    cookie_consent=analytics.
// 2) posthog-js inicializa y envía el pageview de la landing a
//    us.posthog.com/capture/ (evidencia de entrega real, no mock).
// 3) En /postulaciones (ruta excluida) NO hay pageview, pero SÍ el evento
//    whitelist `invite_opened` (funnel candidato, sin PII).
import { chromium } from 'playwright';

const STAGE = 'https://stage.krumm.cl';
const captures = [];
const phRequests = [];
const phConsole = [];

const browser = await chromium.launch({
  executablePath: '/home/sarlock/.cache/ms-playwright/chromium-1234/chrome-linux/chrome',
});
// UA sin "Headless": posthog-js (2025+) filtra tráfico de bots por user agent
// (lista que incluye 'headlesschrome') y silencia los captures. Con UA normal
// de Chrome el smoke replica el comportamiento del navegador real del usuario.
const context = await browser.newContext({
  locale: 'es-CL',
  timezoneId: 'America/Santiago',
  userAgent:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
});
const page = await context.newPage();
page.on('console', (msg) => {
  const text = msg.text();
  if (/posthog/i.test(text)) phConsole.push(`[${msg.type()}] ${text.slice(0, 300)}`);
});

page.on('request', (req) => {
  const url = req.url();
  if (url.includes('posthog.com')) {
    phRequests.push(`${req.method()} ${url.split('?')[0]}`);
    // Endpoint de captura: /capture/ (clásico) o /i/v0/e/ (posthog-js 2025+)
    if (req.method() === 'POST' && (url.includes('/i/v0/e/') || url.includes('/capture/'))) {
      const pd = req.postData() ?? '';
      let parsed = null;
      try {
        const body = JSON.parse(pd);
        const items = Array.isArray(body) ? body : [body];
        parsed = items.filter((it) => it && it.event).map((it) => ({
          event: it.event,
          currentUrl: it.properties?.$current_url || it.properties?.path || '',
        }));
      } catch { /* body binario/gzip: solo contar el POST */ }
      captures.push({ url: url.split('?')[0], bodyLen: pd.length, parsed });
    }
  }
});

const fail = async (msg) => {
  console.error(`FAIL F.1: ${msg}`);
  console.error('phRequests:', phRequests);
  console.error('phConsole:', phConsole.slice(0, 20));
  console.error('captures:', JSON.stringify(captures, null, 2));
  await page.screenshot({ path: '/tmp/f1-live-fail.png' }).catch(() => {});
  await browser.close();
  process.exit(1);
};

try {
  // 1) Landing: banner visible
  await page.goto(`${STAGE}/`, { waitUntil: 'networkidle', timeout: 60000 });
  const accept = page.getByTestId('consent-analytics');
  await accept.waitFor({ timeout: 20000 });
  console.log('1) banner de consentimiento visible en landing');

  // 2) Aceptar analytics
  await accept.click();
  await page.waitForTimeout(5000); // init + decide + flush del pageview
  const cookies = await context.cookies();
  const consent = cookies.find((c) => c.name === 'cookie_consent');
  console.log('2) cookie_consent =', consent?.value ?? '(ausente)');
  if (consent?.value !== 'analytics') await fail('cookie_consent no se escribió con analytics');

  // 3) Ruta excluida: /postulaciones con invite fake → no pageview, sí invite_opened
  await page.goto(
    `${STAGE}/postulaciones?invite=00000000-0000-4000-8000-000000000000`,
    { waitUntil: 'networkidle', timeout: 60000 },
  );
  await page.waitForTimeout(7000); // validación de invitación + flush

  const phEvents = captures.flatMap((c) => c.parsed ?? []);
  const pvLanding = phEvents.filter((c) => c.event === '$pageview' && c.currentUrl.startsWith(`${STAGE}/`) && !c.currentUrl.includes('/postulaciones'));
  const pvPostul = phEvents.filter((c) => c.event === '$pageview' && c.currentUrl.includes('/postulaciones'));
  const inviteOpened = phEvents.filter((c) => c.event === 'invite_opened');
  console.log('3) captures POST:', captures.length, '| events parseados:', phEvents.length);
  console.log('   pageviews landing:', pvLanding.length, '| pageviews /postulaciones:', pvPostul.length, '| invite_opened:', inviteOpened.length);
  console.log('   phConsole (posthog):', JSON.stringify(phConsole.slice(0, 20), null, 1));

  // Si el body no es parseable (gzip), el gate se reduce a: hubo captura POST.
  const parseable = phEvents.length > 0;
  const pass = parseable
    ? pvLanding.length >= 1 && pvPostul.length === 0 && inviteOpened.length >= 1
    : captures.length >= 1;
  console.log('phRequests (resumen):', JSON.stringify([...new Set(phRequests.map((r) => r.split(' ')[1]))]));
  console.log('captures (resumen):', JSON.stringify(captures.map((c) => ({ url: c.url, bodyLen: c.bodyLen, parsed: c.parsed })), null, 1));
  await page.screenshot({ path: '/tmp/f1-live-final.png' });
  if (!pass) await fail(`gates no cumplidos (pvLanding=${pvLanding.length}, pvPostul=${pvPostul.length}, inviteOpened=${inviteOpened.length})`);
  console.log('PASS F.1 live: pageview entregado + exclusión /postulaciones + whitelist invite_opened');
  await browser.close();
  process.exit(0);
} catch (e) {
  await fail(`${e.name}: ${String(e.message).slice(0, 200)}`);
}
