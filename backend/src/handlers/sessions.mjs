// sessions.mjs — Handlers HTTP para /sessions (API Gateway HTTP + Lambda).
////
// POST   /sessions          -> valida aggregate-only + privacidad, persiste, 201.
// GET    /sessions/{id}     -> devuelve payload idéntico (200) o 404.
// GET    /sessions          -> lista sesiones agregadas (read-only, paginado).
// DELETE /sessions/{id}     -> hard delete + entrada audit log (204 / 404 si no existe).
//
// Respuestas en formato API Gateway HTTP (v2): { statusCode, headers, body }.
// No hay PII en logs de respuesta; el auditor log registra actor+acción+timestamp.

import { validateSessionPayload, extractRunId } from '../privacy/validatePayload.mjs';
import {
  putSession,
  getSession,
  deleteSession,
  appendAuditLog,
  makeSessionId,
  makeAuditId,
  listSessions,
} from '../db/sessionsRepository.mjs';
import {
  getInvitationByToken,
  resolveInvitationStatus,
  markInvitationUsed,
} from '../db/invitationsRepository.mjs';

const INVITATION_FIELD = 'invitationId';

const CORS_HEADERS = {
  'content-type': 'application/json',
  'access-control-allow-origin': process.env.CORS_ORIGIN ?? '*',
};

function json(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: { ...CORS_HEADERS, ...headers },
    body: JSON.stringify(body),
  };
}

function noContent() {
  return {
    statusCode: 204,
    headers: { ...CORS_HEADERS },
    body: '',
  };
}

function badRequest(message, violations = []) {
  return json(400, { error: message, violations });
}

function unprocessable(message, violations = []) {
  return json(422, { error: message, violations });
}

function notFound(message = 'session_not_found') {
  return json(404, { error: message });
}

function methodNotAllowed() {
  return json(405, { error: 'method_not_allowed' });
}

function parseBody(event) {
  if (!event?.body) return null;
  if (event.isBase64Encoded) {
    try {
      return JSON.parse(Buffer.from(event.body, 'base64').toString('utf8'));
    } catch {
      return null;
    }
  }
  try {
    return JSON.parse(event.body);
  } catch {
    return null;
  }
}

function actorFrom(event) {
  // API Gateway HTTP JWT authorizer inyecta claims cuando el endpoint esté protegido.
  return event?.requestContext?.authorizer?.jwt?.claims?.sub ?? 'anonymous';
}

function invitationHeader(event) {
  const headers = event?.headers ?? event?.multiValueHeaders ?? {};
  // Búsqueda case-insensitive: API Gateway (y clientes) pueden normalizar el
  // caso del header de forma distinta (x-invitation-id / X-invitation-id / …).
  const value = Object.entries(headers).find(
    ([key]) => String(key).toLowerCase() === 'x-invitation-id',
  )?.[1];
  return String(value ?? '').trim() || null;
}

/** Consume una invitación single-use cuando viene en el header x-invitation-id.
 * Devuelve { invitationId, sessionId } si el token es válido y se consume, o
 * { error: statusCode } si no existe / expiró / ya fue usada / fue revocada.
 */
export async function consumeInvitation({ event, docClient, sessionId }) {
  const invitationId = invitationHeader(event);
  if (!invitationId) return { invitationId: null, sessionId };
  const item = await getInvitationByToken({ docClient, token: invitationId });
  const { status } = resolveInvitationStatus(item);
  if (status === 'not_found') return { error: 404 };
  if (status === 'revoked') return { error: 410, code: 'invitation_revoked' };
  if (status === 'used') return { error: 410, code: 'invitation_already_used' };
  if (status === 'expired') return { error: 410, code: 'invitation_expired' };
  if (status !== 'valid') return { error: 410, code: 'invitation_invalid' };
  await markInvitationUsed({ docClient, token: invitationId, sessionId });
  await appendAuditLog({ docClient, auditId: makeAuditId(), sessionId, actor: actorFrom(event), action: 'invitation.consume', detail: { invitationId } });
  return { invitationId, sessionId };
}

function pathParam(event, key) {
  return event?.pathParameters?.[key] ?? null;
}

/** Lista sesiones agregadas — read‑only, paginado por createdAt descendente. */
export async function handleListSessions(event, { docClient, auditClient } = {}) {
  const limit = Number(event?.queryStringParameters?.limit ?? 50) || 50;
  const cursor = event?.queryStringParameters?.cursor ?? null;
  const statusFilter = event?.queryStringParameters?.status ?? null;
  const batteryFilter = event?.queryStringParameters?.battery ?? null;
  const dateFrom = event?.queryStringParameters?.dateFrom ?? null;
  const dateTo = event?.queryStringParameters?.dateTo ?? null;

  const items = await listSessions({ docClient, limit, cursor, statusFilter, batteryFilter, dateFrom, dateTo });

  // Map each stored session item to a HR dashboard candidate summary.
  const candidates = items.map((item) => {
    const payload = item.payload ?? {};
    const participant = payload?.participant ?? {};
    const quality = payload?.quality ?? {};
    const behavioral = payload?.behavioral ?? {};
    const gameSummary = behavioral?.gameSummary ?? {};
    const performance = gameSummary?.performance ?? {};

    // Extract construct scores from talentProfile dimensions if available.
    const dimensions = payload?.talentProfile?.dimensions ?? {};
    const constructOrder = ['decisionMaking', 'problemSolving', 'riskFeedbackProfile', 'planning', 'adaptability', 'analyticalThinking', 'leadership', 'communication'];
    const scores = constructOrder.map(id => {
      const dim = dimensions[id];
      if (!dim) return null;
      const score = dim.score;
      if (score == null) return null;
      const numeric = Number(score);
      return Number.isFinite(numeric) ? Math.round(Math.max(0, Math.min(100, numeric))) : null;
    });

    // Build game summaries (4 games expected).
    const games = [
      { id: 'laser', label: 'Puzzle láser', metric: '3/3 mapas', value: null },
      { id: 'balloon', label: 'Riesgo y feedback', metric: '8/8 rondas', value: null },
      { id: 'routes', label: 'Rutas', metric: '5/5 entregas', value: null },
      { id: 'team', label: 'Operación Faro', metric: '4/4 escenarios', value: null },
    ];

    // Try to extract game values from feature vector or game results.
    const featureMap = payload?.featureVectorV2?.featureMap ?? {};
    const gameResults = payload?.behavioral?.gameResults ?? [];

    // Map game results if present.
    if (gameResults && gameResults.length > 0) {
      gameResults.forEach((gr, gi) => {
        if (gi >= 4) return;
        const idMap = { laser: 0, balloon: 1, routes: 2, team: 3 };
        const idx = idMap[gr.gameId];
        if (idx !== undefined) {
          games[idx].value = gr.score != null ? Math.round(clamp01(gr.score) * 100) : null;
          games[idx].metric = gr.metric ?? games[idx].metric;
        }
      });
    } else if (performance.accuracy != null) {
      // Fallback: distribute accuracy across games proportionally.
      const accuracy = Math.round(clamp01(performance.accuracy) * 100);
      games.forEach((g, i) => g.value = Math.max(0, accuracy - i * 5));
    }

    // Session status: ready if all 4 games completed, in_progress if partial, needs_review if caveats.
    const completedCount = constructOrder.map(id => {
      const dim = dimensions[id];
      return dim != null && dim.score != null ? 1 : 0;
    }).reduce((a, b) => a + b, 0);
    const totalGames = 4;
    let status = 'in_progress';
    if (completedCount >= totalGames) status = 'ready';
    if (payload?.governance?.humanReviewOnly === false) status = 'needs_review';

    // Alias from participant or derive from session ID.
    const alias = participant?.aliasHash ?? `session-${item.sessionId.slice(-8)}`;

    // Role hint from participant declaredRoleTarget.
    const roleHint = participant?.declaredRoleTarget ?? null;

    // Summary from talent profile globalSummary or generic.
    const summary = payload?.talentProfile?.globalSummary
      ? `${payload.talentProfile.globalSummary.strengths && payload.talentProfile.globalSummary.strengths.length > 0 ? payload.talentProfile.globalSummary.strengths[0] : 'Sin fortalezas dominantes'} · ${payload.talentProfile.globalSummary.watchAreas && payload.talentProfile.globalSummary.watchAreas.length > 0 ? payload.talentProfile.globalSummary.watchAreas[0] : 'Áreas a revisar'}`
      : 'Evaluación en progreso';

    return {
      id: item.sessionId,
      alias,
      role: roleHint,
      completedAt: item.createdAt,
      status,
      completedGames: completedCount,
      sessionQuality: quality?.facePresenceRatio ?? 0,
      scores,
      summary,
      caveats: [
        quality?.caveats?.includes('camera_not_enabled_or_no_samples') && 'camera_not_enabled_or_no_samples',
        quality?.caveats?.includes('low_sample_count') && 'low_sample_count',
        quality?.caveats?.includes('low_face_presence') && 'low_face_presence',
        quality?.caveats?.includes('low_face_confidence') && 'low_face_confidence',
        quality?.caveats?.includes('missing_game_correlation') && 'missing_game_correlation',
      ].filter(Boolean),
      games,
    };
  });

  return json(200, {
    candidates,
    total: items.length,
    hasMore: items.length >= limit,
  });
}

function clamp01(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.min(1, numeric)) : fallback;
}

function event(event) {
  return {
    requestContext: { http: { method: event?.method } },
    routeKey: event?.routeKey,
    pathParameters: event?.pathParameters,
    body: event?.body ? JSON.stringify(event.body) : undefined,
    queryStringParameters: event?.queryStringParameters,
    headers: event?.headers,
  };
}

function methodFrom(event) {
  return event?.requestContext?.http?.method ?? event?.httpMethod ?? '';
}

/** POST   /sessions */
export async function handlePostSessions(event, { docClient } = {}) {
  const body = parseBody(event);
  if (body === null) return badRequest('invalid_json_body');

  const validation = validateSessionPayload(body);
  const runId = extractRunId(body);

  if (!runId) {
    if (!validation.ok) return unprocessable('invalid_payload', validation.violations);
    // Sin runId no tenemos PK estable; lo derivamos de un id nuevo (no es un campo raw).
    const sessionId = makeSessionId();
    const consumed = await consumeInvitation({ event, docClient, sessionId });
    if (consumed?.error) return invitationActionResponse(consumed);
    const item = await putSession({ docClient, sessionId, payload: body, tenantId: body?.participant?.aliasHash ?? null, invitationId: consumed.invitationId });
    await appendAuditLog({ docClient, auditId: makeAuditId(), sessionId, actor: actorFrom(event), action: 'session.create' });
    return json(201, { id: item.sessionId, status: 'created', schemaVersion: item.schemaVersion });
  }

  if (!validation.ok) return unprocessable('payload_privacy_violation', validation.violations);
  const consumed = await consumeInvitation({ event, docClient, sessionId: runId });
  if (consumed?.error) return invitationActionResponse(consumed);
  const item = await putSession({
    docClient,
    sessionId: runId,
    payload: body,
    tenantId: body?.participant?.aliasHash ?? null,
    invitationId: consumed.invitationId,
  });
  await appendAuditLog({ docClient, auditId: makeAuditId(), sessionId: item.sessionId, actor: actorFrom(event), action: 'session.create' });
  return json(201, { id: item.sessionId, status: 'created', schemaVersion: item.schemaVersion });
}

/** GET    /sessions/{id} */
export async function handleGetSession(event, { docClient } = {}) {
  const sessionId = pathParam(event, 'id');
  if (!sessionId) return badRequest('missing_session_id');
  const item = await getSession({ docClient, sessionId });
  if (!item) return notFound();
  await appendAuditLog({ docClient, auditId: makeAuditId(), sessionId, actor: actorFrom(event), action: 'session.read' });
  return json(200, { id: item.sessionId, payload: item.payload, createdAt: item.createdAt });
}

/** DELETE /sessions/{id} */
export async function handleDeleteSession(event, { docClient } = {}) {
  const sessionId = pathParam(event, 'id');
  if (!sessionId) return badRequest('missing_session_id');
  const item = await getSession({ docClient, sessionId });
  if (!item) return notFound();
  await deleteSession({ docClient, sessionId });
  await appendAuditLog({ docClient, auditId: makeAuditId(), sessionId, actor: actorFrom(event), action: 'session.delete' });
  return noContent();
}

/** Rutea según método y routeKey. */
export function routeSessions(event, deps = {}) {
  const method = event?.requestContext?.http?.method ?? event?.httpMethod ?? '';
  const route = event?.routeKey ?? event?.resource ?? '';

  // routeKey puede codificar el método explícito ('POST /sessions'); si lo hace
  // y difiere del método del request, es 405 (método no permitido en esa ruta).
  const routeMethod = route.match(/^(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)\s/)?.[1] ?? null;
  if (routeMethod && routeMethod !== method) return methodNotAllowed();

  if (route.includes('/sessions/{id}') || (event?.pathParameters && event.pathParameters.id)) {
    if (method === 'GET') return handleGetSession(event, deps);
    if (method === 'DELETE') return handleDeleteSession(event, deps);
    return methodNotAllowed();
  }

  if (route.includes('/sessions') || route.includes('POST /sessions')) {
    if (method === 'POST') return handlePostSessions(event, deps);
    if (method === 'GET') return handleListSessions(event, deps);
    return methodNotAllowed();
  }

  if (route.includes('/invitations')) {
    return routeInvitations(event, deps);
  }

  return notFound('route_not_found');
}