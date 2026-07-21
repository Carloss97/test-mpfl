export const ORIGINAL_GAME_FEATURE_VECTOR_TYPE = 'original_game_feature_vector_v1';
export const ORIGINAL_GAME_FEATURE_VECTOR_VERSION = '1.0.0';

export const ORIGINAL_GAME_FEATURE_ORDER = Object.freeze([
  'laser.completion',
  'laser.solvedRate',
  'laser.solutionEfficiency',
  'laser.ruleCompliance',
  'laser.moveCount',
  'laser.timeMs',
  'balloon.completion',
  'balloon.riskEfficiency',
  'balloon.cashoutRate',
  'balloon.popRate',
  'balloon.averagePumpsNormalized',
  'balloon.postLossAdjustment',
  'balloon.postLossAdjustmentObserved',
  'balloon.timeMs',
  'passenger.completion',
  'passenger.deliveryRate',
  'passenger.routeEfficiency',
  'passenger.constraintCompliance',
  'passenger.replanRate',
  'passenger.stationUseCount',
  'passenger.satisfactionNormalized',
  'passenger.timeMs',
  'team.completion',
  'team.leadershipScore',
  'team.communicationScore',
  'team.adaptabilityScore',
  'team.decisionQualityScore',
  'team.alignmentScore',
  'team.roleClarityScore',
  'team.feedbackUseScore',
  'team.changeResponseScore',
  'team.timeMs',
]);

const FEATURE_UNITS = Object.freeze({
  'laser.completion': 'ratio',
  'laser.solvedRate': 'ratio',
  'laser.solutionEfficiency': 'ratio',
  'laser.ruleCompliance': 'ratio',
  'laser.moveCount': 'count',
  'laser.timeMs': 'ms',
  'balloon.completion': 'ratio',
  'balloon.riskEfficiency': 'ratio',
  'balloon.cashoutRate': 'ratio',
  'balloon.popRate': 'ratio',
  'balloon.averagePumpsNormalized': 'ratio',
  'balloon.postLossAdjustment': 'pumps',
  'balloon.postLossAdjustmentObserved': 'binary',
  'balloon.timeMs': 'ms',
  'passenger.completion': 'ratio',
  'passenger.deliveryRate': 'ratio',
  'passenger.routeEfficiency': 'ratio',
  'passenger.constraintCompliance': 'ratio',
  'passenger.replanRate': 'ratio',
  'passenger.stationUseCount': 'count',
  'passenger.satisfactionNormalized': 'ratio',
  'passenger.timeMs': 'ms',
  'team.completion': 'ratio',
  'team.leadershipScore': 'ratio',
  'team.communicationScore': 'ratio',
  'team.adaptabilityScore': 'ratio',
  'team.decisionQualityScore': 'ratio',
  'team.alignmentScore': 'ratio',
  'team.roleClarityScore': 'ratio',
  'team.feedbackUseScore': 'ratio',
  'team.changeResponseScore': 'ratio',
  'team.timeMs': 'ms',
});

export const ORIGINAL_GAME_FEATURE_DEFINITIONS = Object.freeze({
  'laser.completion': Object.freeze({
    sourceGame: 'laser_puzzle',
    aggregateInputs: Object.freeze(['completed']),
    metricFormula: 'completed ? 1 : 0',
    metricRationale: 'Completion marks whether the candidate reached the task goal under the authored rule set, so it is a coarse prerequisite for interpreting efficiency features.',
    constructRelevance: 'Supports availability of problem-solving evidence but is not a standalone ability score.',
    limitations: Object.freeze(['Binary completion ignores strategy quality.', 'Can be affected by instructions, device, or time limits.']),
  }),
  'laser.solvedRate': Object.freeze({
    sourceGame: 'laser_puzzle',
    aggregateInputs: Object.freeze(['solvedLevels', 'levelCount']),
    metricFormula: 'solvedLevels / levelCount',
    metricRationale: 'The ratio links the number of solved rule-based puzzles to the number administered, representing observable goal attainment without storing the puzzle path.',
    constructRelevance: 'Feeds provisional problem-solving and analytical-thinking composites when Laser is complete.',
    limitations: Object.freeze(['Small level count; not a norm or percentile.', 'Does not separate insight from trial-and-error.']),
  }),
  'laser.solutionEfficiency': Object.freeze({
    sourceGame: 'laser_puzzle',
    aggregateInputs: Object.freeze(['solutionEfficiency', 'moveCount']),
    metricFormula: 'authored aggregate, conceptually par / movimientos with penalties upstream',
    metricRationale: 'A solution close to par with fewer aggregate movements indicates efficient manipulation of explicit rules; only the count ratio is stored, not the sequence.',
    constructRelevance: 'Primary Laser input for provisional problem-solving and analytical-thinking composites.',
    limitations: Object.freeze(['Depends on authored par quality.', 'Cannot prove general intelligence or workplace performance.']),
  }),
  'laser.ruleCompliance': Object.freeze({
    sourceGame: 'laser_puzzle',
    aggregateInputs: Object.freeze(['ruleViolationCount', 'levelCount']),
    metricFormula: '1 - min(1, ruleViolationCount / max(1, levelCount))',
    metricRationale: 'Violations indicate observable departures from task constraints; normalizing by level count gives a bounded compliance signal.',
    constructRelevance: 'Supports rule-following component of the Laser composite.',
    limitations: Object.freeze(['A low score may reflect misunderstanding rather than ability.', 'Violation categories are game-specific.']),
  }),
  'laser.moveCount': Object.freeze({
    sourceGame: 'laser_puzzle',
    aggregateInputs: Object.freeze(['moveCount']),
    metricFormula: 'non-negative aggregate count',
    metricRationale: 'The count captures amount of reconfiguration effort without recording which pieces moved or in what order.',
    constructRelevance: 'Diagnostic context for efficiency and review, not directly scored as talent.',
    limitations: Object.freeze(['Higher count is not always worse without level context.', 'Does not preserve strategy path by design.']),
  }),
  'laser.timeMs': Object.freeze({
    sourceGame: 'laser_puzzle',
    aggregateInputs: Object.freeze(['timeMs']),
    metricFormula: 'elapsed milliseconds for aggregate game block',
    metricRationale: 'Elapsed time contextualizes solution behavior while avoiding timestamped action logs.',
    constructRelevance: 'Used as reviewer context and future validation covariate.',
    limitations: Object.freeze(['Device interruptions and reading speed can affect time.', 'Not a speed norm.']),
  }),
  'balloon.completion': Object.freeze({
    sourceGame: 'balloon_risk',
    aggregateInputs: Object.freeze(['completed']),
    metricFormula: 'completed ? 1 : 0',
    metricRationale: 'Completion indicates that the full risk/reward sequence was administered, enabling descriptive interpretation of aggregate strategy.',
    constructRelevance: 'Availability flag for risk/feedback descriptive evidence.',
    limitations: Object.freeze(['Not a quality score.', 'Can be affected by dropout or instructions.']),
  }),
  'balloon.riskEfficiency': Object.freeze({
    sourceGame: 'balloon_risk',
    aggregateInputs: Object.freeze(['riskEfficiency', 'score']),
    metricFormula: 'validated aggregate riskEfficiency in [0,1]',
    metricRationale: 'The index summarizes reward captured relative to risk losses in the game, describing strategy under uncertainty without action sequences.',
    constructRelevance: 'Descriptive input for risk/feedback and decision-strategy caveats.',
    limitations: Object.freeze(['No debe interpretarse como personalidad, tolerancia a la frustración ni mejor toma de decisiones global.', 'Reward structure is game-specific.']),
  }),
  'balloon.cashoutRate': Object.freeze({
    sourceGame: 'balloon_risk',
    aggregateInputs: Object.freeze(['cashoutCount', 'totalRounds']),
    metricFormula: 'cashoutCount / totalRounds',
    metricRationale: 'Cashout rate describes how often the candidate chose to secure accumulated reward before loss, a bounded aggregate strategy marker.',
    constructRelevance: 'Reviewer context for risk/reward strategy.',
    limitations: Object.freeze(['No normative direction without criterion data.', 'Affected by perceived task rules and reward schedule.']),
  }),
  'balloon.popRate': Object.freeze({
    sourceGame: 'balloon_risk',
    aggregateInputs: Object.freeze(['popCount', 'totalRounds']),
    metricFormula: 'popCount / totalRounds',
    metricRationale: 'Pop rate summarizes exposure to loss events without storing pump-by-pump behavior.',
    constructRelevance: 'Reviewer context for risk exposure and feedback opportunities.',
    limitations: Object.freeze(['Loss count alone is not impulsivity or poor performance.', 'Chance threshold distribution affects the value.']),
  }),
  'balloon.averagePumpsNormalized': Object.freeze({
    sourceGame: 'balloon_risk',
    aggregateInputs: Object.freeze(['averagePumps']),
    metricFormula: 'min(1, averagePumps / 12)',
    metricRationale: 'Average pumps provides a coarse intensity marker for accumulation strategy, normalized to a conservative cap for vector stability.',
    constructRelevance: 'Reviewer context for risk/reward behavior.',
    limitations: Object.freeze(['Cap is provisional and not normed.', 'Average hides round-level adaptation.']),
  }),
  'balloon.postLossAdjustment': Object.freeze({
    sourceGame: 'balloon_risk',
    aggregateInputs: Object.freeze(['postPopAdjustment', 'postPopAdjustmentCount']),
    metricFormula: 'postPopAdjustment only when postPopAdjustmentCount > 0',
    metricRationale: 'The metric captures aggregate change after a loss only when such a loss-to-next-choice transition was actually observed.',
    constructRelevance: 'Descriptive evidence for feedback adjustment, not adaptability or frustration tolerance.',
    limitations: Object.freeze(['Requires observed post-loss opportunities.', 'A value of 0 is distinct from missing only through the observed mask.']),
  }),
  'balloon.postLossAdjustmentObserved': Object.freeze({
    sourceGame: 'balloon_risk',
    aggregateInputs: Object.freeze(['postPopAdjustmentCount']),
    metricFormula: 'postPopAdjustmentCount > 0 ? 1 : 0',
    metricRationale: 'This flag prevents a true zero adjustment from being confused with an unobserved post-loss transition.',
    constructRelevance: 'Availability control for feedback-adjustment interpretation.',
    limitations: Object.freeze(['Does not score adjustment quality.', 'Depends on whether a loss occurred.']),
  }),
  'balloon.timeMs': Object.freeze({
    sourceGame: 'balloon_risk',
    aggregateInputs: Object.freeze(['timeMs']),
    metricFormula: 'elapsed milliseconds for aggregate game block',
    metricRationale: 'Elapsed time contextualizes risk/reward choices while avoiding action-by-action logs.',
    constructRelevance: 'Reviewer context and future validation covariate.',
    limitations: Object.freeze(['Not a normed speed measure.', 'May reflect reading/device interruptions.']),
  }),
  'passenger.completion': Object.freeze({
    sourceGame: 'passenger_routes',
    aggregateInputs: Object.freeze(['completed']),
    metricFormula: 'completed ? 1 : 0',
    metricRationale: 'Completion indicates whether all authored route goals were reached under the constraints, enabling route-efficiency interpretation.',
    constructRelevance: 'Availability flag for planning and analytical-thinking evidence.',
    limitations: Object.freeze(['Binary completion does not describe route quality.', 'Can be affected by time limit or device controls.']),
  }),
  'passenger.deliveryRate': Object.freeze({
    sourceGame: 'passenger_routes',
    aggregateInputs: Object.freeze(['passengersDelivered', 'destinationCount']),
    metricFormula: 'passengersDelivered / destinationCount',
    metricRationale: 'The ratio maps delivered passengers to required destinations, reflecting goal attainment without storing route cells.',
    constructRelevance: 'Passenger component for planning and problem-solving composites.',
    limitations: Object.freeze(['Small number of destinations.', 'Does not encode route sequence by design.']),
  }),
  'passenger.routeEfficiency': Object.freeze({
    sourceGame: 'passenger_routes',
    aggregateInputs: Object.freeze(['routeEfficiency']),
    metricFormula: 'minimumCost / actualCost as upstream aggregate in [0,1]',
    metricRationale: 'Comparing aggregate actual cost with solver minimum links behavior to constraint optimization while avoiding reconstructive paths.',
    constructRelevance: 'Primary Passenger input for planning and analytical-thinking composites.',
    limitations: Object.freeze(['Depends on solver and level authoring.', 'Not direct evidence of real-world logistics performance.']),
  }),
  'passenger.constraintCompliance': Object.freeze({
    sourceGame: 'passenger_routes',
    aggregateInputs: Object.freeze(['constraintViolationCount', 'movementAttemptCount']),
    metricFormula: '1 - min(1, constraintViolationCount / max(1, movementAttemptCount))',
    metricRationale: 'La métrica relaciona violaciones de restricción con el total de intentos de movimiento, acotando cumplimiento de reglas sin guardar celdas intentadas.',
    constructRelevance: 'Passenger component for planning under constraints.',
    limitations: Object.freeze(['Violations may reflect UI misunderstanding.', 'Requires movementAttemptCount to avoid overinterpreting raw violation count.']),
  }),
  'passenger.replanRate': Object.freeze({
    sourceGame: 'passenger_routes',
    aggregateInputs: Object.freeze(['replanCount', 'movementAttemptCount']),
    metricFormula: 'min(1, replanCount / max(1, movementAttemptCount))',
    metricRationale: 'Replan rate captures explicit review/replan actions relative to route activity, preserving strategy context without routes.',
    constructRelevance: 'Descriptive context for planning strategy.',
    limitations: Object.freeze(['Replanning can be adaptive or inefficient depending on context.', 'Not scored directionally without validation.']),
  }),
  'passenger.stationUseCount': Object.freeze({
    sourceGame: 'passenger_routes',
    aggregateInputs: Object.freeze(['stationUseCount']),
    metricFormula: 'non-negative aggregate count',
    metricRationale: 'Station use counts reliance on support stops/recharge under route constraints without storing where/when they were used.',
    constructRelevance: 'Reviewer context for resource management.',
    limitations: Object.freeze(['May be optimal for some levels.', 'Requires level context for interpretation.']),
  }),
  'passenger.satisfactionNormalized': Object.freeze({
    sourceGame: 'passenger_routes',
    aggregateInputs: Object.freeze(['satisfactionScore']),
    metricFormula: 'satisfactionScore / 100',
    metricRationale: 'The normalized aggregate translates the game’s completion/efficiency satisfaction summary to a bounded reviewer context metric.',
    constructRelevance: 'Contextual support for route outcome quality.',
    limitations: Object.freeze(['Derived game score, not candidate satisfaction or customer-service trait.', 'Depends on scoring design.']),
  }),
  'passenger.timeMs': Object.freeze({
    sourceGame: 'passenger_routes',
    aggregateInputs: Object.freeze(['timeMs']),
    metricFormula: 'elapsed milliseconds for aggregate game block',
    metricRationale: 'Elapsed time contextualizes route planning while avoiding route or action logs.',
    constructRelevance: 'Reviewer context and future validation covariate.',
    limitations: Object.freeze(['Not a normed speed measure.', 'May be affected by instructions, device, or interruptions.']),
  }),
  'team.completion': Object.freeze({
    sourceGame: 'team_coordination',
    aggregateInputs: Object.freeze(['completed']),
    metricFormula: 'completed ? 1 : 0',
    metricRationale: 'Completion indicates that the structured coordination scenarios were administered, enabling interpretation of social-judgment aggregates.',
    constructRelevance: 'Availability flag for leadership, communication and adaptability evidence in the demo.',
    limitations: Object.freeze(['Scenario completion is not a workplace assessment by itself.', 'Structured choices simplify real communication.']),
  }),
  'team.leadershipScore': Object.freeze({
    sourceGame: 'team_coordination',
    aggregateInputs: Object.freeze(['leadershipScore', 'roleClarityScore', 'alignmentScore']),
    metricFormula: 'mean structured option leadership score in [0,1]',
    metricRationale: 'The score summarizes choices that make goals, responsibilities and trade-offs explicit in simulated team moments.',
    constructRelevance: 'Primary structured input for provisional leadership evidence.',
    limitations: Object.freeze(['Not a group interaction or peer rating.', 'Requires validation before candidate comparison.']),
  }),
  'team.communicationScore': Object.freeze({
    sourceGame: 'team_coordination',
    aggregateInputs: Object.freeze(['communicationScore', 'alignmentScore', 'feedbackUseScore']),
    metricFormula: 'mean structured option communication score in [0,1]',
    metricRationale: 'The score summarizes structured choices that explain context, next steps and clarification loops without storing free text.',
    constructRelevance: 'Primary structured input for provisional communication evidence.',
    limitations: Object.freeze(['Does not evaluate writing style or live speech.', 'Structured multiple-choice options constrain expression.']),
  }),
  'team.adaptabilityScore': Object.freeze({
    sourceGame: 'team_coordination',
    aggregateInputs: Object.freeze(['adaptabilityScore', 'changeResponseScore']),
    metricFormula: 'mean structured option adaptability score in [0,1]',
    metricRationale: 'The score summarizes how choices respond to changing priorities, missing resources and feedback in controlled scenarios.',
    constructRelevance: 'Primary structured input for provisional adaptability evidence.',
    limitations: Object.freeze(['Scenario-based adaptation is not equivalent to longitudinal workplace flexibility.', 'Requires forms and validation.']),
  }),
  'team.decisionQualityScore': Object.freeze({
    sourceGame: 'team_coordination',
    aggregateInputs: Object.freeze(['decisionQualityScore']),
    metricFormula: 'mean structured option decision score in [0,1]',
    metricRationale: 'The score summarizes whether choices make bounded, actionable trade-offs under constraints, without assigning normative hiring decisions.',
    constructRelevance: 'Structured support for provisional decision-making evidence.',
    limitations: Object.freeze(['No normative cut score.', 'Does not establish real-world decision quality.']),
  }),
  'team.alignmentScore': Object.freeze({
    sourceGame: 'team_coordination',
    aggregateInputs: Object.freeze(['alignmentScore']),
    metricFormula: 'mean structured option alignment score in [0,1]',
    metricRationale: 'Captures whether choices align team goal, priority and next action in the simulated brief.',
    constructRelevance: 'Contextual support for communication and leadership.',
    limitations: Object.freeze(['Contextual feature, not a standalone talent score.']),
  }),
  'team.roleClarityScore': Object.freeze({
    sourceGame: 'team_coordination',
    aggregateInputs: Object.freeze(['roleClarityScore']),
    metricFormula: 'mean structured option role-clarity score in [0,1]',
    metricRationale: 'Captures whether choices assign or clarify responsibilities in the simulated team workflow.',
    constructRelevance: 'Contextual support for leadership.',
    limitations: Object.freeze(['Does not observe actual delegation outcomes.']),
  }),
  'team.feedbackUseScore': Object.freeze({
    sourceGame: 'team_coordination',
    aggregateInputs: Object.freeze(['feedbackUseScore']),
    metricFormula: 'mean structured option feedback-use score in [0,1]',
    metricRationale: 'Captures whether choices integrate team feedback into clarification and replanning.',
    constructRelevance: 'Contextual support for communication and adaptability.',
    limitations: Object.freeze(['Not a measure of emotional regulation or personality.']),
  }),
  'team.changeResponseScore': Object.freeze({
    sourceGame: 'team_coordination',
    aggregateInputs: Object.freeze(['changeResponseScore']),
    metricFormula: 'mean structured option change-response score in [0,1]',
    metricRationale: 'Captures whether choices update priorities and responsibilities when constraints change.',
    constructRelevance: 'Contextual support for adaptability.',
    limitations: Object.freeze(['Single-session scenario signal; no longitudinal stability.']),
  }),
  'team.timeMs': Object.freeze({
    sourceGame: 'team_coordination',
    aggregateInputs: Object.freeze(['timeMs']),
    metricFormula: 'elapsed milliseconds for structured team block',
    metricRationale: 'Elapsed time contextualizes the structured choices while avoiding raw click streams or text.',
    constructRelevance: 'Reviewer context and future validation covariate.',
    limitations: Object.freeze(['Not a communication speed norm.', 'May reflect reading speed.']),
  }),
});

const FORBIDDEN_KEYS = Object.freeze([
  'video',
  'frames',
  'imageData',
  'screenshot',
  'landmarks',
  'keypoints',
  'normalizedKeypoints',
  'faceSamples',
  'blendshapesRaw',
  'pointerSamples',
  'rawPointerPath',
  'fullRoute',
  'routeTrace',
  'visitedCells',
  'stepByStepPath',
  'clickTrace',
  'eventLog',
  'freeText',
  'typedResponse',
  'messageText',
  'optionText',
  'scenarioText',
  'choiceSequence',
  'rawChoices',
  'pumpSequence',
  'beamCells',
  'rawGameEvents',
  'trials',
  'trialResults',
  'stimuli',
  'items',
  'windows',
  'DOMEvent',
  'domEvent',
  'rawDOMEvents',
  'MouseEvent',
  'PointerEvent',
]);

function finite(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function round(value, digits = 4) {
  const numeric = finite(value);
  if (numeric == null) return null;
  const factor = 10 ** digits;
  return Math.round(numeric * factor) / factor;
}

function nonNegativeInteger(value) {
  const numeric = finite(value);
  if (numeric == null || numeric < 0) return null;
  return Math.round(numeric);
}

function hasForbiddenKeys(value) {
  let found = false;
  const visit = (node) => {
    if (found || !node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      if (FORBIDDEN_KEYS.includes(key)) {
        found = true;
        return;
      }
      visit(child);
    }
  };
  visit(value);
  return found;
}

function blockByGame(blocks, gameId) {
  return (Array.isArray(blocks) ? blocks : []).find((block) => block?.gameId === gameId) ?? null;
}

function initializeFeatureState() {
  return {
    featureMap: Object.fromEntries(ORIGINAL_GAME_FEATURE_ORDER.map((key) => [key, null])),
    featureAvailability: Object.fromEntries(ORIGINAL_GAME_FEATURE_ORDER.map((key) => [key, 'not_observed'])),
    gameAvailability: {
      laser_puzzle: 'not_administered',
      balloon_risk: 'not_administered',
      passenger_routes: 'not_administered',
      team_coordination: 'not_administered',
    },
    qualityFlags: [],
  };
}

function setObserved(state, key, value) {
  const numeric = round(value);
  if (numeric == null) return;
  state.featureMap[key] = numeric;
  state.featureAvailability[key] = 'observed';
}

function setInvalidGame(state, gameId, featurePrefix, reason) {
  state.gameAvailability[gameId] = 'invalid';
  state.qualityFlags.push(`${gameId}_${reason}`);
  for (const key of ORIGINAL_GAME_FEATURE_ORDER) {
    if (key.startsWith(`${featurePrefix}.`)) state.featureAvailability[key] = 'invalid';
  }
}

function validRatio(value) {
  const numeric = finite(value);
  return numeric != null && numeric >= 0 && numeric <= 1;
}

function addLaserFeatures(state, block) {
  if (!block) return;
  const result = block.result ?? {};
  if (hasForbiddenKeys(result)) state.qualityFlags.push('laser_puzzle_contains_forbidden_raw_keys');
  const levelCount = nonNegativeInteger(result.levelCount);
  const solvedLevels = nonNegativeInteger(result.solvedLevels);
  const solutionEfficiency = finite(result.solutionEfficiency);
  const ruleViolations = nonNegativeInteger(result.ruleViolationCount ?? 0);
  const aggregateOnly = result.aggregateOnly === true;
  const valid = aggregateOnly
    && levelCount != null
    && levelCount > 0
    && solvedLevels != null
    && solvedLevels <= levelCount
    && validRatio(solutionEfficiency)
    && ruleViolations != null
    && !hasForbiddenKeys(result);
  if (!valid) {
    setInvalidGame(state, 'laser_puzzle', 'laser', 'invalid_aggregate');
    return;
  }
  state.gameAvailability.laser_puzzle = result.completed === true ? 'measured_complete' : 'measured_partial';
  setObserved(state, 'laser.completion', result.completed === true ? 1 : 0);
  setObserved(state, 'laser.solvedRate', solvedLevels / levelCount);
  setObserved(state, 'laser.solutionEfficiency', solutionEfficiency);
  setObserved(state, 'laser.ruleCompliance', Math.max(0, 1 - Math.min(1, ruleViolations / Math.max(1, levelCount))));
  setObserved(state, 'laser.moveCount', nonNegativeInteger(result.moveCount ?? 0));
  setObserved(state, 'laser.timeMs', Math.max(0, finite(result.timeMs) ?? 0));
}

function addBalloonFeatures(state, block) {
  if (!block) return;
  const result = block.result ?? {};
  if (hasForbiddenKeys(result)) state.qualityFlags.push('balloon_risk_contains_forbidden_raw_keys');
  const roundsCompleted = nonNegativeInteger(result.roundsCompleted);
  const totalRounds = nonNegativeInteger(result.totalRounds);
  const cashoutCount = nonNegativeInteger(result.cashoutCount ?? 0);
  const popCount = nonNegativeInteger(result.popCount ?? 0);
  const riskEfficiency = finite(result.riskEfficiency ?? result.score);
  const aggregateOnly = result.aggregateOnly === true;
  const valid = aggregateOnly
    && totalRounds != null
    && totalRounds > 0
    && roundsCompleted != null
    && roundsCompleted <= totalRounds
    && cashoutCount != null
    && popCount != null
    && cashoutCount + popCount <= Math.max(totalRounds, roundsCompleted)
    && validRatio(riskEfficiency)
    && !hasForbiddenKeys(result);
  if (!valid) {
    setInvalidGame(state, 'balloon_risk', 'balloon', 'invalid_aggregate');
    return;
  }
  state.gameAvailability.balloon_risk = result.completed === true ? 'measured_complete' : 'measured_partial';
  setObserved(state, 'balloon.completion', result.completed === true ? 1 : 0);
  setObserved(state, 'balloon.riskEfficiency', riskEfficiency);
  setObserved(state, 'balloon.cashoutRate', cashoutCount / totalRounds);
  setObserved(state, 'balloon.popRate', popCount / totalRounds);
  const averagePumps = Math.max(0, finite(result.averagePumps) ?? 0);
  setObserved(state, 'balloon.averagePumpsNormalized', Math.min(1, averagePumps / 12));
  const postLossCount = nonNegativeInteger(result.postPopAdjustmentCount ?? 0);
  setObserved(state, 'balloon.postLossAdjustmentObserved', postLossCount > 0 ? 1 : 0);
  if (postLossCount > 0) setObserved(state, 'balloon.postLossAdjustment', finite(result.postPopAdjustment) ?? 0);
  setObserved(state, 'balloon.timeMs', Math.max(0, finite(result.timeMs) ?? 0));
}

function addPassengerFeatures(state, block) {
  if (!block) return;
  const result = block.result ?? {};
  if (hasForbiddenKeys(result)) state.qualityFlags.push('passenger_routes_contains_forbidden_raw_keys');
  const delivered = nonNegativeInteger(result.passengersDelivered);
  const destinations = nonNegativeInteger(result.destinationCount);
  const routeEfficiency = finite(result.routeEfficiency);
  const violations = nonNegativeInteger(result.constraintViolationCount ?? 0);
  const replans = nonNegativeInteger(result.replanCount ?? 0);
  const movementAttempts = nonNegativeInteger(result.movementAttemptCount ?? result.moveCount ?? result.passengersDelivered ?? 0);
  const satisfaction = finite(result.satisfactionScore);
  const aggregateOnly = result.aggregateOnly === true;
  const valid = aggregateOnly
    && destinations != null
    && destinations > 0
    && delivered != null
    && delivered <= destinations
    && validRatio(routeEfficiency)
    && violations != null
    && replans != null
    && movementAttempts != null
    && (satisfaction == null || (satisfaction >= 0 && satisfaction <= 100))
    && !hasForbiddenKeys(result);
  if (!valid) {
    setInvalidGame(state, 'passenger_routes', 'passenger', 'invalid_aggregate');
    return;
  }
  state.gameAvailability.passenger_routes = result.completed === true ? 'measured_complete' : 'measured_partial';
  setObserved(state, 'passenger.completion', result.completed === true ? 1 : 0);
  setObserved(state, 'passenger.deliveryRate', delivered / destinations);
  setObserved(state, 'passenger.routeEfficiency', routeEfficiency);
  setObserved(state, 'passenger.constraintCompliance', Math.max(0, 1 - Math.min(1, violations / Math.max(1, movementAttempts))));
  setObserved(state, 'passenger.replanRate', Math.min(1, replans / Math.max(1, movementAttempts)));
  setObserved(state, 'passenger.stationUseCount', nonNegativeInteger(result.stationUseCount ?? 0));
  if (satisfaction != null) setObserved(state, 'passenger.satisfactionNormalized', satisfaction / 100);
  setObserved(state, 'passenger.timeMs', Math.max(0, finite(result.timeMs) ?? 0));
}

function addTeamCoordinationFeatures(state, block) {
  if (!block) return;
  const result = block.result ?? {};
  if (hasForbiddenKeys(result)) state.qualityFlags.push('team_coordination_contains_forbidden_raw_keys');
  const scenarioCount = nonNegativeInteger(result.scenarioCount);
  const completedScenarioCount = nonNegativeInteger(result.completedScenarioCount);
  const leadership = finite(result.leadershipScore);
  const communication = finite(result.communicationScore);
  const adaptability = finite(result.adaptabilityScore);
  const decision = finite(result.decisionQualityScore);
  const aggregateOnly = result.aggregateOnly === true;
  const valid = aggregateOnly
    && scenarioCount != null
    && scenarioCount > 0
    && completedScenarioCount != null
    && completedScenarioCount <= scenarioCount
    && validRatio(leadership)
    && validRatio(communication)
    && validRatio(adaptability)
    && validRatio(decision)
    && !hasForbiddenKeys(result);
  if (!valid) {
    setInvalidGame(state, 'team_coordination', 'team', 'invalid_aggregate');
    return;
  }
  state.gameAvailability.team_coordination = result.completed === true ? 'measured_complete' : 'measured_partial';
  setObserved(state, 'team.completion', result.completed === true ? 1 : 0);
  setObserved(state, 'team.leadershipScore', leadership);
  setObserved(state, 'team.communicationScore', communication);
  setObserved(state, 'team.adaptabilityScore', adaptability);
  setObserved(state, 'team.decisionQualityScore', decision);
  setObserved(state, 'team.alignmentScore', validRatio(result.alignmentScore) ? result.alignmentScore : communication);
  setObserved(state, 'team.roleClarityScore', validRatio(result.roleClarityScore) ? result.roleClarityScore : leadership);
  setObserved(state, 'team.feedbackUseScore', validRatio(result.feedbackUseScore) ? result.feedbackUseScore : communication);
  setObserved(state, 'team.changeResponseScore', validRatio(result.changeResponseScore) ? result.changeResponseScore : adaptability);
  setObserved(state, 'team.timeMs', Math.max(0, finite(result.timeMs) ?? 0));
}

export function validateOriginalGameFeatureVectorPrivacy(value = {}) {
  const violations = [];
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      if (FORBIDDEN_KEYS.includes(key)) violations.push(key);
      visit(child);
    }
  };
  visit(value);
  const unique = [...new Set(violations)];
  return { ok: unique.length === 0, violations: unique };
}

export function buildOriginalGameFeatureVector({ blocks = [], runId = null, batteryId = null } = {}) {
  const state = initializeFeatureState();
  addLaserFeatures(state, blockByGame(blocks, 'laser_puzzle'));
  addBalloonFeatures(state, blockByGame(blocks, 'balloon_risk'));
  addPassengerFeatures(state, blockByGame(blocks, 'passenger_routes'));
  addTeamCoordinationFeatures(state, blockByGame(blocks, 'team_coordination'));

  const featureArray = ORIGINAL_GAME_FEATURE_ORDER.map((key) => {
    const value = state.featureMap[key];
    return Number.isFinite(Number(value)) ? Number(value) : 0;
  });
  const observedMask = ORIGINAL_GAME_FEATURE_ORDER.map((key) => (state.featureAvailability[key] === 'observed' ? 1 : 0));
  const vector = {
    type: ORIGINAL_GAME_FEATURE_VECTOR_TYPE,
    version: ORIGINAL_GAME_FEATURE_VECTOR_VERSION,
    featureDefinitionsVersion: '1.0.0',
    runId,
    batteryId,
    featureOrder: [...ORIGINAL_GAME_FEATURE_ORDER],
    featureMap: state.featureMap,
    featureArray,
    observedMask,
    featureAvailability: state.featureAvailability,
    gameAvailability: state.gameAvailability,
    encoding: {
      missingValue: 0,
      requiresObservedMask: true,
    },
    units: { ...FEATURE_UNITS },
    qualityFlags: [...new Set(state.qualityFlags)],
    privacy: {
      aggregateOnly: true,
      rawRoutesStored: false,
      rawEventsStored: false,
      rawPointerStored: false,
      rawBiometricsStored: false,
    },
  };
  return {
    ...vector,
    privacyValidation: validateOriginalGameFeatureVectorPrivacy(vector),
  };
}
