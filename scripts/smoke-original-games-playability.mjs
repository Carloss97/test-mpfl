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
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', (err) => errors.push(err.message));

async function clickButton(name) {
  await page.getByRole('button', { name }).click();
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
  if (!/10–12 min/.test(landingText)) failures.push('Original battery landing does not show the 10–12 minute estimate.');
  if (/FaceMesh|AUs\/FACS|MoveNet|payload privacy-safe/.test(landingText)) {
    failures.push('Candidate landing exposes laboratory or schema terminology.');
  }
  await clickButton(/Comenzar demo de postulación/i);
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
  await clickButton(/Continuar a juegos/i);
  await page.getByText(/Nivel 1 de 3/i).waitFor({ timeout: 5000 });

  await solveLaserLevel([['7,0', '0,2'], ['7,2', '3,2'], ['7,4', '3,5'], ['7,6', '1,5']]);
  await page.getByText(/Nivel 2 de 3/i).waitFor({ timeout: 5000 });

  const relayRequirementVisible = await page.getByText(/\d+\/5 relés/i).first().isVisible().catch(() => false);
  if (!relayRequirementVisible) failures.push('Laser level 2 relay requirement is not visible.');
  const portalRequirementVisible = await page.getByText(/2 portales/i).isVisible().catch(() => false);
  if (!portalRequirementVisible) failures.push('Laser level 2 portal mechanic is not visible.');

  await solveLaserLevel([['0,0', '2,3'], ['1,6', '6,3'], ['3,6', '3,3'], ['5,6', '3,1'], ['7,6', '7,1']]);
  await page.getByText(/Nivel 3 de 3/i).waitFor({ timeout: 5000 });
  await solveLaserLevel([['0,0', '7,5'], ['1,0', '5,5'], ['2,0', '5,1'], ['4,7', '3,6'], ['5,7', '6,6'], ['6,7', '6,4']]);
  await page.getByRole('heading', { name: /Globo de riesgo/i }).first().waitFor({ timeout: 5000 });

  for (let index = 0; index < 8; index += 1) {
    await clickButton(/Inflar/i);
    await clickButton(/Asegurar puntos/i);
  }
  await page.getByRole('heading', { name: /Central de movilidad/i }).first().waitFor({ timeout: 5000 });
  const passengerUi = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      hasEnergy: /Energía/.test(text),
      hasPassenger: /Esperando · entregar en ⚑ A/i.test(text),
      hasReserve: /Reserva al finalizar/i.test(text),
      hasBudgetBar: Boolean(document.querySelector('.passenger-route-task__budget-bar')),
    };
  });
  if (!passengerUi.hasEnergy || !passengerUi.hasPassenger || !passengerUi.hasReserve || !passengerUi.hasBudgetBar) {
    failures.push(`Passenger UI readiness failed: ${JSON.stringify(passengerUi)}`);
  }

  await completePassengerRoutes();
  await page.getByRole('heading', { name: /Operación Faro/i }).first().waitFor({ timeout: 5000 });
  const rpgVisible = await page.getByText(/RPG táctico/i).first().isVisible().catch(() => false);
  if (!rpgVisible) failures.push('Team coordination RPG scene is not visible.');
  const behindWorkVisible = await page.getByText(/Trabajo por detrás/i).isVisible().catch(() => false);
  if (!behindWorkVisible) failures.push('Team coordination game does not show behind-the-scenes metrics panel.');
  await chooseTeamOption(/Alinear objetivo, asignar roles/i);
  await chooseTeamOption(/Explicar el motivo del cambio/i);
  await chooseTeamOption(/Reconocer la ambigüedad/i);
  await chooseTeamOption(/Repriorizar el objetivo mínimo/i);
  await page.getByText(/Resumen ejecutivo HR/i).waitFor({ timeout: 5000 });
  const reportText = await page.evaluate(() => document.body.innerText);
  if (/Framework R-6|workbook|descriptive_only|provisional_score|not_measured|No medido|Authoring|Calibration|Instruction check|valid_for_internal_demo/i.test(reportText)) {
    failures.push(`Report still exposes framework/internal status labels. REPORT:\n${reportText.slice(0, 1400)}`);
  }
  if (!/8 constructos con señal de demo/.test(reportText) || !/Operación Faro/.test(reportText)) {
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
