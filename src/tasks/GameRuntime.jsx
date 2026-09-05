import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { createGameTelemetrySession, normalizeGameEvent } from '../telemetry/gameTelemetry.js';

export default function GameRuntime({
  active = false,
  sessionId = null,
  gameDefinition,
  onEvent,
  renderTrial,
}) {
  const startedRef = useRef(false);
  const onEventRef = useRef(onEvent);
  const gameId = gameDefinition?.id ?? 'unknown_game';

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const session = useMemo(() => createGameTelemetrySession({
    sessionId,
    gameId,
  }), [sessionId, gameId]);

  const emit = useCallback((event) => {
    const normalized = normalizeGameEvent(event, {
      sessionId: session.sessionId,
      gameId: session.gameId,
    });
    onEventRef.current?.(normalized);
    return normalized;
  }, [session.gameId, session.sessionId]);

  useEffect(() => {
    if (!active) {
      startedRef.current = false;
      return undefined;
    }
    if (!startedRef.current) {
      startedRef.current = true;
      emit({
        eventType: 'game_start',
        timestamp: session.startedAt,
        gameState: { level: 1, difficulty: gameDefinition?.difficulty ?? 'baseline' },
      });
    }
    return undefined;
  }, [active, emit, gameDefinition?.difficulty, session.startedAt]);

  if (!active) return null;

  const state = {
    session,
    gameDefinition,
    active,
  };

  return renderTrial?.(state, emit) ?? null;
}
