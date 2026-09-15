# Dominio Cognito de marca — runbook

## Alcance

El portal de empresas usa Authorization Code + PKCE con Cognito Managed Login. El frontend nunca captura ni proxifica credenciales: redirige al dominio Cognito configurado por `VITE_KRUMM_COGNITO_HOST`.

## Stage

- Dominio: `acceso-stage.krumm.cl`
- User pool: `us-east-1_FX1VyzTTA`
- Cliente SPA: `7vpliahah8jbc5fh0d59qbjgej`
- Certificado ACM us-east-1: `arn:aws:acm:us-east-1:931932531447:certificate/d201648d-885c-4aea-b84b-5eef978866db`
- CNAME DNS requerido: `acceso-stage.krumm.cl` → `d3k35sek8ftgo2.cloudfront.net` (DNS-only; no proxy Cloudflare)

La creación se verifica con `describe_user_pool_domain` hasta `Status=ACTIVE`, resolución DNS y una autorización/token/logout reales. El build stage inyecta `VITE_KRUMM_COGNITO_HOST=acceso-stage.krumm.cl`; CSP `connect-src` debe incluir este origen antes de desplegarlo.

## Guardrail para el cliente Cognito

`update_user_pool_client` tiene semántica de reemplazo completo. Antes de mutarlo:

1. Ejecutar `describe_user_pool_client`.
2. Reenviar todos los campos relevantes: OAuth code, callbacks stage/prod, logout URLs, scopes, `SupportedIdentityProviders: [COGNITO]`, flujos, tiempos de token y atributos.
3. Ejecutar otro `describe_user_pool_client` y probar authorize → token → callback → logout.

No usar un proxy de autenticación ni copiar contraseñas desde el frontend.

## Producción

No crear ni propagar un dominio de producción sin una autorización explícita posterior a evidencia verde en stage. Debe usar certificado ACM us-east-1, DNS validado, callback/logout de producción preservados, CSP actualizada y smoke E2E posterior al deploy.
