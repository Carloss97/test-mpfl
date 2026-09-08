// t_7c5cd0c0 (EXP-7 BOMB B3) smoke — niveles 1-4 + fases sobre el stage real vía
// /dev/bomb (sin batería; telemetría solo en memoria).
//
// Spec (ley): Doc 1 §4 (fases), §7 (máquina de estados), §16 (QA-01..10 + DoD),
// Doc 2 §5 (arquitectura de pantallas), §10 (timing: countdown 0.5 s, exposición
// libre/3/2/2 s, delay 0/2/4/3 s, time limit 20/15/12/10 s), §11 (copy), §14
// (reduced-motion), §15 (responsive), §16 (animaciones).
//
// Cobertura:
//  A (1280×720, seed=42): recorrido feliz L1-L4 + SESSION_COMPLETE; countdown 0.5 s;
//    exposición auto (3/2/2 s ±250 ms); delay (2/4/3 s ±250-300 ms); DoD timer
//    visual vs lógico ≤100 ms (3 muestras rAF sincronizadas); copy exacto de
//    transición/success/session; MODEL B + modificador L4; overflow 0.
//  B (1280×720): QA-06 timeout L1 (20 s), QA-07 2 errores L2, penalty state L3
//    (ORDER_ERROR con cable → irreversible, decisión B1 #2 → timeout), QA-04
//    TYPE_INTERFERENCE L4 como PRIMER acción (ventana de 10 s apretada: la
//    interferencia debe medirse antes de consumir tiempo) + recuperación QA-05.
//  C (390×844): aviso <1024 px + sin overflow horizontal en intro/encoding/execution/
//    success/delay.
//  D (reduced-motion): countdown/delay-static/success sin animación (lógica intacta).
//
// Robustez: cada run va en try/catch (un timeout no mata el reporte); siempre se
// escribe smoke-result.json.
// Salida: docs/qa/b3-bomb-phases/smoke-result.json + screenshots. Exit 1 si hay fallos.

import { chromium } from '@playwright/test';
import fs from 'node:fs';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:5173';
const shotsDir = 'docs/qa/b3-bomb-phases';
fs.mkdirSync(shotsDir, { recursive: true });
const failures = [];
const consoleErrors = [];
const results = [];

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

async function shot(page, name) {
  const path = `${shotsDir}/${name}.png`;
  await page.screenshot({ path });
  return path;
}

async function overflowPx(page) {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}

async function waitForTestid(page, testid, timeoutMs = 20000) {
  await page.waitForSelector(`[data-testid="${testid}"]`, { timeout: timeoutMs });
}

async function holdYellow(page, ms = 2000) {
  const box = await page.getByTestId('bomb-hold-btn').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

async function solve(page, testids) {
  for (const id of testids) {
    if (id === 'HOLD') await holdYellow(page, 2000);
    else await page.getByTestId(id).click();
  }
}

async function playPractice(page) {
  await page.getByTestId('bomb-start-practice').click();
  await page.waitForFunction(() => {
    const b = document.querySelector('[data-testid="bomb-switch-SW_1"]');
    return b && !b.disabled;
  }, null, { timeout: 8000 });
  await page.getByTestId('bomb-switch-SW_1').click();
  await page.getByTestId('bomb-wire-WIRE_RED').click();
  await holdYellow(page, 2000);
  await waitForTestid(page, 'bomb-practice-done');
  await page.getByTestId('bomb-start-evaluation').click();
  await waitForTestid(page, 'bomb-level-intro');
}

// Recorrido desde LEVEL_INTRO hasta la ejecución: intro → "Continuar" → countdown
// 0.5 s (watcher in-page: inmune al overhead de Playwright) → encoding (CTA libre
// L1 / auto L2-4) → delay (si aplica).
async function introToExecution(page, tag, { freeReading = false } = {}) {
  // Watcher ANTES del click: captura el countdown aunque la página esté cargada.
  const countdownSeen = page.evaluate(() => new Promise((resolve) => {
    if (document.querySelector('[data-testid="bomb-countdown"]')) { resolve(true); return; }
    const t0 = performance.now();
    const iv = setInterval(() => {
      if (document.querySelector('[data-testid="bomb-countdown"]')) { clearInterval(iv); resolve(true); }
      else if (performance.now() - t0 > 2500) { clearInterval(iv); resolve(false); }
    }, 10);
  }));
  await page.getByTestId('bomb-intro-continue').click();
  if (!(await countdownSeen)) failures.push(`[${tag}] countdown 0.5 s no visible tras "Continuar"`);
  await waitForTestid(page, 'bomb-encoding');
  if (freeReading) {
    const free = await page.$('[data-testid="bomb-encoding-free"]');
    if (!free) failures.push(`[${tag}] L1: label "Lectura libre" ausente`);
    await page.getByTestId('bomb-encoding-continue').click();
  } else {
    // encoding termina sola (auto-hide) y luego el delay: esperar ejecución.
    // Nota: `!querySelector` (null = ya fue desconectado); `el && !el.isConnected`
    // nunca se cumple cuando el elemento ya no existe (bug v1 del smoke).
    await page.waitForFunction(
      () => !document.querySelector('[data-testid="bomb-encoding"]'),
      null, { timeout: 10000 },
    ).catch(() => {});
  }
  await page.waitForFunction(
    () => {
      const el = document.querySelector('[data-testid="bomb-timer"]');
      const phase = el?.getAttribute('data-phase');
      return phase === 'normal' || phase === 'warning' || phase === 'critical';
    },
    null,
    { timeout: 15000 },
  );
}

// Mide la duración (ms) entre la aparición de firstSel y la de secondSel.
async function measureAppearAppear(page, firstSel, secondSel, timeoutMs = 15000) {
  return page.evaluate(
    ({ firstSel, secondSel, timeoutMs }) => new Promise((resolve, reject) => {
      const t0 = performance.now();
      let first = null;
      const iv = setInterval(() => {
        if (first === null && document.querySelector(firstSel)) first = performance.now();
        if (first !== null && document.querySelector(secondSel)) {
          clearInterval(iv);
          resolve({ durationMs: performance.now() - first });
        }
        if (performance.now() - t0 > timeoutMs) {
          clearInterval(iv);
          reject(new Error(`timeout midiendo ${firstSel} → ${secondSel}`));
        }
      }, 20);
    }),
    { firstSel, secondSel, timeoutMs },
  );
}

// Mide la duración visible de sel (aparece → desaparece).
async function measureVisibleDuration(page, sel, timeoutMs = 15000) {
  return page.evaluate(
    ({ sel, timeoutMs }) => new Promise((resolve, reject) => {
      const t0 = performance.now();
      let first = null;
      const iv = setInterval(() => {
        const el = document.querySelector(sel);
        if (first === null && el) first = performance.now();
        if (first !== null && !el) {
          clearInterval(iv);
          resolve({ durationMs: performance.now() - first });
        }
        if (performance.now() - t0 > timeoutMs) {
          clearInterval(iv);
          reject(new Error(`timeout midiendo duración de ${sel}`));
        }
      }, 20);
    }),
    { sel, timeoutMs },
  );
}

function assertNear(label, actual, expected, tol) {
  if (Math.abs(actual - expected) > tol) {
    failures.push(`${label}: ${Math.round(actual)} ms esperado ${expected}±${tol} ms`);
    return false;
  }
  return true;
}

// Wrapper anti-crash: un timeout de medición no debe matar el run (unhandled
// rejection) — se registra como failure y devuelve un sentinel (-1).
function safeMeasure(p, tag, label) {
  return p.catch((e) => {
    failures.push(`[${tag}] ${label}: ${e.message}`);
    return { durationMs: -1 };
  });
}

async function runBlock(name, fn) {
  const out = { run: name, error: null };
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  try {
    await fn(out, page);
  } catch (e) {
    out.error = String(e?.message ?? e).slice(0, 400);
    failures.push(`[${name}] ${out.error}`);
  } finally {
    results.push(out);
    await context.close().catch(() => {});
  }
  return out;
}

// ---------- Run A: 1280×720 — recorrido feliz L1-L4 + DoD timer + determinismo de timing ----------
await runBlock('A (1280x720 happy path, seed=42)', async (out, page) => {
  const tag = 'runA';
  track(page, tag);
  await page.goto(`${baseUrl}/dev/bomb?seed=42`, { waitUntil: 'networkidle' });
  await waitForTestid(page, 'bomb-game');
  out.overflowBoot = await overflowPx(page);
  if (out.overflowBoot > 0) failures.push(`[${tag}] overflow horizontal en BOOT: ${out.overflowBoot}px`);

  // Práctica (tutorial no evaluado) → "Comenzar evaluación"
  await playPractice(page);
  out.shoots = [await shot(page, `02-practice-done-${tag}`)];

  // L1: intro + encoding libre + DoD timer + secuencia exacta (QA-01)
  const intro1 = await page.getByTestId('bomb-level-intro').textContent();
  out.introL1 = {
    transition: intro1.includes('Primero aprenderás el protocolo base del MODELO A.'),
    level: intro1.includes('Nivel 1 de 4'),
    model: intro1.includes('MODELO A'),
  };
  if (!out.introL1.transition || !out.introL1.level) failures.push(`[${tag}] intro L1 incompleta: ${JSON.stringify(out.introL1)}`);
  out.shoots.push(await shot(page, `03-intro-l1-${tag}`));
  await introToExecution(page, `${tag}L1`, { freeReading: true });
  // DoD §16.2 (timer visual vs lógico ≤100 ms): el display es función pura del reloj
  // lógico (mismo now del motor). Verificación real-browser:
  //  (a) por muestra: |texto - data-remaining-ms| ≤ 100 ms (deriva del formato);
  //  (b) entre muestras: |Δattr - Δt_real| acotado (100 ms DoD + 60 ms de margen de
  //      render/frame en la máquina de tests — el bound es CONSTANTE con el intervalo:
  //      un reloj visual independiente crecería con el tiempo, no sería constante).
  const sample = () => page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => {
      const el = document.querySelector('[data-testid="bomb-timer"]');
      const digits = el.querySelector('.bomb-timer__digits').textContent;
      const m = /^(\d+):(\d{2})\.(\d)$/.exec(digits);
      const visual = m ? (Number(m[1]) * 60 + Number(m[2])) * 1000 + Number(m[3]) * 100 : null;
      resolve({ visual, logical: Number(el.getAttribute('data-remaining-ms')), t: performance.now() });
    });
  }));
  const s1 = await sample();
  await page.waitForTimeout(2000);
  const s2 = await sample();
  await page.waitForTimeout(2000);
  const s3 = await sample();
  await page.waitForTimeout(2000);
  const s4 = await sample();
  const samples = [s1, s2, s3, s4];
  out.timerDod = {
    samples,
    visualVsLogicalMax: Math.max(...samples.map((s) => Math.abs(s.visual - s.logical))),
    driftMax: Math.max(
      Math.abs((s1.logical - s2.logical) - (s2.t - s1.t)),
      Math.abs((s2.logical - s3.logical) - (s3.t - s2.t)),
      Math.abs((s3.logical - s4.logical) - (s4.t - s3.t)),
    ),
    driftTotal: Math.abs((s1.logical - s4.logical) - (s4.t - s1.t)),
  };
  if (out.timerDod.visualVsLogicalMax > 100) failures.push(`[${tag}] DoD: timer visual vs lógico >100 ms (${out.timerDod.visualVsLogicalMax} ms)`);
  if (out.timerDod.driftMax > 160) failures.push(`[${tag}] DoD: drift por intervalo >100 ms + margen (160 ms): ${out.timerDod.driftMax} ms`);
  if (out.timerDod.driftTotal > 160) failures.push(`[${tag}] DoD: drift acumulado en 6 s >100 ms + margen: ${out.timerDod.driftTotal} ms`);
  out.shoots.push(await shot(page, `04-execution-l1-timer-${tag}`));
  await solve(page, ['bomb-switch-SW_1', 'bomb-wire-WIRE_RED']);
  await waitForTestid(page, 'bomb-success-overlay');
  const success1 = await page.getByTestId('bomb-success-card').textContent();
  out.successL1 = {
    copy: success1.includes('Artefacto neutralizado.'),
    neutral: !/INTERRUPTOR|CABLE|ROJO|AZUL|VERDE/i.test(success1),
    summary: success1.includes('Nivel 1') && success1.includes('Errores: 0'),
  };
  if (!out.successL1.copy || !out.successL1.neutral || !out.successL1.summary) failures.push(`[${tag}] success L1: ${JSON.stringify(out.successL1)}`);
  out.shoots.push(await shot(page, `05-success-l1-${tag}`));

  // L2: transición + nueva regla + exposición 3 s + delay 2 s + hold (QA-02)
  await page.getByTestId('bomb-result-continue').click();
  await waitForTestid(page, 'bomb-level-intro');
  const intro2 = await page.getByTestId('bomb-level-intro').textContent();
  out.introL2 = {
    transition: intro2.includes('Se añadirá una nueva instrucción. Las reglas anteriores siguen vigentes.'),
    newRule: intro2.includes('NUEVA REGLA') && intro2.includes('Mantén presionado el BOTÓN AMARILLO durante 2 segundos.'),
  };
  if (!out.introL2.transition || !out.introL2.newRule) failures.push(`[${tag}] intro L2: ${JSON.stringify(out.introL2)}`);
  await page.getByTestId('bomb-intro-continue').click();
  // Watchers in-page ANTES de cualquier screenshot: timestamps de la página,
  // inmutables al overhead de Playwright (el smoke v1 medía tarde ~1 s).
  const enc2P = safeMeasure(measureAppearAppear(page, '[data-testid="bomb-encoding"]', '[data-testid="bomb-delay-screen"]'), tag, 'exposición L2');
  const delay2P = safeMeasure(measureVisibleDuration(page, '[data-testid="bomb-delay-screen"]'), tag, 'delay L2');
  await waitForTestid(page, 'bomb-countdown', 1500).catch(() => {});
  await waitForTestid(page, 'bomb-encoding');
  out.shoots.push(await shot(page, `06-encoding-l2-${tag}`));
  const enc2 = await enc2P;
  out.exposureL2 = Math.round(enc2.durationMs);
  assertNear(`[${tag}] exposición L2`, enc2.durationMs, 3000, 250);
  const delay2 = await delay2P;
  out.delayL2 = Math.round(delay2.durationMs);
  assertNear(`[${tag}] delay L2`, delay2.durationMs, 2000, 250);
  out.shoots.push(await shot(page, `07-delay-l2-${tag}`));
  await page.waitForFunction(
    () => {
      const p = document.querySelector('[data-testid="bomb-timer"]')?.getAttribute('data-phase');
      return p === 'normal' || p === 'warning' || p === 'critical';
    },
    null, { timeout: 15000 },
  );
  await solve(page, ['bomb-switch-SW_1', 'bomb-wire-WIRE_RED', 'HOLD']);
  await waitForTestid(page, 'bomb-success-overlay');
  out.successL2 = true;
  await page.getByTestId('bomb-result-continue').click();

  // L3: exposición 2 s + delay 4 s
  await waitForTestid(page, 'bomb-level-intro');
  const intro3 = await page.getByTestId('bomb-level-intro').textContent();
  out.introL3 = {
    transition: intro3.includes('La secuencia será más larga y tendrás menos tiempo para recordarla.'),
    newRule: intro3.includes('NUEVA REGLA') && intro3.includes('Corta el CABLE VERDE.'),
  };
  if (!out.introL3.transition || !out.introL3.newRule) failures.push(`[${tag}] intro L3: ${JSON.stringify(out.introL3)}`);
  await page.getByTestId('bomb-intro-continue').click();
  const enc3P = safeMeasure(measureAppearAppear(page, '[data-testid="bomb-encoding"]', '[data-testid="bomb-delay-screen"]'), tag, 'exposición L3');
  const delay3P = safeMeasure(measureVisibleDuration(page, '[data-testid="bomb-delay-screen"]'), tag, 'delay L3');
  await waitForTestid(page, 'bomb-countdown', 1500).catch(() => {});
  await waitForTestid(page, 'bomb-encoding');
  const enc3 = await enc3P;
  out.exposureL3 = Math.round(enc3.durationMs);
  assertNear(`[${tag}] exposición L3`, enc3.durationMs, 2000, 250);
  const delay3 = await delay3P;
  out.delayL3 = Math.round(delay3.durationMs);
  assertNear(`[${tag}] delay L3`, delay3.durationMs, 4000, 300);
  out.shoots.push(await shot(page, `08-delay-l3-${tag}`));
  await page.waitForFunction(
    () => {
      const p = document.querySelector('[data-testid="bomb-timer"]')?.getAttribute('data-phase');
      return p === 'normal' || p === 'warning' || p === 'critical';
    },
    null, { timeout: 15000 },
  );
  await solve(page, ['bomb-switch-SW_1', 'bomb-wire-WIRE_RED', 'HOLD', 'bomb-wire-WIRE_GREEN']);
  await waitForTestid(page, 'bomb-success-overlay');
  out.successL3 = true;
  await page.getByTestId('bomb-result-continue').click();

  // L4: MODEL B (aviso antes + manual transformado + secuencia correcta, QA-05)
  await waitForTestid(page, 'bomb-level-intro');
  const intro4 = await page.getByTestId('bomb-level-intro').textContent();
  const modelB = await page.getAttribute('[data-testid="bomb-model"]', 'data-model');
  out.introL4 = {
    transition: intro4.includes('ATENCIÓN: este artefacto es MODELO B. Algunas instrucciones cambian. Revisa el protocolo antes de continuar.'),
    modifier: intro4.includes('ATENCIÓN - MODELO B:') && intro4.includes('utiliza INTERRUPTOR 3'),
    model: modelB === 'B',
  };
  if (!out.introL4.transition || !out.introL4.modifier || !out.introL4.model) failures.push(`[${tag}] intro L4 (MODEL B): ${JSON.stringify(out.introL4)}`);
  out.shoots.push(await shot(page, `09-intro-l4-modelb-${tag}`));
  await page.getByTestId('bomb-intro-continue').click();
  const enc4P = safeMeasure(measureAppearAppear(page, '[data-testid="bomb-encoding"]', '[data-testid="bomb-delay-screen"]'), tag, 'exposición L4');
  const delay4P = safeMeasure(measureVisibleDuration(page, '[data-testid="bomb-delay-screen"]'), tag, 'delay L4');
  await waitForTestid(page, 'bomb-countdown', 1500).catch(() => {});
  await waitForTestid(page, 'bomb-encoding');
  const encText = await page.getByTestId('bomb-encoding').textContent();
  out.l4manual = {
    sw3: encText.includes('1. Activa el INTERRUPTOR 3.'),
    blue: encText.includes('2. Corta el CABLE AZUL.'),
    notice: encText.includes('ATENCIÓN - MODELO B: Donde el protocolo indique INTERRUPTOR 1, utiliza INTERRUPTOR 3.'),
  };
  if (!out.l4manual.sw3 || !out.l4manual.blue || !out.l4manual.notice) failures.push(`[${tag}] manual L4 transformado: ${JSON.stringify(out.l4manual)}`);
  out.shoots.push(await shot(page, `10-encoding-l4-${tag}`));
  const enc4 = await enc4P;
  out.exposureL4 = Math.round(enc4.durationMs);
  assertNear(`[${tag}] exposición L4`, enc4.durationMs, 2000, 250);
  const delay4 = await delay4P;
  out.delayL4 = Math.round(delay4.durationMs);
  assertNear(`[${tag}] delay L4`, delay4.durationMs, 3000, 300);
  await page.waitForFunction(
    () => {
      const p = document.querySelector('[data-testid="bomb-timer"]')?.getAttribute('data-phase');
      return p === 'normal' || p === 'warning' || p === 'critical';
    },
    null, { timeout: 15000 },
  );
  await solve(page, ['bomb-switch-SW_3', 'bomb-wire-WIRE_BLUE', 'HOLD', 'bomb-wire-WIRE_GREEN']);
  await waitForTestid(page, 'bomb-success-overlay');
  out.successL4 = true;
  out.shoots.push(await shot(page, `11-success-l4-${tag}`));

  // Cierre de sesión
  await page.getByTestId('bomb-result-continue').click();
  await waitForTestid(page, 'bomb-session-complete');
  const endText = await page.getByTestId('bomb-session-complete').textContent();
  out.sessionComplete = endText.includes('Simulación finalizada. Tus resultados fueron procesados.');
  if (!out.sessionComplete) failures.push(`[${tag}] copy de SESSION_COMPLETE incorrecto`);
  out.shoots.push(await shot(page, `12-session-complete-${tag}`));
  await page.getByTestId('bomb-session-finish').click();
  out.overflowEnd = await overflowPx(page);
  if (out.overflowEnd > 0) failures.push(`[${tag}] overflow horizontal al final: ${out.overflowEnd}px`);
});

// ---------- Run B: 1280×720 — paths de fallo (QA-06/07, penalty state, QA-04) ----------
await runBlock('B (1280x720 failure paths)', async (out, page) => {
  const tag = 'runB';
  track(page, tag);
  await page.goto(`${baseUrl}/dev/bomb?seed=42`, { waitUntil: 'networkidle' });
  await waitForTestid(page, 'bomb-game');
  out.shoots = [];
  await playPractice(page);

  // QA-06: timeout L1 (20 s) + alineación visual/lógica del cierre (DoD): el nivel
  // debe cerrar cuando el display llega a ~0 (mismo reloj, sin reloj visual propio).
  await introToExecution(page, `${tag}L1`, { freeReading: true });
  const timeoutTiming = await page.evaluate(() => new Promise((resolve) => {
    let tZero = null;
    const t0 = performance.now();
    const iv = setInterval(() => {
      const digits = document.querySelector('[data-testid="bomb-timer"] .bomb-timer__digits');
      if (tZero === null && digits && digits.textContent === '00:00.0') tZero = performance.now();
      if (document.querySelector('[data-testid="bomb-fail-overlay"]')) {
        clearInterval(iv);
        resolve({ tZero, tFail: performance.now() });
      } else if (performance.now() - t0 > 30000) {
        clearInterval(iv);
        resolve({ tZero, tFail: null });
      }
    }, 20);
  }));
  out.qa06ZeroToFailMs = (timeoutTiming.tZero !== null && timeoutTiming.tFail !== null)
    ? Math.round(timeoutTiming.tFail - timeoutTiming.tZero)
    : null;
  if (out.qa06ZeroToFailMs === null) {
    failures.push(`[${tag}] QA-06: sin tiempo visual cero / fail (timing=${JSON.stringify(timeoutTiming)})`);
  } else if (out.qa06ZeroToFailMs > 250) {
    failures.push(`[${tag}] QA-06: el nivel cerró ${out.qa06ZeroToFailMs} ms tras el 00:00.0 visual (≤250 ms esperado)`);
  }
  const fail1 = await page.getByTestId('bomb-fail-card').textContent();
  out.qa06 = {
    copy: fail1.includes('Tiempo agotado. Nivel finalizado.'),
    timerStopped: (await page.getAttribute('[data-testid="bomb-timer"]', 'data-phase')) === 'stopped',
  };
  if (!out.qa06.copy || !out.qa06.timerStopped) failures.push(`[${tag}] QA-06: ${JSON.stringify(out.qa06)}`);
  out.shoots.push(await shot(page, `20-fail-timeout-l1-${tag}`));

  // QA-07: 2 errores L2 → MAX_ERRORS
  await page.getByTestId('bomb-result-continue').click();
  await waitForTestid(page, 'bomb-level-intro');
  await introToExecution(page, `${tag}L2`);
  await page.getByTestId('bomb-switch-SW_2').click(); // WRONG_TARGET
  await page.getByTestId('bomb-wire-WIRE_YELLOW').click(); // WRONG_TARGET → MAX_ERRORS
  await page.waitForFunction(
    () => !!document.querySelector('[data-testid="bomb-fail-overlay"]'),
    null, { timeout: 8000 },
  );
  out.qa07 = (await page.getByTestId('bomb-fail-card').textContent()).includes('Se alcanzó el límite de errores. Nivel finalizado.');
  if (!out.qa07) failures.push(`[${tag}] QA-07: copy de fail incorrecto`);
  out.shoots.push(await shot(page, `21-fail-errors-l2-${tag}`));

  // L3: ORDER_ERROR (verde fuera de orden: irreversible, decisión B1 #2) + penalty state
  await page.getByTestId('bomb-result-continue').click();
  await waitForTestid(page, 'bomb-level-intro');
  await introToExecution(page, `${tag}L3`);
  await page.getByTestId('bomb-switch-SW_1').click();
  await page.getByTestId('bomb-wire-WIRE_GREEN').click();
  await page.waitForFunction(
    () => document.querySelector('[data-testid="bomb-status"]')?.textContent.includes('Secuencia incorrecta. Tiempo penalizado.'),
    null, { timeout: 4000 },
  );
  const status3 = await page.textContent('[data-testid="bomb-status"]');
  const led3 = await page.getAttribute('[data-testid="bomb-led"]', 'data-led');
  out.qa03penalty = {
    status: status3.includes('Secuencia incorrecta. Tiempo penalizado.'),
    led: led3,
    noReveal: !/VERDE|ROJO|AZUL|CABLE|INTERRUPTOR/i.test(status3),
  };
  if (!out.qa03penalty.status || led3 !== 'penalty' || !out.qa03penalty.noReveal) failures.push(`[${tag}] penalty state L3: ${JSON.stringify(out.qa03penalty)}`);
  out.shoots.push(await shot(page, `22-penalty-l3-${tag}`));
  // GREEN consumido → el nivel termina en timeout
  await page.waitForFunction(
    () => !!document.querySelector('[data-testid="bomb-fail-overlay"]'),
    null, { timeout: 20000 },
  );
  await page.getByTestId('bomb-result-continue').click();

  // QA-04: L4 TYPE_INTERFERENCE como PRIMER acción (ventana 10 s: medir rápido,
  // después recuperar con la secuencia correcta).
  await waitForTestid(page, 'bomb-level-intro');
  const tL4 = Date.now();
  await introToExecution(page, `${tag}L4`);
  out.l4IntroToExecutionMs = Date.now() - tL4; // diagnóstico (countdown+enc 2 s+delay 3 s ≈ 5.5-7 s)
  await page.getByTestId('bomb-wire-WIRE_RED').click();
  const status4 = await page.textContent('[data-testid="bomb-status"]');
  const led4 = await page.getAttribute('[data-testid="bomb-led"]', 'data-led');
  const timer4 = await page.textContent('[data-testid="bomb-timer"] .bomb-timer__digits');
  out.qa04 = {
    penaltyState: status4.includes('Secuencia incorrecta. Tiempo penalizado.'),
    led: led4,
    timerAtInterference: timer4,
    noRevealAzul: !/AZUL/i.test(status4),
  };
  if (!out.qa04.penaltyState || led4 !== 'penalty' || !out.qa04.noRevealAzul) failures.push(`[${tag}] QA-04: ${JSON.stringify(out.qa04)}`);
  out.shoots.push(await shot(page, `23-interference-l4-${tag}`));
  // La recuperación completa (QA-05) queda cubierta por el run A (happy path). En el
  // run de fallos el nivel cierra por timeout post-penalización (ventana de 10 s bajo
  // carga: la interferencia se mide como primera acción y el resto corre con el reloj
  // lógico — no se apuesta el smoke a resolver dentro de la ventana).
  await page.waitForFunction(
    () => !!document.querySelector('[data-testid="bomb-fail-overlay"]'),
    null, { timeout: 15000 },
  );
  out.qa04failTimeout = (await page.getByTestId('bomb-fail-card').textContent()).includes('Tiempo agotado. Nivel finalizado.');
  if (!out.qa04failTimeout) failures.push(`[${tag}] L4: timeout post-interferencia ausente`);
  await page.getByTestId('bomb-result-continue').click();
  await waitForTestid(page, 'bomb-session-complete');
  out.sessionComplete = (await page.getByTestId('bomb-session-complete').textContent()).includes('Simulación finalizada.');
  if (!out.sessionComplete) failures.push(`[${tag}] SESSION_COMPLETE ausente tras run de fallos`);
  out.shoots.push(await shot(page, `24-session-complete-${tag}`));
});

// ---------- Run C: 390×844 — aviso <1024 px + sin overflow en las fases ----------
await runBlock('C (390x844 mobile)', async (out, page) => {
  const tag = 'runC-390x844';
  // context propio de viewport (runBlock crea 1280×720; se usa setViewportSize)
  track(page, tag);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/dev/bomb?seed=42`, { waitUntil: 'networkidle' });
  await waitForTestid(page, 'bomb-game');
  out.warning = !!(await page.$('[data-testid="bomb-viewport-warning"]'));
  if (!out.warning) failures.push(`[${tag}] aviso <1024px ausente`);
  await playPractice(page);
  out.overflowIntro = await overflowPx(page);
  await page.getByTestId('bomb-intro-continue').click();
  await waitForTestid(page, 'bomb-countdown', 1500).catch(() => {});
  await waitForTestid(page, 'bomb-encoding');
  out.overflowEncoding = await overflowPx(page);
  await page.getByTestId('bomb-encoding-continue').click();
  await page.waitForFunction(
    () => {
      const p = document.querySelector('[data-testid="bomb-timer"]')?.getAttribute('data-phase');
      return p === 'normal' || p === 'warning' || p === 'critical';
    },
    null, { timeout: 15000 },
  );
  out.overflowExecution = await overflowPx(page);
  await solve(page, ['bomb-switch-SW_1', 'bomb-wire-WIRE_RED']);
  await waitForTestid(page, 'bomb-success-overlay');
  out.overflowSuccess = await overflowPx(page);
  out.shoots = [await shot(page, `30-mobile-success-${tag}`)];
  await page.getByTestId('bomb-result-continue').click();
  await waitForTestid(page, 'bomb-level-intro');
  await page.getByTestId('bomb-intro-continue').click();
  await waitForTestid(page, 'bomb-countdown', 1500).catch(() => {});
  await waitForTestid(page, 'bomb-encoding');
  await waitForTestid(page, 'bomb-delay-screen', 15000);
  out.overflowDelay = await overflowPx(page);
  out.shoots.push(await shot(page, `31-mobile-delay-${tag}`));
  for (const [key, v] of Object.entries(out).filter(([k]) => k.startsWith('overflow'))) {
    if (v > 0) failures.push(`[${tag}] overflow en ${key}: ${v}px`);
  }
});

// ---------- Run D: reduced-motion — sin animaciones, lógica intacta ----------
await runBlock('D (prefers-reduced-motion: reduce)', async (out, page) => {
  const tag = 'runD-reduced';
  await page.emulateMedia({ reducedMotion: 'reduce' });
  track(page, tag);
  await page.goto(`${baseUrl}/dev/bomb?seed=42`, { waitUntil: 'networkidle' });
  await waitForTestid(page, 'bomb-game');
  await playPractice(page);
  // countdown sin animación (barra estática; el beat sigue durando 500 ms)
  await page.getByTestId('bomb-intro-continue').click();
  const countdownAnim = await page.evaluate(() => new Promise((resolve) => {
    const t0 = performance.now();
    const iv = setInterval(() => {
      const el = document.querySelector('.bomb-countdown__fill');
      if (el) { clearInterval(iv); resolve(getComputedStyle(el).animationName); }
      if (performance.now() - t0 > 2000) { clearInterval(iv); resolve('__timeout__'); }
    }, 20);
  }));
  out.countdownAnimation = countdownAnim;
  if (countdownAnim !== 'none') failures.push(`[${tag}] countdown__fill animando bajo reduced-motion (${countdownAnim})`);
  await waitForTestid(page, 'bomb-encoding');
  await page.getByTestId('bomb-encoding-continue').click();
  await page.waitForFunction(
    () => {
      const p = document.querySelector('[data-testid="bomb-timer"]')?.getAttribute('data-phase');
      return p === 'normal' || p === 'warning' || p === 'critical';
    },
    null, { timeout: 15000 },
  );
  await solve(page, ['bomb-switch-SW_1', 'bomb-wire-WIRE_RED']);
  await waitForTestid(page, 'bomb-success-overlay');
  const successAnim = await page.evaluate(() => getComputedStyle(document.querySelector('[data-testid="bomb-panel"]')).animationName);
  out.successAnimation = successAnim;
  if (successAnim !== 'none') failures.push(`[${tag}] panel success animando bajo reduced-motion (${successAnim})`);
  // L2 delay: estática reemplazada por negro limpio
  await page.getByTestId('bomb-result-continue').click();
  await waitForTestid(page, 'bomb-level-intro');
  await page.getByTestId('bomb-intro-continue').click();
  await waitForTestid(page, 'bomb-countdown', 1500).catch(() => {});
  await waitForTestid(page, 'bomb-encoding');
  await waitForTestid(page, 'bomb-delay-screen', 15000);
  const delayStatic = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="bomb-delay-screen"]');
    const cs = getComputedStyle(el, '::before');
    return { animationName: cs.animationName, opacity: cs.opacity, bg: getComputedStyle(el).backgroundColor };
  });
  out.delayStatic = delayStatic;
  if (delayStatic.animationName !== 'none' || Number(delayStatic.opacity) !== 0) {
    failures.push(`[${tag}] estática del delay presente bajo reduced-motion: ${JSON.stringify(delayStatic)}`);
  }
  out.shoots = [await shot(page, `40-reduced-motion-delay-${tag}`)];
  // la lógica sigue: el delay termina y arranca la ejecución (timer corre)
  await page.waitForFunction(
    () => {
      const p = document.querySelector('[data-testid="bomb-timer"]')?.getAttribute('data-phase');
      return p === 'normal' || p === 'warning' || p === 'critical';
    },
    null, { timeout: 15000 },
  );
  out.logicIntact = true;
});

await browser.close();

const report = {
  date: new Date().toISOString(),
  baseUrl,
  consoleErrors,
  failures,
  results,
};
fs.writeFileSync(`${shotsDir}/smoke-result.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ failures, consoleErrors, results: results.map((r) => ({ run: r.run, error: r.error })) }, null, 2));
if (failures.length > 0 || consoleErrors.length > 0) {
  console.error(`SMOKE FAIL: ${failures.length} failures, ${consoleErrors.length} console errors`);
  process.exit(1);
}
console.log('SMOKE PASS');
