import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PostulationDemoApp from './PostulationDemoApp.jsx';
import PostulationConsentSetup from './PostulationConsentSetup.jsx';
import { isPostulationDemoPath } from './postulationDemoRoute.js';

function MockGame({ block, onComplete, onGameEvent }) {
  React.useEffect(() => {
    onGameEvent?.({
      type: 'game_event_v1',
      eventType: 'game_start',
      gameId: block.gameId,
      timestamp: performance.now(),
    });
  }, [block.gameId, onGameEvent]);
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
          onGameEvent?.({
            type: 'game_event_v1',
            eventType: 'game_end',
            gameId: block.gameId,
            timestamp: performance.now(),
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
  laser_puzzle: MockGame,
  balloon_risk: MockGame,
  passenger_routes: MockGame,
  team_coordination: MockGame,
};

afterEach(() => {
  window.history.pushState({}, '', '/');
});

describe('PostulationDemoApp shell and flow', () => {
  it('keeps camera retry available after an optional capture error', () => {
    const onEnableCamera = vi.fn();
    render(
      <PostulationConsentSetup
        backgroundActive
        signalSnapshot={{ camera: 'error' }}
        onEnableCamera={onEnableCamera}
        onContinue={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    const retry = screen.getByRole('button', { name: /Reintentar cámara/i });
    expect(retry).toBeEnabled();
    expect(retry).toHaveClass('postulation-demo__secondary-button');
    expect(screen.getByRole('button', { name: /Continuar a juegos/i })).toHaveClass('postulation-demo__primary');
    fireEvent.click(retry);
    expect(onEnableCamera).toHaveBeenCalledTimes(1);
  });

  it('detects the isolated postulation demo route without matching the technical app root', () => {
    expect(isPostulationDemoPath('/postulaciones-demo')).toBe(true);
    expect(isPostulationDemoPath('/postulaciones-demo?fixture=1')).toBe(true);
    expect(isPostulationDemoPath('/postulaciones-demo/reporte')).toBe(true);
    expect(isPostulationDemoPath('/')).toBe(false);
    expect(isPostulationDemoPath('/demo')).toBe(false);
  });

  it('renders a polished candidate-facing landing with a separate HR dashboard entry', () => {
    render(<PostulationDemoApp />);

    expect(screen.getByRole('heading', { name: /KRUMM Postulaciones/i })).toBeInTheDocument();
    expect(screen.getByText(/Juegos breves, procesamiento local y reporte para revisión humana/i)).toBeInTheDocument();
    expect(screen.getByText(/Demo MVP/i)).toBeInTheDocument();
    expect(screen.getByText(/6-8 min/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Comenzar demo de postulación/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Abrir vista HR/i })).toHaveAttribute('href', '/postulaciones-demo/hr');
    expect(screen.getByText(/métricas de desempeño/i)).toBeInTheDocument();
    expect(screen.getByText(/calidad de captura y el contexto de la sesión/i)).toBeInTheDocument();
    expect(screen.queryByText(/FaceMesh|AUs\/FACS|MoveNet|payload privacy-safe/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/KRUMM Edge Fusion PoC/i)).not.toBeInTheDocument();
  });

  it('moves from landing into the productized signal setup screen', () => {
    render(<PostulationDemoApp />);

    fireEvent.click(screen.getByRole('button', { name: /Comenzar demo de postulación/i }));

    expect(screen.getByRole('heading', { name: /Preparación de la sesión/i })).toBeInTheDocument();
    expect(screen.getByText(/Cámara local opcional/i)).toBeInTheDocument();
    expect(screen.getByText(/no se usan por sí solas para inferir talento/i)).toBeInTheDocument();
    expect(screen.queryByText(/FaceMesh|AUs\/FACS|MoveNet/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Activar cámara local/i })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: /Procesamiento en segundo plano/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Volver al inicio/i })).toBeInTheDocument();
  });

  it('continues from setup into the candidate game stage instead of the technical dashboard', () => {
    render(<PostulationDemoApp />);

    fireEvent.click(screen.getByRole('button', { name: /Comenzar demo de postulación/i }));
    fireEvent.click(screen.getByRole('button', { name: /Continuar a juegos/i }));

    expect(screen.getByRole('heading', { name: /Ruta de precisión adaptativa/i })).toBeInTheDocument();
    expect(screen.getByText(/Juego 1 de 4/i)).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: /Procesamiento en segundo plano/i })).toBeInTheDocument();
    expect(screen.queryByText(/KRUMM Edge Fusion PoC/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Dashboard/i)).not.toBeInTheDocument();
  });

  it('generates a productized privacy-safe report screen after completing the mocked candidate game stage', () => {
    render(<PostulationDemoApp gameComponents={MOCK_GAMES} />);

    fireEvent.click(screen.getByRole('button', { name: /Comenzar demo de postulación/i }));
    fireEvent.click(screen.getByRole('button', { name: /Continuar a juegos/i }));
    fireEvent.click(screen.getByRole('button', { name: /Completar precision_targeting/i }));
    fireEvent.click(screen.getByRole('button', { name: /Completar go_nogo/i }));
    fireEvent.click(screen.getByRole('button', { name: /Completar color_interference/i }));
    fireEvent.click(screen.getByRole('button', { name: /Completar visual_search/i }));

    expect(screen.getByRole('heading', { name: /Reporte de sesión listo para revisión humana/i })).toBeInTheDocument();
    expect(screen.getByText(/Integridad de archivos verificada · no implica validez psicométrica/i)).toBeInTheDocument();
    expect(screen.getByText(/Perfil de capacidades/i)).toBeInTheDocument();
    expect(screen.getByText(/Resultados por juego/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Descargar reporte local/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Descargar bundle técnico/i })).toBeInTheDocument();
  });

  it('opens directly into a synthetic fixture report when ?fixture=1 is present', () => {
    window.history.pushState({}, '', '/postulaciones-demo?fixture=1');

    render(<PostulationDemoApp gameComponents={MOCK_GAMES} />);

    expect(screen.getByRole('heading', { name: /Reporte de demostración listo para revisión humana/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Datos sintéticos de demostración/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Datos sintéticos locales para reuniones/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /KRUMM Postulaciones/i })).not.toBeInTheDocument();
  });

  it('activates the original games only through the explicit battery query and completes all four blocks', () => {
    window.history.pushState({}, '', '/postulaciones-demo?battery=original');
    render(<PostulationDemoApp gameComponents={MOCK_GAMES} />);

    expect(screen.getByText(/Batería original · Demo controlada/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Comenzar demo de postulación/i }));
    fireEvent.click(screen.getByRole('button', { name: /Continuar a juegos/i }));

    expect(screen.getByRole('heading', { name: /Puzzle láser/i })).toBeInTheDocument();
    expect(screen.getByText(/Juego 1 de 4/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Completar laser_puzzle/i }));
    fireEvent.click(screen.getByRole('button', { name: /Completar balloon_risk/i }));
    fireEvent.click(screen.getByRole('button', { name: /Completar passenger_routes/i }));
    fireEvent.click(screen.getByRole('button', { name: /Completar team_coordination/i }));

    expect(screen.getByRole('heading', { name: /Reporte de sesión listo para revisión humana/i })).toBeInTheDocument();
    expect(screen.getByText(/Completaste\s+4\s+de\s+4\s+juegos/i)).toBeInTheDocument();
    expect(document.querySelector('[data-battery-mode="original_games"]')).toBeInTheDocument();
  });

  it('opens the original-games synthetic fixture when fixture and battery flags are combined', () => {
    window.history.pushState({}, '', '/postulaciones-demo?fixture=1&battery=original');
    render(<PostulationDemoApp gameComponents={MOCK_GAMES} />);

    expect(screen.getByRole('heading', { name: /Reporte de demostración listo para revisión humana/i })).toBeInTheDocument();
    expect(screen.getByText(/Completaste\s+4\s+de\s+4\s+juegos/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Puzzle láser/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Globo de riesgo/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Optimización de rutas de pasajeros/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Operación Faro: coordinación de equipo/i })).toBeInTheDocument();
  });
});
