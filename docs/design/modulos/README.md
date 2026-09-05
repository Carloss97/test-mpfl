# Módulos de juego — plantilla unificada (Diseño + Técnica/Inferencia)

Carpeta de especificaciones por módulo/juego del proyecto KRUMM (postulaciones-demo).

## Plantilla maestra (unificada, reutilizable)

- `plantilla-modulo-original-game.md` — **Única plantilla para juegos "original_games"**.
  Unifica en un solo documento:
  - Secciones 1-6: Diseño/Contenido (antes `plantilla-diseno-contenido.md`)
  - Secciones 7-13: Especificación Técnica/Inferencia (antes `plantilla-especificacion-tecnica.md`)
  - Sección 0: **Traza de implementación obligatoria** (mapea cada sección a `src/` real)
  - Sección 14: Riesgos y mitigaciones
  - Sección 15: Criterios de aceptación (gates ejecutables)

## Cómo instanciar un módulo nuevo

1. Copiar `plantilla-modulo-original-game.md` → `docs/design/modulos/<game-id>.md`
2. Rellenar `<ENTRE_ANGULARES>` y tablas.
3. **Completar §0 Traza de implementación** con rutas reales en `src/` antes de tocar código.
4. Mantener coherencia con:
   - `docs/design/krumm-postulation-pdd.md` (alcance in/out)
   - `docs/design/krumm-postulation-sdd.md` (proceso scope-driven)
   - `AGENTS.md` (privacidad/gobernanza y contrato científico R-6)
5. Cerrar con los gates de la sección 15 (vitest + oxlint + build + smoke).

## Módulos existentes (instancias reales de la plantilla unificada)

| Juego | Archivo | Estado | Fuente |
|-------|---------|--------|--------|
| Globo de Riesgo (`balloon_risk`) | `balloon_risk.md` | **aprobado (datos reales del repo)** | `src/tasks/original-games/BalloonRiskPostulationTask.jsx`, `balloonRiskTelemetry.js`, `balloonRiskFeedback.js`, `src/assessment/originalGameFeatureVector.js` |
| Caminos (`caminos`) | `caminos.md` | **aprobado** | PDF "Diseño y Contenido V3" + "Especificación Técnica V3" (EXP-NODES-001), reescrito a convenciones KRUMM |

> **Nota:** Los archivos `.pdf` de referencia (`balloon-diseno.pdf`, `balloon-tecnica.pdf`, `caminos-diseno.pdf`, `caminos-tecnica.pdf`, `plantilla-diseno-contenido.pdf`, `plantilla-especificacion-tecnica.pdf`) son fuentes históricas; la fuente de verdad actual son los `.md` instanciados arriba.

## Regla de oro

De demo técnicamente verde → a producto piloto controlado, seguro, auditable y validable.
Priorizar operación y privacidad antes que nuevos scores; UX/instrucciones antes que interpretación; evidencia R-7 antes que ventas.