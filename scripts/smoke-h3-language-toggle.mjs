// H3 smoke browser (2026-09-07): LanguageToggle ES/EN en las 6 vistas
// (landing interna, guard, setup, stage, reporte, /reclutador) + persistencia
// entre vistas (localStorage krumm-lang) + sin overflow horizontal.
// Dos recorridos sobre Vite dev local:
//   Run A (desktop 1280x720): las 6 vistas, cambio ES<->EN en cada una,
//     persistencia entre navegaciones (carga fresca por vista).
//   Run B (móvil 390x844): las 6 vistas hidratadas de la cadena de Run A,
//     toggle visible y sin overflow en cada una.
//
// DISEÑO Pi (verificado 06:25): un solo contexto documenta fallo acumulado —
// la 3ª carga de documento en el MISMO contexto revienta con
// ERR_INSUFFICIENT_RESOURCES en Chromium headless (Pi 4GB, swap bajo
// presión); reproduce en 3 variaciones (secuencia landing→guard→setup).
// Solución: 1 contexto (1 carga) por vista + cadena krumm-lang: la app ESCRIBE
// localStorage real en cada vista (click verificado), el contexto siguiente se
// hidrata con ese valor via addInitScript (equivalente a perfil persistente).
// El paso stage sigue en el contexto del setup (transición de fase in-page,
// sin nueva carga de documento).
// Salida: JSON { failures, consoleErrors, screenshots }. Exit 1 si hay fallos.

import { chromium } from '@playwright/test';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:5173';
const shotsDir = process.env.SHOTS_DIR ?? 'docs/qa/h3-language-toggle';
const failures = [];
const consoleErrors = [];
const screenshots = [];

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

// Abre una vista en un contexto fresco hidratando localStorage con `lang`
// (null = sin key: la app usa su default 'es').
async function openView({ tag, path, viewport, lang, expectHeading }) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  track(page, tag);
  await page.addInitScript(([key, value]) => {
    if (value) { try { localStorage.setItem(key, value); } catch {} }
  }, ['krumm-lang', lang]);
  await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' });
  if (expectHeading) {
    await page.getByRole('heading', { name: expectHeading }).waitFor({ timeout: 20000 })
      .catch(async () => {
        const state = await page.evaluate(() => document.querySelector('h1')?.innerText ?? '(sin h1)');
        failures.push(`[${tag}] h1 esperado "${expectHeading.source}" no apareció (estado: ${state})`);
      });
  }
  return { context, page };
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

async function toggleAt(page, tag, expectLang) {
  const group = page.getByRole('group', { name: /Idioma \/ Language/i });
  const count = await group.count();
  if (count !== 1) {
    failures.push(`[${tag}] LanguageToggle ausente (count=${count})`);
    return null;
  }
  const pressed = await group.locator(`button[aria-pressed="true"]`).first().innerText();
  if (pressed !== expectLang) failures.push(`[${tag}] idioma activo esperado ${expectLang}, visto ${pressed}`);
  return group;
}

// Click real de idioma + verificación de que la app escribió localStorage.
// Devuelve el nuevo valor persistido (para la cadena del contexto siguiente).
async function clickLang(page, tag, lang) {
  await page.getByRole('button', { name: lang, exact: true }).click();
  const stored = await page.evaluate(() => window.localStorage.getItem('krumm-lang'));
  if (stored !== lang.toLowerCase()) failures.push(`[${tag}] localStorage krumm-lang esperado ${lang.toLowerCase()}, visto ${stored}`);
  return stored ?? lang.toLowerCase();
}

// ---------- Run A: desktop 1280x720, 6 vistas ----------
const DESKTOP = { width: 1280, height: 720 };
let chain = null; // valor krumm-lang que hidrata la vista siguiente

// 1) Landing interna: default ES -> EN.
{
  const { context, page } = await openView({ tag: 'A-landing', path: '/postulaciones?battery=original', viewport: DESKTOP, lang: chain, expectHeading: /KRUMM Postulaciones/i });
  await toggleAt(page, 'A-landing', 'ES');
  chain = await clickLang(page, 'A-landing', 'EN');
  await page.getByRole('heading', { name: /KRUMM Applications/i }).waitFor({ timeout: 5000 })
    .catch(() => failures.push('[A-landing] h1 no cambió a "KRUMM Applications"'));
  const ctaEn = await page.getByRole('button', { name: /Start application assessment/i }).count();
  if (ctaEn !== 1) failures.push(`[A-landing] CTA EN ausente (count=${ctaEn})`);
  await assertNoOverflow(page, 'A-landing');
  await shot(page, 'a1-landing-en');
  await context.close();
}

// 2) Guard invalid: hidrata EN del storage -> ES.
{
  const { context, page } = await openView({ tag: 'A-guard', path: '/postulaciones?invite=tok-expired-abc123', viewport: DESKTOP, lang: chain, expectHeading: /Invalid invitation/i });
  await toggleAt(page, 'A-guard', 'EN');
  const expiredEn = await page.getByText(/This invitation link has expired/i).count();
  if (expiredEn !== 1) failures.push(`[A-guard] mensaje EN de expiración ausente (count=${expiredEn})`);
  chain = await clickLang(page, 'A-guard', 'ES');
  await page.getByRole('heading', { name: /Invitación no válida/i }).waitFor({ timeout: 5000 })
    .catch(() => failures.push('[A-guard] no volvió a ES tras clic'));
  await assertNoOverflow(page, 'A-guard');
  await shot(page, 'a2-guard-es');
  await context.close();
}

// 3) Setup: hidrata ES -> EN. 4) Stage: sigue en el MISMO contexto
// (consent + continuar = transición in-page, sin nueva carga de documento).
{
  const { context, page } = await openView({ tag: 'A-setup', path: '/postulaciones?invite=tok-live-abc123', viewport: DESKTOP, lang: chain, expectHeading: /Preparación de la sesión/i });
  await toggleAt(page, 'A-setup', 'ES');
  chain = await clickLang(page, 'A-setup', 'EN');
  await page.getByRole('heading', { name: /Session preparation/i }).waitFor({ timeout: 5000 })
    .catch(() => failures.push('[A-setup] h1 no cambió a "Session preparation"'));
  const continueEn = await page.getByRole('button', { name: /Continue to games/i }).count();
  if (continueEn !== 1) failures.push(`[A-setup] botón EN ausente (count=${continueEn})`);
  await assertNoOverflow(page, 'A-setup');
  await shot(page, 'a3-setup-en');

  // Stage: toggle en el header (esquina superior derecha, fuera del área jugable).
  await page.getByTestId('postulation-explicit-consent').check();
  await page.getByRole('button', { name: /Continue to games/i }).click();
  await page.getByText(/Game 1 of 4/i).waitFor({ timeout: 30000 })
    .catch(() => failures.push('[A-stage] el primer bloque de juego no cargó'));
  const langHeader = page.locator('.postulation-demo__game-header .krumm-lang-toggle');
  if ((await langHeader.count()) !== 1) failures.push(`[A-stage] toggle no está dentro del header (count=${await langHeader.count()})`);
  await toggleAt(page, 'A-stage', 'EN');
  const progressEn = await page.getByText(/Game 1 of 4/i).count();
  if (progressEn !== 1) failures.push(`[A-stage] progreso EN ausente (count=${progressEn})`);
  // El pill no puede invadir el área de juego (game-body): el header va encima.
  const langBox = await langHeader.boundingBox();
  const bodyBox = await page.locator('.postulation-demo__game-body').boundingBox();
  if (langBox && bodyBox && langBox.y + langBox.height > bodyBox.y + 1) {
    failures.push(`[A-stage] el pill de idioma invade el área de juego (pill bottom=${Math.round(langBox.y + langBox.height)} vs game-body top=${Math.round(bodyBox.y)})`);
  }
  await assertNoOverflow(page, 'A-stage');
  await shot(page, 'a4-stage-en-corner');
  await context.close();
}

// 5) Reporte: hidrata EN -> ES.
{
  const { context, page } = await openView({ tag: 'A-report', path: '/postulaciones?fixture=1&battery=original', viewport: DESKTOP, lang: chain, expectHeading: /Sample report ready for human review/i });
  await toggleAt(page, 'A-report', 'EN');
  const downloadEn = await page.getByRole('button', { name: /Download local report/i }).count();
  if (downloadEn !== 1) failures.push(`[A-report] botón descarga EN ausente (count=${downloadEn})`);
  chain = await clickLang(page, 'A-report', 'ES');
  await page.getByRole('heading', { name: /Reporte de muestra listo para revisión humana/i }).waitFor({ timeout: 5000 })
    .catch(() => failures.push('[A-report] no volvió a ES tras clic'));
  await assertNoOverflow(page, 'A-report');
  await shot(page, 'a5-report-es');
  await context.close();
}

// 6) /reclutador: hidrata ES -> EN + hidratación fresca de persistencia (recarga
// emulada con contexto nuevo + storage: misma evidencia de persistencia).
{
  const { context, page } = await openView({ tag: 'A-hr', path: '/reclutador', viewport: DESKTOP, lang: chain, expectHeading: /Panel de evaluaciones/i });
  await toggleAt(page, 'A-hr', 'ES');
  const hrTopbar = page.locator('.hr-dashboard__topbar .krumm-lang-toggle');
  if ((await hrTopbar.count()) !== 1) failures.push(`[A-hr] toggle no está en el topbar (count=${await hrTopbar.count()})`);
  chain = await clickLang(page, 'A-hr', 'EN');
  await page.getByRole('heading', { name: /Evaluation panel/i }).waitFor({ timeout: 5000 })
    .catch(() => failures.push('[A-hr] h1 no cambió a "Evaluation panel"'));
  const reviewOnly = await page.getByText(/Human review only/i).count();
  if (reviewOnly < 1) failures.push(`[A-hr] "Human review only" EN ausente (count=${reviewOnly})`);
  await assertNoOverflow(page, 'A-hr');
  await shot(page, 'a6-hr-en');
  await context.close();

  const { page: page2 } = await openView({ tag: 'A-hr-persist', path: '/reclutador', viewport: DESKTOP, lang: chain, expectHeading: /Evaluation panel/i });
  if (chain !== 'en') failures.push('[A-hr-persist] cadena krumm-lang no es "en" para la verificación de persistencia');
  await toggleAt(page2, 'A-hr-persist', 'EN');
}

// ---------- Run B: móvil 390x844, 6 vistas (cadena continua de Run A) ----------
const MOBILE = { width: 390, height: 844 };

// 1) Landing interna EN.
{
  const { context, page } = await openView({ tag: 'B-landing', path: '/postulaciones?battery=original', viewport: MOBILE, lang: chain, expectHeading: /KRUMM Applications/i });
  await toggleAt(page, 'B-landing', 'EN');
  await assertNoOverflow(page, 'B-landing');
  await shot(page, 'b1-landing-en');
  await context.close();
}

// 2) Guard invalid EN.
{
  const { context, page } = await openView({ tag: 'B-guard', path: '/postulaciones?invite=tok-expired-abc123', viewport: MOBILE, lang: chain, expectHeading: /Invalid invitation/i });
  await toggleAt(page, 'B-guard', 'EN');
  await assertNoOverflow(page, 'B-guard');
  await shot(page, 'b2-guard-en');
  await context.close();
}

// 3) Setup EN + 4) stage EN (mismo contexto, transición in-page).
{
  const { context, page } = await openView({ tag: 'B-setup', path: '/postulaciones?invite=tok-live-abc123', viewport: MOBILE, lang: chain, expectHeading: /Session preparation/i });
  await toggleAt(page, 'B-setup', 'EN');
  await assertNoOverflow(page, 'B-setup');
  await shot(page, 'b3-setup-en');

  await page.getByTestId('postulation-explicit-consent').check();
  await page.getByRole('button', { name: /Continue to games/i }).click();
  await page.getByText(/Game 1 of 4/i).waitFor({ timeout: 30000 })
    .catch(() => failures.push('[B-stage] el primer bloque de juego no cargó'));
  const langHeaderB = page.locator('.postulation-demo__game-header .krumm-lang-toggle');
  if ((await langHeaderB.count()) !== 1) failures.push(`[B-stage] toggle no está dentro del header (count=${await langHeaderB.count()})`);
  await toggleAt(page, 'B-stage', 'EN');
  await assertNoOverflow(page, 'B-stage');
  await shot(page, 'b4-stage-en');
  await context.close();
}

// 5) Reporte fixture EN.
{
  const { context, page } = await openView({ tag: 'B-report', path: '/postulaciones?fixture=1&battery=original', viewport: MOBILE, lang: chain, expectHeading: /Sample report ready for human review/i });
  await toggleAt(page, 'B-report', 'EN');
  await assertNoOverflow(page, 'B-report');
  await shot(page, 'b5-report-en');
  await context.close();
}

// 6) /reclutador EN.
{
  const { context, page } = await openView({ tag: 'B-hr', path: '/reclutador', viewport: MOBILE, lang: chain, expectHeading: /Evaluation panel/i });
  await toggleAt(page, 'B-hr', 'EN');
  // Regresa contra el conflicto .hr-dashboard__user div { display:grid } que
  // apilaba ES/EN en vertical (2026-09-07): el pill debe ser horizontal.
  const hrPillBox = await page.locator('.hr-dashboard__user .krumm-lang-toggle').boundingBox();
  if (hrPillBox && hrPillBox.height >= hrPillBox.width) {
    failures.push(`[B-hr] pill de idioma apilado en vertical (w=${Math.round(hrPillBox.width)} h=${Math.round(hrPillBox.height)})`);
  }
  await assertNoOverflow(page, 'B-hr');
  await shot(page, 'b6-hr-en');
  await context.close();
}

await browser.close();
const result = { baseUrl, failures, consoleErrors: consoleErrors.slice(0, 20), screenshots };
console.log(JSON.stringify(result, null, 2));
process.exit(failures.length ? 1 : 0);
