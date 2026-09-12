// FASE B.3 (KRU-116) — smoke pre-lanzamiento GoNoGo (stable_dg).
// 2 viewports (1280×720 mouse + 390×844 touch) en Vite dev local:
//   /postulaciones?invite=tok-dev-dev1234 → setup → consent → stage
//   → precisión (Juego 1 de 4) jugada (4 trials, pass-through) →
//     go/no-go (Juego 2 de 4) JUGADO completo (8 trials) →
//     transición a Juego 3 de 4 (stroop) → reporte fixture (sin jugar).
// Aserts: 0 console errors / pageerror / requestfailed; 0 overflow
// horizontal por pantalla; botón responder ≥44px; práctica
// completatable en flujo real; E2E del fix GNP-P1-1 (secuencia de cues
// aleatorizada: trial 1 GO, 2 ≤ no-go ≤ 4 en 8 trials, sin alternación
// determinista GO/NO-GO/GO/NO-GO); fixture report OK en ambos viewports.
//
// Salida: JSON { failures, consoleErrors, screenshots, cueSequences }.
// Exit 1 si hay fallos.

import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:5173';
const shotsDir = process.env.SHOTS_DIR ?? 'docs/qa/prelaunch-b3-go-nogo';
mkdirSync(shotsDir, { recursive: true });

const failures = [];
const consoleErrors = [];
const screenshots = [];
const cueSequences = {};

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

async function targetCenter(page) {
  return await page.evaluate(() => {
    const area = document.querySelector('[data-testid="precision-task-area"]');
    const target = document.querySelector('[data-testid="precision-target"]');
    if (!area || !target) return null;
    const rect = area.getBoundingClientRect();
    return { x: rect.left + Number(target.dataset.x), y: rect.top + Number(target.dataset.y) };
  });
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
  const cues = [];
  const button = page.getByRole('button', { name: /Responder ahora|Respond now/i });

  const box = await button.boundingBox();
  if (!box || Math.min(box.width, box.height) < 44) {
    failures.push(`[${tag}] botón 'Responder ahora' < 44px: ${JSON.stringify(box)}`);
  }

  for (let i = 1; i <= TOTAL; i += 1) {
    try {
      await page.getByText(`Señal ${i} de ${TOTAL}`).waitFor({ timeout: 15000 })
        .catch(() => failures.push(`[${tag}] go/nogo señal ${i}/${TOTAL} no apareció`));
      const cue = (await page.getByTestId('gonogo-cue').innerText()).trim();
      cues.push(cue);
      if (i === 1) await shot(page, `${tag}-gonogo-signal-1`);
      if (cue === 'GO') {
        if (touch) {
          const b = await button.boundingBox();
          await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
        } else {
          await button.click();
        }
        if (i === 1) {
          await shot(page, `${tag}-gonogo-go`);
        }
      } else if (cue === 'NO-GO') {
        // Withhold por timeout (900 ms) — no se pulsa en NO-GO.
        await shot(page, `${tag}-gonogo-nogo-${i}`);
        await page.waitForTimeout(980);
      } else {
        failures.push(`[${tag}] go/nogo señal ${i}: cue inesperado '${cue}'`);
      }
    } catch (err) {
      failures.push(`[${tag}] go/nogo señal ${i}: ${String(err).split('\n')[0]}`);
      cueSequences[tag] = cues;
      return false;
    }
  }

  // E2E del fix GNP-P1-1: propiedades de la secuencia observada en vivo.
  const noGoCount = cues.filter((c) => c === 'NO-GO').length;
  const isAlternating = cues.every((c, idx) => (idx % 2 === 0 ? c === 'GO' : c === 'NO-GO'));
  cueSequences[tag] = cues;
  if (cues[0] !== 'GO') failures.push(`[${tag}] GNP-P1-1: primera señal no es GO (debía enseñar el mapeo): ${JSON.stringify(cues)}`);
  if (noGoCount < 2 || noGoCount > 4) failures.push(`[${tag}] GNP-P1-1: no-go fuera de rango 2-4: ${noGoCount} (${JSON.stringify(cues)})`);
  if (isAlternating) failures.push(`[${tag}] GNP-P1-1: secuencia determinista GO/NO-GO/... (telegrafiada): ${JSON.stringify(cues)}`);

  // Tras el trial final, el siguiente juego (stroop) monta en el mismo batch.
  await page.getByText(/Juego 3 de 4/).waitFor({ timeout: 20000 })
    .catch(() => failures.push(`[${tag}] transición a Juego 3 de 4 no ocurrió tras los 8 trials de go/no-go`));
  await assertNoOverflow(page, tag);
  await shot(page, `${tag}-transition-stroop`);
  return true;
}

// --- Contexto 1: desktop 1280×720 (mouse) ---
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  track(page, 'desktop');
  if (await enterStage(page, 'desktop')) {
    if (await playPrecision({ tag: 'desktop', page, touch: false })) {
      await playGoNoGo({ tag: 'desktop', page, touch: false });
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
      await playGoNoGo({ tag: 'mobile', page, touch: true });
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
    const card = await page.getByText(/Control inhibitorio/i).count().catch(() => -1);
    if (card < 1) failures.push(`[${vp.tag}] card 'Control inhibitorio' ausente en reporte fixture: ${card}`);
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
  cueSequences,
  ok: failures.length === 0 && consoleErrors.length === 0,
};
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
