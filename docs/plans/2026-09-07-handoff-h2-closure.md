# Handoff 2026-09-07 — H2 cerrado (UX señal + quitar "qué pasa detrás")

**Fecha:** 2026-09-07 ~05:31 -03 · **Autor:** Hermes (cron milestone-watch, perfil default)
**Repo:** `/home/sarlock/krumm/test-mpfl` (main → `Carloss97/test-mpfl`)

## 1. Qué pasó
- **H2** (`t_ab493add`, KRU-78) CERRADO y **pushed** en `893f6ed`:
  - Sección "¿qué pasa detrás?" **eliminada** (`BehindTheScenesMiniHud`/`Drawer` en
    `PostulationGameStage:142` y `PostulationConsentSetup:76`; `BehindPanel` en
    `TeamCoordinationPostulationTask:348` + status `:248`).
  - Reemplazada por **`SignalErrorHint`** discreto según la regla de severidad del plan
    (decisión 2 del usuario): solo error de cámara sostenido es bloqueante ("Detener
    evaluación"); warnings persisten tras 5 s; ok/pending/idle callados; `aria-live`,
    copy ES/EN, auto-ocultable.
  - WIP del worker anterior recuperado de `stash@{0}`, corregido (`LanguageContext.test`:
    mock localStorage + firma wrapper) → suite completa.
  - **Bonus R3-obs:** `.tangram-task__overlay` con CSS (card centrada sobre canvas;
    antes invisible bajo el fold en scroll de stage).

## 2. Verificación (gates)
- Suite: **119 archivos / 652 tests** verde (incl. fix `LanguageContext.test`).
- `build` OK · `oxlint` OK (1 warning preexistente) · `audit` 0 vuln · `git diff --check` OK.
- **3 recorridos browser, 0 fallos / 0 errores de consola:**
  - smoke H2 ok + error,
  - E2E 5 juegos desktop 1280×720 (laser→balloon→passenger→team→tangram L1-L4),
  - E2E móvil 390×844.
- Capturas: `docs/qa/h2-shots/` (a2-stage-ok-laser, b1-setup-camera-error,
  e2e-tangram-overlay, mobile-e2e-tangram-overlay).
- Repo: `HEAD` == `@{u}` == `893f6ed`, tree limpio.

## 3. Estado de tarjetas (kanban)
| Card | Título | Estado |
|---|---|---|
| `t_ab493add` | H2: quitar "qué pasa detrás" + indicador de error de señal | **DONE** (893f6ed) |
| `t_61613539` | H3: Toggle idioma ES/EN + portal reclutador | **RUNNING** (auto-despachada tras H2) |
| `t_9e3506b6` | Fix: badge 'SCORE PROVISIONAL' (R1) | ready |
| `t_69044ae0` | H4: Rediseño landing + design system | todo (bloqueada por H3) |

## 4. Linear
- **KRU-78** (H2): → **Done** + comentario de cierre.
- **KRU-79** (H3): Todo → running (despacho automático).

## 5. Siguiente (orden)
1. **H3** `t_61613539` en ejecución — al completar: gates + commit/push + nativo vía
   milestone-watch.
2. Fix R1 (`t_9e3506b6`) en ventana H2/H3.
3. **H4** `t_69044ae0` después de H3.
4. Deploy prod (`scripts/deploy-frontend.sh`) cuando H2/H3 + fix R1 cierren la batería.