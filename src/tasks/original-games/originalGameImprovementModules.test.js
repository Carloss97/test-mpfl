import { describe, expect, it } from 'vitest';
import {
  FORBIDDEN_IMPROVEMENT_INPUT_FIELDS,
  getOriginalGameImprovementModule,
  listOriginalGameImprovementModules,
  summarizeOriginalGameImprovementModules,
} from './originalGameImprovementModules.js';

const ORIGINAL_GAME_IDS = ['laser_puzzle', 'balloon_risk', 'passenger_routes'];

describe('original game improvement modules', () => {
  it('lists modular improvement workstreams per original game without raw/reconstructive inputs', () => {
    const modules = listOriginalGameImprovementModules();
    expect(modules.length).toBeGreaterThanOrEqual(6);
    for (const gameId of ORIGINAL_GAME_IDS) {
      expect(modules.some((module) => module.gameIds.includes(gameId))).toBe(true);
    }

    for (const module of modules) {
      expect(module).toMatchObject({
        id: expect.any(String),
        title: expect.any(String),
        status: expect.any(String),
        purpose: expect.any(String),
        gameIds: expect.any(Array),
        candidateInputs: expect.any(Array),
        expectedOutputs: expect.any(Array),
        acceptanceTests: expect.any(Array),
        privacyNotes: expect.any(Array),
      });
      expect(module.candidateInputs.length).toBeGreaterThan(0);
      expect(module.expectedOutputs.length).toBeGreaterThan(0);
      expect(module.acceptanceTests.length).toBeGreaterThan(0);
      const serializedInputs = JSON.stringify(module.candidateInputs);
      for (const forbidden of FORBIDDEN_IMPROVEMENT_INPUT_FIELDS) {
        expect(serializedInputs).not.toContain(forbidden);
      }
      expect(module.privacyNotes.join(' ')).toMatch(/agregad|aggregate|sin|no guardar|no persistir/i);
    }
  });

  it('retrieves modules by id and filters by game', () => {
    expect(getOriginalGameImprovementModule('passenger.constraint-feedback')).toMatchObject({
      gameIds: ['passenger_routes'],
      status: 'implemented_core',
      implementation: 'buildPassengerConstraintFeedback in passengerRouteFeedback.js',
    });
    expect(getOriginalGameImprovementModule('laser.failure-explanation')).toMatchObject({
      status: 'implemented_core',
      implementation: 'buildLaserPuzzleFeedback in laserPuzzleFeedback.js',
    });
    expect(getOriginalGameImprovementModule('laser.level-authoring-review')).toMatchObject({
      status: 'implemented_core',
      implementation: 'buildLaserPuzzleAuthoringReview in laserPuzzleAuthoringReview.js',
    });
    expect(getOriginalGameImprovementModule('balloon.feedback-comprehension')).toMatchObject({
      status: 'implemented_core',
      implementation: 'buildBalloonRiskFeedback in balloonRiskFeedback.js',
    });
    expect(getOriginalGameImprovementModule('balloon.threshold-calibration-review')).toMatchObject({
      status: 'implemented_core',
      implementation: 'buildBalloonThresholdCalibrationReview in balloonThresholdCalibrationReview.js',
    });
    expect(getOriginalGameImprovementModule('shared.candidate-instruction-check')).toMatchObject({
      status: 'implemented_core',
      implementation: 'buildCandidateInstructionCheck in candidateInstructionCheck.js',
    });
    expect(getOriginalGameImprovementModule('passenger.route-authoring-review')).toMatchObject({
      status: 'implemented_core',
      implementation: 'buildPassengerRouteAuthoringReview in passengerRouteAuthoringReview.js',
    });
    expect(getOriginalGameImprovementModule('missing')).toBeNull();

    const laserModules = listOriginalGameImprovementModules('laser_puzzle');
    expect(laserModules.every((module) => module.gameIds.includes('laser_puzzle'))).toBe(true);
    expect(laserModules.map((module) => module.id)).toEqual(expect.arrayContaining([
      'laser.failure-explanation',
      'laser.level-authoring-review',
    ]));
  });

  it('summarizes improvement priorities without marking unvalidated modules as done', () => {
    const summary = summarizeOriginalGameImprovementModules();
    expect(summary.total).toBe(listOriginalGameImprovementModules().length);
    expect(summary.byStatus.ready_for_tdd ?? 0).toBe(0);
    expect(summary.byStatus.implemented_core).toBeGreaterThanOrEqual(4);
    expect(summary.byGame.passenger_routes).toBeGreaterThan(0);
    expect(summary.nextModules.map((module) => module.id)).toEqual(expect.arrayContaining([
      'shared.mobile-accessibility-qa',
    ]));
  });
});
