// FASE B.4 (KRU-116) — smoke pre-lanzamiento ColorInterference/Stroop (stable_dg).
// 2 viewports (1280×720 mouse + 390×844 touch) en Vite dev local:
//   /postulaciones?invite=tok-dev-dev1234 → setup → consent → stage
//   → precisión (Juego 1 de 4) jugada (4 trials, pass-through) →
//     go/no-go (Juego 2 de 4) jugado (8 trials, pass-through) →
//     STROOP (Juego 3 de 4) JUGADO completo (8 trials) →
//     transición a Juego 4 de 4 (visual search) → reporte fixture (sin jugar).
// Aserts: 0 console errors / pageerror / requestfailed; 0 overflow horizontal
// por pantalla; sin scroll interno del stage (fit CIP-P2-4); botones de tinta
// ≥44px; sin anuncio de condición en vivo ("Tipo:"/"Type:" ausente — fix
// CIP-P1-1); E2E del fix CIP-P1-1: condiciones observadas en vivo cumplen
// trial 1 congruente + piso ≥2 por condición + secuencia no-legacy (no
// alternancia C/I estricta); AMARILLO (long-word) cabe en 1 línea (vision);
// fixture report OK en ambos viewports (card "Interferencia cognitiva").
//
// Salida: JSON { failures, consoleErrors, screenshots, stroopSequences }.
// Exit 1 si hay fallos.

import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:5173';
const shotsDir = process.env.SHOTS_DIR ?? 'docs/qa/prelaunch-b4-color-interference';
mkdirSync(shotsDir, { recursive: true });

const failures = [];
const consoleErrors = [];
const screenshots = [];
const stroopSequences = {};

// Mapa palabra (ES) → color de tinta, y rgb computado → clase de botón.
const WORD_TO_COLOR = { ROJO: 'red', AZUL: 'blue', VERDE: 'green', AMARILLO: 'yellow', XXXXX: 'neutral' };
const INK_RGB_TO_CLASS = {
  'rgb(220, 38, 38)': 'red',
  'rgb(37, 99, 235)': 'blue',
  'rgb(5, 150, 105)': 'green',
  'rgb(180, 83, 9)': 'yellow',
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
  page.on('pageerror', (err) => consoleErrors.push(`[${tag}] pageerror ${err.message}`));
  page.on('requestfailed', (req) => consoleErrors.push(`[${tag}] requestfailed ${req.url()} ${req.failure()?.errorText ?? ''}`));
}

async function shot(page, name) {
  const path = `${shotsDir}/${name}.png`;
  await page.screenshot({ path });
  screenshots.push(path);
}

async function assertNoOverflow(page, tag) {
  const overflow = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    innerW: window.innerWidth,
  }));
  if (overflow.scrollW > overflow.innerW + 1) {
    failures.push(`[${tag}] overflow horizontal: scrollWidth=${overflow.scrollW} > innerWidth=${overflow.innerW}`);
  }
}

// Fit del stage: sin scroll interno (content <= stage). CIP-P2-4.
async function assertStageFits(page, tag, when) {
  const fit = await page.evaluate(() => {
    const stage = document.querySelector('.postulation-demo__game-stage');
    if (!stage) return null;
    return { scrollH: stage.scrollHeight, clientH: stage.clientHeight };
  });
  if (fit && fit.scrollH > fit.clientH + 1) {
    failures.push(`[${tag}] stage con scroll interno (${when}): scrollHeight=${fit.scrollH} > clientHeight=${fit.clientH}`);
  }
  return fit;
}

async function enterStage(page, tag) {
  await page.goto(`${baseUrl}/postulaciones?invite=tok-dev-dev1234`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: /Preparación de la sesión/i }).waitFor({ timeout: 30000 })
    .catch(() => failures.push(`[${tag}] setup no cargó`));
  await page.getByTestId('postulation-explicit-consent').check();
  await page.getByRole('button', { name: /Continuar a juegos/i }).click();
  await page.getByText(/Juego 1 de 4/).waitFor({ timeout: 30000 })
    .catch(() => failures.push(`[${tag}] stage (Juego 1 de 4) no cargó`));
  if (!(await page.evaluate(() => Boolean(document.querySelector('.precision-targeting-task'))))) {
    failures.push(`[${tag}] .precision-targeting-task no renderizado en stage`);
    return false;
  }
  await assertNoOverflow(page, tag);
  return true;
}

async function targetCenter(page) {
  return await page.evaluate(() => {
    const area = document.querySelector('[data-testid="precision-task-area"]');
    const target = document.querySelector('[data-testid="precision-target"]');
    if (!area || !target) return null;
    const rect = area.getBoundingClientRect();
    return { x: rect.left + Number(target.dataset.x), y: rect.top + Number(target.dataset.y) };
  });
}

async function playPrecision({ tag, page, touch }) {
  let padX = 300;
  let padY = 200;
  for (let i = 0; i < 4; i += 1) {
    try {
      const pad = await page.getByTestId('precision-start-pad').boundingBox();
      padX = pad.x + pad.width / 2;
      padY = pad.y + pad.height / 2;
      if (touch) {
        await page.touchscreen.tap(padX, padY);
      } else {
        await page.mouse.click(padX, padY);
      }
      await page.getByTestId('precision-target').waitFor({ state: 'visible', timeout: 10000 });
      const center = await targetCenter(page);
      if (!center) throw new Error('target center no calculable');
      if (touch) {
        await page.touchscreen.tap(center.x, center.y);
      } else {
        await page.mouse.move(padX + 40, center.y, { steps: 3 });
        await page.mouse.move((padX + center.x) / 2, (padY + center.y) / 2, { steps: 3 });
        await page.mouse.click(center.x, center.y);
      }
      if (i === 3) {
        await page.getByText(/Juego 2 de 4/).waitFor({ timeout: 15000 })
          .catch(() => failures.push(`[${tag}] transición a Juego 2 de 4 (go/no-go) no ocurrió tras trial final de precisión`));
        break;
      }
      await page.waitForTimeout(700); // ITI 450ms + margen
    } catch (err) {
      failures.push(`[${tag}] precisión trial ${i + 1}: ${String(err).split('\n')[0]}`);
      return false;
    }
  }
  const rendered = await page.evaluate(() => Boolean(document.querySelector('.go-nogo-task')));
  if (!rendered) failures.push(`[${tag}] .go-nogo-task no renderizado tras precisión`);
  return rendered;
}

async function playGoNoGo({ tag, page, touch }) {
  const TOTAL = 8;
  const button = page.getByRole('button', { name: /Responder ahora|Respond now/i });

  for (let i = 1; i <= TOTAL; i += 1) {
    try {
      await page.getByText(`Señal ${i} de ${TOTAL}`).waitFor({ timeout: 15000 })
        .catch(() => failures.push(`[${tag}] go/nogo señal ${i}/${TOTAL} no apareció`));
      const cue = (await page.getByTestId('gonogo-cue').innerText()).trim();
      if (cue === 'GO') {
        if (touch) {
          const b = await button.boundingBox();
          await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
        } else {
          await button.click();
        }
      } else if (cue === 'NO-GO') {
        await page.waitForTimeout(980); // withhold por timeout (SO 900 ms)
      } else {
        failures.push(`[${tag}] go/nogo señal ${i}: cue inesperado '${cue}'`);
      }
    } catch (err) {
      failures.push(`[${tag}] go/nogo señal ${i}: ${String(err).split('\n')[0]}`);
      return false;
    }
  }

  await page.getByText(/Juego 3 de 4/).waitFor({ timeout: 20000 })
    .catch(() => failures.push(`[${tag}] transición a Juego 3 de 4 (stroop) no ocurrió tras go/no-go`));
  await assertNoOverflow(page, tag);
  await shot(page, `${tag}-transition-stroop`);
  return true;
}

async function playStroop({ tag, page, touch }) {
  const TOTAL = 8;
  const observed = []; // { word, ink, condition }

  for (let i = 1; i <= TOTAL; i += 1) {
    try {
      await page.getByText(`Pregunta ${i} de ${TOTAL}`).waitFor({ timeout: 15000 })
        .catch(() => failures.push(`[${tag}] stroop pregunta ${i}/${TOTAL} no apareció`));

      // Sin anuncio de condición en la UI (fix CIP-P1-1, regresión E2E).
      const announced = await page.evaluate(() =>
        Boolean([...document.querySelectorAll('.color-interference-task .task-header *')].some((el) => /tipo\s*:|type\s*:/i.test(el.textContent || ''))));
      if (announced) failures.push(`[${tag}] stroop pregunta ${i}: condición anunciada en el header (fix CIP-P1-1 roto)`);

      const stimulus = await page.evaluate(() => {
        const el = document.querySelector('[data-testid="color-stimulus"]');
        if (!el) return null;
        const ink = getComputedStyle(el).color;
        const rect = el.getBoundingClientRect();
        return { word: (el.textContent || '').trim(), ink, h: rect.height, w: rect.width };
      });
      if (!stimulus) {
        failures.push(`[${tag}] stroop pregunta ${i}: estímulo no presente`);
        continue;
      }

      const wordColor = WORD_TO_COLOR[stimulus.word] ?? 'unknown';
      const inkColor = INK_RGB_TO_CLASS[stimulus.ink] ?? 'unknown';
      const condition = wordColor === 'neutral' ? 'neutral' : (wordColor === inkColor ? 'congruent' : 'incongruent');
      observed.push({ word: stimulus.word, ink: inkColor, condition });

      if (i === 1) await shot(page, `${tag}-stroop-q1`);
      if (stimulus.word === 'AMARILLO') {
        // long-word: debe caber en 1 línea (sin wrap) dentro de su card.
        // h incluye padding 10px×2 + border 1.5px×2 = 23px de chrome; la
        // línea de texto a 2.5rem × line-height 1.15 ≈ 46px.
        const contentH = stimulus.h - 23;
        const lines = Math.max(1, Math.round(contentH / 46));
        if (lines > 1) failures.push(`[${tag}] AMARILLO en 1 línea falló: estímulo con ~${lines} líneas (h=${Math.round(stimulus.h)}px, w=${Math.round(stimulus.w)}px)`);
        await shot(page, `${tag}-stroop-amarillo`);
      }

      // Fit del stage durante el estímulo (sin feedback).
      await assertStageFits(page, tag, `estímulo pregunta ${i}`);

      // Responder con la tinta correcta (mapeo rgb → clase de botón).
      const card = page.locator(`.color-interference-task__choice-card--${inkColor}`).first();
      const box = await card.boundingBox();
      if (!box) {
        failures.push(`[${tag}] stroop pregunta ${i}: botón de tinta '${inkColor}' no visible`);
        continue;
      }
      if (Math.min(box.width, box.height) < 44) {
        failures.push(`[${tag}] stroop pregunta ${i}: botón de tinta < 44px: ${JSON.stringify(box)}`);
      }
      if (touch) {
        await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
      } else {
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      }
      // Fit del stage durante el flash de feedback (ventana ~190-315 ms):
      // medir lo antes posible tras el click.
      await assertStageFits(page, tag, `feedback pregunta ${i}`);
    } catch (err) {
      failures.push(`[${tag}] stroop pregunta ${i}: ${String(err).split('\n')[0]}`);
      stroopSequences[tag] = observed;
      return false;
    }
  }

  // E2E del fix CIP-P1-1: propiedades de la secuencia observada en vivo.
  const counts = { congruent: 0, incongruent: 0, neutral: 0 };
  for (const entry of observed) counts[entry.condition] = (counts[entry.condition] ?? 0) + 1;
  stroopSequences[tag] = observed.map((entry) => entry.condition);
  if (observed[0]?.condition !== 'congruent') {
    failures.push(`[${tag}] CIP-P1-1: pregunta 1 no congruente (debe enseñar el mapeo): ${JSON.stringify(observed)}`);
  }
  if (counts.congruent < 2 || counts.incongruent < 2 || counts.neutral < 2) {
    failures.push(`[${tag}] CIP-P1-1: piso por condición no cumplido en vivo (≥2 c/u en 8): ${JSON.stringify(counts)}`);
  }
  const legacyAlternating = observed.every((entry, idx) => (idx % 2 === 0 ? entry.condition === 'congruent' : entry.condition === 'incongruent'));
  if (legacyAlternating) {
    failures.push(`[${tag}] CIP-P1-1: secuencia legacy C/I/C/I… (telegrafiada): ${JSON.stringify(stroopSequences[tag])}`);
  }
  if (observed.some((entry) => entry.condition === 'unknown')) {
    failures.push(`[${tag}] CIP-P1-1: estímulo no clasificable (palabra/tinta inesperada): ${JSON.stringify(observed)}`);
  }

  // Tras el trial final, el siguiente juego (visual search) monta en el mismo
  // batch — esperar la SUPERFICIE SIGUIENTE, no la pantalla "finished"
  // (pitfall B.1/B.2/B.3 de la skill).
  await page.getByText(/Juego 4 de 4/).waitFor({ timeout: 20000 })
    .catch(() => failures.push(`[${tag}] transición a Juego 4 de 4 no ocurrió tras los 8 trials de stroop`));
  await assertNoOverflow(page, tag);
  await shot(page, `${tag}-transition-visual-search`);
  return true;
}

// --- Contexto 1: desktop 1280×720 (mouse) ---
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  track(page, 'desktop');
  if (await enterStage(page, 'desktop')) {
    if (await playPrecision({ tag: 'desktop', page, touch: false })) {
      if (await playGoNoGo({ tag: 'desktop', page, touch: false })) {
        await playStroop({ tag: 'desktop', page, touch: false });
      }
    }
  }
  await context.close();
}

// --- Contexto 2: móvil 390×844 (touch) ---
{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  track(page, 'mobile');
  if (await enterStage(page, 'mobile')) {
    if (await playPrecision({ tag: 'mobile', page, touch: true })) {
      if (await playGoNoGo({ tag: 'mobile', page, touch: true })) {
        await playStroop({ tag: 'mobile', page, touch: true });
      }
    }
  }
  await context.close();
}

// --- Contexto 3: reporte fixture (sin jugar) en ambos viewports ---
for (const vp of [{ tag: 'fixture-desktop', width: 1280, height: 720 }, { tag: 'fixture-mobile', width: 390, height: 844, touch: true }]) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: Boolean(vp.touch), isMobile: Boolean(vp.touch) });
  const page = await context.newPage();
  track(page, vp.tag);
  try {
    await page.goto(`${baseUrl}/postulaciones?invite=tok-dev-dev1234&fixture=1`, { waitUntil: 'networkidle' });
    await page.locator('.postulation-demo__report-screen').waitFor({ timeout: 30000 })
      .catch(() => failures.push(`[${vp.tag}] report screen no cargó`));
    const card = await page.getByText(/Interferencia cognitiva/i).count().catch(() => -1);
    if (card < 1) failures.push(`[${vp.tag}] card 'Interferencia cognitiva' ausente en reporte fixture: ${card}`);
    await assertNoOverflow(page, vp.tag);
    await shot(page, `${vp.tag}-report`);
  } finally {
    await context.close();
  }
}

await browser.close();

const result = {
  failures,
  consoleErrors,
  screenshots,
  stroopSequences,
  ok: failures.length === 0 && consoleErrors.length === 0,
};
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
