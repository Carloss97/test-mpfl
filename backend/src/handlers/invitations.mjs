// invitations.mjs — Handlers HTTP para /invitations (API Gateway HTTP + Lambda).
//
// POST   /invitations            -> administrador crea una invitación (email,
//                                    expiración, uso único). Protegido por Cognito
//                                    cuando el authorizer esté activo (actor = sub).
// GET    /invitations/{token}    -> valida el token que llega vía ?invite=
//                                    (existencia, expiración, revocación, uso único).
//                                    NO consume el token.
//
// El guard frontend consume el token en GET; el consumo real (single-use) ocurre
// cuando una sesión se liga a la invitación en POST /sessions (ver sessions.mjs).
//
// Respuestas en formato API Gateway HTTP (v2): { statusCode, headers, body }.

import {
  createInvitation,
  isValidEmail,
  getInvitationByToken,
  resolveInvitationStatus,
  revokeInvitation,
} from '../db/invitationsRepository.mjs';
import { makeAuditId, appendAuditLog } from '../db/sessionsRepository.mjs';

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

function badRequest(message) {
  return json(400, { error: message });
}

function notFound(message = 'invitation_not_found') {
  return json(404, { error: message });
}

function unprocessable(message, violations = []) {
  return json(422, { error: message, violations });
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

function pathParam(event, key) {
  return event?.pathParameters?.[key] ?? null;
}

/** Campo seguro de una invitación (nunca exponer email completo cruce o PII innecesaria). */
function safeInvitation(item) {
  const maskedEmail = typeof item?.email === 'string'
    ? item.email.split('@').map((part, index) => (index === 0 && part.length > 2 ? `${part.slice(0, 2)}***` : part)).join('@')
    : null;
  return {
    invitationId: item.invitationId,
    expiresAt: item.expiresAt,
    singleUse: item.singleUse,
    createdAt: item.createdAt,
    maskedEmail,
  };
}

export async function handlePostInvitation(event, deps = {}) {
  const body = parseBody(event);
  if (body === null) return badRequest('invalid_json_body');

  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  if (!isValidEmail(email)) return unprocessable('invalid_email', ['email']);

  const ttlHours = Number(body?.ttlHours ?? 72);
  if (!Number.isFinite(ttlHours) || ttlHours < 1 || ttlHours > 30 * 24) {
    return unprocessable('invalid_ttl_hours', ['ttlHours']);
  }

  try {
    const item = await createInvitation({
      docClient: deps.docClient,
      email,
      ttlSeconds: ttlHours * 3600,
      singleUse: body?.singleUse !== false,
    });
    // bitácora duradera (no PII cruda): el auditor solo guarda actor+token expirado.
    await appendAuditLog({
      docClient: deps.docClient,
      auditId: makeAuditId(),
      sessionId: null,
      actor: actorFrom(event),
      action: 'invitation.create',
      detail: { invitationId: item.invitationId },
    });
    return json(201, { ...safeInvitation(item), status: 'pending' });
  } catch (err) {
    if (err?.code === 'INVALID_EMAIL') return unprocessable('invalid_email', ['email']);
    throw err;
  }
}

export async function handleGetInvitation(event, deps = {}) {
  const token = pathParam(event, 'token');
  if (!token) return badRequest('missing_token');

  const item = await getInvitationByToken({ docClient: deps.docClient, token });
  const { status } = resolveInvitationStatus(item);

  if (status === 'not_found') return notFound();
  if (status === 'revoked') return json(410, { error: 'invitation_revoked', status: 'revoked' });
  if (status === 'used') return json(410, { error: 'invitation_already_used', status: 'used' });
  if (status === 'expired') return json(410, { error: 'invitation_expired', status: 'expired' });

  return json(200, { ...safeInvitation(item), status: 'valid' });
}

export async function handleRevokeInvitation(event, deps = {}) {
  const token = pathParam(event, 'token');
  if (!token) return badRequest('missing_token');

  const item = await getInvitationByToken({ docClient: deps.docClient, token });
  if (!item) return notFound();

  await revokeInvitation({ docClient: deps.docClient, token });
  await appendAuditLog({
    docClient: deps.docClient,
    auditId: makeAuditId(),
    sessionId: null,
    actor: actorFrom(event),
    action: 'invitation.revoke',
    detail: { invitationId: token },
  });
  return json(200, { invitationId: token, status: 'revoked' });
}

export async function routeInvitations(event, deps = {}) {
  const method = event?.requestContext?.http?.method ?? event?.httpMethod ?? '';
  const hasToken = Boolean(event?.pathParameters && event.pathParameters.token);

  // POST /invitations/{token}/revoke (admin)
  if (hasToken && String(event?.routeKey ?? '').includes('/revoke')) {
    if (method === 'POST') return handleRevokeInvitation(event, deps);
    return methodNotAllowed();
  }

  // GET /invitations/{token}
  if (hasToken) {
    if (method === 'GET') return handleGetInvitation(event, deps);
    return methodNotAllowed();
  }

  // /invitations (collection)
  if (method === 'POST') return handlePostInvitation(event, deps);
  return methodNotAllowed();
}