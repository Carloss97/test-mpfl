import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import BehindTheScenesMiniHud, { buildBehindTheScenesStatus } from './BehindTheScenesMiniHud.jsx';

describe('BehindTheScenesMiniHud', () => {
  it('shows compact background processing status without exposing technical dashboard data', () => {
    const snapshot = {
      camera: 'ok',
      face: 'ok',
      signal: 'warning',
      events: 12,
      report: 'pending',
      readyCount: 3,
      totalCount: 5,
      caveats: ['MoveNet sin hombros visibles'],
    };

    render(<BehindTheScenesMiniHud snapshot={snapshot} />);

    expect(screen.getByRole('complementary', { name: /Procesamiento en segundo plano/i })).toBeInTheDocument();
    expect(screen.getByText(/Procesando en segundo plano/i)).toBeInTheDocument();
    expect(screen.getByText(/Cámara/i)).toBeInTheDocument();
    expect(screen.getByText(/Rostro/i)).toBeInTheDocument();
    expect(screen.getByText(/Eventos/i)).toBeInTheDocument();
    expect(screen.getByText(/12/i)).toBeInTheDocument();
    expect(screen.getByText(/MoveNet sin hombros visibles/i)).toBeInTheDocument();
    expect(screen.queryByText(/landmarks/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/trayectoria/i)).not.toBeInTheDocument();
  });

  it('normalizes missing snapshot into idle local-only status', () => {
    expect(buildBehindTheScenesStatus()).toMatchObject({
      camera: 'idle',
      face: 'idle',
      signal: 'idle',
      events: 0,
      report: 'pending',
      readyCount: 0,
      totalCount: 5,
    });
  });
});
