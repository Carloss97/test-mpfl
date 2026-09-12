# Smoke A.4 — krumm.cl en MODO REAL (FASE A.4, KRU-115)

**Fecha:** 2026-09-12
**Veredicto:** ✅ **TODO VERDE (26/26 checks)** — A.4 CERRADA
**Script:** `scripts/smoke-a4-prod-real-mode-2026-09-12.mjs`
**Evidencia:** screenshots en `/tmp/krumm-a4-prod-smoke/` (desktop-dash, desktop-procesos, desktop-detalle, mobile-dash, mobile-procesos) + `export-prod-krumm-brief-unspecified-2026-09-12.csv`

## Objetivo

Verificar que krumm.cl (prod) opere en **modo real** del dashboard recruiter: datos de la API `/prod/sessions`, filtros modo real visibles, export funcional, 0 console errors, 0 overflow en desktop 1280×720 y móvil 390×844.

## Resultados

### Desktop 1280×720
| Check | Resultado |
|-------|-----------|
| API `/prod/sessions?limit=50` → 200 | ✅ |
| Badge "Sesiones reales (staging)" visible | ✅ |
| Aviso "Solo revisión humana, sin decisiones automáticas" | ✅ |
| 0 console errors / page errors / request failures | ✅ |
| Sin overflow horizontal | ✅ |
| Filtro **Periodo** visible (señal modo real) — `#v2-filter-period` | ✅ |
| Opción 7d presente | ✅ |
| Filtro **Estado** visible — `#v2-filter-status` | ✅ |
| Procesos encontrados con fechas reales (2026-09-07, 2026-09-06) | ✅ |
| Detalle de proceso carga (candidatos + constructos) | ✅ |
| Botón export CSV presente y habilitado | ✅ |
| Descarga CSV disparada (`.csv`) | ✅ |

### Móvil 390×844
| Check | Resultado |
|-------|-----------|
| /empresa carga, 0 errors, 0 overflow | ✅ |
| /empresa/procesos carga, 0 errors, 0 overflow | ✅ |

### Export CSV (evidencia de datos reales)
- Header: `process_id,role,candidate_alias,candidate_status,completed_at,overall_score,construct_id,construct_label,construct_score,construct_availability,caveats`
- Fila real: alias `session-91263887`, status `in_progress`, `completed_at 2026-09-07`, construct `decisionMaking` "Toma de decisiones (descriptiva)", availability `insufficient` + caveats ("Cámara no habilitada o sin muestras; Poca muestra de señal; …").
- **R-6 honesto:** constructo marcado descriptivo, availability `insufficient` (no `sufficient`), caveats explícitos — sin score inflado ni claim no soportado.

## Datos observados en prod (agregado)
- 3 procesos activos; Candidatos evaluados: 0; Puntaje promedio: — (coherente con sesiones `in_progress`).
- Procesos con fechas reales: 2026-09-07 (Cargo no especificado, 1 candidato), 2026-09-06 (Analista, 6), 2026-09-06 (Analista de Operaciones, 4).
- API base: `https://rwm08ik23m.execute-api.us-east-1.amazonaws.com/prod/sessions` (stack `krumm-m2-backend-staging`, `/prod` = segundo stage de la misma API por decisión KRU-97 opción b).

## Notas / follow-up (no bloquean A.4)
1. **Label "Sesiones reales (staging)":** el badge dice "staging" porque `/prod` reutiliza las tablas `krumm-staging-*` (decisión KRU-97). Para pre-beta, considerar re-etiquetar a "Sesiones reales" o crear tablas `krumm-prod-*` (migración, G.5 multi-tenancy). **P3.**
2. **Candidatos evaluados = 0:** las 11 sesiones son `in_progress`/parciales; no hay sesiones completadas con constructo `sufficient`. Para la demo de inversión (H.3) se necesita al menos 1-2 sesiones completas reales o fixtures genuinos etiquetados. **P2 (depende de beta).**
3. **Export sin watermark explícito "humanReviewOnly":** la honestidad R-6 viene por `construct_availability` + `caveats` + label "(descriptiva)". Si se quiere watermark textual en el CSV, añadirlo en el export client-side. **P3.**

## Gates de pre-lanzamiento (A.4)
- [x] krumm.cl en modo real (API /prod 200 + badge)
- [x] Filtros modo real visibles (Periodo + Estado)
- [x] Export CSV funcional con datos reales
- [x] 0 console errors (desktop + móvil)
- [x] 0 overflow horizontal (1280×720 + 390×844)
- [x] Detalle de proceso + constructos R-6 honestos
- [x] Playwright 26/26

**A.4 CERRADA 2026-09-12.** Kanban `t_4255415d` → done; Linear KRU-115 → Done.
