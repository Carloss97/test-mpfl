// bombTimer.js — EXP-BOMB-001 · B1: Timer Service (spec §6 "gestiona time_limit, penalizaciones
// y timestamps monotónicos"; §15 rendimiento: "degradación... sin alterar timers monotónicos").
//
// Diseño:
// - Reloj inyectable `now()` (default: performance.now con fallback Date.now, mismo patrón que
//   gameClock.currentTime). En tests se inyecta un reloj falso para determinismo (riesgo #2 del plan).
// - Monotónico: si el reloj regresa (raro, pero posible en algunos entornos headless), el delta se
//   clampa a >= 0 y el tiempo transcurrido nunca retrocede.
// - `remainingMs()` SIEMPRE >= 0 (clamp 0, DoD/Doc 2 §19: "Penalización deja <0 ms → Clamp a 0").
// - Penalización (spec §9): descuenta `errorTimePenaltyPct` del tiempo RESTANTE actual.
// - Fases (Doc 2 §10): normal → warning (último 30 %) → critical (últimos 5 s).
// - `timeLimitMs: null` = sin presión temporal (tutorial): expired siempre false, remaining null.

const DEFAULT_NOW = () => (typeof performance !== 'undefined' && typeof performance.now === 'function'
  ? performance.now()
  : Date.now());

export function createBombTimer({
  timeLimitMs = null,
  now = DEFAULT_NOW,
  warningRemainingPct = 0.30,
  criticalRemainingMs = 5000,
} = {}) {
  let anchorMs = null;      // ahora (ms del reloj) en que arrancó la ventana
  let baseElapsedMs = 0;   // transcurrido congelado (si la ventana aún no arrancó)
  let removedMs = 0;       // suma de penalizaciones aplicadas
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

    /** ms transcurridos desde el start (monotónico, clamp >= 0). */
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
      return Math.max(0, timeLimitMs - elapsed - removedMs);
    },

    /**
     * Aplica la penalización de error: descuenta `pct` del tiempo restante actual.
     * Devuelve los ms removidos (>= 0). Con pct=1 el restante queda a 0 (clamp).
     */
    applyPenalty(pct) {
      if (timeLimitMs === null) return 0;
      const p = Math.min(1, Math.max(0, pct));
      const remaining = timer.remainingMs();
      if (remaining === null) return 0;
      const removed = Math.max(0, remaining * p);
      removedMs += removed;
      return removed;
    },

    /** true si el tiempo restante llegó a 0 (incluye clamp por penalización). */
    isExpired() {
      if (timeLimitMs === null) return false;
      return timer.remainingMs() <= 0;
    },

    /** Fase visual/lógica: 'normal' | 'warning' | 'critical'. */
    phase() {
      if (timeLimitMs === null) return 'normal';
      const remaining = timer.remainingMs();
      if (remaining === null) return 'normal';
      if (remaining <= 0) return 'critical';
      if (remaining <= criticalRemainingMs) return 'critical';
      if (remaining <= timeLimitMs * warningRemainingPct) return 'warning';
      return 'normal';
    },

    /** Fracción restante [0..1] (para UI/audio, spec §10.1). */
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
