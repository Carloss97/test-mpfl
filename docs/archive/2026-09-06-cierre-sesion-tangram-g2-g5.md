# Handoff cierre — Sesión 2026-09-04 / 2026-09-06 (cierre consolidado)

**Fecha:** 2026-09-06
**Estado:** cierre consistente con git tree limpio, 597/597 tests verdes, build OK, deploy CloudFront activo.

## Hecho en esta sesión (veloz/contexto fragmentado)

- **Plan:** `docs/plans/2026-09-04-tangram-exp001-implementation-plan.md` — plan de Tangram + G.2/G.5
- **GPU Lambda 2x H100:** levantada (`7c8c9b66cfd5..`, health OK), luego el watchdog la tomó (ver `~/.hermes/gpu_state.json`)
- **Kanban:** G.2 (`t_3b6b256d`), G.5 (`t_94368e05`), Exp 6 Tangram (`t_6e8655c1`) → **completed**
- **Linear:** KRU-66 (G.2), KRU-67 (G.5), KRU-60 (Exp 6) → **Done**
- **GitHub:** push pendiente — el usuario no autorizó explícitamente `git push` en esta sesión. **No pulsear sin confirmación.**

## Estado real del repo (ya estaba commiteado en sesiones anteriores)

Las siguientes cosas ya estaban commiteadas en los commits `f44a7e4..eadceff`:
- Tangram completo (`src/tasks/original-games/tangram*.js` y `tangram*.test.js`) + `TangramPostulationTask.jsx` integrado al PostulationGameStage, fixture, feature vector `v2.1.0` (añade `tangram.*` 9 features), talent mapping (composite `planning` blend P+TG).
- G.2 práctica sin puntaje (`src/postulation-demo/originalGamePractice.js` + tests).
- G.5 teclado/breakpoints/foco (`gameKeyboard.js`, `gameClock.js`, `moveGridFocus`).
- Landing pública mejorada (`src/landing/LandingPage.jsx`, `landing.css`).
- Version bump `featureDefinitionsVersion: '2.1.0'`.
- Suite focal verde: tangram (40 tests), feature vector, talent mapping, blueprint, config, fixture — 23 archivos, 597 tests total.

- Suite completa: `NODE_ENV=test npx vitest run --pool=threads` → **114 archivos / 597 tests / 0 fallos** (325s).
- `npm run build`: OK (bundle `index-B5uluMtM.js`).
- Live demo: `https://d3citl7gomy2ql.cloudfront.net/postulaciones-demo?battery=original` (deploy con Tangram incluido).

## Pendiente para próxima sesión

- **Exp 7 y 8** (`t_f1ea699b`, `t_da93ee8f`; Linear KRU-61, KRU-62) — pendientes de implementación.
- **T.3** — sanity empírico con cámara (requiere hardware físico; t_cb36be49 sigue blocked).
- **Git push** — autorización explícita pendiente.
- **AWS SSO** — el token sigue vigente (~2026-09-06 arbitraria), refrescar con `aws sso login --sso-session aws_sso --use-device-code` antes de cualquier deploy adicional.
- **Gateway Hermes** — `hermes update` + `hermes gateway restart` para limpiar el warning de módulos mixtos (gateway sigue con pre-update en memoria).

## Reglas duras (recordatorio)

- No commit/push sin instrucción explícita.
- Tests con `NODE_ENV=test`; build con `npm run build`; lint `npx oxlint`.
- Persistencia aggregate-only; nunca raw pointer/frames/landmarks/keypoints/sequences.
- GPU costo vivo (~$6.38/h) — apagar al finalizar si la tarea no lo requiere.

---