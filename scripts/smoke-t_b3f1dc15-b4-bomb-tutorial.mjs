// t_b3f1dc15 (EXP-7 BOMB B4) smoke — tutorial T1-T5 + welcome sobre el stage real
// vía /dev/bomb (sin batería; telemetría solo en memoria).
//
// Spec (ley): Doc 1 §5.1 (INPUT_RESTART_TUTORIAL), §7 (BOOT → TUTORIAL_INTRO →
// TUTORIAL_PLAY → TUTORIAL_RESULT), §10.1 (repetir tutorial sin scoring), §16.2
// (DoD: el tutorial no alimenta scores evaluativos).
// Doc 2 §4.1 (bienvenida, copy exacto), §4.2 (nodos T1-T5 + criterios de avance),
// §4.3 (salida, copy exacto), §7 (anillo del hold SOLO en tutorial), §18
// (tutorial_replay_count), §14 (reduced-motion), §15 (responsive).
//
// Cobertura:
//  A (1280×720, seed=42): flujo de aceptación welcome → T1-T5 → L1 sin errores de
//    consola; copy exacto §4.1/§4.2/§4.3; panel fresh en T4; T3/T5 con anillo;
//    T5 lectura ≈3000 ms + delay ≈1500 ms (medición in-page); ajustes §4.1
//    (toggle de audio); overflow 0.
//  B (1280×720): replay — overlay (T4) y modal de salida (TUTORIAL_REPLAY): vuelve
//    a T1 con panel fresh; 0 console errors.
//  C (390×844): aviso <1024 px + overflow 0 en welcome / overlay T1 / T5 lectura /
//    delay / modal §4.3.
//  D (reduced-motion): tutorial completo con estática del delay en negro limpio y
//    lógica intacta (llega al modal §4.3); 0 console errors.
//
// Robustez: cada run va en try/catch (un timeout no mata el reporte); siempre se
// escribe smoke-result.json.
// Salida: docs/qa/b4-bomb-tutorial/smoke-result.json + screenshots. Exit 1 si hay fallos.

import { chromium } from '@playwright/test';
import fs from 'node:fs';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:5173';
const shotsDir = 'docs/qa/b4-bomb-tutorial';
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

/** Secuencia SW1 → RED → hold 2000 ms (en el estado actual). */
async function seq(page) {
  await page.getByTestId('bomb-switch-SW_1').click();
  await page.getByTestId('bomb-wire-WIRE_RED').click();
  await holdYellow(page, 2000);
}

const COPY = {
  welcome: {
    title: 'Simulación de Protocolo Operativo: Desactivación',
    sub: 'Memoriza el protocolo y ejecuta cada paso en el orden indicado.',
    message: 'Las instrucciones pueden desaparecer antes de que puedas interactuar con el panel. Revisa con atención el tipo de artefacto y el tiempo disponible.',
    cta: 'Iniciar práctica',
    secondary: 'Ajustes de audio / accesibilidad',
  },
  nodes: {
    T1: 'Activa el Interruptor 1.',
    T2: 'Corta el cable rojo.',
    T3: 'Mantén presionado el botón amarillo durante 2 segundos.',
    T4: 'Ahora ejecuta: SW1 → Rojo → Amarillo.',
    T5: 'Lee la secuencia. La pantalla se ocultará brevemente.',
  },
  done: 'Práctica completada. Desde el siguiente nivel, tus tiempos y decisiones serán registrados. Las instrucciones pueden cambiar según el tipo de artefacto.',
  startEval: 'Comenzar evaluación',
  repeat: 'Repetir práctica',
};

async function expectCopy(page, tag, key, expected) {
  const text = await page.textContent('[data-testid="bomb-tutorial-instruction"]').catch(() => null);
  const ok = typeof text === 'string' && text.includes(expected);
  if (!ok) failures.push(`[${tag}] copy ${key} ausente (esperado "${expected}", recibido "${text}")`);
  return ok;
}

/**
 * Welcome → tutorial completo T1-T5 → modal de salida §4.3. Con verificaciones de
 * copy/panel/mediciones según el flag `checks` (A las ejercita todas; C/D lo minimal).
 */
async function playTutorialToModal(page, tag, checks = false) {
  // Welcome §4.1
  await page.getByTestId('bomb-start-practice').click();
  await page.waitForFunction(() => {
    const b = document.querySelector('[data-testid="bomb-switch-SW_1"]');
    return b && !b.disabled;
  }, null, { timeout: 8000 });
  const out = {};
  if (checks) {
    out.t1 = await expectCopy(page, tag, 't1', COPY.nodes.T1);
    await page.getByTestId('bomb-switch-SW_1').click();
    out.t2 = await expectCopy(page, tag, 't2', COPY.nodes.T2);
    await page.getByTestId('bomb-wire-WIRE_RED').click();
    out.t3 = await expectCopy(page, tag, 't3', COPY.nodes.T3);
    // T3: anillo del hold (Doc 2 §7: SOLO en tutorial)
    const holdBox = await page.getByTestId('bomb-hold-btn').boundingBox();
    await page.mouse.move(holdBox.x + holdBox.width / 2, holdBox.y + holdBox.height / 2);
    await page.mouse.down();
    await page.waitForFunction(
      () => !!document.querySelector('[data-testid="bomb-hold-ring"]'),
      null, { timeout: 3000 },
    ).then(() => { out.t3ring = true; }, () => { out.t3ring = false; failures.push(`[${tag}] anillo del hold ausente en T3`); });
    await page.waitForTimeout(2000);
    await page.mouse.up();
    // S2: T4 — panel FRESH + overlay exacto
    out.t4 = await expectCopy(page, tag, 't4', COPY.nodes.T4);
    const t4node = await page.textContent('[data-testid="bomb-tutorial-node"]');
    out.t4node = t4node.includes('T4');
    if (!out.t4node) failures.push(`[${tag}] nodo T4 ausente (recibido "${t4node}")`);
    out.t4fresh = (await page.getAttribute('[data-testid="bomb-switch-SW_1"]', 'aria-pressed')) === 'false'
      && (await page.textContent('[data-testid="bomb-wire-WIRE_RED"]')).includes('INTACT');
    if (!out.t4fresh) failures.push(`[${tag}] T4: panel no está fresh (estado heredado de T1-T3)`);
    out.shoots = out.shoots || [];
    out.shoots.push(await shot(page, `20-t4-${tag}`));
  }
  // T5: medir lectura + delay ANTES del último hold de T4 (los watchers se arman a tiempo)
  let readMs = null;
  let delayMs = null;
  if (checks) {
    const readP = safeMeasure(measureVisibleDurationInPage(page, '[data-testid="bomb-encoding"]', 12000), tag, 'lectura T5');
    const delayP = safeMeasure(measureVisibleDurationInPage(page, '[data-testid="bomb-delay-screen"]', 12000), tag, 'delay T5');
    await seq(page); // T4 → S3
    [readMs, delayMs] = await Promise.all([readP, delayP]);
    out.readMs = Math.round(readMs?.durationMs ?? -1);
    out.delayMs = Math.round(delayMs?.durationMs ?? -1);
    if (!assertNear('lectura T5', out.readMs, 3000, 350)) failures.push(`[${tag}] lectura T5 fuera de rango: ${out.readMs} ms (esperado 3000±350)`);
    if (!assertNear('delay T5', out.delayMs, 1500, 350)) failures.push(`[${tag}] delay T5 fuera de rango: ${out.delayMs} ms (esperado 1500±350)`);
    // T5: caption + manual visible durante la lectura ya no (delay) → esperar ejecución
    out.shoots = out.shoots || [];
  } else {
    await seq(page); // T4 → S3
    await page.waitForFunction(() => {
      const b = document.querySelector('[data-testid="bomb-switch-SW_1"]');
      return b && !b.disabled && !b.hasAttribute('aria-disabled');
    }, null, { timeout: 15000 });
  }
  if (checks) {
    // Ejecución T5: manual oculto (···) + anillo presente al presionar (tutorial)
    out.t5execManualHidden = (await page.textContent('[data-testid="bomb-manual-placeholder"]')).includes('···');
    if (!out.t5execManualHidden) failures.push(`[${tag}] T5 ejecución: manual no oculto`);
    out.shoots.push(await shot(page, `21-t5-execution-${tag}`));
  }
  await seq(page); // T5 ejecución
  await waitForTestid(page, 'bomb-practice-done');
  if (checks) {
    const modalText = await page.textContent('[data-testid="bomb-practice-done"]');
    out.doneModal = modalText.includes(COPY.done);
    if (!out.doneModal) failures.push(`[${tag}] modal §4.3: copy inexacto (recibido "${modalText.slice(0, 160)}")`);
    out.doneButtons = !!(await page.$('[data-testid="bomb-start-evaluation"]')) && !!(await page.$('[data-testid="bomb-practice-restart"]'));
    if (!out.doneButtons) failures.push(`[${tag}] modal §4.3: botones "Comenzar evaluación"/"Repetir práctica" ausentes`);
    out.shoots.push(await shot(page, `22-done-modal-${tag}`));
  }
  return out;
}

function assertNear(label, actual, expected, tol) {
  if (typeof actual !== 'number' || actual < 0 || Math.abs(actual - expected) > tol) return false;
  return true;
}

// Mide la duración visible de sel (aparece → desaparece) — watcher IN-PAGE
// (inmune al overhead de Playwright; misma técnica que el smoke B3).
function measureVisibleDurationInPage(page, sel, timeoutMs = 15000) {
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

// ---------- Run A: 1280×720 — flujo de aceptación welcome → T1-T5 → L1 ----------
await runBlock('A (1280x720 welcome→T5→L1, seed=42)', async (out, page) => {
  const tag = 'runA';
  track(page, tag);
  await page.goto(`${baseUrl}/dev/bomb?seed=42`, { waitUntil: 'networkidle' });
  await waitForTestid(page, 'bomb-game');
  out.overflowWelcome = await overflowPx(page);
  if (out.overflowWelcome > 0) failures.push(`[${tag}] overflow en welcome: ${out.overflowWelcome}px`);

  // §4.1: copy exacto (título/bajada/mensaje/CTA/secundario) + ajustes
  const welcomeText = await page.textContent('[data-testid="bomb-welcome"]');
  out.welcomeCopy = {
    title: welcomeText.includes(COPY.welcome.title),
    sub: welcomeText.includes(COPY.welcome.sub),
    message: welcomeText.includes(COPY.welcome.message),
  };
  if (!Object.values(out.welcomeCopy).every(Boolean)) {
    failures.push(`[${tag}] welcome §4.1 incompleto: ${JSON.stringify(out.welcomeCopy)}`);
  }
  out.welcomeCta = (await page.textContent('[data-testid="bomb-start-practice"]')).includes(COPY.welcome.cta);
  out.welcomeSecondary = (await page.textContent('[data-testid="bomb-welcome-secondary"]')).includes(COPY.welcome.secondary);
  if (!out.welcomeCta || !out.welcomeSecondary) failures.push(`[${tag}] welcome CTA/secundario: ${JSON.stringify({ out })}`);
  out.shoots = [await shot(page, `01-welcome-${tag}`)];
  await page.getByTestId('bomb-welcome-secondary').click();
  await waitForTestid(page, 'bomb-settings', 3000);
  out.settings = {
    audio: !!(await page.$('[data-testid="bomb-settings-audio"]')),
    a11y: !!(await page.$('[data-testid="bomb-settings-a11y"]')),
  };
  // toggle de audio funcional (estado cambia en la UI)
  const before = await page.textContent('[data-testid="bomb-settings-audio"]');
  await page.getByTestId('bomb-settings-audio').click();
  const after = await page.textContent('[data-testid="bomb-settings-audio"]');
  out.audioToggle = before.trim() !== after.trim();
  if (!out.audioToggle) failures.push(`[${tag}] toggle de audio no cambia estado (antes "${before}", después "${after}")`);
  out.shoots.push(await shot(page, `02-settings-${tag}`));

  // Tutorial T1-T5 con checks (copy nodos, panel fresh T4, anillo T3, lect/delay T5, modal §4.3)
  const tut = await playTutorialToModal(page, tag, true);
  const keepShots = out.shoots;
  Object.assign(out, tut);
  out.shoots = [...keepShots, ...(tut.shoots ?? [])];

  // §4.3 → "Comenzar evaluación" → L1 (flujo de aceptación welcome→T5→L1)
  await page.getByTestId('bomb-start-evaluation').click();
  await waitForTestid(page, 'bomb-level-intro');
  const introText = await page.textContent('[data-testid="bomb-level-intro"]');
  out.l1 = { level: introText.includes('Nivel 1 de 4'), transition: introText.includes('Primero aprenderás el protocolo base del MODELO A.') };
  if (!out.l1.level || !out.l1.transition) failures.push(`[${tag}] intro L1 tras tutorial: ${JSON.stringify(out.l1)}`);
  out.shoots.push(await shot(page, `23-l1-intro-${tag}`));
  out.overflowL1 = await overflowPx(page);
  if (out.overflowL1 > 0) failures.push(`[${tag}] overflow en intro L1: ${out.overflowL1}px`);
});

// ---------- Run B: 1280×720 — replay (overlay en T4 + modal de salida) ----------
await runBlock('B (1280x720 replay)', async (out, page) => {
  const tag = 'runB-replay';
  track(page, tag);
  await page.goto(`${baseUrl}/dev/bomb?seed=42`, { waitUntil: 'networkidle' });
  await waitForTestid(page, 'bomb-game');
  await page.getByTestId('bomb-start-practice').click();
  await page.waitForFunction(() => {
    const b = document.querySelector('[data-testid="bomb-switch-SW_1"]');
    return b && !b.disabled;
  }, null, { timeout: 8000 });
  // S1 → T4, con progreso en T4 (SW1 accionado)
  await seq(page);
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-testid="bomb-tutorial-node"]');
    return el && el.textContent.includes('T4');
  }, null, { timeout: 8000 });
  await page.getByTestId('bomb-switch-SW_1').click();
  out.sw1AtT4 = (await page.getAttribute('[data-testid="bomb-switch-SW_1"]', 'aria-pressed')) === 'true';
  // Replay desde el overlay (INPUT_RESTART_TUTORIAL)
  await page.getByTestId('bomb-tutorial-restart').click();
  const t1text = await page.textContent('[data-testid="bomb-tutorial-instruction"]');
  out.replayOverlay = t1text.includes(COPY.nodes.T1);
  out.replayPanelFresh = (await page.getAttribute('[data-testid="bomb-switch-SW_1"]', 'aria-pressed')) === 'false';
  if (!out.replayOverlay || !out.replayPanelFresh) {
    failures.push(`[${tag}] replay overlay: ${JSON.stringify({ out })}`);
  }
  out.shoots = [await shot(page, `10-replay-overlay-${tag}`)];
  // Tutorial completo de nuevo → modal §4.3 → replay desde el modal
  await seq(page); // S1 (T1-T3)
  await seq(page); // S2 (T4)
  await page.waitForFunction(() => {
    const b = document.querySelector('[data-testid="bomb-switch-SW_1"]');
    return b && !b.disabled && !b.hasAttribute('aria-disabled');
  }, null, { timeout: 15000 }); // T5 ejecución (lectura+delay auto)
  await seq(page); // S3 (T5)
  await waitForTestid(page, 'bomb-practice-done');
  await page.getByTestId('bomb-practice-restart').click();
  const t1again = await page.textContent('[data-testid="bomb-tutorial-instruction"]');
  out.replayModal = t1again.includes(COPY.nodes.T1)
    && (await page.getAttribute('[data-testid="bomb-switch-SW_1"]', 'aria-pressed')) === 'false';
  if (!out.replayModal) failures.push(`[${tag}] replay modal: no vuelve a T1 con panel fresh`);
  out.shoots.push(await shot(page, `11-replay-modal-${tag}`));
});

// ---------- Run C: 390×844 — aviso <1024 px + overflow 0 en pantallas del tutorial ----------
await runBlock('C (390x844 mobile)', async (out, page) => {
  const tag = 'runC-390x844';
  track(page, tag);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/dev/bomb?seed=42`, { waitUntil: 'networkidle' });
  await waitForTestid(page, 'bomb-game');
  out.warning = !!(await page.$('[data-testid="bomb-viewport-warning"]'));
  if (!out.warning) failures.push(`[${tag}] aviso <1024px ausente`);
  out.overflowWelcome = await overflowPx(page);
  out.shoots = [await shot(page, `30-mobile-welcome-${tag}`)];
  // T1 overlay
  await page.getByTestId('bomb-start-practice').click();
  await page.waitForFunction(() => {
    const b = document.querySelector('[data-testid="bomb-switch-SW_1"]');
    return b && !b.disabled;
  }, null, { timeout: 8000 });
  out.overflowT1 = await overflowPx(page);
  out.shoots.push(await shot(page, `31-mobile-t1-${tag}`));
  // T5 (lectura 3 s + delay 1.5 s auto)
  await seq(page);
  await seq(page);
  out.overflowT5Read = await overflowPx(page);
  out.shoots.push(await shot(page, `32-mobile-t5-read-${tag}`));
  await page.waitForFunction(() => {
    const b = document.querySelector('[data-testid="bomb-switch-SW_1"]');
    return b && !b.disabled && !b.hasAttribute('aria-disabled');
  }, null, { timeout: 15000 }); // T5 ejecución
  out.overflowT5Exec = await overflowPx(page);
  await seq(page);
  await waitForTestid(page, 'bomb-practice-done');
  out.overflowDoneModal = await overflowPx(page);
  out.shoots.push(await shot(page, `33-mobile-done-${tag}`));
  for (const [key, v] of Object.entries(out).filter(([k]) => k.startsWith('overflow'))) {
    if (v > 0) failures.push(`[${tag}] overflow en ${key}: ${v}px`);
  }
});

// ---------- Run D: reduced-motion — tutorial completo, estática del delay en negro limpio ----------
await runBlock('D (prefers-reduced-motion: reduce)', async (out, page) => {
  const tag = 'runD-reduced';
  await page.emulateMedia({ reducedMotion: 'reduce' });
  track(page, tag);
  await page.goto(`${baseUrl}/dev/bomb?seed=42`, { waitUntil: 'networkidle' });
  await waitForTestid(page, 'bomb-game');
  await page.getByTestId('bomb-start-practice').click();
  await page.waitForFunction(() => {
    const b = document.querySelector('[data-testid="bomb-switch-SW_1"]');
    return b && !b.disabled;
  }, null, { timeout: 8000 });
  await seq(page);
  await seq(page);
  // T5: delay visible bajo reduced-motion → estática apagada (negro limpio)
  await waitForTestid(page, 'bomb-delay-screen', 12000);
  const delayStatic = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="bomb-delay-screen"]');
    const cs = getComputedStyle(el, '::before');
    return { animationName: cs.animationName, opacity: cs.opacity };
  });
  out.delayStatic = delayStatic;
  out.shoots = [await shot(page, `40-reduced-delay-${tag}`)];
  if (delayStatic.animationName !== 'none' || Number(delayStatic.opacity) !== 0) {
    failures.push(`[${tag}] estática del delay presente bajo reduced-motion: ${JSON.stringify(delayStatic)}`);
  }
  // La lógica sigue: lectura/delay terminan y la ejecución arranca (motor, sin animación)
  await page.waitForFunction(() => {
    const b = document.querySelector('[data-testid="bomb-switch-SW_1"]');
    return b && !b.disabled && !b.hasAttribute('aria-disabled');
  }, null, { timeout: 15000 });
  await seq(page);
  await waitForTestid(page, 'bomb-practice-done');
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
process.exit(0);
