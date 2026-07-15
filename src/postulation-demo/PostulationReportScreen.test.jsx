import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PostulationReportScreen from './PostulationReportScreen.jsx';
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
});
