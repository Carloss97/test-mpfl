# Handoff — cierre t_f40921bf (stage móvil) + despacho t_42978412 (copy ES-only)

Fecha: 2026-09-07 ~20:07 -03 · Orquestador (cron krumm-dispatcher)

## t_f40921bf — Fix stage móvil (cap $CERRADA, era `done` sin commitear)

- Card `t_f40921bf` marcada `done` 18:15 pero su código quedó **sin commitear**
  (HEAD seguía en 04e1291, docs 17:24). Gap de milestone-sync detectado y cerrado.
- Commit **`0b89a4b`** (push main, 24 archivos):
  - `PostulationGameStage.jsx` + test: `getPostulationGameViewport` sin piso duro
    500px — canvas compacto sigue ancho real del contenedor (helper
    `getStageContentWidth`, chrome-aware shell 18/10px por breakpoint @520,
    border 1px, stage padding `clamp(12px,2vw,22px)`); tope 620, piso jugable 240.
  - `GoNoGoTask.jsx` / `ColorInterferenceTask.jsx` + tests: reciben `width` del
    stage (antes hardcodeaban 520px en `.task-area` y se recortaban).
  - `docs/qa/h3-language-toggle.md`: hallazgo marcado RESUELTO.
  - `scripts/smoke-t_f40921bf-stage-mobile.mjs` + 16 capturas en
    `docs/qa/h3-language-toggle/t_f40921bf-*.png`.
- Gates: suite 711 tests + build + oxlint + `git diff --check` verdes; walkthrough
  vivo 390×844 + 320×700 sin recorte, blancos alcanzables.
- Kanban: comentario de cierre en t_f40921bf.
- Linear: **KRU-83** → Done, asignada a Carlos Saldivia, comentario de cierre con
  commit y evidencia.

## t_42978412 — Copy juegos batería stable_dg sin EN (EN activo → ES-only en stage)
- READY (única). Despachada por el orquestador: set-model `qwen-model` +
  assign `default` + dispatch → **run #86** (PID 499163) en ejecución.
- GPU Lambda `13823254880549…` (68.209.72.141) activa; túnel 18000 health OK
  (modo manual, NO apagar).
- Linear KRU-85 queda Backlog hasta cierre del worker.

## Siguiente (orden)
1. Worker run #86 completa t_42978412 → milestone-sync (commit, kanban, KRU-85 Done).
2. Fase v3 de vistas: tales V0–V5 (`t_1c27edbf`…) creadas (todo) — ver
   `docs/plans/2026-09-07-plan-fase-vistas-v3.md`.
3. EXP-7 BOMB: cards B1–B6 (`t_ee587ad1`…) todo, no trabajar (R-7B/Exp 7).