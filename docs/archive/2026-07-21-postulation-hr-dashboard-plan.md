# Postulation HR Dashboard Implementation Plan

> **For Hermes:** Execute directly with TDD in the current session; preserve the frozen candidate demo and existing R-6d changes.

**Goal:** Add a separate, modern HR dashboard route that lets a non-technical reviewer quickly scan synthetic candidate assessment results and open an understandable evidence profile.

**Architecture:** Introduce `/postulaciones-demo/hr` before the existing candidate-route matcher. Keep demo data in a pure privacy-safe module, render filters/list/detail in an isolated React component, and use dedicated responsive CSS aligned with the current indigo/cyan KRUMM visual language.

**Tech Stack:** React 19, Vite 8, Vitest/Testing Library, CSS Grid/Flexbox, deterministic synthetic aggregate data.

---

## Execution status

**Status:** `[x] Completed and verified on 2026-07-21`

Delivered:

- Separate `/postulaciones-demo/hr` route; candidate gameplay and R-6d contracts remain unchanged.
- Five deterministic synthetic aliases with aggregate-only scores, workflow status, session quality and caveats.
- HR overview with four KPIs, search/status/role filters and chronological review queue.
- Candidate detail with eight provisional construct scores, per-construct confidence, four game summaries, interview prompts and visible caveats.
- Missing evidence remains `Pendiente`; it is never rendered as score zero.
- Responsive desktop/mobile layout, explicit synthetic-data label and human-review-only governance.
- Secondary “Ver dashboard HR” link on the candidate landing.

Verification:

- Dashboard/routing focal: `5` files / `20` tests passed.
- Full suite: `96` files / `401` tests passed.
- Desktop smoke `1280×720`: `failures: []`.
- Mobile smoke `390×844`: `failures: []`, including overflow and minimum touch-target checks.
- Browser console: `0` errors; desktop `scrollWidth === clientWidth`.
- Visual browser review: approved for demo; no blocking overlap/truncation/layout defects.
- Oxlint: `0` warnings / `0` errors.
- Production build: passed.
- Audit: `0` vulnerabilities.
- `git diff --check`: passed.

---

## Constraints

- Do not modify game mechanics, telemetry schemas, feature vectors or R-6d mapping.
- Data must be explicitly labeled synthetic and contain no raw events, routes, pointer samples, images, biometrics or free text responses.
- No ranking, hiring recommendation, apt/not apt, or automated decision.
- Scores are provisional demo indicators with per-construct confidence and human-review caveats.
- Preserve `/postulaciones-demo` and `/postulaciones-demo?battery=original` behavior.

## Task 1 — Data contract and pure helpers

**Files:**

- Create `src/postulation-demo/hr-dashboard/hrDashboardData.js`
- Create `src/postulation-demo/hr-dashboard/hrDashboardData.test.js`

**Acceptance:**

- Deterministic synthetic candidate list.
- Eight construct scores for completed profiles.
- Summary and filtering helpers are pure.
- Serialized data contains no forbidden raw telemetry keys.

## Task 2 — HR dashboard UI

**Files:**

- Create `src/postulation-demo/hr-dashboard/PostulationHrDashboard.jsx`
- Create `src/postulation-demo/hr-dashboard/PostulationHrDashboard.test.jsx`
- Create `src/postulation-demo/hr-dashboard/postulationHrDashboard.css`

**Acceptance:**

- KPI cards: evaluations, ready for review, caveats, completion coverage.
- Search/status/role filters.
- Candidate list ordered by recency, explicitly not ranked.
- Selected-candidate detail with construct bars, confidence, game results and interview prompts.
- Human-review-only governance copy.
- Responsive one-column layout and no horizontal overflow on mobile.

## Task 3 — Routing and discoverability

**Files:**

- Modify `src/postulation-demo/postulationDemoRoute.js`
- Create `src/postulation-demo/postulationDemoRoute.test.js`
- Modify `src/main.jsx`
- Modify `src/postulation-demo/PostulationLanding.jsx`

**Acceptance:**

- `/postulaciones-demo/hr` renders the HR dashboard.
- Candidate demo paths still render `PostulationDemoApp`.
- Landing provides a clear secondary link to the HR dashboard.

## Task 4 — Verification

Run:

```bash
NODE_ENV=test npx vitest run src/postulation-demo/hr-dashboard src/postulation-demo/postulationDemoRoute.test.js --pool=threads --reporter=default
NODE_ENV=test npx vitest run --pool=threads --reporter=default
npx oxlint src/postulation-demo src/main.jsx
npm run build
npm audit --audit-level=high --omit=dev
git diff --check
```

Browser smoke:

- Desktop `1280×720`: dashboard loads, filters work, candidate detail changes, no console errors/overflow.
- Mobile `390×844`: controls/list/detail stack, 48px touch targets, no horizontal overflow.
