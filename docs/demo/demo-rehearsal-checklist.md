# KRUMM Demo Rehearsal Checklist

**Uso:** completar antes de una presentación real de la demo unificada.  
**Alcance:** verificación local; no registra capturas ni datos personales reales.

---

## 1. Preparación técnica

| Check | Estado | Evidencia/notas |
|---|---:|---|
| `npm run build` ejecutado y verde | [ ] | |
| Focos de demo ejecutados y verdes | [ ] | |
| `npm audit --audit-level=high --omit=dev` sin vulnerabilidades high | [ ] | |
| App levantada con `npm run dev` | [ ] | |
| Navegador abierto en URL local correcta | [ ] | |
| DevTools Console sin errores críticos antes de iniciar | [ ] | |
| Dispositivo de cámara correcto seleccionado | [ ] | |
| Permisos de cámara concedidos | [ ] | |

Comando focal sugerido:

```bash
NODE_ENV=test npx vitest run src/assessment/SignalReadinessPanel.test.jsx src/assessment/UnifiedGameBattery.test.jsx src/assessment/FinalReportPanel.test.jsx src/App.test.jsx --pool=forks --maxWorkers=1
```

---

## 2. Preparación física

| Check | Estado | Evidencia/notas |
|---|---:|---|
| Iluminación frontal suficiente | [ ] | |
| Fondo sin distracciones fuertes | [ ] | |
| Rostro centrado | [ ] | |
| Ambos hombros entran en cuadro | [ ] | |
| Distancia cómoda para teclado/mouse | [ ] | |
| Navegador al 100% o zoom verificado | [ ] | |
| Audio/micrófono de reunión probado si aplica | [ ] | |

---

## 3. Preflight dentro de la app

| Check | Estado | Evidencia/notas |
|---|---:|---|
| Cámara iniciada | [ ] | |
| FaceMesh en `ready` o caveat explicado | [ ] | |
| Signal readiness visible | [ ] | |
| Rostro presente >= 70% o caveat explicado | [ ] | |
| Confianza facial >= 55% o caveat explicado | [ ] | |
| AUs/FACS activos o caveat explicado | [ ] | |
| Gaze calibrando/OK y limitación explicada | [ ] | |
| Postura calibrando/OK y limitación explicada | [ ] | |
| MoveNet detecta hombros o caveat explicado | [ ] | |
| Privacidad explicada antes de iniciar | [ ] | |
| `Demo rápida` seleccionada | [ ] | |

---

## 4. Ensayo del flujo

| Paso | Estado | Notas |
|---|---:|---|
| Apertura en 60 segundos practicada | [ ] | |
| Consentimiento leído sin omitir privacidad | [ ] | |
| Baseline iniciado y completado | [ ] | |
| RT Simple ejecutado | [ ] | |
| Precisión visomotora ejecutada | [ ] | |
| Seguimiento continuo ejecutado | [ ] | |
| Go/No-Go ejecutado | [ ] | |
| Interferencia color-palabra ejecutada | [ ] | |
| Búsqueda visual ejecutada | [ ] | |
| Reporte final generado | [ ] | |
| Preview Markdown/HTML/JSON mostrado | [ ] | |
| Descarga de bundle explicada | [ ] | |
| Historial local mostrado | [ ] | |

---

## 5. Claims y lenguaje seguro

| Check | Estado | Notas |
|---|---:|---|
| No se prometen decisiones automáticas | [ ] | |
| No se presentan proxies como verdades internas | [ ] | |
| No se hacen afirmaciones clínicas | [ ] | |
| No se afirma medir personalidad | [ ] | |
| No se afirma inferir verdad/falsedad | [ ] | |
| Se menciona revisión humana | [ ] | |
| Se mencionan caveats de señal | [ ] | |
| Se menciona necesidad de piloto/validación | [ ] | |

---

## 6. Plan B preparado

| Falla | Acción preparada | Estado |
|---|---|---:|
| Cámara no inicia | revisar permisos, cambiar dispositivo, recargar | [ ] |
| FaceMesh no detecta | mejorar luz, centrar rostro, esperar 2-3 s | [ ] |
| MoveNet sin hombros | alejar cámara/usuario, mostrar caveat | [ ] |
| Juego se alarga | confirmar demo rápida, saltar explicación extensa | [ ] |
| Reporte tarda | mostrar historial local o reporte de backup si existe | [ ] |
| Consola muestra error crítico | detener demo técnica y explicar limitación | [ ] |

---

## 7. Resultado del ensayo

- Fecha/hora:
- Navegador:
- Cámara/dispositivo:
- Resultado general: [ ] Verde / [ ] Con caveats / [ ] Bloqueado
- Caveats observados:
- Errores de consola:
- Acciones antes de demo real:

---

## 8. Criterio de salida

La demo está lista para reunión si:

- build y focos están verdes;
- la app abre y navega sin error crítico;
- el panel de readiness muestra estado interpretable;
- se puede completar la batería demo o existe plan B claro;
- se puede mostrar reporte final o historial local;
- el presentador evita claims no validados.
