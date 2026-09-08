// t_84f00355 (V3 fase v3) smoke browser (2026-09-08): lado empresa —
// detalle de proceso (/empresa/proceso/:id, 3 perfiles de la referencia) y
// reporte de candidato embebido (/empresa/proceso/:id/candidatos/:sessionId,
// motor H4.3). Sobre build de producción (vite preview — pitfall Pi RAM).
//
// Matriz estática:
//   ES: /empresa/proceso/{supervisor,operator,technician} + reporte top
//       (supervisor/candidatos/maria-gonzalez) × desktop 1280×720;
//       detail supervisor + reporte × móvil 390×844 (overflow).
//   EN: detail supervisor + reporte × desktop (paridad i18n en vivo).
// Asertos por página:
//   - 0 overflow horizontal
//   - 0 console errors / pageerror / requestfailed
//   - 1 solo h1 con el copy esperado
//   - chrome empresa (sidebar + badge demo)
//   - detail: 4 métricas (18/23/19/78% supervisor), 6 rows tabla, back
//   - reporte: 8 construct cards, warning evidencias, banner demo, back
//
// Interacción (aceptación: "navegación back"):
//   ES desktop: link "Ver informe" row 1 → reporte; back → detail;
//   back → procesos (3 cards); menú ⋯ abre 3 menuitems y Escape cierra;
//   "Pausar proceso" → diálogo preview; "Estadísticas avanzadas" expande.
//   EN desktop: detail + report con copias EN.
//
// Salida: JSON { failures, consoleErrors, screenshots }. Exit 1 si hay fallos.

import { chromium } from '@playwright/test';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:4173';
const shotsDir = process.env.SHOTS_DIR ?? 'docs/qa/v3-process-detail';
const failures = [];
const consoleErrors = [];
const screenshots = [];

const VIEWPORTS = [
  { width: 1280, height: 720, tag: 'desktop' },
  { width: 390, height: 844, tag: 'mobile' },
];

const TOP_REPORT_PATH = '/empresa/proceso/supervisor/candidatos/maria-gonzalez';

// h1 esperado por ruta/idioma.
const H1 = {
  es: {
    '/empresa/proceso/supervisor': 'Supervisor de Planta',
    '/empresa/proceso/operator': 'Operador de Planta',
    '/empresa/proceso/technician': 'Técnico de Mantención',
    [TOP_REPORT_PATH]: 'Informe del candidato',
  },
  en: {
    '/empresa/proceso/supervisor': 'Plant Supervisor',
    [TOP_REPORT_PATH]: 'Candidate report',
  },
};

const DETAIL_ROUTES = [
  { path: '/empresa/proceso/supervisor', kind: 'detail', langs: ['es', 'en'] },
  { path: '/empresa/proceso/operator', kind: 'detail', langs: ['es'] },
  { path: '/empresa/proceso/technician', kind: 'detail', langs: ['es'] },
  { path: TOP_REPORT_PATH, kind: 'report', langs: ['es', 'en'] },
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
      demoBadge: Boolean(q('.v3-co-demo-badge')),
      userChip: q('.v3-co-sidebar')?.textContent ?? '',
      detail: {
        back: q('.v3-pd .v3-back')?.getAttribute('href') ?? null,
        metrics: q('.v3-co-metrics') ? [...q('.v3-co-metrics').querySelectorAll('.v3-co-metric > strong')].map((el) => el.textContent.trim()) : null,
        tableRows: q('.v3-pd-table') ? q('.v3-pd-table').querySelectorAll('tbody tr').length : 0,
        firstRowName: q('.v3-pd-table tbody tr .v3-pd-person strong')?.textContent?.trim() ?? null,
        firstRowScore: q('.v3-pd-table tbody tr .v3-pd-score')?.textContent?.trim() ?? null,
        firstRowHref: q('.v3-pd-table tbody tr a.v3-co-text-button')?.getAttribute('href') ?? null,
        actions: Boolean(q('.v3-pd-actions')),
        moreTrigger: Boolean(q('.v3-pd-more-trigger')),
        advancedBtn: Boolean(q('.v3-pa-summary')),
        configDl: q('.v3-pd-config') ? q('.v3-pd-config').querySelectorAll(':scope > div').length : 0,
      },
      report: {
        back: q('.v3-pr .v3-back')?.getAttribute('href') ?? null,
        identity: q('.v3-pr-sub strong')?.textContent?.trim() ?? null,
        constructCards: document.querySelectorAll('.v3-pr-construct').length,
        gameCards: document.querySelectorAll('.v3-pr-game').length,
        qualityCards: document.querySelectorAll('.v3-pr-quality-card').length,
        warning: Boolean(q('.v3-pr-warning')),
        demoBanner: Boolean(q('.v3-pr-banner strong')),
        caveats: document.querySelectorAll('.v3-pr-caveat-list span').length,
        privacy: Boolean(q('.v3-pr-privacy')),
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
  if (!state.company) failures.push(`[${tag}] chrome empresa ausente (sidebar/header)`);
  if (!state.demoBadge) failures.push(`[${tag}] badge "Demo workspace" ausente`);
  if (!state.userChip.includes('Alex Morgan')) failures.push(`[${tag}] user chip demo ausente`);

  if (route.kind === 'detail') {
    if (state.detail.back !== '/empresa/procesos') failures.push(`[${tag}] back detail href inesperado: ${state.detail.back}`);
    if (state.detail.tableRows !== 6) failures.push(`[${tag}] rows tabla esperadas 6, encontradas ${state.detail.tableRows}`);
    if (!state.detail.actions) failures.push(`[${tag}] section Process actions ausente`);
    if (!state.detail.moreTrigger) failures.push(`[${tag}] menú ⋯ ausente`);
    if (lang === 'es' && route.path === '/empresa/proceso/supervisor') {
      const expectedMetrics = ['18', '23', '19', '78%'];
      if (!state.detail.metrics) failures.push(`[${tag}] métricas ausentes`);
      else if (JSON.stringify(state.detail.metrics) !== JSON.stringify(expectedMetrics)) {
        failures.push(`[${tag}] métricas inesperadas: ${JSON.stringify(state.detail.metrics)} (esperado ${JSON.stringify(expectedMetrics)})`);
      }
      if (state.detail.firstRowName !== 'María González') failures.push(`[${tag}] 1ª row inesperada: "${state.detail.firstRowName}"`);
      if (state.detail.firstRowHref !== '/empresa/proceso/supervisor/candidatos/maria-gonzalez') {
        failures.push(`[${tag}] href reporte 1ª row inesperado: ${state.detail.firstRowHref}`);
      }
      if (!state.detail.advancedBtn) failures.push(`[${tag}] disclosure "Estadísticas avanzadas" ausente`);
      if (state.detail.configDl < 5) failures.push(`[${tag}] config dl incompleta (${state.detail.configDl} ítems)`);
    }
    if (lang === 'es' && route.path === '/empresa/proceso/operator') {
      const expectedMetrics = ['13', '47', '40', '81%'];
      if (JSON.stringify(state.detail.metrics) !== JSON.stringify(expectedMetrics)) {
        failures.push(`[${tag}] métricas operator inesperadas: ${JSON.stringify(state.detail.metrics)}`);
      }
      if (state.detail.firstRowName !== 'Pablo Morales') failures.push(`[${tag}] 1ª row operator inesperada: "${state.detail.firstRowName}"`);
    }
    if (lang === 'es' && route.path === '/empresa/proceso/technician') {
      const expectedMetrics = ['9', '31', '26', '84%'];
      if (JSON.stringify(state.detail.metrics) !== JSON.stringify(expectedMetrics)) {
        failures.push(`[${tag}] métricas technician inesperadas: ${JSON.stringify(state.detail.metrics)}`);
      }
      if (state.detail.firstRowName !== 'Nicolás Fuentes') failures.push(`[${tag}] 1ª row technician inesperada: "${state.detail.firstRowName}"`);
    }
  }

  if (route.kind === 'report') {
    if (state.report.back !== '/empresa/proceso/supervisor') failures.push(`[${tag}] back reporte href inesperado: ${state.report.back}`);
    if (state.report.constructCards !== 8) failures.push(`[${tag}] construct cards esperadas 8, encontradas ${state.report.constructCards}`);
    if (state.report.gameCards !== 5) failures.push(`[${tag}] game cards esperadas 5, encontradas ${state.report.gameCards}`);
    if (state.report.qualityCards !== 6) failures.push(`[${tag}] quality cards esperadas 6, encontradas ${state.report.qualityCards}`);
    if (!state.report.warning) failures.push(`[${tag}] warning de evidencias ausente`);
    if (!state.report.demoBanner) failures.push(`[${tag}] banner demo ausente`);
    if (state.report.caveats < 2) failures.push(`[${tag}] caveats esperados ≥2, encontrados ${state.report.caveats}`);
    if (!state.report.privacy) failures.push(`[${tag}] nota de privacidad ausente`);
    if (lang === 'es' && state.report.identity !== 'María González') failures.push(`[${tag}] identidad inesperada: "${state.report.identity}"`);
    // sin datos biométricos crudos expuestos
    const rawText = await page.evaluate(() => document.body.textContent);
    if (/blendshape|landmark|keypoint|pointerSample/i.test(rawText)) failures.push(`[${tag}] texto biométrico crudo expuesto en la vista`);
  }
}

async function walkStatic(lang, viewport, shootKey) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
  const page = await context.newPage();
  track(page, `${lang.toUpperCase()}/${viewport.tag}`);
  await page.addInitScript((l) => {
    try { localStorage.setItem('krumm-lang', l); } catch {}
  }, lang);

  for (const route of DETAIL_ROUTES) {
    if (!route.langs.includes(lang)) continue;
    const tag = `${lang.toUpperCase()}/${viewport.tag} ${route.path}`;
    try {
      await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'load', timeout: 60000 });
      await waitH1(page, tag, H1[lang][route.path]);
      await page.waitForTimeout(400); // fonts + settle
      await assertNoOverflow(page, tag);
      await assertChrome(page, tag, lang, route);
      if (shootKey) {
        await shot(page, `t_84f00355-v3-${lang}-${viewport.tag}${route.path.replace(/\//g, '_')}`);
      }
    } catch (err) {
      failures.push(`[${tag}] ${String(err).split('\n')[0]}`);
      await shot(page, `t_84f00355-v3-${lang}-${viewport.tag}-FAIL${route.path.replace(/\//g, '_')}`).catch(() => {});
    }
  }
  await context.close();
}

// ── Interacción ES desktop: navegación back + acciones (aceptación card) ────
async function walkNavigation() {
  const context = await browser.newContext({ viewport: { width: VIEWPORTS[0].width, height: VIEWPORTS[0].height } });
  const page = await context.newPage();
  track(page, 'ES/nav');
  await page.addInitScript(() => {
    try { localStorage.setItem('krumm-lang', 'es'); } catch {}
  });
  const tag = 'ES/nav';
  try {
    // 1. detail supervisor
    await page.goto(`${baseUrl}/empresa/proceso/supervisor`, { waitUntil: 'load', timeout: 60000 });
    await waitH1(page, tag, H1.es['/empresa/proceso/supervisor']);
    // 2. link "Ver informe" row 1 → reporte
    await page.locator('.v3-pd-table tbody tr a.v3-co-text-button').first().click();
    await waitH1(page, tag, H1.es[TOP_REPORT_PATH]);
    if (!page.url().includes(TOP_REPORT_PATH)) failures.push(`[${tag}] URL reporte inesperada: ${page.url()}`);
    await shot(page, 't_84f00355-v3-es-nav-report');
    // 3. back → detail
    await page.locator('.v3-pr .v3-back').click();
    await waitH1(page, tag, H1.es['/empresa/proceso/supervisor']);
    if (!page.url().endsWith('/empresa/proceso/supervisor')) failures.push(`[${tag}] back a detail falló: ${page.url()}`);
    // 4. back → procesos (3 cards)
    await page.locator('.v3-pd .v3-back').click();
    await waitH1(page, tag, 'Procesos activos');
    const cards = await page.locator('.v3-pl-card').count();
    if (cards !== 3) failures.push(`[${tag}] back a procesos: cards esperadas 3, encontradas ${cards}`);
    await shot(page, 't_84f00355-v3-es-nav-back-processes');
    // 5. volver al detail: menú ⋯ abre 3 menuitems y Escape cierra
    await page.goto(`${baseUrl}/empresa/proceso/supervisor`, { waitUntil: 'load', timeout: 60000 });
    await waitH1(page, tag, H1.es['/empresa/proceso/supervisor']);
    const more = page.locator('.v3-pd-more-trigger');
    await more.click();
    let menuitems = await page.locator('[role="menuitem"]').count();
    if (menuitems !== 3) failures.push(`[${tag}] menú ⋯: menuitems esperados 3, encontrados ${menuitems}`);
    await page.keyboard.press('Escape');
    menuitems = await page.locator('[role="menuitem"]').count();
    if (menuitems !== 0) failures.push(`[${tag}] menú ⋯: Escape no cerró (${menuitems} menuitems)`);
    // 6. "Pausar proceso" → diálogo preview
    await page.locator('.v3-pd-actions button', { hasText: 'Pausar proceso' }).click();
    const dialogVisible = await page.locator('[role="dialog"]').isVisible().catch(() => false);
    if (!dialogVisible) failures.push(`[${tag}] diálogo "Pausar proceso" no apareció`);
    else {
      const dialogText = await page.locator('[role="dialog"]').textContent();
      if (!dialogText.includes('Solo vista previa')) failures.push(`[${tag}] diálogo sin pd_mockAction: "${dialogText.slice(0, 80)}"`);
      await shot(page, 't_84f00355-v3-es-nav-dialog-pause');
      await page.keyboard.press('Escape');
    }
    // 7. "Estadísticas avanzadas" expande
    await page.locator('.v3-pa-summary').click();
    const advVisible = await page.locator('.v3-pa-content').isVisible().catch(() => false);
    if (!advVisible) failures.push(`[${tag}] advanced statistics no expandió`);
    await shot(page, 't_84f00355-v3-es-nav-advanced');
  } catch (err) {
    failures.push(`[${tag}] ${String(err).split('\n')[0]}`);
    await shot(page, 't_84f00355-v3-es-nav-FAIL').catch(() => {});
  }
  await context.close();
}

// ── Interacción EN desktop: paridad en vivo ──────────────────────────────────
async function walkEnLive() {
  const context = await browser.newContext({ viewport: { width: VIEWPORTS[0].width, height: VIEWPORTS[0].height } });
  const page = await context.newPage();
  track(page, 'EN/live');
  await page.addInitScript(() => {
    try { localStorage.setItem('krumm-lang', 'en'); } catch {}
  });
  const tag = 'EN/live';
  try {
    await page.goto(`${baseUrl}/empresa/proceso/supervisor`, { waitUntil: 'load', timeout: 60000 });
    await waitH1(page, tag, H1.en['/empresa/proceso/supervisor']);
    const back = await page.locator('.v3-pd .v3-back').textContent();
    if (!/Back to processes/.test(back)) failures.push(`[${tag}] back EN inesperado: "${back.trim()}"`);
    const tableText = await page.locator('.v3-pd-table').textContent();
    if (!/View report/.test(tableText)) failures.push(`[${tag}] acción tabla EN "View report" ausente`);
    await shot(page, 't_84f00355-v3-en-live-detail');
    await page.goto(`${baseUrl}${TOP_REPORT_PATH}`, { waitUntil: 'load', timeout: 60000 });
    await waitH1(page, tag, H1.en[TOP_REPORT_PATH]);
    const backReport = await page.locator('.v3-pr .v3-back').textContent();
    if (!/Back to process/.test(backReport)) failures.push(`[${tag}] back report EN inesperado: "${backReport.trim()}"`);
    const evidence = await page.locator('.v3-pr-construct').count();
    if (evidence !== 8) failures.push(`[${tag}] construct cards EN esperadas 8, encontradas ${evidence}`);
    await shot(page, 't_84f00355-v3-en-live-report');
  } catch (err) {
    failures.push(`[${tag}] ${String(err).split('\n')[0]}`);
    await shot(page, 't_84f00355-v3-en-live-FAIL').catch(() => {});
  }
  await context.close();
}

await walkStatic('es', VIEWPORTS[0], true);
await walkStatic('es', VIEWPORTS[1], true);
await walkStatic('en', VIEWPORTS[0], false);
await walkNavigation();
await walkEnLive();
await browser.close();

const result = {
  task: 't_84f00355 (V3 fase v3)',
  baseUrl,
  failures,
  consoleErrors,
  screenshots,
  ok: failures.length === 0 && consoleErrors.length === 0,
};
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
