/**
 * gameKeyboard.js — G.5 / G1-P01 keyboard shortcuts for the original battery games.
 *
 * Pure helpers (no DOM) so the shortcut→action mapping is unit-testable; the
 * components wire them into a single `onKeyDown` on the game root. The games keep
 * native <button> keyboard activation (Tab + Enter/Space) for every control; these
 * helpers add grid movement and friendly shortcuts on top.
 */

const ARROW_KEYS = Object.freeze({ ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' });

export const GAME_KEYBOARD = Object.freeze({
  laser: {
    hintEs: 'Teclado: ← ↑ → ↓ mover foco · Enter/Espacio mover pieza · R reiniciar · C comprobar ruta',
    hintEn: 'Keyboard: ← ↑ → ↓ move focus · Enter/Space move piece · R reset · C check route',
  },
  balloon: {
    hintEs: 'o teclado: ↑/Espacio inflar · ↓ asegurar',
    hintEn: 'or keyboard: ↑/Space inflate · ↓ secure',
  },
  passenger: {
    hintEs: 'Teclado: ← ↑ → ↓ mover vehículo · R registrar replanteo',
    hintEn: 'Keyboard: ← ↑ → ↓ move vehicle · R register replan',
  },
  team: {
    hintEs: 'Teclado: 1–4 o A–D elegir opción · Enter/Espacio continuar',
    hintEn: 'Keyboard: 1–4 or A–D choose option · Enter/Space continue',
  },
  tangram: {
    hintEs: 'Teclado: 1–9 seleccionar pieza · Espacio/R rotar · Enter encajar · Q devolver a bandeja',
    hintEn: 'Keyboard: 1–9 select piece · Space/R rotate · Enter snap · Q return to tray',
  },
});

/**
 * Tangram shortcuts: 1..9 select a tray piece, Space/R rotate active piece 45deg,
 * Enter attempts the snap on the current target slot, Q returns the active piece.
 */
export function tangramKeyAction(key, trayCount = 0) {
  const n = /^[1-9]$/.test(key) ? Number(key) : null;
  if (n !== null && n >= 1 && n <= trayCount) return { action: 'select', index: n - 1 };
  if (key === ' ' || key === 'r' || key === 'R') return { action: 'rotate' };
  if (key === 'Enter') return { action: 'snap' };
  if (key === 'q' || key === 'Q') return { action: 'return' };
  return null;
}

/**
 * Move a 1D grid focus index in a direction given column count. Pure and
 * clamp-safe (no wrap, no out-of-bounds). `total` = number of cells so the
 * bottom row is clamped too. Returns a valid index in [0, total-1].
 */
export function moveGridFocus(currentIndex, cols, direction, total = Infinity) {
  if (!Number.isFinite(currentIndex) || currentIndex < 0) return 0;
  const col = currentIndex % cols;
  const row = Math.floor(currentIndex / cols);
  let next = currentIndex;
  if (direction === 'up') next = col + (row - 1) * cols;
  else if (direction === 'down') next = col + (row + 1) * cols;
  else if (direction === 'left') next = (col > 0 ? currentIndex - 1 : currentIndex);
  else if (direction === 'right') next = (col < cols - 1 ? currentIndex + 1 : currentIndex);
  if (!Number.isFinite(total)) total = Infinity;
  const last = total - 1;
  if (next < 0) return currentIndex;
  if (next > last) return currentIndex;
  return next;
}

/**
 * Resolve a keyboard event to a directional move ('up'|'down'|'left'|'right')
 * or null when not an arrow key.
 */
export function keyDirection(key) {
  return ARROW_KEYS[key] ?? null;
}

/**
 * Balloon shortcuts: arrow/space/D-pad-ish keys map to pump or secure/inflate.
 */
export function balloonKeyAction(key) {
  if (key === 'ArrowUp' || key === ' ' || key === 'Spacebar' || key === '+') return 'pump';
  if (key === 'ArrowDown' || key === 's' || key === 'S' || key === '-') return 'secure';
  return null;
}

/**
 * Passenger shortcuts: arrows move the vehicle, R replans.
 */
export function passengerKeyAction(key) {
  const dir = keyDirection(key);
  if (dir) return { action: 'move', direction: dir };
  if (key === 'r' || key === 'R') return { action: 'replan' };
  return null;
}

/**
 * Team shortcuts: number row 1..N or A..D select an option; Enter/Space advances.
 * Returns { action: 'choose', optionIndex } | { action: 'advance' } | null.
 */
export function teamKeyAction(key, optionCount) {
  if (key === 'Enter' || key === ' ') return { action: 'advance' };
  const n = /^[1-9]$/.test(key) ? Number(key) : null;
  if (n !== null && n >= 1 && n <= optionCount) return { action: 'choose', optionIndex: n - 1 };
  if (/^[a-dA-D]$/.test(key)) {
    const letterIndex = key.toUpperCase().charCodeAt(0) - 65;
    if (letterIndex >= 0 && letterIndex < optionCount) return { action: 'choose', optionIndex: letterIndex };
  }
  return null;
}

/**
 * Laser shortcuts: arrows move focus, Enter/Space activate, R reset, C check.
 */
export function laserKeyAction(key) {
  if (key === 'Enter' || key === ' ') return { action: 'activate' };
  const dir = keyDirection(key);
  if (dir) return { action: 'focus', direction: dir };
  if (key === 'r' || key === 'R') return { action: 'reset' };
  if (key === 'c' || key === 'C') return { action: 'check' };
  return null;
}