import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BatteryProgress from './BatteryProgress.jsx';
import BlockInstructionScreen from './BlockInstructionScreen.jsx';
import ConsentCalibrationScreen from './ConsentCalibrationScreen.jsx';
import FinalAssessmentScreen from './FinalAssessmentScreen.jsx';
import ParticipantAssessmentFlow from './ParticipantAssessmentFlow.jsx';

const block = { index: 1, label: 'Precisión visomotora', trialCount: 8, skill: 'visuomotor_precision' };

describe('Participant assessment flow components', () => {
  it('renders a reusable participant flow shell with status and child content', () => {
    render(<ParticipantAssessmentFlow title="Evaluación KRUMM" status="baseline"><p>Contenido guiado</p></ParticipantAssessmentFlow>);
    expect(screen.getByRole('heading', { name: /Evaluación KRUMM/i })).toBeInTheDocument();
    expect(screen.getByText(/Estado: baseline/i)).toBeInTheDocument();
    expect(screen.getByText(/Contenido guiado/i)).toBeInTheDocument();
  });

  it('renders progress with current block and completion ratio', () => {
    render(<BatteryProgress completedBlocks={2} totalBlocks={6} currentBlock={block} state="instructions" />);
    expect(screen.getByText(/Progreso de batería/i)).toBeInTheDocument();
    expect(screen.getAllByText(/2\/6/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Precisión visomotora/i)).toBeInTheDocument();
    expect(screen.getByText(/instructions/i)).toBeInTheDocument();
  });

  it('guides consent, camera check, and baseline states with privacy copy', () => {
    const onAcceptConsent = vi.fn();
    const onRequestCamera = vi.fn();
    const onStartBaseline = vi.fn();
    const onCompleteBaseline = vi.fn();

    const { rerender } = render(<ConsentCalibrationScreen stage="consent" onAcceptConsent={onAcceptConsent} />);
    expect(screen.getByText(/No se guarda video/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Acepto condiciones/i }));
    expect(onAcceptConsent).toHaveBeenCalledTimes(1);

    rerender(<ConsentCalibrationScreen stage="camera_check" cameraActive={false} onRequestCamera={onRequestCamera} />);
    fireEvent.click(screen.getByRole('button', { name: /Iniciar cámara/i }));
    expect(onRequestCamera).toHaveBeenCalledTimes(1);

    rerender(<ConsentCalibrationScreen stage="camera_check" cameraActive onStartBaseline={onStartBaseline} />);
    fireEvent.click(screen.getByRole('button', { name: /Iniciar baseline/i }));
    expect(onStartBaseline).toHaveBeenCalledTimes(1);

    rerender(<ConsentCalibrationScreen stage="baseline" onCompleteBaseline={onCompleteBaseline} />);
    expect(screen.getByText(/mirar al centro/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Completar baseline/i }));
    expect(onCompleteBaseline).toHaveBeenCalledTimes(1);
  });

  it('renders block instructions and exposes start/cancel actions', () => {
    const onStartBlock = vi.fn();
    const onCancel = vi.fn();
    render(<BlockInstructionScreen block={block} totalBlocks={6} onStartBlock={onStartBlock} onCancel={onCancel} />);
    expect(screen.getByRole('heading', { name: /Precisión visomotora/i })).toBeInTheDocument();
    expect(screen.getByText(/Bloque 2 de 6/i)).toBeInTheDocument();
    expect(screen.getByText(/Trials: 8/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Iniciar bloque/i }));
    fireEvent.click(screen.getByRole('button', { name: /Cancelar evaluación/i }));
    expect(onStartBlock).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('renders final actions for completed and report-ready states', () => {
    const onGenerateReport = vi.fn();
    const { rerender } = render(<FinalAssessmentScreen state="completed" onGenerateReport={onGenerateReport} />);
    expect(screen.getByText(/Batería completada/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Generar reporte de batería/i }));
    expect(onGenerateReport).toHaveBeenCalledTimes(1);

    rerender(<FinalAssessmentScreen state="report_ready" />);
    expect(screen.getByText(/Reporte de batería listo/i)).toBeInTheDocument();
  });
});
