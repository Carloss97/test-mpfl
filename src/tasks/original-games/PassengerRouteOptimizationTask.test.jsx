import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PassengerRouteOptimizationTask from './PassengerRouteOptimizationTask.jsx';

const FORBIDDEN_ROUTE_FIELDS = /fullRoute|routeTrace|visitedCells|stepByStepPath|rawPointerPath|pointerSamples|rawGameEvents/i;

function completeIntroRoute() {
  fireEvent.click(screen.getByRole('button', { name: /^Derecha$/i }));
  fireEvent.click(screen.getByRole('button', { name: /^Arriba$/i }));
  fireEvent.click(screen.getByRole('button', { name: /^Arriba$/i }));
  fireEvent.click(screen.getByRole('button', { name: /^Arriba$/i }));
  fireEvent.click(screen.getByRole('button', { name: /^Derecha$/i }));
  fireEvent.click(screen.getByRole('button', { name: /^Derecha$/i }));
  fireEvent.click(screen.getByRole('button', { name: /^Derecha$/i }));
}

function move(direction, count = 1) {
  for (let index = 0; index < count; index += 1) {
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${direction}$`, 'i') }));
  }
}

describe('PassengerRouteOptimizationTask', () => {
  it('renders a compact passenger route board with rethemed constraints and accessible controls', () => {
    const onGameEvent = vi.fn();
    render(
      <PassengerRouteOptimizationTask
        active
        width={606}
        height={338}
        trialCount={1}
        onGameEvent={onGameEvent}
      />,
    );

    expect(screen.getByRole('heading', { name: /Optimización de rutas/i })).toBeInTheDocument();
    expect(screen.getByText(/Recoger un pasajero y llevarlo a su destino/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Presupuesto operativo/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Paradas de apoyo/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Arriba$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Abajo$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Izquierda$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Derecha$/i })).toBeInTheDocument();

    const board = screen.getByTestId('passenger-route-board');
    expect(Number(board.dataset.boardWidth)).toBeLessThanOrEqual(606);
    expect(Number(board.dataset.boardHeight)).toBeLessThanOrEqual(338);
    expect(onGameEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'game_start', gameId: 'passenger_routes' }));
    expect(onGameEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'stimulus_shown', gameId: 'passenger_routes' }));
  });

  it('completes the intro route and emits response/game_end telemetry as aggregate-only data', () => {
    const onGameEvent = vi.fn();
    const onComplete = vi.fn();
    render(
      <PassengerRouteOptimizationTask
        active
        width={606}
        height={338}
        trialCount={1}
        onGameEvent={onGameEvent}
        onComplete={onComplete}
      />,
    );

    completeIntroRoute();

    expect(screen.getByTestId('passenger-route-finished')).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
      gameId: 'passenger_routes',
      completed: true,
      passengersDelivered: 1,
      destinationCount: 1,
      aggregateOnly: true,
    }));

    const events = onGameEvent.mock.calls.map(([event]) => event);
    expect(events.some((event) => event.eventType === 'response')).toBe(true);
    expect(events.some((event) => event.eventType === 'game_end')).toBe(true);
    const response = events.find((event) => event.eventType === 'response');
    expect(response.response).toMatchObject({
      correct: true,
      outcome: 'route_completed',
      passengerRoutes: expect.objectContaining({
        completed: true,
        passengersDelivered: 1,
        destinationCount: 1,
        aggregateOnly: true,
      }),
    });
    expect(JSON.stringify({ events, completion: onComplete.mock.calls })).not.toMatch(FORBIDDEN_ROUTE_FIELDS);
  });

  it('completes all configured circuits through physical support stops', async () => {
    const onComplete = vi.fn();
    render(
      <PassengerRouteOptimizationTask
        active
        width={606}
        height={338}
        trialCount={3}
        onGameEvent={vi.fn()}
        onComplete={onComplete}
      />,
    );

    completeIntroRoute();
    expect(await screen.findByText(/Circuito 2 de 3/i)).toBeInTheDocument();

    move('Derecha', 5);
    move('Arriba');
    move('Izquierda', 2);
    expect(screen.getByText(/presupuesto operativo restaurado/i)).toBeInTheDocument();
    move('Derecha');
    move('Arriba', 3);
    move('Izquierda', 4);

    expect(await screen.findByText(/Circuito 3 de 3/i)).toBeInTheDocument();
    move('Derecha', 4);
    expect(screen.getByText(/presupuesto operativo restaurado/i)).toBeInTheDocument();
    move('Derecha', 2);
    move('Arriba', 2);
    move('Izquierda', 3);
    expect(screen.getByText(/presupuesto operativo restaurado/i)).toBeInTheDocument();
    move('Izquierda', 3);
    move('Arriba', 2);

    expect(screen.getByTestId('passenger-route-finished')).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
      gameId: 'passenger_routes',
      completed: true,
      passengersDelivered: 5,
      destinationCount: 5,
      stationUseCount: 3,
      routeEfficiency: 1,
      score: 1,
      aggregateOnly: true,
    }));
  });
});
