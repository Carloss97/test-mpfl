import React from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { buildFinalReportDownloadDescriptors } from '../assessment/FinalReportPanel.jsx';
import { summarizeBalloonThresholdCalibration } from '../tasks/original-games/balloonThresholdCalibrationReview.js';
import { summarizeCandidateInstructionCheck } from '../tasks/original-games/candidateInstructionCheck.js';
import { summarizeLaserPuzzleAuthoring } from '../tasks/original-games/laserPuzzleAuthoringReview.js';
import { summarizePassengerRouteAuthoring } from '../tasks/original-games/passengerRouteAuthoringReview.js';

function descriptorByExtension(descriptors = [], extension) {
  return descriptors.find((descriptor) => descriptor.fileName.toLowerCase().endsWith(extension));
}

export function buildPostulationReportDownloadDescriptors(artifacts = null) {
  if (!artifacts?.payload) return [];
  return buildFinalReportDownloadDescriptors({
    payload: artifacts.payload,
    reports: artifacts.reports ?? [],
    bundle: artifacts.bundle ?? null,
  });
}

export function getPostulationPrimaryReportDescriptor(descriptors = []) {
  return descriptorByExtension(descriptors, '.md') ?? descriptors[0] ?? null;
}

function demoStatusLabel(t, status) {
  if (status === 'valid_for_internal_demo') return t('validado para demo interna', 'validated for internal demo');
  if (status === 'budget_tight_review') return t('válido con presupuesto ajustado', 'valid with tight budget');
  if (status === 'layout_review') return t('requiere revisión visual', 'needs visual review');
  if (status === 'needs_authoring_review' || status === 'needs_authoring_fix') return t('requiere ajuste de niveles', 'needs level adjustment');
  if (status === 'needs_calibration_review') return t('requiere revisión de calibración', 'needs calibration review');
  return t('revisión pendiente', 'review pending');
}

function demoActionLabel(t, action) {
  if (action === 'keep_current_levels_for_internal_demo' || action === 'keep_current_threshold_distribution_for_internal_demo') {
    return t('mantener configuración actual para demo interna', 'keep current config for internal demo');
  }
  if (action === 'revise_unsolved_or_unfitted_levels_before_candidate_use') return t('ajustar niveles antes de piloto', 'adjust levels before pilot');
  if (action === 'review_threshold_distribution_and_instruction_copy') return t('revisar balance de riesgo e instrucciones', 'review risk balance and instructions');
  return t('revisar configuración antes de uso comparativo', 'review config before comparative use');
}

export default function PostulationReportTechnicalDrawer({
  artifacts = null,
  descriptors = [],
  validationOk = false,
  onDownloadFile,
  onDownloadAll,
  t: tProp,
} = {}) {
  const injected = useLanguage();
  const t = tProp ?? injected.t;
  const payloadDescriptor = descriptors.find((descriptor) => descriptor.fileName.endsWith('-final-payload.json'));
  const manifestDescriptor = descriptors.find((descriptor) => descriptor.fileName.endsWith('-report-manifest.json'));
  const markdownDescriptor = getPostulationPrimaryReportDescriptor(descriptors);
  const htmlDescriptor = descriptorByExtension(descriptors, '.html');
  const jsonDescriptor = descriptorByExtension(descriptors.filter((descriptor) => !descriptor.fileName.endsWith('-final-payload.json') && !descriptor.fileName.endsWith('-report-manifest.json')), '.json');
  const aggregate = artifacts?.assessmentSession?.gameCorrelation?.aggregate ?? null;
  const featureVector = artifacts?.assessmentSession?.featureVectorV2 ?? null;
  const passengerAuthoring = artifacts?.batteryMode === 'original_games'
    ? summarizePassengerRouteAuthoring()
    : null;
  const laserAuthoring = artifacts?.batteryMode === 'original_games'
    ? summarizeLaserPuzzleAuthoring()
    : null;
  const balloonCalibration = artifacts?.batteryMode === 'original_games'
    ? summarizeBalloonThresholdCalibration()
    : null;
  const instructionCheck = artifacts?.batteryMode === 'original_games'
    ? summarizeCandidateInstructionCheck(artifacts?.assessmentSession?.blocks ?? [])
    : null;

  const downloadFile = (descriptor) => {
    if (!validationOk || !descriptor) return;
    onDownloadFile?.(descriptor);
  };

  const downloadAll = () => {
    if (!validationOk) return;
    onDownloadAll?.(descriptors);
  };

  return (
    <details className="postulation-demo__technical-drawer">
      <summary>{t('Qué se procesó en segundo plano', 'What was processed in the background')}</summary>
      <div className="postulation-demo__technical-grid">
        <div>
          <h3>{t('Inferencia local', 'Local inference')}</h3>
          <p>{t('KRUMM procesó señales agregadas en el navegador: desempeño en juegos, calidad facial, gaze, postura, MoveNet y correlación temporal por trial.', 'KRUMM processed aggregated signals in the browser: game performance, facial quality, gaze, posture, MoveNet, and per-trial temporal correlation.')}</p>
          <ul>
            <li>{t('ID de sesión', 'Session ID')}: {artifacts?.runId ?? t('no disponible', 'unavailable')}</li>
            <li>{t('Modelo local', 'Local model')}: {artifacts?.assessmentSession?.edgeAI?.modelVersion ?? t('no disponible', 'unavailable')}</li>
            <li>{t('Correlación agregada', 'Aggregated correlation')}: {aggregate?.completedTrialCount ?? 0} {t('trials correlacionados', 'correlated trials')}</li>
            <li>{t('Feature vector', 'Feature vector')}: {featureVector?.type ?? t('no disponible', 'unavailable')}</li>
          </ul>
        </div>
        <div>
          <h3>{t('Gobernanza', 'Governance')}</h3>
          <p>{t('Reporte observacional para revisión humana. No hay decisión automatizada ni recomendación de selección.', 'Observational report for human review. No automated decision or selection recommendation.')}</p>
          <ul>
            <li>{t('Sin video ni frames persistidos.', 'No persisted video or frames.')}</li>
            <li>{t('Sin puntos faciales o corporales crudos en el reporte.', 'No raw facial or body points in the report.')}</li>
            <li>{t('Sin trayectorias crudas de puntero ni log crudo de juego.', 'No raw pointer trajectories or raw game log.')}</li>
          </ul>
        </div>
        {passengerAuthoring && (
          <div>
            <h3>{t('QA de jugabilidad', 'Playability QA')}</h3>
            <p>{t('Revisión interna para presentar la batería original sin confundir dificultad de nivel con desempeño del candidato.', 'Internal review to present the original battery without confusing level difficulty with candidate performance.')}</p>
            <ul>
              {laserAuthoring && (
                <>
                  <li>{t('Laser', 'Laser')}: {demoStatusLabel(t, laserAuthoring.authoringStatus)}</li>
                  <li>{t('Niveles Laser resolubles', 'Solvable Laser levels')}: {laserAuthoring.solvedLevels}/{laserAuthoring.totalLevels}</li>
                  <li>{t('Niveles Laser multiobjetivo', 'Multi-objective Laser levels')}: {laserAuthoring.multiObjectiveLevels}</li>
                  <li>{t('Niveles Laser con portales', 'Laser portal-routing levels')}: {laserAuthoring.portalRoutingLevels}</li>
                </>
              )}
              {balloonCalibration && (
                <>
                  <li>{t('Globo', 'Balloon')}: {demoStatusLabel(t, balloonCalibration.thresholdCalibrationStatus)}</li>
                  <li>{t('Rondas Balloon', 'Balloon rounds')}: {balloonCalibration.highRiskRounds} {t('alto', 'high')} / {balloonCalibration.mediumRiskRounds} {t('medio', 'medium')} / {balloonCalibration.lowRiskRounds} {t('bajo', 'low')}</li>
                </>
              )}
              <li>{t('Rutas', 'Routes')}: {demoStatusLabel(t, passengerAuthoring.authoringStatus)}</li>
              <li>{t('Niveles resolubles', 'Solvable levels')}: {passengerAuthoring.solvableLevels}/{passengerAuthoring.totalLevels}</li>
              <li>{t('Niveles con parada obligatoria', 'Levels with mandatory stop')}: {passengerAuthoring.minimumStationUseLevels}</li>
              <li>{t('Circuitos con margen energético seguro', 'Circuits with safe energy margin')}: {passengerAuthoring.fairEnergyMarginLevels}/{passengerAuthoring.totalLevels}</li>
              {instructionCheck && (
                <>
                  <li>{t('Claridad de instrucciones', 'Instruction clarity')}: {demoStatusLabel(t, instructionCheck.instructionRiskFlag === 'low' ? 'valid_for_internal_demo' : 'needs_authoring_review')}</li>
                  <li>{t('Juegos revisados por comprensión', 'Games reviewed for comprehension')}: {instructionCheck.reviewedGames}</li>
                </>
              )}
              <li>{t('Acción recomendada', 'Recommended action')}: {demoActionLabel(t, passengerAuthoring.recommendedLevelAction)}</li>
            </ul>
          </div>
        )}
      </div>
      <div className="postulation-demo__download-actions" aria-label={t('Descargas técnicas del reporte', 'Technical report downloads')}>
        <button type="button" className="postulation-demo__primary" disabled={!validationOk || !markdownDescriptor} onClick={() => downloadFile(markdownDescriptor)}>{t('Descargar Markdown técnico', 'Download technical Markdown')}</button>
        <button type="button" className="postulation-demo__secondary" disabled={!validationOk || !htmlDescriptor} onClick={() => downloadFile(htmlDescriptor)}>{t('Descargar HTML', 'Download HTML')}</button>
        <button type="button" className="postulation-demo__secondary" disabled={!validationOk || !jsonDescriptor} onClick={() => downloadFile(jsonDescriptor)}>{t('Descargar JSON', 'Download JSON')}</button>
        <button type="button" className="postulation-demo__secondary" disabled={!validationOk || !payloadDescriptor} onClick={() => downloadFile(payloadDescriptor)}>{t('Descargar payload', 'Download payload')}</button>
        <button type="button" className="postulation-demo__secondary" disabled={!validationOk || !manifestDescriptor} onClick={() => downloadFile(manifestDescriptor)}>{t('Descargar manifiesto', 'Download manifest')}</button>
        <button type="button" className="postulation-demo__primary" disabled={!validationOk || descriptors.length === 0} onClick={downloadAll}>{t('Descargar bundle completo', 'Download full bundle')}</button>
      </div>
    </details>
  );
}
