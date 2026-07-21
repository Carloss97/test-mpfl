import { chromium } from '@playwright/test';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:5173';
const viewport = {
  width: Number(process.env.VIEWPORT_WIDTH ?? 1280),
  height: Number(process.env.VIEWPORT_HEIGHT ?? 720),
};
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport });
const failures = [];
const errors = [];
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
page.on('pageerror', (error) => errors.push(error.message));

try {
  await page.goto(`${baseUrl}/postulaciones-demo/hr`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: /Panel de evaluaciones/i }).waitFor({ timeout: 5000 });

  const visibleText = await page.locator('body').innerText();
  if (!/Datos sintéticos/i.test(visibleText)) failures.push('Synthetic-data label is missing.');
  if (!/No ranking automático/i.test(visibleText)) failures.push('Human-review governance label is missing.');
  if (/contratar|rechazar|apto\/no apto/i.test(visibleText)) failures.push('Dashboard exposes automated hiring language.');

  await page.getByRole('searchbox', { name: /Buscar evaluación/i }).fill('017');
  if (await page.getByRole('button', { name: /Abrir Perfil 017/i }).count() !== 1) failures.push('Search did not isolate Perfil 017.');
  if (await page.getByRole('button', { name: /Abrir Perfil 042/i }).count() !== 0) failures.push('Search kept unrelated profiles visible.');
  await page.getByRole('button', { name: /Limpiar filtros/i }).click();

  await page.getByRole('button', { name: /Abrir Perfil 028/i }).click();
  const profile028 = page.getByRole('region', { name: /Detalle de Perfil 028/i });
  await profile028.waitFor({ timeout: 3000 });
  if (await profile028.getByRole('meter').count() !== 8) failures.push('Completed profile does not show eight construct meters.');

  await page.getByRole('button', { name: /Abrir Perfil 075/i }).click();
  const profile075 = page.getByRole('region', { name: /Detalle de Perfil 075/i });
  await profile075.waitFor({ timeout: 3000 });
  if (await profile075.getByText(/Sin evidencia aún/i).count() !== 4) failures.push('Missing construct evidence is not presented as pending.');
  if (await profile075.getByLabel(/Adaptabilidad: 0 de 100/i).count() !== 0) failures.push('Missing adaptability was converted to zero.');

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  if (overflow) failures.push('Horizontal overflow detected.');

  if (viewport.width <= 640) {
    const smallTargets = await page.evaluate(() => [...document.querySelectorAll('button, a, input, select')]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && rect.height < 44;
      })
      .map((element) => ({ text: element.textContent?.trim() || element.getAttribute('aria-label'), height: element.getBoundingClientRect().height }))
      .slice(0, 10));
    if (smallTargets.length) failures.push(`Touch targets below 44px: ${JSON.stringify(smallTargets)}`);
  }

  if (errors.length) failures.push(`Console/page errors: ${errors.join(' | ')}`);
} catch (error) {
  const bodyText = await page.locator('body').innerText().catch(() => 'body unavailable');
  failures.push(`${error.message}\nBODY:\n${bodyText.slice(0, 1400)}`);
} finally {
  await browser.close();
}

console.log(JSON.stringify({ baseUrl, viewport, failures }, null, 2));
if (failures.length) process.exit(1);
