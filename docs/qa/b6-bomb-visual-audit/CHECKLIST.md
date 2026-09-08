# Audit visual — Mundo BOMB + reporte 9° constructo (B6, EXP-7)

- **Fecha:** 2026-09-08 · **Card:** `t_32c02f91` (B6) · **Spec (ley):** `docs/spec/EXP-BOMB-001/` (v1.1.0)
- **Entorno:** Raspberry Pi 5, Chromium headless (ms-playwright chromium-1234) vía
  `scripts/audit-t_32c02f91-b6-bomb-visual.mjs` sobre vite dev `127.0.0.1:5173`.
- **Viewports (2):** 1280×720 (baseline de evaluación, spec §15) + 390×844 (móvil).
- **Resultados:** `smoke-result.json` — **PASS: 0 fallos, 0 console/page errors, 0 request failures.**
  Ejecutable reproducir: `node scripts/audit-t_32c02f91-b6-bomb-visual.mjs` (vite corriendo).

## Shots

| # | Archivo | Etapa |
|---|---|---|
| 1 | `01-welcome-1280x720.png` | Welcome (copy exacta §4.1) |
| 2 | `02-practice-t1-1280x720.png` | Práctica T1 (panel + nodo activo) |
| 3 | `03-l1-execution-1280x720.png` | L1 ejecución (timer normal) |
| 4 | `04-l4-modelb-intro-1280x720.png` | L4 intro — placa MODELO B + aviso |
| 5 | `05-l4-execution-modelb-1280x720.png` | L4 ejecución — manual oculto (···) |
| 6 | `06-session-complete-1280x720.png` | Sesión completa (4/4) |
| 7 | `07-report-fixture-1280x720.png` | Reporte fixture (viewport) |
| 8 | `08-report-fixture-full-1280x720.png` | Reporte fixture (página completa) |
| 10 | `10-welcome-390x844.png` | Welcome móvil + aviso <1024 |
| 11 | `11-practice-390x844.png` | Práctica móvil |
| 12 | `12-report-390x844.png` | Reporte móvil |

## Checklist

| # | Check | Esperado (spec/DoD) | Resultado |
|---|---|---|---|
| 1 | Título welcome exacto | "Simulación de Protocolo Operativo: Desactivación" (Doc 2 §4.1) | ✅ assert in-page |
| 2 | Tutorial T1–T5 completatable | práctica → modal §4.3 → L1 (requisito duro plantilla v2 §2) | ✅ run A |
| 3 | Timer L1 en fase válida | `data-phase` normal/warning/critical (DoD visual vs lógico ≤100 ms) | ✅ assert in-page |
| 4 | L4: placa MODELO B visible | texto + placa, **no solo color** (§14) | ✅ shot 04 (placa rayada + 2 avisos textuales) |
| 5 | L4 encoding: manual transformado | "INTERRUPTOR 3" + "CABLE AZUL" desde el manifest (§8.1) | ✅ assert in-page |
| 6 | L4 execution: manual OCULTO | DoD §16.2: "no existe camino de UI que muestre el manual durante EXECUTION (L2–4)" | ✅ assert in-page (placeholder ···) |
| 7 | Sesión completa | overlay + "Finalizar" (4/4 niveles) | ✅ shot 06 |
| 8 | Overflow horizontal 0 | 1280×720 y 390×844, todas las etapas | ✅ `overflowPx = 0` (10 checks) |
| 9 | Consola limpia | 0 console errors / page errors / request failures | ✅ `smoke-result.json` |
| 10 | Reporte: título "9 constructos con señal de prueba" | constructo 9° sin regredir los 8 (Aceptación B6) | ✅ assert in-page (desktop + móvil) |
| 11 | Reporte: card "Memoria de trabajo procedimental (experimental)" | `descriptive_only` → label "Descriptivo", Confianza 20%, caveat experimental | ✅ assert + verificado visual (shot 08, card 9) |
| 12 | Reporte: copy "los nueve constructos tienen señal de juego" | mapa de evidencia | ✅ assert in-page |
| 13 | Reporte: card de juego BOMB | "Desactivación de secuencias (Bomba)" con Niveles 4/4, Retención 100%, Orden serial 100%, Errores 1, Tiempo 55s + feedback "Protocolo retenido" (caveat §3.3/§12.1) | ✅ verificado visual (shot 08) |
| 14 | Reporte: ausencia de "No medido" en sesión completa original | gate R-6 (pitfall #72) | ✅ assert in-page |
| 15 | Móvil: aviso <1024 px visible | §15 (viewport registrado en integridad) | ✅ assert in-page + shot 10 |
| 16 | Integración producción: mundo BOMB en stage de postulación | sin scroll interno (ventana 648 px @1280×720) | ✅ medido: mundo = 482 px en welcome/práctica/encoding/ejecución |

## Nota de layout (verificación visual)

En la card 9 del mapa de evidencia, el label "Descriptivo" dentro del score-box de
64 px se renderiza igual que en las cards 1 y 5 (`decisionMaking`, `adaptability` —
comportamiento existente desde R-6, box `--provisional` de 2 líneas). No es una
regresión de B6: el 9° constructo reutiliza el mismo componente
`WorkbookTalentCard`. Sin solapes con el título (verificado en el crop de la card 9
de `08-report-fixture-full-1280x720.png`).

## Pendientes (fuera de scope de la audit)

- Touch real en dispositivo (headless no cubre; mismo residual que G.6 de tangram).
- Cámara/biometría: off por defecto en BOMB (spec §1/§19) — superficie de cámara
  global pendiente de T.3b (sensibilidades MoveNet/FaceMesh, `t_c1892485`).
- `stable_dg`: **NO** se incorpora BOMB a la batería pública (5 juegos) hasta
  pilotaje (decisión B6 — ver handoff).
