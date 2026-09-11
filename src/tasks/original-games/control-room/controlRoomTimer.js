// controlRoomTimer.js — EXP-COMM-001 (Sala de Control) · C1: Timer Service.
// Spec §12.3 (timeout, solo B6 en v1): "Timeout (solo Bloque 6 en v1). Sin penalización
// ni corrección. Si ocurre antes del envio del primer mensaje: el escenario no se puntúa.
// Si ocurre después: se puntúa como enviado incompleto".
// §14.1: sin countdown visible en bloques 1-5 (límite técnico amplio); timer visible solo
// en bloque 6. §18: fases normal/warning/critical (warning <25% restante; critical últimos 10s).
//
// Diseño (espejo de bombTimer.js):
// - Reloj inyectable `now()` (default performance.now / fallback Date.now). Determinismo en
//   tests con reloj falso (riesgo #2 del plan).
// - Monotónico: clamp de retroceso; el tiempo transcurrido nunca retrocede.
// - `remainingMs()` SIEMPRE >= 0 (clamp).
// - SIN penalización por error (spec §12.3): no aplica `applyPenalty`.
// - `timeLimitMs: null` = sin presión temporal (bloques 1-5 + tutorial): expired siempre
//   false, remaining null.
// - Fases: 'normal' | 'warning' | 'critical' (warning = <25% restante, critical = últimos 10s).

const DEFAULT_NOW = () => (typeof performance !== 'undefined' && typeof performance.now === 'function'
  ? performance.now()
  : Date.now());

export function createControlRoomTimer({
  timeLimitMs = null,
  now = DEFAULT_NOW,
  warningRemainingPct = 0.25,
  criticalRemainingMs = 10000,
} = {}) {
  let anchorMs = null;      // ahora (ms del reloj) en que arrancó la ventana
  let baseElapsedMs = 0;   // transcurrido congelado (si la ventana aún no arrancó)
  let running = false;
  let lastRaw = null;      // última lectura cruda, para garantizar monotonicidad

  function rawNow() {
    const t = now();
    if (lastRaw !== null && t < lastRaw) return lastRaw; // clamp de retroceso
    lastRaw = t;
    return t;
  }

  const timer = {
    /** Arranca la ventana de ejecución (ancla el reloj). Idempotente. */
    start() {
      if (running || timeLimitMs === null) return;
      anchorMs = rawNow();
      baseElapsedMs = 0;
      running = true;
    },

    isRunning() {
      return running && timeLimitMs !== null;
    },

    /** ms transcurridos desde el start (monotónico, clamp >= 0). null si sin límite. */
    elapsedMs() {
      if (timeLimitMs === null) return null;
      if (!running) return baseElapsedMs;
      return baseElapsedMs + Math.max(0, rawNow() - anchorMs);
    },

    /** ms restantes (clamp 0). null si no hay límite (sin presión). */
    remainingMs() {
      if (timeLimitMs === null) return null;
      const elapsed = timer.elapsedMs();
      if (elapsed === null) return null;
      return Math.max(0, timeLimitMs - elapsed);
    },

    /** true si el tiempo restante llegó a 0. */
    isExpired() {
      if (timeLimitMs === null) return false;
      return timer.remainingMs() <= 0;
    },

    /** Fase visual/lógica: 'normal' | 'warning' | 'critical' (spec §18). */
    phase() {
      if (timeLimitMs === null) return 'normal';
      const remaining = timer.remainingMs();
      if (remaining === null) return 'normal';
      if (remaining <= 0) return 'critical';
      if (remaining <= criticalRemainingMs) return 'critical';
      if (remaining <= timeLimitMs * warningRemainingPct) return 'warning';
      return 'normal';
    },

    /** Fracción restante [0..1] (para UI; §18 warning a <25%). */
    remainingFraction() {
      if (timeLimitMs === null) return 1;
      return timer.remainingMs() / timeLimitMs;
    },

    /** Detiene el avance (resultado mostrado); congela el transcurrido. */
    stop() {
      if (!running) return;
      baseElapsedMs = timer.elapsedMs() ?? 0;
      running = false;
    },

    /** Config expuesta (para telemetría/observabilidad). */
    config: Object.freeze({ timeLimitMs, warningRemainingPct, criticalRemainingMs }),
  };

  return timer;
}
