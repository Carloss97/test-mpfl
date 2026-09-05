import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = '/mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/test-mpfl';
const inputPath = resolve(root, 'docs/demo/krumm-r6-r7-current-flow.html');
const outputPath = resolve(root, 'exports/krumm-r6-r7-current-flow.pdf');
mkdirSync(resolve(root, 'exports'), { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1740, height: 1200 }, deviceScaleFactor: 1 });
  await page.goto(`file://${inputPath}`, { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print' });
  await page.pdf({
    path: outputPath,
    format: 'A3',
    landscape: true,
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: '9mm', right: '9mm', bottom: '9mm', left: '9mm' },
  });
  console.log(outputPath);
} finally {
  await browser.close();
}
