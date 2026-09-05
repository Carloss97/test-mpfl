import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  currentTime,
  getHiddenMs,
  handleVisibility,
  markHidden,
  markVisible,
  now,
  resetClockForTest,
} from './gameClock.js';

/**
 * G.5 — pérdida de foco/pestaña. The master game clock must exclude time spent
 * with the tab hidden from every `now()`/elapsed read, so reaction times and
 * aggregate `timeMs` stay honest without inventing a trial-invalidation event.
 *
 * Tests stub `performance.now()` so the hidden-gap behavior is deterministic.
 */
describe('gameClock (focus-aware)', () => {
  let wall = 1000;

  beforeEach(() => {
    resetClockForTest();
    wall = 1000;
    vi.stubGlobal('performance', { now: () => wall });
    vi.stubGlobal('Date', { now: () => wall });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const advance = (ms) => { wall += ms; };

  it('delegates to the wall clock by default (performance.now or Date.now)', () => {
    expect(now()).toBe(1000);
    currentTime(); // no throw
  });

  it('pauses while hidden: now() stays flat while hidden and resumes on return', () => {
    markHidden();                 // hidden at wall=1000
    advance(5000);                // 5s pass in the background tab
    expect(now()).toBeCloseTo(1000, 3); // clock is paused, not advanced
    markVisible();                // return: folds the 5s into hiddenMs
    advance(500);
    // now() reflects visible elapsed since return, excluding the 5s gap
    expect(now()).toBeCloseTo(1500, 3);
    // raw wall advanced 5500, but game clock advanced only 500
    expect(getHiddenMs()).toBeCloseTo(5000, 3);
  });

  it('accumulates hidden duration across multiple toggles with no double-count', () => {
    markHidden();
    advance(2000);
    markVisible();
    expect(getHiddenMs()).toBeCloseTo(2000, 3);

    advance(300); // visible time not hidden
    expect(getHiddenMs()).toBeCloseTo(2000, 3);

    markHidden();
    advance(1000);
    markVisible();
    expect(getHiddenMs()).toBeCloseTo(3000, 3);
  });

  it('handleVisibility routes to markHidden/markVisible by flag', () => {
    handleVisibility({ hidden: true });
    advance(900);
    expect(now()).toBeCloseTo(1000, 3);
    handleVisibility({ hidden: false });
    advance(100);
    expect(now()).toBeCloseTo(1100, 3);
  });

  it('elapsed deltas measure only visible time', () => {
    const t0 = now(); // 1000
    advance(1000);    // visible 1s
    markHidden();
    advance(9000);    // hidden 9s
    markVisible();
    advance(2000);    // visible 2s
    const elapsed = now() - t0;
    // 1s + 2s visible = 3000, excluding the 9s hidden gap
    expect(elapsed).toBeCloseTo(3000, 3);
    expect(elapsed).toBeLessThan(12000);
  });

  it('markVisible with no pending hidden period is a safe no-op', () => {
    markVisible();
    markVisible();
    expect(getHiddenMs()).toBe(0);
    expect(now()).toBe(1000);
  });
});