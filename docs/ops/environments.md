# Runbook — Entornos KRUMM (dev / test / stage / prod)

**Fecha:** 2026-09-11 · **Account AWS:** `931932531447` (us-east-1) · **KRU-98**
**Plan:** `docs/plans/2026-09-10-eval-entornos-dev-test-stage.md` · **CI/CD:** `docs/security/SECURITY.md §CI/CD`

## 1. Matriz de entornos

| Entorno | Dominio | Bucket S3 | CloudFront | API | Datos | Gate de deploy |
|---|---|---|---|---|---|---|
| **dev** | local `127.0.0.1:5173` (vite) / `:4173` (preview) | — | — | mock (`scripts/mock-sessions-api.mjs`) o staging | sintético o real | — |
| **test** (PR preview) | `https://krumm-dev-frontend-pr-<N>.s3.us-east-1.amazonaws.com/index.html` (endpoint directo; website `…s3-website-us-east-1…` configurado como alt. para deep routes) | `krumm-dev-frontend-pr-<N>` (efímero) | — (S3 directo) | staging | real (11 sesiones LIVE) | cada PR (rama del mismo repo) |
| **stage** | `stage.krumm.cl` (⚠️ CNAME pendiente en Cloudflare) | `krumm-stage-frontend-931932531447` | `E2OPPVGDO8R75S` (`d22embgflcqfym.cloudfront.net`) | staging (`…/staging`) | **real** (modo real activo: build con `VITE_KRUMM_API_BASE`) | push a `main` (auto) |
| **prod** | `krumm.cl`, `www.krumm.cl` | `krumm-staging-frontend-931932531447` (nombre legacy) | `EDQ39PDNI931R` (`d3citl7gomy2ql.cloudfront.net`) | — (build **sin** `VITE_KRUMM_API_BASE`) | demo (decisión de producto) | tag `v*` o `workflow_dispatch` (humano) + smoke |

**Principio (KRU-95):** `main` alimenta **stage**; **prod** exige tag/dispatch explícito. Cada push a `main` ya no muta krumm.cl.

## 2. DNS — Cloudflare (no Route53)

- La zona `krumm.cl` vive en **Cloudflare** (NS `renan.ns.cloudflare.com` / `rosalyn.ns.cloudflare.com`); no hay hosted zone en AWS.
- Registros vigentes: `krumm.cl` y `www.krumm.cl` → CNAME a `d3citl7gomy2ql.cloudfront.net`.
- **PENDIENTE (solo usuario, KRU-94):** agregar en Cloudflare:

  ```
  Tipo:  CNAME
  Name:  stage
  Target: d22embgflcqfym.cloudfront.net
  Proxy status: DNS only (nube gris)
  ```

  → `stage.krumm.cl`. Verificado por adelantado: TLS estricto con SNI `stage.krumm.cl` contra la IP de CloudFront ya sirve la app con HTTP 200 (`ssl_verify_result=0`), el cert ACM wildcard cubre el alias.

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

- **staging (LIVE):** `https://rwm08ik23m.execute-api.us-east-1.amazonaws.com/staging` — SAM `krumm-m2-backend-staging`, tablas DynamoDB `krumm-staging-*`, 11 sesiones reales (contract v1). Rate limit 10 req/min/IP.
- **prod:** **no existe ruta `/prod`** (KRU-97 pendiente). Opciones del plan: (a) ruta `/prod` en la misma API GW + tablas `krumm-prod-*` (aislamiento real), (b) reutilizar staging con flag (cero costo, mezcla de datos). **Decisión de datos = solo usuario.** Mientras tanto, el build de prod no inyecta API base (modo demo) → no depende de esta decisión.
- Migración de datos staging→prod: fuera de scope de KRU-97 (scoping aparte si se aprueba).

## 8. Pitfalls

1. **CFN vs live (`infra/m1-frontend-stack.yaml`):** el stack m1 en el repo NO refleja el estado real — el RHP m3 y las dists se crearon/modificaron **vía API** (fuera de CFN). Antes de cualquier `cloudformation deploy` del stack m1: reconciliar template con live (o marcarlo como no-mantenedor) para no revertir/destroy los recursos.
2. **Bucket "staging" sirve prod:** el nombre `krumm-staging-frontend-…` confunde (es el bucket de krumm.cl). Opción: migrar a `krumm-prod-frontend-…` (copy S3→S3 + swap de origen en la dist + invalidación; sin tocar DNS) o aceptar y documentar (estado actual). No hacerlo sin ventana acordada.
3. **`stage.krumm.cl` sin CNAME** responde NXDOMAIN hasta que el usuario agregue el registro en Cloudflare (§2). El resto (dist, cert, contenido, modo real) está listo.
4. **OIDC en PRs desde forks:** no disponible en repo público — `deploy-preview`/`cleanup-preview` fallarían en `configure-aws-credentials`; documentado en el workflow.
5. **AWS SSO local (~11 h):** los procedimientos manuales (barrido huérfanos, cleanup cert FAILED) requieren `aws sso login --sso-session aws_sso --use-device-code` (token vía usuario).
6. **CSP de stage/prod:** si el backend prod (KRU-97) usa otra región/endpoint, extender `connect-src` del RHP m3 **antes** de activar `VITE_KRUMM_API_BASE` en el build correspondiente.

## 9. Evidencia 2026-09-11

- Stage: contenido en bucket (deploy 01:18 CL), dist `E2OPPVGDO8R75S` Deployed con alias, TLS estricto SNI `stage.krumm.cl` → HTTP 200 `ssl_verify_result=0`, bundle con `VITE_KRUMM_API_BASE` staging incrustado (modo real).
- Prod: `krumm.cl` → dist `EDQ39PDNI931R` (sin cambios; gate manual activo).
- OIDC: trust + policy v4 aplicados (2026-09-11 05:03 UTC).
- Preview: workflow `preview.yml` (buckets per-PR) — pendiente primer PR de validación.
