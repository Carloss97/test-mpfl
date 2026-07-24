import React from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';

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
  const { t } = useLanguage();
  const aggregate = gameCorrelation?.aggregate ?? {};
  const completed = aggregate.completedTrialCount ?? 0;
  const byGameId = aggregate.byGameId ?? {};

  if (!aggregate.trialCount) {
    return (
      <article className="dash-section" aria-label={t('Correlación multimodal', 'Multimodal correlation')}>
        <div className="dash-section-hdr" style={{ cursor: 'default', userSelect: 'none' }}>
          <span className="dash-section-arrow">◆</span>
          <span className="dash-section-title">{t('Correlación multimodal', 'Multimodal correlation')}</span>
          <span className="dash-section-badge">{t('sin ventanas', 'no windows')}</span>
        </div>
        <div className="dash-section-body">
          <p className="caption">{t('Sin ventanas correlacionadas todavía.', 'No correlated windows yet.')}</p>
        </div>
      </article>
    );
  }

  return (
    <article className="dash-section" aria-label={t('Correlación multimodal', 'Multimodal correlation')}>
      <div className="dash-section-hdr" style={{ cursor: 'default', userSelect: 'none' }}>
        <span className="dash-section-arrow">◆</span>
        <span className="dash-section-title">{t('Correlación multimodal', 'Multimodal correlation')}</span>
        <span className="dash-section-badge">{completed} {t('ventanas', 'windows')}</span>
      </div>
      <div className="dash-section-body">
        <div className="stats-grid-compact">
          <div className="stat-item"><span>{t('Ventanas', 'Windows')}</span><strong>{completed}/{aggregate.trialCount ?? 0}</strong></div>
          <div className="stat-item"><span>{t('Precisión correl.', 'Corr. accuracy')}</span><strong>{pct(aggregate.accuracy ?? 0)}</strong></div>
          <div className="stat-item"><span>{t('RT correl.', 'Corr. RT')}</span><strong>{Math.round(aggregate.meanReactionTimeMs ?? 0)}ms</strong></div>
          <div className="stat-item"><span>{t('Δ postura', 'Posture Δ')}</span><strong>{signed(aggregate.meanReactionPostureDelta ?? 0)}</strong></div>
          <div className="stat-item"><span>{t('Δ presencia facial', 'Face presence Δ')}</span><strong>{signed(aggregate.meanReactionFacePresenceDelta ?? 0)}</strong></div>
        </div>
        {Object.keys(byGameId).length > 0 && (
          <p className="caption" style={{ fontSize: '0.56rem' }}>
            {t('Actividades', 'Activities')}: {Object.entries(byGameId).map(([gameId, count]) => `${gameId} (${count})`).join(' · ')}
          </p>
        )}
        <p className="caption" style={{ fontSize: '0.56rem' }}>{t('Sin señales crudas: ventanas pre/reaction/post/recovery se reducen a métricas agregadas.', 'No raw signals: pre/reaction/post/recovery windows are reduced to aggregated metrics.')}</p>
      </div>
    </article>
  );
}
