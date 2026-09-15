import React from 'react';
import { useV3Copy } from './v3Copy.js';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { getJobBySlug } from './jobsData.js';

function IconBriefcase({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="7" width="18" height="14" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12a23 23 0 0 0 18 0M12 11v4" />
    </svg>
  );
}

function IconCheck({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function Section({ id, title, children }) {
  return (
    <section className="v3-job-section" aria-labelledby={id}>
      <header className="v3-job-section-header">
        <IconBriefcase className="v3-job-section-icon" />
        <h2 id={id} className="v3-job-section-title">{title}</h2>
      </header>
      <div className="v3-job-section-content">{children}</div>
    </section>
  );
}

function BulletList({ items }) {
  return (
    <ul className="v3-job-bullet-list">
      {items.map((item) => (
        <li key={item} className="v3-job-bullet-item">
          <IconCheck className="v3-job-bullet-check" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function JobDetailPage({ params }) {
  const copy = useV3Copy();
  const { language } = useLanguage();
  const job = params?.slug ? getJobBySlug(params.slug) : null;

  if (!job) {
    return (
      <div className="v3-job-notfound">
        <IconBriefcase className="v3-job-notfound-icon" />
        <h1>{copy.jobs_notFound}</h1>
        <p>{copy.jobs_notFoundText}</p>
        <a className="v3-back" href="/empleos"><span aria-hidden="true">←</span> {copy.jobs_backCatalog}</a>
      </div>
    );
  }

  const status = copy.jobs_statuses[job.exampleStatus];
  const statusLabel = `${copy.jobs_exampleState} ${status}. ${copy.jobs_notVacancy}`;

  return (
    <article className="v3-job-detail">
      <header className="v3-job-detail-header">
        <span className="v3-job-badge">{copy.jobs_roleExample}</span>
        <h1 className="v3-job-detail-title">{job.title[language]}</h1>
        <div className="v3-job-detail-meta">
          <span className="v3-job-meta-item">{job.area[language]}</span>
          <span className={`v3-job-status v3-job-status--${job.exampleStatus}`} aria-label={statusLabel}>{status}</span>
        </div>
      </header>

      <Section id="v3-job-overview" title={copy.jobs_sections.overview}>
        <p className="v3-job-detail-text">{job.description[language]}</p>
      </Section>
      <Section id="v3-job-focus" title={copy.jobs_sections.focus}>
        <BulletList items={job.focus[language]} />
      </Section>
      <Section id="v3-job-competencies" title={copy.jobs_sections.competencies}>
        <BulletList items={job.competencies[language]} />
      </Section>

      <footer className="v3-job-detail-footer">
        <p className="v3-job-demo-notice" role="status">{copy.jobs_noApplications}</p>
        <div className="v3-job-footer-actions">
          <a className="v3-job-cta" href="/candidato">{copy.jobs_exploreCandidatePortal}</a>
          <a className="v3-back" href="/empleos"><span aria-hidden="true">←</span> {copy.jobs_backCatalog}</a>
        </div>
      </footer>
    </article>
  );
}
