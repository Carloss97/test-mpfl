/**
 * Pointer Sampler v1
 *
 * In-memory pointer buffer for gamified activities. It normalizes pointer events
 * and summarizes windows without persisting raw trajectories in exported payloads.
 */

import { buildPointerKinematics } from './kinematics.js';

function now() {
  return globalThis.performance?.now?.() ?? Date.now();
}

function round(value, digits = 2) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  const factor = 10 ** digits;
  return Math.round(numeric * factor) / factor;
}

function finiteOrUndefined(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

export function createPointerSampler({ maxSamples = 2400, sessionId = null } = {}) {
  return {
    schemaVersion: 'pointer_sampler_v1',
    sessionId,
    maxSamples: Math.max(1, Math.floor(Number(maxSamples) || 1)),
    samples: [],
    privacy: {
      rawPointerPathStored: false,
      inMemoryOnly: true,
    },
  };
}

export function normalizePointerEvent(event = {}) {
  const timestamp = finiteOrUndefined(event.timestamp ?? event.timeStamp) ?? now();
  const x = finiteOrUndefined(event.x ?? event.clientX);
  const y = finiteOrUndefined(event.y ?? event.clientY);
  const sample = {
    timestamp: round(timestamp),
    x: round(x ?? 0),
    y: round(y ?? 0),
  };
  if (event.button !== undefined) sample.button = Number(event.button);
  if (event.pressure !== undefined) sample.pressure = round(event.pressure, 3);
  return sample;
}

export function appendPointerSample(sampler, event = {}) {
  const current = sampler ?? createPointerSampler();
  const sample = normalizePointerEvent(event);
  const maxSamples = Math.max(1, Math.floor(Number(current.maxSamples) || 1));
  const samples = [...(current.samples ?? []), sample].slice(-maxSamples);
  return {
    ...current,
    maxSamples,
    samples,
    privacy: {
      rawPointerPathStored: false,
      inMemoryOnly: true,
    },
  };
}

export function summarizePointerWindow(samplerOrSamples, { from = -Infinity, to = Infinity } = {}) {
  const samples = Array.isArray(samplerOrSamples) ? samplerOrSamples : (samplerOrSamples?.samples ?? []);
  const windowSamples = samples.filter((sample) => {
    const timestamp = Number(sample.timestamp);
    return Number.isFinite(timestamp) && timestamp >= from && timestamp <= to;
  });
  return {
    ...buildPointerKinematics(windowSamples),
    window: {
      from: Number.isFinite(Number(from)) ? Number(from) : null,
      to: Number.isFinite(Number(to)) ? Number(to) : null,
    },
    privacy: {
      rawPointerPathStored: false,
      aggregateOnly: true,
    },
  };
}
