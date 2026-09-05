import React, { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';

function Section({ title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="guide-section">
      <button type="button" className="guide-hdr" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="guide-arrow">{open ? '▼' : '▶'}</span>
        <span className="guide-title">{title}</span>
      </button>
      {open && <div className="guide-body">{children}</div>}
    </div>
  );
}

export default function ReferenceGuide() {
  const { t } = useLanguage();
  return (
    <section className="panel reference-guide" style={{ marginTop: '32px' }}>
      <div className="panel-heading"><h2>{t('Guía de referencia', 'Reference guide')}</h2></div>
      <p className="caption">{t('Documentación de indicadores, fuentes, fórmulas y caveats de la arquitectura multimodal actual.', 'Documentation of indicators, sources, formulas and caveats of the current multimodal architecture.')}</p>

      <div className="guide-summary-grid" aria-label={t('Resumen operativo A-Z', 'Operational summary A-Z')}>
        <div><span>{t('Estado', 'Status')}</span><strong>{t('A-Z cerrado técnicamente', 'A-Z technically closed')}</strong></div>
        <div><span>{t('Uso principal', 'Main use')}</span><strong>{t('Revisión humana', 'Human review')}</strong></div>
        <div><span>{t('Privacidad', 'Privacy')}</span><strong>{t('Agregados, sin crudos', 'Aggregated, no raw')}</strong></div>
        <div><span>{t('Demo', 'Demo')}</span><strong>{t('Postulaciones A-C · AC-AF readiness', 'Applications A-C · AC-AF readiness')}</strong></div>
      </div>

      <Section title={t('Cómo leer esta guía y cerrar una sesión', 'How to read this guide and close a session')}>
        <p className="caption">{t('Usa esta sección como índice operativo antes de abrir las tablas técnicas. La evaluación es browser-local, observacional y privacy-safe.', 'Use this section as an operational index before opening the technical tables. The assessment is browser-local, observational and privacy-safe.')}</p>
        <table className="guide-table">
          <thead><tr><th>{t('Paso', 'Step')}</th><th>{t('Qué revisar', 'What to review')}</th><th>{t('Resultado esperado', 'Expected result')}</th></tr></thead>
          <tbody>
            <tr><td>{t('1. Señal', '1. Signal')}</td><td>{t('Cámara, FaceMesh, AUs, gaze, postura y MoveNet/estado.', 'Camera, FaceMesh, AUs, gaze, posture and MoveNet/state.')}</td><td>{t('Calidad suficiente o caveats explícitos.', 'Sufficient quality or explicit caveats.')}</td></tr>
            <tr><td>{t('2. Batería', '2. Battery')}</td><td>{t('Secuencia unificada RT → Fitts → Tracking → Go/No-Go → Stroop → Visual Search.', 'Unified sequence RT → Fitts → Tracking → Go/No-Go → Stroop → Visual Search.')}</td><td>{t('Bloques completados y progreso claro.', 'Blocks completed and clear progress.')}</td></tr>
            <tr><td>{t('3. Fusión', '3. Fusion')}</td><td>{t('gameSummary, gameCorrelation.aggregate y assessment_feature_vector_v2.', 'gameSummary, gameCorrelation.aggregate and assessment_feature_vector_v2.')}</td><td>{t('Solo agregados; sin ventanas ni eventos crudos.', 'Aggregates only; no windows or raw events.')}</td></tr>
            <tr><td>{t('4. Reporte', '4. Report')}</td><td>{t('Perfil de habilidades, evidencia, caveats, calidad y gobernanza.', 'Skill profile, evidence, caveats, quality and governance.')}</td><td>{t('Lenguaje observacional, sin contratar/rechazar/diagnosticar.', 'Observational language, no hire/reject/diagnose.')}</td></tr>
            <tr><td>{t('5. Cierre', '5. Closure')}</td><td>{t('Bundle local/reportes + protocolo manual de cámara + historial final local.', 'Local bundle/reports + manual camera protocol + local final history.')}</td><td>{t('Artefactos descargables, registro AA y persistencia AB privacy-safe.', 'Downloadable artifacts, AA log and AB privacy-safe persistence.')}</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title={t('Edge AI v9.1 multimodal + game-aware', 'Edge AI v9.1 multimodal + game-aware')}>
        <p className="caption">{t('Pipeline local 100% client-side. El schema externo sigue siendo edge_ai_model_output_v8; el modelo interno es v9.1 game-aware.', '100% client-side local pipeline. The external schema remains edge_ai_model_output_v8; the internal model is v9.1 game-aware.')}</p>
        <table className="guide-table">
          <thead><tr><th>{t('Etapa', 'Stage')}</th><th>{t('Módulo', 'Module')}</th><th>{t('Descripción', 'Description')}</th></tr></thead>
          <tbody>
            <tr><td>{t('Features comunes', 'Common features')}</td><td>multimodalFeatures.js</td><td>{t('Une temporal features, AUs, emociones, gaze, postura, MoveNet, tarea y calidad.', 'Joins temporal features, AUs, emotions, gaze, posture, MoveNet, task and quality.')}</td></tr>
            <tr><td>{t('AUs crudas', 'Raw AUs')}</td><td>gestureInsights.js</td><td>{t('Mapeo MediaPipe blendshapes → FACS/AUs proxy.', 'MediaPipe blendshapes → FACS/AUs proxy mapping.')}</td></tr>
            <tr><td>{t('AUs procesadas', 'Processed AUs')}</td><td>auProcessor.js</td><td>{t('Baseline subtraction 60% + ganancia adaptativa. Sin double boost.', 'Baseline subtraction 60% + adaptive gain. No double boost.')}</td></tr>
            <tr><td>{t('Canales', 'Channels')}</td><td>edgeAiEngine.js</td><td>{t('Bayes AU + visualAttention + postureQuality + canales game-aware explícitos.', 'Bayes AU + visualAttention + postureQuality + explicit game-aware channels.')}</td></tr>
            <tr><td>Composite</td><td>edgeAiEngine.js</td><td>{t('Promedio ponderado con polaridad negativa para carga cognitiva, fatiga y estrés.', 'Weighted average with negative polarity for cognitive load, fatigue and stress.')}</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title={t('Canales Edge AI', 'Edge AI Channels')}>
        <p className="caption">{t('Canales observacionales para revisión humana. No son diagnóstico ni decisión automatizada.', 'Observational channels for human review. Not diagnosis nor automated decision.')}</p>
        <table className="guide-table">
          <thead><tr><th>{t('Canal', 'Channel')}</th><th>{t('Inputs principales', 'Main inputs')}</th><th>{t('Caveat', 'Caveat')}</th></tr></thead>
          <tbody>
            <tr><td>{t('Carga Cognitiva', 'Cognitive Load')}</td><td>AU4, AU7, AU23 + gaze/posture/task penalty</td><td>{t('Alto reduce composite.', 'High reduces composite.')}</td></tr>
            <tr><td>{t('Valencia Emocional', 'Emotional Valence')}</td><td>AU6/AU12 vs AU4/AU15/AU9</td><td>{t('Proxy circumplex Russell.', 'Russell circumplex proxy.')}</td></tr>
            <tr><td>{t('Control Motor', 'Motor Control')}</td><td>{t('Simetría AU L/R', 'AU L/R symmetry')}</td><td>{t('Facial proxy, no motor clínico.', 'Facial proxy, not clinical motor.')}</td></tr>
            <tr><td>Engagement</td><td>AUs + visualAttention + postureQuality</td><td>{t('Depende fuertemente de gaze.', 'Depends strongly on gaze.')}</td></tr>
            <tr><td>{t('Estrés', 'Stress')}</td><td>AU4/AU23/AU9 + postura + gaze instability</td><td>{t('Alto reduce composite.', 'High reduces composite.')}</td></tr>
            <tr><td>{t('Fatiga', 'Fatigue')}</td><td>AU45/AU43/AU7 + headForward + gaze instability</td><td>{t('Alto reduce composite.', 'High reduces composite.')}</td></tr>
            <tr><td>{t('Atención Visual', 'Visual Attention')}</td><td>gaze lookingAtScreen + confidence</td><td>{t('Si gaze no está calibrado, baja confianza.', 'If gaze is not calibrated, low confidence.')}</td></tr>
            <tr><td>{t('Calidad Postural', 'Postural Quality')}</td><td>postureScore + MoveNet shoulder symmetry</td><td>{t('MoveNet requiere hombros visibles.', 'MoveNet requires visible shoulders.')}</td></tr>
            <tr><td>{t('Rendimiento', 'Performance')}</td><td>Accuracy, RT, completion</td><td>{t('Solo cuando hay tarea.', 'Only when there is a task.')}</td></tr>
            <tr><td>{t('Control inhibitorio', 'Inhibitory control')}</td><td>commission/omission error + post-error slowing</td><td>{t('Solo con actividad Go/No-Go o equivalente.', 'Only with Go/No-Go activity or equivalent.')}</td></tr>
            <tr><td>{t('Precisión visomotora', 'Visuomotor precision')}</td><td>Fitts throughput + path efficiency + tracking loss</td><td>{t('Separa precisión de RT simple.', 'Separates precision from simple RT.')}</td></tr>
            <tr><td>{t('Eficiencia búsqueda visual', 'Visual search efficiency')}</td><td>searchEfficiency + errorRate + setSize</td><td>{t('Depende de tarea Visual Search.', 'Depends on Visual Search task.')}</td></tr>
            <tr><td>{t('Resiliencia adaptativa', 'Adaptive resilience')}</td><td>accuracy + completion + errores + deltas de correlación</td><td>{t('Resume estabilidad bajo tarea.', 'Reflects stability under task.')}</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title={t('Emociones básicas v2', 'Basic emotions v2')}>
        <p className="caption">{t('Naive Bayes con neutral gate, reglas FACS mínimas e histéresis temporal en UI.', 'Naive Bayes with neutral gate, minimal FACS rules and temporal hysteresis in UI.')}</p>
        <table className="guide-table">
          <thead><tr><th>{t('Emoción', 'Emotion')}</th><th>{t('Regla principal', 'Main rule')}</th><th>{t('Control anti-falso positivo', 'False-positive control')}</th></tr></thead>
          <tbody>
            <tr><td>Neutral</td><td>{t('Dominante si energía AU es baja', 'Dominant if AU energy is low')}</td><td>{t('Evita forzar una emoción débil.', 'Avoids forcing a weak emotion.')}</td></tr>
            <tr><td>{t('Alegría', 'Joy')}</td><td>{t('AU12 requerido; AU6 refuerza', 'AU12 required; AU6 reinforces')}</td><td>{t('AU12 bajo penaliza felicidad.', 'Low AU12 penalizes happiness.')}</td></tr>
            <tr><td>{t('Enojo', 'Anger')}</td><td>AU4 + AU7/AU23</td><td>{t('AU4 aislado no basta.', 'Isolated AU4 is not enough.')}</td></tr>
            <tr><td>{t('Sorpresa', 'Surprise')}</td><td>AU1/AU2 + AU5/AU26</td><td>{t('Ojos o cejas aisladas se penalizan.', 'Isolated eyes or eyebrows are penalized.')}</td></tr>
            <tr><td>{t('Miedo', 'Fear')}</td><td>Upper face + AU20/AU26</td><td>{t('AU5/AU4 aislados se penalizan.', 'Isolated AU5/AU4 are penalized.')}</td></tr>
            <tr><td>{t('Disgusto', 'Disgust')}</td><td>{t('AU9 dominante', 'AU9 dominant')}</td><td>{t('Sin AU9 se reduce probabilidad.', 'Without AU9 probability is reduced.')}</td></tr>
            <tr><td>Temporal</td><td>emotionTemporalSmoother.js</td><td>{t('Exige frames estables antes de cambiar emoción.', 'Requires stable frames before changing emotion.')}</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title={t('Métricas v3 multimodales', 'Multimodal metrics v3')}>
        <p className="caption">{t('Si no hay contexto multimodal, usa fallback AU-only. Si hay gaze/postura/MoveNet, provenance = multimodal_v3.', 'If there is no multimodal context, use AU-only fallback. If gaze/posture/MoveNet is present, provenance = multimodal_v3.')}</p>
        <table className="guide-table">
          <thead><tr><th>{t('Métrica', 'Metric')}</th><th>{t('Inputs', 'Inputs')}</th><th>{t('Interpretación', 'Interpretation')}</th></tr></thead>
          <tbody>
            <tr><td>{t('Atención', 'Attention')}</td><td>gaze focus + postura + AU45/AU5 + presencia</td><td>{'>'}60%: {t('atención sostenida.', 'sustained attention.')}</td></tr>
            <tr><td>{t('Fatiga', 'Fatigue')}</td><td>AU45/AU43/AU7 + headForward + gaze instability</td><td>{t('Más alto = mayor fatiga observable.', 'Higher = greater observable fatigue.')}</td></tr>
            <tr><td>{t('Estrés', 'Stress')}</td><td>AU4/AU23/AU9/AU27 + postura + gaze + task error</td><td>{t('Proxy de tensión, no diagnóstico.', 'Tension proxy, not diagnosis.')}</td></tr>
            <tr><td>{t('Calma', 'Calm')}</td><td>{t('Inversa ponderada de tensión/estrés/fatiga/postura', 'Weighted inverse of tension/stress/fatigue/posture')}</td><td>{t('Más alto = menor tensión observable.', 'Higher = lower observable tension.')}</td></tr>
            <tr><td>Engagement</td><td>atención + gaze + postura + shoulder symmetry</td><td>{t('Más alto = más involucramiento visible.', 'Higher = more visible engagement.')}</td></tr>
            <tr><td>Boredom</td><td>Inverso engagement + blink + gaze off-screen</td><td>{t('Más alto = menor foco/actividad.', 'Higher = less focus/activity.')}</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title={t('Gaze Tracking y calibración', 'Gaze Tracking and calibration')}>
        <p className="caption">{t('Iris landmarks 468-477 contra nose bridge 6. Auto-calibración inicial y botón manual de centro.', 'Iris landmarks 468-477 against nose bridge 6. Initial auto-calibration and manual center button.')}</p>
        <table className="guide-table">
          <thead><tr><th>{t('Componente', 'Component')}</th><th>{t('Método', 'Method')}</th><th>{t('Caveat', 'Caveat')}</th></tr></thead>
          <tbody>
            <tr><td>Baseline</td><td>{t('Primeros 60 frames o botón “Calibrar mirada centro”', 'First 60 frames or "Calibrate center gaze" button')}</td><td>{t('Debe mirar al centro durante calibración.', 'Must look at center during calibration.')}</td></tr>
            <tr><td>{t('Coordenadas', 'Coordinates')}</td><td>delta iris-nose × SCALE=30</td><td>{t('No es eye tracker absoluto.', 'Not an absolute eye tracker.')}</td></tr>
            <tr><td>{t('Suavizado', 'Smoothing')}</td><td>EMA α=0.12</td><td>{t('Reduce jitter, añade latencia leve.', 'Reduces jitter, adds slight latency.')}</td></tr>
            <tr><td>{t('Métricas', 'Metrics')}</td><td>lookingAtScreen, confidence, distractionScore</td><td>{t('Usado por atención/engagement.', 'Used by attention/engagement.')}</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title={t('Postura, cabeza y MoveNet', 'Posture, head and MoveNet')}>
        <p className="caption">{t('La postura facial estima cabeza; MoveNet aporta hombros, codos y muñecas reales cuando entran en cuadro.', 'Facial posture estimates head; MoveNet provides real shoulders, elbows and wrists when they enter frame.')}</p>
        <table className="guide-table">
          <thead><tr><th>{t('Señal', 'Signal')}</th><th>{t('Método', 'Method')}</th><th>{t('Uso', 'Use')}</th></tr></thead>
          <tbody>
            <tr><td>Head tilt</td><td>{t('Ángulo oreja-oreja 234→454', 'Ear-to-ear angle 234→454')}</td><td>{t('Inclinación lateral.', 'Lateral tilt.')}</td></tr>
            <tr><td>Head forward</td><td>{t('AR baseline máximo; botón “Calibrar postura erguida”', 'Max AR baseline; "Calibrate upright posture" button')}</td><td>{t('Penaliza postura/fatiga.', 'Penalizes posture/fatigue.')}</td></tr>
            <tr><td>Posture score</td><td>1 − tilt×0.32 − forward×0.42 − asym×0.20 − instability×0.12</td><td>{t('Proxy facial de postura.', 'Facial posture proxy.')}</td></tr>
            <tr><td>MoveNet</td><td>COCO17: hombros, codos, muñecas</td><td>shoulder symmetry, upperBodyCoverage, armsVisible, armActivity.</td></tr>
            <tr><td>{t('Sin fallback', 'No fallback')}</td><td>{t('No se estiman hombros con FaceMesh', 'Shoulders are not estimated with FaceMesh')}</td><td>{t('Si no detecta: aléjate hasta ver ambos hombros.', 'If not detected: move back until both shoulders are visible.')}</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title={t('Normalización y privacidad', 'Normalization and privacy')}>
        <table className="guide-table">
          <thead><tr><th>{t('Técnica', 'Technique')}</th><th>{t('Módulo', 'Module')}</th><th>{t('Estado', 'Status')}</th></tr></thead>
          <tbody>
            <tr><td>Z-score rolling</td><td>edgeCalibration.js</td><td>{t('Normaliza canales.', 'Normalizes channels.')}</td></tr>
            <tr><td>Welford O(n)</td><td>temporalFeatures.js</td><td>{t('Features temporales eficientes.', 'Efficient temporal features.')}</td></tr>
            <tr><td>{t('Sanitización', 'Sanitization')}</td><td>samplePrivacy.js</td><td>{t('No guarda video/frames/landmarks crudos.', 'Does not store raw video/frames/landmarks.')}</td></tr>
            <tr><td>{t('Payload compacto', 'Compact payload')}</td><td>payload.js</td><td>{t('Omite bloque multimodal live.', 'Omits live multimodal block.')}</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title={t('Tecnologías', 'Technologies')}>
        <p>React 19 · Vite 8 · MediaPipe Face Landmarker · TF.js MoveNet Lightning · {t('Web Workers para FaceLandmarker', 'Web Workers for FaceLandmarker')} · IndexedDB · FACS/AUs proxy · {t('Edge AI bayesiano multimodal local.', 'Local multimodal bayesian Edge AI.')}</p>
      </Section>

      <Section title={t('Apéndice gamificado O-Q: dificultad, validación y exportación', 'Gamified appendix O-Q: difficulty, validation and export')}>
        <p className="caption">{t('Las fases O-Q cierran el ciclo experimental: recomendación de dificultad, escenarios sintéticos y exportación agregada para análisis offline.', 'O-Q phases close the experimental cycle: difficulty recommendation, synthetic scenarios and aggregated export for offline analysis.')}</p>
        <table className="guide-table">
          <thead><tr><th>{t('Fase', 'Phase')}</th><th>{t('Módulo', 'Module')}</th><th>{t('Algoritmo', 'Algorithm')}</th><th>{t('Salida', 'Output')}</th></tr></thead>
          <tbody>
            <tr><td>O — {t('Dificultad adaptativa', 'Adaptive difficulty')}</td><td>tasks/adaptiveDifficulty.js</td><td>{t('Evidencia up/down sobre accuracy, RT, completion, motor, inhibición, interferencia, búsqueda visual y carga cognitiva.', 'Up/down evidence on accuracy, RT, completion, motor, inhibition, interference, visual search and cognitive load.')}</td><td>adaptive_difficulty_recommendation_v1 {t('con reasonCodes y trace.', 'with reasonCodes and trace.')}</td></tr>
            <tr><td>P — {t('Simulación', 'Simulation')}</td><td>telemetry/gameScenarioFixtures.js</td><td>{t('Fixtures deterministas: buen control motor, fatiga, estrés/error, distracción y mejora por práctica.', 'Deterministic fixtures: good motor control, fatigue, stress/error, distraction and practice improvement.')}</td><td>{t('Validación direccional de Edge AI, vector v2 y dificultad.', 'Directional validation of Edge AI, v2 vector and difficulty.')}</td></tr>
            <tr><td>Q — {t('Export investigación', 'Research export')}</td><td>telemetry/researchExport.js</td><td>{t('Registros por trial desde gameCorrelation + assessment_feature_vector_v2; IDs hasheados.', 'Per-trial records from gameCorrelation + assessment_feature_vector_v2; hashed IDs.')}</td><td>krumm_research_export_v1, JSONL {t('y CSV con columnas feature.*.', 'and CSV with feature.* columns.')}</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title={t('Algoritmos y fórmulas O-Q', 'O-Q algorithms and formulas')}>
        <p className="caption">{t('Las reglas son trazables y anti-oscilación; no usan datos crudos ni rutas reconstructivas.', 'Rules are traceable and anti-oscillation; they do not use raw data or reconstructive paths.')}</p>
        <table className="guide-table">
          <thead><tr><th>{t('Algoritmo', 'Algorithm')}</th><th>{t('Fórmula / regla', 'Formula / rule')}</th><th>{t('Justificación', 'Justification')}</th></tr></thead>
          <tbody>
            <tr><td>{t('Subir dificultad', 'Increase difficulty')}</td><td><code>up {'>'}= down + 2</code>{t(', con accuracy >= 0.85, completion >= 0.90, RT rápido, motor estable y baja carga.', ', with accuracy >= 0.85, completion >= 0.90, fast RT, stable motor and low load.')}</td><td>{t('Evita subir por una sola señal aislada.', 'Avoids increasing on a single isolated signal.')}</td></tr>
            <tr><td>{t('Bajar dificultad', 'Decrease difficulty')}</td><td><code>down {'>'}= up + 2</code>{t(', con accuracy <= 0.55, RT lento, motor débil, errores altos o cognitiveLoad >= 75.', ', with accuracy <= 0.55, slow RT, weak motor, high errors or cognitiveLoad >= 75.')}</td><td>{t('Reduce demanda ante sobrecarga o caída de desempeño.', 'Reduces demand under overload or performance drop.')}</td></tr>
            <tr><td>{t('Mantener dificultad', 'Keep difficulty')}</td><td>{t('Sin margen de 2 puntos entre evidencia up/down.', 'No 2-point margin between up/down evidence.')}</td><td>{t('Histéresis discreta anti-oscilación.', 'Discrete anti-oscillation hysteresis.')}</td></tr>
            <tr><td>{t('Validación sintética', 'Synthetic validation')}</td><td>{t('Comparar escenarios esperados: control bueno, fatiga, estrés/error, distracción, práctica.', 'Compare expected scenarios: good control, fatigue, stress/error, distraction, practice.')}</td><td>{t('Detecta fórmulas invertidas antes de usar datos reales.', 'Detects inverted formulas before using real data.')}</td></tr>
            <tr><td>{t('Export JSONL/CSV', 'Export JSONL/CSV')}</td><td>{t('Un registro por trial: runId, trialIndex, gameId, outcome, correct, reactionTimeMs, feature.*.', 'One record per trial: runId, trialIndex, gameId, outcome, correct, reactionTimeMs, feature.*.')}</td><td>{t('Análisis offline sin reconstruir cursor, rostro o estímulos.', 'Offline analysis without reconstructing cursor, face or stimuli.')}</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title={t('Referencias metodológicas O-Q', 'Methodological references O-Q')}>
        <p className="caption">{t('Estas referencias justifican la lógica conductual; KRUMM las usa como señales observacionales, no diagnósticas.', 'These references justify the behavioral logic; KRUMM uses them as observational, non-diagnostic signals.')}</p>
        <table className="guide-table">
          <thead><tr><th>{t('Tema', 'Topic')}</th><th>{t('Referencia', 'Reference')}</th><th>{t('Uso en KRUMM', 'Use in KRUMM')}</th></tr></thead>
          <tbody>
            <tr><td>{t('Dificultad adaptativa', 'Adaptive difficulty')}</td><td>Flow theory / challenge-skill balance (Csikszentmihalyi) + computerized adaptive testing.</td><td>{t('Subir dificultad cuando la habilidad observada supera la demanda; bajar ante sobrecarga.', 'Increase difficulty when observed skill exceeds demand; decrease under overload.')}</td></tr>
            <tr><td>{t('Control inhibitorio', 'Inhibitory control')}</td><td>Paradigmas Go/No-Go y post-error slowing.</td><td>commissionErrorRate, omissionErrorRate {t('y postErrorSlowingMs.', 'and postErrorSlowingMs.')}</td></tr>
            <tr><td>{t('Precisión visomotora', 'Visuomotor precision')}</td><td>Fitts, P. M. (1954), speed-accuracy tradeoff.</td><td><code>ID = log2(D/W + 1)</code>{t(' y throughput en Precision Targeting.', ' and throughput in Precision Targeting.')}</td></tr>
            <tr><td>{t('Búsqueda visual', 'Visual search')}</td><td>Treisman & Gelade (1980), Feature Integration Theory.</td><td>setSize, distractores {t('y searchEfficiency.', 'and searchEfficiency.')}</td></tr>
            <tr><td>{t('Tracking continuo', 'Continuous tracking')}</td><td>Smooth pursuit / visuomotor tracking.</td><td>RMS error, pérdida de seguimiento {t('y smooth pursuit score.', 'and smooth pursuit score.')}</td></tr>
            <tr><td>{t('Export privacy-safe', 'Privacy-safe export')}</td><td>Data minimization / privacy by design.</td><td>{t('Exportar agregados y feature vectors; nunca video, frames, landmarks, raw events ni pointer paths.', 'Export aggregates and feature vectors; never video, frames, landmarks, raw events or pointer paths.')}</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title={t('Experiencia evaluativa unificada R-Z', 'Unified assessment experience R-Z')}>
        <p className="caption">{t('Las fases R-Z convierten las mediciones A-Q en una experiencia completa: batería guiada, sesión consolidada, perfil de talento, payload final, reporte humano, entrega local/futura, smoke manual y verificación integral.', 'R-Z phases turn A-Q measurements into a complete experience: guided battery, consolidated session, talent profile, final payload, human report, local/future delivery, manual smoke and comprehensive verification.')}</p>
        <table className="guide-table">
          <thead><tr><th>{t('Fase', 'Phase')}</th><th>{t('Módulo principal', 'Main module')}</th><th>{t('Función', 'Function')}</th><th>{t('Privacidad/gobernanza', 'Privacy/governance')}</th></tr></thead>
          <tbody>
            <tr><td>R — {t('Runtime batería', 'Battery runtime')}</td><td>assessment/batteryRuntime.js</td><td>{t('Orquesta consentimiento, cámara, baseline, bloques, descansos, recovery y finalización.', 'Orchestrates consent, camera, baseline, blocks, breaks, recovery and completion.')}</td><td>{t('No almacena señales crudas; solo timeline de estados.', 'Does not store raw signals; only state timeline.')}</td></tr>
            <tr><td>S — {t('Flujo participante', 'Participant flow')}</td><td>assessment/UnifiedGameBattery.jsx</td><td>{t('Muestra progreso, instrucciones, consentimiento y estados finales sin reemplazar el selector manual.', 'Shows progress, instructions, consent and final states without replacing the manual selector.')}</td><td>{t('Modo assessment requiere cámara; modo manual sigue disponible.', 'Assessment mode requires camera; manual mode remains available.')}</td></tr>
            <tr><td>T — {t('Sesión unificada', 'Unified session')}</td><td>assessment/assessmentSession.js</td><td>{t('Consolida batería, gameSummary, gameCorrelation.aggregate, Edge AI, vector v2, dificultad y calidad.', 'Consolidates battery, gameSummary, gameCorrelation.aggregate, Edge AI, v2 vector, difficulty and quality.')}</td><td>{t('Valida ausencia de video, frames, landmarks, pointer paths y raw events.', 'Validates absence of video, frames, landmarks, pointer paths and raw events.')}</td></tr>
            <tr><td>U — {t('Perfil talento', 'Talent profile')}</td><td>assessment/talentProfile.js</td><td>{t('Mapea agregados a 10 habilidades observacionales con score, confianza, evidencia y caveats.', 'Maps aggregates to 10 observational skills with score, confidence, evidence and caveats.')}</td><td>{t('Solo revisión humana; sin decisión automática.', 'Human review only; no automated decision.')}</td></tr>
            <tr><td>V — {t('Payload final', 'Final payload')}</td><td>assessment/finalAssessmentPayload.js</td><td>{t('Empaqueta quality, behavioral, talentProfile y Edge AI para reporte.', 'Packages quality, behavioral, talentProfile and Edge AI for report.')}</td><td><code>humanReviewOnly</code>, <code>noAutomatedDecision</code>, <code>privacySafe</code>.</td></tr>
            <tr><td>W — {t('Reporte humano', 'Human report')}</td><td>assessment/talentReportGenerator.js</td><td>{t('Genera Markdown, HTML y JSON con portada, resumen, habilidades, caveats y apéndice.', 'Generates Markdown, HTML and JSON with cover, summary, skills, caveats and appendix.')}</td><td>{t('Lenguaje observacional; no recomienda contratar/rechazar.', 'Observational language; does not recommend hiring/rejecting.')}</td></tr>
            <tr><td>X — {t('Entrega', 'Delivery')}</td><td>assessment/reportSubmissionClient.js</td><td>{t('Crea bundle local y cliente HTTP futuro para enviar/describir reportes.', 'Creates local bundle and future HTTP client to send/describe reports.')}</td><td>{t('Valida payload antes de descargar o enviar.', 'Validates payload before downloading or sending.')}</td></tr>
            <tr><td>Y — {t('Smoke manual', 'Manual smoke')}</td><td>docs/qa/unified-assessment-manual-smoke.md</td><td>{t('Protocolo para validar cámara real, calibración, batería, reportes y privacidad en navegador.', 'Protocol to validate real camera, calibration, battery, reports and privacy in browser.')}</td><td>{t('Requiere ejecución humana con permisos de cámara.', 'Requires human execution with camera permissions.')}</td></tr>
            <tr><td>Z — {t('Verificación integral', 'Comprehensive verification')}</td><td>assessment/assessmentExperienceSmoke.js</td><td>{t('Smoke sintético A-X + checklist Y; suite, build, audit y scans.', 'Synthetic smoke A-X + checklist Y; suite, build, audit and scans.')}</td><td>{t('Prueba pipeline sin datos crudos ni claims automáticos.', 'Tests pipeline without raw data or automated claims.')}</td></tr>
            <tr><td>AA — {t('Smoke real registrado', 'Recorded real smoke')}</td><td>docs/qa/unified-assessment-manual-smoke-2026-07-08.md</td><td>{t('Registro del smoke con cámara reportado por usuario después de estabilizar juegos.', 'Smoke log with camera reported by user after stabilizing games.')}</td><td>{t('No guarda capturas ni datos crudos; explicita límite WSL/headless.', 'Does not store screenshots or raw data; states WSL/headless limitation.')}</td></tr>
            <tr><td>AB — {t('Persistencia local final', 'Final local persistence')}</td><td>assessment/finalAssessmentStorage.js + FinalAssessmentHistoryPanel.jsx</td><td>{t('Guarda payload final, manifiesto y reportes; lista y re-descarga sesiones finales.', 'Stores final payload, manifest and reports; lists and re-downloads final sessions.')}</td><td>{t('Valida payload, claves prohibidas y JSON de reportes antes de persistir.', 'Validates payload, forbidden keys and report JSON before persisting.')}</td></tr>
            <tr><td>AC — {t('Preview/descarga final', 'Final preview/download')}</td><td>assessment/FinalReportPanel.jsx</td><td>{t('Muestra preview Markdown/HTML/JSON, validación, calidad y botones de descarga directa.', 'Shows Markdown/HTML/JSON preview, validation, quality and direct download buttons.')}</td><td>{t('HTML se previsualiza como texto seguro; descargas se bloquean si falla privacy guard.', 'HTML is previewed as safe text; downloads are blocked if privacy guard fails.')}</td></tr>
            <tr><td>AD — {t('Modo demo rápido', 'Fast demo mode')}</td><td>assessment/batteryConfig.js + UnifiedGameBattery.jsx</td><td>{t('Agrega DEMO_BATTERY_CONFIG y selector Demo rápida/Evaluación estándar.', 'Adds DEMO_BATTERY_CONFIG and Fast demo/Standard assessment selector.')}</td><td>{t('Modo demo reduce baseline, recovery, descansos y trials sin alterar el modo estandarizado.', 'Demo mode reduces baseline, recovery, breaks and trials without altering the standardized mode.')}</td></tr>
            <tr><td>AE — {t('Signal readiness', 'Signal readiness')}</td><td>assessment/SignalReadinessPanel.jsx</td><td>{t('Checklist previo a baseline para cámara, FaceMesh, rostro, confianza, AUs, gaze, postura, MoveNet y privacidad.', 'Pre-baseline checklist for camera, FaceMesh, face, confidence, AUs, gaze, posture, MoveNet and privacy.')}</td><td>{t('Permite continuar con caveats explícitos; no inventa hombros ni datos faltantes.', 'Allows continuing with explicit caveats; does not invent shoulders or missing data.')}</td></tr>
            <tr><td>AF — {t('Guion/checklist demo', 'Demo script/checklist')}</td><td>docs/demo/unified-assessment-demo-script.md + demo-rehearsal-checklist.md</td><td>{t('Guion operacional, checklist de ensayo y FAQ para presentar sin improvisar claims.', 'Operational script, rehearsal checklist and FAQ to present without improvising claims.')}</td><td>{t('Incluye plan B de cámara, lenguaje seguro, privacidad y próximos pasos hacia piloto.', 'Includes camera plan B, safe language, privacy and next steps toward pilot.')}</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title={t('Reporte final y lectura humana', 'Final report and human reading')}>
        <p className="caption">{t('El reporte final está diseñado para personas evaluadoras: resume evidencia, limita inferencias y explicita calidad de señal.', 'The final report is designed for evaluators: summarizes evidence, limits inferences and states signal quality.')}</p>
        <table className="guide-table">
          <thead><tr><th>{t('Sección', 'Section')}</th><th>{t('Contenido', 'Content')}</th><th>{t('Uso recomendado', 'Recommended use')}</th></tr></thead>
          <tbody>
            <tr><td>{t('Resumen ejecutivo', 'Executive summary')}</td><td>{t('Fortalezas, áreas a revisar y confianza global.', 'Strengths, areas to review and overall confidence.')}</td><td>{t('Primera lectura rápida, siempre con caveats.', 'First quick read, always with caveats.')}</td></tr>
            <tr><td>{t('Calidad de señal', 'Signal quality')}</td><td>{t('Muestras, presencia facial, confianza, trials correlacionados.', 'Samples, facial presence, confidence, correlated trials.')}</td><td>{t('Determina si la sesión es interpretable.', 'Determines whether the session is interpretable.')}</td></tr>
            <tr><td>{t('Perfil de habilidades', 'Skill profile')}</td><td>{t('10 dimensiones: velocidad, precisión, atención, inhibición, interferencia, búsqueda, adaptabilidad, consistencia y regulación.', '10 dimensions: speed, precision, attention, inhibition, interference, search, adaptability, consistency and regulation.')}</td><td>{t('Comparar evidencia, no usar como dictamen automático.', 'Compare evidence, do not use as automated verdict.')}</td></tr>
            <tr><td>{t('Resultados por juego', 'Results by game')}</td><td>{t('Accuracy, RT, score, search efficiency y métricas conductuales.', 'Accuracy, RT, score, search efficiency and behavioral metrics.')}</td><td>{t('Ubicar qué actividad sostiene cada conclusión.', 'Locate which activity supports each conclusion.')}</td></tr>
            <tr><td>{t('Correlación cámara+tarea', 'Camera+task correlation')}</td><td>{t('Deltas agregados de reacción/postura/presencia facial.', 'Aggregated reaction/posture/facial presence deltas.')}</td><td>{t('Contextualizar desempeño bajo tarea sin raw windows.', 'Contextualize performance under task without raw windows.')}</td></tr>
            <tr><td>{t('Gobernanza', 'Governance')}</td><td>{t('Declaración de revisión humana, sin decisión automática y sin export crudo.', 'Human review statement, no automated decision and no raw export.')}</td><td>{t('Marco de uso responsable y privacy-by-design.', 'Responsible use framework and privacy-by-design.')}</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title={t('Demo MVP de postulaciones', 'Applications MVP demo')}>
        <p className="caption">{t('La ruta', 'The route')} <code>/postulaciones-demo</code>{t(' separa la experiencia producto del dashboard técnico: juegos al frente, señales locales en segundo plano y HUD discreto.', ' separates the product experience from the technical dashboard: games in front, local signals in the background and discrete HUD.')}</p>
        <table className="guide-table">
          <thead><tr><th>{t('Fase', 'Phase')}</th><th>{t('Módulo', 'Module')}</th><th>{t('Estado', 'Status')}</th><th>{t('Resultado práctico', 'Practical result')}</th></tr></thead>
          <tbody>
            <tr><td>A — {t('Shell producto', 'Product shell')}</td><td>postulation-demo/PostulationDemoApp.jsx + PostulationLanding.jsx</td><td>{t('Completada', 'Completed')}</td><td>{t('Ruta aislada', 'Isolated route')} <code>/postulaciones-demo</code>{t(' sin router nuevo ni cambios en la app técnica.', ' with no new router or changes to the technical app.')}</td></tr>
            <tr><td>B — {t('Setup/señales', 'Setup/signals')}</td><td>PostulationConsentSetup.jsx, BackgroundSignalOrchestrator.jsx, BehindTheScenesMiniHud.jsx</td><td>{t('Completada', 'Completed')}</td><td>{t('Consentimiento, cámara local opcional, worker facial, MoveNet bajo FPS y HUD compacto de fondo.', 'Consent, optional local camera, facial worker, MoveNet at low FPS and compact background HUD.')}</td></tr>
            <tr><td>C — {t('Game stage', 'Game stage')}</td><td>PostulationGameStage.jsx, PostulationProgressHeader.jsx, postulationDemoConfig.js</td><td>{t('Completada', 'Completed')}</td><td>{t('Juegos principales en fullscreen con progreso y HUD discreto; eventos', 'Main games in fullscreen with progress and discrete HUD; events')} <code>game_event_v1</code>{t(' con ', ' with ')}<code>performance.now()</code>{t('.', '.')}</td></tr>
            <tr><td>D — {t('Reporte v1', 'Report v1')}</td><td>postulationDemoSessionBuilder.js + PostulationDemoApp.jsx</td><td>{t('D v1 implementada', 'D v1 implemented')}</td><td>{t('Genera', 'Generates')} <code>assessmentSession</code>{t(', perfil, payload final, reportes Markdown/HTML/JSON y bundle local desde agregados; D v2 queda para correlación/vector específicos.', ', profile, final payload, Markdown/HTML/JSON reports and local bundle from aggregates; D v2 left for specific correlation/vector.')}</td></tr>
          </tbody>
        </table>
        <p className="caption">{t('Privacidad: no muestra el dashboard técnico ni guarda video, frames, landmarks crudos, eventos crudos ni trayectorias de puntero. Reporte siempre para revisión humana, sin decisión automatizada.', 'Privacy: does not show the technical dashboard nor store video, frames, raw landmarks, raw events or pointer trajectories. Report always for human review, without automated decision.')}</p>
      </Section>

      <Section title={t('Revisión retroactiva A-Z', 'Retrospective review A-Z')}>
        <p className="caption">{t('Resumen del avance acumulado: la app pasó de medir AUs/FACS y señales multimodales a una batería evaluativa completa con reporte final privacy-safe, smoke sintético y protocolo manual de cámara.', 'Summary of accumulated progress: the app went from measuring AUs/FACS and multimodal signals to a complete assessment battery with privacy-safe final report, synthetic smoke and manual camera protocol.')}</p>
        <table className="guide-table">
          <thead><tr><th>{t('Bloque', 'Block')}</th><th>{t('Estado', 'Status')}</th><th>{t('Resultado práctico', 'Practical result')}</th></tr></thead>
          <tbody>
            <tr><td>A-I {t('Juegos', 'Games')}</td><td>{t('Completado', 'Completed')}</td><td>{t('RT, precisión/Fitts, tracking, Go/No-Go, Stroop y Visual Search accesibles manualmente.', 'RT, precision/Fitts, tracking, Go/No-Go, Stroop and Visual Search manually accessible.')}</td></tr>
            <tr><td>J-K {t('Correlación/vector', 'Correlation/vector')}</td><td>{t('Completado', 'Completed')}</td><td>{t('Ventanas pre/reaction/post/recovery y', 'pre/reaction/post/recovery windows and')} <code>assessment_feature_vector_v2</code>{t('.', '.')}</td></tr>
            <tr><td>L {t('Edge AI', 'Edge AI')}</td><td>{t('Completado', 'Completed')}</td><td>{t('Canales game-aware v9.1: inhibición, precisión visomotora, búsqueda visual y resiliencia.', 'game-aware v9.1 channels: inhibition, visuomotor precision, visual search and resilience.')}</td></tr>
            <tr><td>M-N {t('UI/payload', 'UI/payload')}</td><td>{t('Completado', 'Completed')}</td><td>{t('Panel de sesión, baseline/delta y reportes base agregados.', 'Session panel, baseline/delta and base aggregated reports.')}</td></tr>
            <tr><td>O-Q {t('Validación/export', 'Validation/export')}</td><td>{t('Completado', 'Completed')}</td><td>{t('Dificultad adaptativa, escenarios sintéticos y export JSONL/CSV de investigación.', 'Adaptive difficulty, synthetic scenarios and JSONL/CSV research export.')}</td></tr>
            <tr><td>R-X {t('Assessment final', 'Final assessment')}</td><td>{t('Completado', 'Completed')}</td><td>{t('Batería guiada, sesión unificada, perfil de talento, payload final, reporte y bundle de entrega.', 'Guided battery, unified session, talent profile, final payload, report and delivery bundle.')}</td></tr>
            <tr><td>Y-Z {t('Cierre técnico', 'Technical closure')}</td><td>{t('Cerrado técnicamente', 'Technically closed')}</td><td>{t('Protocolo manual para cámara real + smoke sintético integral + suite/build/audit/scans.', 'Manual protocol for real camera + comprehensive synthetic smoke + suite/build/audit/scans.')}</td></tr>
          </tbody>
        </table>
      </Section>
    </section>
  );
}
