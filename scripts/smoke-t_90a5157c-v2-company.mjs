// t_90a5157c (V2 fase v3) smoke browser (2026-09-08): lado empresa —
// /empresa/acceso (V0, verificación), /empresa (dashboard: KPIs + tabla),
// /empresa/procesos (búsqueda + filtros + sort funcionales, patrón
// processes.js de la referencia). Sobre build de producción (vite preview —
// pitfall Pi: Vite dev + chromium = ERR_INSUFFICIENT_RESOURCES).
//
// Matriz estática:
//   ES: /empresa/acceso, /empresa, /empresa/procesos × 2 viewports
//       (1280×720, 390×844)
//   EN: /empresa, /empresa/procesos × desktop (paridad i18n en vivo)
// Asertos por página:
//   - 0 overflow horizontal (scrollWidth <= innerWidth + 1)
//   - 0 console errors / pageerror / requestfailed
//   - 1 solo h1 con el copy esperado
//   - chrome empresa (sidebar + header + badge demo workspace)
//   - dashboard: 4 KPIs (3/85/81%/24) + 3 filas tabla + hrefs
//   - procesos: 3 cards + count 3
//
// Interacción (aceptación: "filtros/sort operativos"):
//   ES desktop /empresa/procesos:
//     search "calama" → 1 card (Operador de Planta) + count 1
//     department "Mantenimiento" → 1 card (Técnico de Mantención)
//     sort "Más candidatos" → 1ª card Operador (47)
//     search "zzz" → empty state visible + count 0
//     "Limpiar filtros" → 3 cards + count 3
//   EN desktop /empresa/procesos:
//     sort "Role A–Z" → 1ª card "Maintenance Technician"
//
// Salida: JSON { failures, consoleErrors, screenshots }. Exit 1 si hay fallos.

import { chromium } from '@playwright/test';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:4173';
const shotsDir = process.env.SHOTS_DIR ?? 'docs/qa/v2-company';
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
    '/empresa/acceso': 'Portal para empresas',
    '/empresa': 'Dashboard',
    '/empresa/procesos': 'Procesos activos',
  },
  en: {
    '/empresa': 'Dashboard',
    '/empresa/procesos': 'Active processes',
  },
};

const STATIC_ROUTES = [
  { path: '/empresa/acceso', kind: 'access', langs: ['es'] },
  { path: '/empresa', kind: 'dashboard', langs: ['es', 'en'] },
  { path: '/empresa/procesos', kind: 'processes', langs: ['es', 'en'] },
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
      company: Boolean(q('.v3-co-sidebar') && q('.v3-co-header')),
      sidebarNav: q('.v3-co-sidebar') ? q('.v3-co-sidebar').querySelectorAll('.v3-co-nav-item').length : 0,
      demoBadge: Boolean(q('.v3-co-demo-badge')),
      demoBadgeText: q('.v3-co-demo-badge')?.textContent ?? '',
      userChip: q('.v3-co-sidebar')?.textContent ?? '',
      bareLogin: Boolean(q('.v3-company-login')),
      dashboard: {
        kpis: q('.v3-co-metrics') ? [...q('.v3-co-metrics').querySelectorAll('.v3-co-metric > strong')].map((el) => el.textContent.trim()) : null,
        rows: q('.v3-co-process-table') ? q('.v3-co-process-table').querySelectorAll('tbody tr').length : 0,
        viewAll: q('.v3-co-section-heading a')?.getAttribute('href') ?? null,
        footer: q('.v3-co-footer')?.textContent ?? '',
        eyebrow: q('.v3-co-eyebrow')?.textContent ?? '',
      },
      processes: {
        cards: document.querySelectorAll('.v3-pl-card').length,
        count: q('#v2-process-count')?.textContent ?? null,
        search: Boolean(q('#v2-filter-search')),
        department: Boolean(q('#v2-filter-department')),
        location: Boolean(q('#v2-filter-location')),
        sort: Boolean(q('#v2-filter-sort')),
        reset: Boolean(q('#v2-filter-reset')),
        firstCard: q('.v3-pl-card')?.querySelector('h2')?.textContent ?? null,
      },
    };
  }).catch(() => null);

  if (!state) {
    failures.push(`[${tag}] no se pudo evaluar el chrome`);
    return;
  }
  if (state.h1s !== 1) failures.push(`[${tag}] h1 esperados 1, encontrados ${state.h1s}`);
  const expectedH1 = H1[lang][route.path];
  if (state.h1 !== expectedH1) failures.push(`[${tag}] h1 inesperado: "${state.h1}" (esperado "${expectedH1}")`);

  if (route.kind === 'access') {
    // V0 (verificación, plan V2: no se toca)
    if (!state.bareLogin) failures.push(`[${tag}] chrome bare login empresa ausente`);
    return;
  }
  if (!state.company) failures.push(`[${tag}] chrome empresa ausente (sidebar/header)`);
  if (state.sidebarNav < 5) failures.push(`[${tag}] nav sidebar incompleta (${state.sidebarNav} ítems)`);
  if (!state.demoBadge) failures.push(`[${tag}] badge "Demo workspace" ausente`);
  if (!state.userChip.includes('Alex Morgan')) failures.push(`[${tag}] user chip demo ausente`);

  if (route.kind === 'dashboard') {
    const expectedKpis = lang === 'es' ? ['3', '85', '81%', '24'] : ['3', '85', '81%', '24'];
    if (!state.dashboard.kpis) failures.push(`[${tag}] métricas KPI ausentes`);
    else if (JSON.stringify(state.dashboard.kpis) !== JSON.stringify(expectedKpis)) {
      failures.push(`[${tag}] KPIs inesperados: ${JSON.stringify(state.dashboard.kpis)} (esperado ${JSON.stringify(expectedKpis)})`);
    }
    if (state.dashboard.rows !== 3) failures.push(`[${tag}] filas tabla esperadas 3, encontradas ${state.dashboard.rows}`);
    if (state.dashboard.viewAll !== '/empresa/procesos') failures.push(`[${tag}] "View all" href inesperado: ${state.dashboard.viewAll}`);
    if (!state.dashboard.footer.includes('2026')) failures.push(`[${tag}] footer © 2026 KRUMM ausente`);
    if (lang === 'es' && state.dashboard.eyebrow !== 'ANDES INDUSTRIES') failures.push(`[${tag}] eyebrow inesperado: ${state.dashboard.eyebrow}`);
  }
  if (route.kind === 'processes') {
    if (state.processes.cards !== 3) failures.push(`[${tag}] cards procesos esperadas 3, encontradas ${state.processes.cards}`);
    if (state.processes.count !== '3') failures.push(`[${tag}] count esperado "3", encontrado "${state.processes.count}"`);
    for (const control of ['search', 'department', 'location', 'sort', 'reset']) {
      if (!state.processes[control]) failures.push(`[${tag}] control de filtro ausente: ${control}`);
    }
    // sort default "recent": 1ª card = Technician (2026-08-29)
    const expectedFirst = lang === 'es' ? 'Técnico de Mantención' : 'Maintenance Technician';
    if (state.processes.firstCard !== expectedFirst) {
      failures.push(`[${tag}] 1ª card (sort recent) inesperada: "${state.processes.firstCard}" (esperado "${expectedFirst}")`);
    }
  }
}

async function walkStatic(lang, viewport, shootKey) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
  const page = await context.newPage();
  track(page, `${lang.toUpperCase()}/${viewport.tag}`);
  await page.addInitScript((l) => {
    try { localStorage.setItem('krumm-lang', l); } catch {}
  }, lang);

  for (const route of STATIC_ROUTES) {
    if (!route.langs.includes(lang)) continue;
    const tag = `${lang.toUpperCase()}/${viewport.tag} ${route.path}`;
    try {
      await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'load', timeout: 60000 });
      await waitH1(page, tag, H1[lang][route.path]);
      await page.waitForTimeout(400); // fonts + settle
      await assertNoOverflow(page, tag);
      await assertChrome(page, tag, lang, route);
      if (shootKey) {
        await shot(page, `t_90a5157c-v2-${lang}-${viewport.tag}${route.path.replace(/\//g, '_')}`);
      }
    } catch (err) {
      failures.push(`[${tag}] ${String(err).split('\n')[0]}`);
      await shot(page, `t_90a5157c-v2-${lang}-${viewport.tag}-FAIL${route.path.replace(/\//g, '_')}`).catch(() => {});
    }
  }
  await context.close();
}

// ── Interacción ES desktop: filtros/sort operativos (aceptación card) ───────
async function walkFilterInteractions() {
  const context = await browser.newContext({ viewport: { width: VIEWPORTS[0].width, height: VIEWPORTS[0].height } });
  const page = await context.newPage();
  track(page, 'ES/filters');
  await page.addInitScript(() => {
    try { localStorage.setItem('krumm-lang', 'es'); } catch {}
  });
  const tag = 'ES/filters /empresa/procesos';
  try {
    await page.goto(`${baseUrl}/empresa/procesos`, { waitUntil: 'load', timeout: 60000 });
    await waitH1(page, tag, H1.es['/empresa/procesos']);
    const count = () => page.locator('#v2-process-count').textContent();
    const firstCard = () => page.locator('.v3-pl-card h2').first().textContent();
    const cardsCount = () => page.locator('.v3-pl-card').count();

    // 1. search "calama" → 1 card (Operador)
    await page.locator('#v2-filter-search').fill('calama');
    if (await cardsCount() !== 1) failures.push(`[${tag}] search "calama": cards esperadas 1, encontradas ${await cardsCount()}`);
    if ((await count()).trim() !== '1') failures.push(`[${tag}] search "calama": count esperado 1, encontrado "${(await count()).trim()}"`);
    if ((await firstCard()).trim() !== 'Operador de Planta') failures.push(`[${tag}] search "calama": card inesperada "${(await firstCard()).trim()}"`);
    await shot(page, 't_90a5157c-v2-es-filters-search-calama');

    // 2. limpiar búsqueda, department "Mantenimiento" → 1 card (Técnico)
    await page.locator('#v2-filter-search').fill('');
    await page.locator('#v2-filter-department').selectOption('maintenance');
    if (await cardsCount() !== 1) failures.push(`[${tag}] department mantenimiento: cards esperadas 1, encontradas ${await cardsCount()}`);
    if ((await firstCard()).trim() !== 'Técnico de Mantención') failures.push(`[${tag}] department mantenimiento: card inesperada "${(await firstCard()).trim()}"`);
    await shot(page, 't_90a5157c-v2-es-filters-department');

    // 3. reset, sort "Más candidatos" → 1ª card Operador (47)
    await page.locator('#v2-filter-reset').click();
    await page.locator('#v2-filter-sort').selectOption('candidates');
    if (await cardsCount() !== 3) failures.push(`[${tag}] reset: cards esperadas 3, encontradas ${await cardsCount()}`);
    if ((await firstCard()).trim() !== 'Operador de Planta') failures.push(`[${tag}] sort más candidatos: 1ª card inesperada "${(await firstCard()).trim()}"`);
    await shot(page, 't_90a5157c-v2-es-filters-sort-candidates');

    // 4. search "zzz" → empty state + count 0
    await page.locator('#v2-filter-search').fill('zzz');
    if (await cardsCount() !== 0) failures.push(`[${tag}] search "zzz": no debería haber cards`);
    if (!(await page.locator('.v3-pl-empty').isVisible())) failures.push(`[${tag}] search "zzz": empty state no visible`);
    if ((await count()).trim() !== '0') failures.push(`[${tag}] search "zzz": count esperado 0, encontrado "${(await count()).trim()}"`);
    await shot(page, 't_90a5157c-v2-es-filters-empty');

    // 5. "Limpiar filtros" → 3 cards, sort recent de nuevo
    await page.locator('#v2-filter-reset').click();
    if (await cardsCount() !== 3) failures.push(`[${tag}] limpiar filtros: cards esperadas 3, encontradas ${await cardsCount()}`);
    if (await page.locator('.v3-pl-empty').isVisible()) failures.push(`[${tag}] limpiar filtros: empty state sigue visible`);
    if ((await firstCard()).trim() !== 'Técnico de Mantención') failures.push(`[${tag}] limpiar filtros: sort no volvió a "recent" (1ª "${(await firstCard()).trim()}")`);
    await shot(page, 't_90a5157c-v2-es-filters-reset');
  } catch (err) {
    failures.push(`[${tag}] ${String(err).split('\n')[0]}`);
    await shot(page, 't_90a5157c-v2-es-filters-FAIL').catch(() => {});
  }
  await context.close();
}

// ── Interacción EN desktop: sort A–Z por cargo EN ────────────────────────────
async function walkEnSort() {
  const context = await browser.newContext({ viewport: { width: VIEWPORTS[0].width, height: VIEWPORTS[0].height } });
  const page = await context.newPage();
  track(page, 'EN/sort');
  await page.addInitScript(() => {
    try { localStorage.setItem('krumm-lang', 'en'); } catch {}
  });
  const tag = 'EN/sort /empresa/procesos';
  try {
    await page.goto(`${baseUrl}/empresa/procesos`, { waitUntil: 'load', timeout: 60000 });
    await waitH1(page, tag, H1.en['/empresa/procesos']);
    await page.locator('#v2-filter-sort').selectOption('name');
    const first = (await page.locator('.v3-pl-card h2').first().textContent()).trim();
    if (first !== 'Maintenance Technician') failures.push(`[${tag}] sort Role A–Z (EN): 1ª card inesperada "${first}"`);
    // búsqueda EN por cargo
    await page.locator('#v2-filter-reset').click();
    await page.locator('#v2-filter-search').fill('calama');
    const cards = await page.locator('.v3-pl-card').count();
    if (cards !== 1) failures.push(`[${tag}] search EN "calama": cards esperadas 1, encontradas ${cards}`);
    await shot(page, 't_90a5157c-v2-en-sort-name');
  } catch (err) {
    failures.push(`[${tag}] ${String(err).split('\n')[0]}`);
    await shot(page, 't_90a5157c-v2-en-sort-FAIL').catch(() => {});
  }
  await context.close();
}

await walkStatic('es', VIEWPORTS[0], true);
await walkStatic('es', VIEWPORTS[1], true);
await walkStatic('en', VIEWPORTS[0], false);
await walkFilterInteractions();
await walkEnSort();
await browser.close();

const result = {
  task: 't_90a5157c (V2 fase v3)',
  baseUrl,
  failures,
  consoleErrors,
  screenshots,
  ok: failures.length === 0 && consoleErrors.length === 0,
};
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
