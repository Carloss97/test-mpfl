import { useLanguage } from '../i18n/LanguageContext.jsx';

export function usePostulationDemoCopy() {
  const { t } = useLanguage();
  return {
    eyebrow: t('KRUMM', 'KRUMM'),
    title: t('KRUMM Postulaciones', 'KRUMM Applications'),
    subtitle: t(
      'Juegos breves, procesamiento local y reporte para revisión humana.',
      'Short games, on-device processing, and a report for human review.',
    ),
    description: t(
      'Una experiencia gamificada donde cada actividad aporta métricas agregadas y KRUMM prepara un reporte de 8 constructos con señal de prueba para revisión humana.',
      'A gamified experience where each activity contributes aggregated metrics and KRUMM prepares an 8-construct assessment-signal report for human review.',
    ),
    timeEstimate: t('6-8 min', '6-8 min'),
    originalTimeEstimate: t('10–12 min', '10–12 min'),
    cta: t('Comenzar prueba de postulación', 'Start application assessment'),
    secondaryCta: t('Ver qué procesa KRUMM', 'See what KRUMM processes'),
    principles: [
      t('Los juegos son la experiencia principal.', 'Games are the main experience.'),
      t(
        'La cámara es opcional. Puedes continuar sin activarla: no reduce el desempeño de los juegos y su ausencia solo queda como observación de calidad.',
        'The camera is optional. You can continue without enabling it: it does not reduce game performance, and its absence is only noted as a quality observation.',
      ),
      t(
        'No se guarda video, imágenes ni datos que permitan reconstruir la interacción.',
        'No video, images, or data that could reconstruct the interaction are stored.',
      ),
      t(
        'El reporte final es para revisión humana; no toma decisiones automáticas.',
        'The final report is for human review; it does not make automated decisions.',
      ),
    ],
    cards: [
      {
        title: t('Juegos primero', 'Games first'),
        body: t(
          'La demo prioriza tareas breves, instrucciones claras y progreso visible para la persona postulante.',
          'The demo prioritizes short tasks, clear instructions, and visible progress for the applicant.',
        ),
      },
      {
        title: t('Procesamiento responsable', 'Responsible processing'),
        body: t(
          'La cámara opcional ayuda a revisar la calidad de captura y el contexto de la sesión. Puedes omitirla; todo se procesa localmente y no se utiliza para inferir talento por sí sola.',
          'The optional camera helps review capture quality and session context. You can skip it; everything is processed locally and is not used on its own to infer talent.',
        ),
      },
      {
        title: t('Reporte claro al final', 'Clear report at the end'),
        body: t(
          'El cierre presenta resultados agregados, alcance y limitaciones para apoyar una entrevista estructurada y la revisión humana.',
          'The closing screen presents aggregated results, scope, and limitations to support a structured interview and human review.',
        ),
      },
    ],
    setupPreview: {
      title: t('Preparación de demo', 'Demo preparation'),
      body: t(
        'La cámara es opcional y las señales habilitadas se procesan localmente; si faltan, la sesión continúa con caveats explícitos.',
        'The camera is optional and enabled signals are processed locally; if missing, the session continues with explicit caveats.',
      ),
      back: t('Volver al inicio', 'Back to start'),
    },
  };
}
