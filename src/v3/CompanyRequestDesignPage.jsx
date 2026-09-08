// t_9319e84d (V4 fase v3): diseño de proceso guiado
// (/empresa/nueva-solicitud/diseño). La referencia (request-design.html) es un
// placeholder "coming soon" sobre un mock de chat → implementación real mínima
// (plan maestro §4.2, plan V4 D3): formulario de 3 pasos con preguntas
// estructuradas (SIN chat LLM):
//   1. Cargo: role* + department* + location
//   2. Perfil a evaluar: work mode* + target profile (opcional)
//   3. Revisar y crear: resumen → crea el proceso.
// Al crear: el proceso entra al store solo-memoria (companyProcessStore, D1)
// y aparece en /empresa/procesos + KPIs del dashboard + detalle coherente
// (D4). roleEn = role: la entrada del usuario no se traduce (D3).
import React, { useState } from 'react';
import { useV3Copy } from './v3Copy.js';
import { createDraftProcess } from './companyProcessStore.js';
import { DEMO_DEPARTMENT_IDS, DESIGN_FIELD_LIMITS } from './companyData.js';

const STEP_TITLES = ['rd_stepRole', 'rd_stepProfile', 'rd_stepReview'];
const STEP_SUBS = ['rd_stepRoleSub', 'rd_stepProfileSub', 'rd_stepReviewSub'];
const INITIAL_FORM = Object.freeze({ role: '', department: '', location: '', mode: 'onsite', profile: '' });

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" />
    </svg>
  );
}

export default function CompanyRequestDesignPage() {
  const copy = useV3Copy();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [created, setCreated] = useState(null);

  const departmentLabels = {
    operations: copy.pd_operations,
    maintenance: copy.pd_maintenance,
  };
  const modeLabels = {
    onsite: copy.rd_modeOnsite,
    hybrid: copy.rd_modeHybrid,
    remote: copy.rd_modeRemote,
  };

  const set = (key) => (event) => {
    const value = event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
  };

  // Validación por paso (mensajes localizados; la lógica dura de longitudes/
  // requeridos vive en validateDesignInput — aquí la versión de UI).
  const validateStep = () => {
    if (step === 0) {
      const nextErrors = {};
      const role = form.role.trim();
      if (!role) nextErrors.role = copy.rd_errorRole;
      else if (role.length > DESIGN_FIELD_LIMITS.role) nextErrors.role = copy.rd_errorRoleMax;
      if (!form.department) nextErrors.department = copy.rd_errorDepartment;
      if (form.location.trim().length > DESIGN_FIELD_LIMITS.location) nextErrors.location = copy.rd_errorLocationMax;
      setErrors(nextErrors);
      return Object.keys(nextErrors).length === 0;
    }
    if (step === 1) {
      const nextErrors = {};
      if (form.profile.trim().length > DESIGN_FIELD_LIMITS.profile) nextErrors.profile = copy.rd_errorProfileMax;
      setErrors(nextErrors);
      return Object.keys(nextErrors).length === 0;
    }
    return true;
  };

  const next = () => {
    if (validateStep()) {
      setErrors({});
      setStep((current) => current + 1);
    }
  };

  const back = () => {
    setErrors({});
    setStep((current) => Math.max(0, current - 1));
  };

  const create = () => {
    try {
      const process = createDraftProcess(form);
      setCreated(process);
    } catch {
      // Barrera defensiva (el store valida otra vez): vuelve al paso 1 con
      // errores visibles.
      setErrors({ role: copy.rd_errorRole, department: copy.rd_errorDepartment });
      setStep(0);
    }
  };

  const reset = () => {
    setCreated(null);
    setForm(INITIAL_FORM);
    setErrors({});
    setStep(0);
  };

  if (created) {
    return (
      <div className="v4-rd">
        <a className="v3-back" href="/empresa/nueva-solicitud">
          <span aria-hidden="true">←</span> {copy.request_back}
        </a>
        <section className="v3-co-panel v4-rd-done" data-testid="v4-rd-done" aria-label={copy.rd_doneTitle}>
          <div className="v4-rd-done-head">
            <span className="v4-rd-done-icon" aria-hidden="true"><IconCheck /></span>
            <div>
              <h2>{copy.rd_doneTitle}</h2>
              <p>
                <strong>{created.role}</strong> · {departmentLabels[created.department]}
                {created.location ? ` · ${created.location}` : ''}
              </p>
            </div>
          </div>
          <p className="v4-rd-done-text">{copy.rd_doneText}</p>
          <div className="v4-rd-actions">
            <button type="button" className="v3-co-text-button" onClick={reset}>
              <span>{copy.rd_createAnother}</span>
            </button>
            <a className="v3-co-primary" href="/empresa/procesos" data-testid="v4-rd-view">
              <span>{copy.rd_viewProcesses}</span>
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

  const hasErrors = Object.values(errors).some(Boolean);

  return (
    <div className="v4-rd">
      <a className="v3-back" href="/empresa/nueva-solicitud">
        <span aria-hidden="true">←</span> {copy.request_back}
      </a>
      <div className="v3-co-page-heading">
        <div>
          <h1>{copy.pages.requestDesign.title}</h1>
          <p>{copy.request_designDescription}</p>
        </div>
      </div>

      <section className="v3-co-panel v4-rd-panel" aria-label={copy[STEP_TITLES[step]]}>
        <p className="v4-rd-progress">{copy.rd_step} {step + 1} / 3</p>
        <h2 className="v4-rd-step-title">{copy[STEP_TITLES[step]]}</h2>
        <p className="v4-rd-step-sub">{copy[STEP_SUBS[step]]}</p>

        {step === 0 ? (
          <>
            <label className="v4-rd-field">
              <span>{copy.rd_role}</span>
              <input
                id="v4-rd-role"
                type="text"
                value={form.role}
                onChange={set('role')}
                placeholder={copy.rd_rolePlaceholder}
                aria-invalid={Boolean(errors.role)}
                aria-describedby={errors.role ? 'v4-rd-errors' : undefined}
              />
            </label>
            <label className="v4-rd-field">
              <span>{copy.rd_department}</span>
              <select
                id="v4-rd-department"
                value={form.department}
                onChange={set('department')}
                aria-invalid={Boolean(errors.department)}
                aria-describedby={errors.department ? 'v4-rd-errors' : undefined}
              >
                <option value="">{copy.rd_departmentPlaceholder}</option>
                {DEMO_DEPARTMENT_IDS.map((id) => (
                  <option key={id} value={id}>{departmentLabels[id]}</option>
                ))}
              </select>
            </label>
            <label className="v4-rd-field">
              <span>{copy.rd_location}</span>
              <input
                id="v4-rd-location"
                type="text"
                value={form.location}
                onChange={set('location')}
                placeholder={copy.rd_locationPlaceholder}
                aria-invalid={Boolean(errors.location)}
                aria-describedby={errors.location ? 'v4-rd-errors' : undefined}
              />
            </label>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <label className="v4-rd-field">
              <span>{copy.rd_mode}</span>
              <select id="v4-rd-mode" value={form.mode} onChange={set('mode')}>
                <option value="onsite">{copy.rd_modeOnsite}</option>
                <option value="hybrid">{copy.rd_modeHybrid}</option>
                <option value="remote">{copy.rd_modeRemote}</option>
              </select>
            </label>
            <label className="v4-rd-field">
              <span>{copy.rd_profile}</span>
              <textarea
                id="v4-rd-profile"
                value={form.profile}
                onChange={set('profile')}
                placeholder={copy.rd_profilePlaceholder}
                aria-invalid={Boolean(errors.profile)}
                aria-describedby={errors.profile ? 'v4-rd-errors' : undefined}
              />
            </label>
          </>
        ) : null}

        {step === 2 ? (
          <div className="v4-rd-review" data-testid="v4-rd-review">
            <h3>{copy.rd_reviewTitle}</h3>
            <dl>
              <div><dt>{copy.rd_role}</dt><dd>{form.role.trim()}</dd></div>
              <div><dt>{copy.rd_department}</dt><dd>{departmentLabels[form.department] ?? form.department}</dd></div>
              <div><dt>{copy.rd_location}</dt><dd>{form.location.trim() || '—'}</dd></div>
              <div><dt>{copy.rd_mode}</dt><dd>{modeLabels[form.mode]}</dd></div>
              {form.profile.trim() ? <div><dt>{copy.rd_profile}</dt><dd>{form.profile.trim()}</dd></div> : null}
            </dl>
            <p className="v4-rd-note"><strong>{copy.company_demoBadge}:</strong> {copy.rd_reviewNote}</p>
          </div>
        ) : null}

        {hasErrors ? (
          <div id="v4-rd-errors" role="alert" className="v4-rd-errors">
            {errors.role ? <p>{errors.role}</p> : null}
            {errors.department ? <p>{errors.department}</p> : null}
            {errors.location ? <p>{errors.location}</p> : null}
            {errors.profile ? <p>{errors.profile}</p> : null}
          </div>
        ) : null}

        <div className="v4-rd-actions">
          {step > 0 ? (
            <button type="button" className="v3-co-text-button" onClick={back}>
              <span>{copy.rd_back}</span>
            </button>
          ) : <span />}
          {step < 2 ? (
            <button type="button" className="v3-co-primary" onClick={next}>
              <span>{copy.rd_next}</span>
            </button>
          ) : (
            <button type="button" className="v3-co-primary" onClick={create}>
              <span>{copy.rd_create}</span>
            </button>
          )}
        </div>
      </section>

      <div className="v3-co-footer">
        <span>{copy.common_footerYear}</span>
        <span>{copy.common_tagline}</span>
      </div>
    </div>
  );
}
