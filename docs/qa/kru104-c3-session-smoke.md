# C3 — 6 bloques + tutorial T1-T5 + contenido: smoke de sesión (KRU-104)

Fecha: 2026-09-11 · Autor: orquestador (C3, t_d5965d8d) · Estado: **PASS 24/24 (navegador) + 42/42 (jsdom)**

## Alcance verificado
Orquestación de sesión §4 (Doc 2): bienvenida → tutorial T1-T5 (2 práctica) → salida →
evaluación (12 escenarios, 6 bloques con intro) → final neutra.
- **Bienvenida** §5.1 (title/sub/message/CTA del manifest).
- **Tutorial T1-T5** §5.2: hints contextuales por step (P1: T1/T2 en `npc_open`, T5 en `npc_confirm`;
  P2: T3 en `npc_open`, T4 en `npc_color`). Solo en modo tutorial; no aparece en evaluación.
- **Salida del tutorial** §5.3 (modal + CTA "Comenzar evaluación").
- **Intros de bloque** (6): pantalla intersticial antes del primer escenario de cada bloque.
- **Pantalla final** §15 (neutra: "Simulación finalizada. Tus respuestas fueron registradas correctamente.").
- **Práctica no puntúa**: los 2 escenarios de práctica NO entran al agregado de evaluación (Doc 1 §13.2/§17).
- **buildControlRoomSessionAggregate**: métricas 11 + dimensiones 7 agregadas (unit test).

## Metodología
- **jsdom (42 tests, `control-room/`)**: C1 30 + C2 8 + C3 sesión 4 (flujo completo welcome→evaluación,
  práctica no puntúa, agregado de sesión, agregado vacío).
- **Navegador real (Playwright chromium-1234, headless)** sobre el dev-stage
  `/dev/control-room?mode=session` (Vite dev 127.0.0.1:5199): aserciones de flujo + geometría.

## Resultado navegador (script `/tmp/cr-session-smoke.cjs`, reproducible)
Por viewport (1280×720 y 390×844) — 12 aserciones c/u = **24/24 OK**:
| Aserción | 1280×720 | 390×844 |
|---|---|---|
| sin scroll horizontal (welcome) | PASS | PASS |
| welcome visible | PASS | PASS |
| tutorial P1 (hint T1/T2) | PASS | PASS |
| sin scroll horizontal (P1) | PASS | PASS |
| tutorial P2 (hint T3/T4) | PASS | PASS |
| exit del tutorial | PASS | PASS |
| intro bloque 1 | PASS | PASS |
| sin scroll horizontal (intro) | PASS | PASS |
| escenario evaluación (cr-incident) | PASS | PASS |
| sin hint en evaluación | PASS | PASS |
| sin scroll horizontal (evaluación) | PASS | PASS |
| sin errores JS/console | PASS | PASS |

Flujo real ejecutado en el navegador: welcome → [P1: select verify+send, verify+send] →
[P2: ask+send, add 4 bloques+send] → exit → intro bloque 1 → CR-L1-S01 (evaluación).

## Fix detectado por oxlint (post-commit)
`dimensionStats()` (accessor de raw counts por dimensión, para el agregado de sesión) no estaba
expuesto en el objeto retornado del engine — los tests no lo ejercitaban (no completan un escenario
de evaluación en modo sesión). Añadido al return; re-verificado 42/42 + build.

## Nota de incidente (working-tree revert)
A las 19:57:52 un proceso externo revertió los cambios C3 uncommitted de archivos tracked al estado
C2 (HEAD); el archivo nuevo untracked (session test) sobrevivió. Sin worker kanban activo (el
`.ready` era stale de sep-07; sin proceso de git work en `ps`). Causa no identificada. Mitigación:
re-aplicado + commiteado de inmediato (un `reset --hard`/`checkout` revierte a HEAD, que ya incluye
C3). **Regla adoptada: commitear cada card apenas verde, sin dejar trabajo uncommitted.**

## Gate
- vitest control-room: **42/42** (C1 30 + C2 8 + C3 4)
- oxlint control-room + dev + main.jsx: **limpio**
- `npm run build`: **OK**
- git diff --check: **OK**
