// Verificación rápida: /dev/bomb renderiza en producción (BOMB, post-B6).
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'https://d3citl7gomy2ql.cloudfront.net';

const browser = await chromium.launch({
  executablePath: '/home/sarlock/.cache/ms-playwright/chromium-1234/chrome-linux/chrome',
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(`${BASE}/dev/bomb`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4000);

const h1 = await page.locator('h1').first().textContent().catch(() => null);
const body = (await page.textContent('body')) || '';
const hasPanel = /desactiva|manual|switch|cable|hold/i.test(body);
const bundle = await page.evaluate(() =>
  [...document.querySelectorAll('script[src]')].map(s => s.src).join(' '));

console.log(JSON.stringify({ h1, hasPanel, errors, bundle }, null, 2));
await browser.close();
process.exit(errors.length > 0 || !hasPanel ? 1 : 0);
