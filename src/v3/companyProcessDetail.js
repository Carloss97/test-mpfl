// t_84f00355 (V3 fase v3): datos demo + lógica pura del detalle de proceso y
// del reporte de candidato embebido (plan docs/plans/2026-09-08-plan-t84f00355-
// v3-process-detail.md).
//
// Detalle (modo demo): los 3 perfiles de la referencia krumm_frontend.zip v2
// (process-detail.html / process-operator.html / process-technician.html) —
// métricas, configuración, estadísticas, avanzadas y 6 candidatos por proceso.
// Coherente con V2 DEMO_PROCESSES (cand/eval/score/fechas = mismas filas).
//
// Reporte (motor H4.3, plan D3): el artifacts demo se construye con el
// BUILDER del propio flujo (`buildPostulationDemoArtifacts`, batería
// original_games) y el mismo signal sintético del fixture — no una copia del
// shape. Los 6 candidatos escalan los agregados por juego con f = target/94
// (ancla ref); el overall mostrado = media de constructos no-nulos del
// talentFramework (misma semántica candidateOverallScore V2; D2: una sola
// fuente entre tabla y reporte). Calibración medida: overalls 89/87/85/82/80/
// 78 → FIT_BANDS {excellent:86, veryGood:84, good:78} preservan el fit de la
// referencia (Ex/Ex/VG/G/G/G).
//
// Modo real (D6): filas de GET /sessions (contract v1, V2 D3/D9) → detalle =
// grupo por rol (sin distribution/advanced/tiempo: no existen en /sessions);
// reporte = mismo data-model (8 constructos, caveats traducidos, 4 juegos
// allowlist, cobertura/calidad/estado/integridad) con los campos que la fila
// trae — sin inventar signalContext ni summaries. Identidad = alias (nunca
// nombre real). Los labels de estado/caveats se duplican aquí mínimos (D9: no
// importar del árbol hr-dashboard, que V5 deprecia).
//
// Privacidad: solo agregados allowlist; el demo artifacts pasa por los guards
// del builder del flujo (feature vector v2 + payload validation); el real
// reporta la verificación de privacidad de la fila (guard local, mismo
// patrón FORBIDDEN_KEYS de v1).

import { buildPostulationDemoArtifacts } from '../postulation-demo/postulationDemoSessionBuilder.js';
import {
  POSTULATION_DEMO_BATTERY_IDS,
  POSTULATION_DEMO_BATTERY_MODES,
  getPostulationDemoBattery,
  listVisiblePostulationBlocks,
} from '../postulation-demo/postulationDemoConfig.js';
import {
  WORKBOOK_TALENT_CONSTRUCT_ORDER,
  buildOriginalGameTalentFramework,
  getConstructDefinition,
} from '../assessment/originalGameTalentMapping.js';
import { buildOriginalGameFeatureVector } from '../assessment/originalGameFeatureVector.js';
import { sanitizeOriginalGameAggregate } from '../postulation-demo/originalGameBlueprints.js';
import {
  candidateOverallScore,
  normalizeProcessText,
  slugifyProcessId,
  UNSPECIFIED_PROCESS_ID,
} from './companyData.js';

// ── Fit (D2: bandas calibradas sobre el spread medido del motor H4.3) ──────
// Overalls demo medidos (2026-09-08, node real): 89/87/85/82/80/78. Las bandas
// reproducen el fit de la referencia (Excelente/Excelente/Muy bueno/Bueno×3)
// sin baremos: son etiquetas descriptivas de la demo, no criterios normativos.
export const FIT_BANDS = Object.freeze({ excellent: 86, veryGood: 84, good: 78 });

export function fitForScore(overall) {
  if (overall == null) return null;
  const value = Number(overall);
  if (!Number.isFinite(value)) return null;
  if (value >= FIT_BANDS.excellent) return 'excellent';
  if (value >= FIT_BANDS.veryGood) return 'veryGood';
  if (value >= FIT_BANDS.good) return 'good';
  return 'fair';
}

// ── Candidatos demo (referencia: tabla "Recommended candidates", 6 rows) ────

export function slugifyName(name) {
  return normalizeProcessText(name).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function initialsFromName(name) {
  const words = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function demoCandidates(entries) {
  return entries.map((entry, index) => Object.freeze({
    id: slugifyName(entry.name),
    name: entry.name, // nombres demo: idénticos ES/EN (referencia)
    initials: initialsFromName(entry.name),
    rank: index + 1,
    target: entry.target, // ancla de escala ref (94/91/87/82/79/76)
    status: 'evaluated',
  }));
}

// ── Perfiles demo (referencia: process-detail/operator/technician .html) ───

function profile(id, role, department, location, mode, profileText, openedAt, created, daysActive, averageScore, stats, advanced, candidates) {
  return Object.freeze({
    id,
    role,
    department,
    location,
    mode,
    profile: profileText,
    openedAt,
    created,
    daysActive,
    status: 'active',
    averageScore,
    stats: Object.freeze({ ...stats }),
    advanced,
    candidates: Object.freeze(candidates),
  });
}

export const DEMO_PROCESS_PROFILES = Object.freeze({
  supervisor: profile(
    'supervisor',
    { es: 'Supervisor de Planta', en: 'Plant Supervisor' },
    'operations',
    'Antofagasta, Chile',
    { es: 'Presencial', en: 'On-site' },
    {
      es: 'Profesional orientado a operaciones, con capacidad de liderazgo, toma de decisiones y gestión de equipos en terreno.',
      en: 'Operations-oriented professional with leadership, decision-making and on-site team management skills.',
    },
    '2026-08-20',
    { es: '20 de agosto de 2026', en: 'August 20, 2026' },
    18,
    78,
    {
      applicants: 23, evaluated: 19, pending: 4,
      distribution: Object.freeze([
        { range: '0–59', count: 2 },
        { range: '60–69', count: 4 },
        { range: '70–79', count: 7 },
        { range: '80–89', count: 5 },
        { range: '90–100', count: 1 },
      ]),
      avgTimeMin: 14,
    },
    Object.freeze({
      age: Object.freeze({ avg: 36, bars: Object.freeze([
        { label: '18–24', count: 3 }, { label: '25–34', count: 9 },
        { label: '35–44', count: 7 }, { label: '45+', count: 4 },
      ]) }),
      experience: Object.freeze({ avg: 8, bars: Object.freeze([
        { label: '0–2', count: 2 }, { label: '3–5', count: 6 },
        { label: '6–10', count: 9 }, { label: '11+', count: 6 },
      ]) }),
      cognitivePresent: Object.freeze([
        { key: 'attention', value: 84 }, { key: 'reasoning', value: 79 }, { key: 'memory', value: 74 },
      ]),
      cognitiveScarce: Object.freeze([
        { key: 'flexibility', value: 37 }, { key: 'planning', value: 32 }, { key: 'speed', value: 26 },
      ]),
    }),
    demoCandidates([
      { name: 'María González', target: 94 },
      { name: 'Diego Ramírez', target: 91 },
      { name: 'Camila Soto', target: 87 },
      { name: 'Juan Pérez', target: 82 },
      { name: 'Sebastián Torres', target: 79 },
      { name: 'Valentina Rojas', target: 76 },
    ]),
  ),
  operator: profile(
    'operator',
    { es: 'Operador de Planta', en: 'Plant Operator' },
    'operations',
    'Calama, Chile',
    { es: 'Presencial', en: 'On-site' },
    {
      es: 'Profesional de operaciones con atención al detalle, cumplimiento de procedimientos y capacidad de trabajo en equipo.',
      en: 'Operations professional with attention to detail, adherence to procedures and teamwork skills.',
    },
    '2026-08-25',
    { es: '25 de agosto de 2026', en: 'August 25, 2026' },
    13,
    81,
    {
      applicants: 47, evaluated: 40, pending: 7,
      distribution: Object.freeze([
        { range: '0–59', count: 2 },
        { range: '60–69', count: 4 },
        { range: '70–79', count: 9 },
        { range: '80–89', count: 18 },
        { range: '90–100', count: 7 },
      ]),
      avgTimeMin: 14,
    },
    Object.freeze({
      age: Object.freeze({ avg: 32, bars: Object.freeze([
        { label: '18–24', count: 12 }, { label: '25–34', count: 18 },
        { label: '35–44', count: 11 }, { label: '45+', count: 6 },
      ]) }),
      experience: Object.freeze({ avg: 5, bars: Object.freeze([
        { label: '0–2', count: 10 }, { label: '3–5', count: 20 },
        { label: '6–10', count: 12 }, { label: '11+', count: 5 },
      ]) }),
      cognitivePresent: Object.freeze([
        { key: 'attention', value: 90 }, { key: 'reasoning', value: 80 }, { key: 'memory', value: 75 },
      ]),
      cognitiveScarce: Object.freeze([
        { key: 'flexibility', value: 35 }, { key: 'planning', value: 30 }, { key: 'speed', value: 25 },
      ]),
    }),
    demoCandidates([
      { name: 'Pablo Morales', target: 94 },
      { name: 'Ana Silva', target: 91 },
      { name: 'Felipe Castro', target: 87 },
      { name: 'Daniela Muñoz', target: 82 },
      { name: 'Andrés Vega', target: 79 },
      { name: 'Carolina Díaz', target: 76 },
    ]),
  ),
  technician: profile(
    'technician',
    { es: 'Técnico de Mantención', en: 'Maintenance Technician' },
    'maintenance',
    'Antofagasta, Chile',
    { es: 'Presencial', en: 'On-site' },
    {
      es: 'Profesional técnico con habilidades de diagnóstico de equipos, mantenimiento preventivo y resolución de problemas.',
      en: 'Technical professional with equipment diagnosis, preventive maintenance and problem-solving skills.',
    },
    '2026-08-29',
    { es: '29 de agosto de 2026', en: 'August 29, 2026' },
    9,
    84,
    {
      applicants: 31, evaluated: 26, pending: 5,
      distribution: Object.freeze([
        { range: '0–59', count: 1 },
        { range: '60–69', count: 2 },
        { range: '70–79', count: 4 },
        { range: '80–89', count: 12 },
        { range: '90–100', count: 7 },
      ]),
      avgTimeMin: 14,
    },
    Object.freeze({
      age: Object.freeze({ avg: 35, bars: Object.freeze([
        { label: '18–24', count: 5 }, { label: '25–34', count: 12 },
        { label: '35–44', count: 9 }, { label: '45+', count: 5 },
      ]) }),
      experience: Object.freeze({ avg: 7, bars: Object.freeze([
        { label: '0–2', count: 4 }, { label: '3–5', count: 10 },
        { label: '6–10', count: 11 }, { label: '11+', count: 6 },
      ]) }),
      cognitivePresent: Object.freeze([
        { key: 'attention', value: 88 }, { key: 'reasoning', value: 81 }, { key: 'memory', value: 77 },
      ]),
      cognitiveScarce: Object.freeze([
        { key: 'flexibility', value: 38 }, { key: 'planning', value: 31 }, { key: 'speed', value: 27 },
      ]),
    }),
    demoCandidates([
      { name: 'Nicolás Fuentes', target: 94 },
      { name: 'Francisca López', target: 91 },
      { name: 'Tomás Herrera', target: 87 },
      { name: 'Javiera Ríos', target: 82 },
      { name: 'Matías Contreras', target: 79 },
      { name: 'Catalina Reyes', target: 76 },
    ]),
  ),
});

export const DEMO_PROCESS_IDS = Object.freeze(Object.keys(DEMO_PROCESS_PROFILES));

export function getDemoProcessDetail(id) {
  return DEMO_PROCESS_PROFILES[id] ?? null;
}

// Fecha de sesión demo (determinista): openedAt + rank días (todos < "hoy"
// 2026-09-07, consistente con los días activos de la referencia).
function demoCompletedAt(profile, candidate) {
  const base = new Date(`${profile.openedAt}T00:00:00.000Z`);
  if (Number.isNaN(base.getTime())) return null;
  base.setUTCDate(base.getUTCDate() + candidate.rank);
  return base.toISOString();
}

// ── Motor demo del reporte (D3: builder del flujo, no una copia) ────────────

const REF_TOP_TARGET = 94; // ancla: el rank 1 de la referencia (94 en los 3 perfiles)
const DEMO_GENERATED_AT = '2026-09-07T12:00:00.000Z';
const DEMO_RUN_PREFIX = 'krumm-company-demo';
const clamp01 = (value) => Math.min(1, Math.max(0, Number(value)));
const round4 = (value) => Number(clamp01(value).toFixed(4));

// Aggregates por juego en el shape del fixture (postulationDemoFixture.js) con
// los campos ratio/eficiencia escalados por f (calibrado /tmp 2026-09-08).
function scaledSummary(gameId, f) {
  if (gameId === 'laser_puzzle') {
    return {
      gameId, aggregateSchemaVersion: 'laser_puzzle_aggregate_v1', completed: true,
      completedTrialCount: 3, trialCount: 3, score: round4(f), levelCount: 3, solvedLevels: 3,
      moveCount: Math.max(6, Math.round(9 * (2 - f))), reconfigurationCount: 9, hintCount: 0,
      timeMs: 128000, solutionEfficiency: round4(f), ruleViolationCount: 0, aggregateOnly: true,
    };
  }
  if (gameId === 'balloon_risk') {
    return {
      gameId, aggregateSchemaVersion: 'balloon_risk_aggregate_v1', completed: true,
      completedTrialCount: 8, trialCount: 8, score: round4(0.72 * f), roundsCompleted: 8, totalRounds: 8,
      averagePumps: 5.8, cashoutCount: 6, popCount: 2, postPopAdjustment: -1.5,
      postPopAdjustmentCount: 1, riskEfficiency: round4(0.72 * f), timeMs: 68000, aggregateOnly: true,
    };
  }
  if (gameId === 'passenger_routes') {
    return {
      gameId, aggregateSchemaVersion: 'passenger_routes_aggregate_v1', completed: true,
      completedTrialCount: 3, trialCount: 3, score: round4(0.91 * f), passengersDelivered: 5,
      destinationCount: 5, routeEfficiency: round4(0.92 * f), movementAttemptCount: 39,
      replanCount: 1, stationUseCount: 3, constraintViolationCount: 0,
      satisfactionScore: Math.round(92 * f), timeMs: 186000, aggregateOnly: true,
    };
  }
  if (gameId === 'team_coordination') {
    return {
      gameId, aggregateSchemaVersion: 'team_coordination_aggregate_v1', completed: true,
      completedTrialCount: 4, trialCount: 4, score: round4(0.86 * f), scenarioCount: 4,
      completedScenarioCount: 4, leadershipScore: round4(0.87 * f),
      communicationScore: round4(0.88 * f), adaptabilityScore: round4(0.82 * f),
      decisionQualityScore: round4(0.86 * f), alignmentScore: round4(0.88 * f),
      roleClarityScore: round4(0.86 * f), feedbackUseScore: round4(0.76 * f),
      changeResponseScore: round4(0.84 * f), timeMs: 96000, aggregateOnly: true,
    };
  }
  if (gameId === 'tangram_exp001') {
    return {
      gameId, aggregateSchemaVersion: 'tangram_exp001_aggregate_v1', completed: true,
      completedTrialCount: 4, trialCount: 4, score: round4(0.87 * f), levelsAttempted: 4,
      completedLevels: 4, solvedLevels: 3, totalTimeMs: 214000, totalMoves: 19,
      totalRotations: 11, avgCoveragePercent: Math.round(88 * f), avgInitialLatencyMs: 3400,
      avgTrajectoryEfficiency: round4(0.82 * f), avgHesitationTimeMs: 900,
      totalMoveOverhead: 3, timingPressureHighLatency: false, aggregateOnly: true,
    };
  }
  return { gameId, completedTrialCount: 1, trialCount: 1, accuracy: round4(f), score: round4(f), meanReactionTimeMs: 600 };
}

// Eventos sintéticos game_event_v1 (mismo shape que el fixture: 1 estímulo +
// 1 respuesta por juego) para que la correlación exista y los caveats del
// reporte coincidan con el reporte fixture H4.3 (QA aprobado).
function demoGameEvents(blocks) {
  return blocks.flatMap((entry, index) => {
    const { block, summary } = entry;
    const base = 1000 + (index * 1600);
    let response;
    if (block.gameId === 'laser_puzzle') response = { correct: true, outcome: 'level_solved', reactionTimeMs: 420 + (index * 35), score: summary.score, laserPuzzle: summary };
    else if (block.gameId === 'balloon_risk') response = { outcome: 'cashout', reactionTimeMs: 420 + (index * 35), score: summary.score, balloonRisk: summary };
    else if (block.gameId === 'passenger_routes') response = { correct: true, outcome: 'route_completed', reactionTimeMs: 420 + (index * 35), score: summary.score, passengerRoutes: summary };
    else if (block.gameId === 'team_coordination') response = { correct: true, outcome: 'structured_choice', reactionTimeMs: 420 + (index * 35), score: summary.score, teamCoordination: summary };
    else if (block.gameId === 'tangram_exp001') response = { correct: true, outcome: 'assembly_completed', reactionTimeMs: 420 + (index * 35), score: summary.score, tangram: summary };
    else response = { correct: true, outcome: 'completed', reactionTimeMs: 420 + (index * 35), score: summary.score };
    return [
      {
        type: 'game_event_v1', eventType: 'stimulus_shown', gameId: block.gameId,
        trialId: `${block.gameId}-company-demo-1`, targetId: `${block.gameId}-cue-1`,
        timestamp: base, stimulus: { kind: `${block.gameId}_company_demo_cue` },
      },
      {
        type: 'game_event_v1', eventType: 'response', gameId: block.gameId,
        trialId: `${block.gameId}-company-demo-1`, targetId: `${block.gameId}-cue-1`,
        timestamp: base + 420 + (index * 35), response,
      },
    ];
  });
}

// Contexto de señal sintético (misma forma que el fixture del flujo; runtime
// marcado como company demo). Nunca contiene datos de una persona real.
function demoSignalContext() {
  return {
    faceSamples: [
      { timestamp: 780, quality: { facePresent: true, confidence: 0.78 }, blendshapes: { browDownLeft: 0.04, browDownRight: 0.04, eyeBlinkLeft: 0.02, eyeBlinkRight: 0.02 } },
      { timestamp: 1160, quality: { facePresent: true, confidence: 0.84 }, blendshapes: { browDownLeft: 0.12, browDownRight: 0.13, eyeBlinkLeft: 0.04, eyeBlinkRight: 0.04 } },
      { timestamp: 2760, quality: { facePresent: true, confidence: 0.82 }, blendshapes: { browDownLeft: 0.1, browDownRight: 0.11, eyeBlinkLeft: 0.05, eyeBlinkRight: 0.05 } },
      { timestamp: 4380, quality: { facePresent: true, confidence: 0.86 }, blendshapes: { browDownLeft: 0.08, browDownRight: 0.08, eyeBlinkLeft: 0.03, eyeBlinkRight: 0.03 } },
      { timestamp: 5980, quality: { facePresent: true, confidence: 0.88 }, blendshapes: { browDownLeft: 0.06, browDownRight: 0.07, eyeBlinkLeft: 0.03, eyeBlinkRight: 0.03 } },
    ],
    gazeSamples: [
      { timestamp: 1160, lookingAtScreen: true, confidence: 0.82, screenX: 0.5, screenY: 0.48 },
      { timestamp: 2760, lookingAtScreen: true, confidence: 0.78, screenX: 0.52, screenY: 0.5 },
      { timestamp: 4380, lookingAtScreen: true, confidence: 0.84, screenX: 0.49, screenY: 0.52 },
      { timestamp: 5980, lookingAtScreen: true, confidence: 0.86, screenX: 0.51, screenY: 0.49 },
    ],
    postureSamples: [
      { timestamp: 1160, postureScore: 0.76, headForward: 0.22, confidence: 0.8 },
      { timestamp: 2760, postureScore: 0.72, headForward: 0.28, confidence: 0.78 },
      { timestamp: 4380, postureScore: 0.8, headForward: 0.18, confidence: 0.82 },
      { timestamp: 5980, postureScore: 0.83, headForward: 0.16, confidence: 0.84 },
    ],
    upperBodySamples: [
      { timestamp: 1160, confidence: 0.78, armActivity: 0.32, upperBodyCoverage: 0.72 },
      { timestamp: 2760, confidence: 0.8, armActivity: 0.36, upperBodyCoverage: 0.74 },
      { timestamp: 4380, confidence: 0.82, armActivity: 0.28, upperBodyCoverage: 0.76 },
      { timestamp: 5980, confidence: 0.84, armActivity: 0.24, upperBodyCoverage: 0.78 },
    ],
    latestGaze: { lookingAtScreen: true, confidence: 0.86, screenX: 0.51, screenY: 0.49 },
    latestPosture: { postureScore: 0.83, headForward: 0.16, confidence: 0.84 },
    moveNetPose: { confidence: 0.84, symmetry: 0.9, armActivity: 0.24, upperBodyCoverage: 0.78 },
    runtime: { delegate: 'synthetic-fixture', source: 'company_demo_candidate' },
  };
}

const DEMO_SIGNAL_SNAPSHOT = Object.freeze({
  camera: 'ok', face: 'ok', signal: 'ok', events: 10, sampleCount: 48,
  facePresenceRatio: 0.88, meanConfidence: 0.83, fpsEstimate: 15,
  caveats: ['synthetic_demo_fixture'],
});

const DEMO_FIXTURE_BANNER = Object.freeze({
  synthetic: true,
  batteryMode: POSTULATION_DEMO_BATTERY_MODES.ORIGINAL_GAMES,
  label: 'Candidato de demostración',
  labelEn: 'Demo candidate',
  description: 'Datos sintéticos del workspace de demostración; no corresponden a una persona real.',
  descriptionEn: 'Synthetic data from the demo workspace; does not correspond to a real person.',
});

// Overall = media de constructos no-nulos del talentFramework (R-6:
// decisionMaking/adaptability = descriptive score null → fuera de la media;
// señal ausente ≠ 0, V2 pitfall Number(null)===0).
export function demoCandidateOverall(artifacts) {
  const framework = artifacts?.assessmentSession?.talentFramework ?? artifacts?.talentFramework;
  const constructs = framework?.constructs ?? {};
  const order = Array.isArray(framework?.constructOrder) && framework.constructOrder.length > 0
    ? framework.constructOrder
    : Object.keys(constructs);
  const scores = order
    .map((id) => {
      const construct = constructs[id];
      if (!construct || construct.score == null) return null;
      const value = Number(construct.score);
      return Number.isFinite(value) ? value : null;
    })
    .filter((value) => value != null);
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length);
}

const demoReportCache = new Map();
const lightOverallCache = new Map();

// Construye (y cachea) el reporte demo de un candidato: artifacts del builder
// del flujo + overall/fit derivados. Determinista (runId/generatedAt fijos).
export function getDemoCandidateReport(processId, candidateId) {
  const key = `${processId}:${candidateId}`;
  const cached = demoReportCache.get(key);
  if (cached) return cached;
  const profile = getDemoProcessDetail(processId);
  const candidate = profile?.candidates?.find((entry) => entry.id === candidateId);
  if (!profile || !candidate) return null;
  const factor = clamp01(candidate.target / REF_TOP_TARGET);
  const battery = listVisiblePostulationBlocks(getPostulationDemoBattery(POSTULATION_DEMO_BATTERY_MODES.ORIGINAL_GAMES));
  const blocks = battery.map((block) => ({ block, summary: scaledSummary(block.gameId, factor) }));
  const completedDemo = {
    batteryMode: POSTULATION_DEMO_BATTERY_MODES.ORIGINAL_GAMES,
    batteryId: POSTULATION_DEMO_BATTERY_IDS[POSTULATION_DEMO_BATTERY_MODES.ORIGINAL_GAMES],
    completedCount: blocks.length,
    totalCount: blocks.length,
    blocks,
  };
  const artifacts = buildPostulationDemoArtifacts({
    completedDemo,
    gameEvents: demoGameEvents(blocks),
    signalSnapshot: DEMO_SIGNAL_SNAPSHOT,
    signalContext: demoSignalContext(),
    generatedAt: DEMO_GENERATED_AT,
    runId: `${DEMO_RUN_PREFIX}-${profile.id}-${candidate.id}`,
    batteryMode: POSTULATION_DEMO_BATTERY_MODES.ORIGINAL_GAMES,
    cameraConsent: true,
    participant: { mode: 'company_demo_candidate' },
  });
  artifacts.fixture = { ...DEMO_FIXTURE_BANNER };
  const overall = demoCandidateOverall(artifacts);
  const report = {
    profile,
    candidate,
    completedDemo,
    artifacts,
    overall,
    fit: fitForScore(overall),
    completedAt: demoCompletedAt(profile, candidate),
  };
  demoReportCache.set(key, report);
  return report;
}

// Overall LIGERO para la tabla del detalle (mismo engine de constructos, sin
// reports/bundle/edgeAI): feature vector v2 + talent framework — los mismos
// 8 constructos que el artifacts completo (verificado: idempotente con
// getDemoCandidateReport). Cachea para no reconstruir por render.
export function getDemoCandidateOverall(processId, candidateId) {
  const key = `${processId}:${candidateId}`;
  if (lightOverallCache.has(key)) return lightOverallCache.get(key);
  const profile = getDemoProcessDetail(processId);
  const candidate = profile?.candidates?.find((entry) => entry.id === candidateId);
  if (!profile || !candidate) return null;
  const factor = clamp01(candidate.target / REF_TOP_TARGET);
  const battery = listVisiblePostulationBlocks(getPostulationDemoBattery(POSTULATION_DEMO_BATTERY_MODES.ORIGINAL_GAMES));
  const batteryId = POSTULATION_DEMO_BATTERY_IDS[POSTULATION_DEMO_BATTERY_MODES.ORIGINAL_GAMES];
  const blocks = battery.map((block) => ({
    gameId: block.gameId,
    label: block.label,
    trialCount: block.trialCount,
    result: sanitizeOriginalGameAggregate(block.gameId, scaledSummary(block.gameId, factor)),
  }));
  const vector = buildOriginalGameFeatureVector({
    blocks,
    runId: `${DEMO_RUN_PREFIX}-${profile.id}-${candidate.id}`,
    batteryId,
  });
  const framework = buildOriginalGameTalentFramework({
    originalGameFeatureVector: vector,
    generatedAt: DEMO_GENERATED_AT,
    signalQuality: { sampleCount: DEMO_SIGNAL_SNAPSHOT.sampleCount },
  });
  const overall = demoCandidateOverall({ talentFramework: framework });
  lightOverallCache.set(key, overall);
  return overall;
}

// Reset de cachés (tests / hot reload).
export function resetDemoReportCache() {
  demoReportCache.clear();
  lightOverallCache.clear();
}

// ── Modo real (D6): /sessions (contract v1, V2 D3/D9) ───────────────────────

// Guard local de privacidad de la fila (mismo patrón FORBIDDEN_KEYS de v1;
// D9: no importar del árbol hr-dashboard que V5 deprecia).
const REAL_ROW_FORBIDDEN_KEYS = new Set([
  'name', 'email', 'phone', 'video', 'frames', 'imageData', 'screenshot',
  'landmarks', 'keypoints', 'pointerSamples', 'rawPointerPath', 'fullRoute',
  'routeTrace', 'visitedCells', 'choiceSequence', 'freeText', 'typedResponse',
  'rawGameEvents', 'faceSamples', 'blendshapesRaw', 'trials', 'trialResults',
]);

export function validateRealSessionRowPrivacy(value) {
  const violations = [];
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(visit); return; }
    for (const [key, child] of Object.entries(node)) {
      if (REAL_ROW_FORBIDDEN_KEYS.has(key)) violations.push(key);
      visit(child);
    }
  };
  visit(value);
  const unique = [...new Set(violations)];
  return { ok: unique.length === 0, violations: unique };
}

export const REAL_SESSION_STATUS = Object.freeze({
  ready: Object.freeze({ es: 'Listo para revisión', en: 'Ready for review', tone: 'ready' }),
  needs_review: Object.freeze({ es: 'Revisar caveats', en: 'Review caveats', tone: 'review' }),
  in_progress: Object.freeze({ es: 'En progreso', en: 'In progress', tone: 'progress' }),
});

// Códigos de caveat de calidad (contract v1) + códigos del flujo H4.3 →
// labels ES/EN; fallback = el código mismo (honesto, no se inventa).
export const CAVEAT_LABELS = Object.freeze({
  camera_not_enabled_or_no_samples: Object.freeze({ es: 'Cámara no activada o sin muestras de señal.', en: 'Camera not enabled or no signal samples.' }),
  low_sample_count: Object.freeze({ es: 'Muestras insuficientes en la sesión.', en: 'Insufficient samples in the session.' }),
  low_face_presence: Object.freeze({ es: 'Presencia facial baja durante la captura.', en: 'Low face presence during capture.' }),
  low_face_confidence: Object.freeze({ es: 'Confianza facial limitada en la captura.', en: 'Limited facial confidence in the capture.' }),
  missing_game_correlation: Object.freeze({ es: 'Sin correlación entre juegos y señal observada.', en: 'No correlation between games and observed signal.' }),
  synthetic_demo_fixture: Object.freeze({ es: 'Datos sintéticos de muestra; no corresponden a una persona real.', en: 'Synthetic sample data; does not correspond to a real person.' }),
  original_games_r6d_provisional_mapping: Object.freeze({ es: 'Mapeo de constructos provisional; requiere validación psicométrica adicional.', en: 'Provisional construct mapping; requires additional psychometric validation.' }),
  low_model_confidence: Object.freeze({ es: 'Confianza limitada en la señal local; interpretar con cautela.', en: 'Limited confidence in the local signal; interpret with caution.' }),
  original_games_r6d_mapping_available_in_talent_framework: Object.freeze({ es: 'Scores de prueba disponibles con límites explicados por constructo.', en: 'Assessment scores available with per-construct explained limits.' }),
  aggregate_proxy_only: Object.freeze({ es: 'Lectura agregada de desempeño en juego; no infiere rasgos.', en: 'Aggregated in-game performance reading; does not infer traits.' }),
  biometric_channels_not_inferred_without_signal_context: Object.freeze({ es: 'Canales biométricos no inferidos sin contexto de señal.', en: 'Biometric channels not inferred without signal context.' }),
});

export function translateCaveat(code) {
  const label = CAVEAT_LABELS[code];
  if (!label) return { es: String(code), en: String(code) };
  return label;
}

function clampScore(value) {
  if (value == null) return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.round(Math.max(0, Math.min(100, numeric)));
}

function aliasInitials(alias) {
  const cleaned = String(alias ?? '').replace(/[^a-zA-Z0-9]/g, '');
  if (!cleaned) return '';
  return cleaned.slice(-3).toUpperCase();
}

// Detalle real: grupo por rol (V2 D3) + candidatos = filas reales ordenadas
// por overall desc (nulos al final, tiebreak alias). Sin días/distribución/
// avanzadas/tiempo: no existen en /sessions (D5/D6 — no inventar).
export function buildRealProcessDetail(process, sessions = []) {
  const candidates = (Array.isArray(sessions) ? sessions : [])
    .map((row) => ({
      id: row?.id ?? null,
      alias: row?.alias ?? null,
      initials: aliasInitials(row?.alias),
      overall: candidateOverallScore(row),
      status: row?.status ?? null,
      completedAt: row?.completedAt ?? null,
    }))
    .filter((entry) => entry.id)
    .sort((a, b) => ((b.overall ?? -1) - (a.overall ?? -1)) || String(a.alias ?? '').localeCompare(String(b.alias ?? '')));
  const evaluated = process?.evaluated ?? 0;
  const applicants = process?.candidates ?? 0;
  return {
    kind: 'real',
    id: process?.id ?? null,
    role: { es: process?.role ?? '', en: process?.roleEn ?? process?.role ?? '' },
    department: null,
    location: null,
    mode: null,
    profile: null,
    openedAt: process?.openedAt ?? null,
    created: null,
    daysActive: null, // /sessions no trae fecha de inicio del proceso
    status: process?.status ?? 'active',
    averageScore: process?.averageScore ?? null,
    stats: {
      applicants,
      evaluated,
      pending: Math.max(0, applicants - evaluated),
      distribution: null,
      avgTimeMin: null,
    },
    advanced: null,
    candidates,
  };
}

// Reporte real: fila /sessions → mismo data-model (D6): 8 constructos
// (score null → insufficient), caveats traducidos, juegos allowlist,
// cobertura/calidad/estado e integridad (guard de privacidad).
export function buildRealReportModel(row) {
  if (!row || typeof row !== 'object') return null;
  const integrity = validateRealSessionRowPrivacy(row);
  const constructs = (Array.isArray(row.constructs) ? row.constructs : [])
    .filter((construct) => construct && typeof construct === 'object')
    .map((construct) => {
      const id = construct.id ?? null;
      const definition = getConstructDefinition(id) ?? null;
      const score = clampScore(construct.score);
      const availability = score == null ? 'insufficient' : 'provisional_score';
      return {
        id,
        // ids canónicos → labels/descripciones del flujo (mismo que el engine);
        // ids no-canónicos → lo que trae la fila.
        label: definition?.label ?? construct.label ?? id ?? '',
        labelEn: definition?.labelEn ?? construct.labelEn ?? construct.label ?? id ?? '',
        score,
        confidence: construct.confidence == null ? null : clamp01(construct.confidence),
        availability,
        description: definition?.description ?? construct.description ?? '',
        descriptionEn: definition?.descriptionEn ?? construct.descriptionEn ?? '',
        narrative: availability === 'provisional_score'
          ? 'Lectura provisional para revisión humana.'
          : 'No hay evidencia suficiente para puntuar este constructo con los datos de la sesión.',
        narrativeEn: availability === 'provisional_score'
          ? 'Provisional reading for human review.'
          : 'There is not enough evidence to score this construct from the session data.',
      };
    });
  const allCanonical = constructs.length > 0
    && constructs.every((construct) => WORKBOOK_TALENT_CONSTRUCT_ORDER.includes(construct.id));
  const constructOrder = allCanonical
    ? WORKBOOK_TALENT_CONSTRUCT_ORDER.filter((id) => constructs.some((construct) => construct.id === id))
    : constructs.map((construct) => construct.id);
  const overall = candidateOverallScore(row);
  const completed = Number(row.completion?.completed ?? 0);
  const total = Number(row.completion?.total ?? (Array.isArray(row.games) ? row.games.length : 0));
  return {
    kind: 'real',
    id: row.id ?? null,
    alias: row.alias ?? null,
    initials: aliasInitials(row.alias),
    status: row.status ?? null,
    completedAt: row.completedAt ?? null,
    coverage: { completed, total },
    sessionQuality: row.sessionQuality == null ? null : clamp01(row.sessionQuality),
    integrity,
    constructs,
    constructOrder,
    games: (Array.isArray(row.games) ? row.games : []).map((game) => ({
      id: game?.id ?? null,
      label: game?.label ?? '',
      labelEn: game?.labelEn ?? game?.label ?? '',
      metric: game?.metric ?? null,
      value: clampScore(game?.value),
    })),
    caveats: (Array.isArray(row.caveats) ? row.caveats : []).map((code) => translateCaveat(String(code))),
    overall,
    fit: fitForScore(overall),
  };
}

export function findSessionRow(sessions, sessionId) {
  return (Array.isArray(sessions) ? sessions : []).find((row) => row?.id === sessionId) ?? null;
}

// ── V4 (t_9319e84d): detalle coherente del proceso draft (plan V4 D4) ───────
// Mismo shape que buildRealProcessDetail (stats ceros, sin distribution/
// advanced/tiempo, sin candidatos, averageScore null) + los campos del
// formulario de diseño (department/location/mode/profile). El detalle de la
// página rama: 3 perfiles demo → draft (source:'design' en data.processes)
// → notFound (V3 intacto).
//
// Fechas: openedAt es 'YYYY-MM-DD' sin zona. new Date('…T00:00:00Z') formateado
// CON timeZone:'UTC' → determinista (sin -1 día en CLT). daysActive =
// diferencia en días (hoy − openedAt; min 0).
export const DESIGN_MODE_LABELS = Object.freeze({
  onsite: Object.freeze({ es: 'Presencial', en: 'On-site' }),
  hybrid: Object.freeze({ es: 'Híbrido', en: 'Hybrid' }),
  remote: Object.freeze({ es: 'Remoto', en: 'Remote' }),
});

function parseUtcDay(date) {
  const parts = String(date ?? '').split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  const utc = Date.UTC(parts[0], parts[1] - 1, parts[2]);
  return Number.isNaN(utc) ? null : utc;
}

function longDate(date, language) {
  const utc = parseUtcDay(date);
  if (utc == null) return null;
  return new Date(utc).toLocaleDateString(language === 'en' ? 'en-US' : 'es-CL', {
    dateStyle: 'long',
    timeZone: 'UTC',
  });
}

function daysBetween(fromDate, toDate) {
  const from = parseUtcDay(fromDate);
  const to = parseUtcDay(toDate);
  if (from == null || to == null) return null;
  return Math.max(0, Math.round((to - from) / 86400000));
}

export function buildDraftProcessDetail(process, today = new Date().toISOString().slice(0, 10)) {
  if (!process || typeof process !== 'object') return null;
  const mode = DESIGN_MODE_LABELS[process.mode] ?? DESIGN_MODE_LABELS.onsite;
  return Object.freeze({
    kind: 'draft',
    id: process.id ?? null,
    role: { es: process.role ?? '', en: process.roleEn ?? process.role ?? '' },
    department: process.department ?? null,
    location: process.location ?? null,
    mode,
    // profile = texto del usuario: mismo en ambos idiomas (sin traducción).
    profile: process.profile ? { es: process.profile, en: process.profile } : null,
    openedAt: process.openedAt ?? null,
    created: { es: longDate(process.openedAt, 'es'), en: longDate(process.openedAt, 'en') },
    daysActive: daysBetween(process.openedAt, today),
    status: 'active',
    averageScore: null,
    stats: Object.freeze({ applicants: 0, evaluated: 0, pending: 0, distribution: null, avgTimeMin: null }),
    advanced: null,
    candidates: Object.freeze([]),
  });
}

// Filas reales que pertenecen a un proceso (grupo por rol, V2 D3):
// slugifyProcessId(role) === processId (sin rol → 'unspecified').
export function sessionsForProcess(sessions, processId) {
  return (Array.isArray(sessions) ? sessions : []).filter((row) => {
    if (!row || typeof row !== 'object') return false;
    const key = row.role ? slugifyProcessId(row.role) : UNSPECIFIED_PROCESS_ID;
    return key === processId;
  });
}
