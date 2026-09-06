import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SignalReadinessPanel, { buildSignalReadinessItems } from './SignalReadinessPanel.jsx';

const READY_SIGNALS = Object.freeze({
  cameraActive: true,
  telemetry: { sampleCount: 72, facePresenceRatio: 0.82, meanConfidence: 0.74 },
  faceWorker: { status: 'ready', delegate: 'GPU' },
  latestGaze: { confidence: 0.72, lookingAtScreen: true },
  latestPose: { postureScore: 0.84 },
  moveNet: { status: 'ready' },
  moveNetPose: { confidence: 0.66, upperBodyCoverage: 0.73, armsVisible: 2 },
  activeAUCount: 5,
});

describe('SignalReadinessPanel', () => {
  it('renders the full signal checklist with OK statuses when demo signals are usable', () => {
    render(<SignalReadinessPanel {...READY_SIGNALS} />);

    expect(screen.getByRole('heading', { name: /Listo de señal/i })).toBeInTheDocument();
    expect(screen.getByText(/Antes del baseline/i)).toBeInTheDocument();
    expect(screen.getByText(/No se guarda video, frames, landmarks crudos ni trayectorias de puntero/i)).toBeInTheDocument();

    for (const label of ['Cámara', 'FaceMesh', 'Rostro', 'Confianza facial', 'AUs/FACS', 'Gaze', 'Postura', 'MoveNet', 'Privacidad']) {
      const row = screen.getByTestId(`readiness-${label}`);
      expect(within(row).getByText(label)).toBeInTheDocument();
      expect(within(row).getByText(/OK/i)).toBeInTheDocument();
    }

    expect(screen.getByText(/82% rostro/i)).toBeInTheDocument();
    expect(screen.getByText(/74% confianza/i)).toBeInTheDocument();
    expect(screen.getByText(/5 AUs activos/i)).toBeInTheDocument();
  });

  it('shows actionable caveats without inventing shoulders or missing data', () => {
    render(
      <SignalReadinessPanel
        cameraActive={false}
        telemetry={{ sampleCount: 0, facePresenceRatio: 0.12, meanConfidence: 0.21 }}
        faceWorker={{ status: 'error', error: 'worker failed' }}
        latestGaze={null}
        latestPose={null}
        moveNet={{ status: 'ready' }}
        moveNetPose={null}
        activeAUCount={0}
      />,
    );

    expect(screen.getByText(/Si MoveNet no detecta hombros/i)).toBeInTheDocument();
    expect(screen.getByText(/La prueba puede continuar con caveats; no se inventan hombros ni datos faltantes/i)).toBeInTheDocument();
    expect(screen.getByText(/sin hombros detectados/i)).toBeInTheDocument();
    expect(within(screen.getByTestId('readiness-Cámara')).getByText(/Pendiente/i)).toBeInTheDocument();
    expect(within(screen.getByTestId('readiness-FaceMesh')).getByText(/Error/i)).toBeInTheDocument();
    expect(within(screen.getByTestId('readiness-MoveNet')).getByText(/Caveat/i)).toBeInTheDocument();
  });

  it('builds stable readiness items for integration without raw telemetry fields', () => {
    const items = buildSignalReadinessItems(READY_SIGNALS);
    expect(items.map((item) => item.label)).toEqual([
      'Cámara',
      'FaceMesh',
      'Rostro',
      'Confianza facial',
      'AUs/FACS',
      'Gaze',
      'Postura',
      'MoveNet',
      'Privacidad',
    ]);
    expect(items.every((item) => ['ok', 'pending', 'warning', 'error'].includes(item.status))).toBe(true);
    expect(JSON.stringify(items)).not.toMatch(/landmarks|frames|video|pointerSamples|rawGameEvents/i);
  });
});
