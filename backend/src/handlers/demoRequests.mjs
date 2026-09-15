// demoRequests.mjs — public, write-only endpoint for voluntarily requested product demos.
import { createDemoRequest } from '../db/demoRequestsRepository.mjs';
import { appendAuditLog, makeAuditId } from '../db/sessionsRepository.mjs';

const MAX_BODY_BYTES = 8192;
const ALLOWED_FIELDS = new Set(['name', 'workEmail', 'company', 'role', 'teamSize', 'useCase', 'contactConsent']);
const FIELD_LIMITS = Object.freeze({ name: 120, workEmail: 320, company: 200, role: 160, teamSize: 50, useCase: 2000 });
const CORS_HEADERS = { 'content-type': 'application/json', 'access-control-allow-origin': process.env.CORS_ORIGIN ?? '*' };

function json(statusCode, body, headers = {}) {
  return { statusCode, headers: { ...CORS_HEADERS, ...headers }, body: JSON.stringify(body) };
}

function suppliedContentType(event) {
  const headers = event?.headers;
  if (!headers || typeof headers !== 'object') return null;
  for (const [name, value] of Object.entries(headers)) {
    if (name.toLowerCase() === 'content-type') return typeof value === 'string' ? value : '';
  }
  return null;
}

function acceptsJsonContentType(event) {
  const contentType = suppliedContentType(event);
  // API Gateway may omit Content-Type for a JSON form submission; preserve that
  // convention, but validate every Content-Type value that is supplied.
  return contentType === null || contentType.split(';', 1)[0].trim().toLowerCase() === 'application/json';
}

function parseBody(event) {
  if (typeof event?.body !== 'string') return { error: 'invalid_json_body' };
  const encoding = event.isBase64Encoded ? 'base64' : 'utf8';
  // Apply the cap to HTTP request bytes before allocating/decoding a Buffer.
  // For API Gateway base64 events, Buffer.byteLength(..., 'base64') is the
  // original decoded request byte length rather than the longer transport text.
  if (Buffer.byteLength(event.body, encoding) > MAX_BODY_BYTES) return { error: 'payload_too_large' };
  const raw = Buffer.from(event.body, encoding);
  try {
    const value = JSON.parse(raw.toString('utf8'));
    if (!value || Array.isArray(value) || typeof value !== 'object') return { error: 'invalid_json_body' };
    return { value };
  } catch {
    return { error: 'invalid_json_body' };
  }
}

function validEmail(email) {
  return typeof email === 'string' && email.length <= FIELD_LIMITS.workEmail && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export function validateDemoRequest(body) {
  const violations = [];
  const keys = Object.keys(body);
  for (const key of keys) if (!ALLOWED_FIELDS.has(key)) violations.push('unknown_field');
  for (const field of Object.keys(FIELD_LIMITS)) {
    if (typeof body[field] !== 'string' || !body[field].trim() || body[field].trim().length > FIELD_LIMITS[field]) violations.push(field);
  }
  if (!validEmail(body.workEmail?.trim())) violations.push('workEmail');
  if (body.contactConsent !== true) violations.push('contactConsent');
  if (keys.length !== ALLOWED_FIELDS.size) violations.push('missing_or_extra_fields');
  return { ok: violations.length === 0, violations: [...new Set(violations)] };
}

function normalizedRequest(body) {
  return {
    name: body.name.trim(),
    workEmail: body.workEmail.trim(),
    company: body.company.trim(),
    role: body.role.trim(),
    teamSize: body.teamSize.trim(),
    useCase: body.useCase.trim(),
    contactConsent: true,
  };
}

async function appendSafeAudit(deps, action, requestId, code = undefined) {
  try {
    await appendAuditLog({
      docClient: deps.docClient,
      auditId: makeAuditId(),
      sessionId: null,
      actor: 'public_demo_request',
      action,
      detail: code ? { requestId, code } : { requestId },
    });
  } catch {
    // Audit delivery must not convert a completed request into a client-visible failure.
  }
}

export async function routeDemoRequests(event, deps = {}) {
  const method = event?.requestContext?.http?.method ?? event?.httpMethod ?? '';
  if (method !== 'POST') return json(405, { error: 'method_not_allowed' });
  if (!acceptsJsonContentType(event)) return json(415, { error: 'unsupported_media_type' });
  const parsed = parseBody(event);
  if (parsed.error) return json(400, { error: parsed.error });
  const validation = validateDemoRequest(parsed.value);
  if (!validation.ok) return json(422, { error: 'invalid_demo_request', violations: validation.violations });

  const request = normalizedRequest(parsed.value);
  const item = await createDemoRequest({ docClient: deps.docClient, table: deps.demoRequestsTable, request });
  await appendSafeAudit(deps, 'demo_request.created', item.requestId);

  // Notification is derivative: no recipient or SES failure changes accepted persistence.
  if (typeof deps.sendDemoRequestNotification === 'function' && deps.demoNotificationTo) {
    try {
      await deps.sendDemoRequestNotification({
        to: deps.demoNotificationTo,
        from: deps.fromEmail ?? null,
        request,
      });
    } catch (err) {
      const code = String(err?.code ?? err?.name ?? 'send_error').slice(0, 60);
      await appendSafeAudit(deps, 'demo_request.notification_failed', item.requestId, code);
    }
  }
  return json(201, { requestId: item.requestId, status: 'received' });
}
