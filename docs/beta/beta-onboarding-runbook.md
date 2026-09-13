# Runbook de Onboarding Beta — Empresas y Reclutadores (KRUMM)

**Versión:** 1.0 — 2026-09-13
**Alcance:** procedimiento operativo para onboardar las 2 empresas de beta (decisión 2026-09-12) y sus reclutadores, y para operar el ciclo completo invitación → evaluación → reporte.
**Estado del stack (verificado 2026-09-13):** todo lo de "Prerrequisitos" ya está desplegado y probado en vivo.

---

## 1. Prerrequisitos (una vez — YA HECHO)

| Componente | Estado |
|---|---|
| Cognito pool `us-east-1_FX1VyzTTA` (krumm-staging-recruiters) | ✓ username=email, auto-verify, MFA off, grupos `recruiters`+`admins` |
| Client SPA `7vpliahah8jbc5fh0d59qbjgej` (krumm-web-spa) | ✓ flow `code`+PKCE, callbacks stage+prod, **AllowedOAuthFlowsUserPoolClient=true** (fix 2026-09-13) |
| Hosted UI domain | ✓ `krumm-staging-recruiters.auth.us-east-1.amazoncognito.com` (creado con `create_user_pool_domain`; NO existe solo por tener client OAuth) |
| Email del pool | ✓ vía **SES** `no-reply@krumm.cl` (fix 2026-09-13: el sender default de Cognito no entregaba — 3 fallos en 2 direcciones) |
| Backend API | ✓ authorizer JWT + gate de grupo recruiters/admins en `/staging` y `/prod` (GET /sessions, ANY /sessions/{id}, POST /invitations, POST /invitations/{token}/revoke) |
| Frontend stage | ✓ login en `stage.krumm.cl/empresa/acceso` + panel "Invitar a un candidato" en dashboard (solo modo real) |
| SES krumm.cl | ✓ verified, production 50k/día, DKIM en Cloudflare |

> **Aviso a la empresa:** los emails de KRUMM (invitaciones y códigos) salen de
> `no-reply@krumm.cl` y **suelen caer a SPAM** (entregabilidad verificada en inbox
> principal y en spam). Pedir a la empresa que marque `no-reply@krumm.cl` como
> remitente confiable (o filtre al inbox) antes de empezar.

## 2. Crear un reclutador para la Empresa X

Herramienta: `~/.hermes/scripts/aws_v4only.py` en la Pi (el IPv6 de la Pi blackholea `cognito-idp`; nunca usar aws CLI normal para Cognito).

```bash
cd /home/sarlock
# 1) Usuario (sin email automático; el password se fija abajo)
~/.venvs/awscli1/bin/python ~/.hermes/scripts/aws_v4only.py cognito-idp admin_create_user \
  '{"UserPoolId":"us-east-1_FX1VyzTTA","Username":"<email-recrutador>@<dominio-empresa>","MessageAction":"SUPPRESS"}'

# 2) Grupo (obligatorio: el authorizer exige recruiters o admins)
~/.venvs/awscli1/bin/python ~/.hermes/scripts/aws_v4only.py cognito-idp admin_add_user_to_group \
  '{"UserPoolId":"us-east-1_FX1VyzTTA","Username":"<email-recrutador>@<dominio-empresa>","GroupName":"recruiters"}'

# 3) Password temporal (cambio obligatorio en primer login)
~/.venvs/awscli1/bin/python ~/.hermes/scripts/aws_v4only.py cognito-idp admin_set_user_password \
  '{"UserPoolId":"us-east-1_FX1VyzTTA","Username":"<email-recrutador>@<dominio-empresa>","Password":"<password-fuerte>","Permanent":false}'
```

Entregar el password temporal **fuera del chat** (llamada / email seguro). En el primer login el hosted UI fuerza a fijar su propio password (estado `FORCE_CHANGE_PASSWORD` → `CONFIRMED`).

**Alternativa sin password temporal:** pedir al reclutador que use "¿Olvidaste tu contraseña?" en el hosted UI — el código ahora sale por SES `no-reply@krumm.cl` (llega, habitualmente a spam).

## 3. Primer login del reclutador

1. `https://stage.krumm.cl/empresa/acceso` → **Iniciar sesión**.
2. Hosted UI: email + password → (primer login: fija nueva password).
3. Retorno a `/empresa/acceso?code=...` → tokens en sessionStorage → `/empresa` en **modo real** (badge "Sesiones reales", panel "Invitar a un candidato" visible).
4. Si ve el workspace demo en vez del real: no completó el login (volver a Iniciar sesión). Si ve "Inicio de sesión incompleto": cerrar el flujo y repetir desde el botón (el `state` PKCE expira si se refresca la URL).

## 4. Invitar a un candidato

Desde el dashboard `/empresa` → panel **Invitar a un candidato**:
1. Email del candidato → **Enviar invitación**.
2. Success: el candidato recibe el link por email (de `no-reply@krumm.cl`, revisar spam) **y** aparece el **link manual** en pantalla — compartirlo por el canal que la empresa use si el email no llega a tiempo.
3. El link es **single-use y expira en 72 h**. Si el candidato no lo usa a tiempo: crear una invitación nueva (el token viejo queda `expired`).
4. Si el email no se pudo enviar (variante visible en el panel): compartir el link manual.

Ciclo del candidato: abre el link → setup (consentimiento, cámara opcional) → batería `stable_dg` (5 juegos, ~14-16 min) → reporte final → la sesión queda en el dashboard de la empresa (estado `in_progress` → `ready`).

## 5. Leer reportes

- Dashboard `/empresa`: KPIs + procesos activos (derivados de las sesiones reales).
- Detalle `/empresa/proceso/<id>`: candidatos del proceso, constructos, score agregado.
- Export: CSV por proceso / MD por candidato (con watermark `humanReviewOnly` — no hay decisiones automatizadas, R-6).

## 6. Operación y soporte (solo-internal)

| Situación | Acción |
|---|---|
| El reclutador no llega el código de "olvidé password" | Re-disparar: `aws_v4only.py cognito-idp forgot_password '{"ClientId":"7vpliahah8jbc5fh0d59qbjgej","Username":"<email>"}'` y avisar a revisar SPAM |
| Resetear password de un reclutador | `admin_set_user_password` (sección 2, paso 3) — invalida la sesión activa |
| ¿Qué ve la empresa X? | Todas las sesiones del dataset compartido (ver §7) |
| API 401 en el workspace | Sesión Cognito expirada → el frontend hace refresh solo; si persiste, volver a iniciar sesión |
| API 403 | Token válido pero sin grupo recruiters/admins → agregar grupo (sección 2, paso 2) |
| Revocar una invitación | API: `POST {api}/staging/invitations/<token>/revoke` con Bearer del reclutador (UI pendiente, KRU en fase A) |
| Revisar estado de una invitación | API pública: `GET {api}/staging/invitations/<token>` (sin auth) → `valid/used/expired/revoked` |

## 7. Límite conocido de la beta (gestionar expectativas)

**Multi-tenancy aún no implementado (G.5, pendiente):** todas las sesiones de las
2 empresas comparten el mismo dataset de backend. Para la beta de 2 empresas es
aceptable **solo si** cada empresa invita candidatos propios y no le muestra a la
otra empresa datos ajenos — hoy SÍ se comparten los listados. Mitigación operativa:
- Beta cerrada entre las 2 empresas (sin candidatos cruzados).
- Los reportes son agregados descriptivos (sin PII de terceros: alias hash).
- G.5 (`companyId` en sesión + filtrado por empresa) se implementa antes del pilotaje abierto.

## 8. Log de incidentes de infraestructura (2026-09-13, para referencia)

1. Hosted UI no resolvía (NXDOMAIN) → `create_user_pool_domain` prefix `krumm-staging-recruiters`.
2. Emails de Cognito no llegaban (sender default Amazon) → pool → SES `no-reply@krumm.cl` (llega, a spam).
3. `Client is not enabled for OAuth2.0 flows` → `AllowedOAuthFlowsUserPoolClient: true` en el client SPA.
4. Authorizer CFN: 4 iteraciones (ApiId requerido; Claims fuera del modelo API → gate en Lambda; AuthorizerId hardcoded `8dpjid` sin GetAtt; Integration proxy en vez de ARN directo).
