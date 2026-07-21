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
  await movePassenger('Arriba');
  await movePassenger('Izquierda', 2);
  await movePassenger('Derecha');
  await movePassenger('Arriba', 3);
  await movePassenger('Izquierda', 4);
  await page.getByText(/Circuito 3 de 3/i).waitFor({ timeout: 5000 });
  await movePassenger('Derecha', 4);
  await movePassenger('Derecha', 2);
  await movePassenger('Arriba', 2);
  await movePassenger('Izquierda', 3);
  await movePassenger('Izquierda', 3);
  await movePassenger('Arriba', 2);
}

async function chooseTeamOption(label) {
  await clickButton(label);
  await clickButton(/Siguiente escenario|Finalizar brief/i);
}

try {
  await page.goto(`${baseUrl}/postulaciones-demo?battery=original`, { waitUntil: 'networkidle' });
  await clickButton(/Comenzar demo de postulación/i);
  await clickButton(/Continuar a juegos/i);
  await page.getByText(/Nivel 1 de 3/i).waitFor({ timeout: 5000 });

  await solveLaserLevel([['7,7', '2,0'], ['3,7', '0,5'], ['0,7', '2,5']]);
  await page.getByText(/Nivel 2 de 3/i).waitFor({ timeout: 5000 });

  const relayRequirementVisible = await page.getByText(/0\/3 relés/i).isVisible().catch(() => false);
  if (!relayRequirementVisible) failures.push('Laser level 2 relay requirement is not visible.');

  await solveLaserLevel([['0,0', '2,1'], ['6,0', '2,5'], ['0,6', '5,5'], ['6,6', '5,2']]);
  await page.getByText(/Nivel 3 de 3/i).waitFor({ timeout: 5000 });
  await solveLaserLevel([['1,6', '3,1'], ['5,6', '5,1'], ['0,5', '3,5'], ['7,5', '5,5']]);
  await page.getByRole('heading', { name: /Globo de riesgo/i }).first().waitFor({ timeout: 5000 });

  for (let index = 0; index < 8; index += 1) {
    await clickButton(/Inflar/i);
    await clickButton(/Asegurar puntos/i);
  }
  await page.getByRole('heading', { name: /Optimización de rutas/i }).first().waitFor({ timeout: 5000 });
  const passengerUiVisible = await page.evaluate(() => {
    const text = document.body.innerText;
    return /Energía\s+\d+\/\d+/.test(text)
      && /Esperando · destino A/.test(text)
      && Boolean(document.querySelector('.passenger-route-task__budget-bar'));
  });
  if (!passengerUiVisible) failures.push('Passenger UI does not expose visible energy and passenger A/B/C legend.');

  await completePassengerRoutes();
  await page.getByRole('heading', { name: /Brief de coordinación/i }).first().waitFor({ timeout: 5000 });
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
  if (!/Cobertura completa de demo/.test(reportText) || !/Brief de equipo/.test(reportText)) {
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
