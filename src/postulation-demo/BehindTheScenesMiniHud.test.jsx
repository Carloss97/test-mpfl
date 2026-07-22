import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import BehindTheScenesMiniHud, { buildBehindTheScenesStatus } from './BehindTheScenesMiniHud.jsx';

describe('BehindTheScenesMiniHud', () => {
  it('describes an idle optional-camera setup as ready instead of processing', () => {
    render(<BehindTheScenesMiniHud snapshot={{ camera: 'idle', face: 'idle', signal: 'idle', events: 0, report: 'pending' }} />);

    expect(screen.getByText(/Listo para comenzar/i)).toBeInTheDocument();
    expect(screen.getByText(/Puedes continuar sin cámara/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Procesando en segundo plano$/i)).not.toBeInTheDocument();
  });

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

  it('opens a live explanation drawer with local inference steps and no reconstructive telemetry labels', () => {
    render(<BehindTheScenesMiniHud snapshot={{ camera: 'ok', face: 'ok', signal: 'ok', events: 18, report: 'pending' }} />);

    fireEvent.click(screen.getByRole('button', { name: /Ver qué pasa detrás/i }));

    expect(screen.getByText(/LOCAL INFERENCE/i)).toBeInTheDocument();
    expect(screen.getByText(/performance\.now\(\)/i)).toBeInTheDocument();
    expect(screen.getByText(/gameCorrelation\.aggregate/i)).toBeInTheDocument();
    expect(screen.getByText(/assessment_feature_vector_v2/i)).toBeInTheDocument();
    expect(screen.getByText(/No contiene datos reconstructivos/i)).toBeInTheDocument();

    const visibleText = document.body.textContent;
    for (const forbidden of ['landmarks', 'keypoints', 'rawGameEvents', 'pointerSamples']) {
      expect(visibleText).not.toContain(forbidden);
    }
  });
});
