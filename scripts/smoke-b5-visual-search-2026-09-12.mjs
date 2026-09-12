// FASE B.5 (KRU-116) — smoke pre-lanzamiento VisualSearch (stable_dg).
// 2 viewports (1280×720 mouse + 390×844 touch) en Vite dev local:
//   /postulaciones?invite=tok-dev-dev1234 → setup → consent → stage
//   → precisión (Juego 1 de 4) jugada (4 trials, pass-through) →
//     go/no-go (Juego 2 de 4) jugado (8 trials, pass-through) →
//     stroop (Juego 3 de 4) jugado (8 trials, pass-through) →
//     VISUAL SEARCH (Juego 4 de 4) JUGADO completo (4 panels) →
//     reporte en vivo (card "Búsqueda visual" con Puntaje) +
//     reporte fixture (sin jugar).
// Aserts: 0 console errors / pageerror / requestfailed; 0 overflow horizontal
// por pantalla; tiles SIEMPRE completos dentro del canvas + ≥44 px (VSP-P2-3,
// note (b): sin solapamiento/recorte en canvas 240-312 px); sin scroll interno
// del stage en desktop (fit, patrón B.4 CIP-P2-4); E2E del fix VSP-P1-1:
// timeout real del panel 1 en desktop ("Tiempo agotado" + avance a Panel 2);
// E2E del fix VSP-P2-4: celda objetivo ≠ fórmula legacy (5i+3)%size en al
// menos 1 panel de la corrida combinada (8 panels); card VS en reporte vivo
// con Puntaje (VSP-P2-1); fixture report OK en ambos viewports.
//
// Salida: JSON { failures, consoleErrors, screenshots, visualSearchPanels,
//                legacyMatches, reportCards }.
// Exit 1 si hay fallos.

import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:5173';
const shotsDir = process.env.SHOTS_DIR ?? 'docs/qa/prelaunch-b5-visual-search';
mkdirSync(shotsDir, { recursive: true });

const failures = [];
const consoleErrors = [];
const screenshots = [];
const visualSearchPanels = {};
const reportCards = {};

// Mapa palabra (ES) → color de tinta, y rgb computado → clase de botón (passthrough Stroop).
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

// Fit del stage: sin scroll interno (content <= stage) en desktop (patrón B.4).
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
  return true;
}

async function playStroop({ tag, page, touch }) {
  const TOTAL = 8;

  for (let i = 1; i <= TOTAL; i += 1) {
    try {
      await page.getByText(`Pregunta ${i} de ${TOTAL}`).waitFor({ timeout: 15000 })
        .catch(() => failures.push(`[${tag}] stroop pregunta ${i}/${TOTAL} no apareció`));
      const stimulus = await page.evaluate(() => {
        const el = document.querySelector('[data-testid="color-stimulus"]');
        if (!el) return null;
        return { word: (el.textContent || '').trim(), ink: getComputedStyle(el).color };
      });
      if (!stimulus) {
        failures.push(`[${tag}] stroop pregunta ${i}: estímulo no presente`);
        continue;
      }
      const wordColor = WORD_TO_COLOR[stimulus.word] ?? 'unknown';
      const inkColor = INK_RGB_TO_CLASS[stimulus.ink] ?? 'unknown';
      if (wordColor === 'unknown' || inkColor === 'unknown') {
        failures.push(`[${tag}] stroop pregunta ${i}: estímulo no clasificable: ${JSON.stringify(stimulus)}`);
      }
      const card = page.locator(`.color-interference-task__choice-card--${inkColor}`).first();
      const box = await card.boundingBox();
      if (!box) {
        failures.push(`[${tag}] stroop pregunta ${i}: botón de tinta '${inkColor}' no visible`);
        continue;
      }
      if (touch) {
        await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
      } else {
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      }
    } catch (err) {
      failures.push(`[${tag}] stroop pregunta ${i}: ${String(err).split('\n')[0]}`);
      return false;
    }
  }

  // Tras el trial final, visual search monta en el mismo batch — esperar la
  // SUPERFICIE SIGUIENTE, no la pantalla "finished" (pitfall B.1/B.2/B.3).
  await page.getByText(/Juego 4 de 4/).waitFor({ timeout: 20000 })
    .catch(() => failures.push(`[${tag}] transición a Juego 4 de 4 (visual search) no ocurrió tras stroop`));
  await assertNoOverflow(page, tag);
  await shot(page, `${tag}-transition-visual-search`);
  return true;
}

// --- JUEGO BAJO AUDITORÍA: VisualSearch (4 panels, rampa 8→12→16→20) ---
async function playVisualSearch({ tag, page, touch, expectTimeout }) {
  const TOTAL = 4;
  const SIZES = [8, 12, 16, 20];
  const panels = [];

  for (let i = 1; i <= TOTAL; i += 1) {
    try {
      await page.getByText(`Panel ${i} de ${TOTAL}`).waitFor({ timeout: 20000 })
        .catch(() => { failures.push(`[${tag}] VS panel ${i}/${TOTAL} no apareció`); return false; });

      // Fit del stage (desktop) + tiles dentro del canvas + ≥44px (VSP-P2-3).
      if (!touch) await assertStageFits(page, tag, `VS panel ${i} (estímulo)`);
      const fit = await page.evaluate(() => {
        const area = document.querySelector('[data-testid="visual-search-area"]');
        if (!area) return null;
        const aRect = area.getBoundingClientRect();
        const tiles = [...area.querySelectorAll('.visual-search-task__item')];
        const outside = [];
        let minSide = Infinity;
        for (const tile of tiles) {
          const r = tile.getBoundingClientRect();
          minSide = Math.min(minSide, r.width, r.height);
          if (r.left < aRect.left - 2 || r.right > aRect.right + 2
            || r.top < aRect.top - 2 || r.bottom > aRect.bottom + 2) {
            outside.push({
              dLeft: Math.round(r.left - aRect.left),
              dRight: Math.round(r.right - aRect.right),
              dTop: Math.round(r.top - aRect.top),
              dBottom: Math.round(r.bottom - aRect.bottom),
            });
          }
        }
        const target = document.querySelector('[data-testid="visual-search-target"]');
        let targetIndex = null;
        if (target) {
          const style = area.getAttribute('style') || '';
          const width = Number.parseFloat(style.match(/width:\s*([\d.]+)px/)?.[1] ?? aRect.width);
          const height = Number.parseFloat(style.match(/height:\s*([\d.]+)px/)?.[1] ?? aRect.height);
          const setSize = tiles.length;
          const cols = Math.ceil(Math.sqrt(setSize * (width / Math.max(1, height))));
          const rows = Math.ceil(setSize / cols);
          const col = Math.round(Number(target.dataset.x) / (width / cols) - 0.5);
          const row = Math.round(Number(target.dataset.y) / (height / rows) - 0.5);
          targetIndex = row * cols + col;
        }
        return { outside, minSide, setSize: tiles.length, targetIndex, areaW: aRect.width, areaH: aRect.height };
      });
      if (!fit) {
        failures.push(`[${tag}] VS panel ${i}: canvas [data-testid=visual-search-area] no presente`);
        continue;
      }
      if (fit.setSize !== SIZES[i - 1]) {
        failures.push(`[${tag}] VS panel ${i}: setSize ${fit.setSize} ≠ rampa esperada ${SIZES[i - 1]}`);
      }
      if (fit.outside.length > 0) {
        failures.push(`[${tag}] VS panel ${i}: ${fit.outside.length} tile(s) FUERA del canvas ${JSON.stringify(fit.outside[0])} (canvas ${Math.round(fit.areaW)}×${Math.round(fit.areaH)})`);
      }
      if (fit.minSide < 44) {
        failures.push(`[${tag}] VS panel ${i}: tile <44 px AA (minSide=${Math.round(fit.minSide)}px)`);
      }
      panels.push({ panel: i, setSize: fit.setSize, targetIndex: fit.targetIndex, areaW: Math.round(fit.areaW), areaH: Math.round(fit.areaH) });
      if (i === 1) await shot(page, `${tag}-vs-panel-1`);

      if (i === 1 && expectTimeout) {
        // E2E VSP-P1-1: sin click → timeout real (10 s) → feedback + avance.
        await page.getByText(/Tiempo agotado/i).waitFor({ timeout: 15000 })
          .catch(() => failures.push(`[${tag}] VS panel 1: timeout no mostró feedback "Tiempo agotado"`));
        if (!touch) await assertStageFits(page, tag, `VS panel 1 (feedback timeout)`);
        await shot(page, `${tag}-vs-timeout`);
        await page.getByText(`Panel ${i + 1} de ${TOTAL}`).waitFor({ timeout: 10000 })
          .catch(() => failures.push(`[${tag}] VS panel 1: no avanzó a panel 2 tras el timeout`));
        continue;
      }

      const target = page.getByTestId('visual-search-target');
      const box = await target.boundingBox();
      if (!box) {
        failures.push(`[${tag}] VS panel ${i}: target no visible`);
        continue;
      }
      if (touch) {
        await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
      } else {
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      }
      // Feedback entre trials (~262-437 ms ITI): screenshot inmediato.
      await shot(page, `${tag}-vs-panel-${i}`);
      if (!touch) await assertStageFits(page, tag, `VS panel ${i} (feedback)`);
      if (i === TOTAL) {
        // Último juego de la batería → reporte en vivo (superficie siguiente).
        await page.locator('[data-demo-phase="report-preview"]').waitFor({ timeout: 30000 })
          .catch(() => failures.push(`[${tag}] reporte en vivo no cargó tras el panel final de VS`));
        await assertNoOverflow(page, tag);
        const card = await page.evaluate(() => {
          const cards = [...document.querySelectorAll('article.postulation-demo__game-result-card')];
          const vs = cards.find((c) => (c.querySelector('h3')?.textContent || '').includes('Búsqueda visual'));
          if (!vs) return { found: false };
          const metrics = [...vs.querySelectorAll('dl div')].map((row) => ({
            label: row.querySelector('dt')?.textContent ?? '',
            value: row.querySelector('dd')?.textContent ?? '',
          }));
          return { found: true, metrics };
        });
        reportCards[tag] = card;
        if (!card.found) failures.push(`[${tag}] card 'Búsqueda visual' ausente en reporte en vivo`);
        else {
          const puntaje = card.metrics.find((m) => m.label === 'Puntaje' || m.label === 'Score');
          if (!puntaje) failures.push(`[${tag}] card VS sin métrica Puntaje (contrato VSP-P2-1): ${JSON.stringify(card.metrics)}`);
          else if (!puntaje.value || puntaje.value === '—') failures.push(`[${tag}] card VS Puntaje ausente/— (VSP-P2-1): ${JSON.stringify(card.metrics)}`);
        }
        await shot(page, `${tag}-vs-report`);
      }
    } catch (err) {
      failures.push(`[${tag}] VS panel ${i}: ${String(err).split('\n')[0]}`);
      visualSearchPanels[tag] = panels;
      return false;
    }
  }

  visualSearchPanels[tag] = panels;
  return true;
}

// E2E VSP-P2-4: celda objetivo ≠ fórmula legacy (5i+3)%size. P(los 8 panels
// de ambas corridas coincidan con la legacy) ≈ 1e-11 → assert combinado.
function assertNotLegacySequence() {
  let matched = 0;
  let total = 0;
  for (const [tag, panels] of Object.entries(visualSearchPanels)) {
    panels.forEach((panel, index) => {
      if (panel.targetIndex === null) return;
      total += 1;
      const legacy = (5 * index + 3) % panel.setSize;
      if (panel.targetIndex === legacy) matched += 1;
    });
  }
  if (total < 8) failures.push(`[legacy] panels observados insuficientes (${total}/8) — no se pudo verificar VSP-P2-4 en vivo`);
  else if (matched === total) failures.push(`[legacy] VSP-P2-4: TODOS los panels coinciden con la fórmula legacy (5i+3)%size — aleatorización no efectiva`);
  return { matched, total };
}

// --- Contexto 1: desktop 1280×720 (mouse) — incluye E2E del timeout ---
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  track(page, 'desktop');
  if (await enterStage(page, 'desktop')) {
    if (await playPrecision({ tag: 'desktop', page, touch: false })) {
      if (await playGoNoGo({ tag: 'desktop', page, touch: false })) {
        if (await playStroop({ tag: 'desktop', page, touch: false })) {
          await playVisualSearch({ tag: 'desktop', page, touch: false, expectTimeout: true });
        }
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
        if (await playStroop({ tag: 'mobile', page, touch: true })) {
          await playVisualSearch({ tag: 'mobile', page, touch: true, expectTimeout: false });
        }
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
    const card = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('article.postulation-demo__game-result-card')];
      const vs = cards.find((c) => (c.querySelector('h3')?.textContent || '').includes('Búsqueda visual'));
      if (!vs) return { found: false };
      const metrics = [...vs.querySelectorAll('dl div')].map((row) => ({
        label: row.querySelector('dt')?.textContent ?? '',
        value: row.querySelector('dd')?.textContent ?? '',
      }));
      return { found: true, metrics };
    });
    reportCards[vp.tag] = card;
    if (!card.found) failures.push(`[${vp.tag}] card 'Búsqueda visual' ausente en reporte fixture`);
    await assertNoOverflow(page, vp.tag);
    await shot(page, `${vp.tag}-report`);
  } finally {
    await context.close();
  }
}

await browser.close();

const legacy = assertNotLegacySequence();

const result = {
  failures,
  consoleErrors,
  screenshots,
  visualSearchPanels,
  legacyMatches: legacy,
  reportCards,
  ok: failures.length === 0 && consoleErrors.length === 0,
};
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
