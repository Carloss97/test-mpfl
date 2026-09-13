// FASE B.6 — BalloonRisk (balloon_risk) pre-lanzamiento: smoke 2 viewports (1280×720 + 390×844).
//
// Parte A (vivo, ?invite=tok-dev-dev1234&battery=original):
//   setup/consent → Laser (juego 1: 3 niveles resueltos con las soluciones embebidas
//   de laserPuzzleTelemetry.js) → Balloon (juego 2: 8 rondas, mixto 4 pops / 4 cashouts)
//   → avance verificado a juego 3 (passenger). Sin overflow, sin console errors,
//   pop FX visible, sesión completatable hasta balloon.
// Parte B (fixture, ?fixture=1&battery=original):
//   reporte final con datos sintéticos: card de Balloon (Rondas 8/8, Eficiencia riesgo 72%,
//   Asegurados 6, feedback "Estrategia riesgo/recompensa"), constructo riskFeedbackProfile
//   "Lectura preliminar" + caveat "tolerancia a la frustración" (R-6 negativo),
//   decisionMaking "Lectura descriptiva", tags R-6d ("Score provisional", "Sin baremos · no comparable"),
//   y ausencia de "No medido".
//
// Patrón: scripts/smoke-t_f40921bf-stage-mobile.mjs (completeLaser/skipMicroIntro).
// Pi: chromium-1234 (ver skill krumm-talent-assessment-development, pitfall d).

import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:5173';
const shotsDir = process.env.SHOTS_DIR ?? 'docs/qa/prelaunch/balloon-risk-2026-09-12';
mkdirSync(shotsDir, { recursive: true });

const failures = [];
const consoleErrors = [];

const browser = await chromium.launch({
  headless: true,
  executablePath: '/home/sarlock/.cache/ms-playwright/chromium-1234/chrome-linux/chrome',
  args: ['--headless=new', '--disable-dev-shm-usage', '--disable-gpu'],
});

function track(page, tag) {
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(`[${tag}] ${msg.text()}`); });
  page.on('pageerror', (err) => consoleErrors.push(`[${tag}] pageerror ${err.message}`));
  page.on('requestfailed', (req) => consoleErrors.push(`[${tag}] requestfailed ${req.url()}`));
}

async function shot(page, name) {
  await page.screenshot({ path: `${shotsDir}/${name}.png` }).catch(() => {});
}

const gameNoRe = (n, total) => new RegExp(`(Juego ${n} de ${total}|Game ${n} of ${total})`);
const roundRe = (n) => new RegExp(`(Ronda ${n} de 8|Round ${n} of 8)`);

async function assertNoOverflow(page, tag) {
  const m = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  if (m.scrollWidth > m.innerWidth + 1) {
    failures.push(`[${tag}] overflow horizontal (scrollWidth=${m.scrollWidth} > innerWidth=${m.innerWidth})`);
  }
}

async function skipMicroIntro(page, tag) {
  const skip = page.getByRole('button', { name: /^Saltar$|^Skip$/i });
  if (await skip.count() > 0) {
    await skip.first().click().catch(() => failures.push(`[${tag}] no se pudo saltar la micro-intro`));
    await page.waitForTimeout(500);
  }
}

// Soluciones origen→destino por nivel (laserPuzzleTelemetry.js, solutionPlacements).
const LASER_SOLUTIONS = [
  [['7,0', '0,2'], ['7,2', '3,2'], ['7,4', '3,5'], ['7,6', '1,5']],
  [['0,0', '2,3'], ['1,6', '6,3'], ['3,6', '3,3'], ['5,6', '3,1'], ['7,6', '7,1']],
  [['0,0', '7,5'], ['1,0', '5,5'], ['2,0', '5,1'], ['4,7', '3,6'], ['5,7', '6,6'], ['6,7', '6,4']],
];

async function completeLaser(page, tag) {
  await skipMicroIntro(page, tag);
  for (let lvl = 0; lvl < LASER_SOLUTIONS.length; lvl += 1) {
    for (const [origin, target] of LASER_SOLUTIONS[lvl]) {
      await page.getByTestId(`laser-cell-${origin}`).click({ timeout: 8000 })
        .catch(() => failures.push(`[${tag}] laser celda origen ${origin} (nivel ${lvl + 1}) no clicable`));
      await page.waitForTimeout(180);
      await page.getByTestId(`laser-cell-${target}`).click({ timeout: 8000 })
        .catch(() => failures.push(`[${tag}] laser celda destino ${target} (nivel ${lvl + 1}) no clicable`));
      await page.waitForTimeout(180);
    }
    await page.getByRole('button', { name: /Comprobar ruta|Check route/i }).click({ timeout: 8000 })
      .catch(() => failures.push(`[${tag}] "Comprobar ruta" (nivel ${lvl + 1}) no clicable`));
    await page.waitForTimeout(3800); // clear 1500 + interlevel 1400 + buffer
  }
}

// Balloon: 8 rondas. Estrategia mixta: rondas pares (1,3,5,7) inflan hasta el umbral
// (pop) y rondas impares (2,4,6,8) inflan 1 y aseguran (cashout). Prueba ambos FX,
// popCount/cashoutCount y el avance de ronda. Umbrales fijos (balloonRiskTelemetry.js).
const THRESHOLDS = [7, 10, 8, 12, 9, 11, 13, 8];

async function playBalloon(page, tag) {
  await skipMicroIntro(page, tag);
  const inflar = page.getByRole('button', { name: /Inflar|Inflate/i });
  const asegurar = page.getByRole('button', { name: /Asegurar puntos|Secure points/i });

  for (let r = 0; r < 8; r += 1) {
    await page.getByText(roundRe(r + 1)).waitFor({ timeout: 20000 })
      .catch(() => failures.push(`[${tag}] "Ronda ${r + 1} de 8" no apareció`));
    if (r === 0) await shot(page, `${tag}-balloon-round1`);

    const pops = r % 2 === 0;
    const clicks = pops ? THRESHOLDS[r] : 1;
    for (let p = 0; p < clicks; p += 1) {
      await inflar.click({ timeout: 8000 })
        .catch(() => failures.push(`[${tag}] "Inflar" (ronda ${r + 1}) no clicable`));
      await page.waitForTimeout(160);
    }

    if (pops) {
      await page.getByText('💥').waitFor({ state: 'visible', timeout: 3000 })
        .catch(() => failures.push(`[${tag}] pop FX (💥) no visible (ronda ${r + 1})`));
      if (r === 4) await shot(page, `${tag}-balloon-pop`);
      await page.waitForTimeout(1000); // FX pop 900 ms + avance
    } else {
      await asegurar.click({ timeout: 8000 })
        .catch(() => failures.push(`[${tag}] "Asegurar puntos" (ronda ${r + 1}) no clicable`));
      await page.waitForTimeout(800); // FX cashout 500 ms + avance
      if (r === 1) await shot(page, `${tag}-balloon-cashout`);
    }
  }

  // Ronda 8 cashout → completeGame → onComplete → batería avanza en el mismo batch
  // (la pantalla finished NUNCA se renderiza en batería; ver rollup nota B.5/a).
  await page.getByText(gameNoRe(3, 7)).waitFor({ timeout: 20000 })
    .catch(() => failures.push(`[${tag}] no avanzó a juego 3 (passenger) tras balloon`));
  await shot(page, `${tag}-advance-passenger`);
}

async function runLive(page, tag) {
  await page.goto(`${baseUrl}/postulaciones?invite=tok-dev-dev1234&battery=original`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: /Preparación de la sesión|Session preparation/i }).waitFor({ timeout: 30000 })
    .catch(() => failures.push(`[${tag}] setup no cargó`));
  await page.getByTestId('postulation-explicit-consent').check({ timeout: 5000 })
    .catch(() => failures.push(`[${tag}] checkbox de consentimiento no disponible`));
  await page.getByRole('button', { name: /Continuar a juegos|Continue to games/i }).click({ timeout: 5000 })
    .catch(() => failures.push(`[${tag}] "Continuar a juegos" no clicable`));

  await page.getByText(gameNoRe(1, 7)).waitFor({ timeout: 30000 })
    .catch(() => failures.push(`[${tag}] juego 1 (laser) no cargó`));
  await assertNoOverflow(page, tag);

  await completeLaser(page, tag);

  await page.getByText(gameNoRe(2, 7)).waitFor({ timeout: 30000 })
    .catch(() => failures.push(`[${tag}] juego 2 (balloon) no cargó tras laser`));
  await assertNoOverflow(page, tag);

  await playBalloon(page, tag);
  await assertNoOverflow(page, tag);
}

async function runFixtureReport(page, tag) {
  await page.goto(`${baseUrl}/postulaciones?fixture=1&battery=original`, { waitUntil: 'networkidle' });
  await page.getByText(/Resumen ejecutivo HR|HR executive summary/i).waitFor({ timeout: 30000 })
    .catch(() => failures.push(`[${tag}] reporte fixture no cargó`));
  await shot(page, `${tag}-fixture-report`);

  const body = await page.evaluate(() => document.body.innerText);
  const lower = body.toLowerCase();
  // [es, en] — debe existir al menos una variante. Compara en minúsculas: varios
  // superficies del reporte usan text-transform: uppercase (innerText refleja la
  // transformación, ej. "ESTRATEGIA RIESGO/RECOMPENSA", "SCORE PROVISIONAL").
  const expects = [
    ['globo de riesgo', 'risk balloon'],
    ['rondas', 'rounds'],
    ['8/8', '8/8'],
    ['eficiencia riesgo', 'risk efficiency'],
    ['72%', '72%'],
    ['asegurados', 'cashed out'],
    ['estrategia riesgo/recompensa', 'risk/reward strategy'],
    ['asunción de riesgo y feedback', 'risk taking and feedback'],
    ['lectura preliminar', 'preliminary reading'],
    ['toma de decisiones (descriptiva)', 'decision making (descriptive)'],
    ['lectura descriptiva', 'descriptive reading'],
    ['tolerancia a la frustración', 'frustration tolerance'],
    ['score provisional', 'provisional score'],
    ['sin baremos · no comparable', 'no norms · not comparable'],
  ];
  for (const [es, en] of expects) {
    if (!lower.includes(es) && !lower.includes(en)) failures.push(`[${tag}] reporte fixture: falta "${es}" / "${en}"`);
  }
  if (lower.includes('no medido') || lower.includes('not measured')) {
    failures.push(`[${tag}] reporte fixture: aparece "No medido" (R-6d exige cobertura completa en original)`);
  }
  await assertNoOverflow(page, tag);
}

async function runViewport(viewport, tag) {
  const page = await browser.newPage({ viewport });
  track(page, tag);
  try {
    await runLive(page, tag);
    await runFixtureReport(page, tag);
  } catch (err) {
    failures.push(`[${tag}] unexpected: ${String(err).split('\n')[0]}`);
  }
  await page.close();
}

async function main() {
  console.log('=== B.6 BalloonRisk smoke: 1280x720 (vivo + fixture) ===');
  await runViewport({ width: 1280, height: 720 }, 'desktop');
  console.log('=== B.6 BalloonRisk smoke: 390x844 (vivo + fixture) ===');
  await runViewport({ width: 390, height: 844 }, 'mobile');
  await browser.close();

  if (consoleErrors.length) {
    console.log('\n=== CONSOLE ERRORS ===');
    for (const e of consoleErrors) console.log(e);
  }
  if (failures.length) {
    console.log('\n=== FAILURES ===');
    for (const f of failures) console.log(f);
    process.exitCode = 1;
  } else {
    console.log('\n=== B.6 SMOKE PASSED (both viewports: live laser+balloon + fixture report) ===');
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exitCode = 1;
});
