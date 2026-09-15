# Public demo requests API

## `POST /demo-requests`

Unauthenticated public endpoint for a person who explicitly asks KRUMM to contact them about a product demo. It has no read, list, scan, update, or delete API.

### Request

`Content-Type: application/json` is required when the header is supplied; `application/json; charset=utf-8` is accepted. To preserve the existing API Gateway convention, a missing `Content-Type` header is accepted and the body is still parsed as JSON. Any other supplied media type receives `415`.

The maximum HTTP request body is **8,192 bytes**, measured from the original request bytes before JSON parsing. For API Gateway events with `isBase64Encoded: true`, the function measures the decoded request-byte length before decoding JSON, not the longer base64 transport text. The object must contain exactly these fields and no others:

```json
{
  "name": "Ada Lovelace",
  "workEmail": "ada@company.example",
  "company": "Analytical Engines Ltd",
  "role": "Engineering Lead",
  "teamSize": "11-50",
  "useCase": "Structured talent assessment for engineering hiring.",
  "contactConsent": true
}
```

All fields except `contactConsent` are required non-empty strings. `workEmail` must have a valid email shape. `contactConsent` must be the boolean `true`; a missing or false value is rejected. Unknown keys (including CV, candidate, token, URL/query, or analytics fields) are rejected rather than discarded.

### Responses

- `201` — `{ "requestId": "UUID", "status": "received" }`. The response deliberately does not echo submitted contact data or internal notification state.
- `400` — malformed JSON, non-object body, or body larger than 8,192 bytes.
- `415` — a supplied `Content-Type` other than `application/json` (optional parameters such as `charset=utf-8` are accepted).
- `422` — schema, allowlist, email, string length, or consent validation failure.
- `429` — more than **5 requests per minute** for the same client. For this endpoint the DynamoDB rate-limit key uses HMAC-SHA256 of the client IP with the infrastructure-provided `DemoRateLimitIpSalt`; raw IP addresses are not written.
- `405` — a method other than POST.
- `500` — unexpected persistence or service-configuration failure. The response is always `{ "error": "internal_error" }`; provider classes, error codes, and request data are not returned.

## Storage and privacy

The public-facing disclosure is [Política de Privacidad — §2.3 Solicitudes públicas de demo](../legal/politica-privacidad.md#23-solicitudes-públicas-de-demo). It describes the form fields, purpose, recipients, retention, exclusions, and privacy contact; this page remains the technical API contract.

`krumm-${Environment}-demo-requests` is a DynamoDB table with a random UUID `requestId` partition key, AWS-managed encryption enabled, point-in-time recovery, and TTL on `expiresAt`. Each item contains only the seven allowlisted request fields, `requestId`, `createdAt`, and `expiresAt`.

Retention is controlled by the `DemoRequestRetentionDays` SAM parameter (default **90 days**). DynamoDB TTL deletion is asynchronous, so expired data can remain briefly while DynamoDB processes deletion. The Lambda role receives only `dynamodb:PutItem` for this table; there is no public scan/list route and no table read permission in this endpoint's IAM grant.

The endpoint does **not** persist client IP, URL/query values, tokens, CVs, assessment/candidate data, or analytics events. Its audit entries contain only a generated request ID, action, and (for failed notification) a bounded provider error code—not the submitted contact fields.

## Notification configuration

After the write succeeds, the function makes a best-effort SES notification. `DemoRequestNotificationTo` is an optional `NoEcho` SAM parameter and is injected as `DEMO_REQUEST_NOTIFICATION_TO`; no recipient address is hardcoded or exposed to the frontend. `DemoRateLimitIpSalt` is also `NoEcho` and injected as `DEMO_RATE_LIMIT_IP_SALT`.

`DemoRateLimitIpSalt` is required at stack configuration time as a non-whitespace secret of at least 32 characters. The runtime independently fails closed with the generic `500` response if this value is missing, empty, or invalid, so this public endpoint cannot silently operate without its HMAC rate-limit key. If the recipient is unset, SES is unavailable, or SES rejects delivery, the stored request remains accepted with the same generic `201` response. No SES diagnostic is returned to the requester. Configure an SES-verified sender through the existing `SES_FROM_EMAIL` convention before enabling notifications.
