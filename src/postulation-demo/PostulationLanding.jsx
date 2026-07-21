import React from 'react';
import { postulationDemoCopy } from './postulationDemoCopy.js';
import { POSTULATION_DEMO_BATTERY_MODES } from './postulationDemoConfig.js';

export default function PostulationLanding({ onStart, batteryMode }) {
  const isOriginalMode = batteryMode === POSTULATION_DEMO_BATTERY_MODES.ORIGINAL_GAMES;
  return (
    <main className="postulation-demo__landing" aria-labelledby="postulation-demo-title">
      <section className="postulation-demo__hero">
        <div className="postulation-demo__hero-copy">
          <span className="postulation-demo__eyebrow">
            {isOriginalMode ? 'Validación interna · juegos originales' : postulationDemoCopy.eyebrow}
          </span>
          <h1 id="postulation-demo-title">{postulationDemoCopy.title}</h1>
          <p className="postulation-demo__subtitle">{postulationDemoCopy.subtitle}</p>
          <p className="postulation-demo__description">{postulationDemoCopy.description}</p>
          <div className="postulation-demo__actions">
            <button type="button" className="postulation-demo__primary" onClick={onStart}>
              {postulationDemoCopy.cta}
            </button>
            <a className="postulation-demo__secondary" href="#postulation-demo-background">
              {postulationDemoCopy.secondaryCta}
            </a>
            <a className="postulation-demo__secondary" href="/postulaciones-demo/hr">
              Ver dashboard HR
            </a>
          </div>
        </div>

        <aside className="postulation-demo__brief" aria-label="Resumen de demo">
          <div>
            <span>Duración estimada</span>
            <strong>{postulationDemoCopy.timeEstimate}</strong>
          </div>
          <div>
            <span>Modo</span>
            <strong>{isOriginalMode ? 'Browser-local · original' : 'Browser-local'}</strong>
          </div>
          <div>
            <span>Resultado</span>
            <strong>Reporte humano</strong>
          </div>
        </aside>
      </section>

      <section id="postulation-demo-background" className="postulation-demo__grid" aria-label="Principios de la demo">
        {postulationDemoCopy.cards.map((card) => (
          <article key={card.title} className="postulation-demo__card">
            <h2>{card.title}</h2>
            <p>{card.body}</p>
          </article>
        ))}
      </section>

      <section className="postulation-demo__privacy" aria-label="Privacidad y alcance">
        <h2>Privacidad y alcance</h2>
        <ul>
          {postulationDemoCopy.principles.map((principle) => (
            <li key={principle}>{principle}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
