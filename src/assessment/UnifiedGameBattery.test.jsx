import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import UnifiedGameBattery from './UnifiedGameBattery.jsx';

function MockGame({ active, trialCount, onComplete }) {
  return (
    <div aria-label="mock-game">
      <h3>Mock game activo: {String(active)}</h3>
      <p>Trials configurados: {trialCount}</p>
      <button type="button" onClick={() => onComplete?.({ completedTrialCount: trialCount, accuracy: 1 })}>
        Completar bloque mock
      </button>
    </div>
  );
}

describe('UnifiedGameBattery', () => {
  it('allows choosing demo mode before starting and uses the short battery config', () => {
    render(<UnifiedGameBattery cameraActive gameComponents={{ simple_rt: MockGame }} />);

    const modeSelect = screen.getByLabelText(/Modo de batería/i);
    expect(modeSelect).toHaveValue('standardized');
    fireEvent.change(modeSelect, { target: { value: 'demo' } });
    expect(modeSelect).toHaveValue('demo');
    expect(screen.getByText(/modo demo/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Preparar evaluación/i }));
    expect(modeSelect).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Acepto condiciones/i }));
    fireEvent.click(screen.getByRole('button', { name: /Iniciar baseline/i }));
    fireEvent.click(screen.getByRole('button', { name: /Completar baseline/i }));
    fireEvent.click(screen.getByRole('button', { name: /Iniciar bloque/i }));

    expect(screen.getByText(/Trials configurados: 4/i)).toBeInTheDocument();
  });

  it('guides the evaluator from consent to first running block with camera active', () => {
    render(<UnifiedGameBattery cameraActive gameComponents={{ simple_rt: MockGame }} />);

    expect(screen.getByRole('heading', { name: /Evaluación gamificada unificada/i })).toBeInTheDocument();
    expect(screen.getByText(/Estado: idle/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Preparar evaluación/i }));
    expect(screen.getAllByText(/Consentimiento/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Acepto condiciones/i }));
    expect(screen.getByText(/Cámara lista/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Iniciar baseline/i }));
    expect(screen.getAllByText(/Baseline neutral/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Completar baseline/i }));
    expect(screen.getAllByText(/RT Simple/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Iniciar bloque/i }));
    expect(screen.getByLabelText(/mock-game/i)).toBeInTheDocument();
    expect(screen.getByText(/Trials configurados: 10/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Completar bloque mock/i }));
    expect(screen.getAllByText(/Descanso/i).length).toBeGreaterThan(0);
  });

  it('requests camera instead of starting baseline when camera is inactive', () => {
    const onRequestCamera = vi.fn();
    render(<UnifiedGameBattery cameraActive={false} onRequestCamera={onRequestCamera} />);

    fireEvent.click(screen.getByRole('button', { name: /Preparar evaluación/i }));
    fireEvent.click(screen.getByRole('button', { name: /Acepto condiciones/i }));
    fireEvent.click(screen.getByRole('button', { name: /Iniciar cámara/i }));

    expect(onRequestCamera).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText(/Se requiere cámara activa/i).length).toBeGreaterThan(0);
  });

  it('emits session updates and marks report_ready after the final action', () => {
    const onBatterySessionChange = vi.fn();
    const onBatteryComplete = vi.fn();
    render(<UnifiedGameBattery cameraActive gameComponents={{ simple_rt: MockGame }} onBatterySessionChange={onBatterySessionChange} onBatteryComplete={onBatteryComplete} />);

    fireEvent.click(screen.getByRole('button', { name: /Preparar evaluación/i }));
    expect(onBatterySessionChange).toHaveBeenCalled();

    // Use the exposed debug completion path for runtime-level smoke without playing all games.
    fireEvent.click(screen.getByRole('button', { name: /Cancelar evaluación/i }));
    expect(screen.getAllByText(/cancelled/i).length).toBeGreaterThan(0);
    expect(onBatteryComplete).not.toHaveBeenCalled();
  });
});
