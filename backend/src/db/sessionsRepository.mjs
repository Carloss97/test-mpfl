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

function sessionItem({ sessionId, payload, companyId, tenantId, invitationId, env }) {
  const createdAt = nowIso();
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payloadBytes = assertPayloadSize(payload);
  const item = {
    sessionId,
    companyId: companyId ?? tenantId ?? null,
    invitationId: invitationId ?? null,
    payload,
    payloadBytes,
    schemaVersion: payload?.schemaVersion ?? null,
    createdAt,
    expiresAt,
  };
  // KRU-97 (opción b): flag del stage de API que escribió el registro
  // ('prod' | 'staging') — las rutas /prod y /staging comparten tablas, la
  // flag distingue el origen de la data. Se omite si es desconocida
  // (compatibilidad con el shape de registros legacy).
  if (env) item.env = env;
  return item;
}

export function putSession({ docClient, sessionId, payload, companyId, tenantId, invitationId, env }) {
  const item = sessionItem({ sessionId, payload, companyId, tenantId, invitationId, env });
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

export function listSessions({ docClient, limit = 50, cursor = null, statusFilter = null, batteryFilter = null, dateFrom = null, dateTo = null, companyId = null }) {
  if (!companyId) return Promise.resolve([]);
  const exprAttrNames = { '#companyId': 'companyId', '#sts': 'status' };
  const exprAttrValues = { ':companyId': companyId, ':revoked': 'revoked' };
  let filterExpression = '#companyId = :companyId AND #sts <> :revoked';
  if (statusFilter) {
    filterExpression += ' AND #status = :status';
    exprAttrNames['#status'] = 'status';
    exprAttrValues[':status'] = statusFilter;
  }
  if (dateFrom) {
    filterExpression += ' AND createdAt >= :dateFrom';
    exprAttrValues[':dateFrom'] = dateFrom;
  }
  if (dateTo) {
    filterExpression += ' AND createdAt <= :dateTo';
    exprAttrValues[':dateTo'] = dateTo;
  }
  if (batteryFilter) {
    filterExpression += ' AND batteryId = :battery';
    exprAttrValues[':battery'] = batteryFilter;
  }

  const request = typeof docClient.query === 'function'
    ? docClient.query({
      TableName: SESSIONS_TABLE,
      IndexName: 'companyId-index',
      KeyConditionExpression: '#companyId = :companyId',
      FilterExpression: filterExpression,
      ExpressionAttributeNames: exprAttrNames,
      ExpressionAttributeValues: exprAttrValues,
      Limit: limit,
      ExclusiveStartKey: cursor ? JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) : undefined,
    })
    : docClient.scan({
      TableName: SESSIONS_TABLE,
      Limit: limit,
      FilterExpression: filterExpression,
      ExpressionAttributeNames: exprAttrNames,
      ExpressionAttributeValues: exprAttrValues,
    });

  return request.then((out) => {
    const items = (out?.Items ?? []).filter((item) => item.companyId === companyId);
    items.sort((a, b) => new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf());
    return items;
  });
}