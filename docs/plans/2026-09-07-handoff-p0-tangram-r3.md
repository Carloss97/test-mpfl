# Handoff — P0 Tangram (R3) cerrado · 2026-09-07 02:47 -03

## Estado
- **Kanban:** `t_58def568` → **done** (run #58, 3549s, 2026-09-07 01:43→02:42).
- **Linear:** KRU-81 → **Done**, asignada Carlos Saldivia, comentario de cierre añadido.
- **Repo:** commit `96e3b4d` `fix(tangram R3): módulos evaluativos resolubles + sin skip L1 + salida por timeout + moveLimit>=pieceCount + R4 teclado` ya pusheado (HEAD == @{u}).

## Evidencia
- Suite `NODE_ENV=test npx vitest run` → **117 archivos / 621 tests verde**; oxlint limpio; `vite build` OK; `git diff --check` OK.
- 2 recorridos vivos (Vite dev + Chromium real) de la batería original punta a punta hasta **Reporte real** ("Reporte de sesión listo para revisión humana"), 5/5 juegos, 0 console/page/request errors.
  - Run A: L1 estable sin skip + L1-L4 resueltos 4/4, 5/5, 6/6, 7/7 (L2/L4 con moveLimit exacto).
  - Run B: timeout real en L1 → overlay "¡Tiempo Agotado!" + transición a L2, sin hang (antes 17-27 s congelado).
- Capturas: `docs/qa/r3-tangram-fix-shots/{report-real,tangram-level1-eval,tangram-level2-after-timeout,tangram-l4-success-overlay}.png`.
- Adenda en `docs/design/view-audit-2026-09-07.md` §R3 (líneas 166-216) con composición nueva por nivel, moveLimit/optimalMoves, fix skip L1, fix timeout y R4 teclado.

## Fix aplicado (resumen)
1. Bandeja = espejo exacto de los slots activos por nivel (`TANGRAM_LEVEL_COMPOSITION`); invariante multiset con test.
2. `moveLimit ≥ pieceCount` (L2 3→5, L4 4→7); `optimalMoves = pieceCount` en todos los niveles evaluativos.
3. Skip L1 eliminado: CTA borra `levelOutcome` + `outcomeLevelRef`; efecto de avance re-guardado + cleanup del timeout.
4. `finishLevel('timeout')` disparado desde el tick que lleva el conteo a 0 (vía `finishLevelRef`, no efecto sobre `secondsLeft===0`).
5. R4 a11y: Enter encaja en primer slot libre **compatible**.
6. Tests de componente de la fase evaluativa (5) + invariante bandeja/slots + slotId determinista.

## Observación fuera de scope (H2)
`.tangram-task__overlay` no tiene CSS → el outcome es funcional pero la card queda bajo el fold del stage scrollable. Candidato a la ventana H2 (`t_ab493add`).

## Siguiente (ordenado)
1. Sign-off del usuario sobre R3 (verificar fix en vivo y cerrar hallazgo en audit).
2. **H2** `t_ab493add` (ready) — quitar sección "qué pasa detrás" + indicador discreto de error de señal en setup + 5 juegos. Añadir al scope la observación del overlay Tangram.
3. **H3** `t_61613539` (ready) — toggle ES/EN en flujo candidato + portal reclutador.
4. R1 (`t_9e3506b6` ready) — badge "SCORE PROVISIONAL" overlap → ventana H2/H3.

Secuencia: 1 worker por tree; H2 y H3 son hijas del P0 (t_58def568) vía `hermes kanban link`.
