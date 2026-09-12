// t_b17fd176 (EXP-8 COMM C6, KRU-107) — AUDIT VISUAL DEL MUNDO + reporte 10° constructo.
//
// Patrón: scripts/audit-t_32c02f91-b6-bomb-visual.mjs (EXP-7 B6).
//
// Cobertura:
//  A (1280×720, /dev/control-room?mode=session): welcome → práctica P1 (estado
//    de respuesta: panel de datos + burbuja NPC + tarjetas) → envío →
//    estado post-envío. El mundo "centro de operaciones" (Doc 2 §17) en desktop.
//  B (1280×720, /postulaciones?fixture=1&battery=original): reporte fixture
//    con 7 juegos y 10 constructos (incl. "Comunicación aplicada" + card
//    "Sala de Control" con feedback "Coordinación efectiva").
//  C (390×844): welcome/práctica del mundo + reporte móvil.
//
// Checks automáticos en cada etapa: 0 overflow horizontal, 0 console errors,
// 0 page errors, 0 request failures.
// Nota Pi (3.8 GB): cada sección corre en un browser SEPARADO (launch/close)
// para no acumular presión de memoria (ERR_INSUFFICIENT_RESOURCES).
// Nota innerText: el label del feedback usa text-transform: uppercase (CSS),
// por lo que las aserciones sobre texto del reporte son case-insensitive.
// Salida: docs/qa/exp8-c6-visual-audit/*.png + smoke-result.json. Exit 1 si hay fallos.

import { chromium } from '@playwright/test';
import fs from 'node:fs';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:5173';
const shotsDir = 'docs/qa/exp8-c6-visual-audit';
fs.mkdirSync(shotsDir, { recursive: true });
const failures = [];
const consoleErrors = [];
const results = [];
const LAUNCH = {
  headless: true,
  executablePath: '/home/sarlock/.cache/ms-playwright/chromium-1234/chrome-linux/chrome',
  args: ['--headless=new', '--disable-dev-shm-usage', '--disable-gpu'],
};

async function withBrowser(fn) {
  const browser = await chromium.launch(LAUNCH);
  try {
    await fn(browser);
  } finally {
    await browser.close();
  }
}

function track(page, tag) {
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(`[${tag}] ${m.text()}`); });
  page.on('pageerror', (e) => consoleErrors.push(`[${tag}] ${e.message}`));
  page.on('requestfailed', (r) => consoleErrors.push(`[${tag}] requestfailed ${r.url()} ${r.failure()?.errorText ?? ''}`));
}

async function shot(page, name) {
  const path = `${shotsDir}/${name}.png`;
  await page.screenshot({ path });
  results.push({ shot: name });
  return path;
}

async function checkOverflow(page, tag) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 0) failures.push(`[${tag}] overflow horizontal: ${overflow}px`);
  return overflow;
}

async function waitForPhase(page, phase, timeoutMs = 30000) {
  await page.waitForSelector(`[data-testid="control-room"][data-cr-phase="${phase}"]`, { timeout: timeoutMs });
}

/** innerText case-insensitive (el feedback strong tiene text-transform: uppercase). */
async function bodyHas(page, text) {
  return page.evaluate((t) => document.body.innerText.toLowerCase().includes(t.toLowerCase()), text);
}

/** Entra a práctica y llega al primer estado de respuesta (tarjetas visibles). */
async function startPracticeToResponse(page, tag) {
  await page.getByTestId('cr-welcome-cta').click();
  await waitForPhase(page, 'scenario');
  if (await page.getByTestId('cr-tutorial-hint').count() === 0) {
    failures.push(`[${tag}] hint de tutorial ausente en práctica P1 (Doc 2 §5.2)`);
  }
  const cards = page.locator('[data-testid^="cr-card-"]:not([disabled])');
  await cards.first().waitFor({ timeout: 30000 });
  await shot(page, `${tag.toLowerCase()}-02-practice-response`);
  await checkOverflow(page, `${tag}:practice`);
}

/** Envía la primera tarjeta disponible y captura el estado post-envío
 *  (reply NPC → siguiente step con nuevas tarjetas, O consecuencia neutral de
 *  fin de escenario — cr-consequence solo aparece al cerrar el escenario,
 *  engine S.CONSEQUENCE; Doc 2 §20.1). */
async function sendFirstCard(page, tag) {
  await page.locator('[data-testid^="cr-card-"]:not([disabled])').first().click();
  await page.getByTestId('cr-send').click();
  await page.waitForFunction(() => {
    if (document.querySelector('[data-testid="cr-consequence"]')) return true;
    const cards = [...document.querySelectorAll('[data-testid^="cr-card-"]')];
    return cards.some((c) => !c.disabled);
  }, null, { timeout: 20000 });
  const consequence = await page.getByTestId('cr-consequence').count();
  if (consequence > 0) {
    const consequenceText = (await page.getByTestId('cr-consequence').textContent()) ?? '';
    // Doc 2 §2/§20.1: la consecuencia es narrativa neutral — nunca "correcto/incorrecto".
    if (/correcta|incorrecta|bien hecho|mal hecho/i.test(consequenceText)) {
      failures.push(`[${tag}] consecuencia revela acierto/erro: "${consequenceText.slice(0, 120)}"`);
    }
  }
  await shot(page, `${tag.toLowerCase()}-03-post-send`);
  await checkOverflow(page, `${tag}:post-send`);
}

async function runBlock(name, fn) {
  try {
    await fn();
    results.push({ run: name, ok: true });
    console.log(`OK  ${name}`);
  } catch (err) {
    failures.push(`[${name}] ${String(err.message ?? err).split('\n')[0]}`);
    results.push({ run: name, ok: false, error: String(err.message ?? err).split('\n')[0] });
    console.error(`FAIL ${name}: ${String(err.message ?? err).split('\n')[0]}`);
  }
}

// ── A. Mundo desktop 1280×720 ──────────────────────────────────────────────
await withBrowser(async (browser) => {
  const ctxA = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const pageA = await ctxA.newPage();
  track(pageA, 'A');
  await runBlock('A: mundo desktop 1280x720 (welcome → práctica P1 → envío → post-envío)', async () => {
    await pageA.goto(`${baseUrl}/dev/control-room?mode=session`, { waitUntil: 'networkidle', timeout: 90000 });
    await waitForPhase(pageA, 'welcome');
    await shot(pageA, 'a-01-welcome-1280x720');
    await checkOverflow(pageA, 'A:welcome');

    await startPracticeToResponse(pageA, 'A');
    // Zonas del mundo (Doc 2 §6): contexto del incidente, panel de datos, burbuja NPC,
    // área de respuesta — todas presentes en el primer escenario de práctica.
    for (const zone of ['cr-incident', 'cr-facts', 'cr-npc-bubble', 'cr-response']) {
      if ((await pageA.getByTestId(zone).count()) === 0) failures.push(`[A] zona ausente: ${zone}`);
    }
    await sendFirstCard(pageA, 'A');
  });
  await ctxA.close();
});

// ── B. Reporte fixture (7 juegos, 10 constructos) en desktop ───────────────
await withBrowser(async (browser) => {
  const ctxB = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const pageB = await ctxB.newPage();
  track(pageB, 'B');
  await runBlock('B: reporte fixture original (10 constructos + card Sala de Control)', async () => {
    await pageB.goto(`${baseUrl}/postulaciones?fixture=1&battery=original`, { waitUntil: 'networkidle', timeout: 90000 });
    await pageB.waitForSelector('text=Reporte de muestra listo para revisión humana', { timeout: 60000 });
    await pageB.waitForTimeout(800); // asienta fuentes/animaciones para el shot
    await shot(pageB, 'b-04-report-fixture-1280x720');
    await pageB.screenshot({ path: `${shotsDir}/b-05-report-fixture-full-1280x720.png`, fullPage: true });
    const must = [
      ['10 constructos con señal de prueba', 'título cobertura (10° constructo)'],
      ['Comunicación aplicada', 'constructo appliedCommunication'],
      ['Sala de Control', 'card del juego 7'],
      ['Coordinación efectiva', 'feedback control_room (fixture óptimo)'],
      ['diez constructos tienen señal de juego', 'copy mapa de evidencia'],
      ['7/7 juegos completados', 'resumen ejecutivo (batería 7 juegos)'],
      ['4 lectura(s) se mantienen descriptivas', '4 descriptivos (R-6)'],
      ['Escenarios evaluados', 'métricas control_room en la card de juego'],
      ['sin score compuesto ni baremos', 'descripción constructo 10° (negativa explícita)'],
    ];
    for (const [text, why] of must) {
      if (!(await bodyHas(pageB, text))) failures.push(`[B] ausente (${why}): "${text}"`);
    }
    // Semántica R-6: sesión completa original → sin "No medido" ni "Evidencia insuficiente".
    if (await bodyHas(pageB, 'No medido')) failures.push('[B] "No medido" presente en reporte de sesión completa (semántica R-6 rota)');
    if (await bodyHas(pageB, 'Evidencia insuficiente')) failures.push('[B] "Evidencia insuficiente" presente en reporte de sesión completa (semántica R-6 rota)');
    await checkOverflow(pageB, 'B:report');
  });
  await ctxB.close();
});

// ── C. Móvil 390×844: mundo (browser propio) ────────────────────────────────
await withBrowser(async (browser) => {
  const ctxC = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pageC = await ctxC.newPage();
  track(pageC, 'C');
  await runBlock('C: móvil 390x844 (mundo: welcome → práctica P1 → envío → post-envío)', async () => {
    await pageC.goto(`${baseUrl}/dev/control-room?mode=session`, { waitUntil: 'networkidle', timeout: 90000 });
    await waitForPhase(pageC, 'welcome');
    await shot(pageC, 'c-06-welcome-390x844');
    await checkOverflow(pageC, 'C:welcome');

    await startPracticeToResponse(pageC, 'C');
    // DoD §16.2: 320–599 px stack sin scroll horizontal (verificado con 390).
    await sendFirstCard(pageC, 'C');
  });
  await ctxC.close();
});

// ── D. Móvil 390×844: reporte fixture (browser propio — la página del
//    reporte es la más pesada del app; en Pi 3.8 GB no debe compartir proceso
//    de browser con la página anterior o agota recursos, ver §16 del módulo).
await withBrowser(async (browser) => {
  const ctxD = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pageD = await ctxD.newPage();
  track(pageD, 'D');
  await runBlock('D: móvil 390x844 (reporte fixture 10 constructos)', async () => {
    await pageD.goto(`${baseUrl}/postulaciones?fixture=1&battery=original`, { waitUntil: 'networkidle', timeout: 90000 });
    await pageD.waitForSelector('text=Reporte de muestra listo para revisión humana', { timeout: 60000 });
    await pageD.waitForTimeout(800);
    await shot(pageD, 'd-08-report-390x844');
    if (!(await bodyHas(pageD, '10 constructos con señal de prueba'))) failures.push('[D] título "10 constructos" ausente en móvil');
    if (!(await bodyHas(pageD, 'Comunicación aplicada'))) failures.push('[D] constructo "Comunicación aplicada" ausente en móvil');
    if (!(await bodyHas(pageD, 'Coordinación efectiva'))) failures.push('[D] feedback "Coordinación efectiva" ausente en móvil');
    await checkOverflow(pageD, 'D:report');
  });
  await ctxD.close();
});

if (consoleErrors.length > 0) {
  for (const err of consoleErrors.slice(0, 10)) failures.push(`console/page error: ${err}`);
}

const report = {
  spec: 'docs/spec/EXP-COMM-001/ (Doc 1 v1.1 FINAL + Doc 2 v1.0.0)',
  card: 't_b17fd176 (C6, EXP-8) / KRU-107',
  date: new Date().toISOString(),
  baseUrl,
  viewportDesktop: '1280x720',
  viewportMobile: '390x844',
  runs: results,
  consoleErrors,
  failures,
  ok: failures.length === 0,
};
fs.writeFileSync(`${shotsDir}/smoke-result.json`, JSON.stringify(report, null, 2));
console.log(`\n${report.ok ? 'PASS' : 'FAIL'} — ${report.failures.length} fallo(s), ${consoleErrors.length} error(es) de consola`);
process.exit(report.ok ? 0 : 1);
