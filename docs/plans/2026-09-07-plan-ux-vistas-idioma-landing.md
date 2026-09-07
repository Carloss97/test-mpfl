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

### H2 — Señal: quitar "¿qué pasa detrás?" + indicador de error discreto (todos los juegos) — **COMPLETADO (t_ab493add, 2026-09-07)**
- H2.1 Definir regla de error (doc de 1 párrafo en el plan del H2): qué estados muestran indicador (`error` de cámara/rostro/señal; `warning` persistente), qué estados se callan (`ok`, `pending` inicial, cámara opcional sin error). Mensajes con acción: "Revisa la cámara y continúa" / "Puedes continuar sin cámara" / "Señal en pausa: mejora la iluminación" / (solo si bloquea) "Detener evaluación".
- H2.2 Quitar `BehindTheScenesMiniHud` + `BehindTheScenesDrawer` de `PostulationGameStage` y `PostulationConsentSetup`; quitar `BehindPanel` del juego team (+ ajustar su status text :248). Conservar la lógica de `buildBehindTheScenesStatus` (fuente de estados) reutilizada solo para el indicador.
- H2.3 Nuevo componente `SignalErrorHint` (mínimo): chip/toast discreto en esquina, visible **solo** con error/warning, auto-ocultable cuando se resuelve, persistente cuando bloquea; aria-live para accesibilidad; ES/EN.
- H2.4 Tests: por juego (5) — sin HUD en modo ok; hint aparece con error inyectado; hint desaparece al resolverse; team sin BehindPanel. Suite completa verde.
- Aceptación: en el 95% del tiempo (todo ok) la UI no muestra nada de "detrás"; el candidato solo ve un aviso cuando algo no mide, con qué hacer; build + tests + smoke browser (ok y error).

#### H2.1 — Regla de error/severidad (definida e implementada 2026-09-07, decisión 2 aplicada)
`SignalErrorHint` (`src/postulation-demo/SignalErrorHint.jsx`) muestra un chip discreto **solo** cuando una señal prometida como opcional/contextual deja de medirse; `buildBehindTheScenesStatus` (movida sin cambios a `src/postulation-demo/signalStatus.js`) sigue siendo la única fuente de estados. Prioridad (una sola pista a la vez): (1) `camera: 'error'` — error de cámara sostenido (persiste porque el orquestador se detiene tras el fallo): variante **bloqueante**, visible de inmediato y persistente, `role="alert"`/`aria-live="assertive"`, mensaje "Cámara no disponible. Puedes continuar sin cámara; el reporte marcará esa ausencia." + botón **"Detener evaluación"** (única severidad que ofrece detener, decisión 2); (2) `face: 'error'` — "Revisa la cámara y continúa; la señal facial no está disponible."; (3) `signal: 'warning'` (confianza baja o sin AUs en ventana reciente) y (4) `face: 'warning'` (baja presencia de rostro) — "Señal en pausa: mejora la iluminación.". Los estados (2)–(4) solo aparecen si la condición **persiste ≥ 5 s** (reloj del componente; el candidato mira la pantalla, no la cámara) y se ocultan de inmediato al resolverse. Se callan por diseño: `ok`, `pending` inicial, `idle` (cámara opcional no activada), `report: 'pending'` (estructural hasta el fin de la sesión) y eventos de juego (siempre medidos: son el producto). El HUD `BehindTheScenesMiniHud`/`BehindTheScenesDrawer` y el `BehindPanel` del juego team se eliminaron (H2.2); el copy del footer del team ahora interpola el % (R2).

### H3 — Toggle de idioma ES/EN en flujo candidato + portal reclutador — **COMPLETADO (t_61613539, 2026-09-07)**
- H3.1 Verificar persistencia de `LanguageContext` (localStorage); si no persiste, agregarlo (aplica a todo el sitio, no rompe landing).
- H3.2 Agregar `LanguageToggle` en: landing interna de `/postulaciones`, guard de invitación (check/invalid), setup, stage de juego (esquina, no interfiere con controls), reporte, `/reclutador`.
- H3.3 Pass de copy: verificar ES/EN de todo lo nuevo/visible en esas vistas (los juegos usan `t` ya; el toggle solo debe de funcionar, no faltarle strings).
- Aceptación: toggle visible y funcional en las 6 vistas; cambio persiste entre vistas; tests de toggle en setup + report + HR.

#### H3 — Cierre (2026-09-07, t_61613539)
- **H3.1:** persistencia `krumm-lang` (localStorage) + prioridad `?lang=` — ya existía; verificada por `LanguageContext.test.jsx` (12 tests) + cadena de hidratación en el smoke.
- **H3.2:** `LanguageToggle` en las 6 vistas (topbars/right-anchored). Stage: esquina superior derecha del **header** junto al progreso (el anclaje inicial en el hud-corner caía sobre el canvas jugable de precisión — verificado con bounding boxes y corregido). Aspecto del pill con fuente única en `krumm-tokens.css` + override oscuro de la landing pública en `landing.css`.
- **H3.3:** copy chrome ES/EN verificado en vivo (smoke) + fix `status?.label` → `t(label, labelEn)` en el detail HR (string faltante EN). **Hallazgos fuera de scope (cards creadas):** (1) stage móvil — canvas mínimo 500px se recorta en pantallas <500px (juego parcial invisible); (2) copy EN faltante en datos sintéticos HR (summary/prompts/caveats/metrics); (3) juegos de la batería default `stable_dg` con content ES-only (la batería original sí usa `t`).
- **Evidencia:** suite 660/660 · build ok · oxlint 0 err · smoke browser 12/12 vistas (desktop 1280×720 + móvil 390×844), 0 fallos, 0 console errors — `docs/qa/h3-language-toggle.md` + shots `docs/qa/h3-language-toggle/`.
- **Fixes de verificación (H3 propios):** HR móvil — toggle oculto por `display:none` a `div` en ≤640px y apilado en vertical por `.hr-dashboard__user div { display:grid }` (2 reglas excluidas con `:not(.krumm-lang-toggle)`); landing móvil — eyebrow EN 408px con `width:max-content` → overflow 28px (wrap en ≤860px).

### H4 — Rediseño de landing + sistema de diseño unificado (PENDIENTE imágenes de referencia del usuario)
- H4.0 **Entrada requerida:** imágenes de referencia del usuario (bloqueante).
- H4.1 Extraer el sistema de diseño de las referencias: paleta, tipografía, espaciado, bordes/sombras, componentes clave → `docs/design/design-system.md` + CSS custom properties (tokens) en un stylesheet central. Este hito es la base de "mismo estilo en todas las páginas".
- H4.2 Rebuild de `LandingPage` según referencias (conservar: nav, i18n, anclas, SEO, accesibilidad).
- H4.3 Aplicar tokens al flujo candidato (landing interna, guard, setup, stage, reporte).
- H4.4 Aplicar tokens al portal `/reclutador`.
- H4.5 Juegos: solo tokens visuales (fondos, tipografía, paleta) — **no** cambiar mecánicas ni layout de gameplay (separar H4 de C2 para no mezclar). **COMPLETADO (t_5d775c9a, 2026-09-07)**: chrome de juegos (task-area, pills, botones .primary/.secondary, pips, panels, sfx-toggle, micro-intro, overlay Tangram) sobre tokens `--k-*` + mapa `:root` de variables de juego tokenizado (rebuild reservado en H4.3). Se conservan los mundos visuales de cada juego (laser "Órbita", balloon "Cielo", passenger "Urbano", team "Faro" RPG) y los colores de estado funcional de tarea (go/no-go, correct/incorrect, urgencia, presupuesto, delivered/popped). Fix AA en report W5 (blanco sobre oro → `--k-cta-ink`; indigo `#4338ca` fuera del sistema → espresso). Evidencia: spec `PostulationGamesDesignSystem.test.jsx` (10 tests) + suite completa + build + oxlint + smoke browser vivo (setup → laser 3 niveles resueltos → balloon; 1280×720 + 390×844) — `docs/qa/h45-games-design-system/`.
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

## 3. Decisiones del usuario (RESUELTAS 2026-09-07)

1. **/tecnico**: se mantiene con sus panels técnicos (uso interno). Scope H2 = solo flujo candidato.
2. **Severidad que detiene**: solo el **error de cámara sostenido** ofrece "Detener evaluación"; resto = hint + continuar.
3. **Orden**: C2 antes de H2/H3 (confirmado).
4. **Imágenes de referencia**: RECIBIDAS (8 capturas, `docs/design/landing-refs/`). **H4.1 COMPLETADO (2026-09-07)**: `docs/design/design-system.md` + `src/styles/krumm-tokens.css`. H4.2 (rebuild landing) desbloqueado y sin conflictos de archivos con el resto de la cola.

### H4.1 spin-off (desbloqueado al recibir imágenes, no necesita browser)
Extraer de las 8 capturas: paleta, tipografía, espaciado, bordes/sombras, componentes → `docs/design/design-system.md` + CSS tokens. Puede correr paralelo a C1/C2.

## 4. Riesgos

- H2/H3 tocan los mismos componentes que C1 auditó (stage) → esperar C1 y ejecutar H1.3 antes de cambiar (evita re-trabajo).
- El worker de C1 comparte el browser default: no navegar con `new_tab` mientras corra la auditoría (usar sesión browser separada o esperar).
- H4.5 (juegos) vs C2 (práctica): si se cruzan, conflictos en stage; orden: C2 antes que H4.5.
- Single-use: la invitación viva `2c19391a-...` (carlos@krumm.cl) expira 2026-09-07 23:00 CLT; crear una nueva si hace falta para pruebas post-H2.
