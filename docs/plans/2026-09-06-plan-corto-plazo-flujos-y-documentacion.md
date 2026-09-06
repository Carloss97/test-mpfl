# Plan corto plazo — Flujo candidato, flujo reclutador y normalización de documentación de experiencias

**Fecha:** 2026-09-06 · **Repo:** `/home/sarlock/krumm/test-mpfl` (main `6337582`)
**Estado:** production `krumm.cl` operativo con UI v2 desplegada y verificada.

## 0. Estado actual (evidencia 2026-09-06)

| Área | Estado | Fuente |
|---|---|---|
| Producción | krumm.cl: `/`, `/postulaciones`, `/reclutador` 200; bundle `index-C9fmzBqN.js` (UI v2 + copy sin "demo") | smoke browser hoy |
| Batería original | 5 juegos (Laser, Balloon, Passenger, Faro, Tangram); G.2 práctica y G.5 teclado/breakpoints done; 3 bugs críticos de Tangram fijados + test componente | kanban + tests 601/601 |
| `/reclutador` | **100% datos sintéticos** — `hr-dashboard` no hace fetch/API | grep hoy |
| Backend M2-M6 | Código done en repo (DynamoDB+Lambdas aggregate-only, invitaciones, dashboard real, hardening) — **deploy AWS no autorizado/ejecutado** (regla vigente) | kanban t_bb757100…t_3b00a223 |
| Docs de módulos | **2 de 5 juegos** documentados (`balloon_risk.md`, `caminos.md`); template v1 existe; **tangram sin doc de módulo** (aun con plan + PDFs) | docs/design/modulos/ |
| Audit G.1 (08-27) | **Obsoleto**: lista G.2/G.5 como pendientes (ya done); G1-P01 teclado cerrado vía G.5; G1-P05 (hueco breakpoint 760/768) sin re-verificar | docs/design/game-experience-audit.md |
| R-7 validación | R-7A QA técnica ejecutable hoy; R-7B requiere 2+ expertos; R-7C = 3 entrevistas (KRU-65 en curso) | plan R-7 + Linear |
| GPU/infra | GPU Lambda retenida (manual), dispatcher con regla de retención, SSO AWS vigente ~11 h | sesión de hoy |
| **Decisiones 2026-09-06 (tarde)** | **Exp 7/8 fuera del plan** (user); **B1 autorizado** (user); limpieza de ruido: 13 docs → `docs/archive/`, raíz sin basura | esta sesión |

## 1. Mejoras de corto plazo por flujo

### 1.1 Flujo candidato (`/postulaciones`)

| # | Mejora | Evidencia / gap | Esfuerzo |
|---|---|---|---|
| C1 | **Re-audit G.1 post-cambios**: re-ejecutar recorrido vivo (5 juegos + fixtures, desktop+móvil) y actualizar el audit (G1-P05 breakpoint 760/768, G1-L01/L02/L04/L07 copy/pacing, "Comprobar ruta" siempre activo en Laser) | audit de 08-27 obsoleto; tangram nunca jugado en vivo post-fixes | 0.5 d (GPU: smoke) |
| C2 | **Práctica (G.2) en los 5 juegos**: verificar que cada juego de la batería original tenga nivel práctica completatable y flag `is_tutorial` (tangram hoy quedó verificable por test; los 4 restantes: revisión + test si falta) | bug tangram demostró que "práctica incompletable" pasa sin test componente | 0.5–1 d |
| C3 | **Onboarding señal/calibración**: copy "Procesos listos 1 de 5" es técnico (G1-L04); simplificar a lenguaje candidato ("Preparando tu sesión") sin perder semántica de calidad | audit §4.1 pantalla 3 | 2–4 h |
| C4 | **Cierre del flujo**: hoy el candidato termina en reporte con descargas locales. Falta el paso "tu evaluación quedó registrada para revisión humana" + vinculo a invitación (M3) — depende de backend en prod | M3/M4 done en repo, no desplegado | depende B1 |
| C5 | **Efectos de sonido** (KRU-64, backlog): feedback auditivo en snap/rotate/success/fail (ya hay `playSfx` en tangram) | Linear KRU-64 | 1 d |
| C6 | **Tangram táctil real**: verificar snap/rotación con touch (mouse+touch) en dispositivo — los tests jsdom no cubren pointer real | fixes de hoy + skill pitfall | 2–4 h (manual) |

### 1.2 Flujo reclutador (`/reclutador`)

| # | Mejora | Evidencia / gap | Esfuerzo |
|---|---|---|---|
| B1 | **Deploy backend M2-M6 a AWS** — **AUTORIZADO por el usuario (2026-09-06)**: instalar SAM CLI, desplegar `infra/m2-backend-stack.yaml` (staging: DynamoDB sessions + audit_log TTL 30d, Lambda nodejs20, API Gateway HTTP), wirear el frontend a la API y verificar con invitación real | código listo; SSO vigente (renovable) | 1 d — **siguiente ejecución** |
| B2 | **Invitación real (M3)**: link de invitación → sesión candidata real → reporte en `/reclutador` (reemplaza datos sintéticos) | hr-dashboard sin fetch | depende B1 |
| B3 | **Vista HR**: brief de entrevista por evaluación, filtros (fecha/estado), export Markdown/CSV de agregados (humanReviewOnly) | KRU-50 "Recruiter Dashboard v1 Real" | 1–2 d (tras B1) |
| B4 | **R-7B validez de contenido**: 2+ expertos I-O/psicometría/producto califican matriz constructo×tarea (aceptar/revisar/rechazar) | plan R-7; requiere agenda | externo |
| B5 | **R-7C entrevistas cognitivas**: 3 candidatos con guía (KRU-65 en curso) — verificar que instrucciones no explican más varianza que el constructo | plan R-7 | externo (1 sem) |

### 1.3 Juegos (batería original)

| # | Mejora | Evidencia | Esfuerzo |
|---|---|---|---|
| J1 | **Exp 7 y 8: FUERA del plan por ahora** (decisión del usuario 2026-09-06). Cards kanban archivadas, KRU-61/62 → Backlog. Si se reactivan: plantilla v2 + spec 1-pager (§2) antes de implementar | — | — |
| J2 | **Backfill docs de módulos**: `laser_puzzle.md`, `team_coordination.md` (faro) → 5/5 juegos documentados | solo 2/5 hoy | 0.5 d c/u |
| J3 | **Tangram doc de módulo** (primer ejemplo de la plantilla v2) — **hecho hoy** | `docs/design/modulos/tangram_exp001.md` | done |

### 1.4 Documentación / normalización (esta sesión)

- [x] **Plantilla v2** agent-first: `docs/design/modulos/plantilla-modulo-original-game.md` (versionada a `original-game-unified_v2`) con: anti-pattern de phase-gates, casos de test componente obligatorios, checklist de implementación RED→GREEN para agentes, pitfalls de incidentes reales.
- [x] **Doc de módulo Tangram** (instanciación v2 con datos reales del repo).
- [x] **Skill `krumm-documentation-templates`** actualizada (se refería a 2 plantillas .md que ya no existen — unificada v2).
- [ ] Re-audit G.1 (C1) — siguiente sesión.
- [ ] PDD/SDD: marcar en `krumm-postulation-pdd.md` la plantilla v2 como el formato único de especificación de experiencias (scope in).

## 2. Proceso estándar para nuevas experiencias (con plantilla v2)

Flujo objetivo para que un agente implemente una experiencia nueva en 1–2 días (Tangram tomó 2 sesiones; el goal es 1):

```
1. SPEC (1-pager del usuario, ~30 min): constructo(s) + demanda de tarea +
   conducta observable + telemetría agregada esperada + batería destino +
   criterios de aceptación. (Sin spec → no se implementa: regla R-6.)
2. DOC DE MÓDULO (plantilla v2): copiar → <game-id>.md, llenar §0 traza +
   §1-§6 diseño + §7-§12 técnica. Estado: "borrador".
3. TDD (orden RED→GREEN fijado en §16 de la plantilla):
   a. telemetría pura (build<X>Levels/aggregate) + tests
   b. feedback/privacy guard (FORBIDDEN_KEYS) + tests
   c. blueprint + feature vector (add<X>Features) + tests
   d. COMPONENTE con máquina de estados + test componente obligatorio
      (onboarding, interacción núcleo por teclado Y botón, transiciones,
      payload privacy-safe)
   e. integración PostulationGameStage + config batería + fixture
4. GATES (§15): vitest focal + oxlint + build + audit + diff
5. BROWSER SMOKE: desktop 1280×720 + móvil 390×844, consola limpia, 0 overflow
6. DOC → "implementado" + kanban done + Linear sync
7. (Opcional) deploy si es batería visible en prod — solo con SSO vigente
```

**Regla de oro:** la experiencia no existe hasta que el doc de módulo (§0 traza) está completo y los gates pasan — el doc no es burocracia post-mortem, es el contrato que evita bugs tipo Tangram (práctica incompletable, 3 defectos de phase-gate).

## 3. Orden de ejecución (actualizado 2026-09-06 tarde)

| Bloque | Contenido | Estado |
|---|---|---|
| 0 (ahora) | **B1 deploy backend** (AUTORIZADO): SAM CLI → `infra/m2-backend-stack.yaml` (staging) → wire frontend → verificar invitación real | siguiente ejecución |
| 1 (QA) | C1 re-audit G.1 en vivo + C2 práctica completatable en los 5 juegos | tras B1 (o paralelo) |
| 2 (docs) | J2 backfill laser + team_coordination (plantilla v2) | en curso de la ola de limpieza |
| 3 (UX) | C3 onboarding copy + C5 SFX (KRU-64) + C6 tangram táctil | tras QA |
| 4 (validación) | R-7B (B4, expertos) + R-7C (B5, KRU-65) — R-7A se puede adelantar | depende de agenda |

## 4. Limpieza de proyecto (ejecutada 2026-09-06)

- **13 docs obsoletos → `docs/archive/`** (`git mv`, reversible) con `docs/archive/README.md` que documenta la fuente de verdad vigente y la regla de mantenimiento (al cerrar una sesión, su handoff superado se archiva).
- **Raíz del repo:** `git rm gpu_manager.py` (script viejo con `LAMBDA_API_KEY` antigua hardcoded como default — **verificar en Lambda que esa key esté invalidada/rotada**) y `kanban.db` (0 bytes, erróneo). Eliminados `awscliv2.zip` (73 MB) y `session-manager-plugin.deb` (artefactos locales gitignored; AWS CLI ya instalado).
- **Fuera de scope:** Exp 7/8 (kanban archivadas, Linear → Backlog).

## 5. Decisiones pendientes del usuario (actualizado 2026-09-06)

1. ~~**Exp 7 y 8**~~ → **FUERA del plan por ahora** (decisión 2026-09-06). Cards archivadas; KRU-61/62 a Backlog. Se reactivan solo con spec (§2).
2. ~~**Backend a AWS**~~ → **AUTORIZADO** (2026-09-06). B1 es la siguiente ejecución.
3. **R-7B**: ¿quién/quiénes califican validez de contenido (2+ expertos)?
4. **T.3**: ¿disponibilidad de hardware de cámara para el sanity empírico?
5. **Key Lambda vieja** (leak en `gpu_manager.py`, ya eliminada del repo): confirmar en Lambda que `secret_hx100_cafacf0a…` (key del archivo) esté invalidada/rotada — quedó en la historia git del repo público.
