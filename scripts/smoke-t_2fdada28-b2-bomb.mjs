// t_2fdada28 (EXP-7 BOMB B2) smoke — panel + HUD + accesibilidad sobre el
// stage real vía /dev/bomb (sin batería, sin evaluación).
//
// Spec (ley): Doc 2 §15 (baseline 1280×720; aviso <1024px), §14 (a11y: hitbox
// ≥44px, foco visible, reduced-motion, audio opcional), §16 (timer sin saltos
// de layout), §20 (QA visual/DoD). Card: smoke 1280×720 + aviso <1024px;
// estados hover/focus/disabled; chrome shared (sfx-toggle).
//
// Viewports: 1280×720 (baseline) · 390×844 (móvil: aviso + 1 columna) ·
// 1000×700 (<1024 con 2 columnas) · reduced-motion.
// Salida: JSON { viewport, failures, consoleErrors, ... }. Exit 1 si hay fallos.

import { chromium } from '@playwright/test';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:5173';
const shotsDir = 'docs/qa/b2-bomb-panel-hud';
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

const EXPECTED_MANUAL_LINES = [
  '1. Activa el INTERRUPTOR 1.',
  '2. Corta el CABLE ROJO.',
  '3. Mantén presionado el BOTÓN AMARILLO durante 2 segundos.',
];

// ---------- 1280×720 (baseline de evaluación, spec §15) ----------
{
  const tag = '1280x720';
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  track(page, tag);
  const out = { viewport: tag };
  await page.goto(`${baseUrl}/dev/bomb`, { waitUntil: 'networkidle' });
  await page.getByTestId('bomb-game').waitFor({ timeout: 25000 });

  // BOOT: welcome, panel bloqueado, MODEL A, timer idle, LED neutral, sin aviso
  const boot = await page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    return {
      welcome: !!q('[data-testid="bomb-welcome"]'),
      sw1Disabled: q('[data-testid="bomb-switch-SW_1"]')?.disabled ?? null,
      holdDisabled: q('[data-testid="bomb-hold-btn"]')?.disabled ?? null,
      model: q('[data-testid="bomb-model"]')?.getAttribute('data-model'),
      timerPhase: q('[data-testid="bomb-timer"]')?.getAttribute('data-phase'),
      led: q('[data-testid="bomb-led"]')?.getAttribute('data-led'),
      warning: !!q('[data-testid="bomb-viewport-warning"]'),
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      gameRight: Math.round(q('.bomb-game').getBoundingClientRect().right),
      vpW: window.innerWidth,
    };
  });
  out.boot = boot;
  if (!boot.welcome) failures.push(`[${tag}] BOOT: welcome ausente`);
  if (boot.sw1Disabled !== true || boot.holdDisabled !== true) failures.push(`[${tag}] BOOT: controles no bloqueados`);
  if (boot.model !== 'A') failures.push(`[${tag}] BOOT: MODEL esperado A, recibido ${boot.model}`);
  if (boot.timerPhase !== 'idle') failures.push(`[${tag}] BOOT: timer phase esperado idle, recibido ${boot.timerPhase}`);
  if (boot.led !== 'neutral') failures.push(`[${tag}] BOOT: LED esperado neutral, recibido ${boot.led}`);
  if (boot.warning) failures.push(`[${tag}] BOOT: aviso <1024px visible en 1280 (no debe)`);
  if (boot.overflow > 0) failures.push(`[${tag}] overflow horizontal: ${boot.overflow}px`);
  if (boot.gameRight > boot.vpW + 1) failures.push(`[${tag}] .bomb-game desborda (right=${boot.gameRight} > ${boot.vpW})`);
  out.shoots = await shot(page, `01-boot-${tag}`);

  // Iniciar práctica → panel habilitado + manual exacto del manifest
  await page.getByTestId('bomb-start-practice').click();
  await page.waitForFunction(() => {
    const b = document.querySelector('[data-testid="bomb-switch-SW_1"]');
    return b && !b.disabled;
  }, null, { timeout: 8000 });
  const practice = await page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const hitbox = (s) => { const b = q(s).getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height) }; };
    return {
      swEnabled: !q('[data-testid="bomb-switch-SW_1"]').disabled,
      holdEnabled: !q('[data-testid="bomb-hold-btn"]').disabled,
      swHit: hitbox('[data-testid="bomb-switch-SW_1"]'),
      wireHit: hitbox('[data-testid="bomb-wire-WIRE_RED"]'),
      holdHit: hitbox('[data-testid="bomb-hold-btn"]'),
      lines: [...q('.bomb-manual__lines')?.querySelectorAll('li') ?? []].map((li) => li.textContent),
      level: q('[data-testid="bomb-level"]')?.textContent,
      twoCols: (() => {
        const m = q('[data-testid="bomb-manual"]').getBoundingClientRect();
        const p = q('[data-testid="bomb-panel"]').getBoundingClientRect();
        return m.right <= p.left + 2; // manual a la izquierda del panel (2 columnas)
      })(),
    };
  });
  out.practice = practice;
  if (!practice.swEnabled || !practice.holdEnabled) failures.push(`[${tag}] práctica: controles no habilitados`);
  for (const [name, h] of [['switch', practice.swHit], ['wire', practice.wireHit], ['hold', practice.holdHit]]) {
    if (h.h < 44) failures.push(`[${tag}] hitbox ${name} <44px (h=${h.h}px) — spec §14`);
  }
  if (JSON.stringify(practice.lines) !== JSON.stringify(EXPECTED_MANUAL_LINES)) {
    failures.push(`[${tag}] manual no coincide con el manifest: ${JSON.stringify(practice.lines)}`);
  }
  if (!practice.twoCols) failures.push(`[${tag}] layout no es 2 columnas (manual | panel) en 1280 — spec §6.1`);
  // Baseline §15: mundo completo (incluida la barra de estado LED/Audio) debe
  // caber en el viewport 720px sin scroll.
  const fit = await page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    return {
      gameBottom: Math.round(q('.bomb-game').getBoundingClientRect().bottom),
      statusbarBottom: Math.round(q('[data-testid="bomb-statusbar"]').getBoundingClientRect().bottom),
      vpH: window.innerHeight,
    };
  });
  out.fit = fit;
  if (fit.statusbarBottom > fit.vpH + 1) {
    failures.push(`[${tag}] barra de estado bajo el fold (bottom=${fit.statusbarBottom} > ${fit.vpH}px) — spec §15`);
  }
  if (fit.gameBottom > fit.vpH + 1) {
    failures.push(`[${tag}] .bomb-game desborda el viewport vertical (bottom=${fit.gameBottom} > ${fit.vpH}px)`);
  }
  await shot(page, `02-practice-${tag}`);

  // SW1 → ON (aria-pressed)
  await page.getByTestId('bomb-switch-SW_1').click();
  const sw1On = await page.evaluate(() => document.querySelector('[data-testid="bomb-switch-SW_1"]').getAttribute('aria-pressed'));
  if (sw1On !== 'true') failures.push(`[${tag}] SW1: aria-pressed=${sw1On} tras click (esperado true)`);

  // Cable fuera de orden (AZUL) → corte físico + LED penalty (sin revelar respuesta)
  await page.getByTestId('bomb-wire-WIRE_BLUE').click();
  const afterBlue = await page.evaluate(() => ({
    led: document.querySelector('[data-testid="bomb-led"]').getAttribute('data-led'),
    blueDisabled: document.querySelector('[data-testid="bomb-wire-WIRE_BLUE"]').disabled,
  }));
  out.afterBlue = afterBlue;
  if (afterBlue.led !== 'penalty') failures.push(`[${tag}] LED tras error esperado penalty, recibido ${afterBlue.led}`);
  if (afterBlue.blueDisabled !== true) failures.push(`[${tag}] cable AZUL cortado no queda disabled (irreversible §8.3)`);
  await shot(page, `03-led-penalty-${tag}`);

  // Cable ROJO en orden + hold válido (2 s) → práctica completada.
  // El hold se suelta a ~1980 ms del down (ventana 1800-2400, spec §8.3): el
  // screenshot intermedio consume tiempo real (el reloj del motor avanza),
  // por eso se compensa midiendo el transcurrido antes del up.
  await page.getByTestId('bomb-wire-WIRE_RED').click();
  const hold = page.getByTestId('bomb-hold-btn');
  await hold.hover();
  const holdT0 = Date.now();
  await page.mouse.down();
  await page.waitForTimeout(950);
  const ringVisible = await page.evaluate(() => !!document.querySelector('[data-testid="bomb-hold-ring"]'));
  out.ringDuringHold = ringVisible;
  if (!ringVisible) failures.push(`[${tag}] anillo de progreso ausente durante el hold en práctica (spec §7)`);
  await shot(page, `04-hold-ring-${tag}`);
  const elapsed = Date.now() - holdT0;
  if (elapsed < 1980) await page.waitForTimeout(1980 - elapsed);
  out.holdMs = Date.now() - holdT0;
  await page.mouse.up();
  await page.getByTestId('bomb-practice-done').waitFor({ timeout: 8000 });
  const afterHold = await page.evaluate(() => ({
    led: document.querySelector('[data-testid="bomb-led"]').getAttribute('data-led'),
    sw2Disabled: document.querySelector('[data-testid="bomb-switch-SW_2"]').disabled,
  }));
  out.afterHold = afterHold;
  if (afterHold.led !== 'success') failures.push(`[${tag}] LED tras success esperado success, recibido ${afterHold.led}`);
  if (afterHold.sw2Disabled !== true) failures.push(`[${tag}] panel no se bloquea tras completar (inputs no heredados)`);
  await shot(page, `05-practice-done-${tag}`);

  // Repetir práctica → estado físico reseteado
  await page.getByTestId('bomb-practice-restart').click();
  const afterRestart = await page.evaluate(() => ({
    sw1Pressed: document.querySelector('[data-testid="bomb-switch-SW_1"]').getAttribute('aria-pressed'),
    redEnabled: !document.querySelector('[data-testid="bomb-wire-WIRE_RED"]').disabled,
    doneGone: !document.querySelector('[data-testid="bomb-practice-done"]'),
  }));
  out.afterRestart = afterRestart;
  if (afterRestart.sw1Pressed !== 'false' || !afterRestart.redEnabled || !afterRestart.doneGone) {
    failures.push(`[${tag}] "Repetir práctica" no reseteó el estado físico: ${JSON.stringify(afterRestart)}`);
  }

  // Foco visible (teclado) en controles del panel
  let focusOk = false;
  for (let i = 0; i < 14 && !focusOk; i += 1) {
    const st = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { testid: el.getAttribute('data-testid'), outlineStyle: cs.outlineStyle, outlineWidth: cs.outlineWidth };
    });
    if (st && st.testid?.startsWith('bomb-') && st.outlineStyle !== 'none' && parseFloat(st.outlineWidth) >= 2) focusOk = true;
    else await page.keyboard.press('Tab');
  }
  out.focusVisible = focusOk;
  if (!focusOk) failures.push(`[${tag}] :focus-visible no detectado (outline ≥2px) en controles del panel — spec §14`);
  await shot(page, `06-focus-visible-${tag}`);

  // SFX toggle (chrome compartido) → línea "Audio:" se actualiza
  const sfxBefore = await page.evaluate(() => ({
    toggle: document.querySelector('[data-testid="sfx-toggle"]').getAttribute('aria-pressed'),
    line: document.querySelector('[data-testid="bomb-audio"]')?.textContent,
  }));
  await page.getByTestId('sfx-toggle').click();
  await page.getByTestId('bomb-switch-SW_2').click(); // bump → re-render
  const sfxAfter = await page.evaluate(() => ({
    toggle: document.querySelector('[data-testid="sfx-toggle"]').getAttribute('aria-pressed'),
    line: document.querySelector('[data-testid="bomb-audio"]')?.textContent,
  }));
  out.sfx = { before: sfxBefore, after: sfxAfter };
  if (sfxAfter.toggle !== 'true') failures.push(`[${tag}] sfx-toggle no pasó a ON`);
  if (sfxAfter.line !== 'Audio: ON') failures.push(`[${tag}] línea audio no se actualizó (recibido "${sfxAfter.line}")`);

  // Timer: sin saltos de layout (tabular-nums + min-width fijo)
  const timerCss = await page.evaluate(() => {
    const cs = getComputedStyle(document.querySelector('[data-testid="bomb-timer"]'));
    return { fontVariantNumeric: cs.fontVariantNumeric, minWidth: cs.minWidth };
  });
  out.timerCss = timerCss;
  if (!timerCss.fontVariantNumeric.includes('tabular-nums')) failures.push(`[${tag}] timer sin tabular-nums (salto de layout posible)`);
  if (timerCss.minWidth === '0px' || timerCss.minWidth === 'auto') failures.push(`[${tag}] timer sin min-width fijo`);

  await context.close();
  results.push(out);
}

// ---------- 390×844 (móvil: aviso <1024px + 1 columna, spec §15) ----------
{
  const tag = '390x844';
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  track(page, tag);
  const out = { viewport: tag };
  await page.goto(`${baseUrl}/dev/bomb`, { waitUntil: 'networkidle' });
  await page.getByTestId('bomb-game').waitFor({ timeout: 25000 });
  const m = await page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const manual = q('[data-testid="bomb-manual"]')?.getBoundingClientRect();
    const panel = q('[data-testid="bomb-panel"]')?.getBoundingClientRect();
    const sw = q('[data-testid="bomb-switch-SW_1"]')?.getBoundingClientRect();
    return {
      warning: !!q('[data-testid="bomb-viewport-warning"]'),
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      stacked: manual && panel ? manual.bottom <= panel.top + 2 : null,
      swH: sw ? Math.round(sw.height) : null,
      gameRight: Math.round(q('.bomb-game').getBoundingClientRect().right),
      vpW: window.innerWidth,
    };
  });
  out.geometry = m;
  if (!m.warning) failures.push(`[${tag}] aviso <1024px ausente (spec §15)`);
  if (m.overflow > 0) failures.push(`[${tag}] overflow horizontal: ${m.overflow}px`);
  if (m.stacked !== true) failures.push(`[${tag}] layout no apila 1 columna en móvil`);
  if (m.swH < 44) failures.push(`[${tag}] hitbox switch <44px (h=${m.swH}px)`);
  if (m.gameRight > m.vpW + 1) failures.push(`[${tag}] .bomb-game desborda (right=${m.gameRight} > ${m.vpW})`);
  await page.getByTestId('bomb-start-practice').click();
  await page.waitForTimeout(600);
  out.shoots = await shot(page, `07-mobile-practice-${tag}`);
  await context.close();
  results.push(out);
}

// ---------- 1000×700 (<1024px: aviso SÍ + 2 columnas SÍ) ----------
{
  const tag = '1000x700';
  const context = await browser.newContext({ viewport: { width: 1000, height: 700 } });
  const page = await context.newPage();
  track(page, tag);
  const out = { viewport: tag };
  await page.goto(`${baseUrl}/dev/bomb`, { waitUntil: 'networkidle' });
  await page.getByTestId('bomb-game').waitFor({ timeout: 25000 });
  const m = await page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const manual = q('[data-testid="bomb-manual"]').getBoundingClientRect();
    const panel = q('[data-testid="bomb-panel"]').getBoundingClientRect();
    return {
      warning: !!q('[data-testid="bomb-viewport-warning"]'),
      twoCols: manual.right <= panel.left + 2,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    };
  });
  out.geometry = m;
  if (!m.warning) failures.push(`[${tag}] aviso <1024px ausente (spec §15)`);
  if (!m.twoCols) failures.push(`[${tag}] 2 columnas perdidas en 1000px`);
  if (m.overflow > 0) failures.push(`[${tag}] overflow horizontal: ${m.overflow}px`);
  out.shoots = await shot(page, `08-narrow-warning-${tag}`);
  await context.close();
  results.push(out);
}

// ---------- reduced-motion (spec §14 / DoD §20: sin power-on/shake) ----------
{
  const tag = 'reduced-motion';
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  track(page, tag);
  const out = { viewport: tag };
  await page.goto(`${baseUrl}/dev/bomb`, { waitUntil: 'networkidle' });
  await page.getByTestId('bomb-game').waitFor({ timeout: 25000 });
  await page.getByTestId('bomb-start-practice').click();
  await page.waitForFunction(() => {
    const b = document.querySelector('[data-testid="bomb-switch-SW_1"]');
    return b && !b.disabled;
  }, null, { timeout: 8000 });
  const rm = await page.evaluate(() => {
    const panel = document.querySelector('[data-testid="bomb-panel"]');
    const cs = getComputedStyle(panel);
    return { powered: panel.classList.contains('bomb-panel--powered'), animationName: cs.animationName };
  });
  out.reduced = rm;
  if (!rm.powered) failures.push(`[${tag}] panel sin clase --powered en práctica`);
  if (rm.animationName !== 'none') failures.push(`[${tag}] reduced-motion: power-on sigue animando (animationName=${rm.animationName})`);
  out.shoots = await shot(page, `09-reduced-motion-${tag}`);
  await context.close();
  results.push(out);
}

await browser.close();

const result = { baseUrl, failures, consoleErrors: consoleErrors.slice(0, 20), results };
console.log(JSON.stringify(result, null, 2));
process.exit(failures.length ? 1 : 0);
