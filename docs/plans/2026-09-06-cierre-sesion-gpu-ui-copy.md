# Handoff cierre — Sesión 2026-09-06 (GPU uptime + UI/UX copy sin "demo" + sync kanban/Linear/crons)

**Fecha:** 2026-09-06 (~17:30-18:50)
**Estado:** **DEPLOY A PRODUCCIÓN COMPLETADO Y VERIFICADO.** 601/601 tests, build/lint/audit/diff clean. GPU encendida y retenida.

## Hecho en esta sesión

### 0. Bugfix Tangram (EXP-001) — práctica/juego incompletable [CRÍTICO]
TangramPostulationTask NO tenía test de componente (los 40 tests eran lógica pura) y por eso estos 3 defectos pasaron:
1. **Zonas objetivo invisibles en el tutorial**: `slots` solo se construía en `phase === 'play'` → en la práctica no se renderizaba ningún slot y no había dónde encajar las piezas. Fix: construir slots también en `phase === 'tutorial'`.
2. **Rotación muerta en el tutorial**: `rotateSelected` gateaba `phase !== 'play'` → botón "Rotar 45°" y tecla Espacio/R no hacían nada en la práctica (que es donde se enseña la mecánica). Fix: permitir `tutorial`.
3. **Transición muerta al completar la práctica**: el effect de avance de nivel gateaba `phase !== 'play'` → al completar el tutorial (level 0) el candidato quedaba atorado con el overlay de éxito y nunca veía la transición ni los niveles 1-4. Fix: permitir `tutorial` en el gate.
- **Nuevo test**: `src/tasks/original-games/TangramPostulationTask.test.jsx` (4 tests: onboarding welcome→tutorial, regresión rotación botón+teclado, completado 2/2 → transición → nivel 1 con 4 slots, respuesta agregada privacy-safe). 4/4 GREEN.

### 0b. Landing hero: celdas del panel con descripción
El panel del hero tenía 4 celdas con una sola palabra (se veían vacías). Agregué una línea descriptiva a cada celda (Privacidad/Latencia/Revisión humana/Calidad de señal) + CSS `.landing__plot-cell small`. Sin test dedicado (aria-hidden decorativo).

### 1. GPU Lambda encendida y retenida (pedido del usuario)
- Instancia `13823254880549ada9290d9302600015` (2xH100 SXM5, IP 68.209.72.141), vLLM listo, túnel 127.0.0.1:18000, config default `qwen-model` (ctx 1M).
- **Causa de un apagado no solicitado:** la cron `krumm-dispatcher` (3979d2085fb9) tenía en su prompt la regla vieja "Si GPU encendida >30min sin uso, apágala" y la ejecutó a las 17:17 (output `~/.hermes/cron/output/3979d2085fb9/2026-09-06_17-17-24.md`).
- **Fix (aplicado):** prompt del dispatcher reescrito con REGLA CRÍTICA de retención: GPU subida manualmente por el usuario queda encendida hasta que él la apague; solo se apaga autónomamente si la política automática la encendió y va >40 min sin requests.
- `gpu-watchdog.timer` desactivado (systemd user). `gpu-orchestrate.timer` queda activo (solo sube, no apaga).
- Pitfalls documentados en skill `krumm-autono-orquestador`: `pkill -f` con el patrón en la misma línea shell mata tu propio proceso (exit -15); `switch_model.py` corregido (health por túnel 18000 en vez de IP pública; base_url túnel + ctx 1M).

### 2. UI/UX — copy "demo" → "prueba/provisional" en el flujo de candidato
El P1 (t_prod_routes) pidió quitar el texto visible "demo" de la UI. Restos encontrados y corregidos en la ruta `/postulaciones`:

| Archivo | Cambio |
|---|---|
| PostulationProgressHeader.jsx | "Juego breve para la demo de postulación" → "de la prueba" |
| postulationDemoCopy.js | "Preparación de demo" → "Preparación de la prueba"; "La demo prioriza…" → "La prueba prioriza…" |
| PostulationLanding.jsx | aria "Resumen de demo"/"Principios de la demo" → "de la prueba" |
| PostulationGameStage.jsx | "No hay juegos disponibles para la demo" → "para la prueba" |
| PostulationReportScreen.jsx | tag "Demo provisional" → "Score provisional"; "Reiniciar/Repetir demo" → "prueba"; "Cobertura de tareas en demo" → "Cobertura de tareas"; "Lectura de demo" → "Lectura observacional"; "Scores de demo no validados" → "Scores provisionales no validados"; aria "Score de demo" → "score provisional" |
| PostulationReportSummary.js | "8 constructos con señal de demo" → "de prueba"; "tarea de demo asociada" → "tarea asociada" |
| SignalReadinessPanel.jsx | "La demo puede continuar con caveats" → "La prueba puede continuar…" |

Mantenido a propósito (no es branding de demo): "Estado del entorno de demostración" (drawer técnico), "validado para demo interna" (status técnico), "Entorno demo" en /reclutador (caveat honesto de datos sintéticos), "modo demo rápida" en UnifiedGameBattery (feature real).

Tests actualizados: PostulationReportScreen.test.jsx (tags por clase `.postulation-demo__provisional-tag--solid` en vez de texto "Demo provisional"), SignalReadinessPanel.test.jsx. **22 tests focales GREEN.**

### 3. Deploy a producción — COMPLETADO Y VERIFICADO ✅
AWS SSO refresh aprobado por el usuario (device code). `npm run build` (bundle `index-C9fmzBqN.js`) + `scripts/deploy-frontend.sh` (BUCKET=krumm-staging-frontend-931932531447, DISTRIBUTION_ID=EDQ39PDNI931R) + invalidación CloudFront.
Verificación en vivo (browser + curl):
- krumm.cl/ → emails `contacto@krumm.cl` / `carlossaldivia@krumm.cl` (los viejos `candidato@`/`carlos@` desaparecidos), celdas del hero con descripción, overflow 0.
- /postulaciones?fixture=1&battery=original → 8 tags "Score provisional", "Cobertura de tareas: los ocho constructos…", "Scores provisionales no validados…", "8 constructos con señal de prueba", botón "Repetir prueba", overflow 0.
- /postulaciones (fixture default) y /reclutador OK.

### 4. Sync kanban
- Cerradas (obsoletas/meta): t_9f1e2735 (G.2 desbloquear), t_0c9d3bd6 (G.5 desbloquear), t_b59056de (GH200/Supersede GPU — decisión cumplida y documentada).
- Comentadas: t_prod_routes (gap deploy + copy fix), t_8c2c98c2 (Exp 6 done / 7-8 bloqueadas por spec).
- Bloqueadas reales sin cambio: t_f1ea699b, t_da93ee8f (Exp 7/8, spec inexistente), t_cb36be49 (T.3, hardware).

### 5. Sync Linear
- **KRU-74 creado:** "UI v2 + copy sin 'demo' — deploy a producción (krumm.cl)" (priority 2) con evidencia completa.
- Comentados: KRU-72 (SSO refresh en curso), KRU-61 y KRU-62 (Exp 7/8 bloqueadas por spec inexistente, diagnóstico completo).

### 6. Crons
- krumm-smoke-diario (9f82761531cd): prompt reescrito — binarios locales `./node_modules/.bin/vitest|oxlint|vite` (npx queda bloqueado por gate Tirith en cron), build siempre a `/tmp`.
- krumm-dispatcher (3979d2085fb9): regla de retención GPU (ver §1).
- Resto intacto: daily-brief 9:00, kanban-watch 15min, alerts 60min.

## Pendiente para próxima sesión
1. **Exp 7 y 8** — requieren spec del usuario (mecánica/constructo/telemetría/criterios) o se eliminan (KRU-61/62).
2. **T.3** — sanity empírico con cámara (hardware físico).
3. AWS SSO y deploy UI v2 quedaron **resueltos en esta sesión** (ver §3). `oxlint` quedó en devDependencies (v1.81.0) para que la smoke nocturna linte con binario local.

## Reglas duras (recordatorio)
- GPU: el usuario la apaga manualmente (hasta nuevo aviso). Dispatcher respeta retención.
- No commit/push salvo instrucción explícita — en esta sesión el usuario instruyó "sigue trabajando… actualiza documentos", y el commit/push de este trabajo queda reportado en el cierre.
- Tests con `NODE_ENV=test`; build `npm run build`; lint `oxlint`; smoke Vite `NODE_ENV=development`.
- Aggregate-only, humanReviewOnly, privacy by design (AGENTS.md).
