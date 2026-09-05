import { describe, expect, it, beforeEach } from 'vitest';
import {
  handlePostInvitation,
  handleGetInvitation,
  handleRevokeInvitation,
  routeInvitations,
} from '../src/handlers/invitations.mjs';
import { consumeInvitation } from '../src/handlers/sessions.mjs';
import {
  nowSeconds,
} from '../src/db/invitationsRepository.mjs';

function makeDocClient() {
  const store = new Map(); // sessions
  const invitations = new Map();
  const audit = [];
  return {
    store,
    invitations,
    audit,
    client: {
      async put({ TableName, Item }) {
        if (TableName === 'krumm-audit-log') auction(audit, Item);
        else if (TableName === 'krumm-sessions') store.set(Item.sessionId, Item);
        else if (TableName === 'krumm-invitations') invitations.set(Item.invitationId, { ...(invitations.get(Item.invitationId) ?? {}), ...Item });
        return { Item };
      },
      async get({ TableName, Key }) {
        if (TableName === 'krumm-sessions') {
          const item = store.get(Key.sessionId);
          return item ? { Item: item } : {};
        }
        if (TableName === 'krumm-invitations') {
          const item = invitations.get(Key.invitationId);
          return item ? { Item: item } : {};
        }
        return {};
      },
      async delete({ Key }) {
        store.delete(Key.sessionId);
        return {};
      },
    },
  };
}

function auction(audit, item) {
  const existing = audit.find((a) => a.auditId === item.auditId);
  if (!existing) audit.push(item);
}

function event({ method, route, pathParameters, body, headers }) {
  return {
    requestContext: { http: { method } },
    routeKey: route,
    pathParameters,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  };
}

describe('backend invitations (RED -> GREEN)', () => {
  let deps;
  beforeEach(() => {
    const m = makeDocClient();
    deps = { docClient: m.client, audit: m.audit, invitations: m.invitations };
  });

  it('POST /invitations crea token único y vigente -> 201', async () => {
    const res = await handlePostInvitation(event({ method: 'POST', route: 'POST /invitations', body: { email: 'candidato@correo.cl', ttlHours: 24 } }), deps);
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('pending');
    expect(typeof body.invitationId).toBe('string');
    expect(body.invitationId.length).toBeGreaterThan(8);
    expect(body.maskedEmail).toContain('@correo.cl'); // email enmascarado, no completo
  });

  it('tokens son únicos entre invitaciones', async () => {
    await handlePostInvitation(event({ method: 'POST', route: 'POST /invitations', body: { email: 'a@b.cl' } }), deps);
    await handlePostInvitation(event({ method: 'POST', route: 'POST /invitations', body: { email: 'c@d.cl' } }), deps);
    const ids = [...deps.invitations.keys()];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('POST rechaza email inválido -> 422', async () => {
    const res = await handlePostInvitation(event({ method: 'POST', route: 'POST /invitations', body: { email: 'no-es-email' } }), deps);
    expect(res.statusCode).toBe(422);
    expect(JSON.parse(res.body).violations).toContain('email');
  });

  it('GET /invitations/{token} devuelve valid si pendiente y vigente', async () => {
    const created = await handlePostInvitation(event({ method: 'POST', route: 'POST /invitations', body: { email: 'c@d.cl', ttlHours: 24 } }), deps);
    const token = JSON.parse(created.body).invitationId;
    const res = await handleGetInvitation(event({ method: 'GET', route: 'GET /invitations/{token}', pathParameters: { token } }), deps);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).status).toBe('valid');
  });

  it('GET devuelve 404 para token inexistente', async () => {
    const res = await handleGetInvitation(event({ method: 'GET', route: 'GET /invitations/{token}', pathParameters: { token: 'no-existe' } }), deps);
    expect(res.statusCode).toBe(404);
  });

  it('GET devuelve 410 para invitación revocada', async () => {
    const token = 'tok-revoke-123';
    deps.invitations.set(token, { invitationId: token, email: 'x@y.cl', expiresAt: nowSeconds() + 100000, status: 'pending', singleUse: true });
    await handleRevokeInvitation(event({ method: 'POST', route: 'POST /invitations/{token}/revoke', pathParameters: { token } }), deps);
    const res = await handleGetInvitation(event({ method: 'GET', route: 'GET /invitations/{token}', pathParameters: { token } }), deps);
    expect(res.statusCode).toBe(410);
    expect(JSON.parse(res.body).error).toBe('invitation_revoked');
  });

  it('GET devuelve 410 para invitación expirada (reloj server, no cliente)', async () => {
    const token = 'tok-expired-1';
    deps.invitations.set(token, { invitationId: token, email: 'x@y.cl', expiresAt: nowSeconds() - 10, status: 'pending', singleUse: true });
    const res = await handleGetInvitation(event({ method: 'GET', route: 'GET /invitations/{token}', pathParameters: { token } }), deps);
    expect(res.statusCode).toBe(410);
    expect(JSON.parse(res.body).error).toBe('invitation_expired');
  });

  it('consumo single-use: POST /sessions con token válido liga la sesión y luego GET -> 410 used', async () => {
    const created = await handlePostInvitation(event({ method: 'POST', route: 'POST /invitations', body: { email: 'c@d.cl', ttlHours: 24 } }), deps);
    const token = JSON.parse(created.body).invitationId;
    const session = {
      schemaVersion: 'krumm_final_assessment_payload_v1',
      runId: 'run-inv-001',
      batteryId: 'krumm_unified_battery_v1',
      generatedAt: '2026-09-03T00:00:00.000Z',
      participant: { aliasHash: 'h-x', declaredRoleTarget: 'Analista' },
      governance: { humanReviewOnly: true, noAutomatedDecision: true, observationalOnly: true, privacySafe: true },
      talentProfile: { schemaVersion: 'krumm_talent_profile_v1', dimensions: {}, globalSummary: {}, governance: { humanReviewOnly: true, noAutomatedDecision: true, observationalOnly: true } },
    };
    const ev = event({ method: 'POST', route: 'POST /sessions', body: session, headers: { 'x-invitation-id': token } });
    const res = await consumeInvitation({ event: ev, docClient: deps.docClient, sessionId: session.runId });
    expect(res.invitationId).toBe(token);

    const after = await handleGetInvitation(event({ method: 'GET', route: 'GET /invitations/{token}', pathParameters: { token } }), deps);
    expect(after.statusCode).toBe(410);
    expect(JSON.parse(after.body).error).toBe('invitation_already_used');
  });

  it('consumeInvitation rechaza token inválido/vacío', async () => {
    const ev = event({ method: 'POST', route: 'POST /sessions', body: {}, headers: { 'x-invitation-id': 'token-desconocido' } });
    const res = await consumeInvitation({ event: ev, docClient: deps.docClient, sessionId: 'run-x' });
    expect(res.error).toBe(404);
  });

  it('routeInvitations despacha creación/validación por método', async () => {
    const created = await routeInvitations(event({ method: 'POST', route: 'POST /invitations', body: { email: 'c@d.cl' } }), deps);
    expect(created.statusCode).toBe(201);
    const bad = await routeInvitations(event({ method: 'GET', route: 'POST /invitations' }), deps);
    expect(bad.statusCode).toBe(405);
  });
});