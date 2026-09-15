// Demonstration-only role catalog for /empleos. It is intentionally not a
// vacancy feed: no employer, compensation, benefits, location, or posting date
// is asserted here. `exampleStatus` illustrates UI states only.

export const JOBS_DATA = Object.freeze([
  Object.freeze({
    slug: 'analista-control-procesos',
    title: Object.freeze({ es: 'Analista de control de procesos', en: 'Process control analyst' }),
    area: Object.freeze({ es: 'Operaciones', en: 'Operations' }),
    description: Object.freeze({
      es: 'Ejemplo de rol para mostrar cómo KRUMM puede estructurar una conversación sobre control de procesos. No representa una búsqueda ni una empresa.',
      en: 'Role example showing how KRUMM can structure a conversation about process control. It does not represent a search or an employer.',
    }),
    focus: Object.freeze({
      es: ['Interpretación de variables y señales de proceso', 'Priorización de desviaciones operativas', 'Comunicación de hallazgos con equipos técnicos'],
      en: ['Interpreting process variables and signals', 'Prioritizing operational deviations', 'Communicating findings with technical teams'],
    }),
    competencies: Object.freeze({
      es: ['Razonamiento analítico aplicado a escenarios', 'Criterio para documentar decisiones', 'Colaboración en contextos operativos'],
      en: ['Analytical reasoning applied to scenarios', 'Judgment when documenting decisions', 'Collaboration in operational contexts'],
    }),
    exampleStatus: 'active',
  }),
  Object.freeze({
    slug: 'operador-planta',
    title: Object.freeze({ es: 'Operador/a de planta', en: 'Plant operator' }),
    area: Object.freeze({ es: 'Operaciones', en: 'Operations' }),
    description: Object.freeze({
      es: 'Ejemplo de rol para explorar señales de seguridad, coordinación y seguimiento de procedimientos. No es una vacante publicada.',
      en: 'Role example for exploring safety signals, coordination, and procedure follow-through. It is not a published vacancy.',
    }),
    focus: Object.freeze({
      es: ['Lectura de situaciones operativas simuladas', 'Priorización segura ante cambios', 'Entrega de turno y registro claro'],
      en: ['Reading simulated operational situations', 'Safe prioritization when conditions change', 'Clear shift handover and records'],
    }),
    competencies: Object.freeze({
      es: ['Atención sostenida', 'Comunicación estructurada', 'Toma de decisiones situacional'],
      en: ['Sustained attention', 'Structured communication', 'Situational decision-making'],
    }),
    exampleStatus: 'paused',
  }),
  Object.freeze({
    slug: 'tecnico-mantenimiento',
    title: Object.freeze({ es: 'Técnico/a de mantenimiento', en: 'Maintenance technician' }),
    area: Object.freeze({ es: 'Mantenimiento', en: 'Maintenance' }),
    description: Object.freeze({
      es: 'Ejemplo de rol para demostrar la presentación de competencias de mantenimiento. No comunica condiciones de contratación.',
      en: 'Role example demonstrating how maintenance competencies can be presented. It does not communicate employment terms.',
    }),
    focus: Object.freeze({
      es: ['Diagnóstico de fallas en casos ficticios', 'Planificación de intervenciones', 'Registro de evidencia técnica'],
      en: ['Diagnosing faults in fictional cases', 'Planning interventions', 'Recording technical evidence'],
    }),
    competencies: Object.freeze({
      es: ['Resolución de problemas', 'Orden y trazabilidad', 'Coordinación con otras especialidades'],
      en: ['Problem solving', 'Order and traceability', 'Coordination across specialties'],
    }),
    exampleStatus: 'closed',
  }),
  Object.freeze({
    slug: 'ingeniero-confiabilidad',
    title: Object.freeze({ es: 'Ingeniero/a de confiabilidad', en: 'Reliability engineer' }),
    area: Object.freeze({ es: 'Ingeniería', en: 'Engineering' }),
    description: Object.freeze({
      es: 'Ejemplo de rol para ilustrar una evaluación orientada a confiabilidad y mejora continua. No identifica una organización ni una oportunidad vigente.',
      en: 'Role example illustrating an assessment focused on reliability and continuous improvement. It identifies neither an organization nor a current opportunity.',
    }),
    focus: Object.freeze({
      es: ['Análisis de patrones en información simulada', 'Formulación de hipótesis y próximos pasos', 'Explicación de prioridades a partes interesadas'],
      en: ['Analyzing patterns in simulated information', 'Formulating hypotheses and next steps', 'Explaining priorities to stakeholders'],
    }),
    competencies: Object.freeze({
      es: ['Pensamiento sistémico', 'Planificación basada en evidencia', 'Comunicación de riesgos'],
      en: ['Systems thinking', 'Evidence-based planning', 'Risk communication'],
    }),
    exampleStatus: 'active',
  }),
]);

export function getJobBySlug(slug) {
  return JOBS_DATA.find((job) => job.slug === slug) || null;
}

export function getDemoJobs() {
  return JOBS_DATA;
}

// Retained for callers from the former board. These are active *examples*, not
// active jobs, and no UI should use this helper to make a vacancy claim.
export function getActiveJobs() {
  return JOBS_DATA.filter((job) => job.exampleStatus === 'active');
}
