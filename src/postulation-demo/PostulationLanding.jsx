import React from 'react';
import { usePostulationDemoCopy } from './postulationDemoCopy.js';
import { POSTULATION_DEMO_BATTERY_MODES } from './postulationDemoConfig.js';
import { useLanguage } from '../i18n/LanguageContext.jsx';

export default function PostulationLanding({ onStart, batteryMode }) {
  const copy = usePostulationDemoCopy();
  const { t } = useLanguage();
  const isOriginalMode = batteryMode === POSTULATION_DEMO_BATTERY_MODES.ORIGINAL_GAMES;
  return (
    <main className="postulation-demo__landing" aria-labelledby="postulation-demo-title">
      <section className="postulation-demo__hero">
        <div className="postulation-demo__hero-copy">
          <span className="postulation-demo__eyebrow">
            {isOriginalMode ? t('Batería original · Prueba controlada', 'Original battery · Controlled assessment') : copy.eyebrow}
          </span>
          <h1 id="postulation-demo-title">{copy.title}</h1>
          <p className="postulation-demo__subtitle">{copy.subtitle}</p>
          <p className="postulation-demo__description">{copy.description}</p>
          <ul className="postulation-demo__coverage" aria-label={t('Cobertura del reporte', 'Report coverage')}>
            <li><strong>8</strong> {t('constructos con señal de prueba', 'constructs with assessment signal')}</li>
            <li>{t('reporte sin “No medido” · revisión humana', 'report without “Not measured” · human review')}</li>
          </ul>
          <div className="postulation-demo__actions">
            <button type="button" className="postulation-demo__primary" onClick={onStart}>
              {copy.cta}
            </button>
            <a className="postulation-demo__secondary" href="#postulation-demo-background">
              {copy.secondaryCta}
            </a>

          </div>
        </div>

        <aside className="postulation-demo__brief" aria-label={t('Resumen de demo', 'Demo summary')}>
          <div>
            <span>{t('Duración estimada', 'Estimated duration')}</span>
            <strong>{isOriginalMode ? copy.originalTimeEstimate : copy.timeEstimate}</strong>
          </div>
          <div>
            <span>{t('Modo', 'Mode')}</span>
            <strong>{isOriginalMode ? t('Sesión local · batería original', 'Local session · original battery') : t('Sesión local', 'Local session')}</strong>
          </div>
          <div>
            <span>{t('Resultado', 'Result')}</span>
            <strong>{t('Reporte humano', 'Human report')}</strong>
          </div>
          <a className="postulation-demo__brief-link" href="/reclutador">
            <span>{t('Vista separada', 'Separate view')}</span>
            <strong>{t('Abrir vista reclutador →', 'Open recruiter view →')}</strong>
          </a>
        </aside>
      </section>

      <section id="postulation-demo-background" className="postulation-demo__grid" aria-label={t('Principios de la demo', 'Demo principles')}>
        {copy.cards.map((card) => (
          <article key={card.title} className="postulation-demo__card">
            <h2>{card.title}</h2>
            <p>{card.body}</p>
          </article>
        ))}
      </section>

      <section className="postulation-demo__privacy" aria-label={t('Privacidad y alcance', 'Privacy and scope')}>
        <h2>{t('Privacidad y alcance', 'Privacy and scope')}</h2>
        <ul>
          {copy.principles.map((principle) => (
            <li key={principle}>{principle}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
