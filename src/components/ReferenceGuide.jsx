import React, { useState } from 'react';

function Section({ title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="guide-section">
      <div className="guide-hdr" onClick={() => setOpen(!open)} style={{ cursor: 'pointer', userSelect: 'none' }}>
        <span className="guide-arrow">{open ? '▼' : '▶'}</span>
        <span className="guide-title">{title}</span>
      </div>
      {open && <div className="guide-body">{children}</div>}
    </div>
  );
}

export default function ReferenceGuide() {
  return (
    <section className="panel reference-guide" style={{ marginTop: '32px' }}>
      <div className="panel-heading"><h2>Guía de referencia</h2></div>
      <p className="caption">Documentación de indicadores, fuentes, fórmulas y caveats de la arquitectura multimodal actual.</p>

      <Section title="Edge AI v8.1 multimodal">
        <p className="caption">Pipeline local 100% client-side. El schema externo sigue siendo edge_ai_model_output_v8; el modelo interno es v8.1 multimodal.</p>
        <table className="guide-table">
          <thead><tr><th>Etapa</th><th>Módulo</th><th>Descripción</th></tr></thead>
          <tbody>
            <tr><td>Features comunes</td><td>multimodalFeatures.js</td><td>Une temporal features, AUs, emociones, gaze, postura, MoveNet, tarea y calidad.</td></tr>
            <tr><td>AUs crudas</td><td>gestureInsights.js</td><td>Mapeo MediaPipe blendshapes → FACS/AUs proxy.</td></tr>
            <tr><td>AUs procesadas</td><td>auProcessor.js</td><td>Baseline subtraction 60% + ganancia adaptativa. Sin double boost.</td></tr>
            <tr><td>Canales</td><td>edgeAiEngine.js</td><td>Bayes AU + visualAttention + postureQuality + ajustes gaze/postura/MoveNet.</td></tr>
            <tr><td>Composite</td><td>edgeAiEngine.js</td><td>Promedio ponderado con polaridad negativa para carga cognitiva, fatiga y estrés.</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="Canales Edge AI">
        <p className="caption">Canales observacionales para revisión humana. No son diagnóstico ni decisión automatizada.</p>
        <table className="guide-table">
          <thead><tr><th>Canal</th><th>Inputs principales</th><th>Caveat</th></tr></thead>
          <tbody>
            <tr><td>Carga Cognitiva</td><td>AU4, AU7, AU23 + gaze/posture/task penalty</td><td>Alto reduce composite.</td></tr>
            <tr><td>Valencia Emocional</td><td>AU6/AU12 vs AU4/AU15/AU9</td><td>Proxy circumplex Russell.</td></tr>
            <tr><td>Control Motor</td><td>Simetría AU L/R</td><td>Facial proxy, no motor clínico.</td></tr>
            <tr><td>Engagement</td><td>AUs + visualAttention + postureQuality</td><td>Depende fuertemente de gaze.</td></tr>
            <tr><td>Estrés</td><td>AU4/AU23/AU9 + postura + gaze instability</td><td>Alto reduce composite.</td></tr>
            <tr><td>Fatiga</td><td>AU45/AU43/AU7 + headForward + gaze instability</td><td>Alto reduce composite.</td></tr>
            <tr><td>Atención Visual</td><td>gaze lookingAtScreen + confidence</td><td>Si gaze no está calibrado, baja confianza.</td></tr>
            <tr><td>Calidad Postural</td><td>postureScore + MoveNet shoulder symmetry</td><td>MoveNet requiere hombros visibles.</td></tr>
            <tr><td>Rendimiento</td><td>Accuracy, RT, completion</td><td>Solo cuando hay tarea.</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="Emociones básicas v2">
        <p className="caption">Naive Bayes con neutral gate, reglas FACS mínimas e histéresis temporal en UI.</p>
        <table className="guide-table">
          <thead><tr><th>Emoción</th><th>Regla principal</th><th>Control anti-falso positivo</th></tr></thead>
          <tbody>
            <tr><td>Neutral</td><td>Dominante si energía AU es baja</td><td>Evita forzar una emoción débil.</td></tr>
            <tr><td>Alegría</td><td>AU12 requerido; AU6 refuerza</td><td>AU12 bajo penaliza felicidad.</td></tr>
            <tr><td>Enojo</td><td>AU4 + AU7/AU23</td><td>AU4 aislado no basta.</td></tr>
            <tr><td>Sorpresa</td><td>AU1/AU2 + AU5/AU26</td><td>Ojos o cejas aisladas se penalizan.</td></tr>
            <tr><td>Miedo</td><td>Upper face + AU20/AU26</td><td>AU5/AU4 aislados se penalizan.</td></tr>
            <tr><td>Disgusto</td><td>AU9 dominante</td><td>Sin AU9 se reduce probabilidad.</td></tr>
            <tr><td>Temporal</td><td>emotionTemporalSmoother.js</td><td>Exige frames estables antes de cambiar emoción.</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="Métricas v3 multimodales">
        <p className="caption">Si no hay contexto multimodal, usa fallback AU-only. Si hay gaze/postura/MoveNet, provenance = multimodal_v3.</p>
        <table className="guide-table">
          <thead><tr><th>Métrica</th><th>Inputs</th><th>Interpretación</th></tr></thead>
          <tbody>
            <tr><td>Atención</td><td>gaze focus + postura + AU45/AU5 + presencia</td><td>{'>'}60%: atención sostenida.</td></tr>
            <tr><td>Fatiga</td><td>AU45/AU43/AU7 + headForward + gaze instability</td><td>Más alto = mayor fatiga observable.</td></tr>
            <tr><td>Estrés</td><td>AU4/AU23/AU9/AU27 + postura + gaze + task error</td><td>Proxy de tensión, no diagnóstico.</td></tr>
            <tr><td>Calma</td><td>Inversa ponderada de tensión/estrés/fatiga/postura</td><td>Más alto = menor tensión observable.</td></tr>
            <tr><td>Engagement</td><td>atención + gaze + postura + shoulder symmetry</td><td>Más alto = más involucramiento visible.</td></tr>
            <tr><td>Boredom</td><td>Inverso engagement + blink + gaze off-screen</td><td>Más alto = menor foco/actividad.</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="Gaze Tracking y calibración">
        <p className="caption">Iris landmarks 468-477 contra nose bridge 6. Auto-calibración inicial y botón manual de centro.</p>
        <table className="guide-table">
          <thead><tr><th>Componente</th><th>Método</th><th>Caveat</th></tr></thead>
          <tbody>
            <tr><td>Baseline</td><td>Primeros 60 frames o botón “Calibrar mirada centro”</td><td>Debe mirar al centro durante calibración.</td></tr>
            <tr><td>Coordenadas</td><td>delta iris-nose × SCALE=30</td><td>No es eye tracker absoluto.</td></tr>
            <tr><td>Suavizado</td><td>EMA α=0.12</td><td>Reduce jitter, añade latencia leve.</td></tr>
            <tr><td>Métricas</td><td>lookingAtScreen, confidence, distractionScore</td><td>Usado por atención/engagement.</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="Postura, cabeza y MoveNet">
        <p className="caption">La postura facial estima cabeza; MoveNet aporta hombros, codos y muñecas reales cuando entran en cuadro.</p>
        <table className="guide-table">
          <thead><tr><th>Señal</th><th>Método</th><th>Uso</th></tr></thead>
          <tbody>
            <tr><td>Head tilt</td><td>Ángulo oreja-oreja 234→454</td><td>Inclinación lateral.</td></tr>
            <tr><td>Head forward</td><td>AR baseline máximo; botón “Calibrar postura erguida”</td><td>Penaliza postura/fatiga.</td></tr>
            <tr><td>Posture score</td><td>1 − tilt×0.32 − forward×0.42 − asym×0.20 − instability×0.12</td><td>Proxy facial de postura.</td></tr>
            <tr><td>MoveNet</td><td>COCO17: hombros, codos, muñecas</td><td>shoulder symmetry, upperBodyCoverage, armsVisible, armActivity.</td></tr>
            <tr><td>Sin fallback</td><td>No se estiman hombros con FaceMesh</td><td>Si no detecta: aléjate hasta ver ambos hombros.</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="Normalización y privacidad">
        <table className="guide-table">
          <thead><tr><th>Técnica</th><th>Módulo</th><th>Estado</th></tr></thead>
          <tbody>
            <tr><td>Z-score rolling</td><td>edgeCalibration.js</td><td>Normaliza canales.</td></tr>
            <tr><td>Welford O(n)</td><td>temporalFeatures.js</td><td>Features temporales eficientes.</td></tr>
            <tr><td>Sanitización</td><td>samplePrivacy.js</td><td>No guarda video/frames/landmarks crudos.</td></tr>
            <tr><td>Payload compacto</td><td>payload.js</td><td>Omite bloque multimodal live.</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="Tecnologías">
        <p>React 19 · Vite 8 · MediaPipe Face Landmarker · TF.js MoveNet Lightning · Web Workers para FaceLandmarker · IndexedDB · FACS/AUs proxy · Edge AI bayesiano multimodal local.</p>
      </Section>
    </section>
  );
}
