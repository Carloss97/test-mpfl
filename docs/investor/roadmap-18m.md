# Roadmap 18 Meses Post-Inversión — KRUMM

**Versión:** 1.0
**Fecha:** 2026-09-12
**Contexto:** Asumiendo cierre Seed Q4 2026 ($500k–1.5M). Baseline: producto beta-ready, 2 pilots firmados, infra serverless operativa.

---

## Q4 2026 (Oct–Dic) — Foundation & Beta Execution

### Producto
- [ ] **Beta launch** con 2 empresas piloto (contratos firmados, DPA)
- [ ] **Multi-tenancy GA** (companyId en todas las sesiones, GSI, aislamiento verificado)
- [ ] **ATS webhooks** (Greenhouse, Lever) — MVP: candidate created → invita KRUMM → reporte vuelve a ATS
- [ ] **SSO/SCIM prep** (Cognito SAML/OIDC config, provisioning API)
- [ ] **Mobile PWA baseline** (service worker, manifest, installable, offline read-only report view)

### Comercial
- [ ] **3 paid pilots** convertidos ($50k ARR)
- [ ] **Pipeline** 10+ qualified opportunities (ICP: mid-market LATAM)
- [ ] **Partner program draft** (HR consultancies, executive search) — LOI 2–3

### Ciencia / Validación (R-7)
- [ ] **Protocolo R-7 finalizado** (OSF pre-registration, ethics committee approval)
- [ ] **Psychometrician contratado** (part-time advisor → full-time Q1)
- [ ] **Power analysis** confirmado N=200 (effect size d=0.4, power=0.8, alpha=0.05)
- [ ] **Participant recruitment** iniciado (panel providers + university partners)

### Equipo
- [ ] **Hire 1: Senior Fullstack** (React/Node/AWS, games/telemetry experience)
- [ ] **Hire 2: ML Engineer** (feature vector, validation pipelines, research export)
- [ ] **Advisor formalizado:** ML/HR-tech (ex-Pymetrics/Arctic Shores/Google)

### Legal / Compliance
- [ ] **Trademark registrado** (Chile + PCT internacional)
- [ ] **Cyber/E&O/D&O insurance** active
- [ ] **ROPA** (Records of Processing Activities) completado Art. 30 GDPR

---

## Q1 2027 (Ene–Mar) — Traction & R-7 Data Collection

### Producto
- [ ] **ATS Integrations GA** (Greenhouse, Lever, BambooHR) — marketplace listings
- [ ] **Custom Battery Builder v1** (empresa selecciona sub-set de 12 juegos, configura pesos descriptivos)
- [ ] **Team/Group Reports** (agregados por cohorte, benchmarking interno anonimizado)
- [ ] **API v1** (REST + webhooks: session.created, session.completed, report.ready)
- [ ] **Mobile PWA v1** (offline queue, push notifications "nueva invitación", install prompt)

### Comercial
- [ ] **10 paying customers** ($150k ARR)
- [ ] **First enterprise deal** (>500 evals/yr, custom battery, dedicated support)
- [ ] **Partner revenue** first referral fees
- [ ] **Case studies** publicados (2–3, autorizados, anonimizados)

### Ciencia / Validación (R-7)
- [ ] **Data collection R-7 en curso** (target N=200 completado Q1)
  - Convergent validity: correlación con WAIS-IV subsets, BART, CANTAB
  - Discriminant validity: baja correlación con Big Five self-report
  - Test-retest: submuestra n=50 a 4 semanas
- [ ] **Interim analysis** (ciega, pre-registrada) — go/no-go para claims normativos

### Equipo
- [ ] **Hire 3: DevOps/SRE** (AWS, observability, cost optimization, GPU orchestration)
- [ ] **Technical writer** (part-time) — docs, API reference, runbooks

---

## Q2 2027 (Abr–Jun) — Scale & LATAM Expansion

### Producto
- [ ] **Custom Battery Builder v2** (drag-drop, preview, versioning, A/B testing framework)
- [ ] **Multi-language** (PT-BR para Brasil, ES-419 neutral) — i18n infra completa
- [ ] **Advanced Analytics Dashboard** (trends, cohort comparison, predictive flags)
- [ ] **EU/GDPR Entry Prep** (DPO EU contratado, SCC sub-processors, hosting EU region option)

### Comercial
- [ ] **LATAM Expansion** — Colombia + México (legal entity setup, local advisor, sales hire)
- [ ] **$400k ARR** (25+ customers)
- [ ] **Series A narrative** building (metrics deck, R-7 interim results)

### Ciencia / Validación (R-7)
- [ ] **R-7 Final Analysis** (N=200 completo)
  - Normative tables (percentiles por constructo, estratificados por edad/educación/rol)
  - Reliability coefficients (Cronbach α, test-retest ICC)
  - Fairness analysis (DIF por género, edad, dispositivo)
- [ ] **Publicación pre-print** (OSF / PsyArXiv) — transparencia científica como marketing
- [ ] **Claims unlock:** "Percentiles poblacionales disponibles", "Validez convergente r=0.XX"

---

## Q3 2027 (Jul–Sep) — Series A Readiness

### Producto
- [ ] **Enterprise Features GA:** SSO/SCIM, audit logs API, data residency (EU/US), SLA 99.9%
- [ ] **Mobile PWA v2** (full offline evaluation, background sync, biometric quality opt-in)
- [ ] **AI-assisted Job Design** (LLM para "Diseñar con KRUMM" — structured prompts, no chat)
- [ ] **Integration Hub** (Zapier/Make, Workday, SuccessFactors connectors)

### Comercial
- [ ] **$1M ARR** (40+ customers, 3+ enterprise)
- [ ] **Net Revenue Retention >110%** (expansion via more evals/seats)
- [ ] **Series A Data Room** completo (ver checklist)
- [ ] **Term sheet** target: $5–8M Series A, $25–35M post-money

### Ciencia / Validación
- [ ] **R-7 Peer-review submission** (Journal of Applied Psychology / Personnel Psychology)
- [ ] **Normative updates** quarterly (rolling N)
- [ ] **New construct R&D:** Leadership simulation (multi-agent), Learning agility (adaptive difficulty)

---

## Hitos Clave (Gates)

| Hito | Fecha Límite | Criterio | Consecuencia si No |
|------|--------------|----------|-------------------|
| Beta 2 pilots live | Oct 2026 | Contratos firmados + onboarding done | Delay 1 mes → ajuste cash flow |
| 3 paid pilots | Dic 2026 | $50k ARR + logos | Revisar GTM, extender runway |
| R-7 N=200 collected | Mar 2027 | Datos limpios, power ok | Extender recolección Q2 |
| 10 customers | Mar 2027 | $150k ARR | Acelerar sales hire |
| R-7 norms unlocked | Jun 2027 | Percentiles publicados | Diferenciador comercial clave |
| $400k ARR | Jun 2027 | Traction clara | Series A viable |
| $1M ARR | Sep 2027 | Series A metrics | Fundraise Q4 2027 |

---

## Riesgos Críticos y Contingencias

| Riesgo | Prob. | Mitigación |
|--------|-------|------------|
| R-7 no encuentra validez significativa | Media | Diseño conservador (d=0.4); si falla → seguir descriptive_only + compliance moat |
| Contratación senior lenta | Alta | Advisors cubren gaps; contractors senior para hitos críticos |
| Competidor lanza "compliant assessment" | Baja | Moat: datos versionados + governance framework + 18m head start |
| AWS costs escalan | Baja | Budget alerts, FinOps monthly, GPU solo heavy tasks |
| Regulación cambia (Chile DPA law) | Media | DPO monitorea; arquitectura privacy-by-design ya compatible |
| Founder burnout | Media | Hiring plan execute; board/advisors support; 4-day week culture |

---

## Métricas Norte (North Star Metrics)

| Métrica | Q4 2026 | Q1 2027 | Q2 2027 | Q3 2027 |
|---------|---------|---------|---------|---------|
| **ARR** | $50k | $150k | $400k | $1M |
| **Evaluaciones/mes** | 300 | 1,000 | 2,500 | 6,000 |
| **NPS Candidato** | ≥30 | ≥40 | ≥50 | ≥55 |
| **NPS Empresa** | ≥40 | ≥50 | ≥60 | ≥65 |
| **Completion Rate (full battery)** | ≥60% | ≥70% | ≥75% | ≥80% |
| **R-7 Progress** | Protocol | N=100 | N=200 | Norms |
| **Team Size** | 3 | 5 | 7 | 10 |

---

## Presupuesto Resumido (USD)

| Categoría | Q4 2026 | Q1 2027 | Q2 2027 | Q3 2027 | Total 12m |
|-----------|---------|---------|---------|---------|-----------|
| **Payroll** (3→10 FTE) | $60k | $120k | $180k | $250k | $610k |
| **AWS / Infra** | $5k | $8k | $15k | $30k | $58k |
| **R-7 Validation** | $20k | $80k | $60k | $20k | $180k |
| **Sales/Marketing** | $15k | $40k | $80k | $120k | $255k |
| **Legal/Compliance** | $15k | $10k | $20k | $30k | $75k |
| **Tools/SaaS** | $5k | $8k | $12k | $20k | $45k |
| **Buffer (15%)** | $18k | $40k | $55k | $70k | $183k |
| **TOTAL** | **$138k** | **$306k** | **$422k** | **$540k** | **$1.4M** |

*Nota: Seed $1M cubre ~9 meses; Series A debe cerrar antes de mes 10.*

---

## OKRs por Trimestre

### Q4 2026
- **O1:** Launch beta exitoso con 2 pilotos → **KR:** 2 contratos firmados, >20 evaluaciones completadas, NPS>30
- **O2:** Multi-tenancy GA → **KR:** 2 tenants aislados, 0 data leaks, <5 min provisioning
- **O3:** R-7 protocol approved → **KR:** Ethics committee OK, OSF pre-reg, psychometrician onboarded

### Q1 2027
- **O1:** Product-market fit signals → **KR:** 10 paying customers, $150k ARR, NRR>100%
- **O2:** R-7 data collection complete → **KR:** N=200 clean, interim analysis passed
- **O3:** ATS integrations live → **KR:** 3 ATS connected, 50% evals via integration

### Q2 2027
- **O1:** LATAM traction → **KR:** 2 countries, 5 customers, local advisor
- **O2:** R-7 norms unlocked → **KR:** Percentiles published, fairness audit clean
- **O3:** Enterprise readiness → **KR:** SSO/SCIM, SLA, audit logs, 1 enterprise logo

### Q3 2027
- **O1:** Series A fundraise → **KR:** Term sheet signed, $5-8M, data room 100%
- **O2:** Product maturity → **KR:** Mobile PWA v2, AI job designer, 99.9% SLA
- **O3:** Scientific credibility → **KR:** Peer-review submitted, pre-print 500+ downloads

---

**Próxima revisión:** Mensual (Board meeting) + Quarterly (OKR review)
**Dueño:** Carlos Saldivia (CEO) — reporte a inversores mensual (1-pager + metrics dashboard)