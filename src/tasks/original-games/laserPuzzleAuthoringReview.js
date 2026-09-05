import {
  buildLaserDemoLevels,
  buildLaserGrid,
  countAntennas,
  countRelays,
  getLaserBoardMetrics,
  traceLaserBeam,
} from './laserPuzzleTelemetry.js';

const DEFAULT_VIEWPORT = Object.freeze({ width: 606, height: 338 });

function safeLevelId(level, index) {
  const id = typeof level?.id === 'string' && level.id.trim() ? level.id.trim() : `laser-level-${index + 1}`;
  return id.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 72);
}

function applyAuthoredSolution(level = {}) {
  const grid = buildLaserGrid(level);
  for (const placement of level.solutionPlacements ?? []) {
    if (!Array.isArray(placement) || placement.length < 2) continue;
    const [fromKey, toKey] = placement.map(String);
    const cell = grid[fromKey];
    if (!cell?.movable || grid[toKey]) continue;
    delete grid[fromKey];
    const [x, y] = toKey.split(',').map(Number);
    grid[toKey] = { ...cell, x, y };
  }
  return grid;
}

function getChallengeType(level = {}, antennaCount = 0) {
  const hasBifurcator = (level.cells ?? []).some((cell) => cell.type === 'bifurcator');
  const hasPortal = (level.cells ?? []).some((cell) => String(cell.type ?? '').startsWith('portal_'));
  if (antennaCount > 1 || hasBifurcator) return 'multi_target_splitter';
  if (hasPortal) return 'portal_routing';
  return 'single_target_reflection';
}

function getParStatus(par, authoredMoveCount) {
  const safePar = Math.max(0, Math.round(Number(par) || 0));
  const moves = Math.max(0, Math.round(Number(authoredMoveCount) || 0));
  if (moves < 1 || safePar < 1) return 'missing_or_invalid';
  if (safePar < moves) return 'too_tight';
  if (safePar > Math.max(moves + 4, moves * 3)) return 'too_generous';
  return 'calibrated';
}

function reviewLaserLevel(level = {}, index = 0, viewport = DEFAULT_VIEWPORT) {
  const metrics = getLaserBoardMetrics(level, viewport);
  const antennaCount = Math.max(0, Math.round(Number(level.antennaCount) || countAntennas(level)));
  const relayCount = Math.max(0, Math.round(Number(level.relayCount) || countRelays(level)));
  const usesPortal = (level.cells ?? []).some((cell) => String(cell.type ?? '').startsWith('portal_'));
  const authoredMoveCount = Array.isArray(level.solutionPlacements) ? level.solutionPlacements.length : 0;
  const solvedGrid = applyAuthoredSolution(level);
  const solvedTrace = traceLaserBeam(solvedGrid, level.cols, level.rows);
  const solvedByAuthoredPlacements = antennaCount > 0
    && solvedTrace.litAntennaCount >= antennaCount
    && solvedTrace.litRelayCount >= relayCount;
  const boardFits = metrics.boardWidth <= viewport.width && metrics.boardHeight <= viewport.height;
  const parStatus = getParStatus(level.par, authoredMoveCount);
  return Object.freeze({
    id: safeLevelId(level, index),
    name: typeof level?.name === 'string' ? level.name : `Nivel ${index + 1}`,
    difficulty: typeof level?.difficulty === 'string' ? level.difficulty : 'unknown',
    challengeType: getChallengeType(level, antennaCount),
    usesPortal,
    antennaCount,
    relayCount,
    movablePieceCount: (level.cells ?? []).filter((cell) => cell.movable).length,
    authoredMoveCount,
    par: Math.max(0, Math.round(Number(level.par) || 0)),
    parStatus,
    solvedByAuthoredPlacements,
    boardFits,
    boardWidth: metrics.boardWidth,
    boardHeight: metrics.boardHeight,
    compact: metrics.compact === true,
  });
}

export function buildLaserPuzzleAuthoringReview(levels = buildLaserDemoLevels(), options = {}) {
  const levelList = Array.isArray(levels) ? levels : [];
  const viewport = {
    width: Math.max(320, Number(options.viewport?.width) || DEFAULT_VIEWPORT.width),
    height: Math.max(240, Number(options.viewport?.height) || DEFAULT_VIEWPORT.height),
  };
  const levelSummaries = levelList.map((level, index) => reviewLaserLevel(level, index, viewport));
  const unresolvedLevelIds = levelSummaries
    .filter((level) => !level.solvedByAuthoredPlacements || !level.boardFits)
    .map((level) => level.id);
  const parIssueLevelIds = levelSummaries
    .filter((level) => level.parStatus !== 'calibrated')
    .map((level) => level.id);
  const allValid = levelSummaries.length > 0
    && unresolvedLevelIds.length === 0
    && parIssueLevelIds.length === 0;
  return Object.freeze({
    schemaVersion: 'laser_puzzle_authoring_review_v1',
    levelAuthoringStatus: allValid ? 'valid_for_internal_demo' : 'needs_authoring_review',
    solverConsistency: Object.freeze({
      totalLevels: levelSummaries.length,
      solvedByAuthoredPlacements: levelSummaries.filter((level) => level.solvedByAuthoredPlacements).length,
      boardFitLevels: levelSummaries.filter((level) => level.boardFits).length,
      multiObjectiveLevels: levelSummaries.filter((level) => level.challengeType === 'multi_target_splitter').length,
      portalRoutingLevels: levelSummaries.filter((level) => level.usesPortal).length,
      parCalibratedLevels: levelSummaries.filter((level) => level.parStatus === 'calibrated').length,
      unresolvedLevelIds,
      parIssueLevelIds,
    }),
    parCalibrationNote: parIssueLevelIds.length > 0
      ? 'Revisar par esperado antes de usar solutionEfficiency como métrica comparativa.'
      : 'Par esperado calibrado para la secuencia interna actual.',
    recommendedLevelAction: allValid
      ? 'keep_current_levels_for_internal_demo'
      : 'revise_unsolved_or_unfitted_levels_before_candidate_use',
    levelSummaries,
    privacy: Object.freeze({
      authoringOnly: true,
      rawBeamUsed: false,
      authoredGeometryExported: false,
      candidateRouteRequired: false,
    }),
  });
}

export function summarizeLaserPuzzleAuthoring(levels = buildLaserDemoLevels()) {
  const review = buildLaserPuzzleAuthoringReview(levels);
  return Object.freeze({
    totalLevels: review.solverConsistency.totalLevels,
    solvedLevels: review.solverConsistency.solvedByAuthoredPlacements,
    boardFitLevels: review.solverConsistency.boardFitLevels,
    multiObjectiveLevels: review.solverConsistency.multiObjectiveLevels,
    portalRoutingLevels: review.solverConsistency.portalRoutingLevels,
    parCalibratedLevels: review.solverConsistency.parCalibratedLevels,
    authoringStatus: review.levelAuthoringStatus,
    recommendedLevelAction: review.recommendedLevelAction,
  });
}
