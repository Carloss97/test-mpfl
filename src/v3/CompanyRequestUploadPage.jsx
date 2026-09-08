// t_9319e84d (V4 fase v3): upload de perfil (/empresa/nueva-solicitud/subida).
// La referencia (request-upload.html) es placeholder "coming soon" →
// implementación real mínima (plan V4 D5): validación de tipo/tamaño
// (pdf/docx/txt, >0, ≤10MB — validateProfileFile pura) → panel de METADATOS
// (nombre/formato/tamaño/fecha) + confirmación honesta: revisión humana,
// SIN NLP (no se extrae contenido del documento), SIN backend (no se sube
// nada, no se crea proceso automático — el vínculo upload→proceso es
// follow-up plan V4 §4).
// Privacidad por construcción: la UI solo lee name/size/type de File; el
// contenido del archivo nunca se lee ni persiste.
import React, { useRef, useState } from 'react';
import { useV3Copy } from './v3Copy.js';
import { formatFileSize, validateProfileFile } from './companyData.js';

function IconDoc() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6M12 18v-7m-3 3 3-3 3 3" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" />
    </svg>
  );
}

export default function CompanyRequestUploadPage() {
  const copy = useV3Copy();
  const inputRef = useRef(null);
  const [record, setRecord] = useState(null); // { name, size, type, receivedAt } — SOLO metadatos
  const [error, setError] = useState(null); // 'type' | 'empty' | 'size'

  const onFile = (event) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    const result = validateProfileFile(file);
    if (!result.ok) {
      setRecord(null);
      setError(result.error);
      return;
    }
    setError(null);
    setRecord({
      name: file.name,
      size: file.size,
      type: result.type,
      receivedAt: new Date().toISOString().slice(0, 10),
    });
    // permite re-seleccionar el mismo archivo tras el reset
    event.target.value = '';
  };

  const resetAll = () => {
    setRecord(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const errorMessage = error === 'type'
    ? copy.ru_errorType
    : error === 'empty'
      ? copy.ru_errorEmpty
      : copy.ru_errorSize;

  return (
    <div className="v4-ru">
      <a className="v3-back" href="/empresa/nueva-solicitud">
        <span aria-hidden="true">←</span> {copy.request_back}
      </a>
      <div className="v3-co-page-heading">
        <div>
          <h1>{copy.pages.requestUpload.title}</h1>
          <p>{copy.ru_intro}</p>
        </div>
      </div>

      {record ? (
        <section className="v3-co-panel v4-ru-done" data-testid="v4-ru-done" aria-label={copy.ru_doneTitle}>
          <div className="v4-ru-done-head">
            <span className="v4-ru-done-icon" aria-hidden="true"><IconCheck /></span>
            <div>
              <h2>{copy.ru_doneTitle}</h2>
              <p>{record.name}</p>
            </div>
          </div>
          <dl className="v4-ru-meta">
            <div><dt>{copy.ru_name}</dt><dd>{record.name}</dd></div>
            <div><dt>{copy.ru_format}</dt><dd>{record.type.toUpperCase()}</dd></div>
            <div><dt>{copy.ru_size}</dt><dd>{formatFileSize(record.size)}</dd></div>
            <div><dt>{copy.ru_received}</dt><dd>{record.receivedAt}</dd></div>
          </dl>
          <p className="v4-ru-note"><strong>{copy.company_demoBadge}:</strong> {copy.ru_doneText}</p>
          <div className="v4-ru-actions">
            <button type="button" className="v3-co-text-button" onClick={resetAll}>
              <span>{copy.ru_chooseAnother}</span>
            </button>
          </div>
        </section>
      ) : (
        <section className="v3-co-panel v4-ru-panel" aria-label={copy.ru_dropLabel}>
          <div className="v4-ru-drop" data-testid="v4-ru-drop">
            <span className="v4-ru-drop-icon" aria-hidden="true"><IconDoc /></span>
            <label htmlFor="v4-ru-file" className="v4-ru-drop-label">{copy.ru_dropLabel}</label>
            <input
              ref={inputRef}
              id="v4-ru-file"
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={onFile}
            />
            <p className="v4-ru-drop-hint">{copy.ru_dropHint}</p>
          </div>
          {error ? (
            <div role="alert" className="v4-ru-error">
              <p>{errorMessage}</p>
            </div>
          ) : null}
          <p className="v4-ru-privacy"><span aria-hidden="true">🔒</span> {copy.ru_privacyNote}</p>
        </section>
      )}

      <div className="v3-co-footer">
        <span>{copy.common_footerYear}</span>
        <span>{copy.common_tagline}</span>
      </div>
    </div>
  );
}
