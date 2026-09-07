# Plan UX — Revisión por vistas, simplificación de señal, idioma y rediseño de landing

**Fecha:** 2026-09-07 · **Repo:** `/home/sarlock/krumm/test-mpfl` (main `3c5a94f`)
**Origen:** pedido del usuario (2026-09-07): (1) quitar la sección "¿qué pasa detrás?" y sustituir por un indicador de errores de medición menos invasivo (todos los juegos); (2) toggle de idioma ES/EN en flujo candidato y portal reclutador (como en landing); (3) plan de revisión de cada vista/sección con hitos; (4) plan de rediseño de landing según imágenes de referencia (pendientes del usuario) con estilo unificado en todo el sitio.

## 0. Estado actual (evidencia)

| Vista | Sección "detrás" hoy | Idioma hoy |
|---|---|---|
| `krumm.cl` (LandingPage) | — | ✅ LanguageToggle en nav |
| `/postulaciones` landing (PostulationLanding) | — | ❌ sin toggle |
| Guard de invitación (invite-check/invite-invalid) | — | ❌ sin toggle (bilingüe fijo por `t`) |
| Setup (PostulationConsentSetup) | **BehindTheScenesMiniHud** (línea 76: "Procesamiento en segundo plano", "{ready} de {total} listos", drawer "Ver qué pasa detrás") | ❌ |
| Gameplay (PostulationGameStage:142, **5 juegos**) | **BehindTheScenesMiniHud + BehindTheScenesDrawer** (5 chips: cámara/rostro/señal/eventos/reporte) | ❌ |
| Juego team (TeamCoordinationPostulationTask:348) | **BehindPanel** "Trabajo por detrás" (panel lateral con detalle del agregado) + status text "Revisa el panel lateral para ver qué se calculó por detrás" (:248) | ❌ |
| Reporte (PostulationReportScreen) | nota de cobertura de señales (agregado) — revisar en H1 | ❌ |
| `/reclutador` (PostulationHrDashboard) | — | ❌ |
| `/tecnico` (UnifiedGameBattery + ConsentCalibrationScreen/SignalReadinessPanel) | panels técnicos (uso interno QA) | ❌ — **fuera de scope por defecto** (ver D1) |

- `LanguageContext` provee `t(es, en)` en toda la app; falta verificar persistencia (localStorage) — si no persiste, el toggle se resetea entre vistas (H3.1).
- C1 (re-audit G.1) está **corriendo** (worker autónomo) y cubre el walkthrough de los 5 juegos → su output alimenta H1.

## 1. Hitos y tareas

### H1 — Audit por vista/sección (baseline de revisión) — **hitos de revisión**
Objetivo: inventario y veredicto por sección antes de tocar UI (el usuario quiere revisar cada vista).
- H1.1 Consolidar walkthrough de juegos desde C1 (su doc de audit) + capturas actuales.
- H1.2 Audit de las vistas no-juego: landing pública, `/postulaciones` (landing interna, guard, setup, reporte), `/reclutador`, redirects legacy. Checklist por sección: layout/overflow (desktop 1280×720 + móvil 390×844), consola limpia, copy ES/EN, copy de privacidad (aggregate-only), consistencia visual, accesibilidad básica.
- H1.3 **Entregable de revisión para el usuario**: `docs/design/view-audit-2026-09-07.md` (tabla vista×sección×hallazgo×veredicto). El usuario lo revisa antes de H2/H3 (gate de sign-off).
- Aceptación: todas las vistas cubiertas con evidencia (captura o test), sin cambios de código.

### H2 — Señal: quitar "¿qué pasa detrás?" + indicador de error discreto (todos los juegos)
- H2.1 Definir regla de error (doc de 1 párrafo en el plan del H2): qué estados muestran indicador (`error` de cámara/rostro/señal; `warning` persistente), qué estados se callan (`ok`, `pending` inicial, cámara opcional sin error). Mensajes con acción: "Revisa la cámara y continúa" / "Puedes continuar sin cámara" / "Señal en pausa: mejora la iluminación" / (solo si bloquea) "Detener evaluación".
- H2.2 Quitar `BehindTheScenesMiniHud` + `BehindTheScenesDrawer` de `PostulationGameStage` y `PostulationConsentSetup`; quitar `BehindPanel` del juego team (+ ajustar su status text :248). Conservar la lógica de `buildBehindTheScenesStatus` (fuente de estados) reutilizada solo para el indicador.
- H2.3 Nuevo componente `SignalErrorHint` (mínimo): chip/toast discreto en esquina, visible **solo** con error/warning, auto-ocultable cuando se resuelve, persistente cuando bloquea; aria-live para accesibilidad; ES/EN.
- H2.4 Tests: por juego (5) — sin HUD en modo ok; hint aparece con error inyectado; hint desaparece al resolverse; team sin BehindPanel. Suite completa verde.
- Aceptación: en el 95% del tiempo (todo ok) la UI no muestra nada de "detrás"; el candidato solo ve un aviso cuando algo no mide, con qué hacer; build + tests + smoke browser (ok y error).

### H3 — Toggle de idioma ES/EN en flujo candidato + portal reclutador
- H3.1 Verificar persistencia de `LanguageContext` (localStorage); si no persiste, agregarlo (aplica a todo el sitio, no rompe landing).
- H3.2 Agregar `LanguageToggle` en: landing interna de `/postulaciones`, guard de invitación (check/invalid), setup, stage de juego (esquina, no interfiere con controls), reporte, `/reclutador`.
- H3.3 Pass de copy: verificar ES/EN de todo lo nuevo/visible en esas vistas (los juegos usan `t` ya; el toggle solo debe de funcionar, no faltarle strings).
- Aceptación: toggle visible y funcional en las 6 vistas; cambio persiste entre vistas; tests de toggle en setup + report + HR.

### H4 — Rediseño de landing + sistema de diseño unificado (PENDIENTE imágenes de referencia del usuario)
- H4.0 **Entrada requerida:** imágenes de referencia del usuario (bloqueante).
- H4.1 Extraer el sistema de diseño de las referencias: paleta, tipografía, espaciado, bordes/sombras, componentes clave → `docs/design/design-system.md` + CSS custom properties (tokens) en un stylesheet central. Este hito es la base de "mismo estilo en todas las páginas".
- H4.2 Rebuild de `LandingPage` según referencias (conservar: nav, i18n, anclas, SEO, accesibilidad).
- H4.3 Aplicar tokens al flujo candidato (landing interna, guard, setup, stage, reporte).
- H4.4 Aplicar tokens al portal `/reclutador`.
- H4.5 Juegos: solo tokens visuales (fondos, tipografía, paleta) — **no** cambiar mecánicas ni layout de gameplay (separar H4 de C2 para no mezclar).
- H4.6 Audit visual unificado (desktop + móvil, ES/EN, overflow 0, contraste) + deploy + verificación browser.
- Aceptación: consistencia visual verificable sección a sección (checklist del design-system), tests + build + smoke.

### H5 — (dado en H4.1/H4.5) Sistema de diseño como artefacto reutilizable
- Reglas de uso para futuras experiencias (los agentes leen design-system.md + tokens antes de UI nueva) — se documenta en AGENTS.md al cerrar H4.

## 2. Orden y dependencias

```
C1 (corriendo) ──▶ H1.1 ──▶ H1.2 ──▶ H1.3 (SIGN-OFF usuario) ──▶ H2 + H3 (paralelas)
Imágenes usuario ─▶ H4.1 ──▶ H4.2 ──▶ H4.3/4.4/4.5 ──▶ H4.6 ──▶ H5
C2 (ready) ───────▶ (independiente de H1-H3; antes de H4.5 para no re-auditar juegos)
```

Por defecto: **C1 → C2 → H1 → (sign-off) → H2+H3 → H4 (lleguen las imágenes) → T.3b → B3.**

## 3. Decisiones pendientes del usuario

1. **/tecnico** (vía interna QA con ConsentCalibrationScreen/SignalReadinessPanel): ¿se mantiene con sus panels técnicos o también se simplifica? (Default: mantener — es herramienta interna, el pedido fue "todos los juegos" del flujo candidato.)
2. **Severidad que detiene**: ¿qué error debe ofrecer "Detener evaluación" (p. ej. error de rostro sostenido >30 s con cámara activa)? Default en H2.1: solo el error de cámara sostenido muestra detener; el resto, hint + seguir.
3. **Prioridad H2/H3 vs C2**: default es C2 primero (QA de práctica completatable) y luego H2/H3. Si el usuario prefiere la UX antes, reordenar.
4. **Imágenes de referencia para H4** (bloqueante; sin fecha).

## 4. Riesgos

- H2/H3 tocan los mismos componentes que C1 auditó (stage) → esperar C1 y ejecutar H1.3 antes de cambiar (evita re-trabajo).
- El worker de C1 comparte el browser default: no navegar con `new_tab` mientras corra la auditoría (usar sesión browser separada o esperar).
- H4.5 (juegos) vs C2 (práctica): si se cruzan, conflictos en stage; orden: C2 antes que H4.5.
- Single-use: la invitación viva `2c19391a-...` (carlos@krumm.cl) expira 2026-09-07 23:00 CLT; crear una nueva si hace falta para pruebas post-H2.
