import { describe, expect, it } from 'vitest';
import { getColorStimulusClassName } from './colorStimulusLayout.js';

describe('getColorStimulusClassName', () => {
  it('adds a compact class for long Stroop words so AMARILLO stays inside its card', () => {
    expect(getColorStimulusClassName('AMARILLO')).toBe('color-stimulus long-word');
    expect(getColorStimulusClassName('VERDE')).toBe('color-stimulus');
  });
});
