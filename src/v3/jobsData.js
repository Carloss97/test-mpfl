// t_7aad621f (FASE A.3): datos de demostración para /empleos (job board).
// 3-4 ofertas consistentes con la fase v3 (candidate shell + i18n v3Copy).
// Cada oferta tiene slug, título, ubicación, modalidad, área, descripción,
// requisitos, beneficios, fecha y estado. Esquema estable para JobsPage y
// JobDetailPage. Los campos i18n usan el patrón { es, en }.

export const JOBS_DATA = Object.freeze([
  Object.freeze({
    slug: 'analista-control-planta',
    title: {
      es: 'Analista de Control de Planta',
      en: 'Plant Control Analyst'
    },
    location: {
      es: 'Antofagasta, Chile',
      en: 'Antofagasta, Chile'
    },
    mode: {
      es: 'Presencial',
      en: 'On-site'
    },
    department: {
      es: 'Operaciones',
      en: 'Operations'
    },
    type: {
      es: 'Tiempo completo',
      en: 'Full-time'
    },
    description: {
      es: 'Buscamos un Analista de Control de Planta para monitorear y optimizar los procesos productivos en nuestra instalación de Antofagasta. Serás responsable de asegurar la eficiencia operativa, el cumplimiento de estándares de calidad y la identificación proactiva de desviaciones en tiempo real.',
      en: 'We are looking for a Plant Control Analyst to monitor and optimize production processes at our Antofagasta facility. You will be responsible for ensuring operational efficiency, quality standard compliance, and proactive identification of real-time deviations.'
    },
    responsibilities: {
      es: [
        'Monitorear variables críticas de proceso mediante sistemas SCADA/DCS',
        'Detectar y reportar desviaciones de parámetros operativos en tiempo real',
        'Colaborar con operaciones para ajustes de setpoints y optimización',
        'Generar reportes de desempeño diario/semanal para gerencia de planta',
        'Participar en investigaciones de incidentes y análisis de causa raíz',
        'Mantener actualizada la documentación de procedimientos de control'
      ],
      en: [
        'Monitor critical process variables via SCADA/DCS systems',
        'Detect and report operational parameter deviations in real time',
        'Collaborate with operations on setpoint adjustments and optimization',
        'Generate daily/weekly performance reports for plant management',
        'Participate in incident investigations and root cause analysis',
        'Maintain up-to-date control procedure documentation'
      ]
    },
    requirements: {
      es: [
        'Título técnico o profesional en Instrumentación, Automatización, Química o afín',
        '2+ años de experiencia en control de procesos industriales (minería, petróleo & gas, o manufactura)',
        'Conocimiento de sistemas SCADA/DCS (Honeywell, Emerson, Siemens, Yokogawa)',
        'Manejo de Excel avanzado y bases de datos (SQL básico)',
        'Disponibilidad para turno rotativo 4x3 en Antofagasta',
        'Inglés técnico nivel intermedio (lectura de manuales y datasheets)'
      ],
      en: [
        'Technical or professional degree in Instrumentation, Automation, Chemical Engineering or related',
        '2+ years experience in industrial process control (mining, oil & gas, or manufacturing)',
        'Knowledge of SCADA/DCS systems (Honeywell, Emerson, Siemens, Yokogawa)',
        'Advanced Excel and database skills (basic SQL)',
        'Availability for 4x3 rotating shift in Antofagasta',
        'Technical English intermediate level (reading manuals and datasheets)'
      ]
    },
    benefits: {
      es: [
        'Renta competitiva + bono de turno + bono de producción',
        'Seguro complementario de salud y dental',
        'Programa de capacitación continua y certificaciones',
        'Transporte y alimentación en faena',
        'Sistema de turnos 4x3 (4 días trabajo / 3 días descanso)',
        'Oportunidades de desarrollo interno y movilidad'
      ],
      en: [
        'Competitive salary + shift bonus + production bonus',
        'Complementary health and dental insurance',
        'Continuous training program and certifications',
        'Transport and meals at site',
        '4x3 shift system (4 days on / 3 days off)',
        'Internal development and mobility opportunities'
      ]
    },
    postedAt: '2026-09-01',
    status: 'active', // active | paused | closed
    featured: true
  }),
  Object.freeze({
    slug: 'operador-planta-quimica',
    title: {
      es: 'Operador de Planta Química',
      en: 'Chemical Plant Operator'
    },
    location: {
      es: 'Mejillones, Chile',
      en: 'Mejillones, Chile'
    },
    mode: {
      es: 'Presencial',
      en: 'On-site'
    },
    department: {
      es: 'Operaciones',
      en: 'Operations'
    },
    type: {
      es: 'Tiempo completo',
      en: 'Full-time'
    },
    description: {
      es: 'Requirimos Operadores de Planta Química para nuestra operación en Mejillones. El rol consiste en la operación segura y eficiente de equipos de proceso (reactores, columnas de destilación, intercambiadores de calor) siguiendo procedimientos establecidos y estándares de seguridad HSE.',
      en: 'We require Chemical Plant Operators for our Mejillones operation. The role consists of safe and efficient operation of process equipment (reactors, distillation columns, heat exchangers) following established procedures and HSE safety standards.'
    },
    responsibilities: {
      es: [
        'Operar equipos de proceso según procedimientos operativos estándar (POE)',
        'Realizar rondas de inspección y lectura de instrumentos de campo',
        'Ejecutar arranques, paradas y cambios de grado de producto',
        'Responder a alarmas de proceso y aplicar acciones correctivas inmediatas',
        'Completar bitácoras de turno y reportar novedades al supervisor',
        'Participar en simulacros de emergencia y charlas de seguridad diarias'
      ],
      en: [
        'Operate process equipment per standard operating procedures (SOP)',
        'Perform inspection rounds and field instrument readings',
        'Execute startups, shutdowns, and product grade changes',
        'Respond to process alarms and apply immediate corrective actions',
        'Complete shift logs and report occurrences to supervisor',
        'Participate in emergency drills and daily safety talks'
      ]
    },
    requirements: {
      es: [
        'Técnico nivel superior en Procesos Químicos, Química Industrial o afín',
        '1+ año de experiencia en operación de planta continua (química, petroquímica, refino)',
        'Conocimiento de instrumentación de campo (presión, temperatura, nivel, flujo)',
        'Curso de espacios confinados, trabajo en altura y manipulación de sustancias peligrosas',
        'Disponibilidad para turno rotativo 7x7 en Mejillones',
        'Compromiso con cultura de seguridad cero incidentes'
      ],
      en: [
        'Higher technician in Chemical Processes, Industrial Chemistry or related',
        '1+ year experience in continuous plant operation (chemical, petrochemical, refining)',
        'Knowledge of field instrumentation (pressure, temperature, level, flow)',
        'Confined space, working at heights, and hazardous materials handling certification',
        'Availability for 7x7 rotating shift in Mejillones',
        'Commitment to zero-incident safety culture'
      ]
    },
    benefits: {
      es: [
        'Renta base + bono turno 7x7 + bono asistencia',
        'Seguro de vida y complementario de salud',
        'Vivienda y alimentación en campamento (turno 7x7)',
        'Programa de bienestar y recreación en faena',
        'Capacitación técnica continua y plan de carrera operativa',
        'Contrato indefinido tras período de prueba'
      ],
      en: [
        'Base salary + 7x7 shift bonus + attendance bonus',
        'Life insurance and complementary health insurance',
        'Housing and meals at camp (7x7 shift)',
        'Wellness and recreation program at site',
        'Continuous technical training and operational career path',
        'Permanent contract after probation period'
      ]
    },
    postedAt: '2026-08-28',
    status: 'active',
    featured: false
  }),
  Object.freeze({
    slug: 'tecnico-mantenimiento-instrumentacion',
    title: {
      es: 'Técnico de Mantenimiento - Instrumentación',
      en: 'Maintenance Technician - Instrumentation'
    },
    location: {
      es: 'Calama, Chile',
      en: 'Calama, Chile'
    },
    mode: {
      es: 'Presencial',
      en: 'On-site'
    },
    department: {
      es: 'Mantenimiento',
      en: 'Maintenance'
    },
    type: {
      es: 'Tiempo completo',
      en: 'Full-time'
    },
    description: {
      es: 'Buscamos Técnico de Mantenimiento especializado en Instrumentación para nuestra operación en Calama. Serás responsable del mantenimiento preventivo y correctivo de instrumentos de campo, sistemas de control (DCS/SCADA), válvulas de control y analizadores de proceso.',
      en: 'We are looking for a Maintenance Technician specialized in Instrumentation for our Calama operation. You will be responsible for preventive and corrective maintenance of field instruments, control systems (DCS/SCADA), control valves, and process analyzers.'
    },
    responsibilities: {
      es: [
        'Ejecutar planes de mantenimiento preventivo de instrumentación (calibración, verificación, limpieza)',
        'Diagnosticar y reparar fallas en transmisores, controladores, válvulas y analizadores',
        'Configurar y poner en marcha instrumentos inteligentes (HART, Foundation Fieldbus, Profibus)',
        'Gestionar repuestos críticos de instrumentación y solicitudes de compra',
        'Apoyar paradas de planta programadas y de emergencia',
        'Documentar intervenciones en CMMS (Maximo/SAP PM) y generar reportes de confiabilidad'
      ],
      en: [
        'Execute instrumentation preventive maintenance plans (calibration, verification, cleaning)',
        'Diagnose and repair failures in transmitters, controllers, valves, and analyzers',
        'Configure and commission smart instruments (HART, Foundation Fieldbus, Profibus)',
        'Manage critical instrumentation spares and purchase requests',
        'Support scheduled and emergency plant shutdowns',
        'Document interventions in CMMS (Maximo/SAP PM) and generate reliability reports'
      ]
    },
    requirements: {
      es: [
        'Técnico nivel superior en Instrumentación, Automatización o Electricidad Industrial',
        '3+ años de experiencia en mantenimiento de instrumentación en industria de proceso',
        'Certificación en calibración de instrumentos (ISA, o equivalente)',
        'Experiencia con sistemas DCS/SCADA (Honeywell Experion, Emerson DeltaV, Yokogawa Centum)',
        'Conocimiento de normas ISA (ISA-5.1, ISA-75, ISA-96)',
        'Disponibilidad para turno 4x3 o 7x7 en Calama, licencia de conducir clase B'
      ],
      en: [
        'Higher technician in Instrumentation, Automation or Industrial Electrical',
        '3+ years experience in instrumentation maintenance in process industry',
        'Instrument calibration certification (ISA, or equivalent)',
        'Experience with DCS/SCADA systems (Honeywell Experion, Emerson DeltaV, Yokogawa Centum)',
        'Knowledge of ISA standards (ISA-5.1, ISA-75, ISA-96)',
        'Availability for 4x3 or 7x7 shift in Calama, class B driver license'
      ]
    },
    benefits: {
      es: [
        'Renta competitiva + bono de especialidad instrumentación',
        'Seguro complementario + caja de compensación',
        'Herramientas y equipos de medición de alta gama provistos',
        'Capacitación en tecnologías emergentes (IIoT, digital twin, wireless HART)',
        'Turnos 4x3 o 7x7 con transporte y alimentación',
        'Estabilidad laboral en empresa líder del sector'
      ],
      en: [
        'Competitive salary + instrumentation specialty bonus',
        'Complementary insurance + compensation fund',
        'High-end tools and measurement equipment provided',
        'Training in emerging technologies (IIoT, digital twin, wireless HART)',
        '4x3 or 7x7 shifts with transport and meals',
        'Job stability in industry-leading company'
      ]
    },
    postedAt: '2026-08-20',
    status: 'active',
    featured: true
  }),
  Object.freeze({
    slug: 'ingeniero-confiabilidad-activos',
    title: {
      es: 'Ingeniero de Confiabilidad de Activos',
      en: 'Asset Reliability Engineer'
    },
    location: {
      es: 'Santiago, Chile (Híbrido)',
      en: 'Santiago, Chile (Hybrid)'
    },
    mode: {
      es: 'Híbrido',
      en: 'Hybrid'
    },
    department: {
      es: 'Ingeniería / Confiabilidad',
      en: 'Engineering / Reliability'
    },
    type: {
      es: 'Tiempo completo',
      en: 'Full-time'
    },
    description: {
      es: 'Buscamos Ingeniero de Confiabilidad para liderar estrategias de mantenimiento predictivo y proactivo en nuestros activos mineros e industriales. Desde Santiago (híbrido), definirás planes de confiabilidad, analizarás datos de condición (vibración, termografía, análisis de aceite) y coordinarás con faenas para maximizar disponibilidad.',
      en: 'We are looking for a Reliability Engineer to lead predictive and proactive maintenance strategies for our mining and industrial assets. Based in Santiago (hybrid), you will define reliability plans, analyze condition data (vibration, thermography, oil analysis), and coordinate with sites to maximize availability.'
    },
    responsibilities: {
      es: [
        'Diseñar e implementar estrategias de mantenimiento basado en condición (CBM)',
        'Analizar datos de monitoreo de condición: vibración, termografía, ultrasonido, aceite',
        'Desarrollar planes de criticidad de equipos (RCM) y estrategias de repuestos',
        'Liderar análisis de modo de falla y efectos (FMEA) y RCA de fallas críticas',
        'Optimizar planes de mantenimiento preventivo/predictivo en CMMS (Maximo/SAP)',
        'Reportar KPIs de confiabilidad (MTBF, MTTR, disponibilidad, backlog) a gerencia',
        'Coordinar con faenas (Antofagasta, Calama, Mejillones) para despliegue de tecnologías'
      ],
      en: [
        'Design and implement condition-based maintenance (CBM) strategies',
        'Analyze condition monitoring data: vibration, thermography, ultrasound, oil',
        'Develop equipment criticality plans (RCM) and spare parts strategies',
        'Lead failure mode and effects analysis (FMEA) and RCA of critical failures',
        'Optimize preventive/predictive maintenance plans in CMMS (Maximo/SAP)',
        'Report reliability KPIs (MTBF, MTTR, availability, backlog) to management',
        'Coordinate with sites (Antofagasta, Calama, Mejillones) for technology deployment'
      ]
    },
    requirements: {
      es: [
        'Ingeniero Civil Mecánico, Eléctrico, Industrial o afín',
        '4+ años en confiabilidad / mantenimiento predictivo en minería, energía o industria de proceso',
        'Certificación CMRP, CRE o equivalente (deseable)',
        'Experiencia en análisis de vibración (ISO 18436-2 Cat II+), termografía, aceite',
        'Manejo de CMMS (Maximo, SAP PM) y herramientas de análisis (SKF, Pruftechnik, RDI)',
        'Inglés avanzado (reportes técnicos y coordinación con proveedores globales)',
        'Disponibilidad para viajes a faena (2-3 días/semana en terreno)'
      ],
      en: [
        'Civil Mechanical, Electrical, Industrial Engineer or related',
        '4+ years in reliability / predictive maintenance in mining, energy or process industry',
        'CMRP, CRE certification or equivalent (desirable)',
        'Experience in vibration analysis (ISO 18436-2 Cat II+), thermography, oil analysis',
        'CMMS proficiency (Maximo, SAP PM) and analysis tools (SKF, Pruftechnik, RDI)',
        'Advanced English (technical reports and global vendor coordination)',
        'Availability for site travel (2-3 days/week in field)'
      ]
    },
    benefits: {
      es: [
        'Renta profesional competitiva + bono de resultados anual',
        'Modalidad híbrida (3 días oficina Santiago / 2 días terreno o remoto)',
        'Seguro de salud premium + seguro de vida',
        'Presupuesto anual de capacitación y certificaciones internacionales',
        'Auto corporativo o asignación de movilización',
        'Participación en programas de innovación y digitalización de activos'
      ],
      en: [
        'Competitive professional salary + annual performance bonus',
        'Hybrid mode (3 days Santiago office / 2 days field or remote)',
        'Premium health insurance + life insurance',
        'Annual training and international certification budget',
        'Company car or mobility allowance',
        'Participation in asset innovation and digitalization programs'
      ]
    },
    postedAt: '2026-09-05',
    status: 'active',
    featured: false
  })
]);

// Helper para obtener una oferta por slug
export function getJobBySlug(slug) {
  return JOBS_DATA.find(job => job.slug === slug) || null;
}

// Helper para filtrar ofertas activas
export function getActiveJobs() {
  return JOBS_DATA.filter(job => job.status === 'active');
}

// Helper para ofertas destacadas
export function getFeaturedJobs() {
  return JOBS_DATA.filter(job => job.status === 'active' && job.featured);
}