// tenant.mjs — resolución segura del tenant desde claims JWT validados.
// Nunca acepta companyId desde body, query, headers ni payload de candidato.

const COMPANY_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,95}$/;

export const DEMO_COMPANY_ID = 'krumm-demo';

export function claimsFromEvent(event) {
  const authorizer = event?.requestContext?.authorizer ?? null;
  return authorizer?.claims ?? authorizer?.jwt?.claims ?? null;
}

export function normalizeCompanyId(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return COMPANY_ID_PATTERN.test(trimmed) ? trimmed : null;
}

export function companyIdFromEvent(event, { allowTestDemo = false } = {}) {
  const claims = claimsFromEvent(event);
  const rawClaim = claims?.['custom:companyId'] ?? claims?.companyId;
  const fromClaims = normalizeCompanyId(rawClaim);
  if (fromClaims) return fromClaims;
  // Solo preserva fixtures unitarios legacy; producción nunca obtiene tenant implícito.
  if (allowTestDemo && process.env.NODE_ENV === 'test' && (claims == null || rawClaim == null)) return DEMO_COMPANY_ID;
  return null;
}

export function requireCompanyId(event, options = {}) {
  const companyId = companyIdFromEvent(event, options);
  if (!companyId) {
    const error = new Error('company_id_required');
    error.code = 'COMPANY_ID_REQUIRED';
    throw error;
  }
  return companyId;
}

export function sameCompany(item, companyId) {
  return Boolean(companyId) && item?.companyId === companyId;
}
