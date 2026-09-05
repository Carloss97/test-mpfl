import { describe, expect, it } from 'vitest';
import { buildPassengerConstraintFeedback } from './passengerRouteFeedback.js';

describe('buildPassengerConstraintFeedback', () => {
  it('explains successful constrained planning without overclaiming talent', () => {
    const feedback = buildPassengerConstraintFeedback({
      completed: true,
      passengersDelivered: 3,
      destinationCount: 3,
      routeEfficiency: 0.86,
      movementAttemptCount: 16,
      replanCount: 1,
      stationUseCount: 1,
      constraintViolationCount: 0,
      satisfactionScore: 88,
      aggregateOnly: true,
    });

    expect(feedback).toMatchObject({
      gameId: 'passenger_routes',
      moduleId: 'passenger.constraint-feedback',
      status: 'available',
      constraintFeedbackCategory: 'clear_success',
      privacy: { aggregateOnly: true, rawRoutesUsed: false },
    });
    expect(feedback.candidateHint).toMatch(/ruta eficiente/i);
    expect(feedback.reviewerCaveat).toMatch(/no equivale/i);
    expect(JSON.stringify(feedback)).not.toMatch(/fullRoute|visitedCells|stepByStepPath|rawGameEvents/i);
  });

  it('uses attempt-normalized violations instead of treating raw violation counts as talent evidence', () => {
    const feedback = buildPassengerConstraintFeedback({
      completed: false,
      passengersDelivered: 1,
      destinationCount: 3,
      routeEfficiency: 0.42,
      movementAttemptCount: 12,
      replanCount: 0,
      stationUseCount: 0,
      constraintViolationCount: 4,
      satisfactionScore: 44,
      aggregateOnly: true,
    });

    expect(feedback.constraintFeedbackCategory).toBe('constraint_blocked');
    expect(feedback.diagnostics.violationRate).toBeCloseTo(0.3333, 4);
    expect(feedback.candidateHint).toMatch(/restricciones/i);
    expect(feedback.nextDesignProbe).toMatch(/instrucciones|controles/i);
  });

  it('treats station use as a resource-management event, not as an error by default', () => {
    const feedback = buildPassengerConstraintFeedback({
      completed: true,
      passengersDelivered: 3,
      destinationCount: 3,
      routeEfficiency: 0.72,
      movementAttemptCount: 18,
      replanCount: 2,
      stationUseCount: 2,
      constraintViolationCount: 0,
      satisfactionScore: 78,
      aggregateOnly: true,
    });

    expect(feedback.constraintFeedbackCategory).toBe('resource_use_review');
    expect(feedback.candidateHint).toMatch(/paradas/i);
    expect(feedback.reviewerCaveat).toMatch(/puede ser adaptativo/i);
  });

  it('does not produce feedback from non aggregate-only or inconsistent results', () => {
    expect(buildPassengerConstraintFeedback({ aggregateOnly: false })).toMatchObject({
      status: 'not_available',
      constraintFeedbackCategory: 'invalid_or_non_aggregate',
    });
    expect(buildPassengerConstraintFeedback({
      aggregateOnly: true,
      passengersDelivered: 4,
      destinationCount: 3,
      routeEfficiency: 0.5,
      movementAttemptCount: 10,
      constraintViolationCount: 0,
    })).toMatchObject({
      status: 'not_available',
      constraintFeedbackCategory: 'invalid_or_non_aggregate',
    });
  });
});
