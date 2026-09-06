import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PostulationLanding from './PostulationLanding.jsx';
import { POSTULATION_DEMO_BATTERY_MODES } from './postulationDemoConfig.js';

describe('PostulationLanding HR dashboard access', () => {
  it('offers a separate HR dashboard link without replacing the candidate CTA', () => {
    render(<PostulationLanding onStart={vi.fn()} batteryMode={POSTULATION_DEMO_BATTERY_MODES.ORIGINAL_GAMES} />);

    expect(screen.getByRole('button', { name: /Comenzar prueba de postulación/i })).toBeInTheDocument();
    const hrLink = screen.getByRole('link', { name: /Abrir vista reclutador/i });
    expect(hrLink).toHaveAttribute('href', '/reclutador');
    expect(hrLink.closest('.postulation-demo__brief')).not.toBeNull();
    expect(screen.getByText(/14–16 min/i)).toBeInTheDocument();
    expect(screen.getByText(/Sesión local · batería original/i)).toBeInTheDocument();
    expect(screen.getByText(/no reduce el desempeño de los juegos/i)).toBeInTheDocument();
  });
});
