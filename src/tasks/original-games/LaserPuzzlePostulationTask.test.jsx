import React, { act } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LaserPuzzlePostulationTask, { buildLaserDemoLevels } from './LaserPuzzlePostulationTask.jsx';

function completeLevel(level) {
  for (const [fromKey, toKey] of level.solutionPlacements) {
    fireEvent.click(screen.getByTestId(`laser-cell-${fromKey}`));
    fireEvent.click(screen.getByTestId(`laser-cell-${toKey}`));
  }
  fireEvent.click(screen.getByRole('button', { name: /comprobar ruta/i }));
}

function skipIntro() {
  fireEvent.click(screen.getByRole('button', { name: /Saltar/i }));
}

function completeFirstLevel() {
  completeLevel(buildLaserDemoLevels()[0]);
}

describe('LaserPuzzlePostulationTask', () => {
  it('exposes keyboard shortcuts on the board (G.5 / G1-P01)', () => {
    render(<LaserPuzzlePostulationTask active width={606} height={338} trialCount={1} onGameEvent={vi.fn()} />);
    skipIntro();
    const board = screen.getByTestId('laser-puzzle-board');
    expect(board).toHaveAttribute('tabindex', '0');
    // R resets a partially-touched board without throwing.
    fireEvent.click(screen.getByTestId('laser-cell-7,0'));
    expect(screen.getByText(/Pieza seleccionada/i)).toBeInTheDocument();
    fireEvent.keyDown(board, { key: 'r' });
    expect(screen.getByText(/Nivel reiniciado/i)).toBeInTheDocument();
    // Arrow navigation moves focus to an adjacent cell.
    fireEvent.keyDown(board, { key: 'ArrowLeft' });
    expect(screen.getByText(/Nivel reiniciado/i)).toBeInTheDocument();
    // A keyboard hint line is visible.
    expect(screen.getByText(/Teclado:/)).toBeInTheDocument();
  });

  it('renders the compact Laser puzzle with stage-safe dimensions and instructions', () => {
    const onGameEvent = vi.fn();
    render(<LaserPuzzlePostulationTask active width={606} height={338} trialCount={1} onGameEvent={onGameEvent} />);

    expect(screen.getByRole('heading', { name: /Puzzle láser/i })).toBeInTheDocument();
    skipIntro();
    expect(screen.getByText(/Reconstruye una órbita de cuatro reflectores/i)).toBeInTheDocument();
    expect(screen.getByText(/Mueve las 4 piezas ópticas/i)).toBeInTheDocument();
    expect(screen.getByText(/Emisor/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Pieza móvil/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Reiniciar nivel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Comprobar ruta/i })).toBeDisabled();
    const board = screen.getByTestId('laser-puzzle-board');
    expect(Number(board.dataset.boardWidth)).toBeLessThanOrEqual(606);
    expect(Number(board.dataset.boardHeight)).toBeLessThanOrEqual(338);
    expect(screen.getByText(/Nivel 1 de 1/i)).toBeInTheDocument();
    expect(onGameEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'game_start', gameId: 'laser_puzzle' }));
    expect(onGameEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'stimulus_shown', gameId: 'laser_puzzle' }));
  });

  it('allows solving a level by moving pieces and emits aggregate-only response telemetry', () => {
    const onGameEvent = vi.fn();
    const onComplete = vi.fn();
    render(<LaserPuzzlePostulationTask active width={606} height={338} trialCount={1} clearMs={0} interstitialMs={0} onGameEvent={onGameEvent} onComplete={onComplete} />);

    skipIntro();
    completeFirstLevel();

    expect(screen.getByText(/Nivel resuelto/i)).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
      gameId: 'laser_puzzle',
      solvedLevels: 1,
      levelCount: 1,
      aggregateOnly: true,
    }));

    const response = onGameEvent.mock.calls.map(([event]) => event).find((event) => event.eventType === 'response');
    expect(response).toBeDefined();
    expect(response.response).toMatchObject({
      correct: true,
      outcome: 'level_solved',
      laserPuzzle: expect.objectContaining({ solvedLevels: 1, moveCount: 4 }),
    });
    expect(JSON.stringify(response)).not.toMatch(/rawPointerPath|pointerSamples|beamCells|fullRoute|rawGameEvents/i);
  });

  it('marks the finished aggregate as practice/preview when mounted in practice mode (G.2)', () => {
    const onComplete = vi.fn();
    render(<LaserPuzzlePostulationTask active width={606} height={338} trialCount={1} practice clearMs={0} onGameEvent={vi.fn()} onComplete={onComplete} />);
    skipIntro();
    completeFirstLevel();

    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
      gameId: 'laser_puzzle',
      practice: true,
      preview: true,
      is_tutorial: true,
      practiceGameId: 'laser_puzzle',
    }));
    const summary = onComplete.mock.calls.at(-1)[0];
    expect(JSON.stringify(summary)).not.toMatch(/rawPointerPath|pointerSamples|beamCells|fullRoute/i);
  });

  it('keeps parent telemetry re-renders from restarting the active level', () => {
    function Harness() {
      const [events, setEvents] = React.useState(0);
      return (
        <>
          <span data-testid="event-count">{events}</span>
          <LaserPuzzlePostulationTask active width={606} height={338} trialCount={1} onGameEvent={() => setEvents((count) => count + 1)} />
        </>
      );
    }

    render(<Harness />);
    expect(Number(screen.getByTestId('event-count').textContent)).toBe(1);
    skipIntro();
    expect(Number(screen.getByTestId('event-count').textContent)).toBe(2);
    fireEvent.click(screen.getByTestId('laser-cell-7,0'));
    expect(screen.getByText(/Pieza seleccionada/i)).toBeInTheDocument();
    expect(screen.getByTestId('laser-cell-1,0')).toHaveClass('laser-puzzle-task__cell--valid-target');
    expect(Number(screen.getByTestId('event-count').textContent)).toBe(2);
  });

  it('completes all authored levels used by the controlled original battery', async () => {
    const onComplete = vi.fn();
    render(<LaserPuzzlePostulationTask active width={606} height={338} trialCount={3} clearMs={0} interstitialMs={0} onGameEvent={vi.fn()} onComplete={onComplete} />);

    skipIntro();
    const levels = buildLaserDemoLevels();
    completeLevel(levels[0]);
    expect(await screen.findByText(/Nivel 2 de 3/i)).toBeInTheDocument();
    completeLevel(levels[1]);
    expect(await screen.findByText(/Nivel 3 de 3/i)).toBeInTheDocument();
    completeLevel(levels[2]);

    expect(screen.getByTestId('laser-puzzle-finished')).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
      gameId: 'laser_puzzle',
      completed: true,
      solvedLevels: 3,
      levelCount: 3,
      aggregateOnly: true,
    }));
  });

  it('shows clear + interstitial overlays with production timings and defers the next level (W2)', () => {
    vi.useFakeTimers();
    try {
      const onGameEvent = vi.fn();
      render(<LaserPuzzlePostulationTask active width={606} height={338} trialCount={2} onGameEvent={onGameEvent} />);

      skipIntro();
      const levels = buildLaserDemoLevels();
      completeLevel(levels[0]);

      // Clear overlay with level stats appears first.
      const clearOverlay = screen.getByTestId('laser-clear-overlay');
      expect(clearOverlay).toHaveTextContent(/Enlace restablecido/i);
      expect(clearOverlay).toHaveTextContent(/Movimientos: 4/i);
      expect(screen.queryByTestId('laser-interstitial')).not.toBeInTheDocument();

      // After the clear delay, the interstitial introduces the next level.
      act(() => { vi.advanceTimersByTime(1500); });
      const interstitial = screen.getByTestId('laser-interstitial');
      expect(interstitial).toHaveTextContent(/Nivel 2 de 2/i);
      expect(interstitial).toHaveTextContent(/Salto cuántico/i);
      expect(screen.getByText(/Nivel 1 de 2/i)).toBeInTheDocument();

      // Only after the interstitial does the board switch to level 2.
      act(() => { vi.advanceTimersByTime(1400); });
      expect(screen.getByText(/Nivel 2 de 2/i)).toBeInTheDocument();
      expect(screen.queryByTestId('laser-interstitial')).not.toBeInTheDocument();
      expect(screen.getByText(/Entra al portal azul/i)).toBeInTheDocument();

      // The level-2 stimulus must fire only after the interstitial ended.
      const events = onGameEvent.mock.calls.map(([event]) => event);
      const stimulusOrder = events.filter((event) => event.eventType === 'stimulus_shown').map((event) => event.trialId);
      expect(stimulusOrder).toEqual([levels[0].id, levels[1].id]);
    } finally {
      vi.useRealTimers();
    }
  });
});
