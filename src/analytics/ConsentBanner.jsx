// F.1 (KRU-118) — Banner de consentimiento de analytics (opt-in).
// Forma documentada en docs/legal/politica-privacidad.md: botones
// "Aceptar analytics" / "Solo esenciales" + decisión en cookie_consent (1 año).
// Se renderiza una vez (mientras no exista la cookie); tras responder, nunca más.
import React, { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import { consentFromStorage, isAnalyticsConfigured, setConsent, trackPageView } from './analytics.js';
import './consentBanner.css';

export default function ConsentBanner() {
  const { t } = useLanguage();
  // Solo se muestra si analytics está configurado (key de build): sin key no
  // hay analítica que consentir (evita pedir opt-in "muerto" en previews).
  const [visible, setVisible] = useState(
    () => isAnalyticsConfigured() && consentFromStorage() === 'unknown',
  );
  if (!visible) return null;

  const respond = (granted) => {
    setConsent(granted);
    setVisible(false);
    // Pageview retroactivo de la ruta actual (la inicial quedó gateada por
    // falta de consent; solo se dispara si la ruta no está excluida).
    if (granted) void trackPageView();
  };

  return (
    <aside className="consent-banner" role="region" aria-label={t('Preferencias de cookies', 'Cookie preferences')}>
      <div className="consent-banner__inner">
        <p className="consent-banner__text">
          {t(
            'KRUMM usa cookies esenciales para funcionar y, solo si lo aceptas, analítica opcional (PostHog) para entender el uso del producto: páginas y eventos de navegación. No usamos publicidad ni guardamos datos biométricos ni contenido de evaluaciones. Tu decisión se guarda 1 año.',
            'KRUMM uses essential cookies to function and, only if you accept, optional analytics (PostHog) to understand product usage: pages and navigation events. We do not run advertising, and we never store biometric data or assessment content. Your choice is kept for 1 year.',
          )}
        </p>
        <div className="consent-banner__actions">
          <button
            type="button"
            className="consent-banner__secondary"
            onClick={() => respond(false)}
            data-testid="consent-essential"
          >
            {t('Solo esenciales', 'Essentials only')}
          </button>
          <button
            type="button"
            className="consent-banner__primary"
            onClick={() => respond(true)}
            data-testid="consent-analytics"
          >
            {t('Aceptar analytics', 'Accept analytics')}
          </button>
        </div>
      </div>
    </aside>
  );
}
