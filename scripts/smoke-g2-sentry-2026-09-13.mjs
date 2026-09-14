#!/usr/bin/env node
// G.2 (KRU): E2E error tracking — stage.krumm.cl.
// Inyecta un error no capturado (setTimeout, 8 s tras cargar) y observa la
// red: PASS = el error fue arrojado (pageerror) + ≥1 request a
// ingest.us.sentry.io respondido 207 (envelope aceptado).
// El issue "krumm-g2-verify-…" debe aparecer en la UI de Sentry.
// Requiere: build con DSN (CD main) + CSP con el origen Sentry (RHP m7).
import { chromium } from 'playwright';

const RUN_ID = 'krumm-g2-verify-' + Date.now();
const BASE = process.env.BASE_URL || 'https://stage.krumm.cl';
console.log('RUN_ID:', RUN_ID);

const browser = await chromium.launch({
  headless: true,
  // La Pi tiene chromium-1234 (full), no el headless_shell-1228 que
  // espera esta versión de playwright (mismo pitfall de los smokes F.1).
  executablePath: '/home/sarlock/.cache/ms-playwright/chromium-1234/chrome-linux/chrome',
});
const ctx = await browser.newContext({
  userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
});
const page = await ctx.newPage();

const sentryReqs = [];
page.on('requestfinished', async (req) => {
  if (req.url().includes('ingest.us.sentry.io')) {
    const res = await req.response().catch(() => null);
    sentryReqs.push({ phase: 'finished', url: req.url().slice(0, 90), status: res ? res.status() : null });
  }
});
page.on('requestfailed', async (req) => {
  if (req.url().includes('ingest.us.sentry.io')) {
    sentryReqs.push({ phase: 'failed', url: req.url().slice(0, 90), err: req.failure()?.errorText });
  }
});
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e.message).slice(0, 100)));
const cspLogs = [];
page.on('console', (m) => {
  if (m.text().includes('Content Security Policy')) cspLogs.push(m.text().slice(0, 140));
});

// El throw va en addInitScript: corre antes que la app y el temporizador
// arranca en t0 de la página (8 s después = con la app cargada).
await page.addInitScript((runId) => {
  setTimeout(() => { throw new Error(runId); }, 8000);
}, RUN_ID);

await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(16000); // margen: throw (8s) + envío del envelope
await browser.close();

console.log('pageErrors:', JSON.stringify(pageErrors));
console.log('sentry requests:', JSON.stringify(sentryReqs, null, 1));
console.log('CSP logs:', cspLogs.length ? JSON.stringify(cspLogs, null, 1) : 'ninguno');

const thrown = pageErrors.some((m) => m.includes(RUN_ID));
const accepted = sentryReqs.some((r) => r.phase === 'finished' && (r.status === 207 || r.status === 200));
if (thrown && accepted) {
  console.log('PASS: error inyectado detectado + envelope aceptado por Sentry (207)');
  process.exit(0);
}
console.log('FAIL: thrown=' + thrown + ' accepted=' + accepted);
process.exit(1);
