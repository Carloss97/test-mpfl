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
});
