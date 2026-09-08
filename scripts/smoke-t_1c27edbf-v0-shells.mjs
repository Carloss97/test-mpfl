// t_1c27edbf (V0 fase v3) smoke browser (2026-09-07): shells candidato/empresa +
// 12 rutas placeholder en Vite dev local.
//
// Matriz:
//   ES (default): 12 rutas × 2 viewports (1280×720, 390×844)
//   EN:           /candidato + /empresa × 2 viewports (paridad i18n en vivo)
// Asertos por página:
//   - 0 overflow horizontal (scrollWidth <= innerWidth + 1)
//   - 0 console errors / pageerror / requestfailed
//   - chrome del shell correcto por tipo de ruta:
//       candidate   → topbar (logo) + footer © 2026 KRUMM
//       company     → banner "Demo workspace" (badge) + header
//       portal      → 2 cards de portal
//       companyLogin→ CTA "Explore company demo"
//   - un solo h1 por página con el copy esperado del diccionario (V3_COPY)
// Screenshots de evidencia (docs/qa/v0-shells/): portal, candidato, empresa,
// login empresa — ES en 2 viewports + EN empresa desktop.
// Salida: JSON { failures, consoleErrors, screenshots }. Exit 1 si hay fallos.

import { chromium } from '@playwright/test';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:5173';
const shotsDir = process.env.SHOTS_DIR ?? 'docs/qa/v0-shells';
const failures = [];
const consoleErrors = [];
const screenshots = [];

const ROUTES = [
  { path: '/portal', kind: 'portal' },
  { path: '/candidato', kind: 'candidate' },
  { path: '/candidato/acceso', kind: 'candidate' },
  { path: '/empleos', kind: 'candidate' },
  { path: '/empresa/acceso', kind: 'companyLogin' },
  { path: '/empresa', kind: 'company' },
  { path: '/empresa/procesos', kind: 'company' },
  { path: '/empresa/proceso/supervisor', kind: 'company' },
  { path: '/empresa/proceso/supervisor/candidatos/ses-demo', kind: 'company' },
  { path: '/empresa/nueva-solicitud', kind: 'company' },
  { path: '/empresa/nueva-solicitud/diseño', kind: 'company' },
  { path: '/empresa/nueva-solicitud/subida', kind: 'company' },
];

const SHOT_ROUTES = ['/portal', '/candidato', '/empresa/acceso', '/empresa'];

const VIEWPORTS = [
  { width: 1280, height: 720, tag: 'desktop' },
  { width: 390, height: 844, tag: 'mobile' },
];

// h1 esperado por ruta/idioma (mismo origen que el app: V3_COPY pages.*.title).
const H1 = {
  es: {
    '/portal': 'Elige tu portal',
    '/candidato': 'Portal para candidatos',
    '/candidato/acceso': 'Acceso candidato',
    '/empleos': 'Bolsa de empleos',
    '/empresa/acceso': 'Portal para empresas',
    '/empresa': 'Dashboard',
    '/empresa/procesos': 'Procesos activos',
    '/empresa/proceso/supervisor': 'Detalle del proceso',
    '/empresa/proceso/supervisor/candidatos/ses-demo': 'Informe del candidato',
    '/empresa/nueva-solicitud': 'Nueva solicitud',
    '/empresa/nueva-solicitud/diseño': 'Nueva solicitud · Diseñar con KRUMM',
    '/empresa/nueva-solicitud/subida': 'Nueva solicitud · Subir perfil',
  },
  en: {
    '/portal': 'Choose your portal',
    '/candidato': 'Candidate portal',
    '/candidato/acceso': 'Candidate access',
    '/empleos': 'Job board',
    '/empresa/acceso': 'Company Portal',
    '/empresa': 'Dashboard',
    '/empresa/procesos': 'Active processes',
    '/empresa/proceso/supervisor': 'Process detail',
    '/empresa/proceso/supervisor/candidatos/ses-demo': 'Candidate report',
    '/empresa/nueva-solicitud': 'New request',
    '/empresa/nueva-solicitud/diseño': 'New request · Design with KRUMM',
    '/empresa/nueva-solicitud/subida': 'New request · Upload profile',
  },
};

const browser = await chromium.launch({
  headless: true,
  executablePath: '/home/sarlock/.cache/ms-playwright/chromium-1234/chrome-linux/chrome',
  args: ['--headless=new', '--disable-dev-shm-usage', '--disable-gpu'],
});

function track(page, tag) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(`[${tag}] ${msg.text()}`);
  });
  page.on('pageerror', (err) => consoleErrors.push(`[${tag}] ${err.message}`));
  page.on('requestfailed', (req) => consoleErrors.push(`[${tag}] requestfailed ${req.url()} ${req.failure()?.errorText ?? ''}`));
}

async function shot(page, name) {
  const path = `${shotsDir}/${name}.png`;
  await page.screenshot({ path });
  screenshots.push(path);
}

async function assertChrome(page, tag, lang, route) {
  const state = await page.evaluate((kind) => {
    const q = (sel) => document.querySelector(sel);
    return {
      h1s: document.querySelectorAll('h1').length,
      h1: q('h1')?.textContent ?? null,
      candidate: Boolean(q('.v3-cp-header') && q('.v3-cp-footer')),
      candidateFooterYear: q('.v3-cp-footer')?.textContent ?? '',
      candidateLogo: Boolean(q('.v3-cp-header img')),
      company: Boolean(q('.v3-co-header') && q('.v3-co-demo-badge')),
      companyBadge: q('.v3-co-demo-badge')?.textContent ?? '',
      companyBreadcrumb: q('.v3-co-breadcrumb')?.textContent ?? '',
      portalCards: document.querySelectorAll('.v3-portal-card').length,
      loginCta: Boolean(q('.v3-cta-gold')),
    };
  }, route.kind).catch(() => null);

  if (!state) {
    failures.push(`[${tag}] no se pudo evaluar el chrome`);
    return;
  }
  if (state.h1s !== 1) failures.push(`[${tag}] h1 esperados 1, encontrados ${state.h1s}`);
  const expectedH1 = H1[lang][route.path];
  if (state.h1 !== expectedH1) {
    failures.push(`[${tag}] h1 inesperado: "${state.h1}" (esperado "${expectedH1}")`);
  }
  if (route.kind === 'candidate') {
    if (!state.candidate) failures.push(`[${tag}] chrome candidato ausente (topbar/footer)`);
    if (!state.candidateLogo) failures.push(`[${tag}] logo de topbar candidato ausente`);
    if (!state.candidateFooterYear.includes('2026')) failures.push(`[${tag}] footer © 2026 KRUMM ausente: "${state.candidateFooterYear}"`);
  }
  if (route.kind === 'company') {
    if (!state.company) failures.push(`[${tag}] chrome empresa ausente (header/banner demo)`);
    if (!state.companyBadge) failures.push(`[${tag}] badge demo workspace vacío`);
    if (!state.companyBreadcrumb.includes('KRUMM')) failures.push(`[${tag}] breadcrumb KRUMM ausente: "${state.companyBreadcrumb}"`);
  }
  if (route.kind === 'portal' && state.portalCards !== 2) failures.push(`[${tag}] portal cards esperadas 2, encontradas ${state.portalCards}`);
  if (route.kind === 'companyLogin' && !state.loginCta) failures.push(`[${tag}] CTA demo empresa ausente`);
}

async function assertNoOverflow(page, tag) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return { scrollW: doc.scrollWidth, innerW: window.innerWidth };
  });
  if (overflow.scrollW > overflow.innerW + 1) {
    failures.push(`[${tag}] overflow horizontal: scrollWidth=${overflow.scrollW} > innerWidth=${overflow.innerW}`);
  }
}

async function walk(lang, routes, viewport, shootKey) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
  const page = await context.newPage();
  // Un solo registro de listeners por página (los errores se etiquetan por
  // ruta en los asertos; registrar en cada goto duplicaría las capturas).
  track(page, `${lang.toUpperCase()}/${viewport.tag}`);
  await page.addInitScript((l) => {
    try { localStorage.setItem('krumm-lang', l); } catch {}
  }, lang);

  for (const route of routes) {
    const tag = `${lang.toUpperCase()}/${viewport.tag} ${route.path}`;
    try {
      await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'load', timeout: 60000 });
      // Espera al h1 renderizado (React mount) — ancla estable por ruta.
      await page.waitForFunction(
        (expected) => document.querySelector('h1')?.textContent === expected,
        H1[lang][route.path],
        { timeout: 30000 },
      ).catch(() => failures.push(`[${tag}] h1 no apareció (mount React falló o copy erróneo)`));
      await page.waitForTimeout(400); // fonts + settle
      await assertNoOverflow(page, tag);
      await assertChrome(page, tag, lang, route);
      if (shootKey && SHOT_ROUTES.includes(route.path)) {
        await shot(page, `t_1c27edbf-v0-${lang}-${viewport.tag}${route.path.replace(/\//g, '_')}`);
      }
    } catch (err) {
      failures.push(`[${tag}] ${String(err).split('\n')[0]}`);
      await shot(page, `t_1c27edbf-v0-${lang}-${viewport.tag}-FAIL${route.path.replace(/\//g, '_')}`).catch(() => {});
    }
  }
  await context.close();
}

try {
  await walk('es', ROUTES, VIEWPORTS[0], true);
  await walk('es', ROUTES, VIEWPORTS[1], true);
  await walk('en', ROUTES.filter((r) => r.path === '/candidato' || r.path === '/empresa'), VIEWPORTS[0], true);
  await walk('en', ROUTES.filter((r) => r.path === '/candidato' || r.path === '/empresa'), VIEWPORTS[1], false);
} finally {
  await browser.close().catch(() => {});
}

const result = { baseUrl, failures, consoleErrors: consoleErrors.slice(0, 30), screenshots };
console.log(JSON.stringify(result, null, 2));
process.exit(failures.length || consoleErrors.length ? 1 : 0);
