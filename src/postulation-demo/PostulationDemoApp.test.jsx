import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PostulationDemoApp from './PostulationDemoApp.jsx';
import { isPostulationDemoPath } from './postulationDemoRoute.js';

function MockGame({ block, onComplete, onGameEvent }) {
  return (
    <div aria-label={`mock-${block.gameId}`}>
      <button
        type="button"
        onClick={() => {
          onGameEvent?.({
            eventType: 'response',
            gameId: block.gameId,
            trialId: `${block.gameId}-1`,
            response: { correct: true, reactionTimeMs: 500, score: 0.8 },
          });
          onComplete?.({
            gameId: block.gameId,
            completedTrialCount: block.trialCount ?? 1,
            trialCount: block.trialCount ?? 1,
            accuracy: 0.8,
            score: 0.8,
            meanReactionTimeMs: 500,
          });
        }}
      >
        Completar {block.gameId}
      </button>
    </div>
  );
}

const MOCK_GAMES = {
  precision_targeting: MockGame,
  go_nogo: MockGame,
  color_interference: MockGame,
  visual_search: MockGame,
};

describe('PostulationDemoApp shell and flow', () => {
  it('detects the isolated postulation demo route without matching the technical app root', () => {
    expect(isPostulationDemoPath('/postulaciones-demo')).toBe(true);
    expect(isPostulationDemoPath('/postulaciones-demo?fixture=1')).toBe(true);
    expect(isPostulationDemoPath('/postulaciones-demo/reporte')).toBe(true);
    expect(isPostulationDemoPath('/')).toBe(false);
    expect(isPostulationDemoPath('/demo')).toBe(false);
  });

  it('renders a polished candidate-facing landing without technical dashboard language', () => {
    render(<PostulationDemoApp />);

    expect(screen.getByRole('heading', { name: /KRUMM Postulaciones/i })).toBeInTheDocument();
    expect(screen.getByText(/Juegos breves, señales locales y reporte para revisión humana/i)).toBeInTheDocument();
    expect(screen.getByText(/Demo MVP/i)).toBeInTheDocument();
    expect(screen.getByText(/6-8 min/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Comenzar demo de postulación/i })).toBeInTheDocument();
    expect(screen.queryByText(/KRUMM Edge Fusion PoC/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Dashboard/i)).not.toBeInTheDocument();
  });

  it('moves from landing into the productized signal setup screen', () => {
    render(<PostulationDemoApp />);

    fireEvent.click(screen.getByRole('button', { name: /Comenzar demo de postulación/i }));

    expect(screen.getByRole('heading', { name: /Preparación de señales/i })).toBeInTheDocument();
    expect(screen.getByText(/Cámara local opcional/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Activar cámara local/i })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: /Procesamiento en segundo plano/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Volver al inicio/i })).toBeInTheDocument();
  });

  it('continues from setup into the candidate game stage instead of the technical dashboard', () => {
    render(<PostulationDemoApp />);

    fireEvent.click(screen.getByRole('button', { name: /Comenzar demo de postulación/i }));
    fireEvent.click(screen.getByRole('button', { name: /Continuar a juegos/i }));

    expect(screen.getByRole('heading', { name: /Precisión visomotora/i })).toBeInTheDocument();
    expect(screen.getByText(/Juego 1 de 4/i)).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: /Procesamiento en segundo plano/i })).toBeInTheDocument();
    expect(screen.queryByText(/KRUMM Edge Fusion PoC/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Dashboard/i)).not.toBeInTheDocument();
  });

  it('generates a privacy-safe report preview after completing the mocked candidate game stage', () => {
    render(<PostulationDemoApp gameComponents={MOCK_GAMES} />);

    fireEvent.click(screen.getByRole('button', { name: /Comenzar demo de postulación/i }));
    fireEvent.click(screen.getByRole('button', { name: /Continuar a juegos/i }));
    fireEvent.click(screen.getByRole('button', { name: /Completar precision_targeting/i }));
    fireEvent.click(screen.getByRole('button', { name: /Completar go_nogo/i }));
    fireEvent.click(screen.getByRole('button', { name: /Completar color_interference/i }));
    fireEvent.click(screen.getByRole('button', { name: /Completar visual_search/i }));

    expect(screen.getByRole('heading', { name: /Reporte generado/i })).toBeInTheDocument();
    expect(screen.getByText(/OK privacy-safe/i)).toBeInTheDocument();
    expect(screen.getByText(/KRUMM — Reporte de Evaluación Gamificada/i)).toBeInTheDocument();
    expect(screen.getByText(/payload validado/i)).toBeInTheDocument();
  });
});
