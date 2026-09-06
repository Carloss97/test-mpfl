// postulationDemoInvite.js — Guard de invitación ?invite=<token> para /postulaciones-demo.
//
// Flujo:
//   1. parseInviteToken(search) extrae y valida el token del query string.
//   2. validateInvitationToken({ token, fetchImpl, endpoint }) valida contra el
//      backend (GET /invitations/{token}). Si no hay endpoint configurado (modo
//      demo/local sin deploy), usa un validador local que emula el veredicto del
//      backend de forma DETERMINISTA (para QA y guard fuera de red).
//   3. La sesión se liga a la invitación: el runId y el header x-invitation-id
//      se derivan del token aceptado.
//
// Regla de privacidad: nunca guardar el email completo en el cliente; el backend
// devuelve maskedEmail. El token en sí no es PII.

export const INVITATION_PARAM = 'invite';

export const INVITATION_STATUS = Object.freeze({
  VALID: 'valid',
  INVALID: 'invalid',
  EXPIRED: 'expired',
  USED: 'used',
  REVOKED: 'revoked',
  ERROR: 'error',
  CHECKING: 'checking',
});

const TOKEN_REGEX = /^[A-Za-z0-9_-]{8,64}$/;

export function parseInviteToken(search) {
  const normalized = String(search ?? '').trim();
  const params = new URLSearchParams(normalized.startsWith('?') ? normalized : `?${normalized}`);
  const token = params.get(INVITATION_PARAM);
  if (!token || !TOKEN_REGEX.test(token)) return null;
  return token;
}

export function hasInviteParam(search) {
  return parseInviteToken(search) !== null;
}

/**
 * Validador local determinista (modo demo/sin backend). Refleja la semántica
 * del backend server-side para permitir el guard y QA fuera de red:
 *  - token con prefijo 'tok-valid'  -> valid
 *  - token con prefijo 'tok-expired'-> expired
 *  - token con prefijo 'tok-used'   -> used
 *  - token con prefijo 'tok-revoked'-> revoked
 *  - cualquier otro token válido     -> valid (demo abierta)
 * Cualquier token que no pase el regex -> invalid.
 */
export function localValidateInvitationToken(token) {
  if (!TOKEN_REGEX.test(token)) return { status: INVITATION_STATUS.INVALID, token, source: 'local' };
  const lower = token.toLowerCase();
  if (lower.startsWith('tok-expired')) return { status: INVITATION_STATUS.EXPIRED, token, source: 'local' };
  if (lower.startsWith('tok-used')) return { status: INVITATION_STATUS.USED, token, source: 'local' };
  if (lower.startsWith('tok-revoked')) return { status: INVITATION_STATUS.REVOKED, token, source: 'local' };
  if (lower.startsWith('tok-invalid')) return { status: INVITATION_STATUS.INVALID, token, source: 'local' };
  return { status: INVITATION_STATUS.VALID, token, source: 'local', maskedEmail: `c***@${token.slice(-6)}.invite` };
}

/**
 * Valida una invitación contra el backend (GET /invitations/{token}).
 * fetchImpl inyectable para tests. Devuelve { status, token, maskedEmail, error }.
 */
export async function validateInvitationToken({ token, fetchImpl = globalThis.fetch, endpoint } = {}) {
  if (!TOKEN_REGEX.test(token ?? '')) return { status: INVITATION_STATUS.INVALID, token, source: 'local' };

  // Sin endpoint (modo demo/local): validador local determinista.
  if (!endpoint || typeof fetchImpl !== 'function') {
    return localValidateInvitationToken(token);
  }

  try {
    const response = await fetchImpl(`${endpoint}/invitations/${encodeURIComponent(token)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (response.status === 200) {
      const body = typeof response.json === 'function' ? await response.json() : {};
      return { status: INVITATION_STATUS.VALID, token, source: 'backend', maskedEmail: body.maskedEmail ?? null };
    }
    if (response.status === 410) {
      const body = typeof response.json === 'function' ? await response.json() : {};
      const error = body?.error;
      if (error === 'invitation_revoked') return { status: INVITATION_STATUS.REVOKED, token, source: 'backend', error };
      if (error === 'invitation_already_used') return { status: INVITATION_STATUS.USED, token, source: 'backend', error };
      if (error === 'invitation_expired') return { status: INVITATION_STATUS.EXPIRED, token, source: 'backend', error };
      return { status: INVITATION_STATUS.INVALID, token, source: 'backend', error };
    }
    if (response.status === 404) return { status: INVITATION_STATUS.INVALID, token, source: 'backend', error: 'invitation_not_found' };
    return { status: INVITATION_STATUS.ERROR, token, source: 'backend', error: `http_${response.status}` };
  } catch (error) {
    return { status: INVITATION_STATUS.ERROR, token, source: 'backend', error: error?.message ?? 'network_error' };
  }
}

/**
 * runId ligado a la invitación: usa el token como prefijo estable para que la
 * sesión back-end quede correlacionada con la invitación (no es PII).
 */
export function runIdForInvitation(token) {
  const safe = String(token ?? '').replace(/[^A-Za-z0-9_-]/g, '');
  return safe ? `krumm-inv-${safe}-${Date.now()}` : `postulation-demo-${Date.now()}`;
}

export const INVITATION_GUARD_MESSAGES = Object.freeze({
  [INVITATION_STATUS.INVALID]: {
    es: 'Este enlace de invitación no es válido. Pide un nuevo enlace.',
    en: 'This invitation link is not valid. Please request a new link.',
  },
  [INVITATION_STATUS.EXPIRED]: {
    es: 'Este enlace de invitación ha expirado.',
    en: 'This invitation link has expired.',
  },
  [INVITATION_STATUS.USED]: {
    es: 'Esta invitación ya fue utilizada. No se puede completar dos veces.',
    en: 'This invitation has already been used. It cannot be completed a second time.',
  },
  [INVITATION_STATUS.REVOKED]: {
    es: 'Esta invitación fue revocada. Contacta a quien te invitó.',
    en: 'This invitation was revoked. Contact the person who invited you.',
  },
  [INVITATION_STATUS.ERROR]: {
    es: 'No fue posible validar tu invitación. Reintenta en unos instantes.',
    en: 'We could not validate your invitation. Please try again in a moment.',
  },
});