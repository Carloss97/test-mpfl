// G.2 (KRU): Sentry backend — el 500 del handler va a Sentry SOLO si hay
// SENTRY_DSN (parámetro CFN NoEcho). Sin DSN: no-op seguro (no cambia el
// comportamiento de la API). Reglas: docs/security/error-tracking.md.
import { describe, expect, it, vi, afterEach } from 'vitest';

vi.mock('@sentry/node', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
}));
import * as Sentry from '@sentry/node';

// Payload mínimo válido para POST /sessions (mismo schema que
// index.handler.test.mjs; runId propio para no colisionar).
const VALID_SESSION_BODY = {
  schemaVersion: 'krumm_final_assessment_payload_v1',
  runId: 'run-g2-sentry-001',
  batteryId: 'krumm_unified_battery_v1',
  generatedAt: '2026-09-13T00:00:00.000Z',
  participant: { aliasHash: 'h-g2sentry', declaredRoleTarget: 'Analista' },
  quality: { sampleCount: 150, facePresenceRatio: 0.91 },
  behavioral: {
    gameSummary: { performance: { accuracy: 0.84, completedTrialCount: 18 } },
    gameCorrelationAggregate: { completedTrialCount: 18 },
    featureVectorV2: { type: 'assessment_feature_vector_v2', version: '0.2.0', featureOrder: ['game.accuracy'], featureArray: [0.84], featureMap: { 'game.accuracy': 0.84 }, qualityFlags: [] },
    gameResults: [{ index: 0, gameId: 'laser_puzzle', label: 'Puzzle láser', status: 'completed', trialCount: 2, result: { score: 0.88, solvedLevels: 2, aggregateOnly: true } }],
  },
  talentProfile: { schemaVersion: 'krumm_talent_profile_v1', runId: 'run-g2-sentry-001', dimensions: {}, globalSummary: {}, governance: { humanReviewOnly: true, noAutomatedDecision: true, observationalOnly: true } },
  governance: { humanReviewOnly: true, noAutomatedDecision: true, observationalOnly: true, privacySafe: true },
};

const POST_SESSIONS = {
  routeKey: 'POST /sessions',
  resource: '/sessions',
  requestContext: { http: { method: 'POST' }, stage: 'staging' },
  body: JSON.stringify(VALID_SESSION_BODY),
};

function okDocClient() {
  const invitations = new Map();
  const audit = [];
  return {
    invitations,
    audit,
    client: {
      async put({ TableName, Item }) {
        if (TableName === 'krumm-audit-log' && !audit.some((a) => a.auditId === Item.auditId)) audit.push(Item);
        return { Item };
      },
      async get() { return {}; },
      async delete() { return {}; },
      async scan() { return { Items: [] }; },
    },
  };
}

function brokenDocClient() {
  const boom = () => Promise.reject(new Error('dynamo down'));
  return {
    invitations: new Map(),
    audit: [],
    client: { put: boom, get: boom, delete: boom, scan: boom },
  };
}

// El init de Sentry corre al cargar el módulo (leer env): recargar con
// resetModules por escenario.
async function loadHandler(withDsn) {
  vi.resetModules();
  vi.clearAllMocks();
  if (withDsn) process.env.SENTRY_DSN = 'https://abc123@o1.ingest.us.sentry.io/1';
  else delete process.env.SENTRY_DSN;
  const mod = await import('../src/index.mjs');
  return mod.handler;
}

describe('G.2 Sentry backend', () => {
  afterEach(() => {
    delete process.env.SENTRY_DSN;
  });

  it('500 con DSN → captureException llamado una vez, con tag code + route', async () => {
    const handler = await loadHandler(true);
    const res = await handler(POST_SESSIONS, { docClient: brokenDocClient().client });
    expect(res.statusCode).toBe(500);
    expect(Sentry.init).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    const [err, ctx] = Sentry.captureException.mock.calls[0];
    expect(String(err.message)).toContain('dynamo down');
    expect(ctx.tags.code).toBeTruthy();
    expect(ctx.tags.route).toBe('/sessions');
  });

  it('500 sin DSN → captureException NO llamado (no-op seguro; la API responde igual)', async () => {
    const handler = await loadHandler(false);
    const res = await handler(POST_SESSIONS, { docClient: brokenDocClient().client });
    expect(res.statusCode).toBe(500);
    expect(Sentry.init).not.toHaveBeenCalled();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('2xx con DSN → sin captureException (solo errores se reportan)', async () => {
    const handler = await loadHandler(true);
    const m = okDocClient();
    const res = await handler(POST_SESSIONS, { docClient: m.client });
    expect(res.statusCode).toBe(201);
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});
