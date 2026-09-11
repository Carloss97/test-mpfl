// Smoke 2026-09-11 — fix: "Iniciar sesión" en el slot de "Solicitar demo" (topbar).
// Verifica CONTRA EL DEV SERVER LOCAL:
//   D1 login pill en .landing__header-actions (href #accesos), sin "Solicitar demo" en el header
//   D2 contraste AA del login pill (fondo --k-gold / tinta --k-btn-gold-ink)
//   D3 sin overflow horizontal + sin console errors (desktop y móvil)
//   M1 login pill visible en topbar móvil (≤1150px)
//   M2 menú hamburguesa: nav abierta sin login (solo 4 links de sección)
// Uso: BASE_URL=http://127.0.0.1:5173 node scripts/smoke-landing-login-slot-2026-09-11.mjs
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:5173';
const outDir = '/tmp/krumm-landing-smoke-2026-09-11';
mkdirSync(outDir, { recursive: true });

function lum(rgb) {
  const f = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = rgb.match(/\d+/g).map(Number);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(a, b) {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}

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

// ── DESKTOP 1280x720 ──────────────────────────────────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
  page.on('pageerror', (e) => consoleErrors.push(String(e)));
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });

  const header = await page.evaluate(() => {
    const headerEl = document.querySelector('.landing__topbar');
    const login = headerEl?.querySelector('.landing__header-actions .landing__nav-login');
    const demoInHeader = headerEl?.querySelectorAll('a,button').length
      ? [...headerEl.querySelectorAll('a,button')].some((el) => /solicitar demo/i.test(el.textContent ?? ''))
      : null;
    const demoAll = [...document.querySelectorAll('a')].filter((el) => /solicitar demo/i.test(el.textContent ?? '')).length;
    if (!login) return { found: false };
    const cs = getComputedStyle(login);
    return {
      found: true,
      href: login.getAttribute('href'),
      inHeaderActions: !!login.closest('.landing__header-actions'),
      isGoldCta: login.classList.contains('landing__cta--gold'),
      hasArrow: !!login.querySelector('svg.landing__nav-login-arrow'),
      demoInHeader,
      demoCountInPage: demoAll,
      color: cs.color,
      stops: cs.backgroundImage.match(/rgb\([^)]+\)/g) ?? [],
      overflow: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
  results.desktop.header = header;
  check('D1 login en header-actions, CTA gold completo + flecha (v2)', header.found && header.inHeaderActions && header.href === '#accesos' && header.isGoldCta && header.hasArrow,
    `href=${header.href} gold=${header.isGoldCta} arrow=${header.hasArrow}`);
  check('D1 sin "Solicitar demo" en topbar', header.found && header.demoInHeader === false && header.demoCountInPage === 1,
    `demo en página (cierre): ${header.demoCountInPage}`);
  if (header.found && header.color.startsWith('rgb') && header.stops.length === 2) {
    const ratios = header.stops.map((s) => contrast(s, header.color));
    check('D2 contraste CTA gold AA ≥4.5 (ambas paradas del gradiente)', Math.min(...ratios) >= 4.5,
      `stops ${header.stops.join(' | ')} / ink ${header.color} → ${ratios.join(' y ')}:1`);
  }
  check('D3 sin overflow horizontal (desktop)', !header.overflow);
  await page.screenshot({ path: `${outDir}/desktop-topbar.png`, clip: { x: 0, y: 0, width: 1280, height: 200 } });
  await page.screenshot({ path: `${outDir}/desktop-full.png`, fullPage: false });
  check('D3 sin console/page errors (desktop)', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | ') || '0 errors');
  await ctx.close();
}

// ── MÓVIL 390x844 ─────────────────────────────────────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });

  const mobile = await page.evaluate(() => {
    const login = document.querySelector('.landing__header-actions .landing__nav-login');
    const cs = login ? getComputedStyle(login) : null;
    return {
      loginVisible: !!login && cs.display !== 'none' && login.getBoundingClientRect().width > 0,
      overflow: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
  results.mobile.login = mobile;
  check('M1 login pill visible en topbar móvil', mobile.loginVisible);
  check('M3 sin overflow horizontal (móvil)', !mobile.overflow);

  await page.click('.landing__menu-button');
  const menu = await page.evaluate(() => {
    const nav = document.querySelector('#main-nav');
    const links = [...nav.querySelectorAll('a')].map((a) => a.textContent.trim());
    return { open: nav.classList.contains('landing__nav--open'), links };
  });
  results.mobile.menu = menu;
  check('M2 menú abierto: 4 links de sección, login fuera de la nav',
    menu.open && menu.links.length === 4 && !menu.links.some((l) => /iniciar sesión/i.test(l)),
    menu.links.join(', '));
  await page.screenshot({ path: `${outDir}/mobile-topbar-menu.png` });
  await ctx.close();
}

await browser.close();
console.log(`\n${failures === 0 ? 'ALL GREEN' : `${failures} FAILURES`} — screenshots en ${outDir}/`);
process.exit(failures === 0 ? 0 : 1);
