// Smoke KRU-115 (FASE A.4): krumm.cl en MODO REAL — dashboard recruiter + procesos + export.
// Señal de modo real: API /prod/sessions respondiendo + filtros Periodo/Estado visibles
// (en demo están ocultos: CompanyProcessesPage línea ~76 `isReal ? filterRealProcesses : base`)
// + datos reales (alias session-*).
// Uso: node scripts/smoke-a4-prod-real-mode-2026-09-12.mjs
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = 'https://krumm.cl';
const outDir = '/tmp/krumm-a4-prod-smoke';
mkdirSync(outDir, { recursive: true });

let failures = 0;
function check(label, cond, detail = '') {
  if (cond) {
    console.log('PASS', label);
  } else {
    failures++;
    console.log('FAIL', label, detail);
  }
}

const browser = await chromium.launch({
  headless: true,
  executablePath: '/home/sarlock/.cache/ms-playwright/chromium-1234/chrome-linux/chrome',
  args: ['--headless=new', '--disable-dev-shm-usage', '--disable-gpu'],
});

async function newPage(vp) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const reqFailures = [];
  const apiCalls = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300)); });
  page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 300)));
  page.on('requestfailed', (r) => reqFailures.push(`${r.failure()?.errorText} ${r.url().slice(0, 150)}`));
  page.on('response', (res) => {
    const u = res.url();
    if (u.includes('/prod/')) apiCalls.push(`${res.status()} ${u.slice(u.indexOf('/prod/'), u.indexOf('/prod/') + 40)}`);
  });
  return { ctx, page, consoleErrors, pageErrors, reqFailures, apiCalls };
}

async function overflowCheck(page, label) {
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  check(`${label}: sin overflow horizontal`, overflow.scrollWidth <= overflow.innerWidth + 1,
    `scrollWidth=${overflow.scrollWidth} innerWidth=${overflow.innerWidth}`);
}

// ═══ DESKTOP 1280×720 ═══
console.log('\n── DESKTOP 1280×720 ──');
{
  const { ctx, page, consoleErrors, pageErrors, reqFailures, apiCalls } = await newPage({ width: 1280, height: 720 });

  // 1. /empresa (dashboard)
  await page.goto(`${BASE}/empresa`, { waitUntil: 'networkidle', timeout: 60000 }).catch((e) => check('d1: carga /empresa', false, String(e).slice(0, 200)));
  await page.waitForTimeout(2000);
  const body1 = await page.locator('body').innerText();
  check('d1: API /prod/sessions 200', apiCalls.some((c) => c.startsWith('200')), `apiCalls=${JSON.stringify(apiCalls).slice(0, 150)}`);
  check('d1: badge "Sesiones reales" (señal modo real)', /Sesiones reales/.test(body1), 'sin badge modo real');
  check('d1: aviso revisión humana presente', /Solo revisión humana|revisión humana/i.test(body1));
  check('d1: 0 console errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
  check('d1: 0 page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
  check('d1: 0 request failures', reqFailures.length === 0, reqFailures.slice(0, 3).join(' | '));
  await overflowCheck(page, 'd1');
  await page.screenshot({ path: `${outDir}/desktop-dash.png`, fullPage: false });

  // 2. /empresa/procesos — filtros modo real (ids reales: v2-filter-*)
  await page.goto(`${BASE}/empresa/procesos`, { waitUntil: 'networkidle', timeout: 60000 }).catch((e) => check('d2: carga /empresa/procesos', false, String(e).slice(0, 200)));
  await page.waitForTimeout(2500);
  const periodSel = page.locator('#v2-filter-period');
  check('d2: filtro Periodo visible (señal modo real)', (await periodSel.count()) === 1);
  const has7d = await periodSel.locator('option[value="7d"]').count();
  check('d2: opción 7d presente', has7d === 1);
  const statusSel = page.locator('#v2-filter-status');
  check('d2: filtro Estado visible', (await statusSel.count()) === 1);
  if (has7d) {
    await periodSel.selectOption('30d').catch(() => {});
    await page.waitForTimeout(800);
  }
  const body2 = await page.locator('body').innerText();
  check('d2: procesos encontrados con fechas reales', /Procesos encontrados: \d+/.test(body2) && /2026-/.test(body2));
  check('d2: 0 console errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
  await overflowCheck(page, 'd2');
  await page.screenshot({ path: `${outDir}/desktop-procesos.png`, fullPage: false });

  // 3. Detalle del primer proceso + export CSV
  const firstProcess = page.locator('a[href*="/empresa/proceso/"]');
  const nLinks = await firstProcess.count();
  if (nLinks > 0) {
    await firstProcess.first().click();
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1500);
    check('d3: detalle proceso cargó', /candidato|constructo|reporte/i.test(await page.locator('body').innerText()));
    const exportBtn = page.locator('[data-testid="v3-pd-export-csv"]');
    check('d3: botón export CSV presente', (await exportBtn.count()) >= 1);
    if ((await exportBtn.count()) >= 1 && await exportBtn.first().isEnabled()) {
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 10000 }).catch(() => null),
        exportBtn.first().click(),
      ]);
      check('d3: descarga CSV disparada', download !== null, 'sin evento de download');
      if (download) {
        const fn = download.suggestedFilename();
        check('d3: nombre .csv', fn.endsWith('.csv'), fn);
        await download.saveAs(`${outDir}/export-prod-${fn}`);
      }
    }
    check('d3: 0 console errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
    await overflowCheck(page, 'd3');
    await page.screenshot({ path: `${outDir}/desktop-detalle.png`, fullPage: false });
  } else {
    check('d3: hay link a proceso en lista', false, '0 links [href*="/empresa/proceso/"]');
  }
  await ctx.close();
}

// ═══ MÓVIL 390×844 ═══
console.log('\n── MÓVIL 390×844 ──');
{
  const { ctx, page, consoleErrors, pageErrors, reqFailures } = await newPage({ width: 390, height: 844 });
  await page.goto(`${BASE}/empresa`, { waitUntil: 'networkidle', timeout: 60000 }).catch((e) => check('m1: carga /empresa', false, String(e).slice(0, 200)));
  await page.waitForTimeout(2000);
  check('m1: 0 console errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
  check('m1: 0 page errors', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));
  check('m1: 0 request failures', reqFailures.length === 0, reqFailures.slice(0, 3).join(' | '));
  await overflowCheck(page, 'm1');
  await page.screenshot({ path: `${outDir}/mobile-dash.png`, fullPage: false });

  await page.goto(`${BASE}/empresa/procesos`, { waitUntil: 'networkidle', timeout: 60000 }).catch((e) => check('m2: carga /empresa/procesos', false, String(e).slice(0, 200)));
  await page.waitForTimeout(1500);
  check('m2: 0 console errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
  await overflowCheck(page, 'm2');
  await page.screenshot({ path: `${outDir}/mobile-procesos.png`, fullPage: false });
  await ctx.close();
}

await browser.close();
console.log(`\nRESULTADO: ${failures === 0 ? '✅ TODO VERDE' : `❌ ${failures} fallos`}`);
process.exit(failures === 0 ? 0 : 1);
