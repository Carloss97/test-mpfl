import React from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import GameTelemetrySummary from './GameTelemetrySummary.jsx';
import GameCorrelationPanel from './GameCorrelationPanel.jsx';

const CHANNEL_LABELS = Object.freeze({
  taskPerformance: { es: 'Rendimiento', en: 'Performance' },
  motorControl: { es: 'Control motor', en: 'Motor control' },
  inhibitionControl: { es: 'Control inhibitorio', en: 'Inhibitory control' },
  visuomotorPrecision: { es: 'Precisión visomotora', en: 'Visuomotor precision' },
  visualSearchEfficiency: { es: 'Búsqueda visual', en: 'Visual search' },
  adaptiveResilience: { es: 'Resiliencia adaptativa', en: 'Adaptive resilience' },
});

function channelScore(channel) {
  const score = Number(channel?.score);
  return Number.isFinite(score) ? `${Math.round(score)}%` : '—';
}

export default function GameSessionPanel({
  selectedGame = null,
  taskActive = false,
  gameSummary = null,
  gameCorrelation = null,
  edgeAIResult = null,
} = {}) {
  const { t } = useLanguage();
  const channels = edgeAIResult?.channels ?? {};
  const channelEntries = Object.entries(CHANNEL_LABELS)
    .filter(([key]) => channels[key])
    .map(([key, label]) => ({ key, label: label.es, channel: channels[key] }));

  return (
    <section className="panel game-session-panel" aria-label={t('Sesión gamificada', 'Gamified session')}>
      <div className="panel-heading">
        <div>
          <h2>{t('Sesión gamificada', 'Gamified session')}</h2>
          <p className="caption">
            {selectedGame?.label ?? t('Actividad', 'Activity')} · {t('estado', 'status')}: {taskActive ? t('activa', 'active') : t('inactiva', 'inactive')} · {selectedGame?.description ?? t('telemetría conductual', 'behavioral telemetry')}
          </p>
        </div>
        <span className="status ready">privacy-safe</span>
      </div>

      <div className="grid-two" style={{ gap: '12px', alignItems: 'stretch' }}>
        <GameTelemetrySummary gameSummary={gameSummary} />
        <GameCorrelationPanel gameCorrelation={gameCorrelation} />
      </div>

      {channelEntries.length > 0 && (
        <div className="dash-section" style={{ marginTop: '12px' }}>
          <div className="dash-section-hdr" style={{ cursor: 'default', userSelect: 'none' }}>
            <span className="dash-section-arrow">◆</span>
            <span className="dash-section-title">{t('Canales Edge AI de actividad', 'Edge AI activity channels')}</span>
            <span className="dash-section-badge">v9.1</span>
          </div>
          <div className="dash-section-body">
            <div className="stats-grid-compact">
              {channelEntries.map(({ key, label, channel }) => (
                <div className="stat-item" key={key}>
                  <span>{label}</span>
                  <strong>{channelScore(channel)}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <p className="caption" style={{ marginTop: '10px', fontSize: '0.58rem' }}>
        {t('Panel compacto de sesión: muestra resultados, correlaciones y canales derivados sin exponer video, landmarks, eventos crudos ni trayectorias.', 'Compact session panel: shows results, correlations, and derived channels without exposing video, landmarks, raw events, or trajectories.')}
      </p>
    </section>
  );
}
