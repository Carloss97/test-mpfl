# Plan — EXP-7: Módulo Desactivación de Secuencias / Bomb Defusal (EXP-BOMB-001) (2026-09-07)

**Spec recibida (desbloquea Exp 7):** `~/lrefs/EXP-BOMB-001_Especificacion_Tecnica_y_Psicometrica.docx`
(Draft v1.1.0) + `~/lrefs/EXP-BOMB-001_Diseno_UI_UX_y_Reglas.docx` (v1.1.0), ambos
datados 07-sep-2026. Archivar los docx originales en
`docs/spec/EXP-BOMB-001/` (referencia versionada; los resumo aquí, la spec es ley).

## 1. Qué es
Micro-simulador de desactivación: codificar instrucciones (manual), intervalo de
retención (blind delay), ejecutar secuencia sobre un panel (switches SW1–3, cables
R/B/G/Y, botón amarillo hold 2 s). 4 niveles + tutorial; L4 cambia a **MODELO B**
(transforma reglas: SW1→SW3, ROJO→AZUL) → mide memoria de trabajo procedimental
(retención/actualización/orden serial) + secundarios (inhibición, flexibilidad,
atención sostenida, velocidad). 4–7 min. Desktop-first (baseline 1280×720; <1024 =
aviso, spec §15). Sin cámara por defecto (biometría opcional y desacoplada).

## 2. Contratos clave de la spec (resumen operativo)
- **Máquina de estados** (§7): BOOT → TUTORIAL(INTRO/PLAY/RESULT) → por nivel:
  LEVEL_INTRO → INSTRUCTION_ENCODING → BLIND_DELAY → EXECUTION (STEP_VALIDATED loop)
  → LEVEL_SUCCESS | LEVEL_FAIL → TRANSITION → … → SESSION_COMPLETE.
- **Reglas canónicas** (§8.1): A1 SW_1→ON (B: SW_3→ON) · A2 CUT RED (B: CUT BLUE;
  RED prohibido) · B1 HOLD YELLOW 2000 ms (±200) · C1 CUT GREEN.
  `effective_sequence = transform(base_sequence, bomb_type)` — **la transformación
  B viene del rule_manifest versionado, no de condicionales en UI** (DoD §16.2).
- **Secuencias efectivas:** L1 SW1→RED · L2 +HOLD · L3 +GREEN · L4 SW3→BLUE→HOLD→GREEN.
- **Timing** (§10): exposición manual por nivel (libre/3 s/2 s/2 s), delay (0/2/4/3 s),
  time_limit 20/15/12/10 s, penalización por error = **30 % del tiempo restante**
  (configurable), **2 errores → fail de nivel**, warning último 30 %, critical 5 s.
- **Telemetría** (§11): diccionario completo de eventos (SESSION_START, LEVEL_START,
  INSTRUCTIONS_SHOW/HIDE, BLACK_SCREEN_START/END, EXECUTION_START, ACTION_SWITCH/
  WIRE_CUT/BUTTON_DOWN/BUTTON_UP, STEP_SUCCESS, STEP_ERROR{error_class}, TIME_PENALTY,
  LEVEL_SUCCESS/FAIL, FOCUS_CHANGE, SESSION_COMPLETE) + métricas derivadas (§12:
  retention_accuracy_rate, serial_position_accuracy, first_action_latency_ms,
  inter_step_latency_median_ms, interference_error_count, switch_cost_ms,
  hold_duration_error_ms, memory_decay_slope, timeout_rate,
  error_recovery_latency_ms) + integrity flags (§14: blur, fps, drift, viewport, …)
  + taxonomía de errores (§13: ORDER_ERROR, WRONG_TARGET, TYPE_INTERFERENCE, OMISSION,
  REPEAT_ACTION, HOLD_TOO_SHORT/LONG, INPUT_DURING_LOCK, MISCLICK_PROXIMAL,
  TECHNICAL_ABORT).
- **UX** (doc 2): layout 2 columnas (manual | panel) — HUD ASCII §6.1; tutorial
  T1 switch / T2 cable / T3 hold / T4 secuencia / T5 memoria; copy exacto §11
  (tono: frases cortas, labels idénticos a la UI, sin lenguaje alarmista); feedback
  §12 (penealty no revela la respuesta en evaluación); accesibilidad §14 (cable =
  color + letra/patrón, foco visible, ≥44 px, audio opcional, reduced motion);
  animaciones §16 (durations/curvas fijas); assets §17 (2 skins A/B o skin + placa,
  6–8 SFX).
- **QA** (§16.1): QA-01…QA-10 (secuencia exacta, hold ±200, orden incorrecto,
  interferencia L4, L4 correcto, timeout, 2 errores, input en delay, blur,
  reload/abort) → tests unitarios + smoke.
- **Validación** (§17): el módulo es **experimental** hasta pilotaje — scores
  provisionales, `descriptive_only`, hipótesis mínimas documentadas.

## 3. Encaje en el producto KRUMM
- **Nuevo juego `bomb_defusal`** (id `EXP-BOMB-001`, build 1.1.0) en
  `src/tasks/original-games/bomb/` + registro en `originalGameBlueprints.js`.
- **Baterías:** se incorpora a la batería **`original`** (controlada,
  `?battery=original`) como 6.º juego → "Juego X de 6"; la pública `stable_dg` se
  queda en 5 hasta validación de pilotaje (decisión: no cambiar la duración
  pública 14–16 min sin evidence). Revisar al cerrar B5.
- **Constructo nuevo (provisional):** `proceduralWorkingMemory` (9.º constructo en
  el reporte, con caveats de validación pendientes — contrato R-6: señal
  provisional, `descriptive_only`, nextStep = fases A–G de la spec §17).
  Feature vector: nueva entrada versionada en `originalGameFeatureVector.js`
  (mapa de métricas §12 → constructo + constructRelevance), sin tocar el schema
  v2 de forma incompatible (delta aditivo).
- **Mundo visual:** estética táctica/industrial propia (como Órbita/Cielo — los
  mundos NO se tokenizan; solo el chrome shared: task-title pill, pips, sfx-toggle,
  footer) — paleta del mundo: oscuro acero + ámbar/rojo de panel + LED; el
  indicador MODEL A/B no depende solo de color (spec §14).
- **Privacidad:** solo agregados al reporte (métricas §12); raw events por sesión
  con timestamps relativos + seed (reconstruible para auditoría, DoD §16.2);
  biometría off por defecto (`bio_tracking_loss_ms: 0`).
- **Práctica (G.2):** el tutorial + "modo práctica" (repetir sin scoring) siguen el
  patrón existente de práctica previa.

## 4. Cards (kanban) y secuencia

| Card | Scope | Criterio (resumen) |
|---|---|---|
| **B1 — Rule manifest + motor (sin UI)** | `bombRules.js`: manifest versionado (reglas, transformaciones B, tolerancias, penalización, seed), state machine pura, action validator + taxonomía de errores, timer service (monotónico, clamp 0) | Tests unitarios de las secuencias efectivas L1–L4, transform B, tolerancias hold, penalización 30 %, 2 errores → fail, QA-01/03/04/06/07/08 como specs |
| **B2 — Panel + HUD** | `bombGame.jsx` + `bomb.css`: layout 2 columnas (manual\|panel), switches/cables/botón con estados OFF/ON, INTACT/CUT, IDLE/PRESSED/accepted, timer (normal/warning/critical), MODEL A/B indicator, LED, animaciones §16, SFX 6–8 (toggle), a11y §14 (labels color+letra, foco, 44 px, reduced motion, audio no único canal) | Chrome = tokens `--k-*`; mundo propio; smoke 1280×720 + 390×844 (aviso <1024); states obligatorios hover/focus/disabled |
| **B3 — Niveles 1–4 + fases** | Level intro, encoding (exposición por nivel), blind delay (pantalla oscura, inputs bloqueados + INPUT_DURING_LOCK), execution (loop STEP_VALIDATED), penalty state, success/fail (razón general, sin revelar respuesta), transition, MODEL B notice L4 | QA-01…QA-10 en smoke; timer visual vs lógico ≤100 ms (DoD); determinismo por seed |
| **B4 — Tutorial T1–T5 + welcome** | Bienvenida (copy §4.1), T1 switch, T2 cable, T3 hold (ring de progreso SOLO en tutorial), T4 secuencia, T5 memoria (delay), salida tutorial (modal §4.3) | El tutorial NO alimenta scores (DoD); replay disponible (tutorial_replay_count) |
| **B5 — Telemetría + batería + práctica** | Event logger completo (§11) + métricas derivadas (§12) + integrity flags (§14) + payload de sesión (esquema JSON §19), registro en blueprint (batería original → "de 6"), práctica G.2, ES/EN copy (diccionario §11 traducido) | Fixture de sesión reconstruible desde raw events; suite + smoke de recorrido completo (6 juegos) |
| **B6 — Reporte + docs + audit** | Constructo `proceduralWorkingMemory` en feature vector + reporte (caveats provisionales, nextStep validación), doc de módulo (plantilla v2, J2), handoff, audit visual del mundo (shots), decisión stable_dg (¿6 juegos públicos? — proponer NO hasta pilotaje) | Reporte con 9.º constructo sin romper los 8 existentes; docs commiteadas; milestone-sync |

**Orden:** B1 → B2 → B3 → B4 → B5 → B6 (cadenas kanban). La fase V (vistas) corre
antes; BOMB es 2.ª prioridad heavy (área de juegos → secuencial con t_42978412).

## 5. Riesgos
1. **Scoring prematuro** → el constructo nace `descriptive_only`/provisional; pesos
   de score compuesto NO se fijan (spec §12.1).
2. **Timer en headless** → los tests usan reloj inyectado (fake timers) para el
   monotonic clock; el smoke tolera jitter ≤100 ms (DoD).
3. **Interferencia L4** → la transformación B solo desde manifest (DoD) — test de
   regresión específico (QA-04/05).
4. **Mundo nuevo ≠ marca** → el panel es contenido de mundo (estático); el chrome
   (task-title, pips, sfx, footer) es tokens `--k-*` — regla H4.5.
5. **Audio** → desactivable; sin audio la información crítica debe estar en visual
   (spec §10.1/§14).

## 6. Autorización (2026-09-08)

El usuario autorizó la cadena BOMB en la sesión interactiva #krumm-auto
("Autorizo V5 y exp-7 bomb"). Registro: kanban `t_ee587ad1` (B1) comentario
"AUTORIZADA POR EL USUARIO", Linear KRU-91 → In Progress. La regla antigua
"Exp 7/8 fuera de scope (spec inexistente)" queda superada: spec v1.1.0 +
este plan + autorización explícita. Secuencia: V5 (t_0184d2e6) primero,
luego B1→B6 encadenadas (1-worker, GPU qwen-model, milestone-sync por card).
