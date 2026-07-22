import { chromium } from '@playwright/test';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:5173';
const routes = [
  '/postulaciones-demo?fixture=1&battery=original',
  '/postulaciones-demo?fixture=1',
  '/postulaciones-demo?battery=original',
  '/postulaciones-demo',
];
const viewports = [
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'mobile', width: 390, height: 844 },
];

const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1, isMobile: viewport.width < 600 });
    const consoleErrors = [];
    const pageErrors = [];
    const requestFailures = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('requestfailed', (request) => requestFailures.push(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}`));

    for (const route of routes) {
      await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' });
      const isOriginalFixture = route.includes('fixture=1') && route.includes('battery=original');
      if (isOriginalFixture) {
        const drawerSummary = page.locator('summary', { hasText: 'Qué se procesó en segundo plano' });
        if (await drawerSummary.count()) await drawerSummary.first().click();
      }
      const metrics = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        bodyText: document.body.innerText,
      }));
      const overflow = metrics.scrollWidth > metrics.clientWidth + 1;
      const isFixtureReport = route.includes('fixture=1');
      const feedbackVisible = isOriginalFixture
        ? /Solución clara/i.test(metrics.bodyText)
          && /Estrategia riesgo\/recompensa/i.test(metrics.bodyText)
          && /Ruta eficiente/i.test(metrics.bodyText)
          && /Coordinación estructurada/i.test(metrics.bodyText)
          && /8 constructos con señal de demo/i.test(metrics.bodyText)
          && /Resumen ejecutivo HR/i.test(metrics.bodyText)
          && /No ranking automático/i.test(metrics.bodyText)
          && !/Evidencia insuficiente|Solo descriptivo/i.test(metrics.bodyText)
        : true;
      const forbiddenVisible = isFixtureReport
        ? /rawGameEvents|pointerSamples|faceSamples|landmarks|keypoints|beamCells|pumpSequence|fullRoute|visitedCells/.test(metrics.bodyText)
        : false;
      results.push({
        viewport: viewport.name,
        route,
        overflow,
        feedbackVisible,
        forbiddenVisible,
        consoleErrors: consoleErrors.length,
        pageErrors: pageErrors.length,
        requestFailures: requestFailures.length,
      });
    }
    await page.close();
  }
} finally {
  await browser.close();
}

const failures = results.filter((result) => (
  result.overflow
  || !result.feedbackVisible
  || result.forbiddenVisible
  || result.consoleErrors > 0
  || result.pageErrors > 0
  || result.requestFailures > 0
));
console.log(JSON.stringify({ baseUrl, results, failures }, null, 2));
if (failures.length) process.exit(1);
