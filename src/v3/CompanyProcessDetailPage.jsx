// t_84f00355 (V3 fase v3): detalle de proceso (/empresa/proceso/:id).
// Referencia: process-detail.html/css/js (3 perfiles: supervisor/operator/
// technician — datos literales de la ref). Secciones: header (estado + días +
// acciones Edit/⋯), 4 métricas, Process configuration, Process statistics
// (+ Advanced statistics colapsable, solo demo), Recommended candidates
// (tabla → link al reporte embebido) y Process actions.
// D2: el KRUMM score de la tabla = overall del motor H4.3 (ligero, cacheado) —
// una sola fuente con el reporte (no el literal de la ref). D4: acciones =
// diálogo preview (estado local, sin cambios de datos — como la ref). D6:
// modo real = grupo por rol de /sessions (sin distribution/advanced/tiempo:
// no existen en el contract; días = "—"). D7: id desconocido → estado honesto.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { useV3Copy } from './v3Copy.js';
import V3Dialog from './V3Dialog.jsx';
import {
  buildDraftProcessDetail,
  buildRealProcessDetail,
  fitForScore,
  getDemoCandidateOverall,
  getDemoProcessDetail,
  REAL_SESSION_STATUS,
  sessionsForProcess,
} from './companyProcessDetail.js';

function IconClock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="8" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 20V4m0 16h16M8 16v-4m5 4V8m5 8V5" />
    </svg>
  );
}

function IconPencil() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m15 5 4 4M4 20l5-1L20 8a2.8 2.8 0 0 0-4-4L5 15Z" />
    </svg>
  );
}

function localized(entry, language) {
  if (!entry) return '';
  if (language === 'en') return entry.en ?? entry.es ?? '';
  return entry.es ?? entry.en ?? '';
}

const FIT_COPY_KEYS = Object.freeze({
  excellent: 'pd_excellent',
  veryGood: 'pd_veryGood',
  good: 'pd_good',
  fair: 'pd_fair',
});

export default function CompanyProcessDetailPage({ data, processId } = {}) {
  const { language, t } = useLanguage();
  const copy = useV3Copy();
  const source = data?.source ?? 'demo';
  const checking = source === 'checking';
  const isReal = source === 'real';
  const [dialog, setDialog] = useState(null); // { title } — preview (D4)
  const [moreOpen, setMoreOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const moreMenuRef = useRef(null);
  const moreButtonRef = useRef(null);

  const detail = useMemo(() => {
    if (checking) return null;
    if (isReal) {
      const process = (Array.isArray(data?.processes) ? data.processes : [])
        .find((entry) => entry.id === processId) ?? null;
      if (!process) return { kind: 'notFound' };
      return buildRealProcessDetail(process, sessionsForProcess(data?.sessions ?? [], processId));
    }
    const profile = getDemoProcessDetail(processId);
    if (profile) return profile;
    // V4 (t_9319e84d, D4): proceso creado por el flujo de diseño (draft,
    // source:'design' en data.processes, solo modo demo) → detalle coherente
    // (stats ceros, sin distribución/avanzadas/candidatos, config del form).
    const draft = (Array.isArray(data?.processes) ? data.processes : [])
      .find((entry) => entry.id === processId && entry.source === 'design') ?? null;
    return draft ? buildDraftProcessDetail(draft) : { kind: 'notFound' };
  }, [checking, isReal, data, processId]);

  // Menú ⋯ (ref process-detail.js): click fuera cierra; Escape cierra y
  // devuelve el focus al trigger.
  useEffect(() => {
    if (!moreOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMoreOpen(false);
        moreButtonRef.current?.focus();
      }
    };
    const onMouseDown = (event) => {
      if (moreMenuRef.current?.contains(event.target)) return;
      setMoreOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [moreOpen]);

  const openActionDialog = (title) => setDialog({ title });

  if (checking) {
    return (
      <div className="v3-co-loading" data-testid="v3-detail-loading">{copy.company_loading}</div>
    );
  }

  if (!detail || detail.kind === 'notFound') {
    return (
      <div className="v3-pd">
        <a className="v3-back" href="/empresa/procesos">{copy.pl_back}</a>
        <section className="v3-co-panel v3-pd-notfound" aria-label={copy.pd_notFound}>
          <h1>{copy.pages.processDetail.title}</h1>
          <p><strong>{copy.pd_notFound}</strong></p>
          <p>{copy.pd_notFoundText}</p>
        </section>
        <div className="v3-co-footer">
          <span>{copy.common_footerYear}</span>
          <span>{copy.common_tagline}</span>
        </div>
      </div>
    );
  }

  const roleLabel = localized(detail.role, language);
  const departmentLabel = detail.department ? (copy[`pd_${detail.department}`] ?? detail.department) : '';
  const distributionMax = detail.stats?.distribution
    ? Math.max(...detail.stats.distribution.map((entry) => entry.count), 1)
    : 1;
  // avanzadas solo existe en demo (D5) — real: null.
  const ageMax = detail.advanced
    ? Math.max(...detail.advanced.age.bars.map((entry) => entry.count), 1)
    : 1;
  const expMax = detail.advanced
    ? Math.max(...detail.advanced.experience.bars.map((entry) => entry.count), 1)
    : 1;

  const candidateRows = detail.candidates.map((candidate, index) => {
    const overall = isReal
      ? candidate.overall
      : getDemoCandidateOverall(detail.id, candidate.id);
    const fit = fitForScore(overall);
    return {
      candidate,
      index,
      overall,
      fit,
      fitLabel: fit ? copy[FIT_COPY_KEYS[fit]] : '—',
      identity: isReal ? candidate.alias : candidate.name,
      statusLabel: isReal
        ? (() => {
          const status = REAL_SESSION_STATUS[candidate.status];
          return status ? localized(status, language) : '—';
        })()
        : copy.pd_evaluatedStatus,
    };
  });

  return (
    <div className="v3-pd">
      <a className="v3-back" href="/empresa/procesos">{copy.pl_back}</a>

      <div className="v3-co-page-heading v3-pd-heading">
        <div>
          <h1>{roleLabel}</h1>
          {detail.created ? (
            <p>{`${copy.pd_subtitlePrefix} ${copy.pd_createdOn}${localized(detail.created, language)}`}</p>
          ) : (
            <p>{t('Proceso de selección', 'Hiring process')}</p>
          )}
          <div className="v3-pd-status-line">
            <span className="v3-co-status">{copy.company_active}</span>
            {detail.daysActive != null
              ? <span>{`${detail.daysActive} ${copy.pd_daysActive}`}</span>
              : <span>{t('Sin fecha de inicio del proceso', 'No process start date')}</span>}
          </div>
        </div>
        <div className="v3-pd-heading-actions">
          <button type="button" className="v3-co-primary" onClick={() => openActionDialog(copy.pd_edit)}>
            <IconPencil />
            <span>{copy.pd_edit}</span>
          </button>
          <div className="v3-pd-more" ref={moreMenuRef}>
            <button
              type="button"
              ref={moreButtonRef}
              className="v3-pd-more-trigger"
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              aria-label={copy.pd_more}
              onClick={() => setMoreOpen((open) => !open)}
            >
              <span aria-hidden="true">⋯</span>
            </button>
            {moreOpen ? (
              <div className="v3-pd-more-menu" role="menu" aria-label={copy.pd_more}>
                <button type="button" role="menuitem" className="v3-co-text-button" onClick={() => { setMoreOpen(false); openActionDialog(copy.pd_edit); }}>
                  <span>{copy.pd_edit}</span>
                </button>
                <button type="button" role="menuitem" className="v3-co-text-button" onClick={() => { setMoreOpen(false); openActionDialog(copy.pd_allCandidates); }}>
                  <span>{copy.pd_allCandidates}</span>
                </button>
                <button type="button" role="menuitem" className="v3-co-text-button" onClick={() => { setMoreOpen(false); openActionDialog(copy.pd_pause); }}>
                  <span>{copy.pd_pause}</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <section className="v3-co-metrics" aria-label={copy.pd_metrics}>
        <article className="v3-co-metric">
          <div className="v3-co-metric-label"><span>{copy.pd_days}</span><IconClock /></div>
          <strong>{detail.daysActive ?? '—'}</strong>
          <p>{copy.pd_since}</p>
        </article>
        <article className="v3-co-metric">
          <div className="v3-co-metric-label"><span>{copy.company_candidates}</span><IconUsers /></div>
          <strong>{detail.stats.applicants}</strong>
          <p>{copy.pd_received}</p>
        </article>
        <article className="v3-co-metric">
          <div className="v3-co-metric-label"><span>{copy.pd_evaluated}</span><IconCheck /></div>
          <strong>{detail.stats.evaluated}</strong>
          <p>{copy.company_completedAssessments}</p>
        </article>
        <article className="v3-co-metric">
          <div className="v3-co-metric-label"><span>{copy.company_averageScore}</span><IconChart /></div>
          <strong>{detail.averageScore == null ? '—' : `${detail.averageScore}%`}</strong>
          <p>{copy.company_krummScore}</p>
        </article>
      </section>

      <section className="v3-co-panel" aria-label={copy.pd_configuration}>
        <div className="v3-co-section-heading">
          <div>
            <h2>{copy.pd_configuration}</h2>
            <p>{copy.pd_configurationSubtitle}</p>
          </div>
          <button type="button" className="v3-co-text-button" onClick={() => openActionDialog(copy.pd_editConfig)}>
            <span>{copy.pd_editConfig}</span>
          </button>
        </div>
        <dl className="v3-pd-config">
          <div><dt>{copy.pd_role}</dt><dd>{roleLabel}</dd></div>
          {detail.department ? <div><dt>{copy.pd_department}</dt><dd>{departmentLabel}</dd></div> : null}
          {detail.location ? <div><dt>{copy.pd_location}</dt><dd>{detail.location}</dd></div> : null}
          {detail.mode ? <div><dt>{copy.pd_mode}</dt><dd>{localized(detail.mode, language)}</dd></div> : null}
          {detail.profile ? (
            <div className="v3-pd-profile"><dt>{copy.pd_profile}</dt><dd>{localized(detail.profile, language)}</dd></div>
          ) : null}
          <div><dt>{copy.company_status}</dt><dd><span className="v3-co-status">{copy.company_active}</span></dd></div>
        </dl>
      </section>

      <section className="v3-co-panel" aria-label={copy.pd_statistics}>
        <div className="v3-co-section-heading">
          <div>
            <h2>{copy.pd_statistics}</h2>
            <p>{copy.pd_statisticsSubtitle}</p>
          </div>
        </div>
        <div className="v3-pd-statistics">
          <article className="v3-pd-stat">
            <h3>{copy.pd_candidateStatus}</h3>
            <div className="v3-pd-applicants">
              <strong>{detail.stats.applicants}</strong>
              <span>{copy.pd_applicants}</span>
            </div>
            <div className="v3-pd-segmented" aria-hidden="true">
              <span className="v3-pd-seg-evaluated" style={{ flexGrow: detail.stats.evaluated || 1 }} />
              <span className="v3-pd-seg-pending" style={{ flexGrow: detail.stats.pending || 1 }} />
            </div>
            <div className="v3-pd-legend">
              <span><i aria-hidden="true" /><span>{copy.pd_evaluated}</span><strong>{detail.stats.evaluated}</strong></span>
              <span><i aria-hidden="true" /><span>{copy.pd_pending}</span><strong>{detail.stats.pending}</strong></span>
            </div>
          </article>
          {detail.stats.distribution ? (
            <article className="v3-pd-stat">
              <h3>{copy.pd_distribution}</h3>
              <ul className="v3-pd-distribution">
                {detail.stats.distribution.map((entry) => (
                  <li key={entry.range}>
                    <span>{entry.range}</span>
                    <span className="v3-pd-bar-track" aria-hidden="true">
                      <i style={{ width: `${(entry.count / distributionMax) * 100}%` }} />
                    </span>
                    <strong>{entry.count}<span className="v3-pd-sr-only"> {copy.company_candidates}</span></strong>
                  </li>
                ))}
              </ul>
            </article>
          ) : null}
          {detail.stats.avgTimeMin != null ? (
            <article className="v3-pd-stat v3-pd-time">
              <span className="v3-pd-clock" aria-hidden="true"><IconClock /></span>
              <h3>{copy.pd_averageTime}</h3>
              <div className="v3-pd-time-value"><strong>{detail.stats.avgTimeMin}</strong><small>{copy.pd_minutes}</small></div>
              <p>{copy.pd_perCandidate}</p>
            </article>
          ) : null}
        </div>
      </section>

      {detail.advanced ? (
        <section className="v3-co-panel v3-pa" aria-label={copy.pa_title}>
          <button
            type="button"
            className="v3-pa-summary"
            aria-expanded={advancedOpen}
            onClick={() => setAdvancedOpen((open) => !open)}
          >
            <span>
              <span className="v3-pa-title">{copy.pa_title}</span>
              <small>{copy.pa_intro}</small>
            </span>
            <span className="v3-pa-chevron" aria-hidden="true">⌄</span>
          </button>
          {advancedOpen ? (
            <div className="v3-pa-content">
              <p className="v3-pa-note">{copy.pa_note}</p>
              <div className="v3-pa-grid">
                <article>
                  <h3>{copy.pa_age}</h3>
                  <div className="v3-pa-number"><strong>{detail.advanced.age.avg}</strong> <small>{copy.pa_years}</small></div>
                  <p>{copy.pa_ageDistribution}</p>
                  <ul className="v3-pa-bars">
                    {detail.advanced.age.bars.map((entry) => (
                      <li key={entry.label}>
                        <div>{entry.label}<strong>{entry.count}</strong></div>
                        <span aria-hidden="true"><i style={{ width: `${(entry.count / ageMax) * 100}%` }} /></span>
                      </li>
                    ))}
                  </ul>
                </article>
                <article>
                  <h3>{copy.pa_experience}</h3>
                  <div className="v3-pa-number"><strong>{detail.advanced.experience.avg}</strong> <small>{copy.pa_years}</small></div>
                  <p>{copy.pa_experienceDistribution}</p>
                  <ul className="v3-pa-bars">
                    {detail.advanced.experience.bars.map((entry) => (
                      <li key={entry.label}>
                        <div>{entry.label}<strong>{entry.count}</strong></div>
                        <span aria-hidden="true"><i style={{ width: `${(entry.count / expMax) * 100}%` }} /></span>
                      </li>
                    ))}
                  </ul>
                </article>
                <article>
                  <h3>{copy.pa_present}</h3>
                  <ul className="v3-pa-bars">
                    {detail.advanced.cognitivePresent.map((entry) => (
                      <li key={entry.key}>
                        <div><span>{copy[`pa_${entry.key}`]}</span><strong>{entry.value}%</strong></div>
                        <span aria-hidden="true"><i style={{ width: `${entry.value}%` }} /></span>
                      </li>
                    ))}
                  </ul>
                </article>
                <article className="v3-pa-scarce">
                  <h3>{copy.pa_scarce}</h3>
                  <ul className="v3-pa-bars">
                    {detail.advanced.cognitiveScarce.map((entry) => (
                      <li key={entry.key}>
                        <div><span>{copy[`pa_${entry.key}`]}</span><strong>{entry.value}%</strong></div>
                        <span aria-hidden="true"><i style={{ width: `${entry.value}%` }} /></span>
                      </li>
                    ))}
                  </ul>
                </article>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="v3-co-panel" aria-label={copy.pd_recommended}>
        <div className="v3-co-section-heading">
          <div>
            <h2>{copy.pd_recommended}</h2>
            <p>{copy.pd_rankingSubtitle}</p>
          </div>
        </div>
        <div className="v3-pd-table-scroll" tabIndex={0}>
          <table className="v3-pd-table">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">{copy.company_candidate}</th>
                <th scope="col">{copy.company_krummScore}</th>
                <th scope="col">{copy.pd_fit}</th>
                <th scope="col">{copy.company_status}</th>
                <th scope="col">{copy.company_action}</th>
              </tr>
            </thead>
            <tbody>
              {candidateRows.length === 0 ? (
                <tr data-testid="v4-pd-no-candidates">
                  <td colSpan={6}><span className="v4-pd-empty-cell">{copy.pd_noCandidatesYet}</span></td>
                </tr>
              ) : candidateRows.map(({ candidate, index, overall, fit, fitLabel, identity, statusLabel }) => (
                <tr key={candidate.id} className={index < 3 ? 'v3-pd-top-candidate' : undefined}>
                  <td><span className="v3-pd-rank">{index + 1}</span></td>
                  <th scope="row">
                    <div className="v3-pd-person">
                      <span className="v3-co-avatar" aria-hidden="true">{candidate.initials}</span>
                      <strong>{identity}</strong>
                    </div>
                  </th>
                  <td>
                    <span className="v3-pd-score">{overall == null ? '—' : `${overall}%`}</span>
                    {overall != null ? (
                      <span className="v3-pd-score-track" aria-hidden="true"><i style={{ width: `${overall}%` }} /></span>
                    ) : null}
                  </td>
                  <td>
                    <span className={`v3-pd-fit${fit === 'excellent' ? ' v3-pd-fit-excellent' : ''}`}>{fitLabel}</span>
                  </td>
                  <td><span className="v3-co-status">{statusLabel}</span></td>
                  <td>
                    <a
                      className="v3-co-text-button"
                      href={`/empresa/proceso/${detail.id}/candidatos/${candidate.id}`}
                    >
                      <span>{copy.company_viewReport}</span> <span aria-hidden="true">↗</span>
                      <span className="v3-pd-sr-only"> — {identity}</span>
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="v3-pd-actions" aria-label={copy.pd_actions}>
        <h2>{copy.pd_actions}</h2>
        <div>
          <button type="button" className="v3-co-text-button" onClick={() => openActionDialog(copy.pd_edit)}>
            <span>{copy.pd_edit}</span>
          </button>
          <button type="button" className="v3-co-text-button" onClick={() => openActionDialog(copy.pd_allCandidates)}>
            <span>{copy.pd_allCandidates}</span>
          </button>
          <button type="button" className="v3-co-text-button" onClick={() => openActionDialog(copy.pd_pause)}>
            <span>{copy.pd_pause}</span>
          </button>
        </div>
      </section>

      <div className="v3-co-footer">
        <span>{copy.common_footerYear}</span>
        <span>{copy.common_tagline}</span>
      </div>

      <V3Dialog
        open={Boolean(dialog)}
        title={dialog?.title ?? ''}
        text={copy.pd_mockAction}
        onClose={() => setDialog(null)}
        closeLabel={copy.common_close}
        labelId="v3-pd-dialog-title"
        descId="v3-pd-dialog-desc"
      />
    </div>
  );
}
