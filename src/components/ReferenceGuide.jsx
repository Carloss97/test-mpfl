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

      <Section title="Edge AI v8 — Pipeline bayesiano">
              <p className="caption"><strong>Pipeline:</strong> computeAUs → processAllAUs (baseline subtraction + ganancia adaptativa 1.5-3.0×) → Bayesian scoring por canal (likelihood ratios) → classifyEmotions (softmax Naive Bayes).</p>
              <p><strong>Canales:</strong> Carga Cognitiva, Valencia Emocional, Control Motor, Engagement, Estrés, Fatiga, Rendimiento. Cada canal usa likelihood ratios empíricos: AUs que aumentan el score tienen ratio &gt;1, las que lo disminuyen tienen ratio &lt;1. El score final es una sigmoide (k=8) sobre el log-odds ratio.</p>
              <p><strong>Emociones:</strong> Naive Bayes con softmax sobre 8 clases. Likelihood ratios calibrados según FACS (Ekman & Friesen, 1978). Sin double boost.</p>
              <p><strong>auProcessor.js:</strong> Unifica baseline subtraction + ganancia adaptativa. Reemplaza signalAmplifier + temporalContrast + auEnhancer.</p>
            </Section>

      <Section title="Interpretación de métricas">
        <p className="caption">Todas las métricas van de 0 (mínimo) a 1 (máximo). Se calculan a partir de AUs amplificadas + contraste temporal. Los umbrales son orientativos basados en literatura.</p>
        <p><strong>Carga Cognitiva:</strong> AU4+AU7+AU23. Alta significa esfuerzo mental (ceño fruncido + ojos apretados). {'>'}50%: carga notable. Referencia: Palinko et al. (2010).</p>
        <p><strong>Tensión:</strong> (AU4+AU7+AU23)/3. Tensión muscular facial. {'>'}50%: estrés o concentración forzada.</p>
        <p><strong>Atención:</strong> Ojos abiertos (AU5) + bajo parpadeo (AU45) + rostro presente. {'>'}60%: atención sostenida.</p>
        <p><strong>Fatiga (PERCLOS):</strong> AU45+AU7+AU43. {'>'}30%: fatiga detectable. {'>'}50%: significativa. Referencia: Dinges et al. (1998), Ji et al. (2004).</p>
        <p><strong>Estrés:</strong> AU4+AU23+AU9+AU27. {'>'}40%: elevado. Referencia: Giannakakis et al. (2017).</p>
        <p><strong>Calma:</strong> 1 − (tensión+estrés)/2. {'>'}70%: estado relajado.</p>
        <p><strong>Engagement:</strong> atención + presencia − parpadeo. {'>'}60%: comprometido. Referencia: D'Mello & Graesser (2012).</p>
        <p><strong>Valencia:</strong> 0-1. {'>'}0.5 = positiva (sonrisa), {'<'}0.5 = negativa (ceño). Referencia: Russell (1980).</p>
        <p><strong>Arousal:</strong> Activación fisiológica (AU1+AU2+AU5+AU26). {'>'}50%: alta excitación. Referencia: Mehrabian & Russell (1974).</p>
      </Section>

      <Section title="Action Units (AUs) — FACS">
        <p className="caption"><strong>Fuente:</strong> Ekman, P., & Friesen, W. V. (1978). <em>Facial Action Coding System.</em></p>
        <p>MediaPipe Face Landmarker estima 52 blendshapes que se mapean a 28 AUs. Las AUs pasan por signalAmplifier (ganancia adaptativa 1.2-3.0×) y temporalContrast (comparación contra media móvil). Las AUs asimétricas (AU_L12, AU_R12, etc.) detectan expresiones unilaterales.</p>
      </Section>

      <Section title="Emociones básicas (Ekman)">
        <p className="caption"><strong>Fuente:</strong> Ekman, P. (1992). Basic emotions. <em>Cognition & Emotion, 6</em>(3-4).</p>
        <p>Clasificador por promedio simple de AUs con boost 1.8× y baseline subtraction. 7 emociones + neutral. La dominante requiere superar a neutral por margen. Si dos emociones compiten, gana la de mayor score.</p>
        <p>Alegría = (AU6+AU12)/2. Tristeza = (AU1+AU4+AU15)/3. Sorpresa = (AU1+AU2+AU5+AU26)/4. Miedo = promedio de 7 AUs. Enojo = (AU4+AU5+AU7+AU23)/4. Disgusto = (AU9+AU15+AU17)/3. Desprecio = asimetría AU12 o AU14.</p>
      </Section>

      <Section title="Microgesture Groups">
        <p className="caption"><strong>Fuente:</strong> Ekman, P. (2003). <em>Emotions Revealed.</em></p>
        <p>Agrupaciones de blendshapes relacionadas: browTension, jawActivation, ocularTension, smileIntensity, frownIntensity, noseActivation, lipMovement, eyeAsymmetry, mouthAsymmetry. Cada grupo es el promedio de sus blendshapes sobre la ventana de muestras.</p>
      </Section>

      <Section title="Normalización y calibración">
        <p><strong>Z-score (edgeCalibration.js):</strong> Welford (1962). Scores normalizados contra historial de 50 sesiones. {'|z|>'}2.5 → anomalía.</p>
        <p><strong>EMA suavizado (auEnhancer.js):</strong> Roberts (1959). Suavizado exponencial α=0.35 por AU.</p>
        <p><strong>Platt Scaling (plattScaling.js):</strong> Platt (1999). Calibración de confianza ML con gradient descent on-line.</p>
        <p><strong>Lighting Adapter (lightingAdapter.js):</strong> Duración de calibración variable (2-6s) según calidad de luz.</p>
        <p><strong>Welford's Algorithm (temporalFeatures.js):</strong> Single-pass mean/variance O(n).</p>
      </Section>

      <Section title="Tecnologías">
        <p>MediaPipe Face Landmarker (Google Research, 2023) · 478 landmarks + 52 blendshapes · React 19 + Vite 8 · Web Workers · IndexedDB · Gradient Boosting + Naive Bayes · signalAmplifier + temporalContrast</p>
      </Section>
    </section>
  );
}