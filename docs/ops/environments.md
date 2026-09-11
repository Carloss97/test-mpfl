# Runbook — Entornos KRUMM (dev / test / stage / prod)

**Fecha:** 2026-09-11 · **Account AWS:** `931932531447` (us-east-1) · **KRU-98**
**Plan:** `docs/plans/2026-09-10-eval-entornos-dev-test-stage.md` · **CI/CD:** `docs/security/SECURITY.md §CI/CD`

## 1. Matriz de entornos

| Entorno | Dominio | Bucket S3 | CloudFront | API | Datos | Gate de deploy |
|---|---|---|---|---|---|---|
| **dev** | local `127.0.0.1:5173` (vite) / `:4173` (preview) | — | — | mock (`scripts/mock-sessions-api.mjs`) o staging | sintético o real | — |
| **test** (PR preview) | `https://krumm-dev-frontend-pr-<N>.s3.us-east-1.amazonaws.com/index.html` (endpoint directo; website `…s3-website-us-east-1…` configurado como alt. para deep routes) | `krumm-dev-frontend-pr-<N>` (efímero) | — (S3 directo) | staging | real (11 sesiones LIVE) | cada PR (rama del mismo repo) |
| **stage** | `stage.krumm.cl` (**ACTIVO**, build real con datos reales) | `krumm-stage-frontend-931932531447` | `E2OPPVGDO8R75S` (`d22embgflcqfym.cloudfront.net`) | staging (`…/staging`) | **real** (11 sesiones LIVE) **→ flag env='staging' en sesiones nuevas** | push a `main` (auto) |
| **prod** | `krumm.cl`, `www.krumm.cl` | `krumm-staging-frontend-931932531447` (nombre legacy) | `EDQ39PDNI931R` (`d3citl7gomy2ql.cloudfront.net`) | `/prod` (build listo modo real; krumm.cl sigue en **demo** hasta el próximo tag — gate) | real (compartido con staging, KRU-97 b) | tag `v*` o `workflow_dispatch` (humano) + smoke |

**Principio (KRU-95):** `main` alimenta **stage**; **prod** exige tag/dispatch explícito. Cada push a `main` ya no muta krumm.cl.

## 2. DNS — Cloudflare (no Route53)

- La zona `krumm.cl` vive en **Cloudflare** (NS `renan.ns.cloudflare.com` / `rosalyn.ns.cloudflare.com`); no hay hosted zone en AWS.
- Registros vigentes: `krumm.cl` y `www.krumm.cl` → CNAME a `d3citl7gomy2ql.cloudfront.net`.
- **Hecho (2026-09-11):** CNAME agregado en Cloudflare; `https://stage.krumm.cl` ACTIVO (HTTP 200, TLS estricto OK), sirviendo el build stage (modo real → API `/staging`, 11 sesiones LIVE). El estado se mantiene como entorno de QA (main → stage auto) independiente de la producción (tag→prod). **krumm.cl pasa a modo real** (tag v1.0.0, run 34603047817) sin romper para staging externo.

## 3. Certificados ACM

| ARN | Dominios | Estado | Uso |
|---|---|---|---|
| `d201648d-885c-4aea-b84b-5eef978866db` | `krumm.cl`, `*.krumm.cl` | **ISSUED** (2026-09-05 → 2027-03-21) | dists prod + stage (InUse) |
| `701c9f50-f6ac-45bb-ab45-b4127b8cad05` | `krumm.cl`, `*.krumm.cl`, `www.krumm.cl` | FAILED (primer intento) | residual — cleanup opcional (`aws acm delete-certificate`) |

## 4. RHP / seguridad por distribución

- **RHP m3** `krumm-staging-rhp-m3` (`aaac7f10-372b-461e-b387-1ed1f2eeadd6`) en el default cache behavior de **ambas** dists: CSP (incluye `fonts.googleapis.com`/`fonts.gstatic.com` y `connect-src … rwm08ik23m.execute-api.us-east-1.amazonaws.com` → el modo real funciona sin tocar CSP), HSTS, XFO DENY, nosniff, referrer, XSS-Protection.
- **Caché:** bundles `/assets/*` con hash → `max-age=31536000,immutable`; `index.html` → `no-cache`; assets no-hasheados de `public/` (favicon, logo, foto hero) se refrescan por la invalidación `/*` de cada deploy (fix `807446f`: antes quedaban stale hasta 1 año).
- **Preview (test):** sin RHP (S3 website directo) — suficiente para QA de PRs; no usar para verificar headers de seguridad.

## 5. Deploy — procedimientos

### Stage (auto, cada push a main)
```bash
git push origin main
# GH Actions: CD → build (VITE_KRUMM_API_BASE staging) → deploy-stage (S3 sync + invalidación)
# Verificar: gh run list -w CD --limit 3 ; curl -sI https://stage.krumm.cl (tras el CNAME)
```

### Prod (gate humano)
```bash
git tag v<version> && git push origin v<version>   # o: UI de GitHub → CD → workflow_dispatch
# Jobs: build (sin API base = modo demo) → deploy-prod → Playwright smoke (prod-verify-v5.mjs + check-dev-bomb-prod.mjs)
# Si el smoke falla, el run queda rojo (el deploy ya ocurrió; el siguiente tag corrige)
```

### Preview (automático por PR)
1. Crear PR desde rama del mismo repo (forks: GitHub no permite OIDC → el job falla, limitación conocida).
2. `deploy-preview` crea/recrea `krumm-dev-frontend-pr-<N>` (website index+error-doc, policy pública solo `s3:GetObject`, BPA con ACLs bloqueadas) y sync del build.
3. Comentario en el PR con la URL del endpoint S3 directo (`…/index.html`, TLS verificado desde la Pi). La config S3 *website* (index + error document) queda también activa como alternativa para deep routes (`…s3-website-us-east-1.amazonaws.com/`) — nota: el TLS del pool de IPs del website endpoint se resetea desde la egress de la Pi (ISP/path), no es configuración del bucket.
4. Al cerrar (merge o close): `cleanup-preview` borra el bucket completo.
5. **Barrido de huérfanos** (cierre forzado sin evento `closed`):
   ```bash
   aws s3 ls | grep 'krumm-dev-frontend-pr-'
   # por bucket:
   aws s3 rm s3://krumm-dev-frontend-pr-N/ --recursive
   aws s3api delete-bucket-website --bucket krumm-dev-frontend-pr-N
   aws s3api delete-bucket-policy --bucket krumm-dev-frontend-pr-N
   aws s3api delete-bucket --bucket krumm-dev-frontend-pr-N
   ```

## 6. IAM / OIDC (sin keys estáticas)

- Provider `token.actions.githubusercontent.com` (thumbprints desde JWKS; script idempotente `scripts/setup-gh-oidc.py`). **Client ID `sts.amazonaws.com`**.
- Rol `krumm-gh-actions-deploy`:
  - **Trust:** `oidc:sub` ∈ `repo:Carloss97/test-mpfl:ref:refs/heads/main`, `…:ref:refs/tags/v*`, `…:pull_request` (repo público: los sub de PR solo firman ramas propias, nunca forks).
  - **Policy (v4, 2026-09-11):** S3 `Get/Put/DeleteObject` + `ListBucket` (buckets prod/stage/dev + `krumm-dev-frontend-pr-*`); CF `CreateInvalidation`/`GetDistribution` (dists `EDQ39PDNI931R` + `E2OPPVGDO8R75S`); config de buckets per-PR (`CreateBucket`, `PutBucketWebsite/Policy`, `PutPublicAccessBlock`, `DeleteBucket`, …) por SIDs separados.
  - Los runners escriben las credenciales en `~/.aws/credentials` ([default]) — pitfall documentado (run 34431969106).

## 7. Backend (API)

- **staging (LIVE):** `https://rwm08ik23m.execute-api.us-east-1.amazonaws.com/staging` — stack SAM `krumm-m2-backend-staging` (template `infra/m2-backend-stack.yaml`), Lambda `krumm-staging-sessions` (Node 20), DynamoDB `krumm-staging-*` (sessions + audit + invitations), 11 sesiones reales (contract v1), CORS `*`, rate limit 10 req/min/IP.
- **prod (KRU-97 — opción (b), 2026-09-11):** `…/prod` = **segundo stage de la misma HTTP API** (misma Lambda, mismas tablas, mismo dataset). Sesiones creadas vía `/prod` llevan flag `env: 'prod'` en el registro (la flag viene de `requestContext.stage`; registros legacy no la tienen). Decisión de datos (usuario, 2026-09-11): **(b) reutilizar staging con flag** — sin tablas `krumm-prod-*`, sin migración. Verificado: `GET /prod/sessions` = mismas 11 candidatas que `/staging/sessions`.
- **El stage `prod` es un snapshot de deployment** (CFN no soporta `AutoDeploy` en `AWS::ApiGatewayV2::Deployment` — validación temprana falla). Updates de código Lambda NO lo invalidan (el ARN de la función es estable). **Si cambian las RUTAS de la API**, re-deploy manual:
  ```bash
  API_ID=rwm08ik23m  # o extraer del output SessionsApiEndpoint del stack
  D=$(aws apigatewayv2 create-deployment --api-id "$API_ID" --query DeploymentId --output text)
  aws apigatewayv2 update-stage --api-id "$API_ID" --stage-name prod --deployment-id "$D"
  ```
- **Frontend prod:** el build de `cd.yml` (tag/dispatch) ya inyecta `VITE_KRUMM_API_BASE=…/prod` → el próximo deploy a prod activa el **modo real en krumm.cl** (gate humano). El smoke `prod-verify-v5.mjs` es agnóstico de modo (verificado contra API real: 200 + CORS).
- **Deploy backend (requiere SSO):**
  ```bash
  cd ~/krumm/test-mpfl
  rm -rf infra/dist/backend/src && cp -r backend/src/. infra/dist/backend/src/
  cd infra && SAM_CLI_TELEMETRY=0 ~/.sam-cli/bin/sam deploy \
    --template-file m2-backend-stack.yaml --stack-name krumm-m2-backend-staging \
    --region us-east-1 --parameter-overrides Environment=staging \
    --capabilities CAPABILITY_IAM --no-confirm-changeset --resolve-s3
  ```

## 8. Pitfalls

1. **CFN vs live (`infra/m1-frontend-stack.yaml`):** el stack m1 en el repo NO refleja el estado real — el RHP m3 y las dists se crearon/modificaron **vía API** (fuera de CFN). Antes de cualquier `cloudformation deploy` del stack m1: reconciliar template con live (o marcarlo como no-mantenedor) para no revertir/destroy los recursos.
2. **Bucket "staging" sirve prod:** el nombre `krumm-staging-frontend-…` confunde (es el bucket de krumm.cl). Opción: migrar a `krumm-prod-frontend-…` (copy S3→S3 + swap de origen en la dist + invalidación; sin tocar DNS) o aceptar y documentar (estado actual). No hacerlo sin ventana acordada.
3. **krumm.cl modo real vs stage.krumm.cl** (2026-09-11, tras el tag v1.0.0 event DRIVER-2025): ambos frontends apuntan a APIs distintas (`…/prod` y `…/staging`) del mismo stack — **stage y prod** comparten los mismos datos (un solo dataset pilotaje, KRU-97 opción b). Si un candidato crea una sesión con algún invite durante una prueba en stage, esa sesión queda en la tabla compartida (flag env='staging').
4. **OIDC en PRs desde forks:** no disponible en repo público — `deploy-preview`/`cleanup-preview` fallarían en `configure-aws-credentials`; documentado en el workflow.
5. **AWS SSO local (~11 h):** los procedimientos manuales (barrido huérfanos, cleanup cert FAILED) requieren `aws sso login --sso-session aws_sso --use-device-code` (token vía usuario).
6. **CSP de stage/prod:** si el backend prod (KRU-97) usa otra región/endpoint, extender `connect-src` del RHP m3 **antes** de activar `VITE_KRUMM_API_BASE` en el build correspondiente.

## 9. Evidencia 2026-09-11

- Stage: contenido en bucket (auto-deploy CD run 34565498444, 02:20 CL), dist `E2OPPVGDO8R75S` Deployed con alias, **CNAME Cloudflare agregado (09-11) → `https://stage.krumm.cl` HTTP 200 + TLS estricto OK desde la Pi**, bundle con `VITE_KRUMM_API_BASE` staging incrustado (modo real). **KRU-94 DONE.**
- Prod: `krumm.cl` → dist `EDQ39PDNI931R` (sin cambios; gate manual activo; bundle prod `index-DVbRsXY9.js` intacto tras los pushes a main).
- OIDC: trust (main + tags v* + pull_request) + policy v5 aplicados (2026-09-11 05:25 UTC).
- **Preview: validado e2e con PR #1** (merged 05:47 CL): deploy-preview OK (bucket `krumm-dev-frontend-pr-1`), URL `…s3.us-east-1.amazonaws.com/index.html` HTTP 200 con bundle modo real, comentario con URL auto-actualizado, merge → cleanup-preview OK (bucket 404 verificado).
- **CI: migración actions a runtime node24** (2026-09-11, commit `9e97daa`): `checkout@v5`, `setup-node@v5`, `upload-artifact@v6`, `download-artifact@v7`, `github-script@v8`, `configure-aws-credentials@v6`, `gitleaks-action@v3` + env `GITHUB_TOKEN` (obligatorio en PRs desde gitleaks-action v2.3). **Deadline: Node 20 se retira de los runners de GitHub el 2026-09-16** — sin esta migración todo el pipeline habría dejado de correr.
- Fix CD bifurcado: el `dist/` debe viajar entre jobs vía `upload-artifact`/`download-artifact` (run 34565085586 falló "No existe dist" — fix `35944ad`).
- **Backend KRU-97 opción (b) (09-11):** stage `prod` en la misma HTTP API (deploy + stack update OK; `AutoDeploy` no soportado en CFN → snapshot, ver §7), flag `env` en sesiones nuevas (tests backend 27/27), `GET /prod/sessions` = 11 candidatas (mismo dataset que `/staging`). Build de prod en `cd.yml` listo para modo real (`VITE_KRUMM_API_BASE=…/prod`); krumm.cl sigue demo hasta el próximo tag/dispatch (gate humano).
