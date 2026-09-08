// t_84f00355 (V3 fase v3): reporte de candidato embebido
// (/empresa/proceso/:id/candidatos/:sessionId) — MISMO motor H4.3, nuevo shell
// (plan D3): el artifacts demo se construye con el builder del flujo
// (buildPostulationDemoArtifacts, batería original_games) y se renderiza con
// las funciones puras de PostulationReportSummary.js (resumen ejecutivo, mapa
// de evidencia 8 constructos, juegos, calidad, caveats). Sin descargas
// (read-only embebido; la descarga vive en el flujo candidato).
// Modo real (D6): fila de /sessions → buildRealReportModel: 8 constructos
// (score null → insufficient), caveats traducidos (CAVEAT_LABELS), 4 juegos
// (agregados contract v1), cobertura/calidad/estado e integridad
// (validateRealSessionRowPrivacy). Identidad = alias (nunca nombre real).
// D7: sesión/proceso desconocidos → estado honesto sin expedir el par raw.
import React, { useMemo } from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { useV3Copy } from './v3Copy.js';
import {
  formatPostulationScore,
  getPostulationCaveats,
  getPostulationExecutiveSummary,
  getPostulationGameCards,
  getPostulationQualityCards,
  getWorkbookTalentFrameworkCards,
} from '../postulation-demo/PostulationReportSummary.js';
import {
  buildRealReportModel,
  fitForScore,
  findSessionRow,
  getDemoCandidateReport,
  REAL_SESSION_STATUS,
} from './companyProcessDetail.js';

const FIT_COPY_KEYS = Object.freeze({
  excellent: 'pd_excellent',
  veryGood: 'pd_veryGood',
  good: 'pd_good',
  fair: 'pd_fair',
});

function localized(entry, language) {
  if (!entry) return '';
  if (language === 'en') return entry.en ?? entry.es ?? '';
  return entry.es ?? entry.en ?? '';
}

function fitLabel(copy, fit) {
  return fit ? copy[FIT_COPY_KEYS[fit]] : '—';
}

function NotFound({ copy, processId, backLabel, notFound, notFoundText }) {
  return (
    <div className="v3-pr">
      <a className="v3-back" href={`/empresa/proceso/${processId}`}>{backLabel}</a>
      <section className="v3-co-panel v3-pr-notfound" aria-label={notFound}>
        <h1>{copy.pd_report}</h1>
        <p><strong>{notFound}</strong></p>
        <p>{notFoundText}</p>
      </section>
      <div className="v3-co-footer">
        <span>{copy.common_footerYear}</span>
        <span>{copy.common_tagline}</span>
      </div>
    </div>
  );
}

export default function CompanyProcessReportPage({ data, processId, sessionId } = {}) {
  const { language, t } = useLanguage();
  const copy = useV3Copy();
  const source = data?.source ?? 'demo';
  const checking = source === 'checking';
  const isReal = source === 'real';

  const model = useMemo(() => {
    if (checking) return null;
    if (isReal) {
      const row = findSessionRow(data?.sessions ?? [], sessionId);
      if (!row) return { notFound: true };
      const process = (Array.isArray(data?.processes) ? data.processes : [])
        .find((entry) => entry.id === processId) ?? null;
      return {
        kind: 'real',
        ...buildRealReportModel(row),
        processRole: process ? { es: process.role ?? '', en: process.roleEn ?? process.role ?? '' } : null,
      };
    }
    const report = getDemoCandidateReport(processId, sessionId);
    if (!report) return { notFound: true };
    return { kind: 'demo', ...report };
  }, [checking, isReal, data, processId, sessionId]);

  if (checking) {
    return <div className="v3-co-loading" data-testid="v3-report-loading">{copy.company_loading}</div>;
  }

  if (!model || model.notFound) {
    return (
      <NotFound
        copy={copy}
        processId={processId}
        backLabel={copy.pd_backProcess}
        notFound={copy.pd_reportNotFound}
        notFoundText={copy.pd_reportNotFoundText}
      />
    );
  }

  const identity = model.kind === 'demo' ? model.candidate.name : model.alias;
  const roleLabel = model.kind === 'demo' ? localized(model.profile.role, language) : localized(model.processRole, language);
  const overall = model.overall;
  const fit = fitForScore(overall);
  const completedDate = (model.kind === 'demo' ? model.completedAt : model.completedAt) ?? null;

  // ── Demo: motor H4.3 (funciones puras del flujo sobre el artifacts) ───────
  const executiveSummary = model.kind === 'demo'
    ? getPostulationExecutiveSummary(t, model.artifacts, model.completedDemo)
    : null;
  const workbook = model.kind === 'demo'
    ? getWorkbookTalentFrameworkCards(t, model.artifacts)
    : getWorkbookTalentFrameworkCards(t, {
      talentFramework: {
        constructOrder: model.constructOrder,
        constructs: Object.fromEntries(model.constructs.map((construct) => [construct.id, construct])),
      },
    });
  const gameCards = model.kind === 'demo'
    ? getPostulationGameCards(t, model.artifacts, model.completedDemo)
    : model.games.map((game) => ({
      id: game.id,
      label: t(game.label, game.labelEn ?? game.label),
      metric: game.metric,
      value: game.value,
    }));
  const qualityCards = model.kind === 'demo' ? getPostulationQualityCards(t, model.artifacts) : [];
  const caveats = model.kind === 'demo'
    ? getPostulationCaveats(t, model.artifacts)
    : model.caveats.map((caveat) => localized(caveat, language));
  const fixture = model.kind === 'demo' ? model.artifacts.fixture : null;
  const completedCount = model.kind === 'demo'
    ? (model.completedDemo?.completedCount ?? 0)
    : model.coverage?.completed ?? 0;
  const totalCount = model.kind === 'demo'
    ? (model.completedDemo?.totalCount ?? 0)
    : model.coverage?.total ?? 0;

  return (
    <div className="v3-pr">
      <a className="v3-back" href={`/empresa/proceso/${processId}`}>{copy.pd_backProcess}</a>

      <section className="v3-co-panel v3-pr-hero" aria-label={copy.pd_report}>
        <div>
          <span className="v3-pr-eyebrow">{copy.company_eyebrow}</span>
          <h1>{copy.pd_report}</h1>
          <p className="v3-pr-sub">
            <strong>{identity}</strong>
            {roleLabel ? (<><span aria-hidden="true"> · </span><span>{roleLabel}</span></>) : null}
            {completedDate ? (<><span aria-hidden="true"> · </span><time dateTime={completedDate}>{completedDate.slice(0, 10)}</time></>) : null}
          </p>
          <div className="v3-pd-status-line">
            <span className="v3-co-status">
              {model.kind === 'demo'
                ? copy.pd_evaluatedStatus
                : (() => {
                  const status = REAL_SESSION_STATUS[model.status];
                  return status ? localized(status, language) : '—';
                })()}
            </span>
            <span>
              <span>{copy.company_krummScore}</span>
              {' '}<strong>{overall == null ? '—' : `${overall}%`}</strong>
              {' · '}<span>{fitLabel(copy, fit)}</span>
            </span>
          </div>
        </div>
      </section>

      {fixture?.synthetic ? (
        <div className="v3-pr-banner" role="note">
          <strong>{t(fixture.label, fixture.labelEn ?? fixture.label)}</strong>
          <span>{t(fixture.description, fixture.descriptionEn ?? fixture.description)}</span>
        </div>
      ) : null}

      {model.kind === 'demo' && model.artifacts.batteryMode === 'original_games' ? (
        <div className="v3-pr-banner" role="note">
          <strong>{t('Batería original en validación interna', 'Original battery under internal validation')}</strong>
          <span>{t('Las métricas agregadas por juego están preservadas; su mapeo específico a dimensiones de talento continúa bajo validación y revisión humana.', 'Per-game aggregated metrics are preserved; their specific mapping to talent dimensions remains under validation and human review.')}</span>
        </div>
      ) : null}

      {executiveSummary ? (
        <section className="v3-pr-section" aria-label={t('Resumen ejecutivo HR', 'HR executive summary')}>
          <div className="v3-co-section-heading">
            <div>
              <span className="v3-pr-eyebrow">{t('Resumen ejecutivo HR', 'HR executive summary')}</span>
              <h2>{executiveSummary.headline}</h2>
            </div>
            <strong className="v3-pr-status">{executiveSummary.statusLabel}</strong>
          </div>
          <div className="v3-pr-cards">
            {executiveSummary.cards.map((card) => (
              <article className="v3-pr-card" key={`${card.label}-${card.title}`}>
                <span>{card.label}</span>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="v3-pr-section" aria-label={t('Resumen para revisión', 'Review summary')}>
          <div className="v3-co-section-heading">
            <div>
              <span className="v3-pr-eyebrow">{t('Resumen para revisión', 'Review summary')}</span>
              <h2>{t('Lectura humana, no decisión automática', 'Human reading, not automated decision')}</h2>
            </div>
            <strong className="v3-pr-status">{model.integrity?.ok
              ? t('Verificada', 'Verified')
              : t('Bloqueada', 'Blocked')}</strong>
          </div>
          <div className="v3-pr-cards">
            <article className="v3-pr-card">
              <span>{t('Cobertura', 'Coverage')}</span>
              <h3><span>{`${completedCount}/${totalCount}`}</span> {t('juegos', 'games')}</h3>
              <p>{t('Bloques agregados completados en la sesión.', 'Aggregate blocks completed in the session.')}</p>
            </article>
            <article className="v3-pr-card">
              <span>{t('Calidad de sesión', 'Session quality')}</span>
              <h3>{model.sessionQuality == null ? '—' : `${Math.round(model.sessionQuality * 100)}%`}</h3>
              <p>{t('Agregado de calidad de captura; contexto, no inferencia.', 'Capture quality aggregate; context, not inference.')}</p>
            </article>
            <article className="v3-pr-card">
              <span>{t('Cómo usarlo', 'How to use it')}</span>
              <h3>{t('Guía de entrevista', 'Interview guide')}</h3>
              <p>{t('Contrastar con entrevista, CV y evidencia laboral. No ranking automático ni decisión de selección.', 'Contrast with interview, CV, and work evidence. No automatic ranking or selection decision.')}</p>
            </article>
            <article className="v3-pr-card">
              <span>{t('Siguiente paso', 'Next step')}</span>
              <h3>{t('Revisión humana documentada', 'Documented human review')}</h3>
              <p>{t('Revisar consistencia con entrevista y criterios del rol antes de cualquier decisión humana.', 'Review consistency with interview and role criteria before any human decision.')}</p>
            </article>
          </div>
        </section>
      )}

      <section className="v3-pr-review" aria-label={t('Resumen para revisión', 'Review summary')}>
        <h2>{t('Lectura humana, no decisión automática', 'Human reading, not automated decision')}</h2>
        <p>{t('Este informe prioriza señales agregadas de los juegos y calidad de captura para orientar una conversación de revisión humana.', 'This report prioritizes aggregated game signals and capture quality to guide a human-review conversation.')}</p>
        <ul>
          <li>{t('{completed} de {total} juegos completados.', '{completed} of {total} games completed.', { completed: completedCount, total: totalCount })}</li>
          <li>{(model.kind === 'demo' && model.artifacts.validation?.ok)
            ? t('Artefactos locales verificados sin datos reconstructivos.', 'Verified local artifacts with no reconstructive data.')
            : model.kind === 'real' && model.integrity?.ok
              ? t('Fila de sesión verificada sin datos reconstructivos.', 'Session row verified with no reconstructive data.')
              : t('Validación pendiente.', 'Validation pending.')}</li>
          <li>{caveats.length
            ? t('{count} observaciones de alcance antes de interpretar.', '{count} scope observations before interpreting.', { count: caveats.length })
            : t('Sin observaciones críticas visibles.', 'No visible critical observations.')}</li>
        </ul>
      </section>

      <section className="v3-pr-section" aria-label={t('Mapa de evidencia KRUMM', 'KRUMM evidence map')}>
        <div className="v3-co-section-heading">
          <div>
            <h2>{t('Mapa de evidencia KRUMM', 'KRUMM evidence map')}</h2>
            <p>{t('Cobertura de tareas: los nueve constructos tienen señal de juego (score provisional o lectura descriptiva) con confianza por constructo.', 'Task coverage: the nine constructs have game signal (provisional score or descriptive reading) with per-construct confidence.')}</p>
          </div>
        </div>
        <p className="v3-pr-warning" role="note">{t('Scores provisionales no validados, sin baremos y no aptos para comparar personas.', 'Unvalidated provisional scores, no norms, and not suitable for comparing people.')}</p>
        <div className="v3-pr-construct-grid">
          {workbook.map((construct) => (
            <article
              key={construct.id}
              className={`v3-pr-construct${construct.availability === 'provisional_score' ? ' v3-pr-construct--provisional' : ''}`}
            >
              <div className="v3-pr-construct-head">
                <h3>{construct.label}</h3>
                {construct.availability === 'provisional_score' ? (
                  <span className="v3-pr-provisional-tag">{t('Score provisional', 'Provisional score')}</span>
                ) : null}
              </div>
              <div className="v3-pr-construct-score" aria-label={`${construct.scoreLabel} ${t('de', 'of')} 100`}>
                <strong>{construct.scoreLabel}</strong>
                {construct.availability === 'provisional_score' ? (
                  <small>{t('Sin baremos · no comparable', 'No norms · not comparable')}</small>
                ) : null}
              </div>
              <p><strong>{construct.availabilityLabel}</strong> · {t('Confianza', 'Confidence')} {construct.confidence}. {construct.narrative}</p>
              <details className="v3-pr-explainer">
                <summary>{t('Ver alcance y validación', 'See scope and validation')}</summary>
                <div>
                  <p><strong>{t('Por qué aparece así:', 'Why it appears this way:')}</strong> {construct.demoExplanation.reason}</p>
                  <p><strong>{t('Cómo volverlo medible:', 'How to make it measurable:')}</strong> {construct.demoExplanation.nextStep}</p>
                </div>
              </details>
            </article>
          ))}
        </div>
      </section>

      <section className="v3-pr-section" aria-label={t('Resultados por juego', 'Results by game')}>
        <div className="v3-co-section-heading">
          <div>
            <h2>{t('Resultados por juego', 'Results by game')}</h2>
            <p>{t('Resumen de desempeño gamificado agregado; no contiene trayectorias crudas ni eventos crudos.', 'Aggregated gamified performance summary; contains no raw trajectories or raw events.')}</p>
          </div>
        </div>
        <div className="v3-pr-game-grid">
          {gameCards.map((game) => (
            <article className="v3-pr-game" key={game.id}>
              {model.kind === 'demo' ? (
                <span className="v3-pr-game-status">{game.status === 'not_completed' ? t('Pendiente', 'Pending') : t('Completado', 'Completed')}</span>
              ) : null}
              <h3>{game.label}</h3>
              {model.kind === 'demo' ? (
                <dl>
                  {(game.metrics ?? []).map((metric) => (
                    <div key={`${game.id}-${metric.label}`}><dt>{metric.label}</dt><dd>{metric.value}</dd></div>
                  ))}
                </dl>
              ) : (
                <dl>
                  {game.metric ? <div><dt>{t('Métrica', 'Metric')}</dt><dd>{game.metric}</dd></div> : null}
                  <div>
                    <dt>{t('Índice de juego', 'Game index')}</dt>
                    <dd>{game.value == null ? t('Resultado pendiente', 'Result pending') : formatPostulationScore(t, game.value)}</dd>
                  </div>
                </dl>
              )}
            </article>
          ))}
        </div>
      </section>

      {qualityCards.length > 0 ? (
        <div className="v3-pr-quality-grid" aria-label={t('Calidad de sesión e integridad técnica', 'Session quality and technical integrity')}>
          {qualityCards.map((card) => (
            <div key={card.label} className={`v3-pr-quality-card v3-pr-quality-card--${card.tone}`}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
            </div>
          ))}
        </div>
      ) : null}

      <section className="v3-pr-section v3-pr-governance" aria-label={t('Gobernanza y observaciones', 'Governance and observations')}>
        <div>
          <h2>{t('Gobernanza y observaciones', 'Governance and observations')}</h2>
          <p>{t('Uso exclusivo como soporte para revisión humana. Sin decisión automatizada, sin diagnóstico y sin inferir rasgos internos.', 'Exclusively as support for human review. No automated decision, no diagnosis, and no inference of internal traits.')}</p>
        </div>
        <div className="v3-pr-caveat-list">
          {caveats.length
            ? caveats.slice(0, 8).map((caveat) => <span key={caveat}>{caveat}</span>)
            : <span>{t('Sin observaciones críticas en esta sesión', 'No critical observations in this session')}</span>}
        </div>
        <p className="v3-pr-privacy">{t('No contiene video, frames, puntos reconstructivos faciales/corporales ni rutas crudas de puntero.', 'Contains no video, frames, facial/body reconstructive points, or raw pointer paths.')}</p>
      </section>

      <div className="v3-co-footer">
        <span>{copy.common_footerYear}</span>
        <span>{copy.common_tagline}</span>
      </div>
    </div>
  );
}
