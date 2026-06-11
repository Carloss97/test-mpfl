import React, { useRef, useState } from 'react';
import FaceMeshOverlayWrapper from './FaceMeshOverlayWrapper.jsx';

const CH_COLORS = {
  cognitiveLoad: 'var(--ink-yellow)', emotionalValence: 'var(--ink-green)',
  motorControl: 'var(--ink-blue)', engagement: 'var(--ink-green)',
  stressResponse: 'var(--ink-blue)', fatigueIndex: 'var(--ink-red)',
  taskPerformance: 'var(--ink-yellow)',
};
const EMO_ICONS = { happiness:'😊',sadness:'😢',surprise:'😲',fear:'😨',anger:'😠',disgust:'🤢',contempt:'😏',neutral:'😐' };
const EMO_CLRS = { happiness:'#4dd4ac',sadness:'#74a7ff',surprise:'#ffd166',fear:'#ffb4b4',anger:'#ff6b6b',disgust:'#c8a86e',contempt:'#d4a574',neutral:'#9fb0c2' };

function fmt(n,d=3){return Number.isFinite(n)?Number(n).toFixed(d):Number(0).toFixed(d)}
function pct(v){const x=Math.min(1,Math.max(0,Number.isFinite(v)?v:0));return`${Math.round(x*100)}%`}
function light(c){return c==='good'?'var(--ink-green)':c==='moderate'?'var(--ink-yellow)':'var(--ink-red)'}

export default function Dashboard({
  videoRef,isCameraActive,showMesh,setShowMesh,
  telemetry,faceWorker,statusClassName,lastQuality,
  calibrationProfile,calStatusLabel,
  insightItems,auEntries,activeAUCount,
  edgeAIResult,edgeChannels,edgeConfidence,edgeComposite,
  latestLandmarks,latestGaze,auRegionSummary,DEVICE_CONFIG,
  latestPose,
}){
  const camRef=useRef(null), meshRef=useRef(null);
  const emotions=edgeAIResult?.emotions;
  const captureQ=edgeAIResult?.confidence?.captureQuality;
  const sc=`status ${statusClassName}`;
  const [openMetrics,setOpenMetrics]=useState(false);
  const [openEdge,setOpenEdge]=useState(true); // open by default
  const [openStats,setOpenStats]=useState(false);
  const [openPosture,setOpenPosture]=useState(true);
  const [openAuBars,setOpenAuBars]=useState(false);

  return(
    <div className="dashboard-v2">
      <div className="dash-cam-row">
        <article className="panel dash-cam-panel">
          <div className="panel-heading"><h2>📷 Webcam</h2><span className={sc}>{faceWorker.status}</span></div>
          <div className="camera-container" ref={camRef}>
            <video ref={videoRef} className="camera" muted playsInline/>
          </div>
          <div className="mesh-toggle">
            <label><input type="checkbox" checked={showMesh} onChange={e=>setShowMesh(e.target.checked)}/> Mostrar mesh</label>
            <span className="caption" style={{marginLeft:'auto'}}>{faceWorker.delegate??'CPU'} · {telemetry.sampleCount} muestras</span>
          </div>
          <div className="summary-grid summary-grid-compact">
            <div><span>Rostros</span><strong>{lastQuality?.faceCount??0}</strong></div>
            <div><span>Confianza</span><strong>{pct(telemetry.meanConfidence)}</strong></div>
            <div><span>Presencia</span><strong>{pct(telemetry.facePresenceRatio)}</strong></div>
            <div><span>FPS</span><strong>{fmt(telemetry.fpsEstimate,1)}</strong></div>
            <div><span>Calibración</span><strong style={{color:calibrationProfile?.eligible?'var(--ink-green)':'var(--ink-yellow)'}}>{calStatusLabel}</strong></div>
          </div>
          {captureQ&&(
            <div className="capture-quality-bar">
              <span className="cq-label">Calidad</span>
              <div className="cq-track"><div className="cq-fill" style={{width:`${captureQ.overallScore}%`,background:light(captureQ.illumination)}}/></div>
              <strong style={{color:light(captureQ.illumination)}}>{captureQ.overallScore}%</strong>
              <span className="cq-detail">{captureQ.illumination}{captureQ.occlusion?' · ocluido':''}</span>
            </div>
          )}
        </article>

        <article className="panel dash-mesh-panel">
          <div className="panel-heading"><h2>🧬 Rostro</h2><span className="status ready" style={{fontSize:'0.65rem'}}>{latestLandmarks?'detectado':'sin rostro'}</span></div>
          <div className="mesh-dark-container" ref={meshRef}>
            <FaceMeshOverlayWrapper containerRef={meshRef} landmarks={latestLandmarks} visible={showMesh} auRegionActivation={auRegionSummary} gaze={latestGaze}/>
          </div>

          {telemetry.recentCount>0&&(
            <div className="mesh-info-footer">
              {emotions&&(
                <div className="mesh-emotion-line">
                  <span style={{fontSize:'1.3rem'}}>{EMO_ICONS[emotions.dominant]||'😐'}</span>
                  <strong style={{color:EMO_CLRS[emotions.dominant]}}>{emotions.dominant==='happiness'?'Alegría':emotions.dominant==='sadness'?'Tristeza':emotions.dominant==='surprise'?'Sorpresa':emotions.dominant==='fear'?'Miedo':emotions.dominant==='anger'?'Enojo':emotions.dominant==='disgust'?'Disgusto':emotions.dominant==='contempt'?'Desprecio':'Neutral'}</strong>
                  <span className="caption" style={{fontSize:'0.58rem'}}>intensidad {Math.round(emotions.dominantScore*100)}%</span>
                </div>
              )}
              {/* Human-readable facial activity summary */}
              <div className="mesh-human-text">
                {(()=>{
                  const top=auEntries.slice(0,3).filter(([,a])=>a.intensity>0.04);
                  if(!top.length)return<span className="caption">Rostro en reposo</span>;
                  const parts=[];
                  const hasEyebrows=top.some(([c])=>c==='AU1'||c==='AU2'||c==='AU4');
                  const hasEyes=top.some(([c])=>c==='AU5'||c==='AU6'||c==='AU7'||c==='AU43'||c==='AU45');
                  const hasMouth=top.some(([c])=>c==='AU10'||c==='AU12'||c==='AU14'||c==='AU15'||c==='AU20'||c==='AU23'||c==='AU26');
                  if(hasEyebrows)parts.push('cejas activas');
                  if(hasEyes)parts.push('ojos activos');
                  if(hasMouth)parts.push('boca activa');
                  if(emotions?.dominant&&emotions.dominant!=='neutral')parts.push(`expresión: ${emotions.dominant==='happiness'?'alegría':emotions.dominant==='sadness'?'tristeza':emotions.dominant==='surprise'?'sorpresa':emotions.dominant==='fear'?'miedo':emotions.dominant==='anger'?'enojo':emotions.dominant==='disgust'?'disgusto':emotions.dominant==='contempt'?'desprecio':emotions.dominant}`);
                  return<span style={{fontSize:'0.7rem',color:'#c8d7e8'}}>{parts.join(' · ')}</span>;
                })()}
              </div>
            </div>
          )}
        </article>
      </div>

      {/* Upper body posture — collapsible */}
      <div className="dash-section">
        <div className="dash-section-hdr" onClick={()=>setOpenPosture(!openPosture)} style={{cursor:'pointer',userSelect:'none'}}>
          <span className="dash-section-arrow">{openPosture?'▼':'▶'}</span>
          <span className="dash-section-title">🧍 Postura (upper body)</span>
          <span className="dash-section-badge">{latestPose?Math.round(latestPose.postureScore*100)+'%':'—'}</span>
        </div>
        {openPosture&&<div className="dash-section-body">
          {latestPose ? (
            <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:'4px 16px',fontSize:'0.72rem',color:'#c8d7e8'}}>
              <span className="caption">Postura general</span><strong>{Math.round(latestPose.postureScore*100)}%</strong>
              <span className="caption">Inclinación lateral</span><strong>{latestPose.headTiltDeg.toFixed(1)}°</strong>
              <span className="caption">Inclinación frontal</span><strong>{Math.round(latestPose.headForward*100)}%</strong>
              <span className="caption">Asimetría facial</span><strong>{Math.round(latestPose.asymmetry*100)}%</strong>
              <span className="caption">Estabilidad</span><strong>{Math.round(latestPose.stability*100)}%</strong>
              <span className="caption" style={{gridColumn:'1/-1',marginTop:'8px'}}>
                Estimado desde landmarks faciales (orejas, nariz, mentón). Detecta head tilt, forward head posture (aspect ratio) y asimetría.
              </span>
            </div>
          ) : (
            <p className="caption">Esperando landmarks faciales...</p>
          )}
        </div>}
      </div>

      {/* Collapsible sections */}
      <div className="dash-section">
        <div className="dash-section-hdr" onClick={()=>setOpenMetrics(!openMetrics)} style={{cursor:'pointer',userSelect:'none'}}>
          <span className="dash-section-arrow">{openMetrics?'▼':'▶'}</span>
          <span className="dash-section-title">📊 Métricas</span>
          <span className="dash-section-badge">{telemetry.recentCount} muestras</span>
        </div>
        {openMetrics&&<div className="dash-section-body">
          {telemetry.recentCount>0?(
            <div className="metrics-grid-compact">
              {insightItems.map(item=>(
                <div className="metric-compact" key={item.id}>
                  <div className="metric-label"><span>{item.label}</span><strong>{pct(item.value)}</strong></div>
                  <div className="metric-bar"><div className="metric-bar-fill" style={{width:pct(item.value),background:'var(--ink-green)'}}/></div>
                </div>
              ))}
            </div>
          ):<p className="caption">Esperando datos...</p>}
        </div>}
      </div>

      {edgeAIResult&&(
        <div className="dash-section">
          <div className="dash-section-hdr" onClick={()=>setOpenEdge(!openEdge)} style={{cursor:'pointer',userSelect:'none'}}>
            <span className="dash-section-arrow">{openEdge?'▼':'▶'}</span>
            <span className="dash-section-title">🧠 Edge AI</span>
            <span className="dash-section-badge">{edgeComposite?.score??'—'}% {edgeComposite?.level??'—'}</span>
          </div>
          {openEdge&&<div className="dash-section-body">
            <div className="edge-composite-bar" style={{marginBottom:'10px'}}>
              <span className="composite-label">Score</span>
              <div className="composite-track"><div className="composite-fill" style={{width:`${edgeComposite?.score??0}%`}}/></div>
              <strong>{edgeComposite?.score??'—'}%</strong>
              <span className={`composite-level ${edgeComposite?.level??''}`}>{edgeComposite?.level??'—'}</span>
            </div>
            <div className="edge-channels-grid-compact">
              {Object.entries(edgeChannels).map(([name,ch])=>(
                <div className="edge-channel-card" key={name} style={{borderColor:CH_COLORS[name]||'var(--ink-blue)',marginBottom:'4px',padding:'6px 10px'}}>
                  <div className="edge-channel-header">
                    <span className="edge-channel-label" style={{fontSize:'0.68rem'}}>{ch.label}</span>
                    <span className={`edge-channel-level ${ch.level}`} style={{fontSize:'0.55rem'}}>{ch.level}</span>
                  </div>
                  <div className="edge-channel-bar-track" style={{height:'5px'}}>
                    <div className="edge-channel-bar-fill" style={{width:`${ch.score}%`,background:CH_COLORS[name]||'var(--ink-blue)'}}/>
                  </div>
                  <div className="edge-channel-score-row"><strong style={{fontSize:'0.75rem'}}>{ch.score}%</strong></div>
                </div>
              ))}
            </div>
            {edgeAIResult.caveats?.length>0&&(
              <p className="caption" style={{color:'var(--ink-yellow)',fontSize:'0.55rem',marginTop:'6px'}}>⚠ {edgeAIResult.caveats[0]}</p>
            )}
          </div>}
        </div>
      )}

      <div className="dash-section">
        <div className="dash-section-hdr" onClick={()=>setOpenStats(!openStats)} style={{cursor:'pointer',userSelect:'none'}}>
          <span className="dash-section-arrow">{openStats?'▼':'▶'}</span>
          <span className="dash-section-title">📈 Estadísticas</span>
          <span className="dash-section-badge">{telemetry.sampleCount} total</span>
        </div>
        {openStats&&<div className="dash-section-body">
          <div className="stats-grid-compact">
            <div className="stat-item"><span>Muestras</span><strong>{telemetry.sampleCount}</strong></div>
            <div className="stat-item"><span>Ventana</span><strong>{telemetry.recentCount}</strong></div>
            <div className="stat-item"><span>Presencia</span><strong>{Math.round(telemetry.facePresenceRatio*100)}%</strong></div>
            <div className="stat-item"><span>Confianza</span><strong>{fmt(telemetry.meanConfidence,2)}</strong></div>
            <div className="stat-item"><span>FPS</span><strong>{fmt(telemetry.fpsEstimate,1)}</strong></div>
            <div className="stat-item"><span>AUs</span><strong>{activeAUCount}</strong></div>
            <div className="stat-item"><span>Motor</span><strong>{faceWorker.delegate??'CPU'}</strong></div>
            <div className="stat-item"><span>Score</span><strong style={{color:edgeComposite?.level==='strong'?'var(--ink-green)':edgeComposite?.level==='moderate'?'var(--ink-yellow)':'var(--ink-red)'}}>{edgeComposite?.score??'—'}%</strong></div>
          </div>
        </div>}
      </div>

      {telemetry.recentCount>0&&auEntries.length>0&&(
        <div className="dash-section">
          <div className="dash-section-hdr" onClick={()=>setOpenAuBars(!openAuBars)} style={{cursor:'pointer',userSelect:'none'}}>
            <span className="dash-section-arrow">{openAuBars?'▼':'▶'}</span>
            <span className="dash-section-title">📈 Actividad muscular</span>
            <span className="dash-section-badge">{activeAUCount} activas</span>
          </div>
          {openAuBars&&<div className="dash-section-body">
            <div className="au-timeline">
              {auEntries.slice(0,12).map(([code,au])=>(
                <div key={code} className={`au-timeline-item ${au.intensity>0.05?'active':''}`}>
                  <span className="au-timeline-code">{code}</span>
                  <div className="au-timeline-track">
                    <div className="au-timeline-fill" style={{width:`${Math.round(au.intensity*100)}%`,background:au.intensity>0.08?'var(--ink-green)':au.intensity>0.04?'var(--ink-yellow)':'var(--ink-blue)'}}/>
                  </div>
                  <strong style={{fontSize:'0.62rem',minWidth:'28px',textAlign:'right'}}>{Math.round(au.intensity*100)}%</strong>
                </div>
              ))}
            </div>
          </div>}
        </div>
      )}
    </div>
  );
}