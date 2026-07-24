import React from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';

/**
 * TaskImpact — muestra el efecto de la tarea en las métricas.
 * Explica la diferencia entre inferencia solo cámara y cámara + telemetría de actividad.
 */
export default function TaskImpact({ edgeAIResult, taskActive, gameSummary = null, baselineEdgeAI = null }) {
  const { t } = useLanguage();
  if (!taskActive) return null;

  const channels = edgeAIResult?.channels ?? {};
  const emotions = edgeAIResult?.emotions;
  const confidence = edgeAIResult?.confidence;
  const composite = edgeAIResult?.composite;
  const hasGameTelemetry = Boolean(gameSummary?.eventCount > 0 || edgeAIResult?.multimodal?.game?.available);
  const performance = gameSummary?.performance ?? edgeAIResult?.multimodal?.game?.performance ?? {};
  const motor = gameSummary?.motor ?? edgeAIResult?.multimodal?.game?.motor ?? {};
  const baselineComposite = baselineEdgeAI?.composite?.score;
  const currentComposite = composite?.score;
  const compositeDelta = Number.isFinite(baselineComposite) && Number.isFinite(currentComposite)
    ? currentComposite - baselineComposite
    : null;
  const deltaLabel = (value) => `${value >= 0 ? '+' : ''}${Math.round(value)}`;
  const channelDeltas = Object.entries(channels)
    .map(([name, channel]) => {
      const before = baselineEdgeAI?.channels?.[name]?.score;
      if (!Number.isFinite(before) || !Number.isFinite(channel.score)) return null;
      return { name, label: channel.label ?? name, delta: channel.score - before };
    })
    .filter(Boolean)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 3);

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
        📊 {t('Impacto de la tarea', 'Task impact')}
      </div>

      {hasGameTelemetry && (
        <div style={{ marginBottom: '8px', padding: '8px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)' }}>
          <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#dff8ff', marginBottom: '4px' }}>
            {t('Cámara + actividad', 'Camera + activity')}
          </div>
          <p className="caption" style={{ margin: 0, fontSize: '0.58rem' }}>
            {t('Sin actividad, Edge AI usa cámara: AUs/FACS, emoción proxy, gaze, postura y MoveNet. Con actividad añade precisión/RT/errores/trayectoria para ajustar rendimiento, control motor, estrés/carga y score compuesto.', 'Without activity, Edge AI uses camera: AUs/FACS, proxy emotion, gaze, posture, and MoveNet. With activity it adds precision/RT/errors/trajectory to adjust performance, motor control, stress/load, and composite score.')}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
            <span style={{ fontSize: '0.58rem', padding: '2px 7px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', color: '#c8d7e8' }}>
              {t('Sin actividad: cámara + AUs + gaze/postura', 'No activity: camera + AUs + gaze/posture')}
            </span>
            <span style={{ fontSize: '0.58rem', padding: '2px 7px', borderRadius: '999px', background: 'rgba(77,212,172,0.12)', color: '#7df0cb' }}>
              {t('Con actividad: precisión/RT/errores/trayectoria', 'With activity: precision/RT/errors/trajectory')}
            </span>
            {!edgeAIResult && (
              <span style={{ fontSize: '0.58rem', padding: '2px 7px', borderRadius: '999px', background: 'rgba(255,209,102,0.12)', color: '#ffd166' }}>
                {t('Inicia cámara para fusionar con AUs/gaze/postura', 'Start camera to fuse with AUs/gaze/posture')}
              </span>
            )}
            <span style={{ fontSize: '0.58rem', padding: '2px 7px', borderRadius: '999px', background: 'rgba(77,212,172,0.12)', color: '#7df0cb' }}>
              {t('Rendimiento', 'Performance')} {Math.round((performance.accuracy ?? 0) * 100)}% · {t('Motor', 'Motor')} {Math.round(((motor.pathEfficiencyMean ?? motor.smoothPursuitScore ?? 0) * 100))}%
            </span>
          </div>
        </div>
      )}

      {baselineEdgeAI && compositeDelta !== null && (
        <div style={{ marginBottom: '8px', padding: '8px', borderRadius: '10px', background: 'rgba(255,209,102,0.06)', border: '1px solid rgba(255,209,102,0.14)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.58rem', color: '#9fb0c2' }}>{t('Baseline pre-actividad', 'Pre-activity baseline')}: <strong>{baselineComposite}%</strong></span>
            <span style={{ fontSize: '0.58rem', color: '#9fb0c2' }}>{t('Actual con actividad', 'Current with activity')}: <strong>{currentComposite}%</strong></span>
            <span style={{ fontSize: '0.6rem', color: compositeDelta >= 0 ? '#7df0cb' : '#ff6b6b', fontWeight: 800 }}>{deltaLabel(compositeDelta)}</span>
          </div>
          {channelDeltas.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
              {channelDeltas.map((item) => (
                <span key={item.name} style={{ fontSize: '0.58rem', padding: '2px 7px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', color: item.delta >= 0 ? '#7df0cb' : '#ffb3b3' }}>
                  {item.label} {deltaLabel(item.delta)}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {emotions && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
          <span style={{ fontSize: '0.65rem', color: '#9fb0c2' }}>{t('Estado', 'State')}:</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: emotions.dominant === 'neutral' ? '#9fb0c2' : '#dff8ff' }}>
            {emotions.dominant === 'happiness' ? t('😊 Alegría', '😊 Happiness') :
             emotions.dominant === 'sadness' ? t('😢 Tristeza', '😢 Sadness') :
             emotions.dominant === 'surprise' ? t('😲 Sorpresa', '😲 Surprise') :
             emotions.dominant === 'fear' ? t('😨 Miedo', '😨 Fear') :
             emotions.dominant === 'anger' ? t('😠 Enojo', '😠 Anger') :
             emotions.dominant === 'disgust' ? t('🤢 Disgusto', '🤢 Disgust') :
             emotions.dominant === 'contempt' ? t('😏 Desprecio', '😏 Contempt') : t('😐 Neutral', '😐 Neutral')}
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
              {ch.label}: {ch.score}%{ch.source === 'game_telemetry' || ch.gameAdjusted ? t(' + juego', ' + game') : ''}
            </span>
          ))}
        </div>
      )}

      {composite && (
        <div style={{ marginTop: '4px', fontSize: '0.6rem', color: '#9fb0c2' }}>
          {t('Score compuesto', 'Composite score')}: <strong>{composite.score}%</strong> · {composite.level}
          {confidence?.captureQuality && (
            <span> · {t('calidad', 'quality')}: {confidence.captureQuality.overallScore}%</span>
          )}
        </div>
      )}
    </div>
  );
}
