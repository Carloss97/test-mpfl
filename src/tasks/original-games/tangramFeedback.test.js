import { describe, it, expect } from 'vitest';
import {
  deriveTangramUiState,
  TANGRAM_UI_STATES,
  TANGRAM_SIGNAL_COLORS,
  getTangramCanvasSignalClass,
  getTangramHudCopy,
  getTangramOutcomeMessage,
  getTangramTransitionCopy,
  getTangramFinalCopy,
  getTangramWelcomeCopy,
} from './tangramFeedback.js';

const t = (es, en) => en;

describe('tangramFeedback — estado HUD', () => {
  it('normal cuando hay tiempo y movimientos suficientes', () => {
    expect(deriveTangramUiState({ secondsLeft: 40, movesLeft: Infinity })).toBe(TANGRAM_UI_STATES.normal);
  });

  it('critical cuando el tiempo < 5s', () => {
    expect(deriveTangramUiState({ secondsLeft: 4, movesLeft: Infinity })).toBe(TANGRAM_UI_STATES.critical);
  });

  it('warning en los últimos 10s', () => {
    expect(deriveTangramUiState({ secondsLeft: 8, movesLeft: Infinity, lastDecrement: 10 })).toBe(TANGRAM_UI_STATES.warning);
  });

  it('warning cuando queda 1 movimiento', () => {
    expect(deriveTangramUiState({ secondsLeft: 60, movesLeft: 1, allowMoves: true })).toBe(TANGRAM_UI_STATES.warning);
  });

  it('critical cuando se agotan movimientos', () => {
    expect(deriveTangramUiState({ secondsLeft: 60, movesLeft: 0, allowMoves: true })).toBe(TANGRAM_UI_STATES.critical);
  });

  it('no advierte por tiempo cuando no está permitido (moves-only)', () => {
    expect(deriveTangramUiState({ secondsLeft: 3, allowTimed: false, movesLeft: 5 })).toBe(TANGRAM_UI_STATES.normal);
  });
});

describe('tangramFeedback — señales visuales', () => {
  it('expone colores de señalética según DOCUMENTO 2', () => {
    expect(TANGRAM_SIGNAL_COLORS.normal).toBe('#2B6CB0');
    expect(TANGRAM_SIGNAL_COLORS.warning).toBe('#D69E2E');
    expect(TANGRAM_SIGNAL_COLORS.critical).toBe('#E53E3E');
  });

  it('genera clase de borde por estado', () => {
    expect(getTangramCanvasSignalClass('critical')).toBe('tangram-canvas--critical');
  });
});

describe('tangramFeedback — micro-copy HUD', () => {
  it('genera marcador de nivel y contadores', () => {
    const copy = getTangramHudCopy(t, TANGRAM_UI_STATES.normal, { secondsLeft: 22, movesLeft: 3, level: 2 });
    expect(copy.level).toContain('2');
    expect(copy.moves).toContain('3');
    expect(copy.time).toContain('22');
  });

  it('muestra movimientos ilimitados cuando corresponde', () => {
    const copy = getTangramHudCopy(t, TANGRAM_UI_STATES.normal, { secondsLeft: 20, movesLeft: Infinity, level: 1 });
    expect(copy.moves).toContain('Unlimited');
  });

  it('muestra estado crítico de tiempo', () => {
    const copy = getTangramHudCopy(t, TANGRAM_UI_STATES.critical, { secondsLeft: 3, movesLeft: Infinity, level: 3 });
    expect(copy.time.toLowerCase()).toContain('critical');
  });
});

describe('tangramFeedback — mensajes de resultado', () => {
  it('éxito', () => {
    expect(getTangramOutcomeMessage(t, 'success')).toBe('+100 Pts - Completed!');
  });
  it('movimientos agotados', () => {
    expect(getTangramOutcomeMessage(t, 'moves_exhausted')).toContain('Move limit');
  });
  it('timeout', () => {
    expect(getTangramOutcomeMessage(t, 'timeout')).toContain('Time up');
  });
});

describe('tangramFeedback — copy de flujo', () => {
  it('transición tutorial -> evaluación', () => {
    const c = getTangramTransitionCopy(t);
    expect(c.title).toBe('Tutorial Complete');
    expect(c.cta).toContain('Start Real Evaluation');
  });
  it('pantalla final', () => {
    expect(getTangramFinalCopy(t).title).toBe('Simulation Complete');
  });
  it('bienvenida con CTA de práctica', () => {
    const c = getTangramWelcomeCopy(t);
    expect(c.cta).toContain('Start Practice Tutorial');
    expect(c.title).toContain('Geometric Assembly');
  });
});