# F.2 — Dashboard de métricas de producto (KRUMM)

> Propósito: métricas de **producto y negocio** (funnel, conversión, tiempo por
> juego, NPS, retención de reclutadores) para la búsqueda de inversión.
> **Distinct** del dashboard científico de validación (ese vive en
> `docs/assessment/` y en el notebook de correlación — no se mezclan).
>
> Herramienta: **PostHog** (proyecto `607324`, US Cloud). Acceso:
> <https://us.posthog.com/project/607324> (cuenta del fundador).

## 1. Catálogo de eventos

### Frontend (posthog-js variante `no-external`, opt-in con consentimiento)
Emisión solo con: key en el build (CD) **y** consentimiento
(`cookie_consent=analytics`, 1 año) **y** ruta permitida.

| Evento | Dónde | Propiedades | Nota |
|---|---|---|---|
| `$pageview` | Rutas permitidas (landing, /empresa, /dev… no: /postulaciones, /dev/*) | `path` | Vía `capture('$pageview')` (F.1) |
| `consent_accepted` | Banner "Aceptar analytics" (primera visita) | — | Whitelist (ruta excluida) |
| `invite_opened` | /postulaciones al abrir la invitación | — | Whitelist (ruta excluida) |
| `game_N_completed` | Fin de cada juego (N=1..7) | `game_id`, `game_index`, `practice`, `duration_s` | **F.2**: `duration_s` = tiempo de partida (reloj en PostulationGameStage, se reinicia por juego). Métrica agregada, sin PII |
| `report_viewed` | Reporte del candidato y reporte del reclutador | `viewer` (`candidate`/`recruiter`) | |
| `recruiter_login` | Login Cognito exitoso (empresa) | — | Base de retención semanal |
| `export_downloaded` | Descarga de reporte/bundle (empresa) | `format` | |
| `nps_submitted` | **F.2**: encuesta opcional 1-10 al final del reporte del candidato | `score` | Solo el score. No se muestra en fixture/demo sintética (no contamina la métrica). Sin respuesta = no hay evento (opcional por diseño) |

### Server-side (Lambda backend → `POST us.posthog.com/capture/`)

| Evento | Dónde | Propiedades | Nota |
|---|---|---|---|
| `invite_received` | **F.2**: al enviar el email de invitación (SES `sent=true`) | `language` | `distinct_id` fijo `krumm-backend` (identidad de servicio). Sin PII: el email del candidato **nunca** viaja. Key de proyecto vía parámetro CFN `PosthogKey` (NoEcho). Best-effort: PostHog caído no afecta la API |

### Qué NUNCA sale (contrato de privacidad — ver `docs/legal/politica-privacidad.md`)
Biométricos (landmarks/blendshapes/gaze/posture), contenido de respuestas,
trayectorias de puntero, tokens de invitación, emails/nombres/teléfonos.
Doble barrera: (1) whitelist de eventos en rutas excluidas, (2) scrubber de
propiedades (patrón de claves prohibidas + truncado 120) en cliente y server.
Además la variante `no-external` hace **imposible por construcción** el
session replay/surveys de PostHog (aunque el proyecto los tenga activados
server-side).

## 2. Insights a configurar en PostHog (proyecto 607324)

1. **Funnel de candidato** (per-anónimo, el que pide el inversor):
   `invite_opened → consent_accepted → game_1_completed → game_2_completed →
   … → game_7_completed → report_viewed (viewer=candidate)`.
   Da conversión y **drop-off por paso** directamente.
2. **Volumen de invitaciones**: Tendencia de `invite_received` (distinct
   `krumm-backend`).
   ⚠️ *Límite honesto (documentado)*: `invite_received` vive en el server y
   `invite_opened` en el navegador con `distinct_id` distinto → el funnel
   cruzado server→cliente **no** encadena por candidato. Para la beta
   (2 empresas, volúmenes pequeños) se reportan como dos series:
   invitaciones enviadas vs. candidados que abrieron/completaron.
3. **Tiempo por juego** (F.2): por evento `game_N_completed`, estadísticos de
   `duration_s` (p50/p95). En PostHog: insight "Trend" + "Group by" sobre
   `game_id`, o SQL en Data → `SELECT quantile(p50), quantile(0.95) FROM
   events properties duration_s WHERE event = 'game_3_completed'`.
4. **NPS** (F.2): promedio de `nps_submitted.properties.score` + volumen de
   respuestas (tasa de respuesta = nps_submitted / report_viewed).
5. **Retención de reclutadores**: Retention weekly sobre
   `recruiter_login` (logins/semana por distinct_id anónimo).
6. **Conversión global (para el pitch)**: report_viewed(candidate) /
   invite_received (ratio enviadas→completadas, con la salvedad del ítem 2).

## 3. Rutina semanal (heartbeat)

- Screenshot de cada insight (1–6) → adjuntar a la tarjeta kanban de
  heartbeat `t_88701e67` (o el corazón de ops vigente).
- Revisar en PostHog → Settings que **session recording / heatmaps /
  dead-clicks sigan OFF** a nivel de proyecto (la variante no-external ya los
  anula en cliente, pero mantenerlos off server-side cierra la puerta a
  futuros re-integrations).
- Si un insight está vacío >2 semanas con tráfico beta real → revisar
  `docs/beta/beta-onboarding-runbook.md` §analytics y el smoke
  `scripts/smoke-f1-posthog-2026-09-13.mjs`.

## 4. Ops y credenciales

- **Key de proyecto** (`phc_…`, pública por diseño: viaja en el bundle):
  - Frontend: GH secret `POSTHOG_PROJECT_API_KEY` → `VITE_POSTHOG_API` en CD.
  - Backend: parámetro CFN `PosthogKey` (NoEcho) del stack m2 → env
    `POSTHOG_API_KEY` en Lambda. Vacío = sin eventos (no-op seguro).
  - Rotar la key → actualizar GH secret **y** `sam deploy --parameter-overrides
    PosthogKey=…` **y** push de rebuild (CD).
- **Key personal** (`phx_…`, cuenta del fundador, solo REST API de PostHog):
  vive en `~/.hermes/.env` (`POSTHOG_PERSONAL_API_KEY`). Sirve para consultas
  de datos server-side (insights por API), **no** para `/capture/` (PostHog la
  rechaza ahí). Rotada/recomendada: quedó expuesta en chat (2026-09-13).
  ⚠️ El egress de la Pi hacia la API REST de PostHog con credenciales está
  filtrado (401) — las consultas por API se hacen desde la cuenta del usuario.
- **Endpoint de ingesting**: `us.i.posthog.com/e/` (gzip) para el cliente;
  `us.posthog.com/capture/` para el server (body-auth). Host configurable
  (`VITE_POSTHOG_HOST` / `POSTHOG_API_HOST`) para una futura migración a EU
  (`app.eu.posthog.com` + `eu.i.posthog.com`).
- **E2E headless**: posthog-js 2025+ filtra bots por `navigator.webdriver` +
  UA → el smoke corre con `webdriver=false` y UA normal. Afecta solo
  automatización; usuarios reales sin impacto.
- **Apagar analytics por completo**: borrar el GH secret y redeploy (build sin
  key → ni siquiera se empaqueta posthog-js, por DCE).
- **Verificación en vivo**: `node scripts/smoke-f1-posthog-2026-09-13.mjs`
  (requiere stage con analytics activo; decodifica el payload gzip real).

## 5. Estado

- F.1 (frontend + CSP m6): **verificado live 2026-09-13** (commit a43a8f9;
  KRU-118 Done).
- F.2 (este doc): `invite_received` server + `duration_s` + NPS implementados
  (2026-09-13). Pendiente de configurar: los insights 1–6 en el dashboard
  (acción del usuario — cuenta PostHog) y la primera rutina semanal.
