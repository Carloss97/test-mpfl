// H4.6 (2026-09-07, t_be89dafb): AUDIT VISUAL UNIFICADO del cierre de H4 —
// desktop 1280x720 + móvil 390x844, ES/EN, overflow horizontal 0, consola
// limpia, contraste WCAG AA (≥4.5:1) en pares texto/fondo del chrome del
// design system, y verificación del fix del footer laser (hallazgo H4.5:
// el texto derecho se recortaba con overflow-x:hidden del stage).
//
// Vistas:
//   1. /                                  (LandingPage pública, H4.2)
//   2. /postulaciones?battery=original    (landing interna, H4.3)
//   3. /postulaciones?invite=tok-expired  (guard inválido, H4.3)
//   4. /postulaciones?invite=tok-live...  (setup → stage laser, H4.3/H4.5)
//   5. /postulaciones?fixture=1&battery=original (reporte, H4.3)
//   6. /reclutador                        (portal HR, H4.4)
// EN vía ?lang=en (prioridad de LanguageContext, H3).
//
// DISEÑO Pi (heredado de H3/H4.3/H4.5): 1 contexto (1 carga de documento)
// por vista — las 3ª+ cargas en el mismo contexto revientan con
// ERR_INSUFFICIENT_RESOURCES. Las transiciones in-page (setup→stage) se
// hacen dentro del mismo contexto.
// Salida: JSON { failures, consoleErrors, contrast, screenshots }.
// Exit 1 si hay fallos.

import { chromium } from '@playwright/test';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:5173';
const shotsDir = process.env.SHOTS_DIR ?? 'docs/qa/h46-visual-audit';
const failures = [];
const consoleErrors = [];
const screenshots = [];
const contrast = [];

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
        failures.push(`[${tag}] h1 esperado no apareció (estado: ${state})`);
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

// WCAG AA: ratio de contraste entre el color de texto de `selText` y el
// primer fondo sólido de su cadena de padres (≤4.5:1 = fallo; sin fondo
// sólido — gradiente — se marca "n/a" y NO falla: los mundos de juego son
// por diseño, verificados aparte en H4.5).
async function checkContrast(page, tag, selText, label) {
  const r = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return { found: false };
    const cs = getComputedStyle(el);
    const parse = (s) => {
      const m = s.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const parts = m[1].split(',').map(parseFloat);
      return { rgb: parts.slice(0, 3), a: parts.length > 3 ? parts[3] : 1 };
    };
    const lum = ([r, g, b]) => {
      const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    let node = el;
    for (let i = 0; i < 12 && node; i += 1) {
      const c = parse(getComputedStyle(node).backgroundColor);
      if (c && c.a > 0.9) {
        const L1 = lum(parse(cs.color).rgb);
        const L2 = lum(c.rgb);
        const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
        return { found: true, ratio: Math.round(ratio * 100) / 100, color: cs.color, bg: getComputedStyle(node).backgroundColor };
      }
      node = node.parentElement;
    }
    return { found: true, ratio: null, color: cs.color };
  }, selText);
  contrast.push({ tag, label, sel: selText, ...r });
  if (!r.found) {
    failures.push(`[${tag}] contraste: selector ausente ${selText} (${label})`);
  } else if (r.ratio !== null && r.ratio < 4.5) {
    failures.push(`[${tag}] contraste AA (<4.5:1) en "${label}": ratio=${r.ratio} (texto ${r.color} sobre ${r.bg})`);
  }
}

async function dismissMicroIntro(page, tag) {
  const intro = page.getByTestId('game-micro-intro');
  const visible = await intro.isVisible().catch(() => false);
  if (!visible) return;
  await intro.getByRole('button', { name: /Saltar|Skip/i }).click({ timeout: 10000 })
    .catch(() => failures.push(`[${tag}] no se pudo saltar el micro-intro`));
  await intro.waitFor({ state: 'detached', timeout: 10000 }).catch(() => {});
}

async function enterStage(page, tag, { checkLaserFooter = false } = {}) {
  await page.getByTestId('postulation-explicit-consent').check();
  await page.getByRole('button', { name: /Continuar a juegos|Continue to games/i }).click();
  await page.getByText(/Juego 1 de 5|Game 1 of 5/i).waitFor({ timeout: 30000 })
    .catch(() => failures.push(`[${tag}] el primer bloque de juego (batería original) no cargó`));
  await page.locator('.laser-puzzle-task').waitFor({ timeout: 20000 })
    .catch(() => failures.push(`[${tag}] .laser-puzzle-task no renderizó`));
  await dismissMicroIntro(page, tag);
  if (checkLaserFooter) {
    // FIX H4.6: el check-hint derecho del footer laser no debe recortarse.
    // (1) la tarjeta no desborda por dentro; (2) el hint queda dentro del
    // rect visible del stage (el que hace overflow-x:hidden).
    const clip = await page.evaluate(() => {
      const card = document.querySelector('.laser-puzzle-task');
      const stage = document.querySelector('.postulation-demo__game-stage');
      const hint = document.querySelector('.laser-puzzle-task__check-hint');
      if (!card || !stage || !hint) return { found: false };
      const hintBox = hint.getBoundingClientRect();
      const stageBox = stage.getBoundingClientRect();
      return {
        found: true,
        cardOverflow: card.scrollWidth - card.clientWidth,
        footerOverflow: (() => { const f = document.querySelector('.laser-puzzle-task__footer'); return f ? f.scrollWidth - f.clientWidth : null; })(),
        hintRight: Math.round(hintBox.right),
        stageRight: Math.round(stageBox.right),
        hintInside: hintBox.right <= stageBox.right + 1 && hintBox.left >= stageBox.left - 1,
        hintFullyPainted: hint.scrollWidth <= hint.clientWidth + 1,
      };
    });
    if (!clip.found) {
      failures.push(`[${tag}] footer laser: faltan elementos para el check de recorte`);
    } else if (clip.cardOverflow > 1) {
      failures.push(`[${tag}] footer laser: la tarjeta desborda por dentro (scrollWidth-clientWidth=${clip.cardOverflow}px)`);
    } else if (clip.footerOverflow > 1) {
      failures.push(`[${tag}] footer laser: el footer desborda (scrollWidth-clientWidth=${clip.footerOverflow}px)`);
    } else if (!clip.hintInside) {
      failures.push(`[${tag}] footer laser: el check-hint sigue fuera del stage visible (hintRight=${clip.hintRight} > stageRight=${clip.stageRight})`);
    } else if (!clip.hintFullyPainted) {
      failures.push(`[${tag}] footer laser: el check-hint tiene overflow interno (truncado)`);
    } else {
      contrast.push({ tag, label: 'laser-footer-clip-check', note: `OK hint dentro del stage (right ${clip.hintRight}/${clip.stageRight}), sin overflow de tarjeta/footer` });
    }
  }
}

const DESKTOP = { width: 1280, height: 720 };
const MOBILE = { width: 390, height: 844 };

// ============ DESKTOP 1280x720 ============

// 1) Landing pública ES.
{
  const { context, page } = await openView({ tag: 'D-landing-es', path: '/', viewport: DESKTOP, expectHeading: /talento|Se demuestra/i });
  await assertNoOverflow(page, 'D-landing-es');
  await checkContrast(page, 'D-landing-es', '.landing-hero__title, h1', 'h1 landing');
  await shot(page, 'd01-landing-es');
  await context.close();
}

// 1b) Landing pública EN.
{
  const { context, page } = await openView({ tag: 'D-landing-en', path: '/?lang=en', viewport: DESKTOP, expectHeading: /talent|proven/i });
  await assertNoOverflow(page, 'D-landing-en');
  await shot(page, 'd02-landing-en');
  await context.close();
}

// 2) Landing interna ES.
{
  const { context, page } = await openView({ tag: 'D-int-es', path: '/postulaciones?battery=original', viewport: DESKTOP, expectHeading: /KRUMM Postulaciones/i });
  await assertNoOverflow(page, 'D-int-es');
  await checkContrast(page, 'D-int-es', '.postulation-demo__eyebrow', 'eyebrow interna');
  await shot(page, 'd03-landing-interna-es');
  await context.close();
}

// 2b) Landing interna EN.
{
  const { context, page } = await openView({ tag: 'D-int-en', path: '/postulaciones?battery=original&lang=en', viewport: DESKTOP, expectHeading: /KRUMM Applications/i });
  await assertNoOverflow(page, 'D-int-en');
  await shot(page, 'd04-landing-interna-en');
  await context.close();
}

// 3) Guard inválido ES (pantalla espresso).
{
  const { context, page } = await openView({ tag: 'D-guard-es', path: '/postulaciones?invite=tok-expired-abc123', viewport: DESKTOP, expectHeading: /Invitación no válida/i });
  await assertNoOverflow(page, 'D-guard-es');
  await checkContrast(page, 'D-guard-es', 'main.postulation-demo__invite-guard', 'texto guard');
  await shot(page, 'd05-guard-es');
  await context.close();
}

// 3b) Guard inválido EN.
{
  const { context, page } = await openView({ tag: 'D-guard-en', path: '/postulaciones?invite=tok-expired-abc123&lang=en', viewport: DESKTOP, expectHeading: /Invalid invitation/i });
  await assertNoOverflow(page, 'D-guard-en');
  await shot(page, 'd06-guard-en');
  await context.close();
}

// 4) Setup → stage laser ES (con check del fix del footer).
{
  const { context, page } = await openView({ tag: 'D-stage-es', path: '/postulaciones?invite=tok-live-abc123&battery=original', viewport: DESKTOP, expectHeading: /Preparación de la sesión/i });
  await assertNoOverflow(page, 'D-stage-es');
  await checkContrast(page, 'D-stage-es', '.postulation-demo__setup-panel h1, .postulation-demo__setup-panel', 'setup panel');
  await shot(page, 'd07-setup-es');
  await enterStage(page, 'D-stage-es', { checkLaserFooter: true });
  await assertNoOverflow(page, 'D-stage-es');
  await checkContrast(page, 'D-stage-es', '.postulation-demo__progress-dots', 'progress stage');
  await shot(page, 'd08-stage-laser-es');
  await context.close();
}

// 4b) Stage EN (setup → juego 1, sin resolver).
{
  const { context, page } = await openView({ tag: 'D-stage-en', path: '/postulaciones?invite=tok-live-abc123&battery=original&lang=en', viewport: DESKTOP, expectHeading: /Session preparation/i });
  await enterStage(page, 'D-stage-en', { checkLaserFooter: true });
  await assertNoOverflow(page, 'D-stage-en');
  await shot(page, 'd09-stage-laser-en');
  await context.close();
}

// 5) Reporte fixture ES.
{
  const { context, page } = await openView({ tag: 'D-report-es', path: '/postulaciones?fixture=1&battery=original', viewport: DESKTOP, expectHeading: /Reporte de muestra listo para revisión humana/i });
  await assertNoOverflow(page, 'D-report-es');
  await checkContrast(page, 'D-report-es', '.postulation-demo__report-status-card strong', 'status card strong (crema sobre navy)');
  await checkContrast(page, 'D-report-es', '.postulation-demo__report-status-card span', 'status card kicker (arena sobre navy)');
  await shot(page, 'd10-report-es');
  await context.close();
}

// 5b) Reporte fixture EN.
{
  const { context, page } = await openView({ tag: 'D-report-en', path: '/postulaciones?fixture=1&battery=original&lang=en', viewport: DESKTOP, expectHeading: /sample report/i });
  await assertNoOverflow(page, 'D-report-en');
  await shot(page, 'd11-report-en');
  await context.close();
}

// 6) /reclutador ES.
{
  const { context, page } = await openView({ tag: 'D-hr-es', path: '/reclutador', viewport: DESKTOP, expectHeading: /Panel de evaluaciones/i });
  await assertNoOverflow(page, 'D-hr-es');
  await checkContrast(page, 'D-hr-es', '.hr-dashboard__brand', 'brand topbar');
  await checkContrast(page, 'D-hr-es', '.hr-dashboard__hero h1', 'h1 HR');
  await shot(page, 'd12-hr-es');
  await context.close();
}

// 6b) /reclutador EN.
{
  const { context, page } = await openView({ tag: 'D-hr-en', path: '/reclutador?lang=en', viewport: DESKTOP, expectHeading: /evaluations|assessments/i });
  await assertNoOverflow(page, 'D-hr-en');
  await shot(page, 'd13-hr-en');
  await context.close();
}

// ============ MÓVIL 390x844 ============

// M1) Landing pública ES.
{
  const { context, page } = await openView({ tag: 'M-landing-es', path: '/', viewport: MOBILE, expectHeading: /talento|Se demuestra/i });
  await assertNoOverflow(page, 'M-landing-es');
  await shot(page, 'm01-landing-es');
  await context.close();
}

// M2) Landing interna ES.
{
  const { context, page } = await openView({ tag: 'M-int-es', path: '/postulaciones?battery=original', viewport: MOBILE, expectHeading: /KRUMM Postulaciones/i });
  await assertNoOverflow(page, 'M-int-es');
  await shot(page, 'm02-landing-interna-es');
  await context.close();
}

// M3) Guard ES.
{
  const { context, page } = await openView({ tag: 'M-guard-es', path: '/postulaciones?invite=tok-expired-abc123', viewport: MOBILE, expectHeading: /Invitación no válida/i });
  await assertNoOverflow(page, 'M-guard-es');
  await shot(page, 'm03-guard-es');
  await context.close();
}

// M4) Setup → stage ES (móvil).
{
  const { context, page } = await openView({ tag: 'M-stage-es', path: '/postulaciones?invite=tok-live-abc123&battery=original', viewport: MOBILE, expectHeading: /Preparación de la sesión/i });
  await assertNoOverflow(page, 'M-stage-es');
  await shot(page, 'm04-setup-es');
  await enterStage(page, 'M-stage-es');
  await assertNoOverflow(page, 'M-stage-es');
  await shot(page, 'm05-stage-laser-es');
  await context.close();
}

// M5) Reporte fixture ES.
{
  const { context, page } = await openView({ tag: 'M-report-es', path: '/postulaciones?fixture=1&battery=original', viewport: MOBILE, expectHeading: /Reporte de muestra listo para revisión humana/i });
  await assertNoOverflow(page, 'M-report-es');
  await shot(page, 'm06-report-es');
  await context.close();
}

// M6) /reclutador ES.
{
  const { context, page } = await openView({ tag: 'M-hr-es', path: '/reclutador', viewport: MOBILE, expectHeading: /Panel de evaluaciones/i });
  await assertNoOverflow(page, 'M-hr-es');
  await shot(page, 'm07-hr-es');
  await context.close();
}

// M7) /reclutador EN (móvil, paridad con el EN de desktop).
{
  const { context, page } = await openView({ tag: 'M-hr-en', path: '/reclutador?lang=en', viewport: MOBILE, expectHeading: /evaluations|assessments/i });
  await assertNoOverflow(page, 'M-hr-en');
  await shot(page, 'm08-hr-en');
  await context.close();
}

await browser.close();
const result = {
  baseUrl,
  views: 19,
  failures,
  consoleErrors: consoleErrors.slice(0, 20),
  contrast,
  screenshots,
};
console.log(JSON.stringify(result, null, 2));
process.exit(failures.length ? 1 : 0);
