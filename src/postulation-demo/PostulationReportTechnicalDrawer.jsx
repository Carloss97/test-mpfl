import React from 'react';
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

function demoStatusLabel(status) {
  if (status === 'valid_for_internal_demo') return 'validado para demo interna';
  if (status === 'budget_tight_review') return 'válido con presupuesto ajustado';
  if (status === 'layout_review') return 'requiere revisión visual';
  if (status === 'needs_authoring_review' || status === 'needs_authoring_fix') return 'requiere ajuste de niveles';
  if (status === 'needs_calibration_review') return 'requiere revisión de calibración';
  return 'revisión pendiente';
}

function demoActionLabel(action) {
  if (action === 'keep_current_levels_for_internal_demo' || action === 'keep_current_threshold_distribution_for_internal_demo') {
    return 'mantener configuración actual para demo interna';
  }
  if (action === 'revise_unsolved_or_unfitted_levels_before_candidate_use') return 'ajustar niveles antes de piloto';
  if (action === 'review_threshold_distribution_and_instruction_copy') return 'revisar balance de riesgo e instrucciones';
  return 'revisar configuración antes de uso comparativo';
}

export default function PostulationReportTechnicalDrawer({
  artifacts = null,
  descriptors = [],
  validationOk = false,
  onDownloadFile,
  onDownloadAll,
} = {}) {
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
      <summary>Qué se procesó en segundo plano</summary>
      <div className="postulation-demo__technical-grid">
        <div>
          <h3>Inferencia local</h3>
          <p>KRUMM procesó señales agregadas en el navegador: desempeño en juegos, calidad facial, gaze, postura, MoveNet y correlación temporal por trial.</p>
          <ul>
            <li>ID de sesión: {artifacts?.runId ?? 'no disponible'}</li>
            <li>Modelo local: {artifacts?.assessmentSession?.edgeAI?.modelVersion ?? 'no disponible'}</li>
            <li>Correlación agregada: {aggregate?.completedTrialCount ?? 0} trials correlacionados</li>
            <li>Feature vector: {featureVector?.type ?? 'no disponible'}</li>
          </ul>
        </div>
        <div>
          <h3>Gobernanza</h3>
          <p>Reporte observacional para revisión humana. No hay decisión automatizada ni recomendación de selección.</p>
          <ul>
            <li>Sin video ni frames persistidos.</li>
            <li>Sin puntos faciales o corporales crudos en el reporte.</li>
            <li>Sin trayectorias crudas de puntero ni log crudo de juego.</li>
          </ul>
        </div>
        {passengerAuthoring && (
          <div>
            <h3>QA de jugabilidad</h3>
            <p>Revisión interna para presentar la batería original sin confundir dificultad de nivel con desempeño del candidato.</p>
            <ul>
              {laserAuthoring && (
                <>
                  <li>Laser: {demoStatusLabel(laserAuthoring.authoringStatus)}</li>
                  <li>Niveles Laser resolubles: {laserAuthoring.solvedLevels}/{laserAuthoring.totalLevels}</li>
                  <li>Niveles Laser multiobjetivo: {laserAuthoring.multiObjectiveLevels}</li>
                </>
              )}
              {balloonCalibration && (
                <>
                  <li>Globo: {demoStatusLabel(balloonCalibration.thresholdCalibrationStatus)}</li>
                  <li>Rondas Balloon: {balloonCalibration.highRiskRounds} alto / {balloonCalibration.mediumRiskRounds} medio / {balloonCalibration.lowRiskRounds} bajo</li>
                </>
              )}
              <li>Rutas: {demoStatusLabel(passengerAuthoring.authoringStatus)}</li>
              <li>Niveles resolubles: {passengerAuthoring.solvableLevels}/{passengerAuthoring.totalLevels}</li>
              <li>Niveles con parada obligatoria: {passengerAuthoring.minimumStationUseLevels}</li>
              {instructionCheck && (
                <>
                  <li>Claridad de instrucciones: {demoStatusLabel(instructionCheck.instructionRiskFlag === 'low' ? 'valid_for_internal_demo' : 'needs_authoring_review')}</li>
                  <li>Juegos revisados por comprensión: {instructionCheck.reviewedGames}</li>
                </>
              )}
              <li>Acción recomendada: {demoActionLabel(passengerAuthoring.recommendedLevelAction)}</li>
            </ul>
          </div>
        )}
      </div>
      <div className="postulation-demo__download-actions" aria-label="Descargas técnicas del reporte">
        <button type="button" className="postulation-demo__primary" disabled={!validationOk || !markdownDescriptor} onClick={() => downloadFile(markdownDescriptor)}>Descargar Markdown técnico</button>
        <button type="button" className="postulation-demo__secondary" disabled={!validationOk || !htmlDescriptor} onClick={() => downloadFile(htmlDescriptor)}>Descargar HTML</button>
        <button type="button" className="postulation-demo__secondary" disabled={!validationOk || !jsonDescriptor} onClick={() => downloadFile(jsonDescriptor)}>Descargar JSON</button>
        <button type="button" className="postulation-demo__secondary" disabled={!validationOk || !payloadDescriptor} onClick={() => downloadFile(payloadDescriptor)}>Descargar payload</button>
        <button type="button" className="postulation-demo__secondary" disabled={!validationOk || !manifestDescriptor} onClick={() => downloadFile(manifestDescriptor)}>Descargar manifiesto</button>
        <button type="button" className="postulation-demo__primary" disabled={!validationOk || descriptors.length === 0} onClick={downloadAll}>Descargar bundle completo</button>
      </div>
    </details>
  );
}
