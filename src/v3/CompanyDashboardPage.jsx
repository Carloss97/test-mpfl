// t_90a5157c (V2 fase v3): dashboard empresa (/empresa) — referencia
// company.html: page heading (eyebrow ANDES + h1 + overview + CTA New request),
// 4 KPIs, panel "Active processes" con tabla de procesos activos y footer.
// Los KPIs se DERIVAN de la misma lista de procesos que se muestra (plan V2 D1:
// "KPIs coherentes con la lista") vía buildCompanyKpis — una sola fuente.
//
// API: ({ data }) — data = { source: 'demo'|'checking'|'real', processes }
// provisto por CompanyWorkspace (useCompanyData, plan V2 D4); inyectable en
// tests. `data` sin source válido (tests aislados) → modo demo.
import React from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { useV3Copy } from './v3Copy.js';
import { buildCompanyKpis, localizeProcessRole } from './companyData.js';

function IconFolder() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7V5h7l2 3h9v12H3Z" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5" />
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

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m8 12 3 3 5-6" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function Metric({ label, value, detail, icon }) {
  return (
    <article className="v3-co-metric">
      <div className="v3-co-metric-label"><span>{label}</span>{icon}</div>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

export default function CompanyDashboardPage({ data } = {}) {
  const { language } = useLanguage();
  const copy = useV3Copy();
  const source = data?.source ?? 'demo';
  const processes = Array.isArray(data?.processes) ? data.processes : [];
  const checking = source === 'checking';
  const kpis = buildCompanyKpis(processes);

  return (
    <div className="v3-co-dashboard">
      <div className="v3-co-page-heading">
        <div>
          <div className="v3-co-eyebrow">{copy.company_eyebrow}</div>
          <h1>{copy.company_dashboard}</h1>
          <p>{copy.company_overview}</p>
        </div>
        <a className="v3-co-primary" href="/empresa/nueva-solicitud">
          <IconPlus />
          <span>{copy.company_newRequest}</span>
        </a>
      </div>

      <section className="v3-co-metrics" aria-label={copy.company_overview}>
        <Metric
          label={copy.company_activeProcesses}
          value={checking ? '—' : kpis.activeProcesses}
          detail={copy.company_openSearches}
          icon={<IconFolder />}
        />
        <Metric
          label={copy.company_evaluated}
          value={checking ? '—' : kpis.evaluated}
          detail={copy.company_completedAssessments}
          icon={<IconUsers />}
        />
        <Metric
          label={copy.company_averageScore}
          value={checking ? '—' : (kpis.averageScore == null ? '—' : `${kpis.averageScore}%`)}
          detail={copy.company_krummScore}
          icon={<IconChart />}
        />
        <Metric
          label={copy.company_recommended}
          value={checking ? '—' : kpis.recommended}
          detail={copy.company_readyReview}
          icon={<IconCheck />}
        />
      </section>

      <section className="v3-co-panel" aria-labelledby="v2-dash-active-heading">
        <div className="v3-co-section-heading">
          <div>
            <h2 id="v2-dash-active-heading">{copy.company_activeProcesses}</h2>
            <p>{copy.company_processSubtitle}</p>
          </div>
          <a className="v3-co-text-button" href="/empresa/procesos">
            <span>{copy.company_viewAll}</span>
            <span aria-hidden="true">↗</span>
          </a>
        </div>
        <table className="v3-co-table v3-co-process-table">
          <thead>
            <tr>
              <th scope="col">{copy.company_position}</th>
              <th scope="col">{copy.company_candidates}</th>
              <th scope="col">{copy.company_averageScore}</th>
              <th scope="col">{copy.company_status}</th>
              <th scope="col">{copy.company_action}</th>
            </tr>
          </thead>
          <tbody>
            {checking ? (
              <tr>
                <td colSpan={5} className="v3-co-loading" data-testid="v2-dash-loading">{copy.company_loading}</td>
              </tr>
            ) : processes.map((process) => {
              const roleLabel = process.role
                ? localizeProcessRole(process, language)
                : copy.company_unspecifiedRole;
              return (
                <tr key={process.id}>
                  <td className="v3-co-role"><IconFolder /> <span>{roleLabel}</span></td>
                  <td>
                    <span className="v3-co-mobile-label">{copy.company_candidates}</span>
                    {process.candidates ?? 0}
                  </td>
                  <td>
                    <span className="v3-co-mobile-label">{copy.company_averageScore}</span>
                    <span className="v3-co-inline-score">
                      {process.averageScore == null ? '—' : `${process.averageScore}%`}
                      {process.averageScore == null ? null : (
                        <span className="v3-co-mini-track" aria-hidden="true">
                          <i style={{ width: `${process.averageScore}%` }} />
                        </span>
                      )}
                    </span>
                  </td>
                  <td><span className="v3-co-status">{copy.company_active}</span></td>
                  <td>
                    <a className="v3-co-text-button" href={`/empresa/proceso/${process.id}`}>
                      <span>{copy.company_viewProcess}</span>
                      <span aria-hidden="true">↗</span>
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <div className="v3-co-footer">
        <span>{copy.common_footerYear}</span>
        <span>{copy.common_tagline}</span>
      </div>
    </div>
  );
}
