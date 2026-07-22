import React, { useMemo } from 'react';
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

function GameCard({ game }) {
  return (
    <article className="postulation-demo__game-result-card">
      <span>{game.status === 'not_completed' ? 'Pendiente' : 'Completado'}</span>
      <h3>{game.label}</h3>
      <dl>
        {(game.metrics ?? [
          { label: 'Ensayos', value: game.trialCount },
          { label: 'Precisión', value: game.accuracy },
          { label: 'Puntaje', value: game.score },
          { label: 'Tiempo', value: game.meanRt },
        ]).map((metric) => (
          <div key={`${game.id}-${metric.label}`}><dt>{metric.label}</dt><dd>{metric.value}</dd></div>
        ))}
      </dl>
      {game.feedback && (
        <div className="postulation-demo__game-feedback" aria-label="Feedback explicativo del juego">
          <strong>{game.feedback.displayCategoryLabel}</strong>
          <p>{game.feedback.candidateHint}</p>
          <small>{game.feedback.reviewerCaveat}</small>
        </div>
      )}
    </article>
  );
}

function TalentDimensionCard({ dimension }) {
  return (
    <article className="postulation-demo__talent-card">
      <div className="postulation-demo__talent-score" aria-label={`Score ${dimension.score} de 100`}>
        {formatPostulationScore(dimension.score)}
      </div>
      <div>
        <h3>{dimension.label}</h3>
        <p>Confianza {dimension.confidence}. {dimension.interpretation}</p>
        {dimension.evidence.length > 0 && (
          <ul>
            {dimension.evidence.map((item) => <li key={item}>{item}</li>)}
          </ul>
        )}
      </div>
    </article>
  );
}

function WorkbookTalentCard({ construct }) {
  return (
    <article className="postulation-demo__talent-card">
      <div className="postulation-demo__talent-score postulation-demo__talent-score--provisional" aria-label={`Score de demo ${construct.scoreLabel} de 100, provisional`}>
        <strong>{construct.scoreLabel}</strong>
      </div>
      <div>
        <span className="postulation-demo__provisional-tag">Demo provisional</span>
        <h3>{construct.label}</h3>
        <p><strong>{construct.availabilityLabel}</strong> · Confianza {construct.confidence}. {construct.narrative}</p>
        <details className="postulation-demo__measurement-explainer">
          <summary>Ver alcance y validación</summary>
          <div>
            <p><strong>Por qué aparece así:</strong> {construct.demoExplanation.reason}</p>
            <p><strong>Cómo volverlo medible:</strong> {construct.demoExplanation.nextStep}</p>
          </div>
        </details>
      </div>
    </article>
  );
}

function ExecutiveSummary({ summary }) {
  return (
    <section className="postulation-demo__executive-summary" aria-label="Resumen ejecutivo HR">
      <div className="postulation-demo__executive-summary-head">
        <div>
          <span className="postulation-demo__eyebrow">Resumen ejecutivo HR</span>
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
  const validationOk = artifacts?.payload?.validation?.ok === true && artifacts?.validation?.ok !== false;
  const descriptors = useMemo(() => buildPostulationReportDownloadDescriptors(artifacts), [artifacts]);
  const primaryReport = getPostulationPrimaryReportDescriptor(descriptors);
  const qualityCards = useMemo(() => getPostulationQualityCards(artifacts), [artifacts]);
  const gameCards = useMemo(() => getPostulationGameCards(artifacts, completedDemo), [artifacts, completedDemo]);
  const talentDimensions = useMemo(() => getTopTalentDimensions(artifacts, 6), [artifacts]);
  const workbookFramework = useMemo(() => getWorkbookTalentFrameworkCards(artifacts), [artifacts]);
  const completeWorkbookCoverage = workbookFramework.length > 0
    && workbookFramework.every((construct) => construct.score != null && construct.availability === 'provisional_score');
  const executiveSummary = useMemo(() => getPostulationExecutiveSummary(artifacts, completedDemo), [artifacts, completedDemo]);
  const caveats = useMemo(() => getPostulationCaveats(artifacts), [artifacts]);
  const completedCount = completedDemo?.completedCount ?? artifacts?.assessmentSession?.blocks?.filter((block) => block.status === 'completed').length ?? 0;
  const totalCount = completedDemo?.totalCount ?? artifacts?.assessmentSession?.blocks?.length ?? 0;
  const isFixture = artifacts?.fixture?.synthetic === true;
  const reportFormats = (artifacts.bundle?.manifest?.reportFormats ?? [])
    .map((format) => ({ markdown: 'Markdown', html: 'HTML', json: 'JSON' })[String(format).toLowerCase()] ?? String(format))
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
        <span className="postulation-demo__eyebrow">Reporte</span>
        <h1 id="postulation-report-title">No se pudo generar el reporte</h1>
        <p className="postulation-demo__report-error">{reportError}</p>
        <button type="button" className="postulation-demo__primary" onClick={onRestart}>Volver a intentar</button>
      </section>
    );
  }

  if (!artifacts) {
    return (
      <section className="postulation-demo__report-screen" aria-labelledby="postulation-report-title">
        <span className="postulation-demo__eyebrow">Reporte</span>
        <h1 id="postulation-report-title">Reporte en preparación</h1>
        <p>KRUMM todavía no tiene artefactos finales para mostrar.</p>
        <button type="button" className="postulation-demo__primary" onClick={onRestart}>Reiniciar demo</button>
      </section>
    );
  }

  return (
    <section className="postulation-demo__report-screen" aria-labelledby="postulation-report-title">
      <div className="postulation-demo__report-hero">
        <div>
          <span className="postulation-demo__eyebrow">{isFixture ? 'Reporte de demostración' : 'Reporte de sesión'}</span>
          <h1 id="postulation-report-title">{isFixture ? 'Reporte de demostración listo para revisión humana' : 'Reporte de sesión listo para revisión humana'}</h1>
          <p>
            Completaste {completedCount} de {totalCount} juegos. KRUMM generó una lectura observacional con indicadores de demo, límites explícitos y artefactos locales verificados, sin decisión automatizada.
          </p>
        </div>
        <div className="postulation-demo__report-status-card">
          <span>{validationOk ? 'Integridad de archivos verificada · no implica validez psicométrica' : 'Integridad técnica bloqueada'}</span>
          <strong>{validationOk ? 'Reporte local listo' : 'Descargas no disponibles'}</strong>
          <p>{reportFormats || 'Formatos no disponibles'}</p>
        </div>
      </div>

      {artifacts.fixture?.synthetic && (
        <div className="postulation-demo__fixture-banner" role="note">
          <strong>{artifacts.fixture.label}</strong>
          <span>Datos locales de demostración · {artifacts.fixture.description}</span>
        </div>
      )}

      {artifacts.batteryMode === 'original_games' && (
        <div className="postulation-demo__fixture-banner" role="note">
          <strong>Batería original en validación interna</strong>
          <span>Las métricas agregadas por juego están preservadas; su mapeo específico a dimensiones de talento continúa bajo validación y revisión humana.</span>
        </div>
      )}

      <ExecutiveSummary summary={executiveSummary} />

      <section className="postulation-demo__review-summary" aria-label="Resumen para revisión">
        <div>
          <span className="postulation-demo__eyebrow">Resumen para revisión</span>
          <h2>Lectura humana, no decisión automática</h2>
          <p>
            Este informe prioriza señales agregadas de los juegos y calidad de captura para orientar una conversación de revisión humana. No contiene video, frames, puntos reconstructivos faciales/corporales ni rutas crudas de puntero.
          </p>
        </div>
        <ul>
          <li>{completedCount} de {totalCount} juegos completados.</li>
          <li>{validationOk ? 'Artefactos locales verificados sin datos reconstructivos.' : 'Validación pendiente: descargas bloqueadas.'}</li>
          <li>{caveats.length ? `${caveats.length} observaciones de alcance antes de interpretar.` : 'Sin observaciones críticas visibles.'}</li>
        </ul>
      </section>

      {isFixture ? (
        <details className="postulation-demo__demo-environment">
          <summary>Estado del entorno de demostración</summary>
          <p>No son métricas de una persona real; describen un escenario sintético para QA visual.</p>
          <div className="postulation-demo__quality-grid" aria-label="Calidad simulada e integridad técnica">
            {qualityCards.map((card) => <QualityCard key={card.label} card={card} />)}
          </div>
        </details>
      ) : (
        <div className="postulation-demo__quality-grid" aria-label="Calidad de sesión e integridad técnica">
          {qualityCards.map((card) => <QualityCard key={card.label} card={card} />)}
        </div>
      )}

      {talentDimensions.length > 0 && (
        <>
          <div className="postulation-demo__report-section-head">
            <div>
              <h2>Perfil de capacidades</h2>
              <p>Dimensiones observacionales priorizadas por score; deben leerse con la calidad de señal y contexto de tarea.</p>
            </div>
          </div>
          <div className="postulation-demo__talent-grid">
            {talentDimensions.map((dimension) => <TalentDimensionCard key={dimension.id ?? dimension.label} dimension={dimension} />)}
          </div>
        </>
      )}

      {workbookFramework.length > 0 && (
        <>
          <div className="postulation-demo__report-section-head">
            <div>
              <h2>Mapa de evidencia KRUMM</h2>
              <p>{completeWorkbookCoverage
                ? 'Cobertura de tareas en demo: los ocho constructos tienen score provisional y confianza por constructo.'
                : 'Lectura de demo: muestra qué capacidades tienen señales de juego y cuáles requieren evidencia adicional.'}</p>
            </div>
          </div>
          <div className="postulation-demo__evidence-warning" role="note">
            Scores de demo no validados, sin baremos y no aptos para comparar personas.
          </div>
          <div className="postulation-demo__talent-grid">
            {workbookFramework.map((construct) => <WorkbookTalentCard key={construct.id} construct={construct} />)}
          </div>
        </>
      )}

      <div className="postulation-demo__report-section-head">
        <div>
          <h2>Resultados por juego</h2>
          <p>Resumen de desempeño gamificado agregado; no contiene trayectorias crudas ni eventos crudos.</p>
        </div>
      </div>
      <div className="postulation-demo__game-results-grid">
        {gameCards.map((game) => <GameCard key={game.id} game={game} />)}
      </div>

      <div className="postulation-demo__governance-card">
        <div>
          <h2>Gobernanza y observaciones</h2>
          <p>Uso exclusivo como soporte para revisión humana. Sin decisión automatizada, sin diagnóstico y sin inferir rasgos internos.</p>
        </div>
        <div className="postulation-demo__caveat-list">
          {caveats.length ? caveats.slice(0, 8).map((caveat) => <span key={caveat}>{caveat}</span>) : <span>Sin observaciones críticas en esta sesión</span>}
        </div>
      </div>

      <PostulationReportTechnicalDrawer
        artifacts={artifacts}
        descriptors={descriptors}
        validationOk={validationOk}
        onDownloadFile={onDownloadFile}
        onDownloadAll={onDownloadAll}
      />

      <div className="postulation-demo__report-actions">
        <button type="button" className="postulation-demo__primary" disabled={!validationOk || !primaryReport} onClick={downloadPrimaryReport}>Descargar reporte local</button>
        <button type="button" className="postulation-demo__secondary" disabled={!validationOk || descriptors.length === 0} onClick={downloadBundle}>Descargar bundle técnico</button>
        <button type="button" className="postulation-demo__secondary" onClick={onRestart}>Repetir demo</button>
      </div>
    </section>
  );
}
