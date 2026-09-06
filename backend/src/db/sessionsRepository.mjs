// sessionsRepository.mjs — Acceso a DynamoDB para sesiones aggregate-only + audit log.
// Tablas:
//   sessions (PK sessionId)  — payload aggregate-only validado + tenantId + TTL.
//   audit_log (PK auditId, sort by sessionId) — append-only, inmutable por API.
//
// La persistencia usa @aws-sdk/lib-dynamodb (DocumentClient). Para tests se inyecta
// un `docClient` fake; los handlers NUNCA crean clientes reales por sí mismos.

export const SESSIONS_TABLE = process.env.SESSIONS_TABLE ?? 'krumm-sessions';
export const AUDIT_LOG_TABLE = process.env.AUDIT_LOG_TABLE ?? 'krumm-audit-log';
const RETENTION_DAYS = Number(process.env.KRUMM_RETENTION_DAYS ?? 30);
const MAX_SESSION_MB = Number(process.env.KRUMM_MAX_SESSION_MB ?? 1);
export const SESSION_TTL_SECONDS = RETENTION_DAYS * 24 * 60 * 60;

export function nowIso() {
  return new Date().toISOString();
}

export function makeSessionId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `sess-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function makeAuditId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `audit-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function assertPayloadSize(payload) {
  // data minimization: rechaza cuerpos absurdamente grandes (límite defensivo en MB).
  const size = Buffer.byteLength(JSON.stringify(payload ?? {}), 'utf8');
  const maxBytes = MAX_SESSION_MB * 1024 * 1024;
  if (size > maxBytes) {
    const err = new Error('payload_too_large');
    err.code = 'PAYLOAD_TOO_LARGE';
    throw err;
  }
  return size;
}

function sessionItem({ sessionId, payload, tenantId, invitationId }) {
  const createdAt = nowIso();
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payloadBytes = assertPayloadSize(payload);
  return {
    sessionId,
    tenantId: tenantId ?? null,
    invitationId: invitationId ?? null,
    payload,
    payloadBytes,
    schemaVersion: payload?.schemaVersion ?? null,
    createdAt,
    expiresAt,
  };
}

export function putSession({ docClient, sessionId, payload, tenantId, invitationId }) {
  const item = sessionItem({ sessionId, payload, tenantId, invitationId });
  return docClient.put({
    TableName: SESSIONS_TABLE,
    Item: item,
  }).then(() => item);
}

export function getSession({ docClient, sessionId }) {
  return docClient.get({
    TableName: SESSIONS_TABLE,
    Key: { sessionId },
  }).then((out) => (out?.Item ?? null));
}

export function deleteSession({ docClient, sessionId }) {
  return docClient.delete({
    TableName: SESSIONS_TABLE,
    Key: { sessionId },
  }).then(() => true);
}

export function appendAuditLog({ docClient, auditId, sessionId, actor = 'system', action, detail = null }) {
  const item = {
    auditId,
    actor,
    action,
    timestamp: nowIso(),
    detail: detail ?? null,
  };
  // sessionId es clave del GSI sessionId-index (tipo S): escribir NULL explícito
  // lanza ValidationException (type mismatch S vs NULL). Omitir el atributo
  // excluye el item del índice (semántica sparse) — lo correcto para auditorías
  // previas a la sesión (invitation.create, sessionId aún null).
  if (sessionId != null) item.sessionId = sessionId;
  return docClient.put({
    TableName: AUDIT_LOG_TABLE,
    Item: item,
  }).then(() => item);
}

export function listSessions({ docClient, limit = 50, cursor = null, statusFilter = null, batteryFilter = null, dateFrom = null, dateTo = null }) {
  // Build the KeyConditionExpression and ExpressionAttributeValues dynamically.
  // We query by sessionId (PK) and sort by createdAt descending.
  // The table has PK=sessionId, no sort key, so we use a scan with filters.
  // For efficiency, we keep the limit and optional filters.

  let filterExpression = '#sts <> :revoked';
  const exprAttrNames = { '#sts': 'status' };
  const exprAttrValues = { ':revoked': 'revoked' };

  if (statusFilter) {
    // Add status filter
    filterExpression += ` AND #status = :status`;
    exprAttrNames['#status'] = 'status';
    exprAttrValues[':status'] = statusFilter;
  }

  if (dateFrom) {
    filterExpression += ` AND createdAt >= :dateFrom`;
    exprAttrValues[':dateFrom'] = dateFrom;
  }

  if (dateTo) {
    filterExpression += ` AND createdAt <= :dateTo`;
    exprAttrValues[':dateTo'] = dateTo;
  }

  if (batteryFilter) {
    filterExpression += ` AND batteryId = :battery`;
    exprAttrValues[':battery'] = batteryFilter;
  }

  // We'll use Query with a scan on sessionId-index if available, or just scan with limit.
  // The table does have a GSI sessionId-index, but that's for listing audit entries per session,
  // not for listing sessions. We'll do a simple Query with a PK range using begins_with.
  // Since PK=sessionId is random UUID/sess-*, we can't use begins_with meaningfully.
  // Fallback: use Query with a limit, reading all pages until we have enough.

  // Actually, for a simple read-only list, let's scan with a limit.
  // The table is expected to have moderate size (pilot scale), so a scan with Limit is OK.

  return docClient.scan({
    TableName: SESSIONS_TABLE,
    Limit: limit,
    FilterExpression: filterExpression,
    ExpressionAttributeNames: exprAttrNames,
    ExpressionAttributeValues: exprAttrValues,
  }).then((out) => {
    const items = out?.Items ?? [];
    // Sort by createdAt descending (newest first)
    items.sort((a, b) => new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf());
    return items;
  });
}