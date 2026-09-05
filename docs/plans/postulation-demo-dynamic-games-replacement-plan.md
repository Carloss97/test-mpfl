# KRUMM Postulation Demo — Plan de reemplazo de juegos dinámicos

**Repo:** `/mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/test-mpfl`  
**Ruta demo:** `/postulaciones-demo`  
**Estado base:** demo funcional, privacy-safe, con Dv2/F/E/G implementadas; QA indica que el drawer queda resuelto si pasa a modo estático en resoluciones bajas.  
**Objetivo de esta fase:** reemplazar o evolucionar los juegos actuales por experiencias más dinámicas, visualmente claras y aptas para demo externa, sin romper telemetría agregada, privacidad ni reporte.

---

## 1. Diagnóstico resumido

### Funcionalidad actual

La demo actual completa el flujo:

1. landing;
2. setup/cámara local opcional;
3. juegos;
4. HUD/drawer explicativo;
5. `gameCorrelation.aggregate`;
6. `assessment_feature_vector_v2`;
7. reporte final privacy-safe;
8. fixture sintético `?fixture=1`.

### QA actual

Resuelto / aceptado:

- Drawer/HUD se considera resuelto si en baja resolución pasa a **modo estático/reservado**, con scroll interno y sin tapar estímulos/botones.
- Selector de cámara quedó legible en segunda pasada.
- Labels de progreso quedaron más explícitos.
- Logs MediaPipe/TFLite observados son no críticos mientras no haya crash/chunks/assets fallidos.

Pendiente:

- Contraste bajo de botones, chips, targets y distractores.
- Visibilidad débil en baja resolución/proyección/zoom.
- Posible scroll horizontal bajo 1366×768 o zoom alto.
- Reporte funcional pero poco compacto en baja altura.
- Juegos funcionales pero demasiado estáticos para demo externa.

---

## 2. Restricciones no negociables

1. **Privacy-safe estricto.**
   - No video crudo.
   - No frames.
   - No landmarks faciales crudos.
   - No keypoints/normalizedKeypoints crudos de MoveNet.
   - No rutas de puntero reconstructivas.
   - No raw game events en payload final.

2. **Mantener contratos existentes.**
   - `game_event_v1` o eventos normalizados compatibles.
   - `stimulus_shown` + `response` para correlación temporal.
   - `gameCorrelation.aggregate`.
   - `assessment_feature_vector_v2`.
   - `PostulationDemoApp` aislado en `/postulaciones-demo`.
   - Fixture `?fixture=1` funcionando.
   - Reporte y descargas bloqueadas si `validationOk` no es OK.

3. **TDD RED-GREEN.**
   - Cada juego nuevo/evolucionado debe tener helpers puros testeados antes de integración UI.
   - Tests de no raw telemetry.
   - Tests de estabilidad de re-render.
   - Tests responsive de baja altura/ancho si aplica.

4. **UX de demo externa.**
   - Botones y targets visibles aun en 1366×768, 1280×720 y zoom 125%.
   - Feedback inmediato.
   - Dinámica clara en menos de 60–90 segundos por bloque.
   - Estados active/hover/focus/disabled distinguibles.
   - No depender de color pastel de bajo contraste para información crítica.

---

## 3. Principios visuales para los juegos nuevos

Inspiración de la referencia visual validada:

- fondo gris/blanco limpio;
- cards redondeadas;
- sombras suaves, no como único delimitador;
- acentos pastel, pero con texto/targets de alto contraste;
- HUD secundario y no competitivo;
- foco en la tarea, no en la telemetría.

Tokens mínimos propuestos:

| Token | Uso | Requisito |
|---|---|---|
| `gameSurface` | card principal | borde visible contra fondo |
| `gameText` | texto primario | alto contraste |
| `gameMuted` | texto secundario | no menor a contraste legible |
| `gameButtonText` | botones activos | no parecer disabled |
| `gameButtonBorder` | affordance botón | visible sin hover |
| `gameTarget` | target/estímulo principal | distinguible a baja resolución |
| `gameDistractor` | distractores | visibles sin confundirse con fondo |
| `gameFocusRing` | teclado/foco | externo, consistente, no selección |
| `gameDisabled` | disabled real | visible + razón/contexto |

---

## 4. Propuesta de reemplazo por juego

### 4.1 Precisión visomotora → “Ruta de precisión adaptativa”

**Problema actual:** funcional, pero visualmente muy pálido/estático; targets y guía tienen bajo contraste.

**Nueva dinámica:**

- El usuario inicia en un pad claro.
- Aparecen targets de tamaño/distancia variable.
- Hay micro-animación breve de target activo.
- Se muestra feedback instantáneo:
  - precisión;
  - overshoot;
  - trayectoria eficiente;
  - tiempo.
- La dificultad aumenta por distancia/tamaño, no por invisibilidad.

**Métricas agregadas:**

- `reactionTimeMs`;
- `movementTimeMs`;
- `distancePx`;
- `targetSizePx`;
- `fittsId`;
- `spatialErrorPx`;
- `overshootCount`;
- `pathEfficiency`;
- `throughput`.

**Eventos mínimos:**

- `stimulus_shown` cuando target aparece.
- `response` cuando usuario completa click/touch.
- `game_end` con summary.

---

### 4.2 Go/No-Go → “Semáforo de impulso”

**Problema actual:** el botón `Responder` se ve casi invisible y ambiguo; GO/NO-GO es funcional pero estático.

**Nueva dinámica:**

- Señales como tarjetas/semáforos de alto contraste.
- GO: botón claramente activo.
- NO-GO: botón visible pero bloqueado con copy explícito: `Espera · no responder` o sin botón activo.
- Feedback inmediato:
  - correcto GO;
  - inhibición correcta;
  - comisión;
  - omisión.
- Ritmo con breve countdown/pulse, no exceso visual.

**Métricas agregadas:**

- `correctGoRate`;
- `correctWithholdRate`;
- `commissionErrorRate`;
- `omissionErrorRate`;
- `correctGoRT`;
- `postErrorSlowingMs`.

**Regla clave:** withholding correcto sigue siendo timeout/no respuesta, no botón manual.

---

### 4.3 Interferencia cognitiva → “Stroop interactivo de tarjetas”

**Problema actual:** botones de respuesta demasiado pálidos; foco/estado pueden parecer disabled.

**Nueva dinámica:**

- La palabra aparece en card central con color de tinta de alto contraste.
- Respuestas como tarjetas grandes con texto oscuro y borde visible.
- Feedback visual breve después de responder:
  - correcto;
  - interferencia;
  - error.
- Opción de keyboard support opcional: 1/2/3/4.
- Mantener longitud de palabras españolas (`AMARILLO`) responsive.

**Métricas agregadas:**

- `congruentAccuracy`;
- `incongruentAccuracy`;
- `congruentRT`;
- `incongruentRT`;
- `conflictCostMs`;
- `errorRate`.

---

### 4.4 Búsqueda visual → “Panel de búsqueda con distractores vivos”

**Problema actual:** target/distractores casi desaparecen por bajo contraste; grilla es estática y puede quedar pegada al borde inferior.

**Nueva dinámica:**

- Grilla compacta y centrada con tiles de alto contraste.
- Distractores con formas claramente visibles.
- Target sólido visible, pero la dificultad viene de set size, distractores y tiempo, no de invisibilidad.
- Feedback inmediato al click:
  - target encontrado;
  - distractor;
  - tiempo.
- Posible micro-variación entre rondas: set size 8/12/16, no animación excesiva.

**Métricas agregadas:**

- `setSize`;
- `distractorCount`;
- `reactionTimeMs`;
- `clickDistanceToTargetPx`;
- `searchEfficiency`;
- `accuracy`.

---

## 5. Orden recomendado de implementación

### Fase DG-0 — UI token pass antes del reemplazo completo

**Estado:** [x] Implementada — tokens visuales, contraste base, hooks de juegos, reporte compacto y labels en español.

Objetivo: corregir el mayor blocker visual sin rehacer lógica.

Tareas:

- Crear/centralizar estilos de alto contraste para tareas.
- Reforzar botones y estímulos actuales.
- Añadir smoke visual/Playwright para overflow horizontal.
- Compactar reporte bajo altura <800px.

Entrega esperada:

- QA-003/004/008 mejoran sin cambiar comportamiento.
- Permite una demo interna más segura mientras se construyen juegos nuevos.

### Fase DG-1 — Reemplazo de Go/No-Go

**Estado:** [x] Implementada primera evolución — “Semáforo de impulso” con copy dinámico GO/NO-GO, botón de alto contraste, instrucciones explícitas y scoring/telemetry intactos.

Motivo: es el problema más visible de botón ambiguo y es simple de rehacer sin gran riesgo.

TDD:

- Helpers de trials y scoring.
- Semántica de timeout para NO-GO.
- No raw telemetry.
- Re-render stability.

### Fase DG-2 — Reemplazo de Interferencia cognitiva

**Estado:** [x] Implementada — Stroop como tarjetas interactivas de alto contraste, helper `buildColorInterferenceChoiceCards()`, feedback inmediato `buildColorInterferenceFeedback()`, y contratos de scoring/telemetry preservados.

Motivo: impacto directo en la captura principal de referencia y contrastes.

TDD:

- Palabras largas responsive.
- Contraste/estados por clase CSS.
- Congruente/incongruente summary.
- Keyboard/focus si se agrega.

### Fase DG-3 — Reemplazo de Búsqueda visual

**Estado:** [x] Implementada — panel de búsqueda activa, objetivo explícito, tiles responsive de alto contraste con `buildVisualSearchGridMetrics()` y `buildVisualSearchTilePresentation()`, manteniendo click-distance agregado y sin exportar grillas/items crudos.

Motivo: requiere diseño de tiles/set size y validación de visibilidad.

TDD:

- Generación determinística de grillas.
- Target único.
- Click distance privacy-safe.
- Fit en 1366×768/1280×720.

### Fase DG-4 — Reemplazo de Precisión visomotora

**Estado:** [x] Implementada — “Ruta de precisión adaptativa” con start pad, corredor ideal, blanco activo, feedback de ruta y `adaptivePrecision` agregado sin rutas crudas.

Motivo: mayor complejidad por path/target/Fitts, pero alto valor demo.

TDD:

- Fitts ID estable.
- Start pad → target flow.
- Path summary agregado, no raw path.
- Overshoot/correction summary.
- Fit responsive.

### Fase DG-5 — Integración final y segunda QA

**Estado:** [x] Implementada — config/runbook/QA actualizados, IDs estables, fixture/reportes preservados y smoke automatizado preparado para segunda pasada manual.

- Actualizar `POSTULATION_DEMO_BATTERY` si cambian IDs/labels.
- Mantener fixture y reportes.
- Actualizar documentación QA/runbook.
- Smoke real con cámara, sin cámara y fixture.

---

## 6. Archivos probables a tocar

| Área | Archivos |
|---|---|
| Config demo | `src/postulation-demo/postulationDemoConfig.js` |
| Stage | `src/postulation-demo/PostulationGameStage.jsx` |
| Estilos demo | `src/postulation-demo/postulationDemo.css` |
| Juegos actuales | `src/tasks/PrecisionTargetingTask.jsx`, `GoNoGoTask.jsx`, `ColorInterferenceTask.jsx`, `VisualSearchTask.jsx` |
| Tests actuales | `src/tasks/*test.jsx`, `src/postulation-demo/PostulationQaFixes.test.jsx` |
| Telemetry contracts | `src/telemetry/gameTelemetry.js`, `gameCorrelation.js`, `gameFeatureVector.js` |
| Session/report | `src/postulation-demo/postulationDemoSessionBuilder.js`, `PostulationReportScreen.jsx` |
| Docs | `docs/demo/postulation-demo-qa-smoke-template.md`, `docs/demo/postulation-demo-runbook.md` |

---

## 7. Verificación por fase

Comandos base:

```bash
NODE_ENV=test npx vitest run src/tasks src/postulation-demo --pool=forks --maxWorkers=1 --reporter=default
npx oxlint src/tasks src/postulation-demo src/main.jsx
npm run build
npm audit --audit-level=high --omit=dev
```

Smoke browser:

```bash
NODE_ENV=development npx vite --host 127.0.0.1 --port 5173
```

Rutas:

```text
/postulaciones-demo
/postulaciones-demo?fixture=1
```

Playwright checks mínimos:

- 1366×768;
- 1280×720;
- 1440×900;
- 1920×1080;
- no horizontal overflow;
- drawer estático/reservado en baja resolución;
- botones/targets visibles;
- fixture reporta 4/4 juegos;
- sin console/page errors críticos.

---

## 8. Criterios de aceptación final

- [x] Los cuatro juegos se sienten dinámicos y claramente interactivos.
- [x] Ningún botón activo parece disabled.
- [x] Targets/distractores se distinguen en baja resolución.
- [x] No hay scroll horizontal en 1280×720 ni 1366×768 según smoke automatizado.
- [x] Drawer/HUD permanece estático/reservado en baja resolución y no tapa la tarea.
- [x] `gameCorrelation.aggregate` sigue poblándose.
- [x] `assessment_feature_vector_v2` sigue presente.
- [x] Fixture `?fixture=1` funciona.
- [x] Reporte final y descargas siguen validando privacy-safe.
- [x] No se exportan raw video/frames/landmarks/keypoints/pointer paths/raw game events en payload final.
- [x] QA actualizado para segunda pasada manual final.

---

## 9. Decisión recomendada

No reemplazar todos los juegos en un solo cambio grande. Primero hacer **DG-0 UI token pass** para resolver contraste/overflow y dejar la demo presentable. Luego reemplazar juego por juego en el orden:

1. Go/No-Go;
2. Interferencia cognitiva;
3. Búsqueda visual;
4. Precisión visomotora.

Esto reduce riesgo, conserva telemetría validada y permite QA incremental.
