# KRUMM R-6 Talent Mapping Research and Implementation Plan

> **For Hermes:** Execute sequentially with direct source inspection, citation-claim alignment, TDD RED → GREEN → refactor, privacy review, and real browser smoke. Do not commit or push without explicit user instruction.

**Goal:** Convert the workbook hypotheses into a versioned, evidence-traceable and privacy-safe mapping from original-game aggregates to conservative behavioral profiles and HR-facing reports.

**Architecture:** Preserve `assessment_feature_vector_v2` and the stable DG path unchanged. Add a separate `original_game_feature_vector_v1` built only from aggregate block results, then derive a provisional `krumm_workbook_talent_framework_v1` mapping with explicit availability, confidence ceilings, evidence, caveats, and no score for constructs that the current games do not measure. Biometrics remain contextual state/quality signals, never direct trait labels.

**Tech Stack:** React 19, Vite 8, Vitest 4, plain JavaScript, Markdown technical documentation, Crossref/OpenAlex metadata verification.

---

## Source artifact

- Original: `/mnt/c/Users/sarlo/Downloads/Mapeo de Perfiles de Talento e Indicadores de Comportamiento - KRUMM.xlsx`
- Read-only; never modify in place.
- SHA-256: `c25077d6f4b23bb590d00cb2a695bbdecc6d1feece1fe761e1b5972615a72b02`
- Structure: one visible sheet (`Hoja1`), range `A1:I9`, 81 populated cells, no formulas, no hidden rows, no validation, no hyperlinks.

## Task 1 — Build the source and citation audit

**Objective:** Separate workbook content, verified literature, unresolved references, and product hypotheses.

**Files:**
- Create: `docs/research/krumm-talent-game-behavior-mapping-technical-study.md`

**Steps:**
1. Transcribe the eight workbook profiles and nine columns with source cell coordinates.
2. Classify each workbook reference as `verified_direct`, `verified_adjacent`, `ambiguous`, `unresolved`, or `product/internal`.
3. Replace unsupported citation links with verified literature while preserving the workbook as provenance.
4. Record that an author/year token alone is not a complete bibliography.
5. Distinguish game mechanics from validated psychometric instruments.

**Success:** Every implemented mapping claim has a verified source or is explicitly labeled provisional/hypothetical.

## Task 2 — Define the Evidence-Centered Design contract

**Objective:** Make the inference chain explicit and testable.

**Document contract:**

```text
construct definition
  → task demand
  → observable behavior
  → aggregate telemetry
  → normalized feature
  → provisional mapping rule
  → confidence + caveats
  → HR narrative for human review
```

**Rules:**
- No construct may be inferred directly from an AU, gaze point, posture value, or capture-quality failure.
- Scores are 0–100 transformations, not percentiles, norms, diagnoses, or selection cutoffs.
- Leadership and communication are `not_measured` in the current individual battery.
- Risk behavior does not establish frustration tolerance.
- Missing evidence is `null/not_measured`, never zero performance.

## Task 3 — Add `original_game_feature_vector_v1` with RED tests

**Objective:** Preserve stable v2 while adding a traceable aggregate-only vector for Laser, Balloon, and Passenger Routes.

**Files:**
- Create: `src/assessment/originalGameFeatureVector.js`
- Create: `src/assessment/originalGameFeatureVector.test.js`

**RED tests:**
1. Fixed feature order and finite numeric feature array.
2. Laser features: completion, solved rate, solution efficiency, rule compliance, moves, time.
3. Balloon features: completion, risk efficiency, cashout/pop rates, average pumps, post-loss adjustment plus observed flag, time.
4. Passenger features: completion, route efficiency, constraint compliance, replans, station use, satisfaction, time.
5. Missing games produce availability flags, not fabricated values.
6. No trials, routes, pointer samples, action sequences, raw events, landmarks, keypoints, frames, or video.

**RED command:**

```bash
NODE_ENV=test npx vitest run src/assessment/originalGameFeatureVector.test.js --pool=threads --reporter=default
```

## Task 4 — Add provisional workbook-profile mapping with RED tests

**Objective:** Map game evidence to the eight workbook profiles without overclaiming.

**Files:**
- Create: `src/assessment/originalGameTalentMapping.js`
- Create: `src/assessment/originalGameTalentMapping.test.js`
- Modify: `src/assessment/talentDimensions.js`
- Modify: `src/assessment/talentProfile.js`
- Modify: `src/assessment/talentProfile.test.js`

**Provisional formulas:**

```text
Laser composite L = 0.55·solutionEfficiency + 0.30·solvedRate + 0.15·ruleCompliance
Passenger composite P = 0.50·routeEfficiency + 0.30·completionRate + 0.20·constraintCompliance
Balloon behavioral index B = riskEfficiency

Decision making          = null/descriptive_only   B and P reported without normative direction
Problem solving          = 0.65·L + 0.35·P         ceiling 0.50
Risk/feedback profile    = null/descriptive_only   B and post-loss adjustment are not “better/worse” traits
Planning                 = P                        ceiling 0.50
Analytical thinking      = 0.50·L + 0.50·P         ceiling 0.45
Adaptability             = null/insufficient       post-loss adjustment descriptive only
Leadership               = null/not_measured
Communication            = null/not_measured
```

**RED tests:**
1. Better Laser/Passenger evidence raises only problem-solving, planning and analytical task-performance indices.
2. Decision/risk rows remain descriptive and never turn a higher risk index into a better talent score.
3. Leadership/communication have `score: null`, `confidence: 0`, `availability: not_measured`.
4. Risk row states `frustration_tolerance_not_measured`.
5. Adaptability is not scored from a single level change or AU4.
6. Camera absence does not lower behavioral score; it only adds contextual caveats.
7. No strengths/watch-area classification is produced without norms.

## Task 5 — Integrate mapping into session, payload, reports, and UI

**Files:**
- Modify: `src/assessment/assessmentSession.js`
- Modify: `src/assessment/assessmentSession.test.js`
- Modify: `src/assessment/finalAssessmentPayload.js`
- Modify: `src/assessment/finalAssessmentPayload.test.js`
- Modify: `src/assessment/talentReportGenerator.js`
- Modify: `src/assessment/talentReportGenerator.test.js`
- Modify: `src/postulation-demo/postulationDemoSessionBuilder.js`
- Modify: `src/postulation-demo/postulationDemoSessionBuilder.test.js`
- Modify: `src/postulation-demo/PostulationReportSummary.js`
- Modify: `src/postulation-demo/PostulationReportScreen.jsx`
- Modify: related tests.

**Requirements:**
- Keep `assessment_feature_vector_v2` unchanged.
- Add `originalGameFeatureVector` as a separately versioned optional field.
- Original-mode report displays availability and provisional evidence.
- Unmeasured constructs display `No medido`, never score 0.
- JSON report contains both `gameSummary` and aggregate `gameResults`.
- Downloads remain blocked on privacy/governance validation failure.
- Replace `pending_r6` caveats with `provisional_mapping_requires_validation`.

## Task 6 — Document validation and R-7 protocol

**Objective:** Define what is required before these outputs can influence HR decisions.

**Document sections:**
1. Content validation by I/O psychology/psychometrics experts.
2. Cognitive interviews and usability/device QA.
3. Reliability/parallel forms/test–retest.
4. Convergent/discriminant validity against established instruments.
5. Criterion-related validation against job-relevant outcomes.
6. Fairness, measurement invariance, subgroup/device analysis, accessibility.
7. Versioning, monitoring, drift, retention/deletion, audit logs.
8. CV fusion as a separate server-side evidence channel; never circularly validate game scores against CV-derived labels.
9. Power analysis before sample-size commitment.

## Task 7 — Documentation and quality gates

**Files:**
- Modify: `docs/plans/postulation-demo-original-games-integration-plan.md`
- Modify: `docs/plans/postulation-demo-original-games-new-agent-handoff.md`
- Modify: `docs/demo/postulation-demo-qa-smoke-template.md`

**Focal tests:**

```bash
NODE_ENV=test npx vitest run \
  src/assessment/originalGameFeatureVector.test.js \
  src/assessment/originalGameTalentMapping.test.js \
  src/assessment/talentProfile.test.js \
  src/assessment/finalAssessmentPayload.test.js \
  src/assessment/talentReportGenerator.test.js \
  src/postulation-demo/postulationDemoSessionBuilder.test.js \
  src/postulation-demo/PostulationReportScreen.test.jsx \
  src/postulation-demo/postulationDemoFixture.test.js \
  --pool=threads --reporter=default
```

**Full gates:**

```bash
NODE_ENV=test npx vitest run --pool=threads --reporter=default
npx oxlint src/postulation-demo src/tasks src/main.jsx src/assessment src/telemetry/gameCorrelation.js
npm run build
npm audit --audit-level=high --omit=dev
git diff --check
```

**Smoke:** Stable and original fixtures plus original gameplay at desktop and mobile viewports. Check console/page/network failures, overflow, `No medido` semantics, and absence of unsupported HR claims.

## Execution status — 2026-07-20

**Implemented so far:**

- `docs/research/krumm-talent-game-behavior-mapping-technical-study.md` created from the XLSX with source transcription, inference chain, definitions, inputs/outputs, requirements, invalidation conditions, bibliography and R-7 protocol.
- `src/assessment/originalGameFeatureVector.js` + tests created for `original_game_feature_vector_v1`.
- `src/assessment/originalGameTalentMapping.js` + tests created for `krumm_workbook_talent_framework_v1`.
- Original-game aggregates extended with schema/version and minimal non-reconstructive observability:
  - `aggregateSchemaVersion` on Laser, Balloon and Passenger.
  - `postPopAdjustmentCount` on Balloon.
  - `movementAttemptCount` on Passenger.
- `postulationDemoSessionBuilder` now applies original-game allowlists before blocks enter assessment session/payload.
- `assessmentSession` and `finalAssessmentPayload` now carry `originalGameFeatureVector` and `talentFramework` only when present.
- `talentProfile` no longer fabricates neutral score 50/watch areas for the original-game path; legacy profile dimensions are `score: null` while the R-6 framework is authoritative.
- `talentReportGenerator` now emits `gameSummary` and `gameResults` separately and includes the R-6 vector/framework in reports.
- `PostulationReportScreen` displays the workbook framework in original mode with `No medido`, `descriptive_only`, `insufficient` and `not_measured` semantics.

**Focal verification:**

```text
NODE_ENV=test npx vitest run src/assessment/originalGameFeatureVector.test.js src/assessment/originalGameTalentMapping.test.js src/postulation-demo/postulationDemoSessionBuilder.test.js src/postulation-demo/postulationDemoFixture.test.js src/postulation-demo/PostulationReportScreen.test.jsx src/assessment/talentProfile.test.js src/assessment/finalAssessmentPayload.test.js src/assessment/talentReportGenerator.test.js --pool=threads --reporter=default
→ 8 files / 27 tests passed

NODE_ENV=test npx vitest run src/tasks/original-games src/postulation-demo/originalGameBlueprints.test.js src/postulation-demo/PostulationGameStage.test.jsx src/tasks/gameRerenderStability.test.jsx --pool=threads --reporter=default
→ 10 files / 44 tests passed

npx oxlint src/postulation-demo src/tasks src/main.jsx src/assessment src/telemetry/gameCorrelation.js
→ 0 warnings / 0 errors
```

**Final verification:**

```text
NODE_ENV=test npx vitest run --pool=threads --reporter=default
→ 82 files / 339 tests passed

npm run build
→ 1382 modules transformed; built in 3.10s; only known non-blocking PLUGIN_TIMINGS/chunk warnings

npm audit --audit-level=high --omit=dev
→ found 0 vulnerabilities

git diff --check
→ OK

Playwright smoke on Vite development:
→ 8/8 routes PASS: stable/original × normal/fixture, desktop 1280×720 + mobile 390×844
→ console errors 0, page errors 0, request failures 0, horizontal overflow 0
→ original fixture confirms Framework R-6 and No medido semantics
```

**Status:** R-6 completed technically. R-7 remains comparative QA/validation protocol before any decision to replace the default battery.
