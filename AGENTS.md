# KRUMM Edge / test-mpfl — instrucciones para agentes

## Alcance y estado

- Repo runtime y fuente de verdad: `/mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/test-mpfl`.
- Repo visual/original de referencia (solo cuando se solicite portabilidad): `/mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/Test`.
- Ruta producto: `/postulaciones-demo`.
- Batería predeterminada/fallback: `stable_dg`.
- Batería interna controlada: `?battery=original`.
- Fixtures: `?fixture=1` y `?fixture=1&battery=original`.
- R-0 a R-5 están documentadas como completadas. El foco actual es R-6: feature vector original, mapeo provisional con respaldo bibliográfico y reporte HR conservador; después R-7 QA/validación comparativa.

## Skills obligatorias según tarea

Cargar antes de trabajar:

- `krumm-talent-assessment-development`: siempre para producto, juegos, telemetría, payload o reporte KRUMM.
- `software-delivery-workflows`: cualquier implementación, revisión o corrección.
- `writing-plans`: cambios de varias etapas.
- `react-responsive-game-layouts`: UI, juegos, reportes o smoke responsive.
- `academic-writing`: estudio técnico, referencias o afirmaciones científicas.
- `document-productivity-workflows`: XLSX/PDF/Office.
- `hermes-agent`: solo al configurar o depurar Hermes, skills o toolsets.

Toolsets necesarios para sesiones completas: `terminal,file,code_execution,skills,memory,session_search,delegation,todo,browser,web,vision`. Los cambios de toolsets de Hermes requieren una sesión nueva (`/reset`).

## Inicio de sesión

1. Usar `session_search` si se pide continuar un handoff.
2. Leer, en este orden:
   - `docs/plans/postulation-demo-original-games-new-agent-handoff.md`
   - `docs/plans/postulation-demo-original-games-integration-plan.md`
   - `docs/plans/2026-07-17-r6-talent-mapping-research-and-implementation-plan.md`
   - `docs/demo/postulation-demo-qa-smoke-template.md`
3. Consultar el estado real con Git antes de editar y preservar cambios ajenos.
4. No tocar `.env`, credenciales ni secretos.
5. No hacer commit, push, reset, rebase ni PR salvo instrucción explícita.

## Método de trabajo

- Español, hands-on y con evidencia real.
- Plan → lectura/trazado de símbolos → tests RED → implementación mínima → GREEN → refactor acotado → gates → browser smoke si cambia una superficie visible.
- Usar `read_file`/`search_files` para inspección; `patch` V4A para archivos existentes y `write_file` para nuevos.
- No inventar archivos, APIs, imports, resultados, referencias ni salidas.
- Mantener documentación, plan maestro y handoff sincronizados con cada fase.
- Verificar afirmaciones científicas contra título, autores, año, DOI/URL y abstract o texto primario. Clasificar evidencia como directa, adyacente, ambigua/no resuelta o interna.

## Privacidad y gobernanza no negociables

Nunca persistir/exportar video, frames, imágenes, screenshots, landmarks, keypoints, muestras faciales crudas, blendshapes crudos, ventanas crudas, rutas/celdas reconstructivas, pointer samples, DOM events, eventos/logs crudos de juego o secuencias acción por acción.

Mantener:

- `game_event_v1` y eventos `stimulus_shown` / `response` / `game_end`.
- `gameCorrelation.aggregate`.
- `assessment_feature_vector_v2` sin cambios incompatibles.
- agregados por juego allowlist-only.
- `humanReviewOnly`, `noAutomatedDecision`, `observationalOnly`, `privacySafe`.
- cámara/biometría como contexto/calidad, nunca como inferencia directa de talento, personalidad, emoción, estrés, fatiga, sinceridad o decisión de contratación.
- señal ausente = desconocida/caveated, nunca desempeño bajo.
- MoveNet real o caveat; no fallback FaceMesh para hombros.

## Contrato científico R-6

Cadena de inferencia obligatoria:

`constructo → demanda de tarea → conducta observable → telemetría agregada → feature versionada → regla provisional → disponibilidad/confianza/caveats → narrativa para revisión humana`.

- El XLSX fuente es una matriz de hipótesis y procedencia, no evidencia de validación.
- Los puntajes transformados 0–100 no son percentiles, normas, diagnósticos ni puntos de corte.
- Toma de decisiones y riesgo/feedback deben ser `descriptive_only` mientras no exista validación normativa.
- Adaptabilidad es `insufficient` con la batería actual.
- Liderazgo y comunicación son `not_measured` en tareas individuales actuales.
- Tolerancia a la frustración no se deriva de Balloon, AUs ni rPPG.
- Leadership/communication y cualquier evidencia faltante deben usar `score: null`, no cero ni 50 neutral.
- No generar fortalezas/áreas de atención para el framework provisional sin normas y criterios validados.

## Verificación

Entorno conocido: `NODE_ENV` del shell puede ser `production`; fijarlo explícitamente.

```bash
NODE_ENV=test npx vitest run <focales> --pool=threads --reporter=default
NODE_ENV=test npx vitest run --pool=threads --reporter=default
npx oxlint src/postulation-demo src/tasks src/main.jsx src/assessment src/telemetry/gameCorrelation.js
npm run build
npm audit --audit-level=high --omit=dev
git diff --check
```

Para Vite/smoke:

```bash
NODE_ENV=development npx vite --host 127.0.0.1 --port 5173
```

Validar con navegador real stable/original + fixtures en desktop y móvil: consola, page errors, request failures, overflow horizontal, semántica `No medido`, privacidad y ausencia de claims HR no soportados.

Tras cambios con tests y build, entregar resumen de archivos/comandos/resultados y enviar la notificación de cierre a Discord DM `.sarlock` cuando la herramienta de mensajería esté disponible.
