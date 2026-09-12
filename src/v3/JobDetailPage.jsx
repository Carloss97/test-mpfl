// t_7aad621f (FASE A.3): Detalle de oferta de empleo (/empleos/:slug).
// Shell candidato, i18n v3Copy, datos de jobsData.js (getJobBySlug).
// Secciones: hero (título + meta), descripción, responsabilidades,
// requisitos, beneficios, fecha + CTA postular (placeholder honesto).
// Empty state (404) si slug no existe.
import React from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { getJobBySlug } from './jobsData.js';

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

function IconClock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
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

function Section({ title, icon: Icon, children, className }) {
  return (
    <section className={`v3-job-section ${className || ''}`} aria-labelledby={`${title.toLowerCase().replace(/\s+/g, '-')}-heading`}>
      <header className="v3-job-section-header">
        {Icon && <Icon className="v3-job-section-icon" aria-hidden="true" />}
        <h3 id={`${title.toLowerCase().replace(/\s+/g, '-')}-heading`} className="v3-job-section-title">{title}</h3>
      </header>
      <div className="v3-job-section-content">{children}</div>
    </section>
  );
}

function BulletList({ items }) {
  return (
    <ul className="v3-job-bullet-list">
      {items.map((item, idx) => (
        <li key={idx} className="v3-job-bullet-item">
          <IconCheck className="v3-job-bullet-check" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function JobDetailPage({ params }) {
  const { language } = useLanguage();
  const job = params?.slug ? getJobBySlug(params.slug) : null;

  if (!job) {
    return (
      <div className="v3-job-notfound">
        <IconBriefcase className="v3-job-notfound-icon" aria-hidden="true" />
        <h1>{language === 'es' ? 'Oferta no encontrada' : 'Job not found'}</h1>
        <p>
          {language === 'es'
            ? 'La oferta que buscas no existe o ha sido cerrada.'
            : 'The job you are looking for does not exist or has been closed.'}
        </p>
        <a className="v3-back" href="/empleos">
          <span aria-hidden="true">←</span> {language === 'es' ? 'Volver a la bolsa de empleos' : 'Back to job board'}
        </a>
      </div>
    );
  }

  return (
    <article className="v3-job-detail">
      <header className="v3-job-detail-header">
        {job.featured && (
          <span className="v3-job-badge">{language === 'es' ? 'Destacada' : 'Featured'}</span>
        )}
        <h1 className="v3-job-detail-title">{job.title[language]}</h1>
        <div className="v3-job-detail-meta">
          <div className="v3-job-meta-item">
            <IconLocation aria-hidden="true" />
            {job.location[language]}
          </div>
          <div className="v3-job-meta-item">
            <IconBriefcase aria-hidden="true" />
            {job.mode[language]} · {job.type[language]}
          </div>
          <div className="v3-job-meta-item">
            {job.department[language]}
          </div>
          <div className="v3-job-meta-item">
            <IconClock aria-hidden="true" />
            {formatDate(job.postedAt, language)}
          </div>
        </div>
      </header>

      <Section title={language === 'es' ? 'Descripción del cargo' : 'Job Description'} icon={IconBriefcase}>
        <p className="v3-job-detail-text">{job.description[language]}</p>
      </Section>

      <Section title={language === 'es' ? 'Responsabilidades' : 'Responsibilities'} icon={IconBriefcase}>
        <BulletList items={job.responsibilities[language]} />
      </Section>

      <Section title={language === 'es' ? 'Requisitos' : 'Requirements'} icon={IconBriefcase}>
        <BulletList items={job.requirements[language]} />
      </Section>

      <Section title={language === 'es' ? 'Beneficios' : 'Benefits'} icon={IconBriefcase}>
        <BulletList items={job.benefits[language]} />
      </Section>

      <footer className="v3-job-detail-footer">
        <div className="v3-job-footer-info">
          <p className="v3-job-footer-date">
            <IconClock aria-hidden="true" />
            {language === 'es' ? 'Publicada el ' : 'Posted on '}{formatDate(job.postedAt, language)}
          </p>
          <p className="v3-job-footer-status">
            {language === 'es' ? 'Estado: ' : 'Status: '}
            <span className={`v3-job-status v3-job-status--${job.status}`}>
              {job.status === 'active'
                ? (language === 'es' ? 'Activa' : 'Active')
                : job.status === 'paused'
                  ? (language === 'es' ? 'Pausada' : 'Paused')
                  : (language === 'es' ? 'Cerrada' : 'Closed')}
            </span>
          </p>
        </div>
        <div className="v3-job-footer-actions">
          <button
            type="button"
            className="v3-cta-gold v3-job-apply-btn"
            disabled
            aria-disabled="true"
          >
            {language === 'es' ? 'Postular (próxima iteración)' : 'Apply (next iteration)'}
          </button>
          <a className="v3-back" href="/empleos">
            <span aria-hidden="true">←</span> {language === 'es' ? 'Volver a la bolsa de empleos' : 'Back to job board'}
          </a>
        </div>
      </footer>
    </article>
  );
}