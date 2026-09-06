# R-6d Complete Demo Coverage Implementation Plan

> **HISTÓRICO (2026-07-21, completado).** Describe la fase R-6d de cobertura técnica de demo. Ya ejecutada y verificada. La referencia vigente es el plan maestro `docs/plans/2026-09-04-aws-frontpage-deploy-master-plan.md` y el handoff `docs/plans/postulation-demo-original-games-new-agent-handoff.md`. Se conserva como trazabilidad.

> **For Hermes:** Execute directly with TDD in the current session; do not delegate unless the task expands beyond the listed files.

**Goal:** Make the `/postulaciones-demo?battery=original` report product-ready by giving every workbook construct a scored, confidence-bearing demo signal when all original-game blocks are complete, without claiming norms, percentiles, cutoffs, personality, frustration tolerance, or automated hiring decisions.

**Architecture:** Fix aggregate validity first, then update the versioned feature vector and talent-framework mapping. Keep raw route/click/choice/text data out of payloads. Increase game challenge through authored constraints and option ordering, not through hidden randomness or raw telemetry.

**Tech Stack:** React 19, Vite 8, Vitest, Playwright smoke, privacy-safe aggregate telemetry.

---

## Execution status

**Status:** `[x] Completed and verified on 2026-07-21`

Implemented outcomes:

- Passenger deliveries are deduplicated by `level.id:passenger.id`; aggregate and vector guards clamp historical over-delivery such as `6/5` without losing the complete route signal.
- Team Coordination best-option positions are now `[2, 3, 2, 3]` in human one-based order, removing the “always first” pattern while retaining deterministic smoke selection.
- A complete original battery produces numeric provisional demo scores for all eight constructs with confidence between `0.55` and `0.60`.
- Complete original reports contain none of `No medido`, `Evidencia insuficiente` or `Solo descriptivo`.
- Laser advanced levels retain added optical distractors without opening one/two-move shortcuts; Passenger circuits 2–3 retain tighter budgets while the intro keeps a valid learning margin.

Verification evidence:

- Focused regression: `30` files / `131` tests passed.
- Full suite: `92` files / `389` tests passed.
- Oxlint: `0` warnings / `0` errors.
- Production build: passed (`1392` modules transformed); only the known non-blocking chunk-size warning remains.
- Audit: `0` vulnerabilities.
- Desktop smoke `1280×720`: `failures: []`.
- Mobile smoke `390×844`: `failures: []`.
- `git diff --check`: passed.

---

## Scope and constraints

- Keep `stable_dg` as default/fallback.
- Keep `original_games` human-review-only and provisional.
- Scores are demo/task-derived 0–100 indicators, not norms, percentiles, diagnoses or hiring thresholds.
- Camera/biometrics remain context/quality only.
- No raw video, frames, landmarks, keypoints, route traces, pointer samples, choice sequences, free text or raw game events.

## Observed failure from user artifacts

Input artifacts:

- `/mnt/c/Users/sarlo/Downloads/postulation-demo-1784661646129-talent-report.md`
- `/mnt/c/Users/sarlo/Downloads/postulation-demo-1784661646129-final-payload.json`

Findings:

- Passenger aggregate was invalid: `passengersDelivered: 6`, `destinationCount: 5`, which invalidated all Passenger features.
- Invalid Passenger features caused `problemSolving`, `planning` and `analyticalThinking` to remain `insufficient`.
- `decisionMaking` and `riskFeedbackProfile` remained `descriptive_only`/`No medido`.
- Team Coordination score was only ~66% because typical user choices included non-optimal options and the best option was visually first too often.
- Laser and Passenger are perceived as too simple.

## Implementation tasks

### Task 1 — Passenger aggregate validity

Files:

- Modify `src/tasks/original-games/PassengerRouteOptimizationTask.jsx`
- Modify `src/tasks/original-games/passengerRouteTelemetry.js`
- Modify tests in `src/tasks/original-games/PassengerRouteOptimizationTask.test.jsx` and `src/tasks/original-games/passengerRouteTelemetry.test.js`

Steps:

1. Track delivered passengers by globally unique `level.id:passenger.id` keys.
2. Clamp `passengersDelivered <= destinationCount` in aggregate builder as a final guard.
3. Add tests proving duplicate/double completion cannot produce `6/5`.
4. Run Passenger tests and feature-vector tests.

### Task 2 — Brief of coordination gamification and ordering

Files:

- Modify `src/tasks/original-games/teamCoordinationTelemetry.js`
- Modify `src/tasks/original-games/TeamCoordinationPostulationTask.test.jsx`

Steps:

1. Reorder options so the best answer is not always first.
2. Keep labels deterministic so smoke can select strong responses by text.
3. Make high-quality choices produce stronger aggregate scores while keeping mid/low choices plausible.
4. Preserve no-free-text/no-choice-sequence privacy tests.

### Task 3 — Full construct scoring for demo report

Files:

- Modify `src/assessment/originalGameTalentMapping.js`
- Modify `src/assessment/originalGameTalentMapping.test.js`
- Modify `src/assessment/talentReportGenerator.test.js` if needed

Steps:

1. When Laser, Passenger, Balloon and Team are complete, produce `provisional_score` for all eight constructs.
2. Increase confidence ceilings to acceptable demo confidence (about 0.55–0.60) only when multi-game evidence exists.
3. Risk/feedback score remains game-strategy-only with caveats: not personality, not frustration tolerance, not a hiring decision.
4. No `insufficient`, `not_measured`, `descriptive_only`, `No medido` in a complete original battery report.

### Task 4 — Difficulty calibration

Files:

- Modify `src/tasks/original-games/laserPuzzleTelemetry.js`
- Modify `src/tasks/original-games/passengerRouteTelemetry.js`
- Modify smoke script if authored solution path changes.

Steps:

1. Add optical distractors / clutter to Laser while preserving authored solutions.
2. Tighten Passenger route budgets or constraints only if solver remains valid.
3. Re-run authoring/solvability tests and real browser smoke desktop/mobile.

### Task 5 — Verification and docs

Run:

```bash
NODE_ENV=test npx vitest run src/tasks/original-games src/postulation-demo src/assessment/originalGameFeatureVector.test.js src/assessment/originalGameTalentMapping.test.js src/assessment/talentReportGenerator.test.js --pool=threads --reporter=default
NODE_ENV=test npx vitest run --pool=threads --reporter=default
npx oxlint src/postulation-demo src/tasks src/main.jsx src/assessment src/telemetry/gameCorrelation.js
npm run build
npm audit --audit-level=high --omit=dev
git diff --check
node scripts/smoke-original-games-playability.mjs
VIEWPORT_WIDTH=390 VIEWPORT_HEIGHT=844 node scripts/smoke-original-games-playability.mjs
```

Acceptance:

- New report generated from complete original battery has all eight constructs with numeric scores and confidence >= 0.55 where evidence is complete.
- No construct displays `No medido`, `Evidencia insuficiente` or `Solo descriptivo` in the complete fixture/playthrough path.
- Passenger never reports more deliveries than destinations.
- Smoke passes in desktop and mobile.
