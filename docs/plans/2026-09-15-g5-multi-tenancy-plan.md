# G.5 Multi-tenancy real — Plan de implementación

> **Para Hermes:** ejecutar por tareas pequeñas con pruebas RED→GREEN y verificar el despliegue antes de cerrar.

**Objetivo:** aislar sesiones e invitaciones por empresa (`companyId`) para que dos tenants en staging no puedan leer ni modificar datos cruzados.

**Arquitectura:** el tenant se obtiene exclusivamente del claim JWT validado `custom:companyId`; nunca del body, query string ni un header controlable por el cliente. Las rutas públicas de candidato ligan la invitación a su `companyId` y la sesión hereda ese valor. Las rutas HR filtran por el tenant del JWT y devuelven 404/403 sin revelar existencia cruzada. Se conserva el modo demo como tenant explícito `krumm-demo`.

**Tech stack:** Lambda Node 20, API Gateway HTTP JWT, DynamoDB, SAM, Vitest.

---

## Decisiones fijadas

- `companyId` es string no vacío, normalizado solo con trim y longitud máxima defensiva; no se acepta desde payload de sesión ni desde query/header.
- Claim canónico: `custom:companyId`; durante la migración se acepta únicamente un alias interno `companyId` en fixtures/tests, nunca input externo.
- Invitaciones nuevas guardan `companyId`; una invitación sin tenant no puede crear una sesión en una ruta protegida.
- Sesiones legacy se migran a `krumm-demo`, no se borran ni se reescribe su payload aggregate-only.
- DynamoDB mantiene `sessionId` como PK y añade GSI `companyId-index`; lecturas HR deben usar el índice, no scan global.
- Auditoría incluye `companyId` cuando existe; nunca guarda email, token crudo ni PII.
- Gate final: dos tenants de staging, cada uno con invitación/sesión propia; A no lista, lee ni revoca recursos de B.

## Tareas

### Task 1 — contrato y helpers de tenant

**Archivos:** `backend/src/auth/tenant.mjs`, tests de `backend/test/`.

Implementar `jwtClaims(event)`, `companyIdFromClaims(event)`, `requireCompanyId(event)` y una función de comparación segura. Cubrir claim ausente, claim vacío, claim válido y shape API Gateway 1.0/2.0.

### Task 2 — persistencia de invitaciones y sesiones

**Archivos:** `backend/src/db/invitationsRepository.mjs`, `backend/src/db/sessionsRepository.mjs`.

Añadir `companyId` a los items y preservar compatibilidad legacy. Añadir `companyId-index` al template SAM. Verificar que no se acepten campos arbitrarios del body como tenant.

### Task 3 — rutas de creación y consumo

**Archivos:** `backend/src/handlers/invitations.mjs`, `backend/src/handlers/sessions.mjs`, `backend/src/index.mjs`.

- POST `/invitations`: tenant del JWT.
- POST `/sessions`: tenant de la invitación; ruta pública no confía en tenant enviado por candidato.
- GET `/invitations/{token}`: respuesta segura sin tenant.
- revoke y consumo: comprobar tenant cuando el actor sea HR o cuando exista identidad asociada.

### Task 4 — aislamiento de lecturas HR

**Archivos:** repositorio/handlers de sesiones e invitaciones, tests de integración.

GET `/sessions` consulta `companyId-index`; GET/DELETE `/sessions/{id}` verifica `item.companyId === actor.companyId`. Recursos legacy `krumm-demo` solo son visibles al tenant demo explícito.

### Task 5 — migración controlada

**Archivos:** `scripts/migrate-company-id.mjs`, `docs/ops/`.

Crear migración idempotente y dry-run para asignar `krumm-demo` a las 11 sesiones staging existentes y a invitaciones legacy. Registrar conteos agregados, no payloads ni emails. Ejecutar primero sobre staging y verificar lectura posterior.

### Task 6 — frontend y configuración de tenant

**Archivos:** `src/v3/companyData.js`, `src/v3/CompanyShell*`, `src/v3/cognitoAuth.js`, tests.

No enviar `companyId` desde el cliente. Mostrar tenant derivado del estado autenticado/config estática solo como etiqueta de workspace. Demo usa `krumm-demo`; modo real usa la respuesta del backend/claims sin permitir override local.

### Task 7 — gate E2E de dos tenants

**Archivos:** `scripts/smoke-g5-multitenancy-2026-09-15.mjs`, `docs/qa/`.

Crear/usar dos usuarios Cognito de staging con `custom:companyId` distinto, crear recursos y demostrar aislamiento en GET/list/revoke/session detail. Verificar 0 PII en logs/payloads y ejecutar suite backend + build + smoke.

## Orden y cierre

1. Tasks 1–2 antes de modificar handlers.
2. Tasks 3–4 con pruebas de autorización/aislamiento.
3. Task 5 solo tras validar el contrato en staging.
4. Task 6 y Task 7; después actualizar `AGENTS.md`, Kanban y Linear.
5. Deploy de staging primero; prod requiere aprobación explícita separada.

## Dependencias siguientes

Después de G.5: E.3 beta operativa con dos empresas, luego B.7–B.12 solo cuando se desbloqueen explícitamente; C7 biométrico continúa post-pilotaje; H.1/H.2 pueden avanzar en paralelo sin tocar datos de producción.
