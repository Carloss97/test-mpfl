import React from 'react';

/**
 * TaskImpact — muestra el efecto de la tarea en las métricas.
 * Explica la diferencia entre inferencia solo cámara y cámara + telemetría de actividad.
 */
export default function TaskImpact({ edgeAIResult, taskActive, gameSummary = null }) {
  if (!taskActive) return null;

  const channels = edgeAIResult?.channels ?? {};
  const emotions = edgeAIResult?.emotions;
  const confidence = edgeAIResult?.confidence;
  const composite = edgeAIResult?.composite;
  const hasGameTelemetry = Boolean(gameSummary?.eventCount > 0 || edgeAIResult?.multimodal?.game?.available);
  const performance = gameSummary?.performance ?? edgeAIResult?.multimodal?.game?.performance ?? {};
  const motor = gameSummary?.motor ?? edgeAIResult?.multimodal?.game?.motor ?? {};

  // Top changing channels
  const channelEntries = Object.entries(channels)
    .filter(([, ch]) => ch.score > 30)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 4);

  if (!channelEntries.length && !emotions && !hasGameTelemetry) return null;

  return (
    <div className="task-impact" style={{
      marginTop: '8px', padding: '10px 14px', borderRadius: '12px',
      background: 'rgba(77,212,172,0.06)', border: '1px solid rgba(77,212,172,0.15)',
    }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#7df0cb', marginBottom: '6px' }}>
        📊 Impacto de la tarea
      </div>

      {hasGameTelemetry && (
        <div style={{ marginBottom: '8px', padding: '8px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)' }}>
          <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#dff8ff', marginBottom: '4px' }}>
            Cámara + actividad
          </div>
          <p className="caption" style={{ margin: 0, fontSize: '0.58rem' }}>
            Sin actividad, Edge AI usa cámara: AUs/FACS, emoción proxy, gaze, postura y MoveNet. Con actividad añade precisión/RT/errores/trayectoria para ajustar rendimiento, control motor, estrés/carga y score compuesto.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
            <span style={{ fontSize: '0.58rem', padding: '2px 7px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', color: '#c8d7e8' }}>
              Sin actividad: cámara + AUs + gaze/postura
            </span>
            <span style={{ fontSize: '0.58rem', padding: '2px 7px', borderRadius: '999px', background: 'rgba(77,212,172,0.12)', color: '#7df0cb' }}>
              Con actividad: precisión/RT/errores/trayectoria
            </span>
            {!edgeAIResult && (
              <span style={{ fontSize: '0.58rem', padding: '2px 7px', borderRadius: '999px', background: 'rgba(255,209,102,0.12)', color: '#ffd166' }}>
                Inicia cámara para fusionar con AUs/gaze/postura
              </span>
            )}
            <span style={{ fontSize: '0.58rem', padding: '2px 7px', borderRadius: '999px', background: 'rgba(77,212,172,0.12)', color: '#7df0cb' }}>
              Rendimiento {Math.round((performance.accuracy ?? 0) * 100)}% · Motor {Math.round(((motor.pathEfficiencyMean ?? motor.smoothPursuitScore ?? 0) * 100))}%
            </span>
          </div>
        </div>
      )}

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
              background: ch.source === 'game_telemetry' || ch.gameAdjusted ? 'rgba(77,212,172,0.12)' : 'rgba(255,255,255,0.06)',
              color: ch.source === 'game_telemetry' || ch.gameAdjusted ? '#7df0cb' : '#c8d7e8',
            }}>
              {ch.label}: {ch.score}%{ch.source === 'game_telemetry' || ch.gameAdjusted ? ' + juego' : ''}
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
