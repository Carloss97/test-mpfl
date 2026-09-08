// t_9319e84d (V4 fase v3) smoke browser (2026-09-08): new request empresa —
// hub (2 cards), diseño guiado (3 pasos → proceso draft en sessionStorage),
// upload (validación + metadatos, sin NLP). Sobre build de producción
// (vite preview 4173 — pitfall Pi RAM).
//
// Matriz estática:
//   ES desktop 1280×720: hub, diseño (paso 1), subida, procesos, dashboard,
//   detalle draft; EN desktop: hub + diseño (paridad i18n en vivo);
//   ES móvil 390×844: hub, diseño, subida (overflow + apilado 1 col).
// Asertos por página: 0 overflow horizontal, 0 console errors / pageerror /
// requestfailed, h1 esperado, chrome empresa (sidebar + badge demo).
//
// Recorrido de aceptación (ES desktop, navegación REAL de carga completa):
//   1. diseño: llena 3 pasos → "Proceso creado" (confirmación)
//   2. click "Ver procesos" (carga completa) → 4 cards (draft visible:
//      sessionStorage sobrevive a la navegación — desviación 1 del plan)
//   3. click "Ver proceso" del draft → detalle coherente (0/0/0/—, config del
//      form, sin avanzadas, nota "Aún no hay candidatos")
//   4. dashboard → KPI "Procesos activos" = 4
//   5. subida: txt válido → metadatos + confirmación; "Elegir otro" + png →
//      error de tipo (sin confirmación)
//   6. recarga /empresa/procesos → 4 cards (persiste en la pestaña)
//   7. contexto NUEVO (navegación limpia) → 3 cards (sin backend / sin
//      persistencia entre pestañas)
//
// Salida: JSON { failures, consoleErrors, screenshots }. Exit 1 si hay fallos.

import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:4173';
const shotsDir = process.env.SHOTS_DIR ?? 'docs/qa/v4-company-request';
const failures = [];
const consoleErrors = [];
const screenshots = [];

mkdirSync(shotsDir, { recursive: true });

// Archivos de prueba (temporales, contenido irrelevante: la UI solo lee
// name/size/type — el smoke además verifica que el contenido NO aparece).
const TXT_PATH = '/tmp/v4-smoke-perfil.txt';
const PNG_PATH = '/tmp/v4-smoke-foto.png';
writeFileSync(TXT_PATH, '012345678');
writeFileSync(PNG_PATH, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

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

async function assertNoOverflow(page, tag) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return { scrollW: doc.scrollWidth, innerW: window.innerWidth };
  });
  if (overflow.scrollW > overflow.innerW + 1) {
    failures.push(`[${tag}] overflow horizontal: scrollWidth=${overflow.scrollW} > innerWidth=${overflow.innerW}`);
  }
}

async function assertChrome(page, tag) {
  const state = await page.evaluate(() => ({
    sidebar: Boolean(document.querySelector('.v3-co-sidebar')),
    demoBadge: Boolean(document.querySelector('.v3-co-demo-badge')),
    h1s: document.querySelectorAll('h1').length,
    h1: document.querySelector('h1')?.textContent ?? null,
  }));
  if (!state.sidebar || !state.demoBadge) failures.push(`[${tag}] chrome empresa ausente (sidebar=${state.sidebar}, badge=${state.demoBadge})`);
  if (state.h1s !== 1) failures.push(`[${tag}] h1 esperado: 1, encontrado: ${state.h1s}`);
}

async function waitReady(page, selector, tag, timeout = 30000) {
  try {
    await page.waitForSelector(selector, { timeout });
  } catch {
    failures.push(`[${tag}] no apareció ${selector}`);
  }
}

// ── Contexto ES desktop: recorrido de aceptación ─────────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  track(page, 'es-desktop');

  // 1. hub
  await page.goto(`${baseUrl}/empresa/nueva-solicitud`, { waitUntil: 'networkidle' });
  await waitReady(page, '.v4-req-card', 'es-desktop/hub');
  const hub = await page.evaluate(() => ({
    h1: document.querySelector('h1')?.textContent ?? null,
    cards: document.querySelectorAll('.v4-req-card').length,
    uploadHref: document.querySelector('a.v4-req-card')?.getAttribute('href') ?? null,
    designHref: document.querySelector('a.v4-req-card--featured')?.getAttribute('href') ?? null,
    quickBadge: document.querySelector('.v4-req-badge')?.textContent ?? null,
    featuredBadge: document.querySelector('.v4-req-badge--featured')?.textContent ?? null,
  }));
  if (hub.h1 !== 'Nueva solicitud') failures.push(`[es-desktop/hub] h1=${hub.h1}`);
  if (hub.cards !== 2) failures.push(`[es-desktop/hub] cards=${hub.cards} (esperado 2)`);
  if (hub.uploadHref !== '/empresa/nueva-solicitud/subida') failures.push(`[es-desktop/hub] upload href=${hub.uploadHref}`);
  if (hub.designHref !== '/empresa/nueva-solicitud/diseño') failures.push(`[es-desktop/hub] design href=${hub.designHref}`);
  if (hub.quickBadge !== 'RÁPIDO') failures.push(`[es-desktop/hub] quick badge=${hub.quickBadge}`);
  if (hub.featuredBadge !== 'RECOMENDADO') failures.push(`[es-desktop/hub] featured badge=${hub.featuredBadge}`);
  await assertNoOverflow(page, 'es-desktop/hub');
  await assertChrome(page, 'es-desktop/hub');
  await shot(page, '01-hub-es');

  // 2. diseño: 3 pasos → crear
  await page.goto(`${baseUrl}/empresa/nueva-solicitud/diseño`, { waitUntil: 'networkidle' });
  await waitReady(page, '#v4-rd-role', 'es-desktop/diseño');
  await assertChrome(page, 'es-desktop/diseño');
  await shot(page, '02-diseno-paso1-es');
  await page.fill('#v4-rd-role', 'Analista de Control');
  await page.selectOption('#v4-rd-department', 'operations');
  await page.fill('#v4-rd-location', 'Antofagasta, Chile');
  await page.click('button:has-text("Siguiente")');
  await waitReady(page, '#v4-rd-mode', 'es-desktop/diseño-p2');
  await page.fill('#v4-rd-profile', 'Perfil orientado a datos y control de procesos.');
  await page.click('button:has-text("Siguiente")');
  await waitReady(page, '[data-testid="v4-rd-review"]', 'es-desktop/diseño-p3');
  const review = await page.evaluate(() => document.querySelector('[data-testid="v4-rd-review"]')?.textContent ?? '');
  for (const expected of ['Analista de Control', 'Operaciones', 'Antofagasta, Chile', 'Presencial', 'Perfil orientado a datos y control de procesos.']) {
    if (!review.includes(expected)) failures.push(`[es-desktop/diseño-p3] review sin "${expected}"`);
  }
  await shot(page, '03-diseno-resumen-es');
  await page.click('button:has-text("Crear proceso")');
  await waitReady(page, '[data-testid="v4-rd-done"]', 'es-desktop/diseño-done');
  const done = await page.evaluate(() => document.querySelector('[data-testid="v4-rd-done"]')?.textContent ?? '');
  if (!done.includes('Proceso creado')) failures.push(`[es-desktop/diseño-done] confirmación ausente: ${done.slice(0, 120)}`);
  if (!done.includes('Analista de Control')) failures.push('[es-desktop/diseño-done] cargo no aparece en la confirmación');
  await shot(page, '04-diseno-creado-es');

  // 3. "Ver procesos" → NAVEGACIÓN REAL (carga completa) → 4 cards
  await page.click('[data-testid="v4-rd-view"]');
  await waitReady(page, '#v2-process-list', 'es-desktop/procesos');
  await page.waitForFunction(() => document.querySelectorAll('#v2-process-list .v3-pl-card').length === 4, null, { timeout: 15000 })
    .catch(() => failures.push('[es-desktop/procesos] el draft no aparece en la lista tras la navegación real'));
  const procs = await page.evaluate(() => ({
    count: document.querySelectorAll('#v2-process-list .v3-pl-card').length,
    hasDraft: Boolean(document.querySelector('[data-testid="v2-card-analista-de-control"]')),
    countText: document.querySelector('#v2-process-count')?.textContent ?? null,
  }));
  if (procs.count !== 4 || !procs.hasDraft || procs.countText !== '4') {
    failures.push(`[es-desktop/procesos] count=${procs.count}, draft=${procs.hasDraft}, countText=${procs.countText} (esperado 4/true/4)`);
  }
  await assertNoOverflow(page, 'es-desktop/procesos');
  await assertChrome(page, 'es-desktop/procesos');
  await shot(page, '05-procesos-4cards-es');

  // 4. detalle del draft (click "Ver proceso" de la card nueva)
  await page.click('[data-testid="v2-card-analista-de-control"] a:has-text("Ver proceso")');
  await waitReady(page, '.v3-pd', 'es-desktop/detalle');
  await page.waitForFunction(() => document.querySelector('h1')?.textContent === 'Analista de Control', null, { timeout: 15000 })
    .catch(() => failures.push('[es-desktop/detalle] h1 del draft no apareció'));
  const detail = await page.evaluate(() => ({
    metrics: [...document.querySelectorAll('.v3-co-metrics .v3-co-metric > strong')].map((el) => el.textContent.trim()),
    advanced: Boolean(document.querySelector('.v3-pa')),
    config: document.querySelector('.v3-pd-config')?.textContent ?? '',
    tableRows: document.querySelectorAll('.v3-pd-table tbody tr').length,
    emptyNote: document.querySelector('[data-testid="v4-pd-no-candidates"]')?.textContent?.trim() ?? null,
    created: document.querySelector('.v3-pd-heading p')?.textContent ?? '',
  }));
  if (JSON.stringify(detail.metrics) !== JSON.stringify(['0', '0', '0', '—'])) {
    failures.push(`[es-desktop/detalle] métricas=${JSON.stringify(detail.metrics)} (esperado ["0","0","0","—"])`);
  }
  if (detail.advanced) failures.push('[es-desktop/detalle] sección avanzadas presente (no debe)');
  for (const expected of ['Operaciones', 'Antofagasta, Chile', 'Presencial', 'Perfil orientado a datos y control de procesos.']) {
    if (!detail.config.includes(expected)) failures.push(`[es-desktop/detalle] config sin "${expected}"`);
  }
  if (detail.tableRows !== 1 || !detail.emptyNote?.includes('Aún no hay candidatos')) {
    failures.push(`[es-desktop/detalle] tabla: rows=${detail.tableRows}, nota=${detail.emptyNote}`);
  }
  if (!detail.created.includes('8 de septiembre de 2026')) {
    failures.push(`[es-desktop/detalle] fecha creada inesperada: ${detail.created}`);
  }
  await assertNoOverflow(page, 'es-desktop/detalle');
  await assertChrome(page, 'es-desktop/detalle');
  await shot(page, '06-detalle-draft-es');

  // 5. dashboard: KPI "Procesos activos" = 4
  await page.goto(`${baseUrl}/empresa`, { waitUntil: 'networkidle' });
  await waitReady(page, '.v3-co-metrics', 'es-desktop/dashboard');
  const kpis = await page.evaluate(() => [...document.querySelectorAll('.v3-co-metrics .v3-co-metric > strong')].map((el) => el.textContent.trim()));
  if (kpis[0] !== '4') failures.push(`[es-desktop/dashboard] KPI procesos activos=${kpis[0]} (esperado 4)`);
  await assertNoOverflow(page, 'es-desktop/dashboard');
  await shot(page, '07-dashboard-kpi4-es');

  // 6. subida: txt válido → metadatos + confirmación
  await page.goto(`${baseUrl}/empresa/nueva-solicitud/subida`, { waitUntil: 'networkidle' });
  await waitReady(page, '#v4-ru-file', 'es-desktop/subida');
  await assertChrome(page, 'es-desktop/subida');
  await shot(page, '08-subida-inicial-es');
  await page.setInputFiles('#v4-ru-file', TXT_PATH);
  await waitReady(page, '[data-testid="v4-ru-done"]', 'es-desktop/subida-done');
  const upDone = await page.evaluate(() => document.querySelector('[data-testid="v4-ru-done"]')?.textContent ?? '');
  if (!upDone.includes('v4-smoke-perfil.txt') || !upDone.includes('TXT') || !upDone.includes('9 B')) {
    failures.push(`[es-desktop/subida-done] metadatos incompletos: ${upDone.slice(0, 160)}`);
  }
  if (!upDone.includes('Documento recibido')) failures.push('[es-desktop/subida-done] confirmación ausente');
  if (upDone.includes('012345678')) failures.push('[es-desktop/subida-done] PRIVACIDAD: el contenido del archivo aparece en la UI');
  await assertNoOverflow(page, 'es-desktop/subida-done');
  await shot(page, '09-subida-confirmed-es');

  // 7. subida: png → error de tipo (sin confirmación)
  await page.click('button:has-text("Elegir otro documento")');
  await waitReady(page, '#v4-ru-file', 'es-desktop/subida-reset');
  await page.setInputFiles('#v4-ru-file', PNG_PATH);
  await page.waitForTimeout(200);
  const upErr = await page.evaluate(() => ({
    alert: document.querySelector('[role="alert"]')?.textContent?.trim() ?? null,
    done: Boolean(document.querySelector('[data-testid="v4-ru-done"]')),
  }));
  if (!upErr.alert?.includes('Formato no soportado')) failures.push(`[es-desktop/subida-err] error inesperado: ${upErr.alert}`);
  if (upErr.done) failures.push('[es-desktop/subida-err] confirmación presente con archivo inválido');
  await shot(page, '10-subida-error-png-es');

  // 8. persistencia en la pestaña: recarga /empresa/procesos → 4 cards
  await page.goto(`${baseUrl}/empresa/procesos`, { waitUntil: 'networkidle' });
  await waitReady(page, '#v2-process-list', 'es-desktop/reload-procesos');
  const afterReload = await page.evaluate(() => document.querySelectorAll('#v2-process-list .v3-pl-card').length);
  if (afterReload !== 4) failures.push(`[es-desktop/reload-procesos] tras recarga cards=${afterReload} (esperado 4, sessionStorage)`);
  await shot(page, '11-reload-procesos-4cards-es');

  await ctx.close();
}

// ── Contexto NUEVO (pestaña limpia): sin backend → 3 cards ───────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  track(page, 'ctx-nuevo');
  await page.goto(`${baseUrl}/empresa/procesos`, { waitUntil: 'networkidle' });
  await waitReady(page, '#v2-process-list', 'ctx-nuevo');
  const cards = await page.evaluate(() => document.querySelectorAll('#v2-process-list .v3-pl-card').length);
  if (cards !== 3) failures.push(`[ctx-nuevo] cards=${cards} (esperado 3: los drafts no persisten entre pestañas, sin backend)`);
  await ctx.close();
}

// ── Contexto EN desktop: paridad i18n en vivo ────────────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  track(page, 'en-desktop');

  await page.goto(`${baseUrl}/empresa/nueva-solicitud`, { waitUntil: 'networkidle' });
  await waitReady(page, '.v4-req-card', 'en-desktop/hub');
  // (scoped al toggle: "Cuenta" en la sidebar contiene "en" case-insensitive)
  await page.click('.krumm-lang-toggle button:has-text("EN")');
  await page.waitForFunction(() => document.querySelector('h1')?.textContent === 'New request', null, { timeout: 10000 })
    .catch(() => failures.push('[en-desktop/hub] toggle EN no aplicó (h1 sigue ES)'));
  const enHub = await page.evaluate(() => ({
    h1: document.querySelector('h1')?.textContent ?? null,
    subtitle: document.querySelector('.v4-req .v3-co-page-heading p')?.textContent ?? '',
    quick: document.querySelector('.v4-req-badge')?.textContent ?? null,
    featured: document.querySelector('.v4-req-badge--featured')?.textContent ?? null,
    uploadCard: document.querySelector('a.v4-req-card h3')?.textContent ?? null,
    designCard: document.querySelector('a.v4-req-card--featured h3')?.textContent ?? null,
  }));
  if (enHub.h1 !== 'New request') failures.push(`[en-desktop/hub] h1=${enHub.h1}`);
  if (enHub.quick !== 'QUICK' || enHub.featured !== 'RECOMMENDED') failures.push(`[en-desktop/hub] badges=${enHub.quick}/${enHub.featured}`);
  if (enHub.uploadCard !== 'Upload an existing profile') failures.push(`[en-desktop/hub] upload card=${enHub.uploadCard}`);
  if (enHub.designCard !== 'Design profile with KRUMM') failures.push(`[en-desktop/hub] design card=${enHub.designCard}`);
  if (!enHub.subtitle.includes('Define the profile you want to assess')) failures.push(`[en-desktop/hub] subtitle=${enHub.subtitle}`);
  await assertNoOverflow(page, 'en-desktop/hub');
  await assertChrome(page, 'en-desktop/hub');
  await shot(page, '12-hub-en');

  // diseño EN: paso 1 vacío → errores EN
  await page.goto(`${baseUrl}/empresa/nueva-solicitud/diseño`, { waitUntil: 'networkidle' });
  await waitReady(page, '#v4-rd-role', 'en-desktop/diseño');
  await assertChrome(page, 'en-desktop/diseño');
  await page.click('button:has-text("Next")');
  await page.waitForTimeout(150);
  const enErr = await page.evaluate(() => document.querySelector('[role="alert"]')?.textContent ?? '');
  if (!enErr.includes('Enter the role name.') || !enErr.includes('Select a department.')) {
    failures.push(`[en-desktop/diseño] errores EN inesperados: ${enErr}`);
  }
  const enStep = await page.evaluate(() => document.querySelector('.v4-rd-step-title')?.textContent ?? null);
  if (enStep !== 'Define the role') failures.push(`[en-desktop/diseño] título paso=${enStep} (esperado "Define the role")`);
  await assertNoOverflow(page, 'en-desktop/diseño');
  await shot(page, '13-diseno-paso1-en');
  await ctx.close();
}

// ── Contexto ES móvil 390×844: overflow + apilado 1 columna ─────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  track(page, 'es-mobile');

  const routes = [
    ['/empresa/nueva-solicitud', '.v4-req-card', '14-hub-movil'],
    ['/empresa/nueva-solicitud/diseño', '#v4-rd-role', '15-diseno-movil'],
    ['/empresa/nueva-solicitud/subida', '#v4-ru-file', '16-subida-movil'],
  ];
  for (const [path, ready, shotName] of routes) {
    await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' });
    await waitReady(page, ready, `es-mobile${path}`);
    await assertNoOverflow(page, `es-mobile${path}`);
    await shot(page, shotName);
  }
  // apilado 1 columna en el hub: la card design empieza DEBAJO de la upload
  await page.goto(`${baseUrl}/empresa/nueva-solicitud`, { waitUntil: 'networkidle' });
  await waitReady(page, '.v4-req-card', 'es-mobile/stack');
  const stack = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.v4-req-card')];
    if (cards.length !== 2) return null;
    const [a, b] = cards.map((el) => el.getBoundingClientRect());
    return b.top >= a.bottom - 2;
  });
  if (stack !== true) failures.push(`[es-mobile/stack] cards no apiladas en 1 columna (b.top>=a.bottom): ${stack}`);
  await ctx.close();
}

await browser.close();

const result = {
  ok: failures.length === 0 && consoleErrors.length === 0,
  failures,
  consoleErrors,
  screenshots,
};
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
