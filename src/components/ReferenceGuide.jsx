import React, { useState } from 'react';

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
  return (
    <section className="panel reference-guide" style={{ marginTop: '32px' }}>
      <div className="panel-heading"><h2>Guía de referencia</h2></div>
      <p className="caption">Documentación de indicadores, fuentes, fórmulas y caveats de la arquitectura multimodal actual.</p>

      <div className="guide-summary-grid" aria-label="Resumen operativo A-Z">
        <div><span>Estado</span><strong>A-Z cerrado técnicamente</strong></div>
        <div><span>Uso principal</span><strong>Revisión humana</strong></div>
        <div><span>Privacidad</span><strong>Agregados, sin crudos</strong></div>
        <div><span>Post-Z</span><strong>AA smoke reportado · AB persistencia local</strong></div>
      </div>

      <Section title="Cómo leer esta guía y cerrar una sesión">
        <p className="caption">Usa esta sección como índice operativo antes de abrir las tablas técnicas. La evaluación es browser-local, observacional y privacy-safe.</p>
        <table className="guide-table">
          <thead><tr><th>Paso</th><th>Qué revisar</th><th>Resultado esperado</th></tr></thead>
          <tbody>
            <tr><td>1. Señal</td><td>Cámara, FaceMesh, AUs, gaze, postura y MoveNet/estado.</td><td>Calidad suficiente o caveats explícitos.</td></tr>
            <tr><td>2. Batería</td><td>Secuencia unificada RT → Fitts → Tracking → Go/No-Go → Stroop → Visual Search.</td><td>Bloques completados y progreso claro.</td></tr>
            <tr><td>3. Fusión</td><td>gameSummary, gameCorrelation.aggregate y assessment_feature_vector_v2.</td><td>Solo agregados; sin ventanas ni eventos crudos.</td></tr>
            <tr><td>4. Reporte</td><td>Perfil de habilidades, evidencia, caveats, calidad y gobernanza.</td><td>Lenguaje observacional, sin contratar/rechazar/diagnosticar.</td></tr>
            <tr><td>5. Cierre</td><td>Bundle local/reportes + protocolo manual de cámara + historial final local.</td><td>Artefactos descargables, registro AA y persistencia AB privacy-safe.</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="Edge AI v9.1 multimodal + game-aware">
        <p className="caption">Pipeline local 100% client-side. El schema externo sigue siendo edge_ai_model_output_v8; el modelo interno es v9.1 game-aware.</p>
        <table className="guide-table">
          <thead><tr><th>Etapa</th><th>Módulo</th><th>Descripción</th></tr></thead>
          <tbody>
            <tr><td>Features comunes</td><td>multimodalFeatures.js</td><td>Une temporal features, AUs, emociones, gaze, postura, MoveNet, tarea y calidad.</td></tr>
            <tr><td>AUs crudas</td><td>gestureInsights.js</td><td>Mapeo MediaPipe blendshapes → FACS/AUs proxy.</td></tr>
            <tr><td>AUs procesadas</td><td>auProcessor.js</td><td>Baseline subtraction 60% + ganancia adaptativa. Sin double boost.</td></tr>
            <tr><td>Canales</td><td>edgeAiEngine.js</td><td>Bayes AU + visualAttention + postureQuality + canales game-aware explícitos.</td></tr>
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
            <tr><td>Control inhibitorio</td><td>commission/omission error + post-error slowing</td><td>Solo con actividad Go/No-Go o equivalente.</td></tr>
            <tr><td>Precisión visomotora</td><td>Fitts throughput + path efficiency + tracking loss</td><td>Separa precisión de RT simple.</td></tr>
            <tr><td>Eficiencia búsqueda visual</td><td>searchEfficiency + errorRate + setSize</td><td>Depende de tarea Visual Search.</td></tr>
            <tr><td>Resiliencia adaptativa</td><td>accuracy + completion + errores + deltas de correlación</td><td>Resume estabilidad bajo tarea.</td></tr>
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

      <Section title="Apéndice gamificado O-Q: dificultad, validación y exportación">
        <p className="caption">Las fases O-Q cierran el ciclo experimental: recomendación de dificultad, escenarios sintéticos y exportación agregada para análisis offline.</p>
        <table className="guide-table">
          <thead><tr><th>Fase</th><th>Módulo</th><th>Algoritmo</th><th>Salida</th></tr></thead>
          <tbody>
            <tr><td>O — Dificultad adaptativa</td><td>tasks/adaptiveDifficulty.js</td><td>Evidencia up/down sobre accuracy, RT, completion, motor, inhibición, interferencia, búsqueda visual y carga cognitiva.</td><td>adaptive_difficulty_recommendation_v1 con reasonCodes y trace.</td></tr>
            <tr><td>P — Simulación</td><td>telemetry/gameScenarioFixtures.js</td><td>Fixtures deterministas: buen control motor, fatiga, estrés/error, distracción y mejora por práctica.</td><td>Validación direccional de Edge AI, vector v2 y dificultad.</td></tr>
            <tr><td>Q — Export investigación</td><td>telemetry/researchExport.js</td><td>Registros por trial desde gameCorrelation + assessment_feature_vector_v2; IDs hasheados.</td><td>krumm_research_export_v1, JSONL y CSV con columnas feature.*.</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="Algoritmos y fórmulas O-Q">
        <p className="caption">Las reglas son trazables y anti-oscilación; no usan datos crudos ni rutas reconstructivas.</p>
        <table className="guide-table">
          <thead><tr><th>Algoritmo</th><th>Fórmula / regla</th><th>Justificación</th></tr></thead>
          <tbody>
            <tr><td>Subir dificultad</td><td><code>up {'>'}= down + 2</code>, con accuracy {'>'}= 0.85, completion {'>'}= 0.90, RT rápido, motor estable y baja carga.</td><td>Evita subir por una sola señal aislada.</td></tr>
            <tr><td>Bajar dificultad</td><td><code>down {'>'}= up + 2</code>, con accuracy {'<'}= 0.55, RT lento, motor débil, errores altos o cognitiveLoad {'>'}= 75.</td><td>Reduce demanda ante sobrecarga o caída de desempeño.</td></tr>
            <tr><td>Mantener dificultad</td><td>Sin margen de 2 puntos entre evidencia up/down.</td><td>Histéresis discreta anti-oscilación.</td></tr>
            <tr><td>Validación sintética</td><td>Comparar escenarios esperados: control bueno, fatiga, estrés/error, distracción, práctica.</td><td>Detecta fórmulas invertidas antes de usar datos reales.</td></tr>
            <tr><td>Export JSONL/CSV</td><td>Un registro por trial: runId, trialIndex, gameId, outcome, correct, reactionTimeMs, feature.*.</td><td>Análisis offline sin reconstruir cursor, rostro o estímulos.</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="Referencias metodológicas O-Q">
        <p className="caption">Estas referencias justifican la lógica conductual; KRUMM las usa como señales observacionales, no diagnósticas.</p>
        <table className="guide-table">
          <thead><tr><th>Tema</th><th>Referencia</th><th>Uso en KRUMM</th></tr></thead>
          <tbody>
            <tr><td>Dificultad adaptativa</td><td>Flow theory / challenge-skill balance (Csikszentmihalyi) + computerized adaptive testing.</td><td>Subir dificultad cuando la habilidad observada supera la demanda; bajar ante sobrecarga.</td></tr>
            <tr><td>Control inhibitorio</td><td>Paradigmas Go/No-Go y post-error slowing.</td><td>commissionErrorRate, omissionErrorRate y postErrorSlowingMs.</td></tr>
            <tr><td>Precisión visomotora</td><td>Fitts, P. M. (1954), speed-accuracy tradeoff.</td><td><code>ID = log2(D/W + 1)</code> y throughput en Precision Targeting.</td></tr>
            <tr><td>Búsqueda visual</td><td>Treisman & Gelade (1980), Feature Integration Theory.</td><td>setSize, distractores y searchEfficiency.</td></tr>
            <tr><td>Tracking continuo</td><td>Smooth pursuit / visuomotor tracking.</td><td>RMS error, pérdida de seguimiento y smooth pursuit score.</td></tr>
            <tr><td>Export privacy-safe</td><td>Data minimization / privacy by design.</td><td>Exportar agregados y feature vectors; nunca video, frames, landmarks, raw events ni pointer paths.</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="Experiencia evaluativa unificada R-Z">
        <p className="caption">Las fases R-Z convierten las mediciones A-Q en una experiencia completa: batería guiada, sesión consolidada, perfil de talento, payload final, reporte humano, entrega local/futura, smoke manual y verificación integral.</p>
        <table className="guide-table">
          <thead><tr><th>Fase</th><th>Módulo principal</th><th>Función</th><th>Privacidad/gobernanza</th></tr></thead>
          <tbody>
            <tr><td>R — Runtime batería</td><td>assessment/batteryRuntime.js</td><td>Orquesta consentimiento, cámara, baseline, bloques, descansos, recovery y finalización.</td><td>No almacena señales crudas; solo timeline de estados.</td></tr>
            <tr><td>S — Flujo participante</td><td>assessment/UnifiedGameBattery.jsx</td><td>Muestra progreso, instrucciones, consentimiento y estados finales sin reemplazar el selector manual.</td><td>Modo assessment requiere cámara; modo manual sigue disponible.</td></tr>
            <tr><td>T — Sesión unificada</td><td>assessment/assessmentSession.js</td><td>Consolida batería, gameSummary, gameCorrelation.aggregate, Edge AI, vector v2, dificultad y calidad.</td><td>Valida ausencia de video, frames, landmarks, pointer paths y raw events.</td></tr>
            <tr><td>U — Perfil talento</td><td>assessment/talentProfile.js</td><td>Mapea agregados a 10 habilidades observacionales con score, confianza, evidencia y caveats.</td><td>Solo revisión humana; sin decisión automática.</td></tr>
            <tr><td>V — Payload final</td><td>assessment/finalAssessmentPayload.js</td><td>Empaqueta quality, behavioral, talentProfile y Edge AI para reporte.</td><td><code>humanReviewOnly</code>, <code>noAutomatedDecision</code>, <code>privacySafe</code>.</td></tr>
            <tr><td>W — Reporte humano</td><td>assessment/talentReportGenerator.js</td><td>Genera Markdown, HTML y JSON con portada, resumen, habilidades, caveats y apéndice.</td><td>Lenguaje observacional; no recomienda contratar/rechazar.</td></tr>
            <tr><td>X — Entrega</td><td>assessment/reportSubmissionClient.js</td><td>Crea bundle local y cliente HTTP futuro para enviar/describir reportes.</td><td>Valida payload antes de descargar o enviar.</td></tr>
            <tr><td>Y — Smoke manual</td><td>docs/qa/unified-assessment-manual-smoke.md</td><td>Protocolo para validar cámara real, calibración, batería, reportes y privacidad en navegador.</td><td>Requiere ejecución humana con permisos de cámara.</td></tr>
            <tr><td>Z — Verificación integral</td><td>assessment/assessmentExperienceSmoke.js</td><td>Smoke sintético A-X + checklist Y; suite, build, audit y scans.</td><td>Prueba pipeline sin datos crudos ni claims automáticos.</td></tr>
            <tr><td>AA — Smoke real registrado</td><td>docs/qa/unified-assessment-manual-smoke-2026-07-08.md</td><td>Registro del smoke con cámara reportado por usuario después de estabilizar juegos.</td><td>No guarda capturas ni datos crudos; explicita límite WSL/headless.</td></tr>
            <tr><td>AB — Persistencia local final</td><td>assessment/finalAssessmentStorage.js + FinalAssessmentHistoryPanel.jsx</td><td>Guarda payload final, manifiesto y reportes; lista y re-descarga sesiones finales.</td><td>Valida payload, claves prohibidas y JSON de reportes antes de persistir.</td></tr>
            <tr><td>AC — Preview/descarga final</td><td>assessment/FinalReportPanel.jsx</td><td>Muestra preview Markdown/HTML/JSON, validación, calidad y botones de descarga directa.</td><td>HTML se previsualiza como texto seguro; descargas se bloquean si falla privacy guard.</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="Reporte final y lectura humana">
        <p className="caption">El reporte final está diseñado para personas evaluadoras: resume evidencia, limita inferencias y explicita calidad de señal.</p>
        <table className="guide-table">
          <thead><tr><th>Sección</th><th>Contenido</th><th>Uso recomendado</th></tr></thead>
          <tbody>
            <tr><td>Resumen ejecutivo</td><td>Fortalezas, áreas a revisar y confianza global.</td><td>Primera lectura rápida, siempre con caveats.</td></tr>
            <tr><td>Calidad de señal</td><td>Muestras, presencia facial, confianza, trials correlacionados.</td><td>Determina si la sesión es interpretable.</td></tr>
            <tr><td>Perfil de habilidades</td><td>10 dimensiones: velocidad, precisión, atención, inhibición, interferencia, búsqueda, adaptabilidad, consistencia y regulación.</td><td>Comparar evidencia, no usar como dictamen automático.</td></tr>
            <tr><td>Resultados por juego</td><td>Accuracy, RT, score, search efficiency y métricas conductuales.</td><td>Ubicar qué actividad sostiene cada conclusión.</td></tr>
            <tr><td>Correlación cámara+tarea</td><td>Deltas agregados de reacción/postura/presencia facial.</td><td>Contextualizar desempeño bajo tarea sin raw windows.</td></tr>
            <tr><td>Gobernanza</td><td>Declaración de revisión humana, sin decisión automática y sin export crudo.</td><td>Marco de uso responsable y privacy-by-design.</td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="Revisión retroactiva A-Z">
        <p className="caption">Resumen del avance acumulado: la app pasó de medir AUs/FACS y señales multimodales a una batería evaluativa completa con reporte final privacy-safe, smoke sintético y protocolo manual de cámara.</p>
        <table className="guide-table">
          <thead><tr><th>Bloque</th><th>Estado</th><th>Resultado práctico</th></tr></thead>
          <tbody>
            <tr><td>A-I Juegos</td><td>Completado</td><td>RT, precisión/Fitts, tracking, Go/No-Go, Stroop y Visual Search accesibles manualmente.</td></tr>
            <tr><td>J-K Correlación/vector</td><td>Completado</td><td>Ventanas pre/reaction/post/recovery y <code>assessment_feature_vector_v2</code>.</td></tr>
            <tr><td>L Edge AI</td><td>Completado</td><td>Canales game-aware v9.1: inhibición, precisión visomotora, búsqueda visual y resiliencia.</td></tr>
            <tr><td>M-N UI/payload</td><td>Completado</td><td>Panel de sesión, baseline/delta y reportes base agregados.</td></tr>
            <tr><td>O-Q Validación/export</td><td>Completado</td><td>Dificultad adaptativa, escenarios sintéticos y export JSONL/CSV de investigación.</td></tr>
            <tr><td>R-X Assessment final</td><td>Completado</td><td>Batería guiada, sesión unificada, perfil de talento, payload final, reporte y bundle de entrega.</td></tr>
            <tr><td>Y-Z Cierre técnico</td><td>Cerrado técnicamente</td><td>Protocolo manual para cámara real + smoke sintético integral + suite/build/audit/scans.</td></tr>
          </tbody>
        </table>
      </Section>
    </section>
  );
}
