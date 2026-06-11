import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Dashboard from './Dashboard.jsx';

vi.mock('./FaceMeshOverlayWrapper.jsx', () => ({
  default: () => <div data-testid="mesh-overlay" />,
}));

const baseTelemetry = {
  sampleCount: 48,
  recentCount: 30,
  facePresenceRatio: 0.87,
  meanConfidence: 0.76,
  fpsEstimate: 12.4,
  insights: {},
};

const baseProps = {
  videoRef: { current: null },
  isCameraActive: true,
  showMesh: true,
  setShowMesh: vi.fn(),
  telemetry: baseTelemetry,
  faceWorker: { status: 'ready', delegate: 'CPU', error: null },
  moveNet: { status: 'ready', error: null },
  statusClassName: 'ready',
  lastQuality: { faceCount: 1, confidence: 0.76, landmarkCompleteness: 0.98, blendshapeCompleteness: 0.92 },
  calibrationProfile: { eligible: true },
  calStatusLabel: 'Baseline válido',
  insightItems: [
    { id: 'attention', label: 'Atención', value: 0.72 },
    { id: 'fatigue', label: 'Fatiga', value: 0.18 },
  ],
  auEntries: [['AU12', { intensity: 0.34, label: 'Lip Corner Puller' }]],
  activeAUCount: 1,
  edgeAIResult: {
    emotions: { dominant: 'happiness', dominantScore: 0.62, probabilities: { happiness: 0.62, neutral: 0.2 } },
    confidence: { captureQuality: { overallScore: 82, illumination: 'good', occlusion: false } },
    caveats: ['Señales observacionales; no diagnóstico.'],
  },
  edgeChannels: {
    engagement: { score: 73, level: 'high', label: 'Engagement' },
  },
  edgeConfidence: { score: 0.7, level: 'high' },
  edgeComposite: { score: 71, level: 'high' },
  latestLandmarks: new Float32Array(478 * 3),
  latestGaze: { screenX: 0.53, screenY: 0.44, lookingAtScreen: true, confidence: 0.78, calibrationFrames: 60 },
  latestPose: { headTiltDeg: 3.2, headForward: 0.21, asymmetry: 0.09, stability: 0.88, postureScore: 0.82 },
  moveNetPose: { shoulderAngle: 1.4, symmetry: 0.95, confidence: 0.8, upperBodyCoverage: 0.72, armsVisible: 2, armActivity: 0.4 },
  auRegionSummary: { upper: 0.2, mid: 0.1, lower: 0.3 },
  DEVICE_CONFIG: { fpsTarget: 15, mediapipeDelegate: 'CPU' },
};

describe('Dashboard signal visibility', () => {
  it('surfaces posture and MoveNet upper-trunk signals without the removed signal/method panels', () => {
    render(<Dashboard {...baseProps} />);

    expect(screen.queryByText(/Señales en vivo/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Métodos de detección/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Postura corporal/i)).toBeInTheDocument();
    expect(screen.getByText(/Inclinación lateral/i)).toBeInTheDocument();
    expect(screen.getByText(/Inclinación frontal/i)).toBeInTheDocument();
    expect(screen.getByText(/Asimetría/i)).toBeInTheDocument();
    expect(screen.getByText(/Estabilidad/i)).toBeInTheDocument();
    expect(screen.getByText(/Hombros \(MoveNet\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Calibrar mirada centro/i)).toBeInTheDocument();
    expect(screen.getByText(/Calibrar postura erguida/i)).toBeInTheDocument();
    expect(screen.getByText(/brazos visibles 2\/4/i)).toBeInTheDocument();
  });
});
