// G.3 (KRU-138): rate limit per-IP (10 req/min) en invitations+sessions.
// Unit (checkRateLimit) + integración (handler → 429 en la 11ª llamada).
import { describe, it, expect } from 'vitest';
import { handler } from '../src/index.mjs';
import {
  checkRateLimit,
  clientIpFromEvent,
  rateBucketForRoute,
  RATE_LIMIT,
} from '../src/rateLimit.mjs';

const condFail = { name: 'ConditionalCheckFailedException' };

// Mock de la tabla rate-limit (put condicional create + update condicional inc).
function makeRateClient() {
  const store = new Map();
  return {
    store,
    async put({ Item, ConditionExpression }) {
      if (ConditionExpression === 'attribute_not_exists(#k)' && store.has(Item.key)) throw condFail;
      store.set(Item.key, { ...Item });
      return {};
    },
    async update({ Key, ConditionExpression }) {
      const it = store.get(Key.key);
      if (!it) throw condFail;
      if (/#c < :limit/.test(ConditionExpression || '') && it.count >= RATE_LIMIT) throw condFail;
      it.count += 1;
      return {};
    },
  };
}

// Mock unificado para el handler: invitations+audit (como index.handler.test)
// + tabla rate-limit, dispatch por TableName.
function makeUnifiedClient() {
  const invitations = new Map();
  const audit = [];
  const rate = new Map();
  return {
    invitations,
    audit,
    rate,
    client: {
      async put({ TableName, Item, ConditionExpression }) {
        if (TableName === 'krumm-rate-limit-test') {
          if (ConditionExpression === 'attribute_not_exists(#k)' && rate.has(Item.key)) throw condFail;
          rate.set(Item.key, { ...Item });
          return { Item };
        }
        if (TableName === 'krumm-audit-log' && !audit.some((a) => a.auditId === Item.auditId)) audit.push(Item);
        if (TableName === 'krumm-invitations') invitations.set(Item.invitationId, { ...invitations.get(Item.invitationId), ...Item });
        return { Item };
      },
      async update({ TableName, Key, ConditionExpression }) {
        if (TableName !== 'krumm-rate-limit-test') throw new Error('unexpected update ' + TableName);
        const it = rate.get(Key.key);
        if (!it) throw condFail;
        if (it.count >= RATE_LIMIT) throw condFail;
        it.count += 1;
        return {};
      },
      async get({ TableName, Key }) {
        if (TableName === 'krumm-invitations') { const item = invitations.get(Key.invitationId); return item ? { Item: item } : {}; }
        return {};
      },
      async delete() { return {}; },
      async scan() { return { Items: [] }; },
    },
  };
}

const POST_INV = {
  routeKey: 'POST /invitations',
  resource: '/staging/invitations',
  requestContext: {
    http: { method: 'POST' },
    stage: 'staging',
    ip: '1.2.3.4',
    identity: { ip: '1.2.3.4' },
    authorizer: { claims: { 'cognito:groups': ['admins', 'recruiters'], sub: 'test-recruiter' } },
  },
  body: JSON.stringify({ email: 'cand@correo.cl', ttlHours: 24 }),
};

describe('G.3 rate limit — checkRateLimit (unit)', () => {
  it('permite las primeras 10 y bloquea la 11ª (misma IP, bucket, minuto)', async () => {
    const c = makeRateClient();
    const args = { docClient: c, table: 't', ip: '1.1.1.1', bucket: 'invitations', now: () => 1700000000000 };
    for (let i = 1; i <= 10; i++) expect((await checkRateLimit(args)).allowed).toBe(true);
    const r11 = await checkRateLimit(args);
    expect(r11.allowed).toBe(false);
    expect(r11.retryAfter).toBeGreaterThan(0);
    expect(r11.retryAfter).toBeLessThanOrEqual(60);
  });

  it('IPs distintas son independientes', async () => {
    const c = makeRateClient();
    const base = { docClient: c, table: 't', bucket: 'sessions', now: () => 1700000000000 };
    for (let i = 1; i <= 10; i++) await checkRateLimit({ ...base, ip: '1.1.1.1' });
    expect((await checkRateLimit({ ...base, ip: '1.1.1.1' })).allowed).toBe(false);
    expect((await checkRateLimit({ ...base, ip: '2.2.2.2' })).allowed).toBe(true);
  });

  it('buckets distintos (invitations vs sessions) son independientes', async () => {
    const c = makeRateClient();
    const base = { docClient: c, table: 't', ip: '1.1.1.1', now: () => 1700000000000 };
    for (let i = 1; i <= 10; i++) await checkRateLimit({ ...base, bucket: 'invitations' });
    expect((await checkRateLimit({ ...base, bucket: 'invitations' })).allowed).toBe(false);
    expect((await checkRateLimit({ ...base, bucket: 'sessions' })).allowed).toBe(true);
  });

  it('minuto nuevo → contador nuevo (now +61s)', async () => {
    const c = makeRateClient();
    const base = { docClient: c, table: 't', ip: '1.1.1.1', bucket: 'sessions' };
    for (let i = 1; i <= 10; i++) await checkRateLimit({ ...base, now: () => 1700000000000 });
    expect((await checkRateLimit({ ...base, now: () => 1700000000000 })).allowed).toBe(false);
    expect((await checkRateLimit({ ...base, now: () => 1700000061000 })).allowed).toBe(true);
  });

  it('sin tabla / sin IP / sin bucket → no-op permitido', async () => {
    expect((await checkRateLimit({ docClient: null, table: 't', ip: '1.1.1.1', bucket: 'sessions' })).allowed).toBe(true);
    expect((await checkRateLimit({ docClient: makeRateClient(), table: null, ip: '1.1.1.1', bucket: 'sessions' })).allowed).toBe(true);
    expect((await checkRateLimit({ docClient: makeRateClient(), table: 't', ip: null, bucket: 'sessions' })).allowed).toBe(true);
    expect((await checkRateLimit({ docClient: makeRateClient(), table: 't', ip: '1.1.1.1', bucket: null })).allowed).toBe(true);
  });
});

describe('G.3 rate limit — helpers', () => {
  it('rateBucketForRoute: invitations/sessions/null', () => {
    expect(rateBucketForRoute('POST /invitations')).toBe('invitations');
    expect(rateBucketForRoute('/staging/invitations/tok/revoke')).toBe('invitations');
    expect(rateBucketForRoute('GET /sessions')).toBe('sessions');
    expect(rateBucketForRoute('GET /sessions/abc')).toBe('sessions');
    expect(rateBucketForRoute('GET /other')).toBeNull();
  });

  it('clientIpFromEvent: payload 2.0 (requestContext.ip), 1.0 (identity.ip/sourceIp)', () => {
    expect(clientIpFromEvent({ requestContext: { ip: '9.9.9.9' } })).toBe('9.9.9.9');
    expect(clientIpFromEvent({ requestContext: { identity: { ip: '8.8.8.8' } } })).toBe('8.8.8.8');
    expect(clientIpFromEvent({ requestContext: { identity: { sourceIp: '7.7.7.7' } } })).toBe('7.7.7.7');
    expect(clientIpFromEvent({})).toBeNull();
  });
});

describe('G.3 rate limit — handler (integración)', () => {
  it('11ª POST /invitations del minuto (misma IP) → 429 rate_limited + retry-after', async () => {
    const m = makeUnifiedClient();
    const ctx = {
      docClient: m.client,
      rateLimitTable: 'krumm-rate-limit-test',
      sendInvitationEmail: async () => ({ messageId: 'm-rate' }),
      appBaseUrl: 'https://stage.krumm.cl',
    };
    let res;
    for (let i = 1; i <= 10; i++) {
      res = await handler(POST_INV, ctx);
      expect(res.statusCode).toBe(201);
    }
    res = await handler(POST_INV, ctx);
    expect(res.statusCode).toBe(429);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('rate_limited');
    expect(res.headers['retry-after']).toMatch(/^\d+$/);
  });

  it('sin rateLimitTable (no-op) → 11 llamadas OK (compatibilidad tests previos)', async () => {
    const m = makeUnifiedClient();
    const ctx = {
      docClient: m.client,
      sendInvitationEmail: async () => ({ messageId: 'm-norate' }),
      appBaseUrl: 'https://stage.krumm.cl',
    };
    for (let i = 1; i <= 11; i++) {
      const res = await handler(POST_INV, ctx);
      expect(res.statusCode).toBe(201);
    }
  });
});
