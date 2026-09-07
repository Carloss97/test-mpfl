// H4.5 smoke browser (2026-09-07, t_5d775c9a): chrome de juegos sobre design
// system. Verifica con ESTILOS COMPUTADOS en el stage vivo de la batería
// original (?invite=...&battery=original):
//   Run A (desktop 1280x720): setup → stage juego 1/5 (laser "Órbita"):
//     - chrome tokenizado: pill .task-title (world override oscuro intacto),
//       pips base --k-divider, sfx-toggle --k-card-cream, caption world;
//     - mundo "Órbita" conservado: borde cian del contenedor, .primary cian
//       (NO la pill arena compartida — el override de mundo manda), pip
//       actual cian;
//     - luego resuelve los 3 niveles de laser (soluciones embebidas de
//       laserPuzzleTelemetry.js, patrón R3 verificado) y avanza a balloon
//       (juego 2/5): mundo "Cielo" conservado (arena celeste, stats pink,
//       .primary azul) + pill task-title crema (chrome genérico sin override).
//   Run B (móvil 390x844): stage laser: overflow horizontal 0 + captura.
// DISEÑO Pi (heredado de H3/H4.3): 1 contexto (1 carga de documento) por run —
// las transiciones en página (setup → stage → laser → balloon) no recargan.
// Salida: JSON { failures, consoleErrors, screenshots }. Exit 1 si hay fallos.

import { chromium } from '@playwright/test';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:5173';
const shotsDir = process.env.SHOTS_DIR ?? 'docs/qa/h45-games-design-system';
const failures = [];
const consoleErrors = [];
const screenshots = [];

// Soluciones embebidas de buildLaserDemoLevels() (laserPuzzleTelemetry.js):
// [origin, target] por pieza; 3 niveles (trialCount=3 del blueprint laser).
const LASER_SOLUTIONS = [
  [['7,0', '0,2'], ['7,2', '3,2'], ['7,4', '3,5'], ['7,6', '1,5']],
  [['0,0', '2,3'], ['1,6', '6,3'], ['3,6', '3,3'], ['5,6', '3,1'], ['7,6', '7,1']],
  [['0,0', '7,5'], ['1,0', '5,5'], ['2,0', '5,1'], ['4,7', '3,6'], ['5,7', '6,6'], ['6,7', '6,4']],
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
  if (expected.startsWith('contains:')) {
    if (!actual[prop].includes(expected.slice(9))) {
      failures.push(`[${tag}] ${sel} → ${prop} esperado contiene "${expected.slice(9)}", visto "${actual[prop]}"`);
    }
  } else if (actual[prop] !== expected) {
    failures.push(`[${tag}] ${sel} → ${prop} esperado "${expected}", visto "${actual[prop]}"`);
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

async function enterStage(page, tag) {
  await page.getByTestId('postulation-explicit-consent').check();
  await page.getByRole('button', { name: /Continuar a juegos|Continue to games/i }).click();
  await page.getByText(/Juego 1 de 5|Game 1 of 5/i).waitFor({ timeout: 30000 })
    .catch(() => failures.push(`[${tag}] el primer bloque de juego (batería original) no cargó`));
  await page.locator('.laser-puzzle-task').waitFor({ timeout: 20000 })
    .catch(() => failures.push(`[${tag}] .laser-puzzle-task no renderizó (juego 1 de la batería original)`));
  await dismissMicroIntro(page, tag);
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

// ---------- Run A: desktop 1280x720 ----------
const DESKTOP = { width: 1280, height: 720 };

{
  const { context, page } = await openView({ tag: 'A-laser', path: '/postulaciones?invite=tok-live-abc123&battery=original', viewport: DESKTOP, expectHeading: /Preparación de la sesión/i });
  await enterStage(page, 'A-laser');
  await assertNoOverflow(page, 'A-laser');

  // - pips: en laser el override world (slate oscuro) manda sobre la base
  //   tokenizada (--k-divider); el glow del pip actual es cian (animación
  //   pip-pulse con --pip-pulse-color world; el spread varía 0→4px en vivo).
  const pipBase = await stylesOf(page, '.laser-puzzle-task .game-pips__dot', ['backgroundColor']);
  expectStyle('A-laser', '.laser-puzzle-task .game-pips__dot', 'backgroundColor', 'rgba(71, 85, 105, 0.75)', pipBase); // world
  const pipCurrent = await stylesOf(page, '.laser-puzzle-task .game-pips__dot--current', ['backgroundColor', 'boxShadow']);
  expectStyle('A-laser', '.laser-puzzle-task .game-pips__dot--current', 'backgroundColor', 'rgba(71, 85, 105, 0.75)', pipCurrent); // world
  expectStyle('A-laser', '.laser-puzzle-task .game-pips__dot--current', 'boxShadow', 'contains:rgba(34, 211, 238', pipCurrent); // pulso cian (world)
  // - sfx-toggle: --k-card-cream.
  const sfx = await stylesOf(page, '.postulation-demo__sfx-toggle', ['backgroundColor', 'borderRadius']);
  expectStyle('A-laser', '.postulation-demo__sfx-toggle', 'backgroundColor', 'rgb(242, 236, 227)', sfx);
  expectStyle('A-laser', '.postulation-demo__sfx-toggle', 'borderRadius', '999px', sfx); // --k-radius-pill
  // - caption: override world del laser (#94a3b8) sobre el chrome genérico.
  const caption = await stylesOf(page, '.laser-puzzle-task__caption', ['color']);
  expectStyle('A-laser', '.laser-puzzle-task__caption', 'color', 'rgb(148, 163, 184)', caption);

  // Mundo "Órbita" conservado (no tokenizado):
  const laserBox = await stylesOf(page, '.laser-puzzle-task', ['borderColor', 'color', 'borderRadius']);
  expectStyle('A-laser', '.laser-puzzle-task', 'borderColor', 'rgba(34, 211, 238, 0.22)', laserBox);
  expectStyle('A-laser', '.laser-puzzle-task', 'color', 'rgb(196, 178, 160)', laserBox); // --k-text-cream-dim (chrome residual)
  expectStyle('A-laser', '.laser-puzzle-task', 'borderRadius', '18px', laserBox); // --k-radius-card
  const laserTitle = await stylesOf(page, '.laser-puzzle-task .task-title', ['backgroundColor', 'color']);
  expectStyle('A-laser', '.laser-puzzle-task .task-title', 'backgroundColor', 'rgba(15, 23, 42, 0.72)', laserTitle); // world
  expectStyle('A-laser', '.laser-puzzle-task .task-title', 'color', 'rgb(226, 232, 240)', laserTitle); // world
  const laserPrimary = await stylesOf(page, '.laser-puzzle-task .primary', ['backgroundColor', 'color', 'backgroundImage']);
  expectStyle('A-laser', '.laser-puzzle-task .primary', 'color', 'rgb(255, 255, 255)', laserPrimary);
  expectStyle('A-laser', '.laser-puzzle-task .primary', 'backgroundImage', 'contains:linear-gradient(135deg, rgb(34, 211, 238), rgb(8, 145, 178))', laserPrimary); // world cian, no la pill arena
  await shot(page, 'a1-stage-laser-espresso-chrome');

  // Resolver los 3 niveles (solución embebida) → avanzar a balloon.
  for (let levelNo = 0; levelNo < LASER_SOLUTIONS.length; levelNo += 1) {
    await solveLaserLevel(page, LASER_SOLUTIONS[levelNo], levelNo + 1, 'A-laser');
    if (levelNo < LASER_SOLUTIONS.length - 1) {
      await page.getByTestId('laser-clear-overlay').waitFor({ timeout: 20000 })
        .catch(() => failures.push(`[A-laser] overlay de nivel resuelto (nivel ${levelNo + 1}) no apareció`));
      await page.locator('.laser-puzzle-task .task-progress').filter({ hasText: new RegExp(`Nivel ${levelNo + 2} de ${LASER_SOLUTIONS.length}`) }).waitFor({ timeout: 25000 })
        .catch(() => failures.push(`[A-laser] no avanzó al nivel ${levelNo + 2}`));
    } else {
      await page.locator('.balloon-risk-task').waitFor({ timeout: 25000 })
        .catch(() => failures.push('[A-balloon] no avanzó a balloon tras el último nivel de laser'));
    }
  }
  if (!failures.some((f) => f.includes('A-balloon'))) {
    await dismissMicroIntro(page, 'A-balloon');
    await assertNoOverflow(page, 'A-balloon');

    // Balloon "Cielo": mundo conservado + chrome tokenizado.
    const balloonBox = await stylesOf(page, '.balloon-risk-task', ['borderColor', 'color', 'borderRadius']);
    expectStyle('A-balloon', '.balloon-risk-task', 'borderColor', 'rgba(59, 130, 246, 0.24)', balloonBox); // world
    expectStyle('A-balloon', '.balloon-risk-task', 'color', 'rgb(51, 36, 28)', balloonBox); // --k-ink-espresso (chrome)
    expectStyle('A-balloon', '.balloon-risk-task', 'borderRadius', '18px', balloonBox); // --k-radius-card
    const arena = await stylesOf(page, '.balloon-risk-task__arena', ['backgroundImage']);
    expectStyle('A-balloon', '.balloon-risk-task__arena', 'backgroundImage', 'contains:rgb(191, 219, 254)', arena); // mundo celeste
    const statsStrong = await stylesOf(page, '.balloon-risk-task__stats strong', ['color']);
    expectStyle('A-balloon', '.balloon-risk-task__stats strong', 'color', 'rgb(157, 23, 77)', statsStrong); // world pink
    const balloonPrimary = await stylesOf(page, '.balloon-risk-task__controls .primary', ['backgroundImage', 'color']);
    expectStyle('A-balloon', '.balloon-risk-task__controls .primary', 'backgroundImage', 'contains:linear-gradient(135deg, rgb(59, 130, 246), rgb(37, 99, 235))', balloonPrimary); // world azul
    expectStyle('A-balloon', '.balloon-risk-task__controls .primary', 'color', 'rgb(255, 255, 255)', balloonPrimary); // CTA de mundo: texto blanco
    // Pill task-title: chrome genérico sin override en balloon → crema.
    const balloonTitle = await stylesOf(page, '.balloon-risk-task .task-title', ['backgroundColor', 'color']);
    expectStyle('A-balloon', '.balloon-risk-task .task-title', 'backgroundColor', 'rgb(242, 236, 227)', balloonTitle); // --k-card-cream
    expectStyle('A-balloon', '.balloon-risk-task .task-title', 'color', 'rgb(58, 44, 32)', balloonTitle); // --k-ink-card
    // (La pill arena compartida .primary se cubre en el spec de declaración —
    // en balloon/laser el override de mundo manda sobre ella.)
    await shot(page, 'a2-stage-balloon-cielo-mundo');
  }
  await context.close();
}

// ---------- Run B: móvil 390x844 ----------
{
  const { context, page } = await openView({ tag: 'B-laser', path: '/postulaciones?invite=tok-live-abc123&battery=original', viewport: { width: 390, height: 844 }, expectHeading: /Preparación de la sesión/i });
  await enterStage(page, 'B-laser');
  await assertNoOverflow(page, 'B-laser');
  const laserBox = await stylesOf(page, '.laser-puzzle-task', ['borderRadius']);
  expectStyle('B-laser', '.laser-puzzle-task', 'borderRadius', '18px', laserBox);
  await shot(page, 'b1-stage-laser-mobile');
  await context.close();
}

await browser.close();
const result = { baseUrl, failures, consoleErrors: consoleErrors.slice(0, 20), screenshots };
console.log(JSON.stringify(result, null, 2));
process.exit(failures.length > 0 ? 1 : 0);
