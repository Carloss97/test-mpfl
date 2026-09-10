// B3 (KRU-50) smoke browser (2026-09-10): lado empresa MODO REAL contra un
// mock API local (VITE_KRUMM_API_BASE=http://127.0.0.1:8787, ver
// scripts/mock-sessions-api.mjs). El modo real no está disponible en prod
// (el backend aún no expone /sessions), así que el smoke verifica el wiring
// real: banner "Sesiones reales (staging)", filtros Periodo/Estado, brief de
// entrevista expandible + exports (.csv / .md).
//
// Matriz (ES, desktop 1280×720 + mobile 390×844):
//   /empresa/procesos:
//     - 2 cards (Operations Analyst, Maintenance Technician)
//     - selects #v2-filter-period + #v2-filter-status presentes (solo real)
//     - badge "En curso" en Operations Analyst (tiene 1 in_progress)
//     - Estado → "En curso" filtra a 1 card; Periodo → 7d filtra a 1 card
//   /empresa/proceso/operations-analyst:
//     - columna "Brief de entrevista" en el thead
//     - botón "Exportar proceso (.csv)" → descarga con BOM + header
//     - expandir brief → prompts + notas + disclaimer; descarga .md por cand.
// Asertos comunes: 0 overflow, 0 console errors, 1 h1.
// Salida: JSON { failures, consoleErrors, screenshots, downloads }. Exit 1 si hay fallos.

import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:4173';
const shotsDir = process.env.SHOTS_DIR ?? 'docs/qa/kru50-b3-brief';
const failures = [];
const consoleErrors = [];
const screenshots = [];
const downloads = [];

const VIEWPORTS = [
  { width: 1280, height: 720, tag: 'desktop' },
  { width: 390, height: 844, tag: 'mobile' },
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
  page.on('pageerror', (err) => consoleErrors.push(`[${tag}] pageerror ${err.message}`));
  page.on('requestfailed', (req) => consoleErrors.push(`[${tag}] requestfailed ${req.url()} ${req.failure()?.errorText ?? ''}`));
}

async function shot(page, name) {
  const path = `${shotsDir}/${name}.png`;
  await page.screenshot({ path });
  screenshots.push(path);
}

async function assertNoOverflow(page, tag) {
  const { scrollW, innerW } = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    innerW: window.innerWidth,
  }));
  if (scrollW > innerW + 1) failures.push(`[${tag}] overflow horizontal: ${scrollW} > ${innerW}`);
}

async function assertH1(page, tag, expected) {
  const state = await page.evaluate(() => ({
    h1s: document.querySelectorAll('h1').length,
    h1: document.querySelector('h1')?.textContent ?? null,
  }));
  if (state.h1s !== 1) failures.push(`[${tag}] h1 esperados 1, encontrados ${state.h1s}`);
  if (state.h1 !== expected) failures.push(`[${tag}] h1 inesperado: "${state.h1}" (esperado "${expected}")`);
}

async function waitForLiveBadge(page, tag) {
  await page.waitForFunction(
    () => document.body.textContent.includes('Sesiones reales (staging)'),
    null,
    { timeout: 30000 },
  ).catch(() => failures.push(`[${tag}] badge "Sesiones reales (staging)" no apareció (¿mock API caída?)`));
}

// ── /empresa/procesos (modo real) ───────────────────────────────────────────
async function walkProcesses(viewport) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
  const page = await context.newPage();
  track(page, `ES/${viewport.tag}/procesos`);
  const tag = `ES/${viewport.tag}/procesos`;
  try {
    await page.goto(`${baseUrl}/empresa/procesos`, { waitUntil: 'load', timeout: 60000 });
    await waitForLiveBadge(page, tag);
    await assertH1(page, tag, 'Procesos activos');
    await assertNoOverflow(page, tag);

    const cards = await page.locator('.v3-pl-card').count();
    if (cards !== 2) failures.push(`[${tag}] cards esperadas 2, encontradas ${cards}`);
    const count = (await page.locator('#v2-process-count').textContent()).trim();
    if (count !== '2') failures.push(`[${tag}] count esperado "2", encontrado "${count}"`);

    // selects de modo real presentes
    if (!(await page.locator('#v2-filter-period').count())) failures.push(`[${tag}] select #v2-filter-period ausente`);
    if (!(await page.locator('#v2-filter-status').count())) failures.push(`[${tag}] select #v2-filter-status ausente`);
    // selects demo ausentes en real
    if (await page.locator('#v2-filter-department').count()) failures.push(`[${tag}] select demo department visible en real`);

    // badge derivado: Operations Analyst tiene 1 in_progress → "En curso"
    const analystCard = page.locator('.v3-pl-card', { hasText: 'Operations Analyst' });
    if (!(await analystCard.locator('.v3-co-status', { hasText: 'En curso' }).count())) {
      failures.push(`[${tag}] Operations Analyst sin badge "En curso"`);
    }
    const maintCard = page.locator('.v3-pl-card', { hasText: 'Maintenance Technician' });
    if (!(await maintCard.locator('.v3-co-status', { hasText: 'Completados' }).count())) {
      failures.push(`[${tag}] Maintenance Technician sin badge "Completados"`);
    }

    if (viewport.tag === 'desktop') {
      await shot(page, `kru50-b3-es-procesos-${viewport.tag}`);
      // Estado → in_progress: solo Operations Analyst (1 card)
      await page.locator('#v2-filter-status').selectOption('in_progress');
      const filtered = await page.locator('.v3-pl-card').count();
      if (filtered !== 1) failures.push(`[${tag}] filtro estado in_progress: cards esperadas 1, encontradas ${filtered}`);
      await shot(page, `kru50-b3-es-procesos-${viewport.tag}-status-inprog`);
      // Periodo → 7d: solo el grupo con sesiones recientes (Operations Analyst)
      await page.locator('#v2-filter-status').selectOption('');
      await page.locator('#v2-filter-period').selectOption('7d');
      const filtered7 = await page.locator('.v3-pl-card').count();
      if (filtered7 !== 1) failures.push(`[${tag}] filtro periodo 7d: cards esperadas 1, encontradas ${filtered7}`);
      await shot(page, `kru50-b3-es-procesos-${viewport.tag}-period-7d`);
      // reset → 2
      await page.locator('#v2-filter-reset').click();
      const reset = await page.locator('.v3-pl-card').count();
      if (reset !== 2) failures.push(`[${tag}] reset: cards esperadas 2, encontradas ${reset}`);
    }
  } catch (err) {
    failures.push(`[${tag}] ${String(err).split('\n')[0]}`);
    await shot(page, `kru50-b3-es-procesos-FAIL-${viewport.tag}`).catch(() => {});
  }
  await context.close();
}

// ── /empresa/proceso/operations-analyst (detalle real: brief + exports) ─────
async function walkDetail(viewport) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
  const page = await context.newPage();
  track(page, `ES/${viewport.tag}/detalle`);
  const tag = `ES/${viewport.tag}/detalle`;
  try {
    await page.goto(`${baseUrl}/empresa/proceso/operations-analyst`, { waitUntil: 'load', timeout: 60000 });
    await waitForLiveBadge(page, tag);
    await assertH1(page, tag, 'Operations Analyst');
    await assertNoOverflow(page, tag);

    // columna Brief en thead
    if (!(await page.getByRole('columnheader', { name: 'Brief de entrevista' }).count())) {
      failures.push(`[${tag}] columna "Brief de entrevista" ausente`);
    }
    // botón export CSV presente
    if (!(await page.locator('[data-testid="v3-pd-export-csv"]').count())) failures.push(`[${tag}] botón export CSV ausente`);
    // 3 candidatos → 3 toggles de brief
    const toggles = page.locator('button.v3-pd-brief-toggle');
    if ((await toggles.count()) !== 3) failures.push(`[${tag}] toggles brief esperados 3, encontrados ${await toggles.count()}`);

    if (viewport.tag === 'desktop') {
      await shot(page, `kru50-b3-es-detalle-${viewport.tag}`);

      // Expandir brief del 1er candidato
      await toggles.first().click();
      const panel = page.locator('.v3-pd-brief').first();
      if (!(await panel.isVisible())) failures.push(`[${tag}] panel brief no visible tras expandir`);
      const prompts = await panel.locator('ol.v3-pd-brief-list li').count();
      if (prompts < 2) failures.push(`[${tag}] prompts brief esperados >=2, encontrados ${prompts}`);
      const disclaimer = await panel.locator('.v3-pd-brief-disclaimer').textContent();
      if (!disclaimer.includes('provisionales')) failures.push(`[${tag}] disclaimer brief ausente/incorrecto`);
      await shot(page, `kru50-b3-es-detalle-${viewport.tag}-brief-open`);

      // Export CSV → descarga con BOM + header
      const [dl] = await Promise.all([
        page.waitForEvent('download', { timeout: 15000 }),
        page.locator('[data-testid="v3-pd-export-csv"]').click(),
      ]).catch(() => [null]);
      if (!dl) {
        failures.push(`[${tag}] no se disparó la descarga CSV`);
      } else {
        const file = await dl.path();
        downloads.push({ kind: 'csv', name: dl.suggestedFilename() });
        const buf = readFileSync(file);
        if (buf[0] !== 0xef || buf[1] !== 0xbb || buf[2] !== 0xbf) failures.push(`[${tag}] CSV sin BOM UTF-8`);
        const text = buf.toString('utf8');
        if (!text.includes('process_id,role,candidate_alias')) failures.push(`[${tag}] CSV sin header esperado`);
        if (!text.includes('operations-analyst')) failures.push(`[${tag}] CSV sin process_id`);
      }

      // MD por candidato (desde el panel expandido)
      const mdBtn = panel.locator('button', { hasText: 'Descargar brief (.md)' });
      if ((await mdBtn.count()) >= 1) {
        const [dlMd] = await Promise.all([
          page.waitForEvent('download', { timeout: 15000 }),
          mdBtn.first().click(),
        ]).catch(() => [null]);
        if (!dlMd) failures.push(`[${tag}] no se disparó la descarga MD`);
        else {
          const file = await dlMd.path();
          downloads.push({ kind: 'md', name: dlMd.suggestedFilename() });
          const text = readFileSync(file, 'utf8');
          if (!text.includes('Brief de entrevista')) failures.push(`[${tag}] MD sin título`);
          if (!text.includes('humanReviewOnly')) failures.push(`[${tag}] MD sin watermark`);
        }
      } else {
        failures.push(`[${tag}] botón MD ausente en el brief expandido`);
      }
    }
  } catch (err) {
    failures.push(`[${tag}] ${String(err).split('\n')[0]}`);
    await shot(page, `kru50-b3-es-detalle-FAIL-${viewport.tag}`).catch(() => {});
  }
  await context.close();
}

await walkProcesses(VIEWPORTS[0]);
await walkProcesses(VIEWPORTS[1]);
await walkDetail(VIEWPORTS[0]);
await walkDetail(VIEWPORTS[1]);
await browser.close();

const result = {
  task: 'B3 (KRU-50) brief + filtros real',
  baseUrl,
  failures,
  consoleErrors,
  screenshots,
  downloads,
  ok: failures.length === 0 && consoleErrors.length === 0,
};
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
