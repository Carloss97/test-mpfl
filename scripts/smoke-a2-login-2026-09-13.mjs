#!/usr/bin/env node
// E2E smoke A.2 — login Cognito real en stage (2026-09-13).
// Reproduce el flujo exacto del usuario: CTA → hosted UI → credenciales →
// retorno ?code&state → exchange PKCE → workspace. Captura la respuesta del
// endpoint /oauth2/token (status + body) para diagnosticar auth_exchange_failed.
// Credenciales: QA_RECRUITER_EMAIL / QA_RECRUITER_PASSWORD (~/.hermes/.env).
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const envText = readFileSync('/home/sarlock/.qa_creds/recruiter.txt', 'utf8').trim().split('\n');
const [EMAIL, PASSWORD] = envText;
if (!EMAIL || !PASSWORD) {
  console.error('Faltan credenciales QA en /home/sarlock/.qa_creds/recruiter.txt');
  process.exit(2);
}

const STAGE = 'https://stage.krumm.cl';
const tokenCalls = [];
let finalUrl = null;
let pageErrors = [];

const browser = await chromium.launch({
  executablePath: '/home/sarlock/.cache/ms-playwright/chromium-1234/chrome-linux/chrome',
});
const context = await browser.newContext({
  locale: 'es-CL',
  timezoneId: 'America/Santiago',
  viewport: { width: 1440, height: 900 },
});
const page = await context.newPage();
page.on('pageerror', (e) => pageErrors.push(String(e)));
page.on('requestfailed', (req) => {
  console.error('REQUESTFAILED:', req.url().slice(0, 130), '|', req.failure()?.errorText);
});
page.on('request', (req) => {
  if (req.url().includes('/oauth2/token')) console.error('TOKEN REQUEST ENVIADO:', req.method());
});
page.on('response', async (resp) => {
  const url = resp.url();
  if (url.includes('/oauth2/token')) {
    // Never log token/error response bodies: successful responses contain credentials.
    // Status and origin are sufficient for the E2E diagnostic.
    tokenCalls.push({ status: resp.status(), origin: new URL(url).origin });
  }
});

const fail = async (msg) => {
  console.error(`FAIL: ${msg}`);
  console.error('tokenCalls:', JSON.stringify(tokenCalls, null, 2));
  console.error('pageErrors:', JSON.stringify(pageErrors.slice(0, 5)));
  try {
    const inputs = await page.$$eval('input', (els) =>
      els.map((e) => ({ id: e.id, type: e.type, name: e.name, placeholder: e.placeholder })),
    );
    console.error('inputs en página:', JSON.stringify(inputs, null, 2));
    const html = await page.content();
    const title = await page.title();
    console.error('title:', title, '| html len:', html.length);
    console.error('html snippet:', html.replace(/\s+/g, ' ').slice(0, 1200));
    await page.screenshot({ path: '/tmp/a2-e2e-fail.png', fullPage: false });
    console.error('screenshot: /tmp/a2-e2e-fail.png');
  } catch (e2) {
    console.error('diag extra falló:', String(e2).slice(0, 120));
  }
  await browser.close();
  process.exit(1);
};

try {
  // 1) Page de acceso
  await page.goto(`${STAGE}/empresa/acceso`, { waitUntil: 'networkidle', timeout: 45000 });
  if (!page.url().includes('/empresa/acceso')) await fail(`URL inicial inesperada: ${page.url()}`);
  console.log('1) /empresa/acceso cargada');

  // 2) CTA login → hosted UI
  await page.click('button:has-text("Iniciar sesión")');
  await page.waitForURL('**/*.amazoncognito.com/**', { timeout: 30000 });
  console.log('2) hosted UI abierta:', page.url());

  // 3) Cognito may serve either the legacy combined form or the managed
  //    two-step UI. Select only visible controls and never print credential values.
  const legacyUsername = page.locator('input#signInFormUsername:visible');
  const managedUsername = page.locator('input[name="username"]:visible');
  if (await legacyUsername.count()) {
    await legacyUsername.fill(EMAIL);
    await page.locator('input#signInFormPassword:visible').fill(PASSWORD);
    await page.locator('input[type="submit"]:visible').click();
  } else {
    await managedUsername.fill(EMAIL);
    await page.getByRole('button', { name: /next|siguiente|continue|continuar|sign in|iniciar sesi/i }).click();
    await page.locator('input[type="password"]:visible').fill(PASSWORD);
    await page.getByRole('button', { name: /sign in|iniciar sesi|continue|continuar/i }).click();
  }
  console.log('3) credenciales enviadas');

  // 4) Submit → Cognito redirige con code
  const callbackGlob = ['**/empresa/acceso?', 'code', '=', '*'].join('');
  await page.waitForURL(callbackGlob, { timeout: 30000 });
  console.log('4) retorno con code:', page.url().replace(/code=[^&]+/, 'code=***'));

  // 5) Exchange automático (SPA) → espera outcome
  await page.waitForTimeout(8000);
  finalUrl = page.url();
  const tokenOk = tokenCalls.some((t) => t.status === 200);
  console.log('5) tokenCalls:', JSON.stringify(tokenCalls, null, 2));
  console.log('5) finalUrl:', finalUrl);
  await page.screenshot({ path: '/tmp/a2-e2e-final.png', fullPage: false });

  if (tokenOk && finalUrl.includes('/empresa') && !finalUrl.includes('acceso')) {
    const bodyText = await page.textContent('body');
    if (bodyText.includes('Sesiones reales') || bodyText.includes('workspace') || bodyText.toLowerCase().includes('sesión')) {
      console.log('PASS: login E2E completo — exchange OK + workspace visible');
      await browser.close();
      process.exit(0);
    }
    await fail('token 200 pero la página final no parece el workspace');
  }
  await fail(`login falló (tokenOk=${tokenOk})`);
} catch (e) {
  await fail(`${e.name}: ${String(e.message).slice(0, 300)}`);
}