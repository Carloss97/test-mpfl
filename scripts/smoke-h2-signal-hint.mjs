// H2 smoke browser (2026-09-07): "¿qué pasa detrás?" eliminado + indicador
// discreto de error de señal. Dos recorridos en Vite dev local:
//   Run A (ok): setup + stage sin cámara → sin HUD, sin chip.
//   Run B (error): activar cámara en headless (getUserMedia falla) → chip
//   bloqueante "Puedes continuar sin cámara" + "Detener evaluación" en setup
//   y persistente en el stage.
// Salida: JSON { failures, screenshots[] }. Exit 1 si hay fallos.

import { chromium } from '@playwright/test';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:5173';
const shotsDir = process.env.SHOTS_DIR ?? 'docs/qa/h2-shots';
const failures = [];
const consoleErrors = [];
const screenshots = [];

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
  page.on('requestfailed', (req) => consoleErrors.push(`[${tag}] requestfailed ${req.url()}`));
}

async function assertHudAbsent(page, tag) {
  const body = await page.evaluate(() => document.body.innerText);
  for (const pattern of [/Procesando en segundo plano/i, /Procesamiento en segundo plano/i, /Ver qué pasa detrás/i, /Ocultar detalle/i, /de 5 listos/i]) {
    const tagLabel = `[${tag}]`;
    if (pattern.test(body)) failures.push(`${tagLabel} HUD "detrás" visible: ${pattern}`);
  }
  const chip = await page.locator('[data-testid="signal-error-hint-chip"]').count();
  if (chip > 0) failures.push(`[${tag}] chip de error visible en modo ok (debe estar ausente)`);
}

async function shot(page, name) {
  const path = `${shotsDir}/${name}.png`;
  await page.screenshot({ path });
  screenshots.push(path);
}

// ---------- Run A: ok (sin cámara) ----------
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  track(page, 'A');
  await page.goto(`${baseUrl}/postulaciones?battery=original`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Comenzar prueba de postulación/i }).click();

  // Setup: sin HUD, sin chip.
  await page.getByRole('heading', { name: /Preparación de la sesión/i }).waitFor({ timeout: 8000 });
  await assertHudAbsent(page, 'A-setup');
  const sfxVisible = await page.locator('[data-testid="sfx-toggle"]').count();
  if (sfxVisible > 0) failures.push('[A-setup] sfx-toggle no debería estar en setup');
  await shot(page, 'a1-setup-ok');

  // Continuar a juegos.
  await page.getByTestId('postulation-explicit-consent').check();
  await page.getByRole('button', { name: /Continuar a juegos/i }).click();
  await page.getByText(/Nivel 1 de 3/i).waitFor({ timeout: 8000 });

  // Stage (laser): sin HUD, sin chip, sfx presente.
  await assertHudAbsent(page, 'A-stage');
  const sfx = await page.locator('[data-testid="sfx-toggle"]').count();
  if (sfx !== 1) failures.push(`[A-stage] sfx-toggle esperado (count=${sfx})`);
  await shot(page, 'a2-stage-ok-laser');
  await page.close();
}

// ---------- Run B: error de cámara (headless → getUserMedia falla) ----------
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  track(page, 'B');
  await page.goto(`${baseUrl}/postulaciones?battery=original`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Comenzar prueba de postulación/i }).click();
  await page.getByRole('heading', { name: /Preparación de la sesión/i }).waitFor({ timeout: 8000 });

  await page.getByRole('button', { name: /Activar cámara local \(opcional\)/i }).click();
  // getUserMedia en headless falla → snapshot camera 'error' → chip bloqueante inmediato.
  const chip = page.locator('[data-testid="signal-error-hint-chip"]');
  await chip.waitFor({ timeout: 30000 }).catch(() => failures.push('[B-setup] chip de error no apareció tras fallar la cámara'));
  if (await chip.count()) {
    const chipText = await chip.innerText();
    if (!/Puedes continuar sin cámara/i.test(chipText)) failures.push(`[B-setup] copy del chip inesperado: ${chipText}`);
    if (!/Cámara no disponible/i.test(chipText)) failures.push(`[B-setup] título bloqueante ausente: ${chipText}`);
    const anchor = page.locator('[data-testid="signal-error-hint"]');
    if ((await anchor.getAttribute('aria-live')) !== 'assertive') failures.push('[B-setup] anchor aria-live debe ser assertive en bloqueante');
    if ((await anchor.getAttribute('role')) !== 'alert') failures.push('[B-setup] anchor role debe ser alert en bloqueante');
    const stop = page.locator('[data-testid="signal-hint-stop"]');
    if ((await stop.count()) !== 1) failures.push('[B-setup] botón "Detener evaluación" ausente');
    else if (!/Detener evaluación/i.test(await stop.innerText())) failures.push('[B-setup] label de detener inesperado');
    const retry = page.getByRole('button', { name: /Reintentar cámara/i });
    if ((await retry.count()) !== 1) failures.push('[B-setup] botón "Reintentar cámara" ausente');
  }
  await shot(page, 'b1-setup-camera-error');

  // "Detener evaluación" (onStop → onBack) regresa a la landing.
  await page.locator('[data-testid="signal-hint-stop"]').click();
  await page.getByRole('heading', { name: /KRUMM Postulaciones/i }).waitFor({ timeout: 8000 })
    .catch(() => failures.push('[B-setup] "Detener evaluación" no regresó a la landing'));
  await shot(page, 'b2-landing-after-stop');

  // El candidato puede seguir sin cámara: el estado resultante es 'idle'
  // (decisión tomada) → en el stage el indicador se calla (regla H2.1).
  await page.getByRole('button', { name: /Comenzar prueba de postulación/i }).click();
  await page.getByRole('heading', { name: /Preparación de la sesión/i }).waitFor({ timeout: 8000 });
  await page.getByTestId('postulation-explicit-consent').check();
  await page.getByRole('button', { name: /Continuar a juegos/i }).click();
  await page.getByText(/Nivel 1 de 3/i).waitFor({ timeout: 8000 });
  await assertHudAbsent(page, 'B-stage-sin-cámara');
  const sfxStage = await page.locator('[data-testid="sfx-toggle"]').count();
  if (sfxStage !== 1) failures.push(`[B-stage-sin-cámara] sfx-toggle esperado (count=${sfxStage})`);
  await shot(page, 'b3-stage-no-camera-silent');
  await page.close();
}

await browser.close();
const result = { baseUrl, failures, consoleErrors: consoleErrors.slice(0, 10), screenshots };
console.log(JSON.stringify(result, null, 2));
process.exit(failures.length ? 1 : 0);
