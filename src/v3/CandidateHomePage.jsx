// t_482f57b2 (V1 fase v3): home del lado candidato (/candidato) — referencia
// candidate.html: hero (eyebrow + "Find your next opportunity." + subtitle) y
// 2 cards de decisión: "Explore opportunities" → /empleos (job board, honesto
// "próxima iteración" como la ref) y "I already have an invitation" →
// /candidato/acceso (flujo de invitación real del producto). Copias textuales
// de la referencia (V3_COPY cp_*); los SVGs son los de la ref.
import React from 'react';
import { useV3Copy } from './v3Copy.js';

function IconBriefcase() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="7" width="18" height="14" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12a23 23 0 0 0 18 0M12 11v4" />
    </svg>
  );
}

function IconEnvelope() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
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

export default function CandidateHomePage() {
  const copy = useV3Copy();
  return (
    <div className="v3-cp-home">
      <div className="v3-cp-hero">
        <p className="v3-cp-eyebrow">{copy.cp_eyebrow}</p>
        <h1>{copy.cp_title}</h1>
        <p className="v3-cp-subtitle">{copy.cp_subtitle}</p>
      </div>
      <section aria-labelledby="v3-cp-home-question">
        <h2 id="v3-cp-home-question" className="v3-cp-question">{copy.cp_question}</h2>
        <div className="v3-cp-grid">
          <a
            className="v3-cp-card"
            href="/empleos"
            aria-labelledby="v3-cp-explore-title"
            aria-describedby="v3-cp-explore-text"
          >
            <span className="v3-cp-card-icon" aria-hidden="true"><IconBriefcase /></span>
            <h3 id="v3-cp-explore-title">{copy.cp_explore}</h3>
            <p id="v3-cp-explore-text">{copy.cp_exploreText}</p>
            <span className="v3-cp-card-cta">{copy.cp_exploreAction}<IconArrow /></span>
            <span className="v3-cp-hint">{copy.cp_exploreHint}</span>
          </a>
          <a
            className="v3-cp-card"
            href="/candidato/acceso"
            aria-labelledby="v3-cp-invitation-title"
            aria-describedby="v3-cp-invitation-text"
          >
            <span className="v3-cp-card-icon" aria-hidden="true"><IconEnvelope /></span>
            <h3 id="v3-cp-invitation-title">{copy.cp_invitation}</h3>
            <p id="v3-cp-invitation-text">{copy.cp_invitationText}</p>
            <span className="v3-cp-card-cta">{copy.cp_signIn}<IconArrow /></span>
            <span className="v3-cp-hint">{copy.cp_invitationHint}</span>
          </a>
        </div>
      </section>
    </div>
  );
}
