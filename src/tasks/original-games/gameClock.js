/**
 * gameClock.js — KRUMM original-battery focus-aware clock (G.5 / pérdida de foco).
 *
 * When the browser tab loses focus (visibilitychange hidden, window blur), the
 * trial's master clock is "paused": elapsed time while hidden is accumulated and
 * excluded from every `now()` read afterwards. This keeps reaction times and
 * aggregate `timeMs` honest when a postulante switches tabs mid-trial, without
 * inventing a trial-invalidation telemetry event (T.4/T.5 defined no such event).
 *
 * It is a module singleton because only ONE original-battery game is mounted at a
 * time in `PostulationGameStage`. All four games delegate their local `now()` here.
 */
let hiddenMs = 0;
let hiddenSince = null;

export function currentTime() {
  return globalThis.performance?.now?.() ?? Date.now();
}

/**
 * Focus-aware "now". While the tab is hidden the value stays roughly constant
 * (paused); on return, the hidden duration is folded into `hiddenMs` so all deltas
 * computed afterwards exclude that gap.
 */
export function now() {
  const raw = currentTime();
  const pending = hiddenSince !== null ? raw - hiddenSince : 0;
  return raw - hiddenMs - pending;
}

export function markHidden() {
  if (hiddenSince === null) {
    hiddenSince = currentTime();
  }
}

export function markVisible() {
  if (hiddenSince !== null) {
    hiddenMs += currentTime() - hiddenSince;
    hiddenSince = null;
  }
}

export function handleVisibility({ hidden }) {
  if (hidden) markHidden();
  else markVisible();
}

export function getHiddenMs() {
  return hiddenMs;
}

export function resetClockForTest() {
  hiddenMs = 0;
  hiddenSince = null;
}

/** Install global listeners once (safe to call multiple times). */
let installed = false;
export function installGameFocusClock() {
  if (installed || typeof window === 'undefined' || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) markHidden();
    else markVisible();
  });
  window.addEventListener('blur', () => {
    if (typeof document !== 'undefined' && document.hidden === true) markHidden();
  });
  window.addEventListener('focus', markVisible);
}