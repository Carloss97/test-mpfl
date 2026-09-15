import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { handler } from '../src/index.mjs';

// Vitest v4 transforms import.meta.url to a non-file URL under the root runner.
// Resolve from the two supported runner working directories instead.
const repositoryRoot = basename(process.cwd()) === 'backend' ? resolve(process.cwd(), '..') : process.cwd();
const samTemplatePath = resolve(repositoryRoot, 'infra/m2-backend-stack.yaml');

const VALID_BODY = {
  name: 'Ada Lovelace',
  workEmail: 'ada@analytical.example',
  company: 'Analytical Engines Ltd',
  role: 'Engineering Lead',
  teamSize: '11-50',
  useCase: 'Structured talent assessment for engineering hiring.',
  contactConsent: true,
};

function event(body = VALID_BODY, {
  ip = '203.0.113.10', rawBody, headers, isBase64Encoded = false,
} = {}) {
  return {
    routeKey: 'POST /demo-requests',
    requestContext: { http: { method: 'POST' }, stage: 'staging', ip },
    ...(headers === undefined ? {} : { headers }),
    body: rawBody ?? JSON.stringify(body),
    isBase64Encoded,
  };
}

function makeDocClient() {
  const demoRequests = new Map();
  const audit = [];
  const rate = new Map();
  const conditionalFailure = Object.assign(new Error('conditional'), { name: 'ConditionalCheckFailedException' });
  return {
    demoRequests,
    audit,
    client: {
      async put({ TableName, Item, ConditionExpression }) {
        if (TableName === 'krumm-rate-limit-test') {
          if (rate.has(Item.key)) throw conditionalFailure;
          rate.set(Item.key, { ...Item });
          return {};
        }
        if (TableName === 'krumm-demo-requests') demoRequests.set(Item.requestId, { ...Item });
        if (TableName === 'krumm-audit-log') audit.push({ ...Item });
        return {};
      },
      async update({ TableName, Key }) {
        if (TableName !== 'krumm-rate-limit-test') throw new Error('unexpected update');
        const current = rate.get(Key.key);
        if (!current || current.count >= 5) throw conditionalFailure;
        current.count += 1;
        return { Attributes: { count: current.count } };
      },
      async get() { return {}; },
      async delete() { return {}; },
      async scan() { throw new Error('demo requests must not scan'); },
    },
  };
}

function context(store, overrides = {}) {
  return {
    docClient: store.client,
    demoRequestsTable: 'krumm-demo-requests',
    rateLimitTable: 'krumm-rate-limit-test',
    rateLimitIpSalt: 'test-only-rate-limit-salt-with-at-least-thirty-two-characters',
    demoNotificationTo: 'ops@example.test',
    sendDemoRequestNotification: async () => ({ messageId: 'ses-message' }),
    ...overrides,
  };
}

describe('POST /demo-requests', () => {
  it('persists only the allowlisted request and returns 201', async () => {
    const store = makeDocClient();
    const res = await handler(event(), context(store));

    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body)).toMatchObject({ status: 'received' });
    expect(JSON.parse(res.body)).not.toHaveProperty('workEmail');
    expect(store.demoRequests.size).toBe(1);
    const [saved] = store.demoRequests.values();
    expect(saved).toMatchObject(VALID_BODY);
    expect(saved.requestId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(saved).toHaveProperty('createdAt');
    expect(saved).toHaveProperty('expiresAt');
    expect(saved).not.toHaveProperty('ip');
    expect(saved).not.toHaveProperty('query');
    expect(saved).not.toHaveProperty('token');
    expect(saved).not.toHaveProperty('cv');
    expect(saved).not.toHaveProperty('candidate');
    expect(store.audit).toHaveLength(1);
    expect(JSON.stringify(store.audit)).not.toContain(VALID_BODY.workEmail);
    expect(JSON.stringify(store.audit)).not.toContain(VALID_BODY.name);
  });

  it.each([
    ['invalid email', { ...VALID_BODY, workEmail: 'not-an-email' }],
    ['absent consent', { ...VALID_BODY, contactConsent: false }],
    ['unknown field', { ...VALID_BODY, unexpected: 'candidate CV' }],
  ])('returns 422 for %s and persists nothing', async (_label, body) => {
    const store = makeDocClient();
    const res = await handler(event(body), context(store));
    expect(res.statusCode).toBe(422);
    expect(store.demoRequests.size).toBe(0);
  });

  it('returns 400 for invalid JSON and oversized bodies without persistence', async () => {
    const invalid = makeDocClient();
    expect((await handler(event(VALID_BODY, { rawBody: '{' }), context(invalid))).statusCode).toBe(400);
    const oversized = makeDocClient();
    expect((await handler(event(VALID_BODY, { rawBody: 'x'.repeat(8193) }), context(oversized))).statusCode).toBe(400);
    expect(oversized.demoRequests.size).toBe(0);
  });

  it('keeps the request when SES notification fails and does not reveal SES details', async () => {
    const store = makeDocClient();
    const res = await handler(event(), context(store, {
      sendDemoRequestNotification: async () => { throw Object.assign(new Error('SES secret diagnostic'), { code: 'MessageRejected' }); },
    }));
    expect(res.statusCode).toBe(201);
    expect(res.body).not.toContain('SES');
    expect(res.body).not.toContain('MessageRejected');
    expect(store.demoRequests.size).toBe(1);
    expect(JSON.stringify(store.audit)).not.toContain(VALID_BODY.workEmail);
  });

  it('rate limits the sixth request per IP/minute before persistence', async () => {
    const store = makeDocClient();
    for (let i = 0; i < 5; i += 1) expect((await handler(event(), context(store))).statusCode).toBe(201);
    const limited = await handler(event(), context(store));
    expect(limited.statusCode).toBe(429);
    expect(JSON.parse(limited.body)).toMatchObject({ error: 'rate_limited' });
    expect(store.demoRequests.size).toBe(5);
  });

  it('requires a non-whitespace 32-character demo salt in the SAM template', async () => {
    const template = await readFile(samTemplatePath, 'utf8');
    const saltParameter = template.slice(template.indexOf('  DemoRateLimitIpSalt:'), template.indexOf('  CognitoPoolId:'));
    expect(saltParameter).toContain('MinLength: 32');
    expect(saltParameter).toContain("AllowedPattern: '^\\S+$'");
  });

  it.each([undefined, '', 'short-salt', ' '.repeat(32)])('fails closed without a valid configured rate-limit salt', async (rateLimitIpSalt) => {
    const store = makeDocClient();
    const res = await handler(event(), context(store, { rateLimitIpSalt }));

    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body)).toEqual({ error: 'internal_error' });
    expect(store.demoRequests.size).toBe(0);
  });

  it('never exposes AWS error names or codes in a public 500 response', async () => {
    const persistenceFailure = Object.assign(new Error('Dynamo diagnostic'), { name: 'ProvisionedThroughputExceededException', code: 'ThrottlingException' });
    const res = await handler(event(), {
      docClient: { put: async () => { throw persistenceFailure; } },
      demoRequestsTable: 'krumm-demo-requests',
      rateLimitTable: null,
      rateLimitIpSalt: 'test-only-rate-limit-salt-with-at-least-thirty-two-characters',
    });

    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body)).toEqual({ error: 'internal_error' });
    expect(res.body).not.toContain('ProvisionedThroughputExceededException');
    expect(res.body).not.toContain('ThrottlingException');
  });

  it('accepts an absent or JSON Content-Type and rejects another supplied media type', async () => {
    for (const headers of [undefined, { 'Content-Type': 'application/json; charset=utf-8' }]) {
      const store = makeDocClient();
      expect((await handler(event(VALID_BODY, { headers }), context(store))).statusCode).toBe(201);
      expect(store.demoRequests.size).toBe(1);
    }

    const store = makeDocClient();
    const res = await handler(event(VALID_BODY, { headers: { 'content-type': 'text/plain' } }), context(store));
    expect(res.statusCode).toBe(415);
    expect(JSON.parse(res.body)).toEqual({ error: 'unsupported_media_type' });
    expect(store.demoRequests.size).toBe(0);
  });

  it('rejects a base64 event whose decoded request bytes exceed 8,192 before JSON decoding', async () => {
    const store = makeDocClient();
    const raw = `${JSON.stringify(VALID_BODY)}${' '.repeat(8193 - Buffer.byteLength(JSON.stringify(VALID_BODY), 'utf8'))}`;
    const res = await handler(event(VALID_BODY, {
      rawBody: Buffer.from(raw, 'utf8').toString('base64'),
      isBase64Encoded: true,
    }), context(store));

    expect(Buffer.byteLength(raw, 'utf8')).toBe(8193);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toEqual({ error: 'payload_too_large' });
    expect(store.demoRequests.size).toBe(0);
  });
});
