// t_f40921bf smoke (2026-09-07): stage móvil — el canvas debe adaptarse al
// ancho real del contenedor (sin piso de 500px) y los blancos/dianas deben ser
// alcanzables en 390x844 (y 320x700).
//
// A diferencia del audit H1/H3 (que medía documentElement.scrollWidth — un
// proxy que el overflow-x:hidden del stage oculta), aquí se miden los
// BOUNDING BOX REALES: raíz de juego (grid item del stage), .task-area y los
// elementos interactivos (blancos de precisión, cue/button de go-nogo,
// opciones de color, diana de visual-search). Aserción: ninguna caja
// interactiva excede el ancho del viewport (sin recorte).
//
// Baterías:
//   BATTERY=stable_dg  → precision_targeting, go_nogo, color_interference, visual_search
//   BATTERY=original   → laser_puzzle, balloon_risk, passenger_routes, team_coordination, tangram_exp001
// VIEWPORT_W/VIEWPORT_H → 390/844 (default) o 320/700.
//
// Salida: JSON { viewport, failures, consoleErrors, games:[{name, area, root, content, shot}] }.
// Exit 1 si hay fallos.

import { chromium } from '@playwright/test';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:5173';
const battery = process.env.BATTERY ?? 'stable_dg';
const VIEWPORT = { width: Number(process.env.VIEWPORT_W) || 390, height: Number(process.env.VIEWPORT_H) || 844 };
const shotsDir = process.env.SHOTS_DIR ?? `docs/qa/h3-language-toggle`;
const failures = [];
const consoleErrors = [];
const games = [];

const browser = await chromium.launch({
  headless: true,
  executablePath: '/home/sarlock/.cache/ms-playwright/chromium-1234/chrome-linux/chrome',
  args: ['--headless=new', '--disable-dev-shm-usage', '--disable-gpu'],
});

function track(page, tag) {
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(`[${tag}] ${m.text()}`); });
  page.on('pageerror', (e) => consoleErrors.push(`[${tag}] ${e.message}`));
  page.on('requestfailed', (r) => consoleErrors.push(`[${tag}] requestfailed ${r.url()} ${r.failure()?.errorText ?? ''}`));
}

const round = (n) => Math.round(n);

// Mide la geometría real del juego actual: stage, raíz (grid item), .task-area
// y un selector extra (tablero) si se da. Devuelve nulls si algún elemento no existe.
// NOTA: page.evaluate solo acepta args serializables → selector como string, no fn.
async function measureGame(page, extraSelector = null) {
  return page.evaluate((sel) => {
    const R = (n) => Math.round(n);
    const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: R(b.x), y: R(b.y), w: R(b.width), h: R(b.height), right: R(b.right), bottom: R(b.bottom) }; };
    const stage = document.querySelector('.postulation-demo__game-stage');
    const root = stage ? stage.firstElementChild : null;
    const area = document.querySelector('.task-area');
    const extra = sel ? document.querySelector(sel) : null;
    return {
      vpW: window.innerWidth, vpH: window.innerHeight,
      stage: r(stage), root: r(root), area: r(area), extra: r(extra),
      rootClass: root ? String(root.className).split(' ')[0] : null,
      areaTestId: area ? area.getAttribute('data-testid') : null,
    };
  }, extraSelector);
}

// Aserción central: la raíz y el área no deben exceder el viewport (sin recorte).
function assertFits(tag, m) {
  if (m.root && m.root.right > m.vpW + 1) failures.push(`[${tag}] raíz de juego desborda el viewport: right=${m.root.right} > vpW=${m.vpW} (clase ${m.rootClass})`);
  if (m.area && m.area.right > m.vpW + 1) failures.push(`[${tag}] .task-area desborda el viewport: right=${m.area.right} > vpW=${m.vpW} (w=${m.area.w})`);
}

async function shot(page, name) {
  const path = `${shotsDir}/${name}.png`;
  await page.screenshot({ path });
  return path;
}

// ---------- Llegar al stage (setup → consent → continuar) ----------
async function reachStage() {
  const batteryParam = isOriginal ? '&battery=original' : '';
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();
  track(page, 'stage');
  await page.goto(`${baseUrl}/postulaciones?invite=tok-live-abc123${batteryParam}`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: /Preparación de la sesión|Session preparation/i }).waitFor({ timeout: 20000 });
  await page.getByTestId('postulation-explicit-consent').check();
  await page.getByRole('button', { name: /Continuar a juegos|Continue to games/i }).click();
  return { context, page };
}

const gameNoRe = (n, total) => new RegExp(`(Juego ${n} de ${total}|Game ${n} of ${total})`);

// ---------- Drivers por juego (stable_dg) ----------
async function playPrecision(page, tag, trials) {
  const content = [];
  for (let i = 0; i < trials; i++) {
    await page.waitForFunction((idx) => {
      const el = [...document.querySelectorAll('.task-progress')].find((e) => /Objetivo/i.test(e.textContent));
      return el && new RegExp(`Objetivo ${idx} de`).test(el.textContent);
    }, i + 1, { timeout: 15000 }).catch(() => failures.push(`[${tag}] trial ${i + 1}: el header "Objetivo ${i + 1} de" no apareció`));
    const startPad = page.getByTestId('precision-start-pad');
    await startPad.waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForFunction(() => { const b = document.querySelector('[data-testid="precision-start-pad"]'); return b && !b.disabled; }, null, { timeout: 15000 });
    await startPad.click();
    const target = page.getByTestId('precision-target');
    await target.waitFor({ state: 'visible', timeout: 15000 });
    const m = await page.evaluate(() => {
      const t = document.querySelector('[data-testid="precision-target"]');
      const area = document.querySelector('[data-testid="precision-task-area"]');
      const b = t.getBoundingClientRect(); const a = area.getBoundingClientRect();
      return { targetRight: Math.round(b.right), targetLeft: Math.round(b.left), dataX: t.getAttribute('data-x'), areaRight: Math.round(a.right), areaW: Math.round(a.width), vpW: window.innerWidth };
    });
    content.push(m);
    if (m.targetRight > m.vpW + 1) failures.push(`[${tag}] trial ${i + 1}: blanco INALCANZABLE (right=${m.targetRight} > vpW=${m.vpW}, data-x=${m.dataX})`);
    await target.click();
    await page.waitForTimeout(450);
  }
  return content;
}

async function playGoNoGo(page, tag, trials) {
  const content = [];
  for (let i = 0; i < trials; i++) {
    await page.waitForFunction((idx) => {
      const el = [...document.querySelectorAll('.task-progress')].find((e) => /Señal/i.test(e.textContent));
      return el && new RegExp(`Señal ${idx} de`).test(el.textContent);
    }, i + 1, { timeout: 15000 }).catch(() => failures.push(`[${tag}] trial ${i + 1}: header "Señal ${i + 1} de" no apareció`));
    const btn = page.locator('.go-nogo-task__response');
    await btn.waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(120); // deja asentarse el cue
    const m = await page.evaluate(() => {
      const card = document.querySelector('.go-nogo-task__cue-card');
      const b = document.querySelector('.go-nogo-task__response');
      const cb = card.getBoundingClientRect(); const bb = b.getBoundingClientRect();
      return { cardRight: Math.round(cb.right), cardW: Math.round(cb.width), btnRight: Math.round(bb.right), btnW: Math.round(bb.width), btnLeft: Math.round(bb.left), state: b.getAttribute('data-state'), vpW: window.innerWidth };
    });
    content.push(m);
    if (m.cardRight > m.vpW + 1) failures.push(`[${tag}] trial ${i + 1}: cue-card desborda (right=${m.cardRight} > vpW=${m.vpW})`);
    if (m.btnRight > m.vpW + 1) failures.push(`[${tag}] trial ${i + 1}: botón de respuesta desborda (right=${m.btnRight} > vpW=${m.vpW})`);
    if (m.state === 'go') { await btn.click(); } else { await page.waitForTimeout(1100); }
  }
  return content;
}

async function playColor(page, tag, trials) {
  const content = [];
  for (let i = 0; i < trials; i++) {
    await page.waitForFunction((idx) => {
      const el = [...document.querySelectorAll('.task-progress')].find((e) => /Pregunta/i.test(e.textContent));
      return el && new RegExp(`Pregunta ${idx} de`).test(el.textContent);
    }, i + 1, { timeout: 15000 }).catch(() => failures.push(`[${tag}] trial ${i + 1}: header "Pregunta ${i + 1} de" no apareció`));
    const m = await page.evaluate(() => {
      const opts = [...document.querySelectorAll('.color-interference-task__option')];
      return { options: opts.map((o) => { const b = o.getBoundingClientRect(); return { left: Math.round(b.left), right: Math.round(b.right), w: Math.round(b.width) }; }), vpW: window.innerWidth, count: opts.length };
    });
    content.push(m);
    if (m.count < 2) failures.push(`[${tag}] trial ${i + 1}: opciones de color ausentes (count=${m.count})`);
    for (const o of m.options) if (o.right > m.vpW + 1 || o.left < -1) failures.push(`[${tag}] trial ${i + 1}: opción de color desborda (left=${o.left}, right=${o.right} vs vpW=${m.vpW})`);
    await page.locator('.color-interference-task__option').first().click();
    await page.waitForTimeout(500);
  }
  return content;
}

async function playVisualSearch(page, tag, trials) {
  const content = [];
  for (let i = 0; i < trials; i++) {
    await page.waitForFunction((idx) => {
      const el = [...document.querySelectorAll('.task-progress')].find((e) => /Panel/i.test(e.textContent));
      return el && new RegExp(`Panel ${idx} de`).test(el.textContent);
    }, i + 1, { timeout: 15000 }).catch(() => failures.push(`[${tag}] trial ${i + 1}: header "Panel ${i + 1} de" no apareció`));
    const target = page.getByTestId('visual-search-target');
    await target.waitFor({ state: 'visible', timeout: 15000 });
    const m = await page.evaluate(() => {
      const t = document.querySelector('[data-testid="visual-search-target"]');
      const area = document.querySelector('[data-testid="visual-search-area"]');
      const tb = t.getBoundingClientRect(); const a = area.getBoundingClientRect();
      return { targetRight: Math.round(tb.right), areaRight: Math.round(a.right), areaW: Math.round(a.width), vpW: window.innerWidth };
    });
    content.push(m);
    if (m.targetRight > m.vpW + 1) failures.push(`[${tag}] trial ${i + 1}: diana INALCANZABLE (right=${m.targetRight} > vpW=${m.vpW})`);
    await target.click();
    await page.waitForTimeout(450);
  }
  return content;
}

// ---------- Batería original: medición de geometría (al llegar a cada juego). ----------
const ORIGINAL_BOARD_SELECTOR = '.laser-puzzle-task__board, .balloon-risk-task__arena, [data-testid="passenger-route-board"], .team-coordination-task__workspace, .tangram-canvas';
async function measureOriginal(page, tag) {
  const m = await measureGame(page, ORIGINAL_BOARD_SELECTOR);
  if (m.extra && m.extra.right > m.vpW + 1) failures.push(`[${tag}] tablero desborda el viewport (extra.right=${m.extra.right} > vpW=${m.vpW})`);
  assertFits(tag, m);
  return m;
}

// ---------- Drivers de completado (batería original) ----------
async function skipMicroIntro(page, tag) {
  const skip = page.getByRole('button', { name: /^Saltar$|^Skip$/i });
  if (await skip.count() > 0) {
    await skip.first().click().catch(() => failures.push(`[${tag}] no se pudo saltar la micro-intro`));
    await page.waitForTimeout(450);
  }
}

// Soluciones origen→destino de los 3 niveles demo (laserPuzzleTelemetry.js).
const LASER_SOLUTIONS = [
  [['7,0', '0,2'], ['7,2', '3,2'], ['7,4', '3,5'], ['7,6', '1,5']],
  [['0,0', '2,3'], ['1,6', '6,3'], ['3,6', '3,3'], ['5,6', '3,1'], ['7,6', '7,1']],
  [['0,0', '7,5'], ['1,0', '5,5'], ['2,0', '5,1'], ['4,7', '3,6'], ['5,7', '6,6'], ['6,7', '6,4']],
];

async function completeLaser(page, tag) {
  await skipMicroIntro(page, tag);
  for (let lvl = 0; lvl < LASER_SOLUTIONS.length; lvl++) {
    for (const [origin, target] of LASER_SOLUTIONS[lvl]) {
      await page.getByTestId(`laser-cell-${origin}`).click({ timeout: 8000 }).catch(() => failures.push(`[${tag}] celda origen ${origin} (nivel ${lvl + 1}) no clicable`));
      await page.waitForTimeout(160);
      await page.getByTestId(`laser-cell-${target}`).click({ timeout: 8000 }).catch(() => failures.push(`[${tag}] celda destino ${target} (nivel ${lvl + 1}) no clicable`));
      await page.waitForTimeout(160);
    }
    await page.getByRole('button', { name: /Comprobar ruta|Check route/i }).click({ timeout: 8000 }).catch(() => failures.push(`[${tag}] "Comprobar ruta" (nivel ${lvl + 1}) no clicable`));
    await page.waitForTimeout(3600); // clear (1500) + interlevel (1400) + buffer
  }
}

async function completeBalloon(page, tag) {
  await skipMicroIntro(page, tag);
  for (let r = 0; r < 8; r++) {
    await page.getByRole('button', { name: /Inflar|Inflate/i }).click({ timeout: 8000 }).catch(() => failures.push(`[${tag}] "Inflar" (ronda ${r + 1}) no clicable`));
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: /Asegurar puntos|Secure points/i }).click({ timeout: 8000 }).catch(() => failures.push(`[${tag}] "Asegurar puntos" (ronda ${r + 1}) no clicable`));
    await page.waitForTimeout(800); // fx de cashout
  }
}

async function completePassenger(page, tag) {
  await skipMicroIntro(page, tag);
  // Nivel 1 no tiene estaciones (stations: [], budget 14, start 1,4): alternar
  // Derecha/Izquierda agota la energía en ~14 movimientos → failRun("energy_depleted").
  const failed = page.getByTestId('passenger-route-failed');
  let moved = 0;
  const t0 = Date.now();
  while (Date.now() - t0 < 60000 && moved < 40) {
    if (await failed.count() > 0) break;
    const re = moved % 2 === 0 ? /^Derecha$/ : /^Izquierda$/;
    await page.getByRole('button', { name: re }).click({ timeout: 4000 }).catch(() => {});
    moved++;
    await page.waitForTimeout(220);
  }
  if (await failed.count() > 0) {
    await page.getByRole('button', { name: /Continuar con resultado|Continue with result/i }).click({ timeout: 8000 }).catch(() => failures.push(`[${tag}] "Continuar con resultado" no clicable`));
  } else {
    failures.push(`[${tag}] no se agotó la energía (movimientos=${moved})`);
  }
}

async function completeTeam(page, tag) {
  await skipMicroIntro(page, tag);
  for (let s = 0; s < 4; s++) {
    const opt = page.locator('.team-coordination-task__option').first();
    await opt.click({ timeout: 10000 }).catch(() => failures.push(`[${tag}] opción no clicable (escenario ${s + 1})`));
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: /Continuar aventura|Cerrar misión|Continue adventure|Close mission/i }).click({ timeout: 8000 }).catch(() => failures.push(`[${tag}] botón continuar no clicable (escenario ${s + 1})`));
    await page.waitForTimeout(600);
  }
}

// ---------- Run principal ----------
const isOriginal = battery === 'original';
const total = isOriginal ? 5 : 4;
const { context, page } = await reachStage();

// Game 1
await page.getByText(gameNoRe(1, total)).waitFor({ timeout: 30000 }).catch(() => failures.push('[stage] "Juego 1 de N" no apareció'));

if (!isOriginal) {
  // 1) precision_targeting
  {
    const tag = 'precision_targeting';
    const m = await measureGame(page);
    assertFits(tag, m);
    if (m.area && m.area.w > 400) failures.push(`[${tag}] .task-area ancha (w=${m.area.w}) — el fix no se aplicó (esperado <= ~344 en 390)`);
    const shotPath = await shot(page, `t_f40921bf-${VIEWPORT.width}-${tag}`);
    const content = await playPrecision(page, tag, 4);
    games.push({ name: tag, ...m, content, shot: shotPath });
  }
  // 2) go_nogo
  await page.getByText(gameNoRe(2, total)).waitFor({ timeout: 30000 }).catch(() => failures.push('[stage] no avanzó a "Juego 2 de N"'));
  {
    const tag = 'go_nogo';
    const m = await measureGame(page);
    assertFits(tag, m);
    const shotPath = await shot(page, `t_f40921bf-${VIEWPORT.width}-${tag}`);
    const content = await playGoNoGo(page, tag, 8);
    games.push({ name: tag, ...m, content, shot: shotPath });
  }
  // 3) color_interference
  await page.getByText(gameNoRe(3, total)).waitFor({ timeout: 30000 }).catch(() => failures.push('[stage] no avanzó a "Juego 3 de N"'));
  {
    const tag = 'color_interference';
    const m = await measureGame(page);
    assertFits(tag, m);
    const shotPath = await shot(page, `t_f40921bf-${VIEWPORT.width}-${tag}`);
    const content = await playColor(page, tag, 8);
    games.push({ name: tag, ...m, content, shot: shotPath });
  }
  // 4) visual_search
  await page.getByText(gameNoRe(4, total)).waitFor({ timeout: 30000 }).catch(() => failures.push('[stage] no avanzó a "Juego 4 de N"'));
  {
    const tag = 'visual_search';
    const m = await measureGame(page);
    assertFits(tag, m);
    const shotPath = await shot(page, `t_f40921bf-${VIEWPORT.width}-${tag}`);
    const content = await playVisualSearch(page, tag, 4);
    games.push({ name: tag, ...m, content, shot: shotPath });
  }
  // Completado → reporte
  await page.waitForSelector('[data-demo-phase="report-preview"], .postulation-demo__report', { timeout: 30000 })
    .catch(() => failures.push('[stage] no llegó al reporte tras completar los 4 juegos'));
  games.push({ name: 'report', shot: await shot(page, `t_f40921bf-${VIEWPORT.width}-report`) });
} else {
  // Batería original: llegar a cada juego, medir geometría del tablero y
  // completarlo (drivers best-effort) para avanzar al siguiente.
  // Tangram es el último: solo se mide (no necesita completado).
  const originalPlan = [
    { name: 'laser_puzzle', complete: completeLaser },
    { name: 'balloon_risk', complete: completeBalloon },
    { name: 'passenger_routes', complete: completePassenger },
    { name: 'team_coordination', complete: completeTeam },
    { name: 'tangram_exp001', complete: null },
  ];
  for (let i = 0; i < originalPlan.length; i++) {
    await page.getByText(gameNoRe(i + 1, total)).waitFor({ timeout: 45000 }).catch(() => failures.push(`[stage] no llegó a "Juego ${i + 1} de ${total}"`));
    const tag = originalPlan[i].name;
    await page.waitForTimeout(600); // deja asentarse el render del juego
    const m = await measureOriginal(page, tag);
    games.push({ name: tag, ...m, shot: await shot(page, `t_f40921bf-${VIEWPORT.width}-${tag}`) });
    if (originalPlan[i].complete) { await originalPlan[i].complete(page, tag); }
  }
  // Tangram: el canvas solo se renderiza desde la fase tutorial. Avanzar de
  // welcome → tutorial para medir el .tangram-canvas real (SVG viewBox 100%).
  const tangramWelcome = page.getByTestId('tangram-welcome');
  if (await tangramWelcome.count() > 0) {
    await page.getByTestId('tangram-start-tutorial').click().catch(() => failures.push('[tangram] CTA de welcome no clicable'));
    await page.waitForTimeout(900);
    const m = await measureGame(page, '.tangram-canvas');
    if (m.extra && m.extra.right > m.vpW + 1) failures.push(`[tangram] canvas desborda el viewport (right=${m.extra.right} > vpW=${m.vpW})`);
    games.push({ name: 'tangram_canvas', ...m, shot: await shot(page, `t_f40921bf-${VIEWPORT.width}-tangram_canvas`) });
  }
}

await context.close();
await browser.close();

const result = {
  baseUrl, battery, viewport: VIEWPORT,
  failures,
  consoleErrors: consoleErrors.slice(0, 20),
  games,
};
console.log(JSON.stringify(result, null, 2));
process.exit(failures.length ? 1 : 0);
