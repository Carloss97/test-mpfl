import React from 'react';

/**
 * Visual progress pips for the original assessment games (G.3).
 *
 * Purely decorative: aria-hidden, because the adjacent text chip
 * (e.g. "Nivel 1 de 3") already conveys the state to screen readers.
 *
 * @param {number} step  Count of fully completed steps before the current one (0-based current index).
 * @param {number} total Total steps (levels/rounds/circuits/scenarios).
 * @param {Array<string|null>} [states] Optional per-completed-step result state, e.g. 'pop' marks a lost balloon round red.
 * @param {string} [className] Optional modifier for theme scoping.
 */
export default function GamePips({ step = 0, total = 0, states = null, className = '' }) {
  const safeTotal = Math.max(0, Math.floor(Number(total) || 0));
  const safeStep = Math.max(0, Math.floor(Number(step) || 0));
  const dots = Array.from({ length: safeTotal }, (_, index) => {
    const classes = ['game-pips__dot'];
    const resultState = Array.isArray(states) ? states[index] : null;
    if (index < safeStep) {
      if (resultState === 'pop') {
        classes.push('game-pips__dot--popped');
      } else {
        classes.push('game-pips__dot--done');
      }
    } else if (index === safeStep) {
      classes.push('game-pips__dot--current');
    }
    return <i key={index} data-testid="game-pip" className={classes.join(' ')} />;
  });
  return (
    <span className={`game-pips ${className}`.trim()} aria-hidden="true" data-testid="game-pips">
      {dots}
    </span>
  );
}
