// Tangram EXP-TANGRAM-001 — feedback visual / HUD y configuración de estado.
// Clases de estado según DOCUMENTO 2 §4: normal / warning / critical + señales de snap y victoria.

export const TANGRAM_SIGNAL_COLORS = Object.freeze({
  normal: '#2B6CB0', // azul neutro (lienzo)
  warning: '#D69E2E', // ámbar pulsante (últimos 10s o último movimiento)
  critical: '#E53E3E', // rojo (tiempo < 5s)
  snap: '#3B82F6', // destello blanco-azulado en encastre
  victory: '#D69E2E', // degradado dorado al completar
});

export const TANGRAM_UI_STATES = Object.freeze({
  normal: 'normal',
  warning: 'warning',
  critical: 'critical',
});

// Deriva el estado del HUD a partir del tiempo restante, el límite de movimientos
// restantes y las marcas críticas (feedback del DOCUMENTO 2 §4).
export function deriveTangramUiState({
  secondsLeft = 0,
  movesLeft = Infinity,
  allowTimed = true,
  allowMoves = true,
  lastDecrement = 10,
} = {}) {
  const timeCritical = allowTimed && secondsLeft < 5;
  const timeWarning = allowTimed && secondsLeft <= lastDecrement && !timeCritical;
  const movesCritical = allowMoves && Number.isFinite(movesLeft) && movesLeft <= 0 && movesLeft !== Infinity;
  const movesWarning = allowMoves && Number.isFinite(movesLeft) && movesLeft === 1;

  if (timeCritical || movesCritical) return TANGRAM_UI_STATES.critical;
  if (timeWarning || movesWarning) return TANGRAM_UI_STATES.warning;
  return TANGRAM_UI_STATES.normal;
}

// Clase CSS para el borde del lienzo según estado.
export function getTangramCanvasSignalClass(state) {
  return `tangram-canvas--${state}`;
}

// Mensajes micro-copy del HUD según DOCUMENTO 2 §2.4.
export function getTangramHudCopy(t, state, { secondsLeft, movesLeft, level, of = 4 }) {
  const timeLabel = state === TANGRAM_UI_STATES.critical
    ? t('Tiempo: ¡crítico!', 'Time: critical!')
    : t('Tiempo: {s}s', 'Time: {s}s').replace('{s}', secondsLeft);
  const movesLabel = movesLeft === Infinity
    ? t('Movimientos: Ilimitados', 'Moves: Unlimited')
    : t('Movimientos Restantes: {n}', 'Moves Left: {n}').replace('{n}', movesLeft);
  return {
    level: t('Nivel {x} de {y}', 'Level {x} of {y}').replace('{x}', level ?? 1).replace('{y}', of),
    moves: movesLabel,
    time: timeLabel,
  };
}

// Mensaje de notificación según outcome (DOCUMENTO 2 §2.4).
export function getTangramOutcomeMessage(t, outcome) {
  switch (outcome) {
    case 'success':
      return t('+100 Pts - ¡Figura Completada!', '+100 Pts - Completed!');
    case 'moves_exhausted':
      return t('Límite de movimientos alcanzado. Nivel No Superado.', 'Move limit reached. Level not passed.');
    case 'timeout':
      return t('¡Tiempo Agotado! Nivel No Superado.', 'Time up! Level not passed.');
    default:
      return '';
  }
}

// Modal de transición tutorial -> evaluación (DOCUMENTO 2 §2.3).
export function getTangramTransitionCopy(t) {
  return {
    title: t('Tutorial Completado', 'Tutorial Complete'),
    message: t(
      'Has dominado la mecánica de ensamblaje. A partir de este momento, tus decisiones y tiempos de respuesta serán registrados para la evaluación. Se presentarán 4 niveles de dificultad progresiva. ¿Estás listo/a?',
      'You have mastered the assembly mechanics. From now on your decisions and response times will be recorded for evaluation. You will face 4 levels of increasing difficulty. Ready?',
    ),
    cta: t('Comenzar Evaluación Real', 'Start Real Evaluation'),
  };
}

// Pantalla final (DOCUMENTO 2 §2.4).
export function getTangramFinalCopy(t) {
  return {
    title: t('Simulación Finalizada', 'Simulation Complete'),
    message: t('Tus resultados han sido procesados exitosamente.', 'Your results have been processed successfully.'),
  };
}

// Bienvenida e instrucciones (DOCUMENTO 2 §2.1).
export function getTangramWelcomeCopy(t) {
  return {
    title: t('Simulación de Resolución Espacial: Ensamblaje Geométrico', 'Spatial Resolution Simulation: Geometric Assembly'),
    intro: t(
      'Bienvenido/a a la prueba de resolución espacial y planificación. En esta simulación, tu objetivo es construir la figura sombreada utilizando las piezas disponibles en la bandeja. Debes ajustar y encajar cada pieza respetando los límites de tiempo y movimientos de cada nivel.',
      'Welcome to the spatial resolution and planning assessment. Your goal is to build the shaded figure using the available pieces in the tray. Fit each piece while respecting the time and move limits of each level.',
    ),
    pieces: t('Uso de Piezas: Haz clic y arrastra una pieza al lienzo. Para rotarla, usa el botón secundario del ratón, la barra espaciadora o el botón de rotación en pantalla.', 'Pieces: Click and drag a piece to the canvas. To rotate it, use the secondary mouse button, the space bar, or the on-screen rotate button.'),
    resources: t('Gestión de Recursos: Algunos niveles limitarán la cantidad de movimientos permitidos; otros pondrán a prueba tu velocidad con un temporizador estricto.', 'Resources: Some levels limit the number of allowed moves; others test your speed with a strict timer.'),
    precision: t('Precisión: Las piezas deben quedar perfectamente alineadas dentro de la figura sin sobreponerse.', 'Precision: Pieces must align perfectly within the figure without overlapping.'),
    cta: t('Iniciar Tutorial de Práctica', 'Start Practice Tutorial'),
  };
}