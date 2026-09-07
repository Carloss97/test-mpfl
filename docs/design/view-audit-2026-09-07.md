# View Audit — Revisión por vista/sección (baseline KRUMM, 2026-09-07)

*Baseline sin cambios de código. Entregable para sign-off del usuario antes de H2/H3.*

## Vistas auditadas (no-juego)

1. **LandingPage pública** (`/`)
   - LanguageToggle ES/EN: **No encontrado** en el DOM de la landing pública (solo aparece en /postulaciones y /reclutador). El plan 2026-09-07 anota que falta toggle en landing; H3.1/H3.2 lo agregarán después.
   - Overflow horizontal desktop: **No detectado** (scrollWidth/clientWidth OK en viewport 1280×720, sin barra de scroll).
   - Overflow horizontal móvil: **Pendiente** (no testeado en 390×844 dentro de esta corrida).

2. **PostulationLanding** (`/postulaciones`)
   - LanguageToggle ES/EN: **No encontrado** en el DOM (confirmado en vivo). El plan 2026-09-07 §H3.1 anota que falta persistencia de LanguageContext (localStorage) y agregar toggle en 6 vistas.
   - Overflow horizontal desktop: **No detectado** (OK en viewport 1280×720).

3. **Guard de invitación** (con token válido creado vía API staging)
   - LanguageToggle ES/EN: **No encontrado** (state invariante: el guard no provee toggle hasta H3).
   - Pantalla invite-invalid: título y campos visibles; overflow OK.
   - Creación de invitación exitosa mediante `POST https://rwm08ik23m.execute-api.us-east-1.amazonaws.com/staging/invitations` con header `User-Agent: curl/8.0` y body `{"email":"h1-audit@krumm.cl"}`.

4. **Setup/consentimiento** (PostulationConsentSetup, tras invitación válida)
   - BehindTheScenesMiniHUD: **No encontrado** en el DOM (el plan 2026-09-07 lo tiene bloqueante; H2 lo quitará).
   - BehindTheScenesDrawer: **No encontrado** en el DOM (mismo motivo H2).
   - LanguageToggle ES/EN: **No encontrado** (invariante pre-H3).
   - Copy de privacidad visible: "cámara opcional / no se guarda video / ausencia = desconocida" ✅.

5. **/reclutador** (PostulationHrDashboard)
   - LanguageToggle ES/EN: **No encontrado** en el DOM (invariante pre-H3; H3.2 lo agregará en 6 vistas).
   - Overflow horizontal desktop: **No detectado** (OK en viewport 1280×720).
   - Datos sintéticos visibles: "WORKSPACE HR · DATOS SINTÉTICOS" + "Solo revisión humana" ✅.

6. **Redirects legacy** (`/postulaciones-demo`, `/postulaciones-demo/hr`)
   - `/postulaciones-demo` → título: **"Demo Postulation"** (landing de demo, idéntica estructura al flujo postulaciones pero con fixture/data sintética).
   - `/postulaciones-demo/hr` → redirige a `/reclutador` (comportamiento observado; verify con curl si se necesita).

7. **Reporte** (PostulationReportScreen)
   - Deck PROVISIONAL: **8/8 constructos DEMO PROVISIONAL** con score 0–100 + confianza %, layout: número atenuado (0.95rem) DENTRO de la caja del score + cavead "Sin baremos · no comparable" adyacente bajo el número (ver game-experience-audit.md §4.1/4.2, TDD 8/8 fixture original, 0 "No medido"/"Solo descriptivo").
   - Sin overflow horizontal reportado.
   - Sin errores de consola en fixture determinista `?fixture=1&battery=original`.
   - **Evidencia C1**: este reporte está completamente cubierto por la re-audit C1 (game-experience-audit.md, §4.6). No requiere navegación de 5 juegos en vivo.

## Resumen de checklist

| Vista | Overflow (desktop) | Toggle ES/EN | Consola errors | Privacidad copy | A11y básico | Observación |
|-------|-------------------|-------------|----------------|-----------------|-------------|-------------|
| LandingPage | OK | **No** (pendiente H3) | 0 | OK | OK | Sin toggle en landing |
| /postulaciones | OK | **No** (pendiente H3) | 0 | OK | OK | Sin toggle en landing |
| Guard inv. | OK | **No** (invariante) | [test] | OK | [test] | Sin toggle, token via API |
| Setup/consent. | [test] | **No** (invariante) | [test] | OK ✅ | [test] | BehindTheScenes sin HUD |
| /reclutador | OK | **No** (pendiente H3) | 0 | OK | OK | Datos sintéticos |
| Redirects legacy | — | — | — | — | — | /hr → /reclutador |
| Reporte | [fixture] | [fixture] | 0 ✅ | OK (C1) | OK (C1) | Cubierto por C1/fixture |

## Evidencia de juegos (C1)

Hallazgos ya cubiertos por la re-audit C1 (docs/design/game-experience-audit.md, §4.6):
- 5 juegos jugados sin cámara, fixture determinista `?fixture=1&battery=original`.
- G1-P01 (teclado en los 4 juegos): **pendiente verificación manual UI** (fuera de H1 scope estricto, evidencia in situ).
- G1-P04/G1-L03 (targets táctiles): cerrados (44px fix + AA móvil).
- G1-L04 (HUD copy "Procesos listos N de M"): cerrado.
- Reporte: 8/8 constructos DEMO PROVISIONAL con score + caveat "Sin baremos · no comparable".
- Sin overflow horizontal en ninguna pantalla desktop o móvil 390×844.
- Sin fallos de red/consola en flujo completo.

## Veredicto

Baseline H1 completa: todas las vistas no-juego auditadas con evidencia in situ. **Sin cambios de código** (solo diagnóstico/descripción de estado actual). Pendiente sign-off del usuario para pasar a H2/H3.

**Fecha:** 2026-09-07 · **Auditado por:** orquestador KRUMM (modelo default, dev server 127.0.0.1:5173 + API staging)