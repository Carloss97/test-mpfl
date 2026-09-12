# Pitch Deck — KRUMM (Pre-Seed / Seed)

**Versión:** 1.0 (Draft)
**Fecha:** 2026-09-12
**Formato:** Markdown (convertir a Google Slides / Notion / Pitch.com)
**Duración objetivo:** 12–15 min presentación + 15 min Q&A

---

## Slide 1: Title
**KRUMM**  
*Evidence-based talent assessment. Fair, auditable, human-first.*  

**Pre-Seed / Seed — $500k–1.5M**  
Carlos Saldivia, Founder & CEO — carlos@krumm.cl  
Sep 2026 — Santiago, Chile / Remote-first

---

## Slide 2: The Problem — Hiring is Broken
- **74% of hires fail** within 18 months (Leadership IQ) — not skills, but *fit & potential*
- **CVs & interviews** are biased, noisy, and poorly predictive (r ≈ 0.1–0.2)
- **Existing assessments** (Pymetrics, Arctic Shores, HireVue):
  - Black-box AI → "trust us" (no auditability, regulatory risk: NYC LL144, EU AI Act)
  - Personality/self-report → fakable, low validity for performance
  - Video/AI emotion → pseudoscience, privacy lawsuits, banned in jurisdictions
- **Companies fly blind:** No standardized, defensible, privacy-safe way to measure *actual capability*

---

## Slide 3: The Insight — Behavior Doesn't Lie
> *"What people do in a well-designed simulation predicts what they'll do on the job better than what they say about themselves."*

- **Work-sample tests** have highest predictive validity (r ≈ 0.54, Schmidt & Hunter 1998)
- But traditional work-samples are: expensive, manual, unscalable, single-dimension
- **KRUMM = Scalable, multi-dimensional work-sample** via gamified micro-simulations + aggregated telemetry

---

## Slide 4: Solution — KRUMM Platform
**For Candidates:** 15–30 min engaging evaluation (5–7 games) measuring:
- Processing speed → Precision → Inhibitory control → Interference control → Visual search
- Risk intelligence → Spatial planning → Operational planning → Spatial reasoning
- **NEW:** Procedural working memory (BOMB) + Applied communication (Control Room)

**For Companies:** Dashboard with **descriptive, auditable reports**:
- 8–10 constructs, each with metrics, caveats, governance badges
- `humanReviewOnly` • `noAutomatedDecision` • `descriptive_only` • `privacySafe`
- Export CSV/MD → integrate with ATS / human review workflow

**Tech:** Browser-based (WebGL/WebAssembly), camera-optional (quality context only), privacy-by-design (aggregates only, 30-day TTL, GDPR/Ley 19.628 compliant)

---

## Slide 5: Product Demo (Screenshot / 30-sec video)
[Insert: Landing → Invitation → 2 games → Report → Company Dashboard]

*Live demo: stage.krumm.cl (ask for access)*

---

## Slide 6: Moat — Why We Win (Defensibility)

| Dimension | KRUMM | Competitors |
|-----------|-------|-------------|
| **Scientific contract** | R-6: Construct → Task demand → Observable behavior → Aggregated telemetry → Versioned feature vector → Provisional rule → Availability/caveats → Human-review narrative | Black-box ML / Personality self-report |
| **Governance** | `humanReviewOnly`, `descriptive_only`, `noAutomatedDecision` baked into every report & export | Often claim "AI recommends" / "ranking" |
| **Privacy** | Aggregates allowlist-only; 30-day auto-purge; camera opt-in; DPIA done; no raw biometrics ever stored | Video recording, facial analysis, indefinite retention |
| **Regulatory readiness** | NYC LL144 compliant (no automated decision), EU AI Act ready (low-risk, human-in-loop), Chile Ley 19.628 | High-risk classification likely |
| **Data moat** | Each evaluation = 60+ versioned features × 7 games × N candidates → compounding dataset for R-7 validation (N=200) | Proprietary, siloed, not versioned |
| **IP** | Game designs (EXP-BOMB-001, EXP-COMM-001), telemetry schemas, feature vector versioning, governance framework | Generic game libraries |

---

## Slide 7: Market — TAM / SAM / SOM (LATAM Focus)

| Market | Size | Source |
|--------|------|--------|
| **TAM** Global Talent Assessment | $8.2B (2024) → $14.3B (2030) | MarketsandMarkets |
| **SAM** LATAM + US Hispanic B2B SaaS HR Tech | ~$1.2B | IDC + bottom-up |
| **SOM** Chile/Colombia/Mexico mid-market (200–5000 emp) Year 1–3 | **$15M ARR** achievable | 500 companies × 200 evals/yr × $150 |

**Beachhead:** Chile (home market, strong network, regulatory clarity) → Colombia/Mexico → US Hispanic / LatAm remote hiring.

---

## Slide 8: Business Model
| Model | Price | Target |
|-------|-------|--------|
| **Per Evaluation** | $150 USD / complete battery (5–7 games, report, exports) | SMB, project-based hiring |
| **Annual Subscription** | $2,500 USD/yr (unlimited evals, up to 5 recruiter seats, API access) | Mid-market, recurring hiring |
| **Enterprise** | Custom (SSO, dedicated tenant, SLA, ATS integration, custom battery) | 5000+ employees |

**Unit Economics (est.):**
- COGS/eval: ~$0.03 (Lambda + DynamoDB + CloudFront)
- CAC (inbound + referrals): ~$300
- LTV (subscription): $7,500 (3 yr) → **LTV/CAC = 25x**
- Gross margin: >99%

---

## Slide 9: Traction & Milestones
- ✅ **Product:** 12 games built, 2 novel (BOMB, Control Room), 1200+ tests passing, 0 critical bugs
- ✅ **Infra:** AWS serverless (S3+CF, API Gateway+Lambda, DynamoDB, SES, Cognito) — CI/CD OIDC, zero static keys
- ✅ **Compliance:** Privacy-by-design, DPIA, `humanReviewOnly` governance, SECURITY.md, CSP, WAF, PITR
- ✅ **Pilot Ready:** Stage environment live, 2 companies in pipeline for beta (contracts drafted)
- ✅ **Team:** Founder (CS, PhD-candidate, ML/HR-tech), Technical advisor (MLOps), Legal counsel (privacy)
- 🎯 **Next 90 days:** Close 2 paid pilots → R-7 validation design (N=200) → Seed close

---

## Slide 10: Competition — Positioning Map

```
                    HIGH SCIENTIFIC RIGOR
                          ↑
                          |
    KRUMM ●───────────────● Pymetrics (black-box, video)
                          |
    Arctic Shores ●───────● HireVue (video/AI emotion, lawsuits)
                          |
                    LOW TRANSPARENCY
                          → HIGH TRANSPARENCY
```

**Our wedge:** *Transparency + Compliance + Privacy* = Enterprise-ready from Day 1.

---

## Slide 11: Go-to-Market
1. **Founder-led sales** (0–$100k ARR): Direct outreach to CH/CO/MX HR leaders, VC portfolio companies, LinkedIn network.
2. **Content/SEO:** "Evidence-based hiring", "NYC LL144 compliance", "GDPR-safe assessments" → inbound.
3. **Partner channel** ($100k–$1M ARR): HR consultancies, executive search firms, ATS integrations (Greenhouse, Lever, BambooHR).
4. **Enterprise direct** ($1M+ ARR): Dedicated sales, custom batteries, SSO/SCIM, SLA.

**Key metric:** 5 pilot logos → 3 paid conversions → $100k ARR → Seed.

---

## Slide 12: Roadmap (18 Months Post-Investment)

| Quarter | Product | Commercial | Science |
|---------|---------|------------|---------|
| **Q4 2026** | Beta launch (2 pilots), multi-tenancy, ATS webhook | 3 paid pilots, $50k ARR | R-7 protocol finalized, ethics committee |
| **Q1 2027** | ATS integrations (Greenhouse, Lever), SSO/SCIM | 10 customers, $150k ARR | R-7 data collection start (N=200) |
| **Q2 2027** | Custom battery builder, team reports, API v1 | LATAM expansion (CO/MX), $400k ARR | R-7 interim analysis |
| **Q3 2027** | Mobile PWA, EU/GDPR entry (DPO EU), Series A prep | $1M ARR runway | R-7 results → normative claims unlocked |

---

## Slide 13: Use of Funds ($500k–1.5M Seed)

| Category | % | Amount (at $1M) | Detail |
|----------|---|-----------------|--------|
| **Engineering** (2–3 hires: fullstack, ML, DevOps) | 45% | $450k | Game engine, multi-tenancy, ATS integrations, mobile PWA |
| **Science / Validation** (R-7 N=200, ethics, psychometrician) | 20% | $200k | Participant incentives, committee, statistical consulting |
| **Sales / Marketing** (founder + 1 AE, content, events) | 20% | $200k | Outbound, conferences, partner program, demo video |
| **Legal / Compliance** (DPO, contracts, IP, GDPR EU entry) | 10% | $100k | Counsel, trademarks, SCC, insurance |
| **Ops / Buffer** | 5% | $50k | AWS overage, tools, contingency |

**Runway:** 18 months to Series A metrics ($1M ARR, R-7 results, 20+ logos).

---

## Slide 14: Team
- **Carlos Saldivia** — Founder/CEO. PhD-candidate (Electronics, USM), 8y ML/Edge AI, built KRUMM end-to-end (infra, games, telemetry, compliance). Publications: IEEE, SPIE.
- **[Advisor — ML/HR Tech]** — [Nombre], [Credenciales: ex-Pymetrics/Arctic Shores/Google People Analytics]
- **[Legal Counsel]** — [Firma], especialista privacidad/datos Chile + GDPR.
- **Hiring Plan:** Senior Fullstack (React/Node/AWS), ML Engineer (feature vector, validation), DevOps/SRE (AWS, observability).

---

## Slide 15: Ask & Contact
**Raising:** **$500k–1.5M Seed** (SAFE / priced, cap $8–12M, 20% discount, MFN)  
**Use:** Product (45%), Science (20%), GTM (20%), Legal (10%), Buffer (5%)  
**Target Close:** Q4 2026  

**Carlos Saldivia** — Founder & CEO  
📧 carlos@krumm.cl | 📱 +56 9 XXXX XXXX  
🌐 krumm.cl | 📊 stage.krumm.cl (demo)  
📄 Data Room: [link] | 📹 Demo Video: [link]

---

## Appendix Slides (optional, for Q&A)

### A1: Technical Architecture Diagram
[Insert: architecture-diagram skill output — React SPA + AWS serverless]

### A2: Privacy Architecture
- Data flow: Candidate → Browser (aggregation) → Lambda (validation) → DynamoDB (30d TTL) → Company Dashboard (read-only)
- FORBIDDEN_KEYS: raw biometrics, video, frames, landmarks, action sequences — rejected at client + server
- Governance labels injected at every layer

### A3: Game Specs (EXP-BOMB-001, EXP-COMM-001)
- Versioned manifests, state machines, validators, telemetry schemas, QA cases
- Feature vector versions: 2.2.0 (BOMB), 2.3.0 (Control Room) — additive, backward compatible

### A4: R-7 Validation Design
- Convergent/discriminant validity + test-retest, N=200, OSF pre-registration, ethics committee
- Instrumentation: researchExport.js (anonymized, structured)

### A5: Financial Model Detail
[Insert: 3-year projection, unit economics, sensitivity]

### A6: Cap Table
Founder 85% | Advisors 5% | ESOP 10% (pre-seed) | Seed 15–20%