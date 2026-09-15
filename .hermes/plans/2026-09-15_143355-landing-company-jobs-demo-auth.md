# Landing, acceso empresa, demo y bolsa de empleos — Plan de implementación

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Mejorar la conversión y coherencia visual de landing, favicon, formulario de solicitud de demo, login/portal empresa y bolsa de empleos, corrigiendo además el retorno Cognito → `/empresa` con evidencia de navegador real.

**Architecture:** Mantener landing como ruta pública React/Vite. La demo pasa de `mailto:` a una ruta pública propia `/solicitar-demo`, con formulario accesible que persiste una solicitud mínima, envía aviso por SES y no expone datos en analytics. El acceso Cognito mantiene Authorization Code + PKCE; se corrige a partir de la causa reproducida del callback y la primera carga autenticada, no mediante redirecciones o fallbacks silenciosos. La bolsa de empleos conserva datos demo explícitos pero normaliza jerarquía tipográfica, iconografía, densidad y estados.

**Tech Stack:** React 19/Vite, `src/landing`, V3 route resolver, Cognito Hosted UI + PKCE, Lambda Node 20/API Gateway/DynamoDB/SAM, SES, Vitest, Playwright, CloudFront stage.

**Estado de ejecución (2026-09-15):** Tasks 1, 3, 3.1 (ya cumplida), 4, 5, 6, 8 y 9 implementadas y verificadas localmente; Task 4 desplegada en staging y smoke HTTP 201 verificado. Task 2 reproducida: exchange PKCE 200 pero el bundle stage previo permanecía en `/empresa/acceso`; se validará tras el deploy stage actual. Task 7 creó `acceso-stage.krumm.cl` con ACM y quedó ACTIVE; el CD stage inyecta el host y CSP lo permite. Producción no se tocará hasta evidencia stage verde.

---

## Estado inspeccionado

- `src/landing/LandingPage.jsx:244` contiene la frase redundante “Juega a una batería de juegos gamificados…”.
- La sección pública `#accesos` vive en `LandingPage.jsx:310-341`; el header la usa como destino de “Iniciar sesión” (`:140`). Debe salir de la landing, conservando `/portal` como lugar explícito para elegir candidato/empresa.
- El CTA de demo solo existe al final y usa `mailto:` (`LandingPage.jsx:363`). No hay formulario ni endpoint de solicitud de demo.
- `/empresa/acceso` está en `V3RootApp.jsx:121-228`; “Explorar demo” y “Iniciar sesión” son hermanos en `v3-company-login-actions`.
- El callback PKCE está en `cognitoAuth.js:224-260`. El workspace vuelve a `/empresa/acceso` desde `useCompanyData.js:69-113` cuando token/refresh falla o la API responde 401/403. Se debe aislar cuál de esas ramas ocurre en producción antes de cambiar lógica.
- La URL fea corresponde al Cognito Hosted UI. No se puede estilizar ese dominio desde React; la solución viable es un dominio Cognito personalizado, p. ej. `acceso.krumm.cl`, con certificado ACM us-east-1, DNS Cloudflare y actualización de `VITE_KRUMM_COGNITO_HOST`/CSP.
- Jobs usa `JobsPage.jsx`, `JobDetailPage.jsx`, `jobsData.js` y estilos desde `v3Shells.css:305+`. Los tamaños de meta, fechas, badges y textos son actualmente demasiado pequeños (`0.5625–0.875rem`); los iconos deben medirse visualmente en navegador, no corregirse solo por CSS leído.
- `index.html` carga `/favicon.svg`; la siguiente ejecución debe evaluar el icono aislado a 16/32 px y la pestaña real, sustituyéndolo por una versión simplificada/escalada del logo si no es legible.

## Decisiones de producto fijadas para esta ejecución

1. Copy paso 02 ES: “Resuelve desafíos interactivos y sus señales conductuales se procesan localmente.” EN: “Completes interactive challenges and behavioral signals are processed locally.”
2. `/portal` absorbe la elección de acceso. Landing no muestra cards “¿Dónde quieres ingresar?” ni conserva `#accesos`.
3. El CTA superior será “Solicitar demo” secundario/outline junto al CTA de sesión, visible desktop y móvil sin competir con el H1; CTA principal repetido en el cierre lleva a la misma ruta.
4. La solicitud de demo tendrá ruta `/solicitar-demo`, no modal ni `mailto:`. Campos mínimos: nombre, empresa, email corporativo, rol, tamaño de equipo (rango), objetivo/uso previsto y consentimiento de contacto. No solicitar CVs, información de candidatos ni biometría.
5. Solicitudes se persisten en DynamoDB y generan aviso SES al buzón configurado por infraestructura; la respuesta cliente no revela direcciones internas ni IDs de correo. Rate limit y audit con minimización de PII obligatorios.
6. El Hosted UI seguirá siendo Cognito, pero se migrará a `acceso.krumm.cl` solo después de validación staging y de que ACM/DNS estén listos. No usar un proxy que capture credenciales.
7. Las ofertas siguen siendo demo y deben indicarlo honestamente hasta integrar ATS/solicitud real. No inventar empresa contratante, renta, fechas vigentes o beneficios como hechos reales.
8. El favicon será una versión SVG simplificada del logo de KRUMM, legible a 16 px y 32 px; no se reutilizará una imagen raster grande ni se alterará el logo de navegación.

## Fase A — Baseline visual y diagnóstico de autenticación

### Task 1: Capturar baseline reproducible de las rutas afectadas

**Files:**
- Read: `src/landing/LandingPage.jsx`, `src/landing/landing.css`
- Read: `src/v3/V3RootApp.jsx`, `src/v3/v3Shells.css`, `src/v3/JobsPage.jsx`, `src/v3/JobDetailPage.jsx`
- Create: `docs/qa/landing-company-jobs-2026-09-15/baseline.md`
- Create: `scripts/smoke-landing-company-jobs-2026-09-15.mjs`

1. Añadir smoke Playwright con capturas 1440×900, 1280×720 y 390×844 para `/`, `/portal`, `/empresa/acceso`, `/empleos` y un detalle activo.
2. Registrar overflow horizontal, tamaños computados de iconos/tipografía de jobs, foco visible, contrastes de CTAs y errores de consola.
3. Ejecutar el script contra stage y build local; guardar rutas de evidencias, no datos de sesión.
4. Commit: `test(qa): baseline landing company and jobs UX`.

### Task 2: Reproducir y clasificar el rebote post-login

**Files:**
- Read/modify: `src/v3/cognitoAuth.js:151-283`
- Read/modify: `src/v3/useCompanyData.js:50-127`
- Modify: `src/v3/CompanyLogin.test.jsx`
- Modify: `src/v3/CompanyDataAuth.test.jsx`
- Create: `scripts/smoke-company-login-callback-2026-09-15.mjs`

1. Añadir tests RED para: callback exitoso conserva tokens y navega una sola vez a `/empresa`; `GET /sessions` autenticado usa el access token; 401/403 muestra error de sesión accionable, no rebota silenciosamente.
2. Usar cuenta QA aprobada y navegador real en stage/prod para registrar: URL de callback, almacenamiento de sesión, claims relevantes sin imprimir token, status de `/sessions`, navegación final y console errors.
3. Inspeccionar CloudWatch/API Gateway sólo con datos agregados/códigos de error. Determinar si la causa es: redirect URI/origen, PKCE exchange, token audience/issuer, grupo Cognito, claim `custom:companyId`, API `/prod` o el hook `useCompanyData`.
4. Aplicar la corrección mínima basada en evidencia; el estado de error debe conservar “reintentar login” y no revelar detalles sensibles.
5. Validar login → `/empresa` → dashboard/procesos → logout; desktop y móvil. Commit separado: `fix(auth): preserve company session after Cognito callback`.

## Fase B — Landing y flujo de solicitud de demo

### Task 3: Ajustar solo el paso 02 y retirar el selector de accesos de landing

**Files:**
- Modify: `src/landing/LandingPage.jsx:124-146, 190-203, 242-247, 310-341, 343-365`
- Modify: `src/landing/LandingPage.test.jsx`
- Modify: `src/landing/landing.css` (eliminar reglas exclusivas de `.landing__accesos*` si quedan sin uso)
- Read/verify: `src/v3/V3RootApp.jsx:80-116` (`/portal`)

1. Cambiar el copy ES/EN del paso 02 según decisión fijada.
2. Quitar completamente `#accesos`; cambiar “Iniciar sesión” de header a `/portal` y mantener `/portal` como selector claro y accesible.
3. Añadir el CTA “Solicitar demo” en header como variante outline/compacta, preservando jerarquía: candidato sigue CTA hero principal; demo no debe superar visualmente el CTA de acceso relevante.
4. Cambiar el CTA de cierre a `/solicitar-demo`.
5. Actualizar tests: no existe heading “¿Dónde quieres ingresar?” en landing; header navega a `/portal`; ambos CTAs demo navegan a `/solicitar-demo`; copy ES/EN exacto.
6. Ejecutar RED→GREEN, smoke móvil/desktop y contraste. Commit: `feat(landing): streamline access and demo conversion`.

### Task 3.1: Reemplazar favicon por un icono escalado del logo

**Files:**
- Read/modify: `public/favicon.svg`
- Read/verify: `index.html`
- Modify/create: `src/landing/LandingPage.test.jsx` o un test/fixture focal de favicon
- Extend: `scripts/smoke-landing-company-jobs-2026-09-15.mjs`

1. Capturar el favicon actual aislado a 16×16 y 32×32 y comprobar la pestaña/navegador real; no asumir que el SVG es legible por el source.
2. Derivar un SVG de silueta simple desde el logo oficial `public/assets/krumm-logo-borderless-no-text.webp`/referencia de marca: sin texto, sin detalles finos, con contraste suficiente sobre light/dark browser chrome.
3. Mantener `viewBox`, dimensiones intrínsecas y `theme-color`; no cambiar el logo principal de landing ni introducir un asset raster como favicon.
4. Añadir prueba que asegure que `index.html` apunta a `/favicon.svg` y smoke HTTP/browser que compruebe 200 + renderizado legible en ambos tamaños.
5. Comprobar caché CloudFront: los assets públicos requieren invalidación/versionado coherente; verificar stage antes de producción.
6. Commit: `fix(brand): improve tab favicon legibility`.

### Task 4: Diseñar el contrato backend de solicitud de demo

**Files:**
- Create: `backend/src/handlers/demoRequests.mjs`
- Create: `backend/src/db/demoRequestsRepository.mjs`
- Create: `backend/test/demoRequests.handlers.test.mjs`
- Modify: `backend/src/index.mjs`
- Modify: `infra/m2-backend-stack.yaml`
- Create: `docs/api/demo-requests.md`

1. Definir POST `/demo-requests`, público, con body permitido exacto: `name`, `workEmail`, `company`, `role`, `teamSize`, `useCase`, `contactConsent`.
2. Rechazar campos extra, emails inválidos, consentimiento ausente y payloads grandes. No guardar IP, query strings, tokens, CVs o datos de candidatos.
3. Crear tabla DynamoDB `krumm-staging-demo-requests` con TTL/retención documentada, PK aleatoria, PII mínima y cifrado por defecto; no exponer Scan/List público.
4. Reusar el patrón SES existente para aviso interno best-effort; configurar destinatario mediante parámetro NoEcho o variable de infraestructura, nunca hardcodear email en frontend.
5. Integrar rate limit específico y audit sin PII cruda.
6. Tests RED→GREEN: 201 válido; 400/422 inválidos; no persiste campos prohibidos; fallo SES no expone error ni impide persistencia; rate limit.
7. `sam validate`, tests backend focales, deploy staging con aprobación de la sesión de ejecución y smoke HTTP. Commit: `feat(demo): add privacy-safe demo request endpoint`.

### Task 5: Crear ruta y formulario público `/solicitar-demo`

**Files:**
- Modify: `src/v3/v3Routes.js`, `src/v3/V3RootApp.jsx`, `src/v3/v3Copy.js`
- Create: `src/v3/DemoRequestPage.jsx`
- Create: `src/v3/DemoRequestPage.test.jsx`
- Modify: `src/v3/v3Shells.css`
- Modify: `src/analytics/analytics.js` sólo si existe evento consentido y sin PII

1. Añadir ruta bare pública, encabezado de marca, intro breve, formulario de una columna y estado de éxito sin email interno.
2. Deshabilitar submit mientras envía; mostrar errores por campo, mensaje de disponibilidad y alternativa `soporte@krumm.cl` para incidencias técnicas.
3. Enviar sólo el body permitido al endpoint; nunca meter valores del formulario en PostHog/Sentry/URL.
4. Añadir tests de validación, submit exitoso, error de red y ausencia de PII en analytics context.
5. Smoke real de flujo landing → formulario → confirmación contra stage con solicitud QA claramente identificada y eliminada/TTL documentado si corresponde.
6. Commit: `feat(demo): add public demo request form`.

## Fase C — Portal empresa y Hosted UI de marca

### Task 6: Reordenar y centrar `/empresa/acceso`

**Files:**
- Modify: `src/v3/V3RootApp.jsx:181-228`
- Modify: `src/v3/v3Shells.css` (bloques `.v3-company-login*`)
- Modify: `src/v3/v3Copy.js`
- Modify: `src/v3/CompanyLogin.test.jsx`, `src/v3/V3Shells.test.jsx`

1. Dejar un bloque central único: eyebrow, título, texto, botón primario “Iniciar sesión”, divisor/ayuda y “Explorar demo de empresas” como enlace secundario debajo, no a su lado.
2. Asegurar ancho legible, altura táctil ≥44 px, orden de tab correcto, foco, responsive 390 px y estados busy/error/logout.
3. Ajustar copy para explicar que demo no requiere cuenta y que login lleva al espacio privado.
4. Añadir pruebas de orden DOM/roles y smoke visual. Commit: `feat(company): refine login hierarchy and demo access`.

### Task 7: Preparar dominio Cognito de marca sin romper PKCE

**Files:**
- Modify: `infra/m2-backend-stack.yaml` o stack Cognito canónico identificado durante la ejecución
- Modify: `src/v3/cognitoAuth.js` sólo para consumir host desde `VITE_KRUMM_COGNITO_HOST`
- Modify: workflows CD que inyecten esa variable
- Modify: `docs/ops/environments.md`, `docs/ops/auth-custom-domain.md`
- Modify: CSP/RHP CloudFront si `connect-src` requiere el nuevo origen

1. Verificar dominio elegido disponible (`acceso.krumm.cl` recomendado), certificado ACM válido en `us-east-1` y ownership DNS Cloudflare.
2. Crear dominio Cognito custom, asociar certificado, esperar estado ACTIVE y crear CNAME/alias según Cloudflare.
3. Preservar cliente SPA completo en toda mutación Cognito (`describe → full payload → update → describe`): OAuth code, PKCE, callbacks stage/prod, logout, scopes, provider COGNITO, flujos y `custom:companyId` readable.
4. Configurar stage primero con `VITE_KRUMM_COGNITO_HOST=acceso-stage.krumm.cl` o dominio definitivo validado; actualizar CSP; probar authorize/token/logout/callback real.
5. Sólo con evidencia stage verde, propagar a prod en una sesión con aprobación explícita. El usuario nunca debe ver ni copiar el URL de AWS salvo fallback técnico.
6. Commit infraestructura/documentación separado: `feat(auth): use branded Cognito domain`.

## Fase D — Bolsa de empleos: contenido honesto y UI legible

### Task 8: Normalizar modelo de datos y copy de empleos demo

**Files:**
- Modify: `src/v3/jobsData.js`
- Modify: `src/v3/JobsBoard.test.jsx`
- Modify: `src/v3/v3Copy.js`

1. Auditar cada oferta por información que pueda parecer una vacante real no verificada (empresa, renta, beneficios, fechas, ubicación y CTA).
2. Elegir una de dos presentaciones explícitas: catálogo demostrativo de roles o estado vacío honesto hasta conectarse a ATS. No mezclar “oferta activa” con CTA deshabilitado ambiguo.
3. Añadir etiqueta visible “Ejemplo de rol”/“Catálogo de demostración” si se conserva contenido; cambiar “Postular (próxima iteración)” por un CTA informativo no engañoso.
4. Actualizar pruebas de ES/EN, estados active/paused/closed y accesibilidad. Commit: `docs/jobs): make job board content explicitly demonstrative`.

### Task 9: Corregir escala, ritmo y responsive de jobs

**Files:**
- Modify: `src/v3/v3Shells.css:305-660` y media queries relacionadas
- Modify: `src/v3/JobsBoard.test.jsx`
- Extend: `scripts/smoke-landing-company-jobs-2026-09-15.mjs`

1. Medir UI baseline antes de tocar CSS: iconos, title/meta/body/date, badges y CTAs en 1440/1280/390.
2. Aumentar jerarquía de texto de meta/fecha/badge a tamaños legibles, reducir iconos decorativos que dominen la composición y alinear iconos con el baseline de texto.
3. Limitar line length, evitar truncado abrupto de descripción, asegurar footer de card no colisiona y evitar buttons deshabilitados con apariencia de CTA principal.
4. Ajustar job detail: hero/meta compacto, secciones escaneables, listas sin cajas excesivas, footer y CTA coherentes; no usar tamaños inferiores a 12 px para texto informativo.
5. Ejecutar browser smoke con screenshots y assertions de: sin overflow, iconos dentro del rango definido, CTAs legibles, console limpia y navegación lista→detalle→lista.
6. Commit: `fix(jobs): improve content hierarchy and responsive readability`.

## Fase E — Validación, documentación y handoff

### Task 10: Ejecutar gates completos y actualizar estado

**Files:**
- Modify: `AGENTS.md`
- Modify: `docs/ops/environments.md`, `docs/ops/auth-custom-domain.md` si aplica
- Modify: plan con estado de fases

1. Ejecutar los subconjuntos Vitest de landing, V3 routes/shells, CompanyLogin, CompanyDataAuth y JobsBoard.
2. Ejecutar `NODE_ENV=production npm run build`, `npm run oxlint` o el comando CI equivalente, `git diff --check` y smoke Playwright local/stage.
3. Verificar CI/CD tras push y, si hay backend/infra, SAM stack, endpoint de demo y Cognito custom domain por lectura posterior.
4. Actualizar `AGENTS.md` sin registrar secretos: estado de dominio, login E2E, endpoint demo, restricciones de contenido demo y resultado visual jobs.
5. Actualizar Linear/Kanban: crear subtareas separadas para landing/formulario, auth redirect/domain y jobs UX; cerrar sólo con evidencia. Lighthouse queda fuera de este changeset.
6. Commit final de docs/handoff sólo después de que todos los gates pasen.

## Riesgos y límites

- Crear formulario que “nos llegue” requiere decidir destinatario/configuración SES y retención de PII. No implementar mailto oculto ni hardcodear email.
- Dominio Cognito requiere DNS/ACM y puede afectar stage/prod; no cambiar `update_user_pool_client` parcialmente.
- El rebote de login no debe parchearse a ciegas: puede ser un 401/403 de backend, grupo Cognito o configuración de audiencia.
- La bolsa de empleos no debe simular vacantes reales. Mantener datos demo explícitos hasta ATS o una fuente editorial aprobada.
- No desplegar producción, tocar secretos, cambiar Cloudflare ni lanzar GPU sin autorización explícita durante la implementación.

## Handoff para nueva sesión

```text
Implementa el plan `.hermes/plans/2026-09-15_143355-landing-company-jobs-demo-auth.md` en `/home/sarlock/krumm/test-mpfl`.

Primero reproduce visualmente landing, favicon 16/32 px, /empresa/acceso, callback Cognito, /empresa, /empleos y un detalle en navegador real; no asumas causas del rebote de login. En “Cómo funciona” cambia únicamente el punto 02: no reescribas el resto de esa sección. Trabaja por fases y commits pequeños. Usa TDD, mantén contenido demo honesto y no agregues PII a analytics/logs. El formulario de demo necesita endpoint backend + DDB + SES con retención/documentación; no uses mailto ni hardcodes destinatarios. Para Cognito custom domain, despliega stage antes de producción y conserva el payload completo del cliente Cognito al actualizarlo. No desplegues producción ni modifiques DNS/secretos sin aprobación explícita. Ejecuta tests focales, build, smoke visual desktop/móvil, CI/CD y actualiza AGENTS.md/Linear/Kanban al cierre.
```
