# Final Postulation Demo Recording Readiness Plan

> **For Hermes:** Execute directly with TDD and browser evidence; preserve privacy and the human-review-only contract.

**Goal:** Leave the KRUMM postulation candidate flow, original games, report and HR dashboard in the strongest defensible state for final recording.

**Architecture:** Audit first, then apply only high-impact, low-risk fixes across visible copy, accessibility, report semantics, game flow and recording operations. Keep assessment mappings provisional and aggregate-only; do not expand scope into backend/productization.

**Tech Stack:** React 19, Vite 8, Vitest, Playwright/browser smoke, CSS responsive layouts.

---

## Phase A — Evidence-based audit

- Inspect source/tests for games, feature mapping, report, landing and HR dashboard.
- Run desktop/mobile browser smoke for candidate, original fixture and HR routes.
- Identify console errors, overflow, stale copy, inaccessible controls and unsupported claims.

## Phase B — High-value fixes

- Fix recording blockers first: broken paths, stale labels, layout overlap, null/zero confusion, report claims and interaction friction.
- Apply visible polish only when backed by browser evidence.
- Add focused regression tests before each behavioral fix.

## Phase C — Recording package

- Refresh editable QA checklist to current R-6d + HR state.
- Create a concise recording runbook with URLs, sequence, narration points and fallback fixture.
- Record exact verification commands/results.

## Phase D — Final gates

```bash
NODE_ENV=test npx vitest run --pool=threads --reporter=default
npx oxlint src/postulation-demo src/tasks src/main.jsx src/assessment src/telemetry/gameCorrelation.js
npm run build
npm audit --audit-level=high --omit=dev
git diff --check
node scripts/smoke-original-games-playability.mjs
VIEWPORT_WIDTH=390 VIEWPORT_HEIGHT=844 node scripts/smoke-original-games-playability.mjs
node scripts/smoke-postulation-hr-dashboard.mjs
VIEWPORT_WIDTH=390 VIEWPORT_HEIGHT=844 node scripts/smoke-postulation-hr-dashboard.mjs
```

Acceptance:

- Candidate original flow and HR dashboard work in desktop/mobile with no console errors or horizontal overflow.
- Final report has complete provisional scores, relevant game metrics and conservative copy.
- No raw/reconstructive telemetry appears in visible UI or payload/report fixtures.
- Recording runbook and fallback fixture are current and executable.

---

## Execution status — completed 2026-07-21

Delivered:

- Candidate-facing landing/setup copy without laboratory terminology.
- Original battery duration corrected to `10–12 min`.
- HR access separated from the candidate CTA.
- Optional-camera retry, primary continue action and truthful idle HUD state.
- `choiceCategory` removed from Team events/fixtures and forbidden globally.
- Missing signal/confidence remains unavailable, never fabricated as zero.
- Report hero distinguishes session vs synthetic demonstration.
- Technical integrity separated explicitly from psychometric validity.
- Synthetic capture metrics moved under a closed environment-details panel.
- Construct scores marked `Demo provisional`, with a visible `sin baremos / sin comparación` warning.
- Construct caveats collapsed per card and internal status codes humanized.
- Final editable QA checklist and 7–9 minute recording runbook.

Verification:

- Vitest: `96` files / `405` tests passed.
- Oxlint: `0` warnings / `0` errors on `127` files.
- Production build: passed, `1395` modules transformed; only the existing non-blocking chunk-size warning remains.
- Audit: `0` vulnerabilities.
- `git diff --check`: passed.
- Original gameplay smoke desktop/mobile: `failures: []`.
- Feedback smoke: `8/8` route/viewport combinations passed with zero console/page/request failures and zero overflow.
- HR dashboard smoke desktop/mobile: `failures: []`.
- Browser visual review: landing approved; final report has no technical blockers, no clipping and conservative public claims.
