import { describe, it, expect } from 'vitest';
import { createControlRoomTimer } from './controlRoomTimer.js';

function fakeClock() {
  let t = 0;
  return { now: () => t, advance: (ms) => { t += ms; }, set: (ms) => { t = ms; } };
}

describe('controlRoomTimer (EXP-COMM-001 C1)', () => {
  it('sin límite (bloques 1-5 / práctica): expired siempre false, remaining null, phase normal', () => {
    const c = fakeClock();
    const t = createControlRoomTimer({ timeLimitMs: null, now: c.now });
    t.start();
    c.advance(999999);
    expect(t.isRunning()).toBe(false);
    expect(t.remainingMs()).toBeNull();
    expect(t.isExpired()).toBe(false);
    expect(t.phase()).toBe('normal');
    expect(t.elapsedMs()).toBeNull();
  });

  it('con límite (B6 45s): elapsed crece, remaining clamp >= 0, expired a 0', () => {
    const c = fakeClock();
    const t = createControlRoomTimer({ timeLimitMs: 45000, now: c.now });
    t.start();
    expect(t.isRunning()).toBe(true);
    c.advance(10000);
    expect(t.elapsedMs()).toBe(10000);
    expect(t.remainingMs()).toBe(35000);
    expect(t.isExpired()).toBe(false);
    c.advance(40000); // total 50000 > 45000
    expect(t.remainingMs()).toBe(0); // clamp
    expect(t.isExpired()).toBe(true);
  });

  it('monotónico: un retroceso del reloj no hace retroceder el transcurrido', () => {
    const c = fakeClock();
    const t = createControlRoomTimer({ timeLimitMs: 45000, now: c.now });
    t.start();
    c.set(10000);
    expect(t.elapsedMs()).toBe(10000);
    c.set(5000); // retroceso
    expect(t.elapsedMs()).toBe(10000); // clamp (no retrocede)
    c.set(20000);
    expect(t.elapsedMs()).toBe(20000);
  });

  it('fases: normal → warning (<25%) → critical (últimos 10s) → critical (agotado)', () => {
    const c = fakeClock();
    const t = createControlRoomTimer({ timeLimitMs: 45000, now: c.now, warningRemainingPct: 0.25, criticalRemainingMs: 10000 });
    t.start();
    expect(t.phase()).toBe('normal'); // remaining 45000
    c.set(30000); expect(t.phase()).toBe('normal'); // remaining 15000
    c.set(34000); expect(t.phase()).toBe('warning'); // remaining 11000 (banda warning: >10000 y <11250)
    c.set(40000); expect(t.phase()).toBe('critical'); // remaining 5000 (<10000)
    c.set(45000); expect(t.phase()).toBe('critical'); // remaining 0
  });

  it('remainingFraction en [0..1]', () => {
    const c = fakeClock();
    const t = createControlRoomTimer({ timeLimitMs: 10000, now: c.now });
    t.start();
    expect(t.remainingFraction()).toBeCloseTo(1, 5);
    c.set(5000);
    expect(t.remainingFraction()).toBeCloseTo(0.5, 5);
    c.set(20000);
    expect(t.remainingFraction()).toBe(0);
  });

  it('sin penalización (spec §12.3): no expone applyPenalty', () => {
    const c = fakeClock();
    const t = createControlRoomTimer({ timeLimitMs: 45000, now: c.now });
    expect(t.applyPenalty).toBeUndefined();
  });

  it('stop() congela el transcurrido', () => {
    const c = fakeClock();
    const t = createControlRoomTimer({ timeLimitMs: 45000, now: c.now });
    t.start();
    c.set(20000);
    t.stop();
    c.set(40000);
    expect(t.elapsedMs()).toBe(20000);
    expect(t.isRunning()).toBe(false);
  });
});
