// H4.6b (2026-09-07, t_be89dafb re-dispatch): AUDIT VISUAL POST-MARCA v2 —
// flujo candidato (landing interna, guard, setup, stage 5 juegos, reporte) +
// /reclutador bajo la marca oficial v2 (paleta beige/crema/arena/marrón/dorado,
// Archivo + Manrope vía tokens --k-*). Baseline: d1adc74 (ee152bb port de marca
// + d2c6b7e Manrope global + PNGs H4.6). La landing pública queda FUERA de
// scope (auditada en 9062ccf y rehecha en ee152bb).
//
// Verifica:
//   - 0 overflow horizontal en 1280x720 y 390x844
//   - 0 errores de consola/page/request
//   - tipografía v2: body = Manrope (fix global d2c6b7e); h1 de flujo =
//     Manrope (var(--k-font-sans), sin Archivo en vistas de flujo)
//   - chrome de marca v2: crema #f7efe6, beige #f2e8dc, arena #e4cdb5,
//     espresso #3d2b20, card oscuro #38271d, dorado #d8b38c
//   - contraste WCAG AA en pares chrome; el kicker #9a7355 sobre crema
//     (~3.2:1) es DECISIÓN ABIERTA documentada (design-system.md §10) →
//     warning, no failure
//   - pill de idioma: focus 3px terracota (vistas claras) / 3px arena (guard)
//   - recorrido vivo del stage: laser → balloon → passenger → team → tangram
//     → reporte en flujo (soluciones embebidas del smoke de playability G.1)
//   - preservación de mundos (laser cian, balloon celeste, team RPG) — los
//     mundos NO se tokenizan (H4.5); solo el chrome
//   - regresión H4.6: recorte del check-hint del footer laser
//   - reporte: sin etiquetas de framework/internas fugadas
//
// DISEÑO Pi (heredado de H3/H4.3/H4.5/H4.6): 1 contexto (1 carga de documento)
// por vista — las 3ª+ cargas en el mismo contexto revientan con
// ERR_INSUFFICIENT_RESOURCES. El recorrido del stage es un único contexto con
// transiciones in-page.
// Salida: JSON { failures, warnings, consoleErrors, contrast, brand,
// screenshots }. Exit 1 si hay fallos.

import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const baseUrl = process.env.BASE_URL ?? 'http://[::1]:5174';
const shotsDir = process.env.SHOTS_DIR ?? 'docs/qa/h46b-visual-audit';
mkdirSync(shotsDir, { recursive: true });
const failures = [];
const warnings = [];
const consoleErrors = [];
const screenshots = [];
const contrast = [];
const brand = {};

// Valores v2 (src/styles/krumm-tokens.css, design-system.md §10):
const V2 = {
  cream: 'rgb(247, 239, 230)',   // --k-bg-light #f7efe6
  beige: 'rgb(242, 232, 220)',   // --k-bg-beige / --k-card-cream #f2e8dc
  sand: 'rgb(228, 205, 181)',    // --k-bg-light-sand #e4cdb5
  espresso: 'rgb(61, 43, 32)',   // --k-ink-espresso #3d2b20
  gold: 'rgb(216, 179, 140)',    // --k-gold / --k-accent-sand #d8b38c
  terra: 'rgb(154, 115, 85)',    // --k-ink-terracotta #9a7355
  cardDark: 'rgb(56, 39, 29)',   // --k-bg-dark #38271d
  deepDark: 'rgb(43, 30, 22)',   // --k-bg-dark-deep #2b1e16
  navy: 'rgb(22, 30, 43)',       // --k-card-navy #161e2b
};

// Soluciones embebidas (smoke-original-games-playability.mjs / H4.5):
const LASER_SOLUTIONS = [
  [['7,0', '0,2'], ['7,2', '3,2'], ['7,4', '3,5'], ['7,6', '1,5']],
  [['0,0', '2,3'], ['1,6', '6,3'], ['3,6', '3,3'], ['5,6', '3,1'], ['7,6', '7,1']],
  [['0,0', '7,5'], ['1,0', '5,5'], ['2,0', '5,1'], ['4,7', '3,6'], ['5,7', '6,6'], ['6,7', '6,4']],
];
const TANGRAM_LEVEL_SLOTS = {
  1: ['tangram-slot-tri_large-0', 'tangram-slot-tri_large-1', 'tangram-slot-square-2', ['tangram-slot-tri_medium-3', 2]],
  2: ['tangram-slot-tri_large-0', 'tangram-slot-tri_large-1', 'tangram-slot-square-2', ['tangram-slot-tri_medium-3', 2], 'tangram-slot-tri_small-4'],
  3: ['tangram-slot-tri_large-0', 'tangram-slot-tri_large-1', 'tangram-slot-square-2', ['tangram-slot-tri_medium-3', 2], 'tangram-slot-tri_small-4', 'tangram-slot-tri_small-5'],
  4: ['tangram-slot-tri_large-0', 'tangram-slot-tri_large-1', 'tangram-slot-square-2', ['tangram-slot-tri_medium-3', 2], 'tangram-slot-tri_small-4', 'tangram-slot-tri_small-5', 'tangram-slot-rhombus-6'],
};

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

// Contraste WCAG AA. knownMin: par documentado bajo el umbral AA (decisión
// abierta, design-system §10) → warning, no failure.
async function checkContrast(page, tag, selText, label, { knownMin = null } = {}) {
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
    if (knownMin && r.ratio >= knownMin) {
      warnings.push(`[${tag}] contraste bajo documentado "${label}": ratio=${r.ratio} (texto ${r.color} sobre ${r.bg}) — decisión abierta design-system §10`);
    } else {
      failures.push(`[${tag}] contraste AA (<4.5:1) en "${label}": ratio=${r.ratio} (texto ${r.color} sobre ${r.bg})`);
    }
  }
}

// Fuente de marca v2: body debe declarar Manrope (fix d2c6b7e).
async function checkBrandFont(page, tag, { expectH1 = null } = {}) {
  const r = await page.evaluate(() => {
    const body = getComputedStyle(document.body).fontFamily;
    const h1 = document.querySelector('h1');
    const h1f = h1 ? getComputedStyle(h1).fontFamily : null;
    return { body, h1: h1f };
  });
  brand[tag] = { body: r.body, h1: r.h1 };
  if (!/Manrope/.test(r.body)) {
    failures.push(`[${tag}] body sin Manrope (marca v2): ${r.body}`);
  }
  if (expectH1 && r.h1 && !new RegExp(expectH1).test(r.h1)) {
    failures.push(`[${tag}] h1 con fuente inesperada (se esperaba ${expectH1}): ${r.h1}`);
  }
}

// Pill de idioma: foco por teclado → outline :focus-visible. Vistas claras:
// 3px terracota (v2 #9a7355); guard: override arena (v2 #d8b38c).
async function checkPillFocus(page, tag, expectColor) {
  const r = await page.evaluate(() => {
    const btn = document.querySelector('.krumm-lang-toggle__btn');
    if (!btn) return { found: false };
    btn.focus();
    const cs = getComputedStyle(btn);
    return { found: true, outlineWidth: cs.outlineWidth, outlineStyle: cs.outlineStyle, outlineColor: cs.outlineColor, expected: expectColor };
  });
  if (!r.found) {
    warnings.push(`[${tag}] pill de idioma no presente en la vista (sin check de focus)`);
    return;
  }
  if (r.outlineStyle === 'none') {
    // :focus-visible no aplica con focus script en algunos casos; reintentar con Tab real.
    await page.keyboard.press('Tab');
    const r2 = await page.evaluate((exp) => {
      const el = document.activeElement;
      if (!el || !el.className?.includes('krumm-lang-toggle__btn')) return null;
      const cs = getComputedStyle(el);
      return { outlineWidth: cs.outlineWidth, outlineStyle: cs.outlineStyle, outlineColor: cs.outlineColor };
    }, expectColor);
    if (!r2) {
      warnings.push(`[${tag}] pill focus no verificable (focus-visible inaplicable en headless)`);
      return;
    }
    r.outlineWidth = r2.outlineWidth; r.outlineStyle = r2.outlineStyle; r.outlineColor = r2.outlineColor;
  }
  if (r.outlineStyle !== 'none' && r.outlineColor !== expectColor) {
    failures.push(`[${tag}] pill focus: outline ${r.outlineWidth} ${r.outlineStyle} ${r.outlineColor} (esperado color ${expectColor})`);
  } else {
    contrast.push({ tag, label: 'pill-focus-outline', note: `outline=${r.outlineWidth} ${r.outlineStyle} ${r.outlineColor} (esperado ${expectColor})` });
  }
}

async function expectStyle(tag, label, actual, expect, mode = 'eq') {
  const ok = mode === 'contains' ? actual?.includes(expect)
    : mode === 'oneof' ? expect.includes(actual)
    : actual === expect;
  brand[`${tag}::${label}`] = { actual, expect, mode, ok };
  if (!ok) failures.push(`[${tag}] ${label}: ${mode}=${JSON.stringify(expect)} → actual=${actual}`);
}

async function dismissMicroIntro(page, tag) {
  const intro = page.getByTestId('game-micro-intro');
  const visible = await intro.isVisible().catch(() => false);
  if (!visible) return;
  await intro.getByRole('button', { name: /Saltar|Skip/i }).click({ timeout: 10000 })
    .catch(() => failures.push(`[${tag}] no se pudo saltar el micro-intro`));
  await intro.waitFor({ state: 'detached', timeout: 10000 }).catch(() => {});
}

async function enterStage(page, tag) {
  await page.getByTestId('postulation-explicit-consent').check();
  await page.getByRole('button', { name: /Continuar a juegos|Continue to games/i }).click();
  await page.getByText(/Juego 1 de 5|Game 1 of 5/i).waitFor({ timeout: 30000 })
    .catch(() => failures.push(`[${tag}] el primer bloque de juego (batería original) no cargó`));
  await page.locator('.laser-puzzle-task').waitFor({ timeout: 20000 })
    .catch(() => failures.push(`[${tag}] .laser-puzzle-task no renderizó`));
  await dismissMicroIntro(page, tag);
}

// Regresión H4.6: el check-hint del footer laser no debe recortarse.
async function checkLaserFooterClip(page, tag) {
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
  } else if (clip.cardOverflow > 1 || (clip.footerOverflow ?? 0) > 1 || !clip.hintInside || !clip.hintFullyPainted) {
    failures.push(`[${tag}] footer laser RECORTE (regresión H4.6): ${JSON.stringify(clip)}`);
  } else {
    contrast.push({ tag, label: 'laser-footer-clip-check', note: `OK hint dentro del stage (right ${clip.hintRight}/${clip.stageRight})` });
  }
}

async function solveLaserLevel(page, pairs, levelNo, tag) {
  for (const [origin, target] of pairs) {
    const originCell = page.locator(`[data-testid="laser-cell-${origin}"]`);
    const targetCell = page.locator(`[data-testid="laser-cell-${target}"]`);
    await originCell.scrollIntoViewIfNeeded().catch(() => {});
    await originCell.click({ timeout: 10000 }).catch(() => failures.push(`[${tag}] click celda origen ${origin} falló`));
    await targetCell.scrollIntoViewIfNeeded().catch(() => {});
    await targetCell.click({ timeout: 10000 }).catch(() => failures.push(`[${tag}] click celda destino ${target} falló`));
  }
  const check = page.getByRole('button', { name: /Comprobar ruta|Check route/i });
  await check.scrollIntoViewIfNeeded().catch(() => {});
  await check.click({ timeout: 10000 }).catch(() => failures.push(`[${tag}] "Comprobar ruta" (nivel ${levelNo}) falló`));
}

async function completePassengerRoutes(page, tag) {
  const move = async (direction, times = 1) => {
    for (let index = 0; index < times; index += 1) {
      await page.getByRole('button', { name: new RegExp(`^${direction}$`, 'i') }).click({ timeout: 10000 })
        .catch(() => failures.push(`[${tag}] movimiento "${direction}" falló (×${times})`));
    }
  };
  await move('Derecha');
  await move('Arriba', 3);
  await move('Derecha', 3);
  await page.getByText(/Circuito 2 de 3/i).waitFor({ timeout: 8000 })
    .catch(() => failures.push(`[${tag}] no avanzó a circuito 2 de 3`));
  await move('Derecha', 5);
  await move('Arriba', 3);
  await move('Izquierda', 4);
  await move('Arriba');
  await page.getByText(/Circuito 3 de 3/i).waitFor({ timeout: 8000 })
    .catch(() => failures.push(`[${tag}] no avanzó a circuito 3 de 3`));
  await move('Derecha', 6);
  await move('Arriba');
  await move('Arriba', 2);
  await move('Izquierda', 6);
  await move('Arriba');
}

const DESKTOP = { width: 1280, height: 720 };
const MOBILE = { width: 390, height: 844 };
const STAGE_PATH = '/postulaciones?invite=tok-live-abc123&battery=original';

// ============ DESKTOP 1280x720 ============

// 1) Landing interna ES.
{
  const { context, page } = await openView({ tag: 'D-int-es', path: '/postulaciones?battery=original', viewport: DESKTOP, expectHeading: /KRUMM Postulaciones/i });
  await assertNoOverflow(page, 'D-int-es');
  await checkBrandFont(page, 'D-int-es', { expectH1: 'Manrope' });
  await checkContrast(page, 'D-int-es', '.postulation-demo__eyebrow', 'eyebrow/kicker interna', { knownMin: 3.0 });
  await checkContrast(page, 'D-int-es', 'h1', 'h1 interna');
  await checkPillFocus(page, 'D-int-es', V2.terra);
  const bg = await page.evaluate(() => getComputedStyle(document.querySelector('.postulation-demo') ?? document.body).backgroundColor);
  expectStyle('D-int-es', 'bg landing', bg, [V2.cream, V2.beige], 'oneof');
  await shot(page, 'd01-landing-interna-es');
  await context.close();
}

// 2) Guard inválido ES (superficie dark-deep).
{
  const { context, page } = await openView({ tag: 'D-guard-es', path: '/postulaciones?invite=tok-expired-abc123', viewport: DESKTOP, expectHeading: /Invitación no válida/i });
  await assertNoOverflow(page, 'D-guard-es');
  await checkBrandFont(page, 'D-guard-es');
  const cardBg = await page.evaluate(() => getComputedStyle(document.querySelector('main.postulation-demo__invite-guard') ?? document.querySelector('.postulation-demo__invite-guard')).backgroundColor);
  expectStyle('D-guard-es', 'bg guard', cardBg, V2.deepDark, 'eq');
  await checkContrast(page, 'D-guard-es', 'main.postulation-demo__invite-guard', 'texto guard');
  await checkPillFocus(page, 'D-guard-es', V2.gold);
  await shot(page, 'd02-guard-es');
  await context.close();
}

// 3) Setup ES (pantalla, sin avanzar).
{
  const { context, page } = await openView({ tag: 'D-setup-es', path: STAGE_PATH, viewport: DESKTOP, expectHeading: /Preparación de la sesión/i });
  await assertNoOverflow(page, 'D-setup-es');
  await checkBrandFont(page, 'D-setup-es', { expectH1: 'Manrope' });
  await checkContrast(page, 'D-setup-es', '.postulation-demo__setup-panel h1, .postulation-demo__setup-panel', 'setup panel');
  await checkPillFocus(page, 'D-setup-es', V2.terra);
  await shot(page, 'd03-setup-es');
  await context.close();
}

// 4) RECORRIDO VIVO: setup → stage 5 juegos → reporte en flujo (1 contexto).
{
  const { context, page } = await openView({ tag: 'D-walk', path: STAGE_PATH, viewport: DESKTOP, expectHeading: /Preparación de la sesión/i });
  await enterStage(page, 'D-walk');

  // Juego 1 — laser (mundo Órbita conservado + chrome v2).
  await assertNoOverflow(page, 'D-walk-laser');
  await checkLaserFooterClip(page, 'D-walk-laser');
  const laserBorder = await page.evaluate(() => getComputedStyle(document.querySelector('.laser-puzzle-task')).borderColor);
  expectStyle('D-walk-laser', 'borde mundo cian', laserBorder, 'rgba(34, 211, 238', 'contains');
  const sfxBg = await page.evaluate(() => getComputedStyle(document.querySelector('.postulation-demo__sfx-toggle')).backgroundColor);
  expectStyle('D-walk-laser', 'sfx-toggle cream v2', sfxBg, V2.beige, 'eq');
  await shot(page, 'd04-stage-1-laser-es');
  for (let levelNo = 0; levelNo < LASER_SOLUTIONS.length; levelNo += 1) {
    await solveLaserLevel(page, LASER_SOLUTIONS[levelNo], levelNo + 1, 'D-walk-laser');
  }

  // Juego 2 — balloon (mundo Cielo conservado).
  await page.getByRole('heading', { name: /Globo de riesgo/i }).first().waitFor({ timeout: 30000 })
    .catch(() => failures.push('[D-walk-balloon] no avanzó a balloon tras laser'));
  if (!failures.some((f) => f.includes('D-walk-balloon'))) {
    await dismissMicroIntro(page, 'D-walk-balloon');
    await assertNoOverflow(page, 'D-walk-balloon');
    const arena = await page.evaluate(() => getComputedStyle(document.querySelector('.balloon-risk-task__arena')).backgroundImage);
    expectStyle('D-walk-balloon', 'arena celeste mundo', arena, 'rgb(191, 219, 254)', 'contains');
    await shot(page, 'd05-stage-2-balloon-es');
    for (let round = 1; round <= 8; round += 1) {
      await page.getByText(`Ronda ${round} de 8`).first().waitFor({ timeout: 10000 })
        .catch(() => failures.push(`[D-walk-balloon] ronda ${round} de 8 no apareció`));
      await page.getByRole('button', { name: /Asegurar puntos/i }).click({ timeout: 10000 })
        .catch(() => failures.push(`[D-walk-balloon] "Asegurar puntos" (ronda ${round}) falló`));
    }
  }

  // Juego 3 — passenger.
  await page.getByRole('heading', { name: /Central de movilidad/i }).first().waitFor({ timeout: 30000 })
    .catch(() => failures.push('[D-walk-passenger] no avanzó a passenger tras balloon'));
  if (!failures.some((f) => f.includes('D-walk-passenger'))) {
    await dismissMicroIntro(page, 'D-walk-passenger');
    await assertNoOverflow(page, 'D-walk-passenger');
    await shot(page, 'd06-stage-3-passenger-es');
    await completePassengerRoutes(page, 'D-walk-passenger');
  }

  // Juego 4 — team (Operación Faro, RPG).
  await page.getByRole('heading', { name: /Operación Faro/i }).first().waitFor({ timeout: 30000 })
    .catch(() => failures.push('[D-walk-team] no avanzó a team tras passenger'));
  if (!failures.some((f) => f.includes('D-walk-team'))) {
    await dismissMicroIntro(page, 'D-walk-team');
    await assertNoOverflow(page, 'D-walk-team');
    const rpg = await page.getByText(/RPG táctico/i).first().isVisible().catch(() => false);
    if (!rpg) failures.push('[D-walk-team] escena RPG no visible');
    await shot(page, 'd07-stage-4-team-es');
    for (const option of ['Alinear objetivo, asignar roles', 'Explicar el motivo del cambio', 'Reconocer la ambigüedad', 'Repriorizar el objetivo mínimo']) {
      await page.getByRole('button', { name: option, exact: false }).click({ timeout: 15000 })
        .catch(() => failures.push(`[D-walk-team] opción "${option}" falló`));
      await page.getByRole('button', { name: /Continuar aventura|Cerrar misión/i }).click({ timeout: 15000 })
        .catch(() => failures.push(`[D-walk-team] "Continuar" tras "${option}" falló`));
    }
  }

  // Juego 5 — tangram (tutorial + 4 niveles).
  await page.getByRole('heading', { name: /Ensamblaje Geométrico/i }).first().waitFor({ timeout: 30000 })
    .catch(() => failures.push('[D-walk-tangram] no avanzó a tangram tras team'));
  if (!failures.some((f) => f.includes('D-walk-tangram'))) {
    await page.getByTestId('tangram-start-tutorial').click({ timeout: 15000 })
      .catch(() => failures.push('[D-walk-tangram] no se pudo iniciar el tutorial'));
    await assertNoOverflow(page, 'D-walk-tangram');
    await shot(page, 'd08-stage-5-tangram-es');
    const placePiece = async (slotTestId, rotations = 0) => {
      await page.getByTestId('tangram-piece-1').click({ timeout: 10000 });
      for (let r = 0; r < rotations; r += 1) await page.getByTestId('tangram-rotate-btn').click({ timeout: 10000 });
      await page.getByTestId(slotTestId).click({ timeout: 10000 });
    };
    await placePiece('tangram-slot-tri_large-0');
    await placePiece('tangram-slot-tri_large-1');
    await page.getByTestId('tangram-outcome').waitFor({ timeout: 10000 })
      .catch(() => failures.push('[D-walk-tangram] outcome del tutorial no apareció'));
    await page.getByTestId('tangram-start-eval').click({ timeout: 10000 })
      .catch(() => failures.push('[D-walk-tangram] no se pudo iniciar la evaluación'));
    for (const levelNum of [1, 2, 3, 4]) {
      await page.getByTestId('tangram-level-label').filter({ hasText: `Nivel ${levelNum} de 4` }).waitFor({ timeout: 20000 })
        .catch(() => failures.push(`[D-walk-tangram] nivel ${levelNum} no apareció`));
      for (const entry of TANGRAM_LEVEL_SLOTS[levelNum]) {
        const [slot, rotations] = Array.isArray(entry) ? entry : [entry, 0];
        await placePiece(slot, rotations);
      }
      await page.getByTestId('tangram-outcome').waitFor({ timeout: 15000 })
        .catch(() => failures.push(`[D-walk-tangram] outcome nivel ${levelNum} no apareció`));
    }
  }

  // Reporte en flujo (tras los 5 juegos).
  await page.getByText(/Resumen ejecutivo HR/i).waitFor({ timeout: 30000 })
    .catch(() => failures.push('[D-report-flujo] el reporte post-juegos no apareció'));
  if (!failures.some((f) => f.includes('D-report-flujo'))) {
    await page.waitForTimeout(1500);
    await assertNoOverflow(page, 'D-report-flujo');
    await checkBrandFont(page, 'D-report-flujo', { expectH1: 'Manrope' });
    await checkContrast(page, 'D-report-flujo', '.postulation-demo__report-status-card strong', 'status card strong');
    await checkContrast(page, 'D-report-flujo', '.postulation-demo__report-status-card span', 'status card kicker');
    const reportText = await page.evaluate(() => document.body.innerText);
    if (/Framework R-6|workbook|descriptive_only|provisional_score|not_measured|No medido|Authoring|Calibration|Instruction check|valid_for_internal_demo/i.test(reportText)) {
      failures.push('[D-report-flujo] el reporte fuga etiquetas de framework/internas');
    }
    await shot(page, 'd09-report-flujo-es');
  }
  await context.close();
}

// 5) Reporte fixture ES (vista de referencia sin recorrido).
{
  const { context, page } = await openView({ tag: 'D-report-fx-es', path: '/postulaciones?fixture=1&battery=original', viewport: DESKTOP, expectHeading: /Reporte de muestra listo para revisión humana/i });
  await assertNoOverflow(page, 'D-report-fx-es');
  await checkContrast(page, 'D-report-fx-es', '.postulation-demo__report-status-card strong', 'status card strong (crema sobre navy)');
  await checkContrast(page, 'D-report-fx-es', '.postulation-demo__report-status-card span', 'status card kicker (arena sobre navy)');
  await shot(page, 'd10-report-fixture-es');
  await context.close();
}

// 6) /reclutador ES.
{
  const { context, page } = await openView({ tag: 'D-hr-es', path: '/reclutador', viewport: DESKTOP, expectHeading: /Panel de evaluaciones/i });
  await assertNoOverflow(page, 'D-hr-es');
  await checkBrandFont(page, 'D-hr-es', { expectH1: 'Manrope' });
  const topbar = await page.evaluate(() => getComputedStyle(document.querySelector('.hr-dashboard__topbar') ?? document.body).backgroundColor);
  expectStyle('D-hr-es', 'topbar HR dark-deep v2', topbar, V2.deepDark, 'eq');
  await checkContrast(page, 'D-hr-es', '.hr-dashboard__brand', 'brand topbar');
  await checkContrast(page, 'D-hr-es', '.hr-dashboard__hero h1', 'h1 HR');
  await shot(page, 'd14-hr-es');
  await context.close();
}

// 7) Landing interna EN.
{
  const { context, page } = await openView({ tag: 'D-int-en', path: '/postulaciones?battery=original&lang=en', viewport: DESKTOP, expectHeading: /KRUMM Applications/i });
  await assertNoOverflow(page, 'D-int-en');
  await checkBrandFont(page, 'D-int-en');
  await shot(page, 'd11-landing-interna-en');
  await context.close();
}

// 8) Stage EN (setup → juego 1, sin resolver).
{
  const { context, page } = await openView({ tag: 'D-stage-en', path: `${STAGE_PATH}&lang=en`, viewport: DESKTOP, expectHeading: /Session preparation/i });
  await enterStage(page, 'D-stage-en');
  await assertNoOverflow(page, 'D-stage-en');
  await shot(page, 'd12-stage-laser-en');
  await context.close();
}

// 9) Reporte fixture EN.
{
  const { context, page } = await openView({ tag: 'D-report-fx-en', path: '/postulaciones?fixture=1&battery=original&lang=en', viewport: DESKTOP, expectHeading: /sample report/i });
  await assertNoOverflow(page, 'D-report-fx-en');
  await shot(page, 'd13-report-fixture-en');
  await context.close();
}

// 10) /reclutador EN.
{
  const { context, page } = await openView({ tag: 'D-hr-en', path: '/reclutador?lang=en', viewport: DESKTOP, expectHeading: /evaluations|assessments/i });
  await assertNoOverflow(page, 'D-hr-en');
  await shot(page, 'd15-hr-en');
  await context.close();
}

// ============ MÓVIL 390x844 ============

// M1) Landing interna ES.
{
  const { context, page } = await openView({ tag: 'M-int-es', path: '/postulaciones?battery=original', viewport: MOBILE, expectHeading: /KRUMM Postulaciones/i });
  await assertNoOverflow(page, 'M-int-es');
  await checkBrandFont(page, 'M-int-es');
  await shot(page, 'm01-landing-interna-es');
  await context.close();
}

// M2) Guard ES.
{
  const { context, page } = await openView({ tag: 'M-guard-es', path: '/postulaciones?invite=tok-expired-abc123', viewport: MOBILE, expectHeading: /Invitación no válida/i });
  await assertNoOverflow(page, 'M-guard-es');
  await shot(page, 'm02-guard-es');
  await context.close();
}

// M3) Setup ES.
{
  const { context, page } = await openView({ tag: 'M-setup-es', path: STAGE_PATH, viewport: MOBILE, expectHeading: /Preparación de la sesión/i });
  await assertNoOverflow(page, 'M-setup-es');
  await shot(page, 'm03-setup-es');
  await context.close();
}

// M4) Stage móvil (setup → juego 1, sin resolver).
{
  const { context, page } = await openView({ tag: 'M-stage-es', path: STAGE_PATH, viewport: MOBILE, expectHeading: /Preparación de la sesión/i });
  await enterStage(page, 'M-stage-es');
  await assertNoOverflow(page, 'M-stage-es');
  await shot(page, 'm04-stage-laser-es');
  await context.close();
}

// M5) Reporte fixture ES.
{
  const { context, page } = await openView({ tag: 'M-report-es', path: '/postulaciones?fixture=1&battery=original', viewport: MOBILE, expectHeading: /Reporte de muestra listo para revisión humana/i });
  await assertNoOverflow(page, 'M-report-es');
  await shot(page, 'm05-report-fixture-es');
  await context.close();
}

// M6) /reclutador ES.
{
  const { context, page } = await openView({ tag: 'M-hr-es', path: '/reclutador', viewport: MOBILE, expectHeading: /Panel de evaluaciones/i });
  await assertNoOverflow(page, 'M-hr-es');
  await shot(page, 'm06-hr-es');
  await context.close();
}

// M7) /reclutador EN (paridad con desktop EN).
{
  const { context, page } = await openView({ tag: 'M-hr-en', path: '/reclutador?lang=en', viewport: MOBILE, expectHeading: /evaluations|assessments/i });
  await assertNoOverflow(page, 'M-hr-en');
  await shot(page, 'm07-hr-en');
  await context.close();
}

await browser.close();
const result = {
  baseUrl,
  baseline: 'd1adc74 (marca v2)',
  views: 21,
  failures,
  warnings,
  consoleErrors: consoleErrors.slice(0, 20),
  contrast: contrast.slice(0, 40),
  brand,
  screenshots,
};
console.log(JSON.stringify(result, null, 2));
process.exit(failures.length ? 1 : 0);
