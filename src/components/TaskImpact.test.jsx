import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TaskImpact from './TaskImpact.jsx';

const edgeAIResult = {
  channels: {
    taskPerformance: { label: 'Rendimiento', score: 82, source: 'game_telemetry' },
    motorControl: { label: 'Control Motor', score: 74, gameAdjusted: true },
  },
  emotions: { dominant: 'neutral', dominantScore: 0.6 },
  composite: { score: 70, level: 'high' },
  confidence: { captureQuality: { overallScore: 80 } },
};

const gameSummary = {
  eventCount: 6,
  performance: { accuracy: 0.8, meanReactionTimeMs: 420 },
  motor: { pathEfficiencyMean: 0.76, smoothPursuitScore: 0.7 },
  inhibition: { commissionErrorRate: 0.1 },
  interference: { errorRate: 0.2 },
};

describe('TaskImpact', () => {
  it('explains how activity telemetry augments camera-only inference', () => {
    render(<TaskImpact taskActive gameSummary={gameSummary} edgeAIResult={edgeAIResult} />);

    expect(screen.getByText(/cámara \+ actividad/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Sin actividad/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Con actividad/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/precisión\/RT\/errores\/trayectoria/i).length).toBeGreaterThan(0);
  });

  it('shows baseline versus current Edge AI deltas when baseline is provided', () => {
    render(
      <TaskImpact
        taskActive
        gameSummary={gameSummary}
        edgeAIResult={edgeAIResult}
        baselineEdgeAI={{
          composite: { score: 58 },
          channels: {
            taskPerformance: { score: 50 },
            motorControl: { score: 55 },
          },
        }}
      />,
    );

    expect(screen.getByText(/Baseline pre-actividad/i)).toBeInTheDocument();
    expect(screen.getByText(/Actual con actividad/i)).toBeInTheDocument();
    expect(screen.getByText(/\+12/)).toBeInTheDocument();
    expect(screen.getByText(/Rendimiento \+32/)).toBeInTheDocument();
    expect(screen.getByText(/Control Motor \+19/)).toBeInTheDocument();
  });
});
