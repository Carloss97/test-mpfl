# Handoff 2026-09-07 — sign-off H1 / H2+H3 desbloqueados / P0 Tangram

**Fecha:** 2026-09-07 ~02:20 -03 · **Autor:** Hermes (sesión CLI, perfil default)
**Repo:** `/home/sarlock/krumm/test-mpfl` (main → `Carloss97/test-mpfl`)

## 1. Qué pasó (contexto para quien retoma)

1. **Blocker reportado por el dispatcher** (browser "clavado" + 401) fue diagnosticado:
   - Chromium orphan (pid 86072, desde Sep 03) clavado en la página SSO device-code
     (BXCR-WPZX) de un login que YA HABÍA TENIDO ÉXITO. AWS SSO CLI siempre sana
     (`aws sts get-caller-identity` OK, admin-carlos @ 931932531447). No había revisión
     de SSO pendiente del usuario. Eliminado (kill por pid).
   - El "WS 401" era del **browser compartido Firecrawl cloud**: sesiones con TTL ~300 s
     absolutos por sesión; al expirar, el daemon se reconecta con URL stale → 401.
     Recuperación: nueva sesión (named) crea browser nuevo.
2. **H1 se completó con dos runs en paralelo:**
   - Worker del dispatcher (Vite dev 127.0.0.1:5173): audit final, commit `f280a28`,
     hallazgos R1/R2/R3(P0)/R4, G1-P01 cerrado, pérdida de foco PASS.
   - Run de corroboración de esta sesión (**krumm.cl producción**, 01:08–02:05 -03):
     5 juegos completados en vivo (laser 3/3, balloon 8/8, passenger 3/3, team 4/4,
     tangram tutorial 2/2), 0 errores de consola, 0 overflow en desktop 1280×720 y
     móvil 390×844, **R3.2 (skip L1) reproducido en vivo en producción**, contramedición
     R1 (8 tags 129×22 px, 0 solapes en producción → el solape es dependiente de
     métricas de fuente/render; la incidencia del usuario sigue siendo válida).
3. **Sign-off:** el usuario aprobó el baseline (02:20 -03) → H2/H3 desbloqueados y
   priorizó el fix P0 de Tangram.

## 2. Estado de tarjetas (kanban)

| Card | Título | Estado (post-handoff) |
|---|---|---|
| `t_7dc53516` | H1: Audit por vista/sección | **DONE + sign-off aprobado** |
| `t_58def568` | P0: Tangram fix (niveles irresolubles + skip L1 + hang timeout) | **RUNNING** (al completar: verificar gates + commit/push) |
| `t_ab493add` | H2: Quitar sección 'qué pasa detrás' + indicador de error de señal discreto (setup + 5 juegos) | **READY** (unblocked) |
| `t_61613539` | H3: Toggle idioma ES/EN en flujo candidato + portal reclutador | **READY** (unblocked) |
| `t_9e3506b6` | Fix: badge 'SCORE PROVISIONAL' (R1) | READY — ventana H2/H3 |
| `t_c1892485` | T.3b: Ajuste de sensibilidades pipeline biométrico | READY (NEVER_HEAVY: cámara/hardware) |

**Secuenciación:** H2 tras el merge de `t_58def568` (H2 toca los 5 juegos; evitar
contención del working tree). H3 es independiente en archivos (headers/i18n) pero
comparte el tree: **un worker a la vez en este repo** (lección del stash-incident
23:42/00:20 de 2026-09-07: 3 workers en paralelo → WIP en 2 stashes).

## 3. Entorno

- **Producción:** krumm.cl = CloudFront `EDQ39PDNI931R`, bucket
  `krumm-staging-frontend-931932531447`, rutas `/`, `/postulaciones`, `/reclutador`.
  El build prod va 2 commits H4.1 detrás de main (tokens `--k-*` aditivos — sin diff
  visual). Deploy: `scripts/deploy-frontend.sh`.
- **API staging:** `rwm08ik23m.execute-api.us-east-1.amazonaws.com/staging` (OK en vivo;
  guard 404 en tokens inválidos verificado).
- **AWS SSO:** sano; refresco si expira:
  `aws sso login --sso-session aws_sso --use-device-code`.
- **Browser (Hermes):** backend Firecrawl cloud — TTL ~300 s absoluto por sesión;
  usar sesiones **named** para aislar; `js()` tiene IPC timeout 5 s (hacer largos
  esperas con async in-page corto + polls desde Python); tabs en background throttlean
  timers (y el hang de tangram R3.3 es bug real de la app, no throttle).
- **GPU Lambda:** sin tocar (toggle solo por instrucción explícita; watchdog activo).

## 4. Artefactos

- `docs/design/view-audit-2026-09-07.md` — audit final + adenda contramedición R1 +
  sección de sign-off resuelta.
- `docs/qa/c1-audit-shots/` — 22 capturas del run del worker + 15 del run paralelo de
  producción (provenencia documentada en el audit).
- Stash del tree: intactos `stash@{0}` (WIP H4.2/4.3/4.5) y `stash@{1}` (tokenización
  H4.3/4.5) — revisar al tocar H4 (no confundir con el fix P0).

## 5. Siguiente (orden)

1. **Verificar `t_58def568` al completar:** gates de AGENTS.md
   (`NODE_ENV=test npx vitest run` focal + full, `npx oxlint src/...`, `npm run build`,
   `git diff --check`) + commit/push. Aceptar: (a) match bandeja↔slots, (b) `levelOutcome`
   limpio al entrar a evaluación, (c) `finishLevel('timeout')` a 0, (d) `moveLimit ≥
   pieceCount` L2/L4, (e) tests de componente de la fase evaluativa.
2. **Despachar H2** (tras el paso 1), luego **H3**.
3. Fix R1 (`t_9e3506b6`) en la ventana H2/H3 (validar ES/EN).
4. (Opcional) re-check manual de 10 s de pérdida de foco en dispositivo real.
5. Deploy prod (`scripts/deploy-frontend.sh`) cuando H2/H3 (+fix R1) cierren — la batería
   original no es demo-able de punta a punta hasta que `t_58def568` esté merged.
