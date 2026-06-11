import React, { useState } from 'react';

function Section({title,children}){
  const [open,setOpen]=useState(false);
  return(
    <div className="guide-section">
      <div className="guide-hdr" onClick={()=>setOpen(!open)} style={{cursor:'pointer',userSelect:'none'}}>
        <span className="guide-arrow">{open?'▼':'▶'}</span>
        <span className="guide-title">{title}</span>
      </div>
      {open&&<div className="guide-body">{children}</div>}
    </div>
  );
}

export default function ReferenceGuide(){
  return(
    <section className="panel reference-guide" style={{marginTop:'32px'}}>
      <div className="panel-heading"><h2>📖 Guía de referencia</h2></div>
      <p className="caption">Documentación de todos los indicadores con sus fuentes académicas y fórmulas de cálculo.</p>

      <Section title="🧠 Edge AI v8 — Pipeline bayesiano">
        <p className="caption">El pipeline procesa AUs en 4 etapas. Cada etapa tiene un módulo independiente.</p>
        <table className="guide-table">
          <thead><tr><th>Etapa</th><th>Módulo</th><th>Descripción</th></tr></thead>
          <tbody>
            <tr><td>1. AUs crudas</td><td>gestureInsights.js</td><td>computeAUs(): promedia blendshapes de MediaPipe sobre muestras con rostro</td></tr>
            <tr><td>2. Procesamiento</td><td>auProcessor.js</td><td>processAllAUs(): resta baseline (80%) + ganancia adaptativa (1.5-3.0×)</td></tr>
            <tr><td>3. Canales</td><td>edgeAiEngine.js</td><td>Bayesian scoring: log-likelihood por AU → sigmoide (k=8) → score 0-100%</td></tr>
            <tr><td>4. Emociones</td><td>emotionClassifier.js</td><td>Naive Bayes con softmax sobre 8 clases. Likelihoods calibrados según FACS</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="📊 Canales Edge AI">
        <p className="caption">7 canales. Cada uno estima una dimensión cognitiva/emocional usando AUs específicas. El ratio indica cuánto contribuye cada AU al score (mayor = más influyente).</p>
        <table className="guide-table">
          <thead><tr><th>Canal</th><th>AUs principales (ratio)</th><th>Referencia</th></tr></thead>
          <tbody>
            <tr><td>Carga Cognitiva</td><td>AU4 (3×), AU7 (3×), AU23 (2×)</td><td>Palinko et al. (2010)</td></tr>
            <tr><td>Valencia Emocional</td><td>AU6 (4×), AU12 (4×) positivo; AU4 (0.2×) negativo</td><td>Russell (1980)</td></tr>
            <tr><td>Control Motor</td><td>Simetría AU L/R</td><td>Fitts (1954)</td></tr>
            <tr><td>Engagement</td><td>AU5 (4×), AU1 (2×), AU45 (0.15×)</td><td>D'Mello & Graesser (2012)</td></tr>
            <tr><td>Estrés</td><td>AU23 (4×), AU4 (2.5×), AU9 (2.5×)</td><td>Giannakakis et al. (2017)</td></tr>
            <tr><td>Fatiga</td><td>AU45 (5×), AU43 (3.5×), AU7 (2.5×)</td><td>Dinges et al. (1998)</td></tr>
            <tr><td>Rendimiento</td><td>Accuracy, RT, completion (datos reales)</td><td>Posner (1978)</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="😊 Emociones básicas">
        <p className="caption">Clasificador Naive Bayes con softmax. 8 clases (7 emociones + neutral). Cada emoción tiene likelihood ratios específicos del FACS (Ekman & Friesen, 1978).</p>
        <table className="guide-table">
          <thead><tr><th>Emoción</th><th>AUs principales (ratio)</th><th>Referencia</th></tr></thead>
          <tbody>
            <tr><td>😊 Alegría</td><td>AU6 (6×), AU12 (6×)</td><td>Ekman & Friesen (1978)</td></tr>
            <tr><td>😢 Tristeza</td><td>AU15 (4.5×), AU4 (4×), AU1 (3×)</td><td>Ekman & Friesen (1978)</td></tr>
            <tr><td>😲 Sorpresa</td><td>AU5 (4×), AU1 (3.5×), AU2 (3.5×), AU26 (3.5×)</td><td>Ekman (1992)</td></tr>
            <tr><td>😨 Miedo</td><td>AU5 (3×), AU20 (3×), AU1 (2.5×), AU7 (2.5×), AU4 (2×), AU2 (2.5×), AU26 (2×)</td><td>Ekman (1992)</td></tr>
            <tr><td>😠 Enojo</td><td>AU4 (5×), AU23 (4×), AU7 (3.5×), AU5 (2×)</td><td>Ekman & Friesen (1978)</td></tr>
            <tr><td>🤢 Disgusto</td><td>AU9 (7×), AU15 (3×), AU17 (3×)</td><td>Ekman & Friesen (1978)</td></tr>
            <tr><td>😏 Desprecio</td><td>Asimetría AU12 L/R, AU14 L/R</td><td>Ekman & Friesen (1978)</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="📈 Métricas — Interpretación">
        <p className="caption">Todas las métricas van de 0 (mínimo) a 1 (máximo). Se calculan a partir de AUs procesadas por auProcessor. Los umbrales son orientativos.</p>
        <table className="guide-table">
          <thead><tr><th>Métrica</th><th>AUs usadas</th><th>Interpretación</th></tr></thead>
          <tbody>
            <tr><td>Carga Cognitiva</td><td>AU4, AU7, AU5, AU23</td><td>{'>'}50%: esfuerzo mental elevado (Palinko 2010)</td></tr>
            <tr><td>Tensión</td><td>AU4, AU7, AU23</td><td>{'>'}50%: estrés o concentración forzada</td></tr>
            <tr><td>Atención</td><td>AU45, AU5, presencia</td><td>{'>'}60%: atención sostenida (bajo parpadeo)</td></tr>
            <tr><td>Fatiga (PERCLOS)</td><td>AU45, AU7, AU43</td><td>{'>'}30%: detectable (Dinges 1998, Ji 2004)</td></tr>
            <tr><td>Estrés</td><td>AU4, AU23, AU9, AU27</td><td>{'>'}40%: elevado (Giannakakis 2017)</td></tr>
            <tr><td>Calma</td><td>Inversa de tensión+estrés</td><td>{'>'}70%: estado relajado</td></tr>
            <tr><td>Engagement</td><td>AU45, presencia, atención</td><td>{'>'}60%: comprometido (D'Mello 2012)</td></tr>
            <tr><td>Aburrimiento</td><td>Engagement, AU45, presencia</td><td>{'>'}40%: posible aburrimiento</td></tr>
            <tr><td>Valencia</td><td>AU6+12 vs AU4+15+9</td><td>{'>'}0.5: positiva (Russell 1980)</td></tr>
            <tr><td>Arousal</td><td>AU1, AU2, AU5, AU26</td><td>{'>'}0.5: alta excitación (Mehrabian 1974)</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="👁️ Gaze Tracking">
        <p className="caption">Estimación de dirección de mirada usando los iris landmarks de MediaPipe (índices 468-477).</p>
        <table className="guide-table">
          <thead><tr><th>Componente</th><th>Descripción</th></tr></thead>
          <tbody>
            <tr><td>Método</td><td>Centroide del iris vs centroide del ojo → vector de mirada + compensación head pose</td></tr>
            <tr><td>Suavizado</td><td>EMA (α=0.3) para reducir jitter</td></tr>
            <tr><td>Precisión</td><td>~2-5° error angular con webcam estándar</td></tr>
            <tr><td>Métricas</td><td>screenFocusRatio, gazeStability, attentionScore</td></tr>
            <tr><td>Visualización</td><td>Círculo amarillo en el FaceMesh que sigue la mirada en tiempo real</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="🧍 Body Pose">
        <p className="caption">Detección de postura corporal usando MediaPipe Pose Landmarker (33 landmarks). Corre en worker separado a 8 fps.</p>
        <table className="guide-table">
          <thead><tr><th>Componente</th><th>Descripción</th></tr></thead>
          <tbody>
            <tr><td>Modelo</td><td>pose_landmarker_lite.task (~5MB). GPU delegate.</td></tr>
            <tr><td>Métricas</td><td>postureScore (alineación hombros), shoulderAngle, headForward (inclinación), bodyStability</td></tr>
            <tr><td>Visualización</td><td>Silueta corporal con 33 puntos + conexiones anatómicas en canvas dedicado</td></tr>
            <tr><td>Referencia</td><td>MediaPipe Pose (Google Research, 2020)</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="⚙️ Normalización">
        <table className="guide-table">
          <thead><tr><th>Técnica</th><th>Módulo</th><th>Referencia</th></tr></thead>
          <tbody>
            <tr><td>Z-score</td><td>edgeCalibration.js</td><td>Welford (1962). Scores contra historial 50 sesiones</td></tr>
            <tr><td>EMA suavizado</td><td>auEnhancer.js</td><td>Roberts (1959). α=0.35 por AU</td></tr>
            <tr><td>Platt Scaling</td><td>plattScaling.js</td><td>Platt (1999). Calibración confianza ML</td></tr>
            <tr><td>Lighting Adapter</td><td>lightingAdapter.js</td><td>Calibración 2-6s según calidad de luz</td></tr>
            <tr><td>Welford's Algorithm</td><td>temporalFeatures.js</td><td>Single-pass O(n)</td></tr>
          </tbody>
        </table>
      </Section>
    </section>
  );
}