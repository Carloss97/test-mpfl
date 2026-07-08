# Registro de smoke manual — Experiencia gamificada unificada KRUMM

**Fecha:** 2026-07-08  
**Ejecutor:** usuario en navegador real con cámara local  
**Registro por:** Hermes, a partir del resultado reportado por el usuario  
**Plan relacionado:** Fase AA en `docs/plans/post-unified-assessment-advancement-plan.md`

---

## Resultado resumido

El usuario reportó que, tras las correcciones de estabilidad en los juegos, se hicieron pruebas manuales y “parece estar todo funcionando”. Este registro cierra la Fase AA como **smoke real reportado**, no como validación automatizada desde WSL.

---

## Alcance validado manualmente

| Área | Resultado reportado | Nota |
|---|---|---|
| Actividades gamificadas | Pass reportado | Incluye revisión posterior a bugs de Seguimiento continuo y Go/No-Go. |
| Seguimiento continuo | Pass reportado | Objetivo móvil y avance estabilizados por pruebas manuales. |
| Go/No-Go | Pass reportado | Sin loops observados después del fix transversal. |
| Estabilidad general de juegos | Pass reportado | Se agregó cobertura automatizada `gameRerenderStability.test.jsx`. |
| Cámara real | Pass operativo reportado | Hermes no puede confirmar imagen/cámara desde WSL/headless. |

---

## Evidencia automatizada asociada

La corrección previa dejó evidencia automatizada para evitar regresiones:

```bash
NODE_ENV=test npx vitest run src/tasks/gameRerenderStability.test.jsx src/tasks/goNoGo.test.jsx src/tasks/colorInterference.test.jsx src/tasks/visualSearch.test.jsx src/tasks/precisionTargeting.test.jsx src/tasks/pursuitTracking.test.jsx src/tasks/SimpleRTTask.gameTelemetry.test.jsx src/tasks/gameRuntime.test.jsx --pool=threads
```

Resultado previo reportado:

```text
8 test files passed
29 tests passed
```

También se ejecutó suite completa previa:

```text
58 test files passed
220 tests passed
```

---

## Caveats

- Este registro no contiene capturas de cámara, video, frames, landmarks ni señales crudas.
- La frase “pass” se basa en ejecución manual del usuario en navegador real.
- Cualquier demo futura debería repetir el checklist de `docs/qa/unified-assessment-manual-smoke.md` si cambia cámara, navegador, dispositivo o iluminación.

---

## Decisión

Fase AA queda marcada como completada con evidencia mixta:

1. Smoke real reportado por usuario.
2. Pruebas automatizadas de regresión para juegos.
3. Limitación explícita de validación de cámara desde Hermes/WSL.
