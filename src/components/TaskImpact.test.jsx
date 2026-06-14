import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TaskImpact from './TaskImpact.jsx';

describe('TaskImpact', () => {
  it('explains how activity telemetry augments camera-only inference', () => {
    render(
      <TaskImpact
        taskActive
        gameSummary={{
          eventCount: 6,
          performance: { accuracy: 0.8, meanReactionTimeMs: 420 },
          motor: { pathEfficiencyMean: 0.76, smoothPursuitScore: 0.7 },
          inhibition: { commissionErrorRate: 0.1 },
          interference: { errorRate: 0.2 },
        }}
        edgeAIResult={{
          channels: {
            taskPerformance: { label: 'Rendimiento', score: 82, source: 'game_telemetry' },
            motorControl: { label: 'Control Motor', score: 74, gameAdjusted: true },
          },
          emotions: { dominant: 'neutral', dominantScore: 0.6 },
          composite: { score: 70, level: 'high' },
          confidence: { captureQuality: { overallScore: 80 } },
        }}
      />,
    );

    expect(screen.getByText(/cámara \+ actividad/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Sin actividad/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Con actividad/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/precisión\/RT\/errores\/trayectoria/i).length).toBeGreaterThan(0);
  });
});
