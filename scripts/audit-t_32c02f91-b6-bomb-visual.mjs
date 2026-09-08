// t_32c02f91 (EXP-7 BOMB B6) — AUDIT VISUAL DEL MUNDO (2 viewports) + reporte B6.
//
// Spec (ley): docs/spec/EXP-BOMB-001/ (Doc 1 §14 accesibilidad, §15 no
// funcionales; Doc 2 §6.1 layout, §15 responsive). B2-B4 ya auditaron fase por
// fase (docs/qa/b2-bomb-panel-hud, b3-bomb-phases, b4-bomb-tutorial); esta audit
// B6 cierra el mundo completo + la superficie de reporte con el 9° constructo.
//
// Cobertura:
//  A (1280×720, seed=42, /dev/bomb): welcome → práctica (T1) → L1 ejecución
//    (timer) → L4 intro (placa MODELO B — NO solo color, §14) → L4 ejecución
//    (manual transformado SW3/AZUL desde el manifest) → sesión completa.
//  B (1280×720, /postulaciones?fixture=1&battery=original): reporte fixture con
//    9 constructos (incl. "Memoria de trabajo procedimental" = Descriptivo) y
//    card del juego BOMB.
//  C (390×844): welcome + aviso <1024 (§15) + práctica + reporte móvil.
//
// Checks automáticos en cada etapa: 0 overflow horizontal, 0 console errors,
// 0 page errors, 0 request failures.
// Salida: docs/qa/b6-bomb-visual-audit/*.png + smoke-result.json. Exit 1 si hay fallos.

import { chromium } from '@playwright/test';
import fs from 'node:fs';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:5173';
const shotsDir = 'docs/qa/b6-bomb-visual-audit';
fs.mkdirSync(shotsDir, { recursive: true });
const failures = [];
const consoleErrors = [];
const results = [];

const browser = await chromium.launch({
  headless: true,
  executablePath: '/home/sarlock/.cache/ms-playwright/chromium-1234/chrome-linux/chrome',
  args: ['--headless=new', '--disable-dev-shm-usage', '--disable-gpu'],
});

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

async function waitForTestid(page, testid, timeoutMs = 20000) {
  await page.waitForSelector(`[data-testid="${testid}"]`, { timeout: timeoutMs });
}

async function holdYellow(page, ms = 2000) {
  const box = await page.getByTestId('bomb-hold-btn').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

async function seq(page, testids) {
  for (const id of testids) {
    if (id === 'HOLD') await holdYellow(page, 2000);
    else await page.getByTestId(id).click();
  }
}

/** Tutorial guiado T1-T5 completo (mismo patrón del smoke B3/B4). */
async function playPractice(page, tag) {
  await page.getByTestId('bomb-start-practice').click();
  await page.waitForFunction(() => {
    const b = document.querySelector('[data-testid="bomb-switch-SW_1"]');
    return b && !b.disabled;
  }, null, { timeout: 8000 });
  const seqOnce = async () => {
    await page.getByTestId('bomb-switch-SW_1').click();
    await page.getByTestId('bomb-wire-WIRE_RED').click();
    await holdYellow(page, 2000);
  };
  await seqOnce(); // S1: T1-T3
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-testid="bomb-tutorial-node"]');
    return el && el.textContent.includes('T4');
  }, null, { timeout: 8000 });
  await seqOnce(); // S2: T4
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-testid="bomb-tutorial-instruction"]');
    return el && el.textContent.includes('Lee la secuencia');
  }, null, { timeout: 8000 });
  await page.waitForFunction(() => {
    const b = document.querySelector('[data-testid="bomb-switch-SW_1"]');
    return b && !b.disabled && !b.hasAttribute('aria-disabled');
  }, null, { timeout: 15000 });
  await seqOnce(); // S3: T5 (ejecución sin ayuda)
  await waitForTestid(page, 'bomb-practice-done', 30000);
  await page.getByTestId('bomb-start-evaluation').click();
  await waitForTestid(page, 'bomb-level-intro');
}

/** Nivel: intro → Continuar → countdown → encoding (libre L1 / auto resto) → delay → timer activo.
 *  Devuelve el texto del manual capturado DURANTE el encoding (antes del auto-hide). */
async function introToExecution(page, tag, { freeReading = false } = {}) {
  await page.getByTestId('bomb-intro-continue').click();
  await waitForTestid(page, 'bomb-encoding');
  // El manual (transformado en L4) solo está visible en encoding — capturar YA.
  const encodingManual = await page.evaluate(
    () => document.querySelector('[data-testid="bomb-manual"]')?.textContent ?? '',
  );
  if (freeReading) {
    await page.getByTestId('bomb-encoding-continue').click();
  } else {
    await page.waitForFunction(
      () => !document.querySelector('[data-testid="bomb-encoding"]'),
      null, { timeout: 10000 },
    ).catch(() => {});
  }
  await page.waitForFunction(
    () => {
      const el = document.querySelector('[data-testid="bomb-timer"]');
      const phase = el?.getAttribute('data-phase');
      return phase === 'normal' || phase === 'warning' || phase === 'critical';
    },
    null, { timeout: 15000 },
  );
  return encodingManual;
}

async function resultContinue(page, tag) {
  await waitForTestid(page, 'bomb-result-continue', 15000);
  await page.getByTestId('bomb-result-continue').click();
  await waitForTestid(page, 'bomb-level-intro');
}

/** CTA de la success card del último nivel → overlay de sesión completa. */
async function resultContinueToSessionComplete(page) {
  await waitForTestid(page, 'bomb-result-continue', 20000);
  await page.getByTestId('bomb-result-continue').click();
  await waitForTestid(page, 'bomb-session-complete-overlay', 20000);
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

// ── A. Desktop 1280×720: recorrido completo del mundo ──────────────────────
const ctxA = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const pageA = await ctxA.newPage();
track(pageA, 'A');

await runBlock('A: mundo desktop 1280x720 (welcome → práctica → L1 → L4 MODEL B → sesión completa)', async () => {
  await pageA.goto(`${baseUrl}/dev/bomb?seed=42`, { waitUntil: 'networkidle' });
  await waitForTestid(pageA, 'bomb-welcome');
  // Copy exacto de bienvenida (Doc 2 §4.1).
  const welcomeTitle = await pageA.getByTestId('bomb-welcome').locator('h2').textContent();
  if (!welcomeTitle.includes('Simulación de Protocolo Operativo: Desactivación')) {
    failures.push(`[A] título welcome inesperado: ${welcomeTitle}`);
  }
  await shot(pageA, '01-welcome-1280x720');
  await checkOverflow(pageA, 'A:welcome');

  await playPractice(pageA, 'A');
  // T1 activo durante la práctica (panel + overlay de nodo).
  await shot(pageA, '02-practice-t1-1280x720');
  await checkOverflow(pageA, 'A:practice');

  // L1: encoding libre → ejecución con timer.
  await introToExecution(pageA, 'A', { freeReading: true });
  await shot(pageA, '03-l1-execution-1280x720');
  const timerPhase = await pageA.evaluate(() => document.querySelector('[data-testid="bomb-timer"]')?.getAttribute('data-phase'));
  if (!['normal', 'warning', 'critical'].includes(timerPhase)) failures.push(`[A] timer sin fase válida en L1: ${timerPhase}`);
  await checkOverflow(pageA, 'A:l1');
  await seq(pageA, ['bomb-switch-SW_1', 'bomb-wire-WIRE_RED']);
  await resultContinue(pageA, 'A'); // L1 → L2

  // L2: +HOLD.
  await introToExecution(pageA, 'A');
  await seq(pageA, ['bomb-switch-SW_1', 'bomb-wire-WIRE_RED', 'HOLD']);
  await resultContinue(pageA, 'A'); // L2 → L3

  // L3: +GREEN.
  await introToExecution(pageA, 'A');
  await seq(pageA, ['bomb-switch-SW_1', 'bomb-wire-WIRE_RED', 'HOLD', 'bomb-wire-WIRE_GREEN']);
  await resultContinue(pageA, 'A'); // L3 → L4

  // L4: intro con placa MODELO B (indicador no solo color, §14).
  const l4IntroModel = await pageA.evaluate(() => document.querySelector('[data-testid="bomb-intro-model"]')?.textContent ?? '');
  if (!/B/i.test(l4IntroModel)) failures.push(`[A] L4 intro sin placa MODELO B visible: "${l4IntroModel}"`);
  await shot(pageA, '04-l4-modelb-intro-1280x720');
  await checkOverflow(pageA, 'A:l4intro');
  const l4Manual = await introToExecution(pageA, 'A');
  // Manual transformado (SW3 / AZUL) visible en ENCODING — la transformación
  // viene del manifest (§8.1).
  if (!/INTERRUPTOR 3/i.test(l4Manual) || !/AZUL/i.test(l4Manual)) {
    failures.push(`[A] L4 encoding: manual sin transformación B (SW3/AZUL): ${l4Manual.slice(0, 120)}`);
  }
  await shot(pageA, '05-l4-execution-modelb-1280x720');
  // DoD §16.2: NO existe camino de UI que muestre el manual durante EXECUTION (L2-4).
  const execManual = await pageA.evaluate(
    () => document.querySelector('[data-testid="bomb-manual"]')?.textContent ?? '',
  );
  if (/INTERRUPTOR|CABLE|SW_[0-9]/i.test(execManual)) {
    failures.push(`[A] L4 execution: manual visible durante EXECUTION (DoD rota): ${execManual.slice(0, 120)}`);
  }
  await checkOverflow(pageA, 'A:l4');
  await seq(pageA, ['bomb-switch-SW_3', 'bomb-wire-WIRE_BLUE', 'HOLD', 'bomb-wire-WIRE_GREEN']);

  // L4 (último): success card con CTA → SESSION_COMPLETE.
  await resultContinueToSessionComplete(pageA);
  await shot(pageA, '06-session-complete-1280x720');
  await checkOverflow(pageA, 'A:complete');
});
await ctxA.close();

// ── B. Reporte fixture (6 juegos, 9 constructos) en desktop ───────────────
const ctxB = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const pageB = await ctxB.newPage();
track(pageB, 'B');

await runBlock('B: reporte fixture original (9 constructos + card BOMB)', async () => {
  await pageB.goto(`${baseUrl}/postulaciones?fixture=1&battery=original`, { waitUntil: 'networkidle' });
  await pageB.waitForSelector('text=Reporte de muestra listo para revisión humana', { timeout: 20000 });
  await shot(pageB, '07-report-fixture-1280x720');
  const full = `${shotsDir}/08-report-fixture-full-1280x720.png`;
  await pageB.screenshot({ path: full, fullPage: true });
  const body = await pageB.evaluate(() => document.body.innerText);
  if (!/9 constructos con señal de prueba/.test(body)) failures.push('[B] título "9 constructos con señal de prueba" ausente');
  if (!/Memoria de trabajo procedimental/.test(body)) failures.push('[B] constructo "Memoria de trabajo procedimental" ausente');
  if (!/nueve constructos tienen señal de juego/.test(body)) failures.push('[B] copy "nueve constructos tienen señal de juego" ausente');
  if (!/Desactivación de secuencias \(Bomba\)/.test(body)) failures.push('[B] card del juego BOMB ausente');
  // Sesión completa original: NO debe aparecer "No medido" (gate R-6, pitfall #72).
  if (/No medido/.test(body)) failures.push('[B] "No medido" presente en reporte de sesión completa (semántica R-6 rota)');
  await checkOverflow(pageB, 'B:report');
});
await ctxB.close();

// ── C. Móvil 390×844: aviso <1024 + mundo + reporte ────────────────────────
const ctxC = await browser.newContext({ viewport: { width: 390, height: 844 } });
const pageC = await ctxC.newPage();
track(pageC, 'C');

await runBlock('C: móvil 390x844 (aviso <1024 + welcome + práctica + reporte)', async () => {
  await pageC.goto(`${baseUrl}/dev/bomb?seed=42`, { waitUntil: 'networkidle' });
  await waitForTestid(pageC, 'bomb-welcome');
  await shot(pageC, '10-welcome-390x844');
  // Aviso §15: <1024 px = no recomendado para evaluación v1.
  const warning = await pageC.$('[data-testid="bomb-viewport-warning"]');
  if (!warning) failures.push('[C] aviso <1024 px ausente en móvil');
  await checkOverflow(pageC, 'C:welcome');

  await pageC.getByTestId('bomb-start-practice').click();
  await pageC.waitForFunction(() => {
    const b = document.querySelector('[data-testid="bomb-switch-SW_1"]');
    return b && !b.disabled;
  }, null, { timeout: 8000 });
  await shot(pageC, '11-practice-390x844');
  await checkOverflow(pageC, 'C:practice');

  await pageC.goto(`${baseUrl}/postulaciones?fixture=1&battery=original`, { waitUntil: 'networkidle' });
  await pageC.waitForSelector('text=Reporte de muestra listo para revisión humana', { timeout: 20000 });
  await shot(pageC, '12-report-390x844');
  const body = await pageC.evaluate(() => document.body.innerText);
  if (!/9 constructos con señal de prueba/.test(body)) failures.push('[C] título "9 constructos" ausente en móvil');
  await checkOverflow(pageC, 'C:report');
});
await ctxC.close();

await browser.close();

if (consoleErrors.length > 0) {
  for (const err of consoleErrors.slice(0, 10)) failures.push(`console/page error: ${err}`);
}

const report = {
  spec: 'docs/spec/EXP-BOMB-001/ (Draft v1.1.0)',
  card: 't_32c02f91 (B6, EXP-7)',
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
