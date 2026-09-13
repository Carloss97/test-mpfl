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

const browser = await chromium.launch({
  executablePath: '/home/sarlock/.cache/ms-playwright/chromium-1234/chrome-linux/chrome',
});
const context = await browser.newContext({ locale: 'es-CL', timezoneId: 'America/Santiago' });
const page = await context.newPage();

page.on('request', (req) => {
  const url = req.url();
  if (url.includes('posthog.com')) {
    phRequests.push(`${req.method()} ${url.split('?')[0]}`);
    if (url.includes('/capture/') && req.method() === 'POST' && req.postData()) {
      try {
        const body = JSON.parse(req.postData());
        const items = Array.isArray(body) ? body : [body];
        for (const it of items) {
          if (it && it.event) {
            captures.push({
              event: it.event,
              currentUrl: it.properties?.$current_url || it.properties?.path || '',
              distinctIdLen: String(it.distinct_id || '').length,
            });
          }
        }
      } catch { /* cuerpo no JSON: ignorar */ }
    }
  }
});

const fail = (msg) => {
  console.error(`FAIL F.1: ${msg}`);
  console.error('phRequests:', phRequests);
  console.error('captures:', JSON.stringify(captures, null, 2));
  page.screenshot({ path: '/tmp/f1-live-fail.png' }).catch(() => {});
  browser.close().finally(() => process.exit(1));
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

  const pvLanding = captures.filter((c) => c.event === '$pageview' && c.currentUrl.startsWith(`${STAGE}/`));
  const pvPostul = captures.filter((c) => c.event === '$pageview' && c.currentUrl.includes('/postulaciones'));
  const inviteOpened = captures.filter((c) => c.event === 'invite_opened');
  console.log('3) pageviews landing:', pvLanding.length, '| pageviews /postulaciones:', pvPostul.length, '| invite_opened:', inviteOpened.length);

  const pass = pvLanding.length >= 1 && pvPostul.length === 0 && inviteOpened.length >= 1;
  console.log('phRequests (resumen):', JSON.stringify([...new Set(phRequests.map((r) => r.split(' ')[1]))]));
  console.log('captures:', JSON.stringify(captures, null, 2));
  await page.screenshot({ path: '/tmp/f1-live-final.png' });
  if (!pass) await fail(`gates no cumplidos (pvLanding=${pvLanding.length}, pvPostul=${pvPostul.length}, inviteOpened=${inviteOpened.length})`);
  console.log('PASS F.1 live: pageview entregado + exclusión /postulaciones + whitelist invite_opened');
  await browser.close();
  process.exit(0);
} catch (e) {
  await fail(`${e.name}: ${String(e.message).slice(0, 200)}`);
}
