import { describe, expect, it } from 'vitest';
import {
  UNIFIED_BATTERY_CONFIG,
  listBatteryGameIds,
} from './batteryConfig.js';
import {
  BATTERY_STATES,
  advanceBatteryState,
  createBatterySession,
  deriveBatteryProgress,
  getCurrentBatteryBlock,
} from './batteryRuntime.js';

describe('UNIFIED_BATTERY_CONFIG', () => {
  it('defines a standardized A-I game battery with baseline and recovery windows', () => {
    expect(UNIFIED_BATTERY_CONFIG).toMatchObject({
      id: 'krumm_unified_battery_v1',
      mode: 'standardized',
      baselineDurationMs: 30000,
      recoveryDurationMs: 15000,
    });
    expect(listBatteryGameIds(UNIFIED_BATTERY_CONFIG)).toEqual([
      'simple_rt',
      'precision_targeting',
      'pursuit_tracking',
      'go_nogo',
      'color_interference',
      'visual_search',
    ]);
    expect(UNIFIED_BATTERY_CONFIG.blocks.every((block) => block.trialCount > 0)).toBe(true);
  });
});

describe('batteryRuntime', () => {
  it('creates a privacy-safe battery session without raw telemetry containers', () => {
    const session = createBatterySession({ runId: 'run-r-001', now: 1000 });

    expect(session).toMatchObject({
      schemaVersion: 'krumm_unified_battery_session_v1',
      runId: 'run-r-001',
      batteryId: 'krumm_unified_battery_v1',
      mode: 'standardized',
      state: BATTERY_STATES.IDLE,
      currentBlockIndex: -1,
      createdAt: 1000,
    });
    expect(session.blocks).toHaveLength(6);
    expect(JSON.stringify(session)).not.toContain('faceSamples');
    expect(JSON.stringify(session)).not.toContain('pointerSamples');
    expect(JSON.stringify(session)).not.toContain('rawGameEvents');
    expect(JSON.stringify(session)).not.toContain('landmarks');
  });

  it('advances deterministically through consent, camera check, baseline, each block, recovery, and report_ready', () => {
    let session = createBatterySession({ runId: 'run-r-002', now: 0 });
    session = advanceBatteryState(session, { type: 'START_CONSENT', timestamp: 10 });
    expect(session.state).toBe(BATTERY_STATES.CONSENT);

    session = advanceBatteryState(session, { type: 'ACCEPT_CONSENT', timestamp: 20 });
    expect(session.state).toBe(BATTERY_STATES.CAMERA_CHECK);

    session = advanceBatteryState(session, { type: 'CAMERA_READY', timestamp: 30 });
    expect(session.state).toBe(BATTERY_STATES.BASELINE);

    session = advanceBatteryState(session, { type: 'BASELINE_COMPLETE', timestamp: 40 });
    expect(session.state).toBe(BATTERY_STATES.INSTRUCTIONS);
    expect(getCurrentBatteryBlock(session)).toMatchObject({ gameId: 'simple_rt', status: 'pending' });

    for (let index = 0; index < UNIFIED_BATTERY_CONFIG.blocks.length; index += 1) {
      const expectedGameId = UNIFIED_BATTERY_CONFIG.blocks[index].gameId;
      expect(getCurrentBatteryBlock(session).gameId).toBe(expectedGameId);
      session = advanceBatteryState(session, { type: 'START_BLOCK', timestamp: 100 + index * 10 });
      expect(session.state).toBe(BATTERY_STATES.RUNNING_BLOCK);
      expect(getCurrentBatteryBlock(session).status).toBe('running');
      session = advanceBatteryState(session, {
        type: 'BLOCK_COMPLETE',
        timestamp: 105 + index * 10,
        result: { completedTrialCount: UNIFIED_BATTERY_CONFIG.blocks[index].trialCount },
      });
      if (index < UNIFIED_BATTERY_CONFIG.blocks.length - 1) {
        expect(session.state).toBe(BATTERY_STATES.REST);
        session = advanceBatteryState(session, { type: 'REST_COMPLETE', timestamp: 109 + index * 10 });
        expect(session.state).toBe(BATTERY_STATES.INSTRUCTIONS);
      } else {
        expect(session.state).toBe(BATTERY_STATES.RECOVERY);
      }
    }

    session = advanceBatteryState(session, { type: 'RECOVERY_COMPLETE', timestamp: 300 });
    expect(session.state).toBe(BATTERY_STATES.COMPLETED);
    expect(deriveBatteryProgress(session)).toMatchObject({ completedBlocks: 6, totalBlocks: 6, progressRatio: 1 });

    session = advanceBatteryState(session, { type: 'REPORT_READY', timestamp: 320 });
    expect(session.state).toBe(BATTERY_STATES.REPORT_READY);
    expect(session.timeline.map((entry) => entry.type)).toContain('battery_end');
  });

  it('records cancellation with previous state and keeps completed block results', () => {
    let session = createBatterySession({ runId: 'run-r-003', now: 0 });
    session = advanceBatteryState(session, { type: 'START_CONSENT', timestamp: 1 });
    session = advanceBatteryState(session, { type: 'ACCEPT_CONSENT', timestamp: 2 });
    session = advanceBatteryState(session, { type: 'CAMERA_READY', timestamp: 3 });
    session = advanceBatteryState(session, { type: 'BASELINE_COMPLETE', timestamp: 4 });
    session = advanceBatteryState(session, { type: 'START_BLOCK', timestamp: 5 });
    session = advanceBatteryState(session, { type: 'BLOCK_COMPLETE', timestamp: 6, result: { completedTrialCount: 10 } });
    session = advanceBatteryState(session, { type: 'CANCEL', timestamp: 7, reason: 'participant_requested' });

    expect(session.state).toBe(BATTERY_STATES.CANCELLED);
    expect(session.cancelled).toMatchObject({ previousState: BATTERY_STATES.REST, reason: 'participant_requested' });
    expect(session.blocks[0]).toMatchObject({ status: 'completed', result: { completedTrialCount: 10 } });
  });
});
