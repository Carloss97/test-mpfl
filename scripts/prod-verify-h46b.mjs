// Verificación POST-FIX de la RHP m3 en krumm.cl: CSP nueva + fuentes
// Google Fonts cargadas de verdad (document.fonts.check) + 0 errores de
// consola + 0 overflow. 4 vistas clave.
import { chromium } from '@playwright/test';

const baseUrl = process.env.BASE_URL ?? 'https://krumm.cl';
const failures = [];
const checks = [];
const browser = await chromium.launch({
  headless: true,
  executablePath: '/home/sarlock/.cache/ms-playwright/chromium-1234/chrome-linux/chrome',
  args: ['--headless=new', '--disable-dev-shm-usage', '--disable-gpu'],
});

const views = [
  ['int-es', '/postulaciones?battery=original'],
  ['stage-es', '/postulaciones?invite=tok-live-abc123&battery=original'],
  ['report-es', '/postulaciones?fixture=1&battery=original'],
  ['hr-es', '/reclutador'],
];

for (const [tag, path] of views) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle', timeout: 45000 });
  await page.evaluate(async () => { await document.fonts.ready; });
  const r = await page.evaluate(async () => {
    const manrope = document.fonts.check('700 16px Manrope');
    const archivo = document.fonts.check('900 16px Archivo');
    const loaded = [...document.fonts].map((f) => `${f.family} ${f.weight}`).slice(0, 12);
    return {
      manropeLoaded: manrope,
      archivoLoaded: archivo,
      fonts: loaded,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    };
  });
  checks.push({ tag, ...r, errors: errs });
  if (errs.length) failures.push(`[${tag}] console/page errors: ${errs.slice(0, 3).join(' | ')}`);
  if (r.overflow > 1) failures.push(`[${tag}] overflow horizontal ${r.overflow}px`);
  if (!r.manropeLoaded) failures.push(`[${tag}] Manrope NO carga (${r.fonts.join(', ')})`);
  await context.close();
}

await browser.close();
console.log(JSON.stringify({ baseUrl, checks, failures }, null, 2));
process.exit(failures.length ? 1 : 0);
