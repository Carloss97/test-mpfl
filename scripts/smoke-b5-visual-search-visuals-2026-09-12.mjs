// FASE B.5 — evidencia visual complementaria: estímulos de 16/20 tiles (antes
// del click) en ambos viewports + card "Búsqueda visual" del reporte en vivo
// (scroll hasta la card). Reutiliza el flujo pass-through de la batería.

import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:5173';
const shotsDir = process.env.SHOTS_DIR ?? 'docs/qa/prelaunch-b5-visual-search';
mkdirSync(shotsDir, { recursive: true });
const failures = [];
const consoleErrors = [];
const screenshots = [];

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
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(`[${tag}] ${msg.text()}`); });
  page.on('pageerror', (err) => consoleErrors.push(`[${tag}] pageerror ${err.message}`));
  page.on('requestfailed', (req) => consoleErrors.push(`[${tag}] requestfailed ${req.url()}`));
}
async function shot(page, name) {
  const path = `${shotsDir}/${name}.png`;
  await page.screenshot({ path });
  screenshots.push(path);
}
async function enterStage(page, tag) {
  await page.goto(`${baseUrl}/postulaciones?invite=tok-dev-dev1234`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: /Preparación de la sesión/i }).waitFor({ timeout: 30000 })
    .catch(() => failures.push(`[${tag}] setup no cargó`));
  await page.getByTestId('postulation-explicit-consent').check();
  await page.getByRole('button', { name: /Continuar a juegos/i }).click();
  await page.getByText(/Juego 1 de 4/).waitFor({ timeout: 30000 })
    .catch(() => failures.push(`[${tag}] stage no cargó`));
  return true;
}
async function targetCenter(page, testid) {
  return await page.evaluate((id) => {
    const area = document.querySelector(`[data-testid="precision-task-area"]`);
    const target = document.querySelector(`[data-testid="${id}"]`);
    if (!area || !target) return null;
    const rect = area.getBoundingClientRect();
    return { x: rect.left + Number(target.dataset.x), y: rect.top + Number(target.dataset.y) };
  }, testid);
}
async function playPrecision({ tag, page, touch }) {
  let padX = 300; let padY = 200;
  for (let i = 0; i < 4; i += 1) {
    try {
      const pad = await page.getByTestId('precision-start-pad').boundingBox();
      padX = pad.x + pad.width / 2; padY = pad.y + pad.height / 2;
      if (touch) await page.touchscreen.tap(padX, padY); else await page.mouse.click(padX, padY);
      await page.getByTestId('precision-target').waitFor({ state: 'visible', timeout: 10000 });
      const center = await targetCenter(page, 'precision-target');
      if (!center) throw new Error('center no calculable');
      if (touch) await page.touchscreen.tap(center.x, center.y);
      else { await page.mouse.move(padX + 40, center.y, { steps: 3 }); await page.mouse.move((padX + center.x) / 2, (padY + center.y) / 2, { steps: 3 }); await page.mouse.click(center.x, center.y); }
      if (i === 3) { await page.getByText(/Juego 2 de 4/).waitFor({ timeout: 15000 }); break; }
      await page.waitForTimeout(700);
    } catch (err) { failures.push(`[${tag}] precisión ${i + 1}: ${String(err).split('\n')[0]}`); return false; }
  }
  return true;
}
async function playGoNoGo({ tag, page, touch }) {
  const button = page.getByRole('button', { name: /Responder ahora|Respond now/i });
  for (let i = 1; i <= 8; i += 1) {
    await page.getByText(`Señal ${i} de 8`).waitFor({ timeout: 15000 });
    const cue = (await page.getByTestId('gonogo-cue').innerText()).trim();
    if (cue === 'GO') {
      if (touch) { const b = await button.boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); }
      else await button.click();
    } else if (cue === 'NO-GO') await page.waitForTimeout(980);
    else failures.push(`[${tag}] cue inesperado '${cue}'`);
  }
  await page.getByText(/Juego 3 de 4/).waitFor({ timeout: 20000 });
  return true;
}
async function playStroop({ tag, page, touch }) {
  for (let i = 1; i <= 8; i += 1) {
    await page.getByText(`Pregunta ${i} de 8`).waitFor({ timeout: 15000 });
    const stimulus = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="color-stimulus"]');
      return el ? { word: (el.textContent || '').trim(), ink: getComputedStyle(el).color } : null;
    });
    if (!stimulus) { failures.push(`[${tag}] stroop ${i}: estímulo ausente`); continue; }
    const wordColor = WORD_TO_COLOR[stimulus.word] ?? 'unknown';
    const inkColor = INK_RGB_TO_CLASS[stimulus.ink] ?? 'unknown';
    if (wordColor === 'unknown' || inkColor === 'unknown') { failures.push(`[${tag}] stroop ${i}: no clasificable`); continue; }
    const box = await page.locator(`.color-interference-task__choice-card--${inkColor}`).first().boundingBox();
    if (!box) { failures.push(`[${tag}] stroop ${i}: botón no visible`); continue; }
    if (touch) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    else await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  }
  await page.getByText(/Juego 4 de 4/).waitFor({ timeout: 20000 });
  return true;
}
// VS: panels 1-2 click passthrough; panels 3 (16) y 4 (20) screenshot ANTES del click.
async function captureVisualSearch({ tag, page, touch }) {
  const clickTarget = async () => {
    const box = await page.getByTestId('visual-search-target').boundingBox();
    if (!box) throw new Error('target no visible');
    if (touch) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    else await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  };
  for (let i = 1; i <= 4; i += 1) {
    await page.getByText(`Panel ${i} de 4`).waitFor({ timeout: 20000 });
    if (i === 3) await shot(page, `${tag}-vs16-stimulus`);
    if (i === 4) await shot(page, `${tag}-vs20-stimulus`);
    await clickTarget();
    if (i === 4) {
      await page.locator('[data-demo-phase="report-preview"]').waitFor({ timeout: 30000 });
      await page.waitForTimeout(500);
      // Scroll hasta la card "Búsqueda visual" y capturar.
      const scrolled = await page.evaluate(() => {
        const cards = [...document.querySelectorAll('article.postulation-demo__game-result-card')];
        const vs = cards.find((c) => (c.querySelector('h3')?.textContent || '').includes('Búsqueda visual'));
        if (!vs) return false;
        vs.scrollIntoView({ block: 'center' });
        return true;
      });
      if (!scrolled) failures.push(`[${tag}] card VS no encontrada para scroll`);
      await page.waitForTimeout(300);
      await shot(page, `${tag}-vs-report-card`);
    } else {
      await page.waitForTimeout(500);
    }
  }
  return true;
}

for (const vp of [{ tag: 'desktop', width: 1280, height: 720, touch: false }, { tag: 'mobile', width: 390, height: 844, touch: true }]) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.touch, isMobile: vp.touch });
  const page = await context.newPage();
  track(page, vp.tag);
  if (await enterStage(page, vp.tag)) {
    if (await playPrecision({ tag: vp.tag, page, touch: vp.touch })) {
      if (await playGoNoGo({ tag: vp.tag, page, touch: vp.touch })) {
        if (await playStroop({ tag: vp.tag, page, touch: vp.touch })) {
          await captureVisualSearch({ tag: vp.tag, page, touch: vp.touch });
        }
      }
    }
  }
  await context.close();
}

await browser.close();
const result = { failures, consoleErrors, screenshots, ok: failures.length === 0 && consoleErrors.length === 0 };
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
