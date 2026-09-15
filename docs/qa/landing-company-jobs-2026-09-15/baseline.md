# Baseline visual y QA: landing, empresa y empleos

Fecha de baseline: 2026-09-15
Ámbito: superficies públicas sin autenticación ni datos de sesión.

## Rutas y matriz visual

El smoke reproducible `scripts/smoke-landing-company-jobs-2026-09-15.mjs` recorre cada ruta en contextos de navegador aislados: borra `localStorage` y `sessionStorage`, no sigue el flujo de Cognito y no usa credenciales.

| Ruta | Superficie | Perfiles de captura |
| --- | --- | --- |
| `/` | Landing pública | 1440×900, 1280×720, 390×844 móvil |
| `/portal` | Selector de portal | 1440×900, 1280×720, 390×844 móvil |
| `/empresa/acceso` | Acceso de empresa, sin activar login | 1440×900, 1280×720, 390×844 móvil |
| `/empleos` | Bolsa de empleos | 1440×900, 1280×720, 390×844 móvil |
| `/empleos/analista-control-planta` | Detalle de oferta activa | 1440×900, 1280×720, 390×844 móvil |

El perfil 390×844 usa emulación móvil de Playwright (`isMobile: true`, `hasTouch: true`, `deviceScaleFactor: 2`), no solo un viewport estrecho. El detector compara el ancho de documento con el ancho configurado de captura; también registra el ancho de layout reportado por la página para que una página que ensanche su layout móvil no quede enmascarada.

## Ejecución local preferida

```bash
npm run build
NODE_ENV=production npx vite preview --host 127.0.0.1 --port 4173
BASE_URL=http://127.0.0.1:4173 node scripts/smoke-landing-company-jobs-2026-09-15.mjs
```

La ejecución escribe 15 capturas y `baseline-results.json`. `BASE_URL`, `QA_OUTPUT_DIR` y `QA_REPORT_PATH` permiten cambiar origen y destinos sin modificar el script. Usar una URL de stage solo si su configuración pública ya está disponible; el script no necesita ni acepta credenciales.

## Criterio de resultado y evidencia

Los overflows conocidos se registran en `knownBaselineFindings` y no hacen fallar la ejecución. Solamente `unexpectedFindings` (incluidos errores de consola, `pageerror`, solicitudes fallidas, fallas de navegación, contraste no calculable o el proxy de foco) producen código de salida distinto de cero. Los únicos pares de overflow aceptados son portal, acceso de empresa, empleos y detalle de empleo en 1280×720 y 390×844; un overflow en cualquier otro par sigue siendo una regresión.

El JSON incluye hora de inicio y fin UTC, commit Git disponible, versión y SHA-256 del script, versiones de Playwright y Chromium, plataforma/OS, y un manifiesto SHA-256 de cada captura.

Controles registrados por pantalla:

- Ancho de documento frente al viewport configurado y bandera de overflow horizontal.
- Tamaño computado de tipografía de títulos de empleo y dimensiones de iconos de metadatos cuando existen.
- Proxy de foco por estilos computados (`outline`) tras foco programático. **No es una prueba completa de accesibilidad ni de visibilidad perceptual.**
- Colores computados de primer plano/fondo y ratio de contraste del CTA principal. Para CTA con gradiente se conserva el `background-color` computado disponible para revisión visual.
- Eventos `console.error`, `pageerror` y solicitudes fallidas.

Para una comprobación determinista del clasificador, `QA_INJECT_UNEXPECTED_OVERFLOW=1` añade un hallazgo de prueba no permitido y debe terminar con código 1; no modifica la aplicación.

## Resultado de stage público

Ejecución contra `https://stage.krumm.cl`, iniciada `2026-09-15T17:59:46.953Z` y terminada `2026-09-15T18:00:53.625Z`:

- 15/15 capturas generadas, con manifiesto SHA-256 en `baseline-results.json`.
- 8 overflows conocidos registrados separadamente; 0 hallazgos inesperados y 0 errores de consola/página/solicitud.
- Código de salida 0: los overflows de baseline no ocultan ni convierten nuevos overflows en éxito.
- Proveniencia: commit `0c7762920d35b138cb42d7ca1f90d4899921f477`, script `2026-09-15.2` SHA-256 `6150b9efb20d75860b9642884429a687e80480874f715da073be694c606b22ef`, Playwright `1.61.1`, Chromium `151.0.7922.34`, Linux `6.18.34+rpt-rpi-v8` arm64.

Resultado estructurado y evidencia: `docs/qa/landing-company-jobs-2026-09-15/baseline-results.json` y las 15 PNG del mismo directorio.

## Resultado de build y smoke local de producción

Esta evidencia es independiente del baseline de stage: no sobrescribe `baseline-results.json` ni los PNG de stage. La vista previa se limitó a `127.0.0.1:4174`, no utiliza autenticación, credenciales ni datos de sesión.

Comandos ejecutados desde la raíz del repositorio, con salida cero:

```bash
node --check scripts/smoke-landing-company-jobs-2026-09-15.mjs
npm run build
npm exec vite preview -- --host 127.0.0.1 --port 4185 --strictPort
BASE_URL=http://127.0.0.1:4185 \
  QA_OUTPUT_DIR=docs/qa/landing-company-jobs-2026-09-15/local-production \
  QA_REPORT_PATH=docs/qa/landing-company-jobs-2026-09-15/local-production/results.json \
  node scripts/smoke-landing-company-jobs-2026-09-15.mjs
```

- `node --check`: salida 0.
- `npm run build`: salida 0; Vite `8.0.16` produjo el bundle en `dist/` en 6.52 s. Solo informó el aviso no bloqueante de chunks mayores a 500 kB.
- Smoke local: salida 0, iniciado `2026-09-15T18:06:58.030Z` y finalizado `2026-09-15T18:07:36.957Z`; 15/15 capturas, 0 hallazgos inesperados, 0 errores de consola/página/solicitud y 8 overflows conocidos registrados de forma separada.
- Proveniencia local: URL `http://127.0.0.1:4185`; commit `0c7762920d35b138cb42d7ca1f90d4899921f477`; script `2026-09-15.2` SHA-256 `6150b9efb20d75860b9642884429a687e80480874f715da073be694c606b22ef`; Playwright `1.61.1`; Chromium `151.0.7922.34`; Linux `6.18.34+rpt-rpi-v8` arm64.
- Resultado estructurado completo: `docs/qa/landing-company-jobs-2026-09-15/local-production/results.json`.

### Manifiesto local de capturas

| Captura | SHA-256 |
| --- | --- |
| `local-production/landing-1440x900.png` | `406145d3fb16625fb9f7b176b9e6dfc5ffa84420b95c11afe50f4a9a4b39cf5b` |
| `local-production/portal-1440x900.png` | `fc550c8d15f6bc3678b59f343f781c8bf2929d9f2fc261ffecbdc5c0c2687550` |
| `local-production/company-access-1440x900.png` | `5d41aaf79916fc45de856c58dd6ccf3d1b16fcf10e925d726b802a4b97854ce5` |
| `local-production/jobs-1440x900.png` | `bad8a8b25b5d8cca88f95a893d75b6b7e1c09b91d4bd91f774e97a19c6a98716` |
| `local-production/job-detail-1440x900.png` | `ee1a3099cec429b546a7d327415d6a8b25ef60a3b48f3d295c3f10a5da013834` |
| `local-production/landing-1280x720.png` | `feb688fc0e54a4ccdf349f69f06216db08eef0d064078fd417bdcdb2ee69617c` |
| `local-production/portal-1280x720.png` | `7cf597a5a108139cb3ddd46e99a910133b0bd100b585c8b62948b779598e7c53` |
| `local-production/company-access-1280x720.png` | `9802e248edf469c740d10879f0e0fdf85c1f39429fe221d9862e2e74436cd0bd` |
| `local-production/jobs-1280x720.png` | `29cd93685faa6facbc24c34539c05931d343fa0f3e957546da621a6d37924e64` |
| `local-production/job-detail-1280x720.png` | `c0c792fbc90469ac2640382415c3dd524f84510895f633a8d8531da41ec3d7b8` |
| `local-production/landing-390x844.png` | `b86b1b228d7023099b1f0a273695b97c5fd5b41354843ba5b6a0174e9df3a6cc` |
| `local-production/portal-390x844.png` | `72c42e9690f23228e773e753f151601f85e3bc33f8bb9e2e495bb785de6491e4` |
| `local-production/company-access-390x844.png` | `88232e788153b8c09624ad4f4b1e84f76cf32fef2d9360994940b2d3d0dc95e2` |
| `local-production/jobs-390x844.png` | `086b9760b653f199d1d17f857fa9b09b57716a740336c7ba616ef00f9f0a5e79` |
| `local-production/job-detail-390x844.png` | `9f2590013f756dd7ac77d7d4e946859b372c3378a25ad12c6bb402f0efec81fb` |
