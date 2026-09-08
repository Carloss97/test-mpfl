// t_9319e84d (V4 fase v3): hub new request (/empresa/nueva-solicitud).
// Referencia: new-request.html/css (2 cards: QUICK upload / RECOMMENDED design
// con KRUMM, badges, previews decorativos, action bar). Copias request_*
// textuales de la referencia (EN + ES de script.js) — excepción: la
// request_designDescription de la ref promete conversación ("by talking with
// KRUMM") y el flujo real es un formulario guiado (sin LLM, plan maestro
// §4.2 / plan V4 D6) → descripción adaptada y preview de 3 pasos en vez del
// mock de chat.
// Las 2 cards enlazan a las vistas reales de V4 (subida / diseño).
import React from 'react';
import { useV3Copy } from './v3Copy.js';

function IconDoc() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6M12 18v-7m-3 3 3-3 3 3" />
    </svg>
  );
}

function IconSliders() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
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

export default function CompanyNewRequestPage() {
  const copy = useV3Copy();
  return (
    <div className="v4-req">
      <div className="v3-co-page-heading">
        <div>
          <div className="v3-co-eyebrow">{copy.company_eyebrow}</div>
          <h1>{copy.pages.newRequest.title}</h1>
          <p>{copy.request_subtitle}</p>
        </div>
      </div>

      <section className="v4-req-section" aria-label={copy.pages.newRequest.title}>
        <div className="v4-req-cards">
          <a
            className="v4-req-card"
            href="/empresa/nueva-solicitud/subida"
            aria-labelledby="v4-req-upload-title"
            aria-describedby="v4-req-upload-desc"
          >
            <div className="v4-req-card-top">
              <span className="v4-req-icon" aria-hidden="true"><IconDoc /></span>
              <span className="v4-req-badge">{copy.request_quick}</span>
            </div>
            <h3 id="v4-req-upload-title">{copy.request_upload}</h3>
            <p className="v4-req-desc" id="v4-req-upload-desc">{copy.request_uploadDescription}</p>
            <div className="v4-req-preview v4-req-preview--doc" aria-hidden="true">
              <div className="v4-req-paper">
                <IconDoc />
                <i /><i /><i />
              </div>
              <div className="v4-req-formats"><span>PDF</span><span>DOCX</span><span>TXT</span></div>
            </div>
            <span className="v4-req-action">
              <span>{copy.request_uploadAction}</span>
              <IconArrow />
            </span>
          </a>

          <a
            className="v4-req-card v4-req-card--featured"
            href="/empresa/nueva-solicitud/diseño"
            aria-labelledby="v4-req-design-title"
            aria-describedby="v4-req-design-desc"
          >
            <div className="v4-req-card-top">
              <span className="v4-req-icon" aria-hidden="true"><IconSliders /></span>
              <span className="v4-req-badge v4-req-badge--featured">{copy.request_recommended}</span>
            </div>
            <h3 id="v4-req-design-title">{copy.request_design}</h3>
            <p className="v4-req-desc" id="v4-req-design-desc">{copy.request_designDescription}</p>
            <div className="v4-req-preview v4-req-preview--steps" aria-hidden="true">
              <div className="v4-req-step"><strong>1</strong><p>{copy.rd_mockRole}</p></div>
              <div className="v4-req-step v4-req-step--user"><strong>2</strong><p>{copy.rd_mockArea}</p></div>
              <div className="v4-req-step"><strong>3</strong><p>{copy.rd_mockProfile}</p></div>
            </div>
            <span className="v4-req-action v4-req-action--featured">
              <span>{copy.request_designAction}</span>
              <IconArrow />
            </span>
          </a>
        </div>
      </section>

      <div className="v3-co-footer">
        <span>{copy.common_footerYear}</span>
        <span>{copy.common_tagline}</span>
      </div>
    </div>
  );
}
