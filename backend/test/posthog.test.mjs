import { describe, expect, it } from 'vitest';
import { sendPosthogEvent } from '../src/analytics/posthog.mjs';

// F.2 (KRU-118): helper PostHog server-side.
const SILENT_LOG = () => {};

describe('posthog server-side (F.2 — eventos de servicio)', () => {
  it('sin key → no-op seguro (no fetch, reason not_configured)', async () => {
    let called = 0;
    const out = await sendPosthogEvent('invite_received', { language: 'es' }, {
      apiKey: '',
      fetchImpl: async () => { called += 1; return { ok: true, status: 200 }; },
      log: SILENT_LOG,
    });
    expect(out).toMatchObject({ sent: false, reason: 'not_configured' });
    expect(called).toBe(0);
  });

  it('evento válido → POST {host}/capture/ con key, distinct_id de servicio y timestamp', async () => {
    let captured = null;
    const out = await sendPosthogEvent('invite_received', { language: 'es' }, {
      apiKey: 'phc_test',
      fetchImpl: async (url, init) => { captured = { url, init }; return { ok: true, status: 200 }; },
      log: SILENT_LOG,
    });
    expect(out).toMatchObject({ sent: true, status: 200 });
    expect(captured.url).toBe('https://us.posthog.com/capture/');
    expect(captured.init.method).toBe('POST');
    const payload = JSON.parse(captured.init.body);
    expect(payload.api_key).toBe('phc_test');
    expect(payload.event).toBe('invite_received');
    expect(payload.distinct_id).toBe('krumm-backend');
    expect(payload.properties).toEqual({ language: 'es' });
    expect(typeof payload.timestamp).toBe('string');
    // La key solo viaja en el body (nunca en la URL).
    expect(captured.url).not.toContain('phc_test');
  });

  it('scrubber: descarta claves PII/biométricas/tokens (top y nested) y trunca strings a 120', async () => {
    let captured = null;
    await sendPosthogEvent('e', {
      email: 'a@b.cl',
      token: 't-1',
      name: 'x',
      ok: true,
      n: 5,
      nested: { email: 'a@b.cl', level: 2, face: true },
      long: 'a'.repeat(200),
      nullv: null,
      undefv: undefined,
    }, {
      apiKey: 'phc_test',
      fetchImpl: async (url, init) => { captured = { init }; return { ok: true, status: 200 }; },
      log: SILENT_LOG,
    });
    const props = JSON.parse(captured.init.body).properties;
    expect(props).not.toHaveProperty('email');
    expect(props).not.toHaveProperty('token');
    expect(props).not.toHaveProperty('name');
    expect(props).not.toHaveProperty('nullv');
    expect(props).not.toHaveProperty('undefv');
    expect(props.nested).toEqual({ level: 2 });
    expect(props.long).toBe('a'.repeat(120));
    expect(props).toMatchObject({ ok: true, n: 5 });
  });

  it('fetch lanza (PostHog caído) → no propaga: {sent:false, reason:send_error}', async () => {
    const out = await sendPosthogEvent('invite_received', {}, {
      apiKey: 'phc_test',
      fetchImpl: async () => { throw new Error('network down'); },
      log: SILENT_LOG,
    });
    expect(out).toMatchObject({ sent: false, reason: 'send_error' });
  });

  it('fetch no-2xx → sent:false con status', async () => {
    const out = await sendPosthogEvent('invite_received', {}, {
      apiKey: 'phc_test',
      fetchImpl: async () => ({ ok: false, status: 401 }),
      log: SILENT_LOG,
    });
    expect(out).toMatchObject({ sent: false, status: 401 });
  });

  it('evento inválido (vacio/no-string) → invalid_event sin fetch', async () => {
    let called = 0;
    const fetchImpl = async () => { called += 1; return { ok: true, status: 200 }; };
    expect(await sendPosthogEvent('', {}, { apiKey: 'phc_test', fetchImpl, log: SILENT_LOG }))
      .toMatchObject({ sent: false, reason: 'invalid_event' });
    expect(await sendPosthogEvent(null, {}, { apiKey: 'phc_test', fetchImpl, log: SILENT_LOG }))
      .toMatchObject({ sent: false, reason: 'invalid_event' });
    expect(called).toBe(0);
  });

  it('apiHost con slash final → normalizado', async () => {
    let url = null;
    await sendPosthogEvent('e', {}, {
      apiKey: 'phc_test',
      apiHost: 'https://us.posthog.com/',
      fetchImpl: async (u) => { url = u; return { ok: true, status: 200 }; },
      log: SILENT_LOG,
    });
    expect(url).toBe('https://us.posthog.com/capture/');
  });
});
