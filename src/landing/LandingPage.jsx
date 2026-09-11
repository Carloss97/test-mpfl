import React, { useEffect, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import LanguageToggle from '../i18n/LanguageToggle.jsx';
import './landing.css';

/* ── Íconos lineales (stroke currentColor, sin relleno) ─────────────────── */
const iconProps = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: 'false',
};

function IconBuilding() {
  return (
    <svg {...iconProps}>
      <path d="M4 21 V7.5 L10 4 V21" />
      <path d="M10 21 V10.5 H20 V21" />
      <path d="M3 21 H21" />
      <path d="M6.7 10.5 H8.2 M6.7 14 H8.2" />
      <path d="M13.4 13.6 H14.9 M16.8 13.6 H18.3 M13.4 17 H14.9 M16.8 17 H18.3" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5.4 20 C5.4 15.9 8.4 14.3 12 14.3 C15.6 14.3 18.6 15.9 18.6 20" />
    </svg>
  );
}

function IconGamepad() {
  return (
    <svg {...iconProps}>
      <rect x="2.5" y="8" width="19" height="10.5" rx="5.25" />
      <path d="M7 11.4 V15 M5.3 13.2 H8.7" />
      <circle cx="15.4" cy="12" r="0.4" />
      <circle cx="17.6" cy="14.2" r="0.4" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg {...iconProps}>
      <path d="M12 3 L19 5.8 V11 C19 15.8 16.1 19.3 12 20.8 C7.9 19.3 5 15.8 5 11 V5.8 Z" />
      <path d="M9.2 11.6 L11.2 13.6 L15 9.6" />
    </svg>
  );
}

function IconEye() {
  return (
    <svg {...iconProps}>
      <path d="M2.8 12 C5.2 7.6 8.4 5.6 12 5.6 C15.6 5.6 18.8 7.6 21.2 12 C18.8 16.4 15.6 18.4 12 18.4 C8.4 18.4 5.2 16.4 2.8 12 Z" />
      <circle cx="12" cy="12" r="3.1" />
    </svg>
  );
}

function IconClipboard() {
  return (
    <svg {...iconProps}>
      <rect x="5.5" y="5" width="13" height="16.5" rx="2" />
      <path d="M9 5 V3.4 H15 V5" />
      <path d="M9 13.4 L11 15.4 L15 11.4" />
    </svg>
  );
}

/**
 * Landing pública KRUMM — port del diseño de marca v2 (2026-09-07).
 * Referencia: ~/krumm/design_ref/Landing pge Krumm/ (krumm_frontend.zip).
 * Tokens: src/styles/krumm-tokens.css (paleta beige/crema/arena/marrón/dorado,
 * Archivo display + Manrope body). Se conservan: anclas, i18n (t()), CTAs
 * (/candidato, /empresa/acceso, emails — cutover V5 t_0184d2e6), accesibilidad
 * (h1 único, nav/main/footer etiquelados, skip link) y menú móvil.
 */
export default function LandingPage() {
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const year = new Date().getFullYear();
  const closeMenu = () => setMenuOpen(false);

  // Scroll suave scoped a la ruta landing (anclas #producto, #contacto,
  // #accesos, etc.). Se limpia en unmount para no afectar a otras rutas
  // (2026-09-11).
  useEffect(() => {
    const root = document.documentElement;
    root.style.scrollBehavior = 'smooth';
    return () => {
      root.style.scrollBehavior = '';
    };
  }, []);

  return (
    <div className="landing">
      <a className="landing__skip" href="#contenido">
        {t('Saltar al contenido', 'Skip to content')}
      </a>

      {/* ── Header (referencia: brand grande + nav centrada + actions + EN|ES) ── */}
      <header className="landing__topbar">
        <a className="landing__brand" href="/" aria-label={t('KRUMM - Inicio', 'KRUMM - Home')} onClick={closeMenu}>
          <img
            className="landing__brand-logo"
            src="/assets/krumm-logo-borderless-no-text.png"
            alt=""
            width="152"
            height="152"
          />
        </a>

        <nav
          id="main-nav"
          className={`landing__nav${menuOpen ? ' landing__nav--open' : ''}`}
          aria-label={t('Navegación principal', 'Main navigation')}
        >
          <a href="#producto" onClick={closeMenu}>{t('Producto', 'Product')}</a>
          <a href="#como-funciona" onClick={closeMenu}>{t('Cómo funciona', 'How it works')}</a>
          <a href="#tecnologia" onClick={closeMenu}>{t('Tecnología', 'Technology')}</a>
          <a href="#contacto" onClick={closeMenu}>{t('Contacto', 'Contact')}</a>
        </nav>

        {/* Fix 2026-09-11: "Iniciar sesión" ocupa el slot donde estaba el CTA
            "Solicitar demo" (eliminado de la topbar; sigue en la sección
            HABLEMOS/cierre). v2 (2026-09-11): estilo CTA gold completo
            (gradiente + sombra + flecha), mismo lenguaje que el hero. */}
        <div className="landing__header-actions">
          <a className="landing__cta landing__cta--gold landing__cta--sm landing__nav-login" href="#accesos" onClick={closeMenu}>
            {t('Iniciar sesión', 'Log in')}
            <svg className="landing__nav-login-arrow" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 12h15M13 6l6 6-6 6" />
            </svg>
          </a>
        </div>

        <LanguageToggle />

        <button
          type="button"
          className="landing__menu-button"
          aria-label={menuOpen ? t('Cerrar menú', 'Close menu') : t('Abrir menú', 'Open menu')}
          aria-expanded={menuOpen}
          aria-controls="main-nav"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {/* SVG inline en vez del glifo unicode ☰ (caja .notdef en env. sin fuente de símbolos).
              Clases --1/--2/--3 para el morph hamburguesa→X animado (2026-09-11). */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path className="landing__menu-line landing__menu-line--1" d="M4 6.5h16" />
            <path className="landing__menu-line landing__menu-line--2" d="M4 12h16" />
            <path className="landing__menu-line landing__menu-line--3" d="M4 17.5h16" />
          </svg>
        </button>
      </header>

      <main id="contenido" className="landing__main">
        {/* ── Hero (referencia: grid lines + glow dorado + H1 Archivo 900 + foto) ── */}
        <section className="landing__hero" aria-labelledby="landing-hero-title">
          <div className="landing__hero-grid" aria-hidden="true" />
          <div className="landing__hero-content">
            <span className="landing__eyebrow">
              <i className="landing__eyebrow-dot" aria-hidden="true" />
              {t('EDGE-AI · GAMIFICACIÓN · PRIVACY BY DESIGN', 'EDGE-AI · GAMIFICATION · PRIVACY BY DESIGN')}
            </span>
            <h1 id="landing-hero-title">
              <span>{t('El talento', 'Talent')}{' '}</span>
              <br />
              <span>{t('no se declara.', "isn't claimed.")}{' '}</span>
              <br />
              <em className="landing__accent">{t('Se demuestra.', "It's proven.")}</em>
            </h1>
            <p className="landing__hero-copy">
              {t(
                'KRUMM revela la capacidad real de cada candidato mediante simulaciones gamificadas y telemetría conductual procesada con Edge-AI directamente en el navegador — sin datos biométricos en la nube, sin sesgos, sin CVs generados por IA.',
                "KRUMM reveals each candidate's true capability through gamified simulations and behavioral telemetry processed with Edge-AI directly in the browser — no biometric data in the cloud, no bias, no AI-generated CVs.",
              )}
            </p>
            <div className="landing__hero-buttons">
              <a className="landing__cta landing__cta--gold" href="/candidato">
                {t('Acceso candidatos', 'Candidate access')}
              </a>
              <a className="landing__cta landing__cta--outline" href="#como-funciona">
                <span className="landing__play" aria-hidden="true">
                  {/* SVG inline en vez del glifo unicode ▶ (caja .notdef en env. sin fuente de símbolos) */}
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
                {t('Ver cómo funciona', 'See how it works')}
              </a>
            </div>
            <ul className="landing__proof-row">
              {/* Checks SVG inline en vez del glifo unicode ✓ (caja .notdef en env. sin fuente de símbolos) */}
              <li><b aria-hidden="true"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg></b>{t('EDGE-AI EN EL NAVEGADOR', 'EDGE-AI IN YOUR BROWSER')}</li>
              <li><b aria-hidden="true"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg></b>{t('PRIVACY BY DESIGN', 'PRIVACY BY DESIGN')}</li>
              <li><b aria-hidden="true"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg></b>{t('EVALUACIÓN CONDUCTUAL INMERSIVA', 'IMMERSIVE BEHAVIORAL ASSESSMENT')}</li>
            </ul>
          </div>

          {/* Visual: foto de marca (referencia) con glow difuminado */}
          <div className="landing__hero-visual">
            <img
              className="landing__hero-photo"
              src="/assets/hero-photo.jpg"
              alt={t('Equipo utilizando la tecnología KRUMM', 'Team using KRUMM technology')}
            />
          </div>
        </section>

        {/* ── 01 · Cómo funciona (crema) ── */}
        <section
          id="como-funciona"
          className="landing__section landing__section--light"
          aria-label={t('Cómo funciona', 'How it works')}
        >
          <div className="landing__container">
            <div className="landing__section-head">
              <span className="landing__kicker">{t('01 · CÓMO FUNCIONA', '01 · HOW IT WORKS')}</span>
              <h2 className="landing__section-title">{t('Evalúa lo que un CV no puede mostrar.', 'Assess what a CV cannot show.')}</h2>
              <p className="landing__section-lead">
                {t(
                  'KRUMM transforma evaluaciones tradicionales en experiencias gamificadas capaces de capturar cómo piensa, decide y actúa una persona frente a distintos desafíos.',
                  'KRUMM turns traditional assessments into gamified experiences that capture how a person thinks, decides, and acts facing different challenges.',
                )}
              </p>
            </div>
            <ol className="landing__steps">
              <li>{t('La persona accede al portal de evaluación y activa la cámara si es necesaria.', 'The person accesses the evaluation portal and enables the camera if needed.')}</li>
              <li>{t('Juega a una batería de juegos gamificados; las métricas se recopilan localmente.', 'They play a battery of gamified games; metrics are gathered locally.')}</li>
              <li>{t('KRUMM procesa en local → genera un reporte para revisión humana.', 'KRUMM processes locally → generates a report for human review.')}</li>
              <li>{t('El reclutador revisa en el workspace de empresa, ve la evidencia y toma una decisión contextualizada.', 'The recruiter reviews the company workspace, sees the evidence, and makes a grounded decision.')}</li>
            </ol>
          </div>
        </section>

        {/* ── 02 · Tecnología (arena) ── */}
        <section
          id="tecnologia"
          className="landing__section landing__section--sand"
          aria-label={t('Tecnología', 'Technology')}
        >
          <div className="landing__container">
            <div className="landing__section-head">
              <span className="landing__kicker">{t('02 · TECNOLOGÍA', '02 · TECHNOLOGY')}</span>
              <h2 className="landing__section-title">{t('Edge-AI + gamificación + psicometría.', 'Edge-AI + gamification + psychometrics.')}</h2>
              <p className="landing__section-lead">
                {t(
                  'Nuestra tecnología procesa la interacción del candidato directamente en el navegador para generar información conductual de alto valor sin depender de datos biométricos almacenados en la nube.',
                  "Our technology processes the candidate's interaction directly in the browser to generate high-value behavioral information without relying on biometric data stored in the cloud.",
                )}
              </p>
            </div>
          </div>
        </section>

        {/* ── 03 · Producto: "Qué hacemos" (beige, cards) ── */}
        <section
          id="producto"
          className="landing__section landing__section--beige"
          aria-label={t('Producto', 'Product')}
        >
          <div className="landing__container">
            <div className="landing__section-head">
              <span className="landing__kicker">{t('03 · PRODUCTO', '03 · PRODUCT')}</span>
              <h2 className="landing__section-title">{t('Qué hacemos', 'What we do')}</h2>
              <p className="landing__section-lead">
                {t('Evaluación gamificada con privacidad por diseño y revisión humana al centro.', 'Gamified assessment with privacy by design and human review at the core.')}
              </p>
            </div>
            <div className="landing__cards-grid">
              <article className="landing__card">
                <span className="landing__card-icon"><IconGamepad /></span>
                <h3>{t('Evaluación basada en juegos', 'Game-based assessment')}</h3>
                <p>{t('Baterías gamificadas que miden competencias en contexto, no cuestionarios estáticos. Métricas agregadas, no datos crudos.', 'Game-based batteries measuring competencies in context, not static questionnaires. Aggregated metrics, no raw data.')}</p>
              </article>
              <article className="landing__card">
                <span className="landing__card-icon"><IconShield /></span>
                <h3>{t('Privacidad by design', 'Privacy by design')}</h3>
                <p>{t('Procesamiento local: video opcional, sin persistencia de imágenes, landmarks o rutas. Solo señales agregadas para revisión humana.', 'Local processing: optional video, no image/landmark/route persistence. Only aggregate signals for human review.')}</p>
              </article>
              <article className="landing__card">
                <span className="landing__card-icon"><IconEye /></span>
                <h3>{t('Revisión humana al centro', 'Human review at the core')}</h3>
                <p>{t('Los reportes son herramientas para humanos, no decisiones automáticas. En KRUMM siempre hay una persona revisando el resultado.', 'Reports are human tools, not automated decisions. At KRUMM a person always reviews the outcome.')}</p>
              </article>
              <article className="landing__card">
                <span className="landing__card-icon"><IconClipboard /></span>
                <h3>{t('Rigor técnico', 'Technical rigor')}</h3>
                <p>{t('Informes con validación de integridad, límites explícitos y caveats. Nada de “score confiable” sin evidencia ni contexto.', 'Reports with integrity validation, explicit limits and caveats. No “confident score” without evidence and context.')}</p>
              </article>
            </div>
          </div>
        </section>

        {/* ── Accesos (oscuro: ¿Dónde quieres ingresar?) ── */}
        <section id="accesos" className="landing__section landing__section--accesos" aria-labelledby="accesos-title">
          <div className="landing__container">
            <h2 id="accesos-title" className="landing__accesos-title">{t('¿Dónde quieres ingresar?', 'Where do you want to sign in?')}</h2>
            <p className="landing__accesos-sub">{t('Accede a tu espacio KRUMM.', 'Access your KRUMM space.')}</p>
            <div className="landing__accesos-grid">
              <article className="landing__acceso-card landing__acceso-card--empresa">
                <span className="landing__icon-box"><IconBuilding /></span>
                <span className="landing__acceso-kicker">{t('EMPRESAS', 'COMPANIES')}</span>
                <h3>{t('Portal para empresas', 'Portal for companies')}</h3>
                <p>{t('Gestiona procesos de evaluación, candidatos, resultados y equipos.', 'Manage assessment processes, candidates, results, and teams.')}</p>
                <span className="landing__acceso-divider" aria-hidden="true" />
                <a className="landing__acceso-cta" href="/empresa/acceso">
                  {t('Ingresar como empresa', 'Sign in as a company')} <span aria-hidden="true">→</span>
                </a>
              </article>
              <article className="landing__acceso-card landing__acceso-card--candidato">
                <span className="landing__icon-box"><IconUser /></span>
                <span className="landing__acceso-kicker">{t('CANDIDATOS', 'CANDIDATES')}</span>
                <h3>{t('Portal para candidatos', 'Portal for candidates')}</h3>
                <p>{t('Accede a tus evaluaciones y experiencias KRUMM.', 'Access your assessments and KRUMM experiences.')}</p>
                <span className="landing__acceso-divider" aria-hidden="true" />
                <a className="landing__acceso-cta" href="/candidato">
                  {t('Ingresar como candidato', 'Sign in as a candidate')} <span aria-hidden="true">→</span>
                </a>
              </article>
            </div>
            <a className="landing__volver" href="/">
              <span aria-hidden="true">←</span> {t('Volver a KRUMM', 'Back to KRUMM')}
            </a>
          </div>
        </section>

        {/* ── Cierre HABLEMOS + contacto (oscuro, CTA gold) ── */}
        <section id="contacto" className="landing__section landing__section--cierre" aria-labelledby="contacto-title">
          <div className="landing__container landing__cierre-grid">
            <div className="landing__cierre-copy">
              <span className="landing__kicker landing__kicker--dark">{t('HABLEMOS', "LET'S TALK")}</span>
              <h2 id="contacto-title" className="landing__cierre-title">
                {t('Descubre qué puede medir KRUMM en tu organización.', 'Discover what KRUMM can measure in your organization.')}
              </h2>
              <p className="landing__cierre-sub">{t('¿Preguntas sobre la plataforma o sobre una prueba?', 'Questions about the platform or a test?')}</p>
              <ul className="landing__contact-list">
                <li>
                  <strong>{t('Candidatos e incidencias técnicas', 'Candidates & technical issues')}</strong>
                  <a href="mailto:contacto@krumm.cl">contacto@krumm.cl</a>
                </li>
              </ul>
              <p className="landing__note">
                {t('Tecnología de evaluación humana desarrollada en Chile. La cámara y las señales biométricas son opcionales y no se utilizan para decisiones finales.', 'Human evaluation technology developed in Chile. Camera and biometric signals are optional and never drive final decisions.')}
              </p>
            </div>
            <div className="landing__cierre-cta">
              <a className="landing__cta landing__cta--gold" href="mailto:carlossaldivia@krumm.cl">{t('Solicitar demo', 'Request a demo')}</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing__footer">
        <div className="landing__container landing__footer-inner">
          <span>{t('©', '©')} {year} KRUMM</span>
          <span>{t('Tecnología para la evaluación de talento', 'Technology for talent assessment')}</span>
        </div>
      </footer>
    </div>
  );
}
