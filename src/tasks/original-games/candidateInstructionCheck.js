const INSTRUCTION_FORBIDDEN_KEYS = Object.freeze([
  'fullRoute',
  'routeTrace',
  'visitedCells',
  'stepByStepPath',
  'rawPointerPath',
  'pointerSamples',
  'rawGameEvents',
  'pumpSequence',
  'beamCells',
  'trials',
  'clickTrace',
]);

function finite(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function nonNegativeInteger(value) {
  const numeric = finite(value);
  if (numeric == null || numeric < 0) return null;
  return Math.round(numeric);
}

function ratio(numerator, denominator) {
  const top = finite(numerator);
  const bottom = finite(denominator);
  if (top == null || bottom == null || bottom <= 0) return null;
  return Math.max(0, Math.min(1, top / bottom));
}

function round(value, digits = 4) {
  const numeric = finite(value);
  if (numeric == null) return null;
  const factor = 10 ** digits;
  return Math.round(numeric * factor) / factor;
}

function hasForbiddenKeys(value) {
  if (!value || typeof value !== 'object') return false;
  return Object.keys(value).some((key) => INSTRUCTION_FORBIDDEN_KEYS.includes(key));
}

function baseSummary(gameId, instructionRisk, reason, diagnostics = {}) {
  return {
    gameId,
    instructionRisk,
    reason,
    diagnostics,
  };
}

function summarizeLaser(result = {}) {
  const solvedRate = ratio(result.solvedLevels, result.levelCount);
  const violationRate = ratio(result.ruleViolationCount ?? 0, Math.max(1, nonNegativeInteger(result.levelCount) ?? 1));
  const diagnostics = { solvedRate: round(solvedRate), ruleViolationRate: round(violationRate) };
  if ((violationRate ?? 0) >= 1 || ((violationRate ?? 0) >= 0.5 && (solvedRate ?? 0) <= 0.34)) {
    return baseSummary('laser_puzzle', 'high', 'rule_comprehension_review', diagnostics);
  }
  if ((violationRate ?? 0) >= 0.34) return baseSummary('laser_puzzle', 'review', 'rule_copy_review', diagnostics);
  return baseSummary('laser_puzzle', 'low', 'no_instruction_signal_detected', diagnostics);
}

function summarizePassenger(result = {}) {
  const deliveryRate = ratio(result.passengersDelivered, result.destinationCount);
  const constraintViolationRate = ratio(result.constraintViolationCount ?? 0, result.movementAttemptCount);
  const diagnostics = {
    deliveryRate: round(deliveryRate),
    constraintViolationRate: round(constraintViolationRate),
  };
  if ((constraintViolationRate ?? 0) >= 0.25 && (deliveryRate ?? 0) < 0.7) {
    return baseSummary('passenger_routes', 'high', 'constraint_instruction_review', diagnostics);
  }
  if ((constraintViolationRate ?? 0) >= 0.15) {
    return baseSummary('passenger_routes', 'review', 'constraint_copy_review', diagnostics);
  }
  return baseSummary('passenger_routes', 'low', 'no_instruction_signal_detected', diagnostics);
}

function summarizeBalloon(result = {}) {
  const completionRate = ratio(result.roundsCompleted, result.totalRounds);
  const popRate = ratio(result.popCount ?? 0, result.totalRounds);
  const cashoutRate = ratio(result.cashoutCount ?? 0, result.totalRounds);
  const diagnostics = {
    completionRate: round(completionRate),
    popRate: round(popRate),
    cashoutRate: round(cashoutRate),
  };
  if ((completionRate ?? 1) < 0.75) return baseSummary('balloon_risk', 'high', 'incomplete_rounds_instruction_review', diagnostics);
  if ((popRate ?? 0) >= 0.75 && (cashoutRate ?? 1) <= 0.25) {
    return baseSummary('balloon_risk', 'review', 'risk_feedback_copy_or_threshold_review', diagnostics);
  }
  return baseSummary('balloon_risk', 'low', 'no_instruction_signal_detected', diagnostics);
}

function summarizeTeamCoordination(result = {}) {
  const completionRate = ratio(result.completedScenarioCount, result.scenarioCount);
  const diagnostics = { completionRate: round(completionRate) };
  if ((completionRate ?? 0) < 0.75) {
    return baseSummary('team_coordination', 'review', 'incomplete_structured_brief_instruction_review', diagnostics);
  }
  return baseSummary('team_coordination', 'low', 'no_instruction_signal_detected', diagnostics);
}

function normalizeBlock(block = {}) {
  const gameId = block.gameId ?? block.block?.gameId ?? block.result?.gameId ?? block.summary?.gameId ?? 'unknown';
  const result = block.result ?? block.summary ?? block;
  return { gameId, result };
}

function summarizeGame(block = {}) {
  const { gameId, result } = normalizeBlock(block);
  if (!result || typeof result !== 'object') return baseSummary(gameId, 'high', 'non_aggregate_input');
  if (result.aggregateOnly !== true) return baseSummary(gameId, 'high', 'non_aggregate_input');
  if (hasForbiddenKeys(result)) return baseSummary(gameId, 'high', 'raw_or_reconstructive_input_detected');
  if (gameId === 'laser_puzzle') return summarizeLaser(result);
  if (gameId === 'passenger_routes') return summarizePassenger(result);
  if (gameId === 'balloon_risk') return summarizeBalloon(result);
  if (gameId === 'team_coordination') return summarizeTeamCoordination(result);
  return baseSummary(gameId, 'review', 'unsupported_game_for_instruction_check');
}

function combineRisk(gameSummaries = []) {
  if (gameSummaries.some((game) => game.instructionRisk === 'high')) return 'high';
  if (gameSummaries.some((game) => game.instructionRisk === 'review')) return 'review';
  return 'low';
}

function suggestionForRisk(flag) {
  if (flag === 'high') {
    return 'Revisar instrucciones, onboarding y controles antes de interpretar métricas; excluir temporalmente del mapeo provisional si el patrón persiste.';
  }
  if (flag === 'review') {
    return 'Revisar copy de instrucciones y calibración si el patrón aparece en QA; mantener interpretación descriptiva.';
  }
  return 'Sin señales agregadas de riesgo de comprensión; mantener caveats generales y revisión humana.';
}

export function buildCandidateInstructionCheck(blocks = []) {
  const source = Array.isArray(blocks) ? blocks : [];
  const gameSummaries = source.map(summarizeGame);
  const instructionRiskFlag = combineRisk(gameSummaries);
  const excludeFromTalentMappingFlag = instructionRiskFlag === 'high';
  return {
    schemaVersion: 'candidate_instruction_check_v1',
    instructionRiskFlag,
    excludeFromTalentMappingFlag,
    copyRevisionSuggestion: suggestionForRisk(instructionRiskFlag),
    gameSummaries,
    privacy: { aggregateOnly: true, rawEventsUsed: false, freeTextResponsesStored: false },
  };
}

export function summarizeCandidateInstructionCheck(blocks = []) {
  const check = buildCandidateInstructionCheck(blocks);
  return {
    instructionRiskFlag: check.instructionRiskFlag,
    excludeFromTalentMappingFlag: check.excludeFromTalentMappingFlag,
    reviewedGames: check.gameSummaries.length,
    highRiskGames: check.gameSummaries.filter((game) => game.instructionRisk === 'high').length,
    reviewGames: check.gameSummaries.filter((game) => game.instructionRisk === 'review').length,
    copyRevisionSuggestion: check.copyRevisionSuggestion,
  };
}
