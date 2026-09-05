export const TALENT_DIMENSION_DEFINITIONS = Object.freeze({
  processingSpeed: Object.freeze({
    label: 'Velocidad de procesamiento',
    labelEn: 'Processing speed',
    description: 'Rapidez y estabilidad básica de respuesta ante estímulos simples.',
    descriptionEn: 'Basic speed and stability of response to simple stimuli.',
  }),
  visuomotorPrecision: Object.freeze({
    label: 'Precisión visomotora',
    labelEn: 'Visuomotor precision',
    description: 'Balance velocidad-precisión, eficiencia de trayectoria y control fino.',
    descriptionEn: 'Speed-precision balance, trajectory efficiency, and fine control.',
  }),
  continuousMotorControl: Object.freeze({
    label: 'Control motor continuo',
    labelEn: 'Continuous motor control',
    description: 'Capacidad para sostener seguimiento visuomotor durante movimiento continuo.',
    descriptionEn: 'Ability to sustain visuomotor tracking during continuous movement.',
  }),
  sustainedAttention: Object.freeze({
    label: 'Atención sostenida',
    labelEn: 'Sustained attention',
    description: 'Cobertura de foco visual y continuidad de desempeño durante la batería.',
    descriptionEn: 'Visual focus coverage and performance continuity across the battery.',
  }),
  inhibitoryControl: Object.freeze({
    label: 'Control inhibitorio',
    labelEn: 'Inhibitory control',
    description: 'Capacidad de responder/inhibir respuesta según regla Go/No-Go.',
    descriptionEn: 'Ability to respond or withhold response under Go/No-Go rules.',
  }),
  interferenceControl: Object.freeze({
    label: 'Manejo de interferencia',
    labelEn: 'Interference control',
    description: 'Desempeño bajo conflicto estímulo-respuesta tipo Stroop.',
    descriptionEn: 'Performance under Stroop-like stimulus-response conflict.',
  }),
  visualSearchEfficiency: Object.freeze({
    label: 'Búsqueda visual',
    labelEn: 'Visual search efficiency',
    description: 'Eficiencia para encontrar objetivos entre distractores.',
    descriptionEn: 'Efficiency finding targets among distractors.',
  }),
  adaptability: Object.freeze({
    label: 'Adaptabilidad',
    labelEn: 'Adaptability',
    description: 'Evidencia de ajuste positivo a la tarea y recomendación adaptativa.',
    descriptionEn: 'Evidence of positive task adjustment and adaptive recommendation.',
  }),
  behavioralConsistency: Object.freeze({
    label: 'Consistencia conductual',
    labelEn: 'Behavioral consistency',
    description: 'Cobertura, completion y estabilidad general de resultados.',
    descriptionEn: 'Coverage, completion, and overall stability of results.',
  }),
  regulationUnderLoad: Object.freeze({
    label: 'Regulación bajo carga',
    labelEn: 'Regulation under load',
    description: 'Estabilidad observacional ante carga, error, fatiga y estrés proxy.',
    descriptionEn: 'Observational stability under load, error, fatigue, and stress proxies.',
  }),
});

export function listTalentDimensionIds() {
  return Object.keys(TALENT_DIMENSION_DEFINITIONS);
}
