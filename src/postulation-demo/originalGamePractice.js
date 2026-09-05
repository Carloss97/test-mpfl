/**
 * originalGamePractice.js — G.2 "práctica previa sin puntaje".
 *
 * A practice/preview round is an unscored, pre-evaluative run of a game whose
 * aggregate is explicitly flagged (practice / preview / is_tutorial) so it can be
 * excluded from the final evaluative profile. This module centralizes the flag
 * convention and the split/format helpers so games, the stage, and the session
 * builder all agree without drifting.
 *
 * Privacy contract: only aggregate-format summaries are ever processed here;
 * raw pointer/DOM/route data never reaches this module.
 */

export const PRACTICE_FLAG = Object.freeze({
  practice: true,
  preview: true,
  is_tutorial: true,
});

/**
 * True when a summary/aggregate was produced by a practice/preview run and must
 * be excluded from evaluative scoring.
 */
export function isPracticeSummary(summary = {}) {
  return (
    summary?.practice === true
    || summary?.preview === true
    || summary?.is_tutorial === true
    || summary?.isTutorial === true
  );
}

/**
 * Mark an aggregate as a practice/preview run. Returns a new object; the caller's
 * object is not mutated. Keeper fields are preserved so later sanitizers still
 * see the blueprints' allowed aggregate fields plus the practice flags.
 */
export function markPracticeSummary(gameId, summary = {}, { reason = 'pre_evaluative_level0' } = {}) {
  return {
    ...summary,
    ...PRACTICE_FLAG,
    practiceGameId: gameId,
    practiceReason: reason,
  };
}

/**
 * Build a practice ("level 0") postulation block from a normal evaluative block.
 * The practice run uses a reduced trial count so a candidate warms up quickly.
 * @returns {{ practice: boolean, sourceTrialCount: number, ...block }}
 */
export function buildPracticeBlock(block = {}, { practiceTrialCount = 1 } = {}) {
  const sourceTrialCount = Number(block?.trialCount) || 1;
  return Object.freeze({
    ...block,
    trialCount: Math.max(1, Math.min(practiceTrialCount, Math.max(1, sourceTrialCount))),
    practice: true,
    sourceTrialCount,
  });
}

/**
 * Split completed demo entries into evaluative vs practice lists. Practice
 * summaries carry the PRACTICE_FLAG set; evaluative ones do not and are the only
 * entries that may feed the talent profile.
 */
export function splitBlocksByPractice(completedBlocks = []) {
  const evaluative = [];
  const practice = [];
  for (const entry of completedBlocks) {
    const summary = entry?.summary ?? entry?.result ?? entry ?? {};
    if (isPracticeSummary(summary) || entry?.practice === true || entry?.block?.practice === true || entry?.block?.is_tutorial === true) {
      practice.push(entry);
    } else {
      evaluative.push(entry);
    }
  }
  return { evaluative, practice };
}

/**
 * Collect a compact, aggregate-only summary of practice runs for diagnostics and
 * HUD copy. Avoids persisting any raw route/pointer data.
 */
export function summarizePractice(completedBlocks = []) {
  const { practice } = splitBlocksByPractice(completedBlocks);
  return {
    practiceRunCount: practice.length,
    practiceGameIds: [...new Set(practice.map((entry) => entry?.gameId ?? entry?.block?.gameId).filter(Boolean))],
    totalPracticeTimeMs: practice.reduce(
      (sum, entry) => sum + (Number(entry?.summary?.timeMs ?? entry?.result?.timeMs) || 0),
      0,
    ),
  };
}