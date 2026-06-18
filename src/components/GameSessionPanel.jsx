import React from 'react';
import GameTelemetrySummary from './GameTelemetrySummary.jsx';
import GameCorrelationPanel from './GameCorrelationPanel.jsx';

const CHANNEL_LABELS = Object.freeze({
  taskPerformance: 'Rendimiento',
  motorControl: 'Control motor',
  inhibitionControl: 'Control inhibitorio',
  visuomotorPrecision: 'Precisión visomotora',
  visualSearchEfficiency: 'Búsqueda visual',
  adaptiveResilience: 'Resiliencia adaptativa',
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
  const channels = edgeAIResult?.channels ?? {};
  const channelEntries = Object.entries(CHANNEL_LABELS)
    .filter(([key]) => channels[key])
    .map(([key, label]) => ({ key, label, channel: channels[key] }));

  return (
    <section className="panel game-session-panel" aria-label="Sesión gamificada">
      <div className="panel-heading">
        <div>
          <h2>Sesión gamificada</h2>
          <p className="caption">
            {selectedGame?.label ?? 'Actividad'} · estado: {taskActive ? 'activa' : 'inactiva'} · {selectedGame?.description ?? 'telemetría conductual'}
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
            <span className="dash-section-title">Canales Edge AI de actividad</span>
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
        Panel compacto de sesión: muestra resultados, correlaciones y canales derivados sin exponer video, landmarks, eventos crudos ni trayectorias.
      </p>
    </section>
  );
}
