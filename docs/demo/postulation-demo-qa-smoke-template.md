# KRUMM Postulation Demo — QA editable Fase J/I

**Documento editable para smoke manual, QA visual responsive e issues.**  
**Repo:** `/mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/test-mpfl`  
**Ruta real:** `http://127.0.0.1:5173/postulaciones-demo`  
**Ruta fixture:** `http://127.0.0.1:5173/postulaciones-demo?fixture=1`  
**Fecha QA:** __13__ / __10__ / __2023__  
**Responsable:** ___Carlos Saldivia Heinz_______________________  
**Navegador:** ______Edge____________________  
**Dispositivo / cámara:** ________EMEET SmartCAmS600__________________

---

## 0. Arranque y evidencias base

### Comando de arranque

```bash
cd /mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/test-mpfl
NODE_ENV=development npx vite --host 127.0.0.1 --port 5173
```

> Usar `NODE_ENV=development`; con `NODE_ENV=production` heredado Vite puede quedar en blanco por `$RefreshSig$`.

### Evidencia de entorno

- [ X] Vite levanta sin error.
- [ X] La URL local aparece en consola.
- [ X] No hay otros Vite escuchando en `5173` antes/después de QA.
- [ X] DevTools Console abierta durante el smoke.
- [ X] Network sin fallos críticos de assets JS/CSS.

Notas:

```text

```

---

## 1. Matriz de resoluciones

| Resolución | Navegador/zoom | Landing | Setup | Gameplay | HUD drawer | Reporte | Fixture | Estado global | Screenshot/ruta |
|---|---:|---|---|---|---|---|---|---|---|
| 1366×768 | _EDGE___ | [ X] OK [ ] Issue | [ X] OK [ ] Issue | [ X] OK [X ] Issue | [ X] OK [ ] Issue | [ X] OK [ ] Issue | [ X] OK [ ] Issue | [ ] PASS [X ] FAIL | |![alt text](image.png)
| 1440×900 | __EDge__ | [ X] OK [ ] Issue | [ X] OK [ ] Issue | [ ] OK [ X] Issue | [ ] OK [X ] Issue | [ ] OK [X ] Issue | [ ] OK [X ] Issue | [ ] PASS [X ] FAIL | |
| 1920×1080 | __Edge__ | [X ] OK [ ] Issue | [X ] OK [ ] Issue | [X ] OK [ ] Issue | [ ] OK [X ] Issue | [ ] OK [X ] Issue | [ X] OK [ ] Issue | [ X] PASS [ ] FAIL | |
| Otra: __2560x1440____ | __Edge__ | [X] OK [ ] Issue | [ X] OK [ ] Issue | [ X] OK [ ] Issue | [X ] OK [ ] Issue | [ X] OK [ ] Issue | [X ] OK [ ] Issue | [ X] PASS [ ] FAIL | |

---

## 2. Smoke real con cámara permitida

### 2.1 Landing

- [X ] Abre `/postulaciones-demo`.
- [X ] Se ve `KRUMM Postulaciones`.
- [X ] No aparece dashboard técnico.
- [X ] CTA `Comenzar demo de postulación` visible.
- [X ] Copy de privacidad y revisión humana claro.
- [X ] No hay texto cortado ni cards solapadas.

Notas / issues:

```text

```

### 2.2 Setup / señales

- [ X] Click en `Comenzar demo de postulación`.
- [ X] Se ve `Preparación de señales`.
- [ X] Botón `Activar cámara local` visible.
- [ X] Permitir cámara.
- [ X] Cámara local se activa o muestra caveat claro.
- [ X] HUD compacto aparece sin invadir la vista.
- [ X] No se muestra malla, puntos crudos, frames ni dashboard técnico.

Notas / issues:

```Recuadro para seleccion de camara apenas se ve con colores sin contraste, se recomienda mejorar contraste y visibilidad de la seleccion de camara![alt text](image-1.png)

```

### 2.3 Gameplay

Para cada juego, marcar visibilidad, usabilidad e interferencias del HUD.

| Juego | Inicia | Se juega sin bloqueo | HUD no tapa objetivos | Eventos/progreso visible | Issue ID |
|---|---|---|---|---|---|
| Precisión visomotora | [X ] | [ X] | [X ] | [X ] | |
| Go/No-Go | [X ] | [X ] | [X ] | [X ] | |
| Interferencia cognitiva | [X ] | [X ] | [X ] | [X ] | |
| Búsqueda visual | [X ] | [X ] | [X ] | [X ] | |

Notas / issues:

```text

```

### 2.4 HUD drawer vivo

- [X ] Botón `Ver qué pasa detrás` visible durante gameplay.
- [X ] Al abrir, muestra `performance.now()`.
- [ X] Muestra `LOCAL INFERENCE`.
- [ X] Muestra `gameCorrelation.aggregate`.
- [ X] Muestra `assessment_feature_vector_v2`.
- [ X] Muestra mensaje `No contiene datos reconstructivos`.
- [ ] El drawer no tapa por completo el juego ni impide continuar.
- [ X] Si se desborda, el HUD hace scroll interno.
- [X ] No aparecen labels raw/reconstructivos visibles (`landmarks`, `keypoints`, `rawGameEvents`, `pointerSamples`, `faceSamples`, `windows`).

Notas / issues:

```text
segun la resolución el drawer se ve cortado, se recomienda mejorar el diseño para que sea responsive y no se corte en resoluciones menores a 1366x768![alt text](image-2.png). También, simplificar la información que se muestra en el drawer para que sea más legible y fácil de entender para cualquiera, ya que si no aporta información relevante para el usuario final y puede generar confusión, mejor quitar.
```

### 2.5 Reporte final

- [ X] Se ve `Reporte listo para revisión humana`.
- [X ] Se ve `OK privacy-safe` si validó.
- [X ] Sección `Calidad de sesión y validación` visible.
- [ X] Sección `Perfil de capacidades` visible.
- [ X] Sección `Resultados por juego` visible.
- [X ] Sección `Gobernanza y caveats` visible.
- [X ] Drawer técnico del reporte visible y entendible.
- [ X] No hay claims de decisión automática, diagnóstico ni selección automática.
- [ X] Caveats aparecen si corresponde.

Notas / issues:

```text

```

### 2.6 Descargas

| Acción | Esperado | Resultado | Ruta/archivo descargado | Issue ID |
|---|---|---|---|---|
| Descargar reporte local | `.md` o reporte legible | [X ] OK [ ] Fail | | |
| Descargar bundle técnico | múltiples artefactos locales | [X ] OK [ ] Fail | | |
| Descargar HTML técnico | archivo HTML | [X ] OK [ ] Fail | | |
| Descargar JSON | JSON privacy-safe | [X ] OK [ ] Fail | | |
| Descargar payload | payload validado | [X ] OK [ ] Fail | | |
| Descargar manifiesto | manifest | [X ] OK [ ] Fail | | |

Notas / issues:

```text

```

---

## 3. Smoke sin cámara / cámara denegada

- [ X] Abrir `/postulaciones-demo` en sesión limpia/incógnito o resetear permiso.
- [ X] No activar cámara o denegar permiso.
- [ X] Continuar a juegos.
- [ X] Completar juegos.
- [X ] Reporte se genera.
- [X ] Aparecen caveats explícitos por falta de señal.
- [X ] No inventa calidad facial, rostro presente ni confianza facial.
- [ X] Descargas siguen disponibles si payload valida.

Notas / issues:

```text

```

---

## 4. Smoke fixture sintético

Abrir:

```text
http://127.0.0.1:5173/postulaciones-demo?fixture=1
```

- [X ] Abre directo en reporte.
- [X ] No aparece landing inicial.
- [X ] Banner `Datos sintéticos de demostración` visible.
- [X ] Texto `Fixture local privacy-safe` visible.
- [X ] Reporte tiene juegos completos.
- [X ] Se ve `gameCorrelation.aggregate` / correlación agregada en contexto técnico.
- [ X] Se ve `assessment_feature_vector_v2` en contexto técnico.
- [ X] Descarga reporte local.
- [ X] Descarga bundle técnico.
- [ X] Queda claro que no es una sesión real.

Notas / issues:

```text

```

---

## 5. Consola, Network y errores

| Pantalla | Console errors | Page errors | Network failures | Estado | Notas |
|---|---|---|---|---|---|
| Landing | [ X] No [] Sí | [ X] No [ ] Sí | [ X] No [ ] Sí | [ X] PASS [ ] FAIL | |
| Setup | [ ] No [X ] Sí | [ X] No [ ] Sí | [ ] No [ X] Sí | [ ] PASS [ X] FAIL | |
| Gameplay | [ ] No [ X] Sí | [X ] No [ ] Sí | [ ] No [ X] Sí | [ ] PASS [ X] FAIL | |
| Reporte | [ X] No [ ] Sí | [X ] No [ ] Sí | [X ] No [ ] Sí | [X ] PASS [ ] FAIL | |
| Fixture | [ X] No [ ] Sí | [ X] No [ ] Sí | [X ] No [ ] Sí | [ X] PASS [ ] FAIL | |

Logs relevantes:

```text
vision_wasm_module_internal.js?import:1407 INFO: Created TensorFlow Lite XNNPACK delegate for CPU.
vision_wasm_module_internal.js?import:8357 W0714 20:24:49.920000 2136208 gl_context.cc:1118] OpenGL error checking is disabled
vision_wasm_module_internal.js?import:8357 W0714 20:24:49.832000 2136208 face_landmarker_graph.cc:180] Sets FaceBlendshapesGraph acceleration to xnnpack by default.
```

---

## 5.1 Revisión Hermes sobre criticidad

### Estado general observado

- La demo se ve **pulida y utilizable** en general.
- Hay problemas importantes de **UI/UX responsive**, principalmente en el HUD/drawer y contraste de algunos controles.
- No se observa un bloqueo funcional total en el flujo principal, pero **1366×768 y 1440×900 no deberían darse por PASS** hasta revisar/corregir drawer y reporte.
- Los logs de MediaPipe/TFLite (`INFO`, `W...`, XNNPACK/OpenGL warnings) **no son críticos por sí solos** si no van acompañados de crash, pantalla en blanco o pérdida de inferencia. En cambio, cualquier asset JS/CSS fallido, chunks faltantes o errores React sí deben quedar como `High` o `Blocker` según impacto.

### No-go para demo externa

- [ ] Drawer cortado o ilegible en 1366×768.
- [ ] Botones de respuesta con contraste tan bajo que parecen deshabilitados.
- [ ] Console/Page error que rompa navegación, cámara, juego, reporte o descarga.
- [ ] Network failure de bundle/chunk/asset crítico.
- [ ] Reporte final incompleto o descargas fallando.
- [ ] Lenguaje que sugiera decisión automática, diagnóstico o selección automática.

---

## 5.2 Checklist reforzado de drawer/HUD

| Criterio | 1366×768 | 1440×900 | 1920×1080 | 2560×1440 | Notas / Issue |
|---|---|---|---|---|---|
| HUD no tapa estímulo ni botones | [ ] PASS [ ] FAIL | [ ] PASS [ ] FAIL | [ ] PASS [ ] FAIL | [ ] PASS [ ] FAIL | |
| Drawer abierto no queda cortado | [ ] PASS [ ] FAIL | [ ] PASS [ ] FAIL | [ ] PASS [ ] FAIL | [ ] PASS [ ] FAIL | |
| Drawer tiene scroll interno si se desborda | [ ] PASS [ ] FAIL | [ ] PASS [ ] FAIL | [ ] PASS [ ] FAIL | [ ] PASS [ ] FAIL | |
| Texto del drawer se entiende por usuario no técnico | [ ] PASS [ ] FAIL | [ ] PASS [ ] FAIL | [ ] PASS [ ] FAIL | [ ] PASS [ ] FAIL | |
| `4/5` explica qué mide o no genera confusión | [ ] PASS [ ] FAIL | [ ] PASS [ ] FAIL | [ ] PASS [ ] FAIL | [ ] PASS [ ] FAIL | |
| `Reporte Pendiente` se entiende como estado esperado | [ ] PASS [ ] FAIL | [ ] PASS [ ] FAIL | [ ] PASS [ ] FAIL | [ ] PASS [ ] FAIL | |
| No aparecen labels raw/reconstructivos | [ ] PASS [ ] FAIL | [ ] PASS [ ] FAIL | [ ] PASS [ ] FAIL | [ ] PASS [ ] FAIL | |

Notas drawer/HUD:

```text

```

---

## 5.3 Checklist reforzado por juego

| Juego | Objetivo QA principal | Contraste controles | HUD no interfiere | Feedback respuesta claro | Eventos sincronizados | Issue ID |
|---|---|---|---|---|---|---|
| Precisión visomotora | Objetivos/start-pad visibles; no confundir con RT simple | [ ] PASS [ ] FAIL | [ ] PASS [ ] FAIL | [ ] PASS [ ] FAIL | [ ] PASS [ ] FAIL | |
| Go/No-Go | GO/NO-GO distinguible; withholding por timeout, no botón manual | [ ] PASS [ ] FAIL | [ ] PASS [ ] FAIL | [ ] PASS [ ] FAIL | [ ] PASS [ ] FAIL | |
| Interferencia cognitiva | Color de tinta inequívoco; botones legibles; foco vs selección claro | [ ] PASS [ ] FAIL | [ ] PASS [ ] FAIL | [ ] PASS [ ] FAIL | [ ] PASS [ ] FAIL | |
| Búsqueda visual | Target/distractores legibles; área clickeable clara | [ ] PASS [ ] FAIL | [ ] PASS [ ] FAIL | [ ] PASS [ ] FAIL | [ ] PASS [ ] FAIL | |

Notas revisión de juegos:

```text

```

---

## 6. Issue log normalizado

| ID | Severidad | Pantalla | Resolución | Repro steps | Resultado esperado | Resultado observado | Evidencia | Estado |
|---|---|---|---|---|---|---|---|---|
| QA-001 | [ ] Blocker [x] High [ ] Medium [ ] Low | Setup / selector cámara | Todas, visible en setup | 1. Abrir setup 2. Revisar selector cámara | Selector legible, contraste suficiente, foco visible | Recuadro/selector de cámara apenas se ve; bajo contraste | `image-1.png` | [x] Open [ ] Fixed [ ] Won't fix |
| QA-002 | [ ] Blocker [x] High [ ] Medium [ ] Low | HUD drawer gameplay | 1366×768 / 1440×900 | 1. Abrir juego 2. Click `Ver qué pasa detrás` | Drawer completo, legible, con scroll interno y sin tapar tarea | Drawer se ve cortado según resolución; puede tapar/competir con juego | Nota en §2.4; referencia `image-2.png` pendiente/no encontrada en carpeta | [x] Open [ ] Fixed [ ] Won't fix |
| QA-003 | [ ] Blocker [ ] High [x] Medium [ ] Low | Gameplay / Interferencia cognitiva | 1366×768 captura | 1. Abrir juego 3 2. Revisar botones/instrucción | Botones activos legibles y claramente clickeables | Botones e instrucciones muy tenues; algunos parecen deshabilitados | `image.png` | [x] Open [ ] Fixed [ ] Won't fix |
| QA-004 | [ ] Blocker [ ] High [x] Medium [ ] Low | Gameplay / Interferencia cognitiva | 1366×768 captura | 1. Observar foco en botón `Azul` | Foco teclado distinto de selección/respuesta | Borde negro puede confundirse con selección incorrecta | `image.png` | [x] Open [ ] Fixed [ ] Won't fix |
| QA-005 | [ ] Blocker [ ] High [x] Medium [ ] Low | Progreso/HUD | Todas | 1. Revisar header, juego y HUD | Progresos con etiquetas explícitas | Conviven `Juego 3 de 4`, `4/8`, `4/5`, `Eventos 44`; puede confundir | `image.png` | [x] Open [ ] Fixed [ ] Won't fix |
| QA-006 | [ ] Blocker [ ] High [x] Medium [ ] Low | Setup / Gameplay | Edge | 1. Revisar DevTools 2. Distinguir warnings vs errores | Sin console/page errors críticos; warnings MediaPipe clasificados | QA marcó console/network failures en setup/gameplay; logs parecen MediaPipe INFO/WARN no críticos, pero falta clasificar network failure concreto | §5 logs | [x] Open [ ] Fixed [ ] Won't fix |
| QA-007 | [ ] Blocker [ ] High [x] Medium [ ] Low | Reporte/Fixture | 1440×900 / 1920×1080 | 1. Abrir reporte real y fixture 2. Revisar scroll/cards/botones | Reporte completo y responsive sin cortes | Matriz marca issues en reporte/fixture para 1440×900 y reporte para 1920×1080; falta detalle reproducible | §1 matriz | [x] Open [ ] Fixed [ ] Won't fix |

### Detalle extendido de issues

#### QA-001 — Selector de cámara con bajo contraste

- **Severidad:** High
- **Pantalla:** Setup / preparación de señales
- **Resolución/navegador:** Edge, varias resoluciones
- **Pasos:**
  1. Abrir `/postulaciones-demo`.
  2. Entrar a `Preparación de señales`.
  3. Revisar selector/recuadro de cámara.
- **Esperado:** Selector y labels de cámara legibles, con borde/fondo/foco suficientes.
- **Observado:** Selector/recuadro apenas visible por bajo contraste.
- **Evidencia:** `docs/demo/image-1.png`.
- **Notas de fix:** Aumentar contraste de border/background/texto; revisar `:focus-visible`; validar en 1366×768 y 1440×900.

#### QA-002 — Drawer/HUD cortado o demasiado invasivo

- **Severidad:** High
- **Pantalla:** Gameplay HUD/drawer
- **Resolución/navegador:** 1366×768 y 1440×900 principalmente
- **Pasos:**
  1. Entrar a cualquier juego.
  2. Abrir `Ver qué pasa detrás`.
  3. Revisar si el panel queda completo, legible y no tapa controles.
- **Esperado:** Drawer responsive, scroll interno si es necesario, información simplificada y comprensible.
- **Observado:** El drawer puede verse cortado y la información puede ser demasiado técnica para usuario final.
- **Evidencia:** Nota §2.4; `image-2.png` está referenciada pero no aparece actualmente en `docs/demo/`.
- **Notas de fix:** Reducir contenido por defecto; dejar detalle técnico en modo expandido; considerar posición inferior/lateral reservada por breakpoint; añadir etiquetas humanas para `4/5` y `Reporte Pendiente`.

#### QA-003 — Botones/instrucciones con bajo contraste

- **Severidad:** Medium
- **Pantalla:** Interferencia cognitiva
- **Resolución/navegador:** Captura 1366×768 / Edge
- **Pasos:**
  1. Entrar a `Interferencia cognitiva`.
  2. Revisar instrucción y botones de respuesta.
- **Esperado:** Botones activos visibles, texto con contraste suficiente, no parecer disabled.
- **Observado:** Botones e instrucción se ven demasiado pálidos.
- **Evidencia:** `docs/demo/image.png` y captura adjunta.
- **Notas de fix:** Subir contraste de labels/bordes; reducir glow difuso; definir estados `default`, `hover`, `focus`, `selected`, `disabled`.

#### QA-004 — Foco visual confundible con selección

- **Severidad:** Medium
- **Pantalla:** Interferencia cognitiva
- **Resolución/navegador:** Captura 1366×768 / Edge
- **Pasos:**
  1. Entrar a `Interferencia cognitiva`.
  2. Observar botón con foco (`Azul` en captura).
- **Esperado:** Foco accesible pero claramente distinto de respuesta seleccionada.
- **Observado:** Outline oscuro puede parecer selección o respuesta activa.
- **Evidencia:** `docs/demo/image.png`.
- **Notas de fix:** Usar focus ring de marca, externo y consistente; selección debe tener estado visual distinto y feedback posterior.

#### QA-005 — Progresos múltiples potencialmente confusos

- **Severidad:** Medium
- **Pantalla:** Header/juego/HUD
- **Resolución/navegador:** Todas
- **Pasos:**
  1. Observar header y HUD durante juego.
  2. Comparar `Juego 3 de 4`, `4/8`, `4/5`, `Eventos 44`.
- **Esperado:** Cada contador explica qué mide.
- **Observado:** Hay varios contadores simultáneos sin contexto explícito.
- **Evidencia:** `docs/demo/image.png`.
- **Notas de fix:** Cambiar a labels tipo `Pregunta 4 de 8`, `Procesos listos 4 de 5`, `Eventos capturados: 44`, `Reporte: se generará al finalizar`.

#### QA-006 — Clasificar console/network failures

- **Severidad:** Medium hasta confirmar
- **Pantalla:** Setup / Gameplay
- **Resolución/navegador:** Edge
- **Pasos:**
  1. Abrir DevTools Console y Network.
  2. Repetir setup y gameplay.
  3. Separar warnings MediaPipe/TFLite de errores críticos.
- **Esperado:** Sin errores JS ni fallos de assets críticos.
- **Observado:** Matriz marca console/network fail en setup/gameplay; logs pegados parecen INFO/WARN de MediaPipe, no necesariamente críticos.
- **Evidencia:** §5 logs.
- **Notas de fix:** Si son solo `INFO`/`W...` de MediaPipe, documentar como no bloqueante; si hay `Failed to load`, `Uncaught`, chunk missing o 404 de assets críticos, escalar a High/Blocker.

#### QA-007 — Issues de reporte/fixture sin detalle reproducible

- **Severidad:** Medium hasta precisar
- **Pantalla:** Reporte / Fixture
- **Resolución/navegador:** 1440×900, 1920×1080 según matriz
- **Pasos:**
  1. Abrir reporte real y fixture.
  2. Revisar cortes, scroll, cards, botones y descargas.
  3. Adjuntar screenshot y describir región afectada.
- **Esperado:** Reporte/fixture completo, responsive, botones visibles, sin solapes.
- **Observado:** Matriz marca issue, pero faltan notas concretas.
- **Evidencia:** §1 matriz.
- **Notas de fix:** Completar evidencia antes de implementar; puede ser layout, scroll, contraste o contenido demasiado técnico.

---

## 6.1 Fixes aplicados para segunda pasada QA

**Fecha de preparación segunda pasada:** ____ / ____ / ______

| Issue | Fix aplicado | Estado para re-test | Resultado segunda pasada |
|---|---|---|---|
| QA-001 | Se aumentó contraste de camera card y selector de cámara; borde/fondo/texto/focus más visibles. | [x] Listo para re-test | [ ] PASS [ ] FAIL |
| QA-002 | HUD/drawer ahora se vuelve estático bajo 1180px o altura menor a 820px; tiene max-height/scroll interno y copy más humano. | [x] Listo para re-test | [ ] PASS [ ] FAIL |
| QA-003 | Botones de Interferencia cognitiva tienen clase propia, borde/texto más contrastado y apariencia activa. | [x] Listo para re-test | [ ] PASS [ ] FAIL |
| QA-004 | Focus ring de botones usa outline de marca, externo, más consistente que borde negro. | [x] Listo para re-test | [ ] PASS [ ] FAIL |
| QA-005 | Labels se hicieron más explícitos: `Pregunta N de M`, `Tipo: incongruente`, `Procesos listos N de M`, `Eventos capturados`, `Reporte: se generará al finalizar`. | [x] Listo para re-test | [ ] PASS [ ] FAIL |
| QA-006 | Pendiente de segunda pasada: clasificar si los logs son solo warnings MediaPipe/TFLite o errores críticos reales. | [ ] Requiere re-test | [ ] PASS [ ] FAIL |
| QA-007 | Pendiente de segunda pasada: agregar evidencia concreta para reporte/fixture si persiste el issue. | [ ] Requiere re-test | [ ] PASS [ ] FAIL |

### Checklist rápida de segunda pasada

- [ ] Repetir 1366×768 con drawer cerrado y abierto.
- [ ] Repetir 1440×900 con drawer cerrado y abierto.
- [ ] Confirmar que selector de cámara es legible.
- [ ] Confirmar que botones de Interferencia cognitiva no parecen disabled.
- [ ] Confirmar que focus visual no se confunde con selección.
- [ ] Confirmar que no hay scroll horizontal.
- [ ] Clasificar consola/network: `INFO/WARN MediaPipe no bloqueante` vs `error crítico`.
- [ ] Adjuntar `image-2.png` si se mantiene referencia o reemplazarla por screenshot real.

Notas segunda pasada:

```text

```

---

## 7. Criterios de cierre Fase J/I

- [ X] Smoke con cámara permitida completado.
- [ X] Smoke sin cámara/cámara denegada completado.
- [ X] Fixture `?fixture=1` validado.
- [X ] Descargas validadas.
- [ ] Consola sin errores críticos.
- [ X] Network sin fallos críticos.
- [ ] QA responsive en 1366×768.
- [ ] QA responsive en 1440×900.
- [X ] QA responsive en 1920×1080.
- [ X] Issues blocker/high corregidos o documentados.
- [ ] Documentación/runbook actualizado si se descubrió un cambio de flujo.
- [ ] Decisión final marcada abajo.

## 8. Decisión final

- [ ] **Listo para demo interna.**
- [ ] **Listo para demo externa con caveats conocidos.**
- [ ] **Requiere ajustes visuales menores.**
- [ ] **Bloqueado por issue crítico.**

Resumen ejecutivo QA:

```text

```

Próxima acción acordada:

```text

```
