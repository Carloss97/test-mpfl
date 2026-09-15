// Test email noche 7 (item 5 pendiente): login Cognito QA + 2 invitaciones reales
// (SES) para verificar rutas de entrega: sarlock13@gmail.com (spam) y
// sarlock13@krumm.cl (ruta Cloudflare).
//
// Uso (cuando el login del domain esté operativo):
//   cd /home/sarlock/krumm/test-mpfl && node scripts/smoke-email-test-2026-09-14.mjs
//
// Nota: selectores genéricos (input[type=email] + input[type=password]) para
// cubrir la hosted UI clásica (#signInFormUsername) y la managed login v2 (SPA).
// Si Cognito pide elegir método (choice-based ALLOW_USER_AUTH): email primero,
// "Continue", luego password.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const [EMAIL, L2] = readFileSync('/home/sarlock/.qa_creds/recruiter.txt', 'utf8').trim().split('\n');
if (!EMAIL || !L2) { console.error('Faltan credenciales QA'); process.exit(2); }

const API = 'https://rwm08ik23m.execute-api.us-east-1.amazonaws.com/staging';
const STAGE = 'https://stage.krumm.cl';

const browser = await chromium.launch({
  executablePath: '/home/sarlock/.cache/ms-playwright/chromium-1234/chrome-linux/chrome',
});
const ctx = await browser.newContext({ locale: 'es-CL', timezoneId: 'America/Santiago', viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const die = async (msg) => {
  console.error('FAIL:', msg);
  try { await page.screenshot({ path: '/tmp/email-test-fail.png' }); console.error('screenshot: /tmp/email-test-fail.png'); } catch {}
  await browser.close();
  process.exit(1);
};

try {
  // 1) Login vía hosted UI (stage)
  await page.goto(`${STAGE}/empresa/acceso`, { waitUntil: 'networkidle', timeout: 45000 });
  await page.click('button:has-text("Iniciar sesión")');
  await page.waitForURL('**/*.amazoncognito.com/**', { timeout: 30000 });

  const fillCreds = async () => {
    const u = page.locator('input[type="email"]:visible, input#signInFormUsername:visible, input[name="username"]:visible').first();
    const p = page.locator('input[type="password"]:visible, input#signInFormPassword:visible').first();
    await u.fill(EMAIL);
    await p.fill(L2);
    await page.locator('button[type="submit"]:visible, input[type="submit"]:visible, button:has-text("Continue"):visible, button:has-text("Sign in"):visible, button:has-text("Ingresar"):visible').first().click();
  };

  // choice-based (v2): puede haber 2 pasos (email → password)
  await page.waitForTimeout(3000);
  const hasUser = await page.locator('input[type="email"]:visible, input#signInFormUsername:visible, input[name="username"]:visible').count();
  const hasPass = await page.locator('input[type="password"]:visible, input#signInFormPassword:visible').count();
  if (hasUser > 0 && hasPass > 0) {
    await fillCreds(); // un solo paso
  } else if (hasUser > 0) {
    await page.locator('input[type="email"]:visible, input[name="username"]:visible').first().fill(EMAIL);
    await page.locator('button[type="submit"]:visible, button:has-text("Continue"):visible').first().click();
    await page.waitForSelector('input[type="password"]:visible', { timeout: 30000 });
    await page.locator('input[type="password"]:visible').first().fill(L2);
    await page.locator('button[type="submit"]:visible, button:has-text("Sign in"):visible').first().click();
  } else {
    await die('No aparece el form de login (¿domain aún caído?)');
  }

  // 2) Retorno con code → SPA hace el exchange PKCE
  // La app consume el code y hace replaceState → /empresa/acceso sin query.
  // Esperar la navegación al callback y luego la landing estable.
  await page.waitForURL('**/empresa/acceso**', { timeout: 30000 });
  await page.waitForTimeout(10000);
  console.log('1) post-login URL:', page.url().slice(0, 80));

  const store = await page.evaluate(() => {
    const out = {};
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      out[k] = sessionStorage.getItem(k);
    }
    return out;
  });
  let at = '';
  for (const v of Object.values(store)) {
    try { const d = JSON.parse(v); if (d?.accessToken) at = d.accessToken; } catch {}
  }
  if (!at) await die('Sin access token en sessionStorage (login falló)');
  console.log('2) token OK (len', at.length + ')');

  // 3) Dos invitaciones reales (SES) — spacing por rate limit 10 req/min/IP
  for (const dest of ['sarlock13@gmail.com', 'sarlock13@krumm.cl']) {
    const r = await fetch(`${API}/invitations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + at },
      body: JSON.stringify({ email: dest }),
    });
    const body = await r.text();
    console.log(`3) POST /invitations ${dest} → HTTP ${r.status} | ${body.slice(0, 300)}`);
    if (r.status !== 201) await die(`invitación ${dest} no 201`);
    await new Promise((res) => setTimeout(res, 8000));
  }
  console.log('PASS: 2 invitaciones reales enviadas (revisar spam Gmail + @krumm.cl)');
  await browser.close();
  process.exit(0);
} catch (e) {
  await die(e.message.slice(0, 300));
}
