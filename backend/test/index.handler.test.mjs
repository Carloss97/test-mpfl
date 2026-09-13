import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { handler } from '../src/index.mjs';

// A.1 (KRU-112): el link del email de invitación depende del stage de entrada.
// KRU-97: /staging y /prod comparten la misma Lambda y tablas, así que la base
// del link se resuelve por event.requestContext.stage en el entrypoint.

const BASE_STAGING = 'https://stage.krumm.cl';
const BASE_PROD = 'https://krumm.cl';

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

function makeInvitationEvent(stage) {
  return {
    routeKey: 'POST /invitations',
    requestContext: { http: { method: 'POST' }, stage },
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
