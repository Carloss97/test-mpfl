// t_482f57b2 (V1 fase v3) smoke browser (2026-09-07): lado candidato —
// /portal (V0, verificación), /candidato (home real: 2 cards de la ref),
// /candidato/acceso (form → guard de invitación), /empleos (job board
// honesto, igual que la ref). Sobre build de producción (vite preview —
// pitfall Pi: Vite dev + chromium = ERR_INSUFFICIENT_RESOURCES).
//
// Matriz estática:
//   ES: /portal, /candidato, /candidato/acceso, /empleos × 2 viewports
//       (1280×720, 390×844)
//   EN: /candidato, /candidato/acceso × 2 viewports (paridad i18n en vivo)
// Asertos por página:
//   - 0 overflow horizontal (scrollWidth <= innerWidth + 1)
//   - 0 console errors / pageerror / requestfailed
//   - chrome candidato (topbar logo + footer © 2026 KRUMM)
//   - un solo h1 con el copy esperado (V3_COPY)
//   - contenido específico: home → .v3-cp-grid 2 cards; acceso → form
//     (input + submit); empleos → .v3-placeholder; portal → 2 cards
//
// Recorrido de aceptación (card V1): portal → home → acceso → invitación
// válida → /postulaciones (flujo intacto, guard + setup):
//   B) ES desktop: /portal → click card candidato → /candidato → click card
//      invitación → /candidato/acceso → escribir tok-valid-abc123 → submit →
//      /postulaciones?invite=… → guard → SETUP ("Preparación de la sesión").
//   C) ES móvil: /candidato/acceso → tok-expired-abc123 → submit → guard →
//      "Invitación no válida" (ha expirado).
//
// Salida: JSON { failures, consoleErrors, screenshots }. Exit 1 si hay fallos.

import { chromium } from '@playwright/test';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:4173';
const shotsDir = process.env.SHOTS_DIR ?? 'docs/qa/v1-candidate';
const failures = [];
const consoleErrors = [];
const screenshots = [];

const VIEWPORTS = [
  { width: 1280, height: 720, tag: 'desktop' },
  { width: 390, height: 844, tag: 'mobile' },
];

// h1 esperado por ruta/idioma (mismo origen que el app: V3_COPY).
const H1 = {
  es: {
    '/portal': 'Elige tu portal',
    '/candidato': 'Encuentra tu próxima oportunidad.',
    '/candidato/acceso': 'Acceso candidato',
    '/empleos': 'Bolsa de empleos',
  },
  en: {
    '/portal': 'Choose your portal',
    '/candidato': 'Find your next opportunity.',
    '/candidato/acceso': 'Candidate access',
    '/empleos': 'Job board',
  },
};

const STATIC_ROUTES = [
  { path: '/portal', kind: 'portal' },
  { path: '/candidato', kind: 'home' },
  { path: '/candidato/acceso', kind: 'access' },
  { path: '/empleos', kind: 'jobs' },
];

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

async function waitH1(page, tag, text, timeout = 30000) {
  await page.waitForFunction(
    (expected) => document.querySelector('h1')?.textContent === expected,
    text,
    { timeout },
  ).catch(() => failures.push(`[${tag}] h1 no apareció (esperado "${text}")`));
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

async function assertChrome(page, tag, lang, route) {
  const state = await page.evaluate(() => {
    const q = (sel) => document.querySelector(sel);
    return {
      h1s: document.querySelectorAll('h1').length,
      h1: q('h1')?.textContent ?? null,
      candidate: Boolean(q('.v3-cp-header') && q('.v3-cp-footer')),
      candidateLogo: Boolean(q('.v3-cp-header img')),
      footerYear: q('.v3-cp-footer')?.textContent ?? '',
      portalCards: document.querySelectorAll('.v3-portal-card').length,
      homeGrid: q('.v3-cp-grid') ? q('.v3-cp-grid').querySelectorAll('.v3-cp-card').length : 0,
      homePlaceholder: Boolean(q('.v3-cp-grid') && q('.v3-placeholder')),
      accessForm: Boolean(q('.v3-ca form') && q('.v3-ca input')),
      accessSubmit: Boolean(q('.v3-ca-submit')),
      jobsPlaceholder: Boolean(q('.v3-placeholder')),
    };
  }).catch(() => null);

  if (!state) {
    failures.push(`[${tag}] no se pudo evaluar el chrome`);
    return;
  }
  if (state.h1s !== 1) failures.push(`[${tag}] h1 esperados 1, encontrados ${state.h1s}`);
  const expectedH1 = H1[lang][route.path];
  if (state.h1 !== expectedH1) failures.push(`[${tag}] h1 inesperado: "${state.h1}" (esperado "${expectedH1}")`);
  // chrome candidato en todas las rutas de la matriz (portal incluido: es
  // bare en V0 pero el portal sí usa topbar+footer .v3-bare — verificación
  // específica por kind abajo).
  if (route.kind === 'portal') {
    if (state.portalCards !== 2) failures.push(`[${tag}] portal cards esperadas 2, encontradas ${state.portalCards}`);
    return;
  }
  if (!state.candidate) failures.push(`[${tag}] chrome candidato ausente (topbar/footer)`);
  if (!state.candidateLogo) failures.push(`[${tag}] logo de topbar candidato ausente`);
  if (!state.footerYear.includes('2026')) failures.push(`[${tag}] footer © 2026 KRUMM ausente: "${state.footerYear}"`);
  if (route.kind === 'home') {
    if (state.homeGrid !== 2) failures.push(`[${tag}] home grid: 2 cards esperadas, encontradas ${state.homeGrid}`);
    if (state.homePlaceholder) failures.push(`[${tag}] home no debe renderizar placeholder (V1: página real)`);
  }
  if (route.kind === 'access') {
    if (!state.accessForm) failures.push(`[${tag}] form de acceso ausente (input)`);
    if (!state.accessSubmit) failures.push(`[${tag}] botón submit de acceso ausente`);
  }
  if (route.kind === 'jobs' && !state.jobsPlaceholder) failures.push(`[${tag}] job board: placeholder "próxima iteración" ausente`);
}

async function walkStatic(lang, viewport, shootKey) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
  const page = await context.newPage();
  track(page, `${lang.toUpperCase()}/${viewport.tag}`);
  await page.addInitScript((l) => {
    try { localStorage.setItem('krumm-lang', l); } catch {}
  }, lang);

  for (const route of STATIC_ROUTES) {
    if (lang === 'en' && !['/candidato', '/candidato/acceso'].includes(route.path)) continue;
    const tag = `${lang.toUpperCase()}/${viewport.tag} ${route.path}`;
    try {
      await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'load', timeout: 60000 });
      await waitH1(page, tag, H1[lang][route.path]);
      await page.waitForTimeout(400); // fonts + settle
      await assertNoOverflow(page, tag);
      await assertChrome(page, tag, lang, route);
      if (shootKey) {
        await shot(page, `t_482f57b2-v1-${lang}-${viewport.tag}${route.path.replace(/\//g, '_')}`);
      }
    } catch (err) {
      failures.push(`[${tag}] ${String(err).split('\n')[0]}`);
      await shot(page, `t_482f57b2-v1-${lang}-${viewport.tag}-FAIL${route.path.replace(/\//g, '_')}`).catch(() => {});
    }
  }
  await context.close();
}

// ── B: recorrido de aceptación (ES desktop) ────────────────────────────────
async function walkAcceptanceFlow() {
  const context = await browser.newContext({ viewport: { width: VIEWPORTS[0].width, height: VIEWPORTS[0].height } });
  const page = await context.newPage();
  track(page, 'ES/flow-valid');
  await page.addInitScript(() => {
    try { localStorage.setItem('krumm-lang', 'es'); } catch {}
  });
  const tag = 'ES/flow-valid';
  try {
    // 1. /portal → card candidato
    await page.goto(`${baseUrl}/portal`, { waitUntil: 'load', timeout: 60000 });
    await waitH1(page, tag, H1.es['/portal']);
    await page.locator('.v3-portal-card[href="/candidato"]').click();
    await page.waitForURL('**/candidato', { timeout: 30000 });
    await waitH1(page, tag, H1.es['/candidato']);
    // 2. home → card invitación
    await page.locator('.v3-cp-card[href="/candidato/acceso"]').click();
    await page.waitForURL('**/candidato/acceso', { timeout: 30000 });
    await waitH1(page, tag, H1.es['/candidato/acceso']);
    // 3. acceso → token válido → guard → setup (flujo /postulaciones intacto)
    await page.locator('.v3-ca-input').fill('tok-valid-abc123');
    await page.locator('.v3-ca-submit').click();
    await page.waitForURL((url) => url.pathname === '/postulaciones' && url.searchParams.get('invite') === 'tok-valid-abc123', { timeout: 30000 });
    await waitH1(page, tag, 'Preparación de la sesión');
    const demoPhase = await page.evaluate(() => document.querySelector('[data-demo-phase]')?.getAttribute('data-demo-phase') ?? null);
    if (demoPhase !== 'setup') failures.push(`[${tag}] fase demo esperada "setup", encontrada "${demoPhase}"`);
    await assertNoOverflow(page, tag);
    await page.waitForTimeout(400);
    await shot(page, 't_482f57b2-v1-es-flow-setup-postguard');
    console.log(`[V1] flujo válido OK: /portal → /candidato → /candidato/acceso → /postulaciones (setup)`);
  } catch (err) {
    failures.push(`[${tag}] ${String(err).split('\n')[0]}`);
    await shot(page, 't_482f57b2-v1-es-flow-valid-FAIL').catch(() => {});
  }
  await context.close();
}

// ── C: guard expirado (ES móvil) ───────────────────────────────────────────
async function walkExpiredFlow() {
  const context = await browser.newContext({ viewport: { width: VIEWPORTS[1].width, height: VIEWPORTS[1].height } });
  const page = await context.newPage();
  track(page, 'ES/flow-expired');
  await page.addInitScript(() => {
    try { localStorage.setItem('krumm-lang', 'es'); } catch {}
  });
  const tag = 'ES/flow-expired';
  try {
    await page.goto(`${baseUrl}/candidato/acceso`, { waitUntil: 'load', timeout: 60000 });
    await waitH1(page, tag, H1.es['/candidato/acceso']);
    await page.locator('.v3-ca-input').fill('tok-expired-abc123');
    await page.locator('.v3-ca-submit').click();
    await page.waitForURL((url) => url.pathname === '/postulaciones' && url.searchParams.get('invite') === 'tok-expired-abc123', { timeout: 30000 });
    await waitH1(page, tag, 'Invitación no válida');
    const expiredMsg = await page.evaluate(() => document.body.textContent.includes('ha expirado'));
    if (!expiredMsg) failures.push(`[${tag}] mensaje de invitación expirada ausente`);
    await assertNoOverflow(page, tag);
    await page.waitForTimeout(400);
    await shot(page, 't_482f57b2-v1-es-mobile-flow-guard-expirado');
    console.log('[V1] flujo expirado OK: guard bloquea con el mensaje correcto');
  } catch (err) {
    failures.push(`[${tag}] ${String(err).split('\n')[0]}`);
    await shot(page, 't_482f57b2-v1-es-flow-expired-FAIL').catch(() => {});
  }
  await context.close();
}

try {
  await walkStatic('es', VIEWPORTS[0], true);
  await walkStatic('es', VIEWPORTS[1], true);
  await walkStatic('en', VIEWPORTS[0], true);
  await walkStatic('en', VIEWPORTS[1], false);
  await walkAcceptanceFlow();
  await walkExpiredFlow();
} finally {
  await browser.close().catch(() => {});
}

const result = { baseUrl, failures, consoleErrors: consoleErrors.slice(0, 30), screenshots };
console.log(JSON.stringify(result, null, 2));
process.exit(failures.length || consoleErrors.length ? 1 : 0);
