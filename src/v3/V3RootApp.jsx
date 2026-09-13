// t_1c27edbf (V0 fase v3): raiz de las rutas de la fase. main.jsx despacha
// aquí cuando resolveV3Route(pathname) matcha; este componente monta el shell
// correcto (candidate / company / portal / companyLogin) con el contenido de
// la página.
// t_482f57b2 (V1): lado candidato real — /candidato (CandidateHomePage,
// 2 cards de la referencia) y /candidato/acceso (CandidateAccessPage, form →
// guard de invitación de /postulaciones); /empleos sigue placeholder honesto
// (igual que jobs.html de la referencia).
// t_90a5157c (V2): lado empresa real — /empresa (CompanyDashboardPage: KPIs +
// tabla de procesos) y /empresa/procesos (CompanyProcessesPage: búsqueda +
// filtros + sort funcionales, patrón processes.js de la referencia). El hook
// useCompanyData corre en CompanyWorkspace (un fetch por mount) y el source
// decide el banner del shell (demo | loading | real).
// t_84f00355 (V3): /empresa/proceso/:id (CompanyProcessDetailPage: 3 perfiles
// demo de la referencia + acciones preview) y /empresa/proceso/:id/candidatos/
// :sessionId (CompanyProcessReportPage: reporte embebido, mismo motor H4.3).
// t_9319e84d (V4): /empresa/nueva-solicitud (CompanyNewRequestPage: 2 cards),
// /diseño (CompanyRequestDesignPage: formulario guiado → proceso draft en el
// store solo-memoria) y /subida (CompanyRequestUploadPage: upload validado →
// metadatos + confirmación, sin NLP).
//
// Las páginas bare (/portal y /empresa/acceso) replican el chrome estático de
// la referencia (portal.html, login-company.html): brand + toggle + main.
import React, { useEffect, useState } from 'react';
import LanguageToggle from '../i18n/LanguageToggle.jsx';
import { useV3Copy } from './v3Copy.js';
import { resolveV3Route, V3_SHELLS } from './v3Routes.js';
import CandidateShell from './CandidateShell.jsx';
import CompanyShell from './CompanyShell.jsx';
import V3Placeholder from './V3Placeholder.jsx';
import {
  beginCognitoLogin,
  clearAuth,
  cognitoLogoutUrl,
  getStoredAuth,
  handleAuthCallback,
} from './cognitoAuth.js';
import CandidateHomePage from './CandidateHomePage.jsx';
import CandidateAccessPage from './CandidateAccessPage.jsx';
import CompanyDashboardPage from './CompanyDashboardPage.jsx';
import CompanyProcessesPage from './CompanyProcessesPage.jsx';
import CompanyProcessDetailPage from './CompanyProcessDetailPage.jsx';
import CompanyProcessReportPage from './CompanyProcessReportPage.jsx';
import CompanyNewRequestPage from './CompanyNewRequestPage.jsx';
import CompanyRequestDesignPage from './CompanyRequestDesignPage.jsx';
import CompanyRequestUploadPage from './CompanyRequestUploadPage.jsx';
import { useCompanyData } from './useCompanyData.js';
import JobsPage from './JobsPage.jsx';
import JobDetailPage from './JobDetailPage.jsx';
import './v3Shells.css';

function IconBuilding() {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 27V5h14v22M21 13h5v14M4 27h25M12 27v-6h4v6M11 10h2m3 0h1m-6 5h2m3 0h1" />
    </svg>
  );
}

function IconPerson() {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="16" cy="10" r="5" />
      <path d="M6 27v-3a10 10 0 0 1 20 0v3M11 27h10" />
    </svg>
  );
}

// /portal — selección de portal (referencia portal.html, estática: 2 cards).
function PortalPage() {
  const copy = useV3Copy();
  const page = copy.pages.portal;
  return (
    <div className="v3-bare v3-portal">
      <a className="v3-skip" href="#v3-portal-main">{copy.common_skipContent}</a>
      <header className="v3-bare-header">
        <a className="v3-bare-brand" href="/" aria-label={copy.common_logoAlt}>
          <img src="/assets/krumm-logo-borderless-no-text.png" alt={copy.common_logoAlt} />
        </a>
        <LanguageToggle />
      </header>
      <main className="v3-bare-main" id="v3-portal-main" tabIndex={-1}>
        <div className="v3-portal-intro">
          <h1>{page.title}</h1>
          <p>{page.subtitle}</p>
        </div>
        <div className="v3-portal-grid">
          <a
            className="v3-portal-card"
            href="/empresa/acceso"
            aria-labelledby="v3-portal-company-title"
            aria-describedby="v3-portal-company-desc"
          >
            <span className="v3-portal-symbol" aria-hidden="true"><IconBuilding /></span>
            <span className="v3-portal-label">{copy.portal_companies}</span>
            <h2 id="v3-portal-company-title">{copy.portal_company}</h2>
            <p id="v3-portal-company-desc">{copy.portal_companyDescription}</p>
            <span className="v3-portal-cta">{copy.portal_companyCta}</span>
          </a>
          <a
            className="v3-portal-card"
            href="/candidato"
            aria-labelledby="v3-portal-candidate-title"
            aria-describedby="v3-portal-candidate-desc"
          >
            <span className="v3-portal-symbol" aria-hidden="true"><IconPerson /></span>
            <span className="v3-portal-label">{copy.portal_candidates}</span>
            <h2 id="v3-portal-candidate-title">{copy.portal_candidate}</h2>
            <p id="v3-portal-candidate-desc">{copy.portal_candidateDescription}</p>
            <span className="v3-portal-cta">{copy.portal_candidateCta}</span>
          </a>
        </div>
        <a className="v3-back v3-back--bare" href="/">{copy.common_backHome}</a>
      </main>
    </div>
  );
}

// /empresa/acceso — LOGIN REAL empresa (A.2, KRU-113): Cognito code flow +
// PKCE (cognitoAuth.js). Al retornar (?code=&state=) se hace el exchange, se
// persiste en sessionStorage y se navega a /empresa (useCompanyData usa el
// token como Bearer). Se conserva el acceso demo público (showcase krumm.cl):
// "Explorar demo" → /empresa sin auth (fuente demo si la API exige token).
function CompanyLoginPage() {
  const copy = useV3Copy();
  const page = copy.pages.companyAccess;
  const [authed, setAuthed] = useState(() => getStoredAuth());
  const [authError, setAuthError] = useState(false);
  const [busy, setBusy] = useState(false);

  // Retorno del hosted UI: ?code=&state= (o ?error=). Exchange + store +
  // navegación a /empresa; en fallo, estado de error visible con reintento.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const stateParam = params.get('state');
    if (code && stateParam) {
      setBusy(true);
      handleAuthCallback({
        searchParams: params,
        navigate: (to) => { window.location.replace(to); },
      }).then((out) => {
        setAuthed(getStoredAuth());
        setAuthError(!out.ok);
        setBusy(false);
      });
      return undefined;
    }
    if (params.get('error')) setAuthError(true);
    return undefined;
  }, []);

  const startLogin = () => {
    if (typeof window === 'undefined') return;
    setBusy(true);
    beginCognitoLogin({
      origin: window.location.origin,
      navigate: (url) => { window.location.assign(url); },
    }).catch(() => {
      setBusy(false);
      setAuthError(true);
    });
  };

  const doLogout = () => {
    clearAuth();
    setAuthed(null);
    setAuthError(false);
    window.location.assign(cognitoLogoutUrl());
  };

  return (
    <div className="v3-bare v3-company-login">
      <a className="v3-skip" href="#v3-company-login-main">{copy.common_skipContent}</a>
      <header className="v3-bare-header">
        <a className="v3-bare-brand" href="/" aria-label={copy.common_logoAlt}>
          <img src="/assets/krumm-logo-borderless-no-text.png" alt={copy.common_logoAlt} />
        </a>
        <LanguageToggle />
      </header>
      <main className="v3-bare-main" id="v3-company-login-main" tabIndex={-1}>
        {authError ? (
          <div className="v3-portal-intro" role="alert">
            <h1>{page.errorTitle}</h1>
            <p>{page.errorText}</p>
          </div>
        ) : (
          <div className="v3-portal-intro">
            <span className="v3-portal-label">{page.accessLabel}</span>
            <h1>{page.title}</h1>
            <p>{page.loginSubtitle}</p>
          </div>
        )}
        <div className="v3-company-login-actions">
          {authed && !authError ? (
            <>
              <a className="v3-cta-gold" href="/empresa" data-testid="v3-company-authed-cta">{page.authedCta}</a>
              <button type="button" className="v3-co-text-button" onClick={doLogout} data-testid="v3-company-logout">
                <span>{page.logoutCta}</span>
              </button>
            </>
          ) : (
            <>
              <button type="button" className="v3-cta-gold" onClick={startLogin} disabled={busy} data-testid="v3-company-login">
                {busy ? page.loginBusy : page.loginCta}
              </button>
              <a className="v3-co-text-button" href="/empresa" data-testid="v3-company-demo">
                <span>{page.demoCta}</span>
              </a>
            </>
          )}
        </div>
        <a className="v3-back v3-back--bare" href="/portal">{page.backLabel}</a>
      </main>
    </div>
  );
}

// /empresa* — workspace empresa (V2). useCompanyData corre aquí (no en cada
// página): un fetch por mount, y el source decide el banner del shell:
// real → "Sesiones reales (staging)" + aviso humanReviewOnly; checking →
// "Cargando sesiones…"; demo → el banner default de V0 (no se pasa note).
// t_84f00355 (V3): detail/report también consumen el data (fetch habilitado
// para esas rutas: el detalle real agrupa por rol y el reporte usa las filas).
function CompanyWorkspace({ route, params } = {}) {
  const copy = useV3Copy();
  const needsData = ['dashboard', 'processes', 'processDetail', 'processReport'].includes(route.page);
  const data = useCompanyData({ enabled: needsData });
  const note = data.source === 'real'
    ? { badge: copy.company_liveBadge, text: copy.company_liveNotice }
    : data.source === 'checking'
      ? { badge: copy.company_demoBadge, text: copy.company_loading }
      : undefined;
  const page = copy.pages[route.page];
  let content;
  if (route.page === 'dashboard') {
    content = <CompanyDashboardPage data={data} />;
  } else if (route.page === 'processes') {
    content = <CompanyProcessesPage data={data} />;
  } else if (route.page === 'processDetail') {
    content = <CompanyProcessDetailPage data={data} processId={params?.id ?? ''} />;
  } else if (route.page === 'processReport') {
    content = (
      <CompanyProcessReportPage
        data={data}
        processId={params?.id ?? ''}
        sessionId={params?.sessionId ?? ''}
      />
    );
  } else if (route.page === 'newRequest') {
    // V4 (t_9319e84d): hub new request — 2 cards (upload / design). No
    // consume /sessions (solo navega a las 2 vistas).
    content = <CompanyNewRequestPage />;
  } else if (route.page === 'requestDesign') {
    // V4: formulario guiado → crea proceso draft en el store (solo memoria);
    // no consume /sessions.
    content = <CompanyRequestDesignPage />;
  } else if (route.page === 'requestUpload') {
    // V4: upload validado → metadatos + confirmación (sin NLP, sin backend).
    content = <CompanyRequestUploadPage />;
  } else {
    content = (
      <V3Placeholder
        page={page}
        eyebrow={copy.company_eyebrow}
        backTo={route.page === 'dashboard' ? null : '/empresa'}
        backLabel={page.backLabel}
      />
    );
  }
  return (
    <CompanyShell section={copy[route.sectionKey]} active={route.navActive} note={note}>
      {content}
    </CompanyShell>
  );
}

export default function V3RootApp() {
  const copy = useV3Copy();
  const resolved = resolveV3Route(typeof window === 'undefined' ? '/' : window.location.pathname);

  if (!resolved) {
    // main.jsx solo despacha aquí cuando la ruta matcha; guard defensivo.
    return (
      <div className="v3-bare">
        <main className="v3-bare-main" id="v3-fallback-main" tabIndex={-1}>
          <h1>{copy.common_krumm}</h1>
          <a className="v3-back v3-back--bare" href="/">{copy.common_backHome}</a>
        </main>
      </div>
    );
  }

  const page = copy.pages[resolved.page];

  if (resolved.shell === V3_SHELLS.CANDIDATE) {
    // t_482f57b2 (V1): /candidato (home, 2 cards de la referencia) y
    // /candidato/acceso (form → guard de invitación de /postulaciones) son
    // páginas reales; /empleos (JobsPage) y /empleos/:slug (JobDetailPage)
    // son páginas reales con datos de jobsData.js (t_7aad621f FASE A.3).
    let content;
    if (resolved.page === 'candidateHome') {
      content = <CandidateHomePage />;
    } else if (resolved.page === 'candidateAccess') {
      content = <CandidateAccessPage />;
    } else if (resolved.page === 'jobs') {
      content = <JobsPage />;
    } else if (resolved.page === 'jobDetail') {
      content = <JobDetailPage params={resolved.params} />;
    } else {
      content = (
        <V3Placeholder
          page={page}
          eyebrow={copy.cp_eyebrow}
          backTo={resolved.page === 'candidateHome' ? null : '/candidato'}
          backLabel={page.backLabel}
        />
      );
    }
    return (
      <CandidateShell breadcrumb={copy[resolved.route.breadcrumbKey]}>
        {content}
      </CandidateShell>
    );
  }

  if (resolved.shell === V3_SHELLS.COMPANY) {
    // t_90a5157c (V2): dashboard y procesos son páginas reales;
    // t_84f00355 (V3): detalle de proceso + reporte de candidato embebido son
    // páginas reales (motor H4.3); t_9319e84d (V4): new request (hub + diseño
    // + upload) son páginas reales (store solo-memoria; CompanyWorkspace
    // resuelve el contenido y el banner según la fuente de datos).
    return <CompanyWorkspace route={resolved.route} params={resolved.params} />;
  }

  if (resolved.shell === V3_SHELLS.PORTAL) {
    return <PortalPage />;
  }

  return <CompanyLoginPage />;
}
