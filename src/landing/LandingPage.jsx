import React from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import LanguageToggle from '../i18n/LanguageToggle.jsx';
import './landing.css';

/**
 * Landing pública KRUMM — visible en la raiz (krumm.cl).
 * Punto de entrada corporativo con 3 secciones de acceso + información técnica.
 * SIN info de "demo" visible; marca producto listo para humanos.
 */
export default function LandingPage() {
  const { t } = useLanguage();

  return (
    <div className="landing">
      <header className="landing__topbar">
        <a className="landing__logo" href="/" aria-label={t('KRUMM - Inicio', 'KRUMM - Home')}>
          <img src="/favicon.svg" alt="KRUMM" width="28" height="28" />
          <span>KRUMM</span>
        </a>
        <nav className="landing__nav" aria-label={t('Navegación principal', 'Main navigation')}>
          <a href="/postulaciones">{t('Candidatos', 'Candidates')}</a>
          <a href="/reclutador">{t('Reclutador', 'Recruiter')}</a>
          <a href="#producto">{t('Producto', 'Product')}</a>
          <a href="#contacto">{t('Contacto', 'Contact')}</a>
          <LanguageToggle />
        </nav>
      </header>

      <section className="landing__hero">
        <div className="landing__hero-copy">
          <span className="landing__kicker">{t('Tecnología de evaluación KRUMM', 'KRUMM evaluation technology')}</span>
          <h1>{t('Evaluación humana, gamificada.', 'Human evaluation, gamified.')}</h1>
          <p>
            {t(
              'Plataforma de assessment que convierte la evaluación de competencias en experiencias jugables con procesamiento local, sin rastreo invasivo, y reportes revisionados por personas.',
              'Assessment platform that turns competency evaluation into playable experiences with local processing, no invasive tracking, and human-reviewed reports.'
            )}
          </p>
          <div className="landing__cta-row">
            <a className="landing__cta" href="/postulaciones">{t('Acceso candidatos', 'Candidate access')}</a>
            <a className="landing__cta landing__cta--ghost" href="#producto">{t('Ver cómo funciona', 'See how it works')}</a>
          </div>
        </div>
        <figure className="landing__plot" aria-hidden="true">
          <div className="landing__plot-grid">
            <div className="landing__plot-cell">{t('Privacidad', 'Privacy')}</div>
            <div className="landing__plot-cell">{t('Latencia local', 'Local latency')}</div>
            <div className="landing__plot-cell">{t('Revisión humana', 'Human review')}</div>
            <div className="landing__plot-cell">{t('Calidad de señal', 'Signal quality')}</div>
          </div>
        </figure>
      </section>

      <section id="producto" className="landing__cards" aria-label={t('Qué hacemos', 'What we do')}>
        <h2 className="landing__section-title">{t('Qué hacemos', 'What we do')}</h2>
        <p className="landing__section-sub">{t('Evaluación gamificada con privacidad por diseño y revisión humana al centro.', 'Gamified assessment with privacy by design and human review at the core.')}</p>
        <div className="landing__cards-grid">
          <article className="landing__card">
            <h3>{t('Evaluación basada en juegos', 'Game-based assessment')}</h3>
            <p>{t('Baterías gamificadas que miden competencias en contexto, no cuestionarios estáticos. Métricas agregadas, no datos crudos.', 'Game-based batteries measuring competencies in context, not static questionnaires. Aggregated metrics, no raw data.')}</p>
          </article>
          <article className="landing__card">
            <h3>{t('Privacidad by design', 'Privacy by design')}</h3>
            <p>{t('Procesamiento local: video opcional, sin persistencia de imágenes, landmarks o rutas. Solo señales agregadas para revisión humana.', 'Local processing: optional video, no image/landmark/route persistence. Only aggregate signals for human review.')}</p>
          </article>
          <article className="landing__card">
            <h3>{t('Revisión humana al centro', 'Human review at the core')}</h3>
            <p>{t('Los reportes son herramientas para humanos, no decisiones automáticas. En KRUMM siempre hay una persona revisando el resultado.', 'Reports are human tools, not automated decisions. At KRUMM a person always reviews the outcome.')}</p>
          </article>
          <article className="landing__card">
            <h3>{t('Rigor técnico', 'Technical rigor')}</h3>
            <p>{t('Informes con validación de integridad, límites explícitos y caveats. Nada de “score confiable” sin evidencia ni contexto.', 'Reports with integrity validation, explicit limits and caveats. No “confident score” without evidence and context.')}</p>
          </article>
        </div>
      </section>

      <section className="landing__how" id="como-funciona" aria-label={t('Cómo funciona', 'How it works')}>
        <h2 className="landing__section-title">{t('Cómo funciona', 'How it works')}</h2>
        <p className="landing__section-sub">{t('Un flujo simple, transparente y privado de punta a punta.', 'A simple, transparent, private end-to-end flow.')}</p>
        <ol className="landing__steps">
          <li>{t('La persona accede al portal /postulaciones y activa la cámara si es necesario.', 'The person accesses the /postulaciones portal and enables the camera if needed.')}</li>
          <li>{t('Juega a una batería de 4 juegos gamificados; las métricas se recopilan localmente.', 'They play a battery of 4 gamified games; metrics are gathered locally.')}</li>
          <li>{t('KRUMM procesa en local → genera un reporte para revisión humana.', 'KRUMM processes locally → generates a report for human review.')}</li>
          <li>{t('El reclutador revisa en /reclutador, ve la evidencia y toma una decisión contextualizada.', 'The recruiter reviews at /reclutador, sees the evidence, and makes a grounded decision.')}</li>
        </ol>
      </section>

      <section id="contacto" className="landing__contact" aria-label={t('Contacto', 'Contact')}>
        <h2 className="landing__section-title">{t('Contacto', 'Contact')}</h2>
        <p>{t('¿Preguntas sobre la plataforma o sobre una prueba?', 'Questions about the platform or a test?')}</p>
        <ul className="landing__contact-list">
          <li><strong>{t('Candidatos e incidencias técnicas', 'Candidates & technical issues')}</strong>: <a href="mailto:contacto@krumm.cl">contacto@krumm.cl</a></li>
          <li><strong>{t('Alianzas y despliegue', 'Partnerships & deployment')}</strong>: <a href="mailto:carlossaldivia@krumm.cl">carlossaldivia@krumm.cl</a></li>
        </ul>
        <p className="landing__note">{t('Tecnología de evaluación humana desarrollada en Chile. La cámara y las señales biométricas son opcionales y no se utilizan para decisiones finales.', 'Human evaluation technology developed in Chile. Camera and biometric signals are optional and never drive final decisions.')}</p>
      </section>

      <footer className="landing__footer">
        <span>© {new Date().getFullYear()} KRUMM. {t('Evaluación gamificada con procesamiento local', 'Gamified assessment with local processing')}</span>
      </footer>
    </div>
  );
}
