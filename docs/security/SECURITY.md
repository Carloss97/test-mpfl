# SECURITY.md — KRUMM /postulaciones-demo

## Políticas de Seguridad Aplicables

1. **Privacy-first.** Todo dado que sale del navegador del postulante debe pasar por el filtro `validateSessionPayload` server-side antes de persistir.
2. **Aggregate-only.** El backend nunca persiste datos crudos (`video`, `landmarks`, `rawFrames`, etc.). Todo es ventanas agregadas con flags de calidad.
3. **Human review only.** Los reports finales son para apoyo a entrevista estructurada; no toman decisiones automáticas.

## Forbidden Keys (Server-Side Enforcement)

`ASSESSMENT_FORBIDDEN_KEYS` se define en `src/assessment/assessmentSession.js` y se re-exporta en `backend/src/privacy/validatePayload.mjs`. Cualquier payload POST `/sessions` que contenga estas claves en cualquier nivel anidado será rechazado con 422.

```
'video', 'rawVideo', 'frames', 'rawFrames', 'imageData', 'screenshot',
'landmarks', 'keypoints', 'normalizedKeypoints', 'faceSamples',
'blendshapesRaw', 'pointerSamples', 'rawPointerPath', 'fullRoute',
'routeTrace', 'visitedCells', 'stepByStepPath', 'clickTrace', 'eventLog',
'pumpSequence', 'beamCells', 'rawGameEvents', 'choiceCategory',
'trials', 'trialResults', 'stimuli', 'items', 'windows', 'DOMEvent',
'domEvent', 'rawDOMEvents', 'MouseEvent', 'PointerEvent'
```

Validación: `backend/test/privacy.validatePayload.test.mjs` — 6 tests GREEN.

## Rate Limiting

- API Gateway HTTP: 10 solicitudes/minuto por IP (configurado en M1/M5).
- Header `X-RateLimit-Remaining` y `X-RateLimit-Reset` en todas las respuestas.
- 429 con `Retry-After` cuando se excede.

## CSP (CloudFront ResponseHeadersPolicy)

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data:;
font-src 'self' data:;
connect-src 'self' https://storage.googleapis.com;
worker-src 'self' blob:;
wasm-src 'self';
media-src 'self' blob:;
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
```

## Headers de Respuesta (siempre)

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` (M1+)

## Dependencies

- `npm audit --audit-level=high --omit=dev` → 0 high/critical vulnerabilities (tras `npm audit fix`).
- `npx oxlint` → 0 errores funcionales (warnings de vars no usadas pre-existentes).
- `git diff --check` → limpio antes de commit.

## Infraestructura

- **M1:** S3 privado + CloudFront OAC + ResponseHeadersPolicy (CSP, HSTS, XFO, referrer, nosniff, XSS protection).
- **M2:** Lambda rol mínimo privilegio (solo 2 tablas DynamoDB); API Gateway HTTP + CORS limitado.
- **M3:** Cognito login (10k MAU free tier); SES sandbox (plantillas invitación; salida solicitud sep).
- **M5:** Rate limiting API GW 10 req/min/IP; WAF opcional si presupuesto; OWASP ZAP baseline.

## Parches de Seguridad Recientes

- 2026-09-03: `ASSESSMENT_FORBIDDEN_KEYS` server-side validación activa en `POST /sessions` (validateSessionPayload).
- 2026-09-03: CSP actualizada en `infra/m1-frontend-stack.yaml` con `frame-ancestors 'none'` y `connect-src` restringido a storage.googleapis.com solo.
- 2026-09-03: Rate limiting 10 req/min/IP deployado en API Gateway (M1).