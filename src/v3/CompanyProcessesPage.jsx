// t_90a5157c (V2 fase v3): lista de procesos (/empresa/procesos) — referencia
// processes.html + processes.js: búsqueda (cargo o ubicación, NFD-insensible a
// acentos), filtros department/location (solo modo demo: /sessions no trae
// esos campos, plan V2 D3), sort (recent/oldest/candidates/score/name — name
// con locale del idioma activo, como la ref), count role=status, empty state
// y "Clear filters" (reset → sort 'recent', igual que la ref).
//
// API: ({ data }) — { source: 'demo'|'checking'|'real', processes } provisto
// por CompanyWorkspace (useCompanyData); inyectable en tests. La lista visible
// se deriva de useMemo (filter → sort) dependiente también de `language`
// (equivalente al listener data-language de la ref).
import React, { useMemo, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { useV3Copy } from './v3Copy.js';
import {
  DEMO_DEPARTMENT_IDS,
  filterProcesses,
  localizeProcessRole,
  sortProcesses,
} from './companyData.js';

function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export default function CompanyProcessesPage({ data } = {}) {
  const { language } = useLanguage();
  const copy = useV3Copy();
  const source = data?.source ?? 'demo';
  const processes = Array.isArray(data?.processes) ? data.processes : [];
  const checking = source === 'checking';
  const isReal = source === 'real';

  const [query, setQuery] = useState('');
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('');
  const [sort, setSort] = useState('recent');

  const departmentLabels = {
    operations: copy.pd_operations,
    maintenance: copy.pd_maintenance,
  };

  const locations = useMemo(
    () => [...new Set(processes.map((process) => process.location).filter(Boolean))].sort((a, b) => a.localeCompare(b, language)),
    [processes, language],
  );

  // filter → sort (la ref ordena primero y oculta después; mismo resultado).
  const visible = useMemo(
    () => sortProcesses(
      filterProcesses(processes, { query, department, location }, { language, departmentLabels }),
      sort,
      language,
    ),
    [processes, query, department, location, sort, language, departmentLabels],
  );

  const reset = () => {
    setQuery('');
    setDepartment('');
    setLocation('');
    setSort('recent');
  };

  return (
    <div className="v3-co-processes">
      <div className="v3-co-page-heading">
        <div>
          <h1>{copy.pages.processes.title}</h1>
          <p>{copy.pl_intro}</p>
        </div>
        <a className="v3-co-primary" href="/empresa/nueva-solicitud">
          <IconPlus />
          <span>{copy.company_newRequest}</span>
        </a>
      </div>

      <section className="v3-co-panel v3-pl-filters" aria-label={copy.pages.processes.title}>
        <label className="v3-pl-search">
          <span>{copy.pl_search}</span>
          <input
            id="v2-filter-search"
            type="search"
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        {!isReal ? (
          <label>
            <span>{copy.pd_department}</span>
            <select
              id="v2-filter-department"
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
            >
              <option value="">{copy.pl_area}</option>
              {DEMO_DEPARTMENT_IDS.map((id) => (
                <option key={id} value={id}>{departmentLabels[id]}</option>
              ))}
            </select>
          </label>
        ) : null}
        {!isReal && locations.length > 0 ? (
          <label>
            <span>{copy.pd_location}</span>
            <select
              id="v2-filter-location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            >
              <option value="">{copy.pl_location}</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </label>
        ) : null}
        <label>
          <span>{copy.pl_sort}</span>
          <select
            id="v2-filter-sort"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="recent">{copy.pl_recent}</option>
            <option value="oldest">{copy.pl_oldest}</option>
            <option value="candidates">{copy.pl_candidates}</option>
            <option value="score">{copy.pl_score}</option>
            <option value="name">{copy.pl_name}</option>
          </select>
        </label>
        <button type="button" className="v3-co-text-button" id="v2-filter-reset" onClick={reset}>
          <span>{copy.pl_reset}</span>
        </button>
      </section>

      {checking ? (
        <div className="v3-co-loading v3-pl-loading" data-testid="v2-procs-loading">{copy.company_loading}</div>
      ) : (
        <>
          <p className="v3-pl-count" role="status">
            {copy.pl_results}: <strong id="v2-process-count" data-testid="v2-process-count">{visible.length}</strong>
          </p>
          <div className="v3-pl-grid" id="v2-process-list">
            {visible.map((process) => {
              const roleLabel = process.role
                ? localizeProcessRole(process, language)
                : copy.company_unspecifiedRole;
              const subline = [
                process.department ? departmentLabels[process.department] ?? process.department : '',
                process.location ?? '',
              ].filter(Boolean).join(' · ');
              return (
                <article className="v3-pl-card" key={process.id} data-testid={`v2-card-${process.id}`}>
                  <div className="v3-pl-card-top">
                    <span className="v3-co-status">{copy.company_active}</span>
                    <time dateTime={process.openedAt ?? undefined}>{process.openedAt ?? '—'}</time>
                  </div>
                  <h2>{roleLabel}</h2>
                  {subline ? <p>{subline}</p> : null}
                  <dl>
                    <div><dt>{copy.company_candidates}</dt><dd>{process.candidates ?? 0}</dd></div>
                    <div><dt>{copy.pd_evaluated}</dt><dd>{process.evaluated ?? 0}</dd></div>
                    <div>
                      <dt>{copy.company_averageScore}</dt>
                      <dd>{process.averageScore == null ? '—' : `${process.averageScore}%`}</dd>
                    </div>
                  </dl>
                  <a className="v3-co-text-button" href={`/empresa/proceso/${process.id}`}>
                    <span>{copy.company_viewProcess}</span>
                    <span aria-hidden="true">↗</span>
                  </a>
                </article>
              );
            })}
          </div>
          {visible.length === 0 ? (
            <div className="v3-co-panel v3-pl-empty" data-testid="v2-procs-empty">{copy.pl_empty}</div>
          ) : null}
        </>
      )}

      <div className="v3-co-footer">
        <span>{copy.common_footerYear}</span>
        <span>{copy.common_tagline}</span>
      </div>
    </div>
  );
}
