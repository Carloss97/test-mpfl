import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PostulationReportScreen from './PostulationReportScreen.jsx';
import { getPostulationGameCards } from './PostulationReportSummary.js';
import { POSTULATION_DEMO_BATTERY_MODES } from './postulationDemoConfig.js';
import { buildPostulationDemoFixture } from './postulationDemoFixture.js';
import { buildPostulationDemoArtifacts } from './postulationDemoSessionBuilder.js';

const completedDemo = Object.freeze({
  completedCount: 2,
  totalCount: 2,
  blocks: [
    {
      block: { gameId: 'precision_targeting', label: 'Precisión visomotora', skill: 'visuomotor_precision', trialCount: 4 },
      summary: { completedTrialCount: 4, trialCount: 4, accuracy: 0.9, score: 0.82, meanReactionTimeMs: 520 },
    },
    {
      block: { gameId: 'go_nogo', label: 'Control inhibitorio', skill: 'inhibitory_control', trialCount: 8 },
      summary: { completedTrialCount: 8, trialCount: 8, accuracy: 0.75, score: 0.74, meanReactionTimeMs: 610 },
    },
  ],
});

const gameEvents = Object.freeze([
  { type: 'game_event_v1', eventType: 'stimulus_shown', gameId: 'precision_targeting', trialId: 'p1', targetId: 'target-1', timestamp: 1000, stimulus: { kind: 'fitts_target_after_start_pad', payload: { target: { x: 100, y: 80 }, origin: { x: 20, y: 20 } } } },
  { type: 'game_event_v1', eventType: 'response', gameId: 'precision_targeting', trialId: 'p1', targetId: 'target-1', timestamp: 1320, response: { correct: true, outcome: 'hit', reactionTimeMs: 320, score: 0.9, fitts: { indexDifficulty: 3.1, throughput: 4.2 }, pointerSummary: { pathEfficiency: 0.82 } } },
  { type: 'game_event_v1', eventType: 'stimulus_shown', gameId: 'go_nogo', trialId: 'g1', targetId: 'cue-1', timestamp: 1800, stimulus: { kind: 'go_nogo_cue', payload: { cue: 'NO-GO', responseRequired: false } } },
  { type: 'game_event_v1', eventType: 'response', gameId: 'go_nogo', trialId: 'g1', targetId: 'cue-1', timestamp: 2100, response: { correct: false, outcome: 'commission_error', reactionTimeMs: 300, score: 0, inhibition: { responseRequired: false } } },
]);

const signalContext = Object.freeze({
  faceSamples: [
    { timestamp: 820, quality: { facePresent: true, confidence: 0.78 }, blendshapes: { browDownLeft: 0.03, browDownRight: 0.03 } },
    { timestamp: 1040, quality: { facePresent: true, confidence: 0.84 }, blendshapes: { browDownLeft: 0.16, browDownRight: 0.17 } },
    { timestamp: 1240, quality: { facePresent: true, confidence: 0.87 }, blendshapes: { browDownLeft: 0.18, browDownRight: 0.2 } },
  ],
  gazeSamples: [{ timestamp: 1200, lookingAtScreen: true, confidence: 0.82, screenX: 0.53, screenY: 0.48 }],
  postureSamples: [{ timestamp: 1200, postureScore: 0.72, headForward: 0.28, confidence: 0.8 }],
  upperBodySamples: [{ timestamp: 1220, confidence: 0.82, armActivity: 0.38, upperBodyCoverage: 0.8 }],
  latestGaze: { lookingAtScreen: true, confidence: 0.82, screenX: 0.53, screenY: 0.48 },
  latestPosture: { postureScore: 0.72, headForward: 0.28, confidence: 0.8 },
  moveNetPose: { confidence: 0.82, symmetry: 0.9, upperBodyCoverage: 0.8, armActivity: 0.38 },
  runtime: { delegate: 'GPU' },
});

function buildArtifacts() {
  return buildPostulationDemoArtifacts({
    completedDemo,
    gameEvents,
    signalSnapshot: { sampleCount: 42, facePresenceRatio: 0.86, meanConfidence: 0.81, caveats: [] },
    signalContext,
    generatedAt: '2026-07-09T20:40:00.000Z',
    runId: 'postulation-report-screen-test',
  });
}

describe('PostulationReportScreen', () => {
  it('renders a polished product report summary instead of a raw markdown preview', () => {
    const artifacts = buildArtifacts();
    render(<PostulationReportScreen artifacts={artifacts} completedDemo={completedDemo} onRestart={() => {}} />);

    expect(screen.getByRole('heading', { name: /Reporte listo para revisión humana/i })).toBeInTheDocument();
    expect(screen.getByText(/OK privacy-safe/i)).toBeInTheDocument();
    expect(screen.getByText(/Perfil de capacidades/i)).toBeInTheDocument();
    expect(screen.getByText(/Resultados por juego/i)).toBeInTheDocument();
    expect(screen.getByText(/Qué se procesó en segundo plano/i)).toBeInTheDocument();
    expect(screen.getByText(/Resumen para revisión/i)).toBeInTheDocument();
    expect(screen.getByText(/Resumen ejecutivo HR/i)).toBeInTheDocument();
    expect(screen.getByText(/Guía de entrevista/i)).toBeInTheDocument();
    expect(screen.getByText(/No ranking automático/i)).toBeInTheDocument();
    expect(screen.getByText(/lectura humana/i)).toBeInTheDocument();
    expect(screen.getAllByText(/sin decisión automatizada/i).length).toBeGreaterThan(0);
  });

  it('exposes report and bundle downloads through callbacks only when validation is OK', () => {
    const artifacts = buildArtifacts();
    const onDownloadFile = vi.fn();
    const onDownloadAll = vi.fn();
    render(<PostulationReportScreen artifacts={artifacts} completedDemo={completedDemo} onDownloadFile={onDownloadFile} onDownloadAll={onDownloadAll} />);

    fireEvent.click(screen.getByRole('button', { name: /Descargar reporte local/i }));
    expect(onDownloadFile).toHaveBeenCalledWith(expect.objectContaining({ fileName: expect.stringMatching(/talent-report\.md$/) }));

    fireEvent.click(screen.getByRole('button', { name: /Descargar bundle técnico/i }));
    expect(onDownloadAll).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ fileName: expect.stringMatching(/final-payload\.json$/) }),
      expect.objectContaining({ fileName: expect.stringMatching(/report-manifest\.json$/) }),
    ]));
  });

  it('keeps the visible report screen free of forbidden raw telemetry labels', () => {
    const artifacts = buildArtifacts();
    const { container } = render(<PostulationReportScreen artifacts={artifacts} completedDemo={completedDemo} />);
    const visibleText = container.textContent;

    for (const forbidden of ['rawGameEvents', 'pointerSamples', 'faceSamples', 'landmarks', 'keypoints', 'windows']) {
      expect(visibleText).not.toContain(forbidden);
    }
  });

  it('formats normalized and historical point scores without impossible percentages', () => {
    const cards = getPostulationGameCards({
      assessmentSession: {
        blocks: [
          { gameId: 'laser_puzzle', label: 'Puzzle', status: 'completed', result: { score: 0.84 } },
          { gameId: 'passenger_routes', label: 'Rutas legacy', status: 'completed', result: { score: 84 } },
          { gameId: 'balloon_risk', label: 'Globo legacy', status: 'completed', result: { score: 120 } },
        ],
      },
    });

    expect(cards.map((card) => card.score)).toEqual(['84%', '84', '120']);
    expect(cards.map((card) => card.score).join(' ')).not.toMatch(/8400%|12000%/);
  });

  it('renders the R-6 workbook framework with No medido semantics for original games', () => {
    const fixture = buildPostulationDemoFixture({ batteryMode: POSTULATION_DEMO_BATTERY_MODES.ORIGINAL_GAMES });
    render(<PostulationReportScreen artifacts={fixture.artifacts} completedDemo={fixture.summary} />);

    expect(screen.getByRole('heading', { name: /Framework R-6 del workbook/i })).toBeInTheDocument();
    expect(screen.getByText(/Batería original: lectura preliminar controlada/i)).toBeInTheDocument();
    expect(screen.getByText(/No medido explícito/i)).toBeInTheDocument();
    expect(screen.getByText(/Validar antes de comparar candidatos/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Toma de decisiones/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/descriptive_only/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/No medido/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Liderazgo/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Comunicación/i)).toBeInTheDocument();
    expect(screen.getByText(/usa No medido/i)).toBeInTheDocument();
    expect(screen.getByText(/Completaste una ruta eficiente/i)).toBeInTheDocument();
    expect(screen.getByText(/no equivale a liderazgo logístico/i)).toBeInTheDocument();
    expect(screen.getByText(/Resolviste el puzzle/i)).toBeInTheDocument();
    expect(screen.getAllByText(/riesgo\/recompensa/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Solución clara/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Ruta eficiente/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Authoring Laser: valid_for_internal_demo/i)).toBeInTheDocument();
    expect(screen.getByText(/Calibration Balloon: valid_for_internal_demo/i)).toBeInTheDocument();
    expect(screen.getByText(/Authoring Passenger: valid_for_internal_demo/i)).toBeInTheDocument();
    expect(screen.getByText(/Instruction check: low/i)).toBeInTheDocument();
  });

  it('derives modular passenger-route feedback from aggregate-only game results', () => {
    const cards = getPostulationGameCards({
      assessmentSession: {
        blocks: [{
          gameId: 'passenger_routes',
          label: 'Rutas',
          status: 'completed',
          result: {
            completed: true,
            passengersDelivered: 1,
            destinationCount: 3,
            routeEfficiency: 0.42,
            movementAttemptCount: 12,
            replanCount: 0,
            stationUseCount: 0,
            constraintViolationCount: 4,
            satisfactionScore: 44,
            aggregateOnly: true,
          },
        }],
      },
    });

    expect(cards[0].feedback).toMatchObject({
      constraintFeedbackCategory: 'constraint_blocked',
      privacy: { aggregateOnly: true, rawRoutesUsed: false },
    });
    expect(cards[0].feedback.candidateHint).toMatch(/restricciones/i);
    expect(JSON.stringify(cards[0].feedback)).not.toMatch(/fullRoute|visitedCells|stepByStepPath|rawGameEvents/i);
  });

  it('derives modular feedback for all original games without raw traces', () => {
    const fixture = buildPostulationDemoFixture({ batteryMode: POSTULATION_DEMO_BATTERY_MODES.ORIGINAL_GAMES });
    const cards = getPostulationGameCards(fixture.artifacts, fixture.summary);

    expect(cards.map((card) => card.feedback?.gameId)).toEqual([
      'laser_puzzle',
      'balloon_risk',
      'passenger_routes',
    ]);
    expect(cards.map((card) => card.feedback?.displayCategory)).toEqual([
      'clear_solution',
      'balanced_feedback_strategy',
      'clear_success',
    ]);
    expect(JSON.stringify(cards.map((card) => card.feedback))).not.toMatch(/beamCells|pumpSequence|fullRoute|visitedCells|rawGameEvents|pointerSamples/i);
  });

  it('does not present the executive HR summary as an automated decision or hiring ranking', () => {
    const fixture = buildPostulationDemoFixture({ batteryMode: POSTULATION_DEMO_BATTERY_MODES.ORIGINAL_GAMES });
    const { container } = render(<PostulationReportScreen artifacts={fixture.artifacts} completedDemo={fixture.summary} />);
    const visibleText = container.textContent;

    expect(visibleText).toMatch(/No ranking automático/i);
    expect(visibleText).toMatch(/Contrastar con entrevista/i);
    expect(visibleText).not.toMatch(/contratar|rechazar|seleccionar automáticamente|apto\/no apto/i);
  });
});
