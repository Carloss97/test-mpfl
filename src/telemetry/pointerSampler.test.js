import { describe, expect, it } from 'vitest';
import {
  createPointerSampler,
  normalizePointerEvent,
  appendPointerSample,
  summarizePointerWindow,
} from './pointerSampler.js';

describe('pointerSampler', () => {
  it('creates an in-memory ring buffer with privacy-safe defaults', () => {
    const sampler = createPointerSampler({ maxSamples: 3, sessionId: 's-1' });

    expect(sampler.sessionId).toBe('s-1');
    expect(sampler.privacy).toEqual({ rawPointerPathStored: false, inMemoryOnly: true });
    expect(sampler.samples).toEqual([]);
  });

  it('normalizes pointer events and drops non-aggregate/raw path fields', () => {
    const sample = normalizePointerEvent({
      timeStamp: 100.1234,
      clientX: 10.456,
      clientY: 20.987,
      button: 0,
      pressure: 0.54321,
      target: { id: 'dom-node' },
      path: [{ x: 1, y: 1 }],
    });

    expect(sample).toEqual({ timestamp: 100.12, x: 10.46, y: 20.99, button: 0, pressure: 0.543 });
    expect(JSON.stringify(sample)).not.toContain('path');
    expect(JSON.stringify(sample)).not.toContain('dom-node');
  });

  it('appends samples immutably and enforces maxSamples', () => {
    const sampler = createPointerSampler({ maxSamples: 2, sessionId: 's-1' });
    const a = appendPointerSample(sampler, { timestamp: 0, x: 0, y: 0 });
    const b = appendPointerSample(a, { timestamp: 10, x: 10, y: 0 });
    const c = appendPointerSample(b, { timestamp: 20, x: 20, y: 0 });

    expect(sampler.samples).toHaveLength(0);
    expect(c.samples).toHaveLength(2);
    expect(c.samples[0].timestamp).toBe(10);
    expect(c.samples[1].timestamp).toBe(20);
  });

  it('summarizes a time window without returning raw samples', () => {
    const sampler = createPointerSampler({ maxSamples: 10, sessionId: 's-1' });
    const filled = [
      { timestamp: 0, x: 0, y: 0 },
      { timestamp: 10, x: 10, y: 0 },
      { timestamp: 20, x: 20, y: 0 },
      { timestamp: 30, x: 20, y: 10 },
    ].reduce((state, sample) => appendPointerSample(state, sample), sampler);

    const summary = summarizePointerWindow(filled, { from: 5, to: 25 });

    expect(summary.sampleCount).toBe(2);
    expect(summary.totalDistancePx).toBe(10);
    expect(summary.pathEfficiency).toBe(1);
    expect(summary.privacy.rawPointerPathStored).toBe(false);
    expect(summary.samples).toBeUndefined();
  });
});
