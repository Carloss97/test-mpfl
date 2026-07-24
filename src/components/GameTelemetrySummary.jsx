import React from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';

function clamp(value, min = 0, max = 1) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  return Math.min(max, Math.max(min, numeric));
}

function pct(value) {
  return `${Math.round(clamp(value) * 100)}%`;
}

function ms(value) {
  const numeric = Number(value);
  return `${Math.round(Number.isFinite(numeric) ? numeric : 0)}ms`;
}

export default function GameTelemetrySummary({ gameSummary = null } = {}) {
  const { t } = useLanguage();
  const eventCount = gameSummary?.eventCount ?? 0;
  const performance = gameSummary?.performance ?? {};
  const motor = gameSummary?.motor ?? {};
  const inhibition = gameSummary?.inhibition ?? {};
  const visualSearch = gameSummary?.visualSearch ?? {};

  if (!eventCount && !performance.trialCount) {
    return (
      <article className="dash-section" aria-label={t('Resumen conductual', 'Behavioral summary')}>
        <div className="dash-section-hdr" style={{ cursor: 'default', userSelect: 'none' }}>
          <span className="dash-section-arrow">◆</span>
          <span className="dash-section-title">{t('Resumen conductual', 'Behavioral summary')}</span>
          <span className="dash-section-badge">{t('sin eventos', 'no events')}</span>
        </div>
        <div className="dash-section-body">
          <p className="caption">{t('Sin telemetría de actividad todavía.', 'No activity telemetry yet.')}</p>
        </div>
      </article>
    );
  }

  return (
    <article className="dash-section" aria-label={t('Resumen conductual', 'Behavioral summary')}>
      <div className="dash-section-hdr" style={{ cursor: 'default', userSelect: 'none' }}>
        <span className="dash-section-arrow">◆</span>
        <span className="dash-section-title">{t('Resumen conductual', 'Behavioral summary')}</span>
        <span className="dash-section-badge">{pct(performance.accuracy ?? 0)}</span>
      </div>
      <div className="dash-section-body">
        <div className="stats-grid-compact">
          <div className="stat-item"><span>{t('Eventos', 'Events')}</span><strong>{eventCount}</strong></div>
          <div className="stat-item"><span>{t('Trials', 'Trials')}</span><strong>{performance.completedTrialCount ?? 0}/{performance.trialCount ?? 0}</strong></div>
          <div className="stat-item"><span>{t('Precisión', 'Accuracy')}</span><strong>{pct(performance.accuracy ?? 0)}</strong></div>
          <div className="stat-item"><span>{t('RT medio', 'Mean RT')}</span><strong>{ms(performance.meanReactionTimeMs ?? 0)}</strong></div>
          <div className="stat-item"><span>{t('Score', 'Score')}</span><strong>{pct(performance.meanScore ?? performance.accuracy ?? 0)}</strong></div>
          <div className="stat-item"><span>{t('Motor', 'Motor')}</span><strong>{pct(motor.pathEfficiencyMean ?? motor.smoothPursuitScore ?? 0)}</strong></div>
          <div className="stat-item"><span>{t('Inhibición', 'Inhibition')}</span><strong>{pct(1 - Math.max(inhibition.commissionErrorRate ?? 0, inhibition.omissionErrorRate ?? 0))}</strong></div>
          <div className="stat-item"><span>{t('Búsqueda visual', 'Visual search')}</span><strong>{pct(visualSearch.searchEfficiency ?? 0)}</strong></div>
        </div>
        <p className="caption" style={{ fontSize: '0.56rem' }}>{t('No se muestran rutas crudas ni eventos reconstructivos; solo agregados por sesión/trial.', 'No raw paths or reconstructive events are shown; only session/trial aggregates.')}</p>
      </div>
    </article>
  );
}
