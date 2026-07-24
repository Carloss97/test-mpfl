import React from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';

export default function BatteryProgress({ completedBlocks = 0, totalBlocks = 0, currentBlock = null, state = 'idle' }) {
  const { t } = useLanguage();
  const safeTotal = Math.max(0, Number(totalBlocks) || 0);
  const safeCompleted = Math.max(0, Number(completedBlocks) || 0);
  const percent = safeTotal ? Math.round((safeCompleted / safeTotal) * 100) : 0;
  return (
    <article className="dash-section" aria-label={t('Progreso de batería', 'Battery progress')}>
      <div className="dash-section-hdr" style={{ cursor: 'default', userSelect: 'none' }}>
        <span className="dash-section-arrow">◆</span>
        <span className="dash-section-title">{t('Progreso de batería', 'Battery progress')}</span>
        <span className="dash-section-badge">{safeCompleted}/{safeTotal}</span>
      </div>
      <div className="dash-section-body">
        <div className="summary-grid summary-grid-compact">
          <div><span>{t('Bloques', 'Blocks')}</span><strong>{safeCompleted}/{safeTotal}</strong></div>
          <div><span>{t('Avance', 'Progress')}</span><strong>{percent}%</strong></div>
          <div><span>{t('Estado', 'Status')}</span><strong>{state}</strong></div>
          <div><span>{t('Actual', 'Current')}</span><strong>{currentBlock?.label ?? '—'}</strong></div>
        </div>
      </div>
    </article>
  );
}
