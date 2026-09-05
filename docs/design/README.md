# Metodología PDD / SDD — scope-driven (KRUMM postulaciones-demo)

**Estado:** convención de trabajo vigente desde 2026-07-26 (demo verde).
**Alcance:** aplica a todo trabajo en `/postulaciones-demo` y su productización/validación.

El repo ya tiene planificación (roadmap Fase A–F, contrato de datos, guía de referencia,
handoffs). La metodología no reemplaza eso: lo organiza como el marco de arranque de cada
unidad de trabajo.

---

## 1. Las tres patas

### PDD — Product Design Document (`krumm-postulation-pdd.md`)
Define el **qué / por qué / para quién** y, sobre todo, el **alcance (scope)**:
qué entra, qué queda fuera, restricciones de privacidad/HR/fallback y criterios de éxito.
El PDD es el dueño del límite in/out.

### SDD — Scope-Driven Development (`krumm-postulation-sdd.md`)
Define el **proceso**: cómo arrancamos cada slice desde el Scope del PDD, derivamos el SDD
delta, cerramos con RED→GREEN→gates y sincronizamos. **No es un "Software Design Document"**:
la arquitectura de módulos ya vive en `docs/reference-guide.md` y se referencia, no se duplica.

### Scope-driven (la variable de control)
El **alcance es el guardarraíl**, no una especificación exhaustiva ni una exploración libre.
- No se agrega trabajo fuera del scope bloqueado sin revisar el PDD primero.
- El scope se cierra antes de implementar; se amplía solo por revisión explícita del PDD.
- Esto encaja con la regla del roadmap: *"la siguiente fase no es agregar más métricas; es
  producto piloto controlado, seguro, auditable y validable"*.

---

## 2. Loop de trabajo por unidad de trabajo (ticket / slice)

1. **Scope** — definir el slice mínimo valioso + restricciones (privacidad, HR, fallback).
   Escribir/actualizar el **PDD delta** (sección de alcance y requisitos).
2. **SDD delta** — módulos afectados, contratos, flujo, riesgos. Trazar símbolos reales en
   `src/` antes de cambiar código.
3. **RED → GREEN → refactor acotado** — tests que fallen primero, implementación mínima,
   luego refactor solo donde el scope lo pida.
4. **Gates** (según `AGENTS.md`, fijar `NODE_ENV` explícitamente):
   ```bash
   NODE_ENV=test npx vitest run --pool=threads --reporter=default
   npx oxlint src/postulation-demo src/tasks src/main.jsx src/assessment src/telemetry/gameCorrelation.js
   npm run build
   npm audit --audit-level=high --omit=dev
   git diff --check
   ```
   Smoke navegador real (stable/original + fixtures, desktop y mobile 390×844 / 1280×720):
   consola, page errors, request failures, overflow, semántica "No medido", privacidad,
   ausencia de claims HR no soportados.
5. **Sincronizar** — PDD/SDD, roadmap, handoff y (si aplica) contrato de datos coherentes.

---

## 3. Relación con artefactos existentes

- `docs/product/krumm-productization-roadmap.md` — Fase A–F; el PDD/SDD por fase se ancla aquí.
- `docs/product/krumm-data-signal-inference-contract.md` — contrato técnico; el SDD lo respeta.
- `docs/reference-guide.md` — arquitectura A–Z / R–Z; fuente primaria de módulos del SDD.
- `docs/plans/*` — planes por fase; los PDD/SDD delta los complementan, no los duplican.

---

## 4. Regla de oro

> De demo técnicamente verde → a producto piloto controlado, seguro, auditable y validable.
> Priorizar: operación y privacidad antes que nuevos scores; UX/instrucciones antes que
> interpretación; evidencia R-7 antes que ventas; recruiter workflow antes que dashboards
> técnicos; trazabilidad/auditoría antes que estética.

---

## 5. Plantilla de arranque (scope-driven PDD/SDD delta)

Para cada nuevo slice, responder antes de codear:

- **Scope (PDD):** ¿qué entra? ¿qué queda fuera? ¿restricciones de privacidad/HR/fallback?
  ¿criterio de éxito medible?
- **SDD:** ¿qué módulos reales toca? ¿qué contratos de señal/flujo se respetan? ¿qué riesgo
  técnico y mitigación?
- **Gates:** ¿qué tests/build/smoke lo cierran?

Si no se puede responder el Scope, no se inicia: primero se revisa el PDD.
