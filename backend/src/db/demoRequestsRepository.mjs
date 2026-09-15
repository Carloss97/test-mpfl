// demoRequestsRepository.mjs — write-only persistence for public demo requests.
// This module intentionally exposes no list/scan/read operation.

export const DEMO_REQUESTS_TABLE = process.env.DEMO_REQUESTS_TABLE ?? 'krumm-demo-requests';
export const DEMO_REQUEST_RETENTION_DAYS = Number(process.env.DEMO_REQUEST_RETENTION_DAYS ?? 90);

export function makeDemoRequestId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `demo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

/** Persists only validated, allowlisted fields; no IP, URL/query, token, CV, or candidate data. */
export async function createDemoRequest({ docClient, table = DEMO_REQUESTS_TABLE, request, now = nowSeconds } = {}) {
  if (!docClient) throw new Error('docClient_required');
  const createdAt = now();
  const retentionDays = Number.isFinite(DEMO_REQUEST_RETENTION_DAYS) && DEMO_REQUEST_RETENTION_DAYS > 0
    ? DEMO_REQUEST_RETENTION_DAYS
    : 90;
  const item = {
    requestId: makeDemoRequestId(),
    name: request.name,
    workEmail: request.workEmail,
    company: request.company,
    role: request.role,
    teamSize: request.teamSize,
    useCase: request.useCase,
    contactConsent: true,
    createdAt,
    expiresAt: createdAt + (retentionDays * 24 * 60 * 60),
  };
  await docClient.put({ TableName: table, Item: item });
  return item;
}
