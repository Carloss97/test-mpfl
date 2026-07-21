import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PostulationHrDashboard from './PostulationHrDashboard.jsx';

describe('PostulationHrDashboard', () => {
  it('renders a clean HR overview with synthetic-data and human-review safeguards', () => {
    render(<PostulationHrDashboard />);

    expect(screen.getByRole('heading', { name: /Panel de evaluaciones/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Datos sintéticos/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/No ranking automático/i)).toBeInTheDocument();
    const summary = screen.getByRole('region', { name: /Resumen de evaluaciones/i });
    expect(within(summary).getByText('Evaluaciones')).toBeInTheDocument();
    expect(within(summary).getByText(/Listas para revisión/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Volver a demo candidato/i })).toHaveAttribute('href', '/postulaciones-demo?battery=original');
    expect(document.body.textContent).not.toMatch(/contratar|rechazar|apto\/no apto/i);
  });

  it('filters the review queue by alias and updates the selected profile', () => {
    render(<PostulationHrDashboard />);

    fireEvent.change(screen.getByRole('searchbox', { name: /Buscar evaluación/i }), { target: { value: '017' } });

    const queue = screen.getByRole('region', { name: /Evaluaciones disponibles/i });
    expect(within(queue).getByText('Perfil 017')).toBeInTheDocument();
    expect(within(queue).queryByText('Perfil 042')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Perfil 017/i })).toBeInTheDocument();
  });

  it('filters by workflow status and role', () => {
    render(<PostulationHrDashboard />);

    fireEvent.change(screen.getByLabelText(/Estado de revisión/i), { target: { value: 'needs_review' } });
    expect(screen.getByRole('region', { name: /Evaluaciones disponibles/i })).toHaveTextContent('Perfil 063');
    expect(screen.getByRole('region', { name: /Evaluaciones disponibles/i })).not.toHaveTextContent('Perfil 017');

    fireEvent.change(screen.getByLabelText(/Estado de revisión/i), { target: { value: 'all' } });
    fireEvent.change(screen.getByLabelText(/Rol objetivo/i), { target: { value: 'Product Operations' } });
    expect(screen.getByRole('region', { name: /Evaluaciones disponibles/i })).toHaveTextContent('Perfil 028');
  });

  it('changes the detail panel and exposes eight construct scores with confidence', () => {
    render(<PostulationHrDashboard />);

    fireEvent.click(screen.getByRole('button', { name: /Abrir Perfil 028/i }));

    const detail = screen.getByRole('region', { name: /Detalle de Perfil 028/i });
    expect(within(detail).getByRole('heading', { name: 'Perfil 028' })).toBeInTheDocument();
    expect(within(detail).getByText(/Product Operations/i)).toBeInTheDocument();
    expect(within(detail).getAllByText(/Confianza 55%|Confianza 60%/i)).toHaveLength(8);
    expect(within(detail).getByText(/Contexto para entrevista/i)).toBeInTheDocument();
    expect(within(detail).getByText(/Resultados por juego/i)).toBeInTheDocument();
  });

  it('shows missing in-progress evidence as pending instead of a zero score', () => {
    render(<PostulationHrDashboard />);

    expect(screen.getByRole('region', { name: /Detalle de Perfil 042/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Abrir Perfil 075/i }));

    const detail = screen.getByRole('region', { name: /Detalle de Perfil 075/i });
    expect(within(detail).getAllByText('Pendiente').length).toBeGreaterThan(0);
    expect(within(detail).getAllByText(/Sin evidencia aún/i)).toHaveLength(4);
    expect(within(detail).queryByLabelText(/Adaptabilidad: 0 de 100/i)).not.toBeInTheDocument();
  });
});
