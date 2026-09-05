# KRUMM Postulación — paquete documental producto

**Fecha:** 2026-07-20  
**Ruta producto:** `/postulaciones-demo`  
**Estado:** demo técnica avanzada con transición planificada a producto piloto.  
**Batería default/fallback:** `stable_dg`  
**Batería original controlada:** `original_games`

Este paquete regenera la documentación de entradas, salidas, elementos, indicadores, señales telemétricas, inferencia, estado de desarrollo y línea de tiempo para pasar de demo a producto real.

## Documentos

1. [`krumm-data-signal-inference-contract.md`](./krumm-data-signal-inference-contract.md)  
   Contrato técnico de datos: entradas permitidas, elementos, señales telemétricas, indicadores, artefactos de salida, inferencia permitida/prohibida y límites de privacidad.

2. [`krumm-development-state-report.md`](./krumm-development-state-report.md)  
   Reporte de estado de desarrollo: qué existe, qué está implementado, qué está en estado provisional, qué falta para producto real y qué riesgos quedan abiertos.

3. [`krumm-productization-roadmap.md`](./krumm-productization-roadmap.md)  
   Línea de tiempo por fases para pasar de demo a producto piloto B2B: UX, backend, validación, seguridad, operación, piloto y decisión de salida a mercado.

## Dossier presentable

- HTML editable: [`krumm-product-readiness-dossier.html`](./krumm-product-readiness-dossier.html)
- PDF exportado: `exports/krumm-product-readiness-dossier.pdf`
- Script reproducible: `scripts/render-product-dossier-pdf.mjs`

## Principio rector

La plataforma actual puede demostrar flujo, juegos, captura agregada, reporte y gobernanza, pero todavía no debe presentarse como herramienta psicométrica validada ni como sistema de decisión automatizada. Todo uso debe mantenerse como revisión humana, con evidencia agregada, caveats y validación R-7 antes de comparar candidatos.

## Fuentes del paquete

- Código fuente en `src/postulation-demo`, `src/tasks/original-games`, `src/assessment`, `src/telemetry`.
- Estudio técnico: `docs/research/krumm-talent-game-behavior-mapping-technical-study.md`.
- Plan R-7: `docs/plans/2026-07-20-r7-validation-and-metric-justification-plan.md`.
- Plan de productización Laser/Passenger: `docs/plans/2026-07-20-laser-passenger-product-game-design-review.md`.
- Handoff vigente: `docs/plans/postulation-demo-original-games-new-agent-handoff.md`.

## No negociables

- No persistir video, frames, landmarks, keypoints, rutas, celdas visitadas, pointer samples, eventos DOM crudos, secuencias de clicks/bombeos/movimientos ni ventanas crudas reconstructivas.
- Cámara/biometría solo como calidad/contexto, nunca talento, personalidad, emoción, estrés, fatiga, sinceridad o decisión de contratación.
- Ausencia de señal = desconocido/no medido; nunca bajo desempeño.
- Sin percentiles, cortes, ranking o apto/no apto hasta validación normativa.
