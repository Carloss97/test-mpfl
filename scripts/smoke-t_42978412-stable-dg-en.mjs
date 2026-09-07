// t_42978412 smoke browser (2026-09-07): walkthrough VIVO EN + ES de la batería
// default stable_dg en Vite dev local (1280x720). Hallazgo 3 del audit H3:
// con EN activo el chrome del stage se traducía pero el contenido de los 4
// juegos de stable_dg quedaba en español (labels/descriptions de bloques en
// postulationDemoConfig.js + copy in-game de las 4 tareas).
//
// Por cada idioma (2 contextos separados, 1 carga de documento por contexto —
// restricción de memoria Pi, ver smoke-h3-language-toggle.mjs):
//   /postulaciones?invite=tok-live-abc123 → setup → consent → stage
//   → 4 juegos JUGADOS (precisión 4, go/no-go 8, stroop 8, visual search 4)
//   → reporte live.
// Asert: header del stage (label+description del bloque), copy in-game
// (títulos, instrucciones, botones, timer, aria, feedback), game cards del
// reporte. Consola: 0 errores/pageerror/requestfailed. Sin overflow
// horizontal en cada pantalla.
//
// Salida: JSON { failures, consoleErrors, screenshots }. Exit 1 si hay fallos.

import { chromium } from '@playwright/test';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:5173';
const shotsDir = process.env.SHOTS_DIR ?? 'docs/qa/h3-language-toggle';
const failures = [];
const notes = [];
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
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return { scrollW: doc.scrollWidth, innerW: window.innerWidth };
  });
  if (overflow.scrollW > overflow.innerW + 1) {
    failures.push(`[${tag}] overflow horizontal: scrollWidth=${overflow.scrollW} > innerWidth=${overflow.innerW}`);
  }
}

async function expectVisible(page, tag, locator, what) {
  const count = await locator.count().catch(() => -1);
  if (count < 1) failures.push(`[${tag}] ${what} ausente: ${count}`);
}

// Dibuja el estado visible del stage para diagnóstico (¿qué juego se está
// renderizando?) cuando algo del recorrido no encaja.
async function dumpStageState(page, tag, what) {
  const state = await page.evaluate(() => ({
    url: location.pathname + location.search,
    games: {
      precision: Boolean(document.querySelector('.precision-targeting-task')),
      gonogo: Boolean(document.querySelector('.go-nogo-task')),
      color: Boolean(document.querySelector('.color-interference-task')),
      visualSearch: Boolean(document.querySelector('.visual-search-task')),
      report: Boolean(document.querySelector('.postulation-demo__report-screen')),
    },
    h1: document.querySelector('.postulation-demo__game-header h1')?.innerText ?? null,
    progress: document.querySelector('.postulation-demo__game-progress strong')?.innerText ?? null,
  })).catch(() => null);
  failures.push(`[${tag}] estado inesperado tras "${what}": ${JSON.stringify(state)}`);
}

// Tinta real del estímulo Stroop leída del DOM (color computado de la tarjeta):
// inmutable a desincronizaciones de índice (timeout de estímulo, lentitud Pi).
const INK_RGB_TO_NAME = Object.freeze([
  ['rgb(220, 38, 38)', 'red'],
  ['rgb(37, 99, 235)', 'blue'],
  ['rgb(5, 150, 105)', 'green'],
  ['rgb(180, 83, 9)', 'yellow'],
]);

// Patrón de tintas del Stroop: se lee del DOM (currentStroopInk) en vez de
// asumir índice determinista — inmutable a timeouts de estímulo en la Pi.
const INK_NAME = { red: 'Red', blue: 'Blue', green: 'Green', yellow: 'Yellow' };
const INK_NAME_ES = { red: 'Rojo', blue: 'Azul', green: 'Verde', yellow: 'Amarillo' };

// Verifica que el juego esperado sea el renderizado (anti-desync entre
// juegos); si no, volca el estado y deja de recorrer (sin crash).
async function guardStage(page, tag, selector, what) {
  const ok = await page.evaluate((sel) => Boolean(document.querySelector(sel)), selector).catch(() => false);
  if (!ok) {
    await dumpStageState(page, tag, what);
    return false;
  }
  return true;
}

// Número de ensayo actual del juego (el span .task-progress de cada tarea:
// "Señal n de m" / "Question n of m" / "Panel n de m" / "Objetivo n de m").
// Ancla de sincronía: responde SIEMPRE al ensayo visible, nunca a un índice
// asumido — inmutable a timeouts de estímulo o stalls de la Pi.
async function readTrialNumber(page, taskSelector) {
  return await page.evaluate((sel) => {
    const root = document.querySelector(sel);
    if (!root) return null;
    const el = root.querySelector('.task-progress');
    if (!el) return null;
    const m = el.textContent.match(/(\d+)\s+(?:of|de)\s+(\d+)/);
    return m ? Number(m[1]) : null;
  }, taskSelector).catch(() => null);
}

async function waitForTrialNumber(page, taskSelector, target, timeout = 25000) {
  await page.waitForFunction((args) => {
    const root = document.querySelector(args[0]);
    if (!root) return false;
    const el = root.querySelector('.task-progress');
    if (!el) return false;
    const m = el.textContent.match(/(\d+)\s+(?:of|de)\s+(\d+)/);
    return Boolean(m) && Number(m[1]) === args[1];
  }, [taskSelector, target], { timeout, polling: 50 });
}

async function walkBattery({ tag, lang }) {
  const en = lang === 'en';
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  track(page, tag);
  await page.addInitScript((l) => {
    try { localStorage.setItem('krumm-lang', l); } catch {}
  }, lang);

  // --- Setup (consent) ---
  await page.goto(`${baseUrl}/postulaciones?invite=tok-live-abc123`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: en ? /Session preparation/i : /Preparación de la sesión/i }).waitFor({ timeout: 30000 })
    .catch(() => failures.push(`[${tag}] setup no cargó`));
  await page.getByTestId('postulation-explicit-consent').check();
  await page.getByRole('button', { name: en ? /Continue to games/i : /Continuar a juegos/i }).click();

  // --- 1) Precision (4 trials) ---
  await page.getByText(en ? /Game 1 of 4/i : /Juego 1 de 4/i).waitFor({ timeout: 30000 })
    .catch(() => failures.push(`[${tag}] stage juego 1 no cargó`));
  if (!(await guardStage(page, tag, '.precision-targeting-task', 'entrada a precisión'))) return;
  await expectVisible(page, tag, page.getByRole('heading', { name: en ? 'Adaptive precision route' : 'Ruta de precisión adaptativa' }), 'h1 bloque precisión');
  await expectVisible(page, tag, en
    ? page.getByText(/Touch the start, follow the ideal corridor/i)
    : page.getByText(/Toca inicio, sigue el corredor ideal/i), 'description bloque precisión');
  await expectVisible(page, tag, en
    ? page.getByText(/Not simple RT: touch the start point/i)
    : page.getByText(/No es RT simple: toca el punto de inicio/i), 'caption precisión');
  await expectVisible(page, tag, en
    ? page.getByRole('button', { name: 'Start point' })
    : page.getByRole('button', { name: 'Punto de inicio' }), 'start pad (aria)');
  await expectVisible(page, tag, en
    ? page.getByText('Touch the start point', { exact: true })
    : page.getByText('Toca el punto de inicio', { exact: true }), 'hint ready precisión');
  await assertNoOverflow(page, tag);
  await shot(page, `t_42978412-${lang}-precision`);

  for (let i = 0; i < 4; i += 1) {
    try {
      // El start pad queda disabled durante target/feedback → Playwright
      // espera la accionabilidad: auto-sync con la fase del juego.
      await page.getByTestId('precision-start-pad').click({ timeout: 10000 });
      await page.getByTestId('precision-target').waitFor({ state: 'visible', timeout: 10000 });
      await page.getByTestId('precision-target').click({ timeout: 5000 });
      await page.waitForTimeout(550); // feedback 450ms + margen
    } catch (err) {
      await dumpStageState(page, tag, `precisión trial ${i} (${String(err).split('\n')[0]})`);
      return;
    }
  }

  // --- 2) Go/No-Go (8 trials: GO=press, NO-GO=withhold) ---
  await page.getByText(en ? /Game 2 of 4/i : /Juego 2 de 4/i).waitFor({ timeout: 15000 })
    .catch(() => failures.push(`[${tag}] transición a go/no-go no ocurrió`));
  if (!(await guardStage(page, tag, '.go-nogo-task', 'entrada a go/no-go'))) return;
  await expectVisible(page, tag, page.getByRole('heading', { name: en ? 'Inhibitory control' : 'Control inhibitorio' }), 'h1 bloque go/no-go');
  await expectVisible(page, tag, en
    ? page.getByText(/Respond to GO signals and inhibit responses/i)
    : page.getByText(/Responde a señales GO e inhibe respuestas/i), 'description bloque go/no-go');
  await expectVisible(page, tag, en
    ? page.getByText(/Impulse traffic light/i)
    : page.getByText(/Semáforo de impulso/i), 'título go/no-go');
  await expectVisible(page, tag, en
    ? page.getByText('Press respond only when GO appears.', { exact: true })
    : page.getByText('Pulsa responder solo cuando aparezca GO.', { exact: true }), 'instrucción GO');
  await assertNoOverflow(page, tag);
  await shot(page, `t_42978412-${lang}-gonogo`);

  // Bucle anclado al contador de ensayos: responde al ensayo VISIBLE (nunca a
  // un índice asumido) y espera a que el contador avance (confirma registro).
  let n = await readTrialNumber(page, '.go-nogo-task');
  if (n == null) {
    await dumpStageState(page, tag, 'go/no-go (contador ausente)');
    return;
  }
  for (; n <= 8; n += 1) {
    try {
      const cue = (await page.getByTestId('gonogo-cue').textContent())?.trim();
      if (cue === 'GO') {
        await page.getByRole('button', { name: en ? 'Respond now' : 'Responder ahora' }).click({ timeout: 5000 });
      }
      // NO-GO: withhold por timeout del estímulo (900ms) — no se pulsa nada.
      if (n < 8) await waitForTrialNumber(page, '.go-nogo-task', n + 1);
    } catch (err) {
      await dumpStageState(page, tag, `go/no-go ensayo ${n} (${String(err).split('\n')[0]})`);
      return;
    }
  }

  // --- 3) Color interference (8 trials, tinta leída del DOM) ---
  await page.getByText(en ? /Game 3 of 4/i : /Juego 3 de 4/i).waitFor({ timeout: 15000 })
    .catch(() => failures.push(`[${tag}] transición a stroop no ocurrió`));
  if (!(await guardStage(page, tag, '.color-interference-task', 'entrada a stroop'))) return;
  await expectVisible(page, tag, page.getByRole('heading', { name: en ? 'Cognitive interference' : 'Interferencia cognitiva' }), 'h1 bloque stroop');
  await expectVisible(page, tag, en
    ? page.getByText('Pick the ink, ignore the text.', { exact: true })
    : page.getByText('Elige la tinta, ignora el texto.', { exact: true }), 'prompt stroop');
  await expectVisible(page, tag, en
    ? page.getByRole('timer', { name: 'Time remaining' })
    : page.getByRole('timer', { name: 'Tiempo restante' }), 'timer stroop (aria)');
  await assertNoOverflow(page, tag);
  await shot(page, `t_42978412-${lang}-color`);

  // Bucle anclado al contador: lee la tinta del estímulo VISIBLE y responde.
  let c = await readTrialNumber(page, '.color-interference-task');
  if (c == null) {
    await dumpStageState(page, tag, 'stroop (contador ausente)');
    return;
  }
  for (; c <= 8; c += 1) {
    let triedName = null;
    try {
      const color = await page.evaluate(() => {
        const el = document.querySelector('[data-testid="color-stimulus"]');
        return el ? getComputedStyle(el).color : '';
      });
      const hit = INK_RGB_TO_NAME.find(([css]) => css === color);
      if (!hit) {
        const diag = await page.evaluate(() => {
          const stim = document.querySelector('[data-testid="color-stimulus"]');
          return { stimWord: stim?.textContent ?? null, stimColor: stim ? getComputedStyle(stim).color : null };
        });
        await dumpStageState(page, tag, `stroop ensayo ${c} (tinta no mapeada: ${JSON.stringify(diag)})`);
        return;
      }
      triedName = en ? `Pick ink ${INK_NAME[hit[1]]}` : `Elegir tinta ${INK_NAME_ES[hit[1]]}`;
      await page.getByRole('button', { name: triedName, exact: true }).click({ timeout: 5000 });
      if (c < 8) await waitForTrialNumber(page, '.color-interference-task', c + 1);
    } catch (err) {
      const diag = await page.evaluate((tried) => {
        const cards = [...document.querySelectorAll('.color-interference-task__choice-card')].map((b) => {
          const rect = b.getBoundingClientRect();
          return {
            aria: b.getAttribute('aria-label'),
            disabled: b.disabled,
            visible: b.offsetParent !== null,
            x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height),
          };
        });
        const triedCard = cards.find((c) => c.aria === tried);
        let elementAt = null;
        if (triedCard) {
          const el = document.elementFromPoint(triedCard.x + triedCard.w / 2, triedCard.y + triedCard.h / 2);
          elementAt = el ? `${el.tagName}.${String(el.className).slice(0, 80)}` : null;
        }
        const stim = document.querySelector('[data-testid="color-stimulus"]');
        return {
          cards,
          elementAt,
          stimColor: stim ? getComputedStyle(stim).color : null,
          stimWord: stim?.textContent ?? null,
          game: document.querySelector('.color-interference-task') ? 'stroop' : (document.querySelector('.visual-search-task') ? 'visual_search' : 'other'),
        };
      }, triedName).catch(() => null);
      const shotPath = `${shotsDir}/t_42978412-${lang}-color-fail-${c}.png`;
      await page.screenshot({ path: shotPath }).catch(() => {});
      screenshots.push(shotPath);
      failures.push(`[${tag}] stroop ensayo ${c}: ${JSON.stringify(diag)} (${String(err).split('\n')[0]})`);
      await dumpStageState(page, tag, `stroop ensayo ${c}`);
      return;
    }
  }

  // --- 4) Visual search (4 trials) ---
  await page.getByText(en ? /Game 4 of 4/i : /Juego 4 de 4/i).waitFor({ timeout: 15000 })
    .catch(() => failures.push(`[${tag}] transición a visual search no ocurrió`));
  if (!(await guardStage(page, tag, '.visual-search-task', 'entrada a visual search'))) return;
  await expectVisible(page, tag, page.getByRole('heading', { name: en ? 'Visual search' : 'Búsqueda visual' }), 'h1 bloque visual search');
  await expectVisible(page, tag, en
    ? page.getByText(/Find the solid dot among distractors/i)
    : page.getByText(/Encuentra el punto sólido entre distractores/i), 'caption visual search');
  await expectVisible(page, tag, en
    ? page.getByRole('button', { name: 'Target: solid dot' })
    : page.getByRole('button', { name: 'Objetivo: punto sólido' }), 'tile target (aria)');
  await assertNoOverflow(page, tag);
  await shot(page, `t_42978412-${lang}-vs`);

  // Bucle anclado al contador: click al target del ensayo VISIBLE.
  let v = await readTrialNumber(page, '.visual-search-task');
  if (v == null) {
    await dumpStageState(page, tag, 'visual search (contador ausente)');
    return;
  }
  for (; v <= 4; v += 1) {
    try {
      await page.getByTestId('visual-search-target').waitFor({ state: 'visible', timeout: 10000 });
      await page.getByTestId('visual-search-target').click({ timeout: 5000 });
      if (v < 4) await waitForTrialNumber(page, '.visual-search-task', v + 1, 15000);
    } catch (err) {
      await dumpStageState(page, tag, `visual search ensayo ${v} (${String(err).split('\n')[0]})`);
      return;
    }
  }

  // --- Reporte live ---
  await page.getByRole('heading', { name: en ? /Session report ready for human review/i : /Reporte de sesión listo para revisión humana/i }).waitFor({ timeout: 60000 })
    .catch(() => failures.push(`[${tag}] reporte no cargó tras los 4 juegos`));
  await expectVisible(page, tag, page.getByText(en ? /Results by game/i : /Resultados por juego/i), 'sección game cards');
  const cardLabels = en
    ? ['Adaptive precision route', 'Inhibitory control', 'Cognitive interference', 'Visual search']
    : ['Ruta de precisión adaptativa', 'Control inhibitorio', 'Interferencia cognitiva', 'Búsqueda visual'];
  for (const label of cardLabels) {
    await expectVisible(page, tag, page.getByText(label, { exact: true }), `game card "${label}" en el reporte`);
  }
  await assertNoOverflow(page, tag);
  await shot(page, `t_42978412-${lang}-report`);
  await context.close();
}

try {
  await walkBattery({ tag: 'EN', lang: 'en' });
  await walkBattery({ tag: 'ES', lang: 'es' });
} finally {
  await browser.close().catch(() => {});
}
const result = { baseUrl, failures, notes, consoleErrors: consoleErrors.slice(0, 20), screenshots };
console.log(JSON.stringify(result, null, 2));
process.exit(failures.length || consoleErrors.length ? 1 : 0);
