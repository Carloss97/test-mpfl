// A.1 (KRU-112) — UI de invitaciones: creación desde el workspace empresa.
// POST {apiBase}/invitations (protegida por authorizer JWT + gate de grupo
// A.2) con Authorization Bearer. Respuesta 201: { invitationId (token
// single-use), expiresAt, maskedEmail, status, email: {sent, reason} }
// (best-effort SES). El link manual se construye con el origin del sitio
// (coherente con la lógica de stage del backend: HR de stage → stage.krumm.cl;
// HR de prod → krumm.cl).
import { KRUMM_API_BASE } from '../postulation-demo/postulationDemoConfig.js';
import { resolveValidToken } from './cognitoAuth.js';

export function buildInvitationLink({ origin, invitationId }) {
  return `${origin}/postulaciones?invite=${encodeURIComponent(invitationId)}`;
}

export async function createInvitation({
  apiBase = KRUMM_API_BASE,
  email,
  ttlHours = 72,
  origin = typeof window !== 'undefined' ? window.location.origin : null,
  fetchImpl = globalThis.fetch,
  onAuthRequired,
} = {}) {
  const trimmed = String(email ?? '').trim();
  if (!apiBase || !trimmed) return { ok: false, code: 'invalid_input' };
  const token = await resolveValidToken({ fetchImpl });
  if (!token) {
    onAuthRequired?.();
    return { ok: false, code: 'no_auth' };
  }
  let response;
  try {
    response = await fetchImpl(`${apiBase}/invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: JSON.stringify({ email: trimmed, ttlHours }),
    });
  } catch {
    return { ok: false, code: 'network' };
  }
  if (response.status === 401 || response.status === 403) {
    onAuthRequired?.();
    return { ok: false, code: 'auth_required' };
  }
  let body = null;
  try {
    body = typeof response.json === 'function' ? await response.json() : null;
  } catch {
    body = null;
  }
  if (!response.ok || !body?.invitationId) return { ok: false, code: `http_${response.status}` };
  return {
    ok: true,
    invitationId: body.invitationId,
    email: trimmed,
    emailStatus: body.email ?? { sent: false, reason: 'unknown' },
    expiresAt: body.expiresAt ?? null,
    link: origin ? buildInvitationLink({ origin, invitationId: body.invitationId }) : null,
  };
}

export default createInvitation;
