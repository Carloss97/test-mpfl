# KRUMM Postulation Demo Runbook

**Ruta:** `/postulaciones-demo`  
**Estado:** Fases E/F/G implementadas — HUD/drawer vivo + reporte productizado + fixture sintético.  
**Objetivo:** ejecutar y validar la demo sin mostrar el dashboard técnico.

## 1. Arranque local

> En esta shell WSL, usar `NODE_ENV=development` para evitar página en blanco de Vite dev.

```bash
cd /mnt/c/Users/sarlo/OneDrive/Escritorio/Proyectos/test-mpfl
NODE_ENV=development npx vite --host 127.0.0.1 --port 5173
```

Abrir demo real:

```text
http://127.0.0.1:5173/postulaciones-demo
```

Plan B sintético para reuniones:

```text
http://127.0.0.1:5173/postulaciones-demo?fixture=1
```

## 2. Flujo de demo recomendado

1. Landing: confirmar que dice `KRUMM Postulaciones` y no aparece dashboard técnico.
2. Setup: explicar cámara local opcional.
3. Opción A — con cámara:
   - click `Activar cámara local`;
   - esperar readiness/HUD;
   - continuar a juegos.
4. Opción B — sin cámara:
   - continuar a juegos;
   - explicar que el reporte tendrá caveats de señal.
5. Completar juegos visibles:
   - Precisión visomotora;
   - Go/No-Go;
   - Interferencia cognitiva;
   - Búsqueda visual.
6. Durante juegos:
   - confirmar HUD pequeño en esquina;
   - abrir `Ver qué pasa detrás` si se requiere explicación;
   - validar que el drawer muestre `LOCAL INFERENCE`, `gameCorrelation.aggregate` y `assessment_feature_vector_v2` sin convertir la demo en dashboard técnico.
7. Reporte final:
   - debe mostrar `Reporte listo para revisión humana`;
   - debe mostrar `OK privacy-safe` si validó;
   - revisar cards de calidad, perfil de capacidades, resultados por juego y caveats;
   - abrir `Qué se procesó en segundo plano` si se requiere explicación técnica;
   - descargar reporte local o bundle técnico.
8. Plan B con fixture:
   - abrir `/postulaciones-demo?fixture=1`;
   - confirmar banner `Datos sintéticos de demostración`;
   - explicar que es un fixture local privacy-safe para fallback/QA visual, no una sesión real.

## 3. Mensaje sugerido para reunión

> “KRUMM ejecuta la batería en el navegador. La inferencia actual es local/edge: juegos, señales agregadas y correlación por ventanas alimentan un reporte de capacidades para revisión humana. No guardamos video, frames, puntos faciales/corporales reconstructivos, rutas crudas de puntero ni eventos crudos. La capa de servidor/LLM y dashboard HR son el siguiente bloque del roadmap, no una decisión automatizada.”

## 4. Qué validar visualmente

- HUD no tapa objetivos del juego.
- El botón `Ver qué pasa detrás` abre el drawer vivo y muestra `LOCAL INFERENCE`, `gameCorrelation.aggregate` y `assessment_feature_vector_v2`.
- La pantalla final parece producto, no raw Markdown.
- Los botones de descarga están visibles.
- El drawer técnico no muestra datos crudos.
- `/postulaciones-demo?fixture=1` abre directo el reporte sintético etiquetado.
- Caveats aparecen cuando falta cámara o correlación.
- Lenguaje conservador: revisión humana, sin decisión automatizada, sin diagnóstico.

## 5. Smoke automatizado mínimo

```bash
NODE_ENV=test npx vitest run \
  src/postulation-demo/BehindTheScenesMiniHud.test.jsx \
  src/postulation-demo/postulationDemoFixture.test.js \
  src/postulation-demo/PostulationReportScreen.test.jsx \
  src/postulation-demo/PostulationDemoApp.test.jsx \
  src/postulation-demo/postulationDemoSessionBuilder.test.js \
  src/postulation-demo/BackgroundSignalOrchestrator.test.jsx \
  --pool=forks --maxWorkers=1 --reporter=default
```

## 6. Gates antes de mostrar

```bash
npx oxlint src/postulation-demo src/main.jsx
npm run build
npm audit --audit-level=high --omit=dev
```

## 7. Próximo bloque recomendado

1. Fase J: smoke manual completo con cámara permitida/denegada, fixture y descargas.
2. Fase I: QA visual responsive en 1366×768, 1440×900 y 1920×1080.
3. Preparar script/checklist final de demo piloto.
4. Después: contrato HR/API antes de dashboard/backend.
