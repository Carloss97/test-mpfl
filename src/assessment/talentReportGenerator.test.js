import { describe, expect, it } from 'vitest';
import { generateTalentReport } from './talentReportGenerator.js';
import { FINAL_ASSESSMENT_PAYLOAD_SCHEMA } from './finalAssessmentPayload.js';

const payload = {
  schemaVersion: FINAL_ASSESSMENT_PAYLOAD_SCHEMA,
  runId: 'run-w-001',
  batteryId: 'krumm_unified_battery_v1',
  generatedAt: '2026-06-19T01:10:00.000Z',
  participant: { aliasHash: 'alias-123', declaredRoleTarget: 'Analista' },
  quality: { sampleCount: 180, facePresenceRatio: 0.92, meanConfidence: 0.86, correlatedTrialCount: 24, caveats: ['lighting_moderate'] },
  behavioral: {
    gameSummary: {
      performance: { trialCount: 24, completedTrialCount: 24, accuracy: 0.86, meanReactionTimeMs: 390, meanScore: 0.82 },
      motor: { pathEfficiencyMean: 0.84 },
      inhibition: { commissionErrorRate: 0.06, omissionErrorRate: 0.04 },
      visualSearch: { searchEfficiency: 0.74 },
    },
    gameCorrelationAggregate: { completedTrialCount: 24, meanReactionPostureDelta: -0.03, meanReactionFacePresenceDelta: 0.02 },
    adaptiveDifficultyTrace: [{ direction: 'up', reasonCodes: ['high_accuracy'], previousLevel: 4, nextLevel: 5 }],
    featureVectorV2: { type: 'assessment_feature_vector_v2', version: '0.2.0', featureOrder: ['game.accuracy'], featureArray: [0.86], qualityFlags: [] },
  },
  talentProfile: {
    schemaVersion: 'krumm_talent_profile_v1',
    globalSummary: { strengths: ['Control inhibitorio', 'Precisión visomotora'], watchAreas: ['Manejo de interferencia'], confidence: 0.82 },
    dimensions: {
      processingSpeed: { label: 'Velocidad de procesamiento', score: 78, confidence: 0.82, evidence: ['RT medio 390ms', 'accuracy 86%'], caveats: [] },
      inhibitoryControl: { label: 'Control inhibitorio', score: 86, confidence: 0.82, evidence: ['commissionErrorRate 6%'], caveats: [] },
      interferenceControl: { label: 'Manejo de interferencia', score: 58, confidence: 0.82, evidence: ['conflictCost 210ms'], caveats: ['lighting_moderate'] },
    },
  },
  edgeAI: {
    modelVersion: 'krumm-edge-ai-v9.1.0-game-aware',
    composite: { score: 76, level: 'high' },
    confidence: { score: 0.82, level: 'high' },
    channels: { taskPerformance: { score: 78 }, motorControl: { score: 73 }, cognitiveLoad: { score: 46 } },
    caveats: ['observational_only'],
  },
  governance: { humanReviewOnly: true, noAutomatedDecision: true, observationalOnly: true, privacySafe: true },
};

const originalGamesPayload = {
  ...payload,
  runId: 'run-original-001',
  batteryId: 'krumm_postulation_demo_original_games_v1',
  behavioral: {
    ...payload.behavioral,
    gameResults: [
      {
        gameId: 'laser_puzzle',
        label: 'Puzzle láser',
        status: 'completed',
        trialCount: 3,
        result: { solvedLevels: 3, levelCount: 3, solutionEfficiency: 1, score: 1, timeMs: 42000, aggregateOnly: true },
      },
      {
        gameId: 'passenger_routes',
        label: 'Optimización de rutas',
        status: 'completed',
        trialCount: 3,
        result: { passengersDelivered: 5, destinationCount: 5, routeEfficiency: 1, score: 1, timeMs: 64000, aggregateOnly: true },
      },
      {
        gameId: 'team_coordination',
        label: 'Brief de equipo',
        status: 'completed',
        trialCount: 4,
        result: { completedScenarioCount: 4, scenarioCount: 4, score: 0.83, adaptabilityScore: 0.78, timeMs: 29000, aggregateOnly: true },
      },
    ],
    originalGameFeatureVector: {
      type: 'original_game_feature_vector_v1',
      version: '0.1.0',
      featureOrder: [],
      featureArray: [],
      observedMask: [],
      featureMap: {},
      featureAvailability: {},
      gameAvailability: {},
      qualityFlags: [],
      privacy: { aggregateOnly: true },
    },
  },
  talentProfile: {
    schemaVersion: 'krumm_talent_profile_v1',
    globalSummary: { strengths: [], watchAreas: [], confidence: 0.25 },
    dimensions: {
      legacyOriginalUnsupported: {
        label: 'Perfil legacy DG',
        score: null,
        confidence: 0.25,
        evidence: [],
        caveats: ['legacy_profile_not_applicable'],
      },
    },
  },
  talentFramework: {
    schemaVersion: 'krumm_workbook_talent_framework_v1',
    version: '0.1.0',
    status: 'provisional',
    sourceVector: { type: 'original_game_feature_vector_v1' },
    constructOrder: ['leadership', 'communication', 'riskFeedbackProfile'],
    constructs: {
      leadership: { label: 'Liderazgo', availability: 'provisional_score', score: 86, confidence: 0.55, narrative: 'Lectura preliminar del brief de equipo.' },
      communication: { label: 'Comunicación', availability: 'provisional_score', score: 83, confidence: 0.55, narrative: 'Claridad estructurada sin texto libre.' },
      riskFeedbackProfile: { label: 'Perfil riesgo/feedback', availability: 'provisional_score', score: 61, confidence: 0.55, narrative: 'Estrategia de juego riesgo/feedback; no personalidad ni frustración.' },
    },
    classification: {},
    governance: { humanReviewOnly: true, noAutomatedDecision: true, observationalOnly: true },
  },
};

describe('generateTalentReport', () => {
  it('generates a human-readable Markdown report with required sections and evidence', () => {
    const report = generateTalentReport({ payload, format: 'markdown' });

    expect(report.format).toBe('markdown');
    expect(report.content).toContain('KRUMM — Reporte de Evaluación Gamificada');
    expect(report.content).toContain('## 2. Resumen ejecutivo');
    expect(report.content).toContain('## 4. Perfil de habilidades');
    expect(report.content).toContain('Velocidad de procesamiento');
    expect(report.content).toContain('RT medio 390ms');
    expect(report.content).toContain('## 9. Gobernanza y privacidad');
    expect(report.content).toContain('No se exportó video');
    expect(report.content).toContain('revisión humana');
    expect(report.content.toLowerCase()).not.toContain('contratar');
    expect(report.content.toLowerCase()).not.toContain('rechazar');
    expect(report.content.toLowerCase()).not.toContain('diagnóstico');
  });

  it('generates HTML and JSON variants from the same payload', () => {
    const html = generateTalentReport({ payload, format: 'html' });
    const json = generateTalentReport({ payload, format: 'json' });

    expect(html.mimeType).toBe('text/html');
    expect(html.content).toContain('<h1>KRUMM — Reporte de Evaluación Gamificada</h1>');
    expect(html.content).toContain('Control inhibitorio');
    expect(json.mimeType).toBe('application/json');
    expect(json.content.schemaVersion).toBe('krumm_talent_report_v1');
    expect(json.content.sections.executiveSummary.strengths).toContain('Control inhibitorio');
  });

  it('uses the original-games evidence map in technical Markdown instead of the legacy 25% DG profile', () => {
    const report = generateTalentReport({ payload: originalGamesPayload, format: 'markdown' }).content;

    expect(report).toContain('Confianza global del perfil: no aplica');
    expect(report).toContain('## 4. Mapa de evidencia KRUMM — batería original');
    expect(report).toContain('| Liderazgo | Lectura preliminar | 86 | 55% |');
    expect(report).toContain('| Perfil riesgo/feedback | Lectura preliminar | 61 | 55% |');
    expect(report).toContain('Precisión 100%; eficiencia 100%');
    expect(report).toContain('Coordinación 83%; adaptabilidad 78%');
    expect(report).not.toContain('Confianza global del perfil: 25%');
    expect(report).not.toContain('25%');
    expect(report).not.toContain('Perfil legacy DG');
    expect(report).not.toContain('## 4.1 Framework workbook R-6 provisional');
    expect(report).not.toContain('provisional_score');
    expect(report).not.toContain('descriptive_only');
    expect(report).not.toContain('Solo descriptivo');
    expect(report).not.toContain('Evidencia insuficiente');
    expect(report).not.toContain('No medido');
  });

  it('renders absent confidence and signal quality as unavailable instead of measured zero', () => {
    const incomplete = JSON.parse(JSON.stringify(payload));
    incomplete.quality = {
      sampleCount: 0,
      facePresenceRatio: null,
      meanConfidence: null,
      correlatedTrialCount: 0,
      caveats: ['camera_not_available'],
    };
    incomplete.talentProfile.globalSummary.confidence = null;
    incomplete.talentProfile.dimensions.processingSpeed.confidence = null;
    incomplete.behavioral.gameCorrelationAggregate = {
      completedTrialCount: 0,
      meanReactionPostureDelta: null,
      meanReactionFacePresenceDelta: null,
    };
    incomplete.edgeAI.composite.score = null;

    const markdown = generateTalentReport({ payload: incomplete, format: 'markdown' }).content;
    const json = generateTalentReport({ payload: incomplete, format: 'json' }).content;

    expect(markdown).toContain('Confianza global del perfil: No disponible');
    expect(markdown).toContain('Rostro presente: No disponible');
    expect(markdown).toContain('Confianza facial media: No disponible');
    expect(markdown).toContain('| Velocidad de procesamiento | 78 | No disponible |');
    expect(markdown).toContain('Delta postura durante reacción: No disponible');
    expect(markdown).toContain('Composite Edge AI: No medido');
    expect(json.sections.executiveSummary.confidence).toBeNull();
  });
});
