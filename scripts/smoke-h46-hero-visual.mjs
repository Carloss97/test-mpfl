// H4.6 (t_be89dafb): captura focal del hero visual (mock + badges flotantes)
// para evaluar oclusión de texto. Desktop 1280x720 + móvil 390x844.
import { chromium } from '@playwright/test';

const baseUrl = process.env.BASE_URL ?? 'http://localhost:5173';
const browser = await chromium.launch({
  headless: true,
  executablePath: '/home/sarlock/.cache/ms-playwright/chromium-1234/chrome-linux/chrome',
  args: ['--headless=new', '--disable-dev-shm-usage', '--disable-gpu'],
});

async function capture(tag, viewport, out) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
  const el = page.locator('.landing__hero-visual');
  await el.waitFor({ timeout: 20000 });
  await el.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(300);
  // Clip = unión del visual + ambos badges (en desktop los badges flotan
  // fuera del box del visual). Primero se hace scroll para que la unión
  // entre completa en el viewport, y el clip usa coordenadas de viewport.
  const u = await page.evaluate(() => {
    const els = ['.landing__hero-visual', '.landing__stat--top', '.landing__stat--bottom']
      .map((s) => document.querySelector(s))
      .filter(Boolean);
    const sy = window.scrollY;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const e of els) {
      const b = e.getBoundingClientRect();
      x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y + sy);
      x1 = Math.max(x1, b.right); y1 = Math.max(y1, b.bottom + sy);
    }
    return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
  });
  // Evidencia: screenshot de viewport completo con el mock centrado (margen
  // 150px arriba) — el clip ajustado a la unión hacía parecer recortados los
  // badges (tocan el borde del clip por construcción).
  await page.evaluate((top) => window.scrollTo({ top }), Math.max(0, u.y - 150));
  await page.waitForTimeout(200);
  await page.screenshot({ path: out });
  // Geometría real: ¿los badges cubren chip y nota?
  const geo = await page.evaluate(() => {
    const r = (s) => {
      const e = document.querySelector(s);
      if (!e) return null;
      const b = e.getBoundingClientRect();
      return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
    };
    const chip = r('.landing__mock-chip');
    const note = r('.landing__mock-note');
    const top = r('.landing__stat--top');
    const bottom = r('.landing__stat--bottom');
    const mock = r('.landing__mock');
    const overlap = (a, b) => {
      if (!a || !b) return null;
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      return ox > 0 && oy > 0 ? { ox: Math.round(ox), oy: Math.round(oy) } : null;
    };
    return { chip, note, top, bottom, mock, chipVsTop: overlap(chip, top), noteVsBottom: overlap(note, bottom) };
  });
  console.log(JSON.stringify({ tag, geo, out }, null, 2));
  await context.close();
}

await capture('desktop', { width: 1280, height: 720 }, 'docs/qa/h46-visual-audit/d14-hero-visual-es.png');
await capture('mobile', { width: 390, height: 844 }, 'docs/qa/h46-visual-audit/m09-hero-visual-es.png');

await browser.close();
