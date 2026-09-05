# KRUMM Postulación — línea de tiempo hacia producto real

**Fecha:** 2026-07-20  
**Documento:** `productization_roadmap_v1`  
**Punto de partida:** demo técnica avanzada de `/postulaciones-demo`  
**Objetivo:** pasar a producto piloto B2B, validable y operable, sin sobreprometer validez psicométrica.

---

## 1. Supuestos

1. El objetivo inmediato no es lanzar selección automática, sino un producto de soporte a revisión humana.
2. La batería `stable_dg` sigue como fallback mientras `original_games` se valida.
3. `original_games` puede usarse en piloto solo con disclaimers, revisión humana y protocolo R-7.
4. No se habilitan rankings, percentiles, cortes ni recomendaciones de contratación hasta tener evidencia normativa/criterial.
5. El piloto debe ser aggregate-only: sin raw video, frames, landmarks, rutas, secuencias, pointer samples ni logs reconstructivos.
6. La línea de tiempo asume un equipo pequeño y trabajo paralelo moderado. Si una sola persona implementa todo, extender duraciones 1.5×–2×.

---

## 2. Vista ejecutiva de fases

| Fase | Duración estimada | Objetivo | Salida principal | Gate de avance |
|---|---:|---|---|---|
| Fase A — Cierre demo presentable | 1–2 semanas | Dejar demo robusta y presentable. | Demo HR + juegos + docs + guion. | Smoke real multi-dispositivo y revisión de discurso. |
| Fase B — Hardening producto mínimo | 3–5 semanas | Convertir demo local/static en flujo producto mínimo. | Sesiones persistentes aggregate-only, roles e invitaciones. | E2E candidato→recruiter→exportación. |
| Fase C — Privacidad, seguridad y operación | 2–4 semanas | Preparar entorno piloto serio. | Retención, eliminación, auditoría, staging/prod, monitoreo. | Revisión legal/seguridad y prueba de incident response. |
| Fase D — R-7 validación inicial | 6–10 semanas | Evaluar contenido, usabilidad, confiabilidad inicial y device effects. | Informe R-7 inicial con decisión de batería. | Comité decide mantener/iterar/pilotear. |
| Fase E — Piloto B2B controlado | 8–12 semanas | Usar con clientes/roles acotados bajo protocolo. | Datos agregados, feedback recruiter/candidato, análisis fairness. | Decisión go/no-go de producto comercial. |
| Fase F — Producto comercial v1 | 8–16 semanas | Operación, compliance y escalabilidad comercial. | Plataforma B2B v1 con SLA y documentación. | Auditoría de seguridad/privacidad + evidencia de utilidad. |

---

## 3. Fase A — cierre demo presentable

**Duración:** 1–2 semanas  
**Estado actual:** en gran parte avanzado.

### Objetivo

Cerrar la demo como pieza de presentación controlada, con foco en claridad visual, discurso HR conservador y ausencia de errores obvios.

### Entregables

| Entregable | Estado actual | Acción restante |
|---|---|---|
| Juegos Laser/Passenger productizados | Implementado | QA manual con usuarios internos. |
| Balloon calibrado para demo | Implementado | Validar comprensión de azar/estrategia. |
| Reporte HR ejecutivo | Implementado | Revisión visual con usuario final/recruiter. |
| Tabla señal→métrica→bibliografía | Regenerada | Revisar con experto psicométrico/I-O. |
| Smoke browser | Implementado | Ampliar a más resoluciones. |
| Guion demo | Pendiente | Crear demo script de 5–8 min. |
| Checklist presentación | Pendiente | Crear checklist pre-demo. |

### Tareas recomendadas

1. Implementar `shared.mobile-accessibility-qa`.
2. Crear microtutorial/instrucciones previas por juego.
3. Revisar la UI del reporte con captura desktop/mobile.
4. Preparar guion de presentación:
   - problema;
   - flujo candidato;
   - señales aggregate-only;
   - reporte HR;
   - límites éticos/validación;
   - roadmap producto.
5. Congelar versión demo `demo_internal_v1`.

### Gate

```text
PASS si:
- 0 errores consola/page/request en smoke.
- 0 overflow horizontal en 390×844 y 1280×720.
- Reporte no contiene claims de decisión automática.
- Usuario puede explicar cada juego en menos de 30 segundos.
- Cada métrica visible tiene caveat o justificación.
```

---

## 4. Fase B — hardening producto mínimo

**Duración:** 3–5 semanas  
**Estado actual:** pendiente.

### Objetivo

Transformar el flujo demo en flujo producto mínimo: candidato invitado, sesión persistida, recruiter revisa resultado y descarga evidencia agregada.

### Componentes

| Componente | Requisito |
|---|---|
| Invitaciones | Crear sesión por candidato/rol/empresa con token temporal. |
| Consentimiento | Capturar aceptación, permisos, versión de política y fecha. |
| Persistencia | Guardar solo payload aggregate-only y report bundle sanitizado. |
| Recruiter dashboard | Ver lista de candidatos, estado, reporte, descargas y caveats. |
| Roles | Admin, recruiter, reviewer técnico, candidato. |
| Exportación | PDF/HTML/JSON sanitizados. |
| Auditoría | Registro de acceso/descarga/cambios sin datos crudos. |
| Eliminación | Borrado por candidato/sesión según política. |

### Arquitectura mínima sugerida

```text
Frontend candidato
→ API sesión/invitación
→ storage aggregate-only
→ servicio reporte
→ dashboard recruiter
→ export bundle
```

### Decisiones pendientes

| Decisión | Opciones |
|---|---|
| Backend | Node/Express, serverless, Supabase, Firebase, Rails/Django. |
| DB | Postgres recomendado para auditoría y relaciones B2B. |
| Storage reportes | DB JSONB + object storage para HTML/PDF si se generan. |
| Auth | Magic links para candidatos; login SSO/passwordless para recruiters. |
| Hosting | Staging/prod separados. |

### Gate

```text
PASS si:
- candidato completa sesión desde invitación real;
- payload final no contiene campos prohibidos;
- recruiter ve reporte y descarga bundle;
- candidato puede solicitar eliminación;
- auditoría registra accesos sin raw telemetry;
- tests e2e pasan en staging.
```

---

## 5. Fase C — privacidad, seguridad y operación

**Duración:** 2–4 semanas  
**Estado actual:** principios implementados, proceso formal pendiente.

### Objetivo

Asegurar que el piloto tenga reglas de datos, seguridad y operación coherentes con el contexto de selección/personas.

### Entregables

| Entregable | Contenido mínimo |
|---|---|
| Política de datos | Qué se captura, qué no, retención, eliminación, finalidad. |
| DPIA/PIA | Riesgos, mitigaciones, responsables, base legal. |
| Threat model | Activos, actores, vectores, controles. |
| Auditoría payload | Tests automáticos contra raw fields en CI. |
| Gestión de incidentes | Procedimiento de detección, respuesta, comunicación. |
| Observabilidad | Logs técnicos, métricas de error, uptime, latencia. |
| Backups | Política de backup/restore de datos aggregate-only. |
| Accesos | RBAC, revisión de permisos, rotación de credenciales. |

### Gate

```text
PASS si:
- política de privacidad revisada;
- threat model cerrado para piloto;
- CI bloquea payloads reconstructivos;
- staging/prod separados;
- backups restaurables probados;
- eliminación de sesión demostrada end-to-end.
```

---

## 6. Fase D — R-7 validación inicial

**Duración:** 6–10 semanas  
**Estado actual:** plan técnico escrito; ejecución pendiente.

### Objetivo

Pasar de “demo con plausibilidad técnica” a “piloto con evidencia inicial”.

### Subfases

| Subfase | Actividad | Salida |
|---|---|---|
| D1 — Validez de contenido | Revisión por 2+ expertos I-O/psicometría/producto. | Matriz constructo×tarea×feature: aceptar/revisar/rechazar. |
| D2 — Entrevistas cognitivas | 8–12 participantes pensando en voz alta/post-sesión. | Problemas de comprensión, instrucciones, UX, dispositivo. |
| D3 — QA device effects | Muestra pequeña multi-dispositivo/navegador. | Diferencias de disponibilidad, completitud y errores. |
| D4 — Confiabilidad inicial | Test–retest o formas paralelas si viable. | Estabilidad de features/constructos. |
| D5 — Convergencia exploratoria | Comparación con instrumentos o tareas externas. | Evidencia preliminar, no normativa. |
| D6 — Decisión de batería | stable/original/mixta/iterar. | Recomendación documentada. |

### Muestra inicial sugerida

| Objetivo | Tamaño mínimo útil | Nota |
|---|---:|---|
| Entrevistas cognitivas | 8–12 | Detectar problemas de comprensión/UX. |
| QA multi-dispositivo | 12–20 | Cubrir desktop/mobile/navegadores. |
| Confiabilidad exploratoria | 30–50 | Solo estimaciones iniciales. |
| Convergencia/criterio preliminar | 80–150+ | Depende del instrumento y efecto esperado. |

### Gate

```text
PASS si:
- expertos no rechazan constructos puntuados;
- instrucciones no explican la mayoría de errores;
- métricas principales tienen estabilidad mínima aceptable;
- no hay diferencias críticas por dispositivo/subgrupo;
- decisión explícita: mantener, iterar, retirar o pilotear.
```

---

## 7. Fase E — piloto B2B controlado

**Duración:** 8–12 semanas  
**Estado actual:** no iniciado.

### Objetivo

Usar KRUMM con 1–3 clientes/roles acotados, sin decisión automática, midiendo utilidad, experiencia y riesgos.

### Diseño de piloto

| Dimensión | Recomendación |
|---|---|
| Clientes | 1–3 empresas/áreas controladas. |
| Roles | 1–2 familias de cargo, no todos los cargos. |
| Participantes | 100–300 según disponibilidad y objetivo. |
| Uso HR | Soporte complementario, no filtro automático. |
| Criterios externos | Definir antes: entrevista estructurada, evaluación técnica, desempeño training, etc. |
| Reporte | Human-review-only, sin percentiles salvo que haya normas internas suficientes. |
| Monitoreo | Completion, dropout, device effects, fairness, feedback recruiter/candidato. |

### Métricas de éxito producto

| Métrica | Meta piloto sugerida |
|---|---:|
| Completion rate | ≥ 80% sin asistencia |
| Error técnico bloqueante | < 5% |
| Tiempo sesión | Dentro del rango prometido ±20% |
| Reporte entendido por recruiter | ≥ 80% en encuesta interna |
| Candidato entiende instrucciones | ≥ 85% sin aclaración externa |
| Solicitudes de soporte | Tendencia decreciente por cohortes |
| Payloads con raw fields | 0 |

### Gate

```text
PASS si:
- utilidad percibida por recruiters es positiva;
- no se detectan sesgos/dispositivos críticos sin mitigación;
- privacidad opera correctamente;
- criterios externos permiten decidir si vale avanzar;
- no se usa como ranking automático.
```

---

## 8. Fase F — producto comercial v1

**Duración:** 8–16 semanas después del piloto  
**Estado actual:** futuro.

### Objetivo

Convertir el piloto en producto B2B operable con contratos, soporte, seguridad y roadmap de validación continua.

### Requisitos

| Área | Requisito |
|---|---|
| Producto | Onboarding empresa, roles, campañas, candidates, reportes, exportaciones. |
| Seguridad | Revisión externa, hardening auth, backups, monitoreo, incident response. |
| Legal | Contratos, DPA, política privacidad, consentimiento, retención. |
| Psicometría | Evidencia suficiente para claims declarados; límites visibles. |
| Fairness | Monitoreo por subgrupo/dispositivo con mitigaciones. |
| Operación | SLA, soporte, status page, runbooks. |
| Comercial | Pricing, demo script, material ventas sin claims indebidos. |

### Gate

```text
PASS si:
- piloto demuestra utilidad y riesgos manejables;
- claims comerciales coinciden con evidencia;
- seguridad/legal aprobados;
- operación soporta clientes reales;
- se define roadmap de validación continua.
```

---

## 9. Roadmap resumido recomendado

```text
Semana 1–2
  Cerrar demo presentable: mobile/accessibility QA, microtutoriales, guion, smoke ampliado.

Semana 3–7
  Hardening producto mínimo: invitaciones, persistencia aggregate-only, dashboard recruiter, exportación, auditoría.

Semana 6–10
  Privacidad/seguridad/operación: política, threat model, retención, eliminación, CI privacy, staging/prod.

Semana 8–18
  R-7 inicial: expertos, entrevistas cognitivas, device effects, confiabilidad exploratoria, decisión batería.

Semana 18–30
  Piloto B2B controlado: clientes acotados, métricas de utilidad, feedback y fairness.

Semana 30+
  Producto comercial v1 si el piloto justifica avanzar.
```

Las fases B, C y D pueden solaparse parcialmente, pero no debería iniciar un piloto externo sin al menos:

- backend aggregate-only;
- política de datos;
- eliminación de datos;
- smoke real multi-dispositivo;
- guía HR de interpretación;
- revisión experta mínima de constructos.

---

## 10. Prioridad inmediata después de esta documentación

1. `shared.mobile-accessibility-qa`.
2. Microtutorial/instrucciones por juego.
3. Demo script + checklist de presentación.
4. Documento `privacy-and-data-retention-policy.md`.
5. Diseño backend aggregate-only.
6. Plan operativo R-7 con instrumentos, muestra y roles.

---

## 11. Definición de “siguiente fase”

La siguiente fase no debe ser “agregar más métricas”. Debe ser:

```text
De demo técnicamente verde
→ a producto piloto controlado, seguro, auditable y validable.
```

Eso implica priorizar:

- operación y privacidad antes que nuevos scores;
- UX e instrucciones antes que interpretación;
- evidencia R-7 antes que ventas con claims fuertes;
- recruiter workflow antes que dashboards técnicos;
- trazabilidad/auditoría antes que optimización estética.
