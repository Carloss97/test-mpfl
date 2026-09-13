// A.1 (KRU-112): panel "Invitar a un candidato" del dashboard empresa.
// Solo visible en modo real (auth Cognito) — en demo (showcase público) se
// oculta: no hay credenciales con qué crear invitaciones reales.
// Flujos: form → POST /invitations (Bearer) → success (con link manual) o
// error. 401/403 → onAuthRequired (redirect al login).
import React, { useState } from 'react';
import { useV3Copy } from './v3Copy.js';
import { createInvitation } from './companyInvitations.js';

function defaultOnAuthRequired() {
  if (typeof window !== 'undefined') window.location.assign('/empresa/acceso');
}

export default function CompanyInvitePanel({
  apiBase,
  fetchImpl,
  onAuthRequired = defaultOnAuthRequired,
} = {}) {
  const copy = useV3Copy();
  const c = copy.invite;
  const [email, setEmail] = useState('');
  const [phase, setPhase] = useState('form'); // form | sending | done | error
  const [result, setResult] = useState(null);

  const reset = () => {
    setPhase('form');
    setResult(null);
    setEmail('');
  };

  const submit = (e) => {
    e.preventDefault();
    if (phase === 'sending') return;
    setPhase('sending');
    createInvitation({ apiBase, email, fetchImpl, onAuthRequired }).then((out) => {
      if (out.ok) {
        setResult(out);
        setPhase('done');
      } else if (out.code === 'auth_required' || out.code === 'no_auth') {
        // onAuthRequired ya redirige; dejamos el form intacto.
        setPhase('form');
      } else {
        setPhase('error');
      }
    });
  };

  return (
    <section className="v3-co-panel v3-co-invite" aria-labelledby="v3-co-invite-heading">
      <div className="v3-co-section-heading">
        <div>
          <h2 id="v3-co-invite-heading">{c.title}</h2>
          <p>{c.subtitle}</p>
        </div>
      </div>

      {phase === 'done' && result ? (
        <div className="v3-co-invite-success" role="status" data-testid="v3-co-invite-success">
          <p>{result.emailStatus?.sent ? c.success : c.successEmailFailed}</p>
          {result.link ? (
            <p className="v3-co-invite-link">
              <span>{c.manualLink}</span>{' '}
              <a href={result.link} target="_blank" rel="noreferrer" data-testid="v3-co-invite-link">
                {result.link}
              </a>
            </p>
          ) : null}
          <p className="v3-co-invite-note">{c.note}</p>
        </div>
      ) : null}

      {phase === 'error' ? (
        <div className="v4-rd-errors" role="alert" data-testid="v3-co-invite-error">
          <p>{c.error}</p>
        </div>
      ) : null}

      <form onSubmit={submit}>
        <label className="v4-rd-field">
          <span>{c.emailLabel}</span>
          <input
            id="v3-co-invite-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={c.emailPlaceholder}
            disabled={phase === 'sending' || phase === 'done'}
          />
        </label>
        <div className="v4-rd-actions">
          <button
            type="submit"
            className="v3-co-primary"
            disabled={phase === 'sending' || !email.trim()}
            data-testid="v3-co-invite-submit"
          >
            <span>{phase === 'sending' ? c.sending : c.send}</span>
          </button>
          {phase === 'done' ? (
            <button type="button" className="v3-co-text-button" onClick={reset} data-testid="v3-co-invite-again">
              <span>{c.again}</span>
            </button>
          ) : null}
        </div>
      </form>
    </section>
  );
}
