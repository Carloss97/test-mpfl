import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TangramPostulationTask from './TangramPostulationTask.jsx';
import { FORBIDDEN_TANGRAM_FIELDS } from './tangramTelemetry.js';

function renderTangram(props = {}) {
  return render(
    <TangramPostulationTask
      active
      onGameEvent={vi.fn()}
      onComplete={vi.fn()}
      {...props}
    />,
  );
}

function startTutorial() {
  fireEvent.click(screen.getByTestId('tangram-start-tutorial'));
}

function piecePath(i) {
  return document.querySelector(`[data-testid="tangram-piece-${i}"] path`);
}

function snapFreePiece(slotTestId) {
  // la primera pieza libre siempre es tangram-piece-1 (los indices se renumeran al encajar)
  fireEvent.click(screen.getByTestId('tangram-piece-1'));
  // el handler de snap vive en el <path> visible (el testid está en el <g>)
  const slotG = document.querySelector(`[data-testid="${slotTestId}"]`);
  fireEvent.click(slotG.querySelector('path'));
}

describe('TangramPostulationTask (EXP-001, componente)', () => {
  it('muestra el onboarding de bienvenida y entra a la práctica', () => {
    renderTangram();
    expect(screen.getByTestId('tangram-welcome')).toBeInTheDocument();
    expect(screen.getByText(/Iniciar Tutorial de Práctica/i)).toBeInTheDocument();
    expect(screen.getByText(/rotar/i)).toBeInTheDocument();

    startTutorial();
    expect(screen.getByTestId('tangram-canvas')).toBeInTheDocument();
    expect(screen.getByText(/Encaja todas las piezas para cerrar la práctica/i)).toBeInTheDocument();
    // tutorial: 2 piezas en bandeja, 2 slots tri_large
    expect(screen.getByTestId('tangram-piece-1')).toBeInTheDocument();
    expect(screen.getByTestId('tangram-piece-2')).toBeInTheDocument();
    expect(screen.getByTestId('tangram-slot-tri_large-0')).toBeInTheDocument();
    expect(screen.getByTestId('tangram-slot-tri_large-1')).toBeInTheDocument();
  });

  it('regresión: la rotación funciona durante la práctica (botón y teclado Espacio)', () => {
    renderTangram();
    startTutorial();

    fireEvent.click(screen.getByTestId('tangram-piece-1'));
    expect(screen.getByTestId('tangram-piece-1')).toHaveClass('tangram-piece--selected');

    const before = piecePath(1).getAttribute('d');
    fireEvent.click(screen.getByTestId('tangram-rotate-btn'));
    const afterBtn = piecePath(1).getAttribute('d');
    expect(afterBtn).not.toBe(before);

    const canvas = screen.getByTestId('tangram-canvas');
    fireEvent.keyDown(canvas, { key: ' ' });
    const afterKey = piecePath(1).getAttribute('d');
    expect(afterKey).not.toBe(afterBtn);

    // Q deselecciona
    fireEvent.keyDown(canvas, { key: 'q' });
    expect(screen.getByTestId('tangram-piece-1')).not.toHaveClass('tangram-piece--selected');
  });

  it('regresión: completar la práctica (2/2 piezas) avanza a la transición evaluativa', async () => {
    renderTangram();
    startTutorial();

    snapFreePiece('tangram-slot-tri_large-0');
    expect(screen.getByTestId('tangram-coverage')).toHaveTextContent('50');
    snapFreePiece('tangram-slot-tri_large-1');
    expect(screen.getByTestId('tangram-coverage')).toHaveTextContent('100');

    // la transición llega tras el timeout de salida (~1400ms)
    await waitFor(() => {
      expect(screen.getByTestId('tangram-transition')).toBeInTheDocument();
    }, { timeout: 2500 });

    // iniciar evaluación -> nivel 1 con 4 slots
    fireEvent.click(screen.getByTestId('tangram-start-eval'));
    expect(screen.getByTestId('tangram-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('tangram-slot-tri_medium-3')).toBeInTheDocument();
    expect(screen.queryByTestId('tangram-transition')).not.toBeInTheDocument();
  });

  it('emite response agregado (privacy-safe) al completar un nivel de práctica', async () => {
    const onGameEvent = vi.fn();
    renderTangram({ onGameEvent });
    startTutorial();
    snapFreePiece('tangram-slot-tri_large-0');
    snapFreePiece('tangram-slot-tri_large-1');

    await waitFor(() => {
      expect(screen.getByTestId('tangram-transition')).toBeInTheDocument();
    }, { timeout: 2500 });

    const responses = onGameEvent.mock.calls.map(([e]) => e).filter((e) => e.eventType === 'response');
    expect(responses.length).toBeGreaterThan(0);
    const payloadJson = JSON.stringify(responses);
    // agregados permitidos; sin datos crudos reconstructivos
    expect(payloadJson).not.toMatch(/pointerSamples|rawEvents|trayPosition|dragX|dragY|jitterWindow/i);
  });
});

// Fase evaluativa (R3 — skill krumm-talent-assessment-development #75):
// tests de componente con tiempos reales de transición (fake timers) cubriendo
// entrada a L1 sin skip, timeout, moveLimit, nivel resoluble y payload agregado.
describe('TangramPostulationTask — fase evaluativa (regresión R3)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  // welcome -> tutorial resuelto -> pantalla de transición
  async function playToTransition() {
    startTutorial();
    snapFreePiece('tangram-slot-tri_large-0');
    snapFreePiece('tangram-slot-tri_large-1');
    // el avance a transición llega tras el timeout de salida (~1400ms)
    await act(async () => { vi.advanceTimersByTime(1500); });
    expect(screen.getByTestId('tangram-transition')).toBeInTheDocument();
  }

  it('regresión R3.2: entra a L1 tras la transición SIN auto-skip a L2', async () => {
    vi.useFakeTimers();
    renderTangram();
    await playToTransition();

    fireEvent.click(screen.getByTestId('tangram-start-eval'));
    await act(async () => { vi.advanceTimersByTime(50); });

    expect(screen.getByTestId('tangram-level-label')).toHaveTextContent('Nivel 1 de 4');
    expect(screen.getByTestId('tangram-coverage')).toHaveTextContent('0');
    // >1400ms sin interacción: con el bug de stale levelOutcome pasaba a L2 solo
    await act(async () => { vi.advanceTimersByTime(2200); });
    expect(screen.getByTestId('tangram-level-label')).toHaveTextContent('Nivel 1 de 4');
    expect(screen.getByTestId('tangram-coverage')).toHaveTextContent('0');
    expect(screen.queryByTestId('tangram-outcome')).not.toBeInTheDocument();
  });

  it('regresión R3.3: timeout en L1 produce outcome + avance a L2 (sin hang)', async () => {
    vi.useFakeTimers();
    renderTangram();
    await playToTransition();

    fireEvent.click(screen.getByTestId('tangram-start-eval'));
    // L1: 60s límite; sin interacción -> secondsLeft llega a 0
    await act(async () => { vi.advanceTimersByTime(60_500); });

    expect(screen.getByTestId('tangram-outcome')).toHaveTextContent(/Tiempo Agotado/i);
    expect(screen.getByTestId('tangram-coverage')).toHaveTextContent('0');
    // transición de salida (~1400ms) -> L2
    await act(async () => { vi.advanceTimersByTime(1500); });
    expect(screen.getByTestId('tangram-level-label')).toHaveTextContent('Nivel 2 de 4');
    expect(screen.queryByTestId('tangram-outcome')).not.toBeInTheDocument();
  });

  it('moveLimit agotado en L2 produce moves_exhausted + avance a L3', async () => {
    vi.useFakeTimers();
    renderTangram();
    await playToTransition();

    fireEvent.click(screen.getByTestId('tangram-start-eval'));
    // L1 por timeout (60s) -> L2 (45s, moveLimit 5). Dos act: el avance (+1400ms)
    // se programa al procesarse el outcome, tras el primer advanceTimersByTime.
    await act(async () => { vi.advanceTimersByTime(60_500); });
    await act(async () => { vi.advanceTimersByTime(1_500); });
    expect(screen.getByTestId('tangram-level-label')).toHaveTextContent('Nivel 2 de 4');

    // pieza 1 (tri_large) contra el slot square: intentos denegados consumen movimiento
    fireEvent.click(screen.getByTestId('tangram-piece-1'));
    const wrongSlot = document.querySelector('[data-testid="tangram-slot-square-2"] path');
    for (let i = 0; i < 4; i += 1) {
      fireEvent.click(wrongSlot);
      await act(async () => { vi.advanceTimersByTime(0); });
    }
    // 4 < moveLimit (5): aún no termina el nivel
    expect(screen.queryByTestId('tangram-outcome')).not.toBeInTheDocument();
    fireEvent.click(wrongSlot);
    await act(async () => { vi.advanceTimersByTime(0); });

    expect(screen.getByTestId('tangram-outcome')).toHaveTextContent(/Límite de movimientos/i);
    await act(async () => { vi.advanceTimersByTime(1500); });
    expect(screen.getByTestId('tangram-level-label')).toHaveTextContent('Nivel 3 de 4');
  });

  it('nivel evaluativo resoluble: success + avance (L1 con botones y teclado)', async () => {
    vi.useFakeTimers();
    renderTangram();
    await playToTransition();

    fireEvent.click(screen.getByTestId('tangram-start-eval'));
    await act(async () => { vi.advanceTimersByTime(50); });
    const canvas = screen.getByTestId('tangram-canvas');

    // L1: tri_large x2, square, tri_medium (slot requiere 90°)
    snapFreePiece('tangram-slot-tri_large-0');
    snapFreePiece('tangram-slot-tri_large-1');
    expect(screen.getByTestId('tangram-coverage')).toHaveTextContent('50');

    // square por teclado: '1' = 1a pieza libre, Enter = primer slot libre COMPATIBLE (R4)
    fireEvent.keyDown(canvas, { key: '1' });
    fireEvent.keyDown(canvas, { key: 'Enter' });
    expect(screen.getByTestId('tangram-coverage')).toHaveTextContent('75');

    // tri_medium: rotar 2x45° y encajar con clic
    fireEvent.click(screen.getByTestId('tangram-piece-1'));
    fireEvent.click(screen.getByTestId('tangram-rotate-btn'));
    fireEvent.click(screen.getByTestId('tangram-rotate-btn'));
    fireEvent.click(document.querySelector('[data-testid="tangram-slot-tri_medium-3"] path'));
    expect(screen.getByTestId('tangram-coverage')).toHaveTextContent('100');
    expect(screen.getByTestId('tangram-outcome')).toHaveTextContent(/Figura Completada/i);

    await act(async () => { vi.advanceTimersByTime(1500); });
    expect(screen.getByTestId('tangram-level-label')).toHaveTextContent('Nivel 2 de 4');
  });

  it('payload de evaluación: solo agregados allowlist, sin campos crudos ni prohibidos', async () => {
    vi.useFakeTimers();
    const onGameEvent = vi.fn();
    renderTangram({ onGameEvent });
    await playToTransition();

    fireEvent.click(screen.getByTestId('tangram-start-eval'));
    await act(async () => { vi.advanceTimersByTime(60_500); }); // L1 -> timeout

    const responses = onGameEvent.mock.calls.map(([e]) => e).filter((e) => e.eventType === 'response');
    // tutorial (L0) + evaluación (L1)
    expect(responses).toHaveLength(2);
    const evalResponse = responses.find((e) => e.trialId === 'tangram_level_1');
    expect(evalResponse).toBeTruthy();
    expect(evalResponse.response.timedOut).toBe(true);
    expect(evalResponse.response.completed).toBe(false);
    expect(evalResponse.response.privacySafe).toBe(true);
    expect(evalResponse.response.humanReviewOnly).toBe(true);
    expect(evalResponse.response.aggregateOnly).toBe(true);

    Object.keys(evalResponse.response).forEach((key) => {
      expect(FORBIDDEN_TANGRAM_FIELDS).not.toContain(key);
      const value = evalResponse.response[key];
      expect(['number', 'boolean', 'string']).toContain(typeof value);
    });
    // sin trazas reconstructivas en toda la emisión
    expect(JSON.stringify(responses)).not.toMatch(/pointerSamples|rawPositions|trayPosition|dragX|dragY|snapTrace|pieceTrace/i);
  });
});
