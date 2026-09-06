import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TangramPostulationTask from './TangramPostulationTask.jsx';

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
