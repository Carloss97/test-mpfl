export const TASK_DEFINITIONS = Object.freeze({
  precision_targeting: {
    id: 'precision_targeting',
    label: 'Precisión visomotora',
    difficulty: 'moving-target',
    targetId: 'precision_target',
    expectedResponse: 'hit',
    measurementFocus: ['input_control', 'motor_planning', 'post_error_adjustment'],
  },
  color_interference: {
    id: 'color_interference',
    label: 'Interferencia color-palabra',
    difficulty: 'conflict',
    targetId: 'color_interference-stimulus',
    measurementFocus: ['inhibitory_control', 'conflict_monitoring', 'reaction_latency'],
    trials: [
      { word: 'ROJO', ink: 'blue', expectedResponse: 'blue' },
      { word: 'AZUL', ink: 'red', expectedResponse: 'red' },
      { word: 'VERDE', ink: 'yellow', expectedResponse: 'yellow' },
      { word: 'AMARILLO', ink: 'green', expectedResponse: 'green' },
    ],
  },
  response_inhibition: {
    id: 'response_inhibition',
    label: 'Go/No-Go inhibición motora',
    difficulty: 'go-no-go',
    targetId: 'response_inhibition-cue',
    measurementFocus: ['response_inhibition', 'commission_errors', 'post_error_adjustment'],
    trials: [
      { cue: 'GO', responseRequired: true, expectedResponse: 'press' },
      { cue: 'NO-GO', responseRequired: false, expectedResponse: 'withhold' },
      { cue: 'GO', responseRequired: true, expectedResponse: 'press' },
      { cue: 'NO-GO', responseRequired: false, expectedResponse: 'withhold' },
    ],
  },
});

function sanitizeTrialIndex(trialIndex) {
  const numeric = Number(trialIndex);
  return Number.isFinite(numeric) && numeric >= 0 ? Math.floor(numeric) : 0;
}

export function getTaskDefinition(taskId) {
  const definition = TASK_DEFINITIONS[taskId];
  if (!definition) {
    throw new Error(`Unknown taskId: ${taskId}`);
  }
  return definition;
}

function getTaskTrial(definition, trialIndex) {
  if (definition.id === 'color_interference' || definition.id === 'response_inhibition') {
    return definition.trials[trialIndex % definition.trials.length];
  }
  return {
    expectedResponse: definition.expectedResponse,
    targetIndex: trialIndex,
  };
}

export function createShownEventForTask({ taskId, trialIndex = 0, timestamp }) {
  const definition = getTaskDefinition(taskId);
  const safeTrialIndex = sanitizeTrialIndex(trialIndex);
  const trial = getTaskTrial(definition, safeTrialIndex);
  const trialId = `${taskId}-${safeTrialIndex + 1}`;
  const targetId = definition.targetId;

  const context = {
    taskId: definition.id,
    taskLabel: definition.label,
    trialIndex: safeTrialIndex,
    difficulty: definition.difficulty,
    measurementFocus: [...definition.measurementFocus],
  };

  if (definition.id === 'color_interference') {
    context.stimulus = { word: trial.word, ink: trial.ink };
    context.expectedResponse = trial.expectedResponse;
  } else if (definition.id === 'response_inhibition') {
    context.stimulus = { cue: trial.cue, responseRequired: trial.responseRequired };
    context.expectedResponse = trial.expectedResponse;
  } else {
    context.expectedResponse = definition.expectedResponse;
    context.targetIndex = safeTrialIndex;
  }

  return {
    type: 'task_shown',
    trialId,
    targetId,
    timestamp: Number(timestamp),
    context,
  };
}

function outcomeFor({ taskId, expectedResponse, response, correct }) {
  if (taskId === 'response_inhibition') {
    if (expectedResponse === 'withhold' && response === 'press') return 'commission_error';
    if (expectedResponse === 'withhold' && response === 'withhold') return 'correct_withhold';
    if (expectedResponse === 'press' && response === 'press') return 'correct_go';
    if (expectedResponse === 'press' && response !== 'press') return 'omission_error';
  }
  return correct ? 'correct' : 'incorrect';
}

export function scoreTaskResponse({ shownEvent, response, timestamp, extraContext = {} }) {
  const context = shownEvent?.context ?? {};
  const expectedResponse = context.expectedResponse;
  const normalizedResponse = String(response ?? '').toLowerCase();
  const normalizedExpected = String(expectedResponse ?? '').toLowerCase();
  const correct = normalizedResponse === normalizedExpected;
  const score = correct ? 1 : 0;
  const reactionTimeMs = Number(timestamp) - Number(shownEvent.timestamp);

  return {
    type: 'task_response',
    trialId: shownEvent.trialId,
    targetId: shownEvent.targetId,
    timestamp: Number(timestamp),
    context: {
      taskId: context.taskId,
      taskLabel: context.taskLabel,
      trialIndex: context.trialIndex,
      expectedResponse,
      response,
      correct,
      outcome: outcomeFor({ taskId: context.taskId, expectedResponse, response: normalizedResponse, correct }),
      score,
      reactionTimeMs,
      ...extraContext,
    },
  };
}

export function scoreTaskTimeout({ shownEvent, timestamp }) {
  const expectedResponse = shownEvent?.context?.expectedResponse;
  const timeoutResponse = expectedResponse === 'withhold' ? 'withhold' : 'timeout';
  return scoreTaskResponse({
    shownEvent,
    response: timeoutResponse,
    timestamp,
    extraContext: { timeoutGenerated: true },
  });
}
