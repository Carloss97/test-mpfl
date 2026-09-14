// index.mjs — Entrypoint Lambda para API Gateway HTTP (v2).
// Crea el DocumentClient real (fuera del handler, reutilizado entre invocations)
// y routea según path. En tests se inyecta docClient; en producción se usa el real.

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SESv2Client } from '@aws-sdk/client-sesv2';
// G.2 (KRU): error tracking — Sentry (init opcional: sin SENTRY_DSN no-op).
import * as Sentry from '@sentry/node';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  ScanCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { routeSessions } from './handlers/sessions.mjs';
import { routeInvitations } from './handlers/invitations.mjs';
import { sendInvitationEmail } from './email/invitationEmail.mjs';

const client = new DynamoDBClient({});
// Cliente SESv2 (A.1): el constructor no hace red; el envío real ocurre en send().
const sesClient = new SESv2Client({});
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true, convertEmptyValues: false },
});

// Adaptador producción: la capa de repositorios (y sus mocks de test) usa la API
// de conveniencia put/get/scan/delete inyectable; el SDK v3 es command-based.
// El adaptador vive SOLO aquí: los tests inyectan su propio docClient.
const productionDocClient = Object.freeze({
  put: (input) => docClient.send(new PutCommand(input)),
  get: (input) => docClient.send(new GetCommand(input)),
  scan: (input) => docClient.send(new ScanCommand(input)),
  delete: (input) => docClient.send(new DeleteCommand(input)),
});

// G.2 (KRU): Sentry backend — solo si hay DSN (parámetro CFN SENTRYDSN NoEcho).
// Sin PII (sendDefaultPii: false); captureException SOLO en el catch del
// handler con tag `code` (nunca payloads crudos) — ver
// docs/security/error-tracking.md.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    environment: process.env.ENV || 'staging',
  });
}

// ── A.2 (KRU-113): gate de grupo recruiters/admins (enforcement en Lambda) ──
// El JWT authorizer de API Gateway valida en el borde (firma/issuer/audience/
// exp), pero el modelo API actual de APIGW no soporta JwtConfiguration.Claims
// (ver infra/m2-backend-stack.yaml) → la restricción de grupo se aplica aquí,
// sobre los claims YA VALIDADOS que APIGW inyecta en
// requestContext.authorizer.claims.
//
// Rutas protegidas (requieren group recruiters o admins):
//   GET  /sessions               (listado HR)
//   ANY  /sessions/{id}          (detalle/acciones HR)
//   POST /invitations            (crear invitación)
//   POST /invitations/{token}/revoke
// Rutas públicas por diseño (flujo candidato, token single-use):
//   POST /sessions, GET /invitations/{token}

export function jwtClaims(event) {
  const authorizer = event?.requestContext?.authorizer ?? null;
  return authorizer?.claims ?? authorizer?.jwt?.claims ?? null;
}

/**
 * Parsea el claim `cognito:groups` en TODOS los formatos que APIGW entrega:
 * - array real: ['recruiters','admins'] (formato 2.0)
 * - string plano: 'recruiters' (1 solo grupo)
 * - string comas: 'recruiters,admins'
 * - string APIGW 1.0 multi: '[recruiters admins]' (corchetes + espacios —
 *   el formato REAL observado en staging 2026-09-13; split(',') lo rompía)
 * - string JSON: '["recruiters","admins"]'
 */
export function parseGroupClaim(raw) {
  if (Array.isArray(raw)) return raw.map((g) => String(g).trim()).filter(Boolean);
  if (typeof raw !== 'string' || !raw.trim()) return [];
  let s = raw.trim();
  if (s.startsWith('[') && s.endsWith(']')) s = s.slice(1, -1);
  return s.split(/[\s,]+/)
    .map((p) => p.trim().replace(/^['"]+|['"]+$/g, ''))
    .filter(Boolean);
}

export function isRecruiter(event) {
  const claims = jwtClaims(event);
  if (!claims) return false;
  const groups = parseGroupClaim(claims['cognito:groups']);
  return groups.some((g) => g === 'recruiters' || g === 'admins');
}

function routePathOf(event) {
  const raw = String(event?.routeKey ?? event?.resource ?? '');
  return raw.replace(/^(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD|ANY)\s+/i, '').toLowerCase().split('?')[0];
}

export function isProtectedRoute(event) {
  const method = String(event?.requestContext?.http?.method ?? event?.httpMethod ?? '').toUpperCase();
  const path = routePathOf(event);
  if (path.endsWith('/revoke')) return true; // POST /invitations/{token}/revoke
  if (/^\/invitations\/[^/]+$/.test(path)) return false; // GET /invitations/{token} (candidato)
  if (path === '/invitations') return true; // POST /invitations
  if (/^\/sessions\/[^/]+$/.test(path)) return true; // /sessions/{id}
  if (path === '/sessions') return method === 'POST' ? false : true; // POST=candidato; GET=listado HR
  return false;
}

function forbiddenResponse() {
  return {
    statusCode: 403,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': process.env.CORS_ORIGIN ?? '*',
    },
    body: JSON.stringify({ error: 'forbidden', code: 'recruiter_group_required' }),
  };
}

export async function handler(event, context = {}) {
  // Se permite inyectar deps vía context (tests / integración).
  // A.1: el link del email depende del stage de entrada (KRU-97: /staging y
  // /prod comparten Lambda/tablas): prod → krumm.cl, lo demás → stage.krumm.cl.
  const stage = event?.requestContext?.stage ?? '';
  const appBaseUrl = stage === 'prod'
    ? (process.env.FRONTEND_BASE_URL_PROD ?? process.env.FRONTEND_BASE_URL ?? null)
    : (process.env.FRONTEND_BASE_URL ?? null);
  const deps = {
    docClient: context.docClient ?? productionDocClient,
    // A.1: envío real de email de invitación (best-effort en el handler).
    sendInvitationEmail: context.sendInvitationEmail ?? ((args) => sendInvitationEmail({ sesClient, ...args })),
    appBaseUrl,
    fromEmail: process.env.SES_FROM_EMAIL ?? null,
    // F.2: eventos PostHog server-side (invite_received). En tests se inyecta
    // {apiKey, fetchImpl, log}; en Lambda usa env POSTHOG_API_KEY + fetch global.
    posthog: context.posthog ?? {},
  };
  try {
    // A.2: gate de grupo (recruiters/admins) sobre las rutas HR.
    // En API GW el JWT authorizer ya rechazó token inválido (401/403); aquí
    // se verifica el claim de grupo que el authorizer no puede comprobar.
    if (isProtectedRoute(event) && !isRecruiter(event)) {
      return forbiddenResponse();
    }
    const routeKey = event?.routeKey ?? event?.resource ?? '';
    if (routeKey.includes('/invitations')) {
      return await routeInvitations(event, deps);
    }
    return await routeSessions(event, deps);
  } catch (err) {
    // Sin PII en el mensaje de error: logueamos el código, no el stack completo.
    const code = err?.code ?? err?.name ?? 'internal_error';
    // G.2 (KRU): el 500 va a Sentry con tag `code` + ruta (sin payload crudo).
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(err, {
        tags: { code, route: String(event?.resource ?? '') },
      });
    }
    console.error('handler_error', code); // no loguear payloads crudos
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: 'internal_error', code }),
    };
  }
}