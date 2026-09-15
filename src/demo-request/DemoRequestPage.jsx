// Public demo request: only the documented allowlist reaches the API. This page
// intentionally has no analytics or Sentry instrumentation because its form is PII.
import React, { useRef, useState } from 'react';
import { KRUMM_API_BASE } from '../postulation-demo/postulationDemoConfig.js';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import './demoRequest.css';

const EMPTY_FORM = Object.freeze({
  name: '',
  workEmail: '',
  company: '',
  role: '',
  teamSize: '',
  useCase: '',
  contactConsent: false,
});

const FIELD_LABELS = Object.freeze({
  name: 'nombre',
  workEmail: 'correo',
  company: 'empresa',
  role: 'cargo',
  teamSize: 'tamaño del equipo',
  useCase: 'caso de uso',
  contactConsent: 'consentimiento de contacto',
});

export function validateDemoRequest(values) {
  const errors = {};
  for (const field of ['name', 'company', 'role', 'teamSize', 'useCase']) {
    if (!String(values[field] || '').trim()) errors[field] = 'Este campo es obligatorio.';
  }
  const email = String(values.workEmail || '').trim();
  if (!email) errors.workEmail = 'Este campo es obligatorio.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.workEmail = 'Ingresa un correo de trabajo válido.';
  if (values.contactConsent !== true) errors.contactConsent = 'Necesitamos tu autorización para contactarte.';
  return errors;
}

function requestPayload(values) {
  return {
    name: values.name.trim(),
    workEmail: values.workEmail.trim(),
    company: values.company.trim(),
    role: values.role.trim(),
    teamSize: values.teamSize.trim(),
    useCase: values.useCase.trim(),
    contactConsent: true,
  };
}

function apiUrl(apiBase) {
  return `${String(apiBase || '').replace(/\/+$/, '')}/demo-requests`;
}

function FieldError({ error, id }) {
  return error ? <p className="demo-request__field-error" id={id} role="alert">{error}</p> : null;
}

export default function DemoRequestPage({ apiBase = KRUMM_API_BASE, fetchImpl = globalThis.fetch }) {
  const { t } = useLanguage();
  const [values, setValues] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [submitted, setSubmitted] = useState(false);

  const update = (event) => {
    const { name, type, checked, value } = event.target;
    setValues((previous) => ({ ...previous, [name]: type === 'checkbox' ? checked : value }));
    setErrors((previous) => ({ ...previous, [name]: undefined }));
    setGeneralError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    // React state updates are asynchronous; this ref closes the same-tick double-click race.
    if (submittingRef.current) return;
    const nextErrors = validateDemoRequest(values);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    if (!apiBase || typeof fetchImpl !== 'function') {
      setGeneralError('No pudimos enviar tu solicitud. Inténtalo nuevamente más tarde.');
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setGeneralError('');
    try {
      const response = await fetchImpl(apiUrl(apiBase), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload(values)),
      });
      if (response.status === 201) {
        setSubmitted(true);
        return;
      }
      let body = null;
      try { body = await response.json(); } catch { body = null; }
      if (response.status === 422 && Array.isArray(body?.violations)) {
        const serverErrors = {};
        for (const field of body.violations) {
          if (FIELD_LABELS[field]) {
            serverErrors[field] = field === 'workEmail'
              ? 'Revisa el correo de trabajo e inténtalo nuevamente.'
              : field === 'contactConsent'
                ? 'Necesitamos tu autorización para contactarte.'
                : `Revisa el campo ${FIELD_LABELS[field]}.`;
          }
        }
        if (Object.keys(serverErrors).length) {
          setErrors(serverErrors);
          return;
        }
      }
      setGeneralError(response.status === 429
        ? 'Recibimos muchas solicitudes. Espera un momento e inténtalo nuevamente.'
        : 'No pudimos enviar tu solicitud. Inténtalo nuevamente más tarde.');
    } catch {
      setGeneralError('No pudimos enviar tu solicitud. Inténtalo nuevamente más tarde.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="v3-bare demo-request">
      <a className="v3-skip" href="#demo-request-main">Saltar al contenido</a>
      <header className="demo-request__header">
        <a className="demo-request__brand" href="/" aria-label="KRUMM — inicio">
          <img src="/assets/krumm-logo-borderless-no-text.webp" alt="KRUMM" />
        </a>
        <a className="demo-request__back" href="/">Volver a KRUMM</a>
      </header>
      <main className="demo-request__main" id="demo-request-main" tabIndex={-1}>
        {submitted ? (
          <section className="demo-request__success" aria-labelledby="demo-request-success-title">
            <p className="demo-request__eyebrow">SOLICITUD RECIBIDA</p>
            <h1 id="demo-request-success-title">Recibimos tu solicitud.</h1>
            <p>Te contactaremos para conversar sobre una demostración de KRUMM.</p>
            <a className="demo-request__button demo-request__button--secondary" href="/">Volver al inicio</a>
          </section>
        ) : (
          <div className="demo-request__stack">
            <section className="demo-request__intro" aria-labelledby="demo-request-title">
              <p className="demo-request__eyebrow">DEMO KRUMM</p>
              <h1 id="demo-request-title">{t('Conversemos sobre tu proceso de selección.', 'Let’s discuss your hiring process.')}</h1>
              <p>Cuéntanos brevemente qué necesita tu equipo. Usaremos estos datos solo para responder a tu solicitud de demo.</p>
              <p className="demo-request__availability">Respondemos solicitudes en días hábiles.</p>
            </section>
            <form className="demo-request__form" noValidate onSubmit={submit} aria-describedby={generalError ? 'demo-request-general-error' : undefined}>
              {generalError ? <p className="demo-request__general-error" id="demo-request-general-error" role="alert">{generalError}</p> : null}
              <label htmlFor="demo-name">Nombre
                <input id="demo-name" name="name" autoComplete="name" value={values.name} onChange={update} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'demo-name-error' : undefined} disabled={submitting} />
              </label>
              <FieldError error={errors.name} id="demo-name-error" />
              <label htmlFor="demo-company">Empresa
                <input id="demo-company" name="company" autoComplete="organization" value={values.company} onChange={update} aria-invalid={Boolean(errors.company)} aria-describedby={errors.company ? 'demo-company-error' : undefined} disabled={submitting} />
              </label>
              <FieldError error={errors.company} id="demo-company-error" />
              <label htmlFor="demo-email">Correo de trabajo
                <input id="demo-email" name="workEmail" type="email" autoComplete="email" value={values.workEmail} onChange={update} aria-invalid={Boolean(errors.workEmail)} aria-describedby={errors.workEmail ? 'demo-email-error' : undefined} disabled={submitting} />
              </label>
              <FieldError error={errors.workEmail} id="demo-email-error" />
              <label htmlFor="demo-role">Cargo
                <input id="demo-role" name="role" autoComplete="organization-title" value={values.role} onChange={update} aria-invalid={Boolean(errors.role)} aria-describedby={errors.role ? 'demo-role-error' : undefined} disabled={submitting} />
              </label>
              <FieldError error={errors.role} id="demo-role-error" />
              <label htmlFor="demo-team-size">Tamaño del equipo
                <select id="demo-team-size" name="teamSize" value={values.teamSize} onChange={update} aria-invalid={Boolean(errors.teamSize)} aria-describedby={errors.teamSize ? 'demo-team-size-error' : undefined} disabled={submitting}>
                  <option value="">Selecciona una opción</option>
                  <option value="1-10">1–10 personas</option>
                  <option value="11-50">11–50 personas</option>
                  <option value="51-200">51–200 personas</option>
                  <option value="201+">201+ personas</option>
                </select>
              </label>
              <FieldError error={errors.teamSize} id="demo-team-size-error" />
              <label htmlFor="demo-use-case">Caso de uso
                <textarea id="demo-use-case" name="useCase" rows="5" value={values.useCase} onChange={update} aria-invalid={Boolean(errors.useCase)} aria-describedby={errors.useCase ? 'demo-use-case-error' : undefined} disabled={submitting} />
              </label>
              <FieldError error={errors.useCase} id="demo-use-case-error" />
              <label className="demo-request__consent" htmlFor="demo-consent">
                <input id="demo-consent" name="contactConsent" type="checkbox" checked={values.contactConsent} onChange={update} aria-invalid={Boolean(errors.contactConsent)} aria-describedby={errors.contactConsent ? 'demo-consent-error' : undefined} disabled={submitting} />
                <span>Autorizo a KRUMM a contactarme sobre esta solicitud.</span>
              </label>
              <FieldError error={errors.contactConsent} id="demo-consent-error" />
              <button className="demo-request__button" type="submit" disabled={submitting}>{submitting ? 'Enviando…' : 'Solicitar demo'}</button>
              <p className="demo-request__support">¿Tienes un incidente técnico? <a href="mailto:soporte@krumm.cl">Escríbenos a soporte@krumm.cl</a>.</p>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
