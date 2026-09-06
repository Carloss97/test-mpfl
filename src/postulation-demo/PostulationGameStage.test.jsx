import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PostulationGameStage, { getPostulationGameViewport } from './PostulationGameStage.jsx';
import { buildOriginalGamePostulationBlocks } from './originalGameBlueprints.js';

function MockGame({ active, block, onComplete, onGameEvent }) {
  React.useEffect(() => {
    onGameEvent?.({ type: 'game_event_v1', eventType: 'game_start', gameId: block.gameId, timestamp: performance.now() });
  }, [block.gameId, onGameEvent]);
  return (
    <div aria-label={`mock-${block.gameId}`}>
      <p>Mock activo: {String(active)}</p>
      <p>Juego actual: {block.label}</p>
      <button type="button" onClick={() => {
        onGameEvent?.({ type: 'game_event_v1', eventType: 'game_end', gameId: block.gameId, timestamp: performance.now() });
        onComplete?.({ gameId: block.gameId, completedTrialCount: 2, accuracy: 0.9 });
      }}>
        Completar {block.gameId}
      </button>
    </div>
  );
}

function MockTrackingGame({ block, practice, onGameEvent, onComplete }) {
  React.useEffect(() => {
    onGameEvent?.({ type: 'game_event_v1', eventType: 'game_start', gameId: block.gameId, practice: practice === true, timestamp: performance.now() });
  }, [block.gameId, onGameEvent, practice]);
  return (
    <div aria-label={`track-${block.gameId}`} data-practice={String(practice === true)}>
      <button type="button" onClick={() => onComplete?.({ gameId: block.gameId, score: 0.9, practice: practice === true, preview: practice === true })}>
        Done {block.gameId}
      </button>
    </div>
  );
}

const BLOCKS = Object.freeze([
  Object.freeze({ gameId: 'precision_targeting', label: 'Precisión visomotora', skill: 'visuomotor_precision', phase: 'postulation_demo', durationLabel: '1 min' }),
  Object.freeze({ gameId: 'go_nogo', label: 'Control inhibitorio', skill: 'inhibitory_control', phase: 'postulation_demo', durationLabel: '1 min' }),
]);

describe('PostulationGameStage', () => {
  it('computes compact game viewport dimensions for low-height manual QA screens', () => {
    expect(getPostulationGameViewport({ width: 1366, height: 768 })).toMatchObject({
      width: expect.any(Number),
      height: expect.any(Number),
      compact: true,
    });
    const compact = getPostulationGameViewport({ width: 1366, height: 768 });
    expect(compact.width).toBeLessThanOrEqual(620);
    expect(compact.height).toBeLessThanOrEqual(340);

    const small = getPostulationGameViewport({ width: 1280, height: 720 });
    expect(small.width).toBeLessThanOrEqual(580);
    expect(small.height).toBeLessThanOrEqual(300);
  });

  it('never overflows available width across the 760–768 breakpoint band (G.5 / G1-P05)', () => {
    // The CSS mobile media query flips at 768px; the stage must stay within the
    // container for every width 760..768 so there is no horizontal overflow.
    for (let width = 760; width <= 768; width += 1) {
      const viewport = getPostulationGameViewport({ width, height: 720 });
      expect(viewport.width).toBeGreaterThan(0);
      expect(viewport.width).toBeLessThanOrEqual(width);
      expect(viewport.compact).toBe(true);
    }
  });

  it('renders a fullscreen game stage with progress and advances through blocks', () => {
    const onCompleteDemo = vi.fn();
    const onGameEvent = vi.fn();
    render(
      <PostulationGameStage
        blocks={BLOCKS}
        gameComponents={{ precision_targeting: MockGame, go_nogo: MockGame }}
        onGameEvent={onGameEvent}
        onCompleteDemo={onCompleteDemo}
      />,
    );

    expect(screen.getByRole('heading', { name: /Precisión visomotora/i })).toBeInTheDocument();
    expect(screen.getByText(/Juego 1 de 2/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mock-precision_targeting/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Completar precision_targeting/i }));
    expect(screen.getByRole('heading', { name: /Control inhibitorio/i })).toBeInTheDocument();
    expect(screen.getByText(/Juego 2 de 2/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Completar go_nogo/i }));
    expect(onCompleteDemo).toHaveBeenCalledWith(expect.objectContaining({ completedCount: 2, totalCount: 2 }));
    const events = onGameEvent.mock.calls.map(([event]) => event);
    expect(events.filter((event) => event.eventType === 'game_start' && event.gameId === 'precision_targeting')).toHaveLength(1);
    expect(events.filter((event) => event.eventType === 'game_end' && event.gameId === 'go_nogo')).toHaveLength(1);
  });

  it('can render the planned Laser original game block through the default component map', () => {
    const laserBlock = buildOriginalGamePostulationBlocks().find((block) => block.gameId === 'laser_puzzle');
    render(<PostulationGameStage blocks={[{ ...laserBlock, visible: true, trialCount: 1 }]} onGameEvent={vi.fn()} />);

    expect(screen.getAllByRole('heading', { name: /Puzzle láser/i })).toHaveLength(2);
    expect(screen.getByText(/Reconstruye una órbita de cuatro reflectores/i)).toBeInTheDocument();
  });

  it('can render the planned Balloon original game block through the default component map', () => {
    const balloonBlock = buildOriginalGamePostulationBlocks().find((block) => block.gameId === 'balloon_risk');
    render(<PostulationGameStage blocks={[{ ...balloonBlock, visible: true, trialCount: 2 }]} onGameEvent={vi.fn()} />);

    expect(screen.getAllByRole('heading', { name: /Globo de riesgo/i })).toHaveLength(2);
    expect(screen.getByText(/Infla para acumular puntos/i)).toBeInTheDocument();
  });

  it('can render the hidden Passenger Routes block through the default component map', () => {
    const passengerBlock = buildOriginalGamePostulationBlocks().find((block) => block.gameId === 'passenger_routes');
    render(<PostulationGameStage blocks={[{ ...passengerBlock, visible: true, trialCount: 1 }]} onGameEvent={vi.fn()} />);

    expect(screen.getByRole('heading', { name: /Optimización de rutas/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Central de movilidad/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Barrio Luz/i).length).toBeGreaterThan(0);
    expect(screen.getByTestId('passenger-route-board')).toBeInTheDocument();
  });

  it('can render the team coordination completion probe through the default component map', () => {
    const teamBlock = buildOriginalGamePostulationBlocks().find((block) => block.gameId === 'team_coordination');
    render(<PostulationGameStage blocks={[{ ...teamBlock, visible: true, trialCount: 1 }]} onGameEvent={vi.fn()} />);

    expect(screen.getAllByRole('heading', { name: /Operación Faro/i })).toHaveLength(2);
    expect(screen.getByText(/Trabajo por detrás/i)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('toggles game sound effects without emitting any telemetry (W2)', () => {
    const onGameEvent = vi.fn();
    render(
      <PostulationGameStage
        blocks={BLOCKS}
        gameComponents={{ precision_targeting: MockGame, go_nogo: MockGame }}
        onGameEvent={onGameEvent}
      />,
    );

    const eventsBefore = onGameEvent.mock.calls.length;
    const toggle = screen.getByTestId('sfx-toggle');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(toggle).toHaveTextContent('🔇');

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(toggle).toHaveTextContent('🔊');
    expect(toggle).toHaveAttribute('aria-label', 'Efectos de sonido: activados');

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    // The toggle must never generate game events.
    expect(onGameEvent.mock.calls.length).toBe(eventsBefore);
  });

  it('passes the practice flag from the block to the game component (G.2)', () => {
    const onCompleteDemo = vi.fn();
    const onGameEvent = vi.fn();
    const practiceBlocks = [
      Object.freeze({ ...BLOCKS[0], practice: true }),
      Object.freeze({ ...BLOCKS[1] }),
    ];
    render(
      <PostulationGameStage
        blocks={practiceBlocks}
        gameComponents={{ precision_targeting: MockTrackingGame, go_nogo: MockTrackingGame }}
        onGameEvent={onGameEvent}
        onCompleteDemo={onCompleteDemo}
      />,
    );

    // Practice block receives practice=true.
    expect(screen.getByLabelText(/track-precision_targeting/i)).toHaveAttribute('data-practice', 'true');
    fireEvent.click(screen.getByRole('button', { name: /Done precision_targeting/i }));

    // Next (evaluative) block receives practice=false and the flow advances.
    expect(screen.getByLabelText(/track-go_nogo/i)).toHaveAttribute('data-practice', 'false');
    fireEvent.click(screen.getByRole('button', { name: /Done go_nogo/i }));
    expect(onCompleteDemo).toHaveBeenCalledWith(expect.objectContaining({ completedCount: 2 }));

    const practiceEvents = onGameEvent.mock.calls.map(([event]) => event).filter((event) => event.gameId === 'precision_targeting');
    expect(practiceEvents.some((event) => event.practice === true)).toBe(true);
  });
});
