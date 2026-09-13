// E2E A.1: candidato abre link de invitación REAL en stage.krumm.cl.
// Verifica: guard de invitación (token válido contra backend /staging),
// carga del flujo candidato (setup screen), 0 console errors.
// Uso: node scripts/smoke-a1-e2e-invitation-2026-09-13.mjs <INVITE_TOKEN>
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const token = process.argv[2];
if (!token) { console.error('uso: node smoke-a1-e2e-invitation.mjs <token>'); process.exit(2); }

const outDir = '/tmp/krumm-a1-e2e';
mkdirSync(outDir, { recursive: true });
const url = `https://stage.krumm.cl/postulaciones?invite=${encodeURIComponent(token)}`;

let failures = 0;
const check = (label, cond, detail = '') => {
  if (cond) console.log('PASS', label);
  else { failures++; console.log('FAIL', label, detail); }
};

const browser = await chromium.launch({
  headless: true,
  executablePath: '/home/sarlock/.cache/ms-playwright/chromium-1234/chrome-linux/chrome',
  args: ['--headless=new', '--disable-dev-shm-usage', '--disable-gpu'],
});

for (const [label, vp] of [['desktop', { width: 1280, height: 720 }], ['mobile', { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ viewport: vp });
  const page = await ctx.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const apiResponses = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
  page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));
  page.on('response', (res) => {
    const u = res.url();
    if (u.includes('execute-api')) apiResponses.push(`${res.status()} ${u.slice(u.indexOf('amazonaws.com') + 14, u.indexOf('amazonaws.com') + 50)}`);
  });

  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch((e) => check(`${label}: carga`, false, String(e).slice(0, 150)));
  await page.waitForTimeout(2500);
  const body = await page.locator('body').innerText();

  // El guard valida el token contra el backend real:
  check(`${label}: API validó invitación (200 /invitations/)`, apiResponses.some((r) => r.startsWith('200') && r.includes('invitations')), apiResponses.join(' | ').slice(0, 200));
  check(`${label}: NO dice "invitación no válida"`, !/invitaci(n|ó)n no v[aá]lida/i.test(body));
  check(`${label}: flujo candidato cargó (setup/inicio)`, /c[aá]mara|inicio|setup|comenzar|prepar/i.test(body), body.slice(0, 150).replace(/\n+/g, ' | '));
  check(`${label}: 0 console errors`, consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
  check(`${label}: 0 page errors`, pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  check(`${label}: sin overflow`, overflow);
  await page.screenshot({ path: `${outDir}/${label}-invitation-flow.png` });
  await ctx.close();
}

await browser.close();
console.log(`\nRESULTADO E2E: ${failures === 0 ? '✅ TODO VERDE' : `❌ ${failures} fallos`}`);
process.exit(failures === 0 ? 0 : 1);
