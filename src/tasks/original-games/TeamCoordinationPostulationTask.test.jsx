import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TeamCoordinationPostulationTask from './TeamCoordinationPostulationTask.jsx';

function chooseBestAndAdvance() {
  fireEvent.click(screen.getAllByRole('button', { name: /Alinear objetivo|Explicar el motivo|Reconocer la ambigüedad|Repriorizar el objetivo/i })[0]);
  const nextButton = screen.getByRole('button', { name: /Continuar aventura|Cerrar misión/i });
  fireEvent.click(nextButton);
}

describe('TeamCoordinationPostulationTask', () => {
  it('renders a structured team brief with behind-the-scenes metrics and no free-text input', () => {
    const onGameEvent = vi.fn();
    render(<TeamCoordinationPostulationTask active onGameEvent={onGameEvent} />);

    expect(screen.getByRole('heading', { name: /Operación Faro/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Comando de crisis RPG/i })).toBeInTheDocument();
    expect(screen.getByText(/RPG táctico/i)).toBeInTheDocument();
    expect(screen.getByText(/Turno 1 de 4/i)).toBeInTheDocument();
    expect(screen.getByText(/Sala de mando/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Mara/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Escuadrón/i)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Misión Operación Faro/i })).toBeInTheDocument();
    expect(screen.getByText(/Mantener Operación Faro coordinada/i)).toBeInTheDocument();
    expect(screen.getByText(/Misión en curso/i)).toBeInTheDocument();
    expect(screen.getByText(/Coordinación —/i)).toBeInTheDocument();
    expect(screen.getByText(/Meta 75%/i)).toBeInTheDocument();
    expect(screen.getByText(/Trabajo por detrás/i)).toBeInTheDocument();
    expect(screen.getByText(/no guarda texto libre/i)).toBeInTheDocument();
    expect(screen.getAllByText(/liderazgo/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Selecciona un comando/i })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Alinear objetivo/i }));
    expect(screen.getByText(/Consecuencia de turno/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Mara, Operaciones, Rumbo alineado/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continuar aventura/i })).toBeEnabled();
    expect(onGameEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'game_start', gameId: 'team_coordination' }));
    expect(onGameEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'stimulus_shown', gameId: 'team_coordination' }));
  });

  it('completes the brief and emits aggregate-only metrics for missing demo constructs', () => {
    const onGameEvent = vi.fn();
    const onComplete = vi.fn();
    render(<TeamCoordinationPostulationTask active onGameEvent={onGameEvent} onComplete={onComplete} />);

    chooseBestAndAdvance();
    expect(screen.getAllByText(/coordinación/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Turno 2 de 4/i)).toBeInTheDocument();
    chooseBestAndAdvance();
    chooseBestAndAdvance();
    chooseBestAndAdvance();

    expect(screen.getByTestId('team-coordination-finished')).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
      gameId: 'team_coordination',
      aggregateSchemaVersion: 'team_coordination_aggregate_v1',
      completed: true,
      aggregateOnly: true,
      scenarioCount: 4,
      completedScenarioCount: 4,
    }));
    const summary = onComplete.mock.calls.at(-1)[0];
    expect(summary.leadershipScore).toBeGreaterThan(0.8);
    expect(summary.communicationScore).toBeGreaterThan(0.8);
    expect(summary.adaptabilityScore).toBeGreaterThan(0.75);
    expect(summary.decisionQualityScore).toBeGreaterThan(0.8);
    expect(JSON.stringify(summary)).not.toMatch(/prompt|label|why|selectedOption|choiceSequence|freeText|typedResponse/i);

    const responseEvents = onGameEvent.mock.calls.map(([event]) => event).filter((event) => event.eventType === 'response');
    expect(responseEvents).toHaveLength(4);
    expect(JSON.stringify(responseEvents)).not.toMatch(/selectedOptionLabel|optionText|prompt|typedResponse/i);
    expect(responseEvents[0].response).toMatchObject({
      outcome: 'structured_choice',
      teamCoordination: expect.objectContaining({ aggregateOnly: true }),
    });
    expect(JSON.stringify(responseEvents)).not.toMatch(/choiceCategory/i);
  });
});
