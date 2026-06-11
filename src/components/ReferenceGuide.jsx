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
      <div className="panel-heading"><h2> Guía de referencia</h2></div>
      <p className="caption">Documentación de todos los indicadores con sus fuentes académicas y fórmulas de cálculo.</p>

      <Section title="Edge AI v8 — Pipeline bayesiano">
        <p className="caption">El pipeline procesa AUs en 4 etapas.</p>
        <table className="guide-table">
          <thead><tr><th>Etapa</th><th>Módulo</th><th>Descripción</th></tr></thead>
          <tbody>
            <tr><td>1. AUs crudas</td><td>gestureInsights.js</td><td>computeAUs(): promedia blendshapes de MediaPipe</td></tr>
            <tr><td>2. Procesamiento</td><td>auProcessor.js</td><td>processAllAUs(): baseline subtraction + ganancia adaptativa 1.5-3.0×</td></tr>
            <tr><td>3. Canales</td><td>edgeAiEngine.js</td><td>Bayesian scoring: sigmoide (k=8)</td></tr>
            <tr><td>4. Emociones</td><td>emotionClassifier.js</td><td>Naive Bayes con softmax, 8 clases</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="Canales Edge AI">
        <p className="caption">7 canales. Cada uno usa AUs específicas con likelihood ratios.</p>
        <table className="guide-table">
          <thead><tr><th>Canal</th><th>AUs principales</th><th>Referencia</th></tr></thead>
          <tbody>
            <tr><td>Carga Cognitiva</td><td>AU4 (3×), AU7 (3×), AU23 (2×)</td><td>Palinko et al. (2010)</td></tr>
            <tr><td>Valencia Emocional</td><td>AU6 (4×), AU12 (4×)</td><td>Russell (1980)</td></tr>
            <tr><td>Control Motor</td><td>Simetría AU L/R</td><td>Fitts (1954)</td></tr>
            <tr><td>Engagement</td><td>AU5 (4×), AU1 (2×), AU45 (0.15×)</td><td>D'Mello & Graesser (2012)</td></tr>
            <tr><td>Estrés</td><td>AU23 (4×), AU4 (2.5×), AU9 (2.5×)</td><td>Giannakakis et al. (2017)</td></tr>
            <tr><td>Fatiga</td><td>AU45 (5×), AU43 (3.5×), AU7 (2.5×)</td><td>Dinges et al. (1998)</td></tr>
            <tr><td>Rendimiento</td><td>Accuracy, RT, completion</td><td>Posner (1978)</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="Emociones básicas">
        <p className="caption">Naive Bayes con softmax. Referencia: Ekman & Friesen (1978).</p>
        <table className="guide-table">
          <thead><tr><th>Emoción</th><th>AUs principales</th></tr></thead>
          <tbody>
            <tr><td>Alegría</td><td>AU6 (6×), AU12 (6×)</td></tr>
            <tr><td>Tristeza</td><td>AU15 (4.5×), AU4 (2.5×), AU1 (3×)</td></tr>
            <tr><td>Sorpresa</td><td>AU5 (4×), AU1 (3.5×), AU2 (3.5×), AU26 (3.5×)</td></tr>
            <tr><td>Miedo</td><td>AU5 (2.5×), AU20 (3×), AU1 (2×)</td></tr>
            <tr><td>Enojo</td><td>AU4 (3×), AU23 (3.5×), AU7 (3×)</td></tr>
            <tr><td>Disgusto</td><td>AU9 (7×), AU15 (3×), AU17 (3×)</td></tr>
            <tr><td>Desprecio</td><td>Asimetría AU12 L/R</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="Métricas">
        <p className="caption">0 = mínimo, 1 = máximo. Umbrales orientativos.</p>
        <table className="guide-table">
          <thead><tr><th>Métrica</th><th>AUs</th><th>Interpretación</th></tr></thead>
          <tbody>
            <tr><td>Carga Cognitiva</td><td>AU4, AU7, AU5, AU23</td><td>{'>'}50%: esfuerzo mental (Palinko 2010)</td></tr>
            <tr><td>Tensión</td><td>AU4, AU7, AU23</td><td>{'>'}50%: estrés</td></tr>
            <tr><td>Atención</td><td>AU45, AU5, presencia</td><td>{'>'}60%: atención sostenida</td></tr>
            <tr><td>Fatiga</td><td>AU45, AU7, AU43</td><td>{'>'}30%: detectable (Dinges 1998)</td></tr>
            <tr><td>Estrés</td><td>AU4, AU23, AU9, AU27</td><td>{'>'}40%: elevado</td></tr>
            <tr><td>Calma</td><td>Inversa tensión+estrés</td><td>{'>'}70%: relajado</td></tr>
            <tr><td>Engagement</td><td>AU45, presencia, atención</td><td>{'>'}60%: comprometido</td></tr>
            <tr><td>Valencia</td><td>AU6+12 vs AU4+15+9</td><td>{'>'}0.5: positiva (Russell 1980)</td></tr>
            <tr><td>Arousal</td><td>AU1, AU2, AU5, AU26</td><td>{'>'}0.5: alta excitación</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="Gaze Tracking">
        <p className="caption">Estimación de mirada desde iris landmarks (468-477).</p>
        <table className="guide-table">
          <thead><tr><th>Componente</th><th>Descripción</th></tr></thead>
          <tbody>
            <tr><td>Método</td><td>Centroide iris vs nose bridge (landmark 6). Auto-calibración 60 frames</td></tr>
            <tr><td>Suavizado</td><td>EMA (α=0.12)</td></tr>
            <tr><td>Precisión</td><td>~2-5° error angular con webcam</td></tr>
            <tr><td>Métricas</td><td>screenFocusRatio, gazeStability, attentionScore</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="Body Pose (upper body)">
        <p className="caption">Estimación desde landmarks faciales. Sin modelos adicionales.</p>
        <table className="guide-table">
          <thead><tr><th>Métrica</th><th>Método</th><th>Interpretación</th></tr></thead>
          <tbody>
            <tr><td>Postura general</td><td>1 − tilt×0.4 − forward×0.3 − asym×0.3</td><td>{'>'}70%: buena postura</td></tr>
            <tr><td>Inclinación lateral</td><td>Ángulo oreja-oreja vs horizontal</td><td>0° = recto, ±15° = inclinado</td></tr>
            <tr><td>Inclinación frontal</td><td>Aspect ratio facial (altura/ancho)</td><td>Forward head si AR {'>'} 1.5</td></tr>
            <tr><td>Asimetría</td><td>Desviación nariz vs centro</td><td>{'>'}30%: cabeza girada</td></tr>
            <tr><td>Estabilidad</td><td>Dispersión jawline</td><td>Baja con movimiento</td></tr>
            <tr><td>Hombros (est.)</td><td>Geométrico: chin.y + faceHeight×2.5</td><td>Estimación sin modelo</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="Normalización">
        <table className="guide-table">
          <thead><tr><th>Técnica</th><th>Módulo</th><th>Referencia</th></tr></thead>
          <tbody>
            <tr><td>Z-score</td><td>edgeCalibration.js</td><td>Welford (1962)</td></tr>
            <tr><td>EMA suavizado</td><td>auEnhancer.js</td><td>Roberts (1959), α=0.35</td></tr>
            <tr><td>Platt Scaling</td><td>plattScaling.js</td><td>Platt (1999)</td></tr>
            <tr><td>Lighting Adapter</td><td>lightingAdapter.js</td><td>Calibración 2-6s</td></tr>
            <tr><td>Welford Algorithm</td><td>temporalFeatures.js</td><td>Single-pass O(n)</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="Tecnologías">
        <p>MediaPipe Face Landmarker (Google, 2023) · 478 landmarks + 52 blendshapes + iris · React 19 + Vite 8 · Web Workers · IndexedDB · auProcessor + emotionClassifier (Naive Bayes) · edgeCalibration (z-scores) · upperBodyPosture + MoveNet Lightning</p>
      </Section>
    </section>
  );
}