// Baseline visual/QA smoke for public landing, portal, company access and jobs.
// Uses isolated browser contexts only: no auth, sessionStorage, localStorage or credentials.
// Usage: BASE_URL=http://127.0.0.1:4173 node scripts/smoke-landing-company-jobs-2026-09-15.mjs

import { chromium } from '@playwright/test';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { arch, platform, release, type } from 'node:os';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPT_VERSION = '2026-09-15.2';
const require = createRequire(import.meta.url);
const baseUrl = (process.env.BASE_URL ?? 'http://127.0.0.1:4173').replace(/\/$/, '');
const outputDir = process.env.QA_OUTPUT_DIR ?? 'docs/qa/landing-company-jobs-2026-09-15';
const reportPath = process.env.QA_REPORT_PATH ?? `${outputDir}/baseline-results.json`;
const activeJobPath = '/empleos/analista-control-planta';
const routes = [
  { name: 'landing', path: '/', ready: '.landing__hero' },
  { name: 'portal', path: '/portal', ready: '.v3-portal-grid' },
  { name: 'company-access', path: '/empresa/acceso', ready: '.v3-company-login-actions' },
  { name: 'jobs', path: '/empleos', ready: '.v3-jobs-grid' },
  { name: 'job-detail', path: activeJobPath, ready: '.v3-job-detail' },
];
const viewports = [
  { name: '1440x900', width: 1440, height: 900, deviceScaleFactor: 1 },
  { name: '1280x720', width: 1280, height: 720, deviceScaleFactor: 1 },
  // This is mobile emulation, not only a narrow desktop viewport.
  { name: '390x844', width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
];
const selectors = {
  landing: { cta: '.landing__hero-buttons .landing__cta--gold', focus: '.landing__hero-buttons .landing__cta--gold', jobText: null },
  portal: { cta: '.v3-portal-card', focus: '.v3-portal-card', jobText: null },
  'company-access': { cta: '.v3-company-login-actions .v3-cta-gold', focus: '.v3-company-login-actions .v3-cta-gold', jobText: null },
  jobs: { cta: '.v3-job-cta', focus: '.v3-job-cta', jobText: '.v3-job-card-title' },
  'job-detail': { cta: '.v3-job-apply-btn', focus: '.v3-back', jobText: '.v3-job-detail-title' },
};
// Only these route/viewport pairs are accepted as the 2026-09-15 overflow baseline.
// Any overflow on another pair remains an unexpected regression.
const knownBaselineOverflowTags = new Set([
  'portal-1280x720', 'company-access-1280x720', 'jobs-1280x720', 'job-detail-1280x720',
  'portal-390x844', 'company-access-390x844', 'jobs-390x844', 'job-detail-390x844',
]);

mkdirSync(outputDir, { recursive: true });
const knownBaselineFindings = [];
const unexpectedFindings = [];
const consoleErrors = [];
const screenshots = [];
const measurements = [];
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const scriptPath = fileURLToPath(import.meta.url);
const captureStartedAtUtc = new Date().toISOString();
const gitCommit = (() => {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
})();
const playwrightVersion = (() => {
  try {
    return require('@playwright/test/package.json').version;
  } catch {
    return null;
  }
})();

function addUnexpected(kind, tag, detail, extra = {}) {
  unexpectedFindings.push({ kind, tag, detail, ...extra });
}

function track(page, tag) {
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push({ tag, type: 'console.error', message: message.text() });
  });
  page.on('pageerror', (error) => consoleErrors.push({ tag, type: 'pageerror', message: error.message }));
  page.on('requestfailed', (request) => {
    consoleErrors.push({ tag, type: 'requestfailed', message: `${request.url()} ${request.failure()?.errorText ?? ''}`.trim() });
  });
}

async function measure(page, route) {
  const { cta, focus, jobText } = selectors[route.name];
  return page.evaluate(({ ctaSelector, focusSelector, jobTextSelector, expectedViewportWidth }) => {
    const rgb = (value) => {
      const channels = value.match(/\d+(?:\.\d+)?/g);
      return channels ? channels.slice(0, 3).map(Number) : null;
    };
    const luminance = (color) => color.map((channel) => {
      const value = channel / 255;
      return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    }).reduce((total, value, index) => total + value * [0.2126, 0.7152, 0.0722][index], 0);
    const contrast = (foreground, background) => {
      const fg = rgb(foreground);
      const bg = rgb(background);
      if (!fg || !bg) return null;
      const [light, dark] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
      return Number(((light + 0.05) / (dark + 0.05)).toFixed(2));
    };
    const opaqueBackground = (element) => {
      let current = element;
      while (current) {
        const background = getComputedStyle(current).backgroundColor;
        if (background && background !== 'rgba(0, 0, 0, 0)' && background !== 'transparent') return background;
        current = current.parentElement;
      }
      return getComputedStyle(document.body).backgroundColor;
    };
    const ctaElement = document.querySelector(ctaSelector);
    const textElement = jobTextSelector ? document.querySelector(jobTextSelector) : null;
    const focusElement = document.querySelector(focusSelector);
    const ctaStyle = ctaElement ? getComputedStyle(ctaElement) : null;
    const textStyle = textElement ? getComputedStyle(textElement) : null;
    focusElement?.focus();
    const focusStyle = focusElement ? getComputedStyle(focusElement) : null;
    return {
      overflow: {
        scrollWidth: document.documentElement.scrollWidth,
        // Compare to the configured capture width. Mobile pages can report a larger
        // layout viewport; comparing only window.innerWidth would hide that overflow.
        viewportWidth: expectedViewportWidth,
        pageViewportWidth: window.innerWidth,
        hasHorizontalOverflow: document.documentElement.scrollWidth > expectedViewportWidth + 1,
      },
      jobTypography: textStyle ? {
        selector: jobTextSelector,
        fontSize: textStyle.fontSize,
        lineHeight: textStyle.lineHeight,
      } : null,
      jobIcon: document.querySelector('.v3-job-meta-item svg') ? (() => {
        const style = getComputedStyle(document.querySelector('.v3-job-meta-item svg'));
        return { selector: '.v3-job-meta-item svg', width: style.width, height: style.height };
      })() : null,
      ctaContrast: ctaStyle ? {
        selector: ctaSelector,
        foreground: ctaStyle.color,
        background: opaqueBackground(ctaElement),
        ratio: contrast(ctaStyle.color, opaqueBackground(ctaElement)),
        disabled: ctaElement.matches(':disabled'),
      } : null,
      // Computed-style proxy only; this is not a complete accessibility test.
      focusComputedStyleProxy: focusStyle ? {
        selector: focusSelector,
        focused: document.activeElement === focusElement,
        outlineStyle: focusStyle.outlineStyle,
        outlineWidth: focusStyle.outlineWidth,
        outlineColor: focusStyle.outlineColor,
        outlineOffset: focusStyle.outlineOffset,
      } : null,
    };
  }, { ctaSelector: cta, focusSelector: focus, jobTextSelector: jobText, expectedViewportWidth: page.viewportSize().width });
}

const defaultExecutable = chromium.executablePath();
const playwrightCache = '/home/sarlock/.cache/ms-playwright';
const cachedChromium = existsSync(playwrightCache)
  ? readdirSync(playwrightCache)
    .filter((name) => name.startsWith('chromium-'))
    .map((name) => `${playwrightCache}/${name}/chrome-linux/chrome`)
    .find((path) => existsSync(path))
  : null;
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
  ?? (existsSync(defaultExecutable) ? defaultExecutable : cachedChromium);
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const chromiumVersion = await browser.version();
try {
  for (const viewport of viewports) {
    for (const route of routes) {
      const tag = `${route.name}-${viewport.name}`;
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        isMobile: Boolean(viewport.isMobile),
        hasTouch: Boolean(viewport.hasTouch),
        deviceScaleFactor: viewport.deviceScaleFactor,
      });
      const page = await context.newPage();
      track(page, tag);
      try {
        await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'networkidle', timeout: 30_000 });
        await page.locator(route.ready).waitFor({ state: 'visible', timeout: 15_000 });
        await page.evaluate(() => {
          localStorage.clear();
          sessionStorage.clear();
          window.scrollTo(0, 0);
        });
        const screenshot = `${outputDir}/${tag}.png`;
        await page.screenshot({ path: screenshot, fullPage: false, animations: 'disabled' });
        const result = await measure(page, route);
        if (result.overflow.hasHorizontalOverflow) {
          const detail = `horizontal overflow: ${result.overflow.scrollWidth} > ${result.overflow.viewportWidth}`;
          const finding = { kind: 'horizontal-overflow', tag, detail, overflow: result.overflow };
          if (knownBaselineOverflowTags.has(tag)) knownBaselineFindings.push(finding);
          else addUnexpected('horizontal-overflow', tag, detail, { overflow: result.overflow });
        }
        if (!result.ctaContrast || result.ctaContrast.ratio === null) addUnexpected('cta-contrast', tag, 'CTA contrast could not be calculated');
        const focus = result.focusComputedStyleProxy;
        if (!focus?.focused || focus.outlineStyle === 'none' || focus.outlineWidth === '0px') {
          addUnexpected('focus-computed-style-proxy', tag, `focus proxy missing: ${JSON.stringify(focus)}`);
        }
        screenshots.push(screenshot);
        measurements.push({ route: route.path, viewport: viewport.name, screenshot, ...result });
      } catch (error) {
        addUnexpected('navigation-or-measurement', tag, String(error).split('\n')[0]);
      } finally {
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}

for (const error of consoleErrors) addUnexpected(error.type, error.tag, error.message);
// Deterministic harness self-check: proves an unlisted overflow changes the exit status.
if (process.env.QA_INJECT_UNEXPECTED_OVERFLOW === '1') {
  addUnexpected('horizontal-overflow', 'injected-unexpected-overflow', 'test-only injected overflow', { testOnly: true });
}
const screenshotManifest = screenshots.map((screenshot) => ({ path: screenshot, sha256: sha256(readFileSync(screenshot)) }));
const captureFinishedAtUtc = new Date().toISOString();
const result = {
  provenance: {
    captureStartedAtUtc,
    captureFinishedAtUtc,
    gitCommit,
    script: { path: scriptPath, version: SCRIPT_VERSION, sha256: sha256(readFileSync(scriptPath)) },
    playwrightVersion,
    chromiumVersion,
    platform: { type: type(), platform: platform(), release: release(), arch: arch() },
  },
  baseUrl,
  activeJobPath,
  routes: routes.map(({ path }) => path),
  viewports,
  knownBaselineOverflowTags: [...knownBaselineOverflowTags],
  knownBaselineFindings,
  unexpectedFindings,
  consoleErrors,
  screenshots,
  screenshotManifest,
  measurements,
  ok: unexpectedFindings.length === 0,
};
writeFileSync(reportPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
