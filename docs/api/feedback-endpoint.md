# Feedback API Endpoint (Backend)

**Endpoint:** `POST /api/feedback`
**Autenticación:** Ninguna (público, rate-limited 10 req/min/IP)
**Destino:** Discord webhook `DISCORD_ALERTS_WEBHOOK_URL` + opcional Linear

---

## Request

```json
{
  "type": "bug|suggestion|general",
  "severity": "critical|high|medium|low|none",
  "message": "string (max 2000 chars)",
  "context": {
    "url": "string",
    "pathname": "string",
    "battery": "stable_dg|original_games|unknown",
    "gameId": "string",
    "userAgent": "string",
    "viewport": "string",
    "locale": "es|en",
    "tenant": "string",
    "timestamp": "ISO8601"
  },
  "source": "feedback-widget",
  "version": "string"
}
```

---

## Response

**200 OK**
```json
{ "success": true, "id": "fbk_abc123" }
```

**429 Too Many Requests**
```json
{ "error": "rate_limited", "retryAfter": 60 }
```

**400 Bad Request**
```json
{ "error": "invalid_payload", "violations": ["message: required", "type: enum"] }
```

---

## Implementación (Lambda Node 20)

```javascript
// backend/src/handlers/feedback.mjs
import { createFeedback } from '../db/feedbackRepository.mjs';

const RATE_LIMIT = 10; // req/min/IP
const WINDOW_MS = 60_000;
const ipBucket = new Map(); // en producción: Redis o DynamoDB TTL

function rateLimit(ip) {
  const now = Date.now();
  const bucket = ipBucket.get(ip) || { count: 0, windowStart: now };
  if (now - bucket.windowStart > WINDOW_MS) {
    bucket.count = 0;
    bucket.windowStart = now;
  }
  bucket.count++;
  ipBucket.set(ip, bucket);
  return bucket.count <= RATE_LIMIT;
}

export async function handleFeedback(event) {
  const ip = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  if (!rateLimit(ip)) {
    return { statusCode: 429, body: JSON.stringify({ error: 'rate_limited', retryAfter: 60 }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'invalid_json' }) };
  }

  const { type, severity, message, context, source, version } = body;
  const violations = [];

  if (!['bug', 'suggestion', 'general'].includes(type)) violations.push('type: enum');
  if (type === 'bug' && !['critical', 'high', 'medium', 'low'].includes(severity)) violations.push('severity: enum');
  if (!message || typeof message !== 'string' || message.trim().length === 0) violations.push('message: required');
  if (message && message.length > 2000) violations.push('message: max 2000 chars');
  if (!context || typeof context !== 'object') violations.push('context: required');

  if (violations.length > 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'invalid_payload', violations }) };
  }

  try {
    const feedbackId = await createFeedback({
      type,
      severity: type === 'bug' ? severity : 'none',
      message: message.trim(),
      context,
      source: source || 'feedback-widget',
      version: version || 'unknown',
      ipHash: hashIP(ip), // no almacenar IP cruda
    });

    // Async: enviar a Discord webhook (no bloquear respuesta)
    sendToDiscord(feedbackId, { type, severity, message, context }).catch(console.error);
    // Async: crear issue Linear si severity >= high
    if (['critical', 'high'].includes(severity)) {
      createLinearIssue(feedbackId, { type, severity, message, context }).catch(console.error);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, id: feedbackId }),
    };
  } catch (err) {
    console.error('Feedback error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'internal_error' }) };
  }
}

function hashIP(ip) {
  // Simple hash para no almacenar IP cruda
  let hash = 0;
  for (let i = 0; i < ip.length; i++) hash = ((hash << 5) - hash) + ip.charCodeAt(i);
  return `ip_${Math.abs(hash).toString(36)}`;
}

async function sendToDiscord(id, data) {
  const webhookUrl = process.env.DISCORD_ALERTS_WEBHOOK_URL;
  if (!webhookUrl) return;
  
  const embed = {
    title: `📝 Feedback: ${data.type.toUpperCase()} (${data.severity})`,
    description: data.message,
    color: data.severity === 'critical' ? 0xff0000 : data.severity === 'high' ? 0xff8800 : 0x3498db,
    fields: [
      { name: 'URL', value: data.context.url, inline: false },
      { name: 'Battery', value: data.context.battery, inline: true },
      { name: 'Game', value: data.context.gameId, inline: true },
      { name: 'Viewport', value: data.context.viewport, inline: true },
      { name: 'Locale', value: data.context.locale, inline: true },
      { name: 'Tenant', value: data.context.tenant, inline: true },
      { name: 'UA', value: data.context.userAgent.slice(0, 100), inline: false },
    ],
    footer: { text: `ID: ${id} | v${data.version}` },
    timestamp: data.context.timestamp,
  };

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
    body: JSON.stringify({ embeds: [embed] }),
  });
}

async function createLinearIssue(feedbackId, data) {
  // Opcional: solo si LINEAR_API_KEY configurado
  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) return;
  
  const teamId = '0c481879-11c7-4bcf-8a03-1b6da086c5a3'; // KRU
  const title = `[Feedback] ${data.type}: ${data.message.slice(0, 80)}`;
  const description = `**Feedback ID:** ${feedbackId}\n**Severity:** ${data.severity}\n**Context:**\n\`\`\`json\n${JSON.stringify(data.context, null, 2)}\n\`\`\``;

  await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: { 'Authorization': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `mutation($input: IssueCreateInput!) { issueCreate(input: $input) { success issue { id identifier url } } }`,
      variables: { input: { teamId, title, description, priority: data.severity === 'critical' ? 1 : 2 } }
    }),
  });
}
```

---

## DynamoDB Table: `krumm-feedback`

| Atributo | Tipo | Descripción |
|----------|------|-------------|
| `feedbackId` (PK) | String | `fbk_<uuid>` |
| `type` | String | bug/suggestion/general |
| `severity` | String | critical/high/medium/low/none |
| `message` | String | Texto usuario |
| `context` | Map | Objeto contexto completo |
| `source` | String | feedback-widget |
| `version` | String | App version |
| `ipHash` | String | Hash IP (no PII) |
| `createdAt` | Number | Unix timestamp |
| `discordSent` | Boolean | Confirmación envío |
| `linearIssueId` | String | Opcional |

**TTL:** 90 días (auto-purga)

---

## Rate Limiting en API Gateway

Usage Plan: 10 req/min/IP, burst 20.
API Key requerida (generada en SAM, inyectada en frontend via `VITE_API_KEY`).