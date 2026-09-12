// t_7aad621f (FASE A.3): Job board — listado de ofertas (/empleos).
// Shell candidato (CandidateShell), i18n v3Copy, datos de jobsData.js.
// Grid responsive de cards: título, ubicación, modalidad, área, descripción
// truncada, CTA "Ver detalles" → /empleos/:slug. Empty state si no hay ofertas.
import React from 'react';
import { useV3Copy } from './v3Copy.js';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { getActiveJobs } from './jobsData.js';

function IconLocation() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconBriefcase() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="7" width="18" height="14" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12a23 23 0 0 0 18 0M12 11v4" />
    </svg>
  );
}

function IconArrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14m-5-5 5 5-5 5" />
    </svg>
  );
}

function formatDate(dateStr, lang) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString(lang === 'es' ? 'es-CL' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export default function JobsPage() {
  const copy = useV3Copy();
  const { language } = useLanguage();
  const jobs = getActiveJobs();

  return (
    <div className="v3-jobs">
      <div className="v3-jobs-hero">
        <p className="v3-cp-eyebrow">{copy.cp_eyebrow}</p>
        <h1>{copy.pages.jobs.title}</h1>
        <p className="v3-jobs-subtitle">{copy.cp_subtitle}</p>
      </div>

      {jobs.length > 0 ? (
        <>
          <section aria-labelledby="v3-jobs-list-heading">
            <h2 id="v3-jobs-list-heading" className="v3-visually-hidden">{copy.cp_jobs}</h2>
            <div className="v3-jobs-grid">
              {jobs.map(job => (
                <article key={job.slug} className="v3-job-card">
                  {job.featured && (
                    <span className="v3-job-badge">{language === 'es' ? 'Destacada' : 'Featured'}</span>
                  )}
                  <header className="v3-job-card-header">
                    <h3 className="v3-job-card-title">{job.title[language]}</h3>
                    <div className="v3-job-card-meta">
                      <span className="v3-job-meta-item">
                        <IconLocation aria-hidden="true" />
                        {job.location[language]}
                      </span>
                      <span className="v3-job-meta-item">
                        <IconBriefcase aria-hidden="true" />
                        {job.mode[language]} · {job.type[language]}
                      </span>
                      <span className="v3-job-meta-item">
                        {job.department[language]}
                      </span>
                    </div>
                  </header>
                  <p className="v3-job-card-desc">
                    {job.description[language].slice(0, 180)}…
                  </p>
                  <footer className="v3-job-card-footer">
                    <time className="v3-job-date" dateTime={job.postedAt}>
                      {formatDate(job.postedAt, language)}
                    </time>
                    <a
                      className="v3-job-cta"
                      href={`/empleos/${job.slug}`}
                      aria-label={language === 'es'
                        ? `Ver detalles de ${job.title.es}`
                        : `View details for ${job.title.en}`}
                    >
                      {language === 'es' ? 'Ver detalles' : 'View details'}
                      <IconArrow aria-hidden="true" />
                    </a>
                  </footer>
                </article>
              ))}
            </div>
          </section>
          <a className="v3-back" href="/candidato">
            <span aria-hidden="true">←</span> {copy.cp_back}
          </a>
        </>
      ) : (
        <div className="v3-jobs-empty">
          <IconBriefcase className="v3-jobs-empty-icon" aria-hidden="true" />
          <h3>{language === 'es' ? 'No hay ofertas disponibles' : 'No opportunities available'}</h3>
          <p>
            {language === 'es'
              ? 'En este momento no tenemos procesos de selección abiertos. Vuelve a visitarnos pronto.'
              : 'We currently have no open hiring processes. Please check back soon.'}
          </p>
          <a className="v3-back" href="/candidato">
            <span aria-hidden="true">←</span> {copy.cp_back}
          </a>
        </div>
      )}
    </div>
  );
}