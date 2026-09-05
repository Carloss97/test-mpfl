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

function skipIntro() {
  fireEvent.click(screen.getByRole('button', { name: /Saltar/i }));
}

describe('PassengerRouteOptimizationTask', () => {
  it('marks the finished aggregate as practice/preview when mounted in practice mode (G.2)', () => {
    const onComplete = vi.fn();
    render(
      <PassengerRouteOptimizationTask active width={606} height={338} trialCount={1} practice onGameEvent={vi.fn()} onComplete={onComplete} />,
    );
    skipIntro();
    completeIntroRoute();
    expect(screen.getByTestId('passenger-route-finished')).toBeInTheDocument();
    const summary = onComplete.mock.calls.at(-1)[0];
    expect(summary).toMatchObject({
      gameId: 'passenger_routes',
      practice: true,
      preview: true,
      is_tutorial: true,
      practiceGameId: 'passenger_routes',
    });
    expect(JSON.stringify(summary)).not.toMatch(/fullRoute|routeTrace|pointerSamples|rawGameEvents/i);
  });

  it('supports vehicle movement via keyboard arrows and replan R hint (G.5 / G1-P01)', () => {
    const onGameEvent = vi.fn();
    render(
      <PassengerRouteOptimizationTask
        active
        width={606}
        height={338}
        onGameEvent={onGameEvent}
      />
    );
    skipIntro();
    const board = screen.getByLabelText(/Central de movilidad/i);
    board.focus();
    const before = Number(screen.getByTestId('passenger-route-player').dataset.playerX);
    fireEvent.keyDown(board, { key: 'ArrowRight' });
    const after = Number(screen.getByTestId('passenger-route-player').dataset.playerX);
    // ArrowRight physically moves the vehicle token one column to the right.
    expect(after).toBe(before + 1);
    // The visible keyboard hint (GAME_KEYBOARD.passenger) renders.
    expect(screen.getByText(/Teclado: ← ↑ → ↓ mover/i)).toBeInTheDocument();
    // No raw pointer/noisy telemetry was emitted for a plain move.
    expect(JSON.stringify(onGameEvent.mock.calls.map(([e]) => e))).not.toMatch(/pointerSamples|fullRoute|routeTrace/i);
  });

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
    expect(screen.getByText(/Reserva de la ruta óptima/i)).toBeInTheDocument();
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
    skipIntro();
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

    skipIntro();
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

    skipIntro();
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

    skipIntro();
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

  it('moves an animated vehicle token and marks delivered destinations (W2)', async () => {
    const onGameEvent = vi.fn();
    render(
      <PassengerRouteOptimizationTask
        active
        width={606}
        height={338}
        trialCount={2}
        onGameEvent={onGameEvent}
      />,
    );

    const token = screen.getByTestId('passenger-route-player');
    expect(token).toHaveTextContent('🚐');
    expect(token.dataset.playerX).toBe('1');
    expect(token.dataset.playerY).toBe('4');

    skipIntro();
    // Intro route: pick up A at (2,4), deliver at (5,1).
    completeIntroRoute();

    // Circuit toast floats over the next board while circuit 2 begins.
    expect(await screen.findByText(/Circuito 1 completado/i)).toBeInTheDocument();
    expect(await screen.findByText(/Circuito 2 de 2/i)).toBeInTheDocument();

    // Circuit 2: pick up A (2,5) and deliver to (6,4) — B still waiting.
    move('Derecha', 5);
    move('Arriba');

    const deliveredFlag = screen.getByLabelText(/Destino A/i);
    expect(deliveredFlag).toHaveClass('passenger-route-task__destination--delivered');
    expect(deliveredFlag).toHaveTextContent('✓ A');
    // The token follows the vehicle, not the cell.
    const tokenAfter = screen.getByTestId('passenger-route-player');
    expect(tokenAfter.dataset.playerX).toBe('6');
    expect(tokenAfter.dataset.playerY).toBe('4');
  });

  it('shows the micro-intro before any stimulus and skips it without telemetry (W3)', () => {
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
    expect(screen.getByTestId('game-micro-intro')).toBeInTheDocument();
    expect(onGameEvent.mock.calls.filter(([event]) => event.eventType === 'stimulus_shown')).toHaveLength(0);
    skipIntro();
    expect(screen.queryByTestId('game-micro-intro')).not.toBeInTheDocument();
    expect(onGameEvent.mock.calls.filter(([event]) => event.eventType === 'stimulus_shown')).toHaveLength(1);
  });
});
