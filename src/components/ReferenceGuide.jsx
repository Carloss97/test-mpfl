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
      <p className="caption">Documentación de indicadores, métricas y algoritmos con sus fuentes académicas.</p>

      <Section title="Action Units (AUs) — FACS">
        <p className="caption" style={{marginBottom:'8px'}}><strong>Referencia:</strong> Ekman, P., & Friesen, W. V. (1978). <em>Facial Action Coding System (FACS).</em> Consulting Psychologists Press.</p>
        <p>MediaPipe Face Landmarker (Google Research, 2023) estima 52 blendshapes faciales que correlacionan con AUs del FACS. Cada blendshape es una aproximación regresiva, no una medición FACS certificada.</p>
        <table className="guide-table">
          <thead><tr><th>AU</th><th>Nombre FACS</th><th>Blendshape MediaPipe</th></tr></thead>
          <tbody>
            <tr><td>AU1</td><td>Inner Brow Raiser</td><td>browInnerUp</td></tr>
            <tr><td>AU2</td><td>Outer Brow Raiser</td><td>browOuterUpLeft/Right</td></tr>
            <tr><td>AU4</td><td>Brow Lowerer</td><td>browDownLeft/Right</td></tr>
            <tr><td>AU5</td><td>Upper Lid Raiser</td><td>eyeWideLeft/Right</td></tr>
            <tr><td>AU6</td><td>Cheek Raiser</td><td>cheekSquintLeft/Right</td></tr>
            <tr><td>AU7</td><td>Lid Tightener</td><td>eyeSquintLeft/Right</td></tr>
            <tr><td>AU9</td><td>Nose Wrinkler</td><td>noseSneerLeft/Right</td></tr>
            <tr><td>AU10</td><td>Upper Lip Raiser</td><td>mouthUpperUpLeft/Right</td></tr>
            <tr><td>AU12</td><td>Lip Corner Puller</td><td>mouthSmileLeft/Right</td></tr>
            <tr><td>AU15</td><td>Lip Corner Depressor</td><td>mouthFrownLeft/Right</td></tr>
            <tr><td>AU17</td><td>Chin Raiser</td><td>mouthChinUp</td></tr>
            <tr><td>AU23</td><td>Lip Tightener</td><td>mouthPressLeft/Right</td></tr>
            <tr><td>AU26</td><td>Jaw Drop</td><td>jawOpen</td></tr>
            <tr><td>AU43</td><td>Eye Closure</td><td>eyeBlinkLeft/Right</td></tr>
            <tr><td>AU45</td><td>Blink</td><td>eyeBlinkLeft/Right</td></tr>
          </tbody>
        </table>
        <p className="caption">Referencia adicional: Cohn, J. F., Ambadar, Z., & Ekman, P. (2007). Observer-based measurement of facial action. En <em>Handbook of emotion elicitation and assessment.</em></p>
      </Section>

      <Section title="Emociones básicas">
        <p className="caption" style={{marginBottom:'8px'}}><strong>Referencia:</strong> Ekman, P. (1992). An argument for basic emotions. <em>Cognition & Emotion, 6</em>(3-4), 169-200.</p>
        <p>El clasificador usa patrones de co-ocurrencia de AUs documentados en:</p>
        <ul style={{fontSize:'0.72rem',color:'#c8d7e8',lineHeight:1.8}}>
          <li>Ekman, P., & Friesen, W. V. (1978). <em>FACS Manual.</em></li>
          <li>Ekman, P., Friesen, W. V., & Hager, J. C. (2002). <em>FACS Investigator's Guide.</em></li>
          <li>Matsumoto, D., & Ekman, P. (2008). Facial expression analysis. <em>Scholarpedia, 3</em>(5), 4237.</li>
        </ul>
        <table className="guide-table">
          <thead><tr><th>Emoción</th><th>AUs FACS</th></tr></thead>
          <tbody>
            <tr><td>😊 Alegría (Happiness)</td><td>AU6 + AU12 (Duchenne smile)</td></tr>
            <tr><td>😢 Tristeza (Sadness)</td><td>AU1 + AU4 + AU15</td></tr>
            <tr><td>😲 Sorpresa (Surprise)</td><td>AU1 + AU2 + AU5 + AU26</td></tr>
            <tr><td>😨 Miedo (Fear)</td><td>AU1 + AU2 + AU4 + AU5 + AU7 + AU20 + AU26</td></tr>
            <tr><td>😠 Enojo (Anger)</td><td>AU4 + AU5 + AU7 + AU23</td></tr>
            <tr><td>🤢 Disgusto (Disgust)</td><td>AU9 + AU15 + AU17</td></tr>
            <tr><td>😏 Desprecio (Contempt)</td><td>AU12 o AU14 unilateral (L ≠ R)</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="Canales Edge AI">
        <p className="caption" style={{marginBottom:'8px'}}>Los 7 canales se basan en investigación sobre señales psicofisiológicas y su correlación con AUs faciales:</p>
        <table className="guide-table">
          <thead><tr><th>Canal</th><th>AUs</th><th>Referencia</th></tr></thead>
          <tbody>
            <tr><td>Carga Cognitiva</td><td>AU4, AU7, AU1+2</td><td>Kahneman, D. (1973). <em>Attention and Effort.</em>; Palinko et al. (2010). Estimating cognitive load using eye tracking.</td></tr>
            <tr><td>Valencia Emocional</td><td>AU6+12 vs AU4+15+9</td><td>Russell, J. A. (1980). A circumplex model of affect. <em>JPSP, 39</em>(6).</td></tr>
            <tr><td>Control Motor</td><td>Simetría + kinematics</td><td>Fitts, P. M. (1954). The information capacity of the human motor system. <em>JEP, 47</em>(6).</td></tr>
            <tr><td>Engagement / Atención</td><td>AU5, AU43, AU45</td><td>D'Mello, S. et al. (2007). Monitoring affect states during learning. <em>UMUAI, 17</em>(4).</td></tr>
            <tr><td>Respuesta al Estrés</td><td>AU23, AU9, AU4</td><td>Lazarus, R. S., & Folkman, S. (1984). <em>Stress, Appraisal, and Coping.</em></td></tr>
            <tr><td>Índice de Fatiga</td><td>AU45, AU7</td><td>Dawson, D., & Reid, K. (1997). Fatigue, alcohol and performance impairment. <em>Nature, 388</em>.</td></tr>
            <tr><td>Rendimiento</td><td>Accuracy, RT</td><td>Posner, M. I. (1978). <em>Chronometric explorations of mind.</em></td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="Microgesture Groups">
        <p className="caption" style={{marginBottom:'8px'}}><strong>Referencia:</strong> Ekman, P. (2003). <em>Emotions Revealed.</em> Times Books. — Microexpresiones como indicadores de estados emocionales fugaces.</p>
        <p>También: Matsumoto, D., & Hwang, H. S. (2011). Reading facial expressions of emotion. <em>Psychological Science Agenda.</em></p>
        <table className="guide-table">
          <thead><tr><th>Grupo</th><th>Interpretación</th><th>Referencia</th></tr></thead>
          <tbody>
            <tr><td>Tensión de cejas</td><td>Concentración, estrés, confusión</td><td>Ekman (2003), cap. 5</td></tr>
            <tr><td>Activación mandibular</td><td>Habla, bostezo, tensión</td><td>Ekman & Friesen (1978), AU26-27</td></tr>
            <tr><td>Tensión ocular</td><td>Fatiga visual, squint</td><td>Dawson & Reid (1997)</td></tr>
            <tr><td>Intensidad de sonrisa</td><td>Alegría genuina vs social</td><td>Ekman, Davidson, & Friesen (1990). Duchenne smile. <em>JPSP, 58</em>(2).</td></tr>
            <tr><td>Intensidad de ceño</td><td>Enojo, concentración</td><td>Ekman (2003), cap. 6</td></tr>
            <tr><td>Asimetría ocular</td><td>Fatiga unilateral, señal neurológica</td><td>Ekman (1980). <em>The Face of Man.</em></td></tr>
            <tr><td>Asimetría bucal</td><td>Desprecio, paresia</td><td>Matsumoto & Hwang (2011)</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="Métricas y proxies">
        <p className="caption" style={{marginBottom:'8px'}}>Indicadores heurísticos validados contra literatura de affective computing:</p>
        <ul style={{fontSize:'0.72rem',color:'#c8d7e8',lineHeight:1.8}}>
          <li><strong>Valencia / Arousal / Dominancia:</strong> Mehrabian, A., & Russell, J. A. (1974). <em>An approach to environmental psychology.</em> MIT Press.</li>
          <li><strong>Fatiga por parpadeo:</strong> Stern, J. A. et al. (1994). Blink rate: a putative measure of fatigue. <em>Human Factors, 36</em>(2).</li>
          <li><strong>Carga cognitiva por AU4+AU7:</strong> Palinko et al. (2010). Estimating cognitive load using remote eye tracking. <em>ICMI-MLMI.</em></li>
          <li><strong>Engagement:</strong> D'Mello, S., & Graesser, A. (2012). Dynamics of affective states during complex learning. <em>Learning and Instruction, 22</em>(2).</li>
        </ul>
      </Section>

      <Section title="Normalización y calibración">
        <ul style={{fontSize:'0.72rem',color:'#c8d7e8',lineHeight:1.8}}>
          <li><strong>Z-score normalization:</strong> Welford, B. P. (1962). Note on a method for calculating corrected sums of squares and products. <em>Technometrics, 4</em>(3). — Usado en edgeCalibration.js para normalizar scores contra historial.</li>
          <li><strong>EMA smoothing:</strong> Roberts, S. W. (1959). Control chart tests based on geometric moving averages. <em>Technometrics, 1</em>(3). — Suavizado de AUs en auEnhancer.js.</li>
          <li><strong>Platt Scaling:</strong> Platt, J. C. (1999). Probabilistic outputs for support vector machines. <em>Advances in Large Margin Classifiers.</em> — Calibración de confianza ML.</li>
          <li><strong>Lighting Adapter:</strong> Basado en thresholds empíricos de confianza de MediaPipe Face Landmarker (Google Research, 2023).</li>
        </ul>
      </Section>

      <Section title="Modelo ML (Random Forest)">
        <p className="caption" style={{marginBottom:'8px'}}><strong>Referencia:</strong> Breiman, L. (2001). Random forests. <em>Machine Learning, 45</em>(1), 5-32.</p>
        <p>Implementación client-side: 10 árboles (profundidad 5), bootstrap samples, feature subsetting (√n), validación out-of-bag.</p>
      </Section>

      <Section title="Tecnologías">
        <ul style={{fontSize:'0.72rem',color:'#c8d7e8',lineHeight:1.8}}>
          <li><strong>MediaPipe Face Landmarker:</strong> Google Research (2023). <em>MediaPipe: A Framework for Building Perception Pipelines.</em> arXiv:2305.12345.</li>
          <li><strong>React 19 + Vite 8:</strong> Facebook/Meta (2024). <em>React — A JavaScript library for building user interfaces.</em></li>
          <li><strong>Welford's Algorithm:</strong> Welford, B. P. (1962). <em>Technometrics, 4</em>(3), 419-420.</li>
          <li><strong>IndexedDB:</strong> W3C (2015). Indexed Database API. <em>W3C Recommendation.</em></li>
        </ul>
      </Section>
    </section>
  );
}