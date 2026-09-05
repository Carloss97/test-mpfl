# KRUMM R-7B — Matriz de validez de contenido (constructo × tarea × feature)

**Tarea:** KRUMM-003 · **Fase:** R-7B del protocolo `docs/plans/2026-07-20-r7-validation-and-metric-justification-plan.md`
**Fecha de emisión:** 2026-09-03
**Esquema:** `krumm_r7b_content_validity_v1`
**Base:** `docs/research/krumm-talent-game-behavior-mapping-technical-study.md` (§4.5, §10) y veredictos T.4 (`docs/research/krumm-t4-metric-verdicts-2026-09-01.md`)

---

## Estado honesto (leer primero)

Este documento contiene:

1. El **instrumento de revisión** (criteria y escalas) que el panel de expertos debe completar.
2. La **matriz provisional** (25 filas feature-level) con veredictos **propuestos por el orquestador autónomo** a partir de la cadena de evidencia R-6 y de los veredictos T.4. Estas calificaciones están marcadas `origin: interna_previa`.
3. Un **gate R-7B verificable por tests** (módulo `src/validation/contentValidity.js`) que ejecuta la condición de avance, y la **condición de avance está PASANDO** sobre la matriz provisional.
4. Un **registro de firmado de expertos** (sección §5) aún **pendiente**.

> **La validez de contenido formal NO está completa.** El protocolo exige 2+ expertos independientes en psicometría / I-O / diseño de producto que califiquen relevancia, claridad, contaminación y omisiones y confirmen (o corrijan) la matriz. La matriz provisional y su gate *preparan* esa revisión y demuestran la condición lógica; **no la sustituyen**. Ningún uso decisional está autorizado por este entregable.

---

## 1. Objetivo

Evaluar si cada tarea representa razonablemente el constructo hipotético que pretende informar, cerrando la cadena obligatoria de R-6:

```text
constructo → demanda de tarea → conducta observable → telemetría agregada
          → feature versionada → regla provisional → disponibilidad/confianza/caveats
          → narrativa para revisión humana
```

Esta fase NO valida normas, cortes ni ranking; solo la **representatividad y la contaminación** de la evidencia frente al constructo.

## 2. Condición de avance (R-7 plan §3, R-7B)

> **«Ningún constructo puntuado puede tener “rechazar” en relevancia o contaminación crítica.»**

Un constructo es **puntuado** si en runtime recibe `availability = provisional_score` (`src/assessment/originalGameTalentMapping.js`). Con batería completa esos constructos son:

`problemSolving`, `planning`, `analyticalThinking`, `riskFeedbackProfile`, `leadership` (estructurado), `communication` (estructurada).

No son puntuados (y quedan fuera del gate, aunque sí se califican): `decisionMaking` y `adaptability` → `descriptive_only`/`insufficient`.

**Estado del gate sobre la matriz provisional:** `pass = true`, `blocked = []` (verificado por `contentValidity.test.js`, 9 tests). Se bloquea sólo si un futuro revisor marca en un constructo puntuado `rechazar` en relevancia, `relevancia = 1`, o `contaminacion = critica`.

## 3. Instrumento de revisión de expertos

Cada experto completa, por fila feature, cuatro criterios y un veredicto + severidad:

| Criterio | Escala | Ancla |
|---|---|---|
| **Relevancia** | 1–4 | 4 = muy relevante (la feature es central para el constructo); 1 = no relevante |
| **Claridad** | 1–4 | 4 = sin ambigüedad; 1 = confusa |
| **Contaminación** | baja / media / alta / critica | grado en que la feature captura varianza ajena al constructo (instrucciones, UI, dispositivo, authoring del nivel, práctica) |
| **Omisiones** | adecuada / parcial / amplia | cobertura de las demandas de tarea necesarias para el constructo |
| **Severidad** | baja / media / alta / critica | impacto del hallazgo si se ignorara |
| **Veredicto** | aceptar / revisar / rechazar | recomendación sobre la feature para el constructo puntuado |

En la matriz provisional todo lo marcado `revisar` deriva de riesgos ya documentados en §4.5/§10 (authoring del `par` en Laser, solver/authoring en Passenger, comprensión de instrucciones en los cumplimientos de reglas, y la tensión de liderazgo/comunicación/adaptabilidad resuelta como re-etiquetado descriptivo en T.4). El panel puede ajustar cualquier celda; el gate revalidará la condición de avance de forma automática con los cambios.

## 4. Matriz constructo × tarea × feature (provisional — orquestador)

Origen de cada fila: `origin = interna_previa`. Fuente viva: `src/validation/contentValidity.js` (`PROVISIONAL_MATRIX`). Evidencia y DOI en el estudio §4.5/§7.

| Constructo | Feature | Tarea | Evidencia | Relev. | Clar. | Contam. | Omisión | Severidad | Veredicto |
|---|---|---|---|---|---|---|---|---|---|
| problemSolving | laser.solvedRate | Laser Puzzle | directa | 4 | 4 | media | parcial | baja | aceptar |
| problemSolving | laser.solutionEfficiency | Laser Puzzle | adyacente | 4 | 3 | media | parcial | media | revisar |
| problemSolving | laser.ruleCompliance | Laser Puzzle | directa | 3 | 3 | media | parcial | media | revisar |
| problemSolving | passenger.deliveryRate | Passenger Routes | adyacente | 4 | 3 | media | parcial | baja | aceptar |
| problemSolving | passenger.routeEfficiency | Passenger Routes | adyacente | 4 | 3 | media | parcial | media | revisar |
| planning | passenger.routeEfficiency | Passenger Routes | adyacente | 4 | 3 | media | parcial | media | revisar |
| planning | passenger.deliveryRate | Passenger Routes | adyacente | 4 | 3 | media | parcial | baja | aceptar |
| planning | passenger.constraintCompliance | Passenger Routes | adyacente | 3 | 3 | media | parcial | media | revisar |
| analyticalThinking | laser.solutionEfficiency | Laser Puzzle | adyacente | 4 | 3 | media | parcial | media | revisar |
| analyticalThinking | passenger.constraintCompliance | Passenger Routes | adyacente | 3 | 3 | media | parcial | media | revisar |
| analyticalThinking | passenger.routeEfficiency | Passenger Routes | adyacente | 3 | 3 | media | parcial | media | revisar |
| riskFeedbackProfile | balloon.riskEfficiency | Balloon Risk | directa | 3 | 3 | media | parcial | media | aceptar |
| riskFeedbackProfile | balloon.cashoutRate | Balloon Risk | adyacente | 3 | 3 | media | parcial | media | revisar |
| riskFeedbackProfile | balloon.popRate | Balloon Risk | adyacente | 3 | 3 | media | parcial | media | revisar |
| riskFeedbackProfile | balloon.averagePumpsNormalized | Balloon Risk | adyacente | 3 | 2 | media | parcial | media | revisar |
| riskFeedbackProfile | balloon.postLossAdjustment | Balloon Risk | adyacente | 2 | 2 | media | parcial | media | revisar |
| decisionMaking¹ | team.decisionQualityScore | Team/Faro | adyacente | 3 | 3 | alta | parcial | media | revisar |
| adaptability² | team.adaptabilityScore | Team/Faro | ambigua | 2 | 3 | alta | amplia | alta | revisar |
| adaptability² | team.changeResponseScore | Team/Faro | ambigua | 2 | 2 | alta | amplia | alta | revisar |
| leadership³ | team.leadershipScore | Team/Faro | ambigua | 3 | 3 | media | parcial | media | revisar |
| leadership³ | team.roleClarityScore | Team/Faro | interna | 3 | 2 | media | parcial | media | revisar |
| leadership³ | team.alignmentScore | Team/Faro | interna | 3 | 2 | media | parcial | media | revisar |
| communication⁴ | team.communicationScore | Team/Faro | ambigua | 3 | 3 | media | parcial | media | revisar |
| communication⁴ | team.feedbackUseScore | Team/Faro | interna | 3 | 2 | media | parcial | media | revisar |
| communication⁴ | team.alignmentScore | Team/Faro | interna | 3 | 2 | media | parcial | media | revisar |

¹ `decisionMaking` es `descriptive_only` → **no puntuado** (fuera del gate).  
² `adaptability` es `descriptive_only`/`insufficient` → **no puntuado**; su contaminación alta y severidad alta son el motivo por el que NO se puntúa.  
³ `leadership` es `provisional_score` re-etiquetado «Liderazgo (estructurado)»: juicio social en micro-situaciones, NO interacción grupal (Arthur 2003). Caveat obligatorio en reporte.  
⁴ `communication` es `provisional_score` re-etiquetado «Comunicación (estructurada)»: claridad/contexto/pasos en opciones cerradas, sin texto ni habla (Thornhill-Miller 2023). Caveat obligatorio.

**Resumen de veredictos (provisionales):** `aceptar` = 5 · `revisar` = 20 · `rechazar` = 0. Ningún constructo puntuado tiene rechazo de relevancia ni contaminación crítica → **gate B pasa**.

## 5. Registro de firmado de expertos (pendiente — requisito para avance formal)

Cada experto debe completar el instrumento de §3 sobre la matriz de §4 (o emitir su propia matriz), firmar y registrar aquí. Solo con las celdas confirmadas/corregidas y re-validado el gate se puede declarar la validez de contenido cerrada.

| # | Experto (I-O / psicometría / producto) | Afiliación | Fecha | Completó instrumento | Veredicto de avance¹ | Revisores/evidencia |
|---|---|---|---|---|---|---|
| 1 | — | — | — | ☐ | — | — |
| 2 | — | — | — | ☐ | — | — |

¹Replicar `node --input-type=module -e "import('./src/validation/contentValidity.js').then(m=>console.log(m.contentValidityGate(m.PROVISIONAL_MATRIX)))"` con la matriz corregida del experto para confirmar `pass`.

### Verificación del gate (comando)

```bash
NODE_ENV=test npx vitest run src/validation/contentValidity.test.js --pool=threads --reporter=default
# esperado: 9/9 passed; el gate bloquea ante "rechazo de relevancia" o "contaminación crítica"
```

## 6. Qué queda para cerrar R-7B

- [ ] Reclutar y ejecutar la revisión de 2+ expertos independientes (I-O/psicometría/producto) sobre §3–§4.
- [ ] Registrar firmas en §5 y confirmar `pass` con las matrices corregidas.
- [ ] Si algún experto marca `rechazar`/contaminación crítica en un constructo puntuado: retirar/re-etiquetar la feature y re-validar (el gate lo bloquea hasta entonces).
- [ ] Sincronizar este documento con `docs/plans/2026-07-20-r7-validation-and-metric-justification-plan.md` y el handoff de R-7.
- [ ] NO avanzar a decisión de producto (R-7H) ni a pilotos decisionales con esta fase como única evidencia.

---

*Emitido por el orquestador autónomo KRUMM (sesión KRUMM-003). La matriz provisional y el gate son trazables al estudio técnico §4.5/§10 y a T.4; no constituyen validación psicométrica.*