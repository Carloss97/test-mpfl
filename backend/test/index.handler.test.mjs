import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  handler,
  isProtectedRoute,
  isRecruiter,
  jwtClaims,
} from '../src/index.mjs';

// A.1 (KRU-112): el link del email de invitación depende del stage de entrada.
// KRU-97: /staging y /prod comparten la misma Lambda y tablas, así que la base
// del link se resuelve por event.requestContext.stage en el entrypoint.
// A.2 (KRU-113): las rutas HR exigen el claim cognito:groups ∈
// {recruiters, admins} — el JWT authorizer de API GW valida firma/iss/aud/exp
// en el borde; el grupo se verifica aquí sobre claims ya validados.

const BASE_STAGING = 'https://stage.krumm.cl';
const BASE_PROD = 'https://krumm.cl';

// Payload mínimo válido para POST /sessions (mismo schema que VALID_BODY de
// sessions.handlers.test.mjs; runId propio para no colisionar).
const VALID_SESSION_BODY = {
  schemaVersion: 'krumm_final_assessment_payload_v1',
  runId: 'run-a2-index-001',
  batteryId: 'krumm_unified_battery_v1',
  generatedAt: '2026-09-03T00:00:00.000Z',
  participant: { aliasHash: 'h-a2index', declaredRoleTarget: 'Analista' },
  quality: { sampleCount: 150, facePresenceRatio: 0.91 },
  behavioral: {
    gameSummary: { performance: { accuracy: 0.84, completedTrialCount: 18 } },
    gameCorrelationAggregate: { completedTrialCount: 18 },
    featureVectorV2: { type: 'assessment_feature_vector_v2', version: '0.2.0', featureOrder: ['game.accuracy'], featureArray: [0.84], featureMap: { 'game.accuracy': 0.84 }, qualityFlags: [] },
    gameResults: [{ index: 0, gameId: 'laser_puzzle', label: 'Puzzle láser', status: 'completed', trialCount: 2, result: { score: 0.88, solvedLevels: 2, aggregateOnly: true } }],
  },
  talentProfile: { schemaVersion: 'krumm_talent_profile_v1', runId: 'run-a2-index-001', dimensions: {}, globalSummary: {}, governance: { humanReviewOnly: true, noAutomatedDecision: true, observationalOnly: true } },
  governance: { humanReviewOnly: true, noAutomatedDecision: true, observationalOnly: true, privacySafe: true },
};

function makeDocClient() {
  const invitations = new Map();
  const audit = [];
  return {
    invitations,
    audit,
    client: {
      async put({ TableName, Item }) {
        if (TableName === 'krumm-audit-log') {
          const existing = audit.find((a) => a.auditId === Item.auditId);
          if (!existing) audit.push(Item);
        } else if (TableName === 'krumm-invitations') {
          invitations.set(Item.invitationId, { ...invitations.get(Item.invitationId), ...Item });
        }
        return { Item };
      },
      async get({ TableName, Key }) {
        if (TableName === 'krumm-invitations') {
          const item = invitations.get(Key.invitationId);
          return item ? { Item: item } : {};
        }
        return {};
      },
      async delete() { return {}; },
      async scan() { return { Items: [] }; },
    },
  };
}

function authorizerContext(claims) {
  return claims ? { authorizer: { claims } } : {};
}

function makeInvitationEvent(stage, groups = ['admins', 'recruiters']) {
  const claims = groups ? { 'cognito:groups': groups, sub: 'test-recruiter' } : undefined;
  return {
    routeKey: 'POST /invitations',
    requestContext: { http: { method: 'POST' }, stage, ...authorizerContext(claims) },
    body: JSON.stringify({ email: 'cand@correo.cl', ttlHours: 24 }),
  };
}

describe('index.handler — A.1 stage→appBaseUrl del email', () => {
  beforeEach(() => {
    process.env.FRONTEND_BASE_URL = BASE_STAGING;
    process.env.FRONTEND_BASE_URL_PROD = BASE_PROD;
  });

  afterEach(() => {
    delete process.env.FRONTEND_BASE_URL;
    delete process.env.FRONTEND_BASE_URL_PROD;
  });

  it('stage=prod → el sender recibe la base de PROD (link krumm.cl)', async () => {
    const captured = [];
    const m = makeDocClient();
    const res = await handler(makeInvitationEvent('prod'), {
      docClient: m.client,
      sendInvitationEmail: async (args) => { captured.push(args); return { messageId: 'm-prod' }; },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.email).toMatchObject({ sent: true, messageId: 'm-prod' });
    expect(captured).toHaveLength(1);
    expect(captured[0].appBaseUrl).toBe(BASE_PROD);
    expect(captured[0].token).toBe(body.invitationId);
  });

  it('stage=staging → el sender recibe la base de STAGE (link stage.krumm.cl)', async () => {
    const captured = [];
    const m = makeDocClient();
    const res = await handler(makeInvitationEvent('staging'), {
      docClient: m.client,
      sendInvitationEmail: async (args) => { captured.push(args); return { messageId: 'm-stage' }; },
    });
    expect(res.statusCode).toBe(201);
    expect(captured).toHaveLength(1);
    expect(captured[0].appBaseUrl).toBe(BASE_STAGING);
  });

  it('sin env de bases → appBaseUrl null (el sender real lanzaría no_link; el handler sigue 201)', async () => {
    delete process.env.FRONTEND_BASE_URL;
    delete process.env.FRONTEND_BASE_URL_PROD;
    const captured = [];
    const m = makeDocClient();
    const res = await handler(makeInvitationEvent('staging'), {
      docClient: m.client,
      sendInvitationEmail: async (args) => { captured.push(args); return { messageId: 'm-null' }; },
    });
    expect(res.statusCode).toBe(201);
    expect(captured[0].appBaseUrl).toBe(null);
  });
});

describe('A.2 — gate de grupo recruiters/admins (KRU-113)', () => {
  describe('isProtectedRoute (matriz de rutas)', () => {
    const evt = (routeKey, method, pathParameters) => ({
      routeKey,
      requestContext: { http: { method } },
      ...(pathParameters ? { pathParameters } : {}),
    });

    it('protege: GET /sessions (listado HR)', () => {
      expect(isProtectedRoute(evt('GET /sessions', 'GET'))).toBe(true);
    });
    it('protege: ANY /sessions/{id} (GET/DELETE)', () => {
      expect(isProtectedRoute(evt('ANY /sessions/{id}', 'GET', { id: 'x' }))).toBe(true);
      expect(isProtectedRoute(evt('ANY /sessions/{id}', 'DELETE', { id: 'x' }))).toBe(true);
    });
    it('protege: POST /invitations', () => {
      expect(isProtectedRoute(evt('POST /invitations', 'POST'))).toBe(true);
    });
    it('protege: POST /invitations/{token}/revoke', () => {
      expect(isProtectedRoute(evt('POST /invitations/{token}/revoke', 'POST', { token: 't' }))).toBe(true);
    });
    it('PÚBLICO: POST /sessions (creación de candidato)', () => {
      expect(isProtectedRoute(evt('POST /sessions', 'POST'))).toBe(false);
    });
    it('PÚBLICO: GET /invitations/{token} (validación de candidato)', () => {
      expect(isProtectedRoute(evt('GET /invitations/{token}', 'GET', { token: 't' }))).toBe(false);
    });
    it('formato resource sin verbo (compat REST-style) sigue resolviendo', () => {
      expect(isProtectedRoute({ resource: '/sessions', httpMethod: 'GET' })).toBe(true);
      expect(isProtectedRoute({ resource: '/sessions', httpMethod: 'POST' })).toBe(false);
    });
  });

  describe('isRecruiter (claim cognito:groups)', () => {
    const evt = (claims) => ({ requestContext: authorizerContext(claims) });

    it('array con recruiters → true', () => {
      expect(isRecruiter(evt({ 'cognito:groups': ['recruiters'] }))).toBe(true);
    });
    it('array multi-grupo con admins → true', () => {
      expect(isRecruiter(evt({ 'cognito:groups': ['another', 'admins'] }))).toBe(true);
    });
    it('string (usuario de 1 grupo) → true', () => {
      expect(isRecruiter(evt({ 'cognito:groups': 'recruiters' }))).toBe(true);
    });
    it('string coma-separated → true', () => {
      expect(isRecruiter(evt({ 'cognito:groups': 'other,admins' }))).toBe(true);
    });
    it('sin grupo recruiter/admin → false', () => {
      expect(isRecruiter(evt({ 'cognito:groups': ['beta-testers'] }))).toBe(false);
    });
    it('claim ausente / sin authorizer → false', () => {
      expect(isRecruiter(evt({ sub: 'x' }))).toBe(false);
      expect(isRecruiter(evt(null))).toBe(false);
    });
    it('jwtClaims soporta el formato legacy authorizer.jwt.claims', () => {
      const e = { requestContext: { authorizer: { jwt: { claims: { 'cognito:groups': 'admins' } } } } };
      expect(jwtClaims(e)?.['cognito:groups']).toBe('admins');
    });
  });

  describe('handler: enforcement del gate', () => {
    const m = () => makeDocClient();

    it('POST /invitations SIN grupo recruiter → 403 (no toca DynamoDB)', async () => {
      const dc = m();
      const res = await handler(makeInvitationEvent('staging', ['beta-testers']), { docClient: dc.client });
      expect(res.statusCode).toBe(403);
      expect(JSON.parse(res.body)).toMatchObject({ error: 'forbidden', code: 'recruiter_group_required' });
      expect(dc.audit).toHaveLength(0);
    });

    it('POST /invitations SIN authorizer → 403', async () => {
      const res = await handler(makeInvitationEvent('staging', null), { docClient: m().client });
      expect(res.statusCode).toBe(403);
    });

    it('GET /sessions sin authorizer → 403 (era el gap de seguridad pre-beta)', async () => {
      const res = await handler(
        { routeKey: 'GET /sessions', requestContext: { http: { method: 'GET' }, stage: 'staging' } },
        { docClient: m().client },
      );
      expect(res.statusCode).toBe(403);
    });

    it('GET /sessions/{id} CON grupo → pasa el gate (404 del handler, no 403)', async () => {
      const res = await handler(
        {
          routeKey: 'ANY /sessions/{id}',
          requestContext: { http: { method: 'GET' }, stage: 'staging', ...authorizerContext({ 'cognito:groups': ['admins'] }) },
          pathParameters: { id: 'run-a2-noexiste' },
        },
        { docClient: m().client },
      );
      expect(res.statusCode).toBe(404);
    });

    it('POST /invitations/{token}/revoke sin grupo → 403', async () => {
      const res = await handler(
        {
          routeKey: 'POST /invitations/{token}/revoke',
          requestContext: { http: { method: 'POST' }, stage: 'staging' },
          pathParameters: { token: 'tok-1' },
        },
        { docClient: m().client },
      );
      expect(res.statusCode).toBe(403);
    });

    it('PÚBLICO: POST /sessions sin auth → 201 (flujo candidato intacto)', async () => {
      const res = await handler(
        {
          routeKey: 'POST /sessions',
          requestContext: { http: { method: 'POST' }, stage: 'staging' },
          body: JSON.stringify(VALID_SESSION_BODY),
        },
        { docClient: m().client },
      );
      expect(res.statusCode).toBe(201);
    });

    it('PÚBLICO: GET /invitations/{token} sin auth → 404 del handler (no 403)', async () => {
      const res = await handler(
        {
          routeKey: 'GET /invitations/{token}',
          requestContext: { http: { method: 'GET' }, stage: 'staging' },
          pathParameters: { token: 'tok-desconocido' },
        },
        { docClient: m().client },
      );
      expect(res.statusCode).toBe(404);
    });
  });
});
