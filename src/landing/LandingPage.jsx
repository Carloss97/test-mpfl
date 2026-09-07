import React from 'react';
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

function IconPlay() {
  return (
    <svg {...iconProps} width={20} height={20}>
      <circle cx="12" cy="12" r="9.25" />
      <path d="M10.2 8.8 L15 12 L10.2 15.2 Z" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg {...iconProps} width={18} height={18}>
      <circle cx="12" cy="12" r="9.25" />
      <path d="M8.2 12.3 L10.8 14.8 L15.8 9.4" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg {...iconProps} width={22} height={22}>
      <path d="M12 3 L19 5.8 V11 C19 15.8 16.1 19.3 12 20.8 C7.9 19.3 5 15.8 5 11 V5.8 Z" />
      <path d="M9.2 11.6 L11.2 13.6 L15 9.6" />
    </svg>
  );
}

function IconBolt() {
  return (
    <svg {...iconProps} width={22} height={22}>
      <path d="M13 3 L5.5 13.5 H11 L9.5 21 L18.5 9.5 H12.8 Z" />
    </svg>
  );
}

function IconBuilding() {
  return (
    <svg {...iconProps} width={24} height={24}>
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
    <svg {...iconProps} width={24} height={24}>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5.4 20 C5.4 15.9 8.4 14.3 12 14.3 C15.6 14.3 18.6 15.9 18.6 20" />
    </svg>
  );
}

function IconGamepad() {
  return (
    <svg {...iconProps} width={24} height={24}>
      <rect x="2.5" y="8" width="19" height="10.5" rx="5.25" />
      <path d="M7 11.4 V15 M5.3 13.2 H8.7" />
      <circle cx="15.4" cy="12" r="0.4" />
      <circle cx="17.6" cy="14.2" r="0.4" />
    </svg>
  );
}

function IconEye() {
  return (
    <svg {...iconProps} width={24} height={24}>
      <path d="M2.8 12 C5.2 7.6 8.4 5.6 12 5.6 C15.6 5.6 18.8 7.6 21.2 12 C18.8 16.4 15.6 18.4 12 18.4 C8.4 18.4 5.2 16.4 2.8 12 Z" />
      <circle cx="12" cy="12" r="3.1" />
    </svg>
  );
}

function IconClipboard() {
  return (
    <svg {...iconProps} width={24} height={24}>
      <rect x="5.5" y="5" width="13" height="16.5" rx="2" />
      <path d="M9 5 V3.4 H15 V5" />
      <path d="M9 13.4 L11 15.4 L15 11.4" />
    </svg>
  );
}

/**
 * Landing pública KRUMM — visible en la raíz (krumm.cl).
 * Rebuild H4.2 sobre el design system (docs/design/design-system.md, tokens --k-*):
 * paleta espresso/crema/oro, jerarquía editorial según las 8 referencias
 * (docs/design/landing-refs/), alternancia clara/oscuro por sección.
 * Se conservan: anclas actuales, i18n (t()), CTAs (/postulaciones, /reclutador,
 * emails de contacto), accesibilidad y SEO (h1 único, nav/main/footer etiquetados).
 */
export default function LandingPage() {
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  return (
    <div className="landing">
      <a className="landing__skip" href="#contenido">
        {t('Saltar al contenido', 'Skip to content')}
      </a>

      <header className="landing__topbar">
        <a className="landing__logo" href="/" aria-label={t('KRUMM - Inicio', 'KRUMM - Home')}>
          <img src="/logo.svg" alt="" width="30" height="30" />
          <span className="landing__logo-word">KRUMM</span>
        </a>
        <nav className="landing__nav" aria-label={t('Navegación principal', 'Main navigation')}>
          <a href="#producto">{t('Producto', 'Product')}</a>
          <a href="#como-funciona">{t('Cómo funciona', 'How it works')}</a>
          <a href="#tecnologia">{t('Tecnología', 'Technology')}</a>
          <a href="#contacto">{t('Contacto', 'Contact')}</a>
          <a className="landing__nav-login" href="#accesos">{t('Iniciar sesión', 'Log in')}</a>
          <a className="landing__nav-cta" href="mailto:carlossaldivia@krumm.cl">{t('Solicitar demo', 'Request a demo')}</a>
          <LanguageToggle />
        </nav>
      </header>

      <main id="contenido" className="landing__main">
        {/* ── Hero (referencia: split 45/55, retícula, curva, 2 cards navy) ── */}
        <section className="landing__hero" aria-labelledby="landing-hero-title">
          <svg
            className="landing__hero-arc"
            viewBox="0 0 640 90"
            preserveAspectRatio="none"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M0 8 C140 74, 420 74, 640 6" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <div className="landing__container landing__hero-grid">
            <div className="landing__hero-copy">
              <span className="landing__hero-badge">
                <i className="landing__hero-badge-dot" aria-hidden="true" />
                {t('EDGE-AI · GAMIFICACIÓN · PRIVACY BY DESIGN', 'EDGE-AI · GAMIFICATION · PRIVACY BY DESIGN')}
              </span>
              <h1 id="landing-hero-title">
                {t('El talento no se declara.', 'Talent is not declared.')}{' '}
                <span className="landing__accent">{t('Se demuestra.', 'It is demonstrated.')}</span>
              </h1>
              <p className="landing__hero-sub">
                {t(
                  'KRUMM revela la capacidad real de cada candidato mediante simulaciones gamificadas y telemetría conductual procesada con Edge-AI directamente en el navegador — sin datos biométricos en la nube, sin sesgos, sin CVs generados por IA.',
                  "KRUMM reveals each candidate's true capability through gamified simulations and behavioral telemetry processed with Edge-AI directly in the browser — no biometric data in the cloud, no bias, no AI-generated CVs.",
                )}
              </p>
              <div className="landing__cta-row">
                <a className="landing__cta" href="/postulaciones">{t('Acceso candidatos', 'Candidate access')}</a>
                <a className="landing__cta landing__cta--ghost" href="#como-funciona">
                  <IconPlay />
                  {t('Ver cómo funciona', 'See how it works')}
                </a>
              </div>
              <ul className="landing__trust">
                <li><IconCheck />{t('EDGE-AI EN EL NAVEGADOR', 'EDGE-AI IN YOUR BROWSER')}</li>
                <li><IconCheck />{t('PRIVACY BY DESIGN', 'PRIVACY BY DESIGN')}</li>
                <li><IconCheck />{t('EVALUACIÓN CONDUCTUAL INMERSIVA', 'IMMERSIVE BEHAVIORAL ASSESSMENT')}</li>
              </ul>
            </div>

            {/* Visual: mock de reporte (fallback §8.2 — capturas C1 aún no disponibles) + cards flotantes */}
            <div className="landing__hero-visual">
              <div className="landing__mock" aria-hidden="true">
                <div className="landing__mock-head">
                  <span className="landing__mock-title">{t('Perfil de talento', 'Talent profile')}</span>
                  <span className="landing__mock-chip">{t('SCORE PROVISIONAL', 'PROVISIONAL SCORE')}</span>
                </div>
                <div className="landing__mock-row">
                  <span className="landing__mock-label">{t('Atención sostenida', 'Sustained attention')}</span>
                  <span className="landing__mock-meter"><span className="landing__mock-fill" style={{ width: '72%' }} /></span>
                  <span className="landing__mock-value">72</span>
                </div>
                <div className="landing__mock-row">
                  <span className="landing__mock-label">{t('Control inhibitorio', 'Inhibitory control')}</span>
                  <span className="landing__mock-meter"><span className="landing__mock-fill" style={{ width: '58%' }} /></span>
                  <span className="landing__mock-value">58</span>
                </div>
                <div className="landing__mock-row">
                  <span className="landing__mock-label">{t('Velocidad de procesamiento', 'Processing speed')}</span>
                  <span className="landing__mock-meter"><span className="landing__mock-fill" style={{ width: '81%' }} /></span>
                  <span className="landing__mock-value">81</span>
                </div>
                <p className="landing__mock-note">
                  {t(
                    'Reporte para revisión humana · datos procesados en tu dispositivo',
                    'Human-reviewed report · data processed on your device',
                  )}
                </p>
              </div>
              <div className="landing__stat landing__stat--top">
                <span className="landing__stat-icon landing__stat-icon--shield"><IconShield /></span>
                <span className="landing__stat-text">
                  <small>{t('Privacidad por diseño', 'Privacy by design')}</small>
                  <strong>{t('Datos en tu dispositivo', 'Data on your device')}</strong>
                </span>
              </div>
              <div className="landing__stat landing__stat--bottom">
                <span className="landing__stat-icon landing__stat-icon--bolt"><IconBolt /></span>
                <span className="landing__stat-text">
                  <small>{t('Tiempo de evaluación', 'Evaluation time')}</small>
                  <strong>−60%</strong>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── 01 · Cómo funciona (claro, editorial: texto izq, negativo der) ── */}
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
              <li>{t('La persona accede al portal /postulaciones y activa la cámara si es necesario.', 'The person accesses the /postulaciones portal and enables the camera if needed.')}</li>
              <li>{t('Juega a una batería de 5 juegos gamificados; las métricas se recopilan localmente.', 'They play a battery of 5 gamified games; metrics are gathered locally.')}</li>
              <li>{t('KRUMM procesa en local → genera un reporte para revisión humana.', 'KRUMM processes locally → generates a report for human review.')}</li>
              <li>{t('El reclutador revisa en /reclutador, ve la evidencia y toma una decisión contextualizada.', 'The recruiter reviews at /reclutador, sees the evidence, and makes a grounded decision.')}</li>
            </ol>
          </div>
        </section>

        {/* ── 02 · Tecnología (claro arena) ── */}
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

        {/* ── 03 · Producto: "Qué hacemos" (contenido actual, cards outline) ── */}
        <section
          id="producto"
          className="landing__section landing__section--light"
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
                <a className="landing__acceso-cta" href="/reclutador">
                  {t('Ingresar como empresa', 'Sign in as a company')} <span aria-hidden="true">→</span>
                </a>
              </article>
              <article className="landing__acceso-card landing__acceso-card--candidato">
                <span className="landing__icon-box"><IconUser /></span>
                <span className="landing__acceso-kicker">{t('CANDIDATOS', 'CANDIDATES')}</span>
                <h3>{t('Portal para candidatos', 'Portal for candidates')}</h3>
                <p>{t('Accede a tus evaluaciones y experiencias KRUMM.', 'Access your assessments and KRUMM experiences.')}</p>
                <span className="landing__acceso-divider" aria-hidden="true" />
                <a className="landing__acceso-cta" href="/postulaciones">
                  {t('Ingresar como candidato', 'Sign in as a candidate')} <span aria-hidden="true">→</span>
                </a>
              </article>
            </div>
            <a className="landing__volver" href="/">
              <span aria-hidden="true">←</span> {t('Volver a KRUMM', 'Back to KRUMM')}
            </a>
          </div>
        </section>

        {/* ── Cierre HABLEMOS + contacto (oscuro) ── */}
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
                <li>
                  <strong>{t('Alianzas y despliegue', 'Partnerships & deployment')}</strong>
                  <a href="mailto:carlossaldivia@krumm.cl">carlossaldivia@krumm.cl</a>
                </li>
              </ul>
              <p className="landing__note">
                {t('Tecnología de evaluación humana desarrollada en Chile. La cámara y las señales biométricas son opcionales y no se utilizan para decisiones finales.', 'Human evaluation technology developed in Chile. Camera and biometric signals are optional and never drive final decisions.')}
              </p>
            </div>
            <div className="landing__cierre-cta">
              <a className="landing__cta" href="mailto:carlossaldivia@krumm.cl">{t('Solicitar demo', 'Request a demo')}</a>
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
