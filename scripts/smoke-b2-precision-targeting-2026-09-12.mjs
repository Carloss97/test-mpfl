// FASE B.2 (KRU-116) — smoke pre-lanzamiento PrecisionTargeting (stable_dg).
// 2 viewports (1280×720 mouse + 390×844 touch) en Vite dev local:
//   /postulaciones?invite=tok-dev-dev1234 → setup → consent → stage
//   → precisión (Juego 1 de 4) JUGADA completo (4 trials) → transición a
//     Juego 2 de 4 (go/no-go) → reporte fixture (sin jugar).
// Aserts: 0 console errors / pageerror / requestfailed; 0 overflow
// horizontal por pantalla; start pad ≥44px; feedback strip por trial;
// E2E del fix P1 (kinemáticas touch degeneradas → label neutro
// 'Ruta registrada' en touch; sin 'Ruta registrada' en mouse con
// trayectoria real); transición de batería íntegra.
//
// Salida: JSON { failures, consoleErrors, screenshots }. Exit 1 si hay fallos.

import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:5173';
const shotsDir = process.env.SHOTS_DIR ?? 'docs/qa/prelaunch-b2-precision';
mkdirSync(shotsDir, { recursive: true });

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

async function expectVisible(page, tag, locator, what) {
  const count = await locator.count().catch(() => -1);
  if (count < 1) failures.push(`[${tag}] ${what} ausente: ${count}`);
}

// Centro del target en coordenadas de viewport (dataset en espacio canvas).
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
  await shot(page, `${tag}-precision-ready`);
  return true;
}

async function playPrecision({ tag, context, page, touch }) {
  // Touch targets: start pad debe ser ≥44px (AA).
  const padBox = await page.getByTestId('precision-start-pad').boundingBox();
  if (!padBox || Math.min(padBox.width, padBox.height) < 44) {
    failures.push(`[${tag}] start pad < 44px: ${JSON.stringify(padBox)}`);
  }

  for (let i = 0; i < 4; i += 1) {
    try {
      if (touch) {
        const pad = await page.getByTestId('precision-start-pad').boundingBox();
        await page.touchscreen.tap(pad.x + pad.width / 2, pad.y + pad.height / 2);
      } else {
        await page.getByTestId('precision-start-pad').click({ timeout: 10000 });
      }
      await page.getByTestId('precision-target').waitFor({ state: 'visible', timeout: 10000 });
      const center = await targetCenter(page);
      if (!center) throw new Error('target center no calculable');
      if (touch) {
        // Tap directo: sin pointermove → 2 muestras → kinemáticas degeneradas.
        await page.touchscreen.tap(center.x, center.y);
      } else {
        // Trayectoria real (≥3 segmentos) → kinemáticas medibles.
        await page.mouse.move(padMouseX, center.y, { steps: 2 });
        await page.mouse.move((padMouseX + center.x) / 2, (center.y * 3 + padMouseY) / 4, { steps: 3 });
        await page.mouse.click(center.x, center.y);
      }
      const isLast = i === 3;
      if (isLast) {
        // En batería, el onComplete monta el siguiente juego en el mismo batch
        // que el render 'finished': la feedback strip NUNCA es visible en el
        // trial final (patrón documentado FASE B.1). Esperar la transición.
        await page.getByText(/Juego 2 de 4/).waitFor({ timeout: 15000 })
          .catch(() => failures.push(`[${tag}] transición a Juego 2 de 4 no ocurrió tras trial final`));
        await assertNoOverflow(page, tag);
        await shot(page, `${tag}-transition-gonogo`);
        break;
      }
      const strip = page.getByRole('status', { name: /feedback de precisión/i });
      await strip.waitFor({ state: 'visible', timeout: 5000 });
      const text = (await strip.innerText()) ?? '';
      if (touch) {
        if (!/Ruta registrada/i.test(text)) {
          failures.push(`[${tag}] trial ${i + 1} touch: feedback sin label neutro 'Ruta registrada': ${JSON.stringify(text)}`);
        }
      } else {
        if (/Ruta registrada/i.test(text)) {
          failures.push(`[${tag}] trial ${i + 1} mouse: feedback degenerate 'Ruta registrada' (debería haber trayectoria medible): ${JSON.stringify(text)}`);
        }
      }
      await assertNoOverflow(page, tag);
      if (i === 0) await shot(page, `${tag}-precision-trial-${i + 1}`);
      await page.waitForTimeout(650); // ITI 450ms + margen
    } catch (err) {
      failures.push(`[${tag}] precisión trial ${i + 1}: ${String(err).split('\n')[0]}`);
      return;
    }
  }

  // Verificar que go/no-go efectivamente renderizó tras la transición.
  if (!(await page.evaluate(() => Boolean(document.querySelector('.go-nogo-task'))))) {
    failures.push(`[${tag}] go-nogo-task no renderizado tras precisión`);
  }
}

let padMouseX = 300; // posición del mouse tras el click en el start pad (se recalcula por trial)
let padMouseY = 200;

// --- Contexto 1: desktop 1280×720 (mouse) ---
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  track(page, 'desktop');
  if (await enterStage(page, 'desktop')) {
    const pad = await page.getByTestId('precision-start-pad').boundingBox();
    padMouseX = pad.x + pad.width / 2;
    padMouseY = pad.y + pad.height / 2;
    await playPrecision({ tag: 'desktop', page, touch: false });
  }
  await context.close();
}

// --- Contexto 2: móvil 390×844 (touch) ---
{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  track(page, 'mobile');
  if (await enterStage(page, 'mobile')) {
    await expectVisible(page, 'mobile', page.getByText(/Ruta de precisión adaptativa/), 'route card title');
    await playPrecision({ tag: 'mobile', page, touch: true });
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
    await expectVisible(page, vp.tag, page.getByText(/Precisión/i), 'card precisión en reporte');
    await assertNoOverflow(page, vp.tag);
    await shot(page, `${vp.tag}-report`);
  } finally {
    await context.close();
  }
}

await browser.close();

const result = { failures, consoleErrors, screenshots, ok: failures.length === 0 && consoleErrors.length === 0 };
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
