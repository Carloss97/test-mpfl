# Handoff — H4.3/H4.4: flujo candidato + /reclutador sobre design system (2026-09-07)

## Hito
Kanban `t_36dd7011` (done 13:25 -03, run 79). Flujo candidato (landing interna, guard,
setup, stage, reporte) y portal `/reclutador` reconstruidos sobre el design system `--k-*`.

## Evidencia
- Commit `02f0573` (pushed a origin/main; HEAD == @{u}, tree limpio).
- Spec `PostulationFlowDesignSystem.test.jsx` (16 tests); suite **689/689**;
  build 8.96s; oxlint 0 errores (1 warning preexistente ajeno).
- Smoke `scripts/smoke-h43-flow-design-system.mjs`: 12 vistas 1280×720/390×844,
  0 fallos / 0 console errors; shots en `docs/qa/h43-flow-design-system/`.
- Pill light ES/EN alineado a §6 (base espresso cálida, activo = subrayado, focus
  terracota 3px); cero indigo en vistas de flujo; docs `design-system.md` §3/§6/§9
  sincronizados.

## Trackers
- Kanban: `t_36dd7011` done; comentario de cierre con notas para H4.5 en la propia card.
- Linear: `KRU-80` In Progress (comentario de avance 2026-09-07) — queda abierta hasta
  H4.5 + audit/deploy.

## Secuencia / siguiente
1. **H4.5** `t_5d775c9a` (running): tokens `--k-*` en secciones de juegos. NOTAS de la
   card H4.3 (13:24): `krumm-tokens.css` pill cambió (no tocar reglas del pill);
   secciones de juegos quedaron intactas; variables `--postulation-game-*` quedan como
   ancla; smoke propio sin esperar "Juego 1 de 5" (4 juegos visibles; simple_rt oculto).
2. **Deploy/audit** `t_be89dafb` (todo): audit visual + deploy al cerrar H4.5.
3. Fixes ready independientes: `t_f40921bf` (stage móvil canvas), `t_24a0e428` (copy HR),
   `t_42978412` (copy juegos ES-only).

## Entorno
- AWS SSO renovado 12:18 (token ~11h). GPU: modo manual AUTO-OFF (watchdog no apaga solo).
- Linear API: 401 transitorio posible — reintentar antes de reportar clave rota.
