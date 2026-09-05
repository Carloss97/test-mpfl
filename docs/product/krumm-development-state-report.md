# KRUMM Postulación — reporte de estado de desarrollo

**Fecha:** 2026-07-20  
**Documento:** `development_state_report_v1`  
**Ruta producto:** `/postulaciones-demo`  
**Estado ejecutivo:** demo avanzada y verificable; aún no producto real ni assessment validado.

---

## 1. Resumen ejecutivo

KRUMM Postulación tiene actualmente una demo técnica avanzada con:

- flujo candidato funcional;
- batería estable como fallback;
- batería original controlada con Laser, Balloon y Passenger;
- juegos originales productizados para demo interna;
- reporte HR con resumen ejecutivo, No medido, caveats y revisión humana;
- feature vector original versionado;
- mapeo provisional de constructos KRUMM workbook;
- módulos de QA/feedback para juegos;
- smoke browser y tests automatizados.

Sin embargo, todavía no es un producto real listo para operación comercial/piloto externo porque faltan:

- backend persistente aggregate-only;
- gestión de invitaciones/candidatos/roles;
- retención/eliminación/auditoría de datos;
- QA real multi-dispositivo;
- validación R-7 con participantes y expertos;
- protocolo legal/privacidad formal;
- panel recruiter operativo;
- manual de interpretación y límites de uso.

Conclusión: el sistema está listo para **demo interna/presentación controlada** y para iniciar la **fase de producto piloto**, no para uso decisional ni ranking de candidatos.

---

## 2. Estado por capa

| Capa | Estado | Evidencia actual | Falta para producto real |
|---|---|---|---|
| UI candidato | Implementada para demo | Ruta `/postulaciones-demo`, fixtures, batería original/estable. | Onboarding final, accesibilidad, multi-idioma si aplica, soporte real a errores. |
| Juegos originales | Productizados para demo | Laser 3 niveles, Passenger 3 circuitos, Balloon calibrado. | Calibración con usuarios, tutoriales, mobile/touch QA, balance con datos reales. |
| Telemetría de juegos | Implementada aggregate-only | Features por juego y sanitización. | Esquemas persistentes, contract tests de payload backend, drift monitoring. |
| Cámara/señales técnicas | Implementada como contexto/calidad | Quality/caveats y correlación agregada. | Política final de consentimiento, degradación sin cámara, device QA. |
| Feature vectors | Implementados | `assessment_feature_vector_v2`, `original_game_feature_vector_v1`. | Version registry, migraciones y compatibilidad histórica. |
| Inferencia talento | Provisional | `krumm_workbook_talent_framework_v1` con `provisional_score`, `descriptive_only`, `not_measured`. | R-7: validez de contenido, confiabilidad, convergencia, criterio, fairness. |
| Reporte HR | Mejorado para demo | Resumen ejecutivo, feedback por juego, No medido, drawer técnico. | Separar vistas HR/técnica/científica, workflow recruiter, explicación comercial segura. |
| QA automatizada | Sólida para demo | Vitest, oxlint, build, audit, smoke browser. | CI/CD real, matriz browsers/devices, e2e contra backend. |
| Seguridad/privacidad | Principios implementados | aggregate-only, raw fields prohibidos. | DPIA/PIA, threat model, pentest básico, retención/eliminación. |
| Operación | No producto | Demo local/static. | Staging/prod, observabilidad, backups, soporte, incident response. |

---

## 3. Componentes implementados

### 3.1 Juegos originales

| Juego | Estado | Elementos implementados | Riesgo restante |
|---|---|---|---|
| Laser Puzzle | Productizado para demo | 3 niveles: calibración, obstáculos, red dual; authoring review; feedback claro. | Calibración de dificultad con usuarios; tutorial/controles en móvil. |
| Balloon Risk | Productizado para demo | Feedback riesgo/recompensa; calibration review; 8 rondas con distribución alto/medio/bajo. | Asegurar que se entienda azar/estrategia; validar thresholds con muestra. |
| Passenger Routes | Productizado para demo | 3 circuitos; recargas/paradas; solver; authoring review; feedback de restricciones. | QA de interacción móvil y análisis de dificultad con usuarios. |

### 3.2 Módulos de mejora y QA

| Módulo | Estado | Resultado |
|---|---|---|
| `laser.failure-explanation` | Implementado | Feedback visible: solución clara/reglas/esfuerzo. |
| `laser.level-authoring-review` | Implementado | Drawer técnico: `Authoring Laser: valid_for_internal_demo`. |
| `balloon.feedback-comprehension` | Implementado | Feedback visible: estrategia riesgo/recompensa. |
| `balloon.threshold-calibration-review` | Implementado | Drawer técnico: `Calibration Balloon: valid_for_internal_demo`. |
| `passenger.constraint-feedback` | Implementado | Feedback visible: ruta eficiente/restricciones/recursos. |
| `passenger.route-authoring-review` | Implementado | Drawer técnico: `Authoring Passenger: valid_for_internal_demo`. |
| `shared.candidate-instruction-check` | Implementado | Drawer técnico: `Instruction check: low/review/high`. |
| `shared.mobile-accessibility-qa` | Planificado | Próxima prioridad técnica. |

### 3.3 Reporte HR

Estado actual:

- resumen ejecutivo HR;
- cards de calidad;
- cards de juegos;
- dimensiones/talentos con `No medido` explícito;
- framework provisional original-games;
- caveats;
- drawer técnico con descargas y QA interno.

Decisiones correctas ya implementadas:

- no generar fortalezas/watch areas para framework provisional;
- no usar 50 neutral cuando falta señal;
- no usar score 0 para constructos no medidos;
- no ranking automático;
- no decisión automatizada;
- no persistencia de datos reconstructivos.

Falta para producto:

- separar visualmente tres vistas:
  1. HR ejecutivo;
  2. técnico/QA;
  3. científico/validación;
- crear manual de interpretación;
- crear workflow recruiter: candidato, rol, evidencia, revisión, notas, exportación;
- manejar sesiones reales persistentes, no solo fixture/local.

---

## 4. Estado de indicadores e inferencia

### 4.1 Indicadores implementados

| Grupo | Indicadores | Estado |
|---|---|---|
| Laser | completion, solvedRate, solutionEfficiency, ruleCompliance, moveCount, timeMs | Implementado |
| Balloon | completion, riskEfficiency, cashoutRate, popRate, averagePumpsNormalized, postLossAdjustment, observed mask, timeMs | Implementado |
| Passenger | completion, deliveryRate, routeEfficiency, constraintCompliance, replanRate, stationUseCount, satisfactionNormalized, timeMs | Implementado |
| QA authoring | Laser authoring, Balloon calibration, Passenger authoring | Implementado |
| QA comprensión | candidateInstructionCheck | Implementado |
| QA responsive | mobileAccessibilityQA | Pendiente |

### 4.2 Inferencia KRUMM workbook

| Constructo | Estado actual | Recomendación |
|---|---|---|
| Toma de decisiones | `descriptive_only` | Mantener solo narrativa de estrategia. |
| Resolución de problemas | `provisional_score` si Laser+Passenger válidos | Usar solo internamente hasta R-7. |
| Riesgo/feedback | `descriptive_only` | No convertir a personalidad/frustración. |
| Planificación | `provisional_score` si Passenger válido | Validar con tareas externas. |
| Adaptabilidad | `insufficient` | Diseñar tarea de cambio controlado antes de puntuar. |
| Pensamiento analítico | `provisional_score` si Laser+Passenger válidos | Mantener confianza acotada. |
| Liderazgo | `not_measured` | Requiere tarea social. |
| Comunicación | `not_measured` | Requiere tarea comunicativa. |

---

## 5. Verificación técnica reciente

Los gates recientes del proyecto han incluido:

- suite Vitest completa;
- tests focales de juegos originales, reporte y feature vector;
- `oxlint` sobre `src/postulation-demo`, `src/tasks/original-games`, `src/assessment`, `src/telemetry/gameCorrelation.js`, `src/main.jsx`;
- `npm run build`;
- `npm audit --audit-level=high --omit=dev`;
- `git diff --check`;
- smoke browser sobre rutas de `/postulaciones-demo` en desktop y mobile.

Estado conocido de la última verificación funcional documentada:

| Gate | Estado |
|---|---|
| Tests automatizados | PASS |
| Build Vite | PASS con warning no bloqueante de chunks grandes |
| Audit high prod | 0 vulnerabilidades |
| Oxlint | 0 warnings / 0 errors |
| Smoke browser | PASS en rutas fixture/original/default, desktop/mobile |
| Vite dev smoke | Procesos detenidos tras verificación |

Advertencias conocidas no bloqueantes:

- `HTMLCanvasElement.getContext()` no implementado en jsdom para algunos tests.
- Warnings React `act(...)` existentes en `App.test.jsx`.
- Warning de chunks grandes en build.

---

## 6. Riesgos abiertos

| Riesgo | Severidad | Estado | Mitigación propuesta |
|---|---:|---|---|
| Sobreinterpretación HR/comercial | Alta | Controlado por copy, pero siempre latente. | Manual HR, disclaimers, training interno, bloqueo de ranking. |
| Falta de validación R-7 | Alta | Pendiente. | Ejecutar protocolo con expertos y participantes. |
| Persistencia real no implementada | Alta | Pendiente. | Backend aggregate-only con auditoría y retención. |
| Device/browser bias | Alta | Parcialmente cubierto por smoke. | QA multi-dispositivo y análisis de fairness. |
| UX/instrucciones explican varianza | Media/Alta | Mitigado por `candidateInstructionCheck`. | Entrevistas cognitivas + microtutoriales. |
| Calibración de dificultad | Media | QA interno implementado. | Piloto con métricas de dificultad y abandono. |
| Seguridad/legal | Alta | No formalizado como producto. | DPIA/PIA, threat model, revisión legal, pentest básico. |
| Operación/soporte | Media | No producto. | Staging/prod, monitoreo, soporte, incident response. |

---

## 7. Criterio de “demo lista” vs “producto real”

### Demo lista

La demo se considera lista cuando:

- el flujo corre sin errores visibles;
- los juegos son comprensibles y presentables;
- el reporte explica resultados sin claims indebidos;
- smoke desktop/mobile pasa;
- no hay campos crudos visibles;
- el discurso comercial dice “soporte para revisión humana”, no “selección automática”.

### Producto piloto

El producto piloto requiere además:

- backend persistente y seguro;
- cuentas/roles/invitaciones;
- consentimiento y privacidad formal;
- exportación/revisión recruiter;
- QA real de dispositivos;
- protocolo R-7 inicial;
- soporte y operación;
- logs de auditoría no reconstructivos;
- capacidad de eliminar datos;
- documentación de límites de uso.

### Producto real

El producto real requiere además:

- evidencia psicométrica suficiente para el uso declarado;
- monitoreo de drift;
- fairness/invariancia por subgrupos/dispositivos;
- normas/calibraciones si se pretenden percentiles o comparaciones;
- seguridad y compliance maduros;
- acuerdos B2B, SLA y soporte.

---

## 8. Próximos documentos recomendados

1. `privacy-and-data-retention-policy.md` — política de datos, retención, eliminación, roles y auditoría.
2. `pilot-validation-protocol.md` — protocolo operativo de R-7 con muestra, instrumentos externos, entrevistas cognitivas y análisis.
3. `recruiter-report-interpretation-guide.md` — guía HR de lectura y límites.
4. `qa-device-browser-matrix.md` — matriz real de dispositivos, navegadores, accesibilidad y cámara.
5. `backend-product-architecture.md` — arquitectura de persistencia aggregate-only e integración B2B.
