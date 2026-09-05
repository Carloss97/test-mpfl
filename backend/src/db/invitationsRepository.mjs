// invitationsRepository.mjs — Acceso a DynamoDB para invitaciones de candidatos.
//
// Tabla:
//   invitations (PK invitationId == token) — email del candidato, expiración,
//   uso único (single-use), estado (pending/used/revoked/expired).
//
// El token es el PK (unicidad por construcción). Se genera con crypto.randomUUID
// (o fallback). El estado se deriva en `resolveInvitationStatus` a partir de
// marcas persistidas + expiración, de modo que la verificación es independiente
// del reloj del cliente. Para tests se inyecta un `docClient` fake; los handlers
// NUNCA crean clientes reales por sí mismos.

export const INVITATIONS_TABLE = process.env.INVITATIONS_TABLE ?? 'krumm-invitations';

const DEFAULT_TTL_HOURS = Number(process.env.KRUMM_INVITATION_TTL_HOURS ?? 72);
const MAX_EMAIL_LENGTH = 320;

export function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

export function makeInvitationToken() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `inv-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (!trimmed || trimmed.length > MAX_EMAIL_LENGTH) return false;
  // validación pragmática y no demasiado estricta (evita falsos rechazos).
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed);
}

/**
 * Crea una invitación. singleUse=true consume el token al ser usado (POST session
 * ligada a la invitación): la misma invitación no puede abrir dos sesiones.
 * Devuelve el item persistido incluido el token (PK) y expiresAt.
 */
export function createInvitation({ docClient, email, ttlSeconds = DEFAULT_TTL_HOURS * 3600, singleUse = true } = {}) {
  if (!docClient) throw new Error('docClient_required');
  if (!isValidEmail(email)) {
    const err = new Error('invalid_email');
    err.code = 'INVALID_EMAIL';
    throw err;
  }
  const token = makeInvitationToken();
  const createdAt = nowSeconds();
  const expiresAt = createdAt + Math.max(1, Number(ttlSeconds));
  const item = {
    invitationId: token,
    email: email.trim(),
    createdAt,
    expiresAt,
    status: 'pending',
    singleUse: Boolean(singleUse),
    usage: null,
  };
  return docClient.put({ TableName: INVITATIONS_TABLE, Item: item }).then(() => item);
}

export function getInvitationByToken({ docClient, token }) {
  return docClient.get({ TableName: INVITATIONS_TABLE, Key: { invitationId: token } })
    .then((out) => (out?.Item ?? null));
}

/**
 * Estado efectivo de una invitación (independiente del reloj del candidato).
 * - 'not_found' si no existe el item.
 * - 'revoked' si fue revocada explícitamente.
 * - 'used' si ya fue consumida (single-use).
 * - 'expired' si expiresAt ya pasó.
 * - 'valid' pendiente y vigente.
 */
export function resolveInvitationStatus(item, now = nowSeconds()) {
  if (!item) return { status: 'not_found', item: null };
  if (item.status === 'revoked') return { status: 'revoked', item };
  if (item.status === 'used' && item.singleUse) return { status: 'used', item };
  if (item.status === 'expired' || Number(item.expiresAt) <= now) return { status: 'expired', item };
  return { status: 'valid', item };
}

/** Marca la invitación como usada (si singleUse). Devuelve el item actualizado. */
export function markInvitationUsed({ docClient, token, sessionId }) {
  const item = {
    invitationId: token,
    usage: { sessionId, usedAt: nowSeconds() },
    status: 'used',
  };
  return docClient.put({
    TableName: INVITATIONS_TABLE,
    Item: item,
    // En DynamoDB update no muta la clave; aquí re-put = no-idempotente salvo
    // que el handler valide el estado antes (así lo hace). Mantener simple.
  }).then(() => item);
}

/** Revoca explícitamente una invitación (respaldado por el admin con Cognito). */
export function revokeInvitation({ docClient, token }) {
  return docClient.put({
    TableName: INVITATIONS_TABLE,
    Item: { invitationId: token, status: 'revoked' },
  }).then(() => ({ invitationId: token, status: 'revoked' }));
}