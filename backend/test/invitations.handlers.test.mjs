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

  it('regresión: consumo single-use con semántica REPLACE (PutItem real de DynamoDB, no merge del mock)', async () => {
    // DynamoDB PutItem reemplaza el item completo; el mock de este archivo hace
    // merge. Este test replica la semántica real para detectar pérdida de campos
    // (p. ej. singleUse) en markInvitationUsed.
    const invitations = new Map();
    const replaceDoc = {
      async put({ TableName, Item }) {
        if (TableName === 'krumm-invitations') invitations.set(Item.invitationId, { ...Item });
        return { Item };
      },
      async get({ TableName, Key }) {
        if (TableName !== 'krumm-invitations') return {};
        const item = invitations.get(Key.invitationId);
        return item ? { Item: item } : {};
      },
      async delete() {
        return {};
      },
      async scan() {
        return { Items: [] };
      },
    };
    const created = await handlePostInvitation(event({ method: 'POST', route: 'POST /invitations', body: { email: 'c@d.cl', ttlHours: 24 } }), { docClient: replaceDoc });
    const token = JSON.parse(created.body).invitationId;
    expect(invitations.get(token).singleUse).toBe(true);

    const consumed = await consumeInvitation({ event: event({ method: 'POST', route: 'POST /sessions', body: {}, headers: { 'x-invitation-id': token } }), docClient: replaceDoc, sessionId: 'run-replace' });
    expect(consumed.invitationId).toBe(token);

    const after = await handleGetInvitation(event({ method: 'GET', route: 'GET /invitations/{token}', pathParameters: { token } }), { docClient: replaceDoc });
    expect(after.statusCode).toBe(410);
    expect(JSON.parse(after.body).error).toBe('invitation_already_used');
  });
});

describe('A.1 — envío de email de invitación (best-effort)', () => {
  function makeDeps({ sendInvitationEmail, appBaseUrl, posthog } = {}) {
    const store = new Map();
    const invitations = new Map();
    const audit = [];
    const docClient = {
      async put({ TableName, Item }) {
        if (TableName === 'krumm-audit-log') {
          const existing = audit.find((a) => a.auditId === Item.auditId);
          if (!existing) audit.push(Item);
        } else if (TableName === 'krumm-invitations') {
          invitations.set(Item.invitationId, { ...(invitations.get(Item.invitationId) ?? {}), ...Item });
        } else {
          store.set(Item.sessionId, Item);
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
      async delete({ Key }) { store.delete(Key.sessionId); return {}; },
      async scan() { return { Items: [] }; },
    };
    const deps = { docClient, audit, invitations };
    if (sendInvitationEmail) deps.sendInvitationEmail = sendInvitationEmail;
    if (appBaseUrl) deps.appBaseUrl = appBaseUrl;
    if (posthog) deps.posthog = posthog;
    return deps;
  }

  it('con sender: 201 + email.sent=true, sender recibe to/token/baseUrl/language/ttl', async () => {
    const calls = [];
    const d = makeDeps({
      appBaseUrl: 'https://stage.krumm.cl',
      sendInvitationEmail: async (args) => { calls.push(args); return { messageId: 'm-1' }; },
    });
    const res = await handlePostInvitation(event({ method: 'POST', route: 'POST /invitations', body: { email: 'cand@correo.cl', ttlHours: 48 } }), d);
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.email).toMatchObject({ sent: true, language: 'es', messageId: 'm-1' });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      to: 'cand@correo.cl',
      appBaseUrl: 'https://stage.krumm.cl',
      language: 'es',
      expiresInHours: 48,
    });
    expect(calls[0].token).toBe(body.invitationId);
  });

  it('language: en se respeta en el sender y en la respuesta', async () => {
    const calls = [];
    const d = makeDeps({
      appBaseUrl: 'https://krumm.cl',
      sendInvitationEmail: async (args) => { calls.push(args); return {}; },
    });
    const res = await handlePostInvitation(event({ method: 'POST', route: 'POST /invitations', body: { email: 'c@d.cl', language: 'en' } }), d);
    expect(JSON.parse(res.body).email).toMatchObject({ sent: true, language: 'en' });
    expect(calls[0].language).toBe('en');
  });

  it('sender falla: 201 igual, email.sent=false reason=send_failed + auditoría invitation.email_failed', async () => {
    const d = makeDeps({
      appBaseUrl: 'https://krumm.cl',
      sendInvitationEmail: async () => { const e = new Error('boom'); e.code = 'DomainNotVerified'; throw e; },
    });
    const res = await handlePostInvitation(event({ method: 'POST', route: 'POST /invitations', body: { email: 'c@d.cl' } }), d);
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.email).toMatchObject({ sent: false, reason: 'send_failed', code: 'DomainNotVerified' });
    const failed = d.audit.find((a) => a.action === 'invitation.email_failed');
    expect(failed).toBeTruthy();
    expect(failed.detail.invitationId).toBe(body.invitationId);
    expect(failed.detail.code).toBe('DomainNotVerified');
    // la auditoría NO debe contener el email completo (solo code + invitationId).
    expect(JSON.stringify(failed)).not.toContain('c@d.cl');
  });

  it('sin sender configurado: 201 + email {sent:false, reason: not_configured}', async () => {
    const d = makeDeps({ appBaseUrl: 'https://krumm.cl' });
    const res = await handlePostInvitation(event({ method: 'POST', route: 'POST /invitations', body: { email: 'c@d.cl' } }), d);
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body).email).toMatchObject({ sent: false, reason: 'not_configured' });
  });

  // ── F.2 (KRU-118): evento invite_received (PostHog server-side, best-effort) ──
  it('F.2: email enviado → invite_received a /capture/ con idioma, distinct_id de servicio y SIN PII', async () => {
    const phCalls = [];
    const d = makeDeps({
      appBaseUrl: 'https://stage.krumm.cl',
      sendInvitationEmail: async () => ({ messageId: 'm-ph' }),
      posthog: {
        apiKey: 'phc_test',
        apiHost: 'https://us.posthog.com',
        fetchImpl: async (url, init) => { phCalls.push({ url, init }); return { ok: true, status: 200 }; },
        log: () => {},
      },
    });
    const res = await handlePostInvitation(event({ method: 'POST', route: 'POST /invitations', body: { email: 'cand@correo.cl', ttlHours: 24, language: 'en' } }), d);
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body).email).toMatchObject({ sent: true });
    expect(phCalls).toHaveLength(1);
    expect(phCalls[0].url).toBe('https://us.posthog.com/capture/');
    const payload = JSON.parse(phCalls[0].init.body);
    expect(payload.event).toBe('invite_received');
    expect(payload.distinct_id).toBe('krumm-backend');
    expect(payload.api_key).toBe('phc_test');
    expect(payload.properties).toEqual({ language: 'en' });
    expect(typeof payload.timestamp).toBe('string');
    // Sin PII: el email del candidato no viaja a PostHog ni en la URL.
    expect(phCalls[0].init.body).not.toContain('cand@correo.cl');
    expect(phCalls[0].url).not.toContain('cand@correo.cl');
  });

  it('F.2: email NO enviado (not_configured / send_failed) → sin evento PostHog', async () => {
    let calls = 0;
    const spy = {
      apiKey: 'phc_test',
      fetchImpl: async () => { calls += 1; return { ok: true, status: 200 }; },
      log: () => {},
    };
    // 1) sin sender
    const d1 = makeDeps({ appBaseUrl: 'https://krumm.cl', posthog: spy });
    await handlePostInvitation(event({ method: 'POST', route: 'POST /invitations', body: { email: 'a@b.cl' } }), d1);
    // 2) sender falla
    const d2 = makeDeps({
      appBaseUrl: 'https://krumm.cl',
      posthog: spy,
      sendInvitationEmail: async () => { const e = new Error('boom'); e.code = 'DomainNotVerified'; throw e; },
    });
    await handlePostInvitation(event({ method: 'POST', route: 'POST /invitations', body: { email: 'c@d.cl' } }), d2);
    expect(calls).toBe(0);
  });

  it('F.2: PostHog caído → la creación sigue 201 (best-effort no bloquea)', async () => {
    const d = makeDeps({
      appBaseUrl: 'https://krumm.cl',
      sendInvitationEmail: async () => ({ messageId: 'm-1' }),
      posthog: {
        apiKey: 'phc_test',
        fetchImpl: async () => { throw new Error('network down'); },
        log: () => {},
      },
    });
    const res = await handlePostInvitation(event({ method: 'POST', route: 'POST /invitations', body: { email: 'c@d.cl' } }), d);
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body).email).toMatchObject({ sent: true });
  });
});