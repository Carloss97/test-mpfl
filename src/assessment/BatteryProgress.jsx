import React from 'react';

export default function BatteryProgress({ completedBlocks = 0, totalBlocks = 0, currentBlock = null, state = 'idle' }) {
  const safeTotal = Math.max(0, Number(totalBlocks) || 0);
  const safeCompleted = Math.max(0, Number(completedBlocks) || 0);
  const percent = safeTotal ? Math.round((safeCompleted / safeTotal) * 100) : 0;
  return (
    <article className="dash-section" aria-label="Progreso de batería">
      <div className="dash-section-hdr" style={{ cursor: 'default', userSelect: 'none' }}>
        <span className="dash-section-arrow">◆</span>
        <span className="dash-section-title">Progreso de batería</span>
        <span className="dash-section-badge">{safeCompleted}/{safeTotal}</span>
      </div>
      <div className="dash-section-body">
        <div className="summary-grid summary-grid-compact">
          <div><span>Bloques</span><strong>{safeCompleted}/{safeTotal}</strong></div>
          <div><span>Avance</span><strong>{percent}%</strong></div>
          <div><span>Estado</span><strong>{state}</strong></div>
          <div><span>Actual</span><strong>{currentBlock?.label ?? '—'}</strong></div>
        </div>
      </div>
    </article>
  );
}
