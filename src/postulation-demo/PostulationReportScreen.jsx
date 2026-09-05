import React, { useMemo } from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import {
  formatPostulationScore,
  getPostulationExecutiveSummary,
  getPostulationCaveats,
  getPostulationGameCards,
  getPostulationQualityCards,
  getTopTalentDimensions,
  getWorkbookTalentFrameworkCards,
} from './PostulationReportSummary.js';
import PostulationReportTechnicalDrawer, {
  buildPostulationReportDownloadDescriptors,
  getPostulationPrimaryReportDescriptor,
} from './PostulationReportTechnicalDrawer.jsx';

function QualityCard({ card }) {
  return (
    <div className={`postulation-demo__quality-card postulation-demo__quality-card--${card.tone}`}>
      <span>{card.label}</span>
      <strong>{card.value}</strong>
    </div>
  );
}

function GameCard({ game, t }) {
  return (
    <article className="postulation-demo__game-result-card">
      <span>{game.status === 'not_completed' ? t('Pendiente', 'Pending') : t('Completado', 'Completed')}</span>
      <h3>{game.label}</h3>
      <dl>
        {(game.metrics ?? [
          { label: t('Ensayos', 'Trials'), value: game.trialCount },
          { label: t('Precisión', 'Accuracy'), value: game.accuracy },
          { label: t('Puntaje', 'Score'), value: game.score },
          { label: t('Tiempo', 'Time'), value: game.meanRt },
        ]).map((metric) => (
          <div key={`${game.id}-${metric.label}`}><dt>{metric.label}</dt><dd>{metric.value}</dd></div>
        ))}
      </dl>
      {game.feedback && (
        <div className="postulation-demo__game-feedback" aria-label={t('Feedback explicativo del juego', 'Explanatory game feedback')}>
          <strong>{game.feedback.displayCategoryLabel}</strong>
          <p>{game.feedback.candidateHint}</p>
          <small>{game.feedback.reviewerCaveat}</small>
        </div>
      )}
    </article>
  );
}

function TalentDimensionCard({ dimension, t }) {
  return (
    <article className="postulation-demo__talent-card">
      <div className="postulation-demo__talent-score" aria-label={`${t('Score', 'Score')} ${dimension.score} ${t('de', 'of')} 100`}>
        {formatPostulationScore(t, dimension.score)}
      </div>
      <div>
        <h3>{dimension.label}</h3>
        <p>{t('Confianza', 'Confidence')} {dimension.confidence}. {dimension.interpretation}</p>
        {dimension.evidence.length > 0 && (
          <ul>
            {dimension.evidence.map((item) => <li key={item}>{item}</li>)}
          </ul>
        )}
      </div>
    </article>
  );
}

function WorkbookTalentCard({ construct, t }) {
  return (
    <article className="postulation-demo__talent-card">
      <div className={`postulation-demo__talent-score postulation-demo__talent-score--provisional`} aria-label={`${t('Score de demo', 'Demo score')} ${construct.scoreLabel} ${t('de', 'of')} 100, ${t('provisional', 'provisional')}`}>
        <span className="postulation-demo__provisional-tag postulation-demo__provisional-tag--solid">{t('Demo provisional', 'Provisional demo')}</span>
        <strong>{construct.scoreLabel}</strong>
        <small className="postulation-demo__score-sub">{t('Sin baremos · no comparable', 'No norms · not comparable')}</small>
      </div>
      <div>
        <h3>{construct.label}</h3>
        <p><strong>{construct.availabilityLabel}</strong> · {t('Confianza', 'Confidence')} {construct.confidence}. {construct.narrative}</p>
        <details className="postulation-demo__measurement-explainer">
          <summary>{t('Ver alcance y validación', 'See scope and validation')}</summary>
          <div>
            <p><strong>{t('Por qué aparece así:', 'Why it appears this way:')}</strong> {construct.demoExplanation.reason}</p>
            <p><strong>{t('Cómo volverlo medible:', 'How to make it measurable:')}</strong> {construct.demoExplanation.nextStep}</p>
          </div>
        </details>
      </div>
    </article>
  );
}

function ExecutiveSummary({ summary, t }) {
  return (
    <section className="postulation-demo__executive-summary" aria-label={t('Resumen ejecutivo HR', 'HR executive summary')}>
      <div className="postulation-demo__executive-summary-head">
        <div>
          <span className="postulation-demo__eyebrow">{t('Resumen ejecutivo HR', 'HR executive summary')}</span>
          <h2>{summary.headline}</h2>
        </div>
        <strong>{summary.statusLabel}</strong>
      </div>
      <div className="postulation-demo__executive-card-grid">
        {summary.cards.map((card) => (
          <article className="postulation-demo__executive-card" key={`${card.label}-${card.title}`}>
            <span>{card.label}</span>
            <h3>{card.title}</h3>
            <p>{card.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function PostulationReportScreen({
  artifacts = null,
  completedDemo = null,
  reportError = null,
  onRestart,
  onDownloadFile,
  onDownloadAll,
} = {}) {
  const { t } = useLanguage();
  const validationOk = artifacts?.payload?.validation?.ok === true && artifacts?.validation?.ok !== false;
  const descriptors = useMemo(() => buildPostulationReportDownloadDescriptors(artifacts), [artifacts]);
  const primaryReport = getPostulationPrimaryReportDescriptor(descriptors);
  const qualityCards = useMemo(() => getPostulationQualityCards(t, artifacts), [artifacts, t]);
  const gameCards = useMemo(() => getPostulationGameCards(t, artifacts, completedDemo), [artifacts, completedDemo, t]);
  const talentDimensions = useMemo(() => getTopTalentDimensions(t, artifacts, 6), [artifacts, t]);
  const workbookFramework = useMemo(() => getWorkbookTalentFrameworkCards(t, artifacts), [artifacts, t]);
  const completeWorkbookCoverage = workbookFramework.length > 0
    && workbookFramework.every((construct) =>
      construct.availability === 'provisional_score' || construct.availability === 'descriptive_only');
  const executiveSummary = useMemo(() => getPostulationExecutiveSummary(t, artifacts, completedDemo), [artifacts, completedDemo, t]);
  const caveats = useMemo(() => getPostulationCaveats(t, artifacts), [artifacts, t]);
  const completedCount = completedDemo?.completedCount ?? artifacts?.assessmentSession?.blocks?.filter((block) => block.status === 'completed').length ?? 0;
  const totalCount = completedDemo?.totalCount ?? artifacts?.assessmentSession?.blocks?.length ?? 0;
  const isFixture = artifacts?.fixture?.synthetic === true;
  const reportFormats = (artifacts.bundle?.manifest?.reportFormats ?? [])
    .map((format) => ({ markdown: t('Markdown', 'Markdown'), html: t('HTML', 'HTML'), json: t('JSON', 'JSON') })[String(format).toLowerCase()] ?? String(format))
    .join(' · ');

  const downloadPrimaryReport = () => {
    if (!validationOk || !primaryReport) return;
    onDownloadFile?.(primaryReport);
  };

  const downloadBundle = () => {
    if (!validationOk) return;
    onDownloadAll?.(descriptors);
  };

  if (reportError) {
    return (
      <section className="postulation-demo__report-screen" aria-labelledby="postulation-report-title">
        <span className="postulation-demo__eyebrow">{t('Reporte', 'Report')}</span>
        <h1 id="postulation-report-title">{t('No se pudo generar el reporte', 'The report could not be generated')}</h1>
        <p className="postulation-demo__report-error">{reportError}</p>
        <button type="button" className="postulation-demo__primary" onClick={onRestart}>{t('Volver a intentar', 'Try again')}</button>
      </section>
    );
  }

  if (!artifacts) {
    return (
      <section className="postulation-demo__report-screen" aria-labelledby="postulation-report-title">
        <span className="postulation-demo__eyebrow">{t('Reporte', 'Report')}</span>
        <h1 id="postulation-report-title">{t('Reporte en preparación', 'Report in preparation')}</h1>
        <p>{t('KRUMM todavía no tiene artefactos finales para mostrar.', 'KRUMM does not have final artifacts to show yet.')}</p>
        <button type="button" className="postulation-demo__primary" onClick={onRestart}>{t('Reiniciar demo', 'Restart demo')}</button>
      </section>
    );
  }

  return (
    <section className="postulation-demo__report-screen" aria-labelledby="postulation-report-title">
      <div className="postulation-demo__report-hero">
        <div>
          <span className="postulation-demo__eyebrow">{isFixture ? t('Reporte de muestra', 'Sample report') : t('Reporte de sesión', 'Session report')}</span>
          <h1 id="postulation-report-title">{isFixture ? t('Reporte de muestra listo para revisión humana', 'Sample report ready for human review') : t('Reporte de sesión listo para revisión humana', 'Session report ready for human review')}</h1>
          <p>
            {t('Completaste {completed} de {total} juegos. KRUMM generó una lectura observacional con indicadores de prueba, límites explícitos y artefactos locales verificados, sin decisión automatizada.', 'You completed {completed} of {total} games. KRUMM generated an observational reading with assessment indicators, explicit limits, and verified local artifacts, with no automated decision.', { completed: completedCount, total: totalCount })}
          </p>
        </div>
        <div className="postulation-demo__report-status-card">
          <span>{validationOk ? t('Integridad de archivos verificada · no implica validez psicométrica', 'File integrity verified · does not imply psychometric validity') : t('Integridad técnica bloqueada', 'Technical integrity blocked')}</span>
          <strong>{validationOk ? t('Reporte local listo', 'Local report ready') : t('Descargas no disponibles', 'Downloads unavailable')}</strong>
          <p>{reportFormats || t('Formatos no disponibles', 'Formats unavailable')}</p>
        </div>
      </div>

      {artifacts.fixture?.synthetic && (
        <div className="postulation-demo__fixture-banner" role="note">
          <strong>{artifacts.fixture.label}</strong>
          <span>{t('Datos locales de demostración ·', 'Local demonstration data ·')} {t(artifacts.fixture.description, artifacts.fixture.descriptionEn ?? artifacts.fixture.description)}</span>
        </div>
      )}

      {artifacts.batteryMode === 'original_games' && (
        <div className="postulation-demo__fixture-banner" role="note">
          <strong>{t('Batería original en validación interna', 'Original battery under internal validation')}</strong>
          <span>{t('Las métricas agregadas por juego están preservadas; su mapeo específico a dimensiones de talento continúa bajo validación y revisión humana.', 'Per-game aggregated metrics are preserved; their specific mapping to talent dimensions remains under validation and human review.')}</span>
        </div>
      )}

      <ExecutiveSummary summary={executiveSummary} t={t} />

      <section className="postulation-demo__review-summary" aria-label={t('Resumen para revisión', 'Review summary')}>
        <div>
          <span className="postulation-demo__eyebrow">{t('Resumen para revisión', 'Review summary')}</span>
          <h2>{t('Lectura humana, no decisión automática', 'Human reading, not automated decision')}</h2>
          <p>
            {t('Este informe prioriza señales agregadas de los juegos y calidad de captura para orientar una conversación de revisión humana. No contiene video, frames, puntos reconstructivos faciales/corporales ni rutas crudas de puntero.', 'This report prioritizes aggregated game signals and capture quality to guide a human-review conversation. It contains no video, frames, facial/body reconstructive points, or raw pointer paths.')}
          </p>
        </div>
        <ul>
          <li>{t('{completed} de {total} juegos completados.', '{completed} of {total} games completed.', { completed: completedCount, total: totalCount })}</li>
          <li>{validationOk ? t('Artefactos locales verificados sin datos reconstructivos.', 'Verified local artifacts with no reconstructive data.') : t('Validación pendiente: descargas bloqueadas.', 'Validation pending: downloads blocked.')}</li>
          <li>{caveats.length ? t('{count} observaciones de alcance antes de interpretar.', '{count} scope observations before interpreting.', { count: caveats.length }) : t('Sin observaciones críticas visibles.', 'No visible critical observations.')}</li>
        </ul>
      </section>

      {isFixture ? (
        <details className="postulation-demo__demo-environment">
          <summary>{t('Estado del entorno de demostración', 'Demonstration environment status')}</summary>
          <p>{t('No son métricas de una persona real; describen un escenario sintético para QA visual.', 'These are not metrics of a real person; they describe a synthetic scenario for visual QA.')}</p>
          <div className="postulation-demo__quality-grid" aria-label={t('Calidad simulada e integridad técnica', 'Simulated quality and technical integrity')}>
            {qualityCards.map((card) => <QualityCard key={card.label} card={card} />)}
          </div>
        </details>
      ) : (
        <div className="postulation-demo__quality-grid" aria-label={t('Calidad de sesión e integridad técnica', 'Session quality and technical integrity')}>
          {qualityCards.map((card) => <QualityCard key={card.label} card={card} />)}
        </div>
      )}

      {talentDimensions.length > 0 && (
        <>
          <div className="postulation-demo__report-section-head">
            <div>
              <h2>{t('Perfil de capacidades', 'Capability profile')}</h2>
              <p>{t('Dimensiones observacionales priorizadas por score; deben leerse con la calidad de señal y contexto de tarea.', 'Observational dimensions prioritized by score; read alongside signal quality and task context.')}</p>
            </div>
          </div>
          <div className="postulation-demo__talent-grid">
            {talentDimensions.map((dimension) => <TalentDimensionCard key={dimension.id ?? dimension.label} dimension={dimension} t={t} />)}
          </div>
        </>
      )}

      {workbookFramework.length > 0 && (
        <>
          <div className="postulation-demo__report-section-head">
            <div>
              <h2>{t('Mapa de evidencia KRUMM', 'KRUMM evidence map')}</h2>
              <p>{completeWorkbookCoverage
                ? t('Cobertura de tareas en demo: los ocho constructos tienen señal de juego (score provisional o lectura descriptiva) con confianza por constructo.', 'Demo task coverage: the eight constructs have game signal (provisional score or descriptive reading) with per-construct confidence.')
                : t('Lectura de demo: muestra qué capacidades tienen señales de juego y cuáles requieren evidencia adicional.', 'Demo reading: shows which capabilities have game signals and which need additional evidence.')}</p>
            </div>
          </div>
          <div className="postulation-demo__evidence-warning" role="note">
            {t('Scores de demo no validados, sin baremos y no aptos para comparar personas.', 'Unvalidated demo scores, no norms, and not suitable for comparing people.')}
          </div>
          <div className="postulation-demo__talent-grid">
            {workbookFramework.map((construct) => <WorkbookTalentCard key={construct.id} construct={construct} t={t} />)}
          </div>
        </>
      )}

      <div className="postulation-demo__report-section-head">
        <div>
          <h2>{t('Resultados por juego', 'Results by game')}</h2>
          <p>{t('Resumen de desempeño gamificado agregado; no contiene trayectorias crudas ni eventos crudos.', 'Aggregated gamified performance summary; contains no raw trajectories or raw events.')}</p>
        </div>
      </div>
      <div className="postulation-demo__game-results-grid">
        {gameCards.map((game) => <GameCard key={game.id} game={game} t={t} />)}
      </div>

      <div className="postulation-demo__governance-card">
        <div>
          <h2>{t('Gobernanza y observaciones', 'Governance and observations')}</h2>
          <p>{t('Uso exclusivo como soporte para revisión humana. Sin decisión automatizada, sin diagnóstico y sin inferir rasgos internos.', 'Exclusively as support for human review. No automated decision, no diagnosis, and no inference of internal traits.')}</p>
        </div>
        <div className="postulation-demo__caveat-list">
          {caveats.length ? caveats.slice(0, 8).map((caveat) => <span key={caveat}>{caveat}</span>) : <span>{t('Sin observaciones críticas en esta sesión', 'No critical observations in this session')}</span>}
        </div>
      </div>

      <PostulationReportTechnicalDrawer
        artifacts={artifacts}
        descriptors={descriptors}
        validationOk={validationOk}
        onDownloadFile={onDownloadFile}
        onDownloadAll={onDownloadAll}
        t={t}
      />

      <div className="postulation-demo__report-actions">
        <button type="button" className="postulation-demo__primary" disabled={!validationOk || !primaryReport} onClick={downloadPrimaryReport}>{t('Descargar reporte local', 'Download local report')}</button>
        <button type="button" className="postulation-demo__secondary" disabled={!validationOk || descriptors.length === 0} onClick={downloadBundle}>{t('Descargar bundle técnico', 'Download technical bundle')}</button>
        <button type="button" className="postulation-demo__secondary" onClick={onRestart}>{t('Repetir demo', 'Repeat demo')}</button>
      </div>
    </section>
  );
}
