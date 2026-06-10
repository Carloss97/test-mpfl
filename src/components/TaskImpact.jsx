import React from 'react';

/**
 * TaskImpact — muestra el efecto de la tarea en las métricas.
 * Compara AUs/métricas durante la tarea vs baseline pre-tarea.
 */
export default function TaskImpact({ edgeAIResult, taskActive }) {
  if (!taskActive || !edgeAIResult) return null;

  const channels = edgeAIResult?.channels ?? {};
  const emotions = edgeAIResult?.emotions;
  const confidence = edgeAIResult?.confidence;
  const composite = edgeAIResult?.composite;

  // Top changing channels
  const channelEntries = Object.entries(channels)
    .filter(([, ch]) => ch.score > 30)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 4);

  if (!channelEntries.length && !emotions) return null;

  return (
    <div className="task-impact" style={{
      marginTop: '8px', padding: '10px 14px', borderRadius: '12px',
      background: 'rgba(77,212,172,0.06)', border: '1px solid rgba(77,212,172,0.15)',
    }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#7df0cb', marginBottom: '6px' }}>
        📊 Impacto de la tarea
      </div>

      {emotions && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
          <span style={{ fontSize: '0.65rem', color: '#9fb0c2' }}>Estado:</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: emotions.dominant === 'neutral' ? '#9fb0c2' : '#dff8ff' }}>
            {emotions.dominant === 'happiness' ? '😊 Alegría' :
             emotions.dominant === 'sadness' ? '😢 Tristeza' :
             emotions.dominant === 'surprise' ? '😲 Sorpresa' :
             emotions.dominant === 'fear' ? '😨 Miedo' :
             emotions.dominant === 'anger' ? '😠 Enojo' :
             emotions.dominant === 'disgust' ? '🤢 Disgusto' :
             emotions.dominant === 'contempt' ? '😏 Desprecio' : '😐 Neutral'}
          </span>
          <span style={{ fontSize: '0.6rem', color: '#9fb0c2' }}>
            {Math.round(emotions.dominantScore * 100)}%
          </span>
        </div>
      )}

      {channelEntries.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {channelEntries.map(([name, ch]) => (
            <span key={name} style={{
              fontSize: '0.6rem', padding: '2px 8px', borderRadius: '999px',
              background: 'rgba(255,255,255,0.06)', color: '#c8d7e8',
            }}>
              {ch.label}: {ch.score}%
            </span>
          ))}
        </div>
      )}

      {composite && (
        <div style={{ marginTop: '4px', fontSize: '0.6rem', color: '#9fb0c2' }}>
          Score compuesto: <strong>{composite.score}%</strong> · {composite.level}
          {confidence?.captureQuality && (
            <span> · calidad: {confidence.captureQuality.overallScore}%</span>
          )}
        </div>
      )}
    </div>
  );
}