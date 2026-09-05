// Privacy-safe, asset-free game sound effects (W2 — engagement layer).
//
// Defaults OFF. Preference persists in localStorage under SFX_STORAGE_KEY.
// WebAudio oscillators only (no audio files, no network). All play() calls
// are triggered from user gestures, so autoplay policy is respected.
// jsdom-safe: without AudioContext, play() is a no-op returning false.
// Telemetry-neutral: this module never emits game events.

export const SFX_STORAGE_KEY = '***';

export const GAME_SFX_DEFS = Object.freeze({
  select: Object.freeze({ type: 'beep', freq: 540, durationMs: 50, gain: 0.04 }),
  place: Object.freeze({ type: 'beep', freq: 660, durationMs: 70, gain: 0.05 }),
  move: Object.freeze({ type: 'beep', freq: 330, durationMs: 40, gain: 0.03 }),
  denied: Object.freeze({ type: 'beep', freq: 170, durationMs: 70, gain: 0.05 }),
  success: Object.freeze({ type: 'arpeggio', freqs: [523.25, 659.25, 783.99], stepMs: 90, durationMs: 80, gain: 0.05 }),
  cashout: Object.freeze({ type: 'arpeggio', freqs: [659.25, 880], stepMs: 80, durationMs: 90, gain: 0.05 }),
  deliver: Object.freeze({ type: 'arpeggio', freqs: [880, 1174.66], stepMs: 70, durationMs: 90, gain: 0.05 }),
  complete: Object.freeze({ type: 'arpeggio', freqs: [523.25, 659.25, 783.99, 1046.5], stepMs: 100, durationMs: 90, gain: 0.05 }),
  pop: Object.freeze({ type: 'slide', freqFrom: 200, freqTo: 55, durationMs: 320, gain: 0.09 }),
});

export function isSfxName(name) {
  return Object.prototype.hasOwnProperty.call(GAME_SFX_DEFS, name);
}

function tone(context, def, freq, startAt, durationSeconds) {
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(freq, startAt);
  gainNode.gain.setValueAtTime(def.gain, startAt);
  gainNode.gain.linearRampToValueAtTime(0.0001, startAt + durationSeconds);
  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + durationSeconds + 0.02);
}

function slideTone(context, def, startAt) {
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  oscillator.type = 'sawtooth';
  const durationSeconds = def.durationMs / 1000;
  oscillator.frequency.setValueAtTime(def.freqFrom, startAt);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, def.freqTo), startAt + durationSeconds);
  gainNode.gain.setValueAtTime(def.gain, startAt);
  gainNode.gain.linearRampToValueAtTime(0.0001, startAt + durationSeconds);
  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + durationSeconds + 0.02);
}

export function createGameSfx({ storage = null, getStorage = null, audioContextCtor = null } = {}) {
  let context = null;
  const resolveStorage = () => (getStorage ? getStorage() : storage);

  const readEnabled = () => {
    const current = resolveStorage();
    if (!current) return false;
    try {
      return current.getItem(SFX_STORAGE_KEY) === 'on';
    } catch {
      return false;
    }
  };

  const writeEnabled = (value) => {
    const current = resolveStorage();
    if (!current) return;
    try {
      if (value) current.setItem(SFX_STORAGE_KEY, 'on');
      else current.removeItem(SFX_STORAGE_KEY);
    } catch {
      /* storage unavailable: preference stays in memory */
    }
  };

  const getContext = () => {
    if (!audioContextCtor) return null;
    if (!context) {
      try {
        context = new audioContextCtor();
      } catch {
        return null;
      }
    }
    return context;
  };

  const play = (name) => {
    if (!readEnabled() || !isSfxName(name)) return false;
    const audio = getContext();
    if (!audio) return false;
    try {
      if (audio.state === 'suspended' && typeof audio.resume === 'function') {
        audio.resume();
      }
      const def = GAME_SFX_DEFS[name];
      const startAt = audio.currentTime || 0;
      if (def.type === 'beep') {
        tone(audio, def, def.freq, startAt, def.durationMs / 1000);
      } else if (def.type === 'arpeggio') {
        def.freqs.forEach((freq, index) => {
          tone(audio, def, freq, startAt + (index * def.stepMs) / 1000, def.durationMs / 1000);
        });
      } else if (def.type === 'slide') {
        slideTone(audio, def, startAt);
      }
      return true;
    } catch {
      return false;
    }
  };

  const setEnabled = (value) => {
    writeEnabled(Boolean(value));
  };

  const dispose = () => {
    if (context && typeof context.close === 'function') {
      try {
        context.close();
      } catch {
        /* already closed */
      }
    }
    context = null;
  };

  return { isEnabled: readEnabled, setEnabled, play, dispose };
}

const hasWindow = typeof window !== 'undefined';

export const gameSfx = hasWindow
  ? createGameSfx({
    getStorage: () => window.localStorage ?? null,
    audioContextCtor: window.AudioContext || window.webkitAudioContext || null,
  })
  : createGameSfx({});

export const playSfx = (name) => gameSfx.play(name);
export const getGameSfxEnabled = () => gameSfx.isEnabled();
export const setGameSfxEnabled = (value) => gameSfx.setEnabled(value);
