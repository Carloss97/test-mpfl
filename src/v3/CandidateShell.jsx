// t_1c27edbf (V0 fase v3): shell del lado candidato (referencia candidate.html).
// Chrome: skip link + topbar (logo → /, breadcrumb, EN|ES, Help) + footer
// (© 2026 KRUMM + Privacy/Terms) + diálogo de Help/Privacy/Terms.
// El contenido de cada página (V1: home, acceso, jobs) entra como children.
import React, { useState } from 'react';
import LanguageToggle from '../i18n/LanguageToggle.jsx';
import { useV3Copy } from './v3Copy.js';
import V3Dialog from './V3Dialog.jsx';

const CANDIDATE_MAIN_ID = 'v3-candidate-main';

export default function CandidateShell({ breadcrumb, children }) {
  const copy = useV3Copy();
  const [dialog, setDialog] = useState(null); // { title, text } | null

  const openDialog = (title, text) => setDialog({ title, text });

  return (
    <div className="v3-candidate">
      <a className="v3-skip" href={`#${CANDIDATE_MAIN_ID}`}>{copy.common_skipContent}</a>

      <header className="v3-cp-header">
        <a className="v3-cp-brand" href="/" aria-label={copy.common_logoAlt}>
          <img src="/assets/krumm-logo-borderless-no-text.png" alt={copy.common_logoAlt} />
        </a>
        {breadcrumb ? (
          <nav className="v3-cp-breadcrumb" aria-label={copy.cp_breadcrumb}>
            <span aria-current="page" data-testid="v3-breadcrumb-current">{breadcrumb}</span>
          </nav>
        ) : null}
        <div className="v3-cp-header-actions">
          <LanguageToggle />
          <button type="button" className="v3-text-button" onClick={() => openDialog(copy.cp_help, copy.cp_helpText)}>
            {copy.cp_help}
          </button>
        </div>
      </header>

      <main className="v3-cp-main" id={CANDIDATE_MAIN_ID} tabIndex={-1}>
        {children}
      </main>

      <footer className="v3-cp-footer">
        <span>{copy.common_footerYear}</span>
        <div className="v3-cp-footer-links">
          <button type="button" className="v3-text-button" onClick={() => openDialog(copy.cp_privacy, copy.common_nextIteration)}>
            {copy.cp_privacy}
          </button>
          <button type="button" className="v3-text-button" onClick={() => openDialog(copy.cp_terms, copy.common_nextIteration)}>
            {copy.cp_terms}
          </button>
        </div>
      </footer>

      <V3Dialog
        open={Boolean(dialog)}
        title={dialog?.title ?? ''}
        text={dialog?.text ?? ''}
        onClose={() => setDialog(null)}
        closeLabel={copy.common_close}
        labelId="v3-cp-dialog-title"
        descId="v3-cp-dialog-desc"
      />
    </div>
  );
}
