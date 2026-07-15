import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PostulationGameStage, { getPostulationGameViewport } from './PostulationGameStage.jsx';

function MockGame({ active, block, onComplete }) {
  return (
    <div aria-label={`mock-${block.gameId}`}>
      <p>Mock activo: {String(active)}</p>
      <p>Juego actual: {block.label}</p>
      <button type="button" onClick={() => onComplete?.({ gameId: block.gameId, completedTrialCount: 2, accuracy: 0.9 })}>
        Completar {block.gameId}
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
    expect(onGameEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'game_start', gameId: 'precision_targeting' }));
    expect(onGameEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'game_end', gameId: 'go_nogo' }));
  });
});
