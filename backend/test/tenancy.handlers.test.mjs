import { describe, expect, it } from 'vitest';
import { handlePostInvitation, handleGetInvitation, handleRevokeInvitation } from '../src/handlers/invitations.mjs';
import { handlePostSessions, handleGetSession, handleDeleteSession, handleListSessions } from '../src/handlers/sessions.mjs';

const BODY = {
  schemaVersion: 'krumm_final_assessment_payload_v1', runId: 'tenant-run',
  batteryId: 'krumm_unified_battery_v1', generatedAt: '2026-09-03T00:00:00.000Z',
  participant: { aliasHash: 'alias-tenant' }, quality: { sampleCount: 1, facePresenceRatio: 1 },
  behavioral: { gameSummary: { performance: { accuracy: 1 } }, gameCorrelationAggregate: { completedTrialCount: 1 }, featureVectorV2: { type: 'assessment_feature_vector_v2', version: '0.2.0', featureOrder: ['game.accuracy'], featureArray: [1], featureMap: { 'game.accuracy': 1 }, qualityFlags: [] }, gameResults: [] },
  talentProfile: { schemaVersion: 'krumm_talent_profile_v1', runId: 'tenant-run', dimensions: {}, globalSummary: {}, governance: { humanReviewOnly: true, noAutomatedDecision: true, observationalOnly: true } },
  governance: { humanReviewOnly: true, noAutomatedDecision: true, observationalOnly: true, privacySafe: true },
};

function event({ method, route, body, pathParameters, claims, headers } = {}) {
  return { requestContext: { http: { method }, authorizer: claims ? { claims } : undefined }, routeKey: route, body: body ? JSON.stringify(body) : undefined, pathParameters, headers };
}

function makeClient() {
  const invitations = new Map();
  const sessions = new Map();
  const audit = [];
  const client = {
    async put({ TableName, Item }) {
      if (TableName.includes('invitation')) invitations.set(Item.invitationId, Item);
      else if (TableName.includes('audit')) audit.push(Item);
      else sessions.set(Item.sessionId, Item);
      return {};
    },
    async get({ TableName, Key }) {
      const item = TableName.includes('invitation') ? invitations.get(Key.invitationId) : sessions.get(Key.sessionId);
      return item ? { Item: item } : {};
    },
    async delete({ Key }) { sessions.delete(Key.sessionId); return {}; },
    async scan() { return { Items: [...sessions.values()] }; },
  };
  return { client, invitations, sessions, audit };
}

const claims = (companyId) => ({ 'custom:companyId': companyId, 'cognito:groups': ['recruiters'] });

async function createTenantSession(client, companyId, runId) {
  const invitation = await handlePostInvitation(event({ method: 'POST', route: 'POST /invitations', body: { email: `${companyId}@example.cl` }, claims: claims(companyId) }), { docClient: client });
  expect(invitation.statusCode).toBe(201);
  const token = JSON.parse(invitation.body).invitationId;
  const session = await handlePostSessions(event({ method: 'POST', route: 'POST /sessions', body: { ...BODY, runId }, headers: { 'x-invitation-id': token } }), { docClient: client });
  expect(session.statusCode).toBe(201);
  return { token, id: JSON.parse(session.body).id };
}

describe('G.5 tenant isolation', () => {
  it('two tenants cannot list, read, delete, or revoke each other resources', async () => {
    const { client } = makeClient();
    const a = await createTenantSession(client, 'company-a', 'run-a');
    const b = await createTenantSession(client, 'company-b', 'run-b');

    const listA = await handleListSessions(event({ method: 'GET', route: 'GET /sessions', claims: claims('company-a'), pathParameters: {} }), { docClient: client });
    const listB = await handleListSessions(event({ method: 'GET', route: 'GET /sessions', claims: claims('company-b'), pathParameters: {} }), { docClient: client });
    expect(JSON.parse(listA.body).candidates.map((x) => x.id)).toEqual(['run-a']);
    expect(JSON.parse(listB.body).candidates.map((x) => x.id)).toEqual(['run-b']);

    expect((await handleGetSession(event({ method: 'GET', route: 'GET /sessions/{id}', pathParameters: { id: b.id }, claims: claims('company-a') }), { docClient: client })).statusCode).toBe(404);
    expect((await handleDeleteSession(event({ method: 'DELETE', route: 'DELETE /sessions/{id}', pathParameters: { id: b.id }, claims: claims('company-a') }), { docClient: client })).statusCode).toBe(404);
    const otherInvitation = await handlePostInvitation(event({ method: 'POST', route: 'POST /invitations', body: { email: 'other-company-b@example.cl' }, claims: claims('company-b') }), { docClient: client });
    const otherToken = JSON.parse(otherInvitation.body).invitationId;
    expect((await handleGetInvitation(event({ method: 'GET', route: 'GET /invitations/{token}', pathParameters: { token: otherToken }, claims: claims('company-a') }), { docClient: client })).statusCode).toBe(200);
    expect((await handleRevokeInvitation(event({ method: 'POST', route: 'POST /invitations/{token}/revoke', pathParameters: { token: otherToken }, claims: claims('company-a') }), { docClient: client })).statusCode).toBe(404);
    expect((await handleDeleteSession(event({ method: 'DELETE', route: 'DELETE /sessions/{id}', pathParameters: { id: b.id }, claims: claims('company-b') }), { docClient: client })).statusCode).toBe(204);
  });

  it('rechaza claim companyId inválido en ruta HR', async () => {
    const { client } = makeClient();
    const response = await handleListSessions(event({ method: 'GET', route: 'GET /sessions', claims: { 'custom:companyId': 'not valid!' } }), { docClient: client });
    expect(response.statusCode).toBe(403);
  });
});
