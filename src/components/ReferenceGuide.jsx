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
      <p className="caption">Cómo se calcula cada indicador, con sus fuentes académicas.</p>

      <Section title="Action Units (AUs) — FACS">
        <p className="caption"><strong>Fuente:</strong> Ekman, P., & Friesen, W. V. (1978). <em>Facial Action Coding System.</em> Consulting Psychologists Press.</p>
        <p><strong>Cálculo:</strong> Cada AU se obtiene promediando los blendshapes de MediaPipe asociados sobre todas las muestras con rostro detectado (<code>computeAUs</code> en <code>gestureInsights.js</code>). La intensidad es 0–1. Las AUs unilaterales (AU_L12, AU_R12, AU_L14, AU_R14) se mantienen separadas para detectar asimetría.</p>
        <p className="caption"><strong>Amplificación:</strong> Las AUs pasan por <code>signalAmplifier.js</code> que aplica ganancia adaptativa: 3.0× para señales débiles (&lt;0.10), 2.2× para moderadas, 1.6× para claras, 1.2× para fuertes. Esto compensa la subestimación de MediaPipe.</p>
        <table className="guide-table">
          <thead><tr><th>AU</th><th>Nombre FACS</th><th>Blendshape(s) MediaPipe</th><th>Región</th></tr></thead>
          <tbody>
            <tr><td>AU1</td><td>Inner Brow Raiser</td><td>browInnerUp</td><td>upper</td></tr>
            <tr><td>AU2</td><td>Outer Brow Raiser</td><td>browOuterUpLeft, browOuterUpRight</td><td>upper</td></tr>
            <tr><td>AU4</td><td>Brow Lowerer</td><td>browDownLeft, browDownRight</td><td>upper</td></tr>
            <tr><td>AU5</td><td>Upper Lid Raiser</td><td>eyeWideLeft, eyeWideRight</td><td>mid</td></tr>
            <tr><td>AU6</td><td>Cheek Raiser</td><td>cheekSquintLeft, cheekSquintRight</td><td>mid</td></tr>
            <tr><td>AU7</td><td>Lid Tightener</td><td>eyeSquintLeft, eyeSquintRight</td><td>mid</td></tr>
            <tr><td>AU9</td><td>Nose Wrinkler</td><td>noseSneerLeft, noseSneerRight</td><td>mid</td></tr>
            <tr><td>AU10</td><td>Upper Lip Raiser</td><td>mouthUpperUpLeft, mouthUpperUpRight</td><td>lower</td></tr>
            <tr><td>AU12</td><td>Lip Corner Puller</td><td>mouthSmileLeft, mouthSmileRight</td><td>lower</td></tr>
            <tr><td>AU14</td><td>Dimpler</td><td>mouthDimpleLeft, mouthDimpleRight</td><td>lower</td></tr>
            <tr><td>AU15</td><td>Lip Corner Depressor</td><td>mouthFrownLeft, mouthFrownRight</td><td>lower</td></tr>
            <tr><td>AU16</td><td>Lower Lip Depressor</td><td>mouthLowerDownLeft, mouthLowerDownRight</td><td>lower</td></tr>
            <tr><td>AU17</td><td>Chin Raiser</td><td>mouthChinUp</td><td>lower</td></tr>
            <tr><td>AU18</td><td>Lip Puckerer</td><td>mouthFunnel, mouthPucker</td><td>lower</td></tr>
            <tr><td>AU20</td><td>Lip Stretcher</td><td>mouthStretchLeft, mouthStretchRight</td><td>lower</td></tr>
            <tr><td>AU22</td><td>Lip Funneler</td><td>mouthFunnel</td><td>lower</td></tr>
            <tr><td>AU23</td><td>Lip Tightener</td><td>mouthPressLeft, mouthPressRight</td><td>lower</td></tr>
            <tr><td>AU24</td><td>Lip Pressor</td><td>mouthPressLeft, mouthPressRight</td><td>lower</td></tr>
            <tr><td>AU25</td><td>Lips Part</td><td>mouthClose (inversa)</td><td>lower</td></tr>
            <tr><td>AU26</td><td>Jaw Drop</td><td>jawOpen</td><td>lower</td></tr>
            <tr><td>AU27</td><td>Jaw Thrust</td><td>jawForward</td><td>lower</td></tr>
            <tr><td>AU28</td><td>Lip Suck</td><td>mouthRollLower, mouthRollUpper</td><td>lower</td></tr>
            <tr><td>AU43</td><td>Eye Closure</td><td>eyeBlinkLeft, eyeBlinkRight</td><td>mid</td></tr>
            <tr><td>AU45</td><td>Blink</td><td>eyeBlinkLeft, eyeBlinkRight</td><td>mid</td></tr>
            <tr><td>AU_L12</td><td>Smile Left (asimétrica)</td><td>mouthSmileLeft</td><td>lower</td></tr>
            <tr><td>AU_R12</td><td>Smile Right (asimétrica)</td><td>mouthSmileRight</td><td>lower</td></tr>
            <tr><td>AU_L14</td><td>Dimpler Left (asimétrica)</td><td>mouthDimpleLeft</td><td>lower</td></tr>
            <tr><td>AU_R14</td><td>Dimpler Right (asimétrica)</td><td>mouthDimpleRight</td><td>lower</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="Emociones básicas">
        <p className="caption"><strong>Fuente:</strong> Ekman, P. (1992). Basic emotions. <em>Cognition & Emotion, 6</em>(3-4), 169-200.</p>
        <p><strong>Cálculo:</strong> Cada emoción es el promedio simple de sus AUs constituyentes (boost 1.25x para compensar subestimación de MediaPipe, menos 70% de la baseline de calibración). La emoción dominante es la de mayor score. Si la suma de todas las emociones es baja, domina "neutral".</p>
        <table className="guide-table">
          <thead><tr><th>Emoción</th><th>AUs</th><th>Fórmula</th></tr></thead>
          <tbody>
            <tr><td>Alegría</td><td>AU6, AU12</td><td>(AU6 + AU12) / 2</td></tr>
            <tr><td>Tristeza</td><td>AU1, AU4, AU15</td><td>(AU1 + AU4 + AU15) / 3</td></tr>
            <tr><td>Sorpresa</td><td>AU1, AU2, AU5, AU26</td><td>(AU1 + AU2 + AU5 + AU26) / 4</td></tr>
            <tr><td>Miedo</td><td>AU1, AU2, AU4, AU5, AU7, AU20, AU26</td><td>(Σ 7 AUs) / 7</td></tr>
            <tr><td>Enojo</td><td>AU4, AU5, AU7, AU23</td><td>(AU4 + AU5 + AU7 + AU23) / 4</td></tr>
            <tr><td>Disgusto</td><td>AU9, AU15, AU17</td><td>(AU9 + AU15 + AU17) / 3</td></tr>
            <tr><td>Desprecio</td><td>AU12 L/R diff, AU14 L/R diff</td><td>max(|L12−R12|, |L14−R14|)</td></tr>
            <tr><td>Neutral</td><td>—</td><td>1 − Σ(otras emociones)</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="Canales Edge AI">
        <p className="caption">7 canales multidimensionales. Cada uno usa un subconjunto de AUs + features temporales. El score final se obtiene con <strong>toPercent()</strong>: función sigmoide centrada en 0.5 con pendiente 5.0 que mapea [0.2, 0.8] → [18%, 82%] para mayor varianza.</p>
        <table className="guide-table">
          <thead><tr><th>Canal</th><th>AUs usadas</th><th>Cálculo</th><th>Referencia</th></tr></thead>
          <tbody>
            <tr><td>Carga Cognitiva</td><td>AU4, AU7, AU1, AU2, AU23</td><td>0.65 × score_AUs + 0.35 × variabilidad_RT</td><td>Kahneman (1973); Palinko et al. (2010)</td></tr>
            <tr><td>Valencia Emocional</td><td>AU6, AU12 vs AU4, AU15, AU9</td><td>0.5 × (positivo − negativo + 1)/2 + 0.35 × sinceridad_Duchenne + 0.15 × (1 − asimetría)</td><td>Russell (1980)</td></tr>
            <tr><td>Control Motor</td><td>Simetría AUs + kinematics</td><td>0.25 × path_eff + 0.20 × suavidad + 0.25 × precisión + 0.30 × simetría_AU</td><td>Fitts (1954)</td></tr>
            <tr><td>Engagement</td><td>AU5, AU43, AU45</td><td>0.25 × presencia_facial + 0.30 × apertura_ocular + 0.25 × completion_rate + 0.20 × (1 − blink_rate)</td><td>D'Mello et al. (2007)</td></tr>
            <tr><td>Estrés</td><td>AU23, AU24, AU9, AU4, AU26, AU27</td><td>0.60 × (1 − tensión_oral_nasal) + 0.40 × recuperación_post_error</td><td>Lazarus & Folkman (1984)</td></tr>
            <tr><td>Fatiga</td><td>AU45, AU7, AU43, AU5</td><td>0.30 × blink_rate + 0.25 × squint + 0.25 × cierre_ocular + 0.20 × RT_decay</td><td>Dawson & Reid (1997); Stern et al. (1994)</td></tr>
            <tr><td>Rendimiento</td><td>Accuracy, RT, completion</td><td>0.30 × accuracy + 0.25 × RT_score + 0.20 × completion + 0.15 × recovery + 0.10 × consistency</td><td>Posner (1978)</td></tr>
          </tbody>
        </table>
        <p className="caption">El composite se pondera dinámicamente: canales faciales bajan su peso con iluminación pobre (×0.5–0.6). Motor control sube si hay datos de pointer (×1.2).</p>
      </Section>

      <Section title="Microgesture Groups">
        <p className="caption"><strong>Fuente:</strong> Ekman, P. (2003). <em>Emotions Revealed.</em> Times Books.</p>
        <p><strong>Cálculo:</strong> Cada grupo es el promedio de todos los blendshapes que lo componen sobre la ventana de muestras. <code>extractMicrogestureWindow</code> en <code>microgestureFeatures.js</code>.</p>
        <table className="guide-table">
          <thead><tr><th>Grupo</th><th>Blendshapes</th><th>Cálculo</th></tr></thead>
          <tbody>
            <tr><td>Tensión de cejas</td><td>browInnerUp, browDown L/R, browOuterUp L/R</td><td>mean(5 blendshapes)</td></tr>
            <tr><td>Activación mandibular</td><td>jawOpen, jawForward</td><td>mean(2 blendshapes)</td></tr>
            <tr><td>Tensión ocular</td><td>eyeSquint L/R, eyeWide L/R, eyeBlink L/R</td><td>mean(6 blendshapes)</td></tr>
            <tr><td>Sonrisa</td><td>mouthSmile L/R, cheekSquint L/R</td><td>mean(4 blendshapes)</td></tr>
            <tr><td>Ceño</td><td>mouthFrown L/R, browDown L/R</td><td>mean(4 blendshapes)</td></tr>
            <tr><td>Asimetría ocular</td><td>eyeBlinkLeft vs eyeBlinkRight</td><td>|L − R|</td></tr>
            <tr><td>Asimetría bucal</td><td>mouthSmile L/R, mouthFrown L/R</td><td>|L − R| promedio</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="Métricas / Proxies">
        <p className="caption">Indicadores heurísticos calculados desde blendshapes. <strong>Fuentes:</strong> Mehrabian & Russell (1974), Stern et al. (1994), Palinko et al. (2010).</p>
        <table className="guide-table">
          <thead><tr><th>Proxy</th><th>Fórmula</th></tr></thead>
          <tbody>
            <tr><td>Tensión</td><td>(browDown + eyeSquint + mouthPress + jawForward) / 4</td></tr>
            <tr><td>Atención</td><td>1 − clamp(eyeBlink × 2 + browDown × 0.5)</td></tr>
            <tr><td>Sorpresa</td><td>(browInnerUp + eyeWide + jawOpen) / 3</td></tr>
            <tr><td>Fatiga</td><td>clamp(eyeBlink × 2 + eyeSquint + jawOpen × 0.5)</td></tr>
            <tr><td>Estrés</td><td>(mouthPress + browDown + jawForward + noseSneer) / 4</td></tr>
            <tr><td>Engagement</td><td>facePresence × (1 − eyeBlink) × (1 − jawOpen × 0.3)</td></tr>
            <tr><td>Valencia</td><td>(smile − frown + 1) / 2</td></tr>
            <tr><td>Arousal</td><td>(eyeWide + jawOpen + browInnerUp) / 3</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="Normalización y calibración">
        <ul style={{fontSize:'0.72rem',color:'#c8d7e8',lineHeight:1.8}}>
          <li><strong>Z-score (edgeCalibration.js):</strong> Welford, B. P. (1962). <em>Technometrics, 4</em>(3). Media y desviación estándar sobre historial de 50 sesiones. Scores con |z| &gt; 2.5 se marcan como anomalías.</li>
          <li><strong>EMA suavizado (auEnhancer.js):</strong> Roberts, S. W. (1959). <em>Technometrics, 1</em>(3). Suavizado exponencial α=0.35 por AU.</li>
          <li><strong>Platt Scaling (plattScaling.js):</strong> Platt, J. C. (1999). Probabilistic outputs for SVMs. Gradient descent on-line para calibrar confianza ML.</li>
          <li><strong>Lighting Adapter (lightingAdapter.js):</strong> Thresholds empíricos sobre confianza de MediaPipe. Duración de calibración variable (2s–6s) según calidad de luz.</li>
          <li><strong>Welford's Algorithm (temporalFeatures.js):</strong> Welford, B. P. (1962). Single-pass mean/variance. Evita O(n²).</li>
        </ul>
      </Section>

      <Section title="Modelo ML">
        <p className="caption"><strong>Fuente:</strong> Breiman, L. (2001). Random forests. <em>Machine Learning, 45</em>(1), 5-32.</p>
        <p><strong>Arquitectura:</strong> 10 árboles × profundidad 5. Bootstrap samples + feature subsetting (√n ≈ 7 features de 46). Validación out-of-bag. Features: 30 AUs + 10 microgesture groups + head pose + blink + presence. Labels: 4 clases (attention, fatigue, stress, engagement) derivadas de los scores del Edge AI.</p>
      </Section>

      <Section title="Tecnologías">
        <ul style={{fontSize:'0.72rem',color:'#c8d7e8',lineHeight:1.8}}>
          <li><strong>MediaPipe Face Landmarker:</strong> Google Research (2023). 478 landmarks + 52 blendshapes. Modelo: atención + convolución sobre GPU/CPU.</li>
          <li><strong>React 19 + Vite 8:</strong> Meta (2024). Runtime + bundler.</li>
          <li><strong>Web Workers:</strong> W3C. Procesamiento facial en hilo separado (faceLandmarkerWorker.js).</li>
          <li><strong>IndexedDB:</strong> W3C (2015). Persistencia local de sesiones (storageManager.js).</li>
        </ul>
      </Section>
    </section>
  );
}