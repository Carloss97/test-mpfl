import { describe, expect, it } from 'vitest';
import {
  TASK_DEFINITIONS,
  createShownEventForTask,
  getTaskDefinition,
  scoreTaskResponse,
  scoreTaskTimeout,
} from './taskLibrary.js';

describe('TASK_DEFINITIONS', () => {
  it('includes three browser-side telemetry tasks with explicit measurement focus', () => {
    expect(Object.keys(TASK_DEFINITIONS)).toEqual(['precision_targeting', 'color_interference', 'response_inhibition']);
    expect(getTaskDefinition('precision_targeting')).toMatchObject({
      id: 'precision_targeting',
      label: 'Precisión visomotora',
      measurementFocus: ['input_control', 'motor_planning', 'post_error_adjustment'],
    });
    expect(getTaskDefinition('color_interference')).toMatchObject({
      id: 'color_interference',
      label: 'Interferencia color-palabra',
      measurementFocus: ['inhibitory_control', 'conflict_monitoring', 'reaction_latency'],
    });
    expect(getTaskDefinition('response_inhibition')).toMatchObject({
      id: 'response_inhibition',
      label: 'Go/No-Go inhibición motora',
      measurementFocus: ['response_inhibition', 'commission_errors', 'post_error_adjustment'],
    });
  });
});

describe('createShownEventForTask', () => {
  it('creates metadata-only task_shown events for the color-interference task', () => {
    const event = createShownEventForTask({
      taskId: 'color_interference',
      trialIndex: 1,
      timestamp: 1234,
    });

    expect(event).toEqual({
      type: 'task_shown',
      trialId: 'color_interference-2',
      targetId: 'color_interference-stimulus',
      timestamp: 1234,
      context: {
        taskId: 'color_interference',
        taskLabel: 'Interferencia color-palabra',
        trialIndex: 1,
        difficulty: 'conflict',
        measurementFocus: ['inhibitory_control', 'conflict_monitoring', 'reaction_latency'],
        stimulus: { word: 'AZUL', ink: 'red' },
        expectedResponse: 'red',
      },
    });
    expect(JSON.stringify(event)).not.toContain('clientX');
    expect(JSON.stringify(event)).not.toContain('HTMLElement');
  });

  it('creates metadata-only task_shown events for response inhibition go/no-go trials', () => {
    const goEvent = createShownEventForTask({
      taskId: 'response_inhibition',
      trialIndex: 0,
      timestamp: 2000,
    });
    const noGoEvent = createShownEventForTask({
      taskId: 'response_inhibition',
      trialIndex: 1,
      timestamp: 2500,
    });

    expect(goEvent).toMatchObject({
      type: 'task_shown',
      trialId: 'response_inhibition-1',
      targetId: 'response_inhibition-cue',
      context: {
        taskId: 'response_inhibition',
        taskLabel: 'Go/No-Go inhibición motora',
        difficulty: 'go-no-go',
        stimulus: { cue: 'GO', responseRequired: true },
        expectedResponse: 'press',
      },
    });
    expect(noGoEvent).toMatchObject({
      type: 'task_shown',
      trialId: 'response_inhibition-2',
      targetId: 'response_inhibition-cue',
      context: {
        stimulus: { cue: 'NO-GO', responseRequired: false },
        expectedResponse: 'withhold',
      },
    });
  });
});

describe('scoreTaskResponse', () => {
  it('scores color-interference answers and preserves only response metadata', () => {
    const shownEvent = createShownEventForTask({
      taskId: 'color_interference',
      trialIndex: 1,
      timestamp: 1000,
    });
    const response = scoreTaskResponse({
      shownEvent,
      response: 'blue',
      timestamp: 1310,
      pointerEvent: { clientX: 999, clientY: 111, target: { id: 'raw-dom' } },
    });

    expect(response).toEqual({
      type: 'task_response',
      trialId: 'color_interference-2',
      targetId: 'color_interference-stimulus',
      timestamp: 1310,
      context: {
        taskId: 'color_interference',
        taskLabel: 'Interferencia color-palabra',
        trialIndex: 1,
        expectedResponse: 'red',
        response: 'blue',
        correct: false,
        outcome: 'incorrect',
        score: 0,
        reactionTimeMs: 310,
      },
    });
    expect(JSON.stringify(response)).not.toContain('raw-dom');
    expect(JSON.stringify(response)).not.toContain('clientX');
  });

  it('scores precision targeting hits as a successful task response', () => {
    const shownEvent = createShownEventForTask({
      taskId: 'precision_targeting',
      trialIndex: 0,
      timestamp: 200,
    });

    expect(scoreTaskResponse({ shownEvent, response: 'hit', timestamp: 480 })).toMatchObject({
      type: 'task_response',
      trialId: 'precision_targeting-1',
      context: {
        taskId: 'precision_targeting',
        correct: true,
        outcome: 'correct',
        score: 1,
        reactionTimeMs: 280,
      },
    });
  });

  it('scores Go/No-Go active presses as correct GO or commission-error NO-GO outcomes', () => {
    const goTrial = createShownEventForTask({ taskId: 'response_inhibition', trialIndex: 0, timestamp: 1000 });
    const noGoTrial = createShownEventForTask({ taskId: 'response_inhibition', trialIndex: 1, timestamp: 2000 });

    expect(scoreTaskResponse({ shownEvent: goTrial, response: 'press', timestamp: 1260 })).toMatchObject({
      type: 'task_response',
      trialId: 'response_inhibition-1',
      context: {
        taskId: 'response_inhibition',
        response: 'press',
        expectedResponse: 'press',
        correct: true,
        outcome: 'correct_go',
        score: 1,
        reactionTimeMs: 260,
      },
    });
    expect(scoreTaskResponse({ shownEvent: noGoTrial, response: 'press', timestamp: 2180 })).toMatchObject({
      trialId: 'response_inhibition-2',
      context: {
        response: 'press',
        expectedResponse: 'withhold',
        correct: false,
        outcome: 'commission_error',
        score: 0,
        reactionTimeMs: 180,
      },
    });
  });

  it('scores Go/No-Go timeouts as real withhold/omission outcomes without a user click', () => {
    const goTrial = createShownEventForTask({ taskId: 'response_inhibition', trialIndex: 0, timestamp: 1000 });
    const noGoTrial = createShownEventForTask({ taskId: 'response_inhibition', trialIndex: 1, timestamp: 2000 });

    expect(scoreTaskTimeout({ shownEvent: noGoTrial, timestamp: 3400 })).toMatchObject({
      trialId: 'response_inhibition-2',
      context: {
        response: 'withhold',
        expectedResponse: 'withhold',
        correct: true,
        outcome: 'correct_withhold',
        score: 1,
        reactionTimeMs: 1400,
        timeoutGenerated: true,
      },
    });

    expect(scoreTaskTimeout({ shownEvent: goTrial, timestamp: 2400 })).toMatchObject({
      trialId: 'response_inhibition-1',
      context: {
        response: 'timeout',
        expectedResponse: 'press',
        correct: false,
        outcome: 'omission_error',
        score: 0,
        reactionTimeMs: 1400,
        timeoutGenerated: true,
      },
    });
  });
});
