import React from 'react';

function clamp(value, min = -1, max = 1) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(max, Math.max(min, numeric));
}

function pct(value) {
  return `${Math.round(Math.max(0, Math.min(1, Number(value) || 0)) * 100)}%`;
}

function signed(value) {
  const numeric = clamp(value);
  const sign = numeric > 0 ? '+' : '';
  return `${sign}${Math.round(numeric * 100)} pts`;
}

export default function GameCorrelationPanel({ gameCorrelation = null } = {}) {
  const aggregate = gameCorrelation?.aggregate ?? {};
  const completed = aggregate.completedTrialCount ?? 0;
  const byGameId = aggregate.byGameId ?? {};

  if (!aggregate.trialCount) {
    return (
      <article className="dash-section" aria-label="Correlación multimodal">
        <div className="dash-section-hdr" style={{ cursor: 'default', userSelect: 'none' }}>
          <span className="dash-section-arrow">◆</span>
          <span className="dash-section-title">Correlación multimodal</span>
          <span className="dash-section-badge">sin ventanas</span>
        </div>
        <div className="dash-section-body">
          <p className="caption">Sin ventanas correlacionadas todavía.</p>
        </div>
      </article>
    );
  }

  return (
    <article className="dash-section" aria-label="Correlación multimodal">
      <div className="dash-section-hdr" style={{ cursor: 'default', userSelect: 'none' }}>
        <span className="dash-section-arrow">◆</span>
        <span className="dash-section-title">Correlación multimodal</span>
        <span className="dash-section-badge">{completed} ventanas</span>
      </div>
      <div className="dash-section-body">
        <div className="stats-grid-compact">
          <div className="stat-item"><span>Ventanas</span><strong>{completed}/{aggregate.trialCount ?? 0}</strong></div>
          <div className="stat-item"><span>Precisión correl.</span><strong>{pct(aggregate.accuracy ?? 0)}</strong></div>
          <div className="stat-item"><span>RT correl.</span><strong>{Math.round(aggregate.meanReactionTimeMs ?? 0)}ms</strong></div>
          <div className="stat-item"><span>Δ postura</span><strong>{signed(aggregate.meanReactionPostureDelta ?? 0)}</strong></div>
          <div className="stat-item"><span>Δ presencia facial</span><strong>{signed(aggregate.meanReactionFacePresenceDelta ?? 0)}</strong></div>
        </div>
        {Object.keys(byGameId).length > 0 && (
          <p className="caption" style={{ fontSize: '0.56rem' }}>
            Actividades: {Object.entries(byGameId).map(([gameId, count]) => `${gameId} (${count})`).join(' · ')}
          </p>
        )}
        <p className="caption" style={{ fontSize: '0.56rem' }}>Sin señales crudas: ventanas pre/reaction/post/recovery se reducen a métricas agregadas.</p>
      </div>
    </article>
  );
}
