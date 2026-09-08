# KRUMM Edge / test-mpfl — instrucciones para agentes

## Alcance y estado

- Repo runtime y fuente de verdad: `/home/sarlock/krumm/test-mpfl`.
- Repo visual/original de referencia (solo cuando se solicite portabilidad): `/mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/Test` (PC Windows, sync manual).
- Ruta producto: `/postulaciones` (cutover V5: `/reclutador`→`/empresa`, `/postulaciones` sin invite/fixture→`/candidato`).
- Batería predeterminada/fallback: `stable_dg`.
- Batería interna controlada: `?battery=original`.
- Fixtures: `?fixture=1` y `?fixture=1&battery=original`.
- R-0 a R-6 completados técnicamente (R-6d: cobertura completa de demo, 8 constructos con señal provisional, reporte sin `No medido`). Exp 6 (Tangram) done; Exp 7 = BOMB (en ejecución, ver más abajo); Exp 8 sin spec (fuera de scope). **Estado 2026-09-07:** UX H1–H4.6 completados (audit por vista, `SignalErrorHint` en lugar de "¿qué pasa detrás?", toggle ES/EN en 6 vistas, design system unificado sobre tokens `--k-*`), **port de marca v2 de la landing pública** (referencia oficial `krumm_frontend.zip` → `~/krumm/design_ref/`: paleta beige/crema/arena/marrón/dorado, Archivo + Manrope, hero con foto) y **H4.6b: audit visual post-marca de flujo candidato + /reclutador** (recorrido vivo de 5 juegos; `docs/qa/h46b-visual-audit/`) — ver `docs/design/design-system.md` §10. Todo desplegado en AWS CloudFront **incluido el fix CSP RHP m3** (Google Fonts; la m2 bloqueaba las fuentes de marca → `infra/m1-frontend-stack.yaml` + handoff `docs/plans/2026-09-07-handoff-h46b-audit-marca-v2.md`). **Fase v3 COMPLETA (V0–V5, 2026-09-08):** port completo de `krumm_frontend.zip` (portal, candidato, empresa/HR, procesos, detalle+reporte, nueva-solicitud/diseño/subida) + **cutover en prod** (`/reclutador`→`/empresa`, `/postulaciones` sin invite→`/candidato`; hr-dashboard v1 + PostulationLanding interna eliminadas) + audit h46c (42 vistas, 0 fallos) + verificación prod 17/17 — `docs/plans/2026-09-08-handoff-v5-cutover.md`. **EXP-7 BOMB COMPLETA (cadena B1–B6, 2026-09-08):** B1 done (motor sin UI: `src/tasks/original-games/bomb/` — manifest bomb-v1.1, state machine, validator, timer; 72 tests; handoff `docs/plans/2026-09-08-handoff-b1-bomb-motor.md`); B2 done (panel+HUD+a11y+SFX, 98 tests, AA 10/10, commit 5403cf3; `2026-09-08-handoff-b2-bomb-panel-hud.md`); B3 done (niveles 1-4 + fases, 131 tests, AA 17/17, commit adf42c1); B4 done (tutorial T1-T5 + welcome, 165 tests, AA 27/27, commit 6ea4148); B5 done (telemetría+métricas+batería 6 juegos+práctica G.2, blueprint `bomb_defusal` + fixture, commit 4e65c75); **B6 done** (9° constructo `proceduralWorkingMemory` experimental + feature vector **2.2.0** 12 features `bomb.*` + reporte + audit visual + doc módulo `docs/design/modulos/bomb_defusal.md`; commit 9565bae; handoff `2026-09-08-handoff-b6-bomb-reporte.md`). **Suite 1173/1173** (137 archivos). **Decisión stable_dg:** se queda en **5 juegos (~14–16 min)** hasta pilotaje; BOMB solo en batería controlada `?battery=original` (6 juegos, ~18–23 min) — plan `docs/plans/2026-09-07-plan-exp7-bomb.md`, spec `docs/spec/EXP-BOMB-001/`, §17 fases A–G. **Deploy:** cierre de cadena en `main` NO implica deploy a prod (por instrucción explícita). Pendientes: T.3b (t_c1892485, sensibilidades MoveNet/FaceMesh — requiere webcam, no en Pi), copy EN de HR/juegos (t_24a0e428 HR / KRU-84; t_42978412 juegos / KRU-85), obs. F5 tangram (spawn de pieza), Fase A validación de contenido §17 (input psicometría), sign-off visual del usuario sobre prod v3. Kicker terracota RESUELTO a AA (#704f39, §10).

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
   - `docs/plans/2026-07-20-r7-validation-and-metric-justification-plan.md`
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

## Design system — reglas de UI (H5, v2 marca 2026-09-07)

- Fuente de verdad UI: `docs/design/design-system.md` + tokens `--k-*` en `src/styles/krumm-tokens.css` (import global en `main.jsx`). **Marca v2 oficial**: la referencia de marca es `krumm_frontend.zip` (archivada en `~/krumm/design_ref/Landing pge Krumm/`) — paleta beige `#f2e8dc` / crema `#f7efe6` / arena `#e4cdb5` / marrón `#3d2b20` / dorado `#d8b38c` (`#b9906b` dark) / card `#38271d`; tipografía **Archivo** (display, 900) + **Manrope** (body) vía Google Fonts en `index.html`. Ver `design-system.md` §10.
- Antes de UI nueva o rebuild de vista: leer design-system.md + tokens y usar `--k-*`; **sin hex ni medidas hardcodeadas en vistas** (regimen verificado por test en `src/landing/LandingPage.test.jsx`). Los valores de marca v2 son los del §10.
- Estados obligatorios en todo interactivo: `:hover`, `:focus-visible`, `:disabled` (con `:hover:not(:disabled)`); animaciones solo bajo `prefers-reduced-motion: no-preference`.
- Breakpoints canónicos: ≥900px desktop (splits 2 columnas), <900px 1 columna, <560px móvil compacto; landing marca v2 usa ≤1150px (nav→hamburger) y ≤800px (móvil). Smoke en 1280×720 y 390×844 sin overflow horizontal.
- Todo texto nuevo pasa por `t(es, en)`. Contraste WCAG AA en pares texto/fondo (nota: el kicker terracota `#9a7355` ~3.2:1 sobre crema es el valor oficial de marca — AA estricto pendiente de decisión del usuario, ver design-system.md §10).
- Assets de marca: `public/assets/` (logo borderless, foto hero). La landing pública (`/`) es `src/landing/LandingPage.jsx` + `landing.css`.

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

---

## GPU Lambda (Tier-1) — Protocolo operativo en Pi (actualizado 2026-09-03)

- **NO usar `~/bin/gpu.sh` ni `switch_model.py`** — el guardian los bloquea (mencionan reinicio de gateway). Flujo vigente:
  1. Lanza: `python3 /home/sarlock/krumm/test-mpfl/scripts/launch_lambda.py` (2x H100 SXM5, us-southeast-1, fs `qwen-storage`, modelo `/lambda/nfs/qwen-storage/models/Qwen3.8-27B-FP8`; evita doble instancia; escribe `~/.hermes/gpu_state.json` con instance_id + ip).
  2. Túnel: `ssh -i ~/.ssh/lambda_key -o IdentitiesOnly=yes -fNL 18000:localhost:8000 ubuntu@<ip>`. Auto-saneado: `~/.hermes/scripts/gpu_tunnel_check.sh` (crontab */5) reconecta si la instancia sigue activa en Lambda y limpia `gpu_state.json` si la instancia ya no existe (fix 2026-09-07: la versión previa validaba la IP pública:8000 — inalcanzable — y nunca reconectaba).
  3. Salud (2-5 min): `curl -sf http://127.0.0.1:18000/health`.
  4. Config: `~/.hermes/config.yaml` → default `qwen-model` (custom, `http://127.0.0.1:18000/v1`). El agente **NO** puede editar config.yaml (guard de seguridad): se edita a mano o con `hermes config`. Aplica con `/reset` (CLI) o `hermes gateway restart` (Discord).
- Apagar: terminar instancia por API Lambda (`LAMBDA_API_KEY` en `~/.hermes/.env`, header `User-Agent: curl/8.0`) + `pkill -f "ubuntu@"`. GPU-toggle solo por instrucción explícita del usuario; avisar costo vivo.
- Watchdog crontab (`~/.hermes/scripts/lambda_idle_watchdog.sh`, cada 5 min) monitorea idle/age; **desde 2026-09-07 en modo manual** (el usuario apaga la instancia): cruza umbral (idle >40min / age >6h) → log en `cost-watchdog.log` sin terminar. `GPU_AUTO_OFF=1` en el crontab restaura el auto-apagado. Fix 2026-09-07: la API Lambda usa `file_system_names` (no `file_systems`) y no expone `launched_at` (edad vía stamp `~/.hermes/lambda_age_since`); con el esquema viejo el watchdog era no-op.
- Costo real verificado contra la API (2026-09-07): **$8.38/h** (`price_cents_per_hour`=838, us-southeast-1), facturado al segundo.
- Solo encender cuando la tarea lo justifique (tests multi-archivo, builds, análisis pesado, porting).

## Automatización GPU / modelo — orquestador (2026-09-03)

- **Orquestador**: `python3 ~/bin/model_orchestrate.py`. Cada 5 min (systemd timer `gpu-orchestrate.timer`); escribe en `~/.hermes/logs/gpu_orchestrate.log`. Salud GPU **solo por túnel 127.0.0.1:18000** (la IP pública:8000 es inalcanzable — fix 2026-09-07: antes daba DOWN falso permanente y reintentaba `gpu.sh up` cada tick).
- **Policy**:
  - GPU qwen (Tier-1) es el modelo default SOLO cuando está la instancia viva + hay trabajo heavy pendiente.
  - `switch_model.py auto` decide final: si GPU DOWN y sin iam, apunta a NIM kimi-k3 (tier-2 gratis).
  - Las tareas "heavy" (código, multi-archivo, builds, porting, debugging, tests; definido por keywords) se auto-fijan con `hermes kanban set-model qwen-model`; el orquestador aunque esté DOWN avisa; si el usuario la desbloquea, un watcher levantará GPU (respetando `GPU_AUTO_UP=0/1`).
  - `NEVER_HEAVY`: tareas de cámara / hardware físico (e.g. T.3 sanity empírico) — no van a GPU.

- **Triggers automáticos**:
  - **Subida** (condición): gpu down (health por túnel) + al menos 1 tarea heavy ready + `GPU_AUTO_UP=1` → `gpu.sh up` (tuyo `scripts/launch_lambda.py` con guardian-off) + polling health/túnel (boot 4-10 min) → GPU/NIM vía switch_model (idempotente) + aviso Discord + comenta cards.
  - **Apagado**: manual por el usuario (desde 2026-09-07); el watchdog solo loguea el umbral. `GPU_AUTO_OFF=1` restaura el auto-apagado.
  - **Aviso AWS SSO** (cada 30 min, `aws-sso-renew.timer`): si el token AWS SSO local expira en <60 min, manda a Discord el enlace de refresh.

- **Channels**: Discord webhook (usa `DISCORD_WEBHOOK_URL` de `~/.hermes/.env`). En card kanban queda bitácora (comentarios automáticos).

- **Para el usuario**: desactivar el automatismo: `systemctl --user stop gpu-orchestrate.timer` (o setear `GPU_AUTO_UP=0` en mundial). Default: funcionando.

- Tier-1 (GPU on): `qwen-model` (Qwen3.8-27B-FP8, 1M ctx) vía túnel 18000. Es el `model.default`; con GPU off, los fallbacks NIM se activan solos.
- Fallbacks NIM (`NVIDIA_API_KEY` en `~/.hermes/.env`), en orden:
  1. `moonshotai/kimi-k3`
  2. `deepseek-ai/deepseek-v4-flash-0731`
  3. `nvidia/nemotron-3.5-lightning-30b-a3b`
  4. `deepseek-ai/deepseek-v4-pro-0813`
- Tier local (WAN down): `qwen2.5-coder:1.5b` vía Ollama (`http://127.0.0.1:11434/v1`).

## Credenciales e identidad en la Pi (2026-09-03)

- **GitHub CLI**: `gh` autenticado como `Carloss97` (scopes `repo`, `gist`, `read:org`) — `~/.config/gh`. Renueva sin tty: `gh auth login --hostname github.com --git-protocol https --web < /dev/null` (imprime código one-time para https://github.com/login/device).
- **AWS**: SSO (Identity Center), cuenta staging `931932531447`, role `AdministratorAccess`, usuario `admin-carlos`. `~/.aws/config`: sso-session `aws_sso` (start URL `https://d-90667969cb.awsapps.com/start`, `us-east-1`) + perfil `default`. El token SSO vive ~11 h; **refresco: `aws sso login --sso-session aws_sso --use-device-code`** (imprime URL + código corto). NUNCA pegar tokens ASIA de ~1000 chars por chat: un solo carácter de error → `InvalidClientTokenId`.
- **Lambda**: `LAMBDA_API_KEY` en `~/.hermes/.env`. La API Lambda exige `User-Agent: curl/8.0` (sin UA → HTTP 403).
- **Discord gateway**: systemd user `hermes-gateway.service` (si no hay `XDG_RUNTIME_DIR`, exportar `/run/user/$(id -u)`). Cambios de `config.yaml` requieren `hermes gateway restart`. Logs INFO de conexión en `~/.hermes/logs/gateway.log` (usar `grep -a`; journalctl solo muestra WARNING).
- Regla vigente: no tocar `.env`, credenciales ni secretos; esta sección documenta ubicaciones y refresco, no valores.