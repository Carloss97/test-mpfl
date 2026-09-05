import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  GAME_SFX_DEFS,
  SFX_STORAGE_KEY,
  createGameSfx,
  getGameSfxEnabled,
  isSfxName,
  playSfx,
  setGameSfxEnabled,
} from './originalGameSfx.js';

function createMockStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => { map.set(key, String(value)); },
    removeItem: (key) => { map.delete(key); },
  };
}

function createFakeAudioContext() {
  const oscillators = [];
  return {
    currentTime: 0,
    state: 'running',
    destination: {},
    resume: () => undefined,
    close: () => undefined,
    createOscillator: () => {
      const oscillator = {
        type: 'sine',
        frequency: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };
      oscillators.push(oscillator);
      return oscillator;
    },
    createGain: () => ({
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    }),
    oscillators,
  };
}

describe('originalGameSfx (W2 engagement layer, default OFF)', () => {
  afterEach(() => {
    window.localStorage?.clear?.();
    vi.unstubAllGlobals();
  });

  it('defines a finite, bounded sound catalog', () => {
    expect(Object.keys(GAME_SFX_DEFS).length).toBeGreaterThanOrEqual(8);
    for (const [name, def] of Object.entries(GAME_SFX_DEFS)) {
      expect(isSfxName(name)).toBe(true);
      if (def.type === 'beep') {
        expect(Number.isFinite(def.freq)).toBe(true);
        expect(def.freq).toBeGreaterThan(0);
        expect(def.durationMs).toBeGreaterThan(0);
        expect(def.durationMs).toBeLessThanOrEqual(500);
        expect(def.gain).toBeGreaterThan(0);
        expect(def.gain).toBeLessThan(0.2);
      } else if (def.type === 'arpeggio') {
        expect(Array.isArray(def.freqs)).toBe(true);
        expect(def.freqs.length).toBeGreaterThanOrEqual(2);
        def.freqs.forEach((freq) => {
          expect(Number.isFinite(freq)).toBe(true);
          expect(freq).toBeGreaterThan(0);
        });
        expect(def.durationMs).toBeLessThanOrEqual(500);
      } else if (def.type === 'slide') {
        expect(Number.isFinite(def.freqFrom)).toBe(true);
        expect(Number.isFinite(def.freqTo)).toBe(true);
        expect(def.freqFrom).toBeGreaterThan(def.freqTo);
        expect(def.durationMs).toBeLessThanOrEqual(500);
      } else {
        throw new Error(`unexpected sfx type: ${def.type}`);
      }
    }
  });

  it('is disabled by default and rejects play without storage', () => {
    const sfx = createGameSfx({});
    expect(sfx.isEnabled()).toBe(false);
    expect(sfx.play('select')).toBe(false);
  });

  it('setEnabled persists the preference under the documented key', () => {
    const storage = createMockStorage();
    const sfx = createGameSfx({ storage });
    expect(sfx.isEnabled()).toBe(false);
    sfx.setEnabled(true);
    expect(storage.getItem(SFX_STORAGE_KEY)).toBe('on');
    expect(sfx.isEnabled()).toBe(true);
    sfx.setEnabled(false);
    expect(storage.getItem(SFX_STORAGE_KEY)).toBeNull();
    expect(sfx.isEnabled()).toBe(false);
  });

  it('rejects unknown names without throwing', () => {
    const storage = createMockStorage();
    storage.setItem(SFX_STORAGE_KEY, 'on');
    const sfx = createGameSfx({ storage, audioContextCtor: createFakeAudioContext });
    expect(() => sfx.play('not-a-sound')).not.toThrow();
    expect(sfx.play('not-a-sound')).toBe(false);
  });

  it('plays the expected oscillator count per definition when enabled', () => {
    const storage = createMockStorage();
    storage.setItem(SFX_STORAGE_KEY, 'on');
    const ctor = createFakeAudioContext();
    function FakeAudioContext() { return ctor; }
    const sfx = createGameSfx({ storage, audioContextCtor: FakeAudioContext });
    expect(sfx.play('select')).toBe(true);
    expect(ctor.oscillators).toHaveLength(1);
    expect(sfx.play('success')).toBe(true);
    expect(ctor.oscillators).toHaveLength(4);
    expect(sfx.play('pop')).toBe(true);
    expect(ctor.oscillators).toHaveLength(5);
    expect(ctor.oscillators.at(-1).frequency.exponentialRampToValueAtTime).toHaveBeenCalled();
  });

  it('is a safe no-op when AudioContext is unavailable (jsdom)', () => {
    const storage = createMockStorage();
    storage.setItem(SFX_STORAGE_KEY, 'on');
    const sfx = createGameSfx({ storage, audioContextCtor: null });
    expect(() => sfx.play('select')).not.toThrow();
    expect(sfx.play('select')).toBe(false);
  });

  it('app-level singleton is off by default and toggleable without throwing', () => {
    const storage = createMockStorage();
    vi.stubGlobal('localStorage', storage);
    expect(getGameSfxEnabled()).toBe(false);
    expect(() => playSfx('select')).not.toThrow();
    setGameSfxEnabled(true);
    expect(getGameSfxEnabled()).toBe(true);
    expect(playSfx('select')).toBe(false); // jsdom has no AudioContext
    setGameSfxEnabled(false);
    expect(getGameSfxEnabled()).toBe(false);
  });
});
