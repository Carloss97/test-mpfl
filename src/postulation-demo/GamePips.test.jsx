import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import GamePips from './GamePips.jsx';

describe('GamePips — shared progress pips for original games (G.3)', () => {
  it('renders one dot per step and marks done/current', () => {
    render(<GamePips step={1} total={3} />);
    const dots = screen.getAllByTestId('game-pip');
    expect(dots).toHaveLength(3);
    expect(dots[0]).toHaveClass('game-pips__dot--done');
    expect(dots[1]).toHaveClass('game-pips__dot--current');
    expect(dots[2]).not.toHaveClass('game-pips__dot--done');
    expect(dots[2]).not.toHaveClass('game-pips__dot--current');
  });

  it('is aria-hidden (visual only; the text chip keeps the accessible count)', () => {
    render(<GamePips step={0} total={2} />);
    expect(screen.getByTestId('game-pips')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByTestId('game-pips')).toHaveClass('game-pips');
  });

  it('handles zero-total and step-beyond-total without crashing', () => {
    const zero = render(<GamePips step={0} total={0} />);
    expect(zero.container.querySelectorAll('.game-pips__dot')).toHaveLength(0);
    const beyond = render(<GamePips step={5} total={3} />);
    expect(beyond.container.querySelectorAll('.game-pips__dot')).toHaveLength(3);
    expect(beyond.container.querySelectorAll('.game-pips__dot--done')).toHaveLength(3);
  });

  it('accepts a modifier class for theme scoping', () => {
    render(<GamePips step={0} total={2} className="game-pips--compact" />);
    expect(screen.getByTestId('game-pips')).toHaveClass('game-pips--compact');
  });

  it('marks completed pips with per-result states (e.g. balloon cashout vs pop)', () => {
    const { container } = render(<GamePips step={2} total={4} states={['cashout', 'pop']} />);
    const dots = [...container.querySelectorAll('.game-pips__dot')];
    expect(dots[0]).toHaveClass('game-pips__dot--done');
    expect(dots[1]).toHaveClass('game-pips__dot--popped');
    expect(dots[2]).toHaveClass('game-pips__dot--current');
    expect(dots[3]).not.toHaveClass('game-pips__dot--done');
  });
});
