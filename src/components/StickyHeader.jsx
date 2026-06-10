import React from 'react';

const EMOTION_ICONS = { happiness: '😊', sadness: '😢', surprise: '😲', fear: '😨', anger: '😠', disgust: '🤢', contempt: '😏', neutral: '😐' };
const EMOTION_COLORS = { happiness: '#4dd4ac', sadness: '#74a7ff', surprise: '#ffd166', fear: '#ffb4b4', anger: '#ff6b6b', disgust: '#c8a86e', contempt: '#d4a574', neutral: '#9fb0c2' };

export default function StickyHeader({
  edgeComposite, edgeConfidence,
  auEntries, topChannels,
  calibrationProfile, calStatusLabel,
  telemetry, faceWorker,
  emotions, captureQuality,
}) {
  const top5AUs = (auEntries ?? []).slice(0, 5);
  const topChannel = topChannels?.[0];
  const emo = emotions;
  const cq = captureQuality;

  return (
    <div className="sticky-header">
      <div className="sticky-inner">
        <div className="sticky-item">
          <span className="sticky-label">Score</span>
          <span className="sticky-value" style={{ color: edgeComposite?.level === 'strong' ? 'var(--ink-green)' : edgeComposite?.level === 'moderate' ? 'var(--ink-yellow)' : 'var(--ink-red)' }}>
            {edgeComposite?.score ?? '—'}%
          </span>
          <span className={`sticky-badge ${edgeComposite?.level ?? ''}`}>{edgeComposite?.level ?? '—'}</span>
        </div>

        {/* Emotion */}
        {emo && (
          <div className="sticky-item">
            <span className="sticky-label">Emoción</span>
            <span style={{ fontSize: '1rem' }}>{EMOTION_ICONS[emo.dominant] || '😐'}</span>
            <span className="sticky-value" style={{ color: EMOTION_COLORS[emo.dominant], fontSize: '0.72rem' }}>
              {emo.dominant} {Math.round(emo.dominantScore * 100)}%
            </span>
          </div>
        )}

        {/* Capture quality */}
        {cq && (
          <div className="sticky-item">
            <span className="sticky-label">Calidad</span>
            <span className="sticky-value" style={{ color: cq.illumination === 'good' ? 'var(--ink-green)' : cq.illumination === 'moderate' ? 'var(--ink-yellow)' : 'var(--ink-red)', fontSize: '0.7rem' }}>
              {cq.overallScore}% {cq.illumination}
            </span>
          </div>
        )}

        <div className="sticky-item sticky-aus">
          <span className="sticky-label">AUs activas</span>
          <div className="sticky-au-chips">
            {top5AUs.map(([code, au]) => (
              <span key={code} className={`sticky-au-chip ${au.intensity > 0.05 ? 'active' : ''}`}>
                {code}:{Math.round(au.intensity * 100)}%
              </span>
            ))}
          </div>
        </div>

        <div className="sticky-item">
          <span className="sticky-label">Canal principal</span>
          {topChannel ? (
            <>
              <span className="sticky-value" style={{ fontSize: '0.7rem' }}>{topChannel.label ?? topChannel[0]}</span>
              <span className="sticky-badge">{topChannel.score ?? topChannel[1]?.score}%</span>
            </>
          ) : <span className="sticky-value">—</span>}
        </div>

        <div className="sticky-item">
          <span className="sticky-label">Calibración</span>
          <span className="sticky-value" style={{ color: calibrationProfile?.eligible ? 'var(--ink-green)' : 'var(--ink-yellow)', fontSize: '0.7rem' }}>
            {calStatusLabel}
          </span>
        </div>

        <div className="sticky-item">
          <span className="sticky-label">Muestras</span>
          <span className="sticky-value">{telemetry.sampleCount}</span>
          <span className="sticky-sub" style={{ fontSize: '0.6rem', color: '#9fb0c2' }}>
            {faceWorker.delegate ?? 'CPU'} · {telemetry.recentCount} ventana
          </span>
        </div>

        <div className="sticky-item">
          <span className="sticky-label">Confianza</span>
          <span className={`sticky-confidence ${edgeConfidence?.level ?? ''}`}>
            {edgeConfidence?.level ?? '—'}
          </span>
        </div>
      </div>
    </div>
  );
}