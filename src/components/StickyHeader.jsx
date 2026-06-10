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
          <span className="sticky-label">Actividad facial</span>
          <div className="sticky-au-chips">
            {(()=>{
              const top=top5AUs.filter(([,a])=>a.intensity>0.03);
              if(!top.length)return<span className="sticky-au-chip">reposo</span>;
              const hasBrow=top.some(([c])=>c==='AU1'||c==='AU2'||c==='AU4');
              const hasEye=top.some(([c])=>c==='AU5'||c==='AU6'||c==='AU7'||c==='AU43');
              const hasMouth=top.some(([c])=>c==='AU12'||c==='AU15'||c==='AU23'||c==='AU26');
              const parts=[];
              if(hasBrow)parts.push('cejas');
              if(hasEye)parts.push('ojos');
              if(hasMouth)parts.push('boca');
              return<span className="sticky-au-chip active">{parts.length?parts.join(' · '):'leve'}</span>;
            })()}
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