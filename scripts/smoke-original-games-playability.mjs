import { chromium } from '@playwright/test';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:5173';
const shotPrefix = process.env.SHOT_PREFIX ?? '';
const viewport = {
  width: Number(process.env.VIEWPORT_WIDTH ?? 1280),
  height: Number(process.env.VIEWPORT_HEIGHT ?? 720),
};
const browser = await chromium.launch({
  headless: true,
  executablePath: '/home/sarlock/.cache/ms-playwright/chromium-1234/chrome-linux/chrome',
  args: ['--headless=new', '--disable-dev-shm-usage', '--disable-gpu'],
});
const page = await browser.newPage({ viewport });
const failures = [];
const errors = [];
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', (err) => errors.push(err.message));

async function clickButton(name) {
  await page.getByRole('button', { name }).click();
}

// W3: los juegos originales muestran un micro-intro que intercepta clics; se salta.
async function skipMicroIntro() {
  const skip = page.getByRole('button', { name: /Saltar/i });
  if (await skip.count()) await skip.first().click();
}

async function moveLaser(from, to) {
  await clickButton(new RegExp(`^Pieza óptica móvil ${from}$`));
  await clickButton(new RegExp(`^Celda vacía ${to}$`));
}

async function solveLaserLevel(moves) {
  for (const [from, to] of moves) await moveLaser(from, to);
  await clickButton(/Comprobar ruta/i);
}

async function movePassenger(direction, times = 1) {
  for (let index = 0; index < times; index += 1) await clickButton(new RegExp(`^${direction}$`, 'i'));
}

async function completePassengerRoutes() {
  await movePassenger('Derecha');
  await movePassenger('Arriba', 3);
  await movePassenger('Derecha', 3);
  await page.getByText(/Circuito 2 de 3/i).waitFor({ timeout: 5000 });
  await movePassenger('Derecha', 5);
  await movePassenger('Arriba', 3);
  await movePassenger('Izquierda', 4);
  await movePassenger('Arriba');
  await page.getByText(/Circuito 3 de 3/i).waitFor({ timeout: 5000 });
  await movePassenger('Derecha', 6);
  await movePassenger('Arriba');
  await movePassenger('Arriba', 2);
  await movePassenger('Izquierda', 6);
  await movePassenger('Arriba');
}

async function chooseTeamOption(label) {
  await clickButton(label);
  await clickButton(/Continuar aventura|Cerrar misión/i);
}

try {
  await page.goto(`${baseUrl}/postulaciones-demo?battery=original`, { waitUntil: 'networkidle' });
  const landingText = await page.evaluate(() => document.body.innerText);
  if (!/14–16 min/.test(landingText)) failures.push('Original battery landing does not show the estimated duration.');
  if (/FaceMesh|AUs\/FACS|MoveNet|payload privacy-safe/.test(landingText)) {
    failures.push('Candidate landing exposes laboratory or schema terminology.');
  }
  await clickButton(/Comenzar prueba de postulación/i);
  const setupText = await page.evaluate(() => document.body.innerText);
  if (!/Preparación de la sesión/.test(setupText) || !/no se usan por sí solas para inferir talento/i.test(setupText)) {
    failures.push('Camera setup does not explain its optional, context-only role.');
  }
  if (/FaceMesh|AUs\/FACS|MoveNet/.test(setupText)) failures.push('Candidate setup exposes model names.');
  if (viewport.width < 600) {
    const undersizedTargets = await page.locator('button, a[href]').evaluateAll((nodes) => nodes
      .filter((node) => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      })
      .map((node) => ({ label: node.textContent?.trim() || node.getAttribute('aria-label') || node.tagName, height: node.getBoundingClientRect().height }))
      .filter((target) => target.height < 44));
    if (undersizedTargets.length) failures.push(`Mobile touch targets below 44px: ${JSON.stringify(undersizedTargets)}`);
  }
  await page.getByTestId('postulation-explicit-consent').check();
  await clickButton(/Continuar a juegos/i);
  await page.getByText(/Nivel 1 de 3/i).waitFor({ timeout: 5000 });

  // H2: en el stage no debe quedar rastro del HUD "qué pasa detrás" (modo ok, sin cámara).
  const stageLaserText = await page.evaluate(() => document.body.innerText);
  for (const pattern of [/Procesando en segundo plano/i, /Ver qué pasa detrás/i, /de 5 listos/i]) {
    if (pattern.test(stageLaserText)) failures.push(`Laser stage shows behind-the-scenes HUD text: ${pattern}`);
  }
  if (await page.locator('[data-testid="signal-error-hint-chip"]').count()) {
    failures.push('Laser stage shows a signal-error hint although no camera was enabled (must stay silent).');
  }
  await skipMicroIntro();

  await solveLaserLevel([['7,0', '0,2'], ['7,2', '3,2'], ['7,4', '3,5'], ['7,6', '1,5']]);
  await page.getByText(/Nivel 2 de 3/i).waitFor({ timeout: 5000 });

  // Splash de transición: el HUD sigue reflejando el nivel 1 hasta que aparece el tablero 2.
  const relayPill = page.getByText(/\d+\/5 relés/i).first();
  await relayPill.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  const relayRequirementVisible = await relayPill.isVisible().catch(() => false);
  if (!relayRequirementVisible) failures.push('Laser level 2 relay requirement is not visible.');
  const portalPill = page.getByText(/2 portales/i).first();
  await portalPill.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  const portalRequirementVisible = await portalPill.isVisible().catch(() => false);
  if (!portalRequirementVisible) failures.push('Laser level 2 portal mechanic is not visible.');

  await solveLaserLevel([['0,0', '2,3'], ['1,6', '6,3'], ['3,6', '3,3'], ['5,6', '3,1'], ['7,6', '7,1']]);
  await page.getByText(/Nivel 3 de 3/i).waitFor({ timeout: 5000 });
  await solveLaserLevel([['0,0', '7,5'], ['1,0', '5,5'], ['2,0', '5,1'], ['4,7', '3,6'], ['5,7', '6,6'], ['6,7', '6,4']]);
  await page.getByRole('heading', { name: /Globo de riesgo/i }).first().waitFor({ timeout: 5000 });
  await skipMicroIntro();

  // Cada ronda: esperar a que el header la confirme (la FX de cashout dura 500 ms;
  // clicear antes desdoba la ronda y se desincroniza el loop) y asegurar con 0
  // inflados (juego conservativo válido; evita pops que también desdoblan rondas).
  for (let round = 1; round <= 8; round += 1) {
    await page.getByText(`Ronda ${round} de 8`).first().waitFor({ timeout: 8000 });
    await clickButton(/Asegurar puntos/i);
  }
  await page.getByRole('heading', { name: /Central de movilidad/i }).first().waitFor({ timeout: 5000 });
  await skipMicroIntro();
  const passengerUi = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      hasEnergy: /Energía/.test(text),
      hasPassenger: /Esperando · entregar en ⚑ A/i.test(text),
      hasReserve: /Reserva de la ruta óptima/i.test(text),
      hasBudgetBar: Boolean(document.querySelector('.passenger-route-task__budget-bar')),
    };
  });
  if (!passengerUi.hasEnergy || !passengerUi.hasPassenger || !passengerUi.hasReserve || !passengerUi.hasBudgetBar) {
    failures.push(`Passenger UI readiness failed: ${JSON.stringify(passengerUi)}`);
  }

  await completePassengerRoutes();
  await page.getByRole('heading', { name: /Operación Faro/i }).first().waitFor({ timeout: 5000 });
  await skipMicroIntro();
  const rpgVisible = await page.getByText(/RPG táctico/i).first().isVisible().catch(() => false);
  if (!rpgVisible) failures.push('Team coordination RPG scene is not visible.');
  // H2: BehindPanel "Trabajo por detrás" eliminado del juego team.
  const teamBeforeOption = await page.evaluate(() => document.body.innerText);
  if (/Trabajo por detrás/i.test(teamBeforeOption)) failures.push('Team coordination game still shows the behind-the-scenes panel (H2).');
  if (/Bitácora táctica/i.test(teamBeforeOption)) failures.push('Team coordination game still shows the tactical logbook (H2).');
  await clickButton(/Alinear objetivo, asignar roles/i);
  const teamAfterOption = await page.evaluate(() => document.body.innerText);
  if (!/Señal registrada: coordinación \d+%/i.test(teamAfterOption)) {
    failures.push('Team footer status does not interpolate the coordination % (R2): ' + teamAfterOption.slice(0, 300));
  }
  if (/\$\{pct/i.test(teamAfterOption) || /panel lateral/i.test(teamAfterOption)) {
    failures.push('Team footer status still contains literal ${pct or "panel lateral" reference (H2/R2).');
  }
  await page.screenshot({ path: `docs/qa/h2-shots/${shotPrefix}e2e-team-status.png` });
  await clickButton(/Continuar aventura|Cerrar misión/i);
  await clickButton(/Explicar el motivo del cambio/i);
  await clickButton(/Continuar aventura|Cerrar misión/i);
  await clickButton(/Reconocer la ambigüedad/i);
  await clickButton(/Continuar aventura|Cerrar misión/i);
  await clickButton(/Repriorizar el objetivo mínimo/i);
  await clickButton(/Continuar aventura|Cerrar misión/i);

  // Tangram (5º juego, EXP-001): tutorial + evaluación L1-L4 con solución determinista
  // (pieza libre #1 → slot SLOT_LAYOUT[k]; i=3 tri_medium rot90° necesita 2 rotaciones).
  await page.getByRole('heading', { name: /Ensamblaje Geométrico/i }).first().waitFor({ timeout: 8000 });
  await page.getByTestId('tangram-start-tutorial').click();

  async function placeTangramPiece(slotTestId, rotations = 0) {
    await page.getByTestId('tangram-piece-1').click();
    for (let r = 0; r < rotations; r += 1) await page.getByTestId('tangram-rotate-btn').click();
    await page.getByTestId(slotTestId).click();
  }

  await placeTangramPiece('tangram-slot-tri_large-0');
  await placeTangramPiece('tangram-slot-tri_large-1');
  // H2: el overlay de resultado debe cubrir el canvas (position:absolute) sin scroll.
  await page.getByTestId('tangram-outcome').waitFor({ timeout: 8000 });
  const overlayGeom = await page.evaluate(() => {
    const overlay = document.querySelector('.tangram-task__overlay');
    const wrap = document.querySelector('.tangram-task__canvas-wrap');
    const o = overlay.getBoundingClientRect();
    const w = wrap.getBoundingClientRect();
    return {
      overlayPos: getComputedStyle(overlay).position,
      coversCanvas: Math.abs(o.width - w.width) < 2 && Math.abs(o.height - w.height) < 2,
      cardHeight: o.height,
    };
  });
  if (overlayGeom.overlayPos !== 'absolute' || !overlayGeom.coversCanvas || overlayGeom.cardHeight < 20) {
    failures.push(`Tangram outcome overlay no cubre el canvas (H2): ${JSON.stringify(overlayGeom)}`);
  }
  await page.screenshot({ path: `docs/qa/h2-shots/${shotPrefix}e2e-tangram-overlay.png` });
  await page.getByTestId('tangram-start-eval').waitFor({ timeout: 8000 });
  await page.getByTestId('tangram-start-eval').click();

  // Los slots usan slotIndex = posición en SLOT_LAYOUT (pool global):
  // tri_large 0,1 · square 2 · tri_medium 3 · tri_small 4,5 · rhombus 6.
  // i=3 (tri_medium, slot rot90°) necesita 2 rotaciones; el resto 0 (simetría 180°).
  const TANGRAM_LEVEL_SLOTS = {
    1: ['tangram-slot-tri_large-0', 'tangram-slot-tri_large-1', 'tangram-slot-square-2', ['tangram-slot-tri_medium-3', 2]],
    2: ['tangram-slot-tri_large-0', 'tangram-slot-tri_large-1', 'tangram-slot-square-2', ['tangram-slot-tri_medium-3', 2], 'tangram-slot-tri_small-4'],
    3: ['tangram-slot-tri_large-0', 'tangram-slot-tri_large-1', 'tangram-slot-square-2', ['tangram-slot-tri_medium-3', 2], 'tangram-slot-tri_small-4', 'tangram-slot-tri_small-5'],
    4: ['tangram-slot-tri_large-0', 'tangram-slot-tri_large-1', 'tangram-slot-square-2', ['tangram-slot-tri_medium-3', 2], 'tangram-slot-tri_small-4', 'tangram-slot-tri_small-5', 'tangram-slot-rhombus-6'],
  };
  for (const levelNum of [1, 2, 3, 4]) {
    await page.getByTestId('tangram-level-label').filter({ hasText: `Nivel ${levelNum} de 4` }).waitFor({ timeout: 15000 });
    for (const entry of TANGRAM_LEVEL_SLOTS[levelNum]) {
      const [slot, rotations] = Array.isArray(entry) ? entry : [entry, 0];
      await placeTangramPiece(slot, rotations);
    }
    await page.getByTestId('tangram-outcome').waitFor({ timeout: 10000 });
  }

  await page.getByText(/Resumen ejecutivo HR/i).waitFor({ timeout: 15000 });
  const reportText = await page.evaluate(() => document.body.innerText);
  if (/Framework R-6|workbook|descriptive_only|provisional_score|not_measured|No medido|Authoring|Calibration|Instruction check|valid_for_internal_demo/i.test(reportText)) {
    failures.push(`Report still exposes framework/internal status labels. REPORT:\n${reportText.slice(0, 1400)}`);
  }
  if (!/8 constructos con señal de prueba/.test(reportText) || !/Operación Faro/.test(reportText)) {
    failures.push(`Report does not show complete demo coverage from team coordination game. REPORT:\n${reportText.slice(0, 1400)}`);
  }
  if (!/Liderazgo/i.test(reportText) || !/Comunicación/i.test(reportText) || !/Adaptabilidad/i.test(reportText)) {
    failures.push('Report does not expose the team-brief constructs in the final HR view.');
  }

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  if (overflow) failures.push('Horizontal overflow detected on original game route.');
  if (errors.length) failures.push(`Console/page errors: ${errors.join(' | ')}`);
} catch (error) {
  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 1400)).catch(() => 'body unavailable');
  failures.push(`${error.message}\nBODY:\n${bodyText}`);
} finally {
  await browser.close();
}

console.log(JSON.stringify({ baseUrl, viewport, failures }, null, 2));
if (failures.length) process.exit(1);
