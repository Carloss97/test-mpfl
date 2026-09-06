# Handoff — Nueva sesión: iterar la landing pública KRUMM

**Fecha:** 2026-09-05 (actualizado 09-06: integración Tangram EXP-001 completada y suite verde)
**Repo:** `/home/sarlock/krumm/test-mpfl` (rama `main`, remoto `Carloss97/test-mpfl`, GitHub)
**Modelo:** `qwen-model` (GPU Lambda 2xH100 activa, túnel local :18000 — ver protocolo en AGENTS.md §GPU)
**Ruta:** `src/landing/LandingPage.jsx` + `src/landing/landing.css`

> El usuario pidió EXPLÍCITAMENTE: "deja el handoff para en una nueva sesión modificar landing page". Abajo el estado y el trabajo pendiente de UI/UX.

## Estado vigente al cierre (verificado)

- **Dominio desplegado y funcionando:** `krumm.cl` y `www.krumm.cl` → AWS CloudFront `EDQ39PDNI931R` (cert ACM `d201648d` ISSUED; el cert `701c9f50` quedó FAILED solo por el subdominio www — ignorarlo, no se usa).
- **Rutas vivas:**
  - `/` → landing pública (`LandingPage.jsx`)
  - `/postulaciones` → portal candidato (antes `/postulaciones-demo`)
  - `/reclutador` → dashboard HR (antes `/postulaciones-demo/hr`)
  - `/postulaciones-demo/*` → redirect automático a las nuevas (en `src/main.jsx`)
- **Cambios UI/UX hechos y PENDIENTES de redesplegar** (modificados en `src/landing/*`, `src/postulation-demo/postulationDemo.css`, `src/main.jsx`):
  1. Landing modernizada: hero alineado, secciones «Qué hacemos / Cómo funciona / Contacto» con recuadros de color (`#4dd4ac/#74a7ff/#ffd166/#ff6b6b`), numeración en pasos, contacto como bloque final.
  2. `LanguageToggle` pasó de botón flotante a slot fijo en la barra de navegación (`.krumm-lang-toggle` en `postulationDemo.css` ahora `position: static`; ya no tapa contenido).
  3. Emails de contacto: `contacto@krumm.cl` y `carlossaldivia@krumm.cl`.
  4. Se quitó el `LanguageToggle` global de `src/main.jsx` (se renderiza por página).
- **NUEVO en esta sesión — integración Tangram EXP-001 completada** (el 5.º juego de la batería original):
  - Batería original ahora = 5 juegos: laser, balloon, passenger, team_coordination, `tangram_exp001`.
  - Módulo de reporte nuevo `src/tasks/original-games/tangramReportFeedback.js` (+tests), categorías `efficient_assembly` / `move_overhead_review` / `incomplete_assembly`.
  - `candidateInstructionCheck.js`: `summarizeTangram` (soporte de instrucciones).
  - `PostulationReportSummary.js`: métricas + feedback + labels de tangram.
  - `TangramPostulationTask.jsx`: arreglado el arranque de evaluación (`setIntroDone(true)` en el botón start-eval — antes el tutorial nunca pasaba a play durante transición evaluativa).
  - Copy actualizada: landing «batería de 5 juegos», `originalTimeEstimate` 14–16 min.
- **Git:** `main` en `e4310ba` (commit "refactor(ui): landing…"). El trabajo de Tangram + arreglos de tests está SIN commitear. Verifica con `git status`.

## Trabajo pendiente para la nueva sesión (usuario debe guiar con más detalle)

1. **Redesplegar** el estado actual (o continuar iterando antes de subir):
   ```bash
   npm run build && BUCKET=krumm-staging-frontend-931932531447 DISTRIBUTION_ID=EDQ39PDNI931R \
     bash scripts/deploy-frontend.sh
   ```
   *Nota:* `scripts/deploy-frontend.sh` usa `PROFILE=default` (corregido; **no** `admin-carlos`).
2. **UI/UX general de todas las páginas** (usuario: "Mejora la UI/UX en general de todas las paginas. Haz solo un par de iteraciones... te daré instrucciones más detalladas más adelante"). Foco sugerido:
   - Coherencia visual del tema KRUMM (dark `#07111f`, acentos `#4dd4ac`/`#74a7ff`) entre landing, /postulaciones y /reclutador.
   - Revisar que el botón de idioma esté bien anclado en /postulaciones y /reclutador (hoy solo está en la landing; el flujo candidato usa el componente PostulationLanding que NO incluye LanguageToggle — decide si debe).
   - Verificación visual con navegador real (Vite `:5173` o el dominio) en desktop + móvil antes de dar por bueno.
   - Mantener «sin demo» en texto visible (regla del usuario).
   - Revisar visualmente el flujo Tangram (tutorial → transición → 4 niveles) y el reporte con la tarjeta de Ensamblaje Geométrico.

## Comandos de verificación y gates (recordatorio AGENTS.md)

```bash
NODE_ENV=test npx vitest run <focales> --pool=threads --reporter=default
npx oxlint src/postulation-demo src/landing src/tasks/original-games src/main.jsx   # 0 warnings
npm run build
bash scripts/deploy-frontend.sh   # tras build
```

Nota test lento: `laserPuzzleTelemetry.test.js` "does not author throwaway…" tiene timeout explícito de 180s por la BFS bajo carga en la Pi.

## GPU / modelo (activo)

- vLLM up sirviendo `qwen-model` (Qwen3.8-27B-FP8) en `http://127.0.0.1:18000/v1`. Salud: `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:18000/v1/models` → 200. (NO usar `/health`: responde 200 con cuerpo vacío y es normal.)
- Costo vivo ~$6.38/h; watchdog apaga tras 40 min idle o 6 h. Si el boot se pierde: `sudo systemctl restart krumm-vllm.service` en la instancia (ver `~/.hermes/gpu_state.json` para la IP).
- `config.yaml` default ya es `qwen-model`.

## Alertas (nuevo)

- Cron job `krumm-alerts` (`142f86b5517f`, cada hora) entrega informe de estado al canal **hermes-alerts** (`discord:1545165790641258557`). El chequeo de GPU usa `/v1/models` (ver arriba). Varía la salida (no [SILENT]) para que siempre publique.

## Recordatorios operativos de esta sesión

- **kanban.db está lockeada por el dispatcher:** usar CLI `hermes kanban …`, NO SQL directo (evita `database is locked`).
- **Cuidado con `git checkout --theirs`:** en el merge inicial consumió la versión local en 20 archivos; si vuelve a pasarlo, preferir `git reset --hard <commit-pre-merge>` y reaplicar con stash.
- Tarjeta kanban `t_b59056de` (GH200/supersede GPU) archivada por pedido del usuario.