// t_legal (FASE E.1, KRU-117): página pública /legal/privacidad y
// /legal/terminos. Chrome de marca (header + toggle de idioma, patrón de la
// página bare del portal), lee el documento canónico desde docs/legal/*.md
// (single source of truth) y lo renderiza con el renderizador mínimo.
// Advierte que la versión gobernante es el texto en español (ley chilena)
// y que no ha sido revisada por abogados (template; revisión legal es acción
// humana fuera del alcance de un agente autónomo).
import React from 'react';
import LanguageToggle from '../i18n/LanguageToggle.jsx';
import { useV3Copy } from './v3Copy.js';
import { LEGAL_DOCS } from './legalDocs.jsx';
import renderMarkdown from './legalRender.jsx';

export default function LegalPage({ docType }) {
  const copy = useV3Copy();
  const page = copy.pages[docType];
  const raw = LEGAL_DOCS[docType]?.es ?? '';

  return (
    <div className="v3-bare v3-legal">
      <a className="v3-skip" href="#v3-legal-main">{copy.common_skipContent}</a>
      <header className="v3-bare-header">
        <a className="v3-bare-brand" href="/" aria-label={copy.common_logoAlt}>
          <img src="/assets/krumm-logo-borderless-no-text.webp" alt={copy.common_logoAlt} />
        </a>
        <LanguageToggle />
      </header>
      <main className="v3-bare-main v3-legal__main" id="v3-legal-main" tabIndex={-1}>
        <div className="v3-legal__intro">
          <span className="v3-portal-label">{copy.legal_kicker}</span>
          <h1>{page.title}</h1>
          <p className="v3-legal__note">{copy.legal_governingNote}</p>
          <p className="v3-legal__note v3-legal__note--warn">{copy.legal_notLawyerReviewed}</p>
        </div>
        <article className="v3-legal__doc">
          {renderMarkdown(raw)}
        </article>
        <a className="v3-back v3-back--bare" href="/portal">{copy.common_backHome}</a>
      </main>
    </div>
  );
}