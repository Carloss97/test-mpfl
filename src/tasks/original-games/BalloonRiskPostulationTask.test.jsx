import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BalloonRiskPostulationTask from './BalloonRiskPostulationTask.jsx';

describe('BalloonRiskPostulationTask', () => {
  it('renders compact balloon risk controls with aggregate-only framing', () => {
    const onGameEvent = vi.fn();
    render(<BalloonRiskPostulationTask active width={606} height={338} trialCount={2} onGameEvent={onGameEvent} />);

    expect(screen.getByRole('heading', { name: /Globo de riesgo/i })).toBeInTheDocument();
    expect(screen.getByText(/Infla para acumular puntos y decide cuándo asegurar/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Inflar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Asegurar puntos/i })).toBeInTheDocument();
    expect(onGameEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'game_start', gameId: 'balloon_risk' }));
    expect(onGameEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'stimulus_shown', gameId: 'balloon_risk' }));
  });

  it('allows cashing out rounds and emits aggregate-only completion telemetry', () => {
    const onGameEvent = vi.fn();
    const onComplete = vi.fn();
    render(<BalloonRiskPostulationTask active width={606} height={338} trialCount={2} onGameEvent={onGameEvent} onComplete={onComplete} />);

    fireEvent.click(screen.getByRole('button', { name: /Inflar/i }));
    fireEvent.click(screen.getByRole('button', { name: /Inflar/i }));
    fireEvent.click(screen.getByRole('button', { name: /Asegurar puntos/i }));
    fireEvent.click(screen.getByRole('button', { name: /Inflar/i }));
    fireEvent.click(screen.getByRole('button', { name: /Asegurar puntos/i }));

    expect(screen.getByTestId('balloon-risk-finished')).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
      gameId: 'balloon_risk',
      completed: true,
      roundsCompleted: 2,
      cashoutCount: 2,
      aggregateOnly: true,
    }));

    const responseEvents = onGameEvent.mock.calls.map(([event]) => event).filter((event) => event.eventType === 'response');
    expect(responseEvents).toHaveLength(2);
    expect(responseEvents.at(-1).response.balloonRisk).toEqual(expect.objectContaining({ cashoutCount: 2, roundsCompleted: 2 }));
    expect(JSON.stringify(responseEvents)).not.toMatch(/rawGameEvents|clickTrace|pointerSamples|pumpSequence/i);
  });
});
