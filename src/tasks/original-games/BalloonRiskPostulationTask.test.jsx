import React, { act } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BalloonRiskPostulationTask from './BalloonRiskPostulationTask.jsx';
import { LanguageProvider } from '../../i18n/LanguageContext.jsx';

function renderWithLanguage(ui) {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

function skipIntro() {
  fireEvent.click(screen.getByRole('button', { name: /Saltar/i }));
}

describe('BalloonRiskPostulationTask', () => {
  it('marks the finished aggregate as practice/preview when mounted in practice mode (G.2)', () => {
    const onComplete = vi.fn();
    renderWithLanguage(<BalloonRiskPostulationTask active width={606} height={338} trialCount={2} practice popFxMs={0} cashoutFxMs={0} onGameEvent={vi.fn()} onComplete={onComplete} />);

    skipIntro();
    fireEvent.click(screen.getByRole('button', { name: /Inflar/i }));
    fireEvent.click(screen.getByRole('button', { name: /Asegurar puntos/i }));
    fireEvent.click(screen.getByRole('button', { name: /Inflar/i }));
    fireEvent.click(screen.getByRole('button', { name: /Asegurar puntos/i }));

    expect(screen.getByTestId('balloon-risk-finished')).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
      gameId: 'balloon_risk',
      practice: true,
      preview: true,
      is_tutorial: true,
      practiceGameId: 'balloon_risk',
    }));
    const summary = onComplete.mock.calls.at(-1)[0];
    expect(JSON.stringify(summary)).not.toMatch(/rawPointerPath|pointerSamples|rawGameEvents/i);
  });

  it('renders the balloon risk task with Spanish copy and emits game_event_v1', () => {
    const onGameEvent = vi.fn();
    renderWithLanguage(<BalloonRiskPostulationTask active width={606} height={338} trialCount={2} onGameEvent={onGameEvent} />);

    skipIntro();
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
    renderWithLanguage(<BalloonRiskPostulationTask active width={606} height={338} trialCount={2} popFxMs={0} cashoutFxMs={0} onGameEvent={onGameEvent} onComplete={onComplete} />);

    skipIntro();
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
      score: 0.16,
      riskEfficiency: 0.16,
      aggregateOnly: true,
    }));

    const responseEvents = onGameEvent.mock.calls.map(([event]) => event).filter((event) => event.eventType === 'response');
    expect(responseEvents).toHaveLength(2);
    expect(responseEvents.at(-1).response.balloonRisk).toEqual(expect.objectContaining({ cashoutCount: 2, roundsCompleted: 2 }));
    expect(JSON.stringify(responseEvents)).not.toMatch(/rawGameEvents|clickTrace|pointerSamples|pumpSequence/i);
  });

  it('shows a pop burst and defers the next round by popFxMs (W2)', () => {
    vi.useFakeTimers();
    try {
      renderWithLanguage(<BalloonRiskPostulationTask active width={606} height={338} trialCount={2} onGameEvent={vi.fn()} />);
      skipIntro();
      // Round 1 threshold is 7 pumps.
      for (let index = 0; index < 7; index += 1) {
        fireEvent.click(screen.getByRole('button', { name: /Inflar/i }));
      }
      expect(screen.getByText('💥')).toBeInTheDocument();
      expect(screen.queryByText(/Ronda 2 de 2/i)).not.toBeInTheDocument();

      act(() => { vi.advanceTimersByTime(900); });
      expect(screen.getByText(/Ronda 2 de 2/i)).toBeInTheDocument();
      expect(document.querySelector('.balloon-risk-task__header .game-pips__dot--popped')).toBeInTheDocument();
      expect(screen.queryByText('💥')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows tension from the second pump onward without revealing thresholds (W2)', () => {
    renderWithLanguage(<BalloonRiskPostulationTask active width={606} height={338} trialCount={1} onGameEvent={vi.fn()} />);
    skipIntro();
    expect(document.querySelector('.balloon-risk-task__balloon-emoji--tense')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Inflar/i }));
    expect(document.querySelector('.balloon-risk-task__balloon-emoji--tense')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Inflar/i }));
    expect(document.querySelector('.balloon-risk-task__balloon-emoji--tense')).toBeInTheDocument();
    // Tension amplitude is driven only by the visible pump count.
    const balloon = document.querySelector('.balloon-risk-task__balloon');
    expect(balloon.style.getPropertyValue('--shake-amp')).toBe('1.6px');
  });

  it('shows the micro-intro before any stimulus and skips it without telemetry (W3)', () => {
    const onGameEvent = vi.fn();
    renderWithLanguage(<BalloonRiskPostulationTask active width={606} height={338} trialCount={1} onGameEvent={onGameEvent} />);
    expect(screen.getByTestId('game-micro-intro')).toBeInTheDocument();
    expect(onGameEvent.mock.calls.filter(([event]) => event.eventType === 'stimulus_shown')).toHaveLength(0);
    skipIntro();
    expect(screen.queryByTestId('game-micro-intro')).not.toBeInTheDocument();
    expect(onGameEvent.mock.calls.filter(([event]) => event.eventType === 'stimulus_shown')).toHaveLength(1);
  });
});