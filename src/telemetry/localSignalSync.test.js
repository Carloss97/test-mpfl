/**
 * Auditoría T.2 — Sincronización local de señales (browser).
 *
 * Tests deterministas y de regresión para cada path de desincronización conocido
 * (ver docs/research/local-signal-sync-audit.md):
 *
 *   P1 — Mezcla de relojes Date.now() vs performance.now() → ventanas vacías.
 *   P2 — Evento de juego sin timestamp → fallback now() en el momento de
 *        normalización (build-time en batch) → desalineación.
 *   P3 — Pestaña en background: rAF detenido + timers throttled → hueco de
 *        muestras (caveat, no desincronización).
 *   P4 — Latencia evento→ventana acotada por el intervalo de frames (rAF).
 *   P6 — findTrialPairs descarta silenciosamente game_event_v1 sin timestamp.
 *
 * Solo fixtures sintéticos. Sin cámara, sin datos reales, sin persistencia.
 * Relojes: inyectados (sustitución controlada de performance.now) y secuencias
 * sintéticas que replican la puerta rAF de useFaceLandmarkerWorker.js L100-125.
 */
import { afterEach, describe, expect, it } from 'vitest';

import { buildCalibrationProfile } from './microgestureFeatures.js';
import { normalizeGameEvent } from './gameTelemetry.js';
import { correlateGameWithMultimodalSignals } from './gameCorrelation.js';

// ---------------------------------------------------------------------------
// Helpers (fixtures sintéticos)
// ---------------------------------------------------------------------------

function faceSample(ts, { detectionConfidence = 0.98, lightingQuality = 0.9, facesDetected = 1 } = {}) {
  // Contrato de calidad compartido (microgestureFeatures.js L62-64 / gameCorrelation.js L35).
  return {
    timestamp: ts,
    quality: { facePresent: true, confidence: detectionConfidence, faceCount: facesDetected },
    detectionConfidence,
    lightingQuality,
    facesDetected,
  };
}

function faceStream(from, to, step) {
  const out = [];
  for (let t = from; t <= to; t += step) out.push(faceSample(t));
  return out;
}

function trialEvents(shownAt, reactionMs, { trialId = 't1', gameId = 'laser_puzzle' } = {}) {
  return [
    { type: 'game_event_v1', eventType: 'stimulus_shown', trialId, gameId, timestamp: shownAt },
    { type: 'game_event_v1', eventType: 'response', trialId, gameId, timestamp: shownAt + reactionMs },
  ];
}

const EPOCH_MS = 1_750_000_000_000; // dominio Date.now (ms desde epoch)

// Sustituye globalThis.performance.now por un reloj controlado (reloj inyectado).
// Repone el original en afterEach. gameTelemetry.now() (gameTelemetry.js L26-28)
// lee globalThis.performance?.now?.() en cada llamada → usa el reloj inyectado.
const realPerformance = globalThis.performance;
let injectedNow = null;

function withInjectedClock(initialMs, fn) {
  injectedNow = initialMs;
  globalThis.performance = {
    ...realPerformance,
    now: () => injectedNow,
  };
  return fn({ set: (t) => { injectedNow = t; }, get: () => injectedNow });
}

afterEach(() => {
  globalThis.performance = realPerformance;
  injectedNow = null;
});

// Simulación determinista de la captura rAF de useFaceLandmarkerWorker.js
// (L100-125, puerta L106: `now - lastSentRef.current >= frameIntervalMs`),
// sin cámara: cada "tick" rAF es un paso de 20 ms; en background el rAF no
// dispara (fase background omitida).
function simulateRafFaceTimestamps(phases, { fps = 10, tickMs = 20 } = {}) {
  const frameIntervalMs = 1000 / fps;
  let lastSent = 0;
  const out = [];
  for (const phase of phases) {
    if (phase.background) continue;
    for (let t = phase.from; t <= phase.to; t += tickMs) {
      if (t - lastSent >= frameIntervalMs) {
        out.push(t);
        lastSent = t;
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Baseline + P1: dominio de reloj
// ---------------------------------------------------------------------------

describe('Sincronización local de señales — auditoría T.2 (fixtures sintéticos, sin cámara)', () => {
  it('reloj único (performance.now): con el mismo dominio, las ventanas de correlación contienen las muestras faciales', () => {
    const shownAt = 1000;
    const reactionMs = 300;
    const faceSamples = faceStream(700, 1300, 100); // 700..1300, dominio página
    const result = correlateGameWithMultimodalSignals({
      gameEvents: trialEvents(shownAt, reactionMs),
      faceSamples,
    });

    expect(result.aggregate.trialCount).toBe(1);
    const trial = result.trials[0];
    // preTrial [700,1000]: 700,800,900,1000
    expect(trial.windows.preTrial.face.sampleCount).toBe(4);
    // reaction [1000,1300]: 1000,1100,1200,1300
    expect(trial.windows.reaction.face.sampleCount).toBe(4);
    // postResponse [1300,1800]: 1300
    expect(trial.windows.postResponse.face.sampleCount).toBe(1);
    // Las 4 muestras de preTrial se cuentan con cara presente (fixture sin flag de ausencia).
    expect(trial.windows.preTrial.face.facePresenceRatio).toBe(1);
    expect(trial.windows.reaction.face.facePresenceRatio).toBe(1);
  });

  it('P1: mezcla Date.now() (eventos) vs performance.now() (muestras) → ventanas vacías, no_facial_samples y calibración eligible:false', () => {
    const shownAt = EPOCH_MS + 1000; // eventos en dominio epoch
    const reactionMs = 300;
    const faceSamples = faceStream(700, 1300, 100); // muestras en dominio página

    const result = correlateGameWithMultimodalSignals({
      gameEvents: trialEvents(shownAt, reactionMs),
      faceSamples,
    });

    // El trial se crea (timestamps finitos), pero NINGUNA ventana contiene muestras.
    expect(result.aggregate.trialCount).toBe(1);
    const trial = result.trials[0];
    expect(trial.windows.preTrial.face.sampleCount).toBe(0);
    expect(trial.windows.reaction.face.sampleCount).toBe(0);
    expect(trial.windows.postResponse.face.sampleCount).toBe(0);
    expect(trial.windows.recovery.face.sampleCount).toBe(0);
    // Ventana vacía → sin AUs activos y presencia 0 (ausencia de señal, no inferencia).
    expect(trial.windows.reaction.face.topAUs).toEqual([]);
    expect(trial.windows.reaction.face.facePresenceRatio).toBe(0);

    // Misma muestra de calibración: from/to en dominio epoch → ventana vacía →
    // flags ['no_facial_samples'] y eligible: false (microgestureFeatures.js L52-77, L123).
    const calibrationEpoch = buildCalibrationProfile(faceSamples, {
      from: EPOCH_MS + 1000,
      to: EPOCH_MS + 1300,
    });
    expect(calibrationEpoch.signalQuality.flags).toContain('no_facial_samples');
    expect(calibrationEpoch.eligible).toBe(false);

    // Control: mismas muestras, from/to en dominio página → calibración elegible.
    const calibrationPage = buildCalibrationProfile(faceSamples, { from: 1000, to: 1300 });
    expect(calibrationPage.eligible).toBe(true);
    expect(calibrationPage.signalQuality.flags).not.toContain('no_facial_samples');
  });

  it('P2: evento sin timestamp → el fallback now() de normalizeGameEvent usa el reloj del build-time y desalinea la ventana', () => {
    const faceSamples = faceStream(900, 1100, 50); // 900,950,1000,1050,1100

    withInjectedClock(1000, (clock) => {
      // Evento A: timestamp explícito en el momento del estímulo (dominio página).
      const normA = normalizeGameEvent({
        eventType: 'stimulus_shown',
        trialId: 't1',
        gameId: 'laser_puzzle',
        timestamp: 1000,
      });
      // Evento B: SIN timestamp, normalizado en batch "al final del demo"
      // (postulationDemoSessionBuilder.js L97-98): ahora el reloj va en 50_000.
      clock.set(50_000);
      const normB = normalizeGameEvent({
        eventType: 'stimulus_shown',
        trialId: 't1',
        gameId: 'laser_puzzle',
      });

      expect(normA.timestamp).toBe(1000);
      expect(normB.timestamp).toBe(50_000); // fallback now() en el build-time

      const corrA = correlateGameWithMultimodalSignals({
        gameEvents: [
          normA,
          { ...normA, eventType: 'response', timestamp: 1300 },
        ],
        faceSamples,
      });
      // preTrial [700,1000] contiene 900,950,1000.
      expect(corrA.trials[0].windows.preTrial.face.sampleCount).toBe(3);

      const corrB = correlateGameWithMultimodalSignals({
        gameEvents: [
          normB,
          { ...normB, eventType: 'response', timestamp: 50_300 },
        ],
        faceSamples,
      });
      // preTrial [49_700,50_000] NO contiene ninguna muestra captada en 900..1100.
      expect(corrB.trials[0].windows.preTrial.face.sampleCount).toBe(0);
      expect(corrB.trials[0].windows.reaction.face.sampleCount).toBe(0);
    });
  });

  it('P3: pestaña en background (rAF detenido, timers throttled) → hueco de muestras con reloj monótono; la ventana del hueco queda vacía (caveat, no desincronización)', () => {
    // Fases: foreground 0..1000, background 1000..3000 (rAF no dispara),
    // foreground 3000..3400. fps 10 → frameIntervalMs 100.
    const timestamps = simulateRafFaceTimestamps([
      { from: 0, to: 1000 },
      { background: true, from: 1000, to: 3000 },
      { from: 3000, to: 3400 },
    ]);
    const faceSamples = timestamps.map((t) => faceSample(t));

    // Relojo monótono a lo largo del hueco (un solo dominio, sin retrocesos).
    for (let i = 1; i < faceSamples.length; i += 1) {
      expect(faceSamples[i].timestamp).toBeGreaterThan(faceSamples[i - 1].timestamp);
    }

    // Evento disparado por timer throttled EN background: se programó en 1200
    // pero el primer tick de 1 s disponible es 2000 → timestamp 2000 (wall clock).
    const bgEvents = trialEvents(2000, 400, { trialId: 'bg' });
    // Evento en foreground tras el retorno.
    const fgEvents = trialEvents(3200, 200, { trialId: 'fg' });

    const result = correlateGameWithMultimodalSignals({
      gameEvents: [...bgEvents, ...fgEvents],
      faceSamples,
    });

    expect(result.aggregate.trialCount).toBe(2);
    const bg = result.trials.find((t) => t.trialId === 'bg');
    const fg = result.trials.find((t) => t.trialId === 'fg');

    // El trial de background cae dentro del hueco: 0 muestras faciales → caveat.
    expect(bg.windows.preTrial.face.sampleCount).toBe(0);
    expect(bg.windows.reaction.face.sampleCount).toBe(0);
    expect(bg.windows.postResponse.face.sampleCount).toBe(0);
    expect(bg.windows.reaction.face.facePresenceRatio).toBe(0);

    // El trial de foreground (tras el retorno) recupera cobertura:
    // preTrial [2900,3200]: 3000,3100,3200 — reaction [3200,3400]: 3200,3300,3400.
    expect(fg.windows.preTrial.face.sampleCount).toBe(3);
    expect(fg.windows.reaction.face.sampleCount).toBe(3);
  });

  it('P4: latencia evento→ventana acotada: la muestra del instante físico T se estampa en el siguiente tick (≤ frameIntervalMs) y los conteos de ventana son exactos', () => {
    const I = 100; // frameIntervalMs @ fps 10
    const faceSamples = faceStream(0, 2000, I);

    // Evento en 1030 (entre ticks 1000 y 1100), RT = 300 → respuesta en 1330.
    const main = correlateGameWithMultimodalSignals({
      gameEvents: trialEvents(1030, 300, { trialId: 'm' }),
      faceSamples,
    }).trials[0];
    // La muestra que representa el instante físico 1030 se estampa en 1100
    // (latencia 70 ms ≤ I). reaction [1030,1330]: 1100,1200,1300 → 3 muestras.
    expect(main.windows.reaction.face.sampleCount).toBe(3);
    // La muestra 1400 (tick siguiente a la respuesta 1330) NO cae en reaction;
    // cae en postResponse [1330,1830]: 1400..1800 → 5 muestras.
    expect(main.windows.postResponse.face.sampleCount).toBe(5);

    // RT < I: la ventana de reacción puede (determinísticamente) contener 0.
    const short = correlateGameWithMultimodalSignals({
      gameEvents: trialEvents(1010, 50, { trialId: 's' }),
      faceSamples,
    }).trials[0];
    expect(short.windows.reaction.face.sampleCount).toBe(0);

    // RT = 150 > I: reaction [1010,1160] contiene 1100 → 1 muestra.
    const mid = correlateGameWithMultimodalSignals({
      gameEvents: trialEvents(1010, 150, { trialId: 'r' }),
      faceSamples,
    }).trials[0];
    expect(mid.windows.reaction.face.sampleCount).toBe(1);

    // Invariante: en un flujo con intervalo I, toda ventana de duración ≥ I
    // contiene al menos una muestra (cota determinista de la latencia).
    for (const [a, b] of [[1030, 1130], [1501, 1601], [0, 100], [1999, 2099]]) {
      const contained = faceSamples.filter((s) => s.timestamp >= a && s.timestamp <= b);
      if (b - a >= I) expect(contained.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('P6 (contrato implícito): findTrialPairs descarta silenciosamente game_event_v1 sin timestamp finito; con timestamp, el trial se correlaciona', () => {
    const faceSamples = faceStream(700, 1300, 100);

    // Evento ya conformado (type game_event_v1) PERO sin timestamp finito:
    // el builder lo deja pasar tal cual (postulationDemoSessionBuilder.js L97-98)
    // y findTrialPairs (gameCorrelation.js L115) lo descarta sin aviso.
    const dropped = correlateGameWithMultimodalSignals({
      gameEvents: [
        { type: 'game_event_v1', eventType: 'stimulus_shown', trialId: 't1', gameId: 'g', timestamp: undefined },
        { type: 'game_event_v1', eventType: 'response', trialId: 't1', gameId: 'g', timestamp: 1500 },
      ],
      faceSamples,
    });
    expect(dropped.aggregate.trialCount).toBe(0);

    // Control: el mismo estímulo con timestamp finito sí produce el trial.
    const kept = correlateGameWithMultimodalSignals({
      gameEvents: [
        { type: 'game_event_v1', eventType: 'stimulus_shown', trialId: 't1', gameId: 'g', timestamp: 1000 },
        { type: 'game_event_v1', eventType: 'response', trialId: 't1', gameId: 'g', timestamp: 1500 },
      ],
      faceSamples,
    });
    expect(kept.aggregate.trialCount).toBe(1);
    expect(kept.trials[0].windows.reaction.face.sampleCount).toBeGreaterThan(0);
  });
});
