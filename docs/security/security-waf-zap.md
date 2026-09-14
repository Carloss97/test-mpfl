# G.3 — Seguridad avanzada (KRU-138) — 2026-09-14

Alcance del plan (fase G.3):
1. Rate limiting API: 10 req/min/IP en `/invitations` y `/sessions`
2. AWS WAF básico (managed rules: Common + KnownBadInputs) en CloudFront
3. Baseline OWASP ZAP contra stage: **0 hallazgos critical/high** antes de beta
4. gitleaks → bloqueo en PR (verificar `--redact` activo)

---

## 1. Rate limiting API — ✅ VERIFICADO EN VIVO

**Desviación documentada del plan:** el plan proponía una rate-based rule de AWS WAF
asociada a API Gateway. En la API WAF 2026 la asociación WebACL→API Gateway es
rechazada (`"The ARN isn't valid"`; 6 formatos probados: `apiid`, `apiid/staging`,
`apiid/staging/*`, `apiid/$default`, estilo v1). → El rate limit se implementó **en
la Lambda** (más robusto y sin dependencia del WAF↔APIGW).

- Módulo: `backend/src/rateLimit.mjs` — token por minuto con clave
  `<bucket>:<minute>:<ip>`; writes condicionales en DDB (Put condicional + Update
  condicional, 10 por minuto por bucket por IP).
- Tabla: `krumm-staging-rate-limit` (PAY_PER_REQUEST, TTL 3 min, `DeletionPolicy:
  Retain`). El TTL se activa vía `aws dynamodb update-time-to-live` (el recurso
  `AWS::DynamoDB::Table` **no** tiene propiedad `TTLSpecification` — CFN lo rechaza
  en EarlyValidation).
- Rutas cubiertas: `*/invitations*` y `*/sessions*` (ambos stages: la misma Lambda
  atiende /staging y /prod; el presupuesto 10/min/IP/bucket es compartido entre
  stages — suficiente para pre-beta).
- Respuesta al exceder: **429** `{"error":"rate_limited","code":"too_many_requests"}`
  + header `retry-after: <segundos>`.
- No-op seguro: sin tabla / sin IP / sin bucket → siempre permitido (local, dev,
  tests sin inyección).
- IP: payload 2.0 → `requestContext.ip`; payload 1.0 (rutas nativas HR) →
  `requestContext.identity.ip` o `.sourceIp` (el bug del 1.0 costó un deploy: sin
  `sourceIp` el limitador era no-op).

**E2E (2026-09-14, 02:58 UTC):** 12× `GET /staging/sessions` desde la misma IP con
token QA recruiter:
```
1-10: 200
11:   429  body {"error":"rate_limited","code":"too_many_requests"}  retry-after: 50
12:   429
DDB:  sessions:29822579:152.231.108.59 → count = 10
```

**Tests:** `backend/test/rateLimit.test.mjs` (8 tests): permite 10 y bloquea la 11ª;
independencia por IP / por bucket / por minuto; no-op; `sourceIp` payload 1.0;
integración handler (10× 201 + 11ª → 429) y compatibilidad sin tabla. Suite backend:
95/95 verdes.

**Trampas DDB 2026-09-14:** `key` y `count` son **reserved keywords** en expresiones
→ obligatorios `ExpressionAttributeNames` (`#k`/`#c`); y DDB rechaza nombres
declarados y no usados en la llamada (`"Value provided in ExpressionAttributeNames
unused in expressions: keys: {#c}"`) → mapas separados por operación (put usa solo
`#k`; update solo `#c`).

## 2. WAF CloudFront (Common + KnownBadInputs) — ⚠️ DESPLEGADO, VERIFICACIÓN PENDIENTE

- Web ACL: `krumm-cf-waf` (ID `08610c5b-4502-4695-9710-182325aba39f`, scope
  CLOUDFRONT, us-east-1, DefaultAction Allow).
- Reglas (OverrideAction: None → las reglas internas del ruleset usan sus acciones
  propias):
  - `cf-common` → `AWSManagedRulesCommonRuleSet` (el CRS, sucesor de
    `AWSManagedRulesCommonRuleGroup`)
  - `cf-knownbadinputs` → `AWSManagedRulesKnownBadInputsRuleSet`
- Asociada a **ambas distribuciones** (stage `E2OPPVGDO8R75S` + prod
  `EDQ39PDNI931R`), ambas `Deployed`.

**Lecciones API 2026** (la documentación 2023-2025 quedó obsoleta; el CLI < 2.36.44
no serializa los cambios):
- Los managed groups se renombraron a `*RuleSet`; los nombres viejos
  (`*RuleGroup`) no resuelven (`WAFNonexistentItemException`).
- En una regla de managed group **no se permite `Action`** (solo
  `OverrideAction: None|Count`). Poner `Action: Block` falla con el error
  engañoso `"A reference in your rule statement is not valid"`.
- `RegexMatchStatement` (las antiguas `RegexStatement`/`UriPath` ya no existen) y
  exige `TextTransformations: [{Type: NONE, Priority: 0}]`.
- Description de Web ACL/reglas: regex sin paréntesis ni caracteres fuera de
  `[\w+=:#@/\-,.]`.
- **CloudFront `WebACLId` = ARN, no ID** (con el ID: `"Web ACL is not accessible by
  the requester"` — caso clásico SO/Terraform, ahora también vía API).
- `create-web-acl` responde `Summary.Id` (+`LockToken` top-level en get/delete);
  `get-web-acl`/`delete-web-acl`/`get-managed-rule-set` exigen `--name` además de
  `--id`.
- CLI instalado local sin sudo: `~/bin/aws` (2.36.44) — el de `/usr/local` (2.36.38)
  es anterior a la migración.

**Verificación (en curso):** sondas XSS/SQLi/sqlmap-UA devolvieron 200 y las
métricas CloudWatch aún no aparecen (`CloudWatchMetricsEnabled` se activó a las
03:02 UTC; la latencia de métricas WAF es de hasta 15 min). Verificar:
- CloudWatch: namespace `AWS/WAF`, dimensión `WebACL=krumm-cf-waf, Scope=CLOUDFRONT`
  (`EvaluatedRequests`/`BlockedRequests`/`CountedRequests` por regla).
- Consola AWS → CloudFront → distribución → pestaña **WAF** (inspector de
  requests, sin necesidad de métricas).
Si tras 15 min sigue sin evaluación: recrear la Web ACL desde la consola (la API
CLI 2026 puede estar en migración) — el resto del G.3 no depende de ello.

**Costo:** ~$1-2/mes (web ACL + evaluación sobre tráfico mínimo; dentro del budget
de $25/mes).

## 3. Baseline OWASP ZAP — ✅ 0 CRITICAL/HIGH

ZAP 2.17.0 (JDK 21 Temurin local en `/home/sarlock/tools/jdk21`, sin sudo) —
quickscan de `https://stage.krumm.cl/{,portal,candidato}` (2026-09-14, 23:44-23:56
hora local; el WAF ya estaba asociado, por lo que el escaneo refleja la config
real de pre-beta).

- Reportes: `docs/security/g3-zap-baseline-2026-09-14/zap-{home,portal,candidato}.json`
- **Resultado: 0 hallazgos critical/high** (criterio del plan: cumplido).
  - MEDIUM ×1: `CSP: style-src unsafe-inline` — **aceptado** (by design mientras el
    SPA usa estilos inline; improvement: eliminar `'unsafe-inline'` de style-src al
    purgarlos).
  - LOW ×1: `Server leaks version information` — headers `Server` de
    CloudFront/AmazonS3, no controlables desde la app; **aceptado**.
  - INFO: comentarios en el bundle JS, directivas de cache, "Modern Web
    Application" — sin acción.
- Nota de alcance: ZAP no ejecuta JS → el crawling no descubre rutas del SPA ni
  endpoints de la API (protegidos además por Cognito + rate limit). Para la beta:
  ZAP spider con JS o un OWASP ZAP full-scan con login scripted.

**Trampas CLI ZAP 2026-09-14:** `-baseline` fue RETIRADO (use `-quickurl` +
`-quickout <file>`; la extensión define formato HTML/JSON/MD/XML); `-addonupdate`
es booleano (el valor `off` se interpreta como archivo); `-J`/`-g` no aplican a
quickscan.

## 4. gitleaks — ✅ VERIFICADO

- CI (`ci.yml`, KRU-51): `gitleaks-action@v3` + `.gitleaks.toml` + summary en PR.
- **`--redact` activo por defecto** (gitleaks ≥8 redacta los secrets en salida y
  summary; el workflow no pasa `--no-redact`) → ningún secret queda legible en
  reports/PRs. Verificado 2026-09-14 (no requiere cambio).

## Riesgos residuales / próximos pasos

1. **WAF CF**: confirmar evaluación/bloqueo (métricas o consola); si la API CLI no
   aplica la asociación, recrear la Web ACL por consola (idénticas reglas).
2. **CSP**: purgar estilos inline del SPA → retirar `'unsafe-inline'` de
   `style-src` (cierra el MEDIUM de ZAP y endurece la m7).
3. **Beta**: revisar límites de rate limit (10/min/IP sobra para pre-beta) y
   considerar per-user (claim `sub`) además de per-IP; ZAP full-scan con login.
4. **Paridad prod**: el stage prod de la API (KRU-97, deploy manual) usa la misma
   Lambda → mismo rate limit; el WAF CF ya está asociado a la dist prod.
