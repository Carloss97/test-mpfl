import React from 'react';
import { useV3Copy } from './v3Copy.js';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { getDemoJobs } from './jobsData.js';

function IconArrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14m-5-5 5 5-5 5" />
    </svg>
  );
}

export default function JobsPage() {
  const copy = useV3Copy();
  const { language } = useLanguage();
  const jobs = getDemoJobs();

  return (
    <div className="v3-jobs">
      <div className="v3-jobs-hero">
        <p className="v3-cp-eyebrow">{copy.jobs_catalogLabel}</p>
        <h1>{copy.pages.jobs.title}</h1>
        <p className="v3-jobs-subtitle">{copy.jobs_catalogNotice}</p>
      </div>

      <section aria-labelledby="v3-jobs-list-heading">
        <h2 id="v3-jobs-list-heading" className="v3-visually-hidden">{copy.jobs_catalogLabel}</h2>
        <div className="v3-jobs-grid">
          {jobs.map((job) => (
            <article key={job.slug} className="v3-job-card">
              <span className="v3-job-badge">{copy.jobs_roleExample}</span>
              <header className="v3-job-card-header">
                <h3 className="v3-job-card-title">{job.title[language]}</h3>
                <p className="v3-job-card-meta">{job.area[language]}</p>
              </header>
              <p className="v3-job-card-desc">{job.description[language]}</p>
              <footer className="v3-job-card-footer">
                <span className={`v3-job-status v3-job-status--${job.exampleStatus}`} aria-label={`${copy.jobs_exampleState} ${copy.jobs_statuses[job.exampleStatus]}. ${copy.jobs_notVacancy}`}>
                  {copy.jobs_statuses[job.exampleStatus]}
                </span>
                <a
                  className="v3-job-cta"
                  href={`/empleos/${job.slug}`}
                  aria-label={`${copy.jobs_viewExampleAria} ${job.title[language]}`}
                >
                  {copy.jobs_viewExample}
                  <IconArrow />
                </a>
              </footer>
            </article>
          ))}
        </div>
      </section>
      <a className="v3-back" href="/candidato">
        <span aria-hidden="true">←</span> {copy.cp_back}
      </a>
    </div>
  );
}
