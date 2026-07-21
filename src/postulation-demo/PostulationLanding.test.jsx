import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PostulationLanding from './PostulationLanding.jsx';
import { POSTULATION_DEMO_BATTERY_MODES } from './postulationDemoConfig.js';

describe('PostulationLanding HR dashboard access', () => {
  it('offers a separate HR dashboard link without replacing the candidate CTA', () => {
    render(<PostulationLanding onStart={vi.fn()} batteryMode={POSTULATION_DEMO_BATTERY_MODES.ORIGINAL_GAMES} />);

    expect(screen.getByRole('button', { name: /Comenzar demo de postulación/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver dashboard HR/i })).toHaveAttribute('href', '/postulaciones-demo/hr');
  });
});
