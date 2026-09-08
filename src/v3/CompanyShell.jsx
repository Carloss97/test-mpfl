// t_1c27edbf (V0 fase v3): shell del lado empresa (referencia company.html +
// company.js). Chrome: sidebar (brand → /portal, "Company workspace", nav
// Dashboard/New request/Processes + Settings/Help, user chip demo
// Alex Morgan · Andes Industries · Account↗) + header (menú móvil, breadcrumb
// KRUMM / {sección}, EN|ES, notificaciones, perfil con dropdown) + banner
// "Demo workspace — todos los datos son ficticios" (privacidad: sin datos
// reales, humanReviewOnly).
// El contenido de cada página (V2–V4) entra como children.
import React, { useEffect, useRef, useState } from 'react';
import LanguageToggle from '../i18n/LanguageToggle.jsx';
import { useV3Copy } from './v3Copy.js';
import V3Dialog from './V3Dialog.jsx';

const COMPANY_SIDEBAR_ID = 'v3-company-sidebar';
const COMPANY_MAIN_ID = 'v3-company-main';
const PROFILE_DROPDOWN_ID = 'v3-profile-dropdown';

// Nav de la sidebar (referencia: 3 links + divider + 2 botones "próxima etapa").
// Los hrefs son las rutas de la fase (v3Routes.js); el estado activo lo da la ruta.
const NAV_LINKS = [
  { id: 'dashboard', href: '/empresa', copyKey: 'company_dashboard', icon: <IconGrid /> },
  { id: 'newRequest', href: '/empresa/nueva-solicitud', copyKey: 'company_newRequest', icon: <IconPlus /> },
  { id: 'processes', href: '/empresa/procesos', copyKey: 'company_processes', icon: <IconFolder /> },
];

function IconGrid() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function IconFolder() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7V5h7l2 3h9v12H3Z" />
    </svg>
  );
}

function IconGear() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2" />
    </svg>
  );
}

function IconHelp() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5m0 3h.01" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5ZM10 21h4" />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export default function CompanyShell({ section, active, children }) {
  const copy = useV3Copy();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [dialog, setDialog] = useState(null); // { title, text } | null
  const sidebarRef = useRef(null);
  const menuButtonRef = useRef(null);
  const profileMenuRef = useRef(null);
  const profileButtonRef = useRef(null);

  const openDialog = (title, text) => setDialog({ title, text });

  // Menú móvil (referencia company.js): Escape cierra y devuelve focus al
  // trigger; click fuera de sidebar/menú cierra; navegar cierra.
  useEffect(() => {
    if (!sidebarOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSidebarOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    const onMouseDown = (event) => {
      if (sidebarRef.current?.contains(event.target) || menuButtonRef.current?.contains(event.target)) return;
      setSidebarOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [sidebarOpen]);

  // Dropdown del perfil (referencia company.js): click fuera / Escape cierran.
  useEffect(() => {
    if (!profileOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setProfileOpen(false);
        profileButtonRef.current?.focus();
      }
    };
    const onMouseDown = (event) => {
      if (profileMenuRef.current?.contains(event.target)) return;
      setProfileOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [profileOpen]);

  return (
    <div className="v3-company">
      <a className="v3-skip" href={`#${COMPANY_MAIN_ID}`}>{copy.common_skipContent}</a>

      <aside
        ref={sidebarRef}
        id={COMPANY_SIDEBAR_ID}
        className={`v3-co-sidebar${sidebarOpen ? ' is-open' : ''}`}
      >
        <a className="v3-co-brand" href="/portal" aria-label={copy.common_logoAlt}>
          <img src="/assets/krumm-logo-borderless-no-text.png" alt={copy.common_logoAlt} />
        </a>
        <p className="v3-co-workspace">{copy.company_workspace}</p>
        <nav className="v3-co-navigation" aria-label={copy.company_portalNavigation}>
          {NAV_LINKS.map((item) => (
            <a
              key={item.id}
              className={`v3-co-nav-item${active === item.id ? ' is-active' : ''}`}
              href={item.href}
              aria-current={active === item.id ? 'page' : undefined}
              onClick={() => setSidebarOpen(false)}
            >
              {item.icon}
              <span>{copy[item.copyKey]}</span>
            </a>
          ))}
          <div className="v3-co-nav-divider" role="presentation" />
          <button type="button" className="v3-co-nav-item" onClick={() => openDialog(copy.company_settings, copy.company_previewText)}>
            <IconGear />
            <span>{copy.company_settings}</span>
          </button>
          <button type="button" className="v3-co-nav-item" onClick={() => openDialog(copy.company_help, copy.company_previewText)}>
            <IconHelp />
            <span>{copy.company_help}</span>
          </button>
        </nav>
        <div className="v3-co-sidebar-bottom">
          <div className="v3-co-user">
            <span className="v3-co-avatar" aria-hidden="true">{copy.company_userInitials}</span>
            <div>
              <strong>{copy.company_userName}</strong>
              <small>{copy.company_userOrg}</small>
            </div>
          </div>
          <button type="button" className="v3-co-account" onClick={() => openDialog(copy.company_account, copy.company_accountText)}>
            <span>{copy.company_account}</span>
            <span aria-hidden="true">↗</span>
          </button>
        </div>
      </aside>

      <div className="v3-co-layout">
        <header className="v3-co-header">
          <button
            type="button"
            ref={menuButtonRef}
            className="v3-co-menu"
            aria-expanded={sidebarOpen}
            aria-controls={COMPANY_SIDEBAR_ID}
            aria-label={copy.company_openNavigation}
            onClick={() => setSidebarOpen((open) => !open)}
          >
            <IconMenu />
          </button>
          <nav className="v3-co-breadcrumb" aria-label={copy.company_breadcrumb}>
            <span data-testid="v3-breadcrumb-root">{copy.common_krumm}</span>
            <span aria-hidden="true">/</span>
            <span aria-current="page" data-testid="v3-breadcrumb-current">{section}</span>
          </nav>
          <div className="v3-co-header-actions">
            <LanguageToggle />
            <button
              type="button"
              className="v3-co-icon-button"
              aria-label={copy.company_notifications}
              onClick={() => openDialog(copy.company_notifications, copy.company_notificationsText)}
            >
              <IconBell />
            </button>
            <div ref={profileMenuRef} className="v3-co-profile-menu">
              <button
                type="button"
                ref={profileButtonRef}
                className="v3-co-avatar v3-co-profile"
                aria-expanded={profileOpen}
                aria-controls={PROFILE_DROPDOWN_ID}
                aria-label={copy.company_account}
                onClick={() => setProfileOpen((open) => !open)}
              >
                {copy.company_userInitials}
              </button>
              {profileOpen ? (
                <div className="v3-co-profile-dropdown" id={PROFILE_DROPDOWN_ID} role="menu" aria-label={copy.company_account}>
                  <a href="/portal" onClick={() => setProfileOpen(false)}>{copy.company_signOut}</a>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="v3-co-main" id={COMPANY_MAIN_ID} tabIndex={-1}>
          <div className="v3-co-demo-note">
            <span className="v3-co-demo-badge">{copy.company_demoBadge}</span>
            <span>{copy.company_demoNotice}</span>
          </div>
          {children}
        </main>
      </div>

      <V3Dialog
        open={Boolean(dialog)}
        title={dialog?.title ?? ''}
        text={dialog?.text ?? ''}
        onClose={() => setDialog(null)}
        closeLabel={copy.common_close}
        labelId="v3-co-dialog-title"
        descId="v3-co-dialog-desc"
      />
    </div>
  );
}
