# Threat Model STRIDE — KRUMM /postulaciones-demo (Fase M5)

## Spoofing

| Threat | Likelihood | Impact | Mitigation |
|--------|-----------|--------|------------|
| **T1:** Suplantación de identidad en login Cognito | Media | Alta | Cognito con MFA opcional; tokens de sesión firmes con firma HMAC; rate limiting 10 req/min/IP (API GW) |
| **T2:** Falsificación de resultados de juego (client-side) | Alta | Media | Integridad: todos los scores se validan server-side `validateFinalAssessmentPayload`; payloads aggregate-only; ningún score crudo en respuesta |
| **T3:** Session fixation en API /sessions | Baja | Alta | UUID v4 runId por sesión; regeneración tras login; validez token único/un solo uso (M3) |

## Tampering

| Threat | Likelihood | Impact | Mitigation |
|--------|-----------|--------|------------|
| **T4:** Modificación de payload antes de persistir | Baja | Alta | Validación server-side `validateSessionPayload` escanea `FORBIDDEN_KEYS` recursivamente; bloques 422 si se detectan claves prohibidas |
| **T5:** Cambio de scores en tránsito | Baja | Alta | TLS 1.2+ en todo; API Gateway + Lambda firmes; ningún campo mutable en respuesta GET (solo read) |
| **T6:** Falsificación de calidad de captura (captureQuality) | Media | Media | `assessCaptureQuality()` en edge AI; weights dinámicas por iluminación; confidence score refleja calidad; Dashboard muestra caveats si quality pobre |

## Repudiation

| Threat | Likelihood | Impact | Mitigation |
|--------|-----------|--------|------------|
| **T7:** Negar participación en batería | Baja | Media | audit_log append-only (DynamoDB); cada POST/DELETE registra quién/qué/ cuándo; TTL 30d + PITR habilitado |

## Information Disclosure

| Threat | Likelihood | Impact | Mitigation |
|--------|-----------|--------|------------|
| **T8:** Filtración de datos biométricos crudos | Baja | Alta | NUNCA se transmiten `video`, `landmarks`, `rawFrames`, `screenshot` al backend. Solo AUs agregadas + metadata. `ASSESSMENT_FORBIDDEN_KEYS` server-side. |
| **T9:** Exposición de metadata sensible en logs | Media | Media | `SECURITY.md`: sanitizar todos los logs Lambda; nunca incluir `rawPointerPath`/`eventLog` en salida pública |
| **T10:** Side-channel através de CSP bypass | Media | Media | CSP estricta en CloudFront (M1): `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' https://storage.googleapis.com; worker-src 'self' blob:; wasm-src 'self'; media-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`; `frame-ancestors 'none'` previene clickjacking |

## Denial of Service

| Threat | Likelihood | Impact | Mitigation |
|--------|-----------|--------|------------|
| **T11:** Agotamiento de quota API Gateway / Lambda | Media | Media | Rate limiting 10 req/min/IP configurado en API Gateway; CloudWatch alarma + autoscaling básica |
| **T12:** Denegación de servicio al flujo cámara | Baja | Media | Fallback gracefully: si cámara falla, session continúa sin telemetría facial; caveat `low_face_presence`; no bloquea juegos |
| **T13:** Agotamiento de DynamoDB WCU/RCU | Baja | Media | TTL 30d automático; billing mode PAY_PER_REQUEST; PITR habilitado; eventBridge Scheduler job limpieza 30d |

## Elevation of Privilege

| Threat | Likelihood | Impact | Mitigation |
|--------|-----------|--------|------------|
| **T14:** Acceso no autorizado a sesión ajena | Baja | Alta | PK sessionId por UUID v4; validador `validateAssessmentSessionPrivacy` verifica `tenantId` coincide con identidad Cognito; IAM rol mínimo privilegio (solo 2 tablas) |
| **T15:** Lectura de audit_log sin permisos | Baja | Media | IAM role Lambda: solo `dynamodb:Query` sobre GSI `sessionId-index`; ningún `Scan` sin filtro de sessionId |

---

**Fuentes referenciadas:**  
- GDPR Art. 6 (consentimiento), Art. 9 (datos biométricos)  
- OWASP Top 10 (A02:2021 — Cryptographic Failures, A05:2021 — Security Misconfiguration)  
- GDPR Art. 35 (DPIA) — este documento es el resultado parcial  
- Linear KRU-51: https://linear.app/krumm/issue/KRU-51