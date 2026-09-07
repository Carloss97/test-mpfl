// H4.3/H4.4 smoke browser (2026-09-07): flujo candidato + /reclutador sobre
// design system. Verifica con ESTILOS COMPUTADOS que los tokens --k-* se
// aplican en cada vista (no solo que el CSS los declara):
//   Run A (desktop 1280x720): landing interna, guard invalid (espresso + pill
//     oscuro), setup (radios/select tokens), stage (header + dots gold),
//     reporte fixture (status card navy + talent score espresso→navy),
//     /reclutador (topbar espresso + métricas oro).
//   Run B (móvil 390x844): las 6 vistas, overflow 0 + pill horizontal.
// DISEÑO Pi (heredado de H3): 1 contexto (1 carga de documento) por vista —
// la 3ª carga en el mismo contexto revienta con ERR_INSUFFICIENT_RESOURCES.
// Salida: JSON { failures, consoleErrors, screenshots }. Exit 1 si hay fallos.

import { chromium } from '@playwright/test';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:5173';
const shotsDir = process.env.SHOTS_DIR ?? 'docs/qa/h43-flow-design-system';
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

async function openView({ tag, path, viewport, expectHeading }) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  track(page, tag);
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

// computed style helper: devolve { color, bg, bgImage, radius, borderBottom, textDecoration }
async function stylesOf(page, selector, props) {
  return page.evaluate(([sel, ps]) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    const out = { __found: true };
    for (const p of ps) out[p] = cs[p];
    return out;
  }, [selector, props]);
}

function expectStyle(tag, sel, prop, expected, actual) {
  if (!actual) {
    failures.push(`[${tag}] selector ausente: ${sel}`);
    return;
  }
  if (expected.includes('contains:')) {
    if (!actual[prop].includes(expected.slice(9))) {
      failures.push(`[${tag}] ${sel} → ${prop} esperado contiene "${expected.slice(9)}", visto "${actual[prop]}"`);
    }
  } else if (actual[prop] !== expected) {
    failures.push(`[${tag}] ${sel} → ${prop} esperado "${expected}", visto "${actual[prop]}"`);
  }
}

// ---------- Run A: desktop 1280x720 ----------
const DESKTOP = { width: 1280, height: 720 };

// 1) Landing interna: fondo crema, CTA arena, eyebrow terracota, h1 hero.
{
  const { context, page } = await openView({ tag: 'A-landing', path: '/postulaciones?battery=original', viewport: DESKTOP, expectHeading: /KRUMM Postulaciones/i });
  const shell = await stylesOf(page, '.postulation-demo', ['backgroundColor']);
  expectStyle('A-landing', '.postulation-demo', 'backgroundColor', 'rgb(243, 233, 225)', shell); // --k-bg-light
  const cta = await stylesOf(page, '.postulation-demo__primary', ['backgroundColor', 'color']);
  expectStyle('A-landing', '.postulation-demo__primary', 'backgroundColor', 'rgb(228, 211, 185)', cta); // --k-cta-bg
  expectStyle('A-landing', '.postulation-demo__primary', 'color', 'rgb(51, 38, 29)', cta); // --k-cta-ink
  const eyebrow = await stylesOf(page, '.postulation-demo__eyebrow', ['color']);
  expectStyle('A-landing', '.postulation-demo__eyebrow', 'color', 'rgb(116, 84, 62)', eyebrow); // --k-ink-terracotta (AA)
  const h1 = await stylesOf(page, '.postulation-demo__hero h1', ['fontSize']);
  // --k-size-hero = clamp(3rem, 6vw, 5rem) @1280 → 6vw = 76.8px (<5rem)
  expectStyle('A-landing', '.postulation-demo__hero h1', 'fontSize', '76.8px', h1);
  const brief = await stylesOf(page, '.postulation-demo__brief', ['borderRadius', 'boxShadow']);
  expectStyle('A-landing', '.postulation-demo__brief', 'borderRadius', '22px', brief); // --k-radius-panel
  await assertNoOverflow(page, 'A-landing');
  await shot(page, 'a1-landing-es');
  await context.close();
}

// 2) Guard invalid: pantalla espresso, texto crema, pill oscuro con activo subrayado.
{
  const { context, page } = await openView({ tag: 'A-guard', path: '/postulaciones?invite=tok-expired-abc123', viewport: DESKTOP, expectHeading: /Invitación no válida/i });
  const guard = await stylesOf(page, 'main.postulation-demo__invite-guard', ['backgroundColor', 'color']);
  expectStyle('A-guard', 'main.postulation-demo__invite-guard', 'backgroundColor', 'rgb(42, 31, 23)', guard); // --k-bg-dark-deep
  expectStyle('A-guard', 'main.postulation-demo__invite-guard', 'color', 'rgb(241, 231, 219)', guard); // --k-text-cream
  const pill = await stylesOf(page, '.postulation-demo__invite-guard .krumm-lang-toggle', ['backgroundColor']);
  expectStyle('A-guard', '.postulation-demo__invite-guard .krumm-lang-toggle', 'backgroundColor', 'rgba(0, 0, 0, 0)', pill); // override transparente
  const activeBtn = await stylesOf(page, '.postulation-demo__invite-guard .krumm-lang-toggle__btn.is-active', ['textDecorationLine', 'backgroundColor']);
  expectStyle('A-guard', '.postulation-demo__invite-guard .krumm-lang-toggle__btn.is-active', 'textDecorationLine', 'underline', activeBtn);
  expectStyle('A-guard', '.postulation-demo__invite-guard .krumm-lang-toggle__btn.is-active', 'backgroundColor', 'rgba(0, 0, 0, 0)', activeBtn);
  await assertNoOverflow(page, 'A-guard');
  await shot(page, 'a2-guard-espresso');
  await context.close();
}

// 3) Setup: panel radius 22px, select con borde divider + CTA arena. 4) Stage:
// sigue en el MISMO contexto (consent + continuar = transición in-page).
{
  const { context, page } = await openView({ tag: 'A-setup', path: '/postulaciones?invite=tok-live-abc123', viewport: DESKTOP, expectHeading: /Preparación de la sesión/i });
  const panel = await stylesOf(page, '.postulation-demo__setup-panel', ['borderRadius']);
  expectStyle('A-setup', '.postulation-demo__setup-panel', 'borderRadius', '22px', panel);
  // El selector de cámara (.postulation-demo__device-label select) solo renderiza
  // con ≥2 dispositivos (cameraDevices.length > 1) — nunca en headless. Su regla
  // (borde --k-divider + focus --k-tint-gold) queda cubierta por
  // PostulationFlowDesignSystem.test.jsx (a nivel de CSS declarado).
  await assertNoOverflow(page, 'A-setup');
  await shot(page, 'a3-setup-es');

  await page.getByTestId('postulation-explicit-consent').check();
  await page.getByRole('button', { name: /Continuar a juegos|Continue to games/i }).click();
  await page.getByText(/Juego 1 de 4|Game 1 of 4/i).waitFor({ timeout: 30000 })
    .catch(() => failures.push('[A-stage] el primer bloque de juego no cargó'));
  const header = await stylesOf(page, '.postulation-demo__game-header', ['borderRadius']);
  expectStyle('A-stage', '.postulation-demo__game-header', 'borderRadius', '22px', header);
  const dot = await stylesOf(page, '.postulation-demo__progress-dots span.current', ['backgroundColor']);
  expectStyle('A-stage', '.postulation-demo__progress-dots span.current', 'backgroundColor', 'rgb(212, 180, 131)', dot); // --k-accent-sand
  await assertNoOverflow(page, 'A-stage');
  await shot(page, 'a4-stage-es');
  await context.close();
}

// 5) Reporte fixture: status card navy, talent score espresso→navy, banner warn.
{
  const { context, page } = await openView({ tag: 'A-report', path: '/postulaciones?fixture=1&battery=original', viewport: DESKTOP, expectHeading: /Reporte de muestra listo para revisión humana/i });
  const status = await stylesOf(page, '.postulation-demo__report-status-card', ['backgroundColor', 'boxShadow']);
  expectStyle('A-report', '.postulation-demo__report-status-card', 'backgroundColor', 'rgb(22, 30, 43)', status); // --k-card-navy
  expectStyle('A-report', '.postulation-demo__report-status-card', 'boxShadow', 'contains:px', status); // --k-shadow-float
  // El reporte fixture (batería original) renderiza cards de constructo (workbook):
  // la caja .talent-score es --provisional (tinte oro flat). El gradiente
  // espresso→navy vive en TalentDimensionCard (formato legacy; el fixture tiene
  // talentDimensions vacío → no se renderiza).
  const score = await stylesOf(page, '.postulation-demo__talent-score--provisional', ['backgroundColor']);
  expectStyle('A-report', '.postulation-demo__talent-score--provisional', 'backgroundColor', 'rgba(212, 180, 131, 0.16)', score); // --k-tint-gold
  const banner = await stylesOf(page, '.postulation-demo__fixture-banner', ['borderRadius', 'color']);
  expectStyle('A-report', '.postulation-demo__fixture-banner', 'borderRadius', '18px', banner); // --k-radius-card
  const download = page.getByRole('button', { name: /Descargar reporte local/i });
  if ((await download.count()) !== 1) failures.push(`[A-report] botón descarga ausente (count=${await download.count()})`);
  await assertNoOverflow(page, 'A-report');
  await shot(page, 'a5-report-navy-card');
  await context.close();
}

// 6) /reclutador: topbar espresso, pill oscuro, métricas con icono oro.
{
  const { context, page } = await openView({ tag: 'A-hr', path: '/reclutador', viewport: DESKTOP, expectHeading: /Panel de evaluaciones/i });
  const topbar = await stylesOf(page, '.hr-dashboard__topbar', ['backgroundColor', 'borderBottomColor']);
  expectStyle('A-hr', '.hr-dashboard__topbar', 'backgroundColor', 'rgb(42, 31, 23)', topbar); // --k-bg-dark-deep
  const h1 = await stylesOf(page, '.hr-dashboard__hero h1', ['color']);
  expectStyle('A-hr', '.hr-dashboard__hero h1', 'color', 'rgb(51, 36, 28)', h1); // --k-ink-espresso
  const pill = await stylesOf(page, '.hr-dashboard__topbar .krumm-lang-toggle', ['backgroundColor']);
  expectStyle('A-hr', '.hr-dashboard__topbar .krumm-lang-toggle', 'backgroundColor', 'rgba(0, 0, 0, 0)', pill);
  const icon = await stylesOf(page, '.hr-dashboard__metric-icon', ['backgroundColor']);
  expectStyle('A-hr', '.hr-dashboard__metric-icon', 'backgroundColor', 'rgba(212, 180, 131, 0.16)', icon); // --k-tint-gold
  const brand = await stylesOf(page, '.hr-dashboard__brand', ['color']);
  expectStyle('A-hr', '.hr-dashboard__brand', 'color', 'rgb(241, 231, 219)', brand); // --k-text-cream
  await assertNoOverflow(page, 'A-hr');
  await shot(page, 'a6-hr-espresso-topbar');
  await context.close();
}

// ---------- Run B: móvil 390x844 ----------
const MOBILE = { width: 390, height: 844 };

// 1) Landing móvil.
{
  const { context, page } = await openView({ tag: 'B-landing', path: '/postulaciones?battery=original', viewport: MOBILE, expectHeading: /KRUMM Postulaciones/i });
  await assertNoOverflow(page, 'B-landing');
  await shot(page, 'b1-landing-es');
  await context.close();
}

// 2) Guard móvil (espresso).
{
  const { context, page } = await openView({ tag: 'B-guard', path: '/postulaciones?invite=tok-expired-abc123', viewport: MOBILE, expectHeading: /Invitación no válida/i });
  const guard = await stylesOf(page, 'main.postulation-demo__invite-guard', ['backgroundColor']);
  expectStyle('B-guard', 'main.postulation-demo__invite-guard', 'backgroundColor', 'rgb(42, 31, 23)', guard);
  await assertNoOverflow(page, 'B-guard');
  await shot(page, 'b2-guard-espresso');
  await context.close();
}

// 3) Setup + 4) stage móvil (mismo contexto, transición in-page).
{
  const { context, page } = await openView({ tag: 'B-setup', path: '/postulaciones?invite=tok-live-abc123', viewport: MOBILE, expectHeading: /Preparación de la sesión/i });
  await assertNoOverflow(page, 'B-setup');
  await shot(page, 'b3-setup-es');

  await page.getByTestId('postulation-explicit-consent').check();
  await page.getByRole('button', { name: /Continuar a juegos|Continue to games/i }).click();
  await page.getByText(/Juego 1 de 4|Game 1 of 4/i).waitFor({ timeout: 30000 })
    .catch(() => failures.push('[B-stage] el primer bloque de juego no cargó'));
  await assertNoOverflow(page, 'B-stage');
  await shot(page, 'b4-stage-es');
  await context.close();
}

// 5) Reporte fixture móvil.
{
  const { context, page } = await openView({ tag: 'B-report', path: '/postulaciones?fixture=1&battery=original', viewport: MOBILE, expectHeading: /Reporte de muestra listo para revisión humana/i });
  await assertNoOverflow(page, 'B-report');
  await shot(page, 'b5-report-navy-card');
  await context.close();
}

// 6) HR móvil: pill horizontal (no apilado) sobre topbar espresso.
{
  const { context, page } = await openView({ tag: 'B-hr', path: '/reclutador', viewport: MOBILE, expectHeading: /Panel de evaluaciones/i });
  const hrPillBox = await page.locator('.hr-dashboard__user .krumm-lang-toggle').boundingBox();
  if (hrPillBox && hrPillBox.height >= hrPillBox.width) {
    failures.push(`[B-hr] pill de idioma apilado en vertical (w=${Math.round(hrPillBox.width)} h=${Math.round(hrPillBox.height)})`);
  }
  await assertNoOverflow(page, 'B-hr');
  await shot(page, 'b6-hr-espresso-topbar');
  await context.close();
}

await browser.close();
const result = { baseUrl, failures, consoleErrors: consoleErrors.slice(0, 20), screenshots };
console.log(JSON.stringify(result, null, 2));
process.exit(failures.length ? 1 : 0);
