import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GameRuntime from './GameRuntime.jsx';

describe('GameRuntime', () => {
  it('emits game_start when activated and normalizes child-emitted events', () => {
    const onEvent = vi.fn();
    const gameDefinition = { id: 'precision_targeting', label: 'Precisión' };

    render(
      <GameRuntime
        active
        sessionId="session-1"
        gameDefinition={gameDefinition}
        onEvent={onEvent}
        renderTrial={(state, emit) => (
          <button type="button" onClick={() => emit({ eventType: 'stimulus_shown', trialId: 't-1', targetId: 'target-1', stimulus: { kind: 'circle' } })}>
            emit stimulus
          </button>
        )}
      />,
    );

    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'game_event_v1', eventType: 'game_start', gameId: 'precision_targeting', sessionId: 'session-1' }));

    fireEvent.click(screen.getByRole('button', { name: /emit stimulus/i }));

    expect(onEvent).toHaveBeenLastCalledWith(expect.objectContaining({
      type: 'game_event_v1',
      eventType: 'stimulus_shown',
      gameId: 'precision_targeting',
      sessionId: 'session-1',
      trialId: 't-1',
      targetId: 'target-1',
    }));
  });

  it('renders nothing and emits nothing while inactive', () => {
    const onEvent = vi.fn();

    const { container } = render(
      <GameRuntime
        active={false}
        sessionId="session-1"
        gameDefinition={{ id: 'simple_rt', label: 'RT Simple' }}
        onEvent={onEvent}
        renderTrial={() => <div>Should not render</div>}
      />,
    );

    expect(container).toBeEmptyDOMElement();
    expect(onEvent).not.toHaveBeenCalled();
  });
});
