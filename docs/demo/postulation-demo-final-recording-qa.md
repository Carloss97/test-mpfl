# KRUMM Postulation Demo — QA final para grabación

**Fecha:** 2026-07-21  
**Alcance:** candidato + batería original + reporte fixture + dashboard HR  
**Estado esperado:** release candidate de demo; no producto psicométrico validado

## 1. URLs fuente de verdad

- Candidato: `http://127.0.0.1:5173/postulaciones-demo?battery=original`
- Reporte sintético: `http://127.0.0.1:5173/postulaciones-demo?fixture=1&battery=original`
- Dashboard HR: `http://127.0.0.1:5173/postulaciones-demo/hr`

No usar como fuente de verdad el HTML histórico de Downloads.

## 2. Preflight técnico

- [ ] Solo existe un listener en `127.0.0.1:5173`.
- [ ] Vite se inició con `NODE_ENV=development` y `--strictPort`.
- [ ] Zoom del navegador en 100%.
- [ ] Sin extensiones/popups que interfieran con la captura.
- [ ] Consola sin errores; warnings MediaPipe/TFLite informativos no bloquean.
- [ ] Cámara seleccionada y encuadre probado, o fallback sin cámara preparado.
- [ ] Micrófono/grabador y resolución de captura confirmados.

Comando:

```bash
NODE_ENV=development npx vite --host 127.0.0.1 --port 5173 --strictPort
```

## 3. Landing candidato

- [ ] Se ve `KRUMM Postulaciones`.
- [ ] Se ve `Batería original · Demo controlada`.
- [ ] Duración original: `10–12 min`.
- [ ] CTA principal visible y con jerarquía clara.
- [ ] Cámara descrita como opcional y de calidad/contexto.
- [ ] No aparecen `FaceMesh`, `AUs/FACS`, `MoveNet`, schemas ni payloads.
- [ ] Acceso HR es secundario; no confunde la experiencia candidato.
- [ ] Sin overflow horizontal en desktop o móvil.

## 4. Preparación de sesión

- [ ] Título `Preparación de la sesión`.
- [ ] Copy aclara que la cámara no infiere talento por sí sola.
- [ ] `Continuar a juegos` funciona sin cámara.
- [ ] Si la cámara falla, aparece `Reintentar cámara` habilitado.
- [ ] Selector multicámara tiene fondo, borde, texto y foco visibles.
- [ ] Drawer técnico está cerrado por defecto.
- [ ] Al abrir drawer, tiene scroll interno y no tapa controles.
- [ ] Ningún target táctil visible mide menos de 44px en móvil.

## 5. Juegos originales

| Juego | Inicio claro | Progresión | Feedback visible | Resoluble | HUD no interfiere | Estado |
|---|---|---|---|---|---|---|
| Puzzle láser | [ ] | [ ] 3 niveles | [ ] | [ ] | [ ] | [ ] PASS |
| Globo de riesgo | [ ] | [ ] 8 rondas | [ ] | [ ] | [ ] | [ ] PASS |
| Rutas de pasajeros | [ ] | [ ] 3 circuitos | [ ] | [ ] | [ ] | [ ] PASS |
| Brief de equipo | [ ] | [ ] 4 escenarios | [ ] | [ ] | [ ] | [ ] PASS |

Checks específicos:

- [ ] Laser muestra objetivos/relés y no admite solución accidental conocida.
- [ ] Balloon diferencia inflar/asegurar y no llama “precisión” al riesgo.
- [ ] Passenger muestra energía, pasajeros/destinos y no duplica entregas.
- [ ] Team muestra trabajo por detrás sin texto libre ni opción elegida persistida.
- [ ] Progreso global indica `Juego N de 4`.
- [ ] Sin bloqueos, solapamientos ni overflow horizontal.

## 6. Reporte fixture original

- [ ] Banner `Datos sintéticos de demostración` visible.
- [ ] Título `Reporte de demostración listo para revisión humana`.
- [ ] Cabecera `Integridad de archivos verificada · no implica validez psicométrica` y `Reporte local listo`.
- [ ] El entorno sintético está colapsado y aclara que sus métricas no pertenecen a una persona real.
- [ ] El `runId` no aparece en el hero; solo en drawer técnico.
- [ ] `Resumen ejecutivo HR` visible.
- [ ] Tarjeta `8 constructos con señal de demo`, con distintivo `Demo provisional`, score y confianza por constructo.
- [ ] Advertencia visible: scores no validados, sin baremos y no aptos para comparar personas.
- [ ] Detalles de alcance/validación están colapsados para un recorrido legible.
- [ ] Liderazgo, comunicación y adaptabilidad presentes con caveats.
- [ ] Cuatro tarjetas de resultados por juego con métricas pertinentes.
- [ ] No aparecen `No medido`, `Solo descriptivo` o `Evidencia insuficiente` en fixture completo.
- [ ] No aparecen enums/schemas internos en la superficie principal.
- [ ] Las observaciones visibles están humanizadas; flags internos quedan en el bundle técnico.
- [ ] No ranking automático, diagnóstico ni recomendación de contratación.
- [ ] Descarga de reporte y bundle disponible.

## 7. Dashboard HR

- [ ] Ruta `/postulaciones-demo/hr` abre sin depender del flujo candidato.
- [ ] Datos marcados explícitamente como sintéticos.
- [ ] KPIs, búsqueda, filtros y cola cronológica son legibles.
- [ ] No existe ranking por score ni recomendación contratar/rechazar.
- [ ] Perfil completo muestra ocho constructos, juegos y preguntas de entrevista.
- [ ] Perfil en progreso muestra `Pendiente`, nunca score cero inventado.
- [ ] Desktop y móvil sin overflow horizontal.
- [ ] Targets móviles visibles miden al menos 44px.

## 8. Privacidad y gobernanza

- [ ] Sin video, frames, screenshots, landmarks o keypoints persistidos/exportados.
- [ ] Sin rutas/celdas/pointer samples/eventos crudos.
- [ ] Team no persiste texto, opción, categoría ni secuencia de elecciones.
- [ ] Cámara se presenta como calidad/contexto, no talento/emoción/persona.
- [ ] Señal ausente = desconocida/caveated, no bajo desempeño.
- [ ] `humanReviewOnly` y `noAutomatedDecision` preservados.

## 9. Gates automatizados

- [x] Focales de archivos modificados.
- [x] Suite completa Vitest: `96` archivos / `405` tests.
- [x] Oxlint: `0` warnings / `0` errores.
- [x] Build producción: `1395` módulos transformados.
- [x] Audit high: `0` vulnerabilidades.
- [x] `git diff --check`.
- [x] Smoke original desktop `1280×720`: `failures: []`.
- [x] Smoke original móvil `390×844`: `failures: []`.
- [x] Smoke feedback multirruta desktop/móvil: `8/8` rutas PASS.
- [x] Smoke HR desktop/móvil: `failures: []`.

## 10. Resultado final

- [x] Listo para grabación.
- [ ] Listo con caveats operacionales documentados.
- [ ] Requiere corrección antes de grabar.

Notas finales:

```text
Automatización final verde. La validación psicométrica/normativa sigue fuera del alcance de la demo y se comunica explícitamente en la UI.
Antes de REC solo queda ejecutar el preflight manual de cámara, audio, zoom, notificaciones y grabador.
```
