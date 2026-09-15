import { chromium } from '@playwright/test';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:5173';
const viewports = [[1440, 900], [1280, 720], [390, 844]];
const browser = await chromium.launch({
  headless: true,
  executablePath: '/home/sarlock/.cache/ms-playwright/chromium-1234/chrome-linux/chrome',
  args: ['--headless=new', '--disable-dev-shm-usage', '--disable-gpu'],
});
const results = [];
const failures = [];

try {
  for (const [width, height] of viewports) {
    const context = await browser.newContext({ viewport: { width, height } });
    const navigationPage = await context.newPage();
    const navigationErrors = [];
    navigationPage.on('console', (message) => {
      if (message.type() === 'error') navigationErrors.push(`console: ${message.text()}`);
    });
    navigationPage.on('pageerror', (error) => navigationErrors.push(`page: ${error.message}`));
    navigationPage.on('requestfailed', (request) => navigationErrors.push(`request: ${request.url()} ${request.failure()?.errorText ?? ''}`));
    await navigationPage.goto(`${baseUrl}/empleos`, { waitUntil: 'networkidle' });
    await navigationPage.getByRole('link', { name: /Ver ejemplo de|View example:/ }).first().click();
    await navigationPage.waitForURL(/\/empleos\/analista-control-procesos$/);
    await navigationPage.locator('.v3-job-detail').waitFor();
    await navigationPage.getByRole('link', { name: /Volver al catálogo de demostración|Back to demonstration catalog/ }).click();
    await navigationPage.waitForURL(/\/empleos$/);
    if (navigationErrors.length) failures.push(`${width}x${height} list→detail→list: ${navigationErrors.join('; ')}`);
    await navigationPage.close();

    for (const path of ['/empleos', '/empleos/analista-control-procesos']) {
      const page = await context.newPage();
      const errors = [];
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(`console: ${message.text()}`);
      });
      page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
      page.on('requestfailed', (request) => errors.push(`request: ${request.url()} ${request.failure()?.errorText ?? ''}`));
      await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' });
      await page.locator(path === '/empleos' ? '.v3-jobs-grid' : '.v3-job-detail').waitFor();
      const measurement = await page.evaluate((routePath) => {
        const computed = (selector) => {
          const node = document.querySelector(selector);
          return node ? getComputedStyle(node) : null;
        };
        const iconSizes = [...document.querySelectorAll('.v3-job-section-icon, .v3-job-bullet-check, .v3-job-cta svg')]
          .map((node) => Math.round(node.getBoundingClientRect().width));
        const documentWidth = document.documentElement.scrollWidth;
        return {
          documentWidth,
          viewportWidth: window.innerWidth,
          overflow: documentWidth - window.innerWidth,
          eyebrowPx: routePath === '/empleos' ? Number.parseFloat(computed('.v3-jobs .v3-cp-eyebrow')?.fontSize ?? '0') : null,
          badgePx: Number.parseFloat(computed('.v3-job-badge')?.fontSize ?? '0'),
          metaPx: Number.parseFloat(computed('.v3-job-card-meta, .v3-job-detail-meta')?.fontSize ?? '0'),
          statusPx: Number.parseFloat(computed('.v3-job-status')?.fontSize ?? '0'),
          ctaBackground: computed('.v3-job-cta')?.backgroundColor,
          iconMin: iconSizes.length ? Math.min(...iconSizes) : null,
          iconMax: iconSizes.length ? Math.max(...iconSizes) : null,
        };
      }, path);
      results.push({ path, width, height, errors: [...errors], ...measurement });
      if (measurement.overflow > 1) failures.push(`${width}x${height} ${path}: overflow ${measurement.overflow}px`);
      if (measurement.eyebrowPx !== null && measurement.eyebrowPx < 12) failures.push(`${width}x${height} ${path}: catalog eyebrow below 12px`);
      if (measurement.badgePx < 12 || measurement.metaPx < 12 || measurement.statusPx < 12) failures.push(`${width}x${height} ${path}: informational text below 12px`);
      if (measurement.ctaBackground !== 'rgba(0, 0, 0, 0)') failures.push(`${width}x${height} ${path}: CTA background is ${measurement.ctaBackground}`);
      if (measurement.iconMin !== null && (measurement.iconMin < 14 || measurement.iconMax > 16)) failures.push(`${width}x${height} ${path}: icon range ${measurement.iconMin}-${measurement.iconMax}px`);
      if (errors.length) failures.push(`${width}x${height} ${path}: ${errors.join('; ')}`);
      await page.close();
    }
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({ results, failures }, null, 2));
if (failures.length) process.exitCode = 1;
