export const TALENT_DIMENSION_DEFINITIONS = Object.freeze({
  processingSpeed: Object.freeze({
    label: 'Velocidad de procesamiento',
    description: 'Rapidez y estabilidad básica de respuesta ante estímulos simples.',
  }),
  visuomotorPrecision: Object.freeze({
    label: 'Precisión visomotora',
    description: 'Balance velocidad-precisión, eficiencia de trayectoria y control fino.',
  }),
  continuousMotorControl: Object.freeze({
    label: 'Control motor continuo',
    description: 'Capacidad para sostener seguimiento visuomotor durante movimiento continuo.',
  }),
  sustainedAttention: Object.freeze({
    label: 'Atención sostenida',
    description: 'Cobertura de foco visual y continuidad de desempeño durante la batería.',
  }),
  inhibitoryControl: Object.freeze({
    label: 'Control inhibitorio',
    description: 'Capacidad de responder/inhibir respuesta según regla Go/No-Go.',
  }),
  interferenceControl: Object.freeze({
    label: 'Manejo de interferencia',
    description: 'Desempeño bajo conflicto estímulo-respuesta tipo Stroop.',
  }),
  visualSearchEfficiency: Object.freeze({
    label: 'Búsqueda visual',
    description: 'Eficiencia para encontrar objetivos entre distractores.',
  }),
  adaptability: Object.freeze({
    label: 'Adaptabilidad',
    description: 'Evidencia de ajuste positivo a la tarea y recomendación adaptativa.',
  }),
  behavioralConsistency: Object.freeze({
    label: 'Consistencia conductual',
    description: 'Cobertura, completion y estabilidad general de resultados.',
  }),
  regulationUnderLoad: Object.freeze({
    label: 'Regulación bajo carga',
    description: 'Estabilidad observacional ante carga, error, fatiga y estrés proxy.',
  }),
});

export function listTalentDimensionIds() {
  return Object.keys(TALENT_DIMENSION_DEFINITIONS);
}
