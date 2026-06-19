import { UNIFIED_BATTERY_CONFIG } from './batteryConfig.js';

export const BATTERY_STATES = Object.freeze({
  IDLE: 'idle',
  CONSENT: 'consent',
  CAMERA_CHECK: 'camera_check',
  BASELINE: 'baseline',
  INSTRUCTIONS: 'instructions',
  RUNNING_BLOCK: 'running_block',
  REST: 'rest',
  RECOVERY: 'recovery',
  COMPLETED: 'completed',
  REPORT_READY: 'report_ready',
  CANCELLED: 'cancelled',
});

function timestamp(action, fallback = 0) {
  const value = Number(action?.timestamp ?? fallback);
  return Number.isFinite(value) ? value : fallback;
}

function cloneBlock(block, index) {
  return {
    ...block,
    index,
    status: 'pending',
    startedAt: null,
    endedAt: null,
    result: null,
  };
}

function event(type, action, extra = {}) {
  return {
    type,
    timestamp: timestamp(action),
    ...extra,
  };
}

function withTimeline(session, entry) {
  return {
    ...session,
    timeline: [...(session.timeline ?? []), entry],
  };
}

function updateCurrentBlock(session, patch) {
  const index = session.currentBlockIndex;
  if (index < 0) return session;
  return {
    ...session,
    blocks: session.blocks.map((block, blockIndex) => (
      blockIndex === index ? { ...block, ...patch } : block
    )),
  };
}

function moveToInstructions(session, action, nextIndex) {
  return withTimeline({
    ...session,
    state: BATTERY_STATES.INSTRUCTIONS,
    currentBlockIndex: nextIndex,
  }, event('block_instructions', action, { blockIndex: nextIndex, gameId: session.blocks[nextIndex]?.gameId ?? null }));
}

export function createBatterySession({
  config = UNIFIED_BATTERY_CONFIG,
  runId = `battery-${Math.random().toString(36).slice(2, 10)}`,
  now = 0,
} = {}) {
  return {
    schemaVersion: 'krumm_unified_battery_session_v1',
    runId,
    batteryId: config.id,
    mode: config.mode,
    state: BATTERY_STATES.IDLE,
    currentBlockIndex: -1,
    createdAt: now,
    startedAt: null,
    completedAt: null,
    baseline: {
      durationMs: Number(config.baselineDurationMs ?? 0),
      status: 'pending',
      startedAt: null,
      endedAt: null,
    },
    recovery: {
      durationMs: Number(config.recoveryDurationMs ?? 0),
      status: 'pending',
      startedAt: null,
      endedAt: null,
    },
    restDurationMs: Number(config.restDurationMs ?? 0),
    blocks: (config.blocks ?? []).map(cloneBlock),
    timeline: [],
    cancelled: null,
  };
}

export function getCurrentBatteryBlock(session = {}) {
  const index = Number(session.currentBlockIndex ?? -1);
  if (index < 0) return null;
  return session.blocks?.[index] ?? null;
}

export function deriveBatteryProgress(session = {}) {
  const totalBlocks = session.blocks?.length ?? 0;
  const completedBlocks = (session.blocks ?? []).filter((block) => block.status === 'completed').length;
  const currentBlock = getCurrentBatteryBlock(session);
  return {
    completedBlocks,
    totalBlocks,
    currentBlockIndex: session.currentBlockIndex ?? -1,
    currentBlock,
    progressRatio: totalBlocks ? completedBlocks / totalBlocks : 0,
    state: session.state ?? BATTERY_STATES.IDLE,
  };
}

export function advanceBatteryState(session, action = {}) {
  const type = action.type;
  const at = timestamp(action, session?.createdAt ?? 0);

  if (!session || !type) return session;

  if (type === 'CANCEL') {
    return withTimeline({
      ...session,
      state: BATTERY_STATES.CANCELLED,
      cancelled: {
        previousState: session.state,
        reason: action.reason ?? 'cancelled',
        timestamp: at,
      },
    }, event('battery_cancelled', action, { reason: action.reason ?? 'cancelled', previousState: session.state }));
  }

  switch (type) {
    case 'START_CONSENT':
      if (session.state !== BATTERY_STATES.IDLE) return session;
      return withTimeline({
        ...session,
        state: BATTERY_STATES.CONSENT,
        startedAt: at,
      }, event('battery_start', action));

    case 'ACCEPT_CONSENT':
      if (session.state !== BATTERY_STATES.CONSENT) return session;
      return withTimeline({ ...session, state: BATTERY_STATES.CAMERA_CHECK }, event('consent_accepted', action));

    case 'CAMERA_READY':
      if (session.state !== BATTERY_STATES.CAMERA_CHECK) return session;
      return withTimeline({
        ...session,
        state: BATTERY_STATES.BASELINE,
        baseline: { ...session.baseline, status: 'running', startedAt: at },
      }, event('baseline_start', action));

    case 'BASELINE_COMPLETE':
      if (session.state !== BATTERY_STATES.BASELINE) return session;
      return moveToInstructions(withTimeline({
        ...session,
        baseline: { ...session.baseline, status: 'completed', endedAt: at },
      }, event('baseline_end', action)), action, 0);

    case 'START_BLOCK': {
      if (session.state !== BATTERY_STATES.INSTRUCTIONS) return session;
      const block = getCurrentBatteryBlock(session);
      const next = updateCurrentBlock({ ...session, state: BATTERY_STATES.RUNNING_BLOCK }, { status: 'running', startedAt: at });
      return withTimeline(next, event('block_start', action, { blockIndex: session.currentBlockIndex, gameId: block?.gameId ?? null }));
    }

    case 'BLOCK_COMPLETE': {
      if (session.state !== BATTERY_STATES.RUNNING_BLOCK) return session;
      const block = getCurrentBatteryBlock(session);
      const completed = updateCurrentBlock(session, { status: 'completed', endedAt: at, result: action.result ?? null });
      const withEnd = withTimeline(completed, event('block_end', action, { blockIndex: session.currentBlockIndex, gameId: block?.gameId ?? null }));
      const nextIndex = session.currentBlockIndex + 1;
      if (nextIndex < session.blocks.length) {
        return withTimeline({ ...withEnd, state: BATTERY_STATES.REST }, event('rest_start', action, { nextBlockIndex: nextIndex }));
      }
      return withTimeline({
        ...withEnd,
        state: BATTERY_STATES.RECOVERY,
        recovery: { ...session.recovery, status: 'running', startedAt: at },
      }, event('recovery_start', action));
    }

    case 'REST_COMPLETE': {
      if (session.state !== BATTERY_STATES.REST) return session;
      const nextIndex = Math.min(session.currentBlockIndex + 1, Math.max(0, session.blocks.length - 1));
      return moveToInstructions(withTimeline(session, event('rest_end', action, { nextBlockIndex: nextIndex })), action, nextIndex);
    }

    case 'RECOVERY_COMPLETE':
      if (session.state !== BATTERY_STATES.RECOVERY) return session;
      return withTimeline({
        ...session,
        state: BATTERY_STATES.COMPLETED,
        completedAt: at,
        recovery: { ...session.recovery, status: 'completed', endedAt: at },
      }, event('battery_end', action));

    case 'REPORT_READY':
      if (session.state !== BATTERY_STATES.COMPLETED) return session;
      return withTimeline({ ...session, state: BATTERY_STATES.REPORT_READY }, event('report_ready', action));

    default:
      return session;
  }
}
