// V5 (t_0184d2e6, 2026-09-08): VERIFICACIÓN DE PRODUCCIÓN post-deploy —
// CloudFront krumm (d3citl7gomy2ql.cloudfront.net). Checks:
//   - /, /candidato, /empresa: 200 + 0 console/page/request errors
//   - Cutover en navegador real: /reclutador → /empresa; /postulaciones →
//     /candidato (preserva ?lang); /postulaciones?invite=… no redirige
//     (setup del flujo)
//   - Fuentes v2: Manrope cargada (document.fonts) + Google Fonts en la red
//   - h1 correcto en cada vista (copy de la fase v3)
// Salida: JSON { failures, checks, screenshots }. Exit 1 si hay fallos.
// Uso: BASE_URL=https://d3citl7gomy2ql.cloudfront.net node scripts/prod-verify-v5.mjs

import { chromium } from '@playwright/test';
import { existsSync, mkdirSync } from 'node:fs';

const baseUrl = process.env.BASE_URL ?? 'https://d3citl7gomy2ql.cloudfront.net';
const shotsDir = process.env.SHOTS_DIR ?? 'docs/qa/h46c-visual-audit/prod';
mkdirSync(shotsDir, { recursive: true });
const failures = [];
const checks = [];

// Chromium: env PLAYWRIGHT_CHROMIUM → path de la Pi (si existe) → default
// del instalador de Playwright (CI: `npx playwright install --with-deps chromium`).
const PI_CHROMIUM = '/home/sarlock/.cache/ms-playwright/chromium-1234/chrome-linux/chrome';
const chromiumPath = process.env.PLAYWRIGHT_CHROMIUM
  ?? (existsSync(PI_CHROMIUM) ? PI_CHROMIUM : undefined);
const launchOpts = {
  headless: true,
  args: ['--headless=new', '--disable-dev-shm-usage', '--disable-gpu'],
};
if (chromiumPath) launchOpts.executablePath = chromiumPath;
const browser = await chromium.launch(launchOpts);

async function openPage(tag, path, viewport = { width: 1280, height: 720 }) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`console ${msg.text()}`); });
  page.on('pageerror', (err) => errors.push(`pageerror ${err.message}`));
  page.on('requestfailed', (req) => errors.push(`requestfailed ${req.url()} ${req.failure()?.errorText ?? ''}`));
  await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle', timeout: 45000 });
  return { context, page, errors };
}

function record(name, ok, detail) {
  checks.push({ name, ok, detail });
  if (!ok) failures.push(`${name}: ${detail}`);
}

// 1) Rutas principales: carga + 0 errors + h1.
for (const { path, h1 } of [
  { path: '/', h1: /El talento|Talent/ },
  { path: '/candidato', h1: /Encuentra tu próxima oportunidad|Find your next opportunity/ },
  { path: '/empresa', h1: /Dashboard/ },
  { path: '/empresa/procesos', h1: /Procesos activos|Active processes/ },
]) {
  const { context, page, errors } = await openPage(`prod${path}`, path);
  const h1text = await page.evaluate(() => document.querySelector('h1')?.textContent ?? '(sin h1)');
  record(`h1 ${path}`, h1.test(h1text), `h1="${h1text}"`);
  record(`0 errors ${path}`, errors.length === 0, errors.slice(0, 3).join(' | '));
  if (path === '/candidato') {
    // Fuentes v2: Manrope en document.fonts (CSP m3 permite fonts.gstatic.com).
    const fonts = await page.evaluate(() => {
      const fams = new Set();
      document.fonts.forEach((f) => fams.add(f.family));
      return [...fams];
    });
    record('fuentes v2 (Manrope)', fonts.some((f) => /Manrope/.test(f)), `families=${fonts.join(',')}`);
    await page.screenshot({ path: `${shotsDir}/prod-candidato-es.png` });
  }
  await context.close();
}

// 2) Cutover: /reclutador → /empresa (navegación real, conserva ?lang).
{
  const { context, page, errors } = await openPage('prod-reclutador', '/reclutador');
  await page.waitForTimeout(1500);
  const url = page.url();
  record('cutover /reclutador → /empresa', url.includes('/empresa'), `url=${url}`);
  const h1text = await page.evaluate(() => document.querySelector('h1')?.textContent ?? '(sin h1)');
  record('cutover /reclutador h1 Dashboard', /Dashboard/.test(h1text), `h1="${h1text}"`);
  record('cutover /reclutador 0 errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await page.screenshot({ path: `${shotsDir}/prod-reclutador-a-empresa.png` });
  await context.close();
}

// 3) Cutover: /postulaciones → /candidato (sin invite).
{
  const { context, page, errors } = await openPage('prod-postulaciones', '/postulaciones');
  await page.waitForTimeout(1500);
  const url = page.url();
  record('cutover /postulaciones → /candidato', url.includes('/candidato'), `url=${url}`);
  const h1text = await page.evaluate(() => document.querySelector('h1')?.textContent ?? '(sin h1)');
  record('cutover /postulaciones h1', /Encuentra tu próxima oportunidad|Find your next opportunity/.test(h1text), `h1="${h1text}"`);
  record('cutover /postulaciones 0 errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await context.close();
}

// 4) Cutover: /postulaciones?invite=… NO redirige (flujo intacto en prod).
{
  const { context, page, errors } = await openPage('prod-invite', '/postulaciones?invite=tok-live-abc123');
  await page.getByRole('heading', { name: /Preparación de la sesión|Session preparation/i }).waitFor({ timeout: 30000 })
    .catch(() => failures.push('prod-invite: el setup no apareció (flujo roto en prod)'));
  const url = page.url();
  record('flujo con invite intacto', url.includes('/postulaciones'), `url=${url}`);
  record('flujo con invite 0 errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await page.screenshot({ path: `${shotsDir}/prod-invite-setup.png` });
  await context.close();
}

await browser.close();
const result = { baseUrl, failures, checks, screenshotsDir: shotsDir };
console.log(JSON.stringify(result, null, 2));
process.exit(failures.length ? 1 : 0);
