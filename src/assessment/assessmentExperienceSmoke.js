import { advanceBatteryState, createBatterySession } from './batteryRuntime.js';
import { buildUnifiedAssessmentSession } from './assessmentSession.js';
import { buildTalentProfile } from './talentProfile.js';
import { buildFinalAssessmentPayload } from './finalAssessmentPayload.js';
import { generateTalentReport } from './talentReportGenerator.js';
import { buildLocalReportBundle } from './reportSubmissionClient.js';

function completeBattery(runId) {
  let session = createBatterySession({ runId, now: 1000 });
  session = advanceBatteryState(session, { type: 'START_CONSENT', timestamp: 1010 });
  session = advanceBatteryState(session, { type: 'ACCEPT_CONSENT', timestamp: 1020 });
  session = advanceBatteryState(session, { type: 'CAMERA_READY', timestamp: 1030 });
  session = advanceBatteryState(session, { type: 'BASELINE_COMPLETE', timestamp: 1060 });

  for (let index = 0; index < session.blocks.length; index += 1) {
    const block = session.blocks[index];
    session = advanceBatteryState(session, { type: 'START_BLOCK', timestamp: 1100 + index * 100 });
    session = advanceBatteryState(session, {
      type: 'BLOCK_COMPLETE',
      timestamp: 1160 + index * 100,
      result: {
        gameId: block.gameId,
        completedTrialCount: block.trialCount,
        accuracy: index % 2 === 0 ? 0.86 : 0.78,
        meanReactionTimeMs: 380 + index * 12,
      },
    });
    if (index < session.blocks.length - 1) {
      session = advanceBatteryState(session, { type: 'REST_COMPLETE', timestamp: 1180 + index * 100 });
    }
  }

  session = advanceBatteryState(session, { type: 'RECOVERY_COMPLETE', timestamp: 1900 });
  session = advanceBatteryState(session, { type: 'REPORT_READY', timestamp: 1910 });
  return session;
}

function syntheticGameSummary() {
  return {
    eventCount: 96,
    performance: {
      trialCount: 24,
      completedTrialCount: 24,
      accuracy: 0.84,
      meanReactionTimeMs: 402,
      meanScore: 0.81,
    },
    motor: {
      pathEfficiencyMean: 0.82,
      smoothPursuitScore: 0.78,
      trackingLossRatio: 0.08,
      overshootRate: 0.11,
    },
    fitts: {
      meanThroughput: 4.1,
      meanIndexDifficulty: 3.2,
    },
    inhibition: {
      commissionErrorRate: 0.05,
      omissionErrorRate: 0.04,
      postErrorSlowingMs: 105,
    },
    interference: {
      conflictCostMs: 170,
      errorRate: 0.11,
    },
    visualSearch: {
      searchEfficiency: 0.74,
      meanSetSize: 12,
      errorRate: 0.08,
    },
  };
}

function syntheticGameCorrelation() {
  return {
    schemaVersion: 'game_signal_correlation_v3',
    aggregate: {
      trialCount: 24,
      completedTrialCount: 24,
      accuracy: 0.84,
      meanReactionTimeMs: 402,
      meanReactionPostureDelta: -0.03,
      meanReactionFacePresenceDelta: 0.02,
      byGameId: {
        simple_rt: 4,
        precision_targeting: 4,
        pursuit_tracking: 4,
        go_nogo: 4,
        color_interference: 4,
        visual_search: 4,
      },
    },
  };
}

function syntheticEdgeAI() {
  return {
    schemaVersion: 'edge_ai_model_output_v8',
    modelVersion: 'krumm-edge-ai-v9.1.0-game-aware',
    composite: { score: 76, level: 'high' },
    confidence: { score: 0.84, level: 'high' },
    channels: {
      taskPerformance: { score: 78 },
      motorControl: { score: 74 },
      visualAttention: { score: 73 },
      inhibitionControl: { score: 86 },
      visuomotorPrecision: { score: 80 },
      visualSearchEfficiency: { score: 73 },
      adaptiveResilience: { score: 77 },
      cognitiveLoad: { score: 45 },
      stressResponse: { score: 36 },
      fatigueIndex: { score: 32 },
    },
    caveats: ['observational_only'],
  };
}

function syntheticFeatureVector(runId) {
  return {
    type: 'assessment_feature_vector_v2',
    version: '0.2.0',
    runId,
    featureOrder: ['game.accuracy', 'edge.taskPerformanceScore'],
    featureArray: [0.84, 78],
    featureMap: {
      'game.accuracy': 0.84,
      'game.meanReactionTimeMs': 402,
      'pointer.pathEfficiencyMean': 0.82,
      'pointer.smoothPursuitScore': 0.78,
      'pointer.trackingLossRatio': 0.08,
      'response.commissionErrorRate': 0.05,
      'response.omissionErrorRate': 0.04,
      'interference.conflictCostMs': 170,
      'interference.errorRate': 0.11,
      'game.visualSearchEfficiency': 0.74,
      'correlation.meanReactionPostureDelta': -0.03,
      'edge.taskPerformanceScore': 78,
      'edge.motorControlScore': 74,
    },
    qualityFlags: [],
  };
}

export function buildSyntheticUnifiedAssessmentExperience({ runId = 'synthetic-assessment-smoke' } = {}) {
  const batterySession = completeBattery(runId);
  const gameSummary = syntheticGameSummary();
  const gameCorrelation = syntheticGameCorrelation();
  const edgeAIResult = syntheticEdgeAI();
  const featureVectorV2 = syntheticFeatureVector(runId);
  const adaptiveDifficultyTrace = [{
    type: 'adaptive_difficulty_recommendation_v1',
    previousLevel: 4,
    nextLevel: 5,
    direction: 'up',
    reasonCodes: ['high_accuracy', 'stable_motor_control'],
    snapshot: { accuracy: 0.84, meanReactionTimeMs: 402 },
    trace: { timestamp: 1880, metricsUsed: ['accuracy', 'motorControl'] },
  }];

  const assessmentSession = buildUnifiedAssessmentSession({
    batterySession,
    generatedAt: '2026-06-19T02:00:00.000Z',
    consent: { camera: true, aggregateExport: true, humanReviewOnly: true },
    telemetry: { sampleCount: 180, facePresenceRatio: 0.92, meanConfidence: 0.86, fpsEstimate: 15 },
    gameSummary,
    gameCorrelation,
    edgeAIResult,
    featureVectorV2,
    adaptiveDifficultyTrace,
  });

  const talentProfile = buildTalentProfile({ assessmentSession });
  const finalPayload = buildFinalAssessmentPayload({
    assessmentSession,
    talentProfile,
    participant: { aliasHash: 'synthetic-participant', declaredRoleTarget: 'piloto' },
    generatedAt: '2026-06-19T02:05:00.000Z',
  });

  const markdown = generateTalentReport({ payload: finalPayload, format: 'markdown' });
  const html = generateTalentReport({ payload: finalPayload, format: 'html' });
  const json = generateTalentReport({ payload: finalPayload, format: 'json' });
  const deliveryBundle = buildLocalReportBundle({
    payload: finalPayload,
    reports: [markdown, html, json],
    generatedAt: '2026-06-19T02:06:00.000Z',
  });

  return {
    batterySession,
    assessmentSession,
    talentProfile,
    finalPayload,
    reports: { markdown, html, json },
    deliveryBundle,
  };
}

export function createManualUnifiedAssessmentSmokeChecklist() {
  return {
    schemaVersion: 'krumm_manual_smoke_checklist_v1',
    purpose: 'Validar en navegador real la experiencia unificada con cámara activa y permisos de usuario.',
    blockers: [
      'No se puede validar cámara real desde WSL/headless sin navegador con permisos de cámara.',
      'La detección MoveNet requiere que el participante encuadre hombros/codos/muñecas cuando aplique.',
    ],
    steps: [
      { id: 'install_deps', label: 'Instalar dependencias', command: 'npm install --include=dev', requiresHumanBrowser: false },
      { id: 'build_preflight', label: 'Compilar producción', command: 'npm run build', requiresHumanBrowser: false },
      { id: 'start_dev_server', label: 'Iniciar servidor local', command: 'npm run dev', requiresHumanBrowser: false },
      { id: 'open_browser', label: 'Abrir http://localhost:5173 en navegador real', requiresHumanBrowser: true },
      { id: 'start_camera', label: 'Iniciar cámara y conceder permisos', requiresHumanBrowser: true },
      { id: 'calibrate_signals', label: 'Calibrar mirada centro y postura erguida; verificar MoveNet si hay hombros visibles', requiresHumanBrowser: true },
      { id: 'run_unified_battery', label: 'Ejecutar evaluación gamificada unificada desde consentimiento hasta recovery', requiresHumanBrowser: true },
      { id: 'verify_live_metrics', label: 'Verificar actualización de AUs/FACS, gaze, postura, MoveNet, gameSummary y gameCorrelation', requiresHumanBrowser: true },
      { id: 'generate_final_report', label: 'Generar payload final y reporte humano Markdown/HTML/JSON', requiresHumanBrowser: true },
      { id: 'export_artifacts', label: 'Descargar bundle local y export investigación JSONL/CSV si aplica', requiresHumanBrowser: true },
      { id: 'privacy_review', label: 'Confirmar ausencia de video, frames, landmarks crudos, pointer paths y raw game events', requiresHumanBrowser: true },
    ],
  };
}
