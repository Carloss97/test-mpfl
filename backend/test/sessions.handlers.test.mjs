import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  handlePostSessions,
  handleGetSession,
  handleDeleteSession,
  handleListSessions,
  routeSessions,
} from '../src/handlers/sessions.mjs';

const VALID_BODY = {
  schemaVersion: 'krumm_final_assessment_payload_v1',
  runId: 'run-m2-001',
  batteryId: 'krumm_unified_battery_v1',
  generatedAt: '2026-09-03T00:00:00.000Z',
  participant: { aliasHash: 'h-abc123', declaredRoleTarget: 'Analista' },
  quality: { sampleCount: 150, facePresenceRatio: 0.91 },
  behavioral: {
    gameSummary: { performance: { accuracy: 0.84, completedTrialCount: 18 } },
    gameCorrelationAggregate: { completedTrialCount: 18 },
    featureVectorV2: { type: 'assessment_feature_vector_v2', version: '0.2.0', featureOrder: ['game.accuracy'], featureArray: [0.84], featureMap: { 'game.accuracy': 0.84 }, qualityFlags: [] },
    gameResults: [{ index: 0, gameId: 'laser_puzzle', label: 'Puzzle láser', status: 'completed', trialCount: 2, result: { score: 0.88, solvedLevels: 2, aggregateOnly: true } }],
  },
  talentProfile: { schemaVersion: 'krumm_talent_profile_v1', runId: 'run-m2-001', dimensions: {}, globalSummary: {}, governance: { humanReviewOnly: true, noAutomatedDecision: true, observationalOnly: true } },
  governance: { humanReviewOnly: true, noAutomatedDecision: true, observationalOnly: true, privacySafe: true },
};

function makeDocClient() {
  const store = new Map();
  const audit = [];
  return {
    store,
    audit,
    client: {
      async put({ TableName, Item }) {
        if (TableName === 'krumm-audit-log') audit.push(Item);
        else store.set(Item.sessionId, Item);
        return { Item };
      },
      async get({ Key }) {
        const item = store.get(Key.sessionId);
        return item ? { Item: item } : {};
      },
      async delete({ Key }) {
        store.delete(Key.sessionId);
        return {};
      },
      async scan({ Limit }) {
        const items = [...store.values()]
          .sort((a, b) => new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf())
          .slice(0, Limit ?? 50);
        return { Items: items };
      },
    },
  };
}

function event({ method, route, pathParameters, body }) {
  return {
    requestContext: { http: { method } },
    routeKey: route,
    pathParameters,
    body: body ? JSON.stringify(body) : undefined,
  };
}

describe('backend sessions handlers (RED -> GREEN)', () => {
  let deps;
  beforeEach(() => {
    const m = makeDocClient();
    deps = { docClient: m.client, audit: m.audit };
  });

  it('POST acepta payload válido -> 201 + id', async () => {
    const res = await handlePostSessions(event({ method: 'POST', route: 'POST /sessions', body: VALID_BODY }), deps);
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.id).toBe('run-m2-001');
    expect(body.status).toBe('created');
  });

  it('POST rechaza raw fields -> 422', async () => {
    const raw = { ...VALID_BODY, behavioral: { ...VALID_BODY.behavioral, rawGameEvents: [] } };
    const res = await handlePostSessions(event({ method: 'POST', route: 'POST /sessions', body: raw }), deps);
    expect(res.statusCode).toBe(422);
    expect(JSON.parse(res.body).violations).toEqual(expect.arrayContaining(['rawGameEvents']));
  });

  it('POST rechaza body JSON inválido -> 400', async () => {
    const res = await handlePostSessions({
      requestContext: { http: { method: 'POST' } },
      routeKey: 'POST /sessions',
      body: 'not-json{{{{',
    }, deps);
    expect(res.statusCode).toBe(400);
  });

  it('GET devuelve payload idéntico -> 200', async () => {
    await handlePostSessions(event({ method: 'POST', route: 'POST /sessions', body: VALID_BODY }), deps);
    const res = await handleGetSession(event({ method: 'GET', route: 'GET /sessions/{id}', pathParameters: { id: 'run-m2-001' } }), deps);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.payload.runId).toBe('run-m2-001');
    expect(body.payload.governance.privacySafe).toBe(true);
  });

  it('GET de sesión inexistente -> 404', async () => {
    const res = await handleGetSession(event({ method: 'GET', route: 'GET /sessions/{id}', pathParameters: { id: 'nope' } }), deps);
    expect(res.statusCode).toBe(404);
  });

  it('DELETE hard-deleta + escribe audit log; GET posterior -> 404', async () => {
    await handlePostSessions(event({ method: 'POST', route: 'POST /sessions', body: VALID_BODY }), deps);
    const del = await handleDeleteSession(event({ method: 'DELETE', route: 'DELETE /sessions/{id}', pathParameters: { id: 'run-m2-001' } }), deps);
    expect(del.statusCode).toBe(204);

    const after = await handleGetSession(event({ method: 'GET', route: 'GET /sessions/{id}', pathParameters: { id: 'run-m2-001' } }), deps);
    expect(after.statusCode).toBe(404);

    // audit log inmutable: hay un create y un delete
    const actions = deps.audit.map((a) => a.action);
    expect(actions).toEqual(expect.arrayContaining(['session.create', 'session.delete']));
  });

  it('routeSessions despacha por método/route', async () => {
    const res = await routeSessions(event({ method: 'POST', route: 'POST /sessions', body: VALID_BODY }), deps);
    expect(res.statusCode).toBe(201);
    const bad = await routeSessions(event({ method: 'GET', route: 'POST /sessions' }), deps);
    expect(bad.statusCode).toBe(405);
  });

  it('GET /sessions lista: candidato con completion/constructs/interviewPrompts + caveats en texto (B1 dashboard real)', async () => {
    const created = await handlePostSessions(event({ method: 'POST', route: 'POST /sessions', body: {
      ...VALID_BODY,
      quality: { sampleCount: 150, facePresenceRatio: 0.91, caveats: ['low_face_presence'] },
    } }), deps);
    expect(created.statusCode).toBe(201);

    const res = await handleListSessions({
      requestContext: { http: { method: 'GET' } },
      routeKey: 'GET /sessions',
      queryStringParameters: { limit: '10' },
    }, deps);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.candidates).toHaveLength(1);
    const cand = body.candidates[0];
    // Campos que el dashboard HR consume (antes faltaban -> página en blanco en prod)
    expect(cand.completion).toEqual({ completed: 1, total: 4 });
    expect(cand.constructs).toHaveLength(8);
    expect(cand.constructs[0]).toMatchObject({ id: 'decisionMaking', label: 'Toma de decisiones', score: null });
    expect(Array.isArray(cand.interviewPrompts)).toBe(true);
    expect(cand.alias).toBe('h-abc123');
    expect(cand.caveats).toEqual(['Presencia facial baja']);
  });
});