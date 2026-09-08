// H4.6c (2026-09-08, t_0184d2e6 V5 fase v3): AUDIT VISUAL FINAL post-cutover —
// todas las 12 rutas nuevas de la fase v3 + verificación de las redirecciones
// del cutover (/reclutador → /empresa, /postulaciones sin invite → /candidato,
// /postulaciones?invite=… conserva el flujo) bajo la marca oficial v2
// (paleta beige/crema/arena/marrón/dorado, Archivo + Manrope vía tokens --k-*).
// Supera a h46b (flujo candidato + /reclutador pre-cutover).
//
// Matriz:
//   ES desktop 1280×720: 12 rutas — overflow, console, h1 único+copy, tipografía
//     Manrope, contraste AA (h1 + lead + eyebrow), pill de idioma (focus
//     terracota en claras / arena en sidebar oscuro), screenshot.
//   ES móvil 390×844: 12 rutas — overflow, console, h1, screenshot.
//   EN desktop 1280×720: 12 rutas — paridad i18n (h1 EN), overflow, console;
//     screenshots de las 4 rutas principales.
//   Cutover: 6 verificaciones de redirección (incl. preservación de ?lang y
//     no-redirect con invite) + 1 móvil.
//
// DISEÑO Pi (heredado de h46b): 1 contexto (1 carga de documento) por vista —
// las 3ª+ cargas en el mismo contexto revientan con ERR_INSUFFICIENT_RESOURCES.
// Salida: JSON { failures, warnings, consoleErrors, contrast, brand,
// screenshots }. Exit 1 si hay fallos.

import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:4173';
const shotsDir = process.env.SHOTS_DIR ?? 'docs/qa/h46c-visual-audit';
mkdirSync(shotsDir, { recursive: true });
const failures = [];
const warnings = [];
const consoleErrors = [];
const screenshots = [];
const contrast = [];
const brand = {};
const cutover = [];

// Valores v2 (src/styles/krumm-tokens.css, design-system.md §10):
const V2 = {
  cream: 'rgb(247, 239, 230)',   // --k-bg-light #f7efe6
  beige: 'rgb(242, 232, 220)',   // --k-bg-beige #f2e8dc
  sand: 'rgb(228, 205, 181)',    // --k-bg-light-sand #e4cdb5
  espresso: 'rgb(61, 43, 32)',   // --k-ink-espresso #3d2b20
  gold: 'rgb(216, 179, 140)',    // --k-gold / --k-accent-sand #d8b38c
  terra: 'rgb(112, 79, 57)',    // --k-ink-terracotta #704f39
  cardDark: 'rgb(56, 39, 29)',   // --k-bg-dark #38271d
};

const REPORT_PATH = '/empresa/proceso/supervisor/candidatos/maria-gonzalez';

// 12 rutas de la fase (V0–V4). kind: candidate | company | portal | companyLogin.
const ROUTES = [
  { path: '/portal', kind: 'portal', slug: 'portal' },
  { path: '/candidato', kind: 'candidate', slug: 'candidato' },
  { path: '/candidato/acceso', kind: 'candidate', slug: 'candidato-acceso' },
  { path: '/empleos', kind: 'candidate', slug: 'empleos' },
  { path: '/empresa/acceso', kind: 'companyLogin', slug: 'empresa-acceso' },
  { path: '/empresa', kind: 'company', slug: 'empresa-dashboard' },
  { path: '/empresa/procesos', kind: 'company', slug: 'empresa-procesos' },
  { path: '/empresa/proceso/supervisor', kind: 'company', slug: 'empresa-detalle-supervisor' },
  { path: REPORT_PATH, kind: 'company', slug: 'empresa-informe-candidato' },
  { path: '/empresa/nueva-solicitud', kind: 'company', slug: 'empresa-nueva-solicitud' },
  { path: '/empresa/nueva-solicitud/diseño', kind: 'company', slug: 'empresa-diseno' },
  { path: '/empresa/nueva-solicitud/subida', kind: 'company', slug: 'empresa-subida' },
];

// h1 esperado por ruta/idioma (mismo origen que el app: V3_COPY pages.*.title).
const H1 = {
  es: {
    '/portal': 'Elige tu portal',
    // V1 (t_482f57b2): el home candidato usa el hero de la referencia (no el
    // título de shell de la era V0).
    '/candidato': 'Encuentra tu próxima oportunidad.',
    '/candidato/acceso': 'Acceso candidato',
    '/empleos': 'Bolsa de empleos',
    '/empresa/acceso': 'Portal para empresas',
    '/empresa': 'Dashboard',
    '/empresa/procesos': 'Procesos activos',
    // V3 (t_84f00355): el detalle usa el nombre del rol (3 perfiles ref).
    '/empresa/proceso/supervisor': 'Supervisor de Planta',
    [REPORT_PATH]: 'Informe del candidato',
    '/empresa/nueva-solicitud': 'Nueva solicitud',
    '/empresa/nueva-solicitud/diseño': 'Nueva solicitud · Diseñar con KRUMM',
    '/empresa/nueva-solicitud/subida': 'Nueva solicitud · Subir perfil',
  },
  en: {
    '/portal': 'Choose your portal',
    '/candidato': 'Find your next opportunity.',
    '/candidato/acceso': 'Candidate access',
    '/empleos': 'Job board',
    '/empresa/acceso': 'Company Portal',
    '/empresa': 'Dashboard',
    '/empresa/procesos': 'Active processes',
    '/empresa/proceso/supervisor': 'Plant Supervisor',
    [REPORT_PATH]: 'Candidate report',
    '/empresa/nueva-solicitud': 'New request',
    '/empresa/nueva-solicitud/diseño': 'New request · Design with KRUMM',
    '/empresa/nueva-solicitud/subida': 'New request · Upload profile',
  },
};

// Selector del párrafo de entrada (lead) por tipo de shell.
const LEAD_SEL = {
  candidate: '.v3-cp-main p',
  company: '.v3-co-main p',
  portal: '.v3-bare-main p',
  companyLogin: '.v3-bare-main p',
};

// Color esperado del outline de la pill de idioma por superficie (v3Shells.css):
// la pill vive en headers/topbars CLARAS en los 4 shells (candidate topbar,
// company header .v3-co-header, bare) → terracota 3px en todas. El focus arena
// aplica a los links DENTRO de la sidebar oscura (no a la pill).
const PILL_FOCUS = {
  candidate: V2.terra,
  company: V2.terra,
  portal: V2.terra,
  companyLogin: V2.terra,
};

const SHOT_EN = new Set(['/portal', '/candidato', '/empresa', '/empresa/procesos']);

const DESKTOP = { width: 1280, height: 720 };
const MOBILE = { width: 390, height: 844 };

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

async function openView({ tag, path, viewport, expectHeading }) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  track(page, tag);
  await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' });
  if (expectHeading) {
    await page.getByRole('heading', { name: expectHeading }).waitFor({ timeout: 20000 })
      .catch(async () => {
        const state = await page.evaluate(() => document.querySelector('h1')?.innerText ?? '(sin h1)');
        failures.push(`[${tag}] h1 esperado no apareció (estado: ${state})`);
      });
  }
  return { context, page };
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
  return overflow;
}

async function checkSingleH1(page, tag, expected) {
  const r = await page.evaluate(() => {
    const h1s = [...document.querySelectorAll('h1')];
    return { count: h1s.length, text: h1s[0]?.textContent ?? null };
  });
  if (r.count !== 1) {
    failures.push(`[${tag}] h1 esperados 1, encontrados ${r.count}`);
  } else if (r.text !== expected) {
    failures.push(`[${tag}] h1 inesperado: "${r.text}" (esperado "${expected}")`);
  }
}

// Contraste WCAG AA ≥4.5 (texto vs fondo más cercano opaco, 12 ancestros).
async function checkContrast(page, tag, selText, label) {
  const r = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return { found: false };
    const cs = getComputedStyle(el);
    const parse = (s) => {
      const m = s.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const parts = m[1].split(',').map(parseFloat);
      return { rgb: parts.slice(0, 3), a: parts.length > 3 ? parts[3] : 1 };
    };
    const lum = ([r, g, b]) => {
      const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const fg = parse(cs.color);
    if (!fg) return { found: true, ratio: null, color: cs.color };
    let node = el;
    for (let i = 0; i < 12 && node; i += 1) {
      const c = parse(getComputedStyle(node).backgroundColor);
      if (c && c.a > 0.9) {
        const L1 = lum(fg.rgb);
        const L2 = lum(c.rgb);
        const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
        return { found: true, ratio: Math.round(ratio * 100) / 100, color: cs.color, bg: getComputedStyle(node).backgroundColor };
      }
      node = node.parentElement;
    }
    return { found: true, ratio: null, color: cs.color };
  }, selText);
  contrast.push({ tag, label, sel: selText, ...r });
  if (!r.found) {
    failures.push(`[${tag}] contraste: selector ausente ${selText} (${label})`);
  } else if (r.ratio !== null && r.ratio < 4.5) {
    failures.push(`[${tag}] contraste AA (<4.5:1) en "${label}": ratio=${r.ratio} (texto ${r.color} sobre ${r.bg})`);
  }
}

async function checkBrandFont(page, tag) {
  const r = await page.evaluate(() => {
    const body = getComputedStyle(document.body).fontFamily;
    return { body };
  });
  brand[tag] = { body: r.body };
  if (!/Manrope/.test(r.body)) {
    failures.push(`[${tag}] body sin Manrope (marca v2): ${r.body}`);
  }
}

// Pill de idioma: focus → outline :focus-visible. Claras: 3px terracota;
// sidebar empresa: 3px arena.
async function checkPillFocus(page, tag, expectColor) {
  const r = await page.evaluate(() => {
    const btn = document.querySelector('.krumm-lang-toggle__btn');
    if (!btn) return { found: false };
    btn.focus();
    const cs = getComputedStyle(btn);
    return { found: true, outlineWidth: cs.outlineWidth, outlineStyle: cs.outlineStyle, outlineColor: cs.outlineColor };
  });
  if (!r.found) {
    warnings.push(`[${tag}] pill de idioma no presente en la vista (sin check de focus)`);
    return;
  }
  if (r.outlineStyle === 'none') {
    await page.keyboard.press('Tab');
    const r2 = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || !String(el.className ?? '').includes('krumm-lang-toggle__btn')) return null;
      const cs = getComputedStyle(el);
      return { outlineWidth: cs.outlineWidth, outlineStyle: cs.outlineStyle, outlineColor: cs.outlineColor };
    });
    if (!r2) {
      warnings.push(`[${tag}] pill focus no verificable (focus-visible inaplicable en headless)`);
      return;
    }
    r.outlineWidth = r2.outlineWidth; r.outlineStyle = r2.outlineStyle; r.outlineColor = r2.outlineColor;
  }
  if (r.outlineStyle !== 'none' && r.outlineColor !== expectColor) {
    failures.push(`[${tag}] pill focus: outline ${r.outlineWidth} ${r.outlineStyle} ${r.outlineColor} (esperado ${expectColor})`);
  } else {
    contrast.push({ tag, label: 'pill-focus-outline', note: `outline=${r.outlineWidth} ${r.outlineStyle} ${r.outlineColor}` });
  }
}

async function auditRoute({ tag, path, kind, viewport, lang, h1Expected, leadSel, screenshotName, withPill, withContrast }) {
  const { context, page } = await openView({ tag, path, viewport });
  await checkSingleH1(page, tag, h1Expected);
  await assertNoOverflow(page, tag);
  await checkBrandFont(page, tag);
  if (withContrast) {
    await checkContrast(page, tag, 'h1', 'h1');
    if (leadSel) await checkContrast(page, tag, leadSel, 'lead');
  }
  if (withPill) await checkPillFocus(page, tag, PILL_FOCUS[kind]);
  if (screenshotName) await shot(page, screenshotName);
  await context.close();
  cutover.push({ tag, lang, path, h1: h1Expected, ok: true });
}

// ============ CUTOVER: verificación de redirecciones (desktop) ============

// r01: /reclutador → /empresa (preserva ES).
{
  const context = await browser.newContext({ viewport: DESKTOP });
  const page = await context.newPage();
  track(page, 'r01');
  await page.goto(`${baseUrl}/reclutador`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: H1.es['/empresa'] }).waitFor({ timeout: 20000 })
    .catch(() => failures.push('[r01] /reclutador no llegó al h1 de /empresa'));
  const url = page.url();
  if (!url.includes('/empresa')) failures.push(`[r01] /reclutador no redirigió a /empresa (url: ${url})`);
  await assertNoOverflow(page, 'r01');
  await shot(page, 'r01-reclutador-a-empresa');
  cutover.push({ from: '/reclutador', to: url, lang: 'es' });
  await context.close();
}

// r02: /postulaciones (sin invite) → /candidato (preserva ES).
{
  const context = await browser.newContext({ viewport: DESKTOP });
  const page = await context.newPage();
  track(page, 'r02');
  await page.goto(`${baseUrl}/postulaciones`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: H1.es['/candidato'] }).waitFor({ timeout: 20000 })
    .catch(() => failures.push('[r02] /postulaciones no llegó al h1 de /candidato'));
  const url = page.url();
  if (!url.includes('/candidato')) failures.push(`[r02] /postulaciones no redirigió a /candidato (url: ${url})`);
  await assertNoOverflow(page, 'r02');
  await shot(page, 'r02-postulaciones-a-candidato');
  cutover.push({ from: '/postulaciones', to: url, lang: 'es' });
  await context.close();
}

// r03: /reclutador?lang=en → /empresa?lang=en (preserva el idioma).
{
  const context = await browser.newContext({ viewport: DESKTOP });
  const page = await context.newPage();
  track(page, 'r03');
  await page.goto(`${baseUrl}/reclutador?lang=en`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: H1.en['/empresa'] }).waitFor({ timeout: 20000 })
    .catch(() => failures.push('[r03] /reclutador?lang=en no llegó al h1 EN de /empresa'));
  const url = page.url();
  if (!url.includes('/empresa?lang=en')) failures.push(`[r03] /reclutador?lang=en no preservó ?lang=en (url: ${url})`);
  cutover.push({ from: '/reclutador?lang=en', to: url, lang: 'en' });
  await context.close();
}

// r04: /postulaciones?lang=en → /candidato?lang=en (h1 EN).
{
  const context = await browser.newContext({ viewport: DESKTOP });
  const page = await context.newPage();
  track(page, 'r04');
  await page.goto(`${baseUrl}/postulaciones?lang=en`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: H1.en['/candidato'] }).waitFor({ timeout: 20000 })
    .catch(() => failures.push('[r04] /postulaciones?lang=en no llegó al h1 EN de /candidato'));
  const url = page.url();
  if (!url.includes('/candidato?lang=en')) failures.push(`[r04] /postulaciones?lang=en no preservó ?lang=en (url: ${url})`);
  cutover.push({ from: '/postulaciones?lang=en', to: url, lang: 'en' });
  await context.close();
}

// r05: /postulaciones?invite=… NO redirige (el flujo se conserva).
{
  const context = await browser.newContext({ viewport: DESKTOP });
  const page = await context.newPage();
  track(page, 'r05');
  await page.goto(`${baseUrl}/postulaciones?invite=tok-live-abc123`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: /Preparación de la sesión|Session preparation/i }).waitFor({ timeout: 20000 })
    .catch(() => failures.push('[r05] /postulaciones?invite=… no entró al setup (flujo roto)'));
  const url = page.url();
  if (!url.includes('/postulaciones')) failures.push(`[r05] /postulaciones?invite=… fue redirigido incorrectamente (url: ${url})`);
  cutover.push({ from: '/postulaciones?invite=tok-live-abc123', to: url, lang: 'es', flow: 'conservado' });
  await context.close();
}

// r06: /reclutador en móvil → /empresa (0 overflow).
{
  const context = await browser.newContext({ viewport: MOBILE });
  const page = await context.newPage();
  track(page, 'r06');
  await page.goto(`${baseUrl}/reclutador`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: H1.es['/empresa'] }).waitFor({ timeout: 20000 })
    .catch(() => failures.push('[r06] /reclutador móvil no llegó al h1 de /empresa'));
  await assertNoOverflow(page, 'r06');
  cutover.push({ from: '/reclutador (móvil)', to: page.url(), lang: 'es' });
  await context.close();
}

// ============ ES DESKTOP 1280×720 — 12 rutas ============
for (const route of ROUTES) {
  await auditRoute({
    tag: `D-${route.slug}`,
    path: route.path,
    kind: route.kind,
    viewport: DESKTOP,
    lang: 'es',
    h1Expected: H1.es[route.path],
    leadSel: LEAD_SEL[route.kind],
    screenshotName: `d-${route.slug}-es`,
    withPill: true,
    withContrast: true,
  });
}

// Eyebrow del home candidato (kicker terracota AA verificado en V1).
{
  const context = await browser.newContext({ viewport: DESKTOP });
  const page = await context.newPage();
  track(page, 'D-cp-eyebrow');
  await page.goto(`${baseUrl}/candidato`, { waitUntil: 'networkidle' });
  await checkContrast(page, 'D-cp-eyebrow', '.v3-cp-eyebrow', 'eyebrow home candidato');
  await context.close();
}

// ============ ES MÓVIL 390×844 — 12 rutas ============
for (const route of ROUTES) {
  await auditRoute({
    tag: `M-${route.slug}`,
    path: route.path,
    kind: route.kind,
    viewport: MOBILE,
    lang: 'es',
    h1Expected: H1.es[route.path],
    leadSel: null,
    screenshotName: `m-${route.slug}-es`,
    withPill: false,
    withContrast: false,
  });
}

// ============ EN DESKTOP 1280×720 — 12 rutas (paridad i18n) ============
for (const route of ROUTES) {
  await auditRoute({
    tag: `E-${route.slug}`,
    path: `${route.path}?lang=en`,
    kind: route.kind,
    viewport: DESKTOP,
    lang: 'en',
    h1Expected: H1.en[route.path],
    leadSel: null,
    screenshotName: SHOT_EN.has(route.path) ? `e-${route.slug}-en` : null,
    withPill: false,
    withContrast: false,
  });
}

await browser.close();
const result = {
  baseUrl,
  audit: 'h46c — fase v3 cutover (t_0184d2e6)',
  views: ROUTES.length * 3 + 6,
  failures,
  warnings,
  consoleErrors: consoleErrors.slice(0, 20),
  contrast: contrast.slice(0, 60),
  cutover,
  brand,
  screenshots,
};
console.log(JSON.stringify(result, null, 2));
process.exit(failures.length ? 1 : 0);
