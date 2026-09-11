// Smoke 2026-09-11 — transiciones suaves (landing): dropdown animado, morph
// hamburguesa→X, underline nav, press CTA, scroll suave + scroll-margin.
// Verifica CONTRA EL DEV SERVER LOCAL:
//   T1 underline nav: ::after scaleX(0) → hover → scaleX(1)
//   T2 press CTA "Ver cómo funciona": :active escala 0.98 y regresa
//   T3 click "Contacto": scroll suave (scrollY sube) + sección no queda bajo la topbar
//   T4 móvil: dropdown cerrado (opacity 0/hidden) → abrir → fade (captura mid-animación) → opacity 1
//   T5 móvil: hamburguesa→X morph (line-1 transform ≠ none con aria-expanded=true)
// Uso: BASE_URL=http://127.0.0.1:5173 node scripts/smoke-landing-transitions-2026-09-11.mjs
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:5173';
const outDir = '/tmp/krumm-landing-transitions-2026-09-11';
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: '/home/sarlock/.cache/ms-playwright/chromium-1234/chrome-linux/chrome',
  args: ['--headless=new', '--disable-dev-shm-usage', '--disable-gpu'],
});

const results = { baseUrl, desktop: {}, mobile: {} };
let failures = 0;
function check(name, cond, detail) {
  results.checks = results.checks ?? [];
  results.checks.push({ name, pass: !!cond, detail });
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}
function matrixA(transform) {
  const m = /^matrix\(([^)]+)\)/.exec(transform ?? '');
  return m ? parseFloat(m[1].split(',')[0]) : null;
}

// ── DESKTOP 1280x720 ──────────────────────────────────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
  page.on('pageerror', (e) => consoleErrors.push(String(e)));
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });

  // T1: underline del link "Tecnología"
  const linkSel = '.landing__nav a[href="#tecnologia"]';
  const before = await page.evaluate((sel) => getComputedStyle(document.querySelector(sel), '::after').transform, linkSel);
  await page.hover(linkSel);
  await page.waitForTimeout(450); // > 0.3s de transición
  const after = await page.evaluate((sel) => getComputedStyle(document.querySelector(sel), '::after').transform, linkSel);
  results.desktop.underline = { before, after };
  const aBefore = matrixA(before);
  const aAfter = matrixA(after);
  check('T1 underline nav animado (scaleX 0→1 en hover)',
    aBefore !== null && aAfter !== null && aBefore < 0.1 && aAfter > 0.9,
    `before=${before} after=${after}`);
  await page.screenshot({ path: `${outDir}/desktop-underline-hover.png`, clip: { x: 0, y: 0, width: 1280, height: 160 } });

  // T2: press en el CTA outline "Ver cómo funciona" (ancla → no navega).
  // scrollIntoViewIfNeeded: en 1280x720 el CTA puede estar bajo el fold.
  const cta = page.locator('.landing__hero-buttons .landing__cta--outline');
  await cta.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300); // asentar scroll
  const box = await cta.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(150); // :active con duration 0.08s → asentado
  const pressTransform = await cta.evaluate((el) => getComputedStyle(el).transform);
  await page.mouse.up();
  await page.waitForTimeout(450); // regreso amortiguado
  const releaseTransform = await cta.evaluate((el) => getComputedStyle(el).transform);
  results.desktop.press = { pressTransform, releaseTransform };
  const aPress = matrixA(pressTransform);
  check('T2 press CTA escala 0.98 y regresa',
    aPress !== null && aPress > 0.9 && aPress < 0.995,
    `press=${pressTransform} release=${releaseTransform}`);

  // T3: click "Contacto" → scroll suave + sección no queda bajo la topbar (172px)
  await page.click('.landing__nav a[href="#contacto"]');
  await page.waitForTimeout(1400); // scroll suave de ~5-7k px
  const scroll = await page.evaluate(() => {
    const s = document.getElementById('contacto');
    return {
      scrollY: Math.round(window.scrollY),
      sectionTop: Math.round(s.getBoundingClientRect().top),
      smooth: document.documentElement.style.scrollBehavior,
    };
  });
  results.desktop.scroll = scroll;
  check('T3 scroll suave al click (scrollY > 3000 y scroll-behavior smooth)',
    scroll.scrollY > 3000 && scroll.smooth === 'smooth',
    `scrollY=${scroll.scrollY} smooth=${scroll.smooth}`);
  check('T3 sección #contacto no queda bajo la topbar (top ≥ 100px)',
    scroll.sectionTop >= 100 && scroll.sectionTop <= 300,
    `sectionTop=${scroll.sectionTop}px`);
  await page.screenshot({ path: `${outDir}/desktop-contacto-scrolled.png` });
  check('T4 sin console/page errors (desktop)', consoleErrors.length === 0,
    consoleErrors.slice(0, 3).join(' | ') || '0 errors');
  await ctx.close();
}

// ── MÓVIL 390x844 ─────────────────────────────────────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
  page.on('pageerror', (e) => consoleErrors.push(String(e)));
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });

  const closed = await page.evaluate(() => {
    const nav = document.querySelector('#main-nav');
    const cs = getComputedStyle(nav);
    return { opacity: cs.opacity, visibility: cs.visibility, transform: cs.transform };
  });
  results.mobile.closed = closed;
  check('T4 dropdown móvil cerrado (opacity 0, visibility hidden)',
    closed.opacity === '0' && closed.visibility === 'hidden',
    `opacity=${closed.opacity} visibility=${closed.visibility} transform=${closed.transform}`);

  await page.click('.landing__menu-button');
  await page.waitForTimeout(40); // early sample (el easing es fast-out)
  const mid1 = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('#main-nav')).opacity));
  await page.waitForTimeout(80); // mid-animación (fade 0.28s)
  const mid2 = await page.evaluate(() => {
    const nav = document.querySelector('#main-nav');
    const cs = getComputedStyle(nav);
    return { opacity: parseFloat(cs.opacity), visibility: cs.visibility };
  });
  await page.screenshot({ path: `${outDir}/mobile-menu-mid-animation.png` });
  await page.waitForTimeout(500); // asentado
  const open = await page.evaluate(() => {
    const nav = document.querySelector('#main-nav');
    const btn = document.querySelector('.landing__menu-button');
    const line1 = btn.querySelector('.landing__menu-line--1');
    const line2 = btn.querySelector('.landing__menu-line--2');
    const cs = getComputedStyle(nav);
    return {
      opacity: cs.opacity,
      visibility: cs.visibility,
      ariaExpanded: btn.getAttribute('aria-expanded'),
      line1Transform: getComputedStyle(line1).transform,
      line2Opacity: getComputedStyle(line2).opacity,
      overflow: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
  results.mobile.open = { mid1, mid: mid2, ...open };
  check('T4 dropdown abre con fade (opacity crece: mid1 ≤ mid2 < 1)',
    mid1 <= mid2.opacity && mid2.opacity > 0.1 && mid2.opacity < 1,
    `mid1=${mid1} mid2=${mid2.opacity.toFixed(4)} → final=${open.opacity}`);
  check('T4 dropdown abierto (opacity 1, visible, aria-expanded)',
    open.opacity === '1' && open.visibility === 'visible' && open.ariaExpanded === 'true');
  check('T5 morph hamburguesa→X (line-1 rotada, line-2 oculta)',
    open.line1Transform !== 'none' && open.line2Opacity === '0',
    `line1=${open.line1Transform} line2opacity=${open.line2Opacity}`);
  check('T6 sin overflow horizontal (móvil, menú abierto)', !open.overflow);
  await page.screenshot({ path: `${outDir}/mobile-menu-open.png` });
  check('T7 sin console/page errors (móvil)', consoleErrors.length === 0,
    consoleErrors.slice(0, 3).join(' | ') || '0 errors');
  await ctx.close();
}

await browser.close();
console.log(`\n${failures === 0 ? 'ALL GREEN' : `${failures} FAILURES`} — screenshots en ${outDir}/`);
process.exit(failures === 0 ? 0 : 1);
