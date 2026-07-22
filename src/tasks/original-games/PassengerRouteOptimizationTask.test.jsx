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

    expect(screen.getByRole('heading', { name: /Central de movilidad/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Misión de movilidad/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Barrio Luz/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Reserva al finalizar/i)).toBeInTheDocument();
    expect(screen.getByText(/4 de energía/i)).toBeInTheDocument();
    expect(screen.getAllByText(/No obligatoria/i).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/Energía 14 de 14/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Pasajero A esperando/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Destino A/i)).toBeInTheDocument();
    expect(screen.getByText(/Esperando · entregar en ⚑ A/i)).toBeInTheDocument();
    expect(screen.getByText(/Costo por paso/i)).toBeInTheDocument();
    expect(screen.getByText(/Conduce la unidad/i)).toBeInTheDocument();
    expect(screen.getByText(/Estaciones disponibles/i)).toBeInTheDocument();
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

  it('ends with a clear failed state when the vehicle is stranded without energy', () => {
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

    move('Derecha');
    move('Izquierda');
    move('Derecha');
    move('Izquierda');
    move('Derecha');
    move('Izquierda');
    move('Derecha');
    move('Izquierda');
    move('Derecha');
    move('Izquierda');
    move('Derecha');
    move('Izquierda');
    move('Derecha');
    move('Izquierda');

    expect(screen.getByTestId('passenger-route-failed')).toBeInTheDocument();
    expect(screen.getAllByText(/sin energía/i).length).toBeGreaterThan(0);
    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Reintentar circuito/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Continuar con resultado/i }));
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
      gameId: 'passenger_routes',
      completed: false,
      aggregateOnly: true,
    }));
    const response = onGameEvent.mock.calls.map(([event]) => event).find((event) => event.eventType === 'response' && event.response?.outcome === 'energy_depleted');
    expect(response).toBeDefined();
    expect(JSON.stringify({ response, completion: onComplete.mock.calls })).not.toMatch(FORBIDDEN_ROUTE_FIELDS);
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
    move('Arriba', 3);
    move('Izquierda', 4);
    move('Arriba');

    expect(await screen.findByText(/Circuito 3 de 3/i)).toBeInTheDocument();
    move('Derecha', 6);
    move('Arriba');
    expect(screen.getByText(/presupuesto operativo restaurado/i)).toBeInTheDocument();
    move('Arriba', 2);
    move('Izquierda', 6);
    move('Arriba');

    expect(screen.getByTestId('passenger-route-finished')).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
      gameId: 'passenger_routes',
      completed: true,
      passengersDelivered: 5,
      destinationCount: 5,
      stationUseCount: 1,
      routeEfficiency: 1,
      score: 1,
      aggregateOnly: true,
    }));
  });
});
