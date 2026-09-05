import { describe, expect, it } from 'vitest';
import { classifyBasicEmotions } from './basicEmotions.js';

describe('classifyBasicEmotions', () => {
  it('detects happiness from AU6+AU12 (Duchenne smile)', () => {
    const aus = {
      AU6: { intensity: 0.5 },
      AU12: { intensity: 0.6 },
    };
    const result = classifyBasicEmotions(aus);
    expect(result.dominant).toBe('happiness');
    expect(result.probabilities.happiness).toBeGreaterThan(0.3);
  });

  it('detects anger from AU4+AU7+AU23', () => {
    const aus = {
      AU4: { intensity: 0.5 },
      AU7: { intensity: 0.4 },
      AU23: { intensity: 0.5 },
    };
    const result = classifyBasicEmotions(aus);
    expect(result.probabilities.anger).toBeGreaterThan(0.2);
  });

  it('detects surprise from AU1+2+5+26', () => {
    const aus = {
      AU1: { intensity: 0.5 },
      AU2: { intensity: 0.5 },
      AU5: { intensity: 0.6 },
      AU26: { intensity: 0.4 },
    };
    const result = classifyBasicEmotions(aus);
    expect(result.probabilities.surprise).toBeGreaterThan(0.3);
  });

  it('returns neutral when no AUs are active', () => {
    const result = classifyBasicEmotions({});
    expect(result.dominant).toBe('neutral');
    expect(result.probabilities.neutral).toBeGreaterThan(0.8);
  });

  it('returns contempt for asymmetric smile', () => {
    const aus = {
      AU_L12: { intensity: 0.4 },
      AU_R12: { intensity: 0.05 },
    };
    const result = classifyBasicEmotions(aus);
    expect(result.probabilities.contempt).toBeGreaterThan(0.1);
  });

  it('detects fear from AU1+2+4+5+7+20+26', () => {
    const aus = {
      AU1: { intensity: 0.3 }, AU2: { intensity: 0.3 },
      AU4: { intensity: 0.3 }, AU5: { intensity: 0.4 },
      AU7: { intensity: 0.3 }, AU20: { intensity: 0.3 },
      AU26: { intensity: 0.3 },
    };
    const result = classifyBasicEmotions(aus);
    expect(result.probabilities.fear).toBeGreaterThan(0.1);
  });

  it('detects disgust from AU9+15+17', () => {
    const aus = {
      AU9: { intensity: 0.5 },
      AU15: { intensity: 0.4 },
      AU17: { intensity: 0.3 },
    };
    const result = classifyBasicEmotions(aus);
    expect(result.probabilities.disgust).toBeGreaterThan(0.2);
  });

  it('detects sadness from AU1+4+15', () => {
    const aus = {
      AU1: { intensity: 0.4 },
      AU4: { intensity: 0.4 },
      AU15: { intensity: 0.5 },
    };
    const result = classifyBasicEmotions(aus);
    expect(result.probabilities.sadness).toBeGreaterThan(0.2);
  });
});