// t_482f57b2 (V1 fase v3): acceso del candidato (/candidato/acceso) —
// integración del guard de invitación EXISTENTE (la referencia
// login-candidate.html era placeholder; aquí entra el flujo real del
// producto, sin auth inventada): el candidato pega el link de invitación
// (URL completa o relativa) o el token crudo; extractInviteToken lo valida
// en formato y la página navega a /postulaciones?invite=<token>, donde el
// guard de PostulationDemoApp (validación + sesión ligada,
// runIdForInvitation/x-invitation-id) hace su veredicto.
//
// API: ({ onNavigate, initialSearch }) — onNavigate(url) inyectable para
// tests (default: location.assign, navegación completa — SPA sin router);
// initialSearch (default: window.location.search) habilita la auto-
// navegación si el enlace compartido ya trae ?invite=<token> (ref guard,
// idempotente bajo StrictMode).
import React, { useEffect, useRef, useState } from 'react';
import { useV3Copy } from './v3Copy.js';
import { buildInvitationUrl, extractInviteToken } from '../postulation-demo/postulationDemoInvite.js';

export default function CandidateAccessPage({ onNavigate, initialSearch } = {}) {
  const copy = useV3Copy();
  const [value, setValue] = useState('');
  const [error, setError] = useState(null);
  const navigatedRef = useRef(false);

  const navigate = onNavigate ?? ((url) => {
    globalThis.location.assign(url);
  });
  const effectiveSearch = initialSearch ?? (typeof window === 'undefined' ? '' : window.location.search);

  // Llega con ?invite=<token> (link compartido a la nueva URL): auto-navega
  // 1 vez a /postulaciones; el form queda disponible si el token no era.
  useEffect(() => {
    if (navigatedRef.current) return undefined;
    const token = extractInviteToken(effectiveSearch);
    if (!token) return undefined;
    navigatedRef.current = true;
    navigate(buildInvitationUrl(token));
    return undefined;
  }, [navigate, effectiveSearch]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const token = extractInviteToken(value);
    if (!token) {
      setError(copy.ca_formatError);
      return;
    }
    setError(null);
    navigate(buildInvitationUrl(token));
  };

  return (
    <div className="v3-ca">
      <p className="v3-cp-eyebrow">{copy.cp_eyebrow}</p>
      <h1>{copy.cp_access}</h1>
      <p className="v3-ca-intro">{copy.ca_intro}</p>
      <form className="v3-ca-form" onSubmit={handleSubmit} noValidate>
        <label className="v3-ca-field" htmlFor="v3-ca-input">{copy.ca_label}</label>
        <input
          id="v3-ca-input"
          className="v3-ca-input"
          type="text"
          name="invitation"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={copy.ca_inputPlaceholder}
          autoComplete="off"
          spellCheck={false}
        />
        {error ? (
          <p className="v3-ca-error" role="alert">{error}</p>
        ) : null}
        <button type="submit" className="v3-ca-submit">{copy.cp_signIn}</button>
      </form>
      <p className="v3-ca-note">{copy.ca_note}</p>
      <a className="v3-back" href="/candidato">
        <span aria-hidden="true">←</span> {copy.cp_back}
      </a>
    </div>
  );
}
