export const postulationDemoCopy = Object.freeze({
  eyebrow: 'Demo MVP',
  title: 'KRUMM Postulaciones',
  subtitle: 'Juegos breves, señales locales y reporte para revisión humana.',
  description: 'Una experiencia de postulación gamificada donde la persona juega, mientras KRUMM prepara en segundo plano telemetría agregada y calidad de señal para un reporte humano.',
  timeEstimate: '6-8 min',
  cta: 'Comenzar demo de postulación',
  secondaryCta: 'Ver qué procesa KRUMM',
  principles: [
    'Los juegos son la experiencia principal.',
    'Cámara y señales corren en segundo plano cuando se habilitan.',
    'No se guarda video, frames, landmarks crudos ni trayectorias de puntero.',
    'El reporte final es para revisión humana; no toma decisiones automáticas.',
  ],
  cards: [
    {
      title: 'Juegos primero',
      body: 'La demo prioriza tareas breves, instrucciones claras y progreso visible para la persona postulante.',
    },
    {
      title: 'Señales de fondo',
      body: 'FaceMesh, AUs/FACS, gaze, postura, MoveNet y eventos de juego se integran localmente sin convertir la pantalla en un laboratorio.',
    },
    {
      title: 'Reporte al final',
      body: 'El cierre muestra evidencia agregada, caveats y un payload privacy-safe preparado para entrega controlada y revisión humana.',
    },
  ],
  setupPreview: {
    title: 'Preparación de demo',
    body: 'La cámara es opcional y las señales habilitadas se procesan localmente; si faltan, la sesión continúa con caveats explícitos.',
    back: 'Volver al inicio',
  },
});
