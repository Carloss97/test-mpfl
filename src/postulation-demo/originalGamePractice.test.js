import { describe, expect, it } from 'vitest';
import {
  buildPracticeBlock,
  isPracticeSummary,
  markPracticeSummary,
  summarizePractice,
  splitBlocksByPractice,
} from './originalGamePractice.js';

const EVALUATIVE_SUMMARY = Object.freeze({
  gameId: 'laser_puzzle',
  score: 0.8,
  solvedLevels: 2,
  moveCount: 9,
  aggregateOnly: true,
});

describe('originalGamePractice (G.2 práctica previa sin puntaje)', () => {
  it('flags a marked summary as practice/preview and keeps evaluative unflagged', () => {
    expect(isPracticeSummary(EVALUATIVE_SUMMARY)).toBe(false);
    const marked = markPracticeSummary('laser_puzzle', EVALUATIVE_SUMMARY);
    expect(isPracticeSummary(marked)).toBe(true);
    expect(marked.practice).toBe(true);
    expect(marked.preview).toBe(true);
    expect(marked.is_tutorial).toBe(true);
    expect(marked.practiceGameId).toBe('laser_puzzle');
  });

  it('recognizes legacy isTutorial aliases and does not mutate the input', () => {
    const input = { score: 0.5 };
    const marked = markPracticeSummary('balloon_risk', input);
    expect(marked).not.toBe(input);
    expect(input.practice).toBeUndefined(); // original untouched
    expect(isPracticeSummary({ isTutorial: true })).toBe(true);
    expect(isPracticeSummary({ is_tutorial: true })).toBe(true);
  });

  it('markPracticeSummary preserves aggregate fields for later sanitization', () => {
    const marked = markPracticeSummary('laser_puzzle', EVALUATIVE_SUMMARY);
    expect(marked.score).toBe(0.8);
    expect(marked.solvedLevels).toBe(2);
    expect(marked.aggregateOnly).toBe(true);
  });

  it('buildPracticeBlock produces a level-0 preview with a reduced trial count', () => {
    const block = buildPracticeBlock(
      { gameId: 'laser_puzzle', trialCount: 3, label: 'Puzzle láser' },
      { practiceTrialCount: 1 },
    );
    expect(block.practice).toBe(true);
    expect(block.trialCount).toBe(1);
    expect(block.sourceTrialCount).toBe(3);
    expect(block.gameId).toBe('laser_puzzle');
    // practice trial count is clamped to the source count (never inflates)
    expect(buildPracticeBlock({ trialCount: 1 }).trialCount).toBe(1);
  });

  it('splitBlocksByPractice separates evaluative from practice summaries', () => {
    const practice = markPracticeSummary('laser_puzzle', EVALUATIVE_SUMMARY);
    const entries = [
      { block: { gameId: 'go_nogo' }, summary: { score: 0.7, aggregateOnly: true } },
      { block: { gameId: 'laser_puzzle' }, summary: practice },
      { block: { gameId: 'precision_targeting' }, summary: { score: 0.6 }, practice: true },
    ];
    const { evaluative, practice: practiceList } = splitBlocksByPractice(entries);
    expect(evaluative.map((entry) => entry.block.gameId)).toEqual(['go_nogo']);
    expect(practiceList.map((entry) => entry.block.gameId)).toEqual(['laser_puzzle', 'precision_targeting']);
  });

  it('summarizePractice reports only aggregate metadata about practice runs', () => {
    const practiceA = markPracticeSummary('laser_puzzle', { ...EVALUATIVE_SUMMARY, timeMs: 12000 });
    const practiceB = markPracticeSummary('balloon_risk', { score: 0.4, timeMs: 8000 });
    const summary = summarizePractice([
      { block: { gameId: 'laser_puzzle' }, summary: practiceA },
      { block: { gameId: 'balloon_risk' }, summary: practiceB },
    ]);
    expect(summary.practiceRunCount).toBe(2);
    expect(summary.practiceGameIds).toEqual(expect.arrayContaining(['laser_puzzle', 'balloon_risk']));
    expect(summary.totalPracticeTimeMs).toBe(20000);
    expect(JSON.stringify(summary)).not.toMatch(/routeTrace|pointerSamples|rawGameEvents|fullRoute/i);
  });
});