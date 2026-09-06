import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GameMicroIntro, { listMicroIntroSteps } from './GameMicroIntro.jsx';

function t(es, _en) {
  return es;
}

describe('GameMicroIntro (W3 animated micro-instructions, ≤15s, skippable)', () => {
  it('lists exactly 3 bilingual steps for every original game', () => {
    ['laser_puzzle', 'balloon_risk', 'passenger_routes', 'team_coordination'].forEach((gameId) => {
      const steps = listMicroIntroSteps(gameId);
      expect(steps?.length).toBe(3);
      steps.forEach((step) => {
        expect(step.title.length).toBeGreaterThan(3);
        expect(step.text.length).toBeGreaterThan(3);
        expect(step.en.title).toBeTruthy();
        expect(step.en.text).toBeTruthy();
      });
    });
    expect(listMicroIntroSteps('unknown_game')).toBeNull();
  });

  it('walks steps with Next/Back and finishes with Start', () => {
    const onDone = vi.fn();
    render(<GameMicroIntro gameId="balloon_risk" t={t} onDone={onDone} />);
    expect(onDone).not.toHaveBeenCalled();
    expect(screen.getByTestId('game-micro-intro')).toHaveTextContent(/Infla para sumar puntos/i);
    expect(screen.queryByRole('button', { name: /Atrás/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));
    expect(screen.getByTestId('game-micro-intro')).toHaveTextContent(/Asegura cuando quieras/i);
    fireEvent.click(screen.getByRole('button', { name: /Atrás/i }));
    expect(screen.getByTestId('game-micro-intro')).toHaveTextContent(/Infla para sumar puntos/i);
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));
    expect(screen.getByTestId('game-micro-intro')).toHaveTextContent(/Cuidado con la tensión/i);
    expect(screen.queryByRole('button', { name: /Siguiente/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Comenzar/i }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('can be skipped at any point without walking the steps', () => {
    const onDone = vi.fn();
    render(<GameMicroIntro gameId="laser_puzzle" t={t} onDone={onDone} />);
    fireEvent.click(screen.getByRole('button', { name: /Saltar/i }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('renders nothing for unknown games (no blocking overlay)', () => {
    const onDone = vi.fn();
    const { container } = render(<GameMicroIntro gameId="unknown_game" t={t} onDone={onDone} />);
    expect(container.firstChild).toBeNull();
    expect(onDone).not.toHaveBeenCalled();
  });
});
