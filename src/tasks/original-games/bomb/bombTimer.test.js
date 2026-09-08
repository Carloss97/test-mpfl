import { describe, it, expect } from 'vitest';
import { createBombTimer } from './bombTimer.js';

// B1 EXP-7 BOMB — Timer Service: monotónico, clamp 0, penalización 30%,
// fases normal/warning/critical (spec Doc 1 §6/§9/§15, Doc 2 §10/§19).
// Reloj falso inyectado (riesgo #2 del plan: determinismo en headless).

function makeClock(start = 0) {
  let t = start;
  return {
    now: () => t,
    advance: (ms) => { t += ms; },
    jumpBack: (ms) => { t = Math.max(0, t - ms); },
    value: () => t,
  };
}

describe('bombTimer — tiempo base', () => {
  it('arranca detenido y cuenta el transcurrido desde start (monotónico)', () => {
    const clock = makeClock();
    const timer = createBombTimer({ timeLimitMs: 10000, now: clock.now });
    expect(timer.isRunning()).toBe(false);
    timer.start();
    expect(timer.elapsedMs()).toBe(0);
    clock.advance(2500);
    expect(timer.elapsedMs()).toBe(2500);
    expect(timer.remainingMs()).toBe(7500);
    expect(timer.isExpired()).toBe(false);
  });

  it('nunca retrocede aunque el reloj lo haga (monotonicidad, spec §15)', () => {
    const clock = makeClock(1000);
    const timer = createBombTimer({ timeLimitMs: 10000, now: clock.now });
    timer.start();
    clock.advance(3000);
    const elapsedBefore = timer.elapsedMs();
    clock.jumpBack(2000); // salto hacia atrás del reloj (edge headless)
    expect(timer.elapsedMs()).toBe(elapsedBefore); // congelado, no retrocede
  });

  it('clamp 0: remainingMs nunca es negativa', () => {
    const clock = makeClock();
    const timer = createBombTimer({ timeLimitMs: 1000, now: clock.now });
    timer.start();
    clock.advance(5000);
    expect(timer.remainingMs()).toBe(0);
    expect(timer.isExpired()).toBe(true);
  });

  it('sin presión temporal (tutorial): expired siempre false, remaining null', () => {
    const clock = makeClock();
    const timer = createBombTimer({ timeLimitMs: null, now: clock.now });
    timer.start();
    clock.advance(999999);
    expect(timer.isExpired()).toBe(false);
    expect(timer.remainingMs()).toBeNull();
    expect(timer.phase()).toBe('normal');
  });

  it('stop congela el transcurrido', () => {
    const clock = makeClock();
    const timer = createBombTimer({ timeLimitMs: 10000, now: clock.now });
    timer.start();
    clock.advance(1000);
    timer.stop();
    const frozen = timer.elapsedMs();
    clock.advance(5000);
    expect(timer.elapsedMs()).toBe(frozen);
    expect(timer.isRunning()).toBe(false);
  });
});

describe('bombTimer — penalización (spec §9: 30% del tiempo RESTANTE)', () => {
  it('descuenta 30% del tiempo restante en el momento del error', () => {
    const clock = makeClock();
    const timer = createBombTimer({ timeLimitMs: 10000, now: clock.now });
    timer.start();
    clock.advance(5000); // restante: 5000
    const removed = timer.applyPenalty(0.3);
    expect(removed).toBe(1500);
    expect(timer.remainingMs()).toBe(3500);
  });

  it('la penalización es acumulativa sobre el restante actual', () => {
    const clock = makeClock();
    const timer = createBombTimer({ timeLimitMs: 10000, now: clock.now });
    timer.start();
    clock.advance(5000); // restante 5000
    timer.applyPenalty(0.3); // restante 3500
    clock.advance(1000); // restante 2500
    timer.applyPenalty(0.3); // restante 1750
    expect(timer.remainingMs()).toBeCloseTo(1750, 3);
  });

  it('clamp a 0 con penalización máxima (pct=1) — Doc 2 §19 "Penalización deja <0 ms"', () => {
    const clock = makeClock();
    const timer = createBombTimer({ timeLimitMs: 10000, now: clock.now });
    timer.start();
    clock.advance(9900); // restante 100
    const removed = timer.applyPenalty(1.0);
    expect(removed).toBe(100);
    expect(timer.remainingMs()).toBe(0);
    expect(timer.isExpired()).toBe(true);
  });

  it('pct fuera de [0,1] se clampa (defensa de configuración)', () => {
    const clock = makeClock();
    const timer = createBombTimer({ timeLimitMs: 10000, now: clock.now });
    timer.start();
    clock.advance(5000);
    expect(timer.applyPenalty(-0.5)).toBe(0);
    expect(timer.remainingMs()).toBe(5000);
    expect(timer.applyPenalty(2)).toBe(5000); // clampa a pct 1
    expect(timer.remainingMs()).toBe(0);
  });

  it('sin límite (tutorial) la penalización es no-op', () => {
    const clock = makeClock();
    const timer = createBombTimer({ timeLimitMs: null, now: clock.now });
    timer.start();
    expect(timer.applyPenalty(0.3)).toBe(0);
  });
});

describe('bombTimer — fases visual/lógicas (Doc 2 §10)', () => {
  it('normal → warning (último 30%) → critical (últimos 5 s)', () => {
    const clock = makeClock();
    const timer = createBombTimer({
      timeLimitMs: 20000, now: clock.now,
      warningRemainingPct: 0.3, criticalRemainingMs: 5000,
    });
    timer.start();
    expect(timer.phase()).toBe('normal');
    clock.advance(14000); // restante 6000 = 30% del límite
    expect(timer.phase()).toBe('warning');
    clock.advance(1500); // restante 4500 < 5000
    expect(timer.phase()).toBe('critical');
    clock.advance(5000); // agotado
    expect(timer.phase()).toBe('critical');
  });

  it('critical manda aunque queden >5 s con límite corto (L4: 10 s)', () => {
    const clock = makeClock();
    const timer = createBombTimer({
      timeLimitMs: 10000, now: clock.now,
      warningRemainingPct: 0.3, criticalRemainingMs: 5000,
    });
    timer.start();
    clock.advance(5200); // restante 4800
    expect(timer.phase()).toBe('critical');
  });

  it('exposición de fracción restante para audio/visuales (spec §10.1)', () => {
    const clock = makeClock();
    const timer = createBombTimer({ timeLimitMs: 10000, now: clock.now });
    timer.start();
    clock.advance(7500);
    expect(timer.remainingFraction()).toBeCloseTo(0.25, 6);
  });
});
