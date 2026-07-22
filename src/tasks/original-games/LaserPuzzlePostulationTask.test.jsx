import React from 'react';
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

function completeFirstLevel() {
  completeLevel(buildLaserDemoLevels()[0]);
}

describe('LaserPuzzlePostulationTask', () => {
  it('renders the compact Laser puzzle with stage-safe dimensions and instructions', () => {
    const onGameEvent = vi.fn();
    render(<LaserPuzzlePostulationTask active width={606} height={338} trialCount={1} onGameEvent={onGameEvent} />);

    expect(screen.getByRole('heading', { name: /Puzzle láser/i })).toBeInTheDocument();
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
    render(<LaserPuzzlePostulationTask active width={606} height={338} trialCount={1} onGameEvent={onGameEvent} onComplete={onComplete} />);

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
    expect(Number(screen.getByTestId('event-count').textContent)).toBe(2);
    fireEvent.click(screen.getByTestId('laser-cell-7,0'));
    expect(screen.getByText(/Pieza seleccionada/i)).toBeInTheDocument();
    expect(screen.getByTestId('laser-cell-1,0')).toHaveClass('laser-puzzle-task__cell--valid-target');
    expect(Number(screen.getByTestId('event-count').textContent)).toBe(2);
  });

  it('completes all authored levels used by the controlled original battery', async () => {
    const onComplete = vi.fn();
    render(<LaserPuzzlePostulationTask active width={606} height={338} trialCount={3} onGameEvent={vi.fn()} onComplete={onComplete} />);

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
});
