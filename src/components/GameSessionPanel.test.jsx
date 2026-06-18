import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import GameSessionPanel from './GameSessionPanel.jsx';
import GameTelemetrySummary from './GameTelemetrySummary.jsx';
import GameCorrelationPanel from './GameCorrelationPanel.jsx';

const gameSummary = {
  eventCount: 14,
  performance: { trialCount: 6, completedTrialCount: 5, accuracy: 0.8, meanReactionTimeMs: 430, meanScore: 0.74 },
  motor: { pathEfficiencyMean: 0.82, smoothPursuitScore: 0.78 },
  inhibition: { commissionErrorRate: 0.2, omissionErrorRate: 0.1 },
  visualSearch: { searchEfficiency: 0.68 },
};

const gameCorrelation = {
  aggregate: {
    trialCount: 6,
    completedTrialCount: 5,
    accuracy: 0.8,
    meanReactionTimeMs: 430,
    meanReactionPostureDelta: -0.08,
    meanReactionFacePresenceDelta: 0.03,
    byGameId: { visual_search: 2, go_nogo: 2 },
  },
};

const edgeAIResult = {
  channels: {
    taskPerformance: { score: 81, level: 'high' },
    motorControl: { score: 74, level: 'high' },
    inhibitionControl: { score: 72, level: 'high' },
    visuomotorPrecision: { score: 79, level: 'high' },
    visualSearchEfficiency: { score: 69, level: 'moderate' },
    adaptiveResilience: { score: 76, level: 'high' },
  },
};

describe('GameTelemetrySummary', () => {
  it('renders compact privacy-safe behavioral telemetry summary', () => {
    render(<GameTelemetrySummary gameSummary={gameSummary} />);
    expect(screen.getByText(/Resumen conductual/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Eventos/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/5\/6/i)).toBeInTheDocument();
    expect(screen.getAllByText(/80%/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/430ms/i)).toBeInTheDocument();
    expect(screen.getByText(/No se muestran rutas crudas/i)).toBeInTheDocument();
  });
});

describe('GameCorrelationPanel', () => {
  it('renders correlated trial windows and deltas without raw samples', () => {
    render(<GameCorrelationPanel gameCorrelation={gameCorrelation} />);
    expect(screen.getByText(/Correlación multimodal/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Ventanas/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Δ postura/i)).toBeInTheDocument();
    expect(screen.getByText(/visual_search/i)).toBeInTheDocument();
    expect(screen.getByText(/Sin señales crudas/i)).toBeInTheDocument();
  });
});

describe('GameSessionPanel', () => {
  it('combines game summary, correlation, and Edge AI channels for the selected activity', () => {
    render(
      <GameSessionPanel
        selectedGame={{ id: 'visual_search', label: 'Búsqueda visual', description: 'Atención selectiva' }}
        taskActive
        gameSummary={gameSummary}
        gameCorrelation={gameCorrelation}
        edgeAIResult={edgeAIResult}
      />,
    );

    expect(screen.getByText(/Sesión gamificada/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Búsqueda visual/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/activa/i)).toBeInTheDocument();
    expect(screen.getByText(/Control inhibitorio/i)).toBeInTheDocument();
    expect(screen.getByText(/Precisión visomotora/i)).toBeInTheDocument();
    expect(screen.getByText(/Resiliencia adaptativa/i)).toBeInTheDocument();
  });
});
