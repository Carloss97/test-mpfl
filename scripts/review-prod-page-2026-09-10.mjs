// Revisión de página prod (krumm.cl) — 2026-09-10.
// Verifica los 5 fixes de landing desplegados (fa4e0b0/807446f) y busca
// problemas residuales: contraste login, dev card ausente, favicon marca,
// overflow móvil, h1s de /candidato y /empresa.
import { chromium } from '@playwright/test';

const BASE = process.env.BASE_URL ?? 'https://krumm.cl';
const SHOTS = process.env.SHOTS_DIR ?? 'docs/qa/page-review-2026-09-10';
const failures = [];
const findings = [];
const screenshots = [];

const browser = await chromium.launch({
  headless: true,
  executablePath: '/home/sarlock/.cache/ms-playwright/chromium-1234/chrome-linux/chrome',
  args: ['--headless=new', '--disable-dev-shm-usage', '--disable-gpu'],
});

function relLum({ r, g, b }) {
  const f = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function parseRGB(s) {
  const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  return m ? { r: +m[1], g: +m[2], b: +m[3] } : null;
}

async function checkLandingDesktop() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(BASE + '/', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(1200); // fonts

  // 1. Contraste botón "Iniciar sesión" (nav CTA)
  const login = page.locator('.landing__nav-login--cta').first();
  if ((await login.count()) === 0) {
    failures.push('login CTA ausente en nav');
  } else {
    const st = await login.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { color: cs.color, bg: cs.backgroundColor };
    });
    const fg = parseRGB(st.color);
    let bg = parseRGB(st.bg);
    if (!bg || (bg.r === 0 && bg.g === 0 && bg.b === 0)) {
      // background transparente → usar bg del hero (dark)
      bg = await page.evaluate(() => {
        const el = document.querySelector('.landing__hero');
        const cs = getComputedStyle(el);
        return cs.backgroundColor;
      }).then(parseRGB);
    }
    if (fg && bg) {
      const L1 = relLum(fg), L2 = relLum(bg);
      const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      findings.push(`login CTA: fg=${st.color} bg=${st.bg} contraste=${ratio.toFixed(2)}:1 ${ratio >= 4.5 ? 'AA OK' : 'AA FAIL'}`);
      if (ratio < 4.5) failures.push(`login CTA contraste ${ratio.toFixed(2)} < 4.5`);
    } else {
      failures.push(`login CTA colores no parseables: fg=${st.color} bg=${st.bg}`);
    }
  }

  // 2. Dev card ausente (pública)
  const bodyText = await page.evaluate(() => document.body.innerText);
  for (const needle of ['Ingresar como dev', 'Acceso directo a juegos', 'tok-dev-dev1234', 'Sign in as dev']) {
    if (bodyText.includes(needle)) failures.push(`dev access visible en landing pública: "${needle}"`);
  }
  findings.push(`dev card: ${bodyText.includes('Ingresar como dev') ? 'PRESENTE (fallo)' : 'ausente OK'}`);

  // 3. Accesos: solo empresa + candidato
  const accesoCards = await page.locator('.landing__acceso-card').count();
  findings.push(`acceso cards: ${accesoCards} (esperado 2)`);
  if (accesoCards !== 2) failures.push(`acceso cards esperadas 2, encontradas ${accesoCards}`);

  // 4. Favicon (fetch bytes)
  const fav = await page.evaluate(async () => {
    const r = await fetch('/favicon.svg', { cache: 'no-store' });
    return { status: r.status, text: (await r.text()).slice(0, 300) };
  });
  const isOldSmiley = fav.text.includes('#5bffc3') || fav.text.includes('#08131f');
  findings.push(`favicon: status ${fav.status}, marca=${isOldSmiley ? 'SMILEY VIEJO (fallo)' : 'OK (sin #5bffc3/#08131f)'}`);
  if (isOldSmiley) failures.push('favicon sigue siendo el smiley viejo (cache edge?)');

  // 5. Iconos unicode (☰/▶/✓ como texto) — deberían ser SVG
  const tofu = await page.evaluate(() => {
    const t = document.body.innerText;
    return ['☰', '▶'].filter((c) => t.includes(c));
  });
  findings.push(`iconos unicode residuales: ${tofu.length ? tofu.join(',') : 'ninguno OK'}`);
  if (tofu.length) failures.push(`iconos unicode aún renderizados: ${tofu.join(',')}`);

  if (errs.length) failures.push(`console errors en /: ${errs.slice(0, 3).join(' | ')}`);
  await page.screenshot({ path: `${SHOTS}/prod-desktop-1280.png`, fullPage: false });
  screenshots.push(`${SHOTS}/prod-desktop-1280.png`);
  await ctx.close();
}

async function checkMobile() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(1000);
  const ov = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    innerW: window.innerWidth,
  }));
  findings.push(`móvil 390: scrollW=${ov.scrollW} innerW=${ov.innerW} ${ov.scrollW <= ov.innerW + 1 ? 'sin overflow OK' : 'OVERFLOW (fallo)'}`);
  if (ov.scrollW > ov.innerW + 1) failures.push(`overflow móvil: ${ov.scrollW} > ${ov.innerW}`);
  await page.screenshot({ path: `${SHOTS}/prod-mobile-390.png` });
  screenshots.push(`${SHOTS}/prod-mobile-390.png`);

  // hamburger + nav mobile
  const burger = page.locator('.landing__menu-button');
  if ((await burger.count()) === 0) failures.push('hamburger ausente en móvil');
  else {
    await burger.click();
    await page.waitForTimeout(400);
    const navOpen = await page.locator('.landing__nav--open').count();
    findings.push(`nav móvil abre: ${navOpen ? 'OK' : 'FALLO'}`);
    if (!navOpen) failures.push('nav móvil no abre');
    await page.screenshot({ path: `${SHOTS}/prod-mobile-390-nav.png` });
    screenshots.push(`${SHOTS}/prod-mobile-390-nav.png`);
  }
  await ctx.close();
}

async function checkOtherRoutes() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  for (const [path, expect] of [['/candidato', /./], ['/empresa', /./]]) {
    await page.goto(BASE + path, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(800);
    const h1 = await page.evaluate(() => document.querySelector('h1')?.textContent ?? null);
    findings.push(`${path}: h1="${h1}"`);
    if (!h1) failures.push(`${path}: sin h1`);
  }
  if (errs.length) failures.push(`pageerrors otras rutas: ${errs.slice(0, 3).join(' | ')}`);
  await ctx.close();
}

await checkLandingDesktop();
await checkMobile();
await checkOtherRoutes();
await browser.close();

const result = { page: BASE, failures, findings, screenshots, ok: failures.length === 0 };
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
