# G.1 — Audit de experiencia de candidata y de juegos

Estado: [x] **Recorrido vivo completado** (oleada 2, 2026-08-27) sobre Chrome 151 host (CDP) + Vite dev WSL. Pre-audit de código (oleada 1, 2026-08-26) + recorrido end-to-end real sin cámara (4 juegos completos) + móvil 390×844 + fixture + HR. **Oleada de calidad W1–W3/W5 (2026-08-27)**: G.3/G.6 cerrados, G.2/G.4 parciales (micro-intros, temas, animaciones, SFX, jerarquía de reporte); decisiones de producto L02/L06/P08 tomadas por el usuario. Pendientes: G1-P01 teclado, G1-P05 breakpoints, pérdida de foco (G.5), práctica sin puntaje (G.2).

## 1. Alcance

- Flujo: landing → consentimiento → señal/calibración de fondo → 4 juegos originales → reporte final.
- Superficie: `/postulaciones-demo?battery=original` (con `?fixture=1` para pruebas deterministas).
- Viewports: desktop compacto 1366×768 (mínimo) y 1920×1080 de referencia; móvil 390×844.
- Objetivo: lista ordenada de puntos de fricción (severidad × frecuencia) que alimenta la cola de G.2–G.5.
- Restricción (invariante): este audit **solo registra**; no cambia telemetría ni agregados.

## 2. Método

1. **Pre-audit de código** (hecho 2026-08-26): i18n, accesibilidad, targets táctiles, breakpoints, tamaños fijos, relojes.
2. **Recorrido vivo en navegador real** (completado 2026-08-27, §4): checklist por pantalla + fricciones nuevas (G1-L0X).
3. Cada fricción confirmada: repro + evidencia (línea de consola o captura).

## 3. Hallazgos del pre-audit de código

| ID | Superficie | Hallazgo | Severidad | Ref (file:line) | Estado |
|---|---|---|---|---|---|
| G1-P01 | 4 juegos | Sin soporte de teclado: 0 `onKeyDown` / 0 `tabIndex` en los 4 componentes de juego | Mayor (G.5) | `src/tasks/original-games/*PostulationTask.jsx` | Abierto — confirmar en vivo |
| G1-P02 | Balloon | 1 de 2 botones sin `aria-label` | Menor | `BalloonRiskPostulationTask.jsx:117-138` (zona / continuar) | Abierto |
| G1-P03 | Consentimiento | 1 de 3 botones sin `aria-label` | Menor | `PostulationConsentSetup.jsx` | Abierto |
| G1-P04 | CSS | Targets táctiles < 48 px (WCAG 2.5.5): `min-height` 44/46/38/32 px | Cerrado (2026-08-27) | `postulationDemo.css:545, 674, 1043, 778, 967` | Verificado: las líneas marcadas interactivas (hud-toggle 44, device-label 46) ya cumplían; las de 32/38 px son elementos de **display** no interactivos (task-title/task-progress, route-card, feedback-strip) — sin violación. Único target interactivo <44 encontrado en vivo: Passenger "Registrar replanteo" 40 px → **corregido a 44 px** (L1379) y verificado en browser (331×44, 0 overflow). Grid Láser 38 px → G1-L03 (AA conforme) |
| G1-P05 | CSS/JS | Desalineación de breakpoints: CSS usa 760 px, JS `isMobile < 768` (hueco 761–767 px); 1180/820 sí alinea con `isCompactViewport` | Menor | `postulationDemo.css` (@media) vs. tri-tier JS | Abierto |
| G1-P06 | Juegos/telemetría | Fallback de reloj `performance.now() ?? Date.now()` en los juegos: mezcla dominios de reloj. Nota para T.2 (audit de sync) | Menor (cruce T.2) | `LaserPuzzlePostulationTask.jsx:28-32` | Abierto — T.2 |
| G1-P07 | Balloon | `riskBand` 'alto/medio/bajo' como literal es en payload de estímulo (enum de telemetría); verificar i18n si se muestra en reporte | Menor | `BalloonRiskPostulationTask.jsx:57` | Abierto |
| G1-P08 | Faro | `BehindPanel` muestra % de constructos (Liderazgo/Comunicación/Adaptabilidad/Decisión) en vivo durante el juego — validar contra contrato R-6 (transparencia vs. narrativa para revisión humana) | **Decisión de producto** | `TeamCoordinationPostulationTask.jsx:163-179` | Cerrado 2026-08-27 — decisión de usuario: **mantener como está** (transparencia; la copia ya aclara "cálculo agregado, solo revisión humana"); el wording de los constructos lo valida T.4 (matriz T.1 §10.4 lo registra como "ambigua/no resuelta — pendiente T.4") |

Positivo:

- Los 4 juegos usan i18n `t('es','en')` vía `useLanguage`.
- Laser: descripciones a11y por celda (`describeCell`).
- Passenger/Team: cobertura aria sólida (15/7 y 8/2 respectivamente).
- CSS: 9 bloques `@media` cubriendo compacto 1180/820, 760/720, 560, 680, 800, 900, 860, 520.

## 4. Recorrido vivo (navegador real) — completado 2026-08-27

- Entorno: Vite dev (WSL) `127.0.0.1:5173` · Chrome 151 host vía CDP (túnel relay NAT) · desktop ≈1366×768 (viewport 1351 con scrollbar) · móvil 390×844 (DPR 2, `mobile=true`).
- Flujo real (sin fixture, **sin cámara**): landing → consentimiento → Láser (3 niveles) → Globo (8 rondas) → Central de movilidad (3 circuitos) → Operación Faro (4 turnos) → reporte.
- Flujo fixture (determinista): `?fixture=1&battery=original` → reporte directo (comportamiento esperado: sesión pre-completada).
- Dashboard HR: `/postulaciones-demo/hr` (datos sintéticos).
- Método de captura: hooks de consola (`console.error/warn`), `window.onerror`, `unhandledrejection`, `fetch` no-OK y errores de recursos; overflow horizontal (`scrollWidth > clientWidth`) en cada pantalla; los 4 juegos jugados hasta el final. Sin persistir imágenes/capturas en el repo (solo UI, sin cámara; evidencia en sesión).

### 4.1 Registro por pantalla (desktop)

| Pantalla | Errores consola | Fallos HTTP | Overflow horiz. | Texto confuso | Pacing | Otro |
|---|---|---|---|---|---|---|
| 1. Landing | 0 | 0 | No | No | OK | CTA "Comenzar demo de postulación" visible sin scroll |
| 2. Consentimiento | 0 | 0 | No | No | OK | Copy "cámara opcional / no se guarda video / ausencia = desconocida" correcta |
| 3. Señal/calibración (sin cámara) | 0 | 0 | No | HUD "Procesos listos 1 de 5" técnico (G1-L04) | OK | "Cámara: En espera" visible durante todos los juegos |
| 4. Láser (3 niveles, par 4/5/6) | 0 | 0 | No | "Comprobar ruta" siempre activo (G1-L02) | OK (367 s juego, con lectura pausada) | Transiciones entre niveles automáticas y claras; beam correcto desde el mount (ver §4.5) |
| 5. Globo (8 rondas) | 0 | 0 | No | No (inflado a ciegas = diseño) | OK (70 s) | Transición de ronda ~1,5–2 s; feedback "Puntos asegurados / Nueva ronda" claro |
| 6. Rutas (3 circuitos) | 0 | 0 | No | "RESERVA AL FINALIZAR 5" vs "conservar al menos cuatro" (G1-L01) | OK (163 s) | Avance de circuito automático; copy de fallo (Reintentar/Continuar) presente |
| 7. Faro (4 turnos) | 0 | 0 | No | Confirmación en 2 pasos (G1-L07) | OK (147 s) | "Continuar aventura" da control de lectura; feedback por miembro tras cada turno; BehindPanel con labels de constructos (G1-P08, decisión pendiente) |
| 8. Reporte final | 0 | 0 | No | No | OK | 8/8 constructos con score provisional + confianza; caveats sin cámara correctos (MUESTRAS 0, "Confianza limitada"); 0 frases "No medido"/"Solo descriptivo" |
| 9. Dashboard HR | 0 | 0 | No | No | OK | "WORKSPACE HR · DATOS SINTÉTICOS" + "Solo revisión humana" visibles |

Feedback entre niveles/juegos (pregunta del checklist): siempre claro (resumen por nivel en Láser, "Ruta completada" en Rutas, "Continuar aventura" en Faro). Ninguna transición se sintió larga o abrupta; la generación del reporte tras "Cerrar misión" fue <10 s.

### 4.2 Móvil 390×844

| Pantalla | Overflow horiz. | Errores consola | Otro |
|---|---|---|---|
| Landing | No (sw=cw=390) | 0 | CTA ancho completo, legible |
| Consentimiento | No | 0 | — |
| Láser (mount nivel 1) | No | 0 | Celdas de grid **38×38 px** → confirma G1-P04 bajo mínimo táctil (44 px) |
| Reporte fixture | No (pageH 8464, scroll vertical) | 0 | 0 "No medido"/"Solo descriptivo"; tarjetas de constructos legibles |

### 4.3 Nuevos hallazgos (recorrido vivo)

| ID | Superficie | Hallazgo | Severidad | Ref | Estado |
|---|---|---|---|---|---|
| G1-L01 | Rutas (circuitos 2–3) | La tarjeta "RESERVA AL FINALIZAR" muestra `authoredSolution.remainingBudget` (lo que deja la ruta de referencia) con un label que se lee como requisito; en circuito 2 el reto dice "conservar al menos cuatro" y la tarjeta dice "5" → el jugador no sabe cuál es la regla real de éxito | Mayor (G.2 copy) | `PassengerRouteOptimizationTask.jsx:482` | Abierto — fix de copy/label |
| G1-L02 | Láser | "Comprobar ruta" queda activo tras cada movimiento; un check prematuro (ruta incompleta) es posible y afecta `reconfigurationCount`/eficiencia. El status "Pieza reubicada. Comprueba la ruta o ajusta otra pieza" invita al check temprano | Menor (decisión G.2) | `LaserPuzzlePostulationTask.jsx` (btn primary) | Cerrado 2026-08-27 — decisión de usuario: **aclarar solo en copy**. Implementado en W2: hint bajo el botón "Comprueba cuando quieras: el resultado definitivo se registra al completar el nivel"; el botón conserva enabled; telemetría sin cambios (un check prematuro solo registra una response `level_incomplete`; el agregado final se construye desde refs al finalizar — sin versionar feature vector) |
| G1-L03 | Láser móvil | Celdas 38×38 px en 390×844. **Cerrado 2026-08-27 (AA conforme):** 38 px ≥ mínimo WCAG 2.5.8 (24 px, nivel AA) ✓; 44 px (WCAG 2.5.5, AAA) es físicamente inviable en grid 8×8 a 390 px (8×44=352 + gaps/padding = overflow). Documentado como diseño, no defecto | Cerrado (AA) | grid `laser-puzzle-task` (mobile) | Cerrado — medido en vivo |
| G1-L04 | HUD fondo | "PROCESANDO EN SEGUNDO PLANO / Procesos listos 1 de 5" es técnico para la audiencia candidata durante todo el juego | Menor (G.2) | `BehindTheScenesMiniHud.jsx` | Cerrado 2026-08-27 (G.2 wave 1): copy "Procesos listos N de M" → "N de M listos" — TDD 15/15 + verificado en vivo (no se refleja en la fila hasta hoy; el fix sí estaba en `9f260ef`) |
| G1-L05 | Batería (pacing) | Duración observada del flujo completo (jugada pausada): 367 s Láser + 70 s Globo + 163 s Rutas + 147 s Faro ≈ 12,5 min en juego + transiciones/reporte. Objetivo G.4: 10–12 min | Menor (G.4) | reportes por juego | Parcial 2026-08-27 (W2): pacing percibido de Láser mejorado con overlay de completado (stats movimientos vs par) + intersticio narrativo entre niveles (nombre + objetivo); sin cambio de mecánicas (regla dura de agregados); estimado ~13 min en juego; re-medición con participantes reales pendiente en beta M6 |
| G1-L06 | Faro | Confirmación en 2 pasos por turno (elegir opción + "Selecciona un comando") añade un clic; mitigación: evita clicks en falso | Menor (decisión G.2) | `TeamCoordinationPostulationTask.jsx` | Cerrado 2026-08-27 — decisión de usuario: **mantener 2 pasos** (control de lectura en una tarea de juicio social; pacing 147 s ya en objetivo). Sin cambio de código |
| G1-L07 | Reporte (G.6) | 8 tarjetas "DEMO PROVISIONAL" con score 0–100 + confianza %: correcta y consistente, pero jerarquía visual favorece el número sobre el caveat (el candidato no técnico ve primero "100") | Menor (G.6) | `PostulationReportScreen.jsx` | Cerrado 2026-08-27 (W5): chip "DEMO PROVISIONAL" sólido (índigo/white) ahora DENTRO de la caja del score + caveat adyacente "Sin baremos · no comparable" bajo el número; número atenuado (0.95rem). TDD: 8/8 cajas fixture original; 0 "No medido"/"Solo descriptivo" (regla #72); verificado en vivo (captura 35) |
| G1-L08 | Faro (contrato R-6) | El reporte muestra "Adaptabilidad 78 (confianza 55%)" como score provisional de Faro; el wording "insufficient" de AGENTS.md/plan describe el estado pre-Faro | Decisión/verificación (T.4) | `originalGameTalentMapping.js` buildAdaptability | En curso — registrado en T.1 §10.4 (matriz v2, 2026-08-27) como "ambigua/no resuelta — pendiente T.4" (tensión R-6: leadership/communication not_measured en tareas individuales vs Faro como juicio social estructurado). UX sin cambios |

### 4.4 Positivo (verificado en vivo)

- 0 errores de consola y 0 fallos de red en todo el flujo (desktop real + móvil + fixture + HR).
- Sin overflow horizontal en ninguna pantalla (desktop y 390×844).
- Flujo completo sin cámara degrada según contrato: reporte con `MUESTRAS 0`, `camera_not_enabled_or_no_samples`, "Confianza limitada en la señal local; interpretar con cautela", y sin inferencias.
- Balloon: la ausencia de pérdida se reporta como señal desconocida, no baja ("No hubo suficientes pérdidas… la señal queda desconocida, no baja") ✓.
- i18n ES consistente en los 4 juegos; toggle ES/EN presente en todas las pantallas.
- Fixture → reporte directo: 0 "No medido"/"Solo descriptivo" en reporte completo (regla pitfall #72) ✓.
- Transiciones de juego/circuito/nivel automáticas, ~1,5–3 s, sin estados rotos observados.

### 4.5 Anomalía no reproducida

- En la primera extracción del mount de Láser se leyó el haz en fila 0 (celdas 1,0/3,0/6,0) en vez de columna 0. Dos repros controlados posteriores (lectura inmediata t0 y a t+2,5 s tras entrar a juegos) muestran el haz correcto desde el mount (columna 0, `dir: down`, aria y clases coherentes con `laserPuzzleTelemetry.js` L95). Tratado como artefacto de extracción; sin cambio de código. Si reaparece en QA manual: revisar `compactGrid`/primer paint de `traceLaserBeam` (L90 `useMemo`).

## 5. Siguientes pasos

Cola de G.2–G.6 ordenada por severidad × frecuencia (hallazgos P0X del pre-audit + L0X del recorrido vivo):

1. **G.2 (copy/claridad):** G1-L01 (cerrado 2026-08-27) y G1-L04 (cerrado 2026-08-27) — copy de HUD y label de Passenger. **Oleada W3 (2026-08-27):** micro-instrucciones animadas ≤15s completas en los 4 juegos (`GameMicroIntro`, skippable, 0 telemetría antes del dismiss); barra de progreso consistente (`GamePips` W1). **Pendiente: práctica previa sin puntaje** (backlog).
2. **G.5 (accesibilidad/robustez):** targets táctiles — G1-P04 cerrado (flags del pre-audit eran display; "Registrar replanteo" 40→44 px fix + verificado en vivo) y G1-L03 cerrado como AA-conforme (grid 8×8 a 390 px). Quedan: G1-P01 (teclado en los 4 juegos), G1-P05 (alineación breakpoints 760/768), pérdida de foco (depende de la semántica T).
3. **G.2/G.6 (decisiones de producto) — CERRADAS 2026-08-27 (usuario):** G1-L02 (copy only, implementado W2), G1-L06 (2 pasos, sin cambio), G1-L07 (W5: jerarquía score-vs-caveat implementada).
4. **G.4 (pacing):** G1-L05 parcial (W2: overlays/intersticios de Láser; mecánicas intactas) — re-medir en beta M6.
5. **Contrato R-6 (cruce con T):** G1-L08 — registrado en la matriz T.1 §10.4 como "ambigua/no resuelta — pendiente T.4" (2026-08-27); resolver en T.4, no en UX.
6. **G1-P08 — CERRADO 2026-08-27 (decisión de usuario):** BehindPanel se mantiene con constructos en vivo (transparencia); wording → T.4.

Reglas por sub-trabajo de G:

- Gate: tests focales RED→GREEN + oxlint + build + smoke navegador desktop/móvil + **diff de fixture payload sin cambios** (agregados allowlist inmutables). Tras los fixes G.2 (copy) y G.5 (touch target) de 2026-08-27: suite completa **411/411**, oxlint 0 errores, build OK, `git diff --check` limpio, verificado en vivo en Chrome. **Tras la oleada W1–W3/W5 (2026-08-27): suite completa 436/436**, oxlint 0 errores, build OK, audit 0 vuln, `git diff --check` limpio; smoke vivo desktop + móvil 390×844 con 0 errores consola / 0 overflow; `postulationDemoFixture.js` y la cadena de agregados sin modificar (payload diff estructuralmente intacto).
- G.5 (teclado + pérdida de foco) depende de que T defina la semántica de trial invalidado (ver cruce en plan de oleadas).
- T.2 ya cerrado (2026-08-27): `docs/research/local-signal-sync-audit.md` + `src/telemetry/localSignalSync.test.js` (6/6 GREEN); G1-P06 (fallback de reloj) queda como latente-monitorizado con regresión.
