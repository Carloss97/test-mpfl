// M0 smoke: postulaciones-demo stable/original + fixtures, desktop & mobile, HR dashboard.
const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch();
  const results = [];
  const cases = [
    { name: 'stable-fixture-desktop', url: 'http://127.0.0.1:5173/postulaciones-demo?fixture=1', viewport: { width: 1280, height: 800 } },
    { name: 'original-fixture-desktop', url: 'http://127.0.0.1:5173/postulaciones-demo?fixture=1&battery=original', viewport: { width: 1280, height: 800 } },
    { name: 'landing-mobile', url: 'http://127.0.0.1:5173/postulaciones-demo', viewport: { width: 390, height: 844 } },
    { name: 'original-fixture-mobile', url: 'http://127.0.0.1:5173/postulaciones-demo?fixture=1&battery=original', viewport: { width: 390, height: 844 } },
  ];
  for (const c of cases) {
    const ctx = await browser.newContext({ viewport: c.viewport });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    page.on('requestfailed', (r) => errors.push('reqfail: ' + r.url()));
    await page.goto(c.url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
    const h1 = await page.locator('h1').first().textContent().catch(() => null);
    results.push({ case: c.name, title: await page.title(), h1: (h1 || '').trim(), horizontalOverflow: overflow, errors: errors.slice(0, 5) });
    await ctx.close();
  }
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('http://127.0.0.1:5173/postulaciones-demo/hr', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const bodyText = (await page.textContent('body')).slice(0, 200);
  results.push({ case: 'hr-dashboard', snippet: bodyText.replace(/\s+/g, ' '), errors: errs.slice(0, 3) });
  await ctx.close();
  console.log(JSON.stringify(results, null, 1));
  await browser.close();
})();
