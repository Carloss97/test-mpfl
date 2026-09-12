# C6 — Audit visual del mundo + reporte 10° constructo (EXP-COMM-001, KRU-107)

Fecha: 2026-09-11 · Autor: worker C6 (t_b17fd176) · Estado: **PASS — 0 fallos, 0 errores de consola**

## Alcance

- **A (1280×720, `/dev/control-room?mode=session`)**: welcome → práctica P1 (estado de
  respuesta: incident + panel DATOS DEL SISTEMA + burbuja NPC con avatar + tarjetas de
  respuesta) → envío de tarjeta → estado post-envío. Zonas Doc 2 §6 presentes
  (`cr-incident`, `cr-facts`, `cr-npc-bubble`, `cr-response`). Consecuencia/feedback
  neutral (Doc 2 §2/§20.1): ninguna frase revela acierto/erro.
- **B (1280×720, `/postulaciones?fixture=1&battery=original`)**: reporte fixture de la
  batería original con **7 juegos** y **10 constructos**. Aserciones de texto (case-insensitive):
  "10 constructos con señal de prueba", "Comunicación aplicada", "Sala de Control",
  "Coordinación efectiva" (feedback control_room), "diez constructos tienen señal de juego",
  "7/7 juegos completados", "4 lectura(s) se mantienen descriptivas", "Escenarios evaluados"
  (métricas de la card), "sin score compuesto ni baremos". **Sin "No medido" ni
  "Evidencia insuficiente"** en sesión completa (semántica R-6).
- **C (390×844)**: mundo móvil (welcome + práctica P1 + post-envío) — sin scroll horizontal
  (DoD §16.2, 320–599 px).
- **D (390×844)**: reporte fixture móvil — mismas aserciones clave de B + overflow 0.

## Metodología

- Playwright chromium-1234 headless sobre Vite dev 127.0.0.1:5173.
- Script reproducible: `scripts/audit-t_b17fd176-c6-comm-visual.mjs`
  (`BASE_URL=… node scripts/audit-t_b17fd176-c6-comm-visual.mjs`).
- **Pi 3.8 GB**: cada sección corre en un **browser propio** (launch/close) — la página del
  reporte fixture es la más pesada del app y no debe compartir proceso de browser con otra
  página (ERR_INSUFFICIENT_RESOURCES documentado en `docs/design/modulos/control_room.md` §16).
- **innerText vs text-transform**: el label del feedback (`strong`) renderiza en MAYÚSCULAS
  por CSS (`text-transform: uppercase`), por lo que las aserciones de texto del reporte son
  case-insensitive (bug de auditoría detectado y corregido en este cierre).

## Resultados

- 4/4 runs OK. 0 overflow horizontal. 0 console errors / 0 page errors / 0 request failures.
- Shots: `a-01-welcome-1280x720.png`, `a-02-practice-response.png`, `a-03-post-send.png`,
  `b-04-report-fixture-1280x720.png`, `b-05-report-fixture-full-1280x720.png`,
  `c-06-welcome-390x844.png`, `c-02-practice-response.png`, `c-03-post-send.png`,
  `d-08-report-390x844.png`.
- Verificación visual (vision) de `a-02` (mundo) y `d-08` (reporte móvil): sin solapes,
  sin glitches, jerarquía legible, CTA "Enviar mensaje" correctamente disabled sin selección.

## Machine-readable

`smoke-result.json` (este directorio): runs, consoleErrors, failures, ok=true.
