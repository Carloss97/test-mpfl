# KRUMM Postulación — Scope-Driven Development (SDD)

**Fecha:** 2026-07-26
**Versión:** `sdd_v1`
**Estado:** marco de trabajo (deriva de `docs/reference-guide.md`, `docs/product/*`, `AGENTS.md`)
**Ruta producto:** `/postulaciones-demo`
**Batería default/fallback:** `stable_dg`
**Batería original controlada:** `original_games` (`?battery=original`)

> **SDD = Scope-Driven Development**, no "Software Design Document".
> El PDD (`krumm-postulation-pdd.md`) es el dueño del alcance (qué entra / qué queda fuera).
> Este SDD es el *proceso* scope-driven que usamos para cada slice: arrancar por Scope, derivar
> el SDD delta, RED→GREEN→refactor, cerrar con gates, sincronizar. La arquitectura de módulos
> reales ya vive en `docs/reference-guide.md`; aquí no se duplica, se referencia.
>
> Marco de trabajo: `docs/design/README.md`.

---

## 1. Principio scope-driven

El alcance es el guardarraíl, no una especificación exhaustiva ni una exploración libre.
- El **PDD define el alcance** (in/out) de la fase/slice. No se agrega trabajo fuera del scope
  bloqueado sin revisar el PDD primero.
- El **scope se cierra antes de implementar**; se amplía solo por revisión explícita del PDD.
- Esto encaja con la regla del roadmap: *"la siguiente fase no es agregar más métricas; es
  producto piloto controlado, seguro, auditable y validable"*.

La arquitectura de módulos reales NO se documenta aquí (ya en `docs/reference-guide.md`). El SDD
es el *proceso*, no el mapa de módulos.

---

## 2. Loop de trabajo por slice (PDD → SDD delta → GREEN)

1. **Scope (PDD).** Definir el slice mínimo valioso + restricciones (privacidad, HR, fallback) +
   criterio de éxito medible. Si no se puede responder el Scope, no se inicia: primero PDD.
2. **SDD delta.** Trazar símbolos reales en `src/` (rutas exactas), contratos de señal/flujo a
   respetar, riesgo técnico y mitigación. El SDD delta se deriva del scope; no inventa alcance.
3. **RED → GREEN → refactor acotado.** Tests que fallen primero; implementación mínima; refactor
   solo donde el scope lo pida.
4. **Gates** (ver sección 4).
5. **Sincronizar** PDD/SDD, roadmap, handoff y (si aplica) contrato de datos.

---

## 3. Gates de verificación (cierran cada slice)

Según `AGENTS.md` (el shell puede tener `NODE_ENV=production`; fijarlo explícitamente):

```bash
NODE_ENV=test npx vitest run --pool=threads --reporter=default
npx oxlint src/postulation-demo src/tasks src/main.jsx src/assessment src/telemetry/gameCorrelation.js
npm run build
npm audit --audit-level=high --omit=dev
git diff --check
```

Smoke navegador real (stable/original + fixtures, desktop y mobile 390×844 / 1280×720):
consola, page errors, request failures, overflow horizontal, semántica "No medido", privacidad
y ausencia de claims HR no soportados.

```bash
NODE_ENV=development npx vite --host 127.0.0.1 --port 5173
```

Un slice NO se da por cerrado si: hay errores de consola/page/request, hay overflow horizontal
en las resoluciones objetivo, el reporte contiene claims de decisión automática, alguna métrica
visible carece de caveat, o algún payload contiene raw fields (CI los bloquea).

---

## 4. Plantilla de arranque scope-driven (por slice)

Responder antes de codear:

- **Scope (PDD):** ¿qué entra? ¿qué queda fuera? ¿restricciones de privacidad/HR/fallback?
  ¿criterio de éxito medible?
- **SDD delta:** ¿qué módulos reales toca (rutas en `src/`)? ¿qué contratos de señal/flujo
  respeta (ver `docs/reference-guide.md`)? ¿qué riesgo técnico y mitigación?
- **Gates:** ¿qué tests/build/smoke lo cierran?

Si no se puede responder el **Scope**, no se inicia: primero se revisa el PDD.

---

## 5. Riesgos del proceso y mitigaciones

| Riesgo del proceso | Mitigación |
|---|---|
| Scope creep (más métricas/juegos sin foco) | PDD como dueño del alcance in/out; ampliar solo por revisión del PDD. |
| Código que se desvía de contratos de privacidad | SDD delta traza `src/` reales y respeta `docs/reference-guide.md` + contrato de datos. |
| Tests agregados tarde | RED primero; GREEN mínimo; refactor solo donde el scope lo pida. |
| Docs desincronizados del código | Paso 5 del loop: sincronizar PDD/SDD ↔ roadmap ↔ handoff each slice. |

---

## 6. Referencias y fuentes

- `docs/design/README.md` — marco de trabajo scope-driven (PDD + SDD).
- `docs/design/krumm-postulation-pdd.md` — PDD (dueño del alcance).
- `docs/reference-guide.md` — arquitectura multimodal A–Z / R–Z (mapa de módulos reales).
- `docs/product/krumm-data-signal-inference-contract.md` — contrato de datos (técnico).
- `docs/product/krumm-productization-roadmap.md` — Fase A–F (dónde encaja cada slice).
- `docs/research/krumm-talent-game-behavior-mapping-technical-study.md` — estudio R-6.
- `docs/plans/2026-07-20-r7-validation-and-metric-justification-plan.md` — R-7.
- `AGENTS.md` — comandos de verificación y gates.

## 7. Anatomía del "delta" (SDD por slice, no por release)

El SDD no se reescribe entero cada vez; se acumula por **delta**. Para cada slice:

- **PDD delta:** añade/ajusta la sección de alcance y requisitos del PDD (o crea un PDD de fase,
  p.ej. Fase B). Documenta in/out y criterio de éxito.
- **SDD delta:** anota en este archivo (o en un apéndice por fase) los módulos `src/` tocados,
  los contratos respetados y el riesgo/mitigación del slice. No duplica el mapa de módulos de
  `docs/reference-guide.md`.
- Si el slice cruza fase de roadmap (A→B, B→C, …), el SDD delta cita la fase y su gate.

Esto mantiene el SDD como *proceso vivo* y evita documentación que se queda obsoleta.

---

## 8. Cómo encaja con el roadmap (Fase A–F)

Cada fase del `krumm-productization-roadmap.md` se ejecuta como uno o varios slices scope-driven:

- **Fase A (demo presentable):** slices de QA mobile/accessibility, microtutoriales, guion,
  smoke ampliado. PDD ya existe (alcance demo A–D).
- **Fase B (hardening producto mínimo):** PDD delta de invitaciones/persistencia/dashboard;
  SDD delta sobre `postulationDemoSessionBuilder` + nuevo backend aggregate-only.
- **Fase C (privacidad/seguridad/operación):** PDD delta de política/DPIA/threat model; SDD
  delta de CI privacy guard + staging/prod.
- **Fase D (R-7):** PDD delta de validación; SDD delta de instrumentos/muestra.
- **Fase E/F:** se abren con PDD delta propio antes de cualquier código.

Regla del roadmap: no iniciar piloto externo sin backend aggregate-only, política de datos,
eliminación, smoke real multi-dispositivo, guía HR y revisión experta mínima de constructos.

---

## 9. Ejemplo de arranque (slice tipo)

> Slice: "Cerrar QA mobile + overflow 390×844".
> - **Scope (PDD):** entra corrección de overflow y smoke mobile; queda fuera nuevo juego/score.
>   Restricción: 0 overflow, 0 errores consola. Éxito: smoke pasa en 390×844 y 1280×720.
> - **SDD delta:** toca `PostulationGameStage.jsx`, `postulationDemo.css`; respeta contrato de
>   privacidad (sin raw); riesgo: regresión de layout → mitigación: test visual + oxlint.
> - **Gates:** vitest (componentes), oxlint, build, smoke navegador real.

Si el Scope no se puede responder, el slice no arranca: se revisa el PDD primero.

---

## 10. Referencias y fuentes

- `docs/design/README.md` — marco de trabajo scope-driven (PDD + SDD).
- `docs/design/krumm-postulation-pdd.md` — PDD (dueño del alcance).
- `docs/reference-guide.md` — arquitectura multimodal A–Z / R–Z (mapa de módulos reales y
  contratos de señal; fuente de verdad para el SDD delta).
- `docs/product/krumm-data-signal-inference-contract.md` — contrato de datos (técnico).
- `docs/product/krumm-productization-roadmap.md` — Fase A–F (dónde encaja cada slice).
- `docs/research/krumm-talent-game-behavior-mapping-technical-study.md` — estudio R-6.
- `docs/plans/2026-07-20-r7-validation-and-metric-justification-plan.md` — R-7.
- `AGENTS.md` — comandos de verificación y gates.
