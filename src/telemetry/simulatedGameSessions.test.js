import { describe, expect, it } from 'vitest';
import { runEdgeAIInference } from './edgeAiEngine.js';
import { buildGameFeatureVectorV2 } from './gameFeatureVector.js';
import { recommendAdaptiveDifficulty } from '../tasks/adaptiveDifficulty.js';
import {
  GAME_SCENARIO_FIXTURES,
  buildSyntheticGameSession,
  listScenarioIds,
  summarizePracticeImprovement,
} from './gameScenarioFixtures.js';

describe('synthetic game-session validation fixtures', () => {
  it('defines deterministic scenarios for good control, fatigue, stress/error, distraction, and practice improvement', () => {
    expect(listScenarioIds()).toEqual([
      'good_motor_control',
      'fatigue',
      'stress_error',
      'distraction',
      'practice_improvement',
    ]);
    expect(GAME_SCENARIO_FIXTURES.good_motor_control.expected).toMatchObject({ difficultyDirection: 'up' });
  });

  it('drives Edge AI and adaptive difficulty in the expected direction for each scenario', () => {
    const good = buildSyntheticGameSession('good_motor_control');
    const stress = buildSyntheticGameSession('stress_error');
    const distraction = buildSyntheticGameSession('distraction');
    const fatigue = buildSyntheticGameSession('fatigue');

    const goodEdge = runEdgeAIInference(good.edgeInput);
    const stressEdge = runEdgeAIInference(stress.edgeInput);
    const distractionEdge = runEdgeAIInference(distraction.edgeInput);
    const fatigueEdge = runEdgeAIInference(fatigue.edgeInput);

    const goodDiff = recommendAdaptiveDifficulty({ currentLevel: 4, gameSummary: good.edgeInput.gameSummary, edgeAIResult: goodEdge });
    const stressDiff = recommendAdaptiveDifficulty({ currentLevel: 4, gameSummary: stress.edgeInput.gameSummary, edgeAIResult: stressEdge });

    expect(goodEdge.channels.visuomotorPrecision.score).toBeGreaterThanOrEqual(good.expected.minVisuomotorPrecision);
    expect(goodDiff.direction).toBe(good.expected.difficultyDirection);
    expect(stressEdge.channels.cognitiveLoad.score).toBeGreaterThan(goodEdge.channels.cognitiveLoad.score);
    expect(stressEdge.channels.inhibitionControl.score).toBeLessThan(goodEdge.channels.inhibitionControl.score);
    expect(stressDiff.direction).toBe(stress.expected.difficultyDirection);
    expect(distractionEdge.channels.visualAttention.score).toBeLessThan(distraction.expected.maxVisualAttention);
    expect(fatigueEdge.channels.fatigueIndex.score).toBeGreaterThan(goodEdge.channels.fatigueIndex.score);
  });

  it('validates practice improvement via feature vector and adaptive recommendation', () => {
    const scenario = buildSyntheticGameSession('practice_improvement');
    const trend = summarizePracticeImprovement(scenario);
    const earlyEdge = runEdgeAIInference(scenario.segments.early.edgeInput);
    const lateEdge = runEdgeAIInference(scenario.segments.late.edgeInput);
    const earlyVector = buildGameFeatureVectorV2({
      gameSummary: scenario.segments.early.edgeInput.gameSummary,
      gameCorrelation: scenario.segments.early.edgeInput.gameCorrelation,
      edgeModelOutput: earlyEdge,
    });
    const lateVector = buildGameFeatureVectorV2({
      gameSummary: scenario.segments.late.edgeInput.gameSummary,
      gameCorrelation: scenario.segments.late.edgeInput.gameCorrelation,
      edgeModelOutput: lateEdge,
    });
    const lateDifficulty = recommendAdaptiveDifficulty({ currentLevel: 4, gameSummary: scenario.segments.late.edgeInput.gameSummary, edgeAIResult: lateEdge });

    expect(trend.accuracyDelta).toBeGreaterThan(0);
    expect(lateVector.featureMap['game.accuracy']).toBeGreaterThan(earlyVector.featureMap['game.accuracy']);
    expect(lateVector.featureMap['pointer.pathEfficiencyMean']).toBeGreaterThan(earlyVector.featureMap['pointer.pathEfficiencyMean']);
    expect(lateDifficulty.direction).toBe('up');
  });
});
