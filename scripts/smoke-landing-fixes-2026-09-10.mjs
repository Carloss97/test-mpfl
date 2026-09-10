// Smoke landing fixes 2026-09-10 (t_ff494f3f, t_039483d8, t_cadfe102, t_25009e33 + favicon)
// Verifica CONTRA EL DEV SERVER LOCAL (cambios no desplegados):
//   P1 contraste login · P1 dev card ausente · P2 gutters móviles + H1 · iconos SVG · favicon marca.
// Uso: BASE_URL=http://127.0.0.1:5173 node scripts/smoke-landing-fixes-2026-09-10.mjs
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:5173';
const outDir = '/tmp/krumm-landing-smoke';
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

const results = { baseUrl, desktop: {}, mobile: {}, favicon: {} };

// ── DESKTOP 1280x720 ──────────────────────────────────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });

  results.desktop.login = await page.evaluate(() => {
    const btn = document.querySelector('.landing__nav .landing__nav-login--cta');
    if (!btn) return { found: false };
    const cs = getComputedStyle(btn);
    return { found: true, text: btn.textContent.trim(), color: cs.color, background: cs.backgroundColor };
  });
  if (results.desktop.login.found) {
    results.desktop.login.contrast = contrast(results.desktop.login.color, results.desktop.login.background);
  }

  results.desktop.devCard = await page.evaluate(() => ({
    devCardPresent: !!document.querySelector('.landing__acceso-card--dev'),
    devLinkPresent: !!document.querySelector('a[href*="tok-dev"]'),
    accessCards: document.querySelectorAll('.landing__acceso-card').length,
  }));

  // Nav visible en desktop (hamburger oculto), iconos SVG presentes en hero
  results.desktop.icons = await page.evaluate(() => ({
    hamburgerDisplay: getComputedStyle(document.querySelector('.landing__menu-button')).display,
    playSvg: !!document.querySelector('.landing__play svg'),
    proofSvgs: document.querySelectorAll('.landing__proof-row svg').length,
  }));

  await page.screenshot({ path: `${outDir}/desktop-nav.png`, clip: { x: 0, y: 0, width: 1280, height: 90 } });
  await page.evaluate(() => document.getElementById('accesos').scrollIntoView());
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${outDir}/desktop-accesos.png` });
  await ctx.close();
}

// ── MÓVIL 390x844 ─────────────────────────────────────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });

  results.mobile.overflow = await page.evaluate(() => ({
    docWidth: document.documentElement.scrollWidth,
    vw: window.innerWidth,
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
  }));

  // Gutter de cada sección: margen izq/der del heading (esperado ~24/24)
  results.mobile.gutters = await page.evaluate(() => {
    const out = [];
    for (const id of ['como-funciona', 'tecnologia', 'producto', 'accesos', 'contacto']) {
      const sec = document.getElementById(id);
      if (!sec) continue;
      const h = sec.querySelector('h1,h2,.landing__accesos-title,.landing__cierre-title');
      if (!h) continue;
      const r = h.getBoundingClientRect();
      out.push({ id, left: Math.round(r.left), right: Math.round(window.innerWidth - r.right) });
    }
    return out;
  });

  // H1 hero: tamaño + margen derecho real
  results.mobile.h1 = await page.evaluate(() => {
    const h1 = document.querySelector('.landing__hero h1');
    const em = document.querySelector('.landing__accent');
    const cs = getComputedStyle(h1);
    const r = em ? em.getBoundingClientRect() : h1.getBoundingClientRect();
    return {
      fontSize: cs.fontSize,
      lang: document.documentElement.lang || h1.closest('[lang]')?.getAttribute('lang') || 'default',
      rightMargin: Math.round(window.innerWidth - r.right),
    };
  });

  // Menú móvil: abrir, verificar SVG hamburguesa + login dentro del menú
  results.mobile.menu = await page.evaluate(() => ({
    hamburgerSvg: !!document.querySelector('.landing__menu-button svg'),
  }));
  await page.click('.landing__menu-button');
  await page.waitForTimeout(250);
  results.mobile.menu.navOpen = await page.evaluate(() =>
    document.querySelector('.landing__nav')?.classList.contains('landing__nav--open'),
  );
  results.desktop.loginMobile = await page.evaluate(() => {
    const btn = document.querySelector('.landing__nav .landing__nav-login--cta');
    if (!btn) return { found: false };
    const cs = getComputedStyle(btn);
    return { found: true, color: cs.color, background: cs.backgroundColor };
  });
  if (results.desktop.loginMobile.found) {
    results.desktop.loginMobile.contrast = contrast(results.desktop.loginMobile.color, results.desktop.loginMobile.background);
  }
  await page.screenshot({ path: `${outDir}/mobile-menu-open.png` });
  await page.click('.landing__menu-button'); // cerrar
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${outDir}/mobile-hero.png` });
  await page.evaluate(() => document.getElementById('contacto').scrollIntoView());
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${outDir}/mobile-contacto.png` });
  await ctx.close();
}

// ── FAVICON ───────────────────────────────────────────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 400, height: 200 } });
  const page = await ctx.newPage();
  const fav = await (await page.request.get(`${baseUrl}/favicon.svg`)).text();
  results.favicon.content = {
    hasBrandBg: fav.includes('#3d2b20'),
    oldSmileyGone: !fav.includes('#08131f') && !fav.includes('stroke="#5bffc3"'),
    size: fav.length,
  };
  await page.setContent(`<!doctype html><html><body style="margin:0;background:#fff">
    <div style="display:flex;gap:24px;align-items:center;padding:24px">
      <span style="font:12px sans-serif">16px</span><img src="${baseUrl}/favicon.svg" width="16" height="16" style="image-rendering:auto"/>
      <span style="font:12px sans-serif">32px</span><img src="${baseUrl}/favicon.svg" width="32" height="32"/>
      <span style="font:12px sans-serif">64px</span><img src="${baseUrl}/favicon.svg" width="64" height="64"/>
    </div></body></html>`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${outDir}/favicon.png` });
  await ctx.close();
}

await browser.close();
console.log(JSON.stringify(results, null, 2));
console.log('SCREENSHOTS ->', outDir);
