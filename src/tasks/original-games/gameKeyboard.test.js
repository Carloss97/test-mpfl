import { describe, expect, it } from 'vitest';
import {
  balloonKeyAction,
  GAME_KEYBOARD,
  keyDirection,
  laserKeyAction,
  moveGridFocus,
  passengerKeyAction,
  teamKeyAction,
} from './gameKeyboard.js';

describe('gameKeyboard (G.5 / G1-P01)', () => {
  it('exposes locale keyboard hint strings for every original game', () => {
    expect(GAME_KEYBOARD.laser.hintEs).toMatch(/Teclado:/);
    expect(GAME_KEYBOARD.laser.hintEn).toMatch(/Keyboard:/);
    for (const game of ['balloon', 'passenger', 'team']) {
      expect(GAME_KEYBOARD[game].hintEs).toBeTruthy();
      expect(GAME_KEYBOARD[game].hintEn).toBeTruthy();
    }
  });

  it('keyDirection resolves arrow keys, ignores others', () => {
    expect(keyDirection('ArrowUp')).toBe('up');
    expect(keyDirection('ArrowDown')).toBe('down');
    expect(keyDirection('ArrowLeft')).toBe('left');
    expect(keyDirection('ArrowRight')).toBe('right');
    expect(keyDirection('Enter')).toBeNull();
    expect(keyDirection(' ')).toBeNull();
  });

  it('moveGridFocus moves within a row and clamps at grid borders', () => {
    const TOTAL = 64; // 8x8
    // index 12 -> row 1 col 4
    expect(moveGridFocus(12, 8, 'right', TOTAL)).toBe(13);
    expect(moveGridFocus(12, 8, 'left', TOTAL)).toBe(11);
    expect(moveGridFocus(12, 8, 'up', TOTAL)).toBe(4);
    expect(moveGridFocus(12, 8, 'down', TOTAL)).toBe(20);
    // left edge clamps (no wrap)
    expect(moveGridFocus(8, 8, 'left', TOTAL)).toBe(8);
    // right edge clamps
    expect(moveGridFocus(15, 8, 'right', TOTAL)).toBe(15);
    // top/bottom clamp (no wrap, no negative)
    expect(moveGridFocus(2, 8, 'up', TOTAL)).toBe(2);
    expect(moveGridFocus(62, 8, 'down', TOTAL)).toBe(62);
  });

  it('balloon: up/space pump, down secure', () => {
    expect(balloonKeyAction('ArrowUp')).toBe('pump');
    expect(balloonKeyAction(' ')).toBe('pump');
    expect(balloonKeyAction('+')).toBe('pump');
    expect(balloonKeyAction('ArrowDown')).toBe('secure');
    expect(balloonKeyAction('s')).toBe('secure');
    expect(balloonKeyAction('x')).toBeNull();
  });

  it('passenger: arrows move by direction, R replans', () => {
    expect(passengerKeyAction('ArrowRight')).toEqual({ action: 'move', direction: 'right' });
    expect(passengerKeyAction('ArrowUp')).toEqual({ action: 'move', direction: 'up' });
    expect(passengerKeyAction('r')).toEqual({ action: 'replan' });
    expect(passengerKeyAction('R')).toEqual({ action: 'replan' });
    expect(passengerKeyAction(' ')).toBeNull();
  });

  it('team: number and letter keys choose an option; enter advances', () => {
    expect(teamKeyAction('1', 4)).toEqual({ action: 'choose', optionIndex: 0 });
    expect(teamKeyAction('3', 4)).toEqual({ action: 'choose', optionIndex: 2 });
    expect(teamKeyAction('B', 3)).toEqual({ action: 'choose', optionIndex: 1 });
    expect(teamKeyAction('4', 4)).toEqual({ action: 'choose', optionIndex: 3 });
    expect(teamKeyAction('Enter', 4)).toEqual({ action: 'advance' });
    // out of range
    expect(teamKeyAction('5', 4)).toBeNull();
    expect(teamKeyAction('E', 4)).toBeNull();
  });

  it('laser: arrows focus, enter/space activate, r reset, c check', () => {
    expect(laserKeyAction('ArrowRight')).toEqual({ action: 'focus', direction: 'right' });
    expect(laserKeyAction('Enter')).toEqual({ action: 'activate' });
    expect(laserKeyAction(' ')).toEqual({ action: 'activate' });
    expect(laserKeyAction('r')).toEqual({ action: 'reset' });
    expect(laserKeyAction('c')).toEqual({ action: 'check' });
    expect(laserKeyAction('x')).toBeNull();
  });
});