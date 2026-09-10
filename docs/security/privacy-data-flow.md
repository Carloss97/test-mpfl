# Flujo de datos y privacidad — KRUMM (KRU-51)

**Fecha:** 2026-09-10 · **Repo:** `test-mpfl` · **Contracto:** R-6 (ver `AGENTS.md` §Contrato científico R-6) + `threat-model-v1.md` (T8/T9)

## 1. Inventario: qué recolecta el cliente

| Dato | Dónde | Salida del navegador |
|---|---|---|
| Telemetría de juego **agregada** (allowlist por juego: scores transformados 0–100, tiempos, movimientos, cobertura, etc.) | En memoria (browser) | Sí — dentro del payload de sesión (§3) |
| `game_event_v1` + `stimulus_shown` / `response` / `game_end` (esqueleto mínimo) | En memoria | Sí — agregados, nunca crudo |
| Calidad de captura (si la cámara está activada por el candidato): `facePresenceRatio`, caveats (`low_face_presence`, `low_sample_count`…) | En memoria (Edge-AI) | Sí — solo flags/caveats, **nunca** video/frames/landmarks |
| `alias` (seudónimo derivado, `aliasHash`) | Backend (DynamoDB) | El candidato elige/ve el alias; no es PII directa |
| Video, frames, screenshots, landmarks, keypoints, blendshapes crudos, pointer samples, rutas celda a celda, logs de eventos crudos | **Nunca se generan ni se guardan** | **Nunca** (T8; `ASSESSMENT_FORBIDDEN_KEYS` en el cliente y server-side) |

Cámara/biometría: **off por defecto**; solo contexto/quality, nunca inferencia directa de talento, personalidad, emoción, estrés, sinceridad o decisión de contratación (regla no negociable, AGENTS.md §Privacidad).

## 2. Qué NO viaja nunca (doble barrera)

1. **Cliente:** el payload se construye agregado (`buildSessionSummary` / allowlist por juego); `ASSESSMENT_FORBIDDEN_KEYS` (`src/assessment/assessmentSession.js`) descarta en origen.
2. **Servidor:** `validateSessionPayload` (`backend/src/privacy/validatePayload.mjs`) escanea el JSON recibido **recursivamente**; si aparece alguna clave prohibida a cualquier nivel → **422** (rechazo). Tests: `backend/test/privacy.validatePayload.test.mjs` (6 tests) + coverage en la suite frontend (CI).

## 3. Payload de sesión (lo que llega a `POST /sessions`)

- `sessionSummary`: completitud por juego (agregados allowlist-only), scores transformados 0–100 (`null` = señal ausente, nunca 0 ni 50), caveats de calidad.
- `featureVector`: `assessment_feature_vector_v2` versionado (v2.2.0 con las 12 features `bomb.*` de EXP-7; additive-only, sin breaking).
- `talentProfile`: 9 constructos (8 + `proceduralWorkingMemory` provisional) con `availability`/`confidence`/`caveats` — **`descriptive_only`**, `humanReviewOnly`, `noAutomatedDecision`, `observationalOnly`, `privacySafe`.
- `alias` + `completedAt` + calidad de sesión. **Nada** de la lista §2.

## 4. Almacenamiento y retención

- DynamoDB (staging): `krumm-staging-sessions` (+ `audit_log` append-only, + `invitations` single-use) — `PAY_PER_REQUEST`, **TTL 30 días**, PITR habilitado.
- `audit_log`: quién/qué/cuándo por POST/DELETE (repudio, T7); acceso restringido por IAM (solo `Query` con GSI `sessionId-index`, T15).
- No se almacena contenido de archivos subidos (upload de perfil: solo metadatos nombre/formato/tamaño; el contenido nunca se persiste ni se procesa con NLP — validación `validateProfileFile`).

## 5. Uso y salida (reporte / exports)

- Reporte final: para **revisión humana** (apoyo a entrevista estructurada). Sin scores de decisión, sin percentiles, sin normas. Constructos `not_measured`/`insufficient` se marcan como tales (`score: null`).
- **Exports B3 (KRU-50):** Markdown/CSV de **agregados** del proceso (alias, estado, overall descriptivo, constructos con disponibilidad, caveats, prompts de entrevista derivados). Watermark `humanReviewOnly · noAutomatedDecision · observationalOnly · privacySafe` + versión del feature vector en cada export. **Ningún dato crudo de §2 aparece en ningún export** (por construcción: los exports se generan desde el mismo shape agregado que el reporte).
- Log sanitization (T9): los logs Lambda no incluyen `rawPointerPath`/`eventLog` ni campos prohibidos; el handler responde 422 antes de persistir.

## 6. Evidencia

- Threat model STRIDE: `docs/security/threat-model-v1.md` (T1–T15).
- CSP + headers en prod: verificados 2026-09-08 (`curl -sI https://krumm.cl/`: CSP con `frame-ancestors 'none'`, HSTS 1a, XFO DENY, nosniff, referrer, XSS) — `SECURITY.md` §Headers.
- CI: suite privacy (backend + frontend) corre en cada push (`.github/workflows/ci.yml`).
