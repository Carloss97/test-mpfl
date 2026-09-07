# H1 — Audit por vista/sección (baseline + checklist)

**Fecha:** 2026-09-07 (parcial — recorrido vivo pendiente de browser)
**Estado:** EN CURSO. La vista viva (5 juegos + overflow desktop/móvil + consola) quedó
bloqueada por caída del browser compartido (WS 401/auth). Este doc recoge lo verificable
por código + visitas en vivo completadas antes de la caída. Para sign-off del usuario
antes de H2/H3 se requiere completar la sección PENDIENTE.

Rutas vistas: landing `/` vía `/postulaciones?battery=original`, guard de invitación
(`/postulaciones?token=…`), setup (consentimiento + cámara opcional), reporte
(`/postulaciones?fixture=1&battery=original`), `/reclutador`.

---

## Método
- **En vivo (completado antes de la caída del browser 401):** landing, setup/consent,
  reporte con fixture. Confirmados flujo y copy ES (cámara local opcional, consentimiento
  explícito, continuar a juegos). Reporte con fixture mostró resumen ejecutivo HR completo.
- **Por código (todo verificado):** CSS de badges provisionales, comentarios del repo,
  rutas del frontend, copy ES/EN en i18n.

## Hallazgos por código

### R1. BUG de layout — badge "Score provisional" solapa las cards de constructos
- **Repro:** `/postulaciones?fixture=1&battery=original` → sección constructos.
  Reportado como incidencia en el scope de C1 (comentario 2026-09-06 23:27), confirmado
  en código.
- **Causa (código):** en `PostulationReportScreen.jsx:74-75` el tag
  `.postulation-demo__provisional-tag--solid` es un `inline-flex width:max-content` con
  `margin-bottom:7px` dentro del contenedor score que es grid (`place-items:center`,
  height 64px). Con el contenido ES "Score provisional" (largo) + el valor numérico, la
  fila se compacta y el tag invade el área del score. Ver `postulationDemo.css:1900-1928`.
- **Severidad:** visual, solo reporte (no afecta datos). Bloquea el sign-off visual H1
  pero no B1/B2.
- **Fix sugerido (para H2/H3, no en H1 que es audit-only):** dar al tag `position:relative`
  + `white-space:nowrap`, o moverlo fuera del grid del score (bloque separado arriba del
  valor), o bajar a 0 `align-content` y forzar `line-height`.

### Copy ES/EN
- Landing, setup y reporte confirman `t('es','en')` por toda la vista (i18n central:
  `src/i18n`). El toggle ES/EN está integrado en los headers de cada página (cambio H4.1/
  H3). Sin texto quemado en español visible en las vistas inspeccionadas.
- Pendiente verificación en vivo del flujo de juegos con toggle EN (mismo bloqueo browser).

### Privacidad / agregados
- Datos del reporte son agregados (`provisional_score`, `descriptive_only`, límites
  explícitos). Sin exposición de biométricos brutos. Fixture marca claramente
  "Datos sintéticos de demostración" (banner `postulation-demo__fixture-banner`), y el
  reporte lleva "NO IMPLICA VALIDEZ PSICOMÉTRICA". Buen estado.
- Dashboard `/reclutador` carga desde la API staging; campo ausente → página en blanco
  defensivo (`?? []`), que mantiene el mapeo completo (pitfall B1 #6 ya cerrado).

### A11y
- Botones usan `type="button"`, secciones con `aria-label`/`aria-busy`/`role="status"`
  (guard de invitación, cards de score `aria-label` con `<construct> de 100, score
  provisional`). El `label` del score provisional expone el texto accesible correctamente.
- Pendiente: foco de teclado + orden de tabulación en flujo de juegos (bloqueado browser).

## PENDIENTE (bloqueado por browser compartido WS 401 — no relanzado)
1. Recorrido vivo de los 5 juegos (laser_puzzle, balloon_risk, passenger_routes,
   team_coordination, tangram) — estado rico en pantalla, desktop 1280x720 + móvil 390x844.
2. **Captura 1 screenshot por juego** en `docs/qa/c1-audit-shots/<gameId>.png` (scope
   adicional C1 + candidatas del hero H4.2).
3. Consola/page errors + overflow por vista (landing, guard, setup, reporte, /reclutador).
4. Verificación toggle EN en flujo de juegos + verificación del bug reportado en vivo.

Estos ítems se reanudan cuando el browser compartido se recupere. No se relanza ningún
worker dependiente hasta entonces.

## Estado para sign-off usuario
- BLOQUEADO parcialmente: la captura viva y el sign-off visual requieren el browser.
- Hallazgo accionado de código listo: R1 (badge provisional) → se corrige en H2/H3.
- C1 queda también pendiente de su scope adicional de screenshots.