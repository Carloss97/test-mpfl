# HANDOFF — H3: Live Demo Script + 18-Month Roadmap (KRU-120 / t_26fb484a)

**Fecha:** 2026-09-15 05:20 -03
**Estado:** DONE (commit 4702bb8 pushed)
**Kanban:** t_26fb484a → done (run 144 completed 2026-09-15 05:18)
**Linear:** KRU-120 → Done (asignada a Carlos Saldivia)

---

## Entregables

| Archivo | Descripción |
|---------|-------------|
| `docs/demo/live-demo-script.md` | Guion 2-3 min para demo en vivo en `stage.krumm.cl` con fixture `?fixture=1`. Incluye: pre-flight checks, timing detallado (0:00-2:15), límites hard (no cámara, no grabación, no claims no soportados), checklist privacidad, fallback HTML estático, contactos/escalation. |
| `docs/investor/roadmap-18m.md` | Roadmap 18 meses post-inversión. Separación explícita: compromisos (✓/🔄/○) e hipótesis (★). 4 trimestres: Q4'26 beta + R-7, Q1'27 ATS/SSO + R-7 N=200, Q2'27 custom battery + LATAM, Q3'27 PWA + EU/GDPR + Series A. Gates por trimestre, 8 hipótesis con métodos validación, budget $1M/18m, team scaling, risk register, métricas norte, cross-refs a docs fuente. |

---

## Evidencia técnica

- `git diff --check` PASS (trailing whitespace corregido en Mermaid)
- Claims desactualizados en guion corregidos: Lighthouse perf 80 real (gate 90), multi-tenancy G.5 staged pero aislamiento Cognito A/B pendiente, 2 firmas pilotos pendientes, data room pendiente
- No video grabado/publicado (solo guion para ejecución live)

---

## Estado de dependencias / gates abiertos

| Gate | Estado | Notas |
|------|--------|-------|
| Lighthouse perf ≥90 | 🔄 ABIERTO | Último run verificado: perf 80, a11y 100, BP 100, SEO 92. `RootCauses/frame_sequence` remediation open. |
| Multi-tenancy G.5 | 🔄 STAGED | `companyId` en invitations + sesiones, GSI, authorizer Cognito `custom:companyId`. Tests aislamiento A/B PASS local. **Pendiente:** verificación 2 tenants Cognito reales (timeout endpoint). |
| 2 Pilot agreements firmados | 🔄 EN PROGRESO | Template B2B + DPA en `docs/legal/piloto-b2b-contrato-template.md`. Onboarding runbook v1.0 listo. Gate: ≥1 firmado antes de beta externa. |
| Data room checklist | 🔄 EN PROGRESO | `docs/investor/data-room-checklist.md` en preparación. |
| R-7 Protocol (N=200) | ○ PLANIFICADO | OSF pre-reg, ethics committee, power analysis, recruitment. Psychometrician advisor pendiente (LOI ★). |

---

## Siguiente (ordenado)

1. **E1** `t_fd399090` / `t_795c46ec`: Paquete legal + rutas públicas (privacidad/DPIA, contratos, métricas)
2. **E2** `t_a0a33f7f` / `t_978c0e0e`: Soporte + ayuda + feedback beta
3. **E3** `t_98c4b81c` / `t_f61f5d11`: Beta protocol + onboarding runbook + gate 2 empresas
4. **H1** `t_cb83ed9c`: Pitch deck textual verificable + claims R-6
5. **H2** `t_d180c735` / `t_04402e5d`: Data room checklist + matriz evidencia
6. **G.5** `t_163f8130`: Multi-tenancy real aislamiento A/B Cognito (unblock E3/H2)

---

## Commits

- `4702bb8` docs(H3): live demo script + 18m roadmap (KRU-120 / t_26fb484a)

---

## Discord handoff (mismo contenido)
