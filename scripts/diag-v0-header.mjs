// Diagnóstico (t_1c27edbf): box-shadow del button global técnico.
// 1) /candidato (v3): botones del chrome v3 → debe ser "none" (fix aplicado).
// 2) / (landing pública): LanguageToggle → evidencia del leak PREEXISTENTE
//    (mismo button global; la landing no lo neutraliza).
import { chromium } from '@playwright/test';

const browser = await chromium.launch({
  headless: true,
  executablePath: '/home/sarlock/.cache/ms-playwright/chromium-1234/chrome-linux/chrome',
  args: ['--headless=new', '--disable-dev-shm-usage', '--disable-gpu'],
});

async function shadowOf(page, selector) {
  return await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return { found: false };
    const s = getComputedStyle(el);
    return { found: true, boxShadow: s.boxShadow, fontWeight: s.fontWeight, padding: s.padding };
  }, selector);
}

const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await context.newPage();

await page.addInitScript(() => { try { localStorage.setItem('krumm-lang', 'es'); } catch {} });
await page.goto('http://127.0.0.1:4173/candidato', { waitUntil: 'load' });
await page.waitForFunction(() => document.querySelector('h1')?.textContent === 'Portal para candidatos', undefined, { timeout: 30000 });
await page.waitForTimeout(400);
const v3Help = await shadowOf(page, '.v3-cp-header .v3-text-button');
const v3DialogClose = null;
const header2x = await page.$('.v3-cp-header');
await header2x.screenshot({ path: 'docs/qa/v0-shells/t_1c27edbf-v0-diag-candidate-header-2x.png' });
const footer2x = await page.$('.v3-cp-footer');
await footer2x.screenshot({ path: 'docs/qa/v0-shells/t_1c27edbf-v0-diag-candidate-footer-2x.png' });

// landing pública (evidencia preexistente)
await page.goto('http://127.0.0.1:4173/', { waitUntil: 'load' });
await page.waitForFunction(() => document.querySelector('.landing__nav') !== null, undefined, { timeout: 30000 });
await page.waitForTimeout(400);
const landingToggle = await shadowOf(page, '.landing .krumm-lang-toggle__btn');

// empresa (v3): nav de sidebar — box-shadow none + weight 500
await page.goto('http://127.0.0.1:4173/empresa', { waitUntil: 'load' });
await page.waitForFunction(() => document.querySelector('h1')?.textContent === 'Dashboard', undefined, { timeout: 30000 });
await page.waitForTimeout(400);
const v3Nav = await shadowOf(page, '.v3-co-nav-item');
const v3NavActive = await page.evaluate(() => {
  const el = document.querySelector('.v3-co-nav-item.is-active');
  if (!el) return { found: false };
  const s = getComputedStyle(el);
  return { found: true, fontWeight: s.fontWeight, background: s.backgroundColor };
});
await context.close();

await browser.close();
console.log(JSON.stringify({ v3Help, v3Nav, v3NavActive, landingToggle }, null, 2));
