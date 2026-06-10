const STORAGE_KEY = 'krumm_edge_sessions_v1';
const MAX_SESSIONS = 50;

function safeJsonParse(raw) {
  try {
    return JSON.parse(raw) ?? [];
  } catch {
    return [];
  }
}

export function loadSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return safeJsonParse(raw);
  } catch {
    return [];
  }
}

export function saveSession(session) {
  try {
    const sessions = loadSessions();
    const now = new Date().toISOString();
    sessions.unshift({
      id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      savedAt: now,
      startedAt: session.window?.startedAt ?? session.startedAt ?? now,
      endedAt: session.window?.endedAt ?? session.endedAt ?? now,
      runId: session.runId ?? null,
      durationMs: session.window?.durationMs ?? 0,
      sampleCount: session.window?.durationMs ? null : (session.sampleCount ?? 0),
      facePresenceRatio: session.facialSummary?.signalQuality?.facePresenceRatio
        ?? session.aggregate?.signalQuality?.facePresenceRatio
        ?? 0,
      ...(session.edgeModelOutput ? {
        dimensionsScore: {
          activation: session.edgeModelOutput.dimensions?.taskCoupledActivation?.score ?? null,
          stability: session.edgeModelOutput.dimensions?.inputControlStability?.score ?? null,
        },
        confidence: session.edgeModelOutput.confidence?.score ?? null,
        confidenceLevel: session.edgeModelOutput.confidence?.level ?? 'unknown',
      } : {}),
      payload: session,
    });
    while (sessions.length > MAX_SESSIONS) sessions.pop();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // Silently fail — persistence is best-effort
  }
}

export function clearSessions() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // noop
  }
}